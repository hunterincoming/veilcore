// A claim link checked against what the claims contract recorded (claim-link.ts,
// chain/claim-check.ts): the claim is made with the contract's real circuits in memory, and the
// link must match it exactly; a link that says more than was proved, names another contract or
// another record, is refused. The record's dated proof code comes back from the claim and the
// key binding, as the vectors computed it.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { claimMaterial, commitmentHex, slotInput } from './claims-input';
import { ClaimsSimulator } from '../../../contract/src/test/claims-simulator';
import { RangeOp } from '../../../contract/src/managed/veilcore-claims/contract/index.js';
import { claimFromCells } from '../../../contract/src/verify-claims';
import { anchoredFingerprintOf, claimLink, compareClaim, readClaimLink, type MadeClaim } from './claim-link';
import { checkClaim } from './chain/claim-check';

const dir = path.dirname(fileURLToPath(import.meta.url));
const v = JSON.parse(fs.readFileSync(path.join(dir, '../../../contract/vectors/document-v1.json'), 'utf8')) as {
  records: {
    appRecord: Record<string, unknown>;
    fields: { keyBinding?: string };
    fingerprint: string;
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
const CONTRACT = 'c1'.repeat(32);

const madeRange = async () => {
  const m = await claimMaterial(record);
  const { opening, number } = slotInput(m, 0);
  const sim = new ClaimsSimulator();
  sim.call({ opening, number, terms: m.terms }, 'proveRange', m.commitment, m.schemaId, 0n, RangeOp.AT_MOST, 300n);
  const link: MadeClaim = {
    kind: 'range',
    contract: CONTRACT,
    txId: 'ab'.repeat(32),
    record: commitmentHex(m),
    keyBinding: withSet.fields.keyBinding,
    schema: 'veilcore/schema/potency/v1',
    slot: 0,
    op: 'at-most',
    bound: '300',
  };
  return { link, onChain: claimFromCells(sim.state) };
};

describe('a claim link', () => {
  it('comes back as it was made, and leads to the record’s dated proof code', async () => {
    const { link } = await madeRange();
    const read = readClaimLink(claimLink(link, 'https://test.veilcore.org').split('/check-claim')[1]);
    expect(read).toEqual(link);
    expect(anchoredFingerprintOf(link)).toBe(withSet.fingerprint);
  });

  it('matches what the claims contract recorded', async () => {
    const { link, onChain } = await madeRange();
    expect(compareClaim(link, onChain)).toEqual({ ok: true });
    const read = () => Promise.resolve({ claim: onChain, blockHeight: 7, blockTime: 1_790_000_000_000 });
    expect(await checkClaim(link, { read, contract: CONTRACT })).toEqual({
      ok: true,
      blockHeight: 7,
      blockTime: 1_790_000_000_000,
    });
  });

  it('is refused when it says more than was proved, or about something else', async () => {
    const { link, onChain } = await madeRange();
    expect(compareClaim({ ...link, bound: '250' }, onChain).ok).toBe(false);
    expect(compareClaim({ ...link, op: 'at-least' }, onChain).ok).toBe(false);
    expect(compareClaim({ ...link, slot: 1 }, onChain).ok).toBe(false);
    expect(compareClaim({ ...link, record: 'ee'.repeat(32) }, onChain).ok).toBe(false);
    expect(compareClaim({ ...link, schema: 'veilcore/schema/seed-quality/v1' }, onChain).ok).toBe(false);
    expect(compareClaim({ ...link, kind: 'value', value: '210' }, onChain).ok).toBe(false);
  });

  it('is refused when it names a claims contract that isn’t this site’s', async () => {
    const { link, onChain } = await madeRange();
    const read = () => Promise.resolve({ claim: onChain });
    const verdict = await checkClaim({ ...link, contract: 'dd'.repeat(32) }, { read, contract: CONTRACT });
    expect(verdict.ok).toBe(false);
    expect(!verdict.ok && verdict.reason).toMatch(/isn’t VeilCore’s/);
  });

  it('can’t be read when malformed', () => {
    expect(readClaimLink('')).toBeUndefined();
    expect(readClaimLink('#c=%%')).toBeUndefined();
  });
});
