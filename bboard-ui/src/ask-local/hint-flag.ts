// The one thing Ask keeps in browser storage, under one key: how far the person has got with it.
//   "1", "2", "3"  the hint by the bubble has shown on that many visits (it stops at three);
//   "dismissed"    they closed the hint;
//   "opened"       they have opened Ask (what it can do and the model panel then open folded).
// Seeing the hint, even three times, is not opening Ask. Never what they typed, never an answer.
// If storage is blocked (a private window), the same rules hold within the page.
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
const shown = (v: string | null): number => (v && /^[0-9]$/.test(v) ? Number(v) : 0);

/** Ask has been opened in this browser. */
export const askOpened = (): boolean => read() === 'opened';

/** The hint is finished with: Ask opened, the hint dismissed, or shown on three visits. */
export const hintDone = (): boolean => {
  const v = read();
  return v === 'opened' || v === 'dismissed' || shown(v) >= HINT_VISITS;
};

/** The hint has shown on this visit: counted once per page load. */
export const noteHintShown = (): void => {
  const v = read();
  if (v === 'opened' || v === 'dismissed') return;
  write(String(Math.min(shown(v) + 1, HINT_VISITS)));
};

/** The hint was closed (unless Ask was already opened, which says more). */
export const dismissHint = (): void => {
  if (read() !== 'opened') write('dismissed');
};

export const markAskOpened = (): void => write('opened');
