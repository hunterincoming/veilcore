// Remembered column layouts (import-layouts.ts): saving a file's columns, matching the next day's
// file to them (by column name, in any order, on the row they were on), and forgetting them.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkRows,
  emptyAnimalMapping,
  emptyMapping,
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
  canRemember,
  layoutLabel,
  looksLikeData,
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
    expect(rememberLayout(s, day1Mapping(s), 1000)).toBe(true);
    expect([...local.keys()]).toEqual([LAYOUTS_KEY]);
    const [l] = loadLayouts();
    expect(l.columns).toEqual(['Vessel', 'Clone', 'Stage', 'Initiated', 'Tech']);
    expect(layoutLabel(l.columns)).toBe('Vessel · Clone · Stage · Initiated …');
    expect(l.headerLine).toBe(1);
    expect(l.mapping.columns).toMatchObject({
      strainName: 'clone',
      refId: 'vessel',
      notes: 'stage',
      dateCreated: 'initiated',
    });
    expect(l.mapping.bredByDefault).toBe('Our lab');
    // No cell of the file is kept, and nothing of its name: only its column names.
    expect(local.get(LAYOUTS_KEY)).not.toMatch(/Blue Dream|V-001|Sour Diesel|2026|export|"name"/i);
  });

  it('a file with the same columns replaces the one before', () => {
    const s = sheetOf(DAY1);
    rememberLayout(s, day1Mapping(s), 1000);
    rememberLayout(s, { ...day1Mapping(s), bredByDefault: 'Changed' }, 2000);
    const all = loadLayouts();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ savedAt: 1000, usedAt: 2000 });
    expect(all[0].mapping.bredByDefault).toBe('Changed');
  });

  it('keeps at most MAX_LAYOUTS, dropping the one used longest ago', () => {
    for (let i = 0; i <= MAX_LAYOUTS; i++) {
      const s = sheetOf(`Name,Extra${String.fromCharCode(65 + i)}\nA,1\n`);
      rememberLayout(s, guessMapping(s.headers), i);
    }
    const all = loadLayouts();
    expect(all).toHaveLength(MAX_LAYOUTS);
    expect(all.some((l) => l.id === signatureOf(['Name', 'ExtraA']))).toBe(false);
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
    expect(rememberLayout(s, day1Mapping(s))).toBe(false);
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
    rememberLayout(s1, day1Mapping(s1), 1000);
    const s2 = sheetOf(DAY2);
    const m = matchLayout(s2);
    expect(m).toBeDefined();
    expect(m!.mapping.columns).toMatchObject({ strainName: 1, refId: 0, notes: 2, dateCreated: 3 });
    expect(m!.mapping.bredByDefault).toBe('Our lab');
    const checked = checkRows(m!.sheet, m!.mapping, { existing: [] });
    expect(checked.ready).toBe(3);
    expect(checked.rows[0].fields).toMatchObject({ strainName: 'Gelato', refId: 'V-003', notes: 'Multiply' });
  });

  it('matches by column name in any order, and spacing or case', () => {
    const s1 = sheetOf(DAY1);
    rememberLayout(s1, day1Mapping(s1));
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
    rememberLayout(s1, day1Mapping(s1));
    expect(matchLayout(sheetOf('Vessel,Clone,Stage,Initiated\nV-1,A,B,2026-01-01\n'))).toBeUndefined();
    expect(matchLayout(sheetOf('Vessel,Clone,Stage,Initiated,Tech,Room\nV-1,A,B,2026-01-01,x,1\n'))).toBeUndefined();
  });

  it('reads the column names from the row they were on last time', () => {
    // A title the guess reads as the column names: the layout says they are on row 3.
    const csv = (rows: string) =>
      `Lab daily export,Site,North,Shift,Day\n,,,,\nVessel,Clone,Stage,Initiated,Tech\n${rows}`;
    const s1 = sheetOf(csv('V-1,A,Root,2026-11-24,AR\n'));
    const at3 = s1.headerLine === 3 ? s1 : toSheet(s1.raw, 'csv', ',', [], { headerLine: 3 });
    rememberLayout(at3, day1Mapping(at3));
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
    rememberLayout(s, m);
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
    rememberLayout(s1, day1Mapping(s1));
    const other = sheetOf('Name,Lot\nA,1\n');
    rememberLayout(other, guessMapping(other.headers));
    const id = matchLayout(s1)!.layout.id;
    expect(forgetLayout(id)).toBe(true);
    expect(matchLayout(sheetOf(DAY2))).toBeUndefined();
    expect(loadLayouts()).toHaveLength(1);
  });

  it('forgetting all leaves nothing in this browser', () => {
    const s1 = sheetOf(DAY1);
    rememberLayout(s1, day1Mapping(s1));
    expect(forgetAllLayouts()).toBe(true);
    expect(local.has(LAYOUTS_KEY)).toBe(false);
    expect(loadLayouts()).toEqual([]);
  });
});

describe('no header row: nothing is remembered', () => {
  it.each([
    ['2026-11-24'],
    ['25.11.2026'],
    ['1500'],
    ['12,5'],
    ['V-001'],
    ['AB_12'],
    ['V001'],
    ['A123'],
    ['#4471'],
    ['x'.repeat(61)],
  ])('%s reads like a value from a row', (v) => expect(looksLikeData(v)).toBe(true));

  it.each([
    ['Vessel'],
    ['Parent 1'],
    ['Lot #'],
    ['ACCENUMB'],
    ['Date of birth'],
    ['個体識別番号'],
    // A word, a space and a number, and short names like P10: lab columns, not values.
    ['Day 14'],
    ['Well 96'],
    ['Week 12'],
    ['Tray 12'],
    ['Rack 10'],
    ['Gen 10'],
    ['P10'],
    ['F10'],
    ['F1'],
    ['2026 batch'],
    ['96-well plate'],
  ])('%s reads like a column name', (v) => expect(looksLikeData(v)).toBe(false));

  /** A mapping that fills the given fields from the given columns, as the person picked them. */
  const picked = (headers: string[], columns: Partial<Mapping['columns']>): Mapping => {
    const e = emptyMapping();
    return { ...e, columns: { ...e.columns, ...columns } };
  };

  it('a first row of data (a date, a code) is not remembered, even when sealed with Remember on', () => {
    // No header row: the first row is taken as the column names, and its cells are records.
    const s = sheetOf('V-001,Lab Clone A,Multiply,2026-11-24\nV-002,Lab Clone B,Root,2026-11-24\n');
    const m = picked(s.headers, { strainName: 1 });
    expect(canRemember(s.headers, m)).toBe(false);
    expect(rememberLayout(s, m)).toBe(false);
    expect(local.has(LAYOUTS_KEY)).toBe(false);
  });

  it('nothing picked, or no column with a name: not remembered', () => {
    expect(canRemember(['Vessel', 'Explant'], emptyMapping())).toBe(false);
    expect(canRemember(['Column A', 'Column B'], picked([], { strainName: 0 }))).toBe(false);
  });

  it.each([
    ['a tissue culture sheet', ['Vessel', 'Explant', 'Media', 'Tech'], { refId: 0, strainName: 1, notes: 2 }],
    ['a German sheet', ['Sortenname', 'Datum', 'Bemerkungen'], { strainName: 0, dateCreated: 1, notes: 2 }],
    ['a Spanish sheet', ['Nombre', 'Fecha', 'Notas'], { strainName: 0, dateCreated: 1, notes: 2 }],
    ['another Spanish sheet', ['Variedad', 'Fecha'], { strainName: 0, dateCreated: 1 }],
    ['a French sheet', ['Variété', 'Remarques'], { strainName: 0, notes: 1 }],
    ['a Japanese sheet', ['名前', '日付', 'メモ'], { strainName: 0, dateCreated: 1, notes: 2 }],
    ['a lab sheet with day and well columns', ['Line', 'Day 14', 'Well 96', 'Tray 12', 'P10'], { strainName: 0 }],
  ])('%s, columns picked by hand, is remembered and matched the next day', (_what, headers, columns) => {
    const s = sheetOf(`${headers.join(',')}\n${headers.map((_, i) => `x${i}`).join(',')}\n`);
    expect(s.headers).toEqual(headers);
    const m = picked(headers, columns);
    expect(canRemember(s.headers, m)).toBe(true);
    expect(rememberLayout(s, m)).toBe(true);
    const back = matchLayout(sheetOf(`${headers.join(',')}\n${headers.map((_, i) => `y${i}`).join(',')}\n`))!;
    expect(back.mapping.columns).toMatchObject(columns);
  });

  it('real column names are, with an unnamed column among them', () => {
    expect(canRemember(['Name', 'Column B'], picked([], { strainName: 0 }))).toBe(true);
  });

  it("an older layout's name from the file is dropped when read", () => {
    const s = sheetOf(DAY1);
    rememberLayout(s, day1Mapping(s), 1);
    const [l] = JSON.parse(local.get(LAYOUTS_KEY)!) as Record<string, unknown>[];
    local.set(LAYOUTS_KEY, JSON.stringify([{ ...l, name: 'Client X export' }]));
    expect(loadLayouts()[0]).not.toHaveProperty('name');
    rememberLayout(s, day1Mapping(s), 2);
    expect(local.get(LAYOUTS_KEY)).not.toContain('Client X');
  });

  it('the date order is kept with the layout', () => {
    const s = sheetOf(DAY1);
    rememberLayout(s, { ...day1Mapping(s), dateOrder: 'dmy' });
    expect(matchLayout(sheetOf(DAY2))!.mapping.dateOrder).toBe('dmy');
  });
});
