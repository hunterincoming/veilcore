// The recovery sheet (easy mode step 3): a code made on the device that opens the account copy
// (recovery-code.ts, account-copy.ts). The registry and the passkey are stand-ins
// (fixtures/account-registry.ts); the code, its keys, the sealing, the checks and the marks are the
// real code. Each test names the rule it holds to.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { accountRegistry, fakePasskey, type AccountRegistry } from './fixtures/account-registry';
import { CROCKFORD, CODE_LENGTH, groupCode, newRecoveryCode, parseRecoveryCode, SHEET_WORDS } from './recovery-code';

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
  const ac = await import('./account-copy');
  const keyStore = await import('./account-key-store');
  const rk = await import('./record-keys');
  const vault = await import('./vault');
  const holder = await import('./holder');
  const backup = await import('./backup');
  return { ac, keyStore, rk, vault, holder, backup };
};

const withRecords = (m: Awaited<ReturnType<typeof load>>, ids: string[]) => {
  m.holder.setHolderKey(randomBytes(32).toString('hex'));
  m.vault.mintVault();
  m.vault.markVaultSealed();
  for (const id of ids) m.rk.ensureKeys(id);
};

/** A new device: empty storage, no kept keys. */
const newDevice = (m: Awaited<ReturnType<typeof load>>) => {
  m.ac._resetAccountForTests();
  m.keyStore.__forgetAccountKeysInMemory();
  store = new Map();
};

const saved = (m: Awaited<ReturnType<typeof load>>) => {
  const s = m.ac.accountState();
  if (s.kind !== 'saved') throw new Error(`not saved: ${s.kind}`);
  return s;
};

const problemOf = async (p: Promise<unknown>): Promise<string> => {
  try {
    await p;
  } catch (e) {
    return (e as Error).message;
  }
  return 'no problem';
};

describe('the code', () => {
  it('is 28 symbols of Crockford base32 (135 random bits and a check symbol), printed in seven groups of four', () => {
    const codes = Array.from({ length: 200 }, newRecoveryCode);
    for (const c of codes) {
      expect(c).toHaveLength(CODE_LENGTH);
      expect([...c].every((x) => CROCKFORD.includes(x))).toBe(true);
      expect(groupCode(c)).toMatch(/^([0-9A-Z]{4}-){6}[0-9A-Z]{4}$/);
      expect(parseRecoveryCode(groupCode(c))).toEqual({ ok: true, code: c });
    }
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('is read back as people write it: lower case, spaces, no dashes, O for 0, I or L for 1', () => {
    const c = newRecoveryCode();
    const messy = groupCode(c).toLowerCase().replace(/-/g, ' ').replace(/0/g, 'o').replace(/1/g, 'l');
    expect(parseRecoveryCode(` ${messy} `)).toEqual({ ok: true, code: c });
  });

  it('catches every single wrong character, and a code too short, on the device', () => {
    const c = newRecoveryCode();
    for (let i = 0; i < c.length; i++)
      for (const x of CROCKFORD) {
        if (x === c[i]) continue;
        const typo = c.slice(0, i) + x + c.slice(i + 1);
        expect(parseRecoveryCode(typo)).toEqual({ ok: false, why: SHEET_WORDS.typo });
      }
    expect(parseRecoveryCode(c.slice(1))).toEqual({ ok: false, why: SHEET_WORDS.length });
    expect(parseRecoveryCode(`${c.slice(0, 27)}U`)).toEqual({ ok: false, why: SHEET_WORDS.typo });
  });
});

describe('making and checking the sheet', () => {
  it('is made with one Face ID, never sent or kept, and counts once its whole code is typed back through the registry (B2)', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    const asksBefore = pk.asks.length;
    const sheet = await m.ac.makeRecoverySheet();
    expect(pk.asks.length).toBe(asksBefore + 1);
    // At the registry: a slot of its own kind, its token's hash, and AK sealed for it. Never the code.
    expect([...reg.slots.values()].map((x) => x.kind).sort()).toEqual(['passkey', 'recovery']);
    const everything = JSON.stringify([...reg.sent, ...store.values()]);
    expect(everything).not.toContain(sheet.code);
    expect(everything).not.toContain(groupCode(sheet.code));
    expect(saved(m).sheet).toMatchObject({ checked: false });
    expect(sheet.tag).toMatch(/^[0-9A-Z]{4}$/);

    await m.ac.confirmRecoverySheet(groupCode(sheet.code).toLowerCase(), sheet.slotId);
    const s = saved(m);
    expect(s.sheet).toMatchObject({ checked: true });
    const slot = s.slots.find((x) => x.kind === 'recovery')!;
    expect(slot.verifiedAt).toBeTruthy();
    // The fingerprint of the registry's sealed AK for it is kept inside the copy, to compare.
    expect(slot.wrap).toMatch(/^[0-9a-f]{64}$/);
  });

  it('a passkey that stays on this device (BS=0) counts only once a sheet is checked (the step 2 hook)', async () => {
    pk.state.synced = false;
    const m = await load();
    withRecords(m, ['R-1']);
    const out = await m.ac.setUpAccount();
    expect(out.counted).toBe(false);
    expect(m.vault.vaultNeedsBackup()).toBe(true);
    const sheet = await m.ac.makeRecoverySheet();
    // Made but not checked: still not counted.
    expect(saved(m).counted).toBe(false);
    await m.ac.confirmRecoverySheet(sheet.code, sheet.slotId);
    expect(saved(m).counted).toBe(true);
    expect(m.vault.vaultNeedsBackup()).toBe(false);
    expect(m.rk.allKeys().every((k) => k.backedUpVia === 'copy')).toBe(true);
  });

  it('a wrong code is refused: a typo on the device, an unknown code by the registry, an older sheet named as such', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    const first = await m.ac.makeRecoverySheet();
    await m.ac.confirmRecoverySheet(first.code, first.slotId);
    const second = await m.ac.makeRecoverySheet();
    const typo = `${first.code.slice(0, 5)}${first.code[5] === 'A' ? 'B' : 'A'}${first.code.slice(6)}`;
    expect(await problemOf(m.ac.confirmRecoverySheet(typo, second.slotId))).toBe(SHEET_WORDS.typo);
    expect(await problemOf(m.ac.confirmRecoverySheet(newRecoveryCode(), second.slotId))).toBe(SHEET_WORDS.wrong);
    expect(await problemOf(m.ac.confirmRecoverySheet(newRecoveryCode()))).toBe(SHEET_WORDS.wrong);
    expect(await problemOf(m.ac.confirmRecoverySheet(first.code, second.slotId))).toBe(SHEET_WORDS.notThisSheet);
    // The older sheet still works until the new one is checked; then it stops.
    expect(saved(m).counted).toBe(true);
    await m.ac.confirmRecoverySheet(second.code, second.slotId);
    expect([...reg.slots.values()].filter((x) => x.kind === 'recovery')).toHaveLength(1);
    expect(saved(m).slots.filter((x) => x.kind === 'recovery')).toHaveLength(1);
    expect(await problemOf(m.ac.confirmRecoverySheet(first.code))).toBe(SHEET_WORDS.wrong);
  });

  it('a sheet slot whose sealed key the registry changed counts as gone at the next check', async () => {
    pk.state.synced = false;
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    const sheet = await m.ac.makeRecoverySheet();
    await m.ac.confirmRecoverySheet(sheet.code, sheet.slotId);
    expect(saved(m).counted).toBe(true);
    const row = reg.slots.get(sheet.slotId)!;
    reg.slots.set(sheet.slotId, { ...row, ct: randomBytes(48).toString('base64url') });
    await m.ac.checkAccount();
    const s = saved(m);
    expect(s.problem).toBe('slot-missing');
    expect(s.counted).toBe(false);
    expect(m.vault.vaultNeedsBackup()).toBe(true);
  });
});

describe('a new device with the sheet', () => {
  it('opens the records with the code, shows the date first, keeps saving, and adds Face ID to the same records', async () => {
    const m = await load();
    withRecords(m, ['R-1', 'R-2']);
    await m.ac.setUpAccount();
    const sheet = await m.ac.makeRecoverySheet();
    await m.ac.confirmRecoverySheet(sheet.code, sheet.slotId);
    const copies = reg.copies.size;

    newDevice(m);
    expect(await problemOf(m.ac.findWithSheet(newRecoveryCode()))).toBe(SHEET_WORDS.wrong);
    const found = await m.ac.findWithSheet(groupCode(sheet.code));
    expect(found.savedAt).toBeTruthy();
    // Nothing changed here before the person accepts it.
    expect(m.rk.allKeys()).toHaveLength(0);
    await m.backup.restoreAny(found.file, undefined, found.restore);
    const adopted = await m.ac.adoptFound();
    expect(adopted?.ok).toBe(true);
    expect(
      m.rk
        .allKeys()
        .map((k) => k.recordId)
        .sort(),
    ).toEqual(['R-1', 'R-2']);
    let s = saved(m);
    expect(s.faceIdHere).toBe(false);
    expect(m.ac.recoveredHere()).toBe(true);
    // Saving works with the keys the sheet opened.
    m.rk.ensureKeys('R-3');
    expect((await m.ac.syncNow())?.ok).toBe(true);

    // "Use Face ID on this device": a passkey added to these same records, then opened again (B2).
    const out = await m.ac.addFaceIdHere();
    expect(out.ok).toBe(true);
    expect(reg.copies.size).toBe(copies);
    s = saved(m);
    expect(s.faceIdHere).toBe(true);
    expect(m.ac.recoveredHere()).toBe(false);
  });

  it('without the account key still in hand, adding Face ID asks for the code again', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    const sheet = await m.ac.makeRecoverySheet();
    await m.ac.confirmRecoverySheet(sheet.code, sheet.slotId);
    newDevice(m);
    const found = await m.ac.findWithSheet(sheet.code);
    await m.backup.restoreAny(found.file, undefined, found.restore);
    await m.ac.adoptFound();
    m.ac._resetAccountForTests();
    expect(await problemOf(m.ac.setUpAccount())).toBe(SHEET_WORDS.needsSheet);
    const out = await m.ac.addFaceIdHere(sheet.code);
    expect(out.ok).toBe(true);
    expect(saved(m).faceIdHere).toBe(true);
  });
});

describe('New-8: "Save again" decides from the sealed list the registry returns now', () => {
  it('a passkey way in gone at the registry, with a sheet still there: the copy is kept and the sheet sets Face ID up again', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    const sheet = await m.ac.makeRecoverySheet();
    await m.ac.confirmRecoverySheet(sheet.code, sheet.slotId);
    const passkeySlot = [...reg.slots.entries()].find(([, x]) => x.kind === 'passkey')![0];
    reg.slots.delete(passkeySlot);
    await m.ac.checkAccount();
    expect(saved(m).problem).toBe('slot-missing');
    const [copyId] = [...reg.copies.keys()];
    expect(await problemOf(m.ac.setUpAccount())).toBe(SHEET_WORDS.needsSheet);
    // Never deleted, never a second copy.
    expect([...reg.copies.keys()]).toEqual([copyId]);
    const out = await m.ac.addFaceIdHere(sheet.code);
    expect(out.ok).toBe(true);
    expect([...reg.copies.keys()]).toEqual([copyId]);
    expect(reg.slots.has(passkeySlot)).toBe(true);
    const s = saved(m);
    expect(s.problem).toBeUndefined();
    expect(s.counted).toBe(true);
  });
});

describe('reminders and the 90-day re-verify', () => {
  it('day 7 and day 30 without a checked sheet: one quiet line each, until dismissed; none once a sheet is checked', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    const start = Date.now();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(start + 3 * 86_400_000);
    expect(saved(m).sheetReminder).toBeUndefined();
    vi.setSystemTime(start + 8 * 86_400_000);
    expect(saved(m).sheetReminder).toBe(7);
    m.ac.dismissSheetReminder(7);
    expect(saved(m).sheetReminder).toBeUndefined();
    vi.setSystemTime(start + 31 * 86_400_000);
    expect(saved(m).sheetReminder).toBe(30);
    m.ac.dismissSheetReminder(30);
    expect(saved(m).sheetReminder).toBeUndefined();
    vi.useRealTimers();
    const sheet = await m.ac.makeRecoverySheet();
    await m.ac.confirmRecoverySheet(sheet.code, sheet.slotId);
    store.delete('veilcore.account.sheet-reminder.v1');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(start + 31 * 86_400_000);
    expect(saved(m).sheetReminder).toBeUndefined();
  });

  it('this device’s passkey not opened again for 90 days is asked once more; one Face ID clears it', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    expect(saved(m).reverify).toBe(false);
    const start = Date.now();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(start + 91 * 86_400_000);
    expect(saved(m).reverify).toBe(true);
    await m.ac.unlockHere();
    expect(saved(m).reverify).toBe(false);
  });
});

describe('the sealed list across devices', () => {
  it('a sheet retired on one device is never brought back by a merge from another', () => {
    return load().then(({ ac }) => {
      const base = {
        kcv: 'k',
        devices: {},
        forgotten: {},
        slots: [
          { slotId: 'a'.repeat(32), kind: 'passkey' as const, createdAt: '2026-11-01' },
          { slotId: 'b'.repeat(32), kind: 'recovery' as const, createdAt: '2026-11-01', verifiedAt: '2026-11-01' },
        ],
      };
      const mine = {
        ...base,
        slots: [base.slots[0], { slotId: 'c'.repeat(32), kind: 'recovery' as const, createdAt: '2026-11-02' }],
        retired: { ['b'.repeat(32)]: '2026-11-02' },
      };
      const merged = ac.mergeManifests(mine, base);
      expect(merged.slots.map((x) => x.slotId).sort()).toEqual(['a'.repeat(32), 'c'.repeat(32)]);
      expect(
        ac
          .mergeManifests(base, mine)
          .slots.map((x) => x.slotId)
          .sort(),
      ).toEqual(['a'.repeat(32), 'c'.repeat(32)]);
    });
  });

  it('the counting rule: a synced passkey alone; a device-bound one only with a checked sheet; never a sheet alone unchecked', async () => {
    const { ac } = await load();
    const m = (slots: unknown[]) => ({ kcv: 'k', devices: {}, forgotten: {}, slots }) as never;
    const pkS = { slotId: 'a'.repeat(32), kind: 'passkey', createdAt: 'x', synced: true, verifiedAt: 'x' };
    const pkB = { ...pkS, synced: false };
    const sheetOk = { slotId: 'b'.repeat(32), kind: 'recovery', createdAt: 'x', verifiedAt: 'x' };
    const sheetNo = { slotId: 'b'.repeat(32), kind: 'recovery', createdAt: 'x' };
    expect(ac.countsAsBackup(m([pkS]))).toBe(true);
    expect(ac.countsAsBackup(m([pkB]))).toBe(false);
    expect(ac.countsAsBackup(m([pkB, sheetNo]))).toBe(false);
    expect(ac.countsAsBackup(m([pkB, sheetOk]))).toBe(true);
    expect(ac.countsAsBackup(m([{ ...pkB, verifiedAt: undefined }, sheetOk]))).toBe(false);
  });
});

describe('the security pass on step 3', () => {
  it('S-1: a sheet another device checked since is never taken for an unchecked one when a new sheet is made', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    const deviceA = store;
    const heldA = await m.keyStore.heldAccountKeys();
    // Device B (the same synced passkey) makes a sheet; A merges the copy that lists it unchecked.
    m.ac._resetAccountForTests();
    m.keyStore.__forgetAccountKeysInMemory();
    store = new Map(deviceA);
    await m.keyStore.keepAccountKeys(heldA!);
    const b = store;
    const sheet = await m.ac.makeRecoverySheet();
    m.ac._resetAccountForTests();
    store = deviceA;
    await m.ac.checkAccount();
    // B checks it; A doesn't hear.
    m.ac._resetAccountForTests();
    store = b;
    await m.ac.confirmRecoverySheet(sheet.code, sheet.slotId);
    // A makes a new sheet: B's checked sheet stays at the registry and keeps working.
    m.ac._resetAccountForTests();
    store = deviceA;
    await m.ac.makeRecoverySheet();
    expect(reg.slots.has(sheet.slotId)).toBe(true);
    expect(await problemOf(m.ac.confirmRecoverySheet(sheet.code))).toBe('no problem');
  });

  it('S-2: checking a sheet against an older copy than this device has seen is refused, and changes nothing', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    const sheet = await m.ac.makeRecoverySheet();
    const [id] = [...reg.copies.keys()];
    const older = { ...reg.copies.get(id)! };
    m.rk.ensureKeys('R-2');
    await m.ac.syncNow({ force: true });
    reg.copies.set(id, older);
    const slotsBefore = [...reg.slots.keys()].sort();
    expect(await problemOf(m.ac.confirmRecoverySheet(sheet.code, sheet.slotId))).toMatch(/older/i);
    expect([...reg.slots.keys()].sort()).toEqual(slotsBefore);
    expect(saved(m).sheet?.checked).toBe(false);
  });

  it('S-3: "Save again" never starts a second copy when the registry can’t be read; "start again without the sheet" replaces it on purpose', async () => {
    const m = await load();
    withRecords(m, ['R-1']);
    await m.ac.setUpAccount();
    const sheet = await m.ac.makeRecoverySheet();
    await m.ac.confirmRecoverySheet(sheet.code, sheet.slotId);
    const passkeySlot = [...reg.slots.entries()].find(([, x]) => x.kind === 'passkey')![0];
    reg.slots.delete(passkeySlot);
    const [copyId] = [...reg.copies.keys()];
    // The registry's copy can't be read just now.
    const inner = reg.fetch;
    vi.stubGlobal('fetch', async (u: string, init?: RequestInit) =>
      /\/account-copy\/[0-9a-f]{32}\/read$/.test(u) ? new Response('{}', { status: 503 }) : inner(u, init),
    );
    expect(await problemOf(m.ac.setUpAccount())).not.toBe('no problem');
    expect([...reg.copies.keys()]).toEqual([copyId]);
    vi.stubGlobal('fetch', inner);
    expect(await problemOf(m.ac.setUpAccount())).toBe(SHEET_WORDS.needsSheet);
    const out = await m.ac.setUpAccount({ withoutSheet: true });
    expect(out.ok).toBe(true);
    expect(reg.copies.has(copyId)).toBe(false);
    expect(reg.copies.size).toBe(1);
    expect(await problemOf(m.ac.findWithSheet(sheet.code))).toBe(SHEET_WORDS.wrong);
  });

  it('a registry that lists wraps but leaves one out of a slot with a recorded wrap: that way in counts as changed', async () => {
    const { ac } = await load();
    const m = {
      kcv: 'k',
      devices: {},
      forgotten: {},
      slots: [
        { slotId: 'a'.repeat(32), kind: 'passkey' as const, createdAt: 'x', wrap: 'f'.repeat(64) },
        { slotId: 'b'.repeat(32), kind: 'recovery' as const, createdAt: 'x', wrap: 'e'.repeat(64) },
      ],
    };
    const present = ac.presentSlots(m, [{ slotId: 'a'.repeat(32), wrap: 'f'.repeat(64) }, { slotId: 'b'.repeat(32) }]);
    expect(present.map((x) => x.slotId)).toEqual(['a'.repeat(32)]);
    // An older registry with no wraps at all: not held against it.
    expect(ac.presentSlots(m, [{ slotId: 'a'.repeat(32) }, { slotId: 'b'.repeat(32) }])).toHaveLength(2);
  });
});
