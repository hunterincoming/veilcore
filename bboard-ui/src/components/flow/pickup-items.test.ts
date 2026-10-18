// "Pick up where you left off" (pickup.ts) and the backup that a returning holder isn't asked
// for again (keys-only-here.ts).
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { pickUpItems, datingStep, type PickUpFacts } from './pickup-items';
import { keysHeldBySealedCopy } from './keys-only-here';
import { nextBatchRow, nextBatchWords } from './dating-words';
import { recordDateRow } from './plant-status-words';

const none: PickUpFacts = {
  own: [],
  dating: {},
  stamps: {},
  waitingForBackup: [],
  keysOnlyHere: [],
  sent: [],
  resultsWaiting: {},
  labUnsigned: [],
  agreementsWaiting: 0,
};

describe('Pick up where you left off', () => {
  it('nothing open: nothing shown', () => {
    expect(pickUpItems(none).items).toEqual([]);
    // Dated records, received deliveries with receipts, nothing waiting: still nothing.
    expect(
      pickUpItems({
        ...none,
        own: [{ id: 'A', name: 'A' }],
        dating: { A: 'dated' },
        sent: [{ source_record: 'A', claimed_at: 1, receipt_attestation_id: 'att' }],
      }).items,
    ).toEqual([]);
  });

  it('lists each open thing once, with one action each', () => {
    const { items, moreDating } = pickUpItems({
      ...none,
      own: [
        { id: 'A', name: 'Alpha' },
        { id: 'B', name: 'Beta' },
        { id: 'C', name: 'Gamma' },
      ],
      dating: { A: 'not-sent', B: 'next-batch', C: 'batched' },
      stamps: { A: { tries: 2, nextAt: 99, lastError: 'x', lastAt: 1 } },
      waitingForBackup: ['A'],
      keysOnlyHere: ['A'],
      sent: [
        { source_record: 'B' },
        { source_record: 'C', claimed_at: 5 },
        { source_record: 'C', claimed_at: 5, receipt_attestation_id: 'r' },
      ],
      resultsWaiting: { C: 2 },
      agreementsWaiting: 1,
    });
    expect(items.map((i) => i.kind)).toEqual([
      'stamp',
      'dating',
      'dating',
      'dating',
      // The backup is asked for once: locked copies waiting say it, so no "fresh backup" too.
      'locked-copies',
      'deliveries-sent',
      'deliveries-unsigned',
      'results',
      'agreements',
    ]);
    expect(items[0]).toMatchObject({ recordId: 'A', name: 'Alpha', state: 'retrying', nextAt: 99 });
    expect(items.filter((i) => i.kind === 'results')[0]).toMatchObject({ count: 2, recordId: 'C' });
    expect(moreDating).toBe(0);
  });

  it('a stamp that may have gone out, or is being tried now, says so', () => {
    const one = (e: object, now?: string) =>
      pickUpItems({ ...none, own: [{ id: 'A', name: 'A' }], stamps: { A: e as never }, stampingNow: now }).items[0];
    expect(one({ tries: 1, lastError: '', lastAt: 0, stopped: 'sent' })).toMatchObject({ state: 'sent' });
    expect(one({ tries: 1, lastError: '', lastAt: 0, nextAt: 5 }, 'A')).toMatchObject({ state: 'now' });
    expect(one({ tries: 30, lastError: '', lastAt: 0 })).toMatchObject({ state: 'paused' });
  });

  it('a fresh backup only when keys are only here; at most five records on their way, the rest counted', () => {
    const own = Array.from({ length: 8 }, (_, i) => ({ id: `R${i}`, name: `R${i}` }));
    const r = pickUpItems({
      ...none,
      own,
      dating: Object.fromEntries(own.map((o) => [o.id, 'next-batch' as const])),
      keysOnlyHere: ['R7'],
    });
    expect(r.items.filter((i) => i.kind === 'dating')).toHaveLength(5);
    expect(r.moreDating).toBe(3);
    expect(r.items.at(-1)).toEqual({ kind: 'fresh-backup', count: 1 });
    expect(datingStep('not-sent')).toBe(1);
    expect(datingStep('batched')).toBe(3);
  });

  it('keys a checked backup’s vault key and the record’s own locked copy hold are not "only here"', () => {
    const r = { id: 'A', secrets: { recordSecret: 's1' } };
    const held = { vaultBackedUp: true, state: 'open', kept: false };
    expect(keysHeldBySealedCopy(r, 's1', held)).toBe(true);
    expect(keysHeldBySealedCopy(r, 's2', held)).toBe(false);
    expect(keysHeldBySealedCopy(r, 's1', { ...held, vaultBackedUp: false })).toBe(false);
    expect(keysHeldBySealedCopy(r, 's1', { ...held, state: 'dating' })).toBe(false);
    expect(keysHeldBySealedCopy(r, 's1', { ...held, kept: true })).toBe(false);
  });
});

describe('the record’s date while its proof code waits for the next batch', () => {
  it('says "in the next batch", with how often a batch is dated when known', () => {
    expect(nextBatchWords(undefined, 5)).toBe(
      'Record dated: in the next batch (about every 5 minutes on the test network)',
    );
    expect(nextBatchWords(undefined, undefined)).toBe('Record dated: in the next batch');
    expect(nextBatchRow(undefined, 5)).toEqual({
      value: 'in the next batch',
      sub: 'about every 5 minutes on the test network',
    });
    expect(recordDateRow({ status: 'none' }, undefined, undefined, nextBatchRow(undefined, 5))).toEqual({
      mark: 'wait',
      value: 'in the next batch',
      sub: 'about every 5 minutes on the test network',
    });
    // Rows that don't pass it (a DNA report's dating record) keep their words.
    expect(recordDateRow({ status: 'none' }, undefined)).toEqual({ mark: 'wait', value: 'waiting for a batch' });
  });
});
