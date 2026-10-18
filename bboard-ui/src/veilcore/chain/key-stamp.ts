// A record's key date stamp, and trying it again by itself when it doesn't go through.
//
// The stamp (anchor) dates the record's key on the test network, from this browser, with the
// fee service paying (actions.ts anchorOnChain). It used to need a click after any failure,
// and a person who closed the page never heard of it again. Now:
//   - on the log screen it is tried again by itself a few times, sooner then later
//     (QUICK_RETRY_MS), with the reason under "Details" each time;
//   - after that, and for any stamp that failed on an earlier visit, it is tried again in the
//     background while the app is open (stamp-background.ts), on a longer schedule, and Home
//     lists it under "Pick up where you left off";
//   - a stamp that may already have gone out is never sent again by itself: sending twice
//     could pay twice, and the person is asked to check it first. Neither is one this site
//     can never make (a contract or proving files that aren't this site's): retrying can't
//     help, and Details says why.
// One stamp runs at a time in this page: the prover is one worker, and the fee service counts
// stamps per browser.
// SPDX-License-Identifier: Apache-2.0

import { NETWORK } from '../../config/network';
import { CHAIN_CONTRACT } from './config';
import { SponsorRefusal } from './sponsor-client';
import { ensureKeysFor, hexBytes, setAnchor } from '../record-keys';
import { getRecord } from '../records';

/** The waits before each automatic try on the log screen: three more tries after the first. */
export const QUICK_RETRY_MS = [10_000, 30_000, 90_000] as const;
/** The background waits after those, in order, the last repeated (5 min, 15 min, 1 h, then 3 h). */
export const BACKGROUND_RETRY_MS = [5 * 60_000, 15 * 60_000, 60 * 60_000, 3 * 3600_000] as const;
/** Background tries per record before it waits for the person (Home still lists it). */
export const MAX_BACKGROUND_TRIES = 12;

export type StampVerdict =
  /** Try again, after at least this long. */
  | { readonly kind: 'retry'; readonly afterMs: number }
  /** Never again by itself: it may have gone out (check first). */
  | { readonly kind: 'sent' }
  /** Never again by itself: this site can't make this stamp (retrying can't help). */
  | { readonly kind: 'cannot' };

/** An error as the stamp screens show it: a refusal with "(try again in about N min)". */
export const stampErrorText = (e: unknown): string =>
  e instanceof SponsorRefusal
    ? `${e.message}${e.retryAfterSeconds ? ` (try again in about ${Math.ceil(e.retryAfterSeconds / 60)} min)` : ''}`
    : e instanceof Error
      ? e.message
      : String(e);

const CANNOT =
  /not the one this site was built for|proving files are not the ones|not configured|does not send transactions|only sends transactions on a test network|not VeilCore.s main-network contract|key isn.t in this browser. Get it back from your backup/i;

/**
 * What to do after a failed stamp, from its words (and the fee service's own wait). `tries` is
 * how many have been made, this one included.
 */
export const stampVerdict = (error: string, tries: number, retryAfterSeconds?: number): StampVerdict => {
  // "WAS sent" in capitals only (actions.ts plainError): "Nothing was sent" is the opposite.
  if (/WAS sent/.test(error) || /may or may not have been sent|may already have gone out/i.test(error))
    return { kind: 'sent' };
  if (CANNOT.test(error)) return { kind: 'cannot' };
  const step = (list: readonly number[]) => list[Math.min(Math.max(tries - 1, 0), list.length - 1)];
  let afterMs = step(QUICK_RETRY_MS);
  const minutes = Number(/try again in about (\d+) min/i.exec(error)?.[1] ?? NaN);
  const told =
    retryAfterSeconds && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : minutes > 0 ? minutes * 60_000 : 0;
  if (/today|tomorrow/i.test(error)) afterMs = Math.max(afterMs, 6 * 3600_000);
  else if (/this hour|try later/i.test(error)) afterMs = Math.max(afterMs, 3600_000);
  return { kind: 'retry', afterMs: Math.max(afterMs, told) };
};

// ---- what is remembered between visits -------------------------------------------------

const STORE = 'veilcore.key-stamp-retry.v1';

/** A record whose stamp didn't go through: when to try next, and why it failed last. */
export type StampRetryEntry = {
  readonly tries: number;
  readonly nextAt?: number;
  /** The last failure, as the error said it (shown under "Details", never sent anywhere). */
  readonly lastError: string;
  readonly lastAt: number;
  /** Stopped for the person to look at: it may have gone out, or this site can't make it. */
  readonly stopped?: 'sent' | 'cannot';
};

const memory = new Map<string, StampRetryEntry>();
const listeners = new Set<() => void>();
let snapshot: Record<string, StampRetryEntry> = {};

const readAll = (): Record<string, StampRetryEntry> => {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw === null) return Object.fromEntries(memory);
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, StampRetryEntry>) : {};
  } catch {
    return Object.fromEntries(memory);
  }
};

const writeAll = (all: Record<string, StampRetryEntry>): void => {
  try {
    localStorage.setItem(STORE, JSON.stringify(all));
  } catch {
    memory.clear();
    for (const [k, v] of Object.entries(all)) memory.set(k, v);
  }
  snapshot = all;
  listeners.forEach((l) => l());
};

/** Every record waiting for its stamp to be tried again, by id. */
export const stampRetries = (): Record<string, StampRetryEntry> => readAll();

export const onStampRetriesChange = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const stampRetriesSnapshot = (): Record<string, StampRetryEntry> => {
  const all = readAll();
  if (JSON.stringify(all) !== JSON.stringify(snapshot)) snapshot = all;
  return snapshot;
};

/** Note a failed stamp; returns what happens next. */
export const noteStampFailure = (
  recordId: string,
  error: string,
  opts: { retryAfterSeconds?: number; background?: boolean; now?: number } = {},
): StampRetryEntry => {
  const now = opts.now ?? Date.now();
  const all = readAll();
  const tries = (all[recordId]?.tries ?? 0) + 1;
  const v = stampVerdict(error, tries, opts.retryAfterSeconds);
  let entry: StampRetryEntry;
  if (v.kind !== 'retry') entry = { tries, lastError: error, lastAt: now, stopped: v.kind };
  else {
    // On the log screen the quick waits; after that the background ones, never sooner than
    // the fee service said.
    const quick = tries <= QUICK_RETRY_MS.length && !opts.background;
    const bg =
      BACKGROUND_RETRY_MS[Math.min(Math.max(tries - QUICK_RETRY_MS.length - 1, 0), BACKGROUND_RETRY_MS.length - 1)];
    const wait = quick ? v.afterMs : Math.max(bg, v.afterMs);
    entry = {
      tries,
      lastError: error,
      lastAt: now,
      ...(tries < QUICK_RETRY_MS.length + 1 + MAX_BACKGROUND_TRIES ? { nextAt: now + wait } : {}),
    };
  }
  writeAll({ ...all, [recordId]: entry });
  return entry;
};

/** The stamp landed, or the record went: nothing to try again. */
export const clearStampRetry = (recordId: string): void => {
  const all = readAll();
  if (!(recordId in all)) return;
  const { [recordId]: _gone, ...rest } = all;
  void _gone;
  writeAll(rest);
};

/** The person asked to try now (or to go on after checking): due now, stops lifted. */
export const retryStampNow = (recordId: string, now = Date.now()): void => {
  const all = readAll();
  const e = all[recordId];
  if (!e) return;
  writeAll({ ...all, [recordId]: { tries: e.tries, lastError: e.lastError, lastAt: e.lastAt, nextAt: now } });
};

// ---- making the stamp, one at a time ------------------------------------------------------

let running: Promise<unknown> = Promise.resolve();
let busyWith: string | undefined;

/** The record whose stamp is being made in this page now, if any. */
export const stampInProgress = (): string | undefined => busyWith;

/**
 * Date stamp a record's key: the key the record named when it was sealed, never a new one.
 * Waits for any other stamp in this page to finish first. On success the anchor is kept with
 * the record's keys (record-keys.ts) and any retry is cleared.
 */
export const stampKey = (recordId: string, progress: (msg: string) => void = () => undefined): Promise<void> => {
  const job = running.then(async () => {
    busyWith = recordId;
    try {
      const k = ensureKeysFor(getRecord(recordId) ?? { id: recordId });
      const { anchorOnChain, identityOf } = await import('./actions');
      const secret = hexBytes(k.recordSecret);
      const receipt = await anchorOnChain(secret, hexBytes(k.recoverySecret), { progress });
      setAnchor(recordId, {
        identity: identityOf(secret),
        network: NETWORK,
        contractAddress: CHAIN_CONTRACT ?? '',
        txId: receipt.txId,
        txHash: receipt.txHash,
        blockHeight: receipt.blockHeight,
        anchoredAt: receipt.blockTime,
      });
      clearStampRetry(recordId);
    } finally {
      busyWith = undefined;
    }
  });
  running = job.catch(() => undefined);
  return job;
};
