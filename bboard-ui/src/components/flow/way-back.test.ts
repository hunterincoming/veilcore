// When a flow may skip the backup file after a seal (way-back.ts, the simplify-unlock plan,
// phase 1). The registry and the passkey are stand-ins (veilcore/fixtures/account-registry.ts);
// the account copy, its marks and the rule are the real code. The rule under test: the file step
// is skipped only when the records just sealed are provably in a counted copy, and never leaves
// anyone with no way back.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { accountRegistry, fakePasskey, type AccountRegistry } from '../../veilcore/fixtures/account-registry';

let store: Map<string, string>;
let reg: AccountRegistry;
let pk: ReturnType<typeof fakePasskey>;

beforeEach(() => {
  vi.resetModules();
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  reg = accountRegistry();
  vi.stubGlobal('fetch', reg.fetch);
  pk = fakePasskey();
  vi.stubGlobal('navigator', {
    credentials: pk.credentials,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X)',
  });
  vi.stubGlobal('window', {
    PublicKeyCredential: function PublicKeyCredential() {},
    location: { origin: 'http://localhost', hostname: 'localhost' },
    addEventListener: () => undefined,
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const load = async () => {
  const ac = await import('../../veilcore/account-copy');
  const rk = await import('../../veilcore/record-keys');
  const vault = await import('../../veilcore/vault');
  const holder = await import('../../veilcore/holder');
  const wb = await import('./way-back');
  return { ac, rk, vault, holder, wb };
};

const withRecords = (m: Awaited<ReturnType<typeof load>>, ids: string[]) => {
  m.holder.setHolderKey(randomBytes(32).toString('hex'));
  m.vault.mintVault();
  m.vault.markVaultSealed();
  for (const id of ids) m.rk.ensureKeys(id);
};

describe('skipping the file step after a seal', () => {
  it('with the copy on and counted, a record sealed after it is saved into the copy and the file step is skipped', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    expect(m.wb.copyCountsHere(m.ac.accountState())).toBe(true);
    // A new record: its keys are only here until the copy is saved again.
    m.rk.ensureKeys('R-2');
    expect(m.wb.recordsHaveWayBack(['R-2'])).toBe(false);
    const saves = reg.calls.length;
    expect(await m.wb.savedWithVeilCore(['R-2'])).toBe(true);
    // It was saved now, and read back: the copy holds it and marked it.
    expect(reg.calls.length).toBeGreaterThan(saves);
    expect(m.rk.keysFor('R-2')?.backedUpVia).toBe('copy');
    expect(m.wb.recordsHaveWayBack(['R-2'])).toBe(true);
  });

  it('right after setting up, this browser shows as holding the copy’s keys, so the copy counts here', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    // Read again and again while the copy is being made, as a screen does each time a save draws it.
    const reading = setInterval(() => m.ac.accountState(), 0);
    await m.ac.setUpAccount();
    clearInterval(reading);
    m.ac.accountState();
    await new Promise((r) => setTimeout(r, 20));
    const s = m.ac.accountState();
    expect(s.kind === 'saved' && s.locked).toBe(false);
    await new Promise((r) => setTimeout(r, 20));
    expect(m.wb.copyCountsHere(m.ac.accountState())).toBe(true);
  });

  it('with no way back at all (nothing set up), the file step stays: nothing is skipped', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    expect(m.ac.accountState().kind).toBe('none');
    expect(m.wb.copyCountsHere(m.ac.accountState())).toBe(false);
    expect(await m.wb.savedWithVeilCore(['R-1'])).toBe(false);
    expect(reg.calls).toEqual([]);
  });

  it('a passkey that stays on this device, with no checked recovery sheet, does not count: the file step stays', async () => {
    pk.state.synced = false;
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    m.rk.ensureKeys('R-2');
    expect(m.wb.copyCountsHere(m.ac.accountState())).toBe(false);
    expect(await m.wb.savedWithVeilCore(['R-2'])).toBe(false);
  });

  it('a copy that can’t be saved just now (the registry refuses) brings the file step back', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    m.rk.ensureKeys('R-2');
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('{"error":"down"}', { status: 503 })));
    expect(await m.wb.savedWithVeilCore(['R-2'])).toBe(false);
    expect(m.rk.keysFor('R-2')?.backedUpAt).toBeUndefined();
  });

  it('a copy that takes too long brings the file step back instead of waiting', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    m.rk.ensureKeys('R-2');
    vi.stubGlobal('fetch', () => new Promise<Response>(() => undefined));
    expect(await m.wb.savedWithVeilCore(['R-2'], 50)).toBe(false);
  });

  it('a copy gone from the registry no longer counts: its marks go, and the file step comes back', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    reg.copies.clear();
    await m.ac.checkAccount();
    m.rk.ensureKeys('R-2');
    expect(m.wb.copyCountsHere(m.ac.accountState())).toBe(false);
    expect(await m.wb.savedWithVeilCore(['R-2'])).toBe(false);
  });

  it('a record with no keys in this browser is never counted as safe', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    expect(m.wb.recordsHaveWayBack(['NOT-HERE'])).toBe(false);
    expect(m.wb.recordsHaveWayBack([])).toBe(false);
    expect(await m.wb.savedWithVeilCore([])).toBe(false);
  });

  it('a browser that won’t keep what it is given (a private window) always gets the file step', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    m.rk.ensureKeys('R-2');
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: (k: string) => void store.delete(k),
    });
    expect(await m.wb.savedWithVeilCore(['R-2'])).toBe(false);
  });
});
