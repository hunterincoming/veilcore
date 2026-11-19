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

  it('a missing backup is not a label on the record: Home says it once, above the list', () => {
    // BackupNeeded.tsx (easy-mode review, 19 Nov). The line is the record's own: sealed, key note.
    expect(homeStatusLine({ loggedAt }, keys(), on)).toEqual({
      text: `${sealed} · key not date stamped yet`,
      unfinished: false,
    });
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

describe('Home says "save your backup" once, for the account, not per record (easy-mode review, 19 Nov)', () => {
  it('no per-record line for a copy waiting for a backup; a copy waiting to be sent again is still said', async () => {
    const { unsavedLineKey } = await import('./plant-status-words');
    expect(unsavedLineKey('backup')).toBeUndefined();
    // A copy waiting to be sent again is a different thing, and still said.
    expect(unsavedLineKey('retry')).toBe('app.sealed.unsaved.shortRetry');
    expect(unsavedLineKey(undefined)).toBeUndefined();
  });

  it('the backup line: shown while anything needs a backup, in the older records’ own words when they wait', async () => {
    const { backupNeed } = await import('./BackupNeeded');
    const none = { keysOnlyHere: 0, waitingForBackup: false, vaultUnbacked: false, legacyWaiting: false };
    expect(backupNeed(none)).toBe('none');
    expect(backupNeed({ ...none, keysOnlyHere: 2 })).toBe('line');
    expect(backupNeed({ ...none, waitingForBackup: true })).toBe('line');
    expect(backupNeed({ ...none, vaultUnbacked: true })).toBe('line');
    expect(backupNeed({ ...none, vaultUnbacked: true, legacyWaiting: true, waitingForBackup: true })).toBe(
      'before-locking',
    );
    // Records saved before locking with a vault key already backed up: nothing to ask for.
    expect(backupNeed({ ...none, legacyWaiting: true })).toBe('none');
  });
});
