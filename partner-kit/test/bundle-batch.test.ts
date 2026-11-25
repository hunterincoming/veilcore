// What an evidence bundle's proof/check-on-midnight.mjs does (bboard-ui evidence/bundle.ts,
// checkScriptFor): checkBatchAnchor on mainnet with the transaction HASH the registry recorded.
// Run here on real mainnet answers (bboard-ui chain/fixtures/v1-mainnet-anchors.json): two
// batches from before Midnight's Ledger 9 fork (6 Nov 2026) and one after, whose state is in
// Ledger 9's format. The fake indexer answers only what a real one does: nothing for a hash
// asked as an identifier, the transaction for its hash.
//
// Before this, every published kit (0.2.0, 0.3.0) failed both ways: the lookup asked only by
// identifier ("No such transaction." for every bundle), and 0.2.0/0.3.0 read only Ledger 8 states.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAINNET_ADDRESSES, checkBatchAnchor } from '../src/index.js';

type Tx = {
  hash: string;
  identifiers: string[];
  block: { height: number; timestamp: number };
  contractActions: { address: string; state: string; entryPoint: string }[];
};
const golden = JSON.parse(
  readFileSync(new URL('../../bboard-ui/src/veilcore/chain/fixtures/v1-mainnet-anchors.json', import.meta.url), 'utf8'),
) as { contract: string; transactions: { stateLedger: string; root: string; indexerAnswer: { byHash: Tx[] } }[] };

const INDEXER = 'http://127.0.0.1:1/';

/** A fake mainnet indexer holding these real transactions, looked up as a real one looks them up. */
const indexerWith = (txs: Tx[]) => {
  const asked: string[] = [];
  vi.stubGlobal('fetch', (_url: string, init?: { body?: string }) => {
    const { offset } = (
      JSON.parse(init?.body ?? '{}') as { variables: { offset: { hash?: string; identifier?: string } } }
    ).variables;
    asked.push(offset.hash !== undefined ? 'hash' : 'identifier');
    const found = txs.filter((t) =>
      offset.hash !== undefined ? t.hash === offset.hash : t.identifiers.includes(offset.identifier ?? ''),
    );
    const transactions = found.map((t) => ({ ...t, transactionResult: { status: 'SUCCESS' } }));
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { transactions } }) });
  });
  return asked;
};

afterEach(() => vi.unstubAllGlobals());

describe("an evidence bundle's check, on real mainnet batches", () => {
  it('the fixture is the pinned v1 contract, with a batch from after the Ledger 9 fork', () => {
    expect(golden.contract).toBe(MAINNET_ADDRESSES.veilcore);
    expect(golden.transactions.map((t) => t.stateLedger)).toEqual(['ledger8', 'ledger8', 'ledger9']);
  });

  it.each(golden.transactions.map((t) => [t.stateLedger, t.indexerAnswer.byHash[0].hash.slice(0, 12), t] as const))(
    '%s batch %s, named by its hash: accepted, with its block',
    async (_era, _short, t) => {
      const tx = t.indexerAnswer.byHash[0];
      const asked = indexerWith([tx]);
      const v = await checkBatchAnchor({
        network: 'mainnet',
        indexer: INDEXER,
        txId: tx.hash,
        root: Buffer.from(t.root, 'hex'),
      });
      expect(v.reason).toMatch(/the root was timestamped/);
      expect(v.accepted).toBe(true);
      expect(v.blockHeight).toBe(tx.block.height);
      expect(asked).toEqual(['identifier', 'hash']);
    },
  );

  it('the post-fork batch with a different root: not accepted', async () => {
    const t = golden.transactions[2];
    indexerWith([t.indexerAnswer.byHash[0]]);
    const v = await checkBatchAnchor({
      network: 'mainnet',
      indexer: INDEXER,
      txId: t.indexerAnswer.byHash[0].hash,
      root: Buffer.alloc(32, 7),
    });
    expect(v.accepted).toBe(false);
    expect(v.reason).toMatch(/different root/);
  });
});

// If VeilCore disappears (docs/offline.md, "If VeilCore is gone"): the bundle's script names no
// indexer, only a Blockfrost project id, so the check asks Midnight's public indexer and nothing
// of VeilCore's. Every address it asks for is recorded; a VeilCore host is refused, as if gone.
describe('the check needs Midnight, not VeilCore', () => {
  const VEILCORE_HOST = /(^|\.)veilcore\.org$|^veilcore-[a-z0-9-]*\.up\.railway\.app$/;

  it.each(golden.transactions.map((t) => [t.stateLedger, t.indexerAnswer.byHash[0].hash.slice(0, 12), t] as const))(
    '%s batch %s, as check-on-midnight.mjs calls it: only Blockfrost is asked',
    async (_era, _short, t) => {
      const tx = t.indexerAnswer.byHash[0];
      const hosts: string[] = [];
      vi.stubGlobal('fetch', (url: string, init?: { body?: string }) => {
        const host = new URL(url).hostname;
        hosts.push(host);
        if (VEILCORE_HOST.test(host)) return Promise.reject(new TypeError(`${host} is gone`));
        const { offset } = (
          JSON.parse(init?.body ?? '{}') as { variables: { offset: { hash?: string; identifier?: string } } }
        ).variables;
        const transactions = (offset.hash === tx.hash ? [tx] : []).map((x) => ({
          ...x,
          transactionResult: { status: 'SUCCESS' },
        }));
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { transactions } }) });
      });
      // Exactly the call the bundle's proof/check-on-midnight.mjs makes (bboard-ui evidence/bundle.ts checkScriptFor).
      const v = await checkBatchAnchor({
        network: 'mainnet',
        blockfrostProjectId: 'mainnetTestProject1',
        txId: tx.hash,
        root: Buffer.from(t.root, 'hex'),
      });
      expect(v.accepted).toBe(true);
      expect(v.blockHeight).toBe(tx.block.height);
      expect(hosts.length).toBeGreaterThan(0);
      expect([...new Set(hosts)]).toEqual(['midnight-mainnet.blockfrost.io']);
    },
  );
});
