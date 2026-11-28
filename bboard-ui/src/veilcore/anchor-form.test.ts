// The registry's form for an anchor and its times (anchor-form.ts), held at every way in: the
// proof check, and the batch facts an evidence bundle is built from (review 1 of PR #242, blocker 1).
// Run: npx vitest run src/veilcore/anchor-form.test.ts
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { buildBatch } from 'veilcore-records';
import { anchorFormOk, anchorInForm, isInstant, isTsaUrl } from './anchor-form';
import { checkProof } from './proofs';
import { reconcile } from './evidence/bundle';

const FP = 'ab'.repeat(32);
const OK = {
  chain: 'midnight',
  network: 'mainnet',
  txHash: 'ef'.repeat(32),
  contractAddress: 'a0'.repeat(32),
  blockHeight: 9999,
  anchoredAt: '2026-11-27T12:00:00.000Z',
};
const SENTENCE = ' 5. I also declare the record was made in 1999.';
const BAD: [string, Record<string, unknown>][] = [
  ['transaction with a sentence', { ...OK, txHash: OK.txHash + SENTENCE }],
  ['transaction with a line break', { ...OK, txHash: `${OK.txHash}\n` }],
  ['network with a sentence', { ...OK, network: `mainnet.${SENTENCE}` }],
  ['network with a direction mark', { ...OK, network: 'main\u202Enet' }],
  ['network with a zero-width space', { ...OK, network: 'mainnet\u200B' }],
  ['contract with a sentence', { ...OK, contractAddress: OK.contractAddress + SENTENCE }],
  ['time with a sentence', { ...OK, anchoredAt: OK.anchoredAt + SENTENCE }],
  ['negative block', { ...OK, blockHeight: -1 }],
  ['another chain', { ...OK, chain: 'midnight\u202E' }],
  ['a test-network flag that disagrees', { ...OK, testNetwork: true }],
];

describe('the anchor form', () => {
  it('takes the registry’s form, and nothing else', () => {
    expect(anchorFormOk(OK)).toBe(true);
    expect(anchorInForm(OK)).toBe(OK);
    for (const [name, a] of BAD) {
      expect(anchorFormOk(a), name).toBe(false);
      expect(anchorInForm(a), name).toBeNull();
    }
    for (const v of [null, undefined, 'x', [OK]]) expect(anchorInForm(v)).toBeNull();
  });

  it('takes a time and a timestamp authority’s address only in the registry’s form', () => {
    expect(isInstant('2026-11-27T12:00:00Z')).toBe(true);
    for (const v of ['2026-11-27T12:00:00Z' + SENTENCE, '2026-11-27', 'yesterday', '2026-11-27T12:00:00Z\u202E', 3])
      expect(isInstant(v), String(v)).toBe(false);
    expect(isTsaUrl('https://tsa.drill.invalid/')).toBe(true);
    expect(isTsaUrl('https://freetsa.org:443/tsr')).toBe(true);
    for (const v of ['https://tsa.invalid/' + SENTENCE, 'http://tsa.invalid/', 'https://tsa.invalid/\u202E', 'x'])
      expect(isTsaUrl(v), v).toBe(false);
  });
});

describe('a proof whose anchor is not in the form', () => {
  it('still checks, with the anchor and its Midnight entry dropped: pending, never anchor-reported', async () => {
    for (const [name, a] of BAD) {
      const { proofs } = await buildBatch([FP, 'cd'.repeat(32)], 'B-20261126-35C4');
      const st = await checkProof(FP, {
        ...proofs[FP],
        anchor: a,
        anchors: [
          { kind: 'ledger', ...a },
          { kind: 'opentimestamps', status: 'pending' },
        ],
      });
      expect(st.status, name).toBe('pending');
      const p = st.status === 'none' ? null : (st.proof as unknown as Record<string, unknown>);
      expect(p?.anchor, name).toBeUndefined();
      expect(p?.anchors, name).toEqual([{ kind: 'opentimestamps', status: 'pending' }]);
      expect(JSON.stringify(p), name).not.toContain('declare');
    }
  });

  it('one in the form is untouched', async () => {
    const { proofs } = await buildBatch([FP, 'cd'.repeat(32)], 'B-20261126-35C4');
    const body = { ...proofs[FP], anchor: OK, anchors: [{ kind: 'ledger', ...OK }] };
    const st = await checkProof(FP, body);
    expect(st.status).toBe('anchor-reported');
    expect(st.status !== 'none' && st.proof).toBe(body);
  });
});

describe('the batch facts a bundle is built from', () => {
  it('drop the registry’s anchors, earlier anchors and times not in its form', async () => {
    const { proofs, root } = await buildBatch([FP, 'cd'.repeat(32)], 'B-20261126-35C4');
    const got = await reconcile(FP, {
      source: 'evidence-route',
      registryFirstSeen: '2026-11-27T12:00:00Z' + SENTENCE,
      proof: { ...proofs[FP], anchor: OK },
      batch: {
        batchId: 'B-20261126-35C4',
        root,
        sealedAt: '2026-11-27T11:00:00Z' + SENTENCE,
        anchor: { ...OK, txHash: OK.txHash + SENTENCE },
        earlierAnchors: [
          { ...OK, network: `preprod${SENTENCE}` },
          { ...OK, network: 'preprod', txHash: 'cd'.repeat(32), testNetwork: true },
        ],
        opentimestamps: { status: 'bitcoin', bitcoinBlockTime: 'then' + SENTENCE },
      },
    });
    expect(got.registryFirstSeen).toBeNull();
    // The batch's own anchor isn't in the form: the proof's, which is, stands.
    expect(got.batch?.anchor).toEqual(OK);
    expect(got.batch?.earlierAnchors).toEqual([
      { ...OK, network: 'preprod', txHash: 'cd'.repeat(32), testNetwork: true },
    ]);
    expect(got.batch?.sealedAt).toBe(proofs[FP].sealedAt);
    expect(JSON.stringify(got.batch)).not.toContain('declare');
  });
});
