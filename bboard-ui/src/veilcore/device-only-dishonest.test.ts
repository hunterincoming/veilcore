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
import { LIES, lieAbout, lieEverywhere } from './fixtures/dishonest-registry';
import {
  DEVICE_ONLY_STORE,
  FILE_SHA,
  MARKERS,
  RECORDS,
  backUp,
  backupText,
  nothingLeft,
  pathOf,
  sealDoc,
  sealOnDevice,
} from './fixtures/device-only-doc';

const OUTBOX_STORE = 'veilcore.outbox.v1';

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

describe.each(LIES)(
  'every route of the registry lies ("%s" for the rows), and anything unexpected is refused',
  (lie) => {
    it('the record stays here, whole, and only the three-field dating row is ever sent', async () => {
      const A = await browser(`all-${lie}`);
      const record = await sealOnDevice(reg, A);
      const { text, out } = await backUp(A);
      expect(out.ok).toBe(true);
      await settle(150);
      const { seen, denied } = lieEverywhere(reg, lie, record);

      const B = await browser(`all-${lie}-reload`, {}, `all-${lie}`);
      await B.run(async () => {
        for (let i = 0; i < 3; i++) {
          await B.m.records.hydrate();
          await settle(120);
        }
        // The sharing choices the registry made up are read too, and nothing is shared for it.
        await B.m.disclosure.listGrants();
        await B.m.disclosure.loadGrant(record.id);
        await B.m.records.hydrate();
        await settle(120);
        const shown = B.m.records.getRecord(record.id);
        expect(shown?.deviceOnly).toBe(true);
        expect(shown?.strainName).toBe(MARKERS[0]);
        expect(shown?.grant).toBeUndefined();
        expect(shown?.licenseIds ?? []).toEqual([]);
        expect(await B.m.records.checkIntegrity(shown!)).toBe('match');
        // The evidence the registry made up is asked for, and nothing is sent with the asking.
        const { gatherEvidence } = await import('./evidence/bundle');
        await gatherEvidence(shown!).catch(() => undefined);
      });
      const next = await backUp(B);
      expect(next.out.ok).toBe(true);
      expect((JSON.parse(next.text) as { recordData: { id: string }[] }).recordData.map((r) => r.id)).toContain(
        record.id,
      );
      const C = await browser(`all-${lie}-fresh`);
      await C.run(async () => {
        try {
          await C.m.backup.restoreAny(fileOf(text));
        } catch {
          /* a registry showing rows locked with another key can stop a restore; it can't make one upload */
        }
        await settle(300);
        await C.m.records.hydrate();
        await settle(200);
      });

      // Everything the liar was sent: reads, and the dating row of three fields. Nothing typed.
      expect(denied).toEqual([]);
      for (const r of seen) {
        for (const m of [...MARKERS, 'deviceOnly', FILE_SHA]) expect(r.body, `${r.method} ${r.path}`).not.toContain(m);
        if (r.method === 'GET') continue;
        expect(`${r.method} ${r.path}`).toBe('PUT /api/records/dating');
        for (const row of JSON.parse(r.body) as Record<string, unknown>[])
          expect(Object.keys(row).every((k) => ['id', 'recordFingerprint', 'keyBinding'].includes(k))).toBe(true);
      }
      expect(nothingLeft(reg, record)).toEqual([]);
    });
  },
);

describe('the mark is set when a record is sealed, and by nothing after', () => {
  it('a marked row for a record waiting in the send queue is refused: it stays an ordinary record, and deleting is not offered', async () => {
    const A = await browser('q');
    const sealed = await sealDoc(A, 'Ordinary, waiting for the backup');
    const record = await A.run(async () => {
      const r = A.m.records.createRecord(sealed);
      await settle(150);
      expect(A.m.records.unsavedReason(r.id)).toBe('backup');
      return r;
    });
    await A.run(async () => {
      const out = await A.m.records.importRecordRows([{ ...record, deviceOnly: true }]);
      expect(out).toEqual(expect.objectContaining({ added: 0, notImported: 1 }));
      await settle(150);
      await A.m.records.hydrate();
      const shown = A.m.records.getRecord(record.id);
      expect(shown?.deviceOnly).toBeUndefined();
      expect(A.m.records.isKeptOnDeviceOnly(shown)).toBe(false);
      expect(A.m.records.deleteDeviceOnly(record.id)).toBe(false);
      expect(A.m.outbox.inOutbox(record.id)).toBe(true);
    });
    expect(A.storage.get(DEVICE_ONLY_STORE) ?? '').not.toContain(record.id);
  });

  it('a record kept on this device only that also sits in the send queue is taken out of the queue, and deleting it uploads nothing', async () => {
    const A = await browser('q2');
    const record = await sealOnDevice(reg, A);
    // As the earlier build of this branch could leave it: an unmarked copy in the send queue.
    const H = (await A.run(() => A.m.holder.holderKeyIfAny())) as string;
    const { deviceOnly: _mark, ...unmarked } = record;
    void _mark;
    A.storage.set(OUTBOX_STORE, JSON.stringify({ [H.toLowerCase()]: { [record.id]: unmarked } }));
    const B = await browser('q2-reload', {}, 'q2');
    await B.run(async () => {
      expect(B.m.outbox.inOutbox(record.id)).toBe(false);
      await B.m.records.hydrate();
      await settle(150);
      expect(B.m.records.getRecord(record.id)?.deviceOnly).toBe(true);
    });
    expect((await backUp(B)).out.ok).toBe(true);
    await settle(300);
    expect(B.storage.get(OUTBOX_STORE) ?? '').not.toContain(record.id);
    await B.run(async () => {
      expect(B.m.records.deleteDeviceOnly(record.id)).toBe(true);
      await settle(150);
      await B.m.records.hydrate();
      await settle(300);
      expect(B.m.records.getRecord(record.id)).toBeUndefined();
    });
    const C = await browser('q2-again', {}, 'q2');
    await C.run(async () => {
      await C.m.records.hydrate();
      await settle(300);
    });
    expect(recordPuts()).toEqual([]);
    expect(nothingLeft(reg, record)).toEqual([]);
  });

  it('an unmarked row for a record kept on this device only never clears the mark', async () => {
    const A = await browser('q3');
    const record = await sealOnDevice(reg, A);
    expect((await backUp(A)).out.ok).toBe(true);
    await A.run(async () => {
      const { deviceOnly: _mark, ...unmarked } = A.m.records.getRecord(record.id)!;
      void _mark;
      const out = await A.m.records.importRecordRows([unmarked]);
      expect(out).toEqual(expect.objectContaining({ added: 0, alreadyHere: 1 }));
      await settle(200);
      await A.m.records.hydrate();
      await settle(200);
      expect(A.m.records.getRecord(record.id)?.deviceOnly).toBe(true);
      expect(A.m.outbox.inOutbox(record.id)).toBe(false);
    });
    expect(A.storage.get(DEVICE_ONLY_STORE)).toContain(record.id);
    expect(recordPuts()).toEqual([]);
    expect(nothingLeft(reg, record)).toEqual([]);
  });
});

describe('round three of review', () => {
  it('a crafted backup cannot set the mark through its list of unreadable entries: a readable record there is not taken, nor any entry for a record known as ordinary', async () => {
    const A = await browser('c');
    const up = await sealDoc(A, 'Uploaded, ordinary');
    const queued = await sealDoc(A, 'Second, ordinary');
    const uploaded = await A.run(async () => {
      const r = A.m.records.createRecord(up);
      await settle(150);
      return r;
    });
    const { text, out } = await backUp(A);
    expect(out.ok).toBe(true);
    await settle(300);
    // A third, made after the backup and with the registry refusing saves: it waits in the send queue.
    reg.misbehave.fault = (method, path) => (method === 'PUT' && path === '/api/records' ? 'fail' : undefined);
    const waiting = await A.run(async () => {
      const r = A.m.records.createRecord(queued);
      await settle(200);
      expect(A.m.outbox.inOutbox(r.id)).toBe(true);
      return r;
    });
    const file = JSON.parse(text) as Record<string, unknown>;
    const crafted = JSON.stringify({
      ...file,
      deviceOnlyUnreadable: {
        // Reads as a record, marked, with other words: not "unreadable" at all.
        [uploaded.id]: { ...uploaded, strainName: 'What the file says', deviceOnly: true },
        // Really unreadable, under the id of a record waiting to be sent.
        [waiting.id]: { id: waiting.id, notes: 42 },
        // A readable marked record under an id nobody holds: it is a record, so not taken from here either.
        'VEIL-00000000000000000000000000000001': {
          ...uploaded,
          id: 'VEIL-00000000000000000000000000000001',
          deviceOnly: true,
        },
      },
    });
    await A.run(async () => {
      await A.m.backup.restoreAny(fileOf(crafted));
      await settle(300);
      await A.m.records.hydrate();
      await settle(200);
      const shown = A.m.records.getRecord(uploaded.id);
      expect(shown?.strainName).toBe('Uploaded, ordinary');
      expect(shown?.deviceOnly).toBeUndefined();
      expect(A.m.records.isKeptOnDeviceOnly(shown)).toBe(false);
      expect(A.m.records.isKeptOnDeviceOnly(A.m.records.getRecord(waiting.id))).toBe(false);
      expect(A.m.outbox.inOutbox(waiting.id)).toBe(true);
      expect(A.m.records.damagedDeviceOnly()).toEqual([]);
      expect(A.m.records.getRecord('VEIL-00000000000000000000000000000001')).toBeUndefined();
    });
    expect(A.storage.get(DEVICE_ONLY_STORE) ?? '{}').not.toContain('VEIL-');
  });

  it('the warning follows the registry’s latest answer: a wrong answer, then the right one, and it is gone', async () => {
    const A = await browser('w');
    const record = await sealOnDevice(reg, A);
    expect((await backUp(A)).out.ok).toBe(true);
    const kept = A.storage.get(DEVICE_ONLY_STORE);
    for (const lie of ['sealed', 'plain', 'purged'] as const) {
      lieAbout(reg, lie, record);
      const B = await browser(`w-${lie}`, {}, 'w');
      await B.run(async () => {
        await B.m.records.hydrate();
        await settle(120);
        expect(B.m.records.deviceOnlyConflict(record.id)).toBe(true);
        reg.misbehave.fault = null;
        await B.m.records.hydrate();
        await settle(120);
        expect(B.m.records.deviceOnlyConflict(record.id)).toBe(false);
        expect(B.m.api.rowStateOf(RECORDS, record.id)).toBe('dating');
        expect(B.m.records.getRecord(record.id)?.deviceOnly).toBe(true);
      });
      // And after a reload, with nothing the wrong answer left behind.
      const C = await browser(`w-${lie}-reload`, {}, 'w');
      await C.run(async () => {
        await C.m.records.hydrate();
        await settle(120);
        expect(C.m.records.deviceOnlyConflict(record.id)).toBe(false);
        expect(Object.keys(C.m.api.revMarks()).filter((k) => k.includes(record.id))).toEqual([]);
      });
    }
    // What is stored of the record never changed, and nothing but the dating row was sent.
    expect(A.storage.get(DEVICE_ONLY_STORE)).toBe(kept);
    expect(recordPuts()).toEqual([]);
    expect(nothingLeft(reg, record)).toEqual([]);
  });
});
