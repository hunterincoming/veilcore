// The words for a record sealed with no signal, and for its own timestamps (docs/offline.md).
//
// The rule: a record is dated when its proof code reaches VeilCore, never earlier. Until then
// the only time there is is the device's own clock, said as such ("this device's clock"), and
// the line says the date comes when it is sent. A timestamp authority's time is the token's own,
// checked on this device (veilcore/instant-stamp.ts), and the line says the Midnight date
// follows while the batch has none.
// SPDX-License-Identifier: Apache-2.0

import type { Translator } from '../../i18n/translate';
import { localStamp, utcStamp } from '../../veilcore/time';
import type { InstantState } from '../../veilcore/instant-stamp';

/** The device's own clock time for a moment: "05:02", or with the day when it isn't today. */
export const deviceClock = (t: number, locale: string | undefined, now: number = Date.now()): string => {
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const sameDay = new Date(now).toDateString() === d.toDateString();
  return sameDay ? time : `${d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} ${time}`;
};

/**
 * "Sealed on this device at 05:02 (this device's clock, not checked). Dated when it's sent."
 * Always "this device": guessing phone or computer from the screen got it wrong on phones
 * (a phone was told "this computer"), and a wrong word here is worse than a plain one.
 */
export const sealedHereWords = (loggedAt: number, tr: Translator): string =>
  tr.t('app.offline.sealedHere', { time: deviceClock(loggedAt, tr.locale) });

/** The short line for a list: "Sealed 05:02, dated when sent". */
export const sealedHereShort = (loggedAt: number, tr: Translator): string =>
  tr.t('app.offline.short', { time: deviceClock(loggedAt, tr.locale) });

/**
 * When the proof code of a record sealed with no signal goes: by itself where the browser can wake
 * VeilCore's worker when signal is back (Background Sync), otherwise the next time VeilCore is
 * opened with signal (iPhone, iPad, Safari, Firefox). Said so, so nobody thinks it went.
 */
export const goesWords = (tr: Translator): string => {
  let sync = false;
  try {
    sync = typeof window !== 'undefined' && 'SyncManager' in window;
  } catch {
    sync = false;
  }
  return tr.t(sync ? 'app.offline.goesBySelf' : 'app.offline.goesOnOpen');
};

/**
 * A record's own timestamps, one line each, earliest first: the first says the Midnight date
 * follows while the batch has none (`anchored` false). Nothing while there are none. When the
 * authorities disagree by more than five minutes, one line says so and none leads (TSA-5).
 * `when` writes the time, to the minute (the checks list gives the seconds; review P-1): UTC on
 * a check page, the person's own zone on their own pages.
 */
export const instantLines = (
  state: InstantState | undefined,
  anchored: boolean,
  tr: Translator,
  when: (iso: string) => string = utcStamp,
): string[] => {
  if (!state) return [];
  if (state.status === 'asking') return [tr.t('app.instant.asking')];
  if (state.status !== 'stamped') return [];
  if (state.disagree) return [tr.t('app.instant.disagree')];
  return state.tokens.map((tok, i) =>
    tr.t(i === 0 && !anchored ? 'app.instant.pending' : 'app.instant.also', { time: when(tok.at), tsa: tok.tsa }),
  );
};

/** The same, in the person's own time zone (their own pages). */
export const instantLinesHere = (state: InstantState | undefined, anchored: boolean, tr: Translator): string[] =>
  instantLines(state, anchored, tr, (iso) => localStamp(iso, tr.locale));
