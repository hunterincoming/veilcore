// Key date stamps that didn't go through, tried again while the app is open (key-stamp.ts).
//
// Only stamps that were started and failed are here: nothing is stamped that the person never
// started. One at a time, only while the tab is visible, never on a check or prove page (those
// pages do nothing of the holder's: holder-guard.ts), and never for a record whose log screen is
// open and trying it itself (holdStamp). A stamp that may have gone out, or one this site can't
// make, waits for the person.
// SPDX-License-Identifier: Apache-2.0

import { holderRequestsPaused } from '../holder-guard';
import { keysFor } from '../record-keys';
import { REAL_CHAIN, chainNotReady } from './config';
import { SponsorRefusal } from './sponsor-client';
import {
  clearStampRetry,
  noteStampFailure,
  stampErrorText,
  stampInProgress,
  stampKey,
  stampRetries,
  type StampRetryEntry,
} from './key-stamp';

const held = new Map<string, number>();

/** A screen that is trying this record's stamp itself: the background leaves it alone. */
export const holdStamp = (recordId: string): (() => void) => {
  held.set(recordId, (held.get(recordId) ?? 0) + 1);
  return () => {
    const n = (held.get(recordId) ?? 1) - 1;
    if (n > 0) held.set(recordId, n);
    else held.delete(recordId);
  };
};

/** The records the background would try now, in the order it would try them. */
export const dueStamps = (
  all: Record<string, StampRetryEntry> = stampRetries(),
  now = Date.now(),
  hasKeys: (id: string) => 'stamped' | 'waiting' | 'none' = (id) => {
    const k = keysFor(id);
    return !k ? 'none' : k.anchor ? 'stamped' : 'waiting';
  },
): string[] =>
  Object.entries(all)
    .filter(
      ([id, e]) =>
        !e.stopped && e.nextAt !== undefined && e.nextAt <= now && !held.has(id) && hasKeys(id) === 'waiting',
    )
    .sort((a, b) => (a[1].nextAt ?? 0) - (b[1].nextAt ?? 0))
    .map(([id]) => id);

let timer: ReturnType<typeof setInterval> | undefined;
let busy = false;

/** One pass: forget stamps that landed, then try the most overdue one. */
export const stampRetryTick = async (): Promise<void> => {
  if (busy || stampInProgress() || holderRequestsPaused()) return;
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
  for (const id of Object.keys(stampRetries())) if (keysFor(id)?.anchor) clearStampRetry(id);
  const next = dueStamps()[0];
  if (!next) return;
  busy = true;
  try {
    await stampKey(next);
  } catch (e) {
    noteStampFailure(next, stampErrorText(e), {
      background: true,
      ...(e instanceof SponsorRefusal && e.retryAfterSeconds ? { retryAfterSeconds: e.retryAfterSeconds } : {}),
    });
  } finally {
    busy = false;
  }
};

/** Start trying in the background (App.tsx, on app pages). Test-network builds only. */
export const startStampRetries = (): void => {
  if (timer !== undefined || typeof window === 'undefined' || !REAL_CHAIN || chainNotReady()) return;
  timer = setInterval(() => void stampRetryTick(), 30_000);
  window.setTimeout(() => void stampRetryTick(), 5_000);
};
