import { describe, expect, it } from 'vitest';
import { PAYMENT_PARTNERS, partnerListProblems, pinnedPartner } from './payment-partners';

describe('payment partners fixed in the website', () => {
  it('the shipped list has no bad lines', () => {
    expect(partnerListProblems(PAYMENT_PARTNERS)).toEqual([]);
  });

  it('bad lines are caught', () => {
    const k = 'a'.repeat(64);
    expect(
      partnerListProblems([
        { key: k, name: 'A', checked: '2026-10-21' },
        { key: k, name: 'B', checked: '2026-10-21' },
        { key: 'AB', name: 'C', checked: 'yesterday' },
      ]),
    ).toEqual(['B: key listed twice', 'C: key must be 64 lowercase hex characters', 'C: checked must be YYYY-MM-DD']);
  });

  it('only an exact listed key matches', () => {
    const list = [{ key: 'b'.repeat(64), name: 'Pay Co', checked: '2026-10-21' }];
    expect(pinnedPartner('b'.repeat(64), list)?.name).toBe('Pay Co');
    expect(pinnedPartner('B'.repeat(64), list)).toBeUndefined();
    expect(pinnedPartner('c'.repeat(64), list)).toBeUndefined();
  });
});
