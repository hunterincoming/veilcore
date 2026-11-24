// Rule 10 (docs/contract-v2.md 3.1): checking batch dates across VeilCore's pinned contracts, with
// version 2 pinned on a made-up address. The pin is made exactly as the real one will be: an entry
// added to deployments/mainnet.json ("contractVersion": 2, its circuits, its keyStates), read by
// api/src/pinned-contracts.ts. Nothing else changes.
//
// The v2 state is bboard-ui/src/veilcore/chain/fixtures/v2-anchor-fixture.json: v2's compiled
// ledger data after one anchorBatch, inside a real ledger 9 state of v1 (whose verifier keys stand
// in as the fake entry's table; contract-v2/src/test/checker-fixture.test.ts rebuilds it). The v1
// transactions are real mainnet answers (v1-mainnet-anchors.json).
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/require-await -- the fake indexer stands in for fetch */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

type Action = { address: string; state: string; entryPoint: string };
type Tx = {
  hash: string;
  identifiers: string[];
  block: { height: number; timestamp: number };
  contractActions: Action[];
};

const v1Golden = JSON.parse(
  readFileSync(new URL('../../bboard-ui/src/veilcore/chain/fixtures/v1-mainnet-anchors.json', import.meta.url), 'utf8'),
) as { contract: string; transactions: { stateLedger: string; root: string; indexerAnswer: { byHash: Tx[] } }[] };
const v2Fixture = JSON.parse(
  readFileSync(new URL('../../bboard-ui/src/veilcore/chain/fixtures/v2-anchor-fixture.json', import.meta.url), 'utf8'),
) as { contract: string; root: string; stateHex: string };
const mainnetJson = JSON.parse(readFileSync(new URL('../../deployments/mainnet.json', import.meta.url), 'utf8')) as {
  contracts: Record<string, unknown>[];
};

const V1 = v1Golden.contract;
const V2 = v2Fixture.contract;
const v1Batch = v1Golden.transactions.find((t) => t.stateLedger === 'ledger9');
if (v1Batch === undefined) throw new Error('no ledger 9 batch in the v1 fixture');
const V1_STATE = v1Batch.indexerAnswer.byHash[0].contractActions[0].state;
const INDEXER = 'http://127.0.0.1:1/';
const TX = 'ab'.repeat(32);
const TEMP_KEY = 'one key, not yet handed to the committee';

/** deployments/mainnet.json with version 2's main contract pinned, as the pin will add it. */
const withV2 = (over: Record<string, unknown> = {}) => {
  const v1 = mainnetJson.contracts.find((c) => c.name === 'veilcore') as Record<string, unknown>;
  return {
    ...mainnetJson,
    contracts: [
      ...mainnetJson.contracts,
      {
        ...v1,
        contractVersion: 2,
        source: 'contract-v2/src/veilcore.compact',
        address: V2,
        keyStates: [{ retired: false, committee: 1, threshold: 1, counter: 16, block: 3600000, label: TEMP_KEY }],
        ...over,
      },
    ],
  };
};

/** The kit, loaded with `deployments` as mainnet's pinned list (undefined: the real file). */
const kit = async (deployments?: unknown) => {
  vi.resetModules();
  vi.doUnmock('../../api/src/pinned-contracts.js');
  if (deployments !== undefined)
    vi.doMock('../../api/src/pinned-contracts.js', async (orig) => {
      const o = await orig<typeof import('../../api/src/pinned-contracts.js')>();
      return { ...o, MAINNET_PINNED: o.pinnedContractsFrom(deployments) };
    });
  return {
    verify: await import('../src/verify'),
    network: await import('../src/network'),
  };
};

/** A fake indexer whose one transaction makes these calls. */
const indexer = (actions: Action[], height = 3600100) =>
  vi.stubGlobal('fetch', async (_url: string, init?: { body?: string }) => {
    const { offset } = (JSON.parse(init?.body ?? '{}') as { variables: { offset: { hash?: string } } }).variables;
    const transactions =
      offset.hash === TX
        ? [
            {
              hash: TX,
              identifiers: [],
              block: { height, timestamp: 1_795_000_000_000 },
              transactionResult: { status: 'SUCCESS' },
              contractActions: actions,
            },
          ]
        : [];
    return { ok: true, json: async () => ({ data: { transactions } }) };
  });

const call = (address: string, state: string, entryPoint = 'anchorBatch'): Action => ({ address, state, entryPoint });
const hexRoot = (h: string) => Buffer.from(h, 'hex');
const base = { network: 'mainnet' as const, indexer: INDEXER, txId: TX };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock('../../api/src/pinned-contracts.js');
  vi.resetModules();
});

describe('today (v1 only): unchanged', () => {
  it('one pinned main contract, the default; a batch reads as it always has, now naming its contract', async () => {
    const { verify, network } = await kit();
    expect(network.MAINNET_CONTRACTS.veilcore).toEqual([{ version: 'v1', address: V1 }]);
    indexer([call(V1, V1_STATE)]);
    const v = await verify.checkBatchAnchor({ ...base, root: hexRoot(v1Batch.root) });
    expect(v.accepted).toBe(true);
    expect(v.reason).toBe(`the root was timestamped in block 3600100, ${new Date(1_795_000_000_000).toISOString()}`);
    expect(v.contract).toEqual({ version: 'v1', address: V1, name: 'VeilCore contract version 1' });
    expect(v.keyState).toBe('one key, counter 16');
  });

  it('a v1 state whose authority is in none of its published key states is refused', async () => {
    // Pin v1 at a counter its state is not in.
    const moved = {
      ...mainnetJson,
      contracts: mainnetJson.contracts.map((c) =>
        c.name === 'veilcore'
          ? { ...c, keyStates: [{ retired: false, committee: 1, threshold: 1, counter: 17, block: null, label: 'x' }] }
          : c,
      ),
    };
    const { verify: strict } = await kit(moved);
    indexer([call(V1, V1_STATE)]);
    const v = await strict.checkBatchAnchor({ ...base, root: hexRoot(v1Batch.root) });
    expect(v.accepted).toBe(false);
    expect(v.reason).toMatch(/in none of the states published for it \(x\)/);
  });
});

describe('with version 2 pinned in deployments/mainnet.json', () => {
  it('both are on the list, oldest first; the default and the write address stay version 1', async () => {
    const { network } = await kit(withV2());
    expect(network.MAINNET_CONTRACTS.veilcore).toEqual([
      { version: 'v1', address: V1 },
      { version: 'v2', address: V2 },
    ]);
    expect(network.MAINNET_ADDRESSES.veilcore).toBe(V1);
    expect(network.resolveAddress('mainnet', 'veilcore', V2)).toBe(V2);
    expect(network.resolveWriteAddress('mainnet', 'veilcore')).toBe(V1);
    expect(() => network.resolveWriteAddress('mainnet', 'veilcore', V2)).toThrow(
      /VeilCore contract version 2, and this version of @veilcore\/contracts sends transactions only to VeilCore contract version 1/,
    );
  });

  it('given no address, tries every pinned contract: a v2 batch is read by v2’s decoder and named', async () => {
    const { verify } = await kit(withV2());
    indexer([call(V2, v2Fixture.stateHex)]);
    const v = await verify.checkBatchAnchor({ ...base, root: hexRoot(v2Fixture.root) });
    expect(v).toMatchObject({ accepted: true, blockHeight: 3600100, keyState: TEMP_KEY });
    expect(v.contract).toEqual({ version: 'v2', address: V2, name: 'VeilCore contract version 2' });
    expect(v.reason).toMatch(/\(VeilCore contract version 2; one key, not yet handed to the committee\)$/);
    const other = hexRoot(v2Fixture.root);
    other[0] ^= 1;
    expect((await verify.checkBatchAnchor({ ...base, root: other })).reason).toBe(
      `that transaction timestamped a different root (VeilCore contract version 2; ${TEMP_KEY})`,
    );
  });

  it('…and a v1 batch is still read by v1’s, named version 1', async () => {
    const { verify } = await kit(withV2());
    indexer([call(V1, V1_STATE)]);
    const v = await verify.checkBatchAnchor({ ...base, root: hexRoot(v1Batch.root) });
    expect(v).toMatchObject({ accepted: true, contract: { version: 'v1', address: V1 } });
    expect(v.reason).toMatch(/\(VeilCore contract version 1\)$/);
  });

  it('REFUSED: a transaction that calls more than one pinned contract, whichever is asked about', async () => {
    const { verify } = await kit(withV2());
    indexer([call(V1, V1_STATE), call(V2, v2Fixture.stateHex)]);
    for (const address of [undefined, V1, V2])
      await expect(verify.checkBatchAnchor({ ...base, address, root: hexRoot(v2Fixture.root) })).rejects.toThrow(
        /not a single anchorBatch call/,
      );
    // A call on the claims contract counts too.
    const claims = (mainnetJson.contracts.find((c) => c.name === 'veilcore-claims') as { address: string }).address;
    indexer([call(V2, v2Fixture.stateHex), call(claims, V1_STATE, 'proveRange')]);
    await expect(verify.checkBatchAnchor({ ...base, root: hexRoot(v2Fixture.root) })).rejects.toThrow(
      /not a single anchorBatch call/,
    );
  });

  it('given an address, only that contract: a v1 call is not a v2 date', async () => {
    const { verify } = await kit(withV2());
    indexer([call(V1, V1_STATE)]);
    await expect(verify.checkBatchAnchor({ ...base, address: V2, root: hexRoot(v1Batch.root) })).rejects.toThrow(
      'That transaction is not a single anchorBatch call on this contract.',
    );
    await expect(
      verify.checkBatchAnchor({ ...base, address: V1, contractVersion: 'v2', root: hexRoot(v1Batch.root) }),
    ).rejects.toThrow(/pinned as VeilCore contract version 1, not VeilCore contract version 2/);
  });

  it('the decoder is the pinned address’s, never the bytes’: v1 bytes at the v2 address are not read as v1', async () => {
    const { verify } = await kit(withV2());
    indexer([call(V2, V1_STATE)]);
    await expect(verify.checkBatchAnchor({ ...base, root: hexRoot(v1Batch.root) })).rejects.toThrow(
      /Not VeilCore version 2’s ledger layout/,
    );
  });

  it('REFUSED: the same v2 state at an address that is not pinned (a copy of v2 carries the same version fields)', async () => {
    const { verify } = await kit(withV2());
    indexer([call('f3'.repeat(32), v2Fixture.stateHex)]);
    await expect(verify.checkBatchAnchor({ ...base, root: hexRoot(v2Fixture.root) })).rejects.toThrow(
      /not a single anchorBatch call/,
    );
    await expect(
      verify.checkBatchAnchor({ ...base, address: 'f3'.repeat(32), root: hexRoot(v2Fixture.root) }),
    ).rejects.toThrow(/the VeilCore contract is .* \(the deployment record\)/);
  });

  it('v2’s own key table and key states, never v1’s', async () => {
    // Its table names a key the state does not carry: refused, though v1's table would pass.
    const keys = (withV2().contracts.at(-1) as { circuits: Record<string, Record<string, string>> }).circuits;
    const { verify } = await kit(
      withV2({ circuits: { ...keys, anchor: { ...keys.anchor, verifierKey: '00'.repeat(32) } } }),
    );
    indexer([call(V2, v2Fixture.stateHex)]);
    const v = await verify.checkBatchAnchor({ ...base, root: hexRoot(v2Fixture.root) });
    expect(v).toMatchObject({ accepted: false });
    expect(v.reason).toMatch(/not the pinned build's \(anchor\)/);
    // The authority after the handover only: the temporary key's state (counter 16) is refused.
    const { verify: later } = await kit(
      withV2({
        keyStates: [{ retired: false, committee: 3, threshold: 2, counter: 19, block: 3700000, label: '2 of 3' }],
      }),
    );
    const r = await later.checkBatchAnchor({ ...base, root: hexRoot(v2Fixture.root) });
    expect(r.accepted).toBe(false);
    expect(r.reason).toMatch(/in none of the states published for it \(2 of 3\)/);
  });

  it('a pin without key states is refused when the list is read, not guessed', async () => {
    const { pinnedContractsFrom } = await import('../../api/src/pinned-contracts.js');
    expect(() => pinnedContractsFrom(withV2({ keyStates: undefined }))).toThrow(/version 2 and lists no keyStates/);
    expect(() =>
      pinnedContractsFrom(
        withV2({ keyStates: [{ retired: false, committee: 1, threshold: 1, counter: null, block: null, label: 'x' }] }),
      ),
    ).toThrow(/a live authority needs its counter/);
  });

  it('the checks built on v1’s compiled contract refuse v2, rather than read it with v1’s layout', async () => {
    const { verify } = await kit(withV2());
    indexer([]);
    const z = new Uint8Array(32);
    await expect(verify.checkOwnership({ ...base, address: V2, record: z, challenge: z })).rejects.toThrow(
      'checkOwnership reads VeilCore contract version 1 only; this version of @veilcore/contracts checks ' +
        'VeilCore contract version 2 for batch date stamps (checkBatchAnchor). Nothing was read.',
    );
    await expect(verify.readLedger({ ...base, address: V2 })).rejects.toThrow(
      /readLedger reads VeilCore contract version 1 only/,
    );
  });
});

describe('off mainnet, a check names its version', () => {
  const dev = {
    network: 'undeployed' as const,
    indexer: INDEXER,
    txId: TX,
    address: V2,
    verifierKeys: 'report' as const,
  };

  it('REFUSED with a defaulted version; read by the named one', async () => {
    const { verify } = await kit();
    indexer([call(V2, v2Fixture.stateHex)]);
    await expect(verify.checkBatchAnchor({ ...dev, root: hexRoot(v2Fixture.root) })).rejects.toThrow(
      /say which contract version .* is \(contractVersion: 'v1' or 'v2'\)/,
    );
    const v = await verify.checkBatchAnchor({ ...dev, contractVersion: 'v2', root: hexRoot(v2Fixture.root) });
    expect(v).toMatchObject({ accepted: true, contract: { version: 'v2' } });
    expect(v.reason).toMatch(/\(VeilCore contract version 2\)$/);
  });

  it('a v2 rehearsal with pinned keys needs a table: there is none for an unpinned v2', async () => {
    const { verify } = await kit();
    indexer([call(V2, v2Fixture.stateHex)]);
    await expect(
      verify.checkBatchAnchor({ ...dev, verifierKeys: 'pinned', contractVersion: 'v2', root: hexRoot(v2Fixture.root) }),
    ).rejects.toThrow(/No verifier-key table is pinned for VeilCore contract version 2/);
  });
});
