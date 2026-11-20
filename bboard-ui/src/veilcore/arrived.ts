// Records whose keys came to this device from a backup file or from the copy saved with VeilCore
// (backup.ts restoreAny), rather than being made here. Home's "Still in progress" lists only the
// records this device is getting dated: one that arrived from elsewhere is shown once, in the list
// of records, and its own page says where its date stands (the live test of step 2, 19 Nov 2026:
// a just-restored record was listed twice). Ids only, nothing secret.
// SPDX-License-Identifier: Apache-2.0

const KEY = 'veilcore.records.arrived.v1';
/** Kept to the newest this many: an older one has long been dated. */
const MAX = 2000;

export const arrivedIds = (): ReadonlySet<string> => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
};

export const noteArrived = (ids: readonly string[]): void => {
  if (ids.length === 0) return;
  try {
    const had = [...arrivedIds()].filter((id) => !ids.includes(id));
    localStorage.setItem(KEY, JSON.stringify([...had, ...ids].slice(-MAX)));
  } catch {
    /* shown under "Still in progress" too, as before */
  }
};
