// Numbers a lab signs inside its report (lab-numbers.ts), and the report format that carries
// them (lab-results.ts padReport, third trailer).
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { generateKeypair } from 'veilcore-records';
import { makeLabNumbers, readLabNumbers } from './lab-numbers';
import { padReport, unpadReportWithKind, LAB_NUMBERS_MAX } from './lab-results';
import { claimsKeyFor } from './claims-key';
import { claimMaterial } from './claims-input';
import { signatureParts } from './lab-attest';
import { ClaimsSimulator } from '../../../contract/src/test/claims-simulator';
import { claimFromCells } from '../../../contract/src/verify-claims';

const input = {
  title: 'Germination test GT-2026-0412',
  labName: 'Example Seed Lab',
  holder: 'A breeder',
  plantName: 'Test line 7',
  issued: '2026-11-04',
  report: { name: 'gt-0412.pdf', sha256: 'ab'.repeat(32), size: 51234 },
  schema: 'veilcore/schema/seed-quality/v1',
  values: [9600n, null, null, null, null, null] as (bigint | null)[],
};

describe('numbers a lab signs', () => {
  it('are written by the lab, signed with the key its attester key makes, and read back checked', async () => {
    const lab = await generateKeypair();
    const { numbers, commitment, keyText } = await makeLabNumbers(lab.privateKey, input);
    expect(keyText).toBe(claimsKeyFor(lab.privateKey).keyText);
    expect(numbers.record.bredBy).toBe('A breeder');
    expect(numbers.record.document?.issuer).toBe('Example Seed Lab');
    expect(numbers.record.document?.files).toEqual([input.report]);
    expect(numbers.record.keyBinding).toBeUndefined();
    const back = await readLabNumbers(JSON.stringify(numbers));
    expect(back.signature.record).toBe(commitment);
  });

  it('are refused when anything was changed after signing', async () => {
    const lab = await generateKeypair();
    const { numbers } = await makeLabNumbers(lab.privateKey, input);
    const values = [...numbers.record.fieldSet.values];
    values[0] = '9900';
    const changed = { ...numbers, record: { ...numbers.record, fieldSet: { ...numbers.record.fieldSet, values } } };
    await expect(readLabNumbers(JSON.stringify(changed))).rejects.toThrow();
    const renamed = { ...numbers, record: { ...numbers.record, bredBy: 'Someone else' } };
    await expect(readLabNumbers(JSON.stringify(renamed))).rejects.toThrow(/different record|doesn’t check/);
    const other = await generateKeypair();
    const { numbers: theirs } = await makeLabNumbers(other.privateKey, input);
    const swapped = { ...numbers, signature: { ...theirs.signature, record: numbers.signature.record } };
    await expect(readLabNumbers(JSON.stringify(swapped))).rejects.toThrow(/doesn’t check/);
    await expect(readLabNumbers('{}')).rejects.toThrow(/can’t be read/);
  });

  it('are accepted by the claims contract’s own proveAttested', async () => {
    const lab = await generateKeypair();
    const { numbers } = await makeLabNumbers(lab.privateKey, input);
    const m = await claimMaterial(numbers.record);
    const { key, signature } = signatureParts(numbers.signature);
    const sim = new ClaimsSimulator();
    sim.call({ attester: key, signature }, 'proveAttested', m.commitment);
    const on = claimFromCells(sim.state);
    expect(on.kind).toBe('attested');
    expect(on.attester).toEqual(claimsKeyFor(lab.privateKey).key);
  });
});

describe('the report format', () => {
  it('carries the numbers after the report, and leaves the report’s bytes as they were', () => {
    const report = new TextEncoder().encode('%PDF-1.7 a report');
    const nums = new TextEncoder().encode('{"kind":"veilcore-lab-numbers"}');
    const out = unpadReportWithKind(padReport(report, 'other', nums));
    expect(out.bytes).toEqual(report);
    expect(out.kind).toBe('other');
    expect(out.numbers).toEqual(nums);
    // The older forms open as before.
    expect(unpadReportWithKind(padReport(report, 'dna'))).toEqual({ bytes: report, kind: 'dna' });
    expect(unpadReportWithKind(padReport(report))).toEqual({ bytes: report });
  });

  it('refuses numbers without a kind, or too large', () => {
    const report = new Uint8Array(10);
    expect(() => padReport(report, undefined, new Uint8Array(4))).toThrow();
    expect(() => padReport(report, 'other', new Uint8Array(LAB_NUMBERS_MAX + 1))).toThrow();
  });

  it('reads a damaged numbers trailer as a plain file, never as numbers', () => {
    const report = new TextEncoder().encode('report');
    const padded = padReport(report, 'other', new TextEncoder().encode('{}'));
    const bad = padded.slice();
    // Claim more numbers than there are bytes.
    new DataView(bad.buffer).setUint32(bad.length - 21, 0xffff);
    expect(unpadReportWithKind(bad).numbers).toBeUndefined();
  });
});

describe('what a lab sends can’t reach past the record', () => {
  it('drops every field the commitment doesn’t cover', async () => {
    const lab = await generateKeypair();
    const { numbers } = await makeLabNumbers(lab.privateKey, input);
    const stuffed = {
      ...numbers,
      record: {
        ...numbers.record,
        labOnChain: { contract: 'c1'.repeat(32), txId: 'ab'.repeat(32), blockHeight: 1 },
        supersedes: { recordId: 'VEIL-X' },
        claims: [{ kind: 'range' }],
        grant: { all: true },
        secrets: { x: 1 },
        document: { ...numbers.record.document, extra: 'x' },
        fieldSet: { ...numbers.record.fieldSet, extra: 'x' },
      },
    };
    const back = await readLabNumbers(JSON.stringify(stuffed));
    for (const k of ['labOnChain', 'supersedes', 'claims', 'grant', 'secrets'])
      expect(back.record as Record<string, unknown>, k).not.toHaveProperty(k);
    expect(back.record.document as Record<string, unknown>).not.toHaveProperty('extra');
    expect(back.record.fieldSet as Record<string, unknown>).not.toHaveProperty('extra');
  });

  it('a genetic form needs what was compared, and a percentage stays at or under 100', async () => {
    const lab = await generateKeypair();
    const sim = { ...input, schema: 'veilcore/schema/variety-similarity/v1' };
    await expect(
      makeLabNumbers(lab.privateKey, { ...sim, values: [9437n, 5103n, 287n, 12n, null, 1n] }),
    ).rejects.toThrow(/names what was compared/);
    await expect(
      makeLabNumbers(lab.privateKey, { ...sim, values: [10001n, 5103n, 287n, 12n, 201900123n, 1n] }),
    ).rejects.toThrow(/more than 100/);
    await expect(
      makeLabNumbers(lab.privateKey, { ...sim, values: [9437n, 5103n, 287n, 12n, 201900123n, 1n] }),
    ).resolves.toBeDefined();
    await expect(
      makeLabNumbers(lab.privateKey, {
        ...input,
        schema: 'veilcore/schema/animal-parentage/v1',
        values: [1n, 195n, 190n, 0n, 0n, null, null, null, null, null, null, null],
      }),
    ).rejects.toThrow(/names what was compared/);
  });
});
