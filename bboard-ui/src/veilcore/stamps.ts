// The files that check a record's dates on the two clocks that don't depend on Midnight, kept by
// the holder (foundation review of 26 Nov 2026, failure-recovery item 1).
//
// A record's batch root is stamped on Bitcoin (OpenTimestamps: root.bin.ots) and by one or more
// Time Stamping Authorities (RFC 3161: the batch's tokens, root.tst); a record's own proof code
// may also have RFC 3161 tokens of its own (/proof/:commitment/instant). These used to live only
// on VeilCore's registry: the backup file kept the record and its inclusion proof, so a holder
// with a perfect backup and no registry kept the Midnight date and lost the other two clocks.
//
// Two stores, never mixed (third review of PR #233: the design was made simpler on purpose):
//
//   - OWN: what VeilCore's registry answered this browser. Each backup (backup.ts
//     withRecordsAndProofs) asks the registry for each record's proof, its batch's Bitcoin file and
//     tokens, and the record's own tokens, checks each against the record or the batch root, and
//     keeps them. Nothing from a backup file ever goes in here. A pending Bitcoin file is kept and
//     the finished one taken when the registry has it; a finished one is never swapped back. If
//     the registry ever answers with another root for a record whose batch it already gave (an
//     honest registry never changes a sealed batch), the first answer stays, the new one is kept
//     aside, and the backup page warns (rootChanges). Nothing kept here is deleted except when its
//     record is deleted on this browser (record-keys.ts wasForgotten);
//
//   - CARRIED: what restored backup files brought, kept as it came so nothing a holder ever had
//     is lost, and written into every later backup file (`stamps.carried`). It is opaque to the
//     site: it never changes OWN, never counts as checked by VeilCore, and is used only for an
//     evidence bundle when the registry can't be reached, labelled on every page as restored from
//     a backup file and not yet confirmed. To keep junk out, each item is checked when it comes
//     in: its proof must lead from one of this holder's records to the root it names, a Bitcoin
//     file must start from SHA-256 of that root (verify.html's reader), and a token must verify
//     against what it stamps and be signed by a timestamp authority this site pins, within that
//     certificate's dates (config/tsa-pins.json, as instant-stamp.ts). And it is capped:
//       - a Bitcoin file or token at most CARRIED_FILE_CHARS, at most MAX_CARRIED_TOKENS per item;
//       - at most MAX_ALTERNATIVES roots per batch, and per record;
//       - at most CARRIED_BUDGET compressed bytes in all.
//     Eviction is simple and deterministic: every item has a sequence number, raised each time a
//     file brings it (again); over a cap, the item with the lowest number goes first. So the file
//     restored last always gets in, and restoring a file again brings its items back to the front.
//     Two roots for one batch are both kept and both shown: the bundle says the backup files
//     disagree and that Midnight settles it, and the restore page tells the holder.
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
/** A token or stamp file from the registry bigger than this (base64 characters) isn't one it makes. */
const MAX_FILE_CHARS = 64 * 1024;
/** From a backup file: real stamp files and tokens are a few kilobytes. */
export const CARRIED_FILE_CHARS = 16 * 1024;
const MAX_CARRIED_TOKENS = 4;
/** Roots kept per batch id, and batches per record, from backup files. */
export const MAX_ALTERNATIVES = 2;
/** All carried items together, compressed as stored. */
export const CARRIED_BUDGET = 512 * 1024;
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

/** One carried batch: a root some backup file named, the proofs of this holder's records that lead to it, its files. */
export type CarriedBatch = {
  readonly kind: 'batch';
  readonly batchId: string;
  readonly root: string;
  readonly proofs: Readonly<Record<string, InclusionProof>>;
  readonly ots?: string;
  readonly tsts?: readonly TokenEntry[];
};
/** One record's own tokens, as a backup file carried them. */
export type CarriedRecord = { readonly kind: 'record'; readonly fp: string; readonly instant: readonly TokenEntry[] };
export type CarriedItem = CarriedBatch | CarriedRecord;

/** What the backup file carries (`stamps`). */
export type StampsInFile = {
  readonly format: typeof STAMPS_FORMAT;
  /** By batch id: what the registry gave the browser that made the file. */
  readonly batches: Readonly<Record<string, BatchStamps>>;
  /** By proof code: what the registry gave the browser that made the file. */
  readonly records: Readonly<Record<string, RecordStamps>>;
  /**
   * What that browser had only from earlier backup files, or as a root the registry gave later
   * for a batch it had already given (kept aside), oldest first: never confirmed by anyone.
   */
  readonly carried?: readonly CarriedItem[];
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
type Kept = CarriedItem & { readonly seq: number };
type Store = { own: Own; carried: Record<string, Kept>; seq: number };

/** A batch's key: its id and its root, so one root's files never stand in for another's. */
const batchKey = (batchId: string, root: string): string => `${batchId} ${root}`;
const carriedKey = (i: CarriedItem): string => (i.kind === 'batch' ? `b ${batchKey(i.batchId, i.root)}` : `r ${i.fp}`);

const emptyOwn = (): Own => ({ batches: {}, records: {}, proofs: {}, changed: {}, ids: {} });
const empty = (): Store => ({ own: emptyOwn(), carried: {}, seq: 0 });

const obj = <T>(v: unknown): Record<string, T> => (isObject(v) ? (v as Record<string, T>) : {});

const load = (): Store => {
  try {
    const raw = localStorage.getItem(STAMPS_KEY);
    if (!raw) return empty();
    const box: unknown = JSON.parse(raw);
    if (!isObject(box) || box.v !== 2 || !isString(box.z)) return empty();
    const v: unknown = JSON.parse(strFromU8(inflateSync(base64.decode(box.z))));
    if (!isObject(v) || !isObject(v.own)) return empty();
    const o = v.own;
    return {
      own: {
        batches: obj(o.batches),
        records: obj(o.records),
        proofs: obj(o.proofs),
        changed: obj(o.changed),
        ids: obj(o.ids),
      },
      carried: obj(v.carried),
      seq: isNumber(v.seq) ? v.seq : 0,
    };
  } catch {
    return empty();
  }
};

const pack = (v: unknown): string => base64.encode(deflateSync(strToU8(JSON.stringify(v)), { level: 9 }));

/** Kept best effort: a browser that refuses the write still has the backup file. */
const save = (s: Store): void => {
  try {
    localStorage.setItem(STAMPS_KEY, JSON.stringify({ v: 2, z: pack(s) }));
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
  if (!isString(t) || t.length > CARRIED_FILE_CHARS || pins.length === 0) return false;
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
  const max = pins ? MAX_CARRIED_TOKENS : MAX_TOKENS;
  for (const t of Array.isArray(list) ? list.slice(0, max) : []) {
    if (!isObject(t)) continue;
    if (!(await (pins ? pinnedTokenChecks(t.token, stamped, pins) : tokenChecks(t.token, stamped)))) continue;
    out.push({ token: t.token as string, ...(isString(t.tsa) && t.tsa.length < 512 ? { tsa: t.tsa } : {}) });
  }
  return out;
};

/** A proof as kept here: the registry's anchors without the batch tokens (kept once, per batch). */
const keepable = (p: InclusionProof): InclusionProof => {
  const anchors: unknown = (p as unknown as Record<string, unknown>).anchors;
  if (!Array.isArray(anchors)) return p;
  return {
    ...p,
    anchors: (anchors as unknown[]).map((a) => (isObject(a) && a.kind === 'rfc3161' ? { ...a, token: undefined } : a)),
  } as InclusionProof;
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

/**
 * What belongs only to records deleted on this browser goes: their proofs and own tokens, a
 * batch's files once no proof kept here leads to them, and their place in carried items.
 * Nothing else is ever removed from OWN.
 */
const pruneDeleted = (s: Store): void => {
  const o = s.own;
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
  for (const [k, it] of Object.entries(s.carried)) {
    if (it.kind === 'record') {
      if (gone.has(it.fp)) delete s.carried[k];
      continue;
    }
    const proofs = Object.fromEntries(Object.entries(it.proofs).filter(([fp]) => !gone.has(fp)));
    if (Object.keys(proofs).length === 0) delete s.carried[k];
    else s.carried[k] = { ...it, proofs };
  }
};

const sameBatch = (a: { batchId: string; root: string }, b: { batchId: string; root: string }): boolean =>
  a.batchId === b.batchId && a.root === b.root;

/**
 * For a backup about to be made: OWN refreshed from the registry where it answers, kept, and what
 * the file carries. `proofs` (by proof code) are the inclusion proofs the registry just gave, each
 * checked against its record (proofs.ts proofFor); a proof code it didn't give one for now (out of
 * reach) gets the one kept here, checked again. A registry proof naming another batch or root than
 * the one it gave first is kept aside and the first stays, in OWN and in `proofs`. Never throws.
 */
export const stampsForBackup = async (
  records: readonly { readonly id: string; readonly recordFingerprint?: string }[],
  proofs: Record<string, unknown>,
): Promise<StampsInFile | undefined> => {
  const store = load();
  pruneDeleted(store);
  const own = store.own;
  const wanted = new Set<string>();
  for (const r of records) {
    const fp = r.recordFingerprint;
    if (!fp || !HEX64.test(fp)) continue;
    wanted.add(fp);
    own.ids[fp] = r.id;
  }
  for (const fp of wanted) {
    const fresh = proofs[fp];
    const first = own.proofs[fp];
    if (fresh !== undefined) {
      const st = await checkProof(fp, fresh);
      if (st.status === 'none') {
        delete proofs[fp];
      } else if (!first) {
        own.proofs[fp] = keepable(st.proof);
      } else if (!sameBatch(first, st.proof)) {
        // An honest registry never changes a sealed batch: the first answer stays (rootChanges).
        const aside = own.changed[fp] ?? [];
        if (!aside.some((p) => sameBatch(p, st.proof))) own.changed[fp] = [...aside, keepable(st.proof)];
        proofs[fp] = first;
      }
      continue;
    }
    if (!first) continue;
    const st = await checkProof(fp, first);
    if (st.status !== 'none') proofs[fp] = st.proof;
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
  save(store);
  return inFile(store, wanted);
};

/** The registry's later answers kept aside, as carried items for the file (never lost, never trusted). */
const changedItems = (own: Own, wanted: ReadonlySet<string>): CarriedBatch[] => {
  const by = new Map<string, { batchId: string; root: string; proofs: Record<string, InclusionProof> }>();
  for (const fp of wanted)
    for (const p of own.changed[fp] ?? []) {
      const k = batchKey(p.batchId, p.root);
      const e = by.get(k) ?? { batchId: p.batchId, root: p.root, proofs: {} };
      e.proofs[fp] = p;
      by.set(k, e);
    }
  return [...by.entries()].map(([k, e]) => {
    const b = own.batches[k];
    return {
      kind: 'batch',
      ...e,
      ...(b?.ots ? { ots: b.ots } : {}),
      ...(b?.tsts?.length ? { tsts: b.tsts } : {}),
    };
  });
};

const strip = (k: Kept): CarriedItem => {
  const { seq: _s, ...item } = k;
  void _s;
  return item;
};

/** What the file carries: OWN for these records, and everything carried, verbatim, oldest first. */
const inFile = (store: Store, wanted: ReadonlySet<string>): StampsInFile | undefined => {
  const own = store.own;
  const batches: Record<string, BatchStamps> = {};
  const records: Record<string, RecordStamps> = {};
  for (const fp of wanted) {
    const p = own.proofs[fp];
    const b = p ? own.batches[batchKey(p.batchId, p.root)] : undefined;
    if (p && b && (b.ots || b.tsts?.length) && !batches[p.batchId]) batches[p.batchId] = b;
    const r = own.records[fp];
    if (r?.instant?.length) records[fp] = { instant: r.instant };
  }
  const carried = [
    ...Object.values(store.carried)
      .sort((a, b) => a.seq - b.seq)
      .map(strip),
    ...changedItems(own, wanted),
  ];
  return Object.keys(batches).length || Object.keys(records).length || carried.length
    ? { format: STAMPS_FORMAT, batches, records, ...(carried.length ? { carried } : {}) }
    : undefined;
};

/** How many records the registry has given a different batch or root for, after giving one (an honest registry never does). */
export const rootChanges = (): number => Object.values(load().own.changed).filter((l) => l.length > 0).length;

// ---- restore: what a file brings is carried, never own ------------------------------------

type Incoming = {
  batchId: string;
  root: string;
  proofs: Record<string, InclusionProof>;
  ots?: unknown;
  tsts?: unknown;
};

/** The batches a file names for the records here, each proof checked: from its `proofs` and `stamps`, and its `carried`. */
const incomingBatches = async (
  file: Record<string, unknown> | undefined,
  fileProofs: unknown,
  here: ReadonlySet<string>,
): Promise<Incoming[]> => {
  const out = new Map<string, Incoming>();
  const add = async (fp: string, raw: unknown, batchId?: string, root?: string): Promise<Incoming | undefined> => {
    if (!here.has(fp) || raw === undefined) return undefined;
    const st = await checkProof(fp, raw);
    if (st.status === 'none') return undefined;
    const p = keepable(st.proof);
    if ((batchId !== undefined && p.batchId !== batchId) || (root !== undefined && p.root !== root)) return undefined;
    if (p.batchId.length > 128) return undefined;
    const k = batchKey(p.batchId, p.root);
    const e = out.get(k) ?? { batchId: p.batchId, root: p.root, proofs: {} };
    e.proofs[fp] = p;
    out.set(k, e);
    return e;
  };
  // The file's own part: its proofs, and its batches' files where the root matches.
  if (isObject(fileProofs)) for (const fp of Object.keys(fileProofs)) await add(fp, fileProofs[fp]);
  const batches = file && isObject(file.batches) ? file.batches : {};
  for (const e of out.values()) {
    const raw = batches[e.batchId];
    if (isObject(raw) && raw.root === e.root) {
      e.ots = raw.ots;
      e.tsts = raw.tsts;
    }
  }
  // What the file carried itself.
  for (const it of Array.isArray(file?.carried) ? (file.carried as unknown[]).slice(0, 4096) : []) {
    if (!isObject(it) || it.kind !== 'batch' || !isString(it.batchId) || !isString(it.root) || !HEX64.test(it.root))
      continue;
    let e: Incoming | undefined;
    for (const [fp, raw] of Object.entries(isObject(it.proofs) ? it.proofs : {}))
      e = (await add(fp, raw, it.batchId, it.root)) ?? e;
    if (e) {
      e.ots ??= it.ots;
      e.tsts ??= it.tsts;
    }
  }
  return [...out.values()];
};

/** A carried item made from what came in: only what checks, small enough. */
const checkedItem = async (
  e: Incoming,
  pins: readonly TsaPin[],
): Promise<{ item: CarriedBatch; otsStatus?: 'bitcoin' | 'pending' }> => {
  const read = await readOts(e.ots, e.root, CARRIED_FILE_CHARS);
  const tsts = await checkedTokens(e.tsts, hexBytes(e.root), pins);
  return {
    item: {
      kind: 'batch',
      batchId: e.batchId,
      root: e.root,
      proofs: e.proofs,
      ...(read ? { ots: e.ots as string } : {}),
      ...(tsts.length ? { tsts } : {}),
    },
    ...(read ? { otsStatus: read.status } : {}),
  };
};

/** Over a cap, the item with the lowest sequence number goes first (see the top of this file). */
const enforceCaps = (s: Store): void => {
  const bySeq = () => Object.entries(s.carried).sort((a, b) => a[1].seq - b[1].seq);
  // Roots per batch id.
  const perBatch = new Map<string, string[]>();
  for (const [k, it] of bySeq())
    if (it.kind === 'batch') perBatch.set(it.batchId, [...(perBatch.get(it.batchId) ?? []), k]);
  for (const keys of perBatch.values())
    for (const k of keys.slice(0, Math.max(0, keys.length - MAX_ALTERNATIVES))) delete s.carried[k];
  // Batches per record: the record's proof leaves the oldest.
  const perRecord = new Map<string, string[]>();
  for (const [k, it] of bySeq())
    if (it.kind === 'batch')
      for (const fp of Object.keys(it.proofs)) perRecord.set(fp, [...(perRecord.get(fp) ?? []), k]);
  for (const [fp, keys] of perRecord)
    for (const k of keys.slice(0, Math.max(0, keys.length - MAX_ALTERNATIVES))) {
      const it = s.carried[k];
      if (!it || it.kind !== 'batch') continue;
      const proofs = { ...it.proofs };
      delete proofs[fp];
      if (Object.keys(proofs).length === 0) delete s.carried[k];
      else s.carried[k] = { ...it, proofs };
    }
  // All of it.
  while (Object.keys(s.carried).length && pack(s.carried).length * 0.75 > CARRIED_BUDGET)
    delete s.carried[bySeq()[0][0]];
};

/** Batch ids, among those the records here sit in, that two carried roots name. */
const disputedBatches = (s: Store, fps: ReadonlySet<string>): string[] => {
  const roots = new Map<string, Set<string>>();
  for (const it of Object.values(s.carried))
    if (it.kind === 'batch' && Object.keys(it.proofs).some((fp) => fps.has(fp)))
      roots.set(it.batchId, (roots.get(it.batchId) ?? new Set()).add(it.root));
  return [...roots].filter(([, r]) => r.size > 1).map(([id]) => id);
};

export type StampsRestored = {
  /** Bitcoin files and tokens the file brought that weren't kept here before. */
  readonly stamps: number;
  /** Batches of the records here that two backup files give different roots for. */
  readonly disagree: number;
};

/**
 * Put what a backup file carries in CARRIED, for the records here, each checked for form first
 * (see the top of this file). OWN is never touched. `fileProofs` is the file's `proofs`;
 * `records` are the records this browser holds after the restore; `pins` the timestamp
 * authorities this site trusts (tests pass their own).
 */
export const restoreStamps = async (
  fromFile: unknown,
  fileProofs: unknown,
  records: readonly { readonly id: string; readonly recordFingerprint?: string }[],
  pins: readonly TsaPin[] = TSA_PINS,
): Promise<StampsRestored> => {
  const here = new Set<string>();
  const store = load();
  for (const r of records) {
    const fp = r.recordFingerprint;
    if (!fp || !HEX64.test(fp)) continue;
    here.add(fp);
    store.own.ids[fp] ??= r.id;
  }
  if (here.size === 0) return { stamps: 0, disagree: 0 };
  const file = isObject(fromFile) && fromFile.format === STAMPS_FORMAT ? fromFile : undefined;
  let stamps = 0;
  for (const e of await incomingBatches(file, fileProofs, here)) {
    const { item, otsStatus } = await checkedItem(e, pins);
    // What OWN already holds for this batch and root (the registry gave it) isn't carried again.
    const ownB = store.own.batches[batchKey(item.batchId, item.root)];
    const proofs = Object.fromEntries(
      Object.entries(item.proofs).filter(([fp, p]) => !(store.own.proofs[fp] && sameBatch(store.own.proofs[fp], p))),
    );
    const k = carriedKey(item);
    const had = store.carried[k] as (Kept & CarriedBatch) | undefined;
    const ots = item.ots && !(ownB?.ots === item.ots) ? item.ots : undefined;
    const tsts = (item.tsts ?? []).filter((t) => !ownB?.tsts?.some((x) => x.token === t.token));
    if (!had && Object.keys(proofs).length === 0) continue;
    const takeOts = !!(ots && otsStatus && better(had, otsStatus, false) && had?.ots !== ots);
    const newTsts = tsts.filter((t) => !had?.tsts?.some((x) => x.token === t.token));
    stamps += (takeOts ? 1 : 0) + Math.min(newTsts.length, MAX_CARRIED_TOKENS - (had?.tsts?.length ?? 0));
    store.carried[k] = {
      kind: 'batch',
      batchId: item.batchId,
      root: item.root,
      proofs: { ...(had?.proofs ?? {}), ...proofs },
      ...(takeOts ? { ots } : had?.ots ? { ots: had.ots } : {}),
      ...(had?.tsts?.length || newTsts.length ? { tsts: mergeTokens(had?.tsts, newTsts, MAX_CARRIED_TOKENS) } : {}),
      seq: ++store.seq,
    };
  }
  // Each record's own tokens: from the file's `records`, and its carried ones.
  const fileRecords: [string, unknown][] = [
    ...Object.entries(file && isObject(file.records) ? file.records : {}).map(
      ([fp, r]) => [fp, isObject(r) ? r.instant : undefined] as [string, unknown],
    ),
    ...(Array.isArray(file?.carried) ? (file.carried as unknown[]) : [])
      .filter((it): it is Record<string, unknown> => isObject(it) && it.kind === 'record' && isString(it.fp))
      .map((it) => [it.fp as string, it.instant] as [string, unknown]),
  ];
  for (const [fp, list] of fileRecords) {
    if (!here.has(fp)) continue;
    const ownHas = store.own.records[fp]?.instant ?? [];
    const tokens = (await checkedTokens(list, hexBytes(fp), pins)).filter(
      (t) => !ownHas.some((x) => x.token === t.token),
    );
    const k = `r ${fp}`;
    const had = store.carried[k] as (Kept & CarriedRecord) | undefined;
    const fresh = tokens.filter((t) => !had?.instant.some((x) => x.token === t.token));
    if (!fresh.length && !had) continue;
    stamps += Math.min(fresh.length, MAX_CARRIED_TOKENS - (had?.instant.length ?? 0));
    store.carried[k] = {
      kind: 'record',
      fp,
      instant: mergeTokens(had?.instant, fresh, MAX_CARRIED_TOKENS),
      seq: ++store.seq,
    };
  }
  enforceCaps(store);
  save(store);
  return { stamps, disagree: disputedBatches(store, here).length };
};

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

/** Another root backup files gave for the same batch: shown beside the one the bundle carries. */
export type Alternative = {
  readonly batchId: string;
  readonly root: string;
  readonly proof?: InclusionProof;
  readonly ots?: Uint8Array;
  readonly anchor?: unknown;
  /** VeilCore's registry gave this root for the batch (for another of the holder's records). */
  readonly fromRegistry?: true;
};

/**
 * What this browser has for one record, for the evidence bundle when the registry is out of
 * reach: OWN (`confirmed`: the registry gave it), or else the newest carried batch for it
 * (`confirmed: false`), with any other root carried for the same batch as `alternatives`.
 */
export const keptEvidence = async (
  fp: string,
): Promise<{
  proof: InclusionProof;
  batch: Record<string, unknown>;
  ots: Uint8Array | null;
  confirmed: boolean;
  alternatives: Alternative[];
} | null> => {
  if (!HEX64.test(fp)) return null;
  const store = load();
  const own = store.own.proofs[fp];
  if (own) {
    const st = await checkProof(fp, own);
    if (st.status !== 'none')
      return {
        proof: st.proof,
        confirmed: true,
        alternatives: [],
        ...(await batchFacts(st.proof, store.own.batches[batchKey(st.proof.batchId, st.proof.root)])),
      };
  }
  const mine = Object.values(store.carried)
    .filter((it): it is Kept & CarriedBatch => it.kind === 'batch' && it.proofs[fp] !== undefined)
    .sort((a, b) => b.seq - a.seq);
  for (const it of mine) {
    const st = await checkProof(fp, it.proofs[fp]);
    if (st.status === 'none' || !sameBatch(st.proof, it)) continue;
    const others = Object.values(store.carried).filter(
      (o): o is Kept & CarriedBatch =>
        o.kind === 'batch' && o !== it && (o.batchId === it.batchId || o.proofs[fp] !== undefined),
    );
    const alternatives: Alternative[] = [];
    for (const o of others) {
      const ap = o.proofs[fp] ? await checkProof(fp, o.proofs[fp]) : null;
      const read = o.ots ? await readOts(o.ots, o.root) : null;
      alternatives.push({
        batchId: o.batchId,
        root: o.root,
        ...(ap && ap.status !== 'none' ? { proof: ap.proof, anchor: ap.proof.anchor } : {}),
        ...(read && o.ots ? { ots: b64Bytes(o.ots) } : {}),
      });
    }
    // The registry gave this batch another root (for another record here): said too.
    const ownRoots = new Set(
      Object.values(store.own.proofs)
        .filter((p) => p.batchId === it.batchId && p.root !== it.root)
        .map((p) => p.root),
    );
    for (const root of ownRoots) {
      if (alternatives.some((a) => a.root === root)) continue;
      const b = store.own.batches[batchKey(it.batchId, root)];
      const read = b?.ots ? await readOts(b.ots, root) : null;
      alternatives.push({
        batchId: it.batchId,
        root,
        fromRegistry: true,
        ...(read && b?.ots ? { ots: b64Bytes(b.ots) } : {}),
      });
    }
    return { proof: st.proof, confirmed: false, alternatives, ...(await batchFacts(st.proof, it)) };
  }
  return null;
};
