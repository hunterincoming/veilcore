// "Pick up where you left off": what is open, worked out from what this browser and VeilCore
// already know, one line and one button each (PickUp.tsx draws it on Home).
//
// Someone who logs off for the day and comes back should see at once what is still moving and
// what, if anything, needs them: records on their way to a date (and how far along), key date
// stamps being tried again, locked copies waiting for a checked backup, lab deliveries and
// reports, agreements waiting for the other party, and a backup older than the newest record.
// Nothing open, nothing shown. Never something already done: a key that a checked backup or
// the record's own locked copy holds is not "only in this browser" (keysOnlyHere).
// SPDX-License-Identifier: Apache-2.0

import type { StampRetryEntry } from '../../veilcore/chain/key-stamp';

/** Where a record's own date stands, as far as this browser can tell. */
export type DatingStage =
  /** Kept here, its proof code not on VeilCore yet (being sent again by itself). */
  | 'not-sent'
  /** VeilCore has its proof code: in the next batch. */
  | 'next-batch'
  /** In a batch, which is waiting for its date stamp. */
  | 'batched'
  /** Dated (the registry reports the batch's anchor). */
  | 'dated';

/** How far along a record is, of the four steps to its date. */
export const DATING_STEPS = 4;
export const datingStep = (s: DatingStage): number =>
  s === 'not-sent' ? 1 : s === 'next-batch' ? 2 : s === 'batched' ? 3 : 4;

export type PickUpItem =
  | { readonly kind: 'dating'; readonly recordId: string; readonly name: string; readonly stage: DatingStage }
  | {
      readonly kind: 'stamp';
      readonly recordId: string;
      readonly name: string;
      readonly state: 'retrying' | 'now' | 'sent' | 'cannot' | 'paused';
      readonly nextAt?: number;
    }
  | { readonly kind: 'locked-copies'; readonly count: number }
  | { readonly kind: 'fresh-backup'; readonly count: number }
  | { readonly kind: 'deliveries-sent'; readonly count: number; readonly recordId?: string }
  | { readonly kind: 'deliveries-unsigned'; readonly count: number; readonly recordId?: string }
  | { readonly kind: 'lab-unsigned'; readonly count: number; readonly recordId?: string }
  | { readonly kind: 'results'; readonly count: number; readonly recordId?: string }
  | { readonly kind: 'agreements'; readonly count: number };

export type PickUpFacts = {
  /** The holder's own records (not received ones), newest first. */
  readonly own: readonly { readonly id: string; readonly name: string; readonly loggedAt?: number }[];
  /** Each own record's date stage, once known (absent while loading or for older dated ones). */
  readonly dating: Readonly<Record<string, DatingStage | undefined>>;
  /** Records whose key date stamp is being tried again (key-stamp.ts), with their keys here and unstamped. */
  readonly stamps: Readonly<Record<string, StampRetryEntry>>;
  readonly stampingNow?: string;
  /** Records kept here whose locked copy waits for a checked backup. */
  readonly waitingForBackup: readonly string[];
  /** Records whose keys are only in this browser: no checked backup or sealed copy holds them. */
  readonly keysOnlyHere: readonly string[];
  /** The holder's lab deliveries, newest first (null while loading or not asked). */
  readonly sent?:
    | readonly {
        readonly source_record?: string;
        readonly claimed_at?: number;
        readonly receipt_attestation_id?: string | null;
      }[]
    | null;
  /** Lab reports waiting to be opened, by plant. */
  readonly resultsWaiting: Readonly<Record<string, number>>;
  /** A lab's received samples without its signed receipt yet. */
  readonly labUnsigned: readonly string[];
  /** Agreements issued here and waiting for a countersignature. */
  readonly agreementsWaiting: number;
};

/** At most this many records each for dates and stamps; the rest are counted. */
export const PICKUP_MAX_RECORDS = 5;

export const pickUpItems = (f: PickUpFacts): { items: PickUpItem[]; moreDating: number } => {
  const items: PickUpItem[] = [];
  const nameOf = (id: string) => f.own.find((r) => r.id === id)?.name ?? id;

  // Stamps first: the one place the person may have to look (one that may have gone out).
  for (const [id, e] of Object.entries(f.stamps)) {
    const state = f.stampingNow === id ? 'now' : (e.stopped ?? (e.nextAt === undefined ? 'paused' : 'retrying'));
    items.push({
      kind: 'stamp',
      recordId: id,
      name: nameOf(id),
      state,
      ...(e.nextAt !== undefined ? { nextAt: e.nextAt } : {}),
    });
  }

  // Records on their way to a date, newest first, with how far along each is.
  const undated = f.own.filter((r) => {
    const s = f.dating[r.id];
    return s !== undefined && s !== 'dated';
  });
  for (const r of undated.slice(0, PICKUP_MAX_RECORDS))
    items.push({ kind: 'dating', recordId: r.id, name: r.name, stage: f.dating[r.id] as DatingStage });

  if (f.waitingForBackup.length) items.push({ kind: 'locked-copies', count: f.waitingForBackup.length });
  // A backup older than the newest record: said once, and not on top of "locked copies",
  // which already asks for the backup.
  else if (f.keysOnlyHere.length) items.push({ kind: 'fresh-backup', count: f.keysOnlyHere.length });

  const sent = f.sent ?? [];
  const unclaimed = sent.filter((t) => !t.claimed_at);
  if (unclaimed.length)
    items.push({ kind: 'deliveries-sent', count: unclaimed.length, recordId: unclaimed[0].source_record });
  const unsigned = sent.filter((t) => t.claimed_at && !t.receipt_attestation_id);
  if (unsigned.length)
    items.push({ kind: 'deliveries-unsigned', count: unsigned.length, recordId: unsigned[0].source_record });
  if (f.labUnsigned.length)
    items.push({ kind: 'lab-unsigned', count: f.labUnsigned.length, recordId: f.labUnsigned[0] });
  const results = Object.entries(f.resultsWaiting).filter(([, n]) => n > 0);
  if (results.length)
    items.push({ kind: 'results', count: results.reduce((a, [, n]) => a + n, 0), recordId: results[0][0] });
  if (f.agreementsWaiting > 0) items.push({ kind: 'agreements', count: f.agreementsWaiting });

  return { items, moreDating: Math.max(undated.length - PICKUP_MAX_RECORDS, 0) };
};
