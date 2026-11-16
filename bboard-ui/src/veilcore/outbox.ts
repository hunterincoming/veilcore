// Records this browser has and VeilCore's registry doesn't yet (round 3, L1, L11, L12).
//
// Nothing is sealed and sent under a vault key until that key is in a backup the app has
// checked: a key that died before its first backup (a private window closed, site data
// cleared) used to become the only key the registry accepted for the holder, and lock them
// out everywhere. So a record made, or changed, before the backup is checked waits here,
// in this browser's storage, and is shown as "not saved yet". So does a new record the
// registry couldn't take just now (offline, a rate limit, a key it won't accept): it used to
// be shown, then reloaded away, with everything typed into it.
//
// Also kept here: the name given to a delivery's recipient while the record it went from
// was saved before sealing and waits for the backup (L11). A change to such a record can't
// be saved until then; the name isn't a change to it, so it waits beside it instead of being
// refused and lost.
//
// Kept per holder key, so Start over (a new key) doesn't show another set's drafts, and
// restoring the key brings them back. What is kept is what this browser already shows; it
// never leaves the browser except in the save it waits for.
// SPDX-License-Identifier: Apache-2.0

import { holderKeyIfAny } from './holder';
import { isObject, isString } from './json';

const OUTBOX = 'veilcore.outbox.v1';
const NAMES = 'veilcore.outbox-names.v1';
const OFFER_KEYS = 'veilcore.outbox-offer-keys.v1';

type PerHolder<T> = Record<string, Record<string, T>>;

/** A browser that keeps nothing: this page's memory only. */
const memory = new Map<string, unknown>();

const readAll = <T>(storageKey: string): PerHolder<T> => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return (memory.get(storageKey) as PerHolder<T> | undefined) ?? {};
    const v: unknown = JSON.parse(raw);
    return isObject(v) ? (v as PerHolder<T>) : {};
  } catch {
    return (memory.get(storageKey) as PerHolder<T> | undefined) ?? {};
  }
};

const writeAll = <T>(storageKey: string, all: PerHolder<T>): void => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(all));
    memory.delete(storageKey);
  } catch {
    memory.set(storageKey, all);
  }
};

const mine = <T>(storageKey: string): Record<string, T> => {
  const h = holderKeyIfAny();
  if (!h) return {};
  const v = readAll<T>(storageKey)[h.toLowerCase()];
  return isObject(v) ? v : {};
};

const setMine = <T>(storageKey: string, next: Record<string, T>): void => {
  const h = holderKeyIfAny();
  if (!h) return;
  const all = readAll<T>(storageKey);
  if (Object.keys(next).length) all[h.toLowerCase()] = next;
  else delete all[h.toLowerCase()];
  writeAll(storageKey, all);
};

/**
 * The records waiting here for this holder, by id. Never one whose id is kept on this device
 * only (below), whatever is stored under it here: the queue's reader checks again each time it
 * is read, so nothing that got into the queue under such an id is ever handed to a save.
 */
export const outboxRecords = (): Record<string, Record<string, unknown>> => {
  const local = mine<unknown>(DEVICE_ONLY);
  const out: Record<string, Record<string, unknown>> = {};
  for (const [id, r] of Object.entries(mine<unknown>(OUTBOX)))
    if (isObject(r) && r.id === id && !(id in local) && !isDeviceOnly(r)) out[id] = r;
  return out;
};

/** Take these ids out of the queue as stored, readable there or not. */
const purgeFromOutbox = (ids: readonly string[]): void => {
  const stored = mine<unknown>(OUTBOX);
  const hit = ids.filter((id) => id in stored);
  if (hit.length === 0) return;
  for (const id of hit) delete stored[id];
  setMine(OUTBOX, stored);
};

/**
 * Whatever sits in the send queue under the id of a record kept on this device only is taken
 * out of it. Run before anything is done with such a record (shown, kept, deleted): a copy left
 * in the queue would be sent the moment the id stopped being kept here.
 */
export const purgeDeviceOnlyFromOutbox = (): void => purgeFromOutbox(Object.keys(mine<unknown>(DEVICE_ONLY)));

export const inOutbox = (id: string): boolean => id in outboxRecords();

/**
 * Keep these records here until the registry has them (replacing any kept copy). Never a record
 * kept on this device only (below): this is the queue of what waits to be sent.
 */
export const putInOutbox = (records: readonly Record<string, unknown>[]): void => {
  const sendable = records.filter((r) => !neverSend(r));
  if (sendable.length === 0) return;
  const here = outboxRecords();
  for (const r of sendable) if (isString(r.id)) here[r.id] = r;
  setMine(OUTBOX, here);
};

/** The registry has these now (or they were let go): no longer kept here. */
export const takeFromOutbox = (ids: readonly string[]): void => {
  const here = outboxRecords();
  let changed = false;
  for (const id of ids) {
    if (id in here) {
      delete here[id];
      changed = true;
    }
  }
  if (changed) setMine(OUTBOX, here);
};

// ---- records kept on this device only (docs/device-only-records.md) ----------------------------
//
// A document record its holder chose to keep here and in the backup file only. Its proof code is
// dated like any record's (the dating row: id, proof code, key binding); its fields are never
// sealed for the registry and never sent, by any save. It is NOT kept in the outbox above, on
// purpose: the outbox is the queue of what waits to be sent, and a tab still running an older
// build of the site sends whatever it finds there. These live under a key of their own, which
// only code that knows never to send them reads.

const DEVICE_ONLY = 'veilcore.device-only.v1';

/** Whether a record is marked as kept on this device only (`deviceOnly: true`, set when it is sealed). */
export const isDeviceOnly = (r: unknown): boolean => isObject(r) && r.deviceOnly === true;

/** The records kept on this device only, for this holder, by id. */
export const deviceOnlyRecords = (): Record<string, Record<string, unknown>> => {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [id, r] of Object.entries(mine<unknown>(DEVICE_ONLY)))
    if (isObject(r) && r.id === id && isDeviceOnly(r)) out[id] = r;
  return out;
};

/**
 * Every entry kept under the device-only key for this holder, as stored: readable as a record
 * or not (records.ts damagedDeviceOnly). An entry that can't be read is still never sent.
 */
export const deviceOnlyRaw = (): Record<string, unknown> => ({ ...mine<unknown>(DEVICE_ONLY) });

/** By id alone, from this browser's own store: so a damaged entry's id is never sendable either. */
export const keptOnDeviceOnly = (id: string): boolean => id in mine<unknown>(DEVICE_ONLY);

/** Put a stored entry back as it was (a restore of one that couldn't be read): never over one already here. */
export const keepRawOnDevice = (entries: Readonly<Record<string, unknown>>): void => {
  const here = mine<unknown>(DEVICE_ONLY);
  const fresh = Object.entries(entries).filter(([id]) => !(id in here) && !(id in mine<unknown>(OUTBOX)));
  if (fresh.length === 0) return;
  for (const [id, raw] of fresh) here[id] = raw;
  setMine(DEVICE_ONLY, here);
};

/**
 * Whether this id is a record kept on this device only. This is the test every outgoing path
 * uses, by id and from this browser's own store: never from what a record object says about
 * itself (a row the registry sent could say anything), and never from the registry's answer.
 */
export const neverSend = (r: unknown): boolean =>
  isDeviceOnly(r) || (isObject(r) && isString(r.id) && keptOnDeviceOnly(r.id));

/** Take a record off this device (the holder's own choice: records.ts deleteDeviceOnly). */
export const dropFromDevice = (id: string): void => {
  // First, while the id is still kept here: nothing under it stays in the send queue.
  purgeFromOutbox([id]);
  const here = mine<unknown>(DEVICE_ONLY);
  if (id in here) {
    delete here[id];
    setMine(DEVICE_ONLY, here);
  }
  const backed = mine<unknown>(DEVICE_ONLY_BACKED);
  if (id in backed) {
    delete backed[id];
    setMine(DEVICE_ONLY_BACKED, backed);
  }
};

// Which of them are in a backup file the holder has checked, by id and proof code. Until one
// is, this browser holds its only copy, and its page says so.
const DEVICE_ONLY_BACKED = 'veilcore.device-only-backup.v1';

export const deviceOnlyInBackup = (id: string, recordFingerprint: string | undefined): boolean =>
  !!recordFingerprint && mine<unknown>(DEVICE_ONLY_BACKED)[id] === recordFingerprint;

export const markDeviceOnlyInBackup = (prints: Readonly<Record<string, string>>): void => {
  if (Object.keys(prints).length === 0) return;
  setMine(DEVICE_ONLY_BACKED, { ...mine<unknown>(DEVICE_ONLY_BACKED), ...prints });
};

/** Keep these records on this device (replacing any kept copy). Only records marked `deviceOnly`. */
export const keepOnDevice = (records: readonly Record<string, unknown>[]): void => {
  const marked = records.filter((r) => isDeviceOnly(r) && isString(r.id));
  if (marked.length === 0) return;
  const here = mine<unknown>(DEVICE_ONLY);
  for (const r of marked) here[r.id as string] = r;
  setMine(DEVICE_ONLY, here);
  purgeFromOutbox(marked.map((r) => r.id as string));
};

/** A map per record id of strings per transfer id, as kept under storageKey. */
const pairsIn = (storageKey: string): Record<string, Record<string, string>> => {
  const out: Record<string, Record<string, string>> = {};
  for (const [id, m] of Object.entries(mine<unknown>(storageKey))) {
    if (!isObject(m)) continue;
    const pairs = Object.fromEntries(Object.entries(m).filter((e): e is [string, string] => isString(e[1])));
    if (Object.keys(pairs).length) out[id] = pairs;
  }
  return out;
};

const keepPair = (storageKey: string, recordId: string, transferId: string, value: string): void => {
  const here = pairsIn(storageKey);
  here[recordId] = { ...(here[recordId] ?? {}), [transferId]: value };
  setMine(storageKey, here);
};

const dropPairs = (storageKey: string, recordId: string): void => {
  const here = pairsIn(storageKey);
  if (!(recordId in here)) return;
  delete here[recordId];
  setMine(storageKey, here);
};

/** Names given to recipients, by record id and transfer id, waiting for their record (L11). */
export const outboxNames = (): Record<string, Record<string, string>> => pairsIn(NAMES);

export const keepName = (recordId: string, transferId: string, name: string): void =>
  keepPair(NAMES, recordId, transferId, name);

/** These names are in the record's sealed copy now. */
export const dropNames = (recordId: string): void => dropPairs(NAMES, recordId);

/**
 * Each delivery's offer key (CONTRACT.md #27), by record id and transfer id, waiting the same
 * way for a record saved before sealing: it goes into the record's sealed copy (offerKeys)
 * when the record is locked. Until then the lab code kept in this browser and the backup
 * file (transfers.ts rememberSentCode) has it too.
 */
export const outboxOfferKeys = (): Record<string, Record<string, string>> => pairsIn(OFFER_KEYS);

export const keepOfferKey = (recordId: string, transferId: string, offerKey: string): void =>
  keepPair(OFFER_KEYS, recordId, transferId, offerKey);

/** These offer keys are in the record's sealed copy now. */
export const dropOfferKeys = (recordId: string): void => dropPairs(OFFER_KEYS, recordId);
