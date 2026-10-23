// Claim links (claims.ts): what rides in the fragment, and what is refused before the chain is read.
import { describe, expect, it } from 'vitest';
import { claimFromHash, claimPath } from './claims';

const H = (c: string) => c.repeat(64);
const c = { record: H('1'), claim: H('2'), claimant: H('3'), name: 'Practice Lender & Co' };

describe('claim links', () => {
  it('round-trips through the fragment, name and all', () => {
    const p = claimPath(c);
    expect(p.startsWith('/claim#')).toBe(true);
    expect(claimFromHash(p.slice(p.indexOf('#')))).toEqual(c);
  });
  it('refuses a missing or malformed part, and a claim on the claimant’s own record', () => {
    const p = claimPath(c);
    const h = p.slice(p.indexOf('#'));
    expect(claimFromHash(h.replace(/r=[0-9a-f]+/, 'r=xyz'))).toBeUndefined();
    expect(claimFromHash(h.replace(/&n=[^&]*/, ''))).toBeUndefined();
    expect(claimFromHash(claimPath({ ...c, claimant: c.record }).replace('/claim', ''))).toBeUndefined();
    expect(claimFromHash('')).toBeUndefined();
  });
  it('accepts upper-case hex and trims a long name to 80 characters', () => {
    const long = claimPath({ ...c, name: 'x'.repeat(200) });
    expect(claimFromHash(long.slice(long.indexOf('#')))?.name).toHaveLength(80);
    const up = `#r=${H('A')}&o=${H('B')}&b=${H('C')}&n=Bank`;
    expect(claimFromHash(up)).toEqual({ record: H('a'), claim: H('b'), claimant: H('c'), name: 'Bank' });
  });
});

describe('the partner kit’s link', () => {
  it('reads the exact form partner-kit claimLink makes', () => {
    expect(claimFromHash(`#r=${H('1')}&o=${H('2')}&b=${H('3')}&n=Practice+Lender`)).toEqual({
      record: H('1'),
      claim: H('2'),
      claimant: H('3'),
      name: 'Practice Lender',
    });
  });
});
