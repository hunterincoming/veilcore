// The files that check a record's dates on the two clocks that don't depend on Midnight, kept by
// the holder (foundation review of 26 Nov 2026, failure-recovery item 1).
//
// A record's batch root is stamped on Bitcoin (OpenTimestamps: root.bin.ots) and by one or more
// Time Stamping Authorities (RFC 3161: the batch's tokens, root.tst); a record's own proof code
// may also have RFC 3161 tokens of its own (/proof/:commitment/instant). These used to live only
// on VeilCore's registry: the backup file kept the record and its inclusion proof, so a holder
// with a perfect backup and no registry kept the Midnight date and lost the other two clocks.
//
// Now:
//   - each backup (backup.ts withRecordsAndProofs) asks the registry for what it has and keeps
//     it in this browser (`veilcore.stamps.v1`), and the file carries it (`stamps`), with every
//     record's inclusion proof. A pending Bitcoin stamp (only a calendar's promise so far) is kept,
//     and a later backup fetches the finished one when the registry has it; a finished one is
//     never swapped for a pending one. A backup made while the registry is out of reach still
//     carries everything this browser kept before, proofs included;
//   - a restore (backup.ts restoreAny) puts them back only once each one checks, never on the
//     file's word: a batch's files only for a batch an inclusion proof of a record here leads to,
//     with that proof's root (a stamp moved to another batch starts from the wrong root and is
//     refused); the Bitcoin file must start from SHA-256 of that root (verify.html's own reader);
//     every RFC 3161 token must verify against the bytes it stamps (the batch root, or the
//     record's proof code). An item that fails is left out; nothing of it is written;
//   - the evidence bundle (evidence/bundle.ts gatherEvidence) uses what is kept here when the
//     registry can't be reached, so it still carries root.bin.ots and root.tst.
//
// Everything here is public data (the registry serves it to anyone with the proof code); it is
// stored compressed, because a TSA token carries its certificate chain (a few kilobytes) and
// those repeat from token to token. Kept for the records this browser holds now; a deleted
// record's go at the next backup.
// SPDX-License-Identifier: Apache-2.0

import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { base64 } from '@scure/base';
import { verifyTimestampToken, type InclusionProof } from 'veilcore-records';
import { VeilcoreVerify } from '../../evidence-page/verify-core.js';
import { checkProof } from './proofs';
import { isNumber, isObject, isString } from './json';

const BASE = import.meta.env.VITE_API_BASE ?? '';
export const STAMPS_KEY = 'veilcore.stamps.v1';
export const STAMPS_FORMAT = 'veilcore/stamps/v1';
const HEX64 = /^[0-9a-f]{64}$/;
/** At most this many tokens per batch or per record (a registry names one per TSA it uses). */
const MAX_TOKENS = 8;
/** A token or stamp file bigger than this (base64 characters) isn't one a registry makes. */
const MAX_FILE_CHARS = 64 * 1024;
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

/** What the backup file carries (`stamps`). */
export type StampsInFile = {
  readonly format: typeof STAMPS_FORMAT;
  /** By batch id. */
  readonly batches: Readonly<Record<string, BatchStamps>>;
  /** By proof code. */
  readonly records: Readonly<Record<string, RecordStamps>>;
};

/** What this browser keeps: the same, and each record's inclusion proof (by proof code). */
type Kept = {
  batches: Record<string, BatchStamps>;
  records: Record<string, RecordStamps>;
  proofs: Record<string, InclusionProof>;
};

const empty = (): Kept => ({ batches: {}, records: {}, proofs: {} });

const load = (): Kept => {
  try {
    const raw = localStorage.getItem(STAMPS_KEY);
    if (!raw) return empty();
    const box: unknown = JSON.parse(raw);
    if (!isObject(box) || box.v !== 1 || !isString(box.z)) return empty();
    const v: unknown = JSON.parse(strFromU8(inflateSync(base64.decode(box.z))));
    if (!isObject(v)) return empty();
    return {
      batches: isObject(v.batches) ? (v.batches as Kept['batches']) : {},
      records: isObject(v.records) ? (v.records as Kept['records']) : {},
      proofs: isObject(v.proofs) ? (v.proofs as Kept['proofs']) : {},
    };
  } catch {
    return empty();
  }
};

/** Kept best effort: a browser that refuses the write still has the backup file. */
const save = (k: Kept): void => {
  try {
    const z = base64.encode(deflateSync(strToU8(JSON.stringify(k)), { level: 9 }));
    localStorage.setItem(STAMPS_KEY, JSON.stringify({ v: 1, z }));
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

/** A token that verifies against the bytes it stamps (imprint and signature, veilcore-records). */
const tokenChecks = async (t: unknown, stamped: Uint8Array): Promise<boolean> => {
  if (!isString(t) || t.length > MAX_FILE_CHARS) return false;
  try {
    return (await verifyTimestampToken(t, stamped)).ok;
  } catch {
    return false;
  }
};

/** What a Bitcoin stamp file shows about this root, read as verify.html reads it; null if it isn't about it. */
export const readOts = async (
  b64: unknown,
  root: string,
): Promise<{ status: 'bitcoin' | 'pending'; height?: number } | null> => {
  if (!isString(b64) || b64.length > MAX_FILE_CHARS || !HEX64.test(root)) return null;
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

/** Tokens added to a list, each once, at most MAX_TOKENS. */
const mergeTokens = (had: readonly TokenEntry[] = [], add: readonly TokenEntry[]): TokenEntry[] => {
  const out = [...had];
  for (const t of add) if (out.length < MAX_TOKENS && !out.some((x) => x.token === t.token)) out.push(t);
  return out;
};

/** The checked tokens of a list as it arrived (a registry's answer or a file's entry). */
const checkedTokens = async (list: unknown, stamped: Uint8Array): Promise<TokenEntry[]> => {
  const out: TokenEntry[] = [];
  for (const t of Array.isArray(list) ? list.slice(0, MAX_TOKENS) : []) {
    if (!isObject(t) || !(await tokenChecks(t.token, stamped))) continue;
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
const better = (had: BatchStamps | undefined, status: 'bitcoin' | 'pending', fromRegistry: boolean): boolean =>
  !had?.ots || (had.otsStatus !== 'bitcoin' && (status === 'bitcoin' || fromRegistry));

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
 * For a backup about to be made: the stamps of these records, refreshed from the registry where
 * it answers, and kept here. `proofs` (by proof code) are the inclusion proofs the registry just
 * gave, each already checked against its record (proofs.ts proofFor); a proof code it didn't give
 * one for now (out of reach) gets the one kept here, checked again, added to `proofs`. Never
 * throws: what can't be had now is what was kept before.
 */
export const stampsForBackup = async (
  prints: readonly string[],
  proofs: Record<string, unknown>,
): Promise<StampsInFile | undefined> => {
  const kept = load();
  const wanted = new Set(prints.filter((p) => HEX64.test(p)));
  // Proofs: the registry's new answer, or the one kept here.
  for (const fp of wanted) {
    const fresh = proofs[fp];
    if (fresh !== undefined) {
      const s = await checkProof(fp, fresh);
      if (s.status !== 'none') kept.proofs[fp] = keepable(s.proof);
      continue;
    }
    const old = kept.proofs[fp];
    if (old === undefined) continue;
    const s = await checkProof(fp, old);
    if (s.status === 'none') delete kept.proofs[fp];
    else proofs[fp] = s.proof;
  }
  // A deleted record's go.
  for (const fp of Object.keys(kept.proofs)) if (!wanted.has(fp)) delete kept.proofs[fp];
  for (const fp of Object.keys(kept.records)) if (!wanted.has(fp)) delete kept.records[fp];

  // Each batch these records sit in, once.
  const batchOf = new Map<string, InclusionProof>();
  for (const fp of wanted) {
    const p = kept.proofs[fp];
    if (p && !batchOf.has(p.batchId)) batchOf.set(p.batchId, p);
  }
  for (const id of Object.keys(kept.batches)) if (!batchOf.has(id)) delete kept.batches[id];
  // The registry's answer for each batch just now (one of its records' proofs), if it gave one.
  const freshOf = new Map<string, unknown>();
  for (const fp of wanted) {
    const f = proofs[fp];
    if (isObject(f) && isString(f.batchId) && !freshOf.has(f.batchId) && f.root === kept.proofs[fp]?.root)
      freshOf.set(f.batchId, f);
  }
  await inBatches([...batchOf.values()], async (p) => {
    let b: BatchStamps = kept.batches[p.batchId]?.root === p.root ? kept.batches[p.batchId] : { root: p.root };
    // The batch's RFC 3161 tokens come in the proof's anchors; each checked against the root.
    const fresh = freshOf.get(p.batchId);
    const tsts = await checkedTokens(isObject(fresh) ? batchTokensOf(fresh as InclusionProof) : [], hexBytes(p.root));
    if (tsts.length) b = { ...b, tsts: mergeTokens(b.tsts, tsts) };
    // The Bitcoin file: fetched until it is finished, and kept only when it starts from this root.
    if (b.otsStatus !== 'bitcoin' && isObject(fresh) && otsAnchor(fresh as InclusionProof)) {
      const bytes = await getBytes(`${BASE}/batches/${encodeURIComponent(p.batchId)}/root.bin.ots`);
      const ots = bytes ? base64.encode(bytes) : undefined;
      const read = ots ? await readOts(ots, p.root) : null;
      if (ots && read && better(b, read.status, true)) b = withOts(b, ots, read);
    }
    kept.batches[p.batchId] = b;
  });

  // Each record's own tokens, until it has them all.
  await inBatches([...wanted], async (fp) => {
    const had = kept.records[fp];
    if ((had?.instant?.length && !had.stillAsking) || (had?.none && kept.proofs[fp])) return;
    const got = await getInstant(fp);
    if (!got) return;
    if (got.status === 404) {
      if (kept.proofs[fp] && !had?.instant?.length) kept.records[fp] = { none: true };
      return;
    }
    if (got.status !== 200 || !isObject(got.body) || got.body.status !== 'stamped') return;
    const tokens = await checkedTokens(got.body.tokens, hexBytes(fp));
    if (!tokens.length) return;
    const stillAsking = isNumber(got.body.stillAsking) && got.body.stillAsking > 0;
    kept.records[fp] = { instant: mergeTokens(had?.instant, tokens), ...(stillAsking ? { stillAsking } : {}) };
  });
  save(kept);
  return inFile(kept, wanted);
};

const inFile = (kept: Kept, wanted: ReadonlySet<string>): StampsInFile | undefined => {
  const batches: Record<string, BatchStamps> = {};
  const records: Record<string, RecordStamps> = {};
  for (const fp of wanted) {
    const p = kept.proofs[fp];
    const b = p ? kept.batches[p.batchId] : undefined;
    if (p && b && (b.ots || b.tsts?.length)) batches[p.batchId] = b;
    const r = kept.records[fp];
    if (r?.instant?.length) records[fp] = { instant: r.instant };
  }
  return Object.keys(batches).length || Object.keys(records).length
    ? { format: STAMPS_FORMAT, batches, records }
    : undefined;
};

/**
 * Put back what a backup file carries, for the records here, each checked first (see the top of
 * this file). `fileProofs` is the file's `proofs`; `fingerprints` are the proof codes of the
 * records this browser holds after the restore. Returns how many stamp files went back.
 */
export const restoreStamps = async (
  fromFile: unknown,
  fileProofs: unknown,
  fingerprints: readonly string[],
): Promise<number> => {
  const here = new Set(fingerprints.filter((f) => HEX64.test(f)));
  if (here.size === 0) return 0;
  const kept = load();
  // The batches an inclusion proof of a record here leads to, and each one's root.
  const roots = new Map<string, string>();
  for (const fp of here) {
    const candidates = [isObject(fileProofs) ? fileProofs[fp] : undefined, kept.proofs[fp]];
    for (const c of candidates) {
      if (c === undefined) continue;
      const s = await checkProof(fp, c);
      if (s.status === 'none') continue;
      kept.proofs[fp] ??= keepable(s.proof);
      roots.set(s.proof.batchId, s.proof.root);
      break;
    }
  }
  let back = 0;
  const file = isObject(fromFile) && fromFile.format === STAMPS_FORMAT ? fromFile : undefined;
  const batches = file && isObject(file.batches) ? file.batches : {};
  for (const [id, raw] of Object.entries(batches)) {
    const root = roots.get(id);
    // Not a batch a record here sits in, or a root that isn't that batch's: none of it.
    if (!root || !isObject(raw) || raw.root !== root) continue;
    let b: BatchStamps = kept.batches[id]?.root === root ? kept.batches[id] : { root };
    const read = await readOts(raw.ots, root);
    if (read && better(b, read.status, false)) {
      b = withOts(b, raw.ots as string, read);
      back++;
    }
    const tsts = (await checkedTokens(raw.tsts, hexBytes(root))).filter(
      (t) => !b.tsts?.some((x) => x.token === t.token),
    );
    if (tsts.length) {
      b = { ...b, tsts: mergeTokens(b.tsts, tsts) };
      back += tsts.length;
    }
    if (b.ots || b.tsts?.length) kept.batches[id] = b;
  }
  const records = file && isObject(file.records) ? file.records : {};
  for (const [fp, raw] of Object.entries(records)) {
    if (!here.has(fp) || !isObject(raw)) continue;
    const had = kept.records[fp];
    const tokens = (await checkedTokens(raw.instant, hexBytes(fp))).filter(
      (t) => !had?.instant?.some((x) => x.token === t.token),
    );
    if (!tokens.length) continue;
    kept.records[fp] = { ...had, instant: mergeTokens(had?.instant, tokens), none: undefined };
    back += tokens.length;
  }
  save(kept);
  return back;
};

/** What this browser keeps for one record, for the evidence bundle when the registry is out of reach. */
export const keptEvidence = async (
  fp: string,
): Promise<{ proof: InclusionProof; batch: Record<string, unknown>; ots: Uint8Array | null } | null> => {
  if (!HEX64.test(fp)) return null;
  const kept = load();
  const raw = kept.proofs[fp];
  if (raw === undefined) return null;
  const s = await checkProof(fp, raw);
  if (s.status === 'none') return null;
  const proof = s.proof;
  const b = kept.batches[proof.batchId];
  const mine = b && b.root === proof.root ? b : undefined;
  const read = mine?.ots ? await readOts(mine.ots, proof.root) : null;
  const tst = mine?.tsts?.[0];
  return {
    proof,
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
    ots: read && mine?.ots ? (b64Bytes(mine.ots) ?? null) : null,
  };
};
