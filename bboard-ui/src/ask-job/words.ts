// "Do it for me": the few things Ask's sheet and the job page share, apart so the sheet doesn't
// load the job page to open one.
// SPDX-License-Identifier: Apache-2.0

import type { Translator } from '../i18n/app';
import type { Words } from './prepare';

/** The router state Ask and Home open a job with: only then can it be approved there. */
export const JOB_STATE_KEY = 'askJob';

/** The names and labels a batch's records are sealed with, in the person's language. */
export const jobWords = (tr: Translator): Words => ({
  cloneName: (name) => tr.t('app.ask.batch.cloneName', { name }),
  youngName: (name) => tr.t('app.ask.batch.youngName', { name }),
  scheme: (s) => tr.t(s === 'Microchip' ? 'app.animal.scheme.microchip' : 'app.animal.scheme.earTag'),
});
