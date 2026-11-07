// The hint by the Ask bubble (components/ask/AskLauncher.tsx): only for someone who has a record,
// and with their own record's name, so the example works when they try it. Calves for someone
// whose records are mostly animals (where animals are offered); clones otherwise.
// SPDX-License-Identifier: Apache-2.0

import { isAnimal } from '../veilcore/animal-profile';
import { isStrain } from '../veilcore/strain-profile';

type HintRecord = { readonly profile?: string; readonly strainName?: string; readonly loggedAt?: number };

/** The example to show, or undefined: no hint without a record of theirs to name. */
export const hintExample = (
  records: readonly HintRecord[],
  animalsOffered: boolean,
): { readonly kind: 'clones' | 'calves'; readonly name: string } | undefined => {
  const named = records.filter((r) => (r.strainName ?? '').trim().length >= 2 && (r.strainName ?? '').length <= 60);
  const animals = named.filter(isAnimal);
  const plants = named.filter((r) => !isAnimal(r) && !isStrain(r));
  const latest = (rs: HintRecord[]) => [...rs].sort((a, b) => (b.loggedAt ?? 0) - (a.loggedAt ?? 0))[0];
  const mostlyAnimals = animalsOffered && animals.length > 0 && animals.length > plants.length;
  const r = mostlyAnimals ? latest(animals) : latest(plants);
  if (!r) return undefined;
  return { kind: mostlyAnimals ? 'calves' : 'clones', name: (r.strainName ?? '').trim() };
};
