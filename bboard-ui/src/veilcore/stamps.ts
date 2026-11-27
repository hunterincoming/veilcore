// The files that check a record's dates on the two clocks that don't depend on Midnight, kept by
// the holder (foundation review of 26 Nov 2026, failure-recovery item 1).
//
// A record's batch root is stamped on Bitcoin (OpenTimestamps: root.bin.ots) and by one or more
// Time Stamping Authorities (RFC 3161: the batch's tokens, root.tst); a record's own proof code
// may also have RFC 3161 tokens of its own (/proof/:commitment/instant). These used to live only
// on VeilCore's registry: the backup file kept the record and its inclusion proof, so a holder
// with a perfect backup and no registry kept the Midnight date and lost the other two clocks.
//
// Two parts, never mixed (fourth review of PR #233: the simplest design that can't be gamed):
//
//   - THE REGISTRY'S PART: what VeilCore's registry answered this browser. Each backup
//     (backup.ts withRecordsAndProofs) asks the registry for each record's proof, its batch's
//     Bitcoin file and tokens, and the record's own tokens, checks each against the record or the
//     batch root, and keeps them. Nothing from a backup file ever goes in here. A pending Bitcoin
//     file is kept and the finished one taken when the registry has it; a finished one is never
//     swapped back. If the registry ever answers with another root for a record whose batch it
//     already gave (an honest registry never changes a sealed batch), the first answer stays, the
//     new one is kept aside, and the backup page warns (rootChanges). Nothing here is deleted
//     except when its record is deleted on this browser (record-keys.ts wasForgotten);
//
//   - CARRIED SECTIONS: each restored backup file's stamps, as ONE sealed section, kept exactly as
//     it passed the checks below and named by the SHA-256 of its canonical bytes. Sections are
//     never merged, edited, upgraded or evicted: a later file can't change or remove an earlier
//     one. Restoring a file whose section is already kept changes nothing. At most MAX_SECTIONS
//     sections and CARRIED_BUDGET compressed bytes: past that a new section is refused, the
//     restore page says so, and nothing kept is changed. Every later backup writes every section
//     as it is (`stamps.carried`). The checks, so junk stays out: each proof must lead from one of
//     this holder's records to the root it names (one batch per record per section), a Bitcoin
//     file must start from SHA-256 of that root (verify.html's reader), a token must verify
//     against what it stamps and be signed by a timestamp authority this site pins, within that
//     certificate's dates (config/tsa-pins.json, as instant-stamp.ts), and each file or token is
//     at most CARRIED_FILE_CHARS, at most MAX_CARRIED_TOKENS per item. A section is a copy of
//     what a file said, never VeilCore's answer: it is used only for an evidence bundle when the
//     registry can't be reached, every section that covers the record side by side, none ranked
//     first, each labelled on every page as restored from a backup file and not yet confirmed.
//     The holder's backup files themselves are never changed by any of this: they stay the
//     lasting copy.
//
// Everything here is public data (the registry serves it to anyone with the proof code); it is
// stored compressed, because a TSA token carries its certificate chain (a few kilobytes) and
// those repeat from token to token.
// SPDX-License-Identifier: Apache-2.0

import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { base64 } from '@scure/base';
import { canonicalise, verifyTimestampToken, type InclusionProof } from 'veilcore-records';
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
/** Carried sections kept at most (one per restored backup file). */
export const MAX_SECTIONS = 8;
/** All carried sections together, compressed as stored. */
export const CARRIED_BUDGET = 512 * 1024;
/** Items a part may hold before the rest are left out (a file names one batch per record). */
const MAX_SECTION_ITEMS = 4096;
/** Parts one file's section may hold (its own and the ones it carried). */
const MAX_PARTS = 16;
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

/** One batch in a carried section: a root the file named, the proofs of this holder's records that lead to it, its files. */
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
/** What one source said: a file's own part, or one section an earlier backup carried. */
export type CarriedPart = { readonly items: readonly CarriedItem[] };
/**
 * One restored backup file's stamps, sealed: its own part and every part it carried, in a
 * deterministic order; `id` is the SHA-256 of their canonical JSON.
 */
export type CarriedSection = { readonly id: string; readonly parts: readonly CarriedPart[] };

/** Every item of a section. */
export const itemsOf = (sec: CarriedSection): CarriedItem[] => sec.parts.flatMap((p) => p.items);

/** What the backup file carries (`stamps`). */
export type StampsInFile = {
  readonly format: typeof STAMPS_FORMAT;
  /** By batch id: what the registry gave the browser that made the file. */
  readonly batches: Readonly<Record<string, BatchStamps>>;
  /** By proof code: what the registry gave the browser that made the file. */
  readonly records: Readonly<Record<string, RecordStamps>>;
  /**
   * Every carried section that browser kept, as it kept them, oldest first, and one for any root
   * the registry gave later for a batch it had already given: never confirmed by anyone.
   */
  readonly carried?: readonly CarriedSection[];
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
type Store = { own: Own; sections: CarriedSection[] };

/** A batch's key: its id and its root, so one root's files never stand in for another's. */
const batchKey = (batchId: string, root: string): string => `${batchId} ${root}`;

const emptyOwn = (): Own => ({ batches: {}, records: {}, proofs: {}, changed: {}, ids: {} });
const empty = (): Store => ({ own: emptyOwn(), sections: [] });

const obj = <T>(v: unknown): Record<string, T> => (isObject(v) ? (v as Record<string, T>) : {});

const load = (): Store => {
  try {
    const raw = localStorage.getItem(STAMPS_KEY);
    if (!raw) return empty();
    const box: unknown = JSON.parse(raw);
    if (!isObject(box) || box.v !== 4 || !isString(box.z)) return empty();
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
      sections: Array.isArray(v.sections)
        ? (v.sections as CarriedSection[]).filter((x) => isObject(x) && isString(x.id) && Array.isArray(x.parts))
        : [],
    };
  } catch {
    return empty();
  }
};

const pack = (v: unknown): string => base64.encode(deflateSync(strToU8(JSON.stringify(v)), { level: 9 }));
/** The compressed bytes the sections take, as stored. */
const sectionBytes = (sections: readonly CarriedSection[]): number => Math.ceil((pack(sections).length * 3) / 4);

/** Kept best effort: a browser that refuses the write still has the backup file. */
const save = (s: Store): void => {
  try {
    localStorage.setItem(STAMPS_KEY, JSON.stringify({ v: 4, z: pack(s) }));
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

/** JSON as kept: only strings, finite numbers, booleans, arrays and plain objects; no null, no unknown types. */
const plain = (v: unknown, depth = 0): unknown => {
  if (depth > 8) return undefined;
  if (isString(v) || typeof v === 'boolean') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (Array.isArray(v))
    return v
      .slice(0, 64)
      .map((x) => plain(x, depth + 1))
      .filter((x) => x !== undefined);
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
 * A proof as kept here, rebuilt from its known fields only (review 5): the commitment, the path,
 * the root and batch, when it was sealed, and the registry's anchors, without the batch tokens
 * (kept once, per batch). Anything else, any null, any field of the wrong type, is dropped, so
 * what is kept and named is always plain, canonical JSON.
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
  const anchors = Array.isArray(r.anchors)
    ? (r.anchors as unknown[])
        .filter(isObject)
        .slice(0, 16)
        .map((a) => {
          const c = plain(a) as Record<string, unknown>;
          if (c.kind === 'rfc3161') delete c.token;
          return c;
        })
    : undefined;
  return {
    ...(isNumber(r.formatVersion) ? { formatVersion: r.formatVersion } : {}),
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

/**
 * What belongs only to records deleted on this browser goes: their proofs and own tokens in the
 * registry's part, and a batch's files once no proof kept there leads to them. Carried sections
 * are sealed: a deleted record's proofs in them stay until the section's last record is deleted,
 * and then the section goes.
 */
const pruneDeleted = (s: Store): void => {
  const o = s.own;
  const gone = new Set(Object.keys(o.ids).filter((fp) => wasForgotten(o.ids[fp])));
  if (gone.size === 0) return;
  // A section goes only once none of the records it covers is held here any more.
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
  const covers = (sec: CarriedSection) =>
    itemsOf(sec).flatMap((it) => (it.kind === 'batch' ? Object.keys(it.proofs) : [it.fp]));
  s.sections = s.sections.filter((sec) => covers(sec).some((fp) => fp in o.ids));
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
  try {
    await refreshFromRegistry(own, wanted, proofs);
  } catch {
    /* what the registry gave before stays, and goes in the file */
  }
  save(store);
  return inFile(store, wanted).catch(() => undefined);
};

/** OWN refreshed from the registry's answers (stampsForBackup). */
const refreshFromRegistry = async (own: Own, wanted: ReadonlySet<string>, proofs: Record<string, unknown>) => {
  for (const fp of wanted) {
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
};

const sha256Hex = async (text: string): Promise<string> => {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', strToU8(text)));
  return Array.from(d, (x) => x.toString(16).padStart(2, '0')).join('');
};
const itemKey = (i: CarriedItem): string => (i.kind === 'batch' ? `b ${i.batchId} ${i.root}` : `r ${i.fp}`);
const byText =
  <T>(key: (x: T) => string) =>
  (a: T, b: T) =>
    key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0;
/** Tokens in a fixed order, each once. */
const sortedTokens = (list: readonly TokenEntry[]): TokenEntry[] =>
  [...new Map(list.map((t) => [t.token, t])).values()].sort(byText((t) => t.token));

/** A part in a fixed order (items by kind and name, tokens sorted, each once), so the same evidence is named the same. */
const normalPart = (items: readonly CarriedItem[]): CarriedPart => ({
  items: [...items]
    .map(
      (i): CarriedItem =>
        i.kind === 'batch'
          ? { ...i, ...(i.tsts ? { tsts: sortedTokens(i.tsts) } : {}) }
          : { ...i, instant: sortedTokens(i.instant) },
    )
    .sort(byText(itemKey)),
});

/** A section from parts: each part in its fixed order, parts in a fixed order, each once; named by the SHA-256 of its canonical JSON. */
const sealSection = async (parts: readonly CarriedPart[]): Promise<CarriedSection> => {
  const unique = new Map<string, CarriedPart>();
  for (const p of parts) {
    const n = normalPart(p.items);
    if (n.items.length) unique.set(canonicalise(n), n);
  }
  const sorted = [...unique.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([, p]) => p);
  return { id: await sha256Hex(canonicalise({ parts: sorted })), parts: sorted };
};

/** The registry's later answers kept aside, as one section for the file (never lost, never trusted). */
const changedSection = async (own: Own, wanted: ReadonlySet<string>): Promise<CarriedSection | undefined> => {
  const by = new Map<string, { batchId: string; root: string; proofs: Record<string, InclusionProof> }>();
  for (const fp of wanted)
    for (const p of own.changed[fp] ?? []) {
      const k = batchKey(p.batchId, p.root);
      const e = by.get(k) ?? { batchId: p.batchId, root: p.root, proofs: {} };
      e.proofs[fp] = keepable(p);
      by.set(k, e);
    }
  if (by.size === 0) return undefined;
  const items: CarriedItem[] = [...by.entries()].map(([k, e]) => {
    const b = own.batches[k];
    return {
      kind: 'batch',
      ...e,
      ...(b?.ots ? { ots: b.ots } : {}),
      ...(b?.tsts?.length ? { tsts: b.tsts } : {}),
    };
  });
  return sealSection([{ items }]);
};

/** What the file carries: the registry's part for these records, and every carried section as kept. */
const inFile = async (store: Store, wanted: ReadonlySet<string>): Promise<StampsInFile | undefined> => {
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
  // Never lets a failure here take the registry's part or the kept sections out of the file.
  const changed = await changedSection(own, wanted).catch(() => undefined);
  const carried = [
    ...store.sections,
    ...(changed && !store.sections.some((s) => s.id === changed.id) ? [changed] : []),
  ];
  return Object.keys(batches).length || Object.keys(records).length || carried.length
    ? { format: STAMPS_FORMAT, batches, records, ...(carried.length ? { carried } : {}) }
    : undefined;
};

/** How many records the registry has given a different batch or root for, after giving one (an honest registry never does). */
export const rootChanges = (): number => Object.values(load().own.changed).filter((l) => l.length > 0).length;

// ---- restore: each file's stamps become one sealed section, never the registry's part -------

type Incoming = {
  batchId: string;
  root: string;
  proofs: Record<string, InclusionProof>;
  ots?: unknown;
  tsts?: unknown;
};

/** One section's batch items as they came, each proof checked against a record here. */
const checkedBatches = async (
  raw: readonly { batchId: unknown; root: unknown; proofs: unknown; ots?: unknown; tsts?: unknown }[],
  here: ReadonlySet<string>,
  pins: readonly TsaPin[],
): Promise<CarriedBatch[]> => {
  const incoming: Incoming[] = [];
  for (const it of raw.slice(0, MAX_SECTION_ITEMS)) {
    if (!isString(it.batchId) || it.batchId.length > 128 || !isString(it.root) || !HEX64.test(it.root)) continue;
    const proofs: Record<string, InclusionProof> = {};
    for (const [fp, p] of Object.entries(isObject(it.proofs) ? it.proofs : {})) {
      if (!here.has(fp)) continue;
      try {
        const st = await checkProof(fp, p);
        if (st.status === 'none' || st.proof.batchId !== it.batchId || st.proof.root !== it.root) continue;
        proofs[fp] = keepable(st.proof);
      } catch {
        /* this proof is left out; the rest stand */
      }
    }
    if (Object.keys(proofs).length)
      incoming.push({ batchId: it.batchId, root: it.root, proofs, ots: it.ots, tsts: it.tsts });
  }
  // One batch per record in a section: a record a section names under two batches is in neither.
  const seen = new Map<string, number>();
  for (const e of incoming) for (const fp of Object.keys(e.proofs)) seen.set(fp, (seen.get(fp) ?? 0) + 1);
  const out: CarriedBatch[] = [];
  for (const e of incoming) {
    const proofs = Object.fromEntries(Object.entries(e.proofs).filter(([fp]) => seen.get(fp) === 1));
    if (Object.keys(proofs).length === 0) continue;
    const read = await readOts(e.ots, e.root, CARRIED_FILE_CHARS).catch(() => null);
    const tsts = await checkedTokens(e.tsts, hexBytes(e.root), pins).catch(() => []);
    out.push({
      kind: 'batch',
      batchId: e.batchId,
      root: e.root,
      proofs,
      ...(read ? { ots: e.ots as string } : {}),
      ...(tsts.length ? { tsts } : {}),
    });
  }
  return out;
};

/** One section's record items: each record here's own tokens, checked. */
const checkedRecords = async (
  raw: readonly [unknown, unknown][],
  here: ReadonlySet<string>,
  pins: readonly TsaPin[],
): Promise<CarriedRecord[]> => {
  const out = new Map<string, CarriedRecord>();
  for (const [fp, list] of raw.slice(0, MAX_SECTION_ITEMS)) {
    if (!isString(fp) || !here.has(fp) || out.has(fp)) continue;
    const instant = await checkedTokens(list, hexBytes(fp), pins).catch(() => []);
    if (instant.length) out.set(fp, { kind: 'record', fp, instant });
  }
  return [...out.values()];
};

/** A part's raw items split by kind, checked; never throws: what can't be read is left out. */
const checkedPart = async (
  rawBatches: readonly { batchId: unknown; root: unknown; proofs: unknown; ots?: unknown; tsts?: unknown }[],
  rawRecords: readonly [unknown, unknown][],
  here: ReadonlySet<string>,
  pins: readonly TsaPin[],
): Promise<CarriedPart> => ({
  items: [
    ...(await checkedBatches(rawBatches, here, pins).catch(() => [])),
    ...(await checkedRecords(rawRecords, here, pins).catch(() => [])),
  ],
});

/**
 * The parts a file brings: its own (what the registry gave the browser that made it), then each
 * part of each section it carried. They become ONE section: one file takes one place, however
 * many sections it carries (review 5).
 */
const partsOf = async (
  file: Record<string, unknown> | undefined,
  fileProofs: unknown,
  here: ReadonlySet<string>,
  pins: readonly TsaPin[],
): Promise<CarriedPart[]> => {
  const out: CarriedPart[] = [];
  // Its own part: its proofs, grouped by batch, with its batches' files where the root matches.
  const groups = new Map<string, { batchId: string; root: string; proofs: Record<string, unknown> }>();
  for (const [fp, p] of Object.entries(isObject(fileProofs) ? fileProofs : {})) {
    if (!isObject(p) || !isString(p.batchId) || !isString(p.root)) continue;
    const k = batchKey(p.batchId, p.root);
    const g = groups.get(k) ?? { batchId: p.batchId, root: p.root, proofs: {} };
    g.proofs[fp] = p;
    groups.set(k, g);
  }
  const batches = file && isObject(file.batches) ? file.batches : {};
  const ownBatches = [...groups.values()].map((g) => {
    const b = batches[g.batchId];
    return { ...g, ...(isObject(b) && b.root === g.root ? { ots: b.ots, tsts: b.tsts } : {}) };
  });
  const ownRecords = Object.entries(file && isObject(file.records) ? file.records : {}).map(
    ([fp, r]) => [fp, isObject(r) ? r.instant : undefined] as [unknown, unknown],
  );
  out.push(await checkedPart(ownBatches, ownRecords, here, pins));
  // Each part of each section it carried (a section as an earlier version wrote it, `items`, is one part).
  const rawParts: unknown[] = [];
  for (const sec of (Array.isArray(file?.carried) ? (file.carried as unknown[]) : []).slice(0, MAX_PARTS)) {
    if (!isObject(sec)) continue;
    if (Array.isArray(sec.parts)) rawParts.push(...(sec.parts as unknown[]));
    else if (Array.isArray(sec.items)) rawParts.push({ items: sec.items });
  }
  for (const part of rawParts.slice(0, MAX_PARTS - 1)) {
    const items = isObject(part) && Array.isArray(part.items) ? (part.items as unknown[]) : [];
    const rawBatches = items.filter(
      (i): i is Record<string, unknown> & { batchId: unknown; root: unknown; proofs: unknown } =>
        isObject(i) && i.kind === 'batch',
    );
    const rawRecords = items
      .filter((i): i is Record<string, unknown> => isObject(i) && i.kind === 'record')
      .map((i) => [i.fp, i.instant] as [unknown, unknown]);
    out.push(await checkedPart(rawBatches, rawRecords, here, pins));
  }
  return out.filter((p) => p.items.length > 0);
};

/** Whether everything in a section is already in the registry's part here: then it adds nothing. */
const coveredByOwn = (items: readonly CarriedItem[], own: Own): boolean =>
  items.every((it) => {
    if (it.kind === 'record')
      return it.instant.every((t) => own.records[it.fp]?.instant?.some((x) => x.token === t.token));
    const b = own.batches[batchKey(it.batchId, it.root)];
    return (
      Object.entries(it.proofs).every(([fp, p]) => own.proofs[fp] && sameBatch(own.proofs[fp], p)) &&
      (!it.ots || b?.ots === it.ots) &&
      (it.tsts ?? []).every((t) => b?.tsts?.some((x) => x.token === t.token))
    );
  });

/** The (batch, root) pairs every kept source gives a record: more than one means they disagree. */
const rootsFor = (s: Store, fp: string): Set<string> => {
  const out = new Set<string>();
  const p = s.own.proofs[fp];
  if (p) out.add(batchKey(p.batchId, p.root));
  for (const sec of s.sections)
    for (const it of itemsOf(sec)) if (it.kind === 'batch' && it.proofs[fp]) out.add(batchKey(it.batchId, it.root));
  return out;
};

export type StampsRestored = {
  /** 1 when this file's section was kept: a copy of what it said, not confirmed by anyone. */
  readonly kept: number;
  /** 1 when that section was already kept here (or adds nothing to what the registry gave). */
  readonly already: number;
  /** 1 when it was refused because this browser keeps as many files' sections as it can. */
  readonly refused: number;
  /** 1 when it was refused because this one file's section alone is bigger than the limit. */
  readonly tooBig: number;
  /** Records here that kept sources give more than one batch or root for. */
  readonly disagree: number;
};

/**
 * Keep what a backup file carries as ONE sealed section, for the records here, each item checked
 * for form first (see the top of this file). The registry's part is never touched; nothing kept
 * is changed. `fileProofs` is the file's `proofs`; `records` are the records this browser holds
 * after the restore; `pins` the timestamp authorities this site trusts (tests pass their own).
 * Never throws: an item that can't be read is left out, and the rest stand.
 */
export const restoreStamps = async (
  fromFile: unknown,
  fileProofs: unknown,
  records: readonly { readonly id: string; readonly recordFingerprint?: string }[],
  pins: readonly TsaPin[] = TSA_PINS,
  /** For tests: smaller limits than the site's. */
  limits: { readonly budget: number; readonly sections: number } = { budget: CARRIED_BUDGET, sections: MAX_SECTIONS },
): Promise<StampsRestored> => {
  const here = new Set<string>();
  const store = load();
  for (const r of records) {
    const fp = r.recordFingerprint;
    if (!fp || !HEX64.test(fp)) continue;
    here.add(fp);
    store.own.ids[fp] ??= r.id;
  }
  const result = { kept: 0, already: 0, refused: 0, tooBig: 0, disagree: 0 };
  if (here.size === 0) return result;
  const file = isObject(fromFile) && fromFile.format === STAMPS_FORMAT ? fromFile : undefined;
  try {
    const parts = await partsOf(file, fileProofs, here, pins);
    if (parts.length) {
      const section = await sealSection(parts);
      if (store.sections.some((x) => x.id === section.id) || coveredByOwn(itemsOf(section), store.own))
        result.already = 1;
      else if (sectionBytes([section]) > limits.budget) result.tooBig = 1;
      else if (
        store.sections.length + 1 > limits.sections ||
        sectionBytes([...store.sections, section]) > limits.budget
      )
        result.refused = 1;
      else {
        store.sections = [...store.sections, section];
        result.kept = 1;
        save(store);
      }
    }
  } catch {
    /* nothing of this file is kept; nothing kept is changed */
  }
  result.disagree = [...here].filter((fp) => rootsFor(store, fp).size > 1).length;
  return result;
};

/** How many sections this browser keeps from restored backup files. */
export const carriedCount = (): number => load().sections.length;

/**
 * Clear the copies kept from restored backup files (the holder's choice, review 5): only the
 * carried sections; the registry's part stays, and the holder's backup files are never touched.
 */
export const clearCarried = (): number => {
  const store = load();
  const n = store.sections.length;
  if (n === 0) return 0;
  store.sections = [];
  save(store);
  return n;
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

/** One carried section's batch for a record, for the bundle: everything that section has for it. */
export type CarriedEvidence = {
  /** The section's id (the SHA-256 of its canonical bytes). */
  readonly section: string;
  readonly batchId: string;
  readonly root: string;
  readonly proof: InclusionProof;
  readonly ots?: Uint8Array;
  readonly otsStatus?: 'bitcoin' | 'pending';
  readonly bitcoinBlockHeight?: number;
  /** Each token, DER. */
  readonly tsts: readonly Uint8Array[];
};

/**
 * What this browser has for one record, for the evidence bundle when the registry is out of
 * reach: the registry's part (`confirmed`), also when a carried proof leads to a root the
 * registry gave for that batch; or else every carried section that covers the record, side by
 * side, in the order they were kept (`sections`), none of them confirmed. `registryRoots`: roots
 * the registry gave the same batch, when they differ from every section's.
 */
export const keptEvidence = async (
  fp: string,
): Promise<
  | {
      readonly confirmed: true;
      readonly proof: InclusionProof;
      readonly batch: Record<string, unknown>;
      readonly ots: Uint8Array | null;
    }
  | { readonly confirmed: false; readonly sections: readonly CarriedEvidence[]; readonly registryRoots: string[] }
  | null
> => {
  if (!HEX64.test(fp)) return null;
  const store = load();
  const own = store.own.proofs[fp];
  if (own) {
    const st = await checkProof(fp, own);
    if (st.status !== 'none')
      return {
        confirmed: true,
        proof: st.proof,
        ...(await batchFacts(st.proof, store.own.batches[batchKey(st.proof.batchId, st.proof.root)])),
      };
  }
  const sections: CarriedEvidence[] = [];
  for (const sec of store.sections)
    for (const it of itemsOf(sec)) {
      if (it.kind !== 'batch' || !it.proofs[fp]) continue;
      const st = await checkProof(fp, it.proofs[fp]).catch(() => ({ status: 'none' as const }));
      if (st.status === 'none' || !sameBatch(st.proof, it)) continue;
      // The registry gave this root for this batch (for another record here): only the path is
      // the file's; the transaction, block, times and the rest are the registry's own (review 5).
      const reg = Object.values(store.own.proofs).find((p) => sameBatch(p, it));
      if (reg) {
        const joined = await checkProof(fp, { ...reg, commitment: fp, path: st.proof.path }).catch(() => ({
          status: 'none' as const,
        }));
        if (joined.status !== 'none')
          return {
            confirmed: true,
            proof: joined.proof,
            ...(await batchFacts(joined.proof, store.own.batches[batchKey(it.batchId, it.root)])),
          };
        continue;
      }
      const read = it.ots ? await readOts(it.ots, it.root).catch(() => null) : null;
      sections.push({
        section: sec.id,
        batchId: it.batchId,
        root: it.root,
        proof: st.proof,
        ...(read && it.ots
          ? {
              ots: b64Bytes(it.ots),
              otsStatus: read.status,
              ...(read.height !== undefined ? { bitcoinBlockHeight: read.height } : {}),
            }
          : {}),
        tsts: (it.tsts ?? []).map((t) => b64Bytes(t.token)).filter((b): b is Uint8Array => !!b),
      });
    }
  if (sections.length === 0) return null;
  const ids = new Set(sections.map((s) => s.batchId));
  const roots = new Set(sections.map((s) => s.root));
  const registryRoots = [
    ...new Set(
      Object.values(store.own.proofs)
        .filter((p) => ids.has(p.batchId) && !roots.has(p.root))
        .map((p) => p.root),
    ),
  ];
  return { confirmed: false, sections, registryRoots };
};
