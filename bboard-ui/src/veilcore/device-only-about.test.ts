// A record kept on this device only is never named by a record that leaves (review of 16 Nov,
// docs/device-only-records.md "Named by another record"). An ordinary record's `about` (and a
// plant's parents) is sealed into its locked copy, which goes to the registry: naming a
// device-only record there would send that record's title and ID. So only a record that is
// itself kept on this device may name one. Enforced where records are made and where they are
// sent, not only in the picker. Every test reads back what the registry was actually sent.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRegistry, type FakeRegistry } from './fixtures/fake-registry';
import { browser, fileOf, installStorage, settle, type Browser } from './fixtures/browsers';
import { stubWebLocks } from './fixtures/web-locks';
import { MARKERS, backUp, backupText, nothingLeft, pathOf, sealOnDevice } from './fixtures/device-only-doc';

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

const RECORDS = 'veilcore.records.v1';
const recordPuts = () => reg.sent.filter((r) => r.method === 'PUT' && pathOf(r.url) === '/api/records');

/** An ordinary document that says it is about `target`, as "Seal a document" would seal it. */
const docAbout = (b: Browser, target: { id: string; strainName: string }, deviceOnly?: boolean) =>
  b.run(async () => {
    const { sealDocumentRecord } = await import('./seal-record');
    return sealDocumentRecord({
      title: 'A lot about the batch',
      type: 'other',
      issuer: '',
      reference: 'L-1',
      issued: '',
      files: [{ name: 'lot.txt', sha256: 'cd'.repeat(32), size: 5 }],
      about: [{ recordId: target.id, name: target.strainName }],
      holder: 'Someone',
      notes: '',
      ...(deviceOnly === undefined ? {} : { deviceOnly }),
    } as never);
  });

describe('a record that leaves can’t name a record kept on this device only', () => {
  it('an ordinary document about one is refused when it is made, and nothing of it is saved or sent', async () => {
    const A = await browser('a');
    const kept = await sealOnDevice(reg, A);
    expect((await backUp(A)).out.ok).toBe(true);
    await settle(150);
    // Sealing says which kind of record it will be: an ordinary one is refused there already.
    await expect(docAbout(A, kept, false)).rejects.toThrow(/kept on this device only/);
    // And where the record is made, whoever sealed it.
    const sealed = await docAbout(A, kept);
    await A.run(async () => {
      expect(() => A.m.records.createRecord(sealed)).toThrow(/kept on this device only/);
      await expect(A.m.records.createRecordSaved(sealed)).rejects.toThrow(/kept on this device only/);
      await expect(A.m.records.createRecords([sealed])).rejects.toThrow(/kept on this device only/);
      await settle(300);
      expect(A.m.records.getRecord(sealed.id)).toBeUndefined();
      expect(A.m.outbox.inOutbox(sealed.id)).toBe(false);
    });
    for (const r of reg.sent) expect(`${r.url}\n${r.body}`).not.toContain(sealed.id);
    expect(nothingLeft(reg, kept)).toEqual([]);
  });

  it('a record that is itself kept on this device only may name one, and nothing typed leaves', async () => {
    const A = await browser('b');
    const kept = await sealOnDevice(reg, A);
    const sealed = await docAbout(A, kept, true);
    const lot = await A.run(async () => {
      const r = A.m.records.createRecord({ ...sealed, deviceOnly: true });
      await settle(300);
      return r;
    });
    expect(lot.document?.about).toEqual([{ recordId: kept.id, name: MARKERS[0] }]);
    expect(recordPuts()).toEqual([]);
    expect(nothingLeft(reg, kept)).toEqual([]);
    expect(nothingLeft(reg, lot)).toEqual([]);
  });

  it('a plant that names one as a parent is refused the same way', async () => {
    const A = await browser('c');
    const kept = await sealOnDevice(reg, A);
    await A.run(() => {
      expect(() =>
        A.m.records.createRecord({
          strainName: 'A plant',
          bredBy: 'Someone',
          dateCreated: '2026-11-01',
          notes: '',
          loggedAt: 1,
          parents: [{ recordId: kept.id, name: kept.strainName }],
          photoFingerprints: [],
        } as never),
      ).toThrow(/kept on this device only/);
    });
  });

  it('the last gate: a save handed such a record directly sends nothing of it, and says why', async () => {
    const A = await browser('d');
    const kept = await sealOnDevice(reg, A);
    expect((await backUp(A)).out.ok).toBe(true);
    await settle(150);
    const sealed = await docAbout(A, kept);
    const before = reg.sent.length;
    const result = await A.run(() => A.m.api.apiStore.save(RECORDS, [{ licenseIds: [], ...sealed }]));
    expect(result.refused.map((r) => r.id)).toEqual([sealed.id]);
    expect(result.refused[0].reason).toMatch(/kept on this device only/);
    for (const r of reg.sent.slice(before)) expect(`${r.url}\n${r.body}`).not.toContain(sealed.id);
    // Nor does the send queue take it.
    await A.run(() => {
      A.m.outbox.putInOutbox([{ licenseIds: [], ...sealed }]);
      expect(A.m.outbox.inOutbox(sealed.id)).toBe(false);
    });
  });

  it('a restore: an ordinary row that names a device-only record in the same file is not imported or uploaded', async () => {
    const A = await browser('e');
    const kept = await sealOnDevice(reg, A);
    const text = await backupText(A);
    // The file is edited by hand to add an ordinary record about the one kept on the device.
    const sealed = await docAbout(A, kept);
    const file = JSON.parse(text) as { recordData: unknown[] };
    file.recordData.push({ licenseIds: [], ...sealed });
    const B = await browser('e-fresh');
    const before = reg.sent.length;
    await B.run(async () => {
      try {
        await B.m.backup.restoreAny(fileOf(JSON.stringify(file)));
      } catch {
        /* a restore that refuses the whole file sends nothing either */
      }
      await settle(400);
      await B.m.records.hydrate();
      await settle(200);
      expect(B.m.records.getRecord(sealed.id)).toBeUndefined();
    });
    for (const r of reg.sent.slice(before)) expect(`${r.url}\n${r.body}`).not.toContain(sealed.id);
    expect(nothingLeft(reg, kept)).toEqual([]);
  });
});
