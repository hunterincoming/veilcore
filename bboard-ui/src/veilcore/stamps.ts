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
// taken when the registry has it; a finished one is never swapped back. A proof the registry
// answers again for the same batch and root replaces the kept one, so its Midnight anchor follows
// the registry's (given once the root lands on chain, and a main-network one in place of a test
// network's), but an anchor kept is never lost to an answer without one, and a main-network
// anchor once kept is never replaced (anchorChoice, the registry's own rule). If the registry ever
// answers with another root for a record whose batch it already gave, or another main-network
// transaction for it (an honest registry does neither), the first answer stays, the new one is
// kept aside (at most MAX_ASIDE per record, the earliest) and goes in the file too, and the backup
// page warns (rootChanges). A bundle made from the file gives each such root, and each such
// transaction for one root, its own folder. Nothing here is deleted except when its record is
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
/**
 * Later answers kept aside per record (rootChanges): the earliest ones. A registry that keeps
 * giving new ones can't fill this browser's storage or the backup file; the holder is warned
 * all the same (review 10 of PR #233, polish 4).
 */
export const MAX_ASIDE = 4;
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
/** A chain or network name as the registry takes one (veilcore-api server.js NAME). */
const NAME = /^[a-z][a-z0-9-]{0,31}$/;
/** A date and time with a time zone, as the registry takes anchoredAt (veilcore-api server.js ISO_INSTANT). */
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * An anchor's fields in the form the registry stores them (veilcore-api recordAnchor: 64 lowercase
 * hex, a short lower-case network name on chain "midnight" (every page calls it a Midnight
 * transaction; review 11, polish 2), a block number of 0 or more, a date and time with a time zone,
 * and a test-network flag that agrees with the network's name), or false. These reach README.txt
 * and every page of a bundle, so one from a doctored backup file that isn't in that form is junk
 * (review 9, R9-5; review 10, polish 3).
 */
export const anchorFormOk = (a: Record<string, unknown>): boolean =>
  a.chain === 'midnight' &&
  isString(a.network) &&
  NAME.test(a.network) &&
  isString(a.txHash) &&
  HEX64.test(a.txHash) &&
  (a.contractAddress === undefined || (isString(a.contractAddress) && HEX64.test(a.contractAddress))) &&
  (a.blockHeight === undefined ||
    (isNumber(a.blockHeight) && Number.isSafeInteger(a.blockHeight) && a.blockHeight >= 0)) &&
  (a.anchoredAt === undefined ||
    (isString(a.anchoredAt) &&
      a.anchoredAt.length <= 40 &&
      ISO_INSTANT.test(a.anchoredAt) &&
      Number.isFinite(Date.parse(a.anchoredAt)))) &&
  (a.testNetwork === undefined || a.testNetwork === (a.network !== 'mainnet'));

/**
 * A proof as kept here, rebuilt from its known fields only (review 5): the format version, the
 * commitment, the path, the root and batch, when it was sealed, and the registry's anchors,
 * without the batch tokens (kept once, per batch). Anything else, any null, any field of the
 * wrong type, is dropped, so what is kept is always plain JSON; an anchor not in the registry's
 * form (anchorFormOk) is dropped whole.
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
    ...(anchor && anchorFormOk(anchor) ? { anchor } : {}),
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

const anchorOf = (p: InclusionProof): Record<string, unknown> | undefined => {
  const a: unknown = (p as unknown as Record<string, unknown>).anchor;
  return isObject(a) ? a : undefined;
};

const anchorsOf = (p: InclusionProof): unknown[] | undefined => {
  const a: unknown = (p as unknown as Record<string, unknown>).anchors;
  return Array.isArray(a) && a.length ? a : undefined;
};

/** A Midnight transaction's identity: its chain, network and hash ('' for none). */
const txKey = (a: Record<string, unknown> | undefined): string =>
  a ? JSON.stringify([a.chain, a.network, a.txHash]) : '';
/**
 * The same transaction: chain, network and transaction hash alike. The contract and block the
 * registry reports for it are its word about that one transaction, so another contract for the
 * same transaction is not another date record (review 11, polish 1): the first word kept stands.
 */
const sameAnchor = (a: Record<string, unknown> | undefined, b: Record<string, unknown> | undefined): boolean =>
  !!a && !!b && txKey(a) === txKey(b);

/**
 * Rule B, one rule for every later answer kept (set aside here, or a folder of a bundle from a
 * backup file): an answer is one batch, root and Midnight transaction. One with no transaction is
 * the same as any other for its batch and root, and gives way to one that names a transaction.
 * Returns the list with `item` added (up to `max`), put in place of the one it fills in, or as it was.
 */
const addAnswer = <T>(list: readonly T[], item: T, proofOf: (x: T) => InclusionProof, max: number): T[] => {
  const p = proofOf(item);
  const tx = anchorOf(p);
  const i = list.findIndex((x) => {
    const q = proofOf(x);
    return sameBatch(q, p) && (!anchorOf(q) || !tx || sameAnchor(anchorOf(q), tx));
  });
  if (i < 0) return list.length < max ? [...list, item] : [...list];
  return tx && !anchorOf(proofOf(list[i])) ? list.map((x, j) => (j === i ? item : x)) : [...list];
};

/**
 * Whose Midnight anchor stands when the registry answers again for a batch and root it gave
 * before (reviews 8 and 9 of PR #233), by the registry's own rule (veilcore-api batches.mjs
 * recordAnchor: "an anchor is never replaced by another on the same network", and a main-network
 * one never at all). The registry hands out a proof when the batch is sealed and adds the anchor
 * once the root lands on chain, and a test network's anchor may later give way to the main
 * network's; the root and path can't change (sameBatch, and checkProof ties them to the record).
 * - `fresh`: the registry's anchor now. Only when none was kept, or the kept one is on a test
 *   network and the new one on the main network.
 * - `kept`: the one kept before. An answer with none, the same one again, a test network's after
 *   the main network's, or another test network's.
 * - `aside`: the one kept before stays, and the answer is kept aside and warned of like a changed
 *   root (rootChanges): another main-network transaction for a batch already on the main network.
 */
type AnchorChoice = 'fresh' | 'kept' | 'aside';
const anchorChoice = (had: InclusionProof, fresh: InclusionProof): AnchorChoice => {
  const before = anchorOf(keepable(had));
  const after = anchorOf(keepable(fresh));
  if (!before) return 'fresh';
  if (!after || sameAnchor(before, after)) return 'kept';
  if (before.network !== 'mainnet') return after.network === 'mainnet' ? 'fresh' : 'kept';
  return after.network === 'mainnet' ? 'aside' : 'kept';
};

/**
 * A proof's `anchors` list with its `ledger` entry (the Midnight anchor, as the registry folds it
 * in) made the same as `anchor`, so no list names a transaction the proof's anchor doesn't.
 */
const withLedger = (list: unknown[] | undefined, anchor: Record<string, unknown> | undefined) => {
  if (!list) return undefined;
  const isLedger = (x: unknown) => isObject(x) && x.kind === 'ledger';
  const others = list.filter((x) => !isLedger(x));
  const out = anchor && list.some(isLedger) ? [{ kind: 'ledger', ...anchor }, ...others] : others;
  return out.length ? out : undefined;
};

/** A proof with this anchor (or none), its `anchors` list made to agree. */
const withAnchor = (p: Record<string, unknown>, anchor: Record<string, unknown> | undefined) => {
  const { anchor: _a, anchors: list, ...rest } = p;
  void _a;
  const anchors = withLedger(Array.isArray(list) ? list : undefined, anchor);
  return { ...rest, ...(anchor ? { anchor } : {}), ...(anchors ? { anchors } : {}) };
};

/** What is kept for a batch and root the registry gave before: its answer now, with the anchor anchorChoice picks. */
const upgraded = (had: InclusionProof, fresh: InclusionProof, choice: AnchorChoice): InclusionProof => {
  const now = keepable(fresh) as unknown as Record<string, unknown>;
  const anchor = choice === 'fresh' ? anchorOf(now as unknown as InclusionProof) : anchorOf(keepable(had));
  const list = anchorsOf(now as unknown as InclusionProof) ?? anchorsOf(had);
  return withAnchor({ ...now, ...(list ? { anchors: list } : {}) }, anchor) as unknown as InclusionProof;
};

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
          // Another batch or root (an honest registry never changes a sealed batch): the first
          // answer stays, and this one is kept aside by rule B (addAnswer) and warned of (rootChanges).
          proofs[fp] = first;
          own.changed[fp] = addAnswer(own.changed[fp] ?? [], keepable(st.proof), (x) => x, MAX_ASIDE);
        } else {
          // Same batch and root: the anchor anchorChoice picks is kept, and the file carries the
          // same. Another main-network transaction for it is kept aside the same way.
          const choice = anchorChoice(first, st.proof);
          own.proofs[fp] = upgraded(first, st.proof, choice);
          if (choice === 'aside')
            own.changed[fp] = addAnswer(own.changed[fp] ?? [], keepable(st.proof), (x) => x, MAX_ASIDE);
          const fr = proofs[fp];
          if (choice !== 'fresh' && isObject(fr)) proofs[fp] = withAnchor(fr, anchorOf(own.proofs[fp]));
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
  // The registry's later answers: one entry per batch, root and Midnight transaction (rule B's
  // identity, txKey: chain, network and hash; review 12, blocker 1), each with its batch's files.
  const changed = new Map<string, { batchId: string; root: string; proofs: Record<string, InclusionProof> }>();
  for (const fp of wanted) {
    const p = own.proofs[fp];
    const b = p ? own.batches[batchKey(p.batchId, p.root)] : undefined;
    if (p && b && (b.ots || b.tsts?.length) && !batches[p.batchId]) batches[p.batchId] = b;
    const r = own.records[fp];
    if (r?.instant?.length) records[fp] = { instant: r.instant };
    for (const c of (own.changed[fp] ?? []).slice(0, MAX_ASIDE)) {
      const k = `${batchKey(c.batchId, c.root)} ${txKey(anchorOf(c))}`;
      const e = changed.get(k) ?? { batchId: c.batchId, root: c.root, proofs: {} };
      e.proofs[fp] = c;
      changed.set(k, e);
    }
  }
  const later: ChangedBatch[] = [...changed.values()].map((e) => {
    const b = own.batches[batchKey(e.batchId, e.root)];
    return { ...e, ...(b?.ots ? { ots: b.ots } : {}), ...(b?.tsts?.length ? { tsts: b.tsts } : {}) };
  });
  return Object.keys(batches).length || Object.keys(records).length || later.length
    ? { format: STAMPS_FORMAT, batches, records, ...(later.length ? { changed: later } : {}) }
    : undefined;
};

/**
 * How many records the registry has given a different batch or root for, or another main-network
 * transaction, after giving one (an honest registry never does).
 */
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

/**
 * Rule A: the first main-network proof this browser kept for a record (its root and anchor, and so
 * its batch's kept files) is the one every bundle made here describes, whatever the registry gives
 * now (review 11, blocker 2; review 12, blocker 2). Null when no main-network anchor is kept for the
 * record. Otherwise, for the registry's `proof` of the same batch and root: that proof with the
 * kept anchor, and the other Midnight transactions the registry named for the root: `now`, its
 * answer today when it isn't the kept one (null: none in the registry's form), only when `served`
 * is given; `later`, the ones kept aside, each once. For a proof of another batch or root:
 * `otherRoot`, that root and the registry's transaction for it, and the bundle is built on the
 * kept proof (bundle.ts gatherEvidence).
 */
export const keptFirst = (
  fp: string,
  proof: InclusionProof,
  served?: { readonly anchor: unknown },
): {
  readonly proof: InclusionProof;
  readonly anchor: Record<string, unknown>;
  readonly now?: Record<string, unknown> | null;
  readonly later: readonly Record<string, unknown>[];
  readonly otherRoot?: { readonly root: string; readonly anchor: Record<string, unknown> | null };
} | null => {
  if (!HEX64.test(fp)) return null;
  const own = load();
  const p = own.proofs[fp];
  if (!p) return null;
  const kept = anchorOf(p);
  if (!kept || kept.network !== 'mainnet' || !anchorFormOk(kept)) return null;
  // The kept transaction sent again is the kept one, whatever its form (review 12, polish 5).
  const raw = served && isObject(served.anchor) ? served.anchor : undefined;
  const now = raw && (sameAnchor(raw, kept) || anchorFormOk(raw)) ? raw : null;
  const same = sameBatch(p, proof);
  const later = (own.changed[fp] ?? [])
    .filter((c) => sameBatch(c, p))
    .map(anchorOf)
    .filter((a): a is Record<string, unknown> => !!a && !sameAnchor(a, kept) && !sameAnchor(a, now ?? undefined));
  return {
    proof: same ? (withAnchor(proof, kept) as unknown as InclusionProof) : p,
    anchor: kept,
    ...(!same
      ? { otherRoot: { root: proof.root, anchor: now } }
      : served && !sameAnchor(kept, now ?? undefined)
        ? { now }
        : {}),
    later,
  };
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
  /**
   * True when an earlier folder has this same batch and root with another Midnight transaction:
   * the registry gave a second date record for one root (review 10 of PR #233, blocker 3).
   */
  readonly otherTransaction?: boolean;
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
  let roots: FileEvidence[] = [];
  let firstRoot: { batchId: string; root: string } | undefined;
  for (const c of candidates) {
    try {
      const st = await checkProof(fp, c.proof);
      if (st.status === 'none') continue;
      const { batchId, root } = st.proof;
      if (!c.later) firstRoot = { batchId, root };
      const f = isObject(c.files) && c.files.root === root ? c.files : {};
      const read = await readOts(f.ots, root);
      const bytes = read && isString(f.ots) ? b64Bytes(f.ots) : undefined;
      const tsts = (await checkedTokens(f.tsts, hexBytes(root), pins))
        .map((t) => b64Bytes(t.token))
        .filter((b): b is Uint8Array => !!b);
      // Rule B (addAnswer): one folder per batch, root and Midnight transaction, so every page
      // names each transaction and no offline bundle loses one the registry gave later.
      roots = addAnswer(
        roots,
        {
          batchId,
          root,
          proof: keepable(st.proof),
          ...(read && bytes
            ? { ots: { bytes, status: read.status, ...(read.height !== undefined ? { height: read.height } : {}) } }
            : {}),
          tsts,
          later: c.later,
        },
        (r) => r.proof,
        MAX_FILE_ROOTS + 1,
      );
    } catch {
      /* junk: left out; the rest stand */
    }
  }
  // Given later: a root other than the file's first answer. A folder with the same batch and root
  // as an earlier one names another transaction for it.
  roots = roots.map((r, i) => ({
    ...r,
    later: r.later && !(firstRoot && sameBatch(r, firstRoot)),
    ...(roots.slice(0, i).some((e) => sameBatch(e, r)) ? { otherTransaction: true } : {}),
  }));
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
