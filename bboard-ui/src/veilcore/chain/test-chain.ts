// Test helpers: a stand-in network for the browser's chain calls. The contract's real
// circuits run (compiled contract and circuit IR, checked with Midnight's own checker);
// only the proof bytes are placeholders and the "network" is in memory. The sponsor is
// the real sponsor policy and proof-of-work code, so a call that passes here is one the
// sponsor would pay for.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { check as zkCheck, jsonIrToBinary } from '@midnight-ntwrk/zkir-v2';
import { loadLedger8Protocol } from '@midnight-ntwrk/midnight-js-protocol';
import * as Ledger9 from '@midnight-ntwrk/midnight-js-protocol/v9';
import * as Runtime9 from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import {
  ChargedState,
  ContractState,
  createCircuitContext,
  createConstructorContext,
} from '@midnight-ntwrk/compact-runtime';
import {
  SerializedContractState,
  SerializedLedgerParameters,
  SerializedZswapChainState,
  SucceedEntirely,
} from '@midnight-ntwrk/midnight-js-types';
import { Contract } from '../../../../contract/src/managed/veilcore/contract/index.js';
import {
  createVeilcorePrivateState,
  veilcoreWitnesses,
  type VeilcorePrivateState,
} from '../../../../contract/src/witnesses';
import { inspect, PHASE1_PUBLIC_CIRCUITS } from '../../../../sponsor/src/policy';
import { ProofOfWork } from '../../../../sponsor/src/pow';
import { solvePow } from './pow';
import type { CallDeps } from './prover-choice';
import { circuitOfKeyLocation } from './zk-material';

const ZKIR = resolve(import.meta.dirname, '..', '..', '..', '..', 'contract', 'src', 'managed', 'veilcore', 'zkir');
const CLAIMS_ZKIR = resolve(
  import.meta.dirname,
  '..',
  '..',
  '..',
  '..',
  'contract',
  'src',
  'managed',
  'veilcore-claims',
  'zkir',
);
const COIN = '0'.repeat(64);

/** The claims contract's state as deployed: nothing claimed yet. */
export const claimsContractState = async (): Promise<ContractState> => {
  const { Contract: Claims } = await import('../../../../contract/src/managed/veilcore-claims/contract/index.js');
  const { claimsWitnesses } = await import('../../../../contract/src/claims');
  return new Claims(claimsWitnesses).initialState(createConstructorContext({ input: {} }, COIN)).currentContractState;
};
export const ADDRESS = 'c0'.repeat(32);

/**
 * A real pre-fork verifier key (ZKIR v2, `midnight:verifier-key[v6]`), the one midnight-js 5
 * ships in its own hard-fork fixtures (a compactc 0.31.1 counter). A deployed contract
 * carries each circuit's own key; unit tests do not build keys (no proving parameters
 * offline), so the stand-in network reports this one for every circuit and the stand-in site
 * serves the same bytes as its /keys (or different ones, to test a mismatch). It has to be a
 * well-formed key: after the fork the network holds a contract's keys in ledger 9's format,
 * which refuses bytes that are not one.
 */
const PRE_FORK_KEY = new Uint8Array(
  readFileSync(
    resolve(
      import.meta.dirname,
      '../../../../node_modules/@midnight-ntwrk/testkit-js/dist/fixtures/hf/counter-016/compiled/keys/increment.verifier',
    ),
  ),
);
const PRE_FORK_PROVER_KEY = new Uint8Array(
  readFileSync(
    resolve(
      import.meta.dirname,
      '../../../../node_modules/@midnight-ntwrk/testkit-js/dist/fixtures/hf/counter-016/compiled/keys/increment.prover',
    ),
  ),
);
export const standInVerifierKey = (circuit: string): Uint8Array => {
  void circuit;
  return PRE_FORK_KEY.slice();
};

/** The contract's state after `steps` run locally (e.g. an anchor). */
export const contractStateAfter = (
  steps: {
    secret: Uint8Array;
    circuit:
      | 'anchor'
      | 'proveOwnership'
      | 'pairDna'
      | 'anchorBatch'
      | 'issueLicense'
      | 'countersignLicense'
      | 'proveLicense'
      | 'revokeLicense'
      | 'proposeParent'
      | 'confirmParent'
      | 'proposeObligation'
      | 'acceptObligation'
      | 'proposeTransfer'
      | 'approveTransfer'
      | 'withdrawTransfer';
    args: unknown[];
    /** The whole private state, when the call needs more than a record secret (a licence). */
    privateState?: VeilcorePrivateState;
  }[] = [],
): ContractState => {
  const initial = new Contract(veilcoreWitnesses).initialState(
    createConstructorContext(createVeilcorePrivateState(new Uint8Array(32).fill(9)), COIN),
  ).currentContractState;
  let data = initial.data;
  for (const s of steps) {
    const c = new Contract(veilcoreWitnesses);
    const ctx = createCircuitContext(
      ADDRESS,
      COIN,
      Object.assign(new ContractState(), { data }),
      s.privateState ?? createVeilcorePrivateState(s.secret),
    );
    const out = (c.impureCircuits[s.circuit] as (x: unknown, ...a: unknown[]) => { context: typeof ctx })(
      ctx,
      ...s.args,
    );
    data = new ChargedState(out.context.currentQueryContext.state.state);
  }
  const cs = new ContractState();
  for (const op of initial.operations()) cs.setOperation(op, initial.operation(op)!);
  cs.data = data;
  return cs;
};

export type Recorded = { url: string; body?: string; headers?: Record<string, string> };

/**
 * Which side of Midnight's ledger 9 fork the stand-in network is on. 'v8': a network not yet
 * forked (the test networks until they fork): ledger 8 states, ledger 8 transactions. 'v9':
 * mainnet since 6 November 2026: the indexer serves ledger 9 states, and midnight-js builds
 * the same ledger 8 contract's calls as ledger 9 transactions.
 */
export type Era = 'v8' | 'v9';

/** midnight-js reads the network's era from the protocol version's major (node 1.x: v8, 2.x: v9). */
export const PROTOCOL_VERSION: Record<Era, number> = { v8: 1_000_000, v9: 2_001_000 };

/**
 * The bytes the network's indexer serves for `state` on that side of the fork. After the fork
 * the network re-expresses a ledger 8 contract's state in ledger 9's format: the same ledger
 * data and the same verifier keys (`keyOf`), in ledger 9's encoding.
 */
export const servedStateBytes = (
  state: ContractState,
  era: Era,
  keyOf: (circuit: string) => Uint8Array | undefined = () => undefined,
): Uint8Array => {
  const withKeys = (set: (name: string, key: Uint8Array) => void) => {
    for (const op of state.operations()) {
      const name = typeof op === 'string' ? op : new TextDecoder().decode(op);
      set(name, keyOf(name) ?? state.operation(op)!.verifierKey);
    }
  };
  if (era === 'v8') {
    const cs = new ContractState();
    cs.data = state.data;
    withKeys((name, key) => {
      const o = state.operation(name)!;
      o.verifierKey = key;
      cs.setOperation(name, o);
    });
    return cs.serialize();
  }
  const cs = new Runtime9.ContractState();
  cs.data = new Runtime9.ChargedState(Runtime9.StateValue.decode(state.data.state.encode()));
  withKeys((name, key) => {
    const o = new Runtime9.ContractOperation();
    o.verifierKey = key;
    cs.setOperation(name, o);
  });
  return cs.serialize();
};

/** The stand-in indexer's ledger parameters and zswap state, in the era's own encoding. */
const chainParts = async (era: Era) => {
  if (era === 'v9')
    return {
      ledgerParameters: SerializedLedgerParameters.fromBytes(
        'v9',
        Ledger9.LedgerParameters.initialParameters().serialize(),
      ),
      zswapChainState: SerializedZswapChainState.fromBytes('v9', new Ledger9.ZswapChainState().serialize()),
    };
  const v8 = await loadLedger8Protocol();
  return {
    ledgerParameters: SerializedLedgerParameters.fromBytes('v8', v8.LedgerParameters.initialParameters().serialize()),
    zswapChainState: SerializedZswapChainState.fromBytes('v8', new v8.ZswapChainState().serialize()),
  };
};

/** `servedKeys: 'wrong'` serves verifier keys that are not the contract's. */
export const standIns = (
  state: ContractState,
  opts: {
    servedKeys?: 'contract' | 'wrong';
    allowedCircuits?: readonly string[];
    /** The stand-in is the claims contract (claims-call.ts): its circuits, and the sponsor paying claims on it. */
    claims?: boolean;
    /** Which side of the ledger 9 fork (Era). Default: the era in VEILCORE_TEST_ERA, else 'v9' (mainnet now). */
    era?: Era;
  } = {},
) => {
  const era: Era = opts.era ?? (process.env.VEILCORE_TEST_ERA === 'v8' ? 'v8' : 'v9');
  const zkirDir = opts.claims ? CLAIMS_ZKIR : ZKIR;
  const requests: Recorded[] = [];
  const sealed: Uint8Array[] = [];
  const checkedCircuits: string[] = [];
  const pow = new ProofOfWork(new Uint8Array(32).fill(7), 4, 600_000, () => Date.now());

  // Ledger 9 names a circuit by its deployed key's location (zk-material.ts); ledger 8 by name.
  const circuitOf = (loc: string): string => {
    const at = circuitOfKeyLocation(loc);
    if (!at) throw new Error(`Not a key location: ${loc}`);
    return at.circuit;
  };
  const km = {
    lookupKey: (loc: string) =>
      Promise.resolve({
        // Well-formed stand-ins: ledger 9's prover reads the files it is handed.
        proverKey: PRE_FORK_PROVER_KEY,
        verifierKey: standInVerifierKey(circuitOf(loc)),
        ir: jsonIrToBinary(readFileSync(resolve(zkirDir, `${circuitOf(loc)}.zkir`), 'utf8')),
      }),
    getParams: () => Promise.reject(new Error('offline')),
  };

  const fakeFetch = ((input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    requests.push({
      url,
      body: typeof init?.body === 'string' ? init.body : undefined,
      headers: init?.headers as Record<string, string>,
    });
    if (url.endsWith('/sponsor/challenge')) return Promise.resolve(new Response(JSON.stringify(pow.issue())));
    if (url.endsWith('/compiler/contract-info.json'))
      // What compactc 0.31 writes: the runtime version is what tells midnight-js this is a
      // ledger 8 contract. No integrity manifest: that compiler writes none.
      return Promise.resolve(
        new Response(readFileSync(resolve(zkirDir, '..', 'compiler', 'contract-info.json')), {
          headers: { 'content-type': 'application/json' },
        }),
      );
    if (url.endsWith('/sponsor')) {
      const b = JSON.parse(typeof init?.body === 'string' ? init.body : '{}') as {
        tx: string;
        challenge: string;
        nonce: string;
      };
      const bytes = new Uint8Array(Buffer.from(b.tx, 'base64'));
      const work = pow.verify(b.challenge, b.nonce, bytes);
      if (!work.ok)
        return Promise.resolve(new Response(JSON.stringify({ ok: false, reason: work.reason }), { status: 403 }));
      const { verdict } = inspect(
        bytes,
        {
          // A claims stand-in: the main contract is elsewhere, the claims contract is this one.
          contractAddress: opts.claims ? 'ee'.repeat(32) : ADDRESS,
          ...(opts.claims ? { claimsAddress: ADDRESS } : {}),
          allowedCircuits: new Set(opts.allowedCircuits ?? PHASE1_PUBLIC_CIRCUITS),
          maxBytes: 64_000,
          maxTtlMs: 3_600_000,
        },
        new Date(),
      );
      if (!verdict.ok)
        return Promise.resolve(
          new Response(JSON.stringify({ ok: false, reason: verdict.reason, code: verdict.code }), { status: 400 }),
        );
      sealed.push(bytes);
      return Promise.resolve(new Response(JSON.stringify({ ok: true, txId: verdict.identifiers[0] })));
    }
    // This site's /keys: by default exactly the stand-in contract's verifier keys.
    const key = /\/keys\/([A-Za-z]+)\.verifier$/.exec(url);
    if (key) {
      if (!state.operation(key[1])) return Promise.resolve(new Response('not found', { status: 404 }));
      const vk = standInVerifierKey(key[1]);
      const body = opts.servedKeys === 'wrong' ? new Uint8Array([...vk].map((b) => b ^ 1)) : vk;
      return Promise.resolve(new Response(new Uint8Array(body)));
    }
    return Promise.resolve(new Response('not found', { status: 404 }));
  }) as typeof fetch;

  // A placeholder proof in the era's own encoding (each ledger refuses the other's).
  const placeholderProof = async (): Promise<Uint8Array> =>
    era === 'v9' ? new Ledger9.Proof('0100').serialize() : new (await loadLedger8Protocol()).Proof('0100').serialize();
  const deps: CallDeps = {
    proving: () => ({
      check: (pre: Uint8Array, loc: string) => {
        checkedCircuits.push(circuitOf(loc));
        return zkCheck(pre, km);
      },
      prove: () => placeholderProof(),
      lookupKey: (loc: string) => km.lookupKey(loc),
    }),
    pow: (challenge, tx, difficulty) => Promise.resolve(solvePow(challenge, tx, difficulty)),
    origin: 'https://veilcore.test',
    fetch: fakeFetch,
    publicData: {
      // The state the call reads, served in the era's encoding, with each operation's
      // verifier key as a deployed contract would have it; everything else is the real
      // stand-in state.
      queryContractState: async () => ({
        protocolVersion: PROTOCOL_VERSION[era],
        contractState: SerializedContractState.fromBytes(era, servedStateBytes(state, era, standInVerifierKey)),
        ledgerParameters: (await chainParts(era)).ledgerParameters,
      }),
      queryZSwapAndContractState: async () => ({
        protocolVersion: PROTOCOL_VERSION[era],
        contractState: SerializedContractState.fromBytes(era, servedStateBytes(state, era, standInVerifierKey)),
        ...(await chainParts(era)),
      }),
      queryLatestProtocolVersion: () => Promise.resolve(PROTOCOL_VERSION[era]),
      queryBlock: () => Promise.resolve({ hash: 'bb'.repeat(32), height: 41, protocolVersion: PROTOCOL_VERSION[era] }),
      watchForTxData: (txId: string) =>
        Promise.resolve({
          era,
          status: SucceedEntirely,
          txId,
          txHash: 'ab'.repeat(32),
          blockHeight: 42,
          blockTimestamp: 1_790_000_000_000,
        }),
    } as never,
  };
  return { deps, requests, sealed, checkedCircuits, era };
};
