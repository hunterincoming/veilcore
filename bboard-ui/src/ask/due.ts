// What's due: royalty reports, payments and agreement end dates for the live agreements in
// this browser. Where this page has read a deal's messages (deal-client.ts dealEntriesReadHere:
// a license page, the backup), each period's step comes from them, exactly as the license page
// works it out (royalty-ledger.ts periodRows): a report not sent or sent back to fix, a payment
// accepted and not made, each overdue from its due date until it is done; nothing once it is.
// Where it hasn't, the item says to open the agreement, rather than guess. Read here; nothing
// is sent. The calendar file and the reminder are made here too: the reminder says only how
// many items are due, never a name, a date or an amount, so it can go to a chat app.
// SPDX-License-Identifier: Apache-2.0

import type { License } from '../veilcore/licenses';
import type { StrainRecord } from '../veilcore/records';
import { ledgerOf, periodRows, upcomingPeriods, type Ledger } from '../veilcore/royalty-ledger';
import { addDays, periodsOf } from '../veilcore/royalty-periods';
import { dealEntriesReadHere, dealParty } from '../veilcore/deal-client';

export type DueItem = {
  /** 'check': this page hasn't read the deal's messages, so it can't say what is done. Not in the calendar. */
  readonly kind: 'report' | 'payment' | 'ends' | 'check';
  /** YYYY-MM-DD. */
  readonly date: string;
  readonly licenseId: string;
  /** The record's name when this browser holds it, else the agreement's id: never the other side's words. */
  readonly name: string;
  readonly from?: string;
  readonly to?: string;
  readonly overdue: boolean;
};

/**
 * Where a license's royalties stand, as far as this page knows:
 * - 'ledger': its deal's messages (reports, answers, payments, receipts), as read here;
 * - 'unread': it has a deal channel this page hasn't read yet;
 * - 'schedule': a practice agreement, not on chain: only the dates in its terms.
 */
export type DealState =
  | { readonly kind: 'ledger'; readonly ledger: Ledger }
  | { readonly kind: 'unread' }
  | { readonly kind: 'schedule' };

/** What this page knows of a license's deal (dealEntriesReadHere), without asking the registry. */
export const dealStateHere = (l: License): DealState => {
  const oc = l.onChain;
  if (!oc) return { kind: 'schedule' };
  // No channel yet (the terms haven't gone): nothing can have been reported or paid.
  const party = oc.termsSentAt ? dealParty(oc) : undefined;
  if (!party) return { kind: 'ledger', ledger: ledgerOf([]) };
  const entries = dealEntriesReadHere(party);
  return entries ? { kind: 'ledger', ledger: ledgerOf(entries) } : { kind: 'unread' };
};

/** The next items due, soonest first: at most `max`. Agreements this page can't check come first. */
export const dueItems = (
  licenses: readonly License[],
  records: readonly StrainRecord[],
  today: string,
  max = 20,
  stateOf: (l: License) => DealState = () => ({ kind: 'schedule' }),
): DueItem[] => {
  const out: DueItem[] = [];
  for (const l of licenses) {
    if (l.state !== 'active' || !l.terms) continue;
    const terms = l.terms;
    const name = records.find((r) => r.id === l.recordId)?.strainName || l.id;
    const item = (kind: 'report' | 'payment', date: string, p: { from: string; to: string }, overdue = false) =>
      out.push({ kind, date, licenseId: l.id, name, from: p.from, to: p.to, overdue });
    const deal = stateOf(l);
    if (deal.kind === 'unread') {
      if (terms.reporting) out.push({ kind: 'check', date: today, licenseId: l.id, name, overdue: false });
    } else if (deal.kind === 'ledger') {
      // The license page's own steps (periodRows): due and overdue exactly as it shows them.
      const rows = periodRows(terms, deal.ledger, today);
      for (const r of rows) {
        if ((r.step === 'report' || r.step === 'fix') && r.due) item('report', r.due, r.period, r.overdue > 0);
        else if (r.step === 'pay' && r.due) item('payment', r.due, r.period, r.overdue > 0);
        else if (r.step === 'running') {
          item('report', r.period.reportDue, r.period);
          item('payment', r.period.paymentDue, r.period);
        }
        // 'answer' and 'confirm' wait on a reply, with no date in the terms; 'done' is done.
      }
      // Before the first period starts: its dates, as the license page's "next" date.
      if (terms.reporting && !rows.some((r) => r.step === 'running')) {
        const next = periodsOf(terms.reporting, terms.startDate, terms.endDate, today).find((p) => p.from > today);
        if (next) {
          item('report', next.reportDue, next);
          item('payment', next.paymentDue, next);
        }
      }
    } else {
      for (const p of upcomingPeriods(terms, today).slice(0, 2)) {
        item('report', p.reportDue, p, p.reportDue < today);
        item('payment', p.paymentDue, p, p.paymentDue < today);
      }
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(terms.endDate ?? '') && terms.endDate >= today)
      out.push({ kind: 'ends', date: terms.endDate, licenseId: l.id, name, overdue: false });
  }
  const rank = (i: DueItem) => (i.kind === 'check' ? 0 : 1);
  return out
    .sort((a, b) => rank(a) - rank(b) || a.date.localeCompare(b.date) || a.licenseId.localeCompare(b.licenseId))
    .slice(0, max);
};

/** A calendar file (RFC 5545): one all-day event per item, worded by `what`. */
export const dueCalendar = (items: readonly DueItem[], what: (i: DueItem) => string, now = new Date()): string => {
  // RFC 5545 text: backslash, semicolon and comma escaped; any line break (\r\n, \r, \n) as \n;
  // other control characters dropped, so a name can't start a new line or property.
  const esc = (s: string) =>
    s
      .replace(/[\\;,]/g, (c) => `\\${c}`)
      .replace(/\r\n|\r|\n/g, '\\n')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]/g, '');
  /** A UID's parts: letters, digits, dot, dash and underscore only. */
  const uid = (s: string) => s.replace(/[^A-Za-z0-9._-]/g, '');
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VeilCore//Ask//EN',
    'CALSCALE:GREGORIAN',
    // An agreement this page couldn't check has no date of its own: not an event.
    ...items
      .filter((i) => i.kind !== 'check')
      .flatMap((i) => [
        'BEGIN:VEVENT',
        `UID:${uid(i.licenseId)}-${uid(i.kind)}-${uid(i.date)}@veilcore.org`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${i.date.replace(/-/g, '')}`,
        `DTEND;VALUE=DATE:${addDays(i.date, 1).replace(/-/g, '')}`,
        `SUMMARY:${esc(what(i))}`,
        'END:VEVENT',
      ]),
    'END:VCALENDAR',
    '',
  ].join('\r\n');
};
