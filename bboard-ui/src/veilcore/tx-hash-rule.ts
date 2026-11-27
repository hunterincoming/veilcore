// The one form a check link may name a Midnight transaction in: its hash, 64 lowercase hex
// characters, the same rule the record's own date check applies (chain/anchor-check.ts HEX64).
//
// Why only that (PR #231, second review): the indexer can't parse anything else and answers
// "invalid transaction hash", which a check would otherwise have read as "couldn't reach
// Midnight" and left amber forever. A link that names its transaction any other way is refused
// as invalid before anything is asked. The site's own links carry the hash (PR #234). A link
// made earlier may carry the 66-hex identifier the fee sponsor answered with: it is refused too,
// with its own words, so its holder knows to ask for a new one.
// SPDX-License-Identifier: Apache-2.0

/** A Midnight transaction hash: 64 lowercase hex characters. */
export const TX_HASH = /^[0-9a-f]{64}$/;

/** The transaction identifier the fee sponsor answers a send with: a leading byte, then 32 (66 hex). */
const TX_IDENTIFIER = /^[0-9a-f]{66}$/;

export const isTxHash = (v: unknown): v is string => typeof v === 'string' && TX_HASH.test(v);

/**
 * Whether a link's decoded content names any transaction by its 66-hex identifier instead of its
 * hash (`txId`, at the top, under `attested` or in `more`): an older link, refused with its own words.
 */
export const namesIdentifier = (o: unknown): boolean => {
  if (typeof o !== 'object' || o === null) return false;
  const r = o as Record<string, unknown>;
  const ids = [
    r.txId,
    (r.attested as Record<string, unknown> | undefined)?.txId,
    ...(Array.isArray(r.more) ? r.more.map((m) => (m as Record<string, unknown> | null)?.txId) : []),
  ];
  return ids.some((id) => typeof id === 'string' && TX_IDENTIFIER.test(id));
};
