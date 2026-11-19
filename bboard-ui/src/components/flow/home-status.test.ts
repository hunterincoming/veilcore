// Home's line for each plant (plant-status-words.ts homeStatusLine), round 2: a plant whose
// only missing step is its key date stamp is done, with a quiet note, not "Not finished".
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { homeStatusLine } from './plant-status-words';
import type { RecordKeys } from '../../veilcore/record-keys';

const loggedAt = Date.UTC(2026, 9, 15, 12);
const sealed = `Sealed ${new Date(loggedAt).toLocaleDateString()}`;
const keys = (more: Partial<RecordKeys> = {}): RecordKeys => ({
  recordId: 'VEIL-1',
  recordSecret: '11'.repeat(32),
  recoverySecret: '22'.repeat(32),
  createdAt: loggedAt,
  ...more,
});
const anchor = {
  identity: 'ab',
  network: 'preprod',
  contractAddress: 'c0',
  txId: 't',
  txHash: 'h',
  blockHeight: 1,
  anchoredAt: loggedAt,
} as unknown as RecordKeys['anchor'];

describe('Home’s line for a plant (test builds, where keys are date stamped from the browser)', () => {
  const on = { realChain: true };

  it('a missing backup is not said on the card: Home’s one account line says it (easy mode step 2)', () => {
    const line = homeStatusLine({ loggedAt }, keys(), on);
    expect(line.text).not.toMatch(/backup/i);
    expect(line.unfinished).toBe(false);
  });

  it('an imported plant waiting for its key stamp reads as done, with "key date stamp queued"', () => {
    expect(homeStatusLine({ loggedAt }, keys({ backedUpAt: loggedAt }), { ...on, queued: true })).toEqual({
      text: `${sealed} · key date stamp queued`,
      unfinished: false,
    });
  });

  it('a plant logged by hand without its key stamp is done too, with a quiet note', () => {
    expect(homeStatusLine({ loggedAt }, keys({ backedUpAt: loggedAt }), on)).toEqual({
      text: `${sealed} · key not date stamped yet`,
      unfinished: false,
    });
  });

  it('a stamped key, a received sample, keys on another device: no note at all', () => {
    expect(homeStatusLine({ loggedAt }, keys({ backedUpAt: loggedAt, anchor }), { ...on, queued: true }).text).toBe(
      sealed,
    );
    expect(homeStatusLine({ loggedAt, receivedFrom: 'Green Lab' }, keys({ backedUpAt: 1 }), on).text).toBe(
      'Received from Green Lab',
    );
    expect(homeStatusLine({ loggedAt }, undefined, on)).toEqual({ text: sealed, unfinished: false });
  });

  it('a build that sends nothing never mentions keys', () => {
    // The DNA report is a line of its own (veilcore/dna-tie.ts), not a note on this one.
    expect(homeStatusLine({ loggedAt, dnaFingerprint: 'd7' }, keys(), { realChain: false })).toEqual({
      text: sealed,
      unfinished: false,
    });
  });
});

describe('Home says "save and check your backup" once per record (live walk, 18 Nov)', () => {
  it('no locked-copy line when the card already says the record is not in a backup', async () => {
    const { unsavedLineKey } = await import('./plant-status-words');
    expect(unsavedLineKey('backup', true)).toBeUndefined();
    expect(unsavedLineKey('backup', false)).toBe('app.sealed.unsaved.short');
    // A copy waiting to be sent again is a different thing, and still said.
    expect(unsavedLineKey('retry', true)).toBe('app.sealed.unsaved.shortRetry');
    expect(unsavedLineKey(undefined, true)).toBeUndefined();
  });
});
