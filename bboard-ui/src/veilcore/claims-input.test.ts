// A claim about one number on a sealed certificate, built in the browser from the holder's copy
// (claims-input.ts), run through the claims contract's own compiled circuits in memory: the
// commitment it names is the record's content hash in the published vectors, a true bound is
// accepted, a false one is refused before anything could be proved, and the number is never
// in what the claim publishes. No proof is made here (that needs the public parameters).
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { claimMaterial, commitmentHex, slotInput } from './claims-input';
import { ClaimsSimulator } from '../../../contract/src/test/claims-simulator';
import { RangeOp } from '../../../contract/src/managed/veilcore-claims/contract/index.js';
import { claimFromCells } from '../../../contract/src/verify-claims';

const dir = path.dirname(fileURLToPath(import.meta.url));
const v = JSON.parse(fs.readFileSync(path.join(dir, '../../../contract/vectors/document-v1.json'), 'utf8')) as {
  records: {
    appRecord: Record<string, unknown>;
    contentHash: string;
    fieldSet?: { schema: string; values: (string | null)[]; fieldSecret: string };
  }[];
};
const withSet = v.records.find((r) => r.fieldSet)!;
const record = {
  ...withSet.appRecord,
  fieldSet: {
    schema: withSet.fieldSet!.schema,
    values: [...withSet.fieldSet!.values, ...Array<null>(16 - withSet.fieldSet!.values.length).fill(null)],
    fieldSecret: withSet.fieldSet!.fieldSecret,
  },
} as never;

describe('a claim on a sealed certificate’s numbers', () => {
  it('names the record’s content hash (SPEC 4.5), as the vectors computed it', async () => {
    expect(commitmentHex(await claimMaterial(record))).toBe(withSet.contentHash);
  });

  it('a true bound is accepted by the circuit: total THC (0.210 %) is at most 0.300 %', async () => {
    const m = await claimMaterial(record);
    const { opening, number } = slotInput(m, 0);
    expect(number).toBe(210n);
    const sim = new ClaimsSimulator();
    sim.call({ opening, number, terms: m.terms }, 'proveRange', m.commitment, m.schemaId, 0n, RangeOp.AT_MOST, 300n);
    const claim = claimFromCells(sim.state);
    // What is published: the record, the schema, the slot, the bound. Never the number.
    expect(JSON.stringify(claim, (_, x: unknown) => (typeof x === 'bigint' ? x.toString() : x))).not.toContain('"210"');
  });

  it('a false bound is refused by the circuit, before anything could be proved', async () => {
    const m = await claimMaterial(record);
    const { opening, number } = slotInput(m, 0);
    const sim = new ClaimsSimulator();
    expect(() =>
      sim.call({ opening, number, terms: m.terms }, 'proveRange', m.commitment, m.schemaId, 0n, RangeOp.AT_MOST, 200n),
    ).toThrow();
    expect(() =>
      sim.call({ opening, number, terms: m.terms }, 'proveRange', m.commitment, m.schemaId, 0n, RangeOp.AT_LEAST, 211n),
    ).toThrow();
  });

  it('a value claim publishes the value, and only for the slot it names', async () => {
    const m = await claimMaterial(record);
    const { opening } = slotInput(m, 3);
    const sim = new ClaimsSimulator();
    sim.call({ opening }, 'proveValue', m.commitment, m.schemaId, 3n, opening.value);
    expect(() => sim.call({ opening }, 'proveValue', m.commitment, m.schemaId, 4n, opening.value)).toThrow();
  });

  it('refuses a slot with no number, and a record whose numbers are gone', async () => {
    const m = await claimMaterial(record);
    expect(() => slotInput(m, 7)).toThrow(/not on the certificate/);
    await expect(claimMaterial({ ...(record as object), fieldSet: undefined } as never)).rejects.toThrow(
      /no sealed numbers/,
    );
  });

  it('a record whose numbers were changed after sealing names another commitment, which no anchor dates', async () => {
    const changed = {
      ...(record as object),
      fieldSet: { ...(record as { fieldSet: object }).fieldSet, values: ['200'] },
    };
    expect(commitmentHex(await claimMaterial(changed as never))).not.toBe(withSet.contentHash);
  });
});
