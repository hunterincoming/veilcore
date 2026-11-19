// The one plain line at the very top of a record's check page (easy-mode review, 19 Nov): what
// the page found, in one sentence, before anything else. It says no more than the lines under
// "See the checks" do, in plainer words, and it is never kinder than they are:
//   - "Dated … All checks passed in your browser." only when this browser checked the record into
//     its batch against the link's own proof code AND found the batch's date stamp on Midnight
//     itself, and nothing it checked failed (a signature, the name in the link);
//   - a date VeilCore's server reports but this browser couldn't confirm is said as its report;
//   - a failed date check says not to rely on the date;
//   - a link without the record's proof code says it can't be checked here.
// SPDX-License-Identifier: Apache-2.0

import type { AppKey } from '../../i18n/app/en';
import type { ProofState } from '../../veilcore/proofs';
import type { AnchorState } from './anchor-words';

export type VerdictTone = 'ok' | 'wait' | 'warn' | 'fail';

export type Verdict = { tone: VerdictTone; key: AppKey; date?: string | number };

export const recordVerdict = (f: {
  /** The record has a proof code at all. */
  sealed: boolean;
  /** The link's proof code matches the one the registry reports for this record. */
  bound: boolean;
  proof: ProofState | 'checking';
  /** The anchor looked up on Midnight (undefined: nothing to look up). */
  anchor: AnchorState | undefined;
  /** Signatures still being checked. */
  signaturesChecking: boolean;
  /** Something this browser checked failed: a signature, or the link's name against the record's. */
  failed: boolean;
  testNetwork: boolean;
  /** When the registry says the batch was dated (its word). */
  reportedAt?: string;
}): Verdict => {
  if (!f.sealed) return { tone: 'warn', key: 'app.verify.verdict.nothing' };
  if (!f.bound) return { tone: 'warn', key: 'app.verify.verdict.unbound' };
  if (f.proof === 'checking' || f.signaturesChecking) return { tone: 'wait', key: 'app.verify.verdict.checking' };
  if (f.proof.status !== 'anchor-reported')
    return f.failed
      ? { tone: 'warn', key: 'app.verify.verdict.notYetFailed' }
      : { tone: 'wait', key: 'app.verify.verdict.notYet' };
  const a = f.anchor;
  if (a === 'checking') return { tone: 'wait', key: 'app.verify.verdict.checking' };
  if (a !== undefined && a.status === 'failed') return { tone: 'fail', key: 'app.verify.verdict.dateFailed' };
  if (a !== undefined && a.status === 'checked') {
    if (f.failed) return { tone: 'warn', key: 'app.verify.verdict.datedButFailed', date: a.blockTime };
    if (f.testNetwork) return { tone: 'warn', key: 'app.verify.verdict.datedTest', date: a.blockTime };
    return { tone: 'ok', key: 'app.verify.verdict.dated', date: a.blockTime };
  }
  // Not looked up, or no indexer answered: the date is VeilCore's server's word.
  const reported = f.reportedAt && !Number.isNaN(Date.parse(f.reportedAt)) ? f.reportedAt : undefined;
  return reported
    ? { tone: 'warn', key: 'app.verify.verdict.reported', date: reported }
    : { tone: 'warn', key: 'app.verify.verdict.reportedNoDate' };
};

/** "11 October 2026", the way the visitor's language writes it, in UTC like every date on the page. */
export const VERDICT_DATE: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
};
