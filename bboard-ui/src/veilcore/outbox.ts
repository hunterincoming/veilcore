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

/** The records waiting here for this holder, by id. */
export const outboxRecords = (): Record<string, Record<string, unknown>> => {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [id, r] of Object.entries(mine<unknown>(OUTBOX))) if (isObject(r) && r.id === id) out[id] = r;
  return out;
};

export const inOutbox = (id: string): boolean => id in outboxRecords();

/** Keep these records here until the registry has them (replacing any kept copy). */
export const putInOutbox = (records: readonly Record<string, unknown>[]): void => {
  if (records.length === 0) return;
  const here = outboxRecords();
  for (const r of records) if (isString(r.id)) here[r.id] = r;
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

/** Names given to recipients, by record id and transfer id, waiting for their record (L11). */
export const outboxNames = (): Record<string, Record<string, string>> => {
  const out: Record<string, Record<string, string>> = {};
  for (const [id, m] of Object.entries(mine<unknown>(NAMES))) {
    if (!isObject(m)) continue;
    const names = Object.fromEntries(Object.entries(m).filter((e): e is [string, string] => isString(e[1])));
    if (Object.keys(names).length) out[id] = names;
  }
  return out;
};

export const keepName = (recordId: string, transferId: string, name: string): void => {
  const here = outboxNames();
  here[recordId] = { ...(here[recordId] ?? {}), [transferId]: name };
  setMine(NAMES, here);
};

/** These names are in the record's sealed copy now. */
export const dropNames = (recordId: string): void => {
  const here = outboxNames();
  if (!(recordId in here)) return;
  delete here[recordId];
  setMine(NAMES, here);
};
