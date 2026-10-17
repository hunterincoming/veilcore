// A record's key date stamp on a screen: started, its progress, and when it fails, tried again
// by itself a few times (veilcore/chain/key-stamp.ts) with a countdown, the reason under
// "Details", and "Try again now". While the screen is open the background leaves this record
// to it (stamp-background.ts holdStamp); once it is closed, the background takes over.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { SponsorRefusal } from '../../veilcore/chain/sponsor-client';
import {
  noteStampFailure,
  onStampRetriesChange,
  retryStampNow,
  stampErrorText,
  stampKey,
  stampRetriesSnapshot,
  QUICK_RETRY_MS,
  type StampRetryEntry,
} from '../../veilcore/chain/key-stamp';
import { holdStamp } from '../../veilcore/chain/stamp-background';

export type KeyStampState = {
  readonly busy: boolean;
  readonly progress?: string;
  /** The last failure's words (raw: shown through stampProblem, and under Details). */
  readonly error?: string;
  /** What happens next after a failure, as remembered (tries, next try, stopped). */
  readonly entry?: StampRetryEntry;
  /** Seconds until the next automatic try on this screen, while one is coming. */
  readonly nextInSeconds?: number;
  /** How many tries this screen makes by itself in all. */
  readonly quickTries: number;
  readonly run: () => Promise<void>;
  readonly tryNow: () => Promise<void>;
};

export const useStampRetries = (): Record<string, StampRetryEntry> =>
  useSyncExternalStore(onStampRetriesChange, stampRetriesSnapshot, stampRetriesSnapshot);

export const useKeyStamp = (recordId: string, opts: { auto: boolean }): KeyStampState => {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>();
  const [error, setError] = useState<string>();
  const [now, setNow] = useState(() => Date.now());
  const entry = useStampRetries()[recordId];
  const alive = useRef(true);
  const running = useRef(false);

  useEffect(() => {
    alive.current = true;
    const release = holdStamp(recordId);
    return () => {
      alive.current = false;
      release();
    };
  }, [recordId]);

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(undefined);
    setProgress('Starting…');
    try {
      await stampKey(recordId, (p) => alive.current && setProgress(p));
    } catch (e) {
      const text = stampErrorText(e);
      noteStampFailure(recordId, text, {
        ...(e instanceof SponsorRefusal && e.retryAfterSeconds ? { retryAfterSeconds: e.retryAfterSeconds } : {}),
      });
      if (alive.current) setError(text);
    } finally {
      running.current = false;
      if (alive.current) {
        setBusy(false);
        setProgress(undefined);
        setNow(Date.now());
      }
    }
  }, [recordId]);

  const tryNow = useCallback(async () => {
    retryStampNow(recordId);
    await run();
  }, [recordId, run]);

  // A failure this screen saw (or one from an earlier visit): the countdown, then the next try
  // (soon for the first few, then on the background's longer schedule). Once the screen is
  // closed the background goes on with it.
  const quickTries = QUICK_RETRY_MS.length + 1;
  const autoNext =
    opts.auto && !busy && entry && !entry.stopped && entry.nextAt !== undefined ? entry.nextAt : undefined;
  useEffect(() => {
    if (autoNext === undefined) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const wait = Math.max(autoNext - Date.now(), 0);
    const go = window.setTimeout(() => void run(), wait);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(go);
    };
  }, [autoNext, run]);

  return {
    busy,
    progress,
    error: error ?? (entry && !busy ? entry.lastError : undefined),
    entry,
    nextInSeconds: autoNext !== undefined ? Math.max(Math.ceil((autoNext - now) / 1000), 0) : undefined,
    quickTries,
    run,
    tryNow,
  };
};
