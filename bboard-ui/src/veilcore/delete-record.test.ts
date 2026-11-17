// Deleting one of the holder's records (records.ts deleteRecord). It goes from this browser and
// from VeilCore's registry together, and the registry keeps the id as deleted, so another tab or
// device that still holds it, or a restored backup, can't bring it back. Anything short of the
// registry saying it removed the record leaves everything as it was, with the reason.
//
// Against the in-memory registry with the real one's rules (fixtures/fake-registry.ts).
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

const seal = (b: Browser) =>
  b.run(async () => {
    const { sealRecord } = await import('./seal-record');
    return sealRecord({
      strainName: 'TEST delete',
      bredBy: 'Test',
      dateCreated: '2026-11-17',
      notes: '',
      parents: [],
      photoFingerprints: [],
    } as never);
  });

const until = async (check: () => boolean | Promise<boolean>, ms = 5000) => {
  const end = Date.now() + ms;
  while (!(await check())) {
    if (Date.now() > end) throw new Error('still not true');
    await settle(20);
  }
};

/** A browser holding one locked record the registry has, its key in a checked backup. */
const withRecord = async (name: string) => {
  const A = await browser(name);
  const sealed = await seal(A);
  let backup = '';
  const record = await A.run(async () => {
    A.m.holder.holderKey();
    A.m.vault.mintVault();
    A.m.vault.markVaultBackedUp();
    const made = await A.m.records.createRecordSaved(sealed);
    if (!('record' in made)) throw new Error('not saved');
    backup = JSON.stringify(A.m.backup.backupContents());
    await A.m.backup.checkBackup(fileOf(backup));
    return made.record;
  });
  const H = (await A.run(() => A.m.holder.holderKeyIfAny())) as string;
  await until(() => reg.rowsOf(H).some((r) => r.id === record.id && !!r.sealed));
  return { A, record, H, backup };
};

describe('deleting a record', () => {
  it('goes from this browser and from VeilCore’s registry together', async () => {
    const { A, record, H } = await withRecord('del-a');
    expect(await A.run(() => A.m.records.deleteRecord(record.id))).toEqual({ ok: true });
    expect(reg.rowsOf(H).some((r) => r.id === record.id)).toBe(false);
    expect(await A.run(() => A.m.records.getRecord(record.id))).toBeUndefined();
  });

  it('with VeilCore out of reach, nothing changes, and it says so', async () => {
    const { A, record, H } = await withRecord('del-b');
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('offline')));
    expect(await A.run(() => A.m.records.deleteRecord(record.id))).toEqual({ error: 'offline' });
    expect(await A.run(() => A.m.records.getRecord(record.id))).toBeDefined();
    expect(reg.rowsOf(H).some((r) => r.id === record.id)).toBe(true);
  });

  it('an id this browser doesn’t hold is refused', async () => {
    const A = await browser('del-c');
    expect(await A.run(() => A.m.records.deleteRecord('VEIL-00000000000000000000000000000000'))).toEqual({
      error: 'missing',
    });
  });

  it('a save still on its way: nothing is deleted, and it asks to try again', async () => {
    const { A, record, H } = await withRecord('del-d');
    A.m.records.SAVES_WAIT.ms = 60;
    let hang = true;
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) =>
      hang && init?.method === 'PUT' && new URL(url).pathname === '/api/records'
        ? new Promise(() => {})
        : reg.fetch(url, init),
    );
    await A.run(() => A.m.records.noteSentTo(record.id, 'TR-1', 'Lab'));
    await settle(10);
    expect(await A.run(() => A.m.records.deleteRecord(record.id))).toEqual({ error: 'busy' });
    hang = false;
    expect(reg.rowsOf(H).some((r) => r.id === record.id)).toBe(true);
    expect(await A.run(() => A.m.records.getRecord(record.id))).toBeDefined();
  });

  it('VeilCore answering that it removed nothing is a failure, not a delete', async () => {
    const { A, record } = await withRecord('del-e');
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) =>
      init?.method === 'DELETE'
        ? Promise.resolve(new Response(JSON.stringify({ ok: false, removed: [] }), { status: 200 }))
        : reg.fetch(url, init),
    );
    expect(await A.run(() => A.m.records.deleteRecord(record.id))).toEqual({ error: 'not-removed' });
    expect(await A.run(() => A.m.records.getRecord(record.id))).toBeDefined();
  });

  it('another tab that still holds it can’t save it back: it drops it instead', async () => {
    const { A, record, H } = await withRecord('del-f');
    const B = await browser('del-f2', {}, 'del-f');
    await B.run(() => B.m.records.hydrate());
    expect(await B.run(() => B.m.records.getRecord(record.id))).toBeDefined();

    expect(await A.run(() => A.m.records.deleteRecord(record.id))).toEqual({ ok: true });
    // B still has it in memory, changes it, and saves the whole set.
    await B.run(() => B.m.records.noteSentTo(record.id, 'TR-2', 'Lab'));
    await until(async () => (await B.run(() => B.m.records.getRecord(record.id))) === undefined);
    expect(reg.rowsOf(H).some((r) => r.id === record.id)).toBe(false);
    // Said once, so the record doesn't just vanish.
    expect(await B.run(() => B.m.records.removedAsDeletedCount())).toBe(1);
    // And kept that way: a reload with VeilCore out of reach doesn't show it again.
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('offline')));
    const E = await browser('del-f3', {}, 'del-f');
    await E.run(() => E.m.records.hydrate());
    expect(await E.run(() => E.m.records.getRecord(record.id))).toBeUndefined();
  });

  it('a backup saved before doesn’t bring it back', async () => {
    const { A, record, H, backup } = await withRecord('del-g');
    expect(await A.run(() => A.m.records.deleteRecord(record.id))).toEqual({ ok: true });
    const D = await browser('del-g2');
    await D.run(async () => {
      await D.m.backup.restoreAny(fileOf(backup));
      await D.m.records.hydrate();
    });
    await until(async () => (await D.run(() => D.m.records.getRecord(record.id))) === undefined);
    await settle(100);
    expect(reg.rowsOf(H).some((r) => r.id === record.id)).toBe(false);
  });
});
