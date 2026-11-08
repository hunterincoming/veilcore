// Real batches (batch.ts): each young animal's sex, ID and date of birth before Save, a sire not
// on VeilCore typed in with his semen code, and for clones a plant tag each and a lot. Every
// child is a valid record under its profile, sealed through the bulk import's own path.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EDIT_MAX,
  LOT_LABEL,
  SEMEN_CODE_LABEL,
  batchProblems,
  batchRows,
  existingOf,
  hasOwnDam,
  line,
  semenCodeApplies,
  speciesGroup,
  unlikelyYoung,
  youngLimit,
  breederOptional,
  firstFreeStart,
  firstRepeat,
  lotNotes,
  suggestTags,
  typedSireOf,
  type BatchPlan,
} from './batch';
import {
  holdForBackup,
  loadLedger,
  recordRowHash,
  sealRowRecord,
  sealRows,
  type Committer,
  type PreparedRow,
} from '../veilcore/bulk-import';
import { checkIntegrity, type StrainRecord } from '../veilcore/records';
import { committedRecordFields, type CommittedRecordInput } from '../veilcore/commitment';
import { ANIMAL_PROFILE } from '../veilcore/animal-profile';
import { __resetRecordKeysForTests } from '../veilcore/record-keys';
import { CHANGED_FIELD_NAMES, previewCorrection } from '../veilcore/corrections';

const local = new Map<string, string>();
beforeEach(() => {
  local.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  });
  vi.stubGlobal('fetch', () => {
    throw new Error('these tests never reach the network');
  });
  __resetRecordKeysForTests();
});
afterEach(() => vi.unstubAllGlobals());

const ID = (n: number) => `VEIL-${n.toString(16).toUpperCase().padStart(32, '0')}`;
const cow = {
  id: ID(9),
  strainName: 'Daisy',
  bredBy: 'North Farm',
  dateCreated: '2020-04-01',
  notes: '',
  taxon: 'Bos taurus',
  refId: 'UK123456700009',
  profile: ANIMAL_PROFILE,
  animal: { breed: 'Jersey', idScheme: 'Ear tag', sex: 'female', herd: 'North' },
  licenseIds: [],
  recordFingerprint: 'ab'.repeat(32),
} as unknown as StrainRecord;
const mother = {
  ...cow,
  id: ID(12),
  strainName: 'Blue Dream #12',
  taxon: 'Cannabis sativa',
  refId: '',
  profile: undefined,
  animal: undefined,
} as unknown as StrainRecord;

const clonesPlan = (over: Partial<BatchPlan> = {}): BatchPlan => ({
  preset: 'clones',
  count: 3,
  baseName: 'Blue Dream #12 clone',
  date: '2026-11-06',
  parent: mother,
  bredBy: 'Harbour Farm',
  taxon: 'Cannabis sativa',
  ...over,
});

const litter = (over: Partial<BatchPlan> = {}): BatchPlan => ({
  preset: 'offspring',
  count: 3,
  baseName: 'Daisy calf',
  date: '2026-11-01',
  dam: cow,
  bredBy: 'North Farm',
  taxon: 'Bos taurus',
  ...over,
});

describe('young animals, one by one', () => {
  it('a sire not on VeilCore, typed in with his semen code, is the sire of every calf', () => {
    const p = litter({ typedSire: { name: ' Stud Bull ', individualId: 'USA840003123456789' }, semenCode: '7HO12345' });
    expect(typedSireOf(p)).toEqual({ name: 'Stud Bull', individualId: 'USA840003123456789' });
    expect(batchProblems(p)).toEqual([]);
    const rows = batchRows(p);
    for (const r of rows) {
      expect(r.fields.parents).toEqual([
        { role: 'sire', name: 'Stud Bull', individualId: 'USA840003123456789' },
        { recordId: cow.id, name: 'Daisy', role: 'dam', individualId: 'UK123456700009' },
      ]);
      expect(r.fields.notes).toBe(`${SEMEN_CODE_LABEL}7HO12345`);
    }
    // A typed sire alone is a parent; nothing typed is not.
    expect(batchProblems(litter({ dam: undefined, typedSire: { name: '', individualId: 'X1' } }))).toEqual([]);
    expect(batchProblems(litter({ dam: undefined, typedSire: { name: ' ', individualId: '' } }))).toEqual(['parent']);
    // A sire record picked wins over anything typed (the screen hides the typed fields then).
    expect(typedSireOf(litter({ sire: cow, typedSire: { name: 'X', individualId: '' } }))).toBeUndefined();
  });

  it('each calf gets its own sex, ID (country letters kept) and date of birth', () => {
    const p = litter({
      idScheme: 'Ear tag',
      children: [
        { sex: 'female', individualId: ' UK123456700010 ', born: '2026-10-30' },
        { sex: 'male', individualId: 'UK123456700011' },
        undefined,
      ],
    });
    expect(batchProblems(p)).toEqual([]);
    const [a, b, c] = batchRows(p).map((r) => r.fields);
    expect(a).toMatchObject({ refId: 'UK123456700010', dateCreated: '2026-10-30' });
    expect(a.animal).toMatchObject({ sex: 'female', idScheme: 'Ear tag' });
    expect(b).toMatchObject({ refId: 'UK123456700011', dateCreated: '2026-11-01' });
    expect(b.animal).toMatchObject({ sex: 'male', idScheme: 'Ear tag' });
    // No details: the batch's defaults, and no scheme without an ID (SPEC 11.8).
    expect(c).toMatchObject({ refId: '', dateCreated: '2026-11-01' });
    expect(c.animal).toMatchObject({ sex: 'unknown', idScheme: '' });
  });

  it('an ID needs its scheme; two calves can’t share an ID; a birth date must be a date', () => {
    expect(batchProblems(litter({ children: [{ individualId: 'X1' }] }))).toEqual(['scheme']);
    expect(
      batchProblems(litter({ idScheme: 'Ear tag', children: [{ individualId: 'X1' }, { individualId: ' X1' }] })),
    ).toEqual(['dupId']);
    expect(batchProblems(litter({ children: [{ born: '1 Nov' }] }))).toEqual(['born']);
    // A child past the count doesn't count.
    expect(batchProblems(litter({ count: 1, children: [{}, { individualId: 'X1' }] }))).toEqual([]);
    expect(firstRepeat(['a', '', 'b', 'a'])).toBe('a');
    expect(firstRepeat(['', ''])).toBeUndefined();
  });

  it('every calf seals as a valid animal record and recomputes', async () => {
    const p = litter({
      typedSire: { name: 'Stud Bull', individualId: '' },
      semenCode: '7HO12345',
      idScheme: 'Ear tag',
      children: [{ sex: 'female', individualId: 'UK123456700010', born: '2026-10-30' }],
    });
    const r = await sealRowRecord(batchRows(p)[0].fields);
    expect(await checkIntegrity(r)).toBe('match');
    expect(committedRecordFields(r as CommittedRecordInput)).toMatchObject({
      profile: ANIMAL_PROFILE,
      individualId: 'UK123456700010',
      idScheme: 'Ear tag',
      sex: 'female',
      dateOfBirth: '2026-10-30',
      notes: 'Sire semen code: 7HO12345',
      parents: [
        { role: 'sire', name: 'Stud Bull', individualId: '' },
        { role: 'dam', name: 'Daisy', individualId: 'UK123456700009', recordId: cow.id },
      ],
    });
  });

  it('a second litter by the same typed sire is numbered on, never said to be saved again', () => {
    const p = litter({ typedSire: { name: 'Stud Bull', individualId: '' }, semenCode: '7HO1' });
    const taken = new Set(batchRows({ ...p, start: 1 }).map((r) => r.hash));
    expect(firstFreeStart(p, taken)).toBe(4);
    // A different semen code is a different calf.
    expect(firstFreeStart({ ...p, semenCode: '7HO2' }, taken)).toBe(1);
  });
});

// Review (7 Nov, B1): rows are hashed with each child's own details, so numbering by the bare
// defaults started at 1 again and a second batch "saved" nothing. Numbered past every name used,
// then past every clash of the rows as they will be sealed.
describe('a second batch with the same details is new records, numbered on', () => {
  const taken = (extra: readonly StrainRecord[] = []) =>
    new Set([...Object.keys(loadLedger().rows), ...extra.map(recordRowHash)]);
  // The person's records' names (in the app: the record set and the ledger's waiting records).
  const saved = new Set<string>();
  const names = () => saved;
  const saveAll = async (rows: PreparedRow[]) => {
    const sent: string[] = [];
    const commit: Committer = (batch) => {
      sent.push(...batch.map((r) => r.id));
      return Promise.resolve({ stored: batch.map((r) => r.id), refused: [] });
    };
    await sealRows(rows, { commit: holdForBackup, batchSize: rows.length, gapMs: 0 });
    await sealRows(rows, { commit, gapMs: 0 });
    for (const r of rows) saved.add(r.fields.strainName);
    return sent;
  };
  const twoCalves = litter({ count: 2, children: [{ sex: 'female' }, { sex: 'male' }] });

  it('a repeat litter with the same sexes gets start 3, and both litters are saved', async () => {
    const one = await saveAll(batchRows({ ...twoCalves, start: firstFreeStart(twoCalves, taken(), names()) }));
    expect(one).toHaveLength(2);
    // By name (the ledger's records) and by the rows themselves (their own details hashed).
    expect(firstFreeStart(twoCalves, taken(), names())).toBe(3);
    // Even with no names to go by, never a row already sealed: calf 1 (female) is taken.
    expect(firstFreeStart(twoCalves, taken())).toBeGreaterThan(1);
    const two = await saveAll(batchRows({ ...twoCalves, start: firstFreeStart(twoCalves, taken(), names()) }));
    expect(two).toHaveLength(2);
    expect(new Set([...one, ...two]).size).toBe(4);
  });

  it('repeat clones with the same first tag are numbered on, never said to be saved', async () => {
    const tagged = clonesPlan({ children: suggestTags('T-01', 3).map((tag) => ({ tag })) });
    const one = await saveAll(batchRows({ ...tagged, start: firstFreeStart(tagged, taken(), names()) }));
    expect(one).toHaveLength(3);
    expect(firstFreeStart(tagged, taken())).toBeGreaterThan(1);
    expect(firstFreeStart(tagged, taken(), names())).toBe(4);
    const two = await saveAll(batchRows({ ...tagged, start: firstFreeStart(tagged, taken(), names()) }));
    expect(two).toHaveLength(3);
  });

  it('clones with other tags are numbered on by name: two records never share a name', () => {
    const used = new Set(['Blue Dream #12 clone 1', 'Blue Dream #12 clone 2', 'Blue Dream #12 clone 2b', 'Other 9']);
    const tagged = clonesPlan({ children: suggestTags('NEW-1', 3).map((tag) => ({ tag })) });
    expect(firstFreeStart(tagged, new Set(), used)).toBe(3);
    expect(batchRows({ ...tagged, start: 3 })[0].fields.strainName).toBe('Blue Dream #12 clone 3');
  });
});

describe('IDs and tags already on the person’s records, and dates', () => {
  it('refuses an ID or a tag another of the person’s records already has, as written', () => {
    const existing = existingOf([cow, { ...mother, refId: 'T-02' }], (r) => r.profile === ANIMAL_PROFILE);
    expect(existing.ids?.has('UK123456700009')).toBe(true);
    expect(
      batchProblems(litter({ idScheme: 'Ear tag', children: [{ individualId: 'UK123456700009' }] }), existing),
    ).toEqual(['takenId']);
    expect(
      batchProblems(litter({ idScheme: 'Ear tag', children: [{ individualId: 'uk123456700009' }] }), existing),
    ).toEqual([]);
    expect(batchProblems(clonesPlan({ children: [{ tag: 'T-01' }, { tag: 'T-02' }] }), existing)).toEqual(['takenTag']);
  });

  it('a date of birth must be a real date, and not still to come', () => {
    expect(batchProblems(litter({ children: [{ born: '2026-02-30' }] }))).toEqual(['born']);
    expect(batchProblems(litter({ children: [{ born: '2999-01-01' }] }))).toEqual(['born']);
    expect(batchProblems(litter({ children: [{ born: '2026-01-02' }] }))).toEqual([]);
  });

  it('one line, sealed: control characters and bidirectional overrides become spaces', () => {
    expect(line(' UK\u202E123\u0001 ')).toBe('UK 123');
  });
});

describe('a calf crop: many cows to one bull', () => {
  const crop = litter({
    dam: undefined,
    typedSire: { name: 'Stud Bull', individualId: '' },
    count: 3,
    children: [
      { dam: { record: cow } },
      { dam: { name: 'Bess', individualId: 'UK999' } },
      { dam: { name: ' ', individualId: '' } },
    ],
  });

  it('each calf names its own dam: a record, typed, or none', () => {
    const [a, b, c] = batchRows(crop).map((r) => r.fields.parents);
    expect(a[1]).toEqual({ recordId: cow.id, name: 'Daisy', role: 'dam', individualId: 'UK123456700009' });
    expect(b[1]).toEqual({ role: 'dam', name: 'Bess', individualId: 'UK999' });
    expect(c).toHaveLength(1);
    expect([hasOwnDam(crop.children?.[0]), hasOwnDam(crop.children?.[2])]).toEqual([true, false]);
  });

  it('every calf having its own dam is a parent enough', () => {
    expect(
      batchProblems(litter({ dam: undefined, count: 1, children: [{ dam: { name: 'Bess', individualId: '' } }] })),
    ).toEqual([]);
  });

  it('a cow has twins at most; a calf crop with its own dams is not one cow’s', () => {
    expect(youngLimit('Cattle (Bos taurus)')).toBe(2);
    expect(youngLimit('Horse')).toBe(2);
    expect(youngLimit('Dog')).toBe(16);
    expect(youngLimit('牛')).toBe(2);
    expect(youngLimit('')).toBe(20);
    expect(unlikelyYoung('offspring', 3, 'Bos taurus')).toBe(true);
    expect(unlikelyYoung('offspring', 3, 'Bos taurus', crop.children)).toBe(false);
    expect(unlikelyYoung('offspring', 8, 'Canis familiaris')).toBe(false);
  });

  it('a semen code is asked for cattle, sheep and goats, and sealed only for them', () => {
    expect(['Bos taurus', 'Rind', 'vache', 'ヤギ'].map(semenCodeApplies)).toEqual([true, true, true, true]);
    expect(['Dog', 'Equus caballus', 'Perro'].map(semenCodeApplies)).toEqual([false, false, false]);
    expect(speciesGroup('Labrador dog')).toBe('dog');
    const dogs = litter({ taxon: 'Dog', typedSire: { name: 'Stud', individualId: '' }, semenCode: 'X1' });
    expect(batchRows(dogs)[0].fields.notes).toBe('');
  });
});

describe('a correction to a young animal’s sex and ID, after it is saved', () => {
  it('names the fields that changed, each one the registry accepts, and never edits the original', () => {
    const before = { ...cow, nonce: 'n'.repeat(64), loggedAt: 1, parents: [] } as StrainRecord;
    const sex = previewCorrection(before, { ...before, animal: { ...before.animal!, sex: 'male' } });
    expect(sex.changedFields).toEqual(['profileData.sex']);
    const id = previewCorrection(before, {
      ...before,
      refId: 'UK999',
      animal: { ...before.animal!, idScheme: 'Herd book number' },
    });
    expect(id.changedFields.sort()).toEqual(['profileData.idScheme', 'profileData.individualId']);
    for (const f of [...sex.changedFields, ...id.changedFields]) expect(CHANGED_FIELD_NAMES).toContain(f);
    // Severity is classified, never chosen: a field no table classifies is material for both (SPEC 6.2).
    expect([sex.descentSeverity, sex.termsSeverity]).toEqual(['material', 'material']);
    expect(before.animal?.sex).toBe('female');
  });
});

describe('clones: a lot, and a plant tag each', () => {
  const clones = clonesPlan;

  it('numbers tags on from the first, keeping the digits’ width', () => {
    expect(suggestTags('1A4000300012345000099', 3)).toEqual([
      '1A4000300012345000099',
      '1A4000300012345000100',
      '1A4000300012345000101',
    ]);
    expect(suggestTags('BD-0009', 2)).toEqual(['BD-0009', 'BD-0010']);
    expect(suggestTags('MOM-A', 3)).toEqual(['MOM-A', 'MOM-A-2', 'MOM-A-3']);
    expect(suggestTags(' ', 2)).toEqual(['', '']);
  });

  it('seals each tag as the clone’s own reference, and the lot in its notes', () => {
    const p = clones({ lotName: 'BD12 cut 6 Nov', children: suggestTags('T-01', 3).map((tag) => ({ tag })) });
    expect(batchProblems(p)).toEqual([]);
    const rows = batchRows(p);
    expect(rows.map((r) => r.fields.refId)).toEqual(['T-01', 'T-02', 'T-03']);
    for (const r of rows) expect(r.fields.notes).toBe(`${LOT_LABEL}BD12 cut 6 Nov\nLot size: 3`);
    expect(new Set(rows.map((r) => r.hash)).size).toBe(3);
    // No lot named: no lot lines; no tags: no reference, exactly as before.
    expect(lotNotes('', 3)).toBe('');
    expect(batchRows(clones())[0].fields).toMatchObject({ refId: '', notes: '' });
  });

  it('clones of a plant logged with no breeder (a landrace) need none; young animals always do', () => {
    const landrace = { ...mother, bredBy: '' } as StrainRecord;
    expect(breederOptional(clones({ parent: landrace }))).toBe(true);
    expect(batchProblems(clones({ parent: landrace, bredBy: '' }))).toEqual([]);
    expect(batchRows(clones({ parent: landrace, bredBy: '' }))[0].fields.bredBy).toBe('');
    // A breeder on the parent, or a parent received from someone else: still asked.
    expect(batchProblems(clones({ bredBy: '' }))).toEqual(['bredBy']);
    expect(breederOptional(clones({ parent: { ...landrace, receivedFrom: 'VEIL-X' } }))).toBe(false);
    expect(batchProblems(litter({ bredBy: '' }))).toEqual(['bredBy']);
  });

  it('two clones can’t share a tag', () => {
    expect(batchProblems(clones({ children: [{ tag: 'A1' }, { tag: 'A2' }, { tag: 'A1' }] }))).toEqual(['dupTag']);
  });

  it('tags reach every clone, past the ones shown one by one', () => {
    const count = EDIT_MAX + 20;
    const p = clones({ count, children: suggestTags('T-0001', count).map((tag) => ({ tag })) });
    const rows = batchRows(p);
    expect(rows[count - 1].fields.refId).toBe(`T-${String(count).padStart(4, '0')}`);
  });

  it('a tagged clone seals as a plant record and recomputes', async () => {
    const p = clones({ lotName: 'Lot 7', children: [{ tag: 'TAG-1' }] });
    const r = await sealRowRecord(batchRows(p)[0].fields);
    expect(await checkIntegrity(r)).toBe('match');
    expect(committedRecordFields(r as CommittedRecordInput)).toMatchObject({
      refId: 'TAG-1',
      notes: 'Lot: Lot 7\nLot size: 3',
      breedingMethod: 'Clone / cutting',
    });
  });
});

describe('on a phone, the Ask bubble stays off a form being filled in', () => {
  it('the logging screens, a new document and the import; not the records list or a record', async () => {
    const { formScreen } = await import('./hint');
    for (const p of ['/new', '/new/', '/documents/new', '/records/import']) expect(formScreen(p), p).toBe(true);
    for (const p of ['/records', '/record/VEIL-1', '/', '/newsletter']) expect(formScreen(p), p).toBe(false);
  });
});
