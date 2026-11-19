// Passkeys (passkey-backup.ts): which site a passkey is for, whether it syncs, its name, and the
// passkey copy made before the account copy (read and moved over only: account-copy.test.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { fakePasskey } from './fixtures/account-registry';

let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('which site a passkey is for (review N2)', () => {
  it('veilcore.org and its subdomains pin veilcore.org; the test site keeps its own; elsewhere the host', async () => {
    const { rpIdFor } = await import('./passkey-backup');
    expect(rpIdFor('veilcore.org')).toBe('veilcore.org');
    expect(rpIdFor('www.veilcore.org')).toBe('veilcore.org');
    expect(rpIdFor('app.veilcore.org')).toBe('veilcore.org');
    expect(rpIdFor('test.veilcore.org')).toBe('test.veilcore.org');
    expect(rpIdFor('localhost')).toBeUndefined();
    expect(rpIdFor('veilcore-git-x.vercel.app')).toBeUndefined();
    // Not a lookalike.
    expect(rpIdFor('notveilcore.org')).toBeUndefined();
  });

  it('a new passkey is made for the pinned name, with a name that says what it does (N6)', async () => {
    vi.resetModules();
    vi.stubGlobal('location', { hostname: 'veilcore.org' });
    const pk = fakePasskey();
    vi.stubGlobal('navigator', { credentials: pk.credentials });
    vi.stubGlobal('window', {
      PublicKeyCredential: function PublicKeyCredential() {},
      location: { origin: 'https://veilcore.org', hostname: 'veilcore.org' },
      addEventListener: () => undefined,
    });
    const m = await import('./passkey-backup');
    const made = await m.newPasskey();
    expect(pk.asks[0].publicKey.rp?.id).toBe('veilcore.org');
    expect(pk.asks[0].publicKey.user?.name).toBe('VeilCore: unlocks your records');
    expect(made.synced).toBe(true);
    expect(made.rpId).toBe('veilcore.org');
    // Asking under the page's own host (a passkey from before the pin) sends no rpId.
    await m.askPasskey(undefined, 'host');
    expect(pk.asks[1].publicKey.rpId).toBeUndefined();
  });
});

describe('whether a passkey syncs (the BS flag)', () => {
  it('reads bit 4 of the flags byte, and unknown is "doesn’t"', async () => {
    const { syncedFromAuthData } = await import('./passkey-backup');
    const a = new Uint8Array(37);
    a[32] = 0x1d; // UP, UV, BE, BS
    expect(syncedFromAuthData(a)).toBe(true);
    a[32] = 0x0d; // BE without BS
    expect(syncedFromAuthData(a)).toBe(false);
    expect(syncedFromAuthData(undefined)).toBe(false);
    expect(syncedFromAuthData(new Uint8Array(10))).toBe(false);
  });

  it('a device-bound passkey says so', async () => {
    vi.resetModules();
    const pk = fakePasskey({ synced: false });
    vi.stubGlobal('navigator', { credentials: pk.credentials });
    const m = await import('./passkey-backup');
    expect((await m.askPasskey()).synced).toBe(false);
  });

  it('a passkey without PRF is refused plainly, and a cancel says nothing changed', async () => {
    vi.resetModules();
    const m = await import('./passkey-backup');
    vi.stubGlobal('navigator', {
      credentials: {
        create: () =>
          Promise.resolve({
            rawId: new ArrayBuffer(16),
            getClientExtensionResults: () => ({ prf: { enabled: false } }),
          }),
        get: () => Promise.reject(new DOMException('no', 'NotAllowedError')),
      },
    });
    await expect(m.newPasskey()).rejects.toThrow(m.PASSKEY_WORDS.unsupported);
    await expect(m.askPasskey()).rejects.toThrow(m.PASSKEY_WORDS.cancelled);
  });
});

describe('the passkey copy made before the account copy', () => {
  it('the same passkey makes the same keys; another passkey, other keys', async () => {
    const { passkeyKeys } = await import('./passkey-backup');
    const prf = randomBytes(32);
    const id = randomBytes(16);
    const a = passkeyKeys(prf, id);
    expect(passkeyKeys(prf, id)).toEqual(a);
    expect(a.id).toMatch(/^[0-9a-f]{32}$/);
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const b = passkeyKeys(prf, randomBytes(16));
    expect(b.id).not.toBe(a.id);
  });

  it('a copy opens only with its own keys, and unchanged', async () => {
    const { passkeyKeys, sealCopy, openCopy, PASSKEY_WORDS } = await import('./passkey-backup');
    const { backupContents } = await import('./backup');
    const id = randomBytes(16);
    const keys = passkeyKeys(randomBytes(32), id);
    const contents = backupContents(Date.UTC(2026, 9, 21));
    const box = await sealCopy(contents, keys);
    const opened = await openCopy(box, keys);
    expect(opened.savedAt).toBe(contents.savedAt);
    expect(JSON.parse(opened.text)).toEqual(contents);
    await expect(openCopy(box, passkeyKeys(randomBytes(32), id))).rejects.toThrow(PASSKEY_WORDS.damaged);
    await expect(openCopy(box, { ...keys, id: '0'.repeat(32) })).rejects.toThrow(PASSKEY_WORDS.damaged);
  });

  it('what this browser remembered of one is read, and forgotten after the move', async () => {
    const m = await import('./passkey-backup');
    expect(m.legacyRemembered()).toBeUndefined();
    store.set(
      m.LEGACY_STORE,
      JSON.stringify({
        id: 'a'.repeat(32),
        credentialId: 'AAAA',
        sameAs: 'x',
        savedAt: '2026-10-21',
        prev: 'p',
        seq: 3,
      }),
    );
    expect(m.legacyRemembered()).toMatchObject({ id: 'a'.repeat(32), seq: 3, prev: 'p' });
    m.forgetLegacy();
    expect(m.legacyRemembered()).toBeUndefined();
  });
});
