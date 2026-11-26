// The one plain line at the very top of a record's check page (easy-mode review, 19 Nov): what
// the page found, in one sentence, before anything else. It says no more than the lines under
// "See the checks" do, in plainer words, and it is never kinder than they are:
//   - "Dated … All checks passed in your browser." only when this browser checked the record into
//     its batch against the link's own proof code AND found the batch's date stamp on Midnight
//     itself, nothing it checked failed (a signature, the name in the link, the saved DNA report,
//     a chosen file) and no lab withdrew a signature shown on the page;
//   - a date VeilCore's server reports but this browser couldn't confirm is said as its report;
//   - a failed date check says not to rely on the date;
//   - a link without the record's proof code says it can't be checked here.
// SPDX-License-Identifier: Apache-2.0

import type { AppKey } from '../../i18n/app/en';
import type { ProofState } from '../../veilcore/proofs';
import type { AnchorState } from './anchor-words';
import type { ClaimVerdict } from '../../veilcore/claim-link';

export type VerdictTone = 'ok' | 'wait' | 'warn' | 'fail';

export type Verdict = { tone: VerdictTone; key: AppKey; date?: string | number };

/**
 * What on a record's check page didn't pass, for its top line and its fold (review of PR #140:
 * a withdrawn signature and a failed saved-report line used to leave the green line standing).
 */
export const checkProblems = (p: {
  /** Signatures the registry reports that don't verify here. */
  badSignatures: number;
  /** The registry reports a signature, but none verified here. */
  noneVerified: boolean;
  /** The name in the link against the record's: differs, or a different one beside the published name. */
  nameState: string;
  nameConflict?: boolean;
  /** The saved DNA report line (saved-report.ts publicReportLine): `failed` for a withdrawn or
   *  replaced report signature, or a chosen file that differs. */
  savedReport?: string;
  /** Signatures shown here that their signer withdrew (saved-report.ts withdrawnSignaturesLine). */
  withdrawnSignatures: boolean;
}): { failed: boolean; withdrawn: boolean } => ({
  failed:
    p.badSignatures > 0 ||
    p.noneVerified ||
    p.nameState === 'differs' ||
    (p.nameState === 'published' && !!p.nameConflict) ||
    p.savedReport === 'failed',
  withdrawn: p.withdrawnSignatures,
});

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
  /**
   * Something this browser checked failed or doesn't agree: a signature, the link's name against
   * the record's, the saved DNA report (its signature withdrawn or replaced, or a chosen file
   * that differs), or a file chosen on a document's page.
   */
  failed: boolean;
  /** A lab withdrew a signature shown on this page (valid, but no longer stood behind). */
  withdrawn?: boolean;
  testNetwork: boolean;
  /**
   * The date is from a contract VeilCore is still testing (contract version 2 on mainnet,
   * docs/contract-v2.md 7 condition 5): the same words, never the green of a full success.
   */
  stillTesting?: boolean;
  /** When the registry says the batch was dated (its word). */
  reportedAt?: string;
  /**
   * The registry says the record's batch is dated (its `anchored`). With no proof here, the
   * page couldn't check the date: never "waiting".
   */
  anchoredReported?: boolean;
  /** A document's page: no proof means VeilCore has no date for this exact document. */
  document?: boolean;
}): Verdict => {
  const problem = f.failed || !!f.withdrawn;
  if (!f.sealed) return { tone: 'warn', key: 'app.verify.verdict.nothing' };
  if (!f.bound) return { tone: 'warn', key: 'app.verify.verdict.unbound' };
  if (f.proof === 'checking' || f.signaturesChecking) return { tone: 'wait', key: 'app.verify.verdict.checking' };
  if (f.proof.status !== 'anchor-reported') {
    if (problem) return { tone: 'warn', key: 'app.verify.verdict.notYetFailed' };
    // "none" is also what a failed proof request or a proof that didn't fold gives (proofs.ts).
    if (f.proof.status === 'none' && f.anchoredReported)
      return { tone: 'warn', key: 'app.verify.verdict.dateUnchecked' };
    if (f.proof.status === 'none' && f.document) return { tone: 'warn', key: 'app.doc.verdict.noDate' };
    return { tone: 'wait', key: 'app.verify.verdict.notYet' };
  }
  const a = f.anchor;
  if (a === 'checking') return { tone: 'wait', key: 'app.verify.verdict.checking' };
  if (a !== undefined && a.status === 'failed') return { tone: 'fail', key: 'app.verify.verdict.dateFailed' };
  if (a !== undefined && a.status === 'checked') {
    if (f.failed) return { tone: 'warn', key: 'app.verify.verdict.datedButFailed', date: a.blockTime };
    if (f.withdrawn) return { tone: 'warn', key: 'app.verify.verdict.datedWithdrawn', date: a.blockTime };
    if (f.testNetwork) return { tone: 'warn', key: 'app.verify.verdict.datedTest', date: a.blockTime };
    return { tone: f.stillTesting ? 'warn' : 'ok', key: 'app.verify.verdict.dated', date: a.blockTime };
  }
  // Not looked up, or no indexer answered: the date is VeilCore's server's word.
  const reported = f.reportedAt && !Number.isNaN(Date.parse(f.reportedAt)) ? f.reportedAt : undefined;
  if (problem)
    return reported
      ? { tone: 'warn', key: 'app.verify.verdict.reportedButFailed', date: reported }
      : { tone: 'warn', key: 'app.verify.verdict.reportedNoDateButFailed' };
  return reported
    ? { tone: 'warn', key: 'app.verify.verdict.reported', date: reported }
    : { tone: 'warn', key: 'app.verify.verdict.reportedNoDate' };
};

/**
 * The claim page's top line: every claim in the link and the lab's signature on it count, and a
 * lab key that was withdrawn or is disputed is never green (review of PR #140).
 */
export const claimVerdict = (c: {
  readable: boolean;
  /** Not read on this site (viability results where they are off): no line. */
  off: boolean;
  verdict: ClaimVerdict | undefined;
  /** The link's further claims, in order (undefined: still being checked). */
  more: readonly (ClaimVerdict | undefined)[];
}): (Verdict & { date?: number }) | undefined => {
  if (!c.readable) return { tone: 'fail', key: 'app.claim.verdict.bad' };
  if (c.off) return undefined;
  const v = c.verdict;
  if (!v || c.more.some((m) => !m)) return { tone: 'wait', key: 'app.claim.verdict.checking' };
  if (!v.ok) return { tone: 'fail', key: 'app.claim.verdict.failed' };
  if (v.lab && !v.lab.ok) return { tone: 'warn', key: 'app.claim.verdict.labFailed' };
  if (v.lab?.signer?.kind === 'retracted') return { tone: 'warn', key: 'app.claim.verdict.labWithdrawn' };
  if (v.lab?.signer?.kind === 'conflict') return { tone: 'warn', key: 'app.claim.verdict.labConflict' };
  if (c.more.some((m) => m?.ok === false)) return { tone: 'warn', key: 'app.claim.verdict.someFailed' };
  return v.blockTime
    ? { tone: 'ok', key: 'app.claim.verdict.okWhen', date: v.blockTime }
    : { tone: 'ok', key: 'app.claim.verdict.ok' };
};

/** "11 October 2026", the way the visitor's language writes it, in UTC like every date on the page. */
export const VERDICT_DATE: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
};
