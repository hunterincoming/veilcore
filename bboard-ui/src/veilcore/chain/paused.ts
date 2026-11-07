// While a build turns on DATING_PAUSED (config/network.ts), nothing is sent to Midnight from
// this page: every call refuses before it builds anything, and the screens disable their
// buttons and say why (components/DatingPausedNotice.tsx). Records are still saved here.
// SPDX-License-Identifier: Apache-2.0

import { DATING_PAUSED } from '../../config/network';

export { DATING_PAUSED };

/** The English words; screens show them in the visitor's language (notice.datingPaused). */
export const DATING_PAUSED_TEXT =
  "Dating on Midnight is paused for Midnight's network upgrade. Your records are saved and will be dated when it's back.";

export class DatingPausedError extends Error {
  constructor() {
    super(DATING_PAUSED_TEXT);
    this.name = 'DatingPausedError';
  }
}

/** Refuse a call while dating is paused. Nothing was built or sent. */
export const assertNotPaused = (paused: boolean = DATING_PAUSED): void => {
  if (paused) throw new DatingPausedError();
};
