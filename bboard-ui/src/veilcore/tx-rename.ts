// One saved record with its transactions renamed by their hash (link-hashes.ts, records.ts
// renameTransactions). Kept apart, with no imports, so it is one pure step a test can hold.
// SPDX-License-Identifier: Apache-2.0

type Tx = { readonly txId: string };
type HasTx = Tx & { readonly attested?: Tx; readonly more?: readonly Tx[] };
type Saved = { readonly claims?: readonly HasTx[]; readonly twoClaims?: readonly Tx[]; readonly labOnChain?: Tx };

/**
 * The record with every saved transaction in `map` (identifier to hash) renamed: its claims,
 * their lab signature and further claims, its claims about two records, and its lab signature's
 * call. Undefined when nothing in it was renamed, so an untouched record is never rewritten.
 */
export const recordWithHashes = <R extends Saved>(r: R, map: ReadonlyMap<string, string>): R | undefined => {
  const hit = (t: Tx | undefined) => t !== undefined && map.has(t.txId);
  const touched =
    (r.claims ?? []).some((c) => hit(c) || hit(c.attested) || (c.more ?? []).some(hit)) ||
    (r.twoClaims ?? []).some(hit) ||
    hit(r.labOnChain);
  if (!touched) return undefined;
  const to = <T extends Tx>(t: T): T => (map.has(t.txId) ? { ...t, txId: map.get(t.txId) as string } : t);
  return {
    ...r,
    ...(r.claims
      ? {
          claims: r.claims.map((c) => ({
            ...to(c),
            ...(c.attested ? { attested: to(c.attested) } : {}),
            ...(c.more ? { more: c.more.map(to) } : {}),
          })),
        }
      : {}),
    ...(r.twoClaims ? { twoClaims: r.twoClaims.map(to) } : {}),
    ...(r.labOnChain ? { labOnChain: to(r.labOnChain) } : {}),
  };
};
