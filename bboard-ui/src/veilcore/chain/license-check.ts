// The checker's side of "prove you hold a live license from this record" (design.md,
// verifier rule 5), the license twin of ownership-check.ts.
//
// 1. The checker makes a challenge here (challenge-book.ts) and sends it in a link.
// 2. The license holder answers from their own browser (proveLicense) and posts back the
//    transaction id.
// 3. This page looks the transaction up: it must have succeeded and be a single
//    proveLicense call on VeilCore's contract. In the state right after it, the
//    presentation must answer THIS challenge for one of the record's keys, against a root
//    that still held the license (verify.ts acceptPresentationAt), and it must have landed
//    after the challenge was made and within the last hour.
//
// What it shows: whoever answered held a live license from that record when the answer
// landed. Not which license, not its terms, not who they are.
// SPDX-License-Identifier: Apache-2.0

import { acceptPresentationAt } from '../../../../contract/src/verify';
import type { ledger } from '../../../../contract/src/managed/veilcore/contract/index.js';
import { CHAIN_CONTRACT, INDEXER_HTTP } from './config';
import { lookupChallenge, usedByAnother, useChallenge } from './challenge-book';

const hexToBytes = (hex: string): Uint8Array => Uint8Array.from(hex.match(/../g) ?? [], (b) => parseInt(b, 16));

export type LicenseVerdict = { readonly accepted: boolean; readonly reason: string; readonly landedAt?: number };

export type LicenseCheckDeps = {
  /** The state right after a transaction's single proveLicense call, and when it landed. */
  readonly presentation?: (
    txId: string,
  ) => Promise<{ ledger: ReturnType<typeof ledger>; blockHeight?: number; blockTime?: number }>;
  readonly now?: () => number;
};

const defaultPresentation = async (txId: string) => {
  const { presentationWithTime } = await import('../../../../api/src/presentation-lookup');
  return presentationWithTime(INDEXER_HTTP ?? '', CHAIN_CONTRACT ?? '', txId);
};

/** Check a holder's license presentation against this browser's challenge. */
export const checkLicense = async (
  input: { txId: string; identity: string; challenge: string },
  deps: LicenseCheckDeps = {},
): Promise<LicenseVerdict> => {
  const challenge = input.challenge.trim().toLowerCase();
  const identity = input.identity.trim().toLowerCase();
  const txId = input.txId.trim().toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]{64}$/.test(identity)) return { accepted: false, reason: 'No record key to check against.' };
  const issued = lookupChallenge(challenge);
  if (!issued) return { accepted: false, reason: 'This page did not make that challenge. Make a new request.' };
  if (!/^[0-9a-f]{64}$/.test(txId)) return { accepted: false, reason: 'That is not a transaction id.' };
  // The answer that used it may be checked again (a reload mid-check); any other is refused.
  if (usedByAnother(issued, txId))
    return { accepted: false, reason: 'That challenge was already answered once. Make a new request.' };

  let found;
  try {
    found = await (deps.presentation ?? defaultPresentation)(txId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      accepted: false,
      reason: /Failed to fetch|NetworkError|Load failed|timed? ?out|aborted/i.test(msg)
        ? 'could not reach the Midnight network’s indexer; try again in a few minutes'
        : msg,
    };
  }
  const v = acceptPresentationAt(found.ledger, hexToBytes(identity), hexToBytes(challenge), {
    landedAt: found.blockTime,
    blockHeight: found.blockHeight,
    issuedAt: issued.issuedAt,
    now: (deps.now ?? Date.now)(),
  });
  // Not marked used here: the caller marks it (markUsed) once it has saved the result.
  return { ...v, ...(found.blockTime === undefined ? {} : { landedAt: found.blockTime }) };
};

/** Mark a challenge used by this answer: call only after the result is saved (challenge-book.ts). */
export const markUsed = (challenge: string, txId: string): void => useChallenge(challenge.trim().toLowerCase(), txId);
