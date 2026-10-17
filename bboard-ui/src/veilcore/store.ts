// Storage adapter. The app talks to this, never to localStorage directly, so the
// backing store can be swapped (server API, or another backend) without touching callers.
//
// `load` takes a guard rather than just a type parameter. A store does not know what
// it is storing — the type argument is erased at runtime, so a store that promised
// `T[]` was asserting a shape it had no way to check, and anything malformed in
// storage or in a response flowed into the app as though it were a record.
// The caller knows the type, so the caller supplies the check.
//
// SPDX-License-Identifier: Apache-2.0

import type { AppKey } from '../i18n/app/en';

/**
 * One item the registry did not store, and why. `words` is set when the browser itself
 * refused it (api-store.ts), so the reason can be said in the visitor's language; the
 * registry's own reasons stay as it gave them.
 */
export type SaveRefusal = { readonly id: string; readonly reason: string; readonly words?: AppKey };

/**
 * What a save actually did. The registry can refuse individual items (an id another
 * holder owns, a commitment that does not match) while storing the rest, and a caller
 * that assumed success showed a holder a record the registry never kept (attack
 * round 11: a refused correction left the app believing it had been issued).
 */
export type SaveResult = {
  readonly ok: boolean;
  readonly refused: readonly SaveRefusal[];
  /** Could not reach the store at all; local state is all there is for now. */
  readonly offline?: boolean;
  /**
   * Ids that had something new to save but were not sent, because the key that would seal
   * them isn't in a checked backup yet (round 3, L1). Kept in this browser until it is.
   */
  readonly held?: readonly string[];
  /** Ids the store accepted in this save. */
  readonly accepted?: readonly string[];
  /** Ids this save had something new for (sent, held, or not sent because offline). */
  readonly pending?: readonly string[];
};

export interface Store {
  /** Rejects when the store cannot answer now (offline, refused): callers keep what they have. */
  load<T>(key: string, isValid: (v: unknown) => v is T): Promise<T[]>;
  save<T>(key: string, value: T[]): Promise<SaveResult>;
}

/** Browser localStorage. Records only exist in the browser that created them. */
export const localStore: Store = {
  load<T>(key: string, isValid: (v: unknown) => v is T): Promise<T[]> {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return Promise.resolve([]);
      const parsed: unknown = JSON.parse(raw);
      return Promise.resolve(Array.isArray(parsed) ? parsed.filter(isValid) : []);
    } catch {
      return Promise.resolve([]);
    }
  },
  save<T>(key: string, value: T[]): Promise<SaveResult> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return Promise.resolve({ ok: true, refused: [] });
    } catch {
      /* quota or availability — stay in memory */
      return Promise.resolve({ ok: false, refused: [], offline: true });
    }
  },
};

import { apiStore } from './api-store';
export const store: Store = apiStore;
