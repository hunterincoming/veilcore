// The check page with contract version 2 pinned on a made-up address (docs/contract-v2.md 3.1,
// rule 10), pinned the way the real pin will be: an entry added to deployments/mainnet.json.
//
// fixtures/v2-anchor-fixture.json is v2's compiled ledger data after one anchorBatch, inside a
// real ledger 9 state (contract-v2/src/test/checker-fixture.test.ts rebuilds it from v2's build
// and fails if it differs). fixtures/v1-mainnet-anchors.json is real v1 mainnet answers.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import golden from './fixtures/v1-mainnet-anchors.json';
import v2 from './fixtures/v2-anchor-fixture.json';
import { v2LastBatchRootOf } from './v2-decoder';
import { v1LastBatchRootOf } from './v1-decoder';
import { lastBatchRootOf } from './anchor-decode';
import { checkAnchorOnChain, type AnchorCheck, type AnchorCheckDeps } from './anchor-check';
import { anchorContractsFor, countedContractsFor } from './config';
import { anchorLine } from '../../components/verify/anchor-words';
import { PREPROD_PINNED, pinnedContractsFrom } from '../../../../api/src/pinned-contracts';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const V1 = golden.contract;
const V2 = v2.contract;
const v1Tx = golden.transactions.find((t) => t.stateLedger === 'ledger9')!;
const V1_STATE = v1Tx.indexerAnswer.byHash[0].contractActions[0].state;
const TX = 'ab'.repeat(32);
const BLOCK_MS = Date.UTC(2026, 11, 1, 12, 0, 0);

const fullJson = JSON.parse(read('../../../../deployments/mainnet.json')) as {
  contracts: Record<string, unknown>[];
};
/** deployments/mainnet.json with its version 1 entries only, as it was before v2's pin. */
const mainnetJson = { ...fullJson, contracts: fullJson.contracts.filter((c) => (c.contractVersion ?? 1) === 1) };
const v1Alone = { mainnet: pinnedContractsFrom(mainnetJson), preprod: PREPROD_PINNED };
/** Version 1, with a fixture version 2 main contract pinned the way the real pin adds it. */
const withV2 = () => ({
  ...mainnetJson,
  contracts: [
    ...mainnetJson.contracts,
    {
      ...(mainnetJson.contracts.find((c) => c.name === 'veilcore') as Record<string, unknown>),
      contractVersion: 2,
      source: 'contract-v2/src/veilcore.compact',
      address: V2,
      keyStates: [
        {
          retired: false,
          committee: 1,
          threshold: 1,
          counter: 16,
          block: 3600000,
          label: 'one key, not yet handed to the committee',
        },
      ],
    },
  ],
});
const pinnedBoth = { mainnet: pinnedContractsFrom(withV2()), preprod: PREPROD_PINNED };
const contracts = anchorContractsFor('mainnet', V1, undefined, undefined, pinnedBoth);

const deps = (actions: { address: string; state: string; entryPoint: string }[]): AnchorCheckDeps => ({
  buildNetwork: 'mainnet',
  indexers: ['https://relay.example/indexer'],
  fetch: () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          data: {
            byHash: [
              {
                hash: TX,
                block: { height: 3600100, timestamp: BLOCK_MS },
                identifiers: [],
                transactionResult: { status: 'SUCCESS' },
                contractActions: actions,
              },
            ],
            byId: [],
          },
        }),
      ),
    ),
});
const check = (actions: Parameters<typeof deps>[0], root: string) =>
  checkAnchorOnChain(
    {
      network: 'mainnet',
      txId: TX,
      contracts,
      counted: countedContractsFor('mainnet', contracts, pinnedBoth),
      expectedRoot: root,
    },
    deps(actions),
  );

describe('v2LastBatchRootOf', () => {
  it('reads the root v2’s compiled contract wrote, from ledger 9 bytes', () => {
    expect(v2.stateLedger).toBe('ledger9');
    expect(v2LastBatchRootOf(v2.stateHex)).toBe(v2.root);
    expect(v2LastBatchRootOf(`0x${v2.stateHex.toUpperCase()}`)).toBe(v2.root);
    expect(lastBatchRootOf(v2.stateHex, 'v2')).toBe(v2.root);
  });

  it('refuses a v1 state (its first ledger group holds 12 fields, not 14) and ledger 8 bytes', () => {
    expect(() => v2LastBatchRootOf(V1_STATE)).toThrow('Not VeilCore version 2’s ledger layout.');
    const ledger8 = golden.transactions.find((t) => t.stateLedger === 'ledger8')!;
    expect(() => v2LastBatchRootOf(ledger8.indexerAnswer.byHash[0].contractActions[0].state)).toThrow(
      /Not a ledger 9 contract state/,
    );
    for (const bad of ['', 'zz', v2.stateHex.slice(0, v2.stateHex.length / 2)])
      expect(() => v2LastBatchRootOf(bad)).toThrow();
  });

  it('is never chosen by the bytes: v1’s decoder reads v1 states, v2’s reads v2’s', () => {
    expect(v1LastBatchRootOf(V1_STATE)).toBe(v1Tx.root);
    expect(() => lastBatchRootOf(V1_STATE, 'v2')).toThrow();
  });

  it('imports only ledger-v9, the shared layout reader and the era tag', () => {
    const src = read('./v2-decoder.ts');
    const imports = [...src.matchAll(/^\s*(?:import|export)\s[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1]);
    expect(imports).toEqual(['@midnightntwrk/ledger-v9', '../../../../api/src/batch-root-layout', './v1-decoder']);
    expect(read('../../../../api/src/batch-root-layout.ts')).not.toMatch(/^import /m);
  });
});

describe('the check page with version 2 pinned in deployments/mainnet.json', () => {
  it('the list: both, oldest first, from the deployments file', () => {
    const plain = (l: typeof contracts) => l.map(({ version, address }) => ({ version, address }));
    expect(plain(contracts)).toEqual([
      { version: 'v1', address: V1 },
      { version: 'v2', address: V2 },
    ]);
    // Each with its own entry's key states: v2's as published, never v1's.
    expect(contracts[1].keyStates?.map((k) => k.label)).toEqual(['one key, not yet handed to the committee']);
    // Version 1 alone, as before the pin.
    expect(plain(anchorContractsFor('mainnet', V1, undefined, undefined, v1Alone))).toEqual([{ version: 'v1', address: V1 }]);
    // The real file since the pin (25 November 2026): v1, then v2 main at its pinned address.
    const real = fullJson.contracts.find((c) => c.name === 'veilcore' && c.contractVersion === 2)!.address as string;
    expect(plain(anchorContractsFor('mainnet', V1, undefined))).toEqual([
      { version: 'v1', address: V1 },
      { version: 'v2', address: real },
    ]);
  });

  it('a v2 batch: checked, from v2, and the page says so', async () => {
    const r = await check([{ address: V2, state: v2.stateHex, entryPoint: 'anchorBatch' }], v2.root);
    expect(r).toEqual({
      status: 'checked',
      txHash: TX,
      blockHeight: 3600100,
      blockTime: BLOCK_MS,
      indexers: 1,
      contract: { version: 'v2', address: V2 },
      nameContract: true,
      keyState: expect.objectContaining({ label: 'one key, not yet handed to the committee' }) as unknown,
    });
    expect(anchorLine(r, { network: 'mainnet', bound: true })?.text).toContain(
      ' VeilCore contract version 2 gave this date. Who can change that contract: one key, not yet handed to the committee.',
    );
  });

  it('a v1 batch: still checked by v1’s decoder, and now named version 1', async () => {
    const r = await check([{ address: V1, state: V1_STATE, entryPoint: 'anchorBatch' }], v1Tx.root);
    expect(r).toMatchObject({ status: 'checked', contract: { version: 'v1', address: V1 }, nameContract: true });
    expect(anchorLine(r, { network: 'mainnet', bound: true })?.text).toContain(
      ' VeilCore contract version 1 gave this date.',
    );
  });

  it('with v1 alone pinned, the line reads as it always has', async () => {
    const r = await checkAnchorOnChain(
      {
        network: 'mainnet',
        txId: TX,
        contracts: anchorContractsFor('mainnet', V1, undefined, undefined, v1Alone),
        counted: countedContractsFor('mainnet', anchorContractsFor('mainnet', V1, undefined, undefined, v1Alone)),
        expectedRoot: v1Tx.root,
      },
      deps([{ address: V1, state: V1_STATE, entryPoint: 'anchorBatch' }]),
    );
    const text = anchorLine(r, { network: 'mainnet', bound: true })?.text ?? '';
    expect(text).not.toMatch(/contract version/);
    expect(text).toMatch(/^Checked on Midnight: this batch root was written by transaction/);
  });

  it('REFUSED: a transaction with calls on both contracts, and v1 bytes at the v2 address', async () => {
    expect(
      await check(
        [
          { address: V1, state: V1_STATE, entryPoint: 'anchorBatch' },
          { address: V2, state: v2.stateHex, entryPoint: 'anchorBatch' },
        ],
        v2.root,
      ),
    ).toMatchObject({ status: 'failed', reason: 'that transaction made more than one call on VeilCore’s contract' });
    expect(await check([{ address: V2, state: V1_STATE, entryPoint: 'anchorBatch' }], v1Tx.root)).toMatchObject({
      status: 'failed',
      reason: 'the contract state after that call could not be read as VeilCore’s',
    });
  });

  it('REFUSED: v2’s state at an address that is not pinned, whatever its version fields say', async () => {
    const r: AnchorCheck = await check(
      [{ address: 'f3'.repeat(32), state: v2.stateHex, entryPoint: 'anchorBatch' }],
      v2.root,
    );
    expect(r).toMatchObject({ status: 'failed', reason: 'that transaction made no call on VeilCore’s contract' });
  });
});
