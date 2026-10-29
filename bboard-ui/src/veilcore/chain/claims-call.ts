// A claim from this browser, on the claims contract (docs/claims-screen.md): one number from a
// sealed certificate is at most or at least a bound (proveRange; the number is never
// published), or is a stated value (proveValue; the value is published). Paid for by the
// sponsor, like every call this site makes (sponsor/src/policy.ts CLAIMS_CIRCUITS).
//
// The same steps as the main contract's calls (actions.ts): run the circuit here against the
// contract's current state (a false bound is refused here, before anything is proved or sent),
// check the site's proving files are the contract's own, prove in the worker, seal, hand to the
// sponsor, wait for the network. The certificate's numbers and their salts are the claim's
// private input for this one call, in memory, and dropped when it ends.
// SPDX-License-Identifier: Apache-2.0

import { createUnprovenCallTx, submitTxAsync } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import { NETWORK } from '../../config/network';
import {
  CLAIMS_PROVABLE_CIRCUITS,
  CompiledVeilcoreClaims,
  RangeOp,
  type ClaimInput,
  type ClaimsPrivateState,
} from '../../../../contract/src/claims';
import { CLAIMS_CONTRACT, claimsNotReady, type ClaimsCircuit } from './config';
import { makeProviders, PRIVATE_STATE_ID, type Hooks } from './providers';
import { setProverProgress } from './prover';
import { browserCallDeps, type CallDeps } from './prover-choice';
import { slotInput, type ClaimMaterial } from '../claims-input';

export type ClaimReceipt = {
  readonly circuit: ClaimsCircuit;
  readonly contract: string;
  readonly txId: string;
  readonly txHash: string;
  readonly blockHeight: number;
  /** Block time (ms), the chain's own clock. */
  readonly blockTime?: number;
};

export type ClaimCallOptions = {
  readonly progress?: (msg: string) => void;
  readonly deps?: CallDeps;
  /** Tests: the claims contract to call when this build names none. */
  readonly contract?: string;
  readonly landingTimeoutMs?: number;
};

const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((x, i) => x === b[i]);
const operationName = (o: string | Uint8Array): string => (typeof o === 'string' ? o : new TextDecoder().decode(o));
const withTimeout = <T>(p: Promise<T>, ms: number, what: string): Promise<T> =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(what)), ms))]);
const NETWORK_TROUBLE = /Failed to fetch|NetworkError|Load failed|ERR_[A-Z_]+|ECONNREFUSED|ENOTFOUND|fetch failed/i;

const plainError = (e: unknown, sentAs: string | undefined): Error => {
  const msg = e instanceof Error ? e.message : String(e);
  if (sentAs !== undefined && !msg.includes(sentAs))
    return new Error(
      `${NETWORK_TROUBLE.test(msg) ? 'Lost contact with the network' : msg}. The claim WAS sent (${sentAs}); ` +
        'check it on the network before trying again.',
      { cause: e },
    );
  if (NETWORK_TROUBLE.test(msg))
    return new Error(
      'Could not reach the Midnight network or the sponsor. Nothing was sent. Try again in a few minutes.',
      {
        cause: e,
      },
    );
  return e instanceof Error ? e : new Error(msg);
};

const claimCall = async (
  circuit: ClaimsCircuit,
  args: readonly unknown[],
  input: ClaimInput,
  opts: ClaimCallOptions,
): Promise<ClaimReceipt> => {
  const why = claimsNotReady();
  if (why && !opts.deps) throw new Error(why);
  setNetworkId(NETWORK);
  const contractAddress = opts.contract ?? CLAIMS_CONTRACT ?? '';
  const progress = opts.progress ?? (() => undefined);
  let sentAs: string | undefined;
  const hooks: Hooks = { progress, onSent: (id) => (sentAs = id) };
  const deps = opts.deps ?? browserCallDeps();
  const providers = makeProviders<ClaimsPrivateState>(
    `veilcore-zk-claims-${contractAddress.slice(0, 16)}`,
    hooks,
    deps,
  );
  providers.privateStateProvider.setContractAddress(contractAddress);
  setProverProgress(progress);
  try {
    if (deps.warmUp) {
      progress('Starting the prover on your device…');
      await deps.warmUp();
    }
    progress('Reading the claims contract from the network…');
    const state = await withTimeout(
      providers.publicDataProvider.queryContractState(contractAddress),
      45_000,
      'Could not reach the Midnight network’s indexer. Nothing was sent. Try again in a few minutes.',
    );
    if (!state) throw new Error('The claims contract was not found on the network.');
    const onChain = state.operations().map(operationName);
    if (onChain.some((c) => !CLAIMS_PROVABLE_CIRCUITS.includes(c)) || !onChain.includes(circuit))
      throw new Error('The claims contract on the network is not the one this site was built for. Nothing was sent.');
    progress('Checking this site’s proving files against the contract…');
    const served = await providers.zkConfigProvider.getVerifierKey(circuit);
    const onChainKey = state.operation(circuit)?.verifierKey;
    if (!onChainKey || !sameBytes(served, onChainKey))
      throw new Error('This site’s proving files are not the ones the claims contract uses. Nothing was sent.');

    await providers.privateStateProvider.set(PRIVATE_STATE_ID, { input });
    progress('Preparing the claim on your device…');
    const unproven = await createUnprovenCallTx(
      providers as never,
      {
        compiledContract: CompiledVeilcoreClaims,
        contractAddress,
        circuitId: circuit,
        args,
        privateStateId: PRIVATE_STATE_ID,
      } as never,
    );
    progress('Proving on your device. A claim is heavier than other calls: this can take a few minutes…');
    const txId = await submitTxAsync(providers as never, {
      unprovenTx: unproven.private.unprovenTx,
      circuitId: circuit,
    });
    progress('Waiting for the network to include it (usually under a minute)…');
    const fin = await withTimeout(
      providers.publicDataProvider.watchForTxData(txId),
      opts.landingTimeoutMs ?? 5 * 60_000,
      `Sent, but not seen on the network yet. Transaction ${txId}: check it again in a few minutes before trying again.`,
    );
    if (fin.status !== SucceedEntirely)
      throw new Error(`The network included the claim but it did not succeed (${String(fin.status)}).`);
    return {
      circuit,
      contract: contractAddress,
      txId,
      txHash: fin.txHash,
      blockHeight: fin.blockHeight,
      blockTime: fin.blockTimestamp,
    };
  } catch (e) {
    throw plainError(e, sentAs);
  } finally {
    // The numbers and salts were only ever in memory for this call; drop them.
    await providers.privateStateProvider.clear().catch(() => undefined);
    setProverProgress(undefined);
  }
};

export type RangeDirection = 'at-most' | 'at-least';

/** The number in `slot` is at most (or at least) `bound`, both as stored (the value times the slot's scale). */
export const proveRangeOnChain = (
  m: ClaimMaterial,
  slot: number,
  direction: RangeDirection,
  bound: bigint,
  opts: ClaimCallOptions = {},
): Promise<ClaimReceipt> => {
  const { opening, number } = slotInput(m, slot);
  // Refused here, in plain words, before the circuit refuses it in its own.
  if (direction === 'at-most' ? number > bound : number < bound)
    return Promise.reject(new Error('The sealed number doesn’t meet that bound, so it can’t be proved.'));
  return claimCall(
    'proveRange',
    [m.commitment, m.schemaId, BigInt(slot), direction === 'at-most' ? RangeOp.AT_MOST : RangeOp.AT_LEAST, bound],
    { opening, number, terms: m.terms },
    opts,
  );
};

/** `slot` holds exactly its sealed value. PUBLISHES the value. */
export const proveValueOnChain = (
  m: ClaimMaterial,
  slot: number,
  opts: ClaimCallOptions = {},
): Promise<ClaimReceipt> => {
  const { opening } = slotInput(m, slot);
  return claimCall('proveValue', [m.commitment, m.schemaId, BigInt(slot), opening.value], { opening }, opts);
};
