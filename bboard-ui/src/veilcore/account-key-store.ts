// Where this browser keeps the account key between visits, so saving needs no Face ID each time.
//
// The rule (security review S5): only as WebCrypto keys the page can use and never read back.
// The account key's raw bytes exist in memory for a moment when it is made or unwrapped from a
// way in; what is kept is:
//   - the sealing key (AES-256-GCM, `extractable: false`, usages encrypt and decrypt only), and
//   - the signing key (HMAC-SHA256, `extractable: false`, usage sign only) the copy's write
//     token and its key-check value are made with,
// both derived from the account key with HKDF, in IndexedDB (a CryptoKey is stored as itself
// there, still unreadable). Neither can wrap or make a new way in: adding or removing one always
// needs the raw account key, so a fresh unlock through an existing way in (account-copy.ts).
// Something that runs in this page (a script bug, XSS) could use them while it runs, as it could
// the vault key in localStorage. It can't take the keys away, and can't add a way in that outlasts
// it. It CAN take away what they make: the copy's write token (an HMAC output, readable once made),
// and copies it seals during that visit. With those it could later replace the copy at the
// registry (review New-3): every device would merge it if its counter is higher. Merges refuse
// implausible counter and version jumps (account-copy.ts plausible), and docs/passkey-backup.md
// has the re-key procedure to run after any such bug is fixed.
//
// "Start over" on this device clears it (records.ts startOver).
// SPDX-License-Identifier: Apache-2.0

export type HeldAccount = {
  readonly copyId: string;
  readonly sealKey: CryptoKey;
  readonly macKey: CryptoKey;
};

const DB = 'veilcore.account.v1';
const STORE = 'keys';
const KEY = 'current';

/** Where IndexedDB isn't there (some private windows, tests): this page's life only. */
let memory: HeldAccount | undefined;

const idb = (): IDBFactory | undefined => {
  try {
    return typeof indexedDB !== 'undefined' ? indexedDB : undefined;
  } catch {
    return undefined;
  }
};

const open = (f: IDBFactory): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = f.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB'));
  });

const run = async <T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> => {
  const factory = idb();
  if (!factory) return undefined;
  const db = await open(factory);
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = f(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB'));
    });
  } finally {
    db.close();
  }
};

const isHeld = (v: unknown): v is HeldAccount => {
  if (typeof v !== 'object' || v === null) return false;
  const h = v as Record<string, unknown>;
  return (
    typeof h.copyId === 'string' &&
    typeof CryptoKey !== 'undefined' &&
    h.sealKey instanceof CryptoKey &&
    h.macKey instanceof CryptoKey &&
    // The rule above, checked on every read: a key that could be read back is not used.
    h.sealKey.extractable === false &&
    h.macKey.extractable === false
  );
};

/** Keep the account's keys for the next visit. Throws for a key that could be read back. */
export const keepAccountKeys = async (held: HeldAccount): Promise<void> => {
  if (held.sealKey.extractable || held.macKey.extractable) throw new Error('an account key must never be extractable');
  memory = held;
  try {
    await run('readwrite', (s) => s.put(held, KEY));
  } catch {
    /* kept for this page's life only: the next visit asks for Face ID once */
  }
};

/** The account's keys this browser kept, if any. */
export const heldAccountKeys = async (): Promise<HeldAccount | undefined> => {
  if (memory) return memory;
  try {
    const v: unknown = await run<unknown>('readonly', (s) => s.get(KEY));
    if (isHeld(v)) {
      memory = v;
      return v;
    }
  } catch {
    /* none */
  }
  return undefined;
};

/** Forget them here (start over, the copy deleted, another copy adopted). */
export const forgetAccountKeys = async (): Promise<void> => {
  memory = undefined;
  try {
    await run('readwrite', (s) => s.delete(KEY));
  } catch {
    /* nothing kept */
  }
};

/** Tests only: forget the page-life copy (IndexedDB, where there is one, stays). */
export const __forgetAccountKeysInMemory = (): void => {
  memory = undefined;
};
