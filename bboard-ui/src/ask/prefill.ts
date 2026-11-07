// A one-record draft (a record, or a cross) for the logging screen, from a handoff (handoff.ts),
// and which of its fields were filled so the screen can mark them. Parents come only from the
// person's own records; a name only from what they typed in Ask. A link fills nothing but the kind.
// SPDX-License-Identifier: Apache-2.0

import type { StrainRecord } from '../veilcore/records';
import { isAnimal } from '../veilcore/animal-profile';
import { emptyDraft, type Draft } from '../components/flow/log-flow-state';
import { emptyAnimalDraft, type ParentDraft } from '../components/flow/animal-draft';
import { emptyStrainDraft } from '../components/flow/strain-draft';
import type { Handoff } from './handoff';

export type Prefill = { readonly draft: Draft; readonly filled: ReadonlySet<string> };

type ParentRecord = Pick<StrainRecord, 'id' | 'strainName' | 'refId'> & Partial<Pick<StrainRecord, 'profile'>>;

/** An animal record's sex as sealed ("female", "male"), when it says. */
const sexOf = (r: StrainRecord | undefined): string | undefined => r?.animal?.sex;

/** Sire and dam from up to two records: by sex where the record says, else in the order named. */
export const sireAndDam = (parents: readonly StrainRecord[]): { sire?: StrainRecord; dam?: StrainRecord } => {
  let sire = parents.find((p) => sexOf(p) === 'male');
  let dam = parents.find((p) => sexOf(p) === 'female' && p !== sire);
  for (const p of parents) {
    if (p === sire || p === dam) continue;
    if (!sire) sire = p;
    else if (!dam) dam = p;
  }
  return { ...(sire ? { sire } : {}), ...(dam ? { dam } : {}) };
};

const parentDraft = (r: ParentRecord): ParentDraft => ({
  name: r.strainName,
  individualId: r.refId ?? '',
  recordId: r.id,
});

export const prefillOf = (h: Handoff, records: readonly StrainRecord[]): Prefill => {
  const filled = new Set<string>();
  const name = h.source !== 'link' ? (h.name ?? '') : '';
  const parents =
    h.source !== 'link'
      ? (h.parents ?? []).map((id) => records.find((r) => r.id === id)).filter((r): r is StrainRecord => !!r)
      : [];
  if (h.kind === 'animal') {
    const animal = { ...emptyAnimalDraft() };
    if (name) {
      animal.name = name;
      filled.add('name');
    }
    const { sire, dam } = sireAndDam(parents.filter(isAnimal));
    if (sire) {
      animal.sire = parentDraft(sire);
      filled.add('sire');
    }
    if (dam) {
      animal.dam = parentDraft(dam);
      filled.add('dam');
    }
    return { draft: { ...emptyDraft(), kind: 'animal', animal }, filled };
  }
  if (h.kind === 'strain') {
    const strain = { ...emptyStrainDraft() };
    if (name) {
      strain.name = name;
      filled.add('name');
    }
    return { draft: { ...emptyDraft(), kind: 'strain', strain }, filled };
  }
  const draft: Draft = { ...emptyDraft(), kind: 'plant' };
  if (name) {
    draft.strainName = name;
    filled.add('strainName');
  }
  const plantParents = parents.filter((p) => !isAnimal(p));
  if (plantParents.length) {
    draft.parents = plantParents.map((p) => ({ recordId: p.id, name: p.strainName }));
    filled.add('parents');
  }
  return { draft, filled };
};
