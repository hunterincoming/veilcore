import { describe, expect, it } from 'vitest';
import { owedUnder, sameAmount, toCents } from './money';

describe('money as decimal text', () => {
  it('works to the cent, rounding half up, never through floats', () => {
    expect(owedUnder({ royaltyType: 'percent', royaltyAmount: '5' }, '10000')).toBe('500.00');
    expect(owedUnder({ royaltyType: 'percent', royaltyAmount: '0.5' }, '201')).toBe('1.01');
    expect(owedUnder({ royaltyType: 'flat', royaltyAmount: '1.005' }, '1')).toBe('1.01');
    expect(owedUnder({ royaltyType: 'flat', royaltyAmount: '2.5' }, '41')).toBe('102.50');
    expect(owedUnder({ royaltyType: 'percent', royaltyAmount: '5' }, '')).toBeUndefined();
    expect(owedUnder({ royaltyType: 'percent', royaltyAmount: '5' }, '1e3')).toBeUndefined();
    // Rates as people type them (review round 3, N3).
    expect(owedUnder({ royaltyType: 'flat', royaltyAmount: '0.00125' }, '10000')).toBe('12.50');
    expect(owedUnder({ royaltyType: 'percent', royaltyAmount: '12.5%' }, '1000')).toBe('125.00');
  });
  it('compares amounts by cents', () => {
    expect(sameAmount('500', '500.00')).toBe(true);
    expect(sameAmount('500.01', '500.00')).toBe(false);
    expect(toCents('abc')).toBeUndefined();
  });
});
