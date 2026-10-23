// claimLink: the same link the web app's /claim page reads (bboard-ui veilcore/claims.ts).
import { describe, expect, it } from 'vitest';
import { claimLink } from '../src/index.js';

const H = (c: string) => c.repeat(64);

describe('claimLink', () => {
  it('makes the link the web app reads (bboard-ui claims.ts, whose test reads this same form)', () => {
    const link = claimLink('https://veilcore.org/', {
      record: H('1'),
      claim: H('2'),
      claimant: H('3'),
      name: 'Practice Lender',
    });
    expect(link).toBe(`https://veilcore.org/claim#r=${H('1')}&o=${H('2')}&b=${H('3')}&n=Practice+Lender`);
  });
  it('takes bytes too, and refuses bad parts', () => {
    const b = new Uint8Array(32).fill(0x11);
    expect(claimLink('https://x.org', { record: b, claim: H('2'), claimant: H('3'), name: 'L' })).toContain(
      `r=${H('1')}`,
    );
    expect(() => claimLink('https://x.org', { record: 'zz', claim: H('2'), claimant: H('3'), name: 'L' })).toThrow();
    expect(() => claimLink('https://x.org', { record: H('1'), claim: H('2'), claimant: H('1'), name: 'L' })).toThrow();
    expect(() => claimLink('https://x.org', { record: H('1'), claim: H('2'), claimant: H('3'), name: ' ' })).toThrow();
  });
});
