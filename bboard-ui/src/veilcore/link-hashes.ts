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
// SPDX-License-Identifier: Apache-2.0

import { txHashOf } from './chain/tx-hash';
import { claimLink, readClaimLink, type MadeClaim } from './claim-link';
import { readTwoClaimLink, twoClaimLink, type TwoClaim } from './two-record-claims';
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
 * The link for a one-number claim, its saved ids turned into hashes first and `save` told which
 * (so they are kept as hashes from then on). Throws LinkNotReady when it can't be made right now,
 * and never returns a link this site's own check page would refuse.
 */
export const readyClaimLink = async (
  c: MadeClaim,
  origin: string,
  deps: { lookup?: HashLookup; save?: (map: ReadonlyMap<string, string>) => void } = {},
): Promise<string> => {
  const map = await hashesFor(claimTxIds(c), deps.lookup);
  if (map.size > 0) deps.save?.(map);
  const link = claimLink(claimWithHashes(c, map), origin);
  if (!readClaimLink(hashPart(link))) throw new LinkNotReady();
  return link;
};

/** The same for a claim about two records. */
export const readyTwoClaimLink = async (
  c: TwoClaim,
  origin: string,
  deps: { lookup?: HashLookup; save?: (map: ReadonlyMap<string, string>) => void } = {},
): Promise<string> => {
  const map = await hashesFor([c.txId], deps.lookup);
  if (map.size > 0) deps.save?.(map);
  const link = twoClaimLink(twoWithHashes(c, map), origin);
  if (!readTwoClaimLink(hashPart(link))) throw new LinkNotReady();
  return link;
};
