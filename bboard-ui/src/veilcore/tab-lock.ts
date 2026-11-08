// One tab at a time: a lock every tab of this site in this browser shares.
//
// Used where two tabs doing the same thing at once would make two of something that must be
// one (lab-report-date.ts: "Date this lab report" from two tabs sealed two records for one
// report). The browser's own Web Locks when it has them: the lock is let go when the work
// ends or the tab closes. Otherwise a lease in localStorage with an expiry, so a tab that
// closes mid-way holds nobody up for longer than the lease.
//
// The lease is weaker than Web Locks: a tab in the background has its timers slowed, so its
// lease can run out while its work still runs, and another tab may then take it. So the work
// is handed `held()`, which says whether this tab still holds the lock (and keeps the lease
// fresh while it does): check it right before a write that must not cross another tab's. With
// Web Locks it is always true. Storage that can't be read or written fails closed: the work
// doesn't run (TabLockUnavailable), since another tab might be doing it at the same moment.
// SPDX-License-Identifier: Apache-2.0

const LEASE_PREFIX = 'veilcore.lock.';

/** How long a lease lasts without the tab that took it letting it go. */
export const LEASE_MS = 30_000;
/** How long to wait between looks at someone else's lease. */
const POLL_MS = 150;

type LockManagerLike = {
  request: <T>(name: string, options: { mode: 'exclusive' }, fn: () => Promise<T>) => Promise<T>;
};

type Lease = { readonly owner: string; readonly until: number };

const randomOwner = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('');

/** Thrown when this browser's storage can't hold the lease: the work is not run. */
export class TabLockUnavailable extends Error {
  constructor() {
    super('This browser would not keep what VeilCore needs to run this one tab at a time. Nothing was done.');
    this.name = 'TabLockUnavailable';
  }
}

/** Whether this tab still holds the lock it was given. */
export type Held = () => boolean;

/** The lease kept under `key`; throws when storage can't be read (an unreadable value is none). */
const readLease = (key: string): Lease | undefined => {
  const raw = localStorage.getItem(key);
  if (!raw) return undefined;
  try {
    const v = JSON.parse(raw) as Partial<Lease>;
    return typeof v.owner === 'string' && typeof v.until === 'number' ? { owner: v.owner, until: v.until } : undefined;
  } catch {
    return undefined;
  }
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export type LeaseDeps = { readonly now?: () => number; readonly sleep?: (ms: number) => Promise<void> };

/**
 * The localStorage fallback: take the lease when nobody holds it (or theirs ran out), look
 * again a moment later to make sure another tab didn't take it at the same instant, then
 * run, and let it go. Exported for the tests.
 */
export const withLease = async <T>(name: string, fn: (held: Held) => Promise<T>, deps: LeaseDeps = {}): Promise<T> => {
  const now = deps.now ?? Date.now;
  const wait = deps.sleep ?? sleep;
  const key = `${LEASE_PREFIX}${name}`;
  const owner = randomOwner();
  let took = false;
  try {
    // Never waits forever: a lease runs out after LEASE_MS.
    for (;;) {
      const lease = readLease(key);
      if (!lease || lease.until <= now()) {
        localStorage.setItem(key, JSON.stringify({ owner, until: now() + LEASE_MS }));
        await wait(POLL_MS / 3);
        if (readLease(key)?.owner === owner) {
          took = true;
          break;
        }
      }
      await wait(POLL_MS);
    }
  } catch {
    // Fails closed: another tab might be doing this very work.
    throw new TabLockUnavailable();
  }
  /** Still ours and not run out: then kept fresh. */
  const held: Held = () => {
    try {
      const l = readLease(key);
      if (l?.owner !== owner || l.until <= now()) return false;
      localStorage.setItem(key, JSON.stringify({ owner, until: now() + LEASE_MS }));
      return true;
    } catch {
      return false;
    }
  };
  // Kept fresh while the work runs, so a slow save doesn't let the lease run out under it.
  const renew = setInterval(() => {
    try {
      if (readLease(key)?.owner === owner)
        localStorage.setItem(key, JSON.stringify({ owner, until: now() + LEASE_MS }));
    } catch {
      /* storage gone: the lease runs out on its own */
    }
  }, LEASE_MS / 3);
  try {
    return await fn(held);
  } finally {
    clearInterval(renew);
    if (took) {
      try {
        if (readLease(key)?.owner === owner) localStorage.removeItem(key);
      } catch {
        /* nothing to let go of */
      }
    }
  }
};

/** Run `fn` while no other tab of this site in this browser runs work under the same name. */
export const withTabLock = <T>(name: string, fn: (held: Held) => Promise<T>): Promise<T> => {
  const locks =
    (typeof navigator !== 'undefined' ? (navigator as { locks?: LockManagerLike }).locks : undefined) ?? undefined;
  // The browser lets go only when the work ends or the tab closes: always held.
  if (locks && typeof locks.request === 'function')
    return locks.request(name, { mode: 'exclusive' }, () => fn(() => true));
  return withLease(name, fn);
};
