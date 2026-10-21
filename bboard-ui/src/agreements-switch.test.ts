// The two halves of the agreements switch say the same thing (docs/agreements-live.md):
// the website's AGREEMENTS_LIVE and the sponsor's MAINNET_AGREEMENTS, and the calls the
// browser may make are the ones the sponsor pays for.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AGREEMENTS_LIVE } from './config/copy';
import { BROWSER_CIRCUITS } from './veilcore/chain/config';

const policy = readFileSync(new URL('../../sponsor/src/policy.ts', import.meta.url), 'utf8');
const list = (name: string): string[] => {
  const m = new RegExp(`export const ${name} = \\[([^\\]]*)\\]`).exec(policy);
  return [...(m?.[1] ?? '').matchAll(/'([A-Za-z]+)'/g)].map((x) => x[1]);
};

describe('the agreements switch', () => {
  it('the site and the sponsor are switched on together', () => {
    const m = /export const MAINNET_AGREEMENTS = (true|false);/.exec(policy);
    expect(m?.[1]).toBe(String(AGREEMENTS_LIVE));
  });

  it('every call the browser may make is one the sponsor pays for, and no more', () => {
    expect([...BROWSER_CIRCUITS].sort()).toEqual(
      [...list('PHASE1_PUBLIC_CIRCUITS'), ...list('AGREEMENT_CIRCUITS')].sort(),
    );
  });
});
