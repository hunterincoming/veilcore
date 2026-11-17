// Deleting one of the holder's records (records.ts deleteRecord): it goes from this browser and
// from VeilCore's registry together; with VeilCore out of reach nothing goes from either, so the
// list never shows a record as gone that the registry still holds; a record kept on this device
// only is not deleted this way (it has its own delete).
//
// Against the in-memory registry with the real one's rules (fixtures/fake-registry.ts).
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRegistry, type FakeRegistry } from './fixtures/fake-registry';
import { browser, installStorage, settle, type Browser } from './fixtures/browsers';
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

describe('deleting a record', () => {
  it('goes from this browser and from VeilCore’s registry together', async () => {
    const A = await browser('del-a');
    const sealed = await seal(A);
    const record = await A.run(() => A.m.records.createRecord(sealed));
    const H = (await A.run(() => A.m.holder.holderKeyIfAny())) as string;
    await until(() => reg.rowsOf(H).some((r) => r.id === record.id));
    const out = await A.run(() => A.m.records.deleteRecord(record.id));
    expect(out).toEqual({ ok: true });
    expect(reg.rowsOf(H).some((r) => r.id === record.id)).toBe(false);
    expect(await A.run(() => A.m.records.getRecord(record.id))).toBeUndefined();
  });

  it('with VeilCore out of reach, nothing is removed anywhere', async () => {
    const A = await browser('del-b');
    const sealed = await seal(A);
    const record = await A.run(() => A.m.records.createRecord(sealed));
    const H = (await A.run(() => A.m.holder.holderKeyIfAny())) as string;
    await until(() => reg.rowsOf(H).some((r) => r.id === record.id));
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('offline')));
    const out = await A.run(() => A.m.records.deleteRecord(record.id));
    expect('error' in out).toBe(true);
    expect(await A.run(() => A.m.records.getRecord(record.id))).toBeDefined();
    expect(reg.rowsOf(H).some((r) => r.id === record.id)).toBe(true);
  });

  it('an id this browser doesn’t hold is refused', async () => {
    const A = await browser('del-c');
    expect(await A.run(() => A.m.records.deleteRecord('VEIL-00000000000000000000000000000000'))).toEqual({
      error: 'no such record here',
    });
  });
});
