// The ledger's `held` state (bulk-import.ts): rows sealed for a backup and never sent are held;
// sending moves them to pending first; dropHeld forgets only held rows of the hashes given, so a
// record that may be on the registry never loses its key. And `onlyKept`: a job sends only the
// records it showed, never one sealed new.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NOT_KEPT, dropHeld, holdForBackup, loadLedger, saveLedger, sealRows, type Committer } from './bulk-import';
import { batchRows, type BatchPlan } from '../ask/batch';
import { __resetRecordKeysForTests, keysFor } from './record-keys';
import type { StrainRecord } from './records';

const local = new Map<string, string>();
beforeEach(() => {
  local.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  });
  vi.stubGlobal('fetch', () => {
    throw new Error('these tests never reach the network');
  });
  __resetRecordKeysForTests();
});

const mother = {
  id: `VEIL-${'1'.padStart(32, '0')}`,
  strainName: 'Blue Dream',
  bredBy: 'Harbour Farm',
  dateCreated: '2026-01-02',
  notes: '',
  taxon: 'Cannabis sativa',
  licenseIds: [],
  recordFingerprint: 'ab'.repeat(32),
} as unknown as StrainRecord;
const plan = (count = 3): BatchPlan => ({
  preset: 'clones',
  count,
  baseName: 'Blue Dream clone',
  bredBy: 'Harbour Farm',
  taxon: 'Cannabis sativa',
  date: '2026-11-07',
  parent: mother,
});
const ok: Committer = (batch) => Promise.resolve({ stored: batch.map((r) => r.id), refused: [] });
const lost: Committer = () => Promise.resolve({ stored: [], refused: [], retry: 'no answer' });

describe('held rows', () => {
  it('holdForBackup writes held; sending moves them to pending before the commit', async () => {
    const rows = batchRows(plan());
    await sealRows(rows, { commit: holdForBackup, batchSize: 10, gapMs: 0 });
    expect(Object.values(loadLedger().rows).map((e) => e.state)).toEqual(['held', 'held', 'held']);
    const seen: string[][] = [];
    const watching: Committer = (batch) => {
      seen.push(Object.values(loadLedger().rows).map((e) => e.state));
      return lost(batch);
    };
    await sealRows(rows, { commit: watching, gapMs: 0 });
    // Written as pending before anything left.
    expect(seen).toEqual([['pending', 'pending', 'pending']]);
  });

  it('dropHeld forgets only held rows of the hashes given, with their keys', async () => {
    const a = batchRows(plan(2));
    const b = batchRows({ ...plan(2), baseName: 'Other clone' });
    await sealRows(a, { commit: holdForBackup, batchSize: 10, gapMs: 0 });
    await sealRows(b, { commit: holdForBackup, batchSize: 10, gapMs: 0 });
    const idsA = a.map((r) => loadLedger().rows[r.hash].recordId);
    expect(await dropHeld(a.map((r) => r.hash))).toBe(2);
    for (const id of idsA) expect(keysFor(id)).toBeUndefined();
    // The other job's rows are untouched.
    expect(b.every((r) => loadLedger().rows[r.hash]?.state === 'held')).toBe(true);
  });

  it('after a crash mid-send, discarding deletes nothing: the rows are pending', async () => {
    const rows = batchRows(plan());
    await sealRows(rows, { commit: holdForBackup, batchSize: 10, gapMs: 0 });
    await sealRows(rows, { commit: lost, gapMs: 0 });
    const ids = rows.map((r) => loadLedger().rows[r.hash].recordId);
    expect(await dropHeld(rows.map((r) => r.hash))).toBe(0);
    for (const id of ids) expect(keysFor(id)).toBeDefined();
    expect(rows.every((r) => loadLedger().rows[r.hash].state === 'pending')).toBe(true);
  });

  it('sealed rows are never dropped either', async () => {
    const rows = batchRows(plan(1));
    await sealRows(rows, { commit: holdForBackup, batchSize: 10, gapMs: 0 });
    await sealRows(rows, { commit: ok, gapMs: 0 });
    expect(await dropHeld(rows.map((r) => r.hash))).toBe(0);
    expect(loadLedger().rows[rows[0].hash].state).toBe('sealed');
  });
});

describe('onlyKept', () => {
  it('sends the kept records as themselves, and seals none new', async () => {
    const rows = batchRows(plan(2));
    await sealRows(rows, { commit: holdForBackup, batchSize: 10, gapMs: 0 });
    const kept = rows.map((r) => loadLedger().rows[r.hash].recordId);
    // One row's kept record is gone (another tab discarded it): it is refused, not sealed again.
    const l = loadLedger();
    delete l.rows[rows[1].hash];
    saveLedger(l);
    const sent: string[] = [];
    const spy: Committer = (batch) => {
      sent.push(...batch.map((r) => r.id));
      return ok(batch);
    };
    const out = await sealRows(rows, { commit: spy, gapMs: 0, onlyKept: true });
    expect(sent).toEqual([kept[0]]);
    expect(out.outcomes[rows[1].hash]).toEqual({ state: 'refused', reason: NOT_KEPT });
    expect(loadLedger().rows[rows[1].hash]).toBeUndefined();
  });
});
