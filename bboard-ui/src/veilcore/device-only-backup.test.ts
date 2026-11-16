// A document kept on this device only and its backup (docs/device-only-records.md): the record
// is in a backup only once a file that holds it has been checked. A backup saved before it was
// sealed does not hold it, a passkey copy never does, and a backup that can't hold it is not made.
// Also here: deleting one from the device, licences, and the key date stamp.
// SPDX-License-Identifier: Apache-2.0

import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRegistry, type FakeRegistry } from './fixtures/fake-registry';
import { browser, fileOf, installStorage, settle } from './fixtures/browsers';
import { stubWebLocks } from './fixtures/web-locks';
import {
  DEVICE_ONLY_STORE,
  MARKERS,
  RECORDS,
  backUp,
  backupText,
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

const SRC = path.resolve(__dirname, '..');
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

  it('a backup that cannot hold the record is not made (never a file silently without it)', async () => {
    const A = await browser('f');
    const record = await sealOnDevice(reg, A);
    // The device's copy can no longer be read as a record (damaged storage).
    const stored = JSON.parse(A.storage.get(DEVICE_ONLY_STORE)!) as Record<string, Record<string, { notes: unknown }>>;
    for (const h of Object.values(stored)) h[record.id].notes = 42;
    A.storage.set(DEVICE_ONLY_STORE, JSON.stringify(stored));
    const B = await browser('f-reload', {}, 'f');
    await expect(B.run(() => B.m.backup.backupFileText())).rejects.toThrow(/kept on this device only/);
  });

  it('the passkey copy is the keys only: the record’s id and its keys, never what was typed', async () => {
    const A = await browser('pk');
    const record = await sealOnDevice(reg, A);
    expect((await backUp(A)).out.ok).toBe(true);
    // What a passkey copy seals (passkey-backup.ts saveAndCheck: backupContents(), never recordData).
    const source = fs.readFileSync(path.join(SRC, 'veilcore/passkey-backup.ts'), 'utf8');
    expect(source).toMatch(/const contents = backupContents\(\);/);
    expect(source).not.toMatch(/withRecordsAndProofs|recordsForBackup|backupFileText/);
    const contents = await A.run(() => A.m.backup.backupContents());
    const text = JSON.stringify(contents);
    for (const m of MARKERS) expect(text).not.toContain(m);
    expect(text).not.toContain('deviceOnly');
    expect((contents as { recordData?: unknown }).recordData).toBeUndefined();
    expect(contents.records.map((k) => k.recordId)).toEqual([record.id]);
    // Its own check (mark: false) passes without the record, and marks nothing backed up.
    const checked = await A.run(() => A.m.backup.checkBackup(fileOf(text), undefined, { mark: false }));
    expect(checked.ok).toBe(true);
    // A restore from it brings the keys and not the record.
    const C = await browser('pk-fresh');
    await C.run(async () => {
      await C.m.backup.restoreAny(fileOf(text));
      await settle(300);
      await C.m.records.hydrate();
      expect(C.m.records.getRecord(record.id)).toBeUndefined();
    });
    expect(nothingLeft(reg, record)).toEqual([]);
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

  it('the key date stamp is never started for one unless the holder starts it', async () => {
    const A = await browser('s');
    const record = await sealOnDevice(reg, A);
    expect((await backUp(A)).out.ok).toBe(true);
    const B = await browser('s-reload', {}, 's');
    await B.run(async () => {
      for (let i = 0; i < 2; i++) {
        await B.m.records.hydrate();
        await settle(120);
      }
      const { stampRetries } = await import('./chain/key-stamp');
      // Nothing was started, so nothing is waiting for the background to try again.
      expect(stampRetries()[record.id]).toBeUndefined();
      expect(B.m.keys.keysFor(record.id)?.anchor).toBeUndefined();
    });
    // Every request went to the registry's record routes: none to the fee service or the network.
    for (const r of reg.sent)
      expect(pathOf(r.url)).toMatch(/^\/(api\/(records|licenses|disclosures)|proof|transfers)\b/);
    // Sealing a document never starts a stamp (plants do, on their log screen), and the
    // document's page starts one only from its button.
    const sealing = fs.readFileSync(path.join(SRC, 'components/document/DocumentNew.tsx'), 'utf8');
    expect(sealing).not.toMatch(/stampKey|useKeyStamp|AnchorOnChainPanel/);
    const hook = fs.readFileSync(path.join(SRC, 'components/chain/useKeyStamp.ts'), 'utf8');
    expect(hook.match(/void run\(\)/g)).toHaveLength(1); // the retry after a failed try, nothing else
    const page = fs.readFileSync(path.join(SRC, 'components/document/DocumentDetail.tsx'), 'utf8');
    expect(page).toMatch(/app\.doc\.local\.stamp/);
    expect(RECORDS).toBe('veilcore.records.v1');
    expect(nothingLeft(reg, record)).toEqual([]);
  });
});
