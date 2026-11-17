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

  it('a stale tab still linking to a deleted correction keeps the record, its keys, and drops only the link', async () => {
    const { A, record, H } = await withRecord('del-h');
    const fix = await A.run(() => A.m.records.issueCorrection(record.id, { notes: 'fixed' }, 'fix'));
    if (!fix) throw new Error('no correction');
    await until(() => reg.rowsOf(H).some((r) => r.id === fix.id && !!r.sealed));
    const B = await browser('del-h2', {}, 'del-h');
    await B.run(() => B.m.records.hydrate());
    expect((await B.run(() => B.m.records.getRecord(record.id)))?.supersededBy).toBe(fix.id);

    // The correction is taken back on A (the registry also drops the record's link to it).
    const gone = await A.run(() => A.m.api.deleteRecords([fix.id]));
    expect(gone).toMatchObject({ removed: [fix.id] });
    expect(reg.rowsOf(H).find((r) => r.id === record.id)?.supersededBy).toBeUndefined();

    // B, still linking to it, saves: the record is refused only for its link, never dropped.
    await B.run(() => B.m.records.noteSentTo(record.id, 'TR-3', 'Lab'));
    await until(async () => (await B.run(() => B.m.records.getRecord(record.id)))?.supersededBy === undefined);
    expect(await B.run(() => B.m.records.getRecord(record.id))).toBeDefined();
    expect(await B.run(() => B.m.records.getRecord(fix.id))).toBeUndefined();
    await until(() => reg.rowsOf(H).some((r) => r.id === record.id && r.supersededBy === undefined));
    expect(reg.rowsOf(H).some((r) => r.id === record.id)).toBe(true);
    // The record's keys stay: it still opens on B.
    expect((await B.run(() => B.m.records.getRecord(record.id)))?.strainName).toBe('TEST delete');
  });

  it('a record a correction still corrects (made on another device) isn’t deleted, and says why', async () => {
    const { A, record, H } = await withRecord('del-i');
    const fix = await A.run(() => A.m.records.issueCorrection(record.id, { notes: 'fixed' }, 'fix'));
    if (!fix) throw new Error('no correction');
    await until(() => reg.rowsOf(H).some((r) => r.id === fix.id && !!r.sealed));
    const out = await A.run(() => A.m.api.deleteRecords([record.id]));
    expect(out).toMatchObject({ removed: [], refused: [{ id: record.id, code: 'linked' }] });
    expect(reg.rowsOf(H).some((r) => r.id === record.id)).toBe(true);
  });

  it('VeilCore refusing it as linked is said as the correction it is part of', async () => {
    const { A, record } = await withRecord('del-j');
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) =>
      init?.method === 'DELETE'
        ? Promise.resolve(
            new Response(
              JSON.stringify({ ok: false, removed: [], refused: [{ id: record.id, code: 'linked', reason: 'x' }] }),
              {
                status: 200,
              },
            ),
          )
        : reg.fetch(url, init),
    );
    expect(await A.run(() => A.m.records.deleteRecord(record.id))).toEqual({ error: 'linked' });
    expect(await A.run(() => A.m.records.getRecord(record.id))).toBeDefined();
  });
  it('a proof code on its way alone lands before the delete, so it can’t add the record back', async () => {
    const A = await browser('del-dating');
    const sealed = await seal(A);
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    let datingSeen = 0;
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      if (init?.method === 'PUT' && new URL(url).pathname === '/api/records/dating') {
        datingSeen++;
        await gate;
      }
      return reg.fetch(url, init);
    });
    // No checked backup: the record stays in this browser, and only its proof code is sent.
    const record = await A.run(() => {
      A.m.holder.holderKey();
      return A.m.records.createRecord(sealed);
    });
    const H = (await A.run(() => A.m.holder.holderKeyIfAny())) as string;
    await until(() => datingSeen > 0);
    const del = A.run(() => A.m.records.deleteRecord(record.id));
    await settle(30);
    release();
    expect(await del).toEqual({ ok: true });
    await settle(100);
    expect(reg.rowsOf(H).some((r) => r.id === record.id)).toBe(false);
    expect(await A.run(() => A.m.records.getRecord(record.id))).toBeUndefined();
  });

  it('a dating request that never answers: nothing is deleted, and it asks to try again', async () => {
    const A = await browser('del-dating2');
    const sealed = await seal(A);
    A.m.records.SAVES_WAIT.ms = 60;
    let datingSeen = 0;
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      if (init?.method === 'PUT' && new URL(url).pathname === '/api/records/dating') {
        datingSeen++;
        return new Promise(() => {});
      }
      return reg.fetch(url, init);
    });
    const record = await A.run(() => {
      A.m.holder.holderKey();
      return A.m.records.createRecord(sealed);
    });
    await until(() => datingSeen > 0);
    expect(await A.run(() => A.m.records.deleteRecord(record.id))).toEqual({ error: 'busy' });
    expect(await A.run(() => A.m.records.getRecord(record.id))).toBeDefined();
  });

  it('an earlier try whose answer was lost: the retry finds it deleted on VeilCore and finishes', async () => {
    const { A, record, H } = await withRecord('del-lost');
    let first = true;
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      if (init?.method === 'DELETE' && first) {
        first = false;
        await reg.fetch(url, init); // done on VeilCore, but the answer never arrives
        throw new TypeError('connection dropped');
      }
      return reg.fetch(url, init);
    });
    expect(await A.run(() => A.m.records.deleteRecord(record.id))).toEqual({ error: 'offline' });
    expect(reg.rowsOf(H).some((r) => r.id === record.id)).toBe(false);
    expect(await A.run(() => A.m.records.deleteRecord(record.id))).toEqual({ ok: true });
    expect(await A.run(() => A.m.records.getRecord(record.id))).toBeUndefined();
  });

  it('a retry is never taken as deleted when VeilCore has no tombstone for it', async () => {
    const { A, record } = await withRecord('del-lost2');
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) =>
      init?.method === 'DELETE'
        ? Promise.resolve(
            new Response(JSON.stringify({ ok: false, removed: [], notRemoved: [record.id] }), { status: 200 }),
          )
        : reg.fetch(url, init),
    );
    expect(await A.run(() => A.m.records.deleteRecord(record.id))).toEqual({ error: 'not-removed' });
    expect(await A.run(() => A.m.records.getRecord(record.id))).toBeDefined();
  });
  it('a refused correction link never takes a record whose proof code is dated', async () => {
    const A = await browser('del-link-dated');
    const sealed = await seal(A);
    const record = await A.run(() => {
      A.m.holder.holderKey();
      return A.m.records.createRecord(sealed);
    });
    await until(() => A.m.api.registryHasProofCode(record.id));
    // Every save of it is refused for a correction link naming a deleted record.
    let saves = 0;
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) =>
      init?.method === 'PUT' && new URL(url).pathname === '/api/records' && ++saves
        ? Promise.resolve(
            new Response(
              JSON.stringify({
                ok: false,
                rejected: [{ id: record.id, code: 'links-deleted', field: 'supersedes', reason: 'x' }],
                notWritten: [],
              }),
              { status: 200 },
            ),
          )
        : reg.fetch(url, init),
    );
    // Its backup checked now, so its locked copy is sent: and refused, for the link.
    await A.run(async () => {
      A.m.vault.mintVault();
      A.m.vault.markVaultBackedUp();
      await A.m.backup.checkBackup(fileOf(JSON.stringify(A.m.backup.backupContents())));
      A.m.records.noteSentTo(record.id, 'TR-9', 'Lab');
    });
    await until(() => saves > 0);
    await settle(50);
    // Dated already, so kept with its keys, and nothing said as deleted.
    expect((await A.run(() => A.m.records.getRecord(record.id)))?.strainName).toBe('TEST delete');
    expect(await A.run(() => A.m.records.removedAsDeletedCount())).toBe(0);
  });
});
