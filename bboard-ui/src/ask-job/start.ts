// "Do it for me": starting the runner on the app's pages (App.tsx), as stamp-background.ts is.
// It passes over approved jobs every 15 seconds, when the tab comes back into view, and when a
// job changes, only while this page may send the holder's requests (never on a check or prove
// page: holder-guard.ts) and the tab is visible. One runner across tabs (tab-lock.ts).
// SPDX-License-Identifier: Apache-2.0

import { holderRequestsPaused } from '../veilcore/holder-guard';
import { withTabLock, TabLockUnavailable } from '../veilcore/tab-lock';
import { runJobs, type RunDeps } from './run';
import { SENDERS, pageMaySend } from './senders';
import { onJobsChange } from './store';
import './prepare';

/** The lock one runner holds across this site's tabs. */
export const RUNNER_LOCK = 'veilcore.ask.job-runner';

/** The page rule, the same as stamp-background.ts: not on a check or prove page, and visible. */
export const runnerAllowed = (): boolean => pageMaySend();

export const RUN_DEPS: RunDeps = {
  now: () => Date.now(),
  allowed: runnerAllowed,
  lock: (fn) => withTabLock(RUNNER_LOCK, (held) => fn(held)),
  send: SENDERS,
};

let timer: ReturnType<typeof setInterval> | undefined;
let busy = false;

/** One pass, never two at once in this tab. */
export const runnerTick = async (): Promise<void> => {
  if (busy || !runnerAllowed()) return;
  busy = true;
  try {
    await runJobs(RUN_DEPS);
  } catch (e) {
    // Another tab holds the lock and storage can't say so: the next pass tries again.
    if (!(e instanceof TabLockUnavailable)) console.warn('Do it for me:', e instanceof Error ? e.message : e);
  } finally {
    busy = false;
  }
};

export const startJobRunner = (): void => {
  if (timer !== undefined || typeof window === 'undefined' || holderRequestsPaused()) return;
  timer = setInterval(() => void runnerTick(), 15_000);
  document.addEventListener('visibilitychange', () => void runnerTick());
  onJobsChange(() => void runnerTick());
  window.setTimeout(() => void runnerTick(), 1_000);
};
