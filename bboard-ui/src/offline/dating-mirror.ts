// What the offline worker may send by itself (offline/sw.js, Background Sync; docs/offline.md).
//
// A record sealed with no signal waits in this browser (veilcore/outbox.ts) and is dated when its
// proof code reaches VeilCore. With VeilCore open, the page sends it the moment signal is back.
// With VeilCore closed, only the worker is there, and it can't read this page's storage. So the
// page leaves it, in this site's IndexedDB, exactly what PUT /api/records/dating takes for those
// records: { id, recordFingerprint, keyBinding? } each, and the holder key the request is made
// with. Nothing typed, no vault key, no locked copy: the locked copy waits for the page, as it
// always has. The list follows the queue: written on every change, emptied when nothing waits.
// The holder key is a second copy of one this browser already keeps (holder.ts); anything that
// can read this site's storage could read both. A browser without Background Sync gets no copy.
// SPDX-License-Identifier: Apache-2.0

import { OFFLINE_ON, askForBackgroundSend } from './register';

const DB_NAME = 'veilcore-offline';
const DB_STORE = 'kv';
const DB_KEY = 'dating';

export type DatingRow = { readonly id: string; readonly recordFingerprint: string; readonly keyBinding?: string };

const hasBackgroundSync = (): boolean =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'SyncManager' in window &&
  typeof indexedDB !== 'undefined';

const write = (value: unknown): Promise<void> =>
  new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, 1);
    } catch {
      return resolve();
    }
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onerror = () => resolve();
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction(DB_STORE, 'readwrite');
        const s = tx.objectStore(DB_STORE);
        if (value === undefined) s.delete(DB_KEY);
        else s.put(value, DB_KEY);
        tx.oncomplete =
          tx.onerror =
          tx.onabort =
            () => {
              db.close();
              resolve();
            };
      } catch {
        db.close();
        resolve();
      }
    };
  });

let last = '';
let timer: ReturnType<typeof setTimeout> | undefined;

/**
 * Keep the worker's list the same as what waits here (debounced). `rows` are the dating rows of
 * records whose proof code hasn't reached VeilCore yet; an empty list removes the copy.
 */
export const mirrorDatingQueue = (holderKey: string | null, rows: readonly DatingRow[]): void => {
  if (!OFFLINE_ON || !hasBackgroundSync()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = undefined;
    const value = holderKey && rows.length ? { holderKey, rows: rows.slice(0, 100) } : undefined;
    const key = JSON.stringify(value ?? null);
    if (key === last) return;
    last = key;
    void write(value).then(() => (value ? askForBackgroundSend() : false));
  }, 400);
};
