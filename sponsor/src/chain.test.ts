// The anchoring job's real transaction path, offline: the compiled contract builds an
// anchorBatch call against a contract state made locally, a stand-in prover proves it,
// a stand-in wallet balances it. Checks that no secret is ever asked for and that the
// result is exactly one anchorBatch call carrying the root, on both sides of Midnight's
// Ledger 9 fork (a network not yet forked: a Ledger 8 transaction; a forked one: the same
// Ledger 8 contract's call as a Ledger 9 transaction, against a Ledger 9 state).
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { check as zkCheck, jsonIrToBinary } from '@midnight-ntwrk/zkir-v2';
import { ContractOperation, ContractState, createConstructorContext } from '@midnight-ntwrk/compact-runtime';
import * as Runtime9 from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import * as Ledger8 from '@midnightntwrk/ledger-v8';
import * as Ledger9 from '@midnightntwrk/ledger-v9';
import {
  createProofProviderFromProvingProviders,
  SerializedContractState,
  SerializedLedgerParameters,
  SerializedZswapChainState,
} from '@midnight-ntwrk/midnight-js-types';
import { loadVeilcore, MidnightAnchorChain } from './chain.js';
import { eraOf, inspect, readSealed } from './policy.js';
import type { FacadeWallet } from './wallet.js';

const ARTIFACTS = resolve(import.meta.dirname, '..', '..', 'contract', 'src', 'managed', 'veilcore');
const have = existsSync(resolve(ARTIFACTS, 'contract', 'index.js'));
/** A real pre-fork verifier key (midnight-js 5's own hard-fork fixture); Ledger 9 states refuse bytes that are not one. */
const VK = new Uint8Array(
  readFileSync(
    resolve(
      import.meta.dirname,
      '../../node_modules/@midnight-ntwrk/testkit-js/dist/fixtures/hf/counter-016/compiled/keys/increment.verifier',
    ),
  ),
);
const PROTOCOL = { v8: 1_000_000, v9: 2_001_000 } as const;

/**
 * The compiled contract as the sponsor stages it, with VK as anchorBatch's verifier key: the
 * contract, circuits and compiler description are the real build's (linked, so the contract
 * still imports this repo's runtime); the key is the stand-in the stand-in chain also holds,
 * since midnight-js 5 compares the two before it builds anything.
 */
const stagedArtifacts = (): string => {
  const dir = mkdtempSync(resolve(tmpdir(), 'veilcore-sponsor-artifacts-'));
  for (const sub of ['contract', 'zkir', 'compiler']) symlinkSync(resolve(ARTIFACTS, sub), resolve(dir, sub));
  mkdirSync(resolve(dir, 'keys'));
  writeFileSync(resolve(dir, 'keys', 'anchorBatch.verifier'), VK);
  return dir;
};

/** The state the stand-in indexer serves, in the era's encoding, every operation keyed with VK. */
const served = (state: ContractState, era: 'v8' | 'v9'): Uint8Array => {
  const names = state.operations().map((o) => (typeof o === 'string' ? o : new TextDecoder().decode(o)));
  if (era === 'v8') {
    const cs = new ContractState();
    cs.data = state.data;
    for (const n of names) {
      const op = new ContractOperation();
      op.verifierKey = VK;
      cs.setOperation(n, op);
    }
    return cs.serialize();
  }
  const cs = new Runtime9.ContractState();
  cs.data = new Runtime9.ChargedState(Runtime9.StateValue.decode(state.data.state.encode()));
  for (const n of names) {
    const op = new Runtime9.ContractOperation();
    op.verifierKey = VK;
    cs.setOperation(n, op);
  }
  return cs.serialize();
};

describe.skipIf(!have).each(['v8', 'v9'] as const)('anchorBatch on a network on %s, built offline from the compiled contract', (era) => {
  it('builds one anchorBatch call with the root, passes the circuit check, and asks for no secret', { timeout: 60_000 }, async () => {
    const L = (era === 'v9' ? Ledger9 : Ledger8) as typeof Ledger9;
    const artifacts = stagedArtifacts();
    const veilcore = await loadVeilcore(artifacts);
    const address = L.sampleContractAddress();
    const refuse = () => {
      throw new Error('a witness was called');
    };
    const witnesses = new Proxy({}, { get: () => refuse });
    const initial = new veilcore.Contract(witnesses as never).initialState(
      createConstructorContext({} as never, '0'.repeat(64)),
    ).currentContractState;
    const bytes = served(initial, era);
    const parts = {
      ledgerParameters: SerializedLedgerParameters.fromBytes(era, L.LedgerParameters.initialParameters().serialize()),
      zswapChainState: SerializedZswapChainState.fromBytes(era, new L.ZswapChainState().serialize()),
    };
    const publicData = {
      queryZSwapAndContractState: () =>
        Promise.resolve({
          protocolVersion: PROTOCOL[era],
          contractState: SerializedContractState.fromBytes(era, bytes),
          ...parts,
        }),
      queryContractState: () =>
        Promise.resolve({
          protocolVersion: PROTOCOL[era],
          contractState: SerializedContractState.fromBytes(era, bytes),
          ledgerParameters: parts.ledgerParameters,
        }),
      queryLatestProtocolVersion: () => Promise.resolve(PROTOCOL[era]),
      queryBlock: () => Promise.resolve({ hash: 'bb'.repeat(32), height: 1, protocolVersion: PROTOCOL[era] }),
    };
    // The real circuit IR checks the call (no keys needed for that); the proof itself is a placeholder.
    const circuitOf = (loc: string) => /([A-Za-z0-9_]+)(\?vk=[0-9a-f]{64})?$/.exec(loc)?.[1] ?? loc;
    const km = {
      lookupKey: (loc: string) =>
        Promise.resolve({
          proverKey: new Uint8Array(),
          verifierKey: VK,
          ir: jsonIrToBinary(readFileSync(resolve(ARTIFACTS, 'zkir', `${circuitOf(loc)}.zkir`), 'utf8')),
        }),
      getParams: () => Promise.reject(new Error('no params offline')),
    };
    const checked: string[] = [];
    const proving = {
      check: (pre: Uint8Array, loc: string) => {
        checked.push(circuitOf(loc));
        return zkCheck(pre, km);
      },
      prove: () => Promise.resolve(new L.Proof('0100').serialize()),
      lookupKey: (loc: string) => km.lookupKey(loc),
    };
    const prover = createProofProviderFromProvingProviders({ v8: proving, v9: proving });
    let balanced: { serialize: () => Uint8Array } | undefined;
    const wallet = {
      balanceUnbound: (tx: { serialize: () => Uint8Array }) => {
        balanced = L.Transaction.deserialize('signature', 'proof', 'pre-binding', tx.serialize()).bind();
        return Promise.resolve(balanced);
      },
      identifiersOf: (tx: { serialize: () => Uint8Array }) => readSealed(tx.serialize()).identifiers(),
      submit: () => Promise.resolve('id'),
      revert: () => Promise.resolve(),
      feeOf: () => Promise.resolve(1_234n),
    } as unknown as FacadeWallet;
    const chain = new MidnightAnchorChain(
      veilcore,
      artifacts,
      address,
      'http://unused',
      'ws://unused',
      'http://unused',
      wallet,
      L.sampleCoinPublicKey(),
      L.sampleEncryptionPublicKey(),
      'undeployed',
      { publicData, prover },
    );
    const root = 'ab'.repeat(32);
    const prepared = await chain.prepare(root);
    expect(prepared.txId).toMatch(/^[0-9a-f]+$/);
    expect(prepared.fee).toBe(1_234n); // what the anchoring job counts against the daily budget
    expect(checked).toEqual(['anchorBatch']);
    // Read it the way the sponsor reads a visitor's transaction: one call, anchorBatch.
    const sealedBytes = balanced!.serialize();
    expect(eraOf(readSealed(sealedBytes))).toBe(era);
    const { verdict } = inspect(
      sealedBytes,
      { contractAddress: address, allowedCircuits: new Set(['x']), maxBytes: 1e6, maxTtlMs: 3600e3 },
      new Date(),
    );
    expect(verdict).toMatchObject({ ok: false, code: 'circuit-not-allowed' }); // public endpoint never pays for it
    expect(await chain.batchSeq()).toBe(0n);
  });
});
