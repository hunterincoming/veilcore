// How many days the sponsor's DUST lasts at the rate it has been going (reliability audit,
// 19 Nov 2026, Tier 1 item 3c). A balance alone says "low" only once it is low; a runway says
// "low in four days" while there is still time to act.
//
// The wallet's NIGHT makes DUST all the time, up to a cap, and every fee spends some. So the
// balance read now and then shows the two together. The runway is the balance divided by how
// fast it has fallen over the readings kept (up to the last seven days, at least six hours
// apart from the newest): when it has not fallen, DUST is made at least as fast as it is spent
// and there is no runway figure (undefined), which is the good case. Until six hours of
// readings exist (after every restart) it is undefined too: not judged, never guessed.
//
// Only reads the balance the wallet already reports (wallet.ts dustBalance). Nothing here
// touches the wallet or spends.
// SPDX-License-Identifier: Apache-2.0

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

export type FuelReading = { readonly at: number; readonly specks: bigint };

export class FuelGauge {
  private readings: FuelReading[] = [];

  constructor(
    private readonly now: () => number,
    /** How long to keep readings (default 7 days). */
    private readonly windowMs = 7 * DAY,
    /** The least span of readings a runway is worked out from (default 6 hours). */
    private readonly minSpanMs = 6 * HOUR,
    /** Readings closer together than this replace the last one (default 10 minutes). */
    private readonly everyMs = 10 * 60_000,
  ) {}

  /** Note the balance now. An unknown balance (not synced) is not a reading. */
  note(specks: bigint | undefined): void {
    if (specks === undefined || specks < 0n) return;
    const at = this.now();
    const last = this.readings[this.readings.length - 1];
    if (last && at - last.at < this.everyMs) this.readings[this.readings.length - 1] = { at: last.at, specks };
    else this.readings.push({ at, specks });
    const cutoff = at - this.windowMs;
    while (this.readings.length > 2 && this.readings[0].at < cutoff) this.readings.shift();
  }

  /**
   * Days left at the rate the balance fell from the oldest reading kept to the newest, rounded
   * down to a tenth; undefined when it has not fallen or there isn't enough to tell yet.
   */
  runwayDays(): number | undefined {
    if (this.readings.length < 2) return undefined;
    const first = this.readings[0];
    const last = this.readings[this.readings.length - 1];
    const span = last.at - first.at;
    if (span < this.minSpanMs) return undefined;
    const fell = first.specks - last.specks;
    if (fell <= 0n) return undefined;
    // Days = balance / (fall per day). In bigint to a tenth of a day, so no precision is lost
    // on balances of 10^15 SPECKs a DUST.
    const tenths = (last.specks * BigInt(DAY) * 10n) / (fell * BigInt(span));
    return Number(tenths) / 10;
  }
}
