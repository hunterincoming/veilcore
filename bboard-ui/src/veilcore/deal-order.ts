// The order of a deal's messages: the registry's `seq`, which a sender can't choose, never the
// sender's own clock (`at`, which only has to fall between 2020 and a day ahead). A message signed
// with an earlier time can't jump ahead of one already there (panel review, M2). Only a copy with
// no registry order (an old downloaded deal record, made before records kept `seq`) falls back
// to signed times. No imports: the ledger, the deal client and the hand-on rules all use it.
// SPDX-License-Identifier: Apache-2.0

type Ordered = { readonly at: number; readonly signature?: string; readonly seq?: number };

/** Oldest first, in the registry's order (signed times only when some message has no `seq`). */
export const dealOrder = <T extends Ordered>(entries: readonly T[]): T[] => {
  const bySeq = entries.length > 0 && entries.every((e) => typeof e.seq === 'number' && e.seq > 0);
  return [...entries].sort((a, b) =>
    bySeq ? a.seq! - b.seq! : a.at - b.at || ((a.signature ?? '') < (b.signature ?? '') ? -1 : 1),
  );
};

/** The newest of these, in the registry's order. */
export const latestOf = <T extends Ordered>(entries: readonly T[]): T | undefined => dealOrder(entries).pop();
