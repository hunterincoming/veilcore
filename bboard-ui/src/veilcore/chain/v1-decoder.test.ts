// Golden tests for the pinned v1 decoder (v1-decoder.ts), on real mainnet answers.
//
// fixtures/v1-mainnet-anchors.json holds three real anchorBatch calls on VeilCore's v1 main
// contract, as Midnight's mainnet indexer answered the check page's own query: two made before
// the Ledger 9 fork (state in ledger 8's format) and one after (ledger 9's format). Each must
// decode to the root it wrote, with the pinned decoder alone, and give the same answer as the
// compiled contract read through midnight-js (the way the site read them before), so the two
// paths are known to agree on what the chain holds. Then the whole check runs on each one
// exactly as the indexer answered.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as Ledger8 from '@midnightntwrk/ledger-v8';
import golden from './fixtures/v1-mainnet-anchors.json';
import synthetic from './fixtures/anchor-indexer.json';
import { stateLedgerOf, v1LastBatchRootOf, V1_DECODER_PINS } from './v1-decoder';
import { lastBatchRootOf } from './anchor-decode';
import { checkAnchorOnChain, type AnchorCheckDeps } from './anchor-check';
import { anchorContractsFor } from './config';
import { ledger } from '../../../../contract/src/managed/veilcore/contract/index.js';
import { readContractStateHex } from '../../../../contract/src/contract-state';

type Golden = {
  stateLedger: 'ledger8' | 'ledger9';
  root: string;
  indexerAnswer: {
    byHash: {
      hash: string;
      block: { height: number; timestamp: number };
      contractActions: { address: string; state: string; entryPoint: string }[];
    }[];
    byId: unknown[];
  };
};
const TXS = golden.transactions as Golden[];
const stateOf = (g: Golden) => g.indexerAnswer.byHash[0].contractActions[0].state;
const hexBytes = (h: string) => Uint8Array.from(Buffer.from(h, 'hex'));
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('the golden fixture', () => {
  it('is real v1 anchorBatch calls on the pinned mainnet contract, from both sides of the fork', () => {
    expect(golden.network).toBe('mainnet');
    expect(golden.contract).toBe(anchorContractsFor('mainnet', golden.contract, undefined)[0].address);
    const deployment = JSON.parse(read('../../../../deployments/mainnet.json')) as {
      contracts: { name: string; address: string }[];
    };
    expect(deployment.contracts.find((c) => c.name === 'veilcore')?.address).toBe(golden.contract);
    expect(TXS.map((g) => g.stateLedger)).toEqual(['ledger8', 'ledger8', 'ledger9']);
    for (const g of TXS) {
      const [tx] = g.indexerAnswer.byHash;
      expect(g.indexerAnswer.byHash).toHaveLength(1);
      expect(tx.contractActions).toHaveLength(1);
      expect(tx.contractActions[0]).toMatchObject({ address: golden.contract, entryPoint: 'anchorBatch' });
    }
    // The first is the batch whose root the Bitcoin stamp check of 11 October records.
    expect(read('../../../../docs/bitcoin-stamp-check-11oct.md')).toContain(TXS[0].root);
  });
});

describe('v1LastBatchRootOf, on real mainnet states', () => {
  it.each(TXS.map((g) => [g.indexerAnswer.byHash[0].hash.slice(0, 12), g] as const))(
    '%s: the root that call wrote, read with the pinned ledger alone',
    (_tx, g) => {
      expect(stateLedgerOf(hexBytes(stateOf(g)))).toBe(g.stateLedger);
      expect(v1LastBatchRootOf(stateOf(g))).toBe(g.root);
      expect(v1LastBatchRootOf(`0x${stateOf(g).toUpperCase()}`)).toBe(g.root);
      expect(lastBatchRootOf(stateOf(g), 'v1')).toBe(g.root);
    },
  );

  it('agrees with the compiled contract read through midnight-js, on every golden state', () => {
    for (const g of TXS) {
      const viaCompiled = Buffer.from(ledger(readContractStateHex(stateOf(g)).data).lastBatchRoot).toString('hex');
      expect(viaCompiled).toBe(g.root);
    }
    // And on the synthetic states the other tests and the browser tests use.
    expect(v1LastBatchRootOf(synthetic.stateHex)).toBe(synthetic.root);
    expect(v1LastBatchRootOf(synthetic.otherStateHex)).toBe(synthetic.otherRoot);
  });

  it('pads a root whose last bytes are zero back to 32 bytes, as the Compact runtime does', () => {
    const v = Ledger8.StateValue.newArray()
      .arrayPush(Ledger8.StateValue.newNull())
      .arrayPush(
        Ledger8.StateValue.newArray().arrayPush(
          Ledger8.StateValue.newCell({
            value: [Uint8Array.from([0xab, 0xcd])],
            alignment: [{ tag: 'atom', value: { tag: 'bytes', length: 32 } }],
          }),
        ),
      );
    const s = new Ledger8.ContractState();
    s.data = new Ledger8.ChargedState(v);
    expect(v1LastBatchRootOf(Buffer.from(s.serialize()).toString('hex'))).toBe(`abcd${'00'.repeat(30)}`);
  });

  it('refuses anything that is not a v1 state, and never returns a guess', () => {
    const real = stateOf(TXS[0]);
    const blank = Buffer.from(new Ledger8.ContractState().serialize()).toString('hex');
    const wrongCell = (() => {
      const s = new Ledger8.ContractState();
      s.data = new Ledger8.ChargedState(
        Ledger8.StateValue.newArray()
          .arrayPush(Ledger8.StateValue.newNull())
          .arrayPush(
            Ledger8.StateValue.newArray().arrayPush(
              Ledger8.StateValue.newCell({
                value: [Uint8Array.from([1])],
                alignment: [{ tag: 'atom', value: { tag: 'field' } }],
              }),
            ),
          ),
      );
      return Buffer.from(s.serialize()).toString('hex');
    })();
    // A tag from no ledger this decoder knows (format v7), on otherwise real bytes.
    const otherTag = Buffer.from(real, 'hex');
    otherTag[otherTag.indexOf(Buffer.from('[v6]')) + 2] = '7'.charCodeAt(0);
    for (const bad of [
      '',
      'zz',
      'abc',
      real.slice(0, real.length / 2),
      blank,
      wrongCell,
      otherTag.toString('hex'),
      Buffer.from('midnight:transaction[v12]:').toString('hex') + real.slice(56),
    ])
      expect(() => v1LastBatchRootOf(bad), bad.slice(0, 40)).toThrow();
  });
});

describe('the check page, on the real indexer answers', () => {
  const deps = (answer: Golden['indexerAnswer']): AnchorCheckDeps => ({
    buildNetwork: 'mainnet',
    indexers: ['https://relay.example/indexer'],
    fetch: () => Promise.resolve(new Response(JSON.stringify({ data: answer }))),
  });
  const contracts = anchorContractsFor('mainnet', golden.contract, undefined);

  it.each(TXS.map((g) => [g.indexerAnswer.byHash[0].hash.slice(0, 12), g] as const))(
    '%s: checked, with the real block, using the default (pinned) decoder',
    async (_tx, g) => {
      const [tx] = g.indexerAnswer.byHash;
      expect(
        await checkAnchorOnChain(
          { network: 'mainnet', txId: tx.hash, contracts, expectedRoot: g.root },
          deps(g.indexerAnswer),
        ),
      ).toEqual({
        status: 'checked',
        txHash: tx.hash,
        blockHeight: tx.block.height,
        blockTime: tx.block.timestamp,
        indexers: 1,
      });
      // Another batch's root is refused against the same transaction.
      const other = TXS.find((o) => o !== g)!.root;
      expect(
        await checkAnchorOnChain(
          { network: 'mainnet', txId: tx.hash, contracts, expectedRoot: other },
          deps(g.indexerAnswer),
        ),
      ).toMatchObject({ status: 'failed' });
      // A call on a contract that is not pinned is refused, whatever its state says.
      expect(
        await checkAnchorOnChain(
          {
            network: 'mainnet',
            txId: tx.hash,
            contracts: [{ version: 'v1', address: 'ee'.repeat(32) }],
            expectedRoot: g.root,
          },
          deps(g.indexerAnswer),
        ),
      ).toMatchObject({ status: 'failed', reason: 'that transaction made no call on VeilCore’s contract' });
    },
  );
});

describe('the pins', () => {
  it('imports only the two pinned ledger packages: no midnight-js, no Compact runtime, no compiled contract', () => {
    const src = read('./v1-decoder.ts');
    const imports = [...src.matchAll(/^\s*(?:import|export)\s[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1]);
    expect(imports).toEqual(['@midnightntwrk/ledger-v8', '@midnightntwrk/ledger-v9']);
    expect(src).not.toMatch(/import\s*\(/);
    // anchor-decode.ts (what the check page loads) reaches the chain only through it.
    const decode = read('./anchor-decode.ts');
    expect(decode).not.toMatch(/midnight-js|compact-runtime|contract\/src/);
  });

  it('are exact, the same in package.json and the lockfile, and installed', () => {
    const pkg = JSON.parse(read('../../../package.json')) as { dependencies: Record<string, string> };
    const lock = JSON.parse(read('../../../../package-lock.json')) as {
      packages: Record<string, { version?: string }>;
    };
    for (const [name, version] of Object.entries(V1_DECODER_PINS)) {
      expect(pkg.dependencies[name], name).toBe(version);
      expect(lock.packages[`node_modules/${name}`]?.version, name).toBe(version);
      const installed = JSON.parse(
        readFileSync(new URL(`../../../../node_modules/${name}/package.json`, import.meta.url), 'utf8'),
      ) as { version: string };
      expect(installed.version, name).toBe(version);
    }
  });
});
