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

import { ledger } from '../../../../contract/src/managed/veilcore/contract/index.js';
import { acceptOwnership } from '../../../../contract/src/verify';
import { fromSerialized } from '../../../../contract/src/contract-state';
import { callState } from '../../../../api/src/presentation-lookup';
import { CHAIN_CONTRACT, INDEXER_HTTP } from './config';
import { KEY_NOT_THIS_RECORDS, keyMatchesRecord, type KeyedRecord } from '../key-binding';

import { lookupChallenge, usedByAnother, useChallenge } from './challenge-book';
import { lookupFailureOf, lookupWords } from './read-failure';
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
  const read = await indexerPublicDataProvider(
    INDEXER_HTTP ?? '',
    INDEXER_WS ?? '',
    globalThis.WebSocket as never,
  ).queryContractState(CHAIN_CONTRACT ?? '');
  if (!read) throw new Error('The demo contract was not found on the network.');
  // Either ledger's bytes (before or after the network's fork): contract-state.ts.
  return ledger(fromSerialized(read.contractState).data);
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
  if (!/^[0-9a-f]+$/.test(txId)) return { accepted: false, reason: 'That is not a transaction id.' };
  // The answer that used it may be checked again (a reload mid-check); any other is refused.
  if (usedByAnother(issued, txId))
    return { accepted: false, reason: 'That challenge was already answered once. Make a new one.' };

  let afterTx;
  try {
    afterTx = await (deps.stateAfter ?? defaultStateAfter)(txId, 'proveOwnership');
  } catch (e) {
    // Couldn't reach or read Midnight is worth trying again (prove-relay.ts worthRetrying);
    // only the look-up's own verdicts are a refusal (read-failure.ts).
    return { accepted: false, reason: lookupWords(e) };
  }
  let now;
  try {
    now = await (deps.latest ?? defaultLatest)();
  } catch {
    return { accepted: false, reason: 'could not read the contract’s current state; try again in a few minutes' };
  }
  // Not marked used here: the caller marks it (markUsed) once it has saved the result, so a
  // tab closed between this answer and the save doesn't burn the challenge.
  return acceptOwnership(afterTx, hexToBytes(identity), hexToBytes(challenge), now);
};

/** Mark a challenge used by this answer: call only after the result is saved (challenge-book.ts). */
export const markUsed = (challenge: string, txId: string): void => useChallenge(challenge.trim().toLowerCase(), txId);

/**
 * Check that a transaction anchored this identity: the state right after it names it.
 * Undefined when Midnight couldn't be reached or read (read-failure.ts): not a "no".
 */
export const checkAnchor = async (
  txId: string,
  identity: string,
  deps: CheckDeps = {},
): Promise<boolean | undefined> => {
  try {
    const after = await (deps.stateAfter ?? defaultStateAfter)(txId.trim().toLowerCase().replace(/^0x/, ''), 'anchor');
    const got = Array.from(after.lastAnchor, (b) => b.toString(16).padStart(2, '0')).join('');
    return got === identity.toLowerCase() && after.recoveryOf.member(after.lastAnchor);
  } catch (e) {
    return lookupFailureOf(e) === 'refused' ? false : undefined;
  }
};
