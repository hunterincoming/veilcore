// The one thing Ask keeps in browser storage: that the person has seen it (dismissed the hint by
// the button, or opened Ask). Only a flag: never what they typed, never an answer. If storage
// is blocked (a private window), the hint simply shows again next time.
// SPDX-License-Identifier: Apache-2.0

export const HINT_KEY = 'veilcore.ask.seen.v1';

export const askSeen = (): boolean => {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
};

export const markAskSeen = (): void => {
  try {
    localStorage.setItem(HINT_KEY, '1');
  } catch {
    /* storage blocked: the hint shows again next visit */
  }
};
