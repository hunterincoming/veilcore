// The passkey copy of a backup (passkey-backup.ts): a lost phone gets everything back from a
// passkey that synced to the new one. The passkey and the registry are stand-ins here; the
// keys, the sealing and the restore are the real code.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';

let store: Map<string, string>;
const vault = new Map<string, { hash: string; iv: string; ct: string }>();
const sha = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');

/** The registry's /vault routes, as lineage/passkey-vault.mjs answers them. */
const registry = vi.fn(async (url: string, init: RequestInit) => {
  const body = JSON.parse(init.body as string) as { token: string; iv?: string; ct?: string };
  const m = /\/vault\/([0-9a-f]{32})(\/read|\/delete)?$/.exec(url);
  const reply = (status: number, json: unknown) => new Response(JSON.stringify(json), { status });
  if (!m) return reply(404, { error: 'no route' });
  const row = vault.get(m[1]);
  const ok = row && row.hash === (await sha(body.token));
  if (!m[2]) {
    if (row && !ok) return reply(403, { error: 'this copy needs its passkey' });
    vault.set(m[1], { hash: await sha(body.token), iv: body.iv!, ct: body.ct! });
    return reply(200, { saved: true });
  }
  if (!row) return reply(404, { error: 'no such copy' });
  if (!ok) return reply(403, { error: 'this copy needs its passkey' });
  if (m[2] === '/delete') {
    vault.delete(m[1]);
    return reply(200, { deleted: true });
  }
  return reply(200, { iv: row.iv, ct: row.ct });
});

/** A synced passkey: the same id and PRF secret on every device. */
const passkey = { rawId: randomBytes(16), secret: randomBytes(32) };
const prfFor = async (input: Uint8Array<ArrayBuffer>) => {
  const k = await crypto.subtle.importKey('raw', passkey.secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, input));
};
const credential = (prf?: Uint8Array, enabled = true) => ({
  rawId: passkey.rawId.buffer.slice(passkey.rawId.byteOffset, passkey.rawId.byteOffset + 16),
  getClientExtensionResults: () => ({ prf: { enabled, ...(prf ? { results: { first: prf } } : {}) } }),
});
type PrfAsk = { publicKey: { extensions: { prf: { eval: { first: Uint8Array<ArrayBuffer> } } } } };
const credentials = {
  create: vi.fn(async (o: PrfAsk) => credential(await prfFor(o.publicKey.extensions.prf.eval.first))),
  get: vi.fn(async (o: PrfAsk) => credential(await prfFor(o.publicKey.extensions.prf.eval.first))),
};

beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal('fetch', registry);
  vi.stubGlobal('navigator', { credentials });
  credentials.create.mockClear();
  credentials.get.mockClear();
});

describe('the copy’s keys and sealing', () => {
  it('the same passkey makes the same keys; another passkey, other keys', async () => {
    const { passkeyKeys } = await import('./passkey-backup');
    const prf = randomBytes(32);
    const a = passkeyKeys(prf, passkey.rawId);
    expect(passkeyKeys(prf, passkey.rawId)).toEqual(a);
    expect(a.id).toMatch(/^[0-9a-f]{32}$/);
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const b = passkeyKeys(prf, randomBytes(16));
    expect(b.id).not.toBe(a.id);
    expect(b.token).not.toBe(a.token);
  });

  it('a copy opens only with its own keys, and unchanged', async () => {
    const { passkeyKeys, sealCopy, openCopy, PASSKEY_WORDS } = await import('./passkey-backup');
    const { backupContents } = await import('./backup');
    const keys = passkeyKeys(randomBytes(32), passkey.rawId);
    const contents = backupContents(Date.UTC(2026, 9, 21));
    const box = await sealCopy(contents, keys);
    const opened = await openCopy(box, keys);
    expect(opened.savedAt).toBe(contents.savedAt);
    expect(JSON.parse(opened.text)).toEqual(contents);
    await expect(openCopy(box, passkeyKeys(randomBytes(32), passkey.rawId))).rejects.toThrow(PASSKEY_WORDS.damaged);
    // Moved to another id (a registry swapping copies): refused.
    await expect(openCopy(box, { ...keys, id: '0'.repeat(32) })).rejects.toThrow(PASSKEY_WORDS.damaged);
    const flipped = box.ct.slice(0, -2) + (box.ct.endsWith('AA') ? 'BA' : 'AA');
    await expect(openCopy({ ...box, ct: flipped }, keys)).rejects.toThrow(PASSKEY_WORDS.damaged);
  });
});

describe('lost phone: make the copy, then restore it on a new device', () => {
  it('works end to end, and only asks for the passkey when it has to', async () => {
    vi.resetModules();
    const pk = await import('./passkey-backup');
    const { setHolderKey, holderKeyIfAny } = await import('./holder');
    const { restoreAny } = await import('./backup');
    const holder = randomBytes(32).toString('hex');
    setHolderKey(holder);

    expect(pk.passkeyCopyState()).toBe('none');
    const made = await pk.makePasskeyCopy();
    expect(made.ok).toBe(true);
    expect(credentials.create).toHaveBeenCalledTimes(1);
    expect(pk.passkeyCopyState()).toBe('current');
    // The registry holds only ciphertext: the holder key is nowhere in it.
    expect(JSON.stringify([...vault.values()])).not.toContain(holder);

    // Updating in the same visit doesn't ask again.
    await pk.updatePasskeyCopy();
    expect(credentials.get).not.toHaveBeenCalled();

    // The new phone: nothing in this browser, the passkey synced.
    store.clear();
    pk._forgetSession();
    expect(holderKeyIfAny()).toBeNull();
    const got = await pk.fetchPasskeyCopy();
    expect(credentials.get).toHaveBeenCalledTimes(1);
    const restored = await restoreAny(got.file);
    expect(restored.holderKey).toBe('restored');
    expect(holderKeyIfAny()).toBe(holder);
  });

  it('a passkey without PRF is refused plainly, and a cancel changes nothing', async () => {
    vi.resetModules();
    const pk = await import('./passkey-backup');
    credentials.create.mockImplementationOnce(() => Promise.resolve(credential(undefined, false)));
    await expect(pk.makePasskeyCopy()).rejects.toThrow(pk.PASSKEY_WORDS.unsupported);
    credentials.create.mockImplementationOnce(() => Promise.reject(new DOMException('no', 'NotAllowedError')));
    await expect(pk.makePasskeyCopy()).rejects.toThrow(pk.PASSKEY_WORDS.cancelled);
    expect(pk.passkeyCopyState()).toBe('none');
  });

  it('a passkey that gives PRF only when asked afterwards still works', async () => {
    vi.resetModules();
    const pk = await import('./passkey-backup');
    credentials.create.mockImplementationOnce(() => Promise.resolve(credential(undefined, true)));
    expect((await pk.makePasskeyCopy()).ok).toBe(true);
    expect(credentials.get).toHaveBeenCalledTimes(1);
  });

  it('a passkey with no copy says so', async () => {
    vi.resetModules();
    const pk = await import('./passkey-backup');
    vault.clear();
    await expect(pk.fetchPasskeyCopy()).rejects.toThrow(pk.PASSKEY_WORDS.noCopy);
  });

  it('deleting removes the copy at the registry', async () => {
    vi.resetModules();
    const pk = await import('./passkey-backup');
    vault.clear();
    await pk.makePasskeyCopy();
    expect(vault.size).toBe(1);
    await pk.deletePasskeyCopy();
    expect(vault.size).toBe(0);
    expect(pk.passkeyCopyState()).toBe('none');
  });
});
