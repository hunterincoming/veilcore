// Logging a strain or line (strain-draft.ts, StrainForm.tsx): what the first screen keeps, what
// is needed before going on, what it is sealed as, and which records it offers as parents.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  depositsOf,
  emptyStrainDraft,
  parseStrainDraft,
  strainDraftHasContent,
  strainMissing,
  strainSealInputOf,
  type StrainDraft,
} from './strain-draft';
import { LOG_KIND_KEY, loadLogKind, saveLogKind } from './animal-draft';
import { draftHasContent, draftHeading, emptyDraft, parseDraft, unsavedPlantLine } from './log-flow-state';
import { sealStrainRecord } from '../../veilcore/seal-record';
import { checkIntegrity, type StrainRecord } from '../../veilcore/records';
import { committedRecordFields, type CommittedRecordInput } from '../../veilcore/commitment';
import { __resetRecordKeysForTests } from '../../veilcore/record-keys';
import { parentOptionsOf, strainParentOptionsOf } from '../stage/record-kinds';
import { STRAIN_PROFILE, validateStrainFields } from '../../veilcore/strain-profile';
import { ANIMAL_PROFILE, recordTitle } from '../../veilcore/animal-profile';

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

const DRAFT: StrainDraft = {
  ...emptyStrainDraft(),
  name: 'Practice yeast 1',
  designation: 'PY-001',
  group: 'yeast',
  species: 'Saccharomyces cerevisiae',
  deposits: 'NBRC 10217\n\n  TEST 0001  \nNBRC 10217',
  method: 'Neutron beam irradiation',
  generation: 'M2',
  madeOn: '2026-03-01',
  parent1: { name: 'Practice parent', deposit: 'NBRC 10217' },
  maker: 'Example Lab (test data)',
  notes: 'test data',
};

describe('logging a strain or line', () => {
  it('needs a name or a designation, the species and who made it; nothing else', () => {
    expect(strainMissing(emptyStrainDraft())).toBe('nameOrDesignation');
    expect(strainMissing({ ...emptyStrainDraft(), designation: 'PY-001' })).toBe('species');
    expect(strainMissing({ ...emptyStrainDraft(), designation: 'PY-001', species: 'S. cerevisiae' })).toBe('maker');
    expect(
      strainMissing({ ...emptyStrainDraft(), designation: 'PY-001', species: 'S. cerevisiae', maker: 'Lab' }),
    ).toBeUndefined();
    expect(strainMissing(DRAFT)).toBeUndefined();
  });

  it('refuses more than 8 deposit numbers, or one too long, before sealing', () => {
    const nine = Array.from({ length: 9 }, (_, i) => `NBRC ${i}`).join('\n');
    expect(strainMissing({ ...DRAFT, deposits: nine })).toBe('deposits');
    expect(strainMissing({ ...DRAFT, deposits: 'x'.repeat(201) })).toBe('deposits');
  });

  it('reads deposit numbers one per line (or comma), trimmed, blanks and repeats dropped', () => {
    expect(depositsOf(DRAFT.deposits)).toEqual(['NBRC 10217', 'TEST 0001']);
    expect(depositsOf('A, B; C')).toEqual(['A', 'B', 'C']);
    expect(depositsOf('')).toEqual([]);
  });

  it('seals what the profile asks for, one line each, and nothing malformed', () => {
    const s = strainSealInputOf({ ...DRAFT, name: '  Practice\tyeast\n1 ', madeOn: 'soon' });
    expect(s.name).toBe('Practice yeast 1');
    expect(s.madeOn).toBe('');
    expect(s.deposits).toEqual(['NBRC 10217', 'TEST 0001']);
    expect(s.parents).toEqual([{ name: 'Practice parent', individualId: 'NBRC 10217' }]);
  });

  it('what it seals is a valid strain record that recomputes', async () => {
    const r = (await sealStrainRecord(strainSealInputOf(DRAFT))) as StrainRecord;
    expect(r.profile).toBe(STRAIN_PROFILE);
    expect(await checkIntegrity(r)).toBe('match');
    const fields = committedRecordFields(r as CommittedRecordInput);
    expect(validateStrainFields(fields)).toEqual([]);
    expect(fields).toMatchObject({
      group: 'yeast',
      designation: 'PY-001',
      deposits: ['NBRC 10217', 'TEST 0001'],
      generation: 'M2',
      maker: 'Example Lab (test data)',
      parents: [{ name: 'Practice parent', deposit: 'NBRC 10217' }],
    });
  });

  it('a strain with only a designation is titled by it', async () => {
    const r = (await sealStrainRecord(strainSealInputOf({ ...DRAFT, name: '' }))) as StrainRecord;
    expect(recordTitle(r)).toBe('PY-001');
  });

  it('keeps a draft between visits, beside the plant fields, and reads back only well-formed values', () => {
    const d = { ...emptyDraft(), kind: 'strain' as const, strain: DRAFT };
    expect(draftHasContent(d)).toBe(true);
    const back = parseDraft(JSON.stringify(d));
    expect(back?.kind).toBe('strain');
    expect(back?.strain).toEqual(DRAFT);
    expect(draftHeading(back)).toBe('Continue your draft: Practice yeast 1');
    expect(unsavedPlantLine(d)).toBe('You have an unsaved strain: Practice yeast 1.');
    expect(unsavedPlantLine({ ...d, strain: { ...DRAFT, name: '' } })).toBe('You have an unsaved strain: PY-001.');
    const bad = parseStrainDraft({ group: 'dragon', madeOn: 'soon', parent1: 'no', deposits: 5 });
    expect(bad).toMatchObject({ group: 'bacterium', madeOn: '', parent1: { name: '', deposit: '' }, deposits: '' });
    expect(parseStrainDraft('x')).toBeUndefined();
    expect(strainDraftHasContent(emptyStrainDraft())).toBe(false);
  });

  it('remembers "A strain or line" as the last choice', () => {
    saveLogKind('strain');
    expect(local.get(LOG_KIND_KEY)).toBe('strain');
    expect(loadLogKind()).toBe('strain');
    local.set(LOG_KIND_KEY, 'dragon');
    expect(loadLogKind()).toBe('plant');
  });

  it('a strain is offered as a parent only to a strain, and a plant only plants', () => {
    const recs = [
      { id: 'p1', strainName: 'Plant', notes: '', breedingMethod: '', parents: [] },
      { id: 'a1', strainName: 'Cow', notes: '', breedingMethod: '', parents: [], profile: ANIMAL_PROFILE },
      {
        id: 's1',
        strainName: 'Yeast',
        notes: '',
        breedingMethod: '',
        parents: [],
        profile: STRAIN_PROFILE,
        refId: 'PY-1',
        strain: { deposits: ['NBRC 10217'] },
      },
      { id: 's2', strainName: '', notes: '', breedingMethod: '', parents: [], profile: STRAIN_PROFILE, refId: 'PY-2' },
      {
        id: 's3',
        strainName: 'Old',
        notes: '',
        breedingMethod: '',
        parents: [],
        profile: STRAIN_PROFILE,
        supersededBy: 's4',
      },
    ];
    expect(parentOptionsOf(recs).map((p) => p.recordId)).toEqual(['p1']);
    expect(strainParentOptionsOf(recs)).toEqual([
      { recordId: 's1', name: 'Yeast', deposit: 'NBRC 10217' },
      { recordId: 's2', name: '', deposit: 'PY-2' },
    ]);
  });
});
