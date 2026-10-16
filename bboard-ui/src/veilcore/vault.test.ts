// The vault key and the cipher (sealed records, CONTRACT.md #1-#5, #8): the wire format the
// registry checks, the AAD binding (a ciphertext opens only as the row it was sealed for),
// the cache that re-sends an unchanged row as the same bytes, and when a key may be made.
import { createDecipheriv, createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const local = new Map<string, string>();

beforeEach(() => {
  vi.resetModules();
  local.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  });
});

const b64 = (s: string) => Buffer.from(s, 'base64url');

describe('the vault key', () => {
  it('is 32 random bytes kept in veilcore.vault.v1, and its kid is the contract’s hash', async () => {
    const vault = await import('./vault');
    expect(vault.vaultKeyIfAny()).toBeNull();
    const key = vault.mintVault();
    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(b64(key)).toHaveLength(32);
    expect(local.get(vault.VAULT_STORAGE_KEY)).toContain(key);
    expect(vault.mintVault()).toBe(key); // never a second one
    const kid = createHash('sha256')
      .update(Buffer.concat([Buffer.from('veilcore:vault-id:v1:', 'utf8'), b64(key)]))
      .digest('hex')
      .slice(0, 16);
    expect(await vault.vaultKid()).toBe(kid);
    expect(vault.vaultNeedsBackup()).toBe(true);
    vault.markVaultBackedUp();
    expect(vault.vaultNeedsBackup()).toBe(false);
  });

  it('may be made only when no stored row is sealed', async () => {
    const { mayMintVault } = await import('./vault');
    expect(mayMintVault([])).toBe(true);
    expect(mayMintVault([{ id: 'VEIL-1', strainName: 'x', bredBy: 'y' }])).toBe(true);
    expect(mayMintVault([{ id: 'VEIL-1' }, { id: 'VEIL-2', sealed: { v: 1 } }])).toBe(false);
  });
});

describe('sealing a row', () => {
  it('is AES-256-GCM with a 12-byte IV and the tag appended, which node:crypto opens with the exact AAD', async () => {
    const vault = await import('./vault');
    const key = vault.mintVault();
    const box = await vault.sealRow('records', 'VEIL-A', { bredBy: 'Me', notes: 'n' });
    expect(box).toMatchObject({ v: 1, alg: 'A256GCM', kid: await vault.vaultKid() });
    expect(box.iv).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect(box.ct).toMatch(/^[A-Za-z0-9_-]+$/);
    const ct = b64(box.ct);
    const d = createDecipheriv('aes-256-gcm', b64(key), b64(box.iv));
    d.setAAD(Buffer.from(`veilcore:sealed:v1\0records\0VEIL-A\0${box.kid}`, 'utf8'));
    d.setAuthTag(ct.subarray(ct.length - 16));
    const pt = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]).toString('utf8');
    expect(JSON.parse(pt)).toEqual({ bredBy: 'Me', notes: 'n' });
  });

  it('opens only as the row it was sealed for: another id, the other collection or another key fails', async () => {
    const vault = await import('./vault');
    vault.mintVault();
    const a = await vault.sealRow('records', 'VEIL-A', { bredBy: 'A' });
    const b = await vault.sealRow('records', 'VEIL-B', { bredBy: 'B' });
    expect(await vault.openRow('records', 'VEIL-A', a)).toEqual({ ok: true, value: { bredBy: 'A' } });
    // Swapped between rows: neither opens as the other.
    expect((await vault.openRow('records', 'VEIL-B', a)).ok).toBe(false);
    expect((await vault.openRow('records', 'VEIL-A', b)).ok).toBe(false);
    // A record's ciphertext doesn't open as a licence of the same id.
    expect((await vault.openRow('licenses', 'VEIL-A', a)).ok).toBe(false);
    // A changed byte doesn't open.
    const flipped = { ...a, ct: a.ct.slice(0, -2) + (a.ct.endsWith('AA') ? 'AB' : 'AA') };
    expect((await vault.openRow('records', 'VEIL-A', flipped)).ok).toBe(false);
    // Another browser's key: locked, and says which key it needs.
    vault.__forgetVaultForTests();
    vault.mintVault();
    expect(await vault.openRow('records', 'VEIL-A', a)).toEqual({ ok: false, kid: a.kid });
  });

  it('sends an unchanged row as the same bytes, and a changed one as new ones', async () => {
    const vault = await import('./vault');
    vault.mintVault();
    const first = await vault.sealRow('records', 'VEIL-A', { bredBy: 'A', notes: 'x' });
    expect(await vault.sealRow('records', 'VEIL-A', { notes: 'x', bredBy: 'A' })).toEqual(first);
    const changed = await vault.sealRow('records', 'VEIL-A', { bredBy: 'A', notes: 'y' });
    expect(changed.iv).not.toBe(first.iv);
    // A row opened after a load is re-sent as the registry holds it.
    vault.__forgetVaultForTests();
    const key = vault.mintVault();
    const box = await vault.sealRow('records', 'VEIL-C', { bredBy: 'C' });
    vi.resetModules();
    const fresh = await import('./vault');
    expect(fresh.vaultKeyIfAny()).toBe(key);
    expect((await fresh.openRow('records', 'VEIL-C', box)).ok).toBe(true);
    expect(await fresh.sealRow('records', 'VEIL-C', { bredBy: 'C' })).toEqual(box);
  });
});

describe('a transfer offer', () => {
  it('opens with its own key for its source record and fingerprint, and nothing else', async () => {
    const vault = await import('./vault');
    const k = vault.newOfferKey();
    expect(k).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const fp = 'ab'.repeat(32);
    const box = await vault.sealOffer(k, 'VEIL-S', fp, { strainName: 'Cut', bredBy: 'Me' });
    expect(Object.keys(box).sort()).toEqual(['alg', 'ct', 'iv', 'v']);
    expect(await vault.openOffer(k, 'VEIL-S', fp, box)).toEqual({ strainName: 'Cut', bredBy: 'Me' });
    expect(await vault.openOffer(k, 'VEIL-T', fp, box)).toBeNull();
    expect(await vault.openOffer(k, 'VEIL-S', 'cd'.repeat(32), box)).toBeNull();
    expect(await vault.openOffer(vault.newOfferKey(), 'VEIL-S', fp, box)).toBeNull();
    // node:crypto reads the same AAD.
    const ct = b64(box.ct);
    const d = createDecipheriv('aes-256-gcm', b64(k), b64(box.iv));
    d.setAAD(Buffer.from(`veilcore:offer:v1\0VEIL-S\0${fp}`, 'utf8'));
    d.setAuthTag(ct.subarray(ct.length - 16));
    expect(JSON.parse(Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]).toString())).toEqual({
      bredBy: 'Me',
      strainName: 'Cut',
    });
  });
});
