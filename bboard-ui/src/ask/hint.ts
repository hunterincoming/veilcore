// Which example the hint by the Ask bubble gives (components/ask/AskLauncher.tsx).
// SPDX-License-Identifier: Apache-2.0

import { isAnimal } from '../veilcore/animal-profile';

/** The calves example for someone whose records are mostly animals; the clones one otherwise. */
export const hintForAnimals = (records: readonly { readonly profile?: string }[], animalsOffered: boolean): boolean => {
  if (!animalsOffered) return false;
  const a = records.filter(isAnimal).length;
  return a > 0 && a > records.length - a;
};
