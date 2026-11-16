// A document kept on this device only (docs/device-only-records.md): its proof code is dated
// like any record's, and nothing else of it ever leaves the browser. Not its locked copy, not
// the mark that says it is kept here, by no path: sealing, a reload, the sync, a change, a save
// queued while offline, the saves held for the backup, a restore from the backup file on
// another device, or a save handed the record directly.
//
// Every test asserts on what the registry was actually sent (fixtures/fake-registry.ts keeps
// every request), in browsers with their own modules and storage (fixtures/browsers.ts).
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRegistry, type FakeRegistry } from './fixtures/fake-registry';
import { browser, fileOf, installStorage, settle, type Browser } from './fixtures/browsers';
import { stubWebLocks } from './fixtures/web-locks';

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
const DEVICE_ONLY_STORE = 'veilcore.device-only.v1';
const OUTBOX_STORE = 'veilcore.outbox.v1';
/** Something typed into every field a document has: none of it may be in any request. */
const MARKERS = [
  'Residency permit 0042',
  'Practice Authority of Nowhere',
  'REF-7781-ZZ',
  'Association Held-By-Marker',
  'notes nobody outside may read',
  'permit-scan-marker.pdf',
];
const FILE_SHA = 'ab'.repeat(32);

/** A document as /documents/new seals it (seal-record.ts sealDocumentRecord). */
const sealDoc = (b: Browser, title = MARKERS[0]) =>
  b.run(async () => {
    const { sealDocumentRecord } = await import('./seal-record');
    return sealDocumentRecord({
      title,
      type: 'permit',
      issuer: MARKERS[1],
      reference: MARKERS[2],
      issued: '2026-11-01',
      files: [{ name: MARKERS[5], sha256: FILE_SHA, size: 1234 }],
      about: [],
      holder: MARKERS[3],
      notes: MARKERS[4],
    });
  });

const until = async (check: () => boolean | Promise<boolean>, ms = 5000) => {
  const end = Date.now() + ms;
  while (!(await check())) {
    if (Date.now() > end) throw new Error('still not true');
    await settle(20);
  }
};

const pathOf = (url: string) => new URL(url).pathname;
const datingPuts = () => reg.sent.filter((r) => r.method === 'PUT' && pathOf(r.url) === '/api/records/dating');
const recordPuts = () => reg.sent.filter((r) => r.method === 'PUT' && pathOf(r.url) === '/api/records');
/** Every request that could carry something: anything but a read. */
const writes = () => reg.sent.filter((r) => r.method !== 'GET');

/**
 * The whole point, as one check: of this record, the registry was sent its dating row and
 * nothing else. No request of any kind names what was typed or the mark; no save of the record
 * set (PUT /api/records) names the record at all.
 */
const expectNothingLeft = (record: { id: string; recordFingerprint?: string }) => {
  for (const r of reg.sent) {
    const all = `${r.url}\n${r.body}`;
    for (const m of MARKERS) expect(all, `${r.method} ${r.url}`).not.toContain(m);
    expect(all, `${r.method} ${r.url}`).not.toContain('deviceOnly');
    expect(all, `${r.method} ${r.url}`).not.toContain(FILE_SHA);
  }
  for (const p of recordPuts()) expect(p.body).not.toContain(record.id);
  // Every write that names it is the dating row, and that row is exactly three fields.
  for (const w of writes().filter((x) => `${x.url}\n${x.body}`.includes(record.id))) {
    expect(pathOf(w.url)).toBe('/api/records/dating');
    for (const row of JSON.parse(w.body) as Record<string, unknown>[]) {
      expect(Object.keys(row).every((k) => ['id', 'recordFingerprint', 'keyBinding'].includes(k))).toBe(true);
    }
  }
};

/** Save a backup in this browser and check it, as the backup page does. */
const backupText = (b: Browser) =>
  b.run(async () => JSON.stringify(await b.m.backup.withRecordsAndProofs(b.m.backup.backupContents())));
const backUp = async (b: Browser) => {
  const text = await backupText(b);
  const out = await b.run(() => b.m.backup.checkBackup(fileOf(text)));
  return { text, out };
};

const sealOnDevice = async (b: Browser, title?: string) => {
  const sealed = await sealDoc(b, title);
  return b.run(async () => {
    const r = b.m.records.createRecord({ ...sealed, deviceOnly: true });
    await until(() => datingPuts().some((p) => p.body.includes(r.id)));
    await settle(100);
    return r;
  });
};

describe('a document kept on this device only', () => {
  it('sealing sends the dating row, with only id, proof code and key binding, and nothing else', async () => {
    const A = await browser('a');
    const record = await sealOnDevice(A);
    expect(record.deviceOnly).toBe(true);

    const rows = datingPuts().flatMap((p) => JSON.parse(p.body) as Record<string, unknown>[]);
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(['id', 'keyBinding', 'recordFingerprint']);
    expect(rows[0]).toEqual({
      id: record.id,
      recordFingerprint: record.recordFingerprint,
      keyBinding: record.keyBinding,
    });
    // No save of the record set at all: this browser has nothing else to save.
    expect(recordPuts()).toEqual([]);
    expect(writes().map((w) => pathOf(w.url))).toEqual(['/api/records/dating']);
    expectNothingLeft(record);

    // The registry holds the proof code alone, so the record is in the next batch.
    const H = (await A.run(() => A.m.holder.holderKeyIfAny())) as string;
    expect(reg.rowsOf(H)).toEqual([
      expect.objectContaining({ id: record.id, recordFingerprint: record.recordFingerprint, bodyPending: true }),
    ]);
    expect(reg.rowsOf(H)[0].sealed).toBeUndefined();
    await A.run(() => {
      expect(A.m.records.proofCodeSent(record.id)).toBe(true);
      // Never shown as "not uploaded yet": it is not waiting for anything.
      expect(A.m.records.unsavedReason(record.id)).toBeUndefined();
      expect(A.m.records.isKeptOnDeviceOnly(A.m.records.getRecord(record.id))).toBe(true);
    });
    // Kept under its own key, never in the queue of what waits to be sent: a tab still running
    // an older build sends whatever it finds in that queue.
    expect(A.storage.get(DEVICE_ONLY_STORE)).toContain(record.id);
    expect(A.storage.get(OUTBOX_STORE) ?? '').not.toContain(record.id);
  });

  it('once the backup is checked (when held saves go out), its locked copy still is not sent', async () => {
    const A = await browser('held');
    const record = await sealOnDevice(A);
    // A second, ordinary document sealed beside it: held for the backup, as before.
    const plain = await sealDoc(A, 'Ordinary document');
    const other = await A.run(async () => {
      const r = A.m.records.createRecord(plain);
      await settle(150);
      return r;
    });
    await A.run(() => {
      expect(A.m.records.unsavedReason(other.id)).toBe('backup');
      expect(A.m.records.unsavedReason(record.id)).toBeUndefined();
    });
    expect(recordPuts().filter((p) => p.body.includes('"sealed"'))).toEqual([]);

    expect((await backUp(A)).out.ok).toBe(true);
    await settle(300);
    // The ordinary one's locked copy followed, exactly as it always has...
    const H = (await A.run(() => A.m.holder.holderKeyIfAny())) as string;
    const rows = reg.rowsOf(H);
    expect(rows.find((r) => r.id === other.id)?.sealed).toBeTruthy();
    expect(rows.find((r) => r.id === other.id)?.bodyPending).toBeUndefined();
    const sent = recordPuts().flatMap((p) => JSON.parse(p.body) as Record<string, unknown>[]);
    expect(sent.map((r) => r.id)).toEqual([other.id]);
    expect(Object.keys(sent[0]).sort()).toEqual(
      ['id', 'keyBinding', 'nameCode', 'profile', 'recordFingerprint', 'rev', 'sealed'].sort(),
    );
    await A.run(() => expect(A.m.records.unsavedReason(other.id)).toBeUndefined());
    // ...and the one kept here did not: still only its proof code.
    expect(rows.find((r) => r.id === record.id)).toEqual(
      expect.objectContaining({ recordFingerprint: record.recordFingerprint, bodyPending: true }),
    );
    expect(rows.find((r) => r.id === record.id)?.sealed).toBeUndefined();
    expectNothingLeft(record);
  });

  it('after a reload and several syncs it is shown, dated, and still nothing is sent', async () => {
    const A = await browser('r');
    const record = await sealOnDevice(A);
    expect((await backUp(A)).out.ok).toBe(true);
    await settle(150);
    const datedBefore = datingPuts().length;

    const B = await browser('r-reload', {}, 'r');
    await B.run(async () => {
      for (let i = 0; i < 3; i++) {
        await B.m.records.hydrate();
        await settle(120);
      }
      expect(B.m.api.rowStateOf(RECORDS, record.id)).toBe('dating');
      const shown = B.m.records.getRecord(record.id);
      expect(shown?.strainName).toBe(MARKERS[0]);
      expect(shown?.document?.files?.[0]?.sha256).toBe(FILE_SHA);
      expect(shown?.deviceOnly).toBe(true);
      expect(B.m.records.lockedRecords()).toEqual([]);
      expect(B.m.records.proofCodeSent(record.id)).toBe(true);
      expect(B.m.records.unsavedReason(record.id)).toBeUndefined();
      expect(await B.m.records.checkIntegrity(shown!)).toBe('match');
    });
    // Its proof code is not sent again, and no save of the record set was made.
    expect(datingPuts().length).toBe(datedBefore);
    expect(recordPuts()).toEqual([]);
    expectNothingLeft(record);
  });

  it('a change to it stays here; sharing, sending and correcting it are refused, and nothing is sent', async () => {
    const A = await browser('e');
    const record = await sealOnDevice(A);
    expect((await backUp(A)).out.ok).toBe(true);
    await settle(150);

    await A.run(async () => {
      // A change to the record through the app's own save path (persist, then a save of the set).
      A.m.records.addClaim(record.id, { contract: 'LOCAL-NOTE-MARKER' } as never);
      await settle(200);
      await A.m.records.hydrate();
      await settle(150);
      expect(A.m.records.getRecord(record.id)?.claims?.[0]?.contract).toBe('LOCAL-NOTE-MARKER');

      // Sharing by link publishes values on the registry: refused before anything is sent.
      const now = A.m.records.getRecord(record.id)!;
      const shared = await A.m.disclosure.saveGrant(now, A.m.disclosure.disclosureFrom(['existence']));
      expect('error' in shared ? shared.error : 'shared').toMatch(/kept on this device only/);
      // Sending it to someone (a sealed offer on the registry): refused.
      const offer = await A.m.transfers.offerTransfer(now, 'A Lab');
      expect('error' in offer ? offer.error : 'sent').toMatch(/kept on this device only/);
      // A correction is two locked copies on the registry: refused.
      await expect(A.m.records.issueCorrection(record.id, { notes: 'changed' }, 'typo')).rejects.toThrow(
        /kept on this device only/,
      );
      await settle(200);
    });
    // The change is in this browser, after a reload too.
    const B = await browser('e-reload', {}, 'e');
    await B.run(async () => {
      await B.m.records.hydrate();
      await settle(120);
      expect(B.m.records.getRecord(record.id)?.claims?.[0]?.contract).toBe('LOCAL-NOTE-MARKER');
      expect(B.m.records.getRecord(record.id)?.supersededBy).toBeUndefined();
    });
    expect(recordPuts()).toEqual([]);
    expect(writes().every((w) => pathOf(w.url) === '/api/records/dating')).toBe(true);
    for (const r of reg.sent) expect(`${r.url}\n${r.body}`).not.toContain('LOCAL-NOTE-MARKER');
    expectNothingLeft(record);
  });

  it('sealed while offline: the retry sends the dating row once the registry answers, and only that', async () => {
    const A = await browser('o');
    reg.misbehave.fault = () => 'fail';
    const sealed = await sealDoc(A);
    const record = await A.run(async () => {
      const r = A.m.records.createRecord({ ...sealed, deviceOnly: true });
      await settle(200);
      expect(A.m.records.proofCodeSent(r.id)).toBe(false);
      expect(A.m.records.getRecord(r.id)?.deviceOnly).toBe(true);
      return r;
    });
    expect(reg.sent).toEqual([]);
    // A reload while still offline: the record is shown from this browser's own copy.
    const B = await browser('o-reload', {}, 'o');
    await B.run(async () => {
      await B.m.records.hydrate();
      expect(B.m.records.getRecord(record.id)?.strainName).toBe(MARKERS[0]);
    });
    reg.misbehave.fault = null;
    await B.run(async () => {
      await B.m.records.hydrate();
      await until(() => datingPuts().length > 0);
      await settle(150);
      await B.m.records.hydrate();
      await settle(150);
      expect(B.m.records.proofCodeSent(record.id)).toBe(true);
    });
    expect(datingPuts()).toHaveLength(1);
    expect(recordPuts()).toEqual([]);
    expectNothingLeft(record);
  });

  it('a save handed the record directly (the last gate, api-store.ts) sends nothing', async () => {
    const A = await browser('g');
    const record = await sealOnDevice(A);
    expect((await backUp(A)).out.ok).toBe(true);
    await settle(150);
    const before = reg.sent.length;
    const result = await A.run(() => A.m.api.apiStore.save(RECORDS, [A.m.records.getRecord(record.id)]));
    expect(result).toEqual(expect.objectContaining({ ok: true, pending: [], accepted: [] }));
    expect(result.held).toBeUndefined();
    expect(reg.sent.slice(before).filter((r) => r.method !== 'GET')).toEqual([]);
    // Nor does the send queue take one, whoever asks.
    await A.run(() => {
      A.m.outbox.putInOutbox([A.m.records.getRecord(record.id) as unknown as Record<string, unknown>]);
      expect(A.m.outbox.inOutbox(record.id)).toBe(false);
    });
    expectNothingLeft(record);
  });

  it('the backup file carries the record, its document details and the mark, and a restore on an empty browser brings it back without sending it', async () => {
    const A = await browser('b');
    const record = await sealOnDevice(A);
    const { text, out } = await backUp(A);
    expect(out.ok).toBe(true);
    await settle(150);
    const file = JSON.parse(text) as { recordData: Record<string, unknown>[] };
    expect(file.recordData).toHaveLength(1);
    expect(file.recordData[0]).toEqual(
      expect.objectContaining({
        id: record.id,
        deviceOnly: true,
        strainName: MARKERS[0],
        notes: MARKERS[4],
        recordFingerprint: record.recordFingerprint,
      }),
    );
    expect((file.recordData[0].document as { issuer?: string }).issuer).toBe(MARKERS[1]);

    // Another device: nothing in its storage, the same registry (which holds the proof code only).
    const sentBefore = reg.sent.length;
    const C = await browser('fresh');
    await C.run(async () => {
      const restored = await C.m.backup.restoreAny(fileOf(text));
      expect(restored.fromFile).toEqual(expect.objectContaining({ added: 1 }));
      await settle(300);
      await C.m.records.hydrate();
      await settle(200);
      const back = C.m.records.getRecord(record.id);
      expect(back?.deviceOnly).toBe(true);
      expect(back?.strainName).toBe(MARKERS[0]);
      expect(back?.document?.files?.[0]).toEqual({ name: MARKERS[5], sha256: FILE_SHA, size: 1234 });
      expect(await C.m.records.checkIntegrity(back!)).toBe('match');
      expect(C.m.api.rowStateOf(RECORDS, record.id)).toBe('dating');
      expect(C.m.records.unsavedReason(record.id)).toBeUndefined();
      expect(C.m.records.proofCodeSent(record.id)).toBe(true);
    });
    expect(C.storage.get(DEVICE_ONLY_STORE)).toContain(record.id);
    expect(C.storage.get(OUTBOX_STORE) ?? '').not.toContain(record.id);
    // The restore wrote nothing to the registry: the proof code was there already.
    expect(reg.sent.slice(sentBefore).filter((r) => r.method !== 'GET')).toEqual([]);
    expect(recordPuts()).toEqual([]);
    expectNothingLeft(record);

    // And the backup made on that device carries it again, mark and all.
    const again = JSON.parse(await backupText(C)) as { recordData: Record<string, unknown>[] };
    expect(again.recordData.find((r) => r.id === record.id)?.deviceOnly).toBe(true);
  });

  it('with the registry gone, the restored record is still shown from the file', async () => {
    const A = await browser('n');
    const record = await sealOnDevice(A);
    const { text } = await backUp(A);
    const C = await browser('fresh-offline');
    await C.run(async () => {
      await C.m.backup.restoreAny(fileOf(text));
      await settle(200);
    });
    reg.misbehave.fault = () => 'fail';
    const D = await browser('fresh-offline-reload', {}, 'fresh-offline');
    await D.run(async () => {
      await D.m.records.hydrate();
      expect(D.m.records.getRecord(record.id)?.strainName).toBe(MARKERS[0]);
      expect(D.m.records.getRecord(record.id)?.deviceOnly).toBe(true);
    });
    reg.misbehave.fault = null;
    expectNothingLeft(record);
  });

  it('only a document can be kept this way, and the mark cannot be put on a record already uploaded', async () => {
    const A = await browser('k');
    // A plant: refused when it is made, before anything is kept or sent.
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
      expect(() => A.m.records.createRecord({ ...plant, deviceOnly: true })).toThrow(/only a document/);
      expect(A.m.records.getRecord(plant.id)).toBeUndefined();
    });
    expect(reg.sent.filter((r) => r.method !== 'GET')).toEqual([]);

    // An ordinary document, uploaded. A file naming it with the mark changes nothing: the
    // registry's copy stands, and the record is not said to be on this device only.
    const plain = await sealDoc(A, 'Uploaded document');
    const up = await A.run(async () => {
      const r = A.m.records.createRecord(plain);
      await settle(150);
      return r;
    });
    expect((await backUp(A)).out.ok).toBe(true);
    await settle(300);
    const H = (await A.run(() => A.m.holder.holderKeyIfAny())) as string;
    expect(reg.rowsOf(H).find((r) => r.id === up.id)?.sealed).toBeTruthy();
    await A.run(async () => {
      const marked = { ...A.m.records.getRecord(up.id), deviceOnly: true };
      const out = await A.m.records.importRecordRows([marked]);
      expect(out).toEqual(expect.objectContaining({ added: 0, alreadyHere: 1 }));
      await A.m.records.hydrate();
      expect(A.m.records.getRecord(up.id)?.deviceOnly).toBeUndefined();
      expect(A.m.api.rowStateOf(RECORDS, up.id)).toBe('open');
    });
    expect(A.storage.get(DEVICE_ONLY_STORE) ?? '').not.toContain(up.id);
  });
});

describe('an ordinary document is saved exactly as before', () => {
  it('dated first, then its locked copy once the backup is checked; a restore opens it from the registry', async () => {
    const A = await browser('p');
    const sealed = await sealDoc(A);
    const record = await A.run(async () => {
      const r = A.m.records.createRecord(sealed);
      await until(() => datingPuts().length > 0);
      return r;
    });
    expect(record.deviceOnly).toBeUndefined();
    await A.run(() => expect(A.m.records.unsavedReason(record.id)).toBe('backup'));
    expect(A.storage.get(OUTBOX_STORE)).toContain(record.id);
    expect(A.storage.get(DEVICE_ONLY_STORE)).toBeUndefined();
    const { text, out } = await backUp(A);
    expect(out.ok).toBe(true);
    await settle(300);
    const H = (await A.run(() => A.m.holder.holderKeyIfAny())) as string;
    const row = reg.rowsOf(H).find((r) => r.id === record.id);
    expect(row?.sealed).toBeTruthy();
    expect(row?.bodyPending).toBeUndefined();
    expect(row?.recordFingerprint).toBe(record.recordFingerprint);
    // What is typed is inside the box only.
    for (const p of recordPuts()) for (const m of MARKERS) expect(p.body).not.toContain(m);
    await A.run(() => {
      expect(A.m.records.unsavedReason(record.id)).toBeUndefined();
      expect(A.m.api.rowStateOf(RECORDS, record.id)).toBe('open');
      expect(A.m.outbox.inOutbox(record.id)).toBe(false);
    });
    // The backup carries a document whole (its details are part of its proof code), and a
    // restore elsewhere opens the registry's copy.
    const file = JSON.parse(text) as { recordData: Record<string, unknown>[] };
    expect(file.recordData[0].document).toEqual(expect.objectContaining({ issuer: MARKERS[1] }));
    expect(file.recordData[0].deviceOnly).toBeUndefined();
    const C = await browser('p-fresh');
    await C.run(async () => {
      await C.m.backup.restoreAny(fileOf(text));
      await settle(200);
      await C.m.records.hydrate();
      const back = C.m.records.getRecord(record.id);
      expect(back?.strainName).toBe(MARKERS[0]);
      expect(back?.deviceOnly).toBeUndefined();
      expect(C.m.api.rowStateOf(RECORDS, record.id)).toBe('open');
    });
  });
});
