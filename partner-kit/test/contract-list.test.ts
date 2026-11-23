// The pinned contract list (src/network.ts MAINNET_CONTRACTS): version 1 only, the deployment
// record's contracts, and checkBatchAnchor reading a state by the pinned contract's version.
// Groundwork for contract version 2 (plan 3.6); nothing a caller sees changes today. The
// mainnet answers are the real ones the site's golden tests use
// (bboard-ui/src/veilcore/chain/fixtures/v1-mainnet-anchors.json, recorded 23 Nov 2026).
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/require-await -- the fake indexer stands in for fetch */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAINNET_CLAIMS_ADDRESS, MAINNET_VEILCORE_ADDRESS } from '../../api/src/deploy-guard';
import {
  MAINNET_ADDRESSES,
  MAINNET_CONTRACTS,
  NETWORKS,
  PREPROD_ADDRESSES,
  assertAddressFor,
  pinnedContractFor,
  resolveAddress,
} from '../src/network';
import { checkBatchAnchor } from '../src/verify';

type Deployments = { contracts: { name: string; network: string; address: string }[] };
const deployments = JSON.parse(
  readFileSync(new URL('../../deployments/mainnet.json', import.meta.url), 'utf8'),
) as Deployments;
const recorded = (name: string): string => {
  const c = deployments.contracts.find((x) => x.name === name && x.network === 'mainnet');
  if (c === undefined) throw new Error(`${name} is not in deployments/mainnet.json`);
  return c.address;
};

type Fixture = {
  contract: string;
  transactions: {
    stateLedger: string;
    root: string;
    indexerAnswer: { byHash: { block: { height: number; timestamp: number }; contractActions: unknown[] }[] };
  }[];
};
const fixture = JSON.parse(
  readFileSync(new URL('../../bboard-ui/src/veilcore/chain/fixtures/v1-mainnet-anchors.json', import.meta.url), 'utf8'),
) as Fixture;

const TX = 'ab'.repeat(32);

/** One indexer answering every transaction lookup with `tx`, as mainnet's did. */
const indexerAnswering = (tx: Fixture['transactions'][number]) =>
  vi.stubGlobal('fetch', async () => {
    const t = tx.indexerAnswer.byHash[0];
    return {
      ok: true,
      json: async () => ({
        data: {
          transactions: [
            {
              identifiers: [TX],
              transactionResult: { status: 'SUCCESS' },
              block: t.block,
              contractActions: t.contractActions,
            },
          ],
        },
      }),
    };
  });

afterEach(() => vi.unstubAllGlobals());

describe('the pinned contract list', () => {
  it('holds version 1 only: the deployment record’s main and claims contracts', () => {
    expect(MAINNET_CONTRACTS).toEqual({
      veilcore: [{ version: 'v1', address: recorded('veilcore') }],
      claims: [{ version: 'v1', address: recorded('veilcore-claims') }],
    });
    expect(MAINNET_CONTRACTS.veilcore[0].address).toBe(MAINNET_VEILCORE_ADDRESS);
    expect(MAINNET_CONTRACTS.claims[0].address).toBe(MAINNET_CLAIMS_ADDRESS);
    expect(fixture.contract).toBe(MAINNET_VEILCORE_ADDRESS);
  });

  it('leaves the default and pinned addresses as they were', () => {
    expect(MAINNET_ADDRESSES).toEqual({ veilcore: MAINNET_VEILCORE_ADDRESS, claims: MAINNET_CLAIMS_ADDRESS });
    expect(resolveAddress('mainnet', 'veilcore')).toBe(MAINNET_VEILCORE_ADDRESS);
    expect(resolveAddress('mainnet', 'claims')).toBe(MAINNET_CLAIMS_ADDRESS);
    expect(() => assertAddressFor('mainnet', 'veilcore', 'b2'.repeat(32))).toThrow(
      `Refusing ${'b2'.repeat(32)}: on mainnet the VeilCore contract is ${MAINNET_VEILCORE_ADDRESS} (the deployment record). ` +
        'Another address can carry the same circuits with other state. Nothing was read or sent.',
    );
  });

  it('names the version a state is read as: v1 for the pin, and on development networks', () => {
    expect(pinnedContractFor('mainnet', 'veilcore', `0x${MAINNET_VEILCORE_ADDRESS.toUpperCase()}`)).toEqual({
      version: 'v1',
      address: MAINNET_VEILCORE_ADDRESS,
    });
    for (const n of NETWORKS.filter((x) => x !== 'mainnet'))
      expect(pinnedContractFor(n, 'veilcore', PREPROD_ADDRESSES.veilcore).version).toBe('v1');
    expect(() => pinnedContractFor('mainnet', 'veilcore', 'b2'.repeat(32))).toThrow(/not a pinned contract/);
  });
});

describe('checkBatchAnchor on real mainnet answers (v1, read by its pinned version)', () => {
  for (const tx of fixture.transactions) {
    const block = tx.indexerAnswer.byHash[0].block;
    it(`block ${block.height} (${tx.stateLedger} bytes): its own root is accepted, another refused`, async () => {
      indexerAnswering(tx);
      const base = { network: 'mainnet' as const, indexer: 'http://127.0.0.1:1/', txId: TX };
      const ok = await checkBatchAnchor({ ...base, root: Buffer.from(tx.root, 'hex') });
      expect(ok).toMatchObject({ accepted: true, blockHeight: block.height, blockTime: block.timestamp });
      expect(ok.reason).toBe(
        `the root was timestamped in block ${block.height}, ${new Date(block.timestamp).toISOString()}`,
      );
      const other = Buffer.from(tx.root, 'hex');
      other[0] ^= 1;
      expect(await checkBatchAnchor({ ...base, root: other })).toMatchObject({
        accepted: false,
        reason: 'that transaction timestamped a different root',
      });
    });
  }
});
