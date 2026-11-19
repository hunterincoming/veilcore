// The check page knows a result is this lab's own from the key in this browser (signed-here.ts).
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { generateKeypair } from 'veilcore-records';
import { makeLabResult } from './lab-result';
import { signedWithKey } from './signed-here';

const statement = {
  kind: 'pathogen' as const,
  subject: 'a1'.repeat(32),
  sampleId: 'S1',
  accession: 'L-S1',
  method: { id: 'RT-qPCR', version: '3' },
  tested: '2026-11-05',
  result: { target: 'HLVd', sampleType: 'leaf', detected: false },
};

describe('signed with this browser’s lab key', () => {
  it('is true for the key that signed it, false for another lab’s', async () => {
    const lab = await generateKeypair();
    const other = await generateKeypair();
    const { bundle } = await makeLabResult(lab.privateKey, { labName: 'E2E Lab', statement });
    expect(await signedWithKey(lab.privateKey, bundle.signature.key)).toBe(true);
    expect(await signedWithKey(other.privateKey, bundle.signature.key)).toBe(false);
  });
});
