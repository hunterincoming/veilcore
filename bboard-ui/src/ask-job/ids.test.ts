// "Add IDs": one box per young, so an ID can only go on the young whose box it is in. A paste
// fills boxes downwards, one line each, and only when it is plainly one column (verification V5,
// W1, W4, X1, S1 to S4).
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { checkBoxes, looksLikeHeading, otherIds, pasteInto, readColumn, type Pasted } from './ids';
import { ANIMAL_PROFILE } from '../veilcore/animal-profile';
import type { StrainRecord } from '../veilcore/records';

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
const pup = (n: number, refId = '') => animal(`p${n}`, `Bella pup ${n}`, refId);
const litter = (young: StrainRecord[]) => ({ young });
const six = litter([1, 2, 3, 4, 5, 6].map((n) => pup(n)));
const withSaved = litter([pup(1), pup(2, 'A2'), pup(3), pup(4), pup(5), pup(6)]);

/** The boxes a paste left, as "pup=ID" for every box with something in it. */
const boxes = (r: ReturnType<typeof pasteInto>) =>
  'values' in r ? Object.entries(r.values).map(([id, v]) => `${id}=${v}`) : r;

describe('a paste fills the box it lands in and the boxes below, one line each', () => {
  it('one column from the first box', () => {
    expect(boxes(pasteInto(six, 'p1', 'A1\nA2\nA3', {}))).toEqual(['p1=A1', 'p2=A2', 'p3=A3']);
  });

  it('from a lower box: the boxes above are untouched', () => {
    expect(boxes(pasteInto(six, 'p4', 'A4\r\nA5', { p1: 'X1' }))).toEqual(['p1=X1', 'p4=A4', 'p5=A5']);
  });

  it('an empty line leaves its own box empty, nothing moves up; empty lines at the end go', () => {
    expect(boxes(pasteInto(six, 'p1', 'A1\n\nA3\n\n', {}))).toEqual(['p1=A1', 'p2=', 'p3=A3']);
  });

  it('a scanner’s trailing tab on each line is one column (A1⇥⏎A2⇥⏎A3⇥⏎)', () => {
    expect(boxes(pasteInto(six, 'p1', 'A1\t\nA2\t\nA3\t\n', {}))).toEqual(['p1=A1', 'p2=A2', 'p3=A3']);
  });

  it('two columns, a 3×2 grid, or a leading empty column: refused, nothing filled (X1)', () => {
    expect(pasteInto(six, 'p1', 'A1\tM1\nA2\tM2\nA3\tM3', {})).toEqual({ why: 'columns' });
    expect(pasteInto(six, 'p1', '\tA1\n\tA2\n\tA3', {})).toEqual({ why: 'columns' });
    expect(pasteInto(six, 'p1', 'A1\t\tA3', {})).toEqual({ why: 'columns' });
  });

  it('a heading on the first line: refused (S3)', () => {
    expect(pasteInto(six, 'p1', 'Tag\nA1\nA2', {})).toEqual({ why: 'header', id: 'Tag' });
    expect(pasteInto(six, 'p1', 'Ohrmarke:\nDE01', {})).toEqual({ why: 'header', id: 'Ohrmarke:' });
    expect(pasteInto(six, 'p1', '耳標\n001', {})).toEqual({ why: 'header', id: '耳標' });
    expect(pasteInto(six, 'p1', 'Chip ID\n985112\n985113', {}, new Map(), 'Chip ID')).toEqual({
      why: 'header',
      id: 'Chip ID',
    });
    // A heading no list knows: words over a column of numbers.
    expect(pasteInto(six, 'p1', 'Welpen Marke\n276098\n276099', {})).toEqual({ why: 'header', id: 'Welpen Marke' });
    expect(looksLikeHeading('A1', 'A2')).toBe(false);
  });

  it('a line of invisible characters only: refused, with the line (S4)', () => {
    expect(pasteInto(six, 'p1', 'A1\n\u200B\nA3', {})).toEqual({ why: 'invisible', line: 2 });
  });

  it('never into a young that has an ID: it stops there and says so (S2)', () => {
    const r = pasteInto(withSaved, 'p1', 'X1\nZ2\nX3', {}) as Pasted;
    expect(r.filled).toEqual(['p1']);
    expect(r.stopped).toEqual({ name: 'Bella pup 2', left: 2 });
    expect(r.values).toEqual({ p1: 'X1' });
  });

  it('more lines than boxes below: the rest is said, not used', () => {
    const r = pasteInto(six, 'p5', 'A5\nA6\nA7', {}) as Pasted;
    expect(r.filled).toEqual(['p5', 'p6']);
    expect(r.over).toBe(1);
  });
});

describe('what Save will do, box by box', () => {
  it('each young next to the ID it will get, in birth order; empty boxes are left as they are', () => {
    const { pairs, errors } = checkBoxes(six, { p3: ' A3 ', p1: 'A1' });
    expect(pairs.map(([r, id]) => `${r.strainName}=${id}`)).toEqual(['Bella pup 1=A1', 'Bella pup 3=A3']);
    expect(errors).toEqual({});
  });

  it('the same ID in two boxes: both refused, by box', () => {
    const { pairs, errors } = checkBoxes(six, { p1: 'A1', p2: 'a1', p3: 'A3' });
    expect(errors).toEqual({ p1: { why: 'twice', id: 'A1' }, p2: { why: 'twice', id: 'a1' } });
    expect(pairs.map(([r]) => r.id)).toEqual(['p3']);
  });

  it('an ID a young of the litter already has: refused (W4)', () => {
    expect(checkBoxes(withSaved, { p3: 'a2' }).errors).toEqual({ p3: { why: 'taken', id: 'a2', name: 'Bella pup 2' } });
  });

  it('an ID another of the person’s animals has: refused (W4)', () => {
    const rex = animal('rex', 'Rex', 'TAG-9');
    const others = otherIds([rex, ...six.young], six);
    expect(others).toEqual(new Map([['TAG-9', 'Rex']]));
    expect(checkBoxes(six, { p1: 'tag-9' }, new Map(), others).errors).toEqual({
      p1: { why: 'elsewhere', id: 'tag-9', name: 'Rex' },
    });
  });

  it('invisible characters in a box: refused (S4)', () => {
    expect(checkBoxes(six, { p1: 'A1\u200B' }).errors).toEqual({ p1: { why: 'invisible' } });
  });

  it('a retry after a save that stopped part way: the IDs saved from this box are no one else’s (S1)', () => {
    // Pup 1 was saved as a correction: its old record replaced by one with the ID.
    const after = [
      animal('p1', 'Bella pup 1', '', { supersededBy: 'p1b' }),
      animal('p1b', 'Bella pup 1', 'A1', { supersedes: { recordId: 'p1' } }),
      ...six.young.slice(1),
    ];
    const saved = new Map([['p1', 'A1']]);
    const { pairs, errors } = checkBoxes(six, { p1: 'A1', p2: 'A2' }, saved, otherIds(after, six));
    expect(errors).toEqual({});
    // Pup 1 is saved: its box isn't sent again.
    expect(pairs.map(([r, id]) => `${r.id}=${id}`)).toEqual(['p2=A2']);
    // And its ID still can't go on another pup.
    expect(checkBoxes(six, { p2: 'A1' }, saved, otherIds(after, six)).errors).toEqual({
      p2: { why: 'taken', id: 'A1', name: 'Bella pup 1' },
    });
  });
});

describe('the job page’s pasted column (readColumn): one line a young, in place', () => {
  it('an empty line stays in its place; a scanner’s trailing tab is dropped', () => {
    expect(readColumn('A1\n\nA3\n')).toEqual(['A1', '', 'A3']);
    expect(readColumn('A1\t\nA2\t\n')).toEqual(['A1', 'A2']);
  });
  it('more than one column, a heading, or invisible characters: refused', () => {
    expect(readColumn('A1\tM1\nA2\tM2')).toEqual({ why: 'columns' });
    expect(readColumn('Ear tag\nUK123')).toEqual({ why: 'header', id: 'Ear tag' });
    expect(readColumn('A1\nA\u200B2')).toEqual({ why: 'invisible', line: 2 });
  });
});
