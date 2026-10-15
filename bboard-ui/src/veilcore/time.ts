// Times shown to people, always in UTC and always saying so.
//
// A record's dates are read by people in other time zones (a buyer, an examiner, a
// court). Local time with no zone, as toLocaleString printed it, made "2020-01-01 00:00"
// mean a different instant to each reader. These print the instant in UTC, labelled.
// SPDX-License-Identifier: Apache-2.0

const parse = (t: number | string): Date | null => {
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "2020-01-01 00:00 UTC", or "an unknown time" for a value that is not a date. */
export const utcStamp = (t: number | string): string => {
  const d = parse(t);
  if (!d) return 'an unknown time';
  const iso = d.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
};

/** "2020-01-01 (UTC)", or "an unknown date" for a value that is not a date. */
export const utcDate = (t: number | string): string => {
  const d = parse(t);
  return d ? `${d.toISOString().slice(0, 10)} (UTC)` : 'an unknown date';
};

/**
 * A time for the person at this screen (round 5): their local date and time, with the
 * zone's short name, so it is never read as another zone's ("15 Oct 2026, 14:32 EDT").
 * Public pages and certificates use utcStamp instead, labelled UTC.
 */
export const localStamp = (t: number | string, locale?: string): string => {
  const d = parse(t);
  return d
    ? // dateStyle/timeStyle can't be combined with timeZoneName (it throws), so the parts are named.
      d.toLocaleString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    : 'an unknown time';
};
