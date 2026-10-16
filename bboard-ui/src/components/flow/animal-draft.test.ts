// Logging an animal (animal-draft.ts, AnimalForm.tsx): what the first screen keeps, what is
// needed before going on, what it is sealed as, and the remembered "A plant" / "An animal".
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LOG_KIND_KEY,
  animalDraftHasContent,
  animalMissing,
  animalSealInputOf,
  emptyAnimalDraft,
  loadLogKind,
  parseAnimalDraft,
  saveLogKind,
  type AnimalDraft,
} from './animal-draft';
import { draftHasContent, draftHeading, emptyDraft, parseDraft, unsavedPlantLine } from './log-flow-state';
import { sealAnimalRecord } from '../../veilcore/seal-record';
import { checkIntegrity, type StrainRecord } from '../../veilcore/records';
import { committedRecordFields, type CommittedRecordInput } from '../../veilcore/commitment';
import { __resetRecordKeysForTests } from '../../veilcore/record-keys';
import { animalParentOptionsOf, parentOptionsOf } from '../stage/record-kinds';
import { ANIMAL_PROFILE } from '../../veilcore/animal-profile';
import { ANIMAL_RECORDS_ENABLED, animalRecordsEnabledFor } from '../../config/network';

const local = new Map<string, string>();
beforeEach(() => {
  local.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  });
  __resetRecordKeysForTests();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const DRAFT: AnimalDraft = {
  ...emptyAnimalDraft(),
  name: '  Practice Cow ',
  species: ' Cattle (Bos taurus)',
  breed: 'Japanese Black ',
  individualId: ' 0000000017',
  idScheme: 'Japan cattle ID\t(10 digits) ',
  sex: 'female',
  dateOfBirth: '2024-03-15',
  dam: { name: 'Practice Dam', individualId: '0000000033' },
  sire: { name: ' Practice Sire', individualId: '' },
  breeder: 'Example Farm\n(test data)',
  notes: ' line one\nline two ',
};

describe('the animal form', () => {
  it('is offered on every network, mainnet included (16 Oct 2026)', () => {
    for (const n of ['mainnet', 'preprod', 'preview', 'undeployed']) expect(animalRecordsEnabledFor(n), n).toBe(true);
    expect(ANIMAL_RECORDS_ENABLED).toBe(true); // the unit tests run as preprod
  });

  it('says what is still needed, one thing at a time', () => {
    expect(animalMissing(emptyAnimalDraft())).toBe('nameOrId');
    expect(animalMissing({ ...emptyAnimalDraft(), individualId: '1' })).toBe('scheme');
    expect(animalMissing({ ...emptyAnimalDraft(), name: 'A' })).toBe('species');
    expect(animalMissing({ ...emptyAnimalDraft(), name: 'A', species: 'Cattle' })).toBe('breeder');
    expect(animalMissing({ ...emptyAnimalDraft(), name: 'A', species: 'Cattle', breeder: 'B' })).toBeUndefined();
  });

  it('seals one-line values trimmed, line breaks and tabs as a space, the sire before the dam', () => {
    const s = animalSealInputOf(DRAFT);
    expect(s).toMatchObject({
      name: 'Practice Cow',
      species: 'Cattle (Bos taurus)',
      breed: 'Japanese Black',
      individualId: '0000000017',
      idScheme: 'Japan cattle ID (10 digits)',
      breeder: 'Example Farm (test data)',
      notes: 'line one\nline two',
      dateOfBirth: '2024-03-15',
    });
    expect(s.parents).toEqual([
      { role: 'sire', name: 'Practice Sire', individualId: '' },
      { role: 'dam', name: 'Practice Dam', individualId: '0000000033' },
    ]);
    // A parent left empty is left out; a date that isn't one is empty.
    expect(
      animalSealInputOf({ ...DRAFT, sire: { name: ' ', individualId: '' }, dateOfBirth: '15/03/2024' }),
    ).toMatchObject({
      parents: [{ role: 'dam' }],
      dateOfBirth: '',
    });
  });

  it('what it seals is a valid animal record that recomputes', async () => {
    const r = (await sealAnimalRecord(animalSealInputOf(DRAFT))) as StrainRecord;
    expect(r.profile).toBe(ANIMAL_PROFILE);
    expect(await checkIntegrity(r)).toBe('match');
    expect(committedRecordFields(r as CommittedRecordInput)).toMatchObject({
      breeder: 'Example Farm (test data)',
      sex: 'female',
    });
  });

  it('keeps a draft between visits, beside the plant fields, and reads back only well-formed values', () => {
    const d = { ...emptyDraft(), kind: 'animal' as const, animal: DRAFT };
    expect(draftHasContent(d)).toBe(true);
    const back = parseDraft(JSON.stringify(d));
    expect(back?.kind).toBe('animal');
    expect(back?.animal).toEqual(DRAFT);
    expect(draftHeading(back)).toBe('Continue your draft: Practice Cow');
    expect(unsavedPlantLine(d)).toBe('You have an unsaved animal: Practice Cow.');
    const bad = parseAnimalDraft({ sex: 'cow', dateOfBirth: 'soon', photos: [{ fingerprint: 'x' }], sire: 'no' });
    expect(bad).toMatchObject({ sex: 'unknown', dateOfBirth: '', photos: [], sire: { name: '', individualId: '' } });
    expect(animalDraftHasContent(emptyAnimalDraft())).toBe(false);
  });

  it('remembers the last choice in this browser, plant by default', () => {
    expect(loadLogKind()).toBe('plant');
    saveLogKind('animal');
    expect(local.get(LOG_KIND_KEY)).toBe('animal');
    expect(loadLogKind()).toBe('animal');
    saveLogKind('plant');
    expect(loadLogKind()).toBe('plant');
  });

  it('offers animals as sire (male or not stated) or dam (female or not stated), never as a plant’s parent', () => {
    const rec = (id: string, sex: 'female' | 'male' | 'unknown', profile = ANIMAL_PROFILE) =>
      ({
        id,
        strainName: id,
        notes: '',
        parents: [],
        profile,
        refId: `${id}-ID`,
        animal: { breed: '', idScheme: 'tag', sex, herd: '' },
      }) as never;
    const records = [
      rec('cow', 'female'),
      rec('bull', 'male'),
      rec('calf', 'unknown'),
      { id: 'plant', strainName: 'Plant', notes: '', parents: [] } as never,
    ];
    expect(animalParentOptionsOf(records, 'sire').map((o) => o.recordId)).toEqual(['bull', 'calf']);
    expect(animalParentOptionsOf(records, 'dam')).toEqual([
      { recordId: 'cow', name: 'cow', individualId: 'cow-ID' },
      { recordId: 'calf', name: 'calf', individualId: 'calf-ID' },
    ]);
    expect(parentOptionsOf(records).map((o) => o.recordId)).toEqual(['plant']);
  });
});
