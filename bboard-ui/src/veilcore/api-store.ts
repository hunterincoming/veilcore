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
// Every request carries the holder key, and the server returns only that holder's rows.
// SPDX-License-Identifier: Apache-2.0

import type { Store, SaveRefusal, SaveResult } from './store';
import { holderKey, holderKeyIfAny } from './holder';
import { readJson, isObject, isString } from './json';
import { fingerprintRecord, type CommittedRecordInput } from './commitment';
import {
  isSealedRow,
  mayMintVault,
  mintVault,
  noteSealedRowsSeen,
  openRow,
  sealRow,
  vaultKeyIfAny,
  type RowKind,
} from './vault';

const BASE = import.meta.env.VITE_API_BASE ?? '';

/** Collection keys map to REST paths. */
const kindFor = (key: string): RowKind => (key.includes('license') ? 'licenses' : 'records');
const pathFor = (key: string): string => `/api/${kindFor(key)}`;

// ---- the wire shape of a record row (CONTRACT.md #4) ---------------------------------------

/** Fields a record row carries in the clear. Everything else is sealed. */
const PUBLIC_FIELDS = [
  'id',
  'strainName',
  'profile',
  'recordFingerprint',
  'keyBinding',
  'supersededBy',
  'receivedFrom',
  'receivedFromCommitment',
  'receivedAt',
  'transferId',
  'attestation',
] as const;
const PUBLIC = new Set<string>(PUBLIC_FIELDS);

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

/** A record's sealed part: every field but the public ones, the full `supersedes` included. */
export const privatePart = (r: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) if (!PUBLIC.has(k) && k !== 'sealed' && v !== undefined) out[k] = v;
  return out;
};

/** A record's clear part: the public fields, and of `supersedes` only the pointer and public facts. */
export const publicPart = (r: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const k of PUBLIC_FIELDS) if (r[k] !== undefined) out[k] = r[k];
  out.strainName = isString(r.strainName) ? r.strainName : '';
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

/** The record a row stands for, once opened: the sealed fields, with the registry's public ones on top. */
const merged = (row: Record<string, unknown>, sealed: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...sealed };
  for (const k of PUBLIC_FIELDS) {
    if (row[k] !== undefined) out[k] = row[k];
    else if (k !== 'strainName' && k !== 'id') delete out[k];
  }
  // The full correction (reason, severity) is in the sealed part; the row has only the pointer.
  if (sealed.supersedes === undefined && row.supersedes !== undefined) out.supersedes = row.supersedes;
  return out;
};

// ---- what the last load found -----------------------------------------------------------

export type RowState = 'open' | 'legacy' | 'locked' | 'stub';
export type IntegrityCheck = 'match' | 'mismatch' | 'unsealed' | 'no-nonce';

/** A row this browser can't open: what the registry shows anyone, and nothing more. */
export type LockedRow = {
  readonly id: string;
  readonly strainName?: string;
  readonly profile?: string;
  /** The key it was sealed with, by id. Absent for a row the registry's purge emptied. */
  readonly kid?: string;
  /** The earliest date the row itself shows (received, or corrected): a backup saved after it holds its key. */
  readonly since?: number;
};

export type LoadNotice = {
  /** The registry sent only part of the set and the rest could not be fetched. */
  readonly truncated: boolean;
  /** Rows that came back but could not be read at all, so aren't shown. */
  readonly unreadable: number;
};

type Loaded = {
  holder: string;
  states: Map<string, RowState>;
  locked: LockedRow[];
  /** Whether any row the registry holds for this holder in this collection is sealed. */
  anySealed: boolean;
  notice: LoadNotice;
};

const loaded = new Map<RowKind, Loaded>();
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
  noteSealedRowsSeen(false);
  changed();
};

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

const sinceOf = (row: Record<string, unknown>): number | undefined => {
  const dates: number[] = [];
  if (typeof row.receivedAt === 'number' && Number.isFinite(row.receivedAt)) dates.push(row.receivedAt);
  const s = row.supersedes;
  if (isObject(s) && isString(s.effectiveAt)) {
    const t = Date.parse(s.effectiveAt);
    if (Number.isFinite(t)) dates.push(t);
  }
  return dates.length ? Math.min(...dates) : undefined;
};

/** A claim's stub as a record the app can show until its recipient seals it. */
const stubRecord = (row: Record<string, unknown>): Record<string, unknown> => ({
  bredBy: '',
  dateCreated: '',
  notes: '',
  loggedAt: typeof row.receivedAt === 'number' ? row.receivedAt : 0,
  ...row,
});

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
    const out: T[] = [];
    let unreadable = 0;
    for (const raw of rows) {
      if (!isObject(raw) || !isString(raw.id)) {
        unreadable++;
        continue;
      }
      const id = raw.id;
      let value: Record<string, unknown>;
      let state: RowState;
      if (isSealedRow(raw)) {
        const opened = await openRow(kind, id, raw.sealed);
        if (!opened.ok) {
          states.set(id, 'locked');
          locked.push({
            id,
            ...(isString(raw.strainName) ? { strainName: raw.strainName } : {}),
            ...(isString(raw.profile) ? { profile: raw.profile } : {}),
            ...(opened.kid ? { kid: opened.kid } : {}),
            ...(sinceOf(raw) !== undefined ? { since: sinceOf(raw) } : {}),
          });
          continue;
        }
        value = kind === 'records' ? merged(raw, opened.value) : { ...opened.value, id };
        state = 'open';
      } else if (kind === 'licenses') {
        if (Object.keys(raw).length <= 1) {
          // Emptied by the registry's purge: nothing left to open.
          states.set(id, 'locked');
          locked.push({ id });
          continue;
        }
        value = raw;
        state = 'legacy';
      } else if (hasAny(raw, PRIVATE_MARKERS)) {
        value = raw;
        state = 'legacy';
      } else if (raw.contentsRemoved === true || !isString(raw.transferId)) {
        // The purge left only the public fields: the contents are gone from the registry.
        states.set(id, 'locked');
        locked.push({
          id,
          ...(isString(raw.strainName) ? { strainName: raw.strainName } : {}),
          ...(isString(raw.profile) ? { profile: raw.profile } : {}),
          ...(sinceOf(raw) !== undefined ? { since: sinceOf(raw) } : {}),
        });
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
    loaded.set(kind, {
      holder: k,
      states,
      locked,
      anySealed: rows.some(isSealedRow),
      notice: { truncated, unreadable },
    });
    noteSealedRowsSeen(hasSealedRows());
    changed();
    return out;
  },

  /**
   * Seal and save, and report what the registry actually stored. The response used to be
   * thrown away, so an item the registry refused looked saved (attack round 11).
   */
  async save<T>(key: string, value: T[]): Promise<SaveResult> {
    const kind = kindFor(key);
    const refused: SaveRefusal[] = [];
    const k = holderKey();

    // The vault key: made only when none of this holder's stored rows is sealed. With
    // sealed rows and no key here, a new key would not open them and the registry would
    // refuse rows sealed under a second one: nothing is saved until the backup is restored.
    if (!vaultKeyIfAny()) {
      let anySealed = hasSealedRows();
      if (!anySealed && !current('records')) {
        try {
          const res = await fetch(`${BASE}/api/records`, { headers: { 'x-holder-key': k } });
          if (res.ok) {
            const rows = await readJson(res);
            anySealed = Array.isArray(rows) && !mayMintVault(rows);
          }
        } catch {
          /* unreachable: the save below finds out too */
        }
      }
      if (anySealed) {
        return { ok: false, refused: [{ id: '*', reason: NO_KEY_REASON, words: 'app.sealed.refuse.noKey' }] };
      }
      mintVault();
    }

    const state = current(kind);
    const wire: Record<string, unknown>[] = [];
    for (const item of value as unknown[]) {
      if (!isObject(item) || !isString(item.id)) continue;
      const id = item.id;
      const was = state?.states.get(id);
      // A locked row is never sent back: this browser can't know what is in it.
      if (was === 'locked') continue;
      if (kind === 'licenses') {
        // A licence is only its id in the clear (CONTRACT.md #5).
        const rest: Record<string, unknown> = {};
        for (const [f, v] of Object.entries(item)) if (f !== 'id' && f !== 'sealed' && v !== undefined) rest[f] = v;
        wire.push({ id, sealed: await sealRow('licenses', id, rest) });
        continue;
      }
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
      wire.push({ ...publicPart(item), sealed: await sealRow('records', id, privatePart(item)) });
    }
    if (wire.length === 0) return { ok: refused.length === 0, refused };

    let res: Response;
    try {
      res = await fetch(`${BASE}${pathFor(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-holder-key': k },
        body: JSON.stringify(wire),
      });
    } catch {
      /* offline — in-memory state stays authoritative for this session */
      return { ok: false, refused, offline: true };
    }
    let body: unknown = null;
    try {
      body = await readJson(res);
    } catch {
      /* not JSON — handled below */
    }
    if (!res.ok) {
      const reason =
        isObject(body) && isString(body.error) ? body.error : `the registry answered ${String(res.status)}`;
      return { ok: false, refused: [...refused, { id: '*', reason }] };
    }
    if (!isObject(body))
      return { ok: false, refused: [...refused, { id: '*', reason: 'unexpected response from the registry' }] };
    if (Array.isArray(body.rejected)) {
      for (const r of body.rejected) {
        if (isObject(r) && isString(r.id) && isString(r.reason)) refused.push({ id: r.id, reason: r.reason });
      }
    }
    if (Array.isArray(body.notWritten)) {
      const reason = isString(body.reason) ? body.reason : 'this id already belongs to another holder';
      for (const id of body.notWritten) if (isString(id)) refused.push({ id, reason });
    }
    // What went is sealed now.
    if (state) {
      const no = new Set(refused.map((r) => r.id));
      for (const w of wire) if (isString(w.id) && !no.has(w.id)) state.states.set(w.id, 'open');
      state.anySealed = true;
      noteSealedRowsSeen(true);
    }
    return { ok: body.ok === true && refused.length === 0, refused };
  },
};

/** Said when a record's contents don't match its fingerprint (the words key translates it). */
export const MISMATCH_REASON = 'it doesn’t match its fingerprint, so it wasn’t saved';
/** Said when this browser has no key for the holder's sealed rows. */
export const NO_KEY_REASON =
  'this browser doesn’t have the key for your records, so nothing was saved. Restore your backup file first.';

/**
 * Remove records from the registry (DELETE /api/records). For a locked record: it can't be
 * opened here, edited or sent, but its holder can still take it off VeilCore.
 */
export const deleteRecords = async (ids: readonly string[]): Promise<{ removed: string[] } | { error: string }> => {
  const k = holderKeyIfAny();
  if (!k) return { error: 'this browser has no holder key' };
  try {
    const res = await fetch(`${BASE}/api/records`, {
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
