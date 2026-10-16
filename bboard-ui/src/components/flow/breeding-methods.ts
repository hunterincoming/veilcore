// "How it was made": the value sealed in a record (always this English, so every record
// reads the same), and its words on screen in the visitor's language.
// SPDX-License-Identifier: Apache-2.0

import type { AppKey } from '../../i18n/app/en';
import type { Translator } from '../../i18n/translate';

export const BREEDING_METHODS: [string, AppKey][] = [
  ['Seed — F1', 'app.log.method.f1'],
  ['Seed — F2', 'app.log.method.f2'],
  ['Seed — selfed (S1)', 'app.log.method.s1'],
  ['Seed — backcross', 'app.log.method.backcross'],
  ['Clone / cutting', 'app.log.method.clone'],
  ['Tissue culture', 'app.log.method.tissue'],
  ['Selection', 'app.log.method.selection'],
  ['Landrace / heirloom', 'app.log.method.landrace'],
  ['Other', 'app.log.method.other'],
];

/** A sealed "How it was made" in the visitor's language; anything else as it was sealed. */
export const breedingMethodWords = (value: string, tr: Translator): string => {
  const known = BREEDING_METHODS.find(([v]) => v === value);
  return known ? tr.t(known[1]) : value;
};
