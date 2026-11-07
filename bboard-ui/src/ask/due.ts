// What's due: royalty reports, payments and agreement end dates, from the signed terms of the
// live agreements in this browser (royalty-periods.ts), and nothing else. Read here; nothing is
// sent. The calendar file and the reminder are made here too: the reminder says only how many
// items are due, never a name, a date or an amount, so it can go to a chat app.
// SPDX-License-Identifier: Apache-2.0

import type { License } from '../veilcore/licenses';
import type { StrainRecord } from '../veilcore/records';
import { upcomingPeriods } from '../veilcore/royalty-ledger';
import { addDays } from '../veilcore/royalty-periods';

export type DueItem = {
  readonly kind: 'report' | 'payment' | 'ends';
  /** YYYY-MM-DD. */
  readonly date: string;
  readonly licenseId: string;
  /** The record's name when this browser holds it, else the agreement's id: never the other side's words. */
  readonly name: string;
  readonly from?: string;
  readonly to?: string;
  readonly overdue: boolean;
};

/** The next items due, soonest first: at most `max`. */
export const dueItems = (
  licenses: readonly License[],
  records: readonly StrainRecord[],
  today: string,
  max = 20,
): DueItem[] => {
  const out: DueItem[] = [];
  for (const l of licenses) {
    if (l.state !== 'active' || !l.terms) continue;
    const name = records.find((r) => r.id === l.recordId)?.strainName || l.id;
    for (const p of upcomingPeriods(l.terms, today).slice(0, 2)) {
      out.push({
        kind: 'report',
        date: p.reportDue,
        licenseId: l.id,
        name,
        from: p.from,
        to: p.to,
        overdue: p.reportDue < today,
      });
      out.push({
        kind: 'payment',
        date: p.paymentDue,
        licenseId: l.id,
        name,
        from: p.from,
        to: p.to,
        overdue: p.paymentDue < today,
      });
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(l.terms.endDate ?? '') && l.terms.endDate >= today)
      out.push({ kind: 'ends', date: l.terms.endDate, licenseId: l.id, name, overdue: false });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.licenseId.localeCompare(b.licenseId)).slice(0, max);
};

/** A calendar file (RFC 5545): one all-day event per item, worded by `what`. */
export const dueCalendar = (items: readonly DueItem[], what: (i: DueItem) => string, now = new Date()): string => {
  const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VeilCore//Ask//EN',
    'CALSCALE:GREGORIAN',
    ...items.flatMap((i) => [
      'BEGIN:VEVENT',
      `UID:${i.licenseId}-${i.kind}-${i.date}@veilcore.org`,
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
