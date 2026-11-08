// "Do it for me": what each step sends, for the runner (run.ts), each checking its own
// preconditions fresh right before it sends.
//
//   records  the job's own rows, sent from the bulk-import ledger as the records it showed
//            (sealRows onlyKept): never one sealed new. Under the ledger's lock. Rows sent before
//            with no answer are looked up on the server first: one there is never sent again.
//   report   the agreement read fresh (readAll), not from what a page read earlier. A report
//            from this side for the period already there: done, nothing sent. Otherwise the
//            report is built from the terms and the figures typed (royalty-ledger buildStatement)
//            and signed once (deal-client sayOnce): sent again it is the same signed message.
//   stamp    the record's key date stamp through the existing stamp path, its queue entry
//            marked as started by this approved job; a failure is handed to the stamp queue,
//            with its "may have gone out" stop.
// SPDX-License-Identifier: Apache-2.0

import { anyPending, markLanded, sealRows, NOT_KEPT, type PreparedRow, type RowFields } from '../veilcore/bulk-import';
import { registryRecordCodes } from '../veilcore/api-store';
import { heldLicense, type HeldLicense } from '../veilcore/held-licenses';
import { readAll, sayOnce, type DealParty } from '../veilcore/deal-client';
import { buildStatement, ledgerOf, liveReports } from '../veilcore/royalty-ledger';
import { withDealCurrency } from '../veilcore/royalty-terms';
import type { LicenseTerms } from '../veilcore/licenses';
import { keysFor } from '../veilcore/record-keys';
import { allRecords, getRecord } from '../veilcore/records';
import { isReceivedRecord } from '../ask/hint';
import { TabLockUnavailable } from '../veilcore/tab-lock';
import { SponsorRefusal } from '../veilcore/chain/sponsor-client';
import { DATING_PAUSED } from '../veilcore/chain/paused';
import { chainNotReady } from '../veilcore/chain/config';
import { holderRequestsPaused } from '../veilcore/holder-guard';
import { noteStampFailure, stampErrorText, stampKey, stampRetries } from '../veilcore/chain/key-stamp';
import { holdStamp } from '../veilcore/chain/stamp-background';
import { stampsLookUsed, tomorrowAt } from './capacity';
import type { Senders, StepOutcome } from './run';
import type { Job } from './store';
import { CANT_CHECK, NOT_NOTED, NO_KEY } from './whys';

const MINUTE = 60_000;

export { CANT_CHECK, NOT_NOTED, NO_KEY };

/** The job's rows as sealRows takes them: by hash only; the records are the ledger's. */
export const keptRows = (hashes: readonly string[]): PreparedRow[] =>
  hashes.map((hash, i) => ({ line: i + 1, cells: [], fields: {} as RowFields, hash, status: 'ready', problems: [] }));

export const sendRecords = async (job: Job): Promise<StepOutcome> => {
  const hashes = job.refs.rowHashes ?? [];
  if (!hashes.length) return { kind: 'failed', why: NOT_KEPT };
  // Sent before with no answer: they may be on the server. Asked first, so none goes twice.
  if (anyPending(hashes)) {
    const onRegistry = await registryRecordCodes();
    if (onRegistry === 'unknown') return { kind: 'retry', at: Date.now() + MINUTE, why: CANT_CHECK };
    // Nothing to ask with until the backup brings the key back: looked at again now and then.
    if (onRegistry === 'no-key') return { kind: 'retry', at: Date.now() + 10 * MINUTE, why: NO_KEY };
    if ((await markLanded(hashes, onRegistry)) === 'not-written')
      return { kind: 'retry', at: Date.now() + MINUTE, why: NOT_NOTED };
  }
  // Stops between batches when this page may no longer send (moved to a check or prove page,
  // or hidden): the rest goes on the next pass, as the same records.
  const r = await sealRows(keptRows(hashes), { onlyKept: true, gapMs: 2500, shouldStop: () => !pageMaySend() });
  const refused = Object.values(r.outcomes).find((o) => o.state === 'refused');
  if (refused && refused.state === 'refused') return { kind: 'failed', why: refused.reason };
  if (r.stopped) return { kind: 'retry', at: Date.now() + MINUTE, why: r.stopped };
  const saved = Object.values(r.outcomes).filter((o) => o.state === 'sealed').length;
  return { kind: 'done', note: String(saved) };
};

/** The page rule (stamp-background.ts): not a check or prove page, and visible. */
export const pageMaySend = (): boolean =>
  !holderRequestsPaused() && (typeof document === 'undefined' || document.visibilityState === 'visible');

/** This side of a held license's deal, when it can talk on it. */
export const licenseeParty = (h: HeldLicense): DealParty | undefined =>
  h.partySecret && h.issuerNonce
    ? {
        side: 'licensee',
        mySecret: h.partySecret,
        theirPublic: h.issuerNonce,
        commitment: h.commitment,
        issuerRecord: h.issuerRecord,
      }
    : undefined;

/** A held license that is live here: activated, not handed on, with terms that ask for reports. */
export const reportsLive = (h: HeldLicense | undefined): h is HeldLicense =>
  !!h &&
  !!h.activatedAt &&
  !h.handOnTx &&
  !h.handedOnSeenAt &&
  !!h.agreement &&
  (h.agreement.type === 'license' || h.agreement.type === 'breeder-share') &&
  !!(h.agreement.terms as Partial<LicenseTerms>).reporting;

export const sendReport: Senders['report'] = async (_job, ref, figures) => {
  const h = heldLicense(ref.inviteId);
  if (!reportsLive(h)) return { kind: 'failed', why: 'This agreement isn’t live in this browser any more.' };
  const party = licenseeParty(h);
  if (!party) return { kind: 'failed', why: 'This agreement isn’t live in this browser any more.' };
  if (!figures || figures.amount === undefined || !figures.currency)
    return { kind: 'failed', why: 'This report’s figures aren’t here any more.' };
  // Read fresh: a report sent from another tab or device since counts.
  let entries;
  try {
    entries = await readAll(party);
  } catch (e) {
    return { kind: 'retry', at: Date.now() + MINUTE, why: e instanceof Error ? e.message : String(e) };
  }
  const ledger = ledgerOf(entries);
  const mine = liveReports(ledger).find(
    (r) => r.statement.mine && r.statement.periodFrom === ref.periodFrom && r.statement.periodTo === ref.periodTo,
  );
  if (mine) return { kind: 'done', note: 'already' };
  const terms = withDealCurrency(
    h.agreement!.terms as unknown as LicenseTerms,
    ledger.reports[0]?.statement.currency,
    ledger.payout?.currency,
  );
  const body = buildStatement(terms, ledger, { ...ref, ...figures, type: h.agreement!.type });
  if (!body) return { kind: 'failed', why: 'A figure isn’t a plain number.' };
  // Signed only if it comes to exactly what Approve showed (the top-up and the deal's currency
  // included). Anything else (another report sent meanwhile changed the yearly minimum, the deal
  // named another currency) is refused by the plan: nothing is signed, and the page says the new
  // amount; asking again makes a new plan to approve.
  if (body.amountOwed !== figures.amount || body.currency !== figures.currency)
    return { kind: 'failed', why: `amount:${body.currency} ${body.amountOwed}` };
  try {
    const r = await sayOnce(party, body);
    return { kind: 'done', ...(r.already ? { note: 'already' } : {}) };
  } catch (e) {
    if (e instanceof TabLockUnavailable) return { kind: 'retry', at: Date.now() + MINUTE, why: e.message };
    // It may have landed: the person looks first. A retry reads fresh and sends the same message.
    return { kind: 'needsYou', why: e instanceof Error ? e.message : String(e) };
  }
};

/** What the stamp queue says of a record's stamp, as a step's outcome. */
const fromQueue = (id: string, now: number): StepOutcome | undefined => {
  const e = stampRetries()[id];
  if (!e) return undefined;
  if (e.stopped === 'sent') return { kind: 'needsYou', why: 'may-have-gone' };
  if (e.stopped === 'cannot') return { kind: 'failed', why: e.lastError };
  return { kind: 'waiting', at: e.nextAt ?? now + 5 * MINUTE, why: e.lastError };
};

export const sendStamp: Senders['stamp'] = async (job, recordId, resumed) => {
  const now = Date.now();
  const record = getRecord(recordId);
  if (keysFor(recordId)?.anchor) return { kind: 'done' };
  // Dating paused, or this build can't send: wait, never stamp (the stamp background does the same).
  if (DATING_PAUSED || chainNotReady()) return { kind: 'waiting', at: now + 60 * MINUTE, why: 'paused' };
  // Fresh: still one of the person's own records, with its keys here.
  if (!record || isReceivedRecord(record))
    return { kind: 'failed', why: 'This record isn’t one of yours here any more.' };
  if (!keysFor(recordId)) return { kind: 'failed', why: 'This record’s key isn’t in this browser.' };
  const queued = fromQueue(recordId, now);
  if (queued) return queued;
  // Left running by a crash, with nothing in the queue: it may have gone out.
  if (resumed) return { kind: 'needsYou', why: 'may-have-gone' };
  if (
    stampsLookUsed(
      allRecords().map((r) => r.id),
      now,
    )
  )
    return { kind: 'waiting', at: tomorrowAt(now), why: 'tomorrow' };
  const release = holdStamp(recordId);
  try {
    await stampKey(recordId);
    return { kind: 'done' };
  } catch (e) {
    noteStampFailure(recordId, stampErrorText(e), {
      background: true,
      byJob: job.id,
      ...(e instanceof SponsorRefusal && e.retryAfterSeconds ? { retryAfterSeconds: e.retryAfterSeconds } : {}),
    });
    return fromQueue(recordId, Date.now()) ?? { kind: 'waiting', at: Date.now() + 5 * MINUTE };
  } finally {
    release();
  }
};

export const SENDERS: Senders = { records: sendRecords, report: sendReport, stamp: sendStamp };
