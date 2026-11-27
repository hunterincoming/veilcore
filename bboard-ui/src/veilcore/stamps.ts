// The files that check a record's dates on the two clocks that don't depend on Midnight, kept by
// the holder (foundation review of 26 Nov 2026, failure-recovery item 1).
//
// A record's batch root is stamped on Bitcoin (OpenTimestamps: root.bin.ots) and by one or more
// Time Stamping Authorities (RFC 3161: the batch's tokens, root.tst); a record's own proof code
// may also have RFC 3161 tokens of its own (/proof/:commitment/instant). These used to live only
// on VeilCore's registry: the backup file kept the record and its inclusion proof, so a holder
// with a perfect backup and no registry kept the Midnight date and lost the other two clocks.
//
// What this browser keeps is only what VeilCore's registry answered it. Each backup
// (backup.ts withRecordsAndProofs) asks the registry for each record's proof, its batch's Bitcoin
// file and tokens, and the record's own tokens, checks each against the record or the batch root,
// keeps them, and writes them into the file. A pending Bitcoin file is kept and the finished one
// taken when the registry has it; a finished one is never swapped back. If the registry ever
// answers with another root for a record whose batch it already gave (an honest registry never
// changes a sealed batch), the first answer stays, the new one is kept aside and goes in the file
// too, and the backup page warns (rootChanges). Nothing here is deleted except when its record is
// deleted on this browser (record-keys.ts wasForgotten).
//
// Restoring a backup file never brings stamps into this browser (review 7 of PR #233: every
// problem left came from importing a file's stamps and carrying them on into later backups). So a
// backup file only ever holds what the registry gave the browser that made it, never anything
// from another file, and a made-up file can't spread. The holder's backup file is the lasting
// copy: with the registry out of reach, an evidence bundle is made straight from it
// (evidenceFromFile): read in memory, each item checked for form (each proof must lead from the
// record to the root it names, a Bitcoin file must start from that root, a token must be signed
// by a timestamp authority this site pins, within that certificate's dates), nothing stored, and
// every page of the bundle labelled as from that backup file, not confirmed with the registry.
//
// Everything here is public data (the registry serves it to anyone with the proof code); it is
// stored compressed, because a TSA token carries its certificate chain (a few kilobytes) and
// those repeat from token to token.
// SPDX-License-Identifier: Apache-2.0

import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { base64 } from '@scure/base';
import { verifyTimestampToken, type InclusionProof } from 'veilcore-records';
import { VeilcoreVerify } from '../../evidence-page/verify-core.js';
import { checkProof } from './proofs';
import { isNumber, isObject, isString } from './json';
import { wasForgotten } from './record-keys';
import { TSA_PINS, withinPin } from './instant-stamp';
import { pinOf, stripCertificates, type TsaPin } from '../../../scripts/tsa-signer.mjs';

const BASE = import.meta.env.VITE_API_BASE ?? '';
export const STAMPS_KEY = 'veilcore.stamps.v1';
export const STAMPS_FORMAT = 'veilcore/stamps/v1';
const HEX64 = /^[0-9a-f]{64}$/;
/** At most this many tokens per batch or per record (a registry names one per TSA it uses). */
const MAX_TOKENS = 8;
/** A token or stamp file bigger than this (base64 characters) isn't one the registry makes. */
const MAX_FILE_CHARS = 64 * 1024;
/** Other roots a backup file may give one record (the registry's later answers): more is junk. */
const MAX_FILE_ROOTS = 16;
const FETCHES = 6;

/** An RFC 3161 token, base64 DER, and which TSA's (the registry's word, for the reader). */
export type TokenEntry = { readonly token: string; readonly tsa?: string };

/** A batch's files: its root, its Bitcoin stamp file and its RFC 3161 tokens. */
export type BatchStamps = {
  /** The batch root, hex: root.bin is these 32 bytes. */
  readonly root: string;
  /** root.bin.ots, base64. */
  readonly ots?: string;
  /** What the file itself shows (verify.html's reader): a Bitcoin block, or a calendar's promise. */
  readonly otsStatus?: 'bitcoin' | 'pending';
  /** The first Bitcoin block the file names, when it names one. */
  readonly bitcoinBlockHeight?: number;
  /** root.tst from each TSA. */
  readonly tsts?: readonly TokenEntry[];
};

/** A record's own RFC 3161 tokens on its proof code. */
export type RecordStamps = {
  readonly instant?: readonly TokenEntry[];
  /** The registry is still asking a TSA: ask again next time. */
  readonly stillAsking?: boolean;
  /** The registry said it has none of its own once the record was batched: not asked again. */
  readonly none?: boolean;
};

/**
 * A root the registry gave later for a batch it had already given (rootChanges), with the
 * proofs that lead to it and its files: in the file, so nothing the registry said is lost.
 */
export type ChangedBatch = {
  readonly batchId: string;
  readonly root: string;
  readonly proofs: Readonly<Record<string, InclusionProof>>;
  readonly ots?: string;
  readonly tsts?: readonly TokenEntry[];
};

/** What the backup file carries (`stamps`): only what VeilCore's registry gave the browser that made it. */
export type StampsInFile = {
  readonly format: typeof STAMPS_FORMAT;
  /** By batch id: the batch each record's first proof (the file's `proofs`) names. */
  readonly batches: Readonly<Record<string, BatchStamps>>;
  /** By proof code. */
  readonly records: Readonly<Record<string, RecordStamps>>;
  /** The registry's later answers for batches it had already given (an honest registry gives none). */
  readonly changed?: readonly ChangedBatch[];
};

type Own = {
  /** By batchKey. */
  batches: Record<string, BatchStamps>;
  records: Record<string, RecordStamps>;
  /** The registry's first proof for each proof code. */
  proofs: Record<string, InclusionProof>;
  /** Later registry proofs for a proof code that named another batch or root (rootChanges). */
  changed: Record<string, InclusionProof[]>;
  ids: Record<string, string>;
};

/** A batch's key: its id and its root, so one root's files never stand in for another's. */
const batchKey = (batchId: string, root: string): string => `${batchId} ${root}`;

const empty = (): Own => ({ batches: {}, records: {}, proofs: {}, changed: {}, ids: {} });

const obj = <T>(v: unknown): Record<string, T> => (isObject(v) ? (v as Record<string, T>) : {});

/** What this browser keeps. Anything else under the key (an unreleased build's other parts) is passed over. */
const load = (): Own => {
  try {
    const raw = localStorage.getItem(STAMPS_KEY);
    if (!raw) return empty();
    const box: unknown = JSON.parse(raw);
    if (!isObject(box) || box.v !== 4 || !isString(box.z)) return empty();
    const v: unknown = JSON.parse(strFromU8(inflateSync(base64.decode(box.z))));
    if (!isObject(v) || !isObject(v.own)) return empty();
    const o = v.own;
    return {
      batches: obj(o.batches),
      records: obj(o.records),
      proofs: obj(o.proofs),
      changed: obj(o.changed),
      ids: obj(o.ids),
    };
  } catch {
    return empty();
  }
};

const pack = (v: unknown): string => base64.encode(deflateSync(strToU8(JSON.stringify(v)), { level: 9 }));

/** Kept best effort: a browser that refuses the write still has the backup file. */
const save = (own: Own): void => {
  try {
    localStorage.setItem(STAMPS_KEY, JSON.stringify({ v: 4, z: pack({ own }) }));
  } catch {
    /* full or refused: the file made now still carries them */
  }
};

/** The stored size of what is kept here, in characters (for the size checks). */
export const keptSize = (): number => {
  try {
    return localStorage.getItem(STAMPS_KEY)?.length ?? 0;
  } catch {
    return 0;
  }
};

const hexBytes = (h: string): Uint8Array => Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16));

const b64Bytes = (s: string): Uint8Array | undefined => {
  try {
    return base64.decode(s);
  } catch {
    return undefined;
  }
};

/** A token from the registry: it verifies against the bytes it stamps (imprint and signature, veilcore-records). */
const tokenChecks = async (t: unknown, stamped: Uint8Array): Promise<boolean> => {
  if (!isString(t) || t.length > MAX_FILE_CHARS) return false;
  try {
    return (await verifyTimestampToken(t, stamped)).ok;
  } catch {
    return false;
  }
};

/**
 * A token from a backup file: small, it verifies against the bytes it stamps with the certificate
 * this site pins for its authority, and its time lies within that certificate's life
 * (instant-stamp.ts; security review of PR #145, TSA-1). A token signed by a certificate of
 * anyone's making is not taken.
 */
const pinnedTokenChecks = async (t: unknown, stamped: Uint8Array, pins: readonly TsaPin[]): Promise<boolean> => {
  if (!isString(t) || t.length > MAX_FILE_CHARS || pins.length === 0) return false;
  try {
    const der = b64Bytes(t);
    if (!der) return false;
    const pin = await pinOf(der, pins);
    if (!pin) return false;
    const v = await verifyTimestampToken(stripCertificates(der), stamped, { certificates: [pin.cert] });
    return v.ok && !!v.genTime && withinPin(pin, v.genTime);
  } catch {
    return false;
  }
};

/** What a Bitcoin stamp file shows about this root, read as verify.html reads it; null if it isn't about it. */
export const readOts = async (
  b64: unknown,
  root: string,
  maxChars = MAX_FILE_CHARS,
): Promise<{ status: 'bitcoin' | 'pending'; height?: number } | null> => {
  if (!isString(b64) || b64.length > maxChars || !HEX64.test(root)) return null;
  const bytes = b64Bytes(b64);
  if (!bytes) return null;
  try {
    const r = await VeilcoreVerify.readStamp(bytes, root);
    if (r.status !== 'bitcoin' && r.status !== 'pending') return null;
    const h = r.status === 'bitcoin' ? r.bitcoin[0]?.height : undefined;
    return { status: r.status, ...(isNumber(h) ? { height: h } : {}) };
  } catch {
    return null;
  }
};

/** Tokens added to a list, each once, at most `max`. */
const mergeTokens = (had: readonly TokenEntry[] = [], add: readonly TokenEntry[], max = MAX_TOKENS): TokenEntry[] => {
  const out = [...had];
  for (const t of add) if (out.length < max && !out.some((x) => x.token === t.token)) out.push(t);
  return out;
};

/** The checked tokens of a list as it arrived: from the registry, or (with `pins`) from a backup file. */
const checkedTokens = async (list: unknown, stamped: Uint8Array, pins?: readonly TsaPin[]): Promise<TokenEntry[]> => {
  const out: TokenEntry[] = [];
  for (const t of Array.isArray(list) ? (list as unknown[]).slice(0, MAX_TOKENS) : []) {
    if (!isObject(t)) continue;
    if (!(await (pins ? pinnedTokenChecks(t.token, stamped, pins) : tokenChecks(t.token, stamped)))) continue;
    if (out.some((x) => x.token === t.token)) continue;
    out.push({ token: t.token as string, ...(isString(t.tsa) && t.tsa.length < 512 ? { tsa: t.tsa } : {}) });
  }
  return out;
};

/** JSON as kept: only strings, finite numbers, booleans, arrays and plain objects; no null, no unknown types. */
const plain = (v: unknown, depth = 0): unknown => {
  // Deeper or longer than any proof the registry gives: that answer isn't kept (the others are).
  if (depth > 8) throw new Error('too deep');
  if (isString(v) || typeof v === 'boolean') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (Array.isArray(v)) {
    if (v.length > 64) throw new Error('too long');
    return v.map((x) => plain(x, depth + 1)).filter((x) => x !== undefined);
  }
  if (!isObject(v)) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) {
    const c = plain(x, depth + 1);
    if (c !== undefined) out[k] = c;
  }
  return out;
};

const ANCHOR_FIELDS = ['chain', 'network', 'txHash', 'contractAddress', 'blockHeight', 'anchoredAt', 'testNetwork'];

/**
 * A proof as kept here, rebuilt from its known fields only (review 5): the format version, the
 * commitment, the path, the root and batch, when it was sealed, and the registry's anchors,
 * without the batch tokens (kept once, per batch). Anything else, any null, any field of the
 * wrong type, is dropped, so what is kept is always plain JSON.
 */
const keepable = (p: InclusionProof): InclusionProof => {
  const r = p as unknown as Record<string, unknown>;
  const anchor: Record<string, unknown> | undefined = isObject(r.anchor)
    ? Object.fromEntries(
        ANCHOR_FIELDS.map((k): [string, unknown] => [k, plain((r.anchor as Record<string, unknown>)[k])]).filter(
          ([, v]) => v !== undefined && !isObject(v) && !Array.isArray(v),
        ),
      )
    : undefined;
  if (Array.isArray(r.anchors) && r.anchors.length > 16) throw new Error('too many anchors');
  const anchors = Array.isArray(r.anchors)
    ? (r.anchors as unknown[]).filter(isObject).map((a) => {
        const c = plain(a) as Record<string, unknown>;
        if (c.kind === 'rfc3161') delete c.token;
        return c;
      })
    : undefined;
  return {
    ...(isString(r.formatVersion) && r.formatVersion.length < 32 ? { formatVersion: r.formatVersion } : {}),
    commitment: p.commitment,
    root: p.root,
    batchId: p.batchId,
    ...(isString(r.sealedAt) ? { sealedAt: r.sealedAt } : {}),
    path: p.path.map((x) => ({ sibling: x.sibling, siblingIsLeft: x.siblingIsLeft })),
    ...(anchor && isString(anchor.network) && isString(anchor.chain) ? { anchor } : {}),
    ...(anchors?.length ? { anchors } : {}),
  } as unknown as InclusionProof;
};

const otsAnchor = (p: InclusionProof): boolean => {
  const anchors: unknown = (p as unknown as Record<string, unknown>).anchors;
  return Array.isArray(anchors) && anchors.some((a) => isObject(a) && a.kind === 'opentimestamps');
};

const batchTokensOf = (p: InclusionProof): unknown[] => {
  const anchors: unknown = (p as unknown as Record<string, unknown>).anchors;
  return Array.isArray(anchors)
    ? (anchors as unknown[]).filter((a) => isObject(a) && a.kind === 'rfc3161' && isString(a.token))
    : [];
};

/** A new Bitcoin stamp file in place of the one kept: a finished one is never replaced. */
const better = (had: { ots?: string; otsStatus?: string } | undefined, status: 'bitcoin' | 'pending', fresh: boolean) =>
  !had?.ots || (had.otsStatus !== 'bitcoin' && (status === 'bitcoin' || fresh));

const withOts = (
  b: BatchStamps,
  ots: string,
  read: { status: 'bitcoin' | 'pending'; height?: number },
): BatchStamps => {
  const { bitcoinBlockHeight: _h, ...rest } = b;
  void _h;
  return {
    ...rest,
    ots,
    otsStatus: read.status,
    ...(read.height !== undefined ? { bitcoinBlockHeight: read.height } : {}),
  };
};

const inBatches = async <T>(items: readonly T[], fn: (x: T) => Promise<void>): Promise<void> => {
  for (let i = 0; i < items.length; i += FETCHES) await Promise.all(items.slice(i, i + FETCHES).map(fn));
};

const getBytes = async (url: string): Promise<Uint8Array | null> => {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
};

const getInstant = async (fp: string): Promise<{ status: number; body: unknown } | null> => {
  try {
    const res = await fetch(`${BASE}/proof/${fp}/instant`, { cache: 'no-store' });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* no body */
    }
    return { status: res.status, body };
  } catch {
    return null;
  }
};

/** What belongs only to records deleted on this browser goes, and a batch's files once no proof kept here leads to them. */
const pruneDeleted = (o: Own): void => {
  const gone = new Set(Object.keys(o.ids).filter((fp) => wasForgotten(o.ids[fp])));
  if (gone.size === 0) return;
  for (const fp of gone) {
    delete o.proofs[fp];
    delete o.changed[fp];
    delete o.records[fp];
    delete o.ids[fp];
  }
  const used = new Set(
    [...Object.values(o.proofs), ...Object.values(o.changed).flat()].map((p) => batchKey(p.batchId, p.root)),
  );
  for (const k of Object.keys(o.batches)) if (!used.has(k)) delete o.batches[k];
};

const sameBatch = (a: { batchId: string; root: string }, b: { batchId: string; root: string }): boolean =>
  a.batchId === b.batchId && a.root === b.root;

/**
 * For a backup about to be made: what is kept here refreshed from the registry where it answers,
 * and what the file carries. `proofs` (by proof code) are the inclusion proofs the registry just
 * gave, each checked against its record (proofs.ts proofFor); a proof code it didn't give one for
 * now (out of reach) gets the one kept here, checked again. A registry proof naming another batch
 * or root than the one it gave first is kept aside and the first stays, here and in `proofs`.
 * Never throws.
 */
export const stampsForBackup = async (
  records: readonly { readonly id: string; readonly recordFingerprint?: string }[],
  proofs: Record<string, unknown>,
): Promise<StampsInFile | undefined> => {
  const own = load();
  pruneDeleted(own);
  const wanted = new Set<string>();
  for (const r of records) {
    const fp = r.recordFingerprint;
    if (!fp || !HEX64.test(fp)) continue;
    wanted.add(fp);
    own.ids[fp] = r.id;
  }
  try {
    await refreshFromRegistry(own, wanted, proofs);
  } catch {
    /* what the registry gave before stays, and goes in the file */
  }
  save(own);
  try {
    return inFile(own, wanted);
  } catch {
    return undefined;
  }
};

/** What is kept here refreshed from the registry's answers (stampsForBackup). */
const refreshFromRegistry = async (own: Own, wanted: ReadonlySet<string>, proofs: Record<string, unknown>) => {
  for (const fp of wanted) {
    // One record's answer that can't be kept never stops the others.
    try {
      const fresh = proofs[fp];
      const first = own.proofs[fp];
      if (fresh !== undefined) {
        const st = await checkProof(fp, fresh).catch(() => ({ status: 'none' as const }));
        if (st.status === 'none') {
          delete proofs[fp];
        } else if (!first) {
          own.proofs[fp] = keepable(st.proof);
        } else if (!sameBatch(first, st.proof)) {
          // An honest registry never changes a sealed batch: the first answer stays (rootChanges).
          proofs[fp] = first;
          const aside = own.changed[fp] ?? [];
          if (!aside.some((p) => sameBatch(p, st.proof))) own.changed[fp] = [...aside, keepable(st.proof)];
        }
        continue;
      }
      if (!first) continue;
      const st = await checkProof(fp, first);
      if (st.status !== 'none') proofs[fp] = st.proof;
    } catch {
      /* this record's answer is left as it was */
    }
  }
  // Each batch (id and root) these records sit in, once, with the registry's answer just now.
  const batchOf = new Map<string, { p: InclusionProof; fresh?: InclusionProof }>();
  for (const fp of wanted) {
    const p = own.proofs[fp];
    if (!p) continue;
    const k = batchKey(p.batchId, p.root);
    const f = proofs[fp];
    const fresh =
      isObject(f) && sameBatch(f as unknown as InclusionProof, p) ? (f as unknown as InclusionProof) : undefined;
    const had = batchOf.get(k);
    if (!had || (!had.fresh && fresh)) batchOf.set(k, { p, fresh });
  }
  await inBatches([...batchOf.entries()], async ([key, { p, fresh }]) => {
    let b: BatchStamps = own.batches[key] ?? { root: p.root };
    const tsts = await checkedTokens(fresh ? batchTokensOf(fresh) : [], hexBytes(p.root));
    if (tsts.length) b = { ...b, tsts: mergeTokens(b.tsts, tsts) };
    // The Bitcoin file: fetched until it is finished, and kept only when it starts from this root.
    if (b.otsStatus !== 'bitcoin' && fresh && otsAnchor(fresh)) {
      const bytes = await getBytes(`${BASE}/batches/${encodeURIComponent(p.batchId)}/root.bin.ots`);
      const ots = bytes ? base64.encode(bytes) : undefined;
      const read = ots ? await readOts(ots, p.root) : null;
      if (ots && read && better(b, read.status, true)) b = withOts(b, ots, read);
    }
    if (b.ots || b.tsts?.length) own.batches[key] = b;
  });

  // Each record's own tokens, until it has them all.
  await inBatches([...wanted], async (fp) => {
    const had = own.records[fp];
    if ((had?.instant?.length && !had.stillAsking) || (had?.none && own.proofs[fp])) return;
    const got = await getInstant(fp);
    if (!got) return;
    if (got.status === 404) {
      if (own.proofs[fp] && !had?.instant?.length) own.records[fp] = { none: true };
      return;
    }
    if (got.status !== 200 || !isObject(got.body) || got.body.status !== 'stamped') return;
    const tokens = await checkedTokens(got.body.tokens, hexBytes(fp));
    if (!tokens.length) return;
    const stillAsking = isNumber(got.body.stillAsking) && got.body.stillAsking > 0;
    own.records[fp] = { instant: mergeTokens(had?.instant, tokens), ...(stillAsking ? { stillAsking } : {}) };
  });
};

/** What the file carries for these records: only what the registry gave this browser. */
const inFile = (own: Own, wanted: ReadonlySet<string>): StampsInFile | undefined => {
  const batches: Record<string, BatchStamps> = {};
  const records: Record<string, RecordStamps> = {};
  // The registry's later answers: one entry per (batch, root), each with its own files.
  const changed = new Map<string, { batchId: string; root: string; proofs: Record<string, InclusionProof> }>();
  for (const fp of wanted) {
    const p = own.proofs[fp];
    const b = p ? own.batches[batchKey(p.batchId, p.root)] : undefined;
    if (p && b && (b.ots || b.tsts?.length) && !batches[p.batchId]) batches[p.batchId] = b;
    const r = own.records[fp];
    if (r?.instant?.length) records[fp] = { instant: r.instant };
    for (const c of own.changed[fp] ?? []) {
      const k = batchKey(c.batchId, c.root);
      const e = changed.get(k) ?? { batchId: c.batchId, root: c.root, proofs: {} };
      e.proofs[fp] = c;
      changed.set(k, e);
    }
  }
  const later: ChangedBatch[] = [...changed.entries()].map(([k, e]) => {
    const b = own.batches[k];
    return { ...e, ...(b?.ots ? { ots: b.ots } : {}), ...(b?.tsts?.length ? { tsts: b.tsts } : {}) };
  });
  return Object.keys(batches).length || Object.keys(records).length || later.length
    ? { format: STAMPS_FORMAT, batches, records, ...(later.length ? { changed: later } : {}) }
    : undefined;
};

/** How many records the registry has given a different batch or root for, after giving one (an honest registry never does). */
export const rootChanges = (): number => Object.values(load().changed).filter((l) => l.length > 0).length;

// ---- the evidence bundle with the registry out of reach -----------------------------------

const batchFacts = async (proof: InclusionProof, b: { ots?: string; tsts?: readonly TokenEntry[] } | undefined) => {
  const read = b?.ots ? await readOts(b.ots, proof.root) : null;
  const tst = b?.tsts?.[0];
  return {
    batch: {
      batchId: proof.batchId,
      root: proof.root,
      ...(proof.sealedAt ? { sealedAt: proof.sealedAt } : {}),
      anchor: proof.anchor ?? null,
      opentimestamps: read
        ? {
            available: true,
            status: read.status,
            ...(read.height !== undefined ? { bitcoinBlockHeight: read.height } : {}),
          }
        : { available: false, status: 'none' },
      ...(tst ? { rfc3161: { token: tst.token, ...(tst.tsa ? { tsa: tst.tsa } : {}) } } : {}),
    },
    ots: read && b?.ots ? (b64Bytes(b.ots) ?? null) : null,
  };
};

/**
 * What this browser kept from the registry for one record, for the evidence bundle when the
 * registry is out of reach: the registry's own first proof and its batch's files, or null.
 */
export const keptEvidence = async (
  fp: string,
): Promise<{
  readonly proof: InclusionProof;
  readonly batch: Record<string, unknown>;
  readonly ots: Uint8Array | null;
} | null> => {
  if (!HEX64.test(fp)) return null;
  const own = load();
  const p = own.proofs[fp];
  if (!p) return null;
  const st = await checkProof(fp, p).catch(() => ({ status: 'none' as const }));
  if (st.status === 'none') return null;
  return { proof: st.proof, ...(await batchFacts(st.proof, own.batches[batchKey(st.proof.batchId, st.proof.root)])) };
};

// ---- an evidence bundle straight from a backup file (nothing stored) ------------------------

/** A backup file's date proofs as read from it, in memory only: its `stamps` and its `proofs`. */
export type BackupFileStamps = { readonly stamps: unknown; readonly proofs: unknown };

/** One root a backup file gives for a record, for the bundle: everything the file has for it that checks. */
export type FileEvidence = {
  readonly batchId: string;
  readonly root: string;
  readonly proof: InclusionProof;
  /** The Bitcoin stamp file, when the file has one that starts from this root. */
  readonly ots?: { readonly bytes: Uint8Array; readonly status: 'bitcoin' | 'pending'; readonly height?: number };
  /** Each token signed by a pinned authority over this root, DER. */
  readonly tsts: readonly Uint8Array[];
  /** True for a root the registry gave later for a batch it had already given (the file's `changed`). */
  readonly later: boolean;
};

/** The proof codes a backup file has a proof for. */
export const fileCovers = (file: BackupFileStamps): Set<string> =>
  new Set(Object.keys(isObject(file.proofs) ? file.proofs : {}).filter((fp) => HEX64.test(fp)));

/**
 * What a backup file gives for one record, each root on its own and in the file's order, every
 * item checked for form (see the top of this file); what fails a check is left out. Nothing is
 * stored. `registryRoots`: roots this browser's registry part has for the same batch that the file
 * doesn't give. `pins` are the timestamp authorities this site trusts (tests pass their own).
 */
export const evidenceFromFile = async (
  fp: string,
  file: BackupFileStamps,
  pins: readonly TsaPin[] = TSA_PINS,
): Promise<{ readonly roots: readonly FileEvidence[]; readonly registryRoots: readonly string[] }> => {
  const none = { roots: [], registryRoots: [] };
  if (!HEX64.test(fp)) return none;
  const s = isObject(file.stamps) && file.stamps.format === STAMPS_FORMAT ? file.stamps : {};
  const batches = isObject(s.batches) ? s.batches : {};
  const candidates: { proof: unknown; files: unknown; later: boolean }[] = [];
  const first = isObject(file.proofs) ? file.proofs[fp] : undefined;
  if (isObject(first) && isString(first.batchId))
    candidates.push({ proof: first, files: batches[first.batchId], later: false });
  const changed = Array.isArray(s.changed) ? (s.changed as unknown[]) : [];
  for (const c of changed) {
    if (candidates.length > MAX_FILE_ROOTS) break;
    if (isObject(c) && isObject(c.proofs) && c.proofs[fp] !== undefined)
      candidates.push({ proof: c.proofs[fp], files: c, later: true });
  }
  const roots: FileEvidence[] = [];
  for (const c of candidates) {
    try {
      const st = await checkProof(fp, c.proof);
      if (st.status === 'none') continue;
      const { batchId, root } = st.proof;
      if (roots.some((r) => sameBatch(r, { batchId, root }))) continue;
      const f = isObject(c.files) && c.files.root === root ? c.files : {};
      const read = await readOts(f.ots, root);
      const bytes = read && isString(f.ots) ? b64Bytes(f.ots) : undefined;
      const tsts = (await checkedTokens(f.tsts, hexBytes(root), pins))
        .map((t) => b64Bytes(t.token))
        .filter((b): b is Uint8Array => !!b);
      roots.push({
        batchId,
        root,
        proof: keepable(st.proof),
        ...(read && bytes
          ? { ots: { bytes, status: read.status, ...(read.height !== undefined ? { height: read.height } : {}) } }
          : {}),
        tsts,
        later: c.later,
      });
    } catch {
      /* junk: left out; the rest stand */
    }
  }
  const own = load();
  const ids = new Set(roots.map((r) => r.batchId));
  const given = new Set(roots.map((r) => r.root));
  const registryRoots = [
    ...new Set(
      [...Object.values(own.proofs), ...Object.values(own.changed).flat()]
        .filter((p) => ids.has(p.batchId) && !given.has(p.root))
        .map((p) => p.root),
    ),
  ];
  return { roots, registryRoots };
};
