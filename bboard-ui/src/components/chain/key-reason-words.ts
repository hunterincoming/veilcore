// Why a link's key can't be used (veilcore/key-binding.ts checkLinkKey), in the visitor's
// language. key-binding.ts words its reasons in English; each is matched here.
// SPDX-License-Identifier: Apache-2.0

import { enT, type Translator } from '../../i18n/translate';
import type { AppKey } from '../../i18n/app/en';

const KNOWN: [string, AppKey][] = [
  [
    'This record names its own key, but this link leaves out what’s needed to check it. Ask the holder for a new link',
    'app.prove.key.leavesOut',
  ],
  ['This link’s fingerprint doesn’t match the record, so its key can’t be checked against it', 'app.prove.key.noFp'],
  ['The key in this link isn’t the one this record names', 'app.prove.key.notThis'],
];

export const keyReasonWords = (reason: string, tr: Translator = enT): string => {
  const known = KNOWN.find(([m]) => m === reason);
  return known ? tr.t(known[1]) : reason;
};
