// "No recovery secret kept here" (record-keys.ts NO_RECOVERY_SECRET, 64 zeros; recovery plan v2,
// step 2). A later step stops keeping a record's recovery secret in this browser; this one makes
// every reader take the placeholder first, so that step can't lose anything:
//   - an OLDER build (the offline worker keeps old tabs running) reads storage that has the
//     placeholder, writes its own record on top, and loses nothing, record secrets included;
//   - this build keeps a dropped secret dropped: a write, a restore from an older backup file, a
//     sealed copy or a lender update never puts it back;
//   - backup entries, sealed copies and the lender round-trip the placeholder;
//   - a date stamp from keys with the placeholder is refused before any proof.
// Nothing here removes a real secret: no code in this build writes the placeholder yet.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecordKeys } from './record-keys';

const local = new Map<string, string>();
const KEY = 'veilcore.record-keys.v1';
const NONE = '0'.repeat(64);

beforeEach(() => {
  vi.unstubAllGlobals();
  local.clear();
  vi.resetModules();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  });
  vi.stubGlobal('fetch', () => {
    throw new Error('nothing here reaches the network');
  });
});

// ---- the older build's reader and writer, exactly as on main before this change --------------
// (record-keys.ts at 1b25b7f: isKeys, readStored, mergeForWrite, writeAll.)
const OLD = {
  HEX64: /^[0-9a-f]{64}$/,
  isKeys(v: unknown): v is RecordKeys {
    if (typeof v !== 'object' || v === null) return false;
    const k = v as Record<string, unknown>;
    return (
      typeof k.recordId === 'string' &&
      typeof k.recordSecret === 'string' &&
      OLD.HEX64.test(k.recordSecret) &&
      typeof k.recoverySecret === 'string' &&
      OLD.HEX64.test(k.recoverySecret) &&
      typeof k.createdAt === 'number'
    );
  },
  readStored(): Record<string, RecordKeys> {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, RecordKeys> = {};
    for (const [id, v] of Object.entries(parsed)) if (OLD.isKeys(v)) out[id] = v;
    return out;
  },
  mergeForWrite(stored: Record<string, RecordKeys>, next: Record<string, RecordKeys>): Record<string, RecordKeys> {
    const out: Record<string, RecordKeys> = {};
    for (const [id, k] of Object.entries(next)) if (k.recordId === id) out[id] = k;
    for (const [id, k] of Object.entries(stored)) {
      const mine = out[id];
      if (!mine || mine.recordSecret !== k.recordSecret || mine.recoverySecret !== k.recoverySecret) out[id] = k;
    }
    return out;
  },
  writeAll(all: Record<string, RecordKeys>): void {
    localStorage.setItem(KEY, JSON.stringify(OLD.mergeForWrite(OLD.readStored(), all)));
  },
};

const hex = (n: number) => n.toString(16).padStart(2, '0').repeat(32);
const entry = (id: string, n: number, recoverySecret = hex(n + 100)): RecordKeys => ({
  recordId: id,
  recordSecret: hex(n),
  recoverySecret,
  createdAt: 1_700_000_000_000 + n,
  anchor: {
    identity: hex(n + 50),
    network: 'preprod',
    contractAddress: 'c0'.repeat(32),
    txId: `tx-${n}`,
    txHash: hex(n + 60),
    blockHeight: n,
  },
});
const stored = (): Record<string, RecordKeys> => JSON.parse(local.get(KEY) ?? '{}') as Record<string, RecordKeys>;

describe('an older build over storage that has the placeholder', () => {
  it('reads every entry, writes its own record, and loses nothing: no record secret dropped', () => {
    // What a later build leaves behind: two records with no recovery secret, one with.
    const migrated = {
      'VEIL-1': entry('VEIL-1', 1, NONE),
      'VEIL-2': entry('VEIL-2', 2, NONE),
      'VEIL-3': entry('VEIL-3', 3),
    };
    local.set(KEY, JSON.stringify(migrated));
    // The old tab's reader keeps them all.
    expect(Object.keys(OLD.readStored()).sort()).toEqual(['VEIL-1', 'VEIL-2', 'VEIL-3']);
    // Its next write (a new record of its own, from what it read) keeps every record secret.
    OLD.writeAll({ ...OLD.readStored(), 'VEIL-4': entry('VEIL-4', 4) });
    const after = stored();
    expect(Object.keys(after).sort()).toEqual(['VEIL-1', 'VEIL-2', 'VEIL-3', 'VEIL-4']);
    for (const id of ['VEIL-1', 'VEIL-2', 'VEIL-3']) expect(after[id]).toEqual(migrated[id as keyof typeof migrated]);
  });

  it('a stale tab still holding the real secret in memory doesn’t bring it back', () => {
    const real = entry('VEIL-1', 1);
    // The old tab read this before the drop...
    const staleSnapshot = { 'VEIL-1': real };
    // ...then a later build dropped it.
    local.set(KEY, JSON.stringify({ 'VEIL-1': { ...real, recoverySecret: NONE } }));
    OLD.writeAll({ ...staleSnapshot, 'VEIL-2': entry('VEIL-2', 2) });
    expect(stored()['VEIL-1'].recoverySecret).toBe(NONE);
    expect(stored()['VEIL-1'].recordSecret).toBe(real.recordSecret);
    expect(stored()['VEIL-2']).toBeDefined();
  });

  it('this build’s writes over the old build’s storage, and back, round-trip every entry', async () => {
    local.set(KEY, JSON.stringify({ 'VEIL-1': entry('VEIL-1', 1, NONE) }));
    const keys = await import('./record-keys');
    // This build reads it as kept, with no recovery secret.
    const k = keys.keysFor('VEIL-1');
    expect(k?.recordSecret).toBe(hex(1));
    expect(keys.hasRecoverySecret(k!.recoverySecret)).toBe(false);
    // This build writes (a new record, a backup mark), the old build writes, this build reads.
    keys.ensureKeys('VEIL-NEW');
    keys.markBackedUp(['VEIL-1'], 5);
    OLD.writeAll({ ...OLD.readStored(), 'VEIL-OLD': entry('VEIL-OLD', 7) });
    expect(Object.keys(stored()).sort()).toEqual(['VEIL-1', 'VEIL-NEW', 'VEIL-OLD']);
    expect(stored()['VEIL-1']).toMatchObject({ recordSecret: hex(1), recoverySecret: NONE, backedUpAt: 5 });
    expect(
      keys
        .allKeys()
        .map((x) => x.recordId)
        .sort(),
    ).toEqual(['VEIL-1', 'VEIL-NEW', 'VEIL-OLD']);
  });
});

describe('this build keeps a dropped recovery secret dropped', () => {
  it('mergeForWrite: the drop is kept, a write bringing it back is stored without it, other secrets still win as before', async () => {
    const { mergeForWrite, NO_RECOVERY_SECRET } = await import('./record-keys');
    expect(NO_RECOVERY_SECRET).toBe(NONE);
    const real = entry('VEIL-1', 1);
    const dropped = { ...real, recoverySecret: NONE };
    // A write that drops it: kept (before this change the stored real one won, and the drop was lost).
    expect(mergeForWrite({ 'VEIL-1': real }, { 'VEIL-1': dropped })['VEIL-1'].recoverySecret).toBe(NONE);
    // A write that brings it back, with a newer anchor: the anchor is kept, the secret isn't.
    const back = { ...real, anchor: { ...real.anchor!, blockHeight: 99 } };
    const m = mergeForWrite({ 'VEIL-1': dropped }, { 'VEIL-1': back })['VEIL-1'];
    expect(m.recoverySecret).toBe(NONE);
    expect(m.anchor?.blockHeight).toBe(99);
    // Different real secrets, or a different record secret: the stored entry wins, as before.
    const other = { ...real, recoverySecret: hex(9) };
    expect(mergeForWrite({ 'VEIL-1': real }, { 'VEIL-1': other })['VEIL-1']).toEqual(real);
    const swapped = { ...dropped, recordSecret: hex(8) };
    expect(mergeForWrite({ 'VEIL-1': real }, { 'VEIL-1': swapped })['VEIL-1']).toEqual(real);
  });

  it('a backup entry with the placeholder restores as it was; an older file never brings a dropped one back', async () => {
    const keys = await import('./record-keys');
    const dropped = { ...entry('VEIL-1', 1), recoverySecret: NONE };
    // The one-file backup's entry and the single-record file both carry it as written.
    const asEntry = keys.keysEntry(dropped);
    expect(asEntry.recoverySecret).toBe(NONE);
    expect((JSON.parse(keys.backupFile(dropped, {})) as { recoverySecret: string }).recoverySecret).toBe(NONE);
    // Restored on a clean browser: kept, with no recovery secret.
    const got = keys.restoreKeysEntry(asEntry);
    expect(got).toMatchObject({ recordId: 'VEIL-1', recordSecret: hex(1), recoverySecret: NONE });
    // An older file, from before the drop, restored over it: the record secret matches, the
    // file's recovery secret is not taken back.
    const older = keys.keysEntry(entry('VEIL-1', 1));
    expect(keys.restoreKeysEntry(older).recoverySecret).toBe(NONE);
    expect(stored()['VEIL-1'].recoverySecret).toBe(NONE);
    // A restore with mark:false (the account copy) follows the same rule.
    expect(keys.restoreKeysEntry(older, { mark: false }).recoverySecret).toBe(NONE);
  });

  it('a sealed copy with the placeholder is taken like any other', async () => {
    const keys = await import('./record-keys');
    const sealed = { recordSecret: hex(1), recoverySecret: NONE, createdAt: 3 };
    expect(keys.isSealedSecrets(sealed)).toBe(true);
    expect(keys.adoptSealedSecrets({ id: 'VEIL-S' }, sealed)).toBe(true);
    expect(keys.keysFor('VEIL-S')).toMatchObject({ recordSecret: hex(1), recoverySecret: NONE });
    expect(keys.sealedSecretsOf(keys.keysFor('VEIL-S')!).recoverySecret).toBe(NONE);
  });

  it('real secrets work exactly as before', async () => {
    const keys = await import('./record-keys');
    const k = keys.ensureKeys('VEIL-R');
    expect(keys.hasRecoverySecret(k.recoverySecret)).toBe(true);
    expect(keys.restoreKeysEntry(keys.keysEntry(k)).recoverySecret).toBe(k.recoverySecret);
  });
});

describe('the lender identity', () => {
  const fakeIdentity = (secret: Uint8Array) => createHash('sha256').update(secret).digest('hex');

  it('reads the placeholder, allows the drop, never puts it back, and checks backups by what is kept', async () => {
    const lender = await import('./lender');
    const l = lender.makeLender('Practice Lender', fakeIdentity);
    const real = l.recoverySecret;
    // A backup without it doesn't hold a lender that keeps one.
    expect(lender.lenderHeldBy({ ...lender.lenderForBackup(), recoverySecret: NONE })).toBe(false);
    // Dropping is the one change allowed to a secret.
    lender.updateLender((x) => ({ ...x, recoverySecret: NONE }));
    expect(lender.lender()?.recoverySecret).toBe(NONE);
    expect(() => lender.updateLender((x) => ({ ...x, recoverySecret: real }))).toThrow(/keeps its secrets/);
    expect(() => lender.updateLender((x) => ({ ...x, recoverySecret: 'ab'.repeat(32) }))).toThrow(/keeps its secrets/);
    // Stored as the placeholder, read back by a fresh load (and by an older build: 64 hex).
    lender._resetLenderCache();
    expect(lender.lender()?.recoverySecret).toBe(NONE);
    expect(lender.isLender(JSON.parse(local.get('veilcore.lender.v1') ?? 'null'))).toBe(true);
    // A backup then holds it whether it has the old secret or the placeholder.
    const file = lender.lenderForBackup();
    expect(lender.lenderHeldBy(file)).toBe(true);
    expect(lender.lenderHeldBy({ ...file, recoverySecret: real })).toBe(true);
    // Restored over a clean browser, the placeholder comes back as it was.
    local.delete('veilcore.lender.v1');
    lender._resetLenderCache();
    lender.mergeLender(file);
    expect(lender.lender()?.recoverySecret).toBe(NONE);
  });
});

describe('a date stamp from keys with no recovery secret', () => {
  it('is refused before any proof or request', async () => {
    const { anchorOnChain, NO_RECOVERY_TO_ANCHOR } = await import('./chain/actions');
    const deps = new Proxy(
      {},
      {
        get: () => {
          throw new Error('nothing may be asked of the prover or the network');
        },
      },
    );
    await expect(
      anchorOnChain(new Uint8Array(32).fill(1), new Uint8Array(32), { deps: deps as never }),
    ).rejects.toThrow(NO_RECOVERY_TO_ANCHOR);
  });
});
