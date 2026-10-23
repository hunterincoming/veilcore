// Handing a live license on to a new holder, with both the holder and the licensor agreeing.
//
// The contract has done this since it was deployed: the holder proposes moving the license
// to a commitment the new holder built with their own secret (proposeTransfer), and the
// licensor approves that exact commitment (approveTransfer). The license keeps its place;
// the old holder's proofs stop at the next seal. It never moves on one side's say-so:
// selling a protected variety on without the owner's authority is what the US PVP Act calls
// infringement (7 U.S.C. 2541), and docs/agreements-live.md item 8 says why this is not a
// token a wallet could pass on freely.
//
// The one thing to get right is WHICH commitment. The licensor learns it from the new holder
// through the registry, so it is checked the same way as a new license: commit, nonce,
// reveal, and a 6-digit code read aloud between the licensor and the new holder
// (license-invites.ts licenseCode). The licensor then signs it to the current holder over
// their deal's channel ('handon'); the holder proposes it; the licensor approves only it
// (the contract refuses any other). The current holder can't swap in their own: the
// licensor's approval names the code-checked one. The registry can't either.
//
// Steps, in order:
//   licensor: make a hand-on link for the new holder (an ordinary license invite, plus the
//     license's issuing record in the link's fragment: the new commitment is built on it,
//     not on the licensor's head now, because a moved license keeps its key);
//   new holder: accept, save the backup, read the code to the licensor;
//   licensor: check the code, send the new holder the terms (same agreement), and the
//     current holder the signed 'handon';
//   new holder: read the terms and agree;
//   current holder: hand it on (proposeTransfer);
//   licensor: approve (approveTransfer). The new holder's page sees it live on chain.
// SPDX-License-Identifier: Apache-2.0

import type { HandOnInvite, OnChainLicense } from './licenses';
import type { Step } from '../components/licensing/steps';

const stepsOf = (list: readonly (readonly [string, boolean])[]): Step[] => {
  const now = list.findIndex(([, done]) => !done);
  return list.map(([title, done], i) => ({ title, state: done ? 'done' : i === now ? 'now' : 'later' }));
};

/** The licensor's steps for a hand-on under way. */
export const issuerHandOnSteps = (h: HandOnInvite | undefined, s: { proposed: boolean }): Step[] =>
  stepsOf([
    ['Make a link for the new holder', !!h],
    ['They accept and read you their code', !!h?.commitment && !!h.askedAt],
    ['The current holder hands it on', s.proposed],
    ['You approve it', !!h?.approveTx],
  ]);

/** The new holder's steps. */
export const newHolderSteps = (s: { accepted: boolean; backedUp: boolean; agreed: boolean; live: boolean }): Step[] =>
  stepsOf([
    ['Accept', s.accepted],
    ['Save your backup (it holds your license key)', s.accepted && s.backedUp],
    ['Read them your 6-digit code', s.agreed || s.live],
    ['Read the terms and agree', s.agreed],
    ['The current holder hands it on and they approve it', s.live],
  ]);

/**
 * The license after the licensor approved the move: the new holder's deal becomes the
 * license's deal; the old one is kept in `previous` for its signed history.
 */
export const afterHandOn = (oc: OnChainLicense, approveTx: string | undefined, at: number): OnChainLicense => {
  const h = oc.handOn;
  if (!h?.commitment || !h.licenseeNonce || !h.partySecret || !h.issuerNonce)
    throw new Error('The hand-on is not ready to complete.');
  const { handOn: _h, previous = [], ...old } = oc;
  return {
    inviteId: h.inviteId,
    acceptToken: h.acceptToken,
    issuerToken: h.issuerToken,
    identity: oc.identity,
    label: h.label,
    invitedAt: h.invitedAt,
    commitHash: h.commitHash,
    issuerNonce: h.issuerNonce,
    partySecret: h.partySecret,
    termsSentAt: h.termsSentAt,
    commitment: h.commitment,
    issuerRecord: oc.issuerRecord,
    licenseeNonce: h.licenseeNonce,
    issueTx: oc.issueTx,
    issuedAt: oc.issuedAt,
    issueSeenAt: oc.issueSeenAt,
    ...(approveTx ? { activateTx: approveTx } : {}),
    activatedAt: at,
    activeSeenAt: at,
    previous: [...previous, old],
  };
};

type Entry = { readonly type: string; readonly mine: boolean; readonly from?: string; readonly at: number };

/** The licensor's latest signed 'handon' on the current holder's channel, if any. */
export const handOnOffered = <E extends Entry & { newLicense?: string; to?: string }>(
  entries: readonly E[] | undefined,
): (E & { newLicense: string; to: string }) | undefined =>
  [...(entries ?? [])]
    .filter((e) => e.type === 'handon' && !e.mine && e.from === 'issuer' && !!e.newLicense && !!e.to)
    .sort((a, b) => b.at - a.at)[0] as (E & { newLicense: string; to: string }) | undefined;

/** The holder's latest request to hand the license on, if the licensor hasn't started one since. */
export const handOnAsked = (
  entries: readonly (Entry & { type: string })[] | undefined,
  startedAt?: number,
): { to: string; note?: string; at: number } | undefined => {
  const ask = [...(entries ?? [])]
    .filter((e) => e.type === 'handon-ask' && !e.mine && e.from === 'licensee')
    .sort((a, b) => b.at - a.at)[0] as (Entry & { to?: unknown; note?: unknown }) | undefined;
  if (!ask || typeof ask.to !== 'string' || (startedAt && ask.at <= startedAt)) return undefined;
  return { to: ask.to, at: ask.at, ...(typeof ask.note === 'string' ? { note: ask.note } : {}) };
};
