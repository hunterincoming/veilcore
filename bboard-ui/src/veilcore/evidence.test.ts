// The sales report behind a statement (evidence.ts): its fingerprint goes in the signed
// statement; the licensor's page checks a file is exactly that report.
import { describe, expect, it } from 'vitest';
import { evidenceOf, isEvidence, isTheReport, MAX_EVIDENCE_BYTES } from './evidence';

const csv = 'Date,Package,Item,Quantity,Total\n2026-09-03,1A40...01,Blue Dream 3.5g,4,140.00\n';

describe('sales report evidence', () => {
  it('fingerprints the bytes, and only the same bytes match', async () => {
    const f = new File([csv], 'C:\\exports\\metrc-sales-sept.csv', { type: 'text/csv' });
    const e = await evidenceOf(f);
    expect(e.name).toBe('metrc-sales-sept.csv');
    expect(e.size).toBe(new TextEncoder().encode(csv).length);
    expect(e.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(isEvidence(e)).toBe(true);
    expect(await isTheReport(new File([csv], 'renamed.csv'), e)).toBe(true);
    expect(await isTheReport(new File([csv.replace('140.00', '14.00')], 'metrc-sales-sept.csv'), e)).toBe(false);
  });

  it('refuses an empty or oversized file, and a name is cleaned', async () => {
    await expect(evidenceOf(new File([], 'x.csv'))).rejects.toThrow('empty');
    const big = { size: MAX_EVIDENCE_BYTES + 1, name: 'big.csv' } as File;
    await expect(evidenceOf(big)).rejects.toThrow('50 MB');
    const e = await evidenceOf(new File(['a'], 'a\u0007b.csv'));
    expect(e.name).toBe('ab.csv');
  });

  it('a statement’s evidence that isn’t well formed is not shown as evidence', () => {
    expect(isEvidence({ sha256: 'x', name: 'a', size: 1 })).toBe(false);
    expect(isEvidence({ sha256: 'ab'.repeat(32), name: 'a', size: 1.5 })).toBe(false);
  });
});
