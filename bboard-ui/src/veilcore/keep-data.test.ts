// The first record saved in this browser asks the browser to keep this site's data
// (navigator.storage.persist), once: Safari and others may otherwise clear it.
// SPDX-License-Identifier: Apache-2.0
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const local = new Map<string, string>();
const persist = vi.fn(() => Promise.resolve(true));

beforeAll(async () => {
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  });
  vi.stubGlobal('fetch', (_url: string, init?: RequestInit) =>
    Promise.resolve(new Response(JSON.stringify(init?.method === 'PUT' ? { ok: true } : []), { status: 200 })),
  );
  vi.stubGlobal('navigator', { ...globalThis.navigator, storage: { persist } });
  const vault = await import('./vault');
  vault.mintVault();
  vault.markVaultBackedUp();
});
afterAll(() => vi.unstubAllGlobals());

describe('keeping this browser’s data', () => {
  it('asks once, when the first record is saved; not for the ones after', async () => {
    const records = await import('./records');
    const { fingerprintRecord, newNonce } = await import('./commitment');
    const make = async (name: string) => {
      const fields = {
        nonce: newNonce(),
        strainName: name,
        bredBy: 'Tester',
        dateCreated: '2026-11-07',
        notes: '',
        loggedAt: Date.now(),
      };
      return records.createRecord({ ...fields, recordFingerprint: await fingerprintRecord(fields) });
    };
    expect(persist).not.toHaveBeenCalled();
    await make('First');
    expect(persist).toHaveBeenCalledTimes(1);
    await make('Second');
    expect(persist).toHaveBeenCalledTimes(1);
  });
});
