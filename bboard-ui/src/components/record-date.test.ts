// A record's date: one look-up on Midnight for the plant page's status card, its "Date on
// Midnight" section, its History and the check page (chain/anchor-lookup.ts,
// verify/useAnchorCheck.ts), and the status card's words for each answer.
// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import type { InclusionProof } from 'veilcore-records';
import { forgetAnchorLookups, lookUpAnchor } from '../veilcore/chain/anchor-lookup';
import type { AnchorCheckDeps } from '../veilcore/chain/anchor-check';
import { recordDateRow } from './flow/plant-status-words';
import type { ProofState } from '../veilcore/proofs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TX = 'e1'.repeat(32);
const ROOT = 'b5'.repeat(32);
const PINNED = 'c0'.repeat(32);
const REGISTRY_NAMED = 'ee'.repeat(32);
const BLOCK_MS = Date.UTC(2026, 9, 11, 14, 3, 7);

const proof = (over: Partial<InclusionProof['anchor'] & object> = {}): InclusionProof =>
  ({
    commitment: 'aa'.repeat(32),
    root: ROOT,
    batchId: 'B-1',
    path: [],
    anchor: {
      chain: 'midnight',
      network: 'preprod',
      txHash: TX,
      contractAddress: REGISTRY_NAMED,
      anchoredAt: '2026-10-11T14:00:00.000Z',
      ...over,
    },
  }) as unknown as InclusionProof;

/** A stand-in indexer: the anchor transaction on `contract`, or an error. */
const indexer = (contract: string, fail = false) => {
  const asked: string[] = [];
  const f = ((url: string) => {
    asked.push(url);
    if (fail) return Promise.reject(new TypeError('Failed to fetch'));
    return Promise.resolve(
      new Response(
        JSON.stringify({
          data: {
            byHash: [
              {
                hash: TX,
                block: { height: 77, timestamp: BLOCK_MS },
                identifiers: [],
                transactionResult: { status: 'SUCCESS' },
                contractActions: [{ address: contract, state: 'ab', entryPoint: 'anchorBatch' }],
              },
            ],
            byId: [],
          },
        }),
      ),
    );
  }) as unknown as typeof fetch;
  return { fetch: f, asked };
};
const deps = (i: ReturnType<typeof indexer>): AnchorCheckDeps => ({
  buildNetwork: 'preprod',
  indexers: ['https://relay.example/indexer'],
  fetch: i.fetch,
  rootOf: () => ROOT,
});

beforeEach(() => forgetAnchorLookups());

describe('lookUpAnchor: the one look-up every page shares', () => {
  it('checks against the contract this build pins, never the one the registry names', async () => {
    const atPinned = indexer(PINNED);
    expect(await lookUpAnchor(proof(), deps(atPinned), PINNED)).toMatchObject({ status: 'checked', blockHeight: 77 });
    forgetAnchorLookups();
    // The registry names REGISTRY_NAMED and the transaction did call it: still refused.
    const atNamed = indexer(REGISTRY_NAMED);
    expect(await lookUpAnchor(proof(), deps(atNamed), PINNED)).toMatchObject({ status: 'failed' });
  });

  it('asks once for parts of a page asking together, and keeps a definite answer', async () => {
    const i = indexer(PINNED);
    const d = deps(i);
    const [a, b] = await Promise.all([lookUpAnchor(proof(), d, PINNED), lookUpAnchor(proof(), d, PINNED)]);
    expect(a).toEqual(b);
    await lookUpAnchor(proof(), d, PINNED);
    expect(i.asked).toHaveLength(1);
  });

  it('does not keep “couldn’t reach Midnight”: the next look tries again', async () => {
    const down = indexer(PINNED, true);
    const d = deps(down);
    expect(await lookUpAnchor(proof(), d, PINNED)).toMatchObject({ status: 'unreachable' });
    await lookUpAnchor(proof(), d, PINNED);
    expect(down.asked).toHaveLength(2);
  });

  it('nothing to look up without a transaction', () => {
    expect(lookUpAnchor(proof({ txHash: undefined }), deps(indexer(PINNED)), PINNED)).toBeUndefined();
  });
});

describe('the plant page’s “Record dated” line', () => {
  const reported: ProofState = { status: 'anchor-reported', proof: proof() };
  const checked = { status: 'checked', txHash: TX, blockHeight: 77, blockTime: BLOCK_MS, indexers: 1 } as const;

  it('✓ only when checked on Midnight, dated by the block', () => {
    expect(recordDateRow(reported, checked)).toEqual({
      mark: 'done',
      value: '2026-10-11 UTC — checked on Midnight',
      sub: 'On a test network: practice data, not a real date.',
    });
    const main: ProofState = { status: 'anchor-reported', proof: proof({ network: 'mainnet' }) };
    expect(recordDateRow(main, checked)).toEqual({ mark: 'done', value: '2026-10-11 UTC — checked on Midnight' });
  });

  it('○ the registry’s report while checking, unreachable or not looked up: never a tick', () => {
    for (const a of ['checking', { status: 'unreachable', reason: 'x' }, undefined] as const) {
      const row = recordDateRow(reported, a);
      expect(row.mark).toBe('reported');
      expect(row.value).toBe('2026-10-11 UTC (VeilCore’s registry’s report)');
      expect(row.sub).toMatch(/On a test network: practice data/);
    }
    expect(recordDateRow(reported, 'checking').sub).toMatch(/^Looking it up on Midnight…/);
    expect(recordDateRow(reported, { status: 'unreachable', reason: 'x' }).sub).toMatch(
      /^Couldn’t reach Midnight to check it\./,
    );
    const noDate: ProofState = { status: 'anchor-reported', proof: proof({ anchoredAt: undefined }) };
    expect(recordDateRow(noDate, undefined).value).toBe('date not given (VeilCore’s registry’s report)');
  });

  it('⊗ when Midnight contradicts the registry', () => {
    const row = recordDateRow(reported, { status: 'failed', reason: 'that transaction wrote a different batch root' });
    expect(row).toEqual({
      mark: 'failed',
      value: 'date stamp not confirmed on Midnight',
      sub: 'That transaction wrote a different batch root. Don’t rely on the date the registry reports.',
    });
  });

  it('not batched, or batched without a date stamp: waiting', () => {
    expect(recordDateRow({ status: 'none' }, undefined)).toEqual({ mark: 'wait', value: 'waiting for a batch' });
    expect(recordDateRow({ status: 'pending', proof: proof() }, undefined).mark).toBe('wait');
    expect(recordDateRow('checking', undefined).mark).toBe('wait');
  });
});

describe('every page reads the same answer', () => {
  const read = (p: string) => fs.readFileSync(path.join(HERE, p), 'utf8');
  it('the plant page’s card, its Date on Midnight section and its History use useRecordDate', () => {
    for (const f of ['flow/PlantParts.tsx', 'SettlementStatus.tsx', 'RecordHistory.tsx']) {
      const src = read(f);
      expect(src, f).toMatch(/useRecordDate\(record\.recordFingerprint\)/);
      expect(src, f).not.toMatch(/checkAnchorOnChain|proofFor\(/);
    }
    expect(read('flow/PlantParts.tsx')).toMatch(/recordDateRow\(proof, anchor\)/);
    expect(read('RecordHistory.tsx')).toMatch(/anchorHistoryEvent\(anchor,/);
  });
  it('the check page uses the same look-up on its own proof', () => {
    const src = read('../pages/VerifyPage.tsx');
    expect(src).toMatch(/useAnchorCheck\(proof\)/);
    expect(src).not.toMatch(/checkAnchorOnChain/);
  });
});
