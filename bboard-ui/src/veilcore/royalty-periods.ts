// Royalty periods and their due dates, as calendar dates (design v3, 4).
//
// Due dates come only from the period dates the terms set: never from a message's signed time,
// which is the sender's own clock. All the maths is on calendar days ("2026-03-31"), with no time
// of day and no time zone. "Today" is the UTC calendar day (utcDay), the same for both sides at
// the same moment: a deadline can't pass for one side while it is still the due day for the other.
//
// Periods run from the license's start date, not from calendar quarters: a license starting
// 15 January reports 15 Jan - 14 Apr, 15 Apr - 14 Jul, and so on. The month-end rule: period k
// starts k periods of months after the start, on the start's day of the month, or on that
// month's last day when it has fewer days (a start on 31 January gives 30 April, then 31 July).
// Each period ends the day before the next one starts; the last one ends on the license's end
// date.
// SPDX-License-Identifier: Apache-2.0

import type { Period, Reporting } from './royalty-terms';

export { localDay, utcDay } from './royalty-terms';

const MONTHS: Record<Period, number> = { month: 1, quarter: 3, half: 6, year: 12 };

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const isDay = (s: unknown): s is string => typeof s === 'string' && DAY_RE.test(s);

const parts = (day: string): [number, number, number] => {
  const m = DAY_RE.exec(day);
  if (!m) throw new Error(`not a calendar date: ${day}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};
const fmt = (y: number, m: number, d: number) =>
  `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
/** Days since 1970-01-01 for a calendar date (UTC used only as a day counter). */
const dayNumber = (day: string): number => {
  const [y, m, d] = parts(day);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};
const fromDayNumber = (n: number): string => {
  const d = new Date(n * 86_400_000);
  return fmt(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
};

export const addDays = (day: string, n: number): string => fromDayNumber(dayNumber(day) + n);
/** Whole days from a to b (b later: positive). */
export const daysBetween = (a: string, b: string): number => dayNumber(b) - dayNumber(a);

/** A calendar date plus whole months, on the same day of the month or the month's last day. */
export const addMonths = (day: string, months: number): string => {
  const [y, m, d] = parts(day);
  const idx = y * 12 + (m - 1) + months;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return fmt(ny, nm, Math.min(d, last));
};

export type RoyaltyPeriod = {
  /** 1 for the first period of the license. */
  readonly index: number;
  readonly from: string;
  readonly to: string;
  /** The day its report is due, and the day payment is due (fixed from the period's end). */
  readonly reportDue: string;
  readonly paymentDue: string;
};

/**
 * Every period of a license from its start to its end date (at most 400). With no end date, the
 * periods up to `until` (a calendar date) and the one running then.
 */
export const periodsOf = (
  schedule: Reporting,
  startDate: string,
  endDate: string | undefined,
  until?: string,
): RoyaltyPeriod[] => {
  if (!isDay(startDate)) return [];
  const end = isDay(endDate) ? endDate : undefined;
  const stop = end ?? (isDay(until) ? until : undefined);
  if (!stop || stop < startDate) return [];
  const step = MONTHS[schedule.every];
  const out: RoyaltyPeriod[] = [];
  for (let k = 0; k < 400; k++) {
    const from = addMonths(startDate, k * step);
    if (from > stop) break;
    let to = addDays(addMonths(startDate, (k + 1) * step), -1);
    if (end && to > end) to = end;
    const reportDue = addDays(to, schedule.reportDueDays);
    out.push({ index: k + 1, from, to, reportDue, paymentDue: addDays(reportDue, schedule.paymentDueDays) });
    if (end && to >= end) break;
  }
  return out;
};

/** The period a calendar date falls in, if any. */
export const periodOn = (periods: readonly RoyaltyPeriod[], day: string): RoyaltyPeriod | undefined =>
  periods.find((p) => p.from <= day && day <= p.to);

/** The contract year (from the start date, twelve months at a time) a calendar date falls in. */
export const contractYearOf = (startDate: string, day: string): { from: string; to: string } => {
  let k = 0;
  while (addMonths(startDate, (k + 1) * 12) <= day && k < 200) k++;
  return { from: addMonths(startDate, k * 12), to: addDays(addMonths(startDate, (k + 1) * 12), -1) };
};

/** Whether a period is the last one of its contract year (or of the license): the minimum is topped up there. */
export const endsContractYear = (startDate: string, p: RoyaltyPeriod, endDate?: string): boolean =>
  contractYearOf(startDate, p.from).to <= p.to || (isDay(endDate) && p.to >= endDate);

/** A calendar file (RFC 5545) with one all-day event per due date, for a phone's calendar. */
export const calendarFile = (
  periods: readonly RoyaltyPeriod[],
  words: { report: (p: RoyaltyPeriod) => string; payment: (p: RoyaltyPeriod) => string },
  uidBase: string,
  now = new Date(),
): string => {
  const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  const ev = (day: string, summary: string, uid: string) => [
    'BEGIN:VEVENT',
    `UID:${uid}@veilcore.org`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${day.replace(/-/g, '')}`,
    `DTEND;VALUE=DATE:${addDays(day, 1).replace(/-/g, '')}`,
    `SUMMARY:${esc(summary)}`,
    'END:VEVENT',
  ];
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VeilCore//Royalties//EN',
    'CALSCALE:GREGORIAN',
    ...periods.flatMap((p) => [
      ...ev(p.reportDue, words.report(p), `${uidBase}-${p.index}-report`),
      ...ev(p.paymentDue, words.payment(p), `${uidBase}-${p.index}-pay`),
    ]),
    'END:VCALENDAR',
    '',
  ].join('\r\n');
};
