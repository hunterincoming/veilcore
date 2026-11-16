// A document kept on this device only, against a registry that lies about it
// (docs/device-only-records.md, "Fail closed"). The registry should hold the record's proof code
// and nothing else. Whatever it answers instead (an emptied row, a locked box, a plain row, another
// proof code, a claim's stub, nothing), this device's copy is what is shown and backed up, a
// restore keeps it on the device, and no request but the dating row ever carries anything of it.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRegistry, type FakeRegistry } from './fixtures/fake-registry';
import { browser, fileOf, installStorage, settle } from './fixtures/browsers';
import { stubWebLocks } from './fixtures/web-locks';
import { LIES, lieAbout } from './fixtures/dishonest-registry';
import {
  DEVICE_ONLY_STORE,
  FILE_SHA,
  MARKERS,
  RECORDS,
  backUp,
  backupText,
  nothingLeft,
  pathOf,
  sealOnDevice,
} from './fixtures/device-only-doc';

let reg: FakeRegistry;

beforeEach(() => {
  vi.unstubAllGlobals();
  installStorage();
  reg = fakeRegistry();
  vi.stubGlobal('fetch', reg.fetch);
  stubWebLocks();
  (globalThis as { document?: unknown }).document ??= {
    visibilityState: 'visible',
    createElement: () => ({ click() {} }),
  };
});

const recordPuts = () => reg.sent.filter((r) => r.method === 'PUT' && pathOf(r.url) === '/api/records');

describe('the registry empties the row of a document kept on this device only (the purge)', () => {
  it('a restore from the backup does not upload it: the mark stays, and the device copy is kept', async () => {
    const A = await browser('a');
    const record = await sealOnDevice(reg, A);
    const { text, out } = await backUp(A);
    expect(out.ok).toBe(true);
    const H = (await A.run(() => A.m.holder.holderKeyIfAny())) as string;
    // The dating row becomes { id, recordFingerprint, contentsRemoved: true }: a server alone can do this.
    reg.purge(H);
    expect(reg.rowsOf(H)[0]).toEqual({
      id: record.id,
      recordFingerprint: record.recordFingerprint,
      contentsRemoved: true,
    });

    const C = await browser('fresh');
    await C.run(async () => {
      await C.m.backup.restoreAny(fileOf(text));
      await settle(300);
      await C.m.records.hydrate();
      await settle(200);
      const back = C.m.records.getRecord(record.id);
      expect(back?.deviceOnly).toBe(true);
      expect(back?.strainName).toBe(MARKERS[0]);
      expect(C.m.api.rowStateOf(RECORDS, record.id)).not.toBe('open');
      expect(C.m.records.deviceOnlyConflict(record.id)).toBe(true);
    });
    expect(C.storage.get(DEVICE_ONLY_STORE)).toContain(record.id);
    expect(recordPuts()).toEqual([]);
    expect(reg.rowsOf(H)[0].sealed).toBeUndefined();
    expect(nothingLeft(reg, record)).toEqual([]);
  });

  it('with no restore at all, the record is still shown and still in the next backup', async () => {
    const A = await browser('a2');
    const record = await sealOnDevice(reg, A);
    expect((await backUp(A)).out.ok).toBe(true);
    const H = (await A.run(() => A.m.holder.holderKeyIfAny())) as string;
    reg.purge(H);
    const B = await browser('a2-reload', {}, 'a2');
    await B.run(async () => {
      await B.m.records.hydrate();
      await settle(150);
      await B.m.records.hydrate();
      const shown = B.m.records.getRecord(record.id);
      expect(shown?.strainName).toBe(MARKERS[0]);
      expect(shown?.deviceOnly).toBe(true);
      expect(B.m.records.deviceOnlyConflict(record.id)).toBe(true);
      // Not offered as a locked record to delete or restore: it is here.
      expect(B.m.records.lockedRecords().map((l) => l.id)).not.toContain(record.id);
    });
    const file = JSON.parse(await backupText(B)) as { recordData?: { id: string; deviceOnly?: boolean }[] };
    expect(file.recordData?.find((r) => r.id === record.id)?.deviceOnly).toBe(true);
    expect(recordPuts()).toEqual([]);
    expect(nothingLeft(reg, record)).toEqual([]);
  });
});

describe.each(LIES)('the registry answers "%s" for a document kept on this device only', (lie) => {
  it('the device copy is shown and backed up, a restore keeps it here, and nothing but the dating row is sent', async () => {
    const A = await browser(`liar-${lie}`);
    const record = await sealOnDevice(reg, A);
    const { text, out } = await backUp(A);
    expect(out.ok).toBe(true);
    await settle(150);
    lieAbout(reg, lie, record);

    // The same browser, reloaded, through several reads of the registry and every save they start.
    const B = await browser(`liar-${lie}-reload`, {}, `liar-${lie}`);
    await B.run(async () => {
      for (let i = 0; i < 3; i++) {
        await B.m.records.hydrate();
        await settle(120);
      }
      const shown = B.m.records.getRecord(record.id);
      expect(shown?.deviceOnly).toBe(true);
      expect(shown?.strainName).toBe(MARKERS[0]);
      expect(shown?.notes).toBe(MARKERS[4]);
      expect(shown?.document?.files?.[0]?.sha256).toBe(FILE_SHA);
      expect(shown?.recordFingerprint).toBe(record.recordFingerprint);
      expect(await B.m.records.checkIntegrity(shown!)).toBe('match');
      expect(B.m.records.unsavedReason(record.id)).toBeUndefined();
      expect(B.m.records.lockedRecords().map((l) => l.id)).not.toContain(record.id);
      // Said on its page when the registry's answer is not the proof code this device sent.
      expect(B.m.records.deviceOnlyConflict(record.id)).toBe(lie !== 'gone');
      // "Use this copy" and a claim can't put the server's row in its place.
      expect(B.m.records.adoptOlderCopy(record.id)).toBe(false);
      const claimed = await B.m.records.finishReceived(record.id, {}, { strainName: 'from an offer' });
      expect('error' in claimed).toBe(true);
      expect(B.m.records.getRecord(record.id)?.strainName).toBe(MARKERS[0]);
      // A save handed the server's shape of the row, by id, sends nothing either.
      const before = reg.sent.length;
      await B.m.api.apiStore.save(RECORDS, [
        { id: record.id, strainName: 'server shape', recordFingerprint: record.recordFingerprint },
      ]);
      expect(reg.sent.slice(before).filter((r) => r.method !== 'GET')).toEqual([]);
    });
    // The next backup holds it, whole, and checks.
    const next = await backUp(B);
    expect(next.out.ok).toBe(true);
    const file = JSON.parse(next.text) as { recordData: Record<string, unknown>[] };
    const inFile = file.recordData.find((r) => r.id === record.id);
    expect(inFile).toEqual(expect.objectContaining({ deviceOnly: true, strainName: MARKERS[0], notes: MARKERS[4] }));
    expect(B.storage.get(DEVICE_ONLY_STORE)).toContain(MARKERS[0]);

    // Another device, restored from the first backup while the registry lies. A registry that
    // shows rows locked with another key can stop any restore (as for every record); if the
    // restore goes ahead, the record is kept on that device, marked, and not uploaded.
    const C = await browser(`liar-${lie}-fresh`);
    const restored = await C.run(async () => {
      try {
        await C.m.backup.restoreAny(fileOf(text));
      } catch {
        return false;
      }
      await settle(300);
      await C.m.records.hydrate();
      await settle(200);
      return true;
    });
    if (restored) {
      await C.run(() => {
        const back = C.m.records.getRecord(record.id);
        expect(back?.deviceOnly).toBe(true);
        expect(back?.strainName).toBe(MARKERS[0]);
      });
      expect(C.storage.get(DEVICE_ONLY_STORE)).toContain(record.id);
    }
    expect(recordPuts()).toEqual([]);
    expect(nothingLeft(reg, record)).toEqual([]);
  });
});

describe('a backup file that carries the mark', () => {
  it('a marked record that is not a document: nothing is imported', async () => {
    const A = await browser('np');
    await A.run(async () => {
      const { sealRecord } = await import('./seal-record');
      const plant = await sealRecord({
        strainName: 'A plant',
        bredBy: 'x',
        dateCreated: '2026-10-17',
        notes: '',
        parents: [],
        photoFingerprints: [],
      } as never);
      await expect(A.m.records.importRecordRows([{ ...plant, deviceOnly: true }])).rejects.toThrow(
        /only a document.*Nothing was imported/,
      );
      expect(A.m.records.getRecord(plant.id)).toBeUndefined();
    });
    expect(reg.sent.filter((r) => r.method !== 'GET')).toEqual([]);
  });

  it('new records made through the bulk and awaited paths refuse the mark rather than drop it', async () => {
    const A = await browser('np2');
    const { sealDoc } = await import('./fixtures/device-only-doc');
    const sealed = await sealDoc(A);
    await A.run(async () => {
      await expect(A.m.records.createRecords([{ ...sealed, deviceOnly: true }])).rejects.toThrow(/this device only/);
      await expect(A.m.records.createRecordSaved({ ...sealed, deviceOnly: true })).rejects.toThrow(/this device only/);
    });
    expect(reg.sent.filter((r) => r.method !== 'GET')).toEqual([]);
  });
});
