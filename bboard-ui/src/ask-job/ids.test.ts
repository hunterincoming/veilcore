// IDs for young, one box each: an ID can only go on the young whose box it is in. A paste fills
// boxes downwards, one line each, only when it plainly lines up (verification V5, W1, W4, X1 to
// X5, and the smaller items of rounds 3 and 4).
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  checkBoxes,
  latestOf,
  looksLikeHeading,
  otherIds,
  pasteInto,
  readColumn,
  rowsOfLitter,
  splitInsert,
  type IdRow,
  type Pasted,
} from './ids';
import { ANIMAL_PROFILE } from '../veilcore/animal-profile';
import type { StrainRecord } from '../veilcore/records';

const ch = (code: number) => String.fromCharCode(code);
const ZWSP = ch(0x200b);
const LINE_SEP = ch(0x2028);
const NEL = ch(0x85);
const VT = ch(0x0b);

const animal = (id: string, name: string, refId = '', extra: Record<string, unknown> = {}): StrainRecord =>
  ({
    id,
    strainName: name,
    refId,
    taxon: 'Canis familiaris',
    profile: ANIMAL_PROFILE,
    animal: { breed: '', idScheme: '', sex: 'female', herd: '' },
    licenseIds: [],
    ...extra,
  }) as unknown as StrainRecord;
const row = (n: number, saved?: string): IdRow => ({
  key: `p${n}`,
  name: `Bella pup ${n}`,
  ...(saved ? { saved } : {}),
});
const six = [1, 2, 3, 4, 5, 6].map((n) => row(n));
const withSaved = [row(1), row(2, 'A2'), row(3), row(4), row(5), row(6)];

/** The boxes a paste left, as "key=ID" for every box with something in it. */
const boxes = (r: ReturnType<typeof pasteInto>) =>
  'values' in r
    ? Object.entries(r.values)
        .map(([k, v]) => `${k}=${v}`)
        .sort()
    : r;

describe('a paste fills the box it lands in and the boxes below, one line each', () => {
  it('one column from the first box', () => {
    expect(boxes(pasteInto(six, 'p1', 'A1\nA2\nA3', {}))).toEqual(['p1=A1', 'p2=A2', 'p3=A3']);
  });

  it('from a lower box: the boxes above are untouched', () => {
    expect(boxes(pasteInto(six, 'p4', 'A4\r\nA5', { p1: 'X1' }))).toEqual(['p1=X1', 'p4=A4', 'p5=A5']);
  });

  it('an empty line leaves its box as it was, typed in or not; empty lines at the end go', () => {
    expect(boxes(pasteInto(six, 'p1', 'A1\n\nA3\n\n', {}))).toEqual(['p1=A1', 'p3=A3']);
    expect(boxes(pasteInto(six, 'p1', 'A1\n\nA3', { p2: 'typed' }))).toEqual(['p1=A1', 'p2=typed', 'p3=A3']);
  });

  it('a scanner’s trailing tab on each line is one column', () => {
    expect(boxes(pasteInto(six, 'p1', 'A1\t\nA2\t\nA3\t\n', {}))).toEqual(['p1=A1', 'p2=A2', 'p3=A3']);
  });

  it('more than one column: refused, nothing filled', () => {
    expect(pasteInto(six, 'p1', 'A1\tM1\nA2\tM2\nA3\tM3', {})).toEqual({ why: 'columns' });
    expect(pasteInto(six, 'p1', '\tA1\n\tA2', {})).toEqual({ why: 'columns' });
  });

  it('more lines than boxes from there down: refused, nothing filled (X4)', () => {
    // The dam's line above six pups.
    expect(pasteInto(six, 'p1', 'B9\nA1\nA2\nA3\nA4\nA5\nA6', {})).toEqual({ why: 'over', n: 7, count: 6 });
    // A whole column into a middle box.
    expect(pasteInto(six, 'p3', 'A1\nA2\nA3\nA4\nA5\nA6', {})).toEqual({ why: 'over', n: 6, count: 4 });
  });

  it('a column that starts with an ID a young here already has: refused (it starts higher up)', () => {
    const saved = [row(1, 'A1'), row(2, 'A2'), row(3), row(4), row(5), row(6)];
    expect(pasteInto(saved, 'p3', 'A1\nA2\nA3\nA4', {})).toEqual({ why: 'startsAt', id: 'A1', name: 'Bella pup 1' });
  });

  it('headings: words, the scheme, words over numbers, and with a digit too (X4)', () => {
    expect(pasteInto(six, 'p1', 'Tag\nA1\nA2', {})).toEqual({ why: 'header', id: 'Tag' });
    expect(pasteInto(six, 'p1', 'Ohrmarke:\nDE01', {})).toEqual({ why: 'header', id: 'Ohrmarke:' });
    expect(pasteInto(six, 'p1', '耳標\n001', {})).toEqual({ why: 'header', id: '耳標' });
    expect(pasteInto(six, 'p1', 'Chip ID\n985112\n985113', {}, 'Chip ID')).toEqual({ why: 'header', id: 'Chip ID' });
    expect(pasteInto(six, 'p1', 'Welpen Marke\n276098\n276099', {})).toEqual({ why: 'header', id: 'Welpen Marke' });
    expect(pasteInto(six, 'p1', 'Litter 3 tags\n985112000000001\n985112000000002', {})).toEqual({
      why: 'header',
      id: 'Litter 3 tags',
    });
    expect(pasteInto(six, 'p1', 'Chip (15)\n985112000000001\n985112000000002', {})).toEqual({
      why: 'header',
      id: 'Chip (15)',
    });
    expect(pasteInto(six, 'p1', 'Tag 2026\nA1', {})).toEqual({ why: 'header', id: 'Tag 2026' });
    // IDs of one shape are IDs; full-width digits are digits.
    expect(looksLikeHeading('A1', ['A2'])).toBe(false);
    expect(looksLikeHeading('DE01', ['DE02', 'DE03'])).toBe(false);
    expect(looksLikeHeading('Ａ１', ['A1'])).toBe(false);
  });

  it('a list on one line: refused (A1, A2 / A1; A2)', () => {
    expect(pasteInto(six, 'p1', 'A1, A2, A3', {})).toEqual({ why: 'comma', line: 1 });
    expect(pasteInto(six, 'p1', 'B0\nA1;A2', {})).toEqual({ why: 'comma', line: 2 });
  });

  it('invisible characters, line separators and controls: refused, with the line', () => {
    expect(pasteInto(six, 'p1', `A1\n${ZWSP}\nA3`, {})).toEqual({ why: 'invisible', line: 2 });
    expect(pasteInto(six, 'p1', `A1${LINE_SEP}A2${LINE_SEP}A3`, {})).toEqual({ why: 'invisible', line: 1 });
    expect(pasteInto(six, 'p1', `A1${NEL}A2`, {})).toEqual({ why: 'invisible', line: 1 });
    expect(pasteInto(six, 'p1', `A1\nA${VT}2`, {})).toEqual({ why: 'invisible', line: 2 });
  });

  it('never into a young that has an ID: it stops there and says so', () => {
    const r = pasteInto(withSaved, 'p1', 'X1\nZ2\nX3', {}) as Pasted;
    expect(r.filled).toEqual(['p1']);
    expect(r.stopped).toEqual({ name: 'Bella pup 2', left: 2 });
    expect(r.values).toEqual({ p1: 'X1' });
  });

  it('the result screen reads the same: in place, refused unless it lines up', () => {
    expect(readColumn('A1\n\nA3\n')).toEqual(['A1', '', 'A3']);
    expect(readColumn('A1\tM1')).toEqual({ why: 'columns' });
  });
});

describe('what Save will do, box by box', () => {
  it('each young next to the ID it will get, in birth order; empty boxes are left as they are', () => {
    const { pairs, errors } = checkBoxes(six, { p3: ' A3 ', p1: 'A1' });
    expect(pairs.map(([r, id]) => `${r.name}=${id}`)).toEqual(['Bella pup 1=A1', 'Bella pup 3=A3']);
    expect(errors).toEqual({});
  });

  it('the same ID in two boxes: both refused, by box', () => {
    const { pairs, errors } = checkBoxes(six, { p1: 'A1', p2: 'a1', p3: 'A3' });
    expect(errors).toEqual({ p1: { why: 'twice', id: 'A1' }, p2: { why: 'twice', id: 'a1' } });
    expect(pairs.map(([r]) => r.key)).toEqual(['p3']);
  });

  it('an ID a young of the litter already has, or another of the person’s animals: refused (W4)', () => {
    expect(checkBoxes(withSaved, { p3: 'a2' }).errors).toEqual({ p3: { why: 'taken', id: 'a2', name: 'Bella pup 2' } });
    const rex = animal('rex', 'Rex', 'TAG-9');
    const others = otherIds([rex], six);
    expect(others).toEqual(new Map([['TAG-9', 'Rex']]));
    expect(checkBoxes(six, { p1: 'tag-9' }, others).errors).toEqual({
      p1: { why: 'elsewhere', id: 'tag-9', name: 'Rex' },
    });
  });

  it('invisible characters or a list typed in a box: refused', () => {
    expect(checkBoxes(six, { p1: `A1${ZWSP}`, p2: 'A2, A3' }).errors).toEqual({
      p1: { why: 'invisible' },
      p2: { why: 'comma' },
    });
  });
});

describe('the boxes come from the records as they are now (X2)', () => {
  const litter = { young: [1, 2, 3].map((n) => animal(`p${n}`, `Bella pup ${n}`)) };

  it('a young another tab gave T4 meanwhile shows T4, read-only; T4 typed for another pup is refused', () => {
    const now = [
      animal('p1', 'Bella pup 1', '', { supersededBy: 'p1b' }),
      animal('p1b', 'Bella pup 1', 'T4', { supersedes: { recordId: 'p1' } }),
      ...litter.young.slice(1),
    ];
    expect(latestOf(now, litter.young[0]).id).toBe('p1b');
    const rows = rowsOfLitter(litter, now);
    expect(rows.map((r) => [r.key, r.saved ?? '', r.record?.id])).toEqual([
      ['p1', 'T4', 'p1b'],
      ['p2', '', 'p2'],
      ['p3', '', 'p3'],
    ]);
    // Its box is gone: nothing typed for it is sent.
    expect(checkBoxes(rows, { p1: 'X4', p2: 'A2' }, otherIds(now, rows)).pairs.map(([r]) => r.key)).toEqual(['p2']);
    // And its ID can't go on another pup.
    expect(checkBoxes(rows, { p2: 'T4' }, otherIds(now, rows)).errors).toEqual({
      p2: { why: 'taken', id: 'T4', name: 'Bella pup 1' },
    });
    // The pup's own corrections are not "another animal".
    expect(otherIds(now, rows).size).toBe(0);
  });
});

describe('round 5: lists, headings over one ID, and several IDs put in at once', () => {
  it('Japanese commas are a list too', () => {
    expect(pasteInto(six, 'p1', 'A1、A2', {})).toEqual({ why: 'comma', line: 1 });
    expect(checkBoxes(six, { p1: 'A1，A2' }).errors).toEqual({ p1: { why: 'comma' } });
  });

  it('a heading over a single ID: refused', () => {
    expect(pasteInto(six, 'p1', 'Tag2026\nA1', {})).toEqual({ why: 'header', id: 'Tag2026' });
    expect(pasteInto(six, 'p1', 'Chips\n985112000000001', {})).toEqual({ why: 'header', id: 'Chips' });
    expect(boxes(pasteInto(six, 'p1', 'UK1\nUK22', {}))).toEqual(['p1=UK1', 'p2=UK22']);
  });

  it('words put in one box at once are never split across young: one ID in groups stays whole, several IDs are refused', () => {
    expect(splitInsert('985 112 345 678 901')).toBeUndefined();
    expect(splitInsert('123456 700001')).toBeUndefined();
    expect(splitInsert('UK 123456 700001')).toBeUndefined();
    expect(splitInsert('M1 M2 M3')).toBe('unclear');
    expect(splitInsert('A1 B22')).toBe('unclear');
    expect(splitInsert('A1')).toBeUndefined();
    // Kept whole, it is one ID in one box.
    expect(checkBoxes(six, { p1: '985 112 345 678 901' }).pairs.map(([r, id]) => `${r.key}=${id}`)).toEqual([
      'p1=985 112 345 678 901',
    ]);
  });
});
