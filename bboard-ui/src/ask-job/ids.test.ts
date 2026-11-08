// "Add IDs": a pasted column never puts an ID on the wrong young (verification V5).
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { assignIds, idsOf } from './ids';
import type { StrainRecord } from '../veilcore/records';

const pup = (n: number, refId = ''): StrainRecord =>
  ({ id: `p${n}`, strainName: `Bella pup ${n}`, refId }) as StrainRecord;
const litter = (young: StrainRecord[]) => ({ young, missing: young.filter((r) => !r.refId) });
const names = (r: ReturnType<typeof assignIds>) =>
  'pairs' in r ? r.pairs.map(([y, id]) => `${y.strainName}=${id}`) : r;

describe('which young each pasted ID goes on', () => {
  const column = idsOf('A1\nA2\nA3\nA4\nA5\nA6');

  it('a fresh litter: in order', () => {
    expect(names(assignIds(litter([1, 2, 3].map((n) => pup(n))), idsOf('A1\nA2')))).toEqual([
      'Bella pup 1=A1',
      'Bella pup 2=A2',
    ]);
  });

  it('after a save that stopped at 3 of 6, the whole column again goes row by row, not shifted', () => {
    const l = litter([pup(1, 'A1'), pup(2, 'A2'), pup(3, 'A3'), pup(4), pup(5), pup(6)]);
    expect(names(assignIds(l, column))).toEqual(['Bella pup 4=A4', 'Bella pup 5=A5', 'Bella pup 6=A6']);
  });

  it('the whole column in another order than the IDs saved: refused', () => {
    const l = litter([pup(1, 'A1'), pup(2, 'A2'), pup(3), pup(4)]);
    expect(assignIds(l, idsOf('A2\nA1\nA3\nA4'))).toEqual({
      why: 'differs',
      id: 'A1',
      name: 'Bella pup 1',
      typed: 'A2',
    });
  });

  it('a shorter column that repeats an ID already saved: refused', () => {
    const l = litter([pup(1, 'A1'), pup(2, 'A2'), pup(3, 'A3'), pup(4), pup(5), pup(6)]);
    expect(assignIds(l, idsOf('A1\nA2\nA3'))).toEqual({ why: 'taken', id: 'A1', name: 'Bella pup 1' });
    expect(names(assignIds(l, idsOf('A4\nA5\nA6')))).toEqual(['Bella pup 4=A4', 'Bella pup 5=A5', 'Bella pup 6=A6']);
  });

  it('more IDs than young still without one, or one ID twice: refused', () => {
    const l = litter([pup(1, 'A1'), pup(2), pup(3)]);
    expect(assignIds(l, idsOf('B1\nB2\nB3\nB4'))).toEqual({ why: 'tooMany', n: 4, count: 2 });
    expect(assignIds(l, idsOf('B1, B1'))).toEqual({ why: 'twice', id: 'B1' });
  });
});
