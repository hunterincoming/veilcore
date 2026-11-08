// What a deal message says, apart from when it was signed and what its sender numbered it.
//
// Two royalty reports from the same side that say exactly the same thing are one report
// (royalty-ledger.ts, and the published checker, veilcore-records checkDealRecord, SPEC 11.10):
// a retry or a second tab that signed it again must never double what is owed. And a message is
// sent at most once for what it says (deal-client.ts sayOnce): a retry sends the one already
// signed.
//
// The rule is the checker's, exactly: the canonical form of the message as signed, with `from`,
// `at` and `statementId` removed. Any other field, even one this app doesn't know, counts: two
// messages that differ in it are two. A page adds its own fields to what it read (`seq`,
// `signature`, `mine`...), and a message signed with a field of one of those names has it
// written over, so the content is taken from the message as signed when the page read it.
// SPDX-License-Identifier: Apache-2.0

import { canonicalise } from 'veilcore-records';

/** What a sender doesn't say: who it is, when it signed, and what it numbered the report. */
const NOT_SAID = new Set(['from', 'at', 'statementId']);
/** What a page adds to a message it read (deal-client.ts DealEntry). */
const PAGE = new Set(['seq', 'fingerprint', 'receivedAt', 'signature', 'mine']);

const said = (m: object, skip: (k: string) => boolean): string =>
  canonicalise(Object.fromEntries(Object.entries(m).filter(([k, v]) => !skip(k) && v !== undefined)));

/** Each entry a page read, and what its message said as signed. */
const asSigned = new WeakMap<object, string>();

/** Note what an entry's message said as signed (deal-client.ts readAll, before the page's fields go on). */
export const noteSigned = <T extends object>(entry: T, signed: object): T => {
  asSigned.set(
    entry,
    said(signed, (k) => NOT_SAID.has(k)),
  );
  return entry;
};

/** The canonical JSON of what a message says: a body, or a message as signed. */
export const contentOf = (m: object): string => said(m, (k) => NOT_SAID.has(k));

/**
 * What an entry a page read says: as signed, when the page noted it (readAll); otherwise (an
 * entry made some other way) without the page's own fields.
 */
export const entryContent = (e: object): string => asSigned.get(e) ?? said(e, (k) => NOT_SAID.has(k) || PAGE.has(k));
