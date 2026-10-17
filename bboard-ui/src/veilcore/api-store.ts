// Server-backed Store, and the one place records and licences cross to VeilCore's registry.
//
// Sealed records (CONTRACT.md): every row is sealed here before a save and opened here
// after a load, with this browser's vault key (vault.ts), which never leaves it. The
// registry keeps a record's public fields in the clear (its name, profile, fingerprints,
// supersede links and what the registry itself writes on a claim) and everything else
// only as ciphertext. A licence is only its id and ciphertext. Genetics and DNA report
// files never leave the browser at all.
//
// On load each row is one of:
//   open    sealed, and this browser's key opens it;
//   legacy  saved in plain text before sealing; records.ts saves it again, sealed;
//   locked  sealed with a key this browser doesn't have (or emptied by the registry's
//           purge): shown as locked, never sent back by a save;
//   stub    what a claim leaves for its recipient before their browser seals it.
//
// The registry no longer checks a record's fingerprint against its contents (it can't
// read them), so the browser does: each opened record is fingerprinted again
// (commitment.ts), the result kept beside it (integrityOf), and a record whose contents
// don't match its fingerprint is never sent.
//
// Round 2 (CONTRACT.md #16, #20, #21, #23):
//   - `attestation` is read from the registry (it writes it on a claim) and never sent;
//   - each sealed payload carries `rev`, one more on every change. This browser keeps the
//     highest `rev` it has seen per row; a lower one from the registry is an older copy and
//     never replaces the newer one (state 'older'), nor is it sent back;
//   - a row whose padded plaintext is over 256 KiB is refused here, before it is sent;
//   - rows saved in plain text before sealing are sealed only once the vault key is in a
//     backup the app has checked; until then a save leaves them as they are;
//   - a vault key is made only inside the tab lock, after asking the registry afresh whether
//     any row is sealed already, and only if this browser can keep it. A registry that can't
//     answer is "unknown", never "none".
//
// Round 3 (the third attack review):
//   - nothing is sealed and sent under a key until that key is in a backup the app has
//     checked (L1): a key that died before its first backup used to own the holder's rows
//     for good. A save before then sends nothing and says which rows it held (`held`);
//     records.ts keeps them in this browser until the backup is checked;
//   - only rows whose contents changed are sent (L2): re-sending the whole set put stale
//     copies over newer ones. An older copy from the registry is kept, so the holder can
//     choose to use it (takeOlderCopy), instead of being hidden for good;
//   - a changed agreement saved before sealing is refused like a record (L3), not dropped;
//   - an agreement the purge emptied is locked by `contentsRemoved` (L5);
//   - a row that opens with this browser's key marks the key in use (L13);
//   - from a claim's stub only the registry's own fields are kept, and from any row saved
//     before sealing the fields that only ever live sealed are dropped (P1, P2): a server
//     could otherwise hand the lab its own lock for lab reports, or a grant as the holder's;
//   - the high-water marks go in the backup (P4: revMarks, raiseRevMarks).
//
// Round 4 (the fourth attack review):
//   - agreements carry the public `rev` too, and an "older copy" refusal from the registry is
//     handled for them exactly as for records (F1): two tabs or devices used to replace each
//     other's changes to an agreement, a revocation included, without a word;
//   - a row this browser has ever seen sealed (its id has a high-water mark, kept in the
//     backup) is never taken in plain-text, stub or emptied form (F2): the server could send
//     an old copy from before locking, and this browser took it as current and locked the old
//     contents again over the newer ones. It is shown as an older copy, never converted.
//
// Round 5 (CONTRACT.md #28): the record's name is sealed too. A row saved before carries it in
// the clear beside its box (and its box doesn't have it): it is taken from there, and the row
// is saved again at once, with the name inside the box and none in the clear (nameInClear).
//
// Every request carries the holder key, and the server returns only that holder's rows.
// SPDX-License-Identifier: Apache-2.0

import type { Store, SaveRefusal, SaveResult } from './store';
import { holderKey, holderKeyIfAny } from './holder';
import { readJson, isObject, isString } from './json';
import { fingerprintRecord, type CommittedRecordInput } from './commitment';
import { withTabLock } from './tab-lock';
import {
  canStoreVault,
  isSealedRow,
  markVaultSealed,
  mintVault,
  noteSealedRowsSeen,
  openRow,
  sealRow,
  sealedSizeOf,
  SEALED_MAX_BYTES,
  stableStringify,
  vaultKeyIfAny,
  vaultMadeAt,
  vaultNeedsBackup,
  type RowKind,
} from './vault';

const BASE = import.meta.env.VITE_API_BASE ?? '';

/** Collection keys map to REST paths. */
const kindFor = (key: string): RowKind => (key.includes('license') ? 'licenses' : 'records');
const pathFor = (key: string): string => `/api/${kindFor(key)}`;

// ---- the wire shape of a record row (CONTRACT.md #4) ---------------------------------------

/**
 * Fields a record row carries in the clear, as this browser sends it. Everything else is
 * sealed, the record's name included (round 5, CONTRACT.md #28: the registry refuses a save
 * that carries `strainName` in the clear).
 */
const PUBLIC_FIELDS = [
  'id',
  'profile',
  'recordFingerprint',
  'keyBinding',
  'supersededBy',
  'receivedFrom',
  'receivedFromCommitment',
  'receivedAt',
  'transferId',
] as const;
/**
 * Fields only the registry writes (CONTRACT.md #16): read from a loaded row, never sent and
 * never sealed. An old record could carry a holder-typed `attestation.lab`; sending the
 * stored copy back kept it readable.
 */
const REGISTRY_FIELDS = ['attestation'] as const;
const READ_FIELDS = [...PUBLIC_FIELDS, ...REGISTRY_FIELDS] as const;
const PUBLIC = new Set<string>(READ_FIELDS);

/** Fields only a plaintext (pre-sealing) row has: a row with any of them is legacy. */
const PRIVATE_MARKERS = [
  'nonce',
  'bredBy',
  'dateCreated',
  'notes',
  'loggedAt',
  'parents',
  'breedingMethod',
  'taxon',
  'animal',
  'photoFingerprints',
  'refId',
  'dnaFingerprint',
  'dnaFileName',
  'licenseIds',
  'quantity',
  'deliveryNote',
];

/**
 * Fields that only ever live inside this browser's sealed copy of a record: the holder's
 * share choice and the question about one, the names given to recipients, where the lab
 * report lock came from, each delivery's offer key (CONTRACT.md #27) and the record's own
 * secrets (round 4, F5: record-keys.ts sealedSecretsOf). A row the registry
 * holds in plain text (saved before sealing) or a claim's stub never legitimately has them,
 * so any it carries are the server's, and dropped (round 3, P1 and P2): an offer key from
 * the server would have the lab seal its arrival details with a key the server knows.
 */
const SEALED_ONLY = ['grant', 'grantToConfirm', 'sentTo', 'resultLockFrom', 'offerKeys', 'secrets'] as const;
/**
 * A record saved before sealing is the server's row: its lock for lab reports could be the
 * server's own (round 3, P1). Not taken: the lab's lock comes from the lab code it pasted
 * (kept in this browser and its backup) or from the sender's sealed offer.
 */
const NOT_FROM_SERVER_ROWS = [...SEALED_ONLY, 'resultLock'] as const;
/**
 * What a claim's stub may carry (CONTRACT.md #8): the registry's own fields, nothing else (P1).
 * A stub written before round 5 has the sender's name; since then the name comes only from
 * the sealed offer (records.ts receivedFields).
 */
const STUB_FIELDS = [
  'id',
  'strainName',
  'profile',
  'receivedFrom',
  'receivedFromCommitment',
  'receivedAt',
  'transferId',
] as const;
/**
 * Fields kept only in this browser (records.ts) that a save of a record saved before sealing
 * can carry without being a change to it: the name given to a recipient while the record
 * waits for the backup (L11), the delivery's offer key (CONTRACT.md #27), and the record's
 * secrets (round 4, F5).
 */
const LOCAL_ONLY = ['sentTo', 'offerKeys', 'secrets'] as const;
const withoutKeys = (r: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) if (!keys.includes(k)) out[k] = v;
  return out;
};

/** A record's sealed part: every field but the public ones, the full `supersedes` included. */
export const privatePart = (r: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r))
    if (!PUBLIC.has(k) && k !== 'sealed' && k !== 'rev' && v !== undefined) out[k] = v;
  return out;
};

/** A licence's sealed part: everything but its id (CONTRACT.md #5). */
const licensePart = (r: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r))
    if (k !== 'id' && k !== 'sealed' && k !== 'rev' && v !== undefined) out[k] = v;
  return out;
};

/**
 * The padded size of a record's sealed plaintext (CONTRACT.md #21), as a save would seal
 * it. The forms use it to say so before anything typed is lost.
 */
export const recordSealedBytes = (r: Record<string, unknown>): number =>
  sealedSizeOf({ ...privatePart(r), rev: Number.MAX_SAFE_INTEGER });
export { SEALED_MAX_BYTES };

/** A record's clear part: the public fields, and of `supersedes` only the pointer and public facts. */
export const publicPart = (r: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const k of PUBLIC_FIELDS) if (r[k] !== undefined) out[k] = r[k];
  const s = r.supersedes;
  if (isObject(s)) {
    out.supersedes = {
      recordId: s.recordId,
      ...(s.changedFields !== undefined ? { changedFields: s.changedFields } : {}),
      ...(s.effectiveAt !== undefined ? { effectiveAt: s.effectiveAt } : {}),
    };
  }
  return out;
};

/**
 * A row sealed before round 5: its name is in the clear beside the box, and not in the box
 * (CONTRACT.md #28). The name is taken from the row, and the row is saved again.
 */
const nameOnlyInClear = (row: Record<string, unknown>, sealed: Record<string, unknown>): boolean =>
  !isString(sealed.strainName) && isString(row.strainName);

/** The record a row stands for, once opened: the sealed fields, with the registry's public ones on top. */
const merged = (row: Record<string, unknown>, sealed: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...sealed };
  for (const k of READ_FIELDS) {
    if (row[k] !== undefined) out[k] = row[k];
    else if (k !== 'id') delete out[k];
  }
  // The name is the box's (round 5); a row sealed before has it only in the clear.
  if (nameOnlyInClear(row, sealed)) out.strainName = row.strainName;
  // The full correction (reason, severity) is in the sealed part; the row has only the pointer.
  if (sealed.supersedes === undefined && row.supersedes !== undefined) out.supersedes = row.supersedes;
  return out;
};

// ---- what the last load found -----------------------------------------------------------

export type RowState = 'open' | 'legacy' | 'locked' | 'stub' | 'older';
export type IntegrityCheck = 'match' | 'mismatch' | 'unsealed' | 'no-nonce';

/** A row this browser can't open: what the registry shows anyone, and nothing more. */
export type LockedRow = {
  readonly id: string;
  readonly strainName?: string;
  readonly profile?: string;
  /** The key it was sealed with, by id. Absent for a row the registry's purge emptied. */
  readonly kid?: string;
  /** Its public fingerprint, when the registry gives one (an import may put the contents back, L4). */
  readonly recordFingerprint?: string;
  /**
   * When the vault key it was sealed with was made, when this browser made it (vault.ts
   * vaultMadeAt): any backup saved after it holds that key. A received or corrected date
   * says nothing about the key, so none is used.
   */
  readonly since?: number;
  /**
   * The registry sent an older copy of this row than this browser has seen (CONTRACT.md #20).
   * Not shown as the record and never sent back; this browser has no newer copy to show.
   */
  readonly older?: true;
  /**
   * The older copy is from before the row was locked: plain text, a claim's stub or emptied
   * by the purge, for a row this browser has seen sealed (round 4, F2). It is never used,
   * converted or locked again; the holder can only delete it.
   */
  readonly beforeLocking?: true;
};

export type LoadNotice = {
  /** The registry sent only part of the set and the rest could not be fetched. */
  readonly truncated: boolean;
  /** Rows that came back but could not be read at all, so aren't shown. */
  readonly unreadable: number;
  /** Rows the registry sent an older copy of, where this browser kept its newer copy. */
  readonly olderKept?: number;
  /**
   * Sealed records whose public `rev` (the number the registry checks, round 3 L2) is not the
   * one locked inside them: the server's number was changed. This browser goes by the sealed
   * one and saves them again, so the two agree.
   */
  readonly revMismatch?: number;
  /**
   * Sealed records saved before round 5, whose name is still in the clear on the registry
   * (CONTRACT.md #28). This browser saves them again at once, with the name inside the box.
   */
  readonly nameInClear?: number;
};

type Loaded = {
  holder: string;
  states: Map<string, RowState>;
  locked: LockedRow[];
  /** Whether any row the registry holds for this holder in this collection is sealed. */
  anySealed: boolean;
  notice: LoadNotice;
  /** Each plain-text row as it loaded, so a save can tell one this browser changed. */
  legacy: Map<string, string>;
  /** Locked rows an import put the holder's own contents back into (L4): sent by the next save. */
  replace: Set<string>;
};

const loaded = new Map<RowKind, Loaded>();
/** The registry's older copy of each row it sent one of, opened (L2): the holder may choose to use it. */
const olderCopies = new Map<string, { value: Record<string, unknown>; rev: number }>();
const integrity = new Map<string, IntegrityCheck>();
/** Integrity worked out for a record object, so a save of an unchanged set doesn't redo it. */
const checkedObjects = new WeakMap<object, IntegrityCheck>();
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());

/** Called after every load (records.ts copies the locked rows and the notice for the UI). */
export const onSealedStateChange = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const current = (kind: RowKind): Loaded | undefined => {
  const l = loaded.get(kind);
  return l && l.holder === holderKeyIfAny() ? l : undefined;
};

export const rowStateOf = (key: string, id: string): RowState | undefined => current(kindFor(key))?.states.get(id);
export const lockedRowsOf = (key: string): readonly LockedRow[] => current(kindFor(key))?.locked ?? [];
export const loadNoticeOf = (key: string): LoadNotice =>
  current(kindFor(key))?.notice ?? { truncated: false, unreadable: 0 };
/** Whether this browser has seen any sealed row of this holder's (open or locked) this session. */
export const hasSealedRows = (): boolean => [...loaded.keys()].some((k) => current(k)?.anySealed);

/** The record's fingerprint check, as worked out in this browser when it was loaded or saved. */
export const integrityOf = (id: string): IntegrityCheck | undefined => integrity.get(id);

/** Recompute a record's fingerprint from its fields and compare. Never throws. */
export const checkRecordIntegrity = async (r: Record<string, unknown>): Promise<IntegrityCheck> => {
  const hit = checkedObjects.get(r);
  if (hit) return hit;
  let out: IntegrityCheck;
  if (!isString(r.recordFingerprint) || !r.recordFingerprint) out = 'unsealed';
  else if (!isString(r.nonce) || !r.nonce) out = 'no-nonce';
  else {
    try {
      out =
        (await fingerprintRecord(r as unknown as CommittedRecordInput)) === r.recordFingerprint ? 'match' : 'mismatch';
    } catch {
      out = 'mismatch'; // a field the fingerprint can't be made from (a malformed animal record)
    }
  }
  checkedObjects.set(r, out);
  return out;
};

/** Forget what the last load found (this browser stopped using the holder key). */
export const clearSealedState = (): void => {
  loaded.clear();
  integrity.clear();
  lastSealed.clear();
  publicRevs.clear();
  sentHere.clear();
  olderCopies.clear();
  noteSealedRowsSeen(false);
  changed();
};

/** Ids the registry sent an older copy of on the last load (CONTRACT.md #20). */
export const olderRowsOf = (key: string): readonly string[] =>
  (current(kindFor(key))?.locked ?? []).filter((l) => l.older).map((l) => l.id);

/**
 * This browser still has the newer copy of a row the registry sent an older copy of: keep
 * it, and send it again with the next save (records.ts hydrate). The registry's older copy
 * is never shown.
 */
export const keepNewerCopy = (key: string, id: string): void => {
  const kind = kindFor(key);
  const l = current(kind);
  if (!l || l.states.get(id) !== 'older') return;
  l.states.set(id, 'open');
  l.locked = l.locked.filter((r) => r.id !== id);
  l.notice = { ...l.notice, olderKept: (l.notice.olderKept ?? 0) + 1 };
  // Only changed rows are sent (L2): forget what was last sealed, so the newer copy goes again.
  lastSealed.delete(revKey(kind, id));
  olderCopies.delete(revKey(kind, id));
  changed();
};

/** The registry's older copy of a row, opened, when it sent one this browser has no newer copy of. */
export const olderCopyOf = (key: string, id: string): Record<string, unknown> | undefined =>
  current(kindFor(key))?.states.get(id) === 'older' ? olderCopies.get(revKey(kindFor(key), id))?.value : undefined;

/**
 * "Use this copy" (L2): the holder takes the registry's older copy as the record. The
 * high-water mark goes back to that copy's rev, so it is shown again in this browser and the
 * next change to it is saved one rev above it. Returns the row, or undefined when there is no
 * older copy of it.
 */
export const takeOlderCopy = (key: string, id: string): Record<string, unknown> | undefined => {
  const kind = kindFor(key);
  const l = current(kind);
  const copy = olderCopies.get(revKey(kind, id));
  if (!l || l.states.get(id) !== 'older' || !copy) return undefined;
  setRev(kind, id, copy.rev);
  lastSealed.delete(revKey(kind, id));
  olderCopies.delete(revKey(kind, id));
  l.states.set(id, 'open');
  l.locked = l.locked.filter((r) => r.id !== id);
  changed();
  return copy.value;
};

/**
 * An import puts the holder's own contents back into a locked or emptied row (L4): only when
 * the file's fingerprint is the row's public one. The next save sends it; the registry still
 * decides whether to take it.
 */
export const allowReplace = (key: string, id: string, recordFingerprint: string): boolean => {
  const kind = kindFor(key);
  const l = current(kind);
  const row = l?.locked.find((r) => r.id === id);
  if (!l || !row || row.older || !row.recordFingerprint || row.recordFingerprint !== recordFingerprint) return false;
  l.replace.add(id);
  lastSealed.delete(revKey(kind, id));
  return true;
};

/**
 * Whether the registry holds exactly this row now, as this browser last opened or saved it:
 * a copy kept in this browser (records.ts) that matches needs keeping no longer.
 */
export const isStoredAsIs = async (key: string, item: Record<string, unknown>): Promise<boolean> => {
  const kind = kindFor(key);
  if (!isString(item.id) || current(kind)?.states.get(item.id) !== 'open') return false;
  const prev = lastSealed.get(revKey(kind, item.id));
  return !!prev && prev.hash === (await contentHash(kind, item));
};

// ---- rev: the high-water mark (CONTRACT.md #20) -------------------------------------------

const REV_STORAGE_KEY = 'veilcore.rev.v1';
const revKey = (kind: RowKind, id: string) => `${kind}:${id}`;

const readRevs = (): Record<string, number> => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(REV_STORAGE_KEY) ?? '{}');
    return isObject(v)
      ? (Object.fromEntries(
          Object.entries(v).filter((e) => typeof e[1] === 'number' && Number.isSafeInteger(e[1])),
        ) as Record<string, number>)
      : {};
  } catch {
    return {};
  }
};

/** Raise the high-water marks; never lowers one. */
const raiseRevs = (seen: readonly (readonly [RowKind, string, number])[]): void => {
  if (seen.length === 0) return;
  const revs = readRevs();
  let changedAny = false;
  for (const [kind, id, rev] of seen) {
    // A mark of 0 is kept too (a row sealed before revs): it says this browser has seen the
    // row sealed, so a plain-text copy of it is never taken again (round 4, F2).
    if ((revs[revKey(kind, id)] ?? -1) < rev) {
      revs[revKey(kind, id)] = rev;
      changedAny = true;
    }
  }
  if (!changedAny) return;
  try {
    localStorage.setItem(REV_STORAGE_KEY, JSON.stringify(revs));
  } catch {
    /* a browser that keeps nothing has no mark to keep: each load starts afresh */
  }
};

/** Set one mark to exactly this rev, lower or higher ("Use this copy", L2). */
const setRev = (kind: RowKind, id: string, rev: number): void => {
  const revs = readRevs();
  revs[revKey(kind, id)] = rev;
  try {
    localStorage.setItem(REV_STORAGE_KEY, JSON.stringify(revs));
  } catch {
    /* nothing kept */
  }
};

/**
 * Every high-water mark this browser keeps, for the backup file (round 3, P4). A row with a
 * mark is one this browser has seen sealed (round 4, F2), so the list also keeps a restored
 * browser from taking a plain-text copy of it.
 */
export const revMarks = (): Record<string, number> => readRevs();

/**
 * Take the high-water marks from a backup file (P4): each only raises a mark here, never
 * lowers one. Without them a restored browser took any older copy the registry served as
 * current. Returns how many marks were raised.
 */
export const raiseRevMarks = (marks: unknown): number => {
  if (!isObject(marks)) return 0;
  const here = readRevs();
  const seen: [RowKind, string, number][] = [];
  for (const [k, v] of Object.entries(marks)) {
    const m = /^(records|licenses):(.+)$/.exec(k);
    if (!m || typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0) continue;
    if ((here[k] ?? -1) < v) seen.push([m[1] as RowKind, m[2], v]);
  }
  raiseRevs(seen);
  return seen.length;
};

/** The `rev` a sealed payload carries; 0 for one sealed before revs. */
const revOf = (v: unknown): number => (typeof v === 'number' && Number.isSafeInteger(v) && v > 0 ? v : 0);

/**
 * A row's contents as the registry holds them, hashed: for a record its sealed part and its
 * clear part both (a correction changes only the original's `supersededBy`, which is clear),
 * for a licence its sealed part. What "changed" means for a save (round 3, L2).
 */
const contentHash = (kind: RowKind, item: Record<string, unknown>): Promise<string> =>
  hashOf(kind === 'records' ? { sealed: privatePart(item), clear: publicPart(item) } : licensePart(item));

/** What each row was last sealed (or opened) as here: its contents' hash and its rev. */
const lastSealed = new Map<string, { hash: string; rev: number }>();
/**
 * The public `rev` the registry holds for each record (round 3, L2: it refuses a save below
 * it), as last loaded or refused here. A save goes above it, so a number the server changed
 * can't keep a holder's saves refused for good.
 */
const publicRevs = new Map<string, number>();
/**
 * What this page put on the wire for each row, by rev (its contents' hash), whatever the
 * answer: a save whose answer was lost, or one still on its way, may already be stored. A
 * next save goes above them, and a registry copy at one of them that opens to its contents
 * is this page's own, never "a newer copy" (round 3, L2).
 */
const sentHere = new Map<string, Map<number, string>>();
const highestSent = (rk: string): number => Math.max(0, ...(sentHere.get(rk)?.keys() ?? []));
const noteSent = (rk: string, rev: number, hash: string): void => {
  const m = sentHere.get(rk) ?? new Map<number, string>();
  m.set(rev, hash);
  // Only the latest few matter: a save goes above the highest.
  for (const old of [...m.keys()].sort((a, b) => a - b).slice(0, Math.max(0, m.size - 8))) m.delete(old);
  sentHere.set(rk, m);
};
/** The code the registry gives a row it refused as an older copy than the one it holds. */
export const OLDER_COPY = 'older-copy';

const hashOf = async (v: Record<string, unknown>): Promise<string> =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stableStringify(v)) as unknown as BufferSource),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');

// ---- reading -----------------------------------------------------------------------------

const PAGE = 100;
const MAX_PAGES = 500;

/** The rest of a cut whole-set read, a page at a time (the registry's ?limit=&cursor=). */
const fetchAllPages = async (kind: RowKind, k: string): Promise<unknown[] | null> => {
  const out: unknown[] = [];
  let cursor = '';
  for (let i = 0; i < MAX_PAGES; i++) {
    const res = await fetch(
      `${BASE}/api/${kind}?limit=${String(PAGE)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
      { headers: { 'x-holder-key': k } },
    );
    if (!res.ok) return null;
    const body = await readJson(res);
    if (!isObject(body) || !Array.isArray(body[kind])) return null;
    out.push(...(body[kind] as unknown[]));
    if (!isString(body.nextCursor) || !body.nextCursor) return out;
    cursor = body.nextCursor;
  }
  return null;
};

const hasAny = (row: Record<string, unknown>, keys: readonly string[]) => keys.some((k) => row[k] !== undefined);

/**
 * A plain-text row as it loaded, to tell whether this browser changed it. A record's name
 * kept for a recipient, or an offer key (LOCAL_ONLY), is not a change; an agreement saved before types existed
 * is a license agreement (licenses.ts reads it that way).
 */
const legacySnapshot = (kind: RowKind, row: Record<string, unknown>): string =>
  stableStringify(kind === 'records' ? withoutKeys(row, LOCAL_ONLY) : { type: 'license', ...row });

/**
 * A claim's stub as a record the app can show until its recipient seals it. Only the
 * registry's own fields are kept (round 3, P1): anything else a server put on it, a lock for
 * lab reports or a share choice above all, would be sealed into the recipient's record as
 * though the recipient had it from the sender.
 */
const stubRecord = (row: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {
    // No name until the offer is opened (round 5: the stub has none).
    strainName: '',
    bredBy: '',
    dateCreated: '',
    notes: '',
    loggedAt: typeof row.receivedAt === 'number' ? row.receivedAt : 0,
  };
  for (const k of STUB_FIELDS) if (row[k] !== undefined) out[k] = row[k];
  return out;
};

export const apiStore: Store = {
  async load<T>(key: string, isValid: (v: unknown) => v is T): Promise<T[]> {
    // No key means this browser has never saved anything: nothing to load, and no
    // reason to mint an identifier and send it to the registry (attack round D).
    const k = holderKeyIfAny();
    if (!k) return [];
    const kind = kindFor(key);
    // A refusal (rate limit, server error) or no network is NOT an empty set: throw, so the
    // caller keeps what it shows instead of blanking the holder's records.
    const res = await fetch(`${BASE}${pathFor(key)}`, {
      headers: { 'x-holder-key': k },
    });
    if (!res.ok) throw new Error(`the registry answered ${String(res.status)}`);
    const parsed = await readJson(res);
    if (!Array.isArray(parsed)) throw new Error('unexpected response from the registry');
    let rows: unknown[] = parsed;
    // The whole-set read stops at about 4 MB and says so; the rest comes by paging. A set
    // the page can't finish is shown as far as it got, and the holder is told.
    let truncated = res.headers.get('X-VeilCore-Truncated') === 'true';
    if (truncated) {
      const all = await fetchAllPages(kind, k).catch(() => null);
      if (all) {
        const have = new Set(rows.map((r) => (isObject(r) ? r.id : undefined)));
        rows = [...rows, ...all.filter((r) => !(isObject(r) && have.has(r.id)))];
        truncated = false;
      }
    }

    const states = new Map<string, RowState>();
    const locked: LockedRow[] = [];
    const legacy = new Map<string, string>();
    const revsSeen: [RowKind, string, number][] = [];
    const revs = readRevs();
    const out: T[] = [];
    let unreadable = 0;
    let revMismatch = 0;
    let nameInClear = 0;
    let openedHere = false;
    const publicOf = (raw: Record<string, unknown>) => ({
      ...(isString(raw.strainName) ? { strainName: raw.strainName } : {}),
      ...(isString(raw.profile) ? { profile: raw.profile } : {}),
      ...(isString(raw.recordFingerprint) ? { recordFingerprint: raw.recordFingerprint } : {}),
    });
    for (const k of [...olderCopies.keys()]) if (k.startsWith(`${kind}:`)) olderCopies.delete(k);
    for (const raw of rows) {
      if (!isObject(raw) || !isString(raw.id)) {
        unreadable++;
        continue;
      }
      const id = raw.id;
      let value: Record<string, unknown>;
      let state: RowState;
      // A row this browser has seen sealed (it has a high-water mark, from this browser or a
      // restored backup) is never taken in plain text, as a claim's stub or emptied (round 4,
      // F2): that is an older copy from before locking, which the server (or a database
      // restored from an old backup) sent in place of the sealed one. Taken as current, it
      // was locked again over the newer copy, losing what was added since. Shown as an older
      // copy, never converted, never sent back; it can only be deleted.
      if (!isSealedRow(raw) && revs[revKey(kind, id)] !== undefined) {
        states.set(id, 'older');
        locked.push({ id, ...publicOf(raw), older: true, beforeLocking: true });
        continue;
      }
      if (isSealedRow(raw)) {
        const opened = await openRow(kind, id, raw.sealed);
        if (!opened.ok) {
          states.set(id, 'locked');
          locked.push({
            id,
            ...publicOf(raw),
            ...(opened.kid ? { kid: opened.kid } : {}),
            ...(opened.kid && vaultMadeAt(opened.kid) !== undefined ? { since: vaultMadeAt(opened.kid) } : {}),
          });
          // Seen sealed (round 4, F2): a plain-text copy of it is never taken later.
          revsSeen.push([kind, id, 0]);
          continue;
        }
        openedHere = true;
        const { rev: sealedRev, ...inner } = opened.value;
        const rev = revOf(sealedRev);
        const asOpened = kind === 'records' ? merged(raw, inner) : { ...inner, id };
        // An older copy than this browser has seen: not shown as the record, never sent
        // back; kept so the holder can choose to use it (L2).
        if (rev < (revs[revKey(kind, id)] ?? 0)) {
          states.set(id, 'older');
          olderCopies.set(revKey(kind, id), { value: asOpened, rev });
          locked.push({ id, ...publicOf(raw), older: true });
          continue;
        }
        value = asOpened;
        // The public `rev` the registry checks saves against must be the one sealed inside the
        // row (round 3, L2). One that isn't was changed on the server: the sealed one is what
        // counts, and the row is saved again (it isn't marked as saved here), above both.
        // Records and, since round 4 (F1), agreements.
        const publicRev = raw.rev !== undefined && raw.rev !== null ? raw.rev : undefined;
        if (publicRev !== undefined) {
          if (typeof publicRev === 'number' && Number.isSafeInteger(publicRev) && publicRev >= 0)
            publicRevs.set(revKey(kind, id), publicRev);
          else publicRevs.delete(revKey(kind, id));
        }
        // A name still in the clear (round 5): saved again, so it goes inside the box and the
        // registry drops the clear copy.
        const nameMoves = kind === 'records' && nameOnlyInClear(raw, inner);
        if (nameMoves) nameInClear++;
        if (publicRev !== undefined && publicRev !== rev) {
          revMismatch++;
          lastSealed.delete(revKey(kind, id));
        } else if (nameMoves) {
          lastSealed.delete(revKey(kind, id));
        } else {
          lastSealed.set(revKey(kind, id), {
            hash: await contentHash(kind, value),
            rev,
          });
        }
        revsSeen.push([kind, id, rev]);
        state = 'open';
      } else if (kind === 'licenses') {
        if (raw.contentsRemoved === true || Object.keys(raw).length <= 1) {
          // Emptied by the registry's purge ({ id, contentsRemoved: true }): nothing left to
          // open (L5: it used to load as an agreement with no terms, and blank the page).
          states.set(id, 'locked');
          locked.push({ id });
          continue;
        }
        value = withoutKeys(raw, SEALED_ONLY);
        state = 'legacy';
        legacy.set(id, legacySnapshot(kind, value));
      } else if (raw.contentsRemoved !== true && hasAny(raw, PRIVATE_MARKERS)) {
        value = withoutKeys(raw, NOT_FROM_SERVER_ROWS);
        state = 'legacy';
        legacy.set(id, legacySnapshot(kind, value));
      } else if (raw.contentsRemoved === true || !isString(raw.transferId)) {
        // The purge left only the public fields: the contents are gone from the registry.
        states.set(id, 'locked');
        locked.push({ id, ...publicOf(raw) });
        continue;
      } else {
        value = stubRecord(raw);
        state = 'stub';
      }
      // Malformed rows are counted, not silently dropped: one bad row should not blank a
      // holder's records, and the holder is told some could not be read.
      if (!isValid(value)) {
        unreadable++;
        continue;
      }
      states.set(id, state);
      if (kind === 'records' && state !== 'stub') integrity.set(id, await checkRecordIntegrity(value));
      out.push(value);
    }
    raiseRevs(revsSeen);
    loaded.set(kind, {
      holder: k,
      states,
      locked,
      anySealed: rows.some(isSealedRow),
      notice: {
        truncated,
        unreadable,
        ...(revMismatch ? { revMismatch } : {}),
        ...(nameInClear ? { nameInClear } : {}),
      },
      legacy,
      replace: new Set(),
    });
    // A row the registry holds opened with this browser's key: the key is in use, whether or
    // not this browser heard the answer to the save that put it there (L13). A restore then
    // asks the registry before replacing it.
    if (openedHere) markVaultSealed();
    noteSealedRowsSeen(hasSealedRows());
    changed();
    return out;
  },

  /**
   * Seal and save, and report what the registry actually stored. The response used to be
   * thrown away, so an item the registry refused looked saved (attack round 11).
   *
   * With no vault key here, one is made first, and the key-making, the first seal and the
   * save run inside the tab lock (CONTRACT.md #23): two tabs opening at once used to make a
   * key each, and the registry kept one while this browser's storage kept the other.
   */
  async save<T>(key: string, value: T[]): Promise<SaveResult> {
    const k = holderKey();
    if (vaultKeyIfAny()) return sealAndSave(key, value, k);
    return withTabLock(VAULT_LOCK, async () => {
      const made = await makeVaultInLock(k);
      if (made !== 'have' && made !== 'made') return { ok: false, refused: [vaultRefusal(made)] };
      return sealAndSave(key, value, k);
    });
  },
};

const sealAndSave = async (key: string, value: readonly unknown[], k: string): Promise<SaveResult> => {
  const kind = kindFor(key);
  const refused: SaveRefusal[] = [];
  const state = current(kind);
  // Nothing is sealed and sent under a key that isn't in a checked backup yet (round 3, L1):
  // plain-text rows wait for it, and so do new and changed ones.
  const backupFirst = vaultNeedsBackup();
  const revs = readRevs();
  const wire: Record<string, unknown>[] = [];
  const pending: { id: string; hash: string; rev: number }[] = [];
  const held: string[] = [];
  for (const item of value) {
    if (!isObject(item) || !isString(item.id)) continue;
    const id = item.id;
    const was = state?.states.get(id);
    // A locked row is never sent back: this browser can't know what is in it. Nor is a row
    // the registry sent an older copy of, which this browser has no newer copy of. An import
    // that put the holder's own contents back (L4) is the one exception.
    if ((was === 'locked' && !state?.replace.has(id)) || was === 'older') continue;
    if (was === 'legacy' && backupFirst) {
      // Left as the registry holds it until the backup is checked. A change made to it here
      // can't be kept until then, and is said: for agreements too (L3), whose changes used
      // to look saved and were gone on reload. A name kept for a recipient is not a change
      // to the row (records.ts keeps it in this browser until then, L11).
      if (state?.legacy.get(id) !== legacySnapshot(kind, item)) {
        refused.push({ id, reason: BACKUP_FIRST_REASON, words: 'app.sealed.refuse.backupFirst' });
      }
      continue;
    }
    let part: Record<string, unknown>;
    if (kind === 'licenses') {
      // A licence is only its id in the clear (CONTRACT.md #5).
      part = licensePart(item);
    } else {
      // A claim's stub is the registry's own row until its recipient seals it.
      if (was === 'stub' && !isString(item.nonce) && !isString(item.recordFingerprint)) continue;
      const check = await checkRecordIntegrity(item);
      if (check === 'mismatch') {
        // Loaded that way: never sent, said on its page. Changed that way here: refused, and said now.
        if (integrity.get(id) !== 'mismatch') {
          refused.push({ id, reason: MISMATCH_REASON, words: 'app.sealed.refuse.mismatch' });
        }
        integrity.set(id, 'mismatch');
        continue;
      }
      integrity.set(id, check);
      part = privatePart(item);
    }
    // Only a row whose contents changed since this browser last opened or saved it is sent
    // (round 3, L2): every save used to send the whole set again, so a slow or stale save put
    // older copies over newer ones on the registry. A changed row goes one rev above the
    // highest this browser has seen.
    const hash = await contentHash(kind, item);
    const prev = lastSealed.get(revKey(kind, id));
    if (prev && prev.hash === hash) continue;
    // One above the rev this page last opened or saved the row at: a tab that loaded it
    // before another tab or device saved a newer copy sends a lower rev than the registry
    // holds, and the registry refuses it as an older copy (round 3, L2) instead of taking it
    // over the newer one. The high-water mark is shared by every tab of this browser, so it
    // counts only for a row this page has no rev of (a new row, a newer copy kept or an older
    // one taken, or a public rev that wasn't the sealed one): then above the mark and the
    // registry's public rev.
    const mark = revs[revKey(kind, id)] ?? 0;
    const rev =
      Math.max(prev ? prev.rev : Math.max(mark, publicRevs.get(revKey(kind, id)) ?? 0), highestSent(revKey(kind, id))) +
      1;
    // Taken now, before anything else can run: a second save started while this one is on
    // its way goes above it, never at the same rev.
    noteSent(revKey(kind, id), rev, hash);
    const plain = { ...part, rev };
    if (sealedSizeOf(plain) > SEALED_MAX_BYTES) {
      refused.push({ id, reason: TOO_LARGE_REASON, words: 'app.sealed.refuse.tooLarge' });
      continue;
    }
    if (backupFirst) {
      // Not sealed, not sent: the key isn't in a checked backup yet (L1). Said as held.
      held.push(id);
      continue;
    }
    let sealed: Awaited<ReturnType<typeof sealRow>>;
    try {
      sealed = await sealRow(kind, id, plain);
    } catch {
      // The key went while this save was being made (Start over in this tab, or a restore):
      // nothing is sent, and nothing is sealed under another key.
      return { ok: false, refused: [...refused, vaultRefusal('locked')], pending: pending.map((p) => p.id) };
    }
    // The rev goes in the clear too, the same number as inside the box, so the registry can
    // refuse an older copy than the one it holds (round 3, L2; for agreements round 4, F1).
    // Otherwise a licence is only its id and box (CONTRACT.md #5).
    wire.push(kind === 'licenses' ? { id, rev, sealed } : { ...publicPart(item), rev, sealed });
    pending.push({ id, hash, rev });
  }
  if (held.length) return { ok: false, refused, held, pending: held, accepted: [] };
  if (wire.length === 0) return { ok: refused.length === 0, refused, pending: [], accepted: [] };
  const sent = pending.map((p) => p.id);

  let res: Response;
  try {
    res = await fetch(`${BASE}${pathFor(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-holder-key': k },
      body: JSON.stringify(wire),
    });
  } catch {
    /* offline — in-memory state stays authoritative for this session */
    return { ok: false, refused, offline: true, pending: sent, accepted: [] };
  }
  let body: unknown = null;
  try {
    body = await readJson(res);
  } catch {
    /* not JSON — handled below */
  }
  if (!res.ok) {
    const reason = isObject(body) && isString(body.error) ? body.error : `the registry answered ${String(res.status)}`;
    return { ok: false, refused: [...refused, { id: '*', reason }], pending: sent, accepted: [] };
  }
  if (!isObject(body))
    return {
      ok: false,
      refused: [...refused, { id: '*', reason: 'unexpected response from the registry' }],
      pending: sent,
      accepted: [],
    };
  const olderOnServer: (readonly [RowKind, string, number])[] = [];
  if (Array.isArray(body.rejected)) {
    for (const r of body.rejected) {
      if (!isObject(r) || !isString(r.id) || !isString(r.reason)) continue;
      // The registry holds a newer copy than this save (another tab or device saved it): the
      // change made here wasn't saved, and the next load shows the registry's copy. Said as
      // an older copy, as when the registry sends one (CONTRACT.md #20), the other way round.
      if (r.code === OLDER_COPY) {
        const storedRev =
          typeof r.storedRev === 'number' && Number.isSafeInteger(r.storedRev) ? r.storedRev : undefined;
        // The copy the registry holds may be this page's own: a later save of this page that
        // arrived first, or one whose answer was lost. Then nothing newer was lost here.
        const ownHash = storedRev !== undefined ? sentHere.get(revKey(kind, r.id))?.get(storedRev) : undefined;
        if (ownHash !== undefined && (await registryHolds(kind, k, r.id, ownHash))) continue;
        if (storedRev !== undefined) {
          olderOnServer.push([kind, r.id, storedRev]);
          publicRevs.set(revKey(kind, r.id), storedRev);
        }
        refused.push({ id: r.id, reason: r.reason, words: 'app.sealed.refuse.olderCopy' });
        continue;
      }
      refused.push({ id: r.id, reason: r.reason });
    }
  }
  // The registry's copy is the newer one: taken as current on the next load, never kept out
  // as an "older copy" of what was refused here.
  raiseRevs(olderOnServer);
  if (Array.isArray(body.notWritten)) {
    const reason = isString(body.reason) ? body.reason : 'this id already belongs to another holder';
    for (const id of body.notWritten) if (isString(id)) refused.push({ id, reason });
  }
  // What the registry accepted is sealed now, under this key: only now is the key in use
  // (vault.ts markVaultSealed), and only now are the revs this browser's high-water marks.
  const no = new Set(refused.map((r) => r.id));
  const accepted = pending.filter((p) => !no.has(p.id));
  for (const p of accepted) lastSealed.set(revKey(kind, p.id), { hash: p.hash, rev: p.rev });
  raiseRevs(accepted.map((p) => [kind, p.id, p.rev] as const));
  if (accepted.length) markVaultSealed();
  if (state) {
    for (const p of accepted) {
      state.states.set(p.id, 'open');
      state.legacy.delete(p.id);
      state.replace.delete(p.id);
      state.locked = state.locked.filter((l) => l.id !== p.id);
    }
    if (accepted.length) state.anySealed = true;
  }
  if (accepted.length) noteSealedRowsSeen(true);
  return {
    ok: body.ok === true && refused.length === 0,
    refused,
    pending: sent,
    accepted: accepted.map((p) => p.id),
  };
};

/**
 * Whether the registry's copy of a row opens, here, to exactly these contents (their hash):
 * a save at the same rev whose answer was lost was this browser's own (round 3, L2).
 */
const registryHolds = async (kind: RowKind, k: string, id: string, hash: string): Promise<boolean> => {
  const rows = await readWholeSet(kind, k);
  const raw = rows?.find((r) => isObject(r) && r.id === id);
  if (!isObject(raw) || !isSealedRow(raw)) return false;
  const opened = await openRow(kind, id, raw.sealed);
  if (!opened.ok) return false;
  const { rev: _rev, ...inner } = opened.value;
  void _rev;
  return (await contentHash(kind, kind === 'records' ? merged(raw, inner) : { ...inner, id })) === hash;
};

// ---- the vault key: made once, safely (CONTRACT.md #23) ------------------------------------

const VAULT_LOCK = 'veilcore.vault';

/** Every row of one collection the registry holds for this holder, or null when it can't say. */
const readWholeSet = async (kind: RowKind, k: string): Promise<unknown[] | null> => {
  try {
    const res = await fetch(`${BASE}/api/${kind}`, { headers: { 'x-holder-key': k } });
    if (!res.ok) return null;
    const rows: unknown = await readJson(res);
    if (!Array.isArray(rows)) return null;
    const first: unknown[] = rows;
    if (res.headers.get('X-VeilCore-Truncated') !== 'true') return first;
    const rest = await fetchAllPages(kind, k).catch(() => null);
    return rest ? [...first, ...rest] : null;
  } catch {
    return null;
  }
};

/**
 * The vault key ids the registry's rows for this holder are sealed with, asked afresh, or
 * 'unknown' when it can't answer (a refusal, a rate limit, no network): never "none".
 */
export const registryKids = async (k: string): Promise<Set<string> | 'unknown'> => {
  const kids = new Set<string>();
  for (const kind of ['records', 'licenses'] as const) {
    const rows = await readWholeSet(kind, k);
    if (!rows) return 'unknown';
    for (const r of rows) {
      if (!isSealedRow(r)) continue;
      const kid = (r as { sealed: { kid?: unknown } }).sealed.kid;
      kids.add(isString(kid) ? kid : '?');
    }
  }
  return kids;
};

export type VaultOutcome = 'have' | 'made' | 'locked' | 'unknown' | 'cant-store';

/** Inside the lock: re-read the key, ask the registry afresh, and make one only if that is safe. */
const makeVaultInLock = async (k: string | null): Promise<VaultOutcome> => {
  if (vaultKeyIfAny()) return 'have';
  if (!canStoreVault()) return 'cant-store';
  if (k) {
    const kids = await registryKids(k);
    if (kids === 'unknown') return 'unknown';
    // Some row is sealed already: its key is in a backup. A new key would not open it.
    if (kids.size > 0) return 'locked';
  }
  // Another tab may have made it while this one asked.
  if (vaultKeyIfAny()) return 'have';
  return mintVault() ? 'made' : 'cant-store';
};

/**
 * Make this browser's vault key if none is here and that is safe: no row of this holder's
 * is sealed yet (asked afresh), and this browser can keep a key. Inside the tab lock.
 */
export const makeVaultIfSafe = (): Promise<VaultOutcome> =>
  vaultKeyIfAny() ? Promise.resolve('have') : withTabLock(VAULT_LOCK, () => makeVaultInLock(holderKeyIfAny()));

export type VaultReadiness = 'have' | 'can-make' | 'locked' | 'unknown' | 'cant-store';

/**
 * Whether a save from this browser could be sealed, without making anything: checked before
 * a claim (CONTRACT.md #22), which can't be undone, so the received record can be saved.
 */
export const vaultReadiness = async (): Promise<VaultReadiness> => {
  if (vaultKeyIfAny()) return 'have';
  if (!canStoreVault()) return 'cant-store';
  const k = holderKeyIfAny();
  if (!k) return 'can-make';
  const kids = await registryKids(k);
  if (kids === 'unknown') return 'unknown';
  return kids.size > 0 ? 'locked' : 'can-make';
};

const vaultRefusal = (o: Exclude<VaultOutcome, 'have' | 'made'>): SaveRefusal =>
  o === 'locked'
    ? { id: '*', reason: NO_KEY_REASON, words: 'app.sealed.refuse.noKey' }
    : o === 'unknown'
      ? { id: '*', reason: UNKNOWN_REASON, words: 'app.sealed.refuse.unknown' }
      : { id: '*', reason: CANT_STORE_REASON, words: 'app.sealed.refuse.cantStore' };

/** Said when a record's contents don't match its fingerprint (the words key translates it). */
export const MISMATCH_REASON = 'it doesn’t match its proof code, so it wasn’t saved';
/** Said when this browser has no key for the holder's sealed rows. */
export const NO_KEY_REASON =
  'this browser doesn’t have the key for your records, so nothing was saved. Restore your backup file first.';
/** Said when the registry couldn't be asked whether this holder's rows are sealed already. */
export const UNKNOWN_REASON =
  'VeilCore couldn’t be reached to check your records, so nothing was saved. Try again soon.';
/** Said when this browser can't keep a vault key (a private window, blocked site data). */
export const CANT_STORE_REASON =
  'this browser can’t keep the key that locks your records (a private window, or blocked site data), so nothing was saved';
/** Said when a change to a record saved before locking waits for a checked backup. */
export const BACKUP_FIRST_REASON =
  'it was saved before records were locked. Save a backup and check it first; then changes to it can be saved';
/** Said when a record is over the size limit. */
export const TOO_LARGE_REASON = 'it’s too large to save. Shorten its notes and try again';

/**
 * Remove records (DELETE /api/records) or licences (DELETE /api/licenses) from the registry.
 * For a locked row: it can't be opened here, edited or sent, but its holder can still take
 * it off VeilCore.
 */
const deleteRows = async (
  kind: RowKind,
  ids: readonly string[],
): Promise<{ removed: string[] } | { error: string }> => {
  const k = holderKeyIfAny();
  if (!k) return { error: 'this browser has no holder key' };
  try {
    const res = await fetch(`${BASE}/api/${kind}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-holder-key': k },
      body: JSON.stringify({ ids }),
    });
    const body = await readJson(res).catch(() => null);
    if (!res.ok) {
      return { error: isObject(body) && isString(body.error) ? body.error : `the registry answered ${res.status}` };
    }
    const removed = isObject(body) && Array.isArray(body.removed) ? body.removed.filter(isString) : [];
    return { removed };
  } catch {
    return { error: 'could not reach the registry' };
  }
};

export const deleteRecords = (ids: readonly string[]): Promise<{ removed: string[] } | { error: string }> =>
  deleteRows('records', ids);
export const deleteLicenses = (ids: readonly string[]): Promise<{ removed: string[] } | { error: string }> =>
  deleteRows('licenses', ids);
