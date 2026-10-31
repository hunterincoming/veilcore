// What needs the operator's attention, for GET /sponsor/alerts: an outside monitor (UptimeRobot's
// free plan, checking every 5 minutes) watches that address and emails or pushes when it stops
// answering 200. On 31 Oct 2026 the stamping job failed for hours ("could not balance dust")
// and was found only because a record stayed undated: the public status said alert:true, but
// nothing watched it. This is the thing that watches.
//
// Each problem is a short code, never the job's own words, a balance or a token: the address
// is public, and the codes tell an outsider no more than the public status already does
// (accepting, synced, alert), except that fuel is low.
// SPDX-License-Identifier: Apache-2.0

/** The codes, in the order they're checked. */
export type AlertCode = 'anchoring-failing' | 'sync-stalled' | 'not-synced' | 'fuel-low';

export type AlertInput = {
  /** The anchoring job has failed three runs in a row (anchorer.ts). Undefined: no anchoring job. */
  readonly anchoringFailing: boolean | undefined;
  /** The wallet sync has applied nothing for 30 minutes (wallet.ts checkStall). */
  readonly syncStalled: boolean;
  readonly synced: boolean;
  /** When this process started, and now (ms). A fresh wallet's first sync can take an hour. */
  readonly startedAt: number;
  readonly now: number;
  /** How long a first sync may take before it is a problem (ms). */
  readonly syncGraceMs: number;
  /** The wallet's DUST in SPECKs, once synced; undefined when it can't be read. */
  readonly dustSpecks: bigint | undefined;
  /** Below this, fuel is low (ALERT_DUST_LOW_DUST). */
  readonly dustLowSpecks: bigint;
};

/** What needs attention now; empty when all is well. */
export const alertsOf = (i: AlertInput): AlertCode[] => {
  const out: AlertCode[] = [];
  if (i.anchoringFailing === true) out.push('anchoring-failing');
  if (i.syncStalled) out.push('sync-stalled');
  if (!i.synced && i.now - i.startedAt > i.syncGraceMs) out.push('not-synced');
  // Only once synced: before that the balance isn't known yet, and "not-synced" covers it.
  if (i.synced && i.dustSpecks !== undefined && i.dustSpecks < i.dustLowSpecks) out.push('fuel-low');
  return out;
};

/** A first sync of a fresh wallet took about an hour on preprod (1 Oct 2026); three is a problem. */
export const SYNC_GRACE_MS = 3 * 60 * 60_000;
