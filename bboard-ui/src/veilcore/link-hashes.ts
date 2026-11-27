// Every transaction a claim link names, by its hash (PR #231, third review).
//
// The check page accepts a transaction only by its hash, 64 hex (tx-hash-rule.ts). Receipts made
// since PR #234 carry the hash, but a holder's device, or a backup restored from a file, can still
// hold the 66-hex identifier an older build saved: in a claim (`claims[].txId`), in the lab
// signature's call (`labOnChain.txId`) that goes into every link as `attested.txId`, and in a
// claim about two records (`twoClaims[].txId`). Before a link is made, each one is turned into
// its hash with the indexer (chain/tx-hash.ts txHashOf) and the hash is saved back, so it is done
// once. If one can't be looked up, no link is made: the page says so and to try again, never
// handing out a link that its own check page would refuse.
//
// The indexer's answer isn't taken on its word (PR #231, fourth review). Before a hash is saved,
// the claim at that hash is read from Midnight and compared with the holder's own claim, the same
// way the check page compares it (chain/claim-check.ts: compareClaim, compareAttested,
// compareTwoClaim). A hash that names some other claim, or can't be read right now, is not saved
// and no link is made: a lying or broken indexer can't leave a holder with a saved hash whose
// link always fails, and the next try asks again.
// SPDX-License-Identifier: Apache-2.0

import type { Claim } from '../../../contract/src/verify-claims';
import { txHashOf } from './chain/tx-hash';
import { claimLink, claimsOf, compareAttested, compareClaim, readClaimLink, type MadeClaim } from './claim-link';
import { compareTwoClaim, readTwoClaimLink, twoClaimLink, type TwoClaim } from './two-record-claims';
import { isTxHash } from './tx-hash-rule';

/** Asks for the hash of a transaction named by its hash or one of its identifiers. */
export type HashLookup = (idOrHash: string) => Promise<string>;

/** No link can be made right now: a saved transaction couldn't be looked up by its hash. */
export class LinkNotReady extends Error {
  constructor() {
    super('A transaction in that link could not be looked up by its hash right now.');
    this.name = 'LinkNotReady';
  }
}

/** The transaction ids a one-number claim link carries: its own, the lab's, and each further claim's. */
export const claimTxIds = (c: MadeClaim): string[] => [
  c.txId,
  ...(c.attested ? [c.attested.txId] : []),
  ...(c.more ?? []).map((m) => m.txId),
];

/**
 * Each id that isn't a hash yet, as its hash (only those: a hash is never asked about).
 * Throws LinkNotReady when any one can't be looked up, or the answer isn't a hash.
 */
export const hashesFor = async (
  ids: readonly string[],
  lookup: HashLookup = (id) => txHashOf(id),
): Promise<ReadonlyMap<string, string>> => {
  const map = new Map<string, string>();
  for (const id of new Set(ids)) {
    if (isTxHash(id)) continue;
    let hash: string;
    try {
      hash = await lookup(id);
    } catch {
      throw new LinkNotReady();
    }
    if (!isTxHash(hash)) throw new LinkNotReady();
    map.set(id, hash);
  }
  return map;
};

const swap = (id: string, map: ReadonlyMap<string, string>): string => map.get(id) ?? id;

/** A one-number claim with every transaction it names by its hash, from `map`. */
export const claimWithHashes = (c: MadeClaim, map: ReadonlyMap<string, string>): MadeClaim =>
  map.size === 0
    ? c
    : {
        ...c,
        txId: swap(c.txId, map),
        ...(c.attested ? { attested: { ...c.attested, txId: swap(c.attested.txId, map) } } : {}),
        ...(c.more ? { more: c.more.map((m) => ({ ...m, txId: swap(m.txId, map) })) } : {}),
      };

/** A two-record claim with its transaction by its hash, from `map`. */
export const twoWithHashes = <T extends TwoClaim>(c: T, map: ReadonlyMap<string, string>): T =>
  map.has(c.txId) ? { ...c, txId: swap(c.txId, map) } : c;

const hashPart = (link: string) => link.slice(link.indexOf('#'));

/**
 * What one call on the claims contract recorded, read from Midnight by its hash as the check page
 * reads it (chain/claim-check.ts): `two` for a claim about two records, otherwise a claim about
 * one number or a laboratory signature. Throws when it can't be read.
 */
export type ClaimAt = (contract: string, txHash: string, two: boolean) => Promise<Claim>;

/** The check page's own reader, loaded only when a saved id has to be turned into its hash. */
const claimAtFromIndexer: ClaimAt = async (contract, txHash, two) =>
  (await import('./chain/claim-check')).readClaimAt(contract, txHash, two);

/** Whether `check` holds for what Midnight recorded at `txHash`; false when it can't be read. */
const holdsAt = async (
  read: ClaimAt,
  contract: string,
  txHash: string,
  two: boolean,
  check: (onChain: Claim) => boolean,
): Promise<boolean> => {
  try {
    return check(await read(contract, txHash, two));
  } catch {
    return false;
  }
};

/**
 * Every hash the indexer gave for `c` names a claim saying what the holder's own claim says: the
 * same checks the check page makes. Only the ids that were just looked up are read again.
 */
const hashesHold = async (
  before: MadeClaim,
  after: MadeClaim,
  map: ReadonlyMap<string, string>,
  read: ClaimAt,
): Promise<boolean> => {
  const was = claimsOf(before);
  const now = claimsOf(after);
  for (let i = 0; i < now.length; i++) {
    if (!map.has(was[i].txId)) continue;
    const one = now[i];
    if (!(await holdsAt(read, one.contract, one.txId, false, (on) => compareClaim(one, on).ok))) return false;
  }
  if (before.attested && after.attested && map.has(before.attested.txId)) {
    const ok = await holdsAt(read, after.contract, after.attested.txId, false, (on) => compareAttested(after, on).ok);
    if (!ok) return false;
  }
  return true;
};

/** A link for `c` exactly as it is, when nothing in it needs looking up first; undefined otherwise. */
export const claimLinkNow = (c: MadeClaim, origin: string): string | undefined => {
  if (!claimTxIds(c).every(isTxHash)) return undefined;
  const link = claimLink(c, origin);
  return readClaimLink(hashPart(link)) ? link : undefined;
};

/** The same for a claim about two records. */
export const twoClaimLinkNow = (c: TwoClaim, origin: string): string | undefined => {
  if (!isTxHash(c.txId)) return undefined;
  const link = twoClaimLink(c, origin);
  return readTwoClaimLink(hashPart(link)) ? link : undefined;
};

type LinkDeps = {
  lookup?: HashLookup;
  /** Reads the claim at a hash, to check it before it is saved (tests hand in their own). */
  read?: ClaimAt;
  save?: (map: ReadonlyMap<string, string>) => void;
};

/**
 * The link for a one-number claim, its saved ids turned into hashes first and `save` told which
 * (so they are kept as hashes from then on). Each new hash is checked against Midnight before it
 * is saved (see the top of this file). Throws LinkNotReady when it can't be made right now, and
 * never returns a link this site's own check page would refuse.
 */
export const readyClaimLink = async (c: MadeClaim, origin: string, deps: LinkDeps = {}): Promise<string> => {
  const map = await hashesFor(claimTxIds(c), deps.lookup);
  const after = claimWithHashes(c, map);
  if (map.size > 0) {
    if (!(await hashesHold(c, after, map, deps.read ?? claimAtFromIndexer))) throw new LinkNotReady();
    deps.save?.(map);
  }
  const link = claimLink(after, origin);
  if (!readClaimLink(hashPart(link))) throw new LinkNotReady();
  return link;
};

/** The same for a claim about two records. */
export const readyTwoClaimLink = async (c: TwoClaim, origin: string, deps: LinkDeps = {}): Promise<string> => {
  const map = await hashesFor([c.txId], deps.lookup);
  const after = twoWithHashes(c, map);
  if (map.size > 0) {
    const read = deps.read ?? claimAtFromIndexer;
    if (!(await holdsAt(read, after.contract, after.txId, true, (on) => compareTwoClaim(after, on).ok)))
      throw new LinkNotReady();
    deps.save?.(map);
  }
  const link = twoClaimLink(after, origin);
  if (!readTwoClaimLink(hashPart(link))) throw new LinkNotReady();
  return link;
};
