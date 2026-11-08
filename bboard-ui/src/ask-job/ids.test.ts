// "Add IDs": a pasted column never puts an ID on the wrong young (verification V5, W1, W4).
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { assignIds, idsOf, otherIds } from './ids';
import { ANIMAL_PROFILE } from '../veilcore/animal-profile';
import type { StrainRecord } from '../veilcore/records';

const pup = (n: number, refId = ''): StrainRecord =>
  ({ id: `p${n}`, strainName: `Bella pup ${n}`, refId }) as StrainRecord;
const litter = (young: StrainRecord[]) => ({ young, missing: young.filter((r) => !r.refId) });
const names = (r: ReturnType<typeof assignIds>) =>
  'pairs' in r ? r.pairs.map(([y, id]) => `${y.strainName}=${id}`) : r;
const fresh6 = litter([1, 2, 3, 4, 5, 6].map((n) => pup(n)));
const saved3 = () => litter([pup(1, 'A1'), pup(2, 'A2'), pup(3, 'A3'), pup(4), pup(5), pup(6)]);

describe('the pasted column, cell by cell', () => {
  it('keeps an empty cell in its place, splits a row at its tabs, and drops only empty lines at the end', () => {
    expect(idsOf('A1\n\nA3\r\nA4\n\n')).toEqual(['A1', '', 'A3', 'A4']);
    expect(idsOf('A1\t\tA3')).toEqual(['A1', '', 'A3']);
    expect(idsOf('\nA5\nA6')).toEqual(['', 'A5', 'A6']);
    expect(idsOf('US,123')).toEqual(['US,123']);
  });
});

describe('which young each pasted ID goes on', () => {
  it('a fresh litter: in order', () => {
    expect(names(assignIds(fresh6, idsOf('A1\nA2')))).toEqual(['Bella pup 1=A1', 'Bella pup 2=A2']);
  });

  it('a blank row in the middle of a whole column: that young gets nothing, the rest stay in place (W1)', () => {
    expect(names(assignIds(fresh6, idsOf('A1\n\nA3\nA4\nA5\nA6')))).toEqual([
      'Bella pup 1=A1',
      'Bella pup 3=A3',
      'Bella pup 4=A4',
      'Bella pup 5=A5',
      'Bella pup 6=A6',
    ]);
  });

  it('a blank row in a shorter column: which young it skips can’t be told, so it is refused (W1)', () => {
    expect(assignIds(fresh6, idsOf('A1\n\nA3\nA4'))).toEqual({ why: 'blank', row: 2 });
  });

  it('tab-separated cells with an empty one: refused when short, in place when whole (W1)', () => {
    expect(assignIds(fresh6, idsOf('A1\t\tA3'))).toEqual({ why: 'blank', row: 2 });
    expect(names(assignIds(fresh6, idsOf('A1\t\tA3\tA4\tA5\tA6')))).toEqual([
      'Bella pup 1=A1',
      'Bella pup 3=A3',
      'Bella pup 4=A4',
      'Bella pup 5=A5',
      'Bella pup 6=A6',
    ]);
  });

  it('an empty line at the end is not a row (W1)', () => {
    expect(names(assignIds(fresh6, idsOf('A1\nA2\n\n')))).toEqual(['Bella pup 1=A1', 'Bella pup 2=A2']);
  });

  it('only the rest, after 3 of 6 were saved: in order; with an empty first row, refused (W1)', () => {
    expect(names(assignIds(saved3(), idsOf('A4\nA5\nA6')))).toEqual([
      'Bella pup 4=A4',
      'Bella pup 5=A5',
      'Bella pup 6=A6',
    ]);
    expect(assignIds(saved3(), idsOf('\nA5\nA6'))).toEqual({ why: 'blank', row: 1 });
  });

  it('after a save that stopped at 3 of 6, the whole column again goes row by row, not shifted', () => {
    expect(names(assignIds(saved3(), idsOf('A1\nA2\nA3\nA4\nA5\nA6')))).toEqual([
      'Bella pup 4=A4',
      'Bella pup 5=A5',
      'Bella pup 6=A6',
    ]);
    // Rows already saved may be left empty; a blank where one is missing leaves it so.
    expect(names(assignIds(saved3(), idsOf('\n\n\nA4\n\nA6')))).toEqual(['Bella pup 4=A4', 'Bella pup 6=A6']);
  });

  it('the whole column in another order than the IDs saved: refused', () => {
    const l = litter([pup(1, 'A1'), pup(2, 'A2'), pup(3), pup(4)]);
    expect(assignIds(l, idsOf('A2\nA1\nA3\nA4'))).toEqual({
      why: 'differs',
      id: 'A1',
      name: 'Bella pup 1',
      typed: 'A2',
    });
    expect(assignIds(l, idsOf('\n\nA1\nA4'))).toEqual({ why: 'taken', id: 'A1', name: 'Bella pup 1' });
  });

  it('a shorter column that repeats an ID already saved: refused', () => {
    expect(assignIds(saved3(), idsOf('A1\nA2\nA3'))).toEqual({ why: 'taken', id: 'A1', name: 'Bella pup 1' });
    expect(assignIds(saved3(), idsOf('a1\nA5'))).toEqual({ why: 'taken', id: 'A1', name: 'Bella pup 1' });
  });

  it('more IDs than young still without one, one ID twice, or a comma in a cell: refused', () => {
    const l = litter([pup(1, 'A1'), pup(2), pup(3)]);
    expect(assignIds(l, idsOf('B1\nB2\nB3\nB4'))).toEqual({ why: 'tooMany', n: 4, count: 2 });
    expect(assignIds(l, idsOf('B1\nb1'))).toEqual({ why: 'twice', id: 'b1' });
    expect(assignIds(l, idsOf('B1, B2'))).toEqual({ why: 'comma', id: 'B1, B2' });
  });

  it('an ID another of the person’s animals already has: refused (W4)', () => {
    const rex = {
      id: 'rex',
      strainName: 'Rex',
      refId: 'TAG-9',
      taxon: 'Canis familiaris',
      profile: ANIMAL_PROFILE,
      animal: { breed: '', idScheme: '', sex: 'male', herd: '' },
      licenseIds: [],
    } as unknown as StrainRecord;
    const others = otherIds([rex, ...fresh6.young], fresh6);
    expect(others).toEqual(new Map([['TAG-9', 'Rex']]));
    expect(assignIds(fresh6, idsOf('A1\ntag-9'), others)).toEqual({ why: 'elsewhere', id: 'tag-9', name: 'Rex' });
  });
});
