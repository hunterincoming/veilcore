// Which prover the browser's worker must use after Midnight's ledger 9 fork.
//
// VeilCore's contracts were compiled before the fork (compactc 0.31: ZKIR v2 circuits, keys in
// the `midnight:verifier-key[v6]` envelope) and keep those keys on chain. After the fork
// midnight-js 5 builds their calls as LEDGER 9 transactions. Two provers exist: zkir-v2 2.2.0
// (what the worker uses) and zkir-v3 3.2.0 (what ledger 9's own circuits, compiled with
// compactc 0.36, need). This builds a real post-fork call with midnight-js's own pre-fork
// fixture (counter-016: compactc 0.31.1, real ZKIR v2 prover and verifier keys, shipped in
// @midnight-ntwrk/testkit-js 5.0.0), against a contract state in ledger 9's encoding, and proves
// it with each.
//
// What it shows, offline: zkir-v3 refuses a ZKIR v2 circuit outright; zkir-v2 2.2.0 accepts the
// ledger 9 transaction's preimage and goes on to ask for the public parameters. It cannot show
// the proof verifying: the parameters (bls_midnight_2p<k>) are downloaded at proving time and
// are not available offline here, and only a node verifies a proof against the chain.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as V2 from '@midnight-ntwrk/zkir-v2';
import * as V3 from '@midnightntwrk/zkir-v3';
import * as Ledger9 from '@midnight-ntwrk/midnight-js-protocol/v9';
import { createUnprovenCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { createConstructorContext } from '@midnight-ntwrk/compact-runtime';
import {
  SerializedContractState,
  SerializedLedgerParameters,
  SerializedZswapChainState,
} from '@midnight-ntwrk/midnight-js-types';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { inMemoryPrivateStateProvider } from '../../in-memory-private-state-provider';
import { servedStateBytes, PROTOCOL_VERSION } from './test-chain';
import { circuitOfKeyLocation } from './zk-material';

const FIX = resolve(
  import.meta.dirname,
  '../../../../node_modules/@midnight-ntwrk/testkit-js/dist/fixtures/hf/counter-016/compiled',
);
const file = (p: string) => new Uint8Array(readFileSync(resolve(FIX, p)));

/** The fixture's `increment` call, built post-fork by midnight-js 5: an unproven ledger 9 transaction. */
const postForkIncrement = async () => {
  const { Contract } = (await import(resolve(FIX, 'contract/index.js'))) as {
    Contract: new (w: object) => { initialState: (c: unknown) => { currentContractState: never } };
  };
  const contract = new Contract({});
  const state = contract.initialState(createConstructorContext({}, '0'.repeat(64))).currentContractState;
  const vk = file('keys/increment.verifier');
  const address = 'c0'.repeat(32);
  const bytes = servedStateBytes(state, 'v9', () => vk);
  const ledgerParameters = SerializedLedgerParameters.fromBytes(
    'v9',
    Ledger9.LedgerParameters.initialParameters().serialize(),
  );
  const zswapChainState = SerializedZswapChainState.fromBytes('v9', new Ledger9.ZswapChainState().serialize());
  const served: Record<string, Uint8Array> = {
    'keys/increment.verifier': vk,
    'keys/increment.prover': file('keys/increment.prover'),
    'zkir/increment.bzkir': file('zkir/increment.bzkir'),
    'compiler/contract-info.json': file('compiler/contract-info.json'),
  };
  const fetchFunc = ((u: string) => {
    const p = new URL(u).pathname.slice(1);
    return Promise.resolve(served[p] ? new Response(new Uint8Array(served[p])) : new Response('no', { status: 404 }));
  }) as typeof fetch;
  const ps = inMemoryPrivateStateProvider();
  await ps.forContract(address).set('p', {});
  const keys = Ledger9.ZswapSecretKeys.fromSeed(new Uint8Array(32).fill(3));
  const unused = () => Promise.reject(new Error('not used here'));
  const providers = {
    privateStateProvider: ps,
    publicDataProvider: {
      queryContractState: () =>
        Promise.resolve({
          protocolVersion: PROTOCOL_VERSION.v9,
          contractState: SerializedContractState.fromBytes('v9', bytes),
          ledgerParameters,
        }),
      queryZSwapAndContractState: () =>
        Promise.resolve({
          protocolVersion: PROTOCOL_VERSION.v9,
          contractState: SerializedContractState.fromBytes('v9', bytes),
          ledgerParameters,
          zswapChainState,
        }),
      queryLatestProtocolVersion: () => Promise.resolve(PROTOCOL_VERSION.v9),
      queryBlock: () => Promise.resolve({ hash: 'bb'.repeat(32), height: 1, protocolVersion: PROTOCOL_VERSION.v9 }),
    },
    zkConfigProvider: new FetchZkConfigProvider('https://x.test', { fetchFunc, verify: 'require-if-present' }),
    walletProvider: {
      getCoinPublicKey: () => keys.coinPublicKey,
      getEncryptionPublicKey: () => keys.encryptionPublicKey,
      supportedEras: ['v8', 'v9'],
      balanceTx: unused,
    },
    proofProvider: { supportedEras: ['v8', 'v9'], proveTx: unused },
    midnightProvider: { supportedEras: ['v8', 'v9'], submitTx: unused },
    config: { networkId: 'undeployed', ttlSeconds: 3600 },
  };
  const built = (await createUnprovenCallTx(
    providers as never,
    {
      compiledContract: contract,
      contractAddress: address,
      circuitId: 'increment',
      args: [],
      privateStateId: 'p',
    } as never,
  )) as unknown as { private: { unprovenTx: { era: string; deserialize: (d: object) => unknown } } };
  return { handle: built.private.unprovenTx, served, vk };
};

/** Prove with one engine; the parameters are refused (offline), so proving stops there at best. */
const proveWith = async (engine: typeof V2 | typeof V3) => {
  const { handle, served, vk } = await postForkIncrement();
  const tx = handle.deserialize({ v9: Ledger9.Transaction }) as {
    prove: (p: object, c: Ledger9.CostModel) => Promise<unknown>;
  };
  const locations: string[] = [];
  const paramsAsked: number[] = [];
  const km = {
    lookupKey: (loc: string) => {
      locations.push(circuitOfKeyLocation(loc)?.circuit ?? `unparsed ${loc}`);
      return Promise.resolve({
        proverKey: served['keys/increment.prover'],
        verifierKey: vk,
        ir: served['zkir/increment.bzkir'],
      });
    },
    getParams: (k: number) => {
      paramsAsked.push(k);
      return Promise.reject(new Error(`no public parameters offline (k=${k})`));
    },
  };
  const error = await tx.prove(engine.provingProvider(km), Ledger9.CostModel.initialCostModel()).then(
    () => undefined,
    (e: unknown) => String(e),
  );
  return { era: handle.era, locations, paramsAsked, error };
};

describe("a pre-fork (ZKIR v2) contract's call after the ledger 9 fork", () => {
  it(
    'is a ledger 9 transaction, and zkir-v2 2.2.0 proves it up to the public parameters',
    { timeout: 120_000 },
    async () => {
      const r = await proveWith(V2);
      expect(r.era).toBe('v9');
      // Ledger 9 names the circuit by its deployed key's location; the worker resolves it (zk-material.ts).
      expect(new Set(r.locations)).toEqual(new Set(['increment']));
      // The circuit check passed and proving began: it stopped only for want of the parameters.
      expect(r.paramsAsked.length).toBeGreaterThan(0);
      expect(r.error).toMatch(/no public parameters offline/);
    },
  );

  it(
    'zkir-v3 3.2.0 (ledger 9 circuits) refuses a ZKIR v2 circuit: the worker must stay on zkir-v2',
    { timeout: 120_000 },
    async () => {
      const r = await proveWith(V3);
      expect(r.paramsAsked).toEqual([]);
      expect(r.error).toMatch(/ZKIR v3|ir-source\[v3/);
    },
  );
});
