// Dating a list of animals (bulk-import.ts, animal mode): column guesses in English and
// Japanese, a row as it would be sealed, the problems the animal profile would refuse, a
// sire or dam linked to a logged animal by its ID, and the sealed record. Test data only.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkRows,
  guessAnimalMapping,
  guessMapping,
  parseCsv,
  readSex,
  recordRowHash,
  sealRowRecord,
  toSheet,
  type Mapping,
  type Sheet,
} from './bulk-import';
import { checkIntegrity } from './records';
import { committedRecordFields, type CommittedRecordInput } from './commitment';
import { __resetRecordKeysForTests } from './record-keys';
import { ANIMAL_PROFILE, validateAnimalFields } from './animal-profile';
import type { StrainRecord } from './records';

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

const sheetOf = (csv: string): Sheet => {
  const { rows, delimiter, warnings } = parseCsv(csv);
  return toSheet(
    rows.map((cells, i) => ({ line: i + 1, cells })),
    'csv',
    delimiter,
    warnings,
  );
};
const animalMapping = (sheet: Sheet, extra: Partial<NonNullable<Mapping['animal']>> = {}): Mapping => ({
  ...guessMapping(sheet.headers),
  animal: {
    ...guessAnimalMapping(sheet.headers),
    idScheme: 'Japan cattle ID (10 digits)',
    species: 'Cattle',
    ...extra,
  },
});

const CSV = [
  'Name,Ear tag,Breed,Sex,DOB,Sire,Sire ID,Dam,Dam ID,Breeder,Herd,Notes',
  'Practice Cow One,0000000017,Japanese Black,F,2024-03-15,Practice Sire,0000000025,Practice Dam,0000000033,Example Farm,Herd 7,test data',
  ',0000000041,Japanese Black,cow,15/03/2024,,0000000025,,,Example Farm,,',
  'No ID Bull,,Japanese Black,bull,,,,Practice Cow One,0000000017,Example Farm,,',
  'Bad Sex,0000000049,,heifer?,2024-02-30,,,,,Example Farm,,',
  'Twice,0000000017,,,,,,,,Example Farm,,',
].join('\n');

describe('a list of animals', () => {
  it('guesses the columns from English names, a parent’s ID before the parent', () => {
    const c = guessAnimalMapping(sheetOf(CSV).headers).columns;
    expect(c).toEqual({
      name: 0,
      individualId: 1,
      breed: 2,
      sex: 3,
      dateOfBirth: 4,
      sire: 5,
      sireId: 6,
      dam: 7,
      damId: 8,
      breeder: 9,
      herd: 10,
      notes: 11,
      species: null,
    });
  });

  it('guesses Japanese column names, and leaves a grandparent for the holder to pick', () => {
    const c = guessAnimalMapping([
      '名号',
      '個体識別番号',
      '品種',
      '性別',
      '生年月日',
      '父',
      '母',
      '母の父',
      '生産者',
      '備考',
    ]).columns;
    expect(c).toMatchObject({
      name: 0,
      individualId: 1,
      breed: 2,
      sex: 3,
      dateOfBirth: 4,
      sire: 5,
      dam: 6,
      breeder: 8,
      notes: 9,
    });
    expect(Object.values(c)).not.toContain(7);
    const e = guessAnimalMapping(['Tag', 'Maternal grandsire', 'Dam']).columns;
    expect(e).toMatchObject({ individualId: 0, dam: 2 });
    expect(Object.values(e)).not.toContain(1);
  });

  it('reads a sex as written, or says it can’t', () => {
    expect(['F', 'female', 'Cow', '雌', 'メス'].map(readSex)).toEqual(Array(5).fill('female'));
    expect(['m', 'Bull', 'steer', '雄'].map(readSex)).toEqual(Array(4).fill('male'));
    expect(['', 'unknown', 'n/a'].map(readSex)).toEqual(['unknown', 'unknown', 'unknown']);
    expect(readSex('heifer?')).toBeUndefined();
  });

  it('checks every row against what the animal profile would refuse, and links a known parent by its ID', () => {
    const sheet = sheetOf(CSV);
    const existingDam = {
      id: 'VEIL-' + 'D'.repeat(32),
      recordFingerprint: 'ab'.repeat(32),
      profile: ANIMAL_PROFILE,
      strainName: 'Practice Cow One (logged)',
      refId: '0000000017',
      bredBy: 'x',
      dateCreated: '',
      notes: '',
      loggedAt: 1,
      parents: [],
    } as unknown as StrainRecord;
    const c = checkRows(sheet, animalMapping(sheet, { idScheme: 'Japan cattle ID (10 digits)' }), {
      existing: [existingDam],
      ledger: { version: 1, rows: {} },
    });
    const row = (line: number) => c.rows.find((r) => r.line === line)!;

    // Row 2: everything given; sealed exactly as the profile wants it.
    expect(row(2).status).toBe('problem'); // same ID as a record already here, with other details
    expect(row(2).fields).toMatchObject({
      strainName: 'Practice Cow One',
      refId: '0000000017',
      taxon: 'Cattle',
      dateCreated: '2024-03-15',
      animal: { breed: 'Japanese Black', idScheme: 'Japan cattle ID (10 digits)', sex: 'female', herd: 'Herd 7' },
    });
    expect(row(2).fields.parents).toEqual([
      { role: 'sire', name: 'Practice Sire', individualId: '0000000025' },
      { role: 'dam', name: 'Practice Dam', individualId: '0000000033' },
    ]);
    // Row 3: an ID and no name is enough; a day-first date is read; the sire by ID alone.
    expect(row(3).status).toBe('ready');
    expect(row(3).fields).toMatchObject({ strainName: '', dateCreated: '2024-03-15', animal: { sex: 'female' } });
    // Row 4: a name and no ID (so no scheme); its dam is the logged cow, linked by her ID.
    expect(row(4).status).toBe('ready');
    expect(row(4).fields.animal?.idScheme).toBe('');
    expect(row(4).fields.parents).toEqual([
      { role: 'dam', name: 'Practice Cow One', individualId: '0000000017', recordId: existingDam.id },
    ]);
    // Row 5: a sex and a date the profile would refuse are said plainly.
    expect(row(5).status).toBe('problem');
    expect(row(5).problems.join(' ')).toMatch(/Sex not understood: "heifer\?"/);
    expect(row(5).problems.join(' ')).toMatch(/date of birth isn't a date/);
    // Row 6: the same individual ID as row 2 in the same file is one animal.
    expect(row(6).problems).toContain('Same individual ID as row 2.');
  });

  it('refuses the file without a name or ID column, and every ID row without a scheme', () => {
    const sheet = sheetOf(CSV);
    const none = {
      ...animalMapping(sheet),
      animal: {
        ...animalMapping(sheet).animal!,
        columns: { ...animalMapping(sheet).animal!.columns, name: null, individualId: null },
      },
    };
    expect(checkRows(sheet, none, { existing: [], ledger: { version: 1, rows: {} } }).blocked).toMatch(
      /name or its individual ID/,
    );
    const noScheme = checkRows(sheet, animalMapping(sheet, { idScheme: '' }), {
      existing: [],
      ledger: { version: 1, rows: {} },
    });
    expect(noScheme.rows.find((r) => r.line === 3)?.problems).toContain(
      'Say which ID scheme the individual IDs belong to.',
    );
    expect(noScheme.rows.find((r) => r.line === 4)?.status).toBe('ready'); // no ID, no scheme needed
  });

  it('seals a row as one animal, exactly as logging one does; the row is known by its values', async () => {
    const sheet = sheetOf(CSV);
    const c = checkRows(sheet, animalMapping(sheet), { existing: [], ledger: { version: 1, rows: {} } });
    const ready = c.rows.find((r) => r.line === 3)!;
    const record = await sealRowRecord(ready.fields);
    expect(record.profile).toBe(ANIMAL_PROFILE);
    expect(await checkIntegrity(record)).toBe('match');
    expect(validateAnimalFields(committedRecordFields(record as CommittedRecordInput))).toEqual([]);
    expect(recordRowHash(record)).toBe(ready.hash);
    // Sealed already: the same row is skipped next time, by its values.
    const again = checkRows(sheet, animalMapping(sheet), { existing: [record], ledger: { version: 1, rows: {} } });
    expect(again.rows.find((r) => r.line === 3)?.status).toBe('already');
  });

  it('a plant list is read as before, with no animal fields', () => {
    const sheet = sheetOf('Name,Species\nHarbour Mist,Solanum');
    const c = checkRows(sheet, guessMapping(sheet.headers), { existing: [], ledger: { version: 1, rows: {} } });
    expect(c.rows[0].fields.animal).toBeUndefined();
    expect(c.rows[0].status).toBe('ready');
  });
});
