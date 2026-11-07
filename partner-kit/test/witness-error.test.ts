// What a contract's refusal looks like through REAL midnight-js 5 (submitCallTx, as
// callTx uses it), with the compiled contract and its witnesses: no keys, no network.
// The refusal sits two causes deep; isContractRefusal must find it there, must not take
// any other failure for one, and the chain stand-in (test/local-chain.ts) must throw the
// same shape, so the examples' own refusal checks are tested against the real thing.
// From the independent review of 6 Oct (B1), whose experiment this is.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/require-await -- the fakes stand in for async interfaces */
import { describe, expect, it } from 'vitest';
import { setNetworkId } from '../../api/src/network-id.js';
import { createCallTxOptions, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { loadLedger8Protocol } from '@midnight-ntwrk/midnight-js-protocol';
import {
  createMidnightProviderFromHandlers,
  createProofProviderFromHandlers,
  createWalletProviderFromHandlers,
  SerializedContractState,
  SerializedLedgerParameters,
  SerializedZswapChainState,
} from '@midnight-ntwrk/midnight-js-types';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createConstructorContext } from '@midnight-ntwrk/compact-runtime';
import { Contract } from '../../contract/src/managed/veilcore/contract/index.js';
import { CompiledVeilcore } from '../../contract/src/veilcore';
import { createVeilcorePrivateState, veilcoreWitnesses } from '../../contract/src/witnesses.js';
import { memoryPrivateState } from '../src/private-state.js';
import { errorChain, isContractRefusal } from '../src/errors.js';
import { asMidnightJsThrows } from './local-chain';

const ADDR = 'ab'.repeat(32);
const COIN = '0'.repeat(64);
/** A real pre-fork verifier key (midnight-js 5's own fixture): midnight-js 5 compares keys before running a circuit. */
const VK = new Uint8Array(
  readFileSync(
    resolve(
      import.meta.dirname,
      '../../node_modules/@midnight-ntwrk/testkit-js/dist/fixtures/hf/counter-016/compiled/keys/increment.verifier',
    ),
  ),
);
const notUsed = () => Promise.reject(new Error('not reached: the circuit is refused before proving'));

/** Call `circuit` through midnight-js's own submitCallTx and return what it throws. */
const thrownBy = async (circuit: string, args: unknown[], failQuery?: Error): Promise<unknown> => {
  setNetworkId('undeployed');
  const state = new Contract(veilcoreWitnesses as never).initialState(
    createConstructorContext(createVeilcorePrivateState(new Uint8Array(32)), COIN) as never,
  ).currentContractState;
  for (const op of state.operations()) {
    const o = state.operation(op)!;
    o.verifierKey = VK;
    state.setOperation(op, o);
  }
  const L8 = await loadLedger8Protocol();
  const ps = memoryPrivateState<string, unknown>();
  await ps.forContract(ADDR).set('veilcorePrivateState', {
    ...createVeilcorePrivateState(new Uint8Array(32).fill(7)),
    licenseSecret: new Uint8Array(32).fill(1),
    licenseRecord: new Uint8Array(32).fill(2),
    presentationChallenge: new Uint8Array(32).fill(3),
  });
  const providers = {
    privateStateProvider: ps,
    publicDataProvider: {
      queryZSwapAndContractState: async () => {
        if (failQuery) throw failQuery;
        return {
          protocolVersion: 1_000_000,
          contractState: SerializedContractState.fromBytes('v8', state.serialize()),
          zswapChainState: SerializedZswapChainState.fromBytes('v8', new L8.ZswapChainState().serialize()),
          ledgerParameters: SerializedLedgerParameters.fromBytes(
            'v8',
            L8.LedgerParameters.initialParameters().serialize(),
          ),
        };
      },
      queryContractState: async () => {
        if (failQuery) throw failQuery;
        return {
          protocolVersion: 1_000_000,
          contractState: SerializedContractState.fromBytes('v8', state.serialize()),
          ledgerParameters: SerializedLedgerParameters.fromBytes(
            'v8',
            L8.LedgerParameters.initialParameters().serialize(),
          ),
        };
      },
      queryLatestProtocolVersion: async () => 1_000_000,
      queryBlock: async () => ({ hash: 'bb'.repeat(32), height: 1, protocolVersion: 1_000_000 }),
    },
    zkConfigProvider: {
      getVerifierKey: async () => VK,
      getArtifactRuntimeVersion: async () => '0.16.0',
    },
    proofProvider: createProofProviderFromHandlers({ v8: notUsed, v9: notUsed }),
    walletProvider: createWalletProviderFromHandlers({
      v8: notUsed,
      v9: notUsed,
      getCoinPublicKey: () => COIN,
      getEncryptionPublicKey: () => COIN,
    }),
    midnightProvider: createMidnightProviderFromHandlers({ v8: notUsed, v9: notUsed }),
    config: { networkId: 'undeployed', ttlSeconds: 3600 },
  };
  try {
    await submitCallTx(
      providers as never,
      createCallTxOptions(
        CompiledVeilcore,
        circuit as never,
        ADDR,
        'veilcorePrivateState',
        undefined,
        args as never,
      ) as never,
    );
  } catch (e) {
    return e;
  }
  throw new Error(`${circuit} was not refused`);
};

describe('a refusal, through real midnight-js', () => {
  it('a witness refusal (no live licence) is two causes deep, and found there', async () => {
    const e = await thrownBy('proveLicense', []);
    // midnight-js 5 repeats it in the top message; the cause chain still carries it on its own.
    expect((e as Error).name).toBe('ContractExecutionError');
    expect(errorChain(e)).toContain('No live licence for that secret and record');
    expect(isContractRefusal(e)).toBe(true);
  });

  it('a failed assert (an unanchored record proving ownership) is found too', async () => {
    const e = await thrownBy('proveOwnership', [new Uint8Array(32).fill(9)]);
    expect(errorChain(e).some((t) => /^failed assert: /.test(t))).toBe(true);
    expect(isContractRefusal(e)).toBe(true);
  });

  it('anything else is not a refusal', async () => {
    const e = await thrownBy('proveLicense', [], new Error('socket hang up'));
    expect(isContractRefusal(e)).toBe(false);
    expect(isContractRefusal(new Error('Failed Proof Server response: code="500"'))).toBe(false);
    expect(isContractRefusal(undefined)).toBe(false);
  });

  it('the chain stand-in throws the same shape as midnight-js', async () => {
    for (const [circuit, args] of [
      ['proveLicense', []],
      ['proveOwnership', [new Uint8Array(32).fill(9)]],
    ] as const) {
      const real = await thrownBy(circuit, [...args]);
      let deepest = real as { cause?: unknown };
      while (deepest.cause !== undefined) deepest = deepest.cause as { cause?: unknown };
      const stand = asMidnightJsThrows(circuit, deepest);
      expect(errorChain(stand)).toEqual(errorChain(real));
      expect(String(stand.message)).toMatch(new RegExp(`^Error executing circuit '${circuit}': `));
      expect(String((real as Error).message)).toMatch(new RegExp(`^Error executing circuit '${circuit}': `));
      expect(isContractRefusal(stand)).toBe(true);
    }
  });
});
