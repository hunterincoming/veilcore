// One sealing for every new record (seal-record.ts): a plant logged by hand and a row of a
// collection come out the same; and one save for a batch of new records (records.ts
// createRecords), which dating a collection sends through.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sealRecord } from './seal-record';
import { recordRowHash, rowHashOf, sealRowRecord, registryCommit, type RowFields } from './bulk-import';
import {
  RECORDS_KEY,
  allRecords,
  checkIntegrity,
  createRecord,
  createRecords,
  hydrate,
  type StrainRecord,
} from './records';
import { fingerprintRecord } from './commitment';
import { __resetRecordKeysForTests, keysFor } from './record-keys';
import { bindingForSecret } from './key-binding';
import { store, type SaveResult } from './store';
import { emptyDraft, sealInputOf, type Draft } from '../components/flow/log-flow-state';

const local = new Map<string, string>();
beforeEach(() => {
  local.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  });
  __resetRecordKeysForTests();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** The registry, as far as these tests need it: a set kept in memory, and every save seen. */
const fakeRegistry = (answer?: (value: StrainRecord[]) => SaveResult) => {
  let held: StrainRecord[] = [];
  const saves: StrainRecord[][] = [];
  vi.spyOn(store, 'save').mockImplementation((key: string, value: unknown[]) => {
    expect(key).toBe(RECORDS_KEY);
    const v = value as StrainRecord[];
    saves.push(v);
    const out = answer?.(v) ?? { ok: true, refused: [] };
    if (!out.offline && !out.refused.some((r) => r.id === '*')) {
      const no = new Set(out.refused.map((r) => r.id));
      held = v.filter((r) => !no.has(r.id));
    }
    return Promise.resolve(out);
  });
  const load = vi.spyOn(store, 'load').mockImplementation(() => Promise.resolve(held as never[]));
  return { saves, load, set: (r: StrainRecord[]) => (held = r) };
};

// The same plant, as typed into the logging flow and as a row of a collection.
const DRAFT: Draft = {
  ...emptyDraft(),
  strainName: '  Harbour Mist ',
  bredBy: 'Green Lab ',
  dateCreated: '2021-03-14',
  parents: [{ name: 'A' }, { name: 'B' }],
  taxon: ' Rubus idaeus ',
  refId: ' TC-1',
  notes: ' first cut ',
};
const ROW: RowFields = {
  strainName: 'Harbour Mist',
  bredBy: 'Green Lab',
  dateCreated: '2021-03-14',
  parents: [{ name: 'A' }, { name: 'B' }],
  taxon: 'Rubus idaeus',
  refId: 'TC-1',
  notes: 'first cut',
};
/** What differs between two sealings of the same plant: the id, its key, and the nonce. */
const PER_SEALING = ['id', 'nonce', 'keyBinding', 'recordFingerprint', 'nameSalt'] as const;
const without = (r: StrainRecord) => {
  const o: Record<string, unknown> = { ...r };
  for (const k of PER_SEALING) delete o[k];
  return o;
};

describe('a plant logged by hand and a row of a collection', () => {
  it('seal to the same fields, and the same fingerprint once the nonce and key are the same', async () => {
    fakeRegistry();
    const now = 1_760_000_000_000;
    // The logging flow: Review.seal is createRecord(await sealRecord(sealInputOf(draft))).
    const byHand = createRecord(await sealRecord(sealInputOf(DRAFT), now));
    const fromRow = await sealRowRecord(ROW, now);

    expect(without(byHand)).toEqual(without(fromRow));
    expect(Object.keys(byHand)).toEqual(Object.keys(fromRow));
    expect(byHand.id).not.toBe(fromRow.id);
    expect(byHand.nonce).not.toBe(fromRow.nonce);
    expect(byHand.keyBinding).not.toBe(fromRow.keyBinding);
    // The fingerprint covers the nonce and the key, and nothing else that differs.
    expect(await fingerprintRecord({ ...byHand, nonce: fromRow.nonce as string, keyBinding: fromRow.keyBinding })).toBe(
      fromRow.recordFingerprint,
    );

    for (const r of [byHand, fromRow]) {
      expect(await checkIntegrity(r)).toBe('match');
      // Each names its own key, kept in this browser.
      const k = keysFor(r.id);
      expect(k?.createdAt).toBe(now);
      expect(r.keyBinding).toBe(bindingForSecret(k!.recordSecret).keyBinding);
    }
    // A row sealed by hand is the row a collection would have made: it is never sealed twice.
    expect(recordRowHash(byHand)).toBe(rowHashOf(ROW));
  });

  it('a draft is sealed with its text trimmed and its photos as fingerprints only', () => {
    const fp = 'ab'.repeat(32);
    const input = sealInputOf({
      ...DRAFT,
      breedingMethod: 'Clone / cutting',
      photos: [{ name: 'a.jpg', fingerprint: fp }],
    });
    expect(input).toEqual({
      strainName: 'Harbour Mist',
      bredBy: 'Green Lab',
      dateCreated: '2021-03-14',
      notes: 'first cut',
      parents: [{ name: 'A' }, { name: 'B' }],
      breedingMethod: 'Clone / cutting',
      photoFingerprints: [fp],
      refId: 'TC-1',
      taxon: 'Rubus idaeus',
    });
  });

  it('no species: left off the record, either way', async () => {
    const r = await sealRecord({ ...sealInputOf({ ...DRAFT, taxon: '  ' }) });
    expect(r.taxon).toBeUndefined();
    expect((await sealRowRecord({ ...ROW, taxon: '' })).taxon).toBeUndefined();
  });
});

describe('createRecords: a batch of new records in one save', () => {
  it('one save: the batch first, then every record already here; the set is read back after', async () => {
    const reg = fakeRegistry();
    const old = await sealRowRecord({ ...ROW, strainName: 'Old' });
    reg.set([old]);
    await hydrate();
    const a = await sealRowRecord({ ...ROW, strainName: 'A' });
    const b = await sealRowRecord({ ...ROW, strainName: 'B' });
    reg.load.mockClear();

    const out = await createRecords([a, b]);
    expect(out).toEqual({ ok: true, refused: [] });
    expect(reg.saves).toHaveLength(1);
    expect(reg.saves[0].map((r) => r.id)).toEqual([a.id, b.id, old.id]);
    expect(reg.saves[0][0]).toEqual(a);
    expect(reg.load).toHaveBeenCalledTimes(1);
    expect(allRecords().map((r) => r.id)).toEqual([a.id, b.id, old.id]);

    // Sent again (no answer last time): the same records, not new ones, and not twice.
    await createRecords([a]);
    expect(reg.saves[1].map((r) => r.id)).toEqual([a.id, b.id, old.id]);
  });

  it('not read back when the registry could not be reached or refused the whole save', async () => {
    let answer: SaveResult = { ok: false, refused: [], offline: true };
    const reg = fakeRegistry(() => answer);
    const a = await sealRowRecord(ROW);
    expect(await createRecords([a])).toEqual(answer);
    answer = { ok: false, refused: [{ id: '*', reason: 'Too many saves. Try again in a minute.' }] };
    expect(await createRecords([a])).toEqual(answer);
    expect(reg.load).not.toHaveBeenCalled();
    // A refusal of one record is read back: the set then shows what the registry holds.
    answer = { ok: false, refused: [{ id: a.id, reason: 'taken' }] };
    await createRecords([a]);
    expect(reg.load).toHaveBeenCalledTimes(1);
  });

  it('dating a collection sends its batches through it, and words what happened as before', async () => {
    let answer: SaveResult = { ok: true, refused: [] };
    const reg = fakeRegistry(() => answer);
    const a = await sealRowRecord({ ...ROW, strainName: 'A' });
    const b = await sealRowRecord({ ...ROW, strainName: 'B' });
    expect(await registryCommit([a, b])).toEqual({ stored: [a.id, b.id], refused: [] });
    expect(reg.saves).toHaveLength(1);

    answer = { ok: false, refused: [{ id: b.id, reason: 'taken' }] };
    expect(await registryCommit([a, b])).toEqual({ stored: [a.id], refused: [{ id: b.id, reason: 'taken' }] });
    answer = { ok: false, refused: [], offline: true };
    expect(await registryCommit([a])).toEqual({ stored: [], refused: [], retry: "Couldn't reach VeilCore's server." });
    answer = { ok: false, refused: [{ id: '*', reason: 'Busy.' }] };
    expect(await registryCommit([a])).toEqual({ stored: [], refused: [], retry: 'Busy.' });
  });
});
