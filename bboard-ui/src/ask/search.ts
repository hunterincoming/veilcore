// Search my records: keywords and a few filters over the person's own records, as this browser
// holds them (opened with their key). Nothing is sent: the registry can't read a record anyway.
//   - a year (2025) keeps records made or dated that year;
//   - "plant", "animal" (and the same words in the other languages) keep that kind;
//   - every other word must be somewhere in the record: its name, breeder, species, notes,
//     reference, parents or how it was made.
// SPDX-License-Identifier: Apache-2.0

import { isAnimal } from '../veilcore/animal-profile';
import { isStrain } from '../veilcore/strain-profile';
import type { StrainRecord } from '../veilcore/records';
import { normalize } from './shortcuts';

const PLANT = ['plant', 'plants', 'pflanze', 'pflanzen', 'planta', 'plantas', 'plante', 'plantes', '植物'];
const ANIMAL = ['animal', 'animals', 'tier', 'tiere', 'animales', 'animaux', '動物'];
const STRAIN = ['strain', 'strains', 'microbe', 'microbes', 'stamm', 'cepa', 'cepas', 'souche', 'souches', '菌株'];

const textOf = (r: StrainRecord): string =>
  normalize(
    [r.strainName, r.bredBy, r.taxon, r.notes, r.refId, r.breedingMethod, ...(r.parents ?? []).map((p) => p.name)]
      .filter(Boolean)
      .join(' \n '),
  );

export const searchRecords = (records: readonly StrainRecord[], query: string): StrainRecord[] => {
  const words = normalize(query)
    .split(/[^\p{L}\p{N}#'-]+/u)
    .filter(Boolean);
  const years = words.filter((w) => /^(19|20)\d\d$/.test(w));
  const kinds = {
    plant: words.some((w) => PLANT.includes(w)),
    animal: words.some((w) => ANIMAL.includes(w)),
    strain: words.some((w) => STRAIN.includes(w)),
  };
  const rest = words.filter(
    (w) => !years.includes(w) && !PLANT.includes(w) && !ANIMAL.includes(w) && !STRAIN.includes(w),
  );
  const anyKind = kinds.plant || kinds.animal || kinds.strain;
  return records
    .filter((r) => {
      if (anyKind) {
        const k = isAnimal(r) ? 'animal' : isStrain(r) ? 'strain' : 'plant';
        if (!kinds[k]) return false;
      }
      if (years.length && !years.some((y) => (r.dateCreated ?? '').includes(y))) return false;
      const hay = textOf(r);
      return rest.every((w) => hay.includes(w));
    })
    .sort((a, b) => (a.strainName ?? '').localeCompare(b.strainName ?? ''));
};
