// A claim on a record: a lender (or anyone the holder owes) records on Midnight that the record
// is pledged to them, and only they can release it (contract proposeObligation,
// acceptObligation, discharge). Anyone checking the record sees a claim is in force; it flags
// a pledge to the next lender. It is not a legal filing (docs/agreements-live.md, item 12).
//
// The claimant proposes from its own anchored identity (the partner kit, or a VeilCore record
// of its own) and sends the holder a claim link: /claim#r=<record>&o=<claim>&b=<claimant>&n=<name>.
// Everything rides in the fragment, never sent to a server. Nothing in the link is believed:
// the holder's page reads the chain for exactly that claim before offering to accept it, and a
// claim the chain doesn't show waiting is refused. The name is the claimant's own words, shown
// as theirs; the holder confirms who they are the way they would for any loan.
// SPDX-License-Identifier: Apache-2.0

const HEX64 = /^[0-9a-f]{64}$/;

export type ClaimLink = {
  /** The record's on-chain identity. */
  readonly record: string;
  /** The claim's commitment: a hash of the claimant's terms with a salt it keeps. */
  readonly claim: string;
  /** The claimant's on-chain identity. */
  readonly claimant: string;
  /** The claimant's name, in its own words (not checked). */
  readonly name: string;
};

/** The holder's link for a claim already proposed on chain. */
export const claimPath = (c: ClaimLink): string => {
  const q = new URLSearchParams({ r: c.record, o: c.claim, b: c.claimant, n: c.name.slice(0, 80) });
  return `/claim#${q.toString()}`;
};

/** A claim link's parts, or undefined when any is missing or malformed. */
export const claimFromHash = (hash: string): ClaimLink | undefined => {
  const q = new URLSearchParams(hash.replace(/^#/, ''));
  const record = (q.get('r') ?? '').toLowerCase();
  const claim = (q.get('o') ?? '').toLowerCase();
  const claimant = (q.get('b') ?? '').toLowerCase();
  const name = (q.get('n') ?? '').trim().slice(0, 80);
  if (!HEX64.test(record) || !HEX64.test(claim) || !HEX64.test(claimant) || !name) return undefined;
  if (record === claimant) return undefined; // the contract refuses a claim on one's own record
  return { record, claim, claimant, name };
};

export type ClaimStatus = 'none' | 'proposed' | 'in-force';

/** The claim's state on chain now. */
export const claimStatusNow = async (c: Pick<ClaimLink, 'record' | 'claim' | 'claimant'>): Promise<ClaimStatus> => {
  const { latestLedger } = await import('./license-invites');
  const { obligationKeyOf } = await import('./chain/actions');
  const l = await latestLedger();
  const k = Uint8Array.from(obligationKeyOf(c.record, c.claim, c.claimant).match(/../g) ?? [], (b) => parseInt(b, 16));
  return l.openObligations.member(k) ? 'in-force' : l.pendingObligations.member(k) ? 'proposed' : 'none';
};
