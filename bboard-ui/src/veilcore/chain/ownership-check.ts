// The verifier's side of "prove you hold it" (design.md, verifier rule 8).
//
// 1. The verifier makes a challenge here: 32 fresh random bytes, kept in this tab, used once.
// 2. The holder answers it from their own browser (proveOwnership), and sends back the
//    transaction id.
// 3. This page looks that transaction up on the network: it must have succeeded and be a
//    single proveOwnership call on the demo contract. In the contract state right after
//    it, the proof must answer THIS challenge and come from the record's identity, which
//    must be anchored and still live. Nothing here takes the holder's word.
//
// What it shows: whoever answered holds the secret of that on-chain identity now. With
// the identity's anchor transaction, it shows the key existed by that block (not who held
// it then, and nothing about the record's content).
//
// Whether the identity is this record's: a record sealed since 14 October 2026 names its
// own key (key-binding.ts, SPEC 3.6.1). Given the record's fingerprint, the key's salt
// and the hash of its sealed fields, the check first recomputes the fingerprint around
// the identity and refuses unless it matches, so a holder can't put a key they control
// next to someone else's record. For an older record, with nothing to match, the link
// between identity and record stays the holder's statement, and the page says so.
// SPDX-License-Identifier: Apache-2.0

import { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { ledger } from '../../../../contract/src/managed/veilcore/contract/index.js';
import { acceptOwnership } from '../../../../contract/src/verify';
import { callState } from '../../../../api/src/presentation-lookup';
import { CHAIN_CONTRACT, INDEXER_HTTP } from './config';
import { KEY_NOT_THIS_RECORDS, keyMatchesRecord, type KeyedRecord } from '../key-binding';

import { lookupChallenge, useChallenge } from './challenge-book';
export { newChallenge } from './challenge-book';

const hexToBytes = (hex: string): Uint8Array => Uint8Array.from(hex.match(/../g) ?? [], (b) => parseInt(b, 16));

export type OwnershipVerdict = { readonly accepted: boolean; readonly reason: string };

export type CheckDeps = {
  /** The contract state right after a transaction's single call to `entryPoint`. */
  readonly stateAfter?: (txId: string, entryPoint: string) => Promise<ReturnType<typeof ledger>>;
  /** The latest contract state. */
  readonly latest?: () => Promise<ReturnType<typeof ledger>>;
};

const defaultStateAfter = (txId: string, entryPoint: string) =>
  callState(INDEXER_HTTP ?? '', CHAIN_CONTRACT ?? '', txId, entryPoint);

const defaultLatest = async () => {
  const { indexerPublicDataProvider } = await import('@midnight-ntwrk/midnight-js-indexer-public-data-provider');
  const { INDEXER_WS } = await import('./config');
  const s: ContractState | null = await indexerPublicDataProvider(
    INDEXER_HTTP ?? '',
    INDEXER_WS ?? '',
    globalThis.WebSocket as never,
  ).queryContractState(CHAIN_CONTRACT ?? '');
  if (!s) throw new Error('The demo contract was not found on the network.');
  return ledger(s.data);
};

/** Check a holder's answer to this tab's challenge. */
export const checkOwnership = async (
  input: { txId: string; identity: string; challenge: string; record?: KeyedRecord },
  deps: CheckDeps = {},
): Promise<OwnershipVerdict> => {
  const challenge = input.challenge.trim().toLowerCase();
  const identity = input.identity.trim().toLowerCase();
  const txId = input.txId.trim().toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]{64}$/.test(identity))
    return { accepted: false, reason: 'This record has no on-chain identity to check.' };
  // Before the network is asked anything: is this the key the record named?
  if (input.record && !keyMatchesRecord(identity, input.record))
    return { accepted: false, reason: KEY_NOT_THIS_RECORDS };
  const issued = lookupChallenge(challenge);
  if (!issued) return { accepted: false, reason: 'This page did not make that challenge. Make a new one and send it.' };
  if (issued.used) return { accepted: false, reason: 'That challenge was already answered once. Make a new one.' };
  if (!/^[0-9a-f]+$/.test(txId)) return { accepted: false, reason: 'That is not a transaction id.' };

  let afterTx;
  try {
    afterTx = await (deps.stateAfter ?? defaultStateAfter)(txId, 'proveOwnership');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      accepted: false,
      reason: /Failed to fetch|NetworkError|Load failed|timed? ?out|aborted/i.test(msg)
        ? 'could not reach the Midnight network’s indexer; try again in a few minutes'
        : msg,
    };
  }
  let now;
  try {
    now = await (deps.latest ?? defaultLatest)();
  } catch {
    return { accepted: false, reason: 'could not read the contract’s current state; try again in a few minutes' };
  }
  const v = acceptOwnership(afterTx, hexToBytes(identity), hexToBytes(challenge), now);
  if (v.accepted) useChallenge(challenge);
  return v;
};

/** Check that a transaction anchored this identity: the state right after it names it. */
export const checkAnchor = async (txId: string, identity: string, deps: CheckDeps = {}): Promise<boolean> => {
  try {
    const after = await (deps.stateAfter ?? defaultStateAfter)(txId.trim().toLowerCase().replace(/^0x/, ''), 'anchor');
    const got = Array.from(after.lastAnchor, (b) => b.toString(16).padStart(2, '0')).join('');
    return got === identity.toLowerCase() && after.recoveryOf.member(after.lastAnchor);
  } catch {
    return false;
  }
};
