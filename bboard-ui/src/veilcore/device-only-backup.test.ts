// A document kept on this device only and its backup (docs/device-only-records.md): the record
// is in a backup only once a file that holds it has been checked. A backup saved before it was
// sealed does not hold it, the account copy never does, and a backup that can't hold it is not made.
// Also here: deleting one from the device, licences, and the key date stamp.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRegistry, type FakeRegistry } from './fixtures/fake-registry';
import { browser, fileOf, installStorage, settle } from './fixtures/browsers';
import { stubWebLocks } from './fixtures/web-locks';
import { accountRegistry, fakePasskey } from './fixtures/account-registry';
import {
  DEVICE_ONLY_STORE,
  MARKERS,
  RECORDS,
  backUp,
  nothingLeft,
  pathOf,
  sealDoc,
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

const NOT_IN_FILE = /doesn’t hold your documents kept on this device only/;

describe('whether a document kept on this device only is in a backup', () => {
  it('a backup saved before it was sealed does not count; one saved and checked after does', async () => {
    const A = await browser('a');
    // An earlier record, and a checked backup of it.
    const first = await sealDoc(A, 'An earlier document');
    await A.run(async () => {
      A.m.records.createRecord(first);
      await settle(150);
    });
    const early = await backUp(A);
    expect(early.out.ok).toBe(true);
    await settle(200);

    const record = await sealOnDevice(reg, A);
    await A.run(() => {
      expect(A.m.records.deviceOnlyBackedUp(A.m.records.getRecord(record.id))).toBe(false);
    });
    // The earlier file is refused for the check now, and marks nothing.
    const again = await A.run(() => A.m.backup.checkBackup(fileOf(early.text)));
    expect(again.ok).toBe(false);
    await A.run(() => {
      expect(A.m.records.deviceOnlyBackedUp(A.m.records.getRecord(record.id))).toBe(false);
    });
    // A file with the keys but without the records (as a passkey copy is) is refused too.
    const keysOnly = await A.run(() => JSON.stringify(A.m.backup.backupContents()));
    const refused = await A.run(() => A.m.backup.checkBackup(fileOf(keysOnly)));
    expect(refused.ok).toBe(false);
    expect(refused.ok ? '' : refused.reason).toMatch(NOT_IN_FILE);
    await A.run(() => {
      expect(A.m.records.deviceOnlyBackedUp(A.m.records.getRecord(record.id))).toBe(false);
    });

    const now = await backUp(A);
    expect(now.out.ok).toBe(true);
    await A.run(() => {
      expect(A.m.records.deviceOnlyBackedUp(A.m.records.getRecord(record.id))).toBe(true);
    });
    // It stays so after a reload, and a restore elsewhere counts the file it came from.
    const B = await browser('a-reload', {}, 'a');
    await B.run(async () => {
      await B.m.records.hydrate();
      expect(B.m.records.deviceOnlyBackedUp(B.m.records.getRecord(record.id))).toBe(true);
    });
    const C = await browser('fresh');
    await C.run(async () => {
      await C.m.backup.restoreAny(fileOf(now.text));
      await settle(300);
      expect(C.m.records.deviceOnlyBackedUp(C.m.records.getRecord(record.id))).toBe(true);
    });
    expect(nothingLeft(reg, record)).toEqual([]);
  });

  it('one entry that cannot be read never blocks the backup or another record’s upload: it is kept raw, listed, exportable and deletable', async () => {
    const A = await browser('f');
    const record = await sealOnDevice(reg, A);
    const other = await sealOnDevice(reg, A, 'A second one, still readable');
    // An ordinary document too, waiting for the backup check before its locked copy goes up.
    const plain = await sealDoc(A, 'Ordinary, waiting');
    const waiting = await A.run(async () => {
      const r = A.m.records.createRecord(plain);
      await settle(150);
      return r;
    });
    // The device's copy of the first can no longer be read as a record (damaged storage).
    const stored = JSON.parse(A.storage.get(DEVICE_ONLY_STORE)!) as Record<string, Record<string, { notes: unknown }>>;
    for (const h of Object.values(stored)) h[record.id].notes = 42;
    A.storage.set(DEVICE_ONLY_STORE, JSON.stringify(stored));
    const raw = Object.values(stored)[0][record.id];

    const B = await browser('f-reload', {}, 'f');
    await B.run(async () => {
      await B.m.records.hydrate();
      await settle(150);
      // Listed with what is known of it, and its raw entry can be exported.
      expect(B.m.records.damagedDeviceOnly()).toEqual([{ id: record.id, raw }]);
      expect(B.m.records.getRecord(record.id)).toBeUndefined();
      expect(B.m.records.getRecord(other.id)?.deviceOnly).toBe(true);
    });
    // The backup is made, with the readable records and the damaged entry verbatim, and checks.
    const { text, out } = await backUp(B);
    expect(out.ok).toBe(true);
    const file = JSON.parse(text) as { recordData: { id: string }[]; deviceOnlyUnreadable?: Record<string, unknown> };
    expect(file.recordData.map((r) => r.id).sort()).toEqual([other.id, waiting.id].sort());
    expect(file.deviceOnlyUnreadable).toEqual({ [record.id]: raw });
    await settle(300);
    // The ordinary record's locked copy went up; nothing of the damaged entry ever does.
    const H = (await B.run(() => B.m.holder.holderKeyIfAny())) as string;
    expect(reg.rowsOf(H).find((r) => r.id === waiting.id)?.sealed).toBeTruthy();
    for (const p of reg.sent.filter((r) => r.method === 'PUT' && pathOf(r.url) === '/api/records'))
      expect(p.body).not.toContain(record.id);
    await B.run(() => {
      expect(B.m.records.deviceOnlyBackedUp(B.m.records.getRecord(other.id))).toBe(true);
      // Still never sendable, by id, damaged or not.
      expect(B.m.records.isKeptOnDeviceOnly({ id: record.id } as never)).toBe(true);
    });
    // A restore elsewhere brings the raw entry back as it was: nothing is lost with the file.
    const C = await browser('f-fresh');
    await C.run(async () => {
      await C.m.backup.restoreAny(fileOf(text));
      await settle(300);
      expect(C.m.records.damagedDeviceOnly()).toEqual([{ id: record.id, raw }]);
      expect(C.m.records.getRecord(other.id)?.deviceOnly).toBe(true);
    });
    // The holder deletes it: gone from the list, and nothing sent.
    const before = reg.sent.length;
    await B.run(async () => {
      expect(B.m.records.deleteDeviceOnly(record.id)).toBe(true);
      expect(B.m.records.damagedDeviceOnly()).toEqual([]);
      await settle(200);
    });
    expect(reg.sent.slice(before).filter((r) => r.method !== 'GET')).toEqual([]);
    expect(nothingLeft(reg, other)).toEqual([]);
  });

  it('the account copy, made and read back for real, holds its id and keys and nothing typed, never marks it, and a restore from it does not bring the record (B3)', async () => {
    // The registry's /account-copy routes and a synced passkey (fixtures/account-registry.ts).
    const acc = accountRegistry(reg.fetch);
    vi.stubGlobal('fetch', acc.fetch);
    const pk = fakePasskey();
    vi.stubGlobal('navigator', { credentials: pk.credentials, userAgent: 'test' });

    const A = await browser('pk');
    const record = await sealOnDevice(reg, A);
    expect((await backUp(A)).out.ok).toBe(true);
    const made = await A.run(async () => {
      const ac = await import('./account-copy');
      return ac.setUpAccount();
    });
    expect(made.ok).toBe(true);
    expect(made.counted).toBe(true);
    // Its key's mark is the file's, never the copy's.
    await A.run(() => {
      expect(A.m.keys.keysFor(record.id)?.backedUpVia).toBeUndefined();
    });
    // What the registry holds of the copy is a locked box: nothing readable in it.
    expect(acc.sent.length).toBeGreaterThan(0);
    for (const b of acc.sent) for (const m of [...MARKERS, record.id]) expect(b).not.toContain(m);
    // A new device: the copy opens with the passkey: the record's id and keys, nothing typed.
    const C = await browser('pk-fresh');
    const copy = await C.run(async () => {
      const ac = await import('./account-copy');
      const found = await ac.findAccountCopy();
      const text = await found.file.text();
      await C.m.backup.restoreAny(found.file, undefined, found.restore);
      await settle(300);
      await C.m.records.hydrate();
      expect(C.m.keys.keysFor(record.id)).toBeDefined();
      expect(C.m.records.getRecord(record.id)).toBeUndefined();
      // The other device is named as keeping one document of its own.
      expect(found.elsewhere.reduce((n, d) => n + d.count, 0)).toBe(1);
      return text;
    });
    const contents = JSON.parse(copy) as { records: { recordId: string }[]; recordData?: unknown };
    for (const m of MARKERS) expect(copy).not.toContain(m);
    expect(copy).not.toContain('deviceOnly');
    expect(contents.recordData).toBeUndefined();
    expect(contents.records.map((k) => k.recordId)).toEqual([record.id]);
    // As a backup file it is refused: it doesn't hold the record.
    const refused = await A.run(() => A.m.backup.checkBackup(fileOf(copy)));
    expect(refused.ok ? '' : refused.reason).toMatch(NOT_IN_FILE);
    expect(nothingLeft(reg, record)).toEqual([]);
  });

  it('B3: with only the account copy, its key stamp stays waiting for the file', async () => {
    const acc = accountRegistry(reg.fetch);
    vi.stubGlobal('fetch', acc.fetch);
    vi.stubGlobal('navigator', { credentials: fakePasskey().credentials, userAgent: 'test' });
    const A = await browser('pk-stamp');
    const record = await sealOnDevice(reg, A);
    const made = await A.run(async () => (await import('./account-copy')).setUpAccount());
    expect(made.counted).toBe(true);
    const { keyStampAllowed } = await import('../components/chain/stamp-gate');
    await A.run(() => {
      const r = A.m.records.getRecord(record.id);
      const keys = A.m.keys.keysFor(record.id);
      expect(keys?.backedUpAt).toBeUndefined();
      expect(
        keyStampAllowed(keys, {
          deviceOnly: A.m.records.isKeptOnDeviceOnly(r),
          inCheckedFile: A.m.records.deviceOnlyBackedUp(r),
        }),
      ).toBe(false);
    });
    // The file, checked: now it may be stamped.
    expect((await backUp(A)).out.ok).toBe(true);
    await A.run(() => {
      const r = A.m.records.getRecord(record.id);
      expect(
        keyStampAllowed(A.m.keys.keysFor(record.id), {
          deviceOnly: A.m.records.isKeptOnDeviceOnly(r),
          inCheckedFile: A.m.records.deviceOnlyBackedUp(r),
        }),
      ).toBe(true);
    });
  });
});

describe('deleting a document kept on this device only', () => {
  it('takes it off this device and sends nothing: the registry keeps the id and proof code', async () => {
    const A = await browser('d');
    const record = await sealOnDevice(reg, A);
    expect((await backUp(A)).out.ok).toBe(true);
    const H = (await A.run(() => A.m.holder.holderKeyIfAny())) as string;
    const before = reg.sent.length;
    await A.run(async () => {
      expect(A.m.records.deleteDeviceOnly(record.id)).toBe(true);
      await settle(150);
      await A.m.records.hydrate();
      await settle(150);
      expect(A.m.records.getRecord(record.id)).toBeUndefined();
      expect(A.m.keys.keysFor(record.id)).toBeUndefined();
      // Only a record kept on this device only is deleted this way.
      expect(A.m.records.deleteDeviceOnly('VEIL-NOT-HERE')).toBe(false);
    });
    expect(A.storage.get(DEVICE_ONLY_STORE) ?? '').not.toContain(record.id);
    expect(reg.sent.slice(before).filter((r) => r.method !== 'GET')).toEqual([]);
    expect(reg.rowsOf(H)).toEqual([
      expect.objectContaining({ id: record.id, recordFingerprint: record.recordFingerprint, bodyPending: true }),
    ]);
    // A reload doesn't bring it back, and its proof code isn't sent again.
    const B = await browser('d-reload', {}, 'd');
    await B.run(async () => {
      await B.m.records.hydrate();
      await settle(150);
      expect(B.m.records.getRecord(record.id)).toBeUndefined();
    });
    expect(reg.sent.slice(before).filter((r) => r.method !== 'GET')).toEqual([]);
  });
});

describe('what else could send something of a document kept on this device only', () => {
  it('no licence can be made from one, whoever calls', async () => {
    const A = await browser('l');
    const record = await sealOnDevice(reg, A);
    expect((await backUp(A)).out.ok).toBe(true);
    await A.run(async () => {
      expect(() =>
        A.m.licenses.createLicense({
          type: 'license',
          recordId: record.id,
          recordFingerprint: record.recordFingerprint ?? '',
          terms: {},
          agreementFingerprint: '00'.repeat(32),
        } as never),
      ).toThrow(/kept on this device only/);
      await settle(200);
    });
    expect(reg.sent.filter((r) => pathOf(r.url) === '/api/licenses' && r.method !== 'GET')).toEqual([]);
    expect(nothingLeft(reg, record)).toEqual([]);
  });

  it('nothing stamps its key, shares it or makes it ready to license without the holder’s own button: not the background, not a "Do it for me" job', async () => {
    const A = await browser('s');
    const record = await sealOnDevice(reg, A);
    expect((await backUp(A)).out.ok).toBe(true);
    const B = await browser('s-reload', {}, 's');
    const stamped = vi.fn();
    await B.run(async () => {
      await B.m.records.hydrate();
      await settle(120);
      vi.doMock('./chain/key-stamp', async (orig) => ({
        ...(await orig<typeof import('./chain/key-stamp')>()),
        stampKey: (id: string) => {
          stamped(id);
          return Promise.resolve();
        },
      }));
      // The background's pass over stamps to try again: none was started, so none is tried.
      const { stampRetryTick, dueStamps } = await import('./chain/stamp-background');
      expect(dueStamps()).toEqual([]);
      await stampRetryTick();
      // "Get this ready to license" (Ask): the job is not made for such a record...
      const { prepareJob } = await import('../ask-job/prepare');
      const words = { cloneName: (n: string) => n, youngName: (n: string) => n, scheme: (x: string) => x };
      const prepared = await prepareJob(
        { job: 'ready', record: { v: record.id, src: { kind: 'record', id: record.id } } } as never,
        words,
        Date.now(),
        '2026-11-16',
      );
      expect(prepared).toEqual({ refused: 'records' });
      // ...and a job that names one all the same (made by an older build) stamps nothing.
      const { sendStamp } = await import('../ask-job/senders');
      const outcome = await sendStamp({ id: 'J-1' } as never, record.id, false);
      expect(outcome.kind).toBe('failed');
      // Ask's reading of what was typed doesn't offer it either.
      const { planJob } = await import('../ask/plan');
      const read = planJob(`get ${MARKERS[0]} ready to license`, {
        records: B.m.records.allRecords(),
        animals: true,
        lang: 'en',
      });
      expect(JSON.stringify(read)).not.toContain(record.id);
      vi.doUnmock('./chain/key-stamp');
    });
    expect(stamped).not.toHaveBeenCalled();
    await B.run(async () => {
      const { stampRetries } = await import('./chain/key-stamp');
      expect(stampRetries()[record.id]).toBeUndefined();
      expect(B.m.keys.keysFor(record.id)?.anchor).toBeUndefined();
    });
    // Every request went to the registry's own routes: none to the fee service or the network.
    for (const r of reg.sent)
      expect(pathOf(r.url)).toMatch(/^\/(api\/(records|licenses|disclosures)|proof|transfers)\b/);
    expect(RECORDS).toBe('veilcore.records.v1');
    expect(nothingLeft(reg, record)).toEqual([]);
  });
});
