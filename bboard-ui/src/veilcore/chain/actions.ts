// The real calls this site makes, from this browser, paid for by the sponsor:
//   anchor          create the record's on-chain identity, commit(recordSecret), with a
//                   recovery commitment fixed now
//   proveOwnership  show, to the verifier who chose the challenge, that this browser holds
//                   the record secret of an anchored identity
//   pairDna         date a bound pairing of a DNA report against that identity (the binding
//                   from chain/pairing.ts, never the report's fingerprint)
//   issueLicense    the issuer puts a licence on its record: PENDING, keyed on a commitment
//                   the licensee built from a secret only the licensee holds
//   countersignLicense  the licensee proves that secret: the licence is ACTIVE
//   proveLicense    the licensee shows one verifier, who chose the challenge, that it holds a
//                   live licence from that record, without saying which
//   revokeLicense   the issuer ends a licence
//
// Each call: run the circuit here against the contract's current state (it refuses here,
// before anything is sent, if the contract would), prove it in the worker, seal it, hand
// it to the sponsor, then wait for the network to include it.
// SPDX-License-Identifier: Apache-2.0

import { createUnprovenCallTx, submitTxAsync } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import { NETWORK } from '../../config/network';
import { CompiledVeilcore, PROVABLE_CIRCUITS } from '../../../../contract/src/veilcore';
import { createVeilcorePrivateState, withLicense, type VeilcorePrivateState } from '../../../../contract/src/witnesses';
import { ledger as readLedger, pureCircuits } from '../../../../contract/src/managed/veilcore/contract/index.js';
import { currentHead } from '../../../../contract/src/verify';
import { recoveryCommitmentOf } from './identity';
import { CHAIN_CONTRACT, chainNotReady, type BrowserCircuit } from './config';
import { makeProviders, PRIVATE_STATE_ID, type Hooks } from './providers';
import { setProverProgress } from './prover';
import { browserCallDeps, type CallDeps } from './prover-choice';

export type ChainReceipt = {
  readonly circuit: BrowserCircuit;
  readonly txId: string;
  readonly txHash: string;
  readonly blockHeight: number;
  /** Block time (ms), the chain's own clock. */
  readonly blockTime?: number;
};

const hexToBytes = (hex: string): Uint8Array => {
  const h = hex.toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]{64}$/.test(h)) throw new Error('Expected 32 bytes of hex.');
  return Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));
};
export { identityOf, recoveryCommitmentOf, toHex } from './identity';

const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((x, i) => x === b[i]);

const operationName = (o: string | Uint8Array): string => (typeof o === 'string' ? o : new TextDecoder().decode(o));

const withTimeout = <T>(p: Promise<T>, ms: number, what: string): Promise<T> =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(what)), ms))]);

const NETWORK_TROUBLE = /Failed to fetch|NetworkError|Load failed|ERR_[A-Z_]+|ECONNREFUSED|ENOTFOUND|fetch failed/i;

/** Say plainly whether anything was sent, whatever went wrong. */
const plainError = (e: unknown, sentAs: string | undefined): Error => {
  const msg = e instanceof Error ? e.message : String(e);
  if (sentAs !== undefined && !msg.includes(sentAs)) {
    return new Error(
      `${NETWORK_TROUBLE.test(msg) ? 'Lost contact with the network' : msg}. The transaction WAS sent (${sentAs}); ` +
        'check it on the network before trying again.',
      { cause: e },
    );
  }
  if (NETWORK_TROUBLE.test(msg)) {
    return new Error(
      'Could not reach the Midnight network or the sponsor. Nothing was sent. Try again in a few minutes.',
      {
        cause: e,
      },
    );
  }
  return e instanceof Error ? e : new Error(msg);
};

export type CallOptions = {
  readonly progress?: (msg: string) => void;
  readonly deps?: CallDeps;
  /** Tests: see the sealed bytes. */
  readonly onSealed?: (bytes: Uint8Array) => void;
  /** How long to wait for the network to include the call. */
  readonly landingTimeoutMs?: number;
};

/** A call's arguments, or how to make them from the contract's state just read (a free licence slot). */
type Args = readonly unknown[] | ((l: ReturnType<typeof readLedger>) => readonly unknown[]);

const call = async (
  circuit: BrowserCircuit,
  args: Args,
  privateState: VeilcorePrivateState,
  opts: CallOptions,
): Promise<ChainReceipt> => {
  const why = chainNotReady();
  if (why && !opts.deps) throw new Error(why);
  // The Midnight libraries serialise for one network; set it here, only when a call is made.
  setNetworkId(NETWORK);
  const contractAddress = CHAIN_CONTRACT ?? '';
  const progress = opts.progress ?? (() => undefined);
  let sentAs: string | undefined;
  const hooks: Hooks = { progress, onSealed: opts.onSealed, onSent: (id) => (sentAs = id) };
  const deps = opts.deps ?? browserCallDeps();
  const providers = makeProviders(`veilcore-zk-${contractAddress.slice(0, 16)}`, hooks, deps);

  providers.privateStateProvider.setContractAddress(contractAddress);
  setProverProgress(progress);
  try {
    // The prover first: a browser that won't run it (a policy, a blocked file) says so before
    // anything is read or sent, and it is warm by the time the transaction is ready to prove.
    if (deps.warmUp) {
      progress('Starting the prover on your device…');
      await deps.warmUp();
    }
    progress('Reading the contract from the network…');
    const state = await withTimeout(
      providers.publicDataProvider.queryContractState(contractAddress),
      45_000,
      'Could not reach the Midnight network’s indexer. Nothing was sent. Try again in a few minutes.',
    );
    if (!state) throw new Error('The demo contract was not found on the network.');
    // Refuse a contract carrying a circuit this build does not know (the same guard the
    // operator tool uses when joining): one added by maintenance would otherwise pass.
    const onChain = state.operations().map(operationName);
    const extra = onChain.filter((c) => !PROVABLE_CIRCUITS.includes(c));
    if (extra.length > 0 || !onChain.includes(circuit)) {
      throw new Error('The contract on the network is not the one this site was built for. Nothing was sent.');
    }

    // The proving files this site serves must be the contract's own: otherwise the proof is
    // made (a minute on a phone) and then refused. Compared before anything is proven.
    progress('Checking this site’s proving files against the contract…');
    const served = await providers.zkConfigProvider.getVerifierKey(circuit);
    const onChainKey = state.operation(circuit)?.verifierKey;
    if (!onChainKey || !sameBytes(served, onChainKey)) {
      throw new Error('This site’s proving files are not the ones the contract on the network uses. Nothing was sent.');
    }

    await providers.privateStateProvider.set(PRIVATE_STATE_ID, privateState);
    const callArgs = typeof args === 'function' ? args(readLedger(state.data)) : args;

    progress('Preparing the transaction on your device…');
    const unproven = await createUnprovenCallTx(
      providers as never,
      {
        compiledContract: CompiledVeilcore,
        contractAddress,
        circuitId: circuit,
        args: callArgs,
        privateStateId: PRIVATE_STATE_ID,
      } as never,
    );

    progress('Proving on your device. This can take a minute on a phone…');
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
    if (fin.status !== SucceedEntirely) {
      throw new Error(`The network included the call but it did not succeed (${String(fin.status)}).`);
    }
    return { circuit, txId, txHash: fin.txHash, blockHeight: fin.blockHeight, blockTime: fin.blockTimestamp };
  } catch (e) {
    throw plainError(e, sentAs);
  } finally {
    // The secret was only ever in memory for this call; drop it.
    await providers.privateStateProvider.clear().catch(() => undefined);
    setProverProgress(undefined);
  }
};

/** Anchor a record: its identity goes on chain, with the recovery commitment fixed now. */
export const anchorOnChain = (recordSecret: Uint8Array, recoverySecret: Uint8Array, opts: CallOptions = {}) =>
  call('anchor', [recoveryCommitmentOf(recoverySecret)], createVeilcorePrivateState(recordSecret), opts);

/** Prove possession to a verifier, answering their challenge (64 hex characters). */
export const proveOwnershipOnChain = (recordSecret: Uint8Array, challengeHex: string, opts: CallOptions = {}) =>
  call('proveOwnership', [hexToBytes(challengeHex)], createVeilcorePrivateState(recordSecret), opts);

/**
 * Date a bound pairing (chain/pairing.ts) against the anchored record. `bindingHex` is
 * dnaPairBinding(reportSha256, identity, salt): never pass a report's own fingerprint,
 * which anyone watching could copy and pair to their own record first.
 */
export const pairDnaOnChain = (recordSecret: Uint8Array, bindingHex: string, opts: CallOptions = {}) =>
  call('pairDna', [hexToBytes(bindingHex)], createVeilcorePrivateState(recordSecret), opts);

// ───────────────────────────────────────────── licences (two parties, two browsers)

/** A licence commitment and the issuer head it names (all hex). */
export type LicenceRequest = { readonly commitment: string; readonly issuerRecord: string };

/**
 * The licensee's side, before anything is sent: from a secret only the licensee holds, the
 * commitment to give the issuer, built against the issuer's CURRENT head (issueLicense keys
 * the licence on it; one built against an older commitment could never be countersigned).
 * `issuerIdentity` is the issuer record's on-chain identity. Reads the contract, sends nothing.
 */
export const licenceRequestFor = (
  licenceSecret: Uint8Array,
  issuerIdentity: string,
  l: ReturnType<typeof readLedger>,
): LicenceRequest => {
  const head = currentHead(l, hexToBytes(issuerIdentity));
  return { commitment: toHexLocal(pureCircuits.licenseCommit(licenceSecret, head)), issuerRecord: toHexLocal(head) };
};

/** The key a licence has in the contract's status map (all hex in, hex out). */
export const licenceKeyOf = (commitmentHex: string, issuerRecordHex: string): string =>
  toHexLocal(pureCircuits.licenseKey(hexToBytes(commitmentHex), hexToBytes(issuerRecordHex)));

const toHexLocal = (b: Uint8Array): string => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');

/** The issuer issues the licence the licensee's commitment names, from the issuer's own record. */
export const issueLicenceOnChain = (recordSecret: Uint8Array, commitmentHex: string, opts: CallOptions = {}) =>
  call('issueLicense', [hexToBytes(commitmentHex)], createVeilcorePrivateState(recordSecret), opts);

/** 24-bit leaf indexes: a random free one (the tree has 16,777,216). */
const freeSlot = (l: ReturnType<typeof readLedger>): bigint => {
  for (let i = 0; i < 64; i++) {
    const [a, b, c] = crypto.getRandomValues(new Uint8Array(3));
    const slot = BigInt((a << 16) | (b << 8) | c);
    if (!l.licenseAtSlot.member(slot)) return slot;
  }
  throw new Error('Could not find a free licence slot. Nothing was sent.');
};

/**
 * The licensee countersigns, proving the licence secret: the licence becomes ACTIVE. The
 * record secret is not used (the call proves the licence secret, not a record), so the
 * private state holds the licence alone.
 */
export const countersignLicenceOnChain = (licenceSecret: Uint8Array, issuerRecordHex: string, opts: CallOptions = {}) =>
  call(
    'countersignLicense',
    (l) => [hexToBytes(issuerRecordHex), freeSlot(l)],
    withLicense(createVeilcorePrivateState(new Uint8Array(32)), licenceSecret, hexToBytes(issuerRecordHex)),
    opts,
  );

/** The licensee shows one verifier (who chose the 32-byte challenge) a live licence from that record. */
export const proveLicenceOnChain = (
  licenceSecret: Uint8Array,
  issuerRecordHex: string,
  challengeHex: string,
  opts: CallOptions = {},
) =>
  call(
    'proveLicense',
    [],
    {
      ...withLicense(createVeilcorePrivateState(new Uint8Array(32)), licenceSecret, hexToBytes(issuerRecordHex)),
      presentationChallenge: hexToBytes(challengeHex),
    },
    opts,
  );

/** The issuer ends a licence it issued from this record (`issuingRecordHex`: the head it was keyed on). */
export const revokeLicenceOnChain = (
  recordSecret: Uint8Array,
  commitmentHex: string,
  issuingRecordHex: string,
  opts: CallOptions = {},
) =>
  call(
    'revokeLicense',
    [hexToBytes(commitmentHex), hexToBytes(issuingRecordHex)],
    createVeilcorePrivateState(recordSecret),
    opts,
  );
