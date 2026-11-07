// The one thing Ask keeps in browser storage: whether the person has seen it. One key, holding
// how many visits the hint by the bubble has shown on ("1", "2"), or "done" once it has shown on
// three, was dismissed, or Ask was opened. Never what they typed, never an answer. If storage is
// blocked (a private window), the hint simply follows the same rule within the page.
// SPDX-License-Identifier: Apache-2.0

export const HINT_KEY = 'veilcore.ask.seen.v1';
/** Visits the hint shows on, at most. */
export const HINT_VISITS = 3;

const read = (): string | null => {
  try {
    return localStorage.getItem(HINT_KEY);
  } catch {
    return null;
  }
};
const write = (v: string): void => {
  try {
    localStorage.setItem(HINT_KEY, v);
  } catch {
    /* storage blocked */
  }
};

/** Ask has been seen: opened, the hint dismissed, or the hint shown on enough visits. */
export const askSeen = (): boolean => {
  return read() === 'done';
};

/** The hint has shown on this visit: counted once per page load. */
export const noteHintShown = (): void => {
  const n = Number(read() ?? '0');
  if (!Number.isInteger(n)) return;
  write(n + 1 >= HINT_VISITS ? 'done' : String(n + 1));
};

export const markAskSeen = (): void => write('done');
