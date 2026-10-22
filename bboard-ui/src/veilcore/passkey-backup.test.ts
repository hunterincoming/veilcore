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
  const body = JSON.parse(init.body as string) as { token: string; iv?: string; ct?: string; prev?: string };
  const m = /\/vault\/([0-9a-f]{32})(\/read|\/delete)?$/.exec(url);
  const reply = (status: number, json: unknown) => new Response(JSON.stringify(json), { status });
  if (!m) return reply(404, { error: 'no route' });
  const row = vault.get(m[1]);
  const ok = row && row.hash === (await sha(body.token));
  if (!m[2]) {
    if (row && !ok) return reply(403, { error: 'this copy needs its passkey' });
    if (row && body.prev !== (await sha(`${row.iv}.${row.ct}`))) return reply(409, { error: 'changed' });
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

describe('attack pass 21 Oct: the passkey copy', () => {
  it('finding 3: making the copy does not count as the backup file', async () => {
    vi.resetModules();
    vault.clear();
    const pk = await import('./passkey-backup');
    const { setHolderKey } = await import('./holder');
    const { allKeys } = await import('./record-keys');
    const { mergeIssuerDeals } = await import('./licenses');
    setHolderKey(randomBytes(32).toString('hex'));
    mergeIssuerDeals({ 'LIC-1': { inviteId: 'LI-1', partySecret: randomBytes(32).toString('hex') } });
    const before = new Map(store);
    expect((await pk.makePasskeyCopy()).ok).toBe(true);
    // Nothing changed in this browser but the note of the copy itself: no "backed up" marks.
    const changed = [...store.keys()].filter((k) => store.get(k) !== before.get(k));
    expect(changed).toEqual(['veilcore:passkey-copy']);
    expect(allKeys().every((k) => k.backedUpAt === undefined)).toBe(true);
  });

  it('finding 2: two devices on one synced passkey merge instead of overwriting', async () => {
    vi.resetModules();
    vault.clear();
    const pk = await import('./passkey-backup');
    const { setHolderKey } = await import('./holder');
    const { mergeIssuerDeals, issuerDealsForBackup } = await import('./licenses');
    const deal = (id: string) => ({ [id]: { inviteId: `LI-${id}`, partySecret: randomBytes(32).toString('hex') } });
    setHolderKey(randomBytes(32).toString('hex'));
    expect((await pk.makePasskeyCopy()).ok).toBe(true);
    const deviceA = new Map(store);

    // Device B: restores from the copy, adds something, saves.
    store.clear();
    pk._forgetSession();
    const { restoreAny } = await import('./backup');
    const got = await pk.fetchPasskeyCopy();
    await restoreAny(got.file);
    pk.adoptRestoredCopy(got.savedAt);
    mergeIssuerDeals(deal('LIC-B'));
    await pk.updatePasskeyCopy();

    // Device A, which hasn't seen B's save, adds something else and saves: B's is merged in.
    store = deviceA;
    pk._forgetSession();
    mergeIssuerDeals(deal('LIC-A'));
    expect((await pk.updatePasskeyCopy()).ok).toBe(true);
    expect(Object.keys(issuerDealsForBackup()).sort()).toEqual(['LIC-A', 'LIC-B']);

    // A new phone gets both.
    store = new Map();
    pk._forgetSession();
    await restoreAny((await pk.fetchPasskeyCopy()).file);
    expect(Object.keys(issuerDealsForBackup()).sort()).toEqual(['LIC-A', 'LIC-B']);
  });

  it('finding 5: a passkey picked on the restore screen is not used until its restore is accepted', async () => {
    vi.resetModules();
    vault.clear();
    const pk = await import('./passkey-backup');
    const { setHolderKey } = await import('./holder');
    setHolderKey(randomBytes(32).toString('hex'));
    await pk.makePasskeyCopy();
    pk._forgetSession();
    await pk.fetchPasskeyCopy(); // picked, never adopted
    credentials.get.mockClear();
    await pk.deletePasskeyCopy();
    // It asked for this browser's own passkey rather than using the picked one.
    expect(credentials.get).toHaveBeenCalledTimes(1);
  });
});
