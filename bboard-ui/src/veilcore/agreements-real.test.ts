// A practice agreement stays marked as practice where agreements are real (agreements-real.ts):
// one issued in the practice flow and never put on chain. A real draft, a real license, and
// every agreement on a practice-only site are not marked.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { isPracticeAgreement } from './agreements-real';
import type { License } from './licenses';

const base = { id: 'LIC-1', state: 'active' } as unknown as License;

describe('practice agreements where agreements are real', () => {
  it('marks one issued in the practice flow and never on chain', () => {
    expect(isPracticeAgreement({ ...base, breederSignedAt: 1 }, true)).toBe(true);
  });
  it('does not mark a real license, or a draft not yet issued', () => {
    expect(isPracticeAgreement({ ...base, breederSignedAt: 1, onChain: {} as License['onChain'] }, true)).toBe(false);
    expect(isPracticeAgreement({ ...base, state: 'draft' }, true)).toBe(false);
  });
  it('marks nothing where every agreement is practice (the headings say so there)', () => {
    expect(isPracticeAgreement({ ...base, breederSignedAt: 1 }, false)).toBe(false);
  });
});
