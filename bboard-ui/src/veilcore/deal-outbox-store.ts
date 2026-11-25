// Where a deal's messages wait in this browser until the registry confirms them (deal-client.ts
// sayOnce), and how long. Kept apart from deal-client.ts so every page can sweep what has expired
// on load (main.tsx) without loading the deal code: a deal never opened again used to keep its
// expired messages until that deal was next written.
// SPDX-License-Identifier: Apache-2.0

import { isNumber, isObject, isString } from './json';

/** Each deal's kept messages are one storage entry: this, then the deal's commitment and record. */
export const OUTBOX_PREFIX = 'veilcore.deal-outbox.v1.';
/**
 * How long a report, an answer, "I paid" or "received" that landed is remembered: a second tap
 * or tab in that time sends nothing.
 */
export const LANDED_MS = 10 * 60_000;
/** How long a message signed and not yet confirmed is kept, to be sent again as it was. */
export const KEEP_MS = 30 * 86_400_000;

export type Kept = {
  readonly iv: string;
  readonly ct: string;
  readonly signature: string;
  readonly type: string;
  readonly madeAt: number;
  readonly landedAt?: number;
};

export const isKept = (v: unknown): v is Kept =>
  isObject(v) && isString(v.iv) && isString(v.ct) && isString(v.signature) && isString(v.type) && isNumber(v.madeAt);

/** Whether a kept message is still wanted at `now`: landed less than LANDED_MS ago, or made less than KEEP_MS ago. */
export const stillKept = (v: Kept, now: number): boolean =>
  v.landedAt ? now - v.landedAt < LANDED_MS : now - v.madeAt < KEEP_MS;

/**
 * Remove from this browser every deal's kept messages that have expired, and an entry left
 * with none. Messages still wanted stay exactly as they are. Never throws.
 */
export const sweepDealOutboxes = (now = Date.now()): void => {
  try {
    const names: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const name = localStorage.key(i);
      if (name?.startsWith(OUTBOX_PREFIX)) names.push(name);
    }
    for (const name of names) {
      let box: unknown;
      try {
        box = JSON.parse(localStorage.getItem(name) ?? 'null');
      } catch {
        box = null;
      }
      const kept = Object.entries(isObject(box) ? box : {}).filter(([, v]) => isKept(v) && stillKept(v, now));
      if (kept.length === 0) localStorage.removeItem(name);
      else if (kept.length !== Object.keys(box as object).length)
        localStorage.setItem(name, JSON.stringify(Object.fromEntries(kept)));
    }
  } catch {
    /* storage blocked: nothing kept to sweep */
  }
};
