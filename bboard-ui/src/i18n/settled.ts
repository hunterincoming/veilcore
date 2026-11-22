// Promises React's `use` can read without suspending once they have settled.
//
// `use` must be called on every render, never behind `??` or an `if` (React error #520, from
// #467 "Update hook called on initial render"): a component that suspends in `use` is replayed
// once the promise resolves, and if the replay skips `use` because a module cache filled in the
// meantime, the hooks after it run with the wrong dispatcher. React throws, then recovers by
// rendering the whole root again, synchronously. So the language hooks always call `use`, on a
// promise that says it has settled: React then reads the value at once, with no suspension, when
// the words are already here.
// SPDX-License-Identifier: Apache-2.0

type Settled<T> = Promise<T> & { status?: 'pending' | 'fulfilled' | 'rejected'; value?: T; reason?: unknown };

/** An already-settled promise of `value`, readable by `use` in the same render. */
export const fulfilled = <T>(value: T): Promise<T> =>
  Object.assign(Promise.resolve(value), { status: 'fulfilled' as const, value });

/** `p`, marked as settled when it settles, as React marks the promises it tracks. */
export const tracked = <T>(p: Promise<T>): Promise<T> => {
  const s = p as Settled<T>;
  s.status = 'pending';
  s.then(
    (value) => {
      s.status = 'fulfilled';
      s.value = value;
    },
    (reason: unknown) => {
      s.status = 'rejected';
      s.reason = reason;
    },
  );
  return s;
};
