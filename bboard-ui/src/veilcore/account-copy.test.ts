// The account copy (account-copy.ts): one copy of a person's keys, sealed with an account key,
// opened by Face ID; saved by itself; counted as the backup only for a passkey that syncs and was
// opened again through the registry. The registry and the passkey are stand-ins
// (fixtures/account-registry.ts); the keys, the sealing, the merge, the check and the marks are
// the real code. Each test names the review finding it holds to.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { accountRegistry, fakePasskey, type AccountRegistry } from './fixtures/account-registry';

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
afterEach(() => vi.unstubAllGlobals());

const load = async () => {
  const ac = await import('./account-copy');
  const keyStore = await import('./account-key-store');
  const rk = await import('./record-keys');
  const vault = await import('./vault');
  const holder = await import('./holder');
  const backup = await import('./backup');
  const licenses = await import('./licenses');
  return { ac, keyStore, rk, vault, holder, backup, licenses };
};

/** A browser with records: a holder key, a vault key that sealed something, and record keys. */
const withRecords = (m: Awaited<ReturnType<typeof load>>, ids: string[]) => {
  m.holder.setHolderKey(randomBytes(32).toString('hex'));
  m.vault.mintVault();
  m.vault.markVaultSealed();
  for (const id of ids) m.rk.ensureKeys(id);
};

/** Switch to another device's storage (the same passkey, synced), carrying its kept keys. */
const switchTo = async (m: Awaited<ReturnType<typeof load>>, s: Map<string, string>, held?: unknown) => {
  m.ac._resetAccountForTests();
  m.keyStore.__forgetAccountKeysInMemory();
  store = s;
  if (held) await m.keyStore.keepAccountKeys(held as never);
};

describe('setting it up: "Use Face ID"', () => {
  it('a synced passkey, opened again through the registry, counts as the backup at once (B1 as decided, B2)', async () => {
    const m = await load();
    withRecords(m, ['R-1', 'R-2']);
    expect(m.vault.vaultNeedsBackup()).toBe(true);
    const out = await m.ac.setUpAccount();
    expect(out.ok).toBe(true);
    expect(out.counted).toBe(true);
    // Made once, then opened again with a fresh Face ID through the registry's copy of the slot.
    expect(pk.asks.filter((a) => a.publicKey.rp).length).toBe(1);
    expect(pk.asks.filter((a) => !a.publicKey.rp).length).toBe(1);
    // The gate opens: everything the copy holds is marked, with the copy as the source (S1).
    expect(m.vault.vaultNeedsBackup()).toBe(false);
    expect(m.vault.vaultBackedUpVia()).toBe('copy');
    expect(m.rk.allKeys().every((k) => k.backedUpVia === 'copy' && k.backedUpAt)).toBe(true);
    const state = m.ac.accountState();
    expect(state.kind === 'saved' && state.counted).toBe(true);
    if (state.kind === 'saved') {
      expect(state.slots).toHaveLength(1);
      expect(state.slots[0]).toMatchObject({ kind: 'passkey', synced: true });
      expect(state.slots[0].verifiedAt).toBeTruthy();
    }
  });

  it('the registry holds only locked boxes, padded to a size bucket (S10), and token hashes', async () => {
    const m = await load();
    withRecords(m, ['RECORD-ID-THAT-NEVER-LEAVES-UNLOCKED']);
    await m.ac.setUpAccount();
    const holder = m.holder.holderKeyIfAny()!;
    const vaultKey = m.vault.vaultKeyIfAny()!;
    const everything = JSON.stringify([...reg.copies.values(), ...reg.slots.values(), ...reg.sent]);
    expect(everything).not.toContain(holder);
    expect(everything).not.toContain(vaultKey);
    expect(everything).not.toContain('RECORD-ID-THAT-NEVER-LEAVES-UNLOCKED');
    const [copy] = [...reg.copies.values()];
    // 16 KiB of padded plaintext plus the 16-byte tag.
    expect(Buffer.from(copy.ct, 'base64url').length).toBe(16 * 1024 + 16);
  });

  it('a passkey that stays on this device (BS=0) saves the copy but doesn’t open the gate', async () => {
    pk.state.synced = false;
    const m = await load();
    withRecords(m, ['R-1']);
    const out = await m.ac.setUpAccount();
    expect(out.ok).toBe(true);
    expect(out.counted).toBe(false);
    expect(reg.copies.size).toBe(1);
    expect(m.vault.vaultNeedsBackup()).toBe(true);
    expect(m.rk.allKeys().every((k) => k.backedUpAt === undefined)).toBe(true);
  });

  it('B2: a passkey whose PRF changes after creation is caught, and nothing is marked', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    pk.state.driftAfterCreate = true;
    await expect(m.ac.setUpAccount()).rejects.toThrow();
    expect(m.vault.vaultNeedsBackup()).toBe(true);
    expect(m.rk.allKeys().every((k) => k.backedUpAt === undefined)).toBe(true);
  });

  it('S5: the keys kept here can be used and never read back; "start over" forgets them', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    const held = (await m.keyStore.heldAccountKeys())!;
    expect(held.sealKey.extractable).toBe(false);
    expect(held.macKey.extractable).toBe(false);
    expect(held.sealKey.usages.sort()).toEqual(['decrypt', 'encrypt']);
    expect(held.macKey.usages).toEqual(['sign']);
    await expect(crypto.subtle.exportKey('raw', held.sealKey)).rejects.toThrow();
    // Nothing that opens the copy or a slot is in localStorage.
    for (const v of store.values()) expect(v).not.toMatch(/"kek"|"ak"/);
    const extractable = await crypto.subtle.importKey('raw', randomBytes(32), 'AES-GCM', true, ['encrypt']);
    await expect(m.keyStore.keepAccountKeys({ ...held, sealKey: extractable })).rejects.toThrow(/extractable/);
    await m.ac.forgetAccountOnThisDevice();
    expect(await m.keyStore.heldAccountKeys()).toBeUndefined();
    expect(m.ac.accountState().kind).not.toBe('saved');
  });

  it('N4: a slot’s sealed account key opens only in its own slot, copy and kind', async () => {
    const m = await load();
    const ak = randomBytes(32);
    const slot = m.ac.passkeySlotKeys(randomBytes(32), randomBytes(16));
    const box = await m.ac.wrapAccountKey(ak, slot, 'c'.repeat(32), 'passkey');
    expect(Buffer.from(await m.ac.unwrapAccountKey(box, slot, 'c'.repeat(32), 'passkey'))).toEqual(ak);
    await expect(m.ac.unwrapAccountKey(box, slot, 'd'.repeat(32), 'passkey')).rejects.toThrow();
    await expect(m.ac.unwrapAccountKey(box, slot, 'c'.repeat(32), 'recovery')).rejects.toThrow();
    await expect(
      m.ac.unwrapAccountKey(box, { ...slot, slotId: 'e'.repeat(32) }, 'c'.repeat(32), 'passkey'),
    ).rejects.toThrow();
  });
});

describe('B3: documents kept on this device only', () => {
  it('what they say is never in the copy, they never get the copy’s mark, and their key stamp waits for the file', async () => {
    const m = await load();
    withRecords(m, ['R-1', 'DOC-1']);
    const outbox = await import('./outbox');
    const spy = vi.spyOn(outbox, 'deviceOnlyRecords').mockReturnValue({ 'DOC-1': { id: 'DOC-1' } });
    expect(m.backup.accountContents().recordData).toBeUndefined();
    const out = await m.ac.setUpAccount();
    expect(out.counted).toBe(true);
    expect(m.rk.keysFor('R-1')?.backedUpVia).toBe('copy');
    expect(m.rk.keysFor('DOC-1')?.backedUpAt).toBeUndefined();
    // The key stamp's own rule, for a document that somehow got a mark anyway.
    const { keyStampAllowed } = await import('../components/chain/stamp-gate');
    const doc = { id: 'DOC-1', deviceOnly: true };
    expect(keyStampAllowed({ backedUpAt: 1, backedUpVia: 'copy' }, { deviceOnly: true, inCheckedFile: false })).toBe(
      false,
    );
    expect(keyStampAllowed({ backedUpAt: 1 }, { deviceOnly: true, inCheckedFile: false })).toBe(false);
    expect(keyStampAllowed({ backedUpAt: 1 }, { deviceOnly: true, inCheckedFile: true })).toBe(true);
    expect(keyStampAllowed({ backedUpAt: 1, backedUpVia: 'copy' }, { deviceOnly: false, inCheckedFile: false })).toBe(
      true,
    );
    void doc;
    spy.mockRestore();
  });
});

describe('S1 and S4: the marks go when the copy or its way in does', () => {
  it('deleting the copy clears every mark it made, and leaves a file’s', async () => {
    const m = await load();
    withRecords(m, ['R-1', 'R-2']);
    await m.ac.setUpAccount();
    // R-2 is also in a checked file: that mark is the file's and stays.
    m.rk.markBackedUp(['R-2'], Date.now());
    await m.ac.deleteAccountCopy();
    expect(reg.copies.size).toBe(0);
    expect(reg.slots.size).toBe(0);
    expect(m.vault.vaultNeedsBackup()).toBe(true);
    expect(m.rk.keysFor('R-1')?.backedUpAt).toBeUndefined();
    expect(m.rk.keysFor('R-2')?.backedUpAt).toBeDefined();
    expect(m.ac.accountState().kind).toBe('none');
  });

  it('a copy the registry dropped (404 on the check) clears the marks and says so', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    reg.copies.clear();
    await m.ac.checkAccount();
    expect(m.vault.vaultNeedsBackup()).toBe(true);
    const s = m.ac.accountState();
    expect(s.kind === 'saved' && s.problem).toBe('missing');
  });

  it('"Save again" after the registry dropped the copy uses the same passkey, and counts again', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    reg.copies.clear();
    reg.slots.clear();
    await m.ac.checkAccount();
    expect(m.vault.vaultNeedsBackup()).toBe(true);
    const made = pk.asks.filter((a) => a.publicKey.rp).length;
    const out = await m.ac.setUpAccount();
    expect(out.counted).toBe(true);
    expect(pk.asks.filter((a) => a.publicKey.rp).length).toBe(made);
    expect(reg.copies.size).toBe(1);
    expect(m.vault.vaultNeedsBackup()).toBe(false);
    const s = m.ac.accountState();
    expect(s.kind === 'saved' && s.problem).toBeUndefined();
  });

  it('a way in the registry dropped clears the marks; one it added is shown, and never counts', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    const [slotId, row] = [...reg.slots.entries()][0];
    reg.slots.delete(slotId);
    await m.ac.checkAccount();
    expect(m.vault.vaultNeedsBackup()).toBe(true);
    let s = m.ac.accountState();
    expect(s.kind === 'saved' && s.problem).toBe('slot-missing');
    // Put back, plus one the person never added: shown, not counted.
    reg.slots.set(slotId, row);
    reg.slots.set('f'.repeat(32), { ...row });
    await m.ac.checkAccount();
    s = m.ac.accountState();
    expect(s.kind === 'saved' && s.unknownSlots).toEqual(['f'.repeat(32)]);
    expect(s.kind === 'saved' && s.problem).toBeUndefined();
  });

  it('the gate is read from the sealed list, not from what the registry says (S4)', async () => {
    pk.state.synced = false;
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    // A registry that says "it's a synced passkey" has nowhere to say it: the list is sealed.
    const s = m.ac.accountState();
    expect(s.kind === 'saved' && s.counted).toBe(false);
    expect(
      m.ac.countsAsBackup({
        kcv: '',
        slots: [{ slotId: 'a'.repeat(32), kind: 'passkey', createdAt: '', synced: true }],
        devices: {},
        forgotten: {},
      }),
    ).toBe(false);
  });
});

describe('two devices on one synced passkey (the reviewed machinery, unchanged)', () => {
  it('a new device gets everything back, sees the date first, and keeps saving; neither device loses anything', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    m.licenses.mergeIssuerDeals({ 'LIC-A0': { inviteId: 'LI-A0', partySecret: randomBytes(32).toString('hex') } });
    await m.ac.setUpAccount();
    const deviceA = store;
    const heldA = await m.keyStore.heldAccountKeys();

    // Device B: nothing here; Face ID finds the copy and shows its date before anything changes.
    await switchTo(m, new Map());
    const found = await m.ac.findAccountCopy();
    expect(found.savedAt).toBeTruthy();
    expect(m.holder.holderKeyIfAny()).toBeNull();
    await m.backup.restoreAny(found.file, undefined, found.restore);
    const adopted = await m.ac.adoptFound();
    expect(adopted?.ok).toBe(true);
    expect(adopted?.counted).toBe(true);
    expect(m.rk.keysFor('R-1')).toBeDefined();
    expect(m.vault.vaultNeedsBackup()).toBe(false);
    m.rk.ensureKeys('R-B');
    await m.ac.syncNow();
    const deviceB = store;

    // Device A, which hasn't seen B's save, adds something and saves: B's is merged in.
    await switchTo(m, deviceA, heldA);
    m.rk.ensureKeys('R-A');
    const out = await m.ac.syncNow();
    expect(out?.ok).toBe(true);
    expect(
      m.rk
        .allKeys()
        .map((k) => k.recordId)
        .sort(),
    ).toEqual(['R-1', 'R-A', 'R-B']);
    // Both devices are in the sealed list.
    const s = m.ac.accountState();
    expect(s.kind === 'saved' && s.devices.length).toBe(2);
    void deviceB;
  });

  it('S13: a record deleted on one device isn’t brought back on a new one', async () => {
    const m = await load();
    withRecords(m, ['R-1', 'R-2']);
    await m.ac.setUpAccount();
    m.rk.forgetKeys('R-2');
    await m.ac.syncNow();
    await switchTo(m, new Map());
    const found = await m.ac.findAccountCopy();
    await m.backup.restoreAny(found.file, undefined, found.restore);
    expect(m.rk.allKeys().map((k) => k.recordId)).toEqual(['R-1']);
  });

  it('attack pass on step 2, finding 1: a record deleted elsewhere is not counted here; one restored from a file comes back', async () => {
    const m = await load();
    withRecords(m, ['R-1', 'R-2']);
    await m.ac.setUpAccount();
    const deviceA = store;
    const heldA = await m.keyStore.heldAccountKeys();
    // Device B deletes R-2.
    await switchTo(m, new Map());
    const found = await m.ac.findAccountCopy();
    await m.backup.restoreAny(found.file, undefined, found.restore);
    await m.ac.adoptFound();
    m.rk.forgetKeys('R-2');
    await m.ac.syncNow({ force: true });
    // Device A still holds R-2: its next save takes the deletion in, and R-2 is no longer "in" the copy.
    const deviceB = store;
    const heldB = await m.keyStore.heldAccountKeys();
    await switchTo(m, deviceA, heldA);
    m.rk.ensureKeys('R-3');
    await m.ac.syncNow();
    expect(m.rk.keysFor('R-2')?.backedUpAt).toBeUndefined();
    expect(m.rk.keysFor('R-1')?.backedUpVia).toBe('copy');
    // B restores R-2 from a file: the later restore wins, and a new device gets it back.
    const fileWithR2 = JSON.stringify(m.backup.backupContents());
    await switchTo(m, deviceB, heldB);
    await m.ac.checkAccount();
    await m.backup.restoreAny(new File([fileWithR2], 'f.json'), undefined, { skipForgotten: false });
    expect(m.rk.keysFor('R-2')).toBeDefined();
    await m.ac.syncNow({ force: true });
    await switchTo(m, new Map());
    const again = await m.ac.findAccountCopy();
    await m.backup.restoreAny(again.file, undefined, again.restore);
    expect(
      m.rk
        .allKeys()
        .map((k) => k.recordId)
        .sort(),
    ).toEqual(['R-1', 'R-2', 'R-3']);
  });

  it('a registry that shows back an older copy right after a save is refused as older, not as damaged', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    const [id] = [...reg.copies.keys()];
    const old = { ...reg.copies.get(id)! };
    const inner = reg.fetch;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const res = await inner(input, init);
      if (/account-copy\/[0-9a-f]{32}\/read$/.test(url)) {
        const real = (await res.json()) as Record<string, unknown>;
        return new Response(JSON.stringify({ ...real, iv: old.iv, ct: old.ct }), { status: 200 });
      }
      return res;
    });
    m.rk.ensureKeys('R-2');
    const out = await m.ac.syncNow();
    expect(out?.ok).toBe(false);
    const st = m.ac.accountState();
    expect(st.kind === 'saved' && st.problem).toBe('older');
  });

  it('finding B: a registry that puts back an older copy is refused, and says so', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    const [id] = [...reg.copies.keys()];
    const old = { ...reg.copies.get(id)! };
    m.rk.ensureKeys('R-9');
    await m.ac.syncNow();
    reg.copies.set(id, old);
    m.rk.ensureKeys('R-10');
    const out = await m.ac.syncNow();
    expect(out?.ok).toBe(false);
    const s = m.ac.accountState();
    expect(s.kind === 'saved' && s.problem).toBe('older');
  });

  it('finding C: a registry that never shows back what was saved can’t keep the page saving', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    const inner = reg.fetch;
    let puts = 0;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (init?.method === 'PUT') {
        puts++;
        return inner(input, init);
      }
      if (/\/read$/.test(url) && /account-copy/.test(url)) {
        const real = (await (await inner(input, init)).json()) as Record<string, unknown>;
        return new Response(JSON.stringify({ ...real, iv: 'A'.repeat(16) }), { status: 200 });
      }
      return inner(input, init);
    });
    m.rk.ensureKeys('R-2');
    const out = await m.ac.syncNow();
    expect(out?.ok).toBe(false);
    expect(puts).toBeLessThanOrEqual(4);
  });

  it('S17: a device that hasn’t saved for two weeks, while this one has, is named', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    const raw = JSON.parse(store.get('veilcore.account-copy.v1')!) as {
      manifest: { devices: Record<string, unknown> };
    };
    raw.manifest.devices['0123456789abcdef'] = {
      seq: 1,
      at: new Date(Date.now() - 20 * 86_400_000).toISOString(),
      kind: 'android',
      deviceOnly: 2,
    };
    store.set('veilcore.account-copy.v1', JSON.stringify(raw));
    const s = m.ac.accountState();
    expect(s.kind === 'saved' && s.staleDevices.map((d) => d.kind)).toEqual(['android']);
    m.ac.forgetDevice('0123456789abcdef');
    const t = m.ac.accountState();
    expect(t.kind === 'saved' && t.staleDevices).toEqual([]);
  });

  it('a new device is told about documents kept only on the other device', async () => {
    const m = await load();
    withRecords(m, ['R-1', 'DOC-1', 'DOC-2']);
    const outbox = await import('./outbox');
    const spy = vi.spyOn(outbox, 'deviceOnlyRecords').mockReturnValue({ 'DOC-1': {}, 'DOC-2': {} });
    await m.ac.setUpAccount();
    spy.mockRestore();
    await switchTo(m, new Map());
    const found = await m.ac.findAccountCopy();
    expect(found.elsewhere).toEqual([{ kind: 'iphone', count: 2 }]);
  });
});

describe('moving a passkey copy made before the account copy (N3)', () => {
  const legacyCopy = async (m: Awaited<ReturnType<typeof load>>) => {
    const pkb = await import('./passkey-backup');
    const answer = await pkb.askPasskey();
    const keys = pkb.passkeyKeys(answer.prf, answer.rawId);
    const box = await pkb.sealCopy(m.backup.backupContents(), keys, 5);
    reg.legacy.set(keys.id, {
      hash: (await import('node:crypto')).createHash('sha256').update(keys.token).digest('hex'),
      ...box,
    });
    pk.asks.length = 0;
    return { keys, credentialId: Buffer.from(answer.rawId).toString('base64url') };
  };

  it('on the device that made it: one Face ID moves it over, the old copy is deleted, the gate opens', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    const { keys, credentialId } = await legacyCopy(m);
    store.set(
      'veilcore:passkey-copy',
      JSON.stringify({
        id: keys.id,
        credentialId,
        sameAs: '',
        savedAt: new Date().toISOString(),
        prev: 'none',
        seq: 5,
      }),
    );
    expect(m.ac.accountState().kind).toBe('older');
    const out = await m.ac.unlockHere();
    expect(out.ok).toBe(true);
    expect(out.counted).toBe(true);
    // The same passkey: no new passkey made.
    expect(pk.asks.every((a) => !a.publicKey.rp)).toBe(true);
    expect(reg.legacy.size).toBe(0);
    expect(store.has('veilcore:passkey-copy')).toBe(false);
    expect(reg.copies.size).toBe(1);
    expect(m.vault.vaultNeedsBackup()).toBe(false);
  });

  it('on a new device: the old copy is found, restored after its date is shown, then moved over', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await legacyCopy(m);
    await switchTo(m, new Map());
    const found = await m.ac.findAccountCopy();
    await m.backup.restoreAny(found.file, undefined, found.restore);
    expect(m.rk.keysFor('R-1')).toBeDefined();
    const out = await m.ac.adoptFound();
    expect(out?.ok).toBe(true);
    expect(reg.legacy.size).toBe(0);
    expect(reg.copies.size).toBe(1);
  });
});

describe('S10: the size buckets', () => {
  it('powers of two from 16 KiB', async () => {
    const { copyBucket } = await import('./account-copy');
    expect(copyBucket(10)).toBe(16 * 1024);
    expect(copyBucket(16 * 1024)).toBe(16 * 1024);
    expect(copyBucket(16 * 1024 + 1)).toBe(32 * 1024);
    expect(copyBucket(700_000)).toBe(1024 * 1024);
  });
});
