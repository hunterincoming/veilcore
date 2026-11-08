// What a deal message says, apart from when it was signed and what its sender numbered it.
//
// Two royalty reports from the same side for the same period that say exactly the same thing
// are one report (royalty-ledger.ts, and the published checker, veilcore-records
// checkDealRecord): a retry or a second tab that signed it again must never double what is
// owed. And a message is sent at most once for what it says (deal-client.ts sayOnce): a retry
// sends the one already signed.
// SPDX-License-Identifier: Apache-2.0

import { canonicalise } from 'veilcore-records';

/** The fields that don't change what a message says: its signed time, its id, and what a page adds. */
const NOT_CONTENT = new Set(['from', 'at', 'statementId', 'seq', 'fingerprint', 'receivedAt', 'signature', 'mine']);

/** The canonical JSON of what a message says (a body, a signed message or a page's entry alike). */
export const contentOf = (m: object): string =>
  canonicalise(Object.fromEntries(Object.entries(m).filter(([k, v]) => !NOT_CONTENT.has(k) && v !== undefined)));
