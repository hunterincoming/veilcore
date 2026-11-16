// A document kept on this device only and its backup (docs/device-only-records.md): the record
// is in a backup only once a file that holds it has been checked. A backup saved before it was
// sealed does not hold it, a passkey copy never does, and a backup that can't hold it is not made.
// Also here: deleting one from the device, licences, and the key date stamp.
// SPDX-License-Identifier: Apache-2.0

import { randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRegistry, type FakeRegistry } from './fixtures/fake-registry';
import { browser, fileOf, installStorage, settle } from './fixtures/browsers';
import { stubWebLocks } from './fixtures/web-locks';
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

  it('a passkey copy, made and read back for real, holds the record’s id and keys and nothing typed; a restore from it does not bring the record', async () => {
    // The registry's /vault routes and a synced passkey, as passkey-backup.test.ts stands them in.
    const vault = new Map<string, { hash: string; iv: string; ct: string }>();
    const stored: string[] = [];
    const sha = async (t: string) =>
      Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))), (b) =>
        b.toString(16).padStart(2, '0'),
      ).join('');
    const inner = reg.fetch;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const m = /\/vault\/([0-9a-f]{32})(\/read|\/delete)?$/.exec(new URL(url).pathname);
      if (!m) return inner(input, init);
      const body = JSON.parse(init?.body as string) as { token: string; iv?: string; ct?: string };
      stored.push(init?.body as string);
      const reply = (status: number, json: unknown) => new Response(JSON.stringify(json), { status });
      const row = vault.get(m[1]);
      if (!m[2]) {
        vault.set(m[1], { hash: await sha(body.token), iv: body.iv!, ct: body.ct! });
        return reply(200, { saved: true });
      }
      if (!row || row.hash !== (await sha(body.token))) return reply(404, { error: 'no such copy' });
      return reply(200, { iv: row.iv, ct: row.ct });
    });
    const passkey = { rawId: randomBytes(16), secret: randomBytes(32) };
    const prfFor = async (input: Uint8Array<ArrayBuffer>) => {
      const k = await crypto.subtle.importKey('raw', passkey.secret, { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign',
      ]);
      return new Uint8Array(await crypto.subtle.sign('HMAC', k, input));
    };
    type PrfAsk = { publicKey: { extensions: { prf: { eval: { first: Uint8Array<ArrayBuffer> } } } } };
    const withResults = async (o: PrfAsk) => {
      const results = {
        prf: { enabled: true, results: { first: await prfFor(o.publicKey.extensions.prf.eval.first) } },
      };
      return {
        rawId: passkey.rawId.buffer.slice(passkey.rawId.byteOffset, passkey.rawId.byteOffset + 16),
        getClientExtensionResults: () => results,
      };
    };
    vi.stubGlobal('navigator', { credentials: { create: withResults, get: withResults } });

    const A = await browser('pk');
    const record = await sealOnDevice(reg, A);
    expect((await backUp(A)).out.ok).toBe(true);
    const copy = await A.run(async () => {
      const pk = await import('./passkey-backup');
      const made = await pk.makePasskeyCopy();
      expect(made.ok).toBe(true);
      // Its own check marks nothing: the record is in a backup because of the file, not this.
      const got = await pk.fetchPasskeyCopy();
      return got.file.text();
    });
    // What the registry holds of the copy is a locked box: nothing readable in it.
    expect(stored.length).toBeGreaterThan(0);
    for (const b of stored) for (const m of [...MARKERS, record.id]) expect(b).not.toContain(m);
    // Opened with the passkey: the record's id and its keys, and nothing that was typed.
    const contents = JSON.parse(copy) as { records: { recordId: string }[]; recordData?: unknown };
    for (const m of MARKERS) expect(copy).not.toContain(m);
    expect(copy).not.toContain('deviceOnly');
    expect(contents.recordData).toBeUndefined();
    expect(contents.records.map((k) => k.recordId)).toEqual([record.id]);
    // A restore from it, on a new device: the keys come back, the record does not.
    const C = await browser('pk-fresh');
    await C.run(async () => {
      const pk = await import('./passkey-backup');
      const got = await pk.fetchPasskeyCopy();
      await C.m.backup.restoreAny(got.file);
      await settle(300);
      await C.m.records.hydrate();
      expect(C.m.keys.keysFor(record.id)).toBeDefined();
      expect(C.m.records.getRecord(record.id)).toBeUndefined();
    });
    // As a backup file it is refused: it doesn't hold the record.
    const refused = await A.run(() => A.m.backup.checkBackup(fileOf(copy)));
    expect(refused.ok ? '' : refused.reason).toMatch(NOT_IN_FILE);
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
