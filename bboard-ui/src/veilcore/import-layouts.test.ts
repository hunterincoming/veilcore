// Remembered column layouts (import-layouts.ts): saving a file's columns, matching the next day's
// file to them (by column name, in any order, on the row they were on), and forgetting them.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkRows,
  emptyAnimalMapping,
  guessMapping,
  parseCsv,
  toSheet,
  type Mapping,
  type Sheet,
} from './bulk-import';
import {
  LAYOUTS_KEY,
  MAX_LAYOUTS,
  forgetAllLayouts,
  forgetLayout,
  layoutName,
  loadLayouts,
  mappingFor,
  matchLayout,
  rememberLayout,
  signatureOf,
} from './import-layouts';

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
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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

// A tissue culture lab's daily export: its own column names, which the guesses don't all read.
const DAY1 =
  'Vessel,Clone,Stage,Initiated,Tech\nV-001,Blue Dream,Multiply,2026-11-24,AR\nV-002,Sour Diesel,Root,2026-11-24,AR\n';
const DAY2 =
  'Vessel,Clone,Stage,Initiated,Tech\nV-003,Gelato,Multiply,2026-11-25,JS\nV-004,Gelato,Multiply,2026-11-25,JS\nV-005,OG Kush,Root,2026-11-25,JS\n';

/** What the person picked on day 1: Clone is the name, Vessel the ID, Stage the notes. */
const day1Mapping = (s: Sheet): Mapping => {
  const g = guessMapping(s.headers);
  return {
    ...g,
    columns: { ...g.columns, strainName: 1, refId: 0, notes: 2, dateCreated: 3 },
    bredByDefault: 'Our lab',
    dateOrder: 'auto',
  };
};

describe('saving a layout', () => {
  it('keeps the columns by name, in this browser only, under one key', () => {
    const s = sheetOf(DAY1);
    expect(rememberLayout(s, day1Mapping(s), 'TC_export_2026-11-24.csv', 1000)).toBe(true);
    expect([...local.keys()]).toEqual([LAYOUTS_KEY]);
    const [l] = loadLayouts();
    expect(l.name).toBe('TC export');
    expect(l.headerLine).toBe(1);
    expect(l.mapping.columns).toMatchObject({
      strainName: 'clone',
      refId: 'vessel',
      notes: 'stage',
      dateCreated: 'initiated',
    });
    expect(l.mapping.bredByDefault).toBe('Our lab');
    // No cell of the file is kept: only its column names.
    expect(local.get(LAYOUTS_KEY)).not.toMatch(/Blue Dream|V-001|Sour Diesel/);
  });

  it('a file with the same columns replaces the one before and keeps its name', () => {
    const s = sheetOf(DAY1);
    rememberLayout(s, day1Mapping(s), 'TC export 2026-11-24.csv', 1000);
    rememberLayout(s, { ...day1Mapping(s), bredByDefault: 'Changed' }, 'renamed.csv', 2000);
    const all = loadLayouts();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ name: 'TC export', savedAt: 1000, usedAt: 2000 });
    expect(all[0].mapping.bredByDefault).toBe('Changed');
  });

  it('keeps at most MAX_LAYOUTS, dropping the one used longest ago', () => {
    for (let i = 0; i <= MAX_LAYOUTS; i++) {
      const s = sheetOf(`Name,Col${i}\nA,1\n`);
      rememberLayout(s, guessMapping(s.headers), `f${i}.csv`, i);
    }
    const all = loadLayouts();
    expect(all).toHaveLength(MAX_LAYOUTS);
    expect(all.some((l) => l.id === signatureOf(['Name', 'Col0']))).toBe(false);
  });

  it("returns false, and throws nothing, when this browser won't keep it", () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    });
    const s = sheetOf(DAY1);
    expect(rememberLayout(s, day1Mapping(s), 'x.csv')).toBe(false);
    expect(loadLayouts()).toEqual([]);
    expect(matchLayout(s)).toBeUndefined();
    expect(forgetAllLayouts()).toBe(false);
  });

  it('reads nothing from a broken or foreign value', () => {
    local.set(LAYOUTS_KEY, '{not json');
    expect(loadLayouts()).toEqual([]);
    local.set(LAYOUTS_KEY, JSON.stringify([{ version: 2 }, 'x', null]));
    expect(loadLayouts()).toEqual([]);
  });
});

describe('matching the next file', () => {
  it("day 2's file opens with day 1's columns, and checks the same way", () => {
    const s1 = sheetOf(DAY1);
    rememberLayout(s1, day1Mapping(s1), 'TC export 2026-11-24.csv', 1000);
    const s2 = sheetOf(DAY2);
    const m = matchLayout(s2);
    expect(m).toBeDefined();
    expect(m!.layout.name).toBe('TC export');
    expect(m!.mapping.columns).toMatchObject({ strainName: 1, refId: 0, notes: 2, dateCreated: 3 });
    expect(m!.mapping.bredByDefault).toBe('Our lab');
    const checked = checkRows(m!.sheet, m!.mapping, { existing: [] });
    expect(checked.ready).toBe(3);
    expect(checked.rows[0].fields).toMatchObject({ strainName: 'Gelato', refId: 'V-003', notes: 'Multiply' });
  });

  it('matches by column name in any order, and spacing or case', () => {
    const s1 = sheetOf(DAY1);
    rememberLayout(s1, day1Mapping(s1), 'a.csv');
    const moved = sheetOf('  TECH ,Initiated,Stage,clone,Vessel\nJS,2026-11-25,Root,Gelato,V-9\n');
    const m = matchLayout(moved)!;
    expect(m.mapping.columns).toMatchObject({ strainName: 3, refId: 4, notes: 2, dateCreated: 1 });
    expect(checkRows(m.sheet, m.mapping, { existing: [] }).rows[0].fields).toMatchObject({
      strainName: 'Gelato',
      refId: 'V-9',
    });
  });

  it('a different set of columns does not match', () => {
    const s1 = sheetOf(DAY1);
    rememberLayout(s1, day1Mapping(s1), 'a.csv');
    expect(matchLayout(sheetOf('Vessel,Clone,Stage,Initiated\nV-1,A,B,2026-01-01\n'))).toBeUndefined();
    expect(matchLayout(sheetOf('Vessel,Clone,Stage,Initiated,Tech,Room\nV-1,A,B,2026-01-01,x,1\n'))).toBeUndefined();
  });

  it('reads the column names from the row they were on last time', () => {
    // A title the guess reads as the column names: the layout says they are on row 3.
    const csv = (rows: string) =>
      `Lab daily export,Site,North,Shift,Day\n,,,,\nVessel,Clone,Stage,Initiated,Tech\n${rows}`;
    const s1 = sheetOf(csv('V-1,A,Root,2026-11-24,AR\n'));
    const at3 = s1.headerLine === 3 ? s1 : toSheet(s1.raw, 'csv', ',', [], { headerLine: 3 });
    rememberLayout(at3, day1Mapping(at3), 'daily.csv');
    const m = matchLayout(sheetOf(csv('V-2,B,Multiply,2026-11-25,JS\nV-3,C,Root,2026-11-25,JS\n')))!;
    expect(m.sheet.headerLine).toBe(3);
    expect(m.sheet.rows).toHaveLength(2);
    expect(m.mapping.columns.strainName).toBe(1);
  });

  it('an animal list keeps its own columns, ID scheme and species', () => {
    const s = sheetOf('Tag,Sire,Dam,DOB\nJP1,Bull A,Cow B,2024-01-01\n');
    const m: Mapping = {
      ...guessMapping(s.headers),
      animal: {
        ...emptyAnimalMapping(),
        columns: { ...emptyAnimalMapping().columns, individualId: 0, sire: 1, dam: 2, dateOfBirth: 3 },
        idScheme: 'Japan cattle ID',
        species: 'Bos taurus',
      },
    };
    rememberLayout(s, m, 'herd.csv');
    const back = matchLayout(sheetOf('DOB,Tag,Sire,Dam\n2024-02-02,JP2,Bull C,Cow D\n'))!;
    expect(back.mapping.animal).toMatchObject({
      idScheme: 'Japan cattle ID',
      species: 'Bos taurus',
      columns: { individualId: 1, sire: 2, dam: 3, dateOfBirth: 0, name: null },
    });
  });

  it('a kept column name the file lacks is left empty, never guessed', () => {
    const m = mappingFor(['A', 'B'], {
      columns: { strainName: 'zzz', refId: 'b' },
      bredByDefault: '',
      dateOrder: 'auto',
    });
    expect(m.columns.strainName).toBeNull();
    expect(m.columns.refId).toBe(1);
  });
});

describe('forgetting', () => {
  it('forgets one layout, and the next file is mapped by hand again', () => {
    const s1 = sheetOf(DAY1);
    rememberLayout(s1, day1Mapping(s1), 'a.csv');
    const other = sheetOf('Name,Lot\nA,1\n');
    rememberLayout(other, guessMapping(other.headers), 'b.csv');
    const id = matchLayout(s1)!.layout.id;
    expect(forgetLayout(id)).toBe(true);
    expect(matchLayout(sheetOf(DAY2))).toBeUndefined();
    expect(loadLayouts()).toHaveLength(1);
  });

  it('forgetting all leaves nothing in this browser', () => {
    const s1 = sheetOf(DAY1);
    rememberLayout(s1, day1Mapping(s1), 'a.csv');
    expect(forgetAllLayouts()).toBe(true);
    expect(local.has(LAYOUTS_KEY)).toBe(false);
    expect(loadLayouts()).toEqual([]);
  });
});

describe('naming a layout', () => {
  it.each([
    ['TC_export_2026-11-25.csv', 'TC export'],
    ['vessels 25.11.2026.xlsx', 'vessels'],
    ['export (3).csv', 'export'],
    ['2026-11-25.csv', '2026-11-25'],
    ['Daily Log.CSV', 'Daily Log'],
  ])('%s → %s', (file, name) => expect(layoutName(file)).toBe(name));
});
