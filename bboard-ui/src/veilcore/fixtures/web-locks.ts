// For tests: the browser's Web Locks (navigator.locks), as every browser the site supports
// has them. Node has none, so tab-lock.ts would fall back to its localStorage lease, which
// waits a beat before every first save. One lock manager for the whole test process, like
// one browser: every "tab" a test makes shares it.
// SPDX-License-Identifier: Apache-2.0

import { vi } from 'vitest';

const queues = new Map<string, Promise<unknown>>();

const request = <T>(name: string, _options: { mode: 'exclusive' }, fn: () => Promise<T>): Promise<T> => {
  const before = queues.get(name) ?? Promise.resolve();
  const run = before.then(fn, fn);
  queues.set(
    name,
    run.catch(() => undefined),
  );
  return run;
};

/** Give this test's `navigator` Web Locks (stubbed: vi.unstubAllGlobals takes it away). */
export const stubWebLocks = (): void => {
  const here: Record<string, unknown> = {};
  if (typeof navigator === 'object' && navigator !== null) {
    for (const k of ['userAgent', 'language', 'languages', 'platform', 'hardwareConcurrency'] as const) {
      try {
        here[k] = (navigator as unknown as Record<string, unknown>)[k];
      } catch {
        /* not in this runtime */
      }
    }
  }
  vi.stubGlobal('navigator', { ...here, locks: { request } });
};
