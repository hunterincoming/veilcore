// "Show these two records are different" and "Show a correction only changed what it says",
// apart from their screen (components/document/TwoRecordClaims.tsx): the checks made here before
// anything is proved, the claim call (chain/claims-call.ts), and what is kept of it.
//
// What leaves the browser for one: the claims contract is read from the indexer, the site's own
// proving files are fetched, and the proved transaction goes to Midnight through the sponsor. It
// carries both records' commitments, the form's id and, for a correction, the list of numbers
// allowed to change. Never a number or a salt. The registry is sent nothing new: the claim is
// kept on this device's copy of both records.
//
// The sponsor doesn't pay for these two calls yet (config/copy.ts TWO_RECORD_CLAIMS_SPONSORED), so
// nothing is sent from a real build until it does; only a test or the end-to-end build's stand-in
// for Midnight (chain/e2e-chain.ts `proveTwo`) gets past that.
// SPDX-License-Identifier: Apache-2.0

import { addTwoClaim, isKeptOnDeviceOnly, type StrainRecord } from './records';
import { claimMaterial, commitmentHex, type ClaimMaterial } from './claims-input';
import type { DocumentRecordLike } from './document-profile';
import type { HeldFieldSet } from './field-set';
import { distinctRefusal, maskOf, slotsOfMask, unchangedRefusal, type HeldTwoClaim } from './two-record-claims';
import { TWO_RECORD_CLAIMS_SPONSORED } from '../config/copy';
import { CLAIMS_READY } from './chain/config';
import { e2eChain } from './chain/e2e-chain';
import { enT } from '../i18n/translate';

type Receipt = {
  readonly contract: string;
  readonly txId: string;
  readonly blockHeight: number;
  readonly blockTime?: number;
};
type Progress = { readonly progress?: (msg: string) => void };

/** The two calls (chain/claims-call.ts). A test hands in its own, to read what a claim is given. */
export type TwoClaimCalls = {
  readonly proveDistinctOnChain: (a: ClaimMaterial, b: ClaimMaterial, opts: Progress) => Promise<Receipt>;
  readonly proveUnchangedOnChain: (
    original: ClaimMaterial,
    corrected: ClaimMaterial,
    mayChange: readonly number[],
    opts: Progress,
  ) => Promise<Receipt>;
};

/** The end-to-end build's stand-in for the two calls (chain/e2e-chain.ts); undefined in every other build. */
const e2eCalls = (): TwoClaimCalls | undefined => {
  const prove = e2eChain()?.proveTwo;
  if (!prove) return undefined;
  return {
    proveDistinctOnChain: () => Promise.resolve(prove({ circuit: 'proveDistinct' })),
    proveUnchangedOnChain: (_a, _b, mayChange) =>
      Promise.resolve(prove({ circuit: 'proveUnchanged', mayChange: [...mayChange] })),
  };
};

/**
 * Whether this build can send these two claims: the sponsor pays for them and a claims contract
 * is configured, or the end-to-end build's stand-in answers for Midnight.
 */
export const twoClaimsReadyHere = (o: { sponsored?: boolean; claimsReady?: boolean } = {}): boolean =>
  ((o.sponsored ?? TWO_RECORD_CLAIMS_SPONSORED) && (o.claimsReady ?? CLAIMS_READY)) || !!e2eChain()?.proveTwo;

type Opts = Progress & {
  readonly calls?: TwoClaimCalls;
  /** Tests: whether the sponsor pays for them (config/copy.ts TWO_RECORD_CLAIMS_SPONSORED). */
  readonly sponsored?: boolean;
};

const refuseWith = (r: { key: Parameters<typeof enT.t>[0]; vars?: Record<string, string> }): never => {
  throw new Error(enT.t(r.key, r.vars));
};

const callsFor = async (opts: Opts): Promise<TwoClaimCalls> => {
  if (opts.calls) return opts.calls;
  const stand = e2eCalls();
  if (stand) return stand;
  if (!(opts.sponsored ?? TWO_RECORD_CLAIMS_SPONSORED)) throw new Error(enT.t('app.tworec.err.unpaid'));
  return import('./chain/claims-call');
};

const checkedPair = (a: StrainRecord, b: StrainRecord): void => {
  // A record kept on this device only isn't offered: its numbers never leave unless its holder turns
  // proving on, on its own page (prove-number.ts), and that choice is one record's, not a pair's.
  if (isKeptOnDeviceOnly(a) || isKeptOnDeviceOnly(b)) throw new Error(enT.t('app.tworec.err.deviceOnly'));
};

const materialOf = (r: StrainRecord) => claimMaterial(r as DocumentRecordLike & { fieldSet: HeldFieldSet });

const kept = (
  kind: HeldTwoClaim['kind'],
  receipt: Receipt,
  first: StrainRecord,
  second: StrainRecord,
  a: ClaimMaterial,
  b: ClaimMaterial,
  mayChange?: readonly number[],
): HeldTwoClaim => {
  const claim: HeldTwoClaim = {
    ids: [first.id, second.id],
    kind,
    contract: receipt.contract,
    txId: receipt.txId,
    blockHeight: receipt.blockHeight,
    ...(receipt.blockTime !== undefined ? { blockTime: receipt.blockTime } : {}),
    record: commitmentHex(a),
    other: commitmentHex(b),
    ...(first.keyBinding ? { keyBinding: first.keyBinding } : {}),
    ...(second.keyBinding ? { otherKeyBinding: second.keyBinding } : {}),
    schema: first.fieldSet!.schema,
    ...(mayChange ? { mayChange: [...mayChange] } : {}),
  };
  addTwoClaim(claim);
  return claim;
};

/** Prove on Midnight that `first` and `second` differ in at least k of their form's compared numbers. */
export const proveDistinct = async (
  first: StrainRecord,
  second: StrainRecord,
  opts: Opts = {},
): Promise<HeldTwoClaim> => {
  checkedPair(first, second);
  const why = distinctRefusal(first, second);
  if (why) refuseWith(why);
  const calls = await callsFor(opts);
  const [a, b] = await Promise.all([materialOf(first), materialOf(second)]);
  if (commitmentHex(a) === commitmentHex(b)) refuseWith({ key: 'app.tworec.refuse.sameRecord' });
  const receipt = await calls.proveDistinctOnChain(a, b, { progress: opts.progress });
  return kept('distinct', receipt, first, second, a, b);
};

/**
 * Prove on Midnight that `corrected` holds the same numbers as `original` outside `mayChange`
 * (slot numbers). The list is published.
 */
export const proveUnchanged = async (
  original: StrainRecord,
  corrected: StrainRecord,
  mayChange: readonly number[],
  opts: Opts & { readonly words?: (slot: number) => string } = {},
): Promise<HeldTwoClaim> => {
  checkedPair(original, corrected);
  const slots = slotsOfMask(maskOf(mayChange));
  const why = unchangedRefusal(original, corrected, slots, opts.words);
  if (why) refuseWith(why);
  const calls = await callsFor(opts);
  const [a, b] = await Promise.all([materialOf(original), materialOf(corrected)]);
  if (commitmentHex(a) === commitmentHex(b)) refuseWith({ key: 'app.tworec.refuse.sameRecord' });
  const receipt = await calls.proveUnchangedOnChain(a, b, slots, { progress: opts.progress });
  return kept('unchanged', receipt, original, corrected, a, b, slots);
};
