// Which name of a transaction this site passes on.
//
// Midnight names one transaction two ways:
//   identifier  what the wallet (here, the sponsor) gets back when it sends one: 33 bytes,
//               66 hex characters (a leading byte, then 32). One transaction can have several.
//   hash        the transaction's hash once it is in a block: 32 bytes, 64 hex characters.
//               One transaction has exactly one.
//
// The registry, the checker's prove link, licence notices and every evidence bundle take the
// HASH (the registry refuses anything but 64 hex). The site's own readers (anchor-check,
// ownership-check, license-check, claim-check) take either. So every receipt this site makes
// carries the hash as `txId` (actions.ts, claims-call.ts), and anything that posts a
// transaction to the registry goes through `txHashOf` first, which also turns an identifier
// saved by an older build into its hash. The first real mainnet run (26 Nov 2026) found the
// identifier being passed on and refused.
// SPDX-License-Identifier: Apache-2.0

import { INDEXER_HTTP } from './config';

export const TX_HASH = /^[0-9a-f]{64}$/;

const norm = (s: string): string => s.trim().toLowerCase().replace(/^0x/, '');

/** A transaction hash as it is passed on (lower case, no 0x); undefined when it isn't one. */
export const asTxHash = (s: string | undefined): string | undefined => {
  if (typeof s !== 'string') return undefined;
  const h = norm(s);
  return TX_HASH.test(h) ? h : undefined;
};

/**
 * The hash a just-landed call's receipt carries. The network gave it; one that isn't 64 hex is
 * refused here, so nothing downstream is handed a value the registry would refuse.
 */
export const landedHash = (fromIndexer: string): string => {
  const h = asTxHash(fromIndexer);
  if (!h) throw new Error('The network included it, but its transaction hash could not be read');
  return h;
};

const QUERY = `query VEILCORE_TX_HASH($byId: TransactionOffset!) {
  transactions(offset: $byId) { hash ... on RegularTransaction { identifiers } }
}`;

export type TxHashDeps = { readonly fetch?: typeof fetch; readonly indexer?: string; readonly timeoutMs?: number };

/**
 * The hash for a transaction named by its hash or by one of its identifiers. A hash comes back
 * as it is, without asking anything. An identifier is looked up on the indexer: exactly one
 * transaction must carry it, with a 64-hex hash. Throws a plain sentence otherwise.
 */
export const txHashOf = async (idOrHash: string, deps: TxHashDeps = {}): Promise<string> => {
  const id = norm(idOrHash);
  if (TX_HASH.test(id)) return id;
  if (!/^[0-9a-f]+$/.test(id)) throw new Error('that is not a transaction id');
  const indexer = deps.indexer ?? INDEXER_HTTP;
  if (!indexer) throw new Error('no Midnight indexer is configured, so that transaction can’t be looked up');
  let body: { data?: { transactions?: unknown } | null };
  try {
    const res = await (deps.fetch ?? fetch)(indexer, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { byId: { identifier: id } } }),
      signal: AbortSignal.timeout(deps.timeoutMs ?? 15_000),
    });
    if (!res.ok) throw new Error(String(res.status));
    body = (await res.json()) as typeof body;
  } catch {
    throw new Error('could not reach the Midnight network’s indexer; try again in a few minutes');
  }
  const list: unknown = body?.data?.transactions;
  const txs: unknown[] = Array.isArray(list) ? list : [];
  const hashes = new Set<string>();
  for (const t of txs) {
    if (typeof t !== 'object' || t === null) continue;
    const { hash, identifiers } = t as { hash?: unknown; identifiers?: unknown };
    const ids = Array.isArray(identifiers) ? identifiers.filter((x) => typeof x === 'string').map(norm) : [];
    const h = typeof hash === 'string' ? asTxHash(hash) : undefined;
    if (h && ids.includes(id)) hashes.add(h);
  }
  if (hashes.size === 0) throw new Error('the network has no such transaction yet; try again in a minute');
  if (hashes.size > 1) throw new Error('more than one transaction answers to that id');
  return [...hashes][0];
};
