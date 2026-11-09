// "Do it for me": how many date stamps today (design v2, 5).
//
// The fee service sponsors up to 3 key date stamps a day per browser, but that count is kept on
// a random ticket (chain/sponsor-client.ts), and a shared farm network or mobile carrier can use
// the per-network limit (3 an hour, 10 a day) first. So the tally here is only a hint: the copy
// says "up to 3 today", and what the fee service itself answers (a refusal and its retry time)
// is what the job goes by. A job uses at most one stamp.
// SPDX-License-Identifier: Apache-2.0

import { KEY_STAMPS_PER_DAY } from '../veilcore/bulk-import';
import { keysFor } from '../veilcore/record-keys';

/** The same calendar day on this device. */
const sameDay = (a: number, b: number): boolean => {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
};

/** Stamps this browser saw land today, by the chain's own time: a hint, never the fee service's count. */
export const stampsLandedToday = (recordIds: readonly string[], now = Date.now()): number =>
  recordIds.filter((id) => {
    const at = keysFor(id)?.anchor?.anchoredAt;
    return at !== undefined && sameDay(at, now);
  }).length;

/** Whether today's free stamps look used up from here (then the stamp waits for tomorrow). */
export const stampsLookUsed = (recordIds: readonly string[], now = Date.now()): boolean =>
  stampsLandedToday(recordIds, now) >= KEY_STAMPS_PER_DAY;

/** Five past midnight tomorrow, on this device's clock: when a stamp held for tomorrow is tried. */
export const tomorrowAt = (now = Date.now()): number => {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(0, 5, 0, 0);
  return d.getTime();
};

export { KEY_STAMPS_PER_DAY };
