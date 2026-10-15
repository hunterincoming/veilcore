// The one-file backup: it holds everything, saving it is not the same as having it, and
// restoring never replaces a different key already in the browser.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const local = new Map<string, string>();
const fileOf = (text: string) => ({ text: () => Promise.resolve(text) }) as unknown as File;

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
    throw new Error('the backup must never reach the network');
  });
});

const setup = async () => {
  const keys = await import('./record-keys');
  const holder = await import('./holder');
  const backup = await import('./backup');
  keys.__resetRecordKeysForTests();
  const h = holder.holderKey();
  keys.ensureKeys('VEIL-1');
  keys.ensureKeys('VEIL-2');
  return { keys, holder, backup, h };
};

describe('one backup file', () => {
  it('holds the holder key and every record, and is marked only once a saved copy is checked', async () => {
    const { keys, backup, h } = await setup();
    const text = JSON.stringify(backup.backupContents());
    expect(text).toContain(h.toLowerCase());
    for (const id of ['VEIL-1', 'VEIL-2']) expect(text).toContain(keys.keysFor(id)!.recordSecret);
    expect(backup.backupFileName(new Date(2026, 9, 13, 21, 30).getTime())).toBe('VeilCore backup 2026-10-13.json');

    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:x', revokeObjectURL: () => undefined });
    vi.stubGlobal('document', { createElement: () => ({ click: () => undefined }) });
    backup.downloadBackupAll();
    expect(keys.keysWithoutBackup()).toHaveLength(2); // saving is not the same as having it

    const ok = await backup.checkBackup(fileOf(text));
    expect(ok).toEqual({ ok: true, records: 2, recordIds: ['VEIL-1', 'VEIL-2'] });
    expect(keys.keysWithoutBackup()).toHaveLength(0);
  });

  it('a copy that is out of date, from someone else, or an older kind of file does not pass, and changes nothing', async () => {
    const { keys, backup } = await setup();
    const before = JSON.stringify(backup.backupContents());
    keys.setDnaOnChain('VEIL-2', {
      fingerprint: 'd7'.repeat(32),
      salt: '5a'.repeat(32),
      identity: 'e0'.repeat(32),
      binding: 'b0'.repeat(32),
      status: 'sending',
    });
    const stale = await backup.checkBackup(fileOf(before));
    expect(stale.ok).toBe(false);
    expect(keys.keysWithoutBackup()).toHaveLength(2);

    const someoneElse = JSON.stringify({ ...backup.backupContents(), holderKey: 'ab'.repeat(32) });
    expect((await backup.checkBackup(fileOf(someoneElse))).ok).toBe(false);
    const old = keys.backupFile(keys.keysFor('VEIL-1')!, {});
    expect((await backup.checkBackup(fileOf(old))).ok).toBe(false);
    expect((await backup.checkBackup(fileOf('not json'))).ok).toBe(false);
    expect(keys.keysWithoutBackup()).toHaveLength(2);
  });

  it('restores everything on a new browser', async () => {
    const { keys, holder, backup, h } = await setup();
    const text = JSON.stringify(backup.backupContents());
    const secret1 = keys.keysFor('VEIL-1')!.recordSecret;

    // A new device: nothing stored.
    local.clear();
    keys.__resetRecordKeysForTests();
    expect(holder.holderKeyIfAny()).toBeNull();
    const r = await backup.restoreAny(fileOf(text));
    expect(r).toMatchObject({ records: 2, holderKey: 'restored' });
    expect(holder.holderKeyIfAny()).toBe(h);
    expect(keys.keysFor('VEIL-1')?.recordSecret).toBe(secret1);
    expect(keys.keysWithoutBackup()).toHaveLength(0); // it came from a backup that holds it
  });

  it('refuses a backup that would replace a different holder or different keys, and changes nothing', async () => {
    const { keys, holder, backup, h } = await setup();
    const other = JSON.stringify({ ...backup.backupContents(), holderKey: 'ab'.repeat(32) });
    await expect(backup.restoreAny(fileOf(other))).rejects.toThrow(/different set of records/);
    expect(holder.holderKeyIfAny()).toBe(h);

    const contents = backup.backupContents();
    const clash = JSON.stringify({
      ...contents,
      records: [{ ...contents.records[0], recordSecret: 'ee'.repeat(32) }, ...contents.records.slice(1)],
    });
    const secretBefore = keys.keysFor(contents.records[0].recordId)!.recordSecret;
    await expect(backup.restoreAny(fileOf(clash))).rejects.toThrow(/different keys/);
    expect(keys.keysFor(contents.records[0].recordId)!.recordSecret).toBe(secretBefore);
  });

  it('still reads the older files: one record keys file and the holder key text file', async () => {
    const { keys, holder, backup, h } = await setup();
    const oneRecord = keys.backupFile(keys.keysFor('VEIL-1')!, {});
    const holderText = `VeilCore holder key\n\n${h}\n\nThis key is how you get back to your records.\n`;
    local.clear();
    keys.__resetRecordKeysForTests();
    expect(await backup.restoreAny(fileOf(holderText))).toMatchObject({ holderKey: 'restored' });
    expect(holder.holderKeyIfAny()).toBe(h);
    expect(await backup.restoreAny(fileOf(oneRecord))).toMatchObject({ records: 1 });
    expect(keys.keysFor('VEIL-1')).toBeDefined();
    await expect(backup.restoreAny(fileOf('{"format":"something-else"}'))).rejects.toThrow(/isn't a VeilCore backup/);
  });

  it('carries a lab’s delivery locks and a breeder’s lab codes, checks the locks, and merges them on restore', async () => {
    const { keys, backup } = await setup();
    const lab = await import('./lab-results');
    const transfers = await import('./transfers');
    const lock = await lab.resultRecipientFor('3f'.repeat(32), 'TR-0A1B2C3D');
    const delivery = {
      transferId: 'TR-0A1B2C3D',
      receivedRecordId: 'VEIL-R',
      sourceCommitment: 'b'.repeat(64),
      recipient: lock,
      receivedAt: 1,
    };
    const stale = JSON.stringify(backup.backupContents()); // saved before the delivery arrived
    lab.rememberDelivery(delivery);
    transfers.rememberSentCode(`TR-11111111.9f8e7d6c.${lock}`);
    const contents = backup.backupContents();
    expect(contents.labDeliveries).toEqual({ 'TR-0A1B2C3D': delivery });
    expect(contents.sentCodes).toEqual({ 'TR-11111111': `TR-11111111.9f8e7d6c.${lock}` });

    // A copy without the lab's latest delivery doesn't pass; the current one does.
    expect((await backup.checkBackup(fileOf(stale))).ok).toBe(false);
    expect(keys.keysWithoutBackup()).toHaveLength(2);
    expect((await backup.checkBackup(fileOf(JSON.stringify(contents)))).ok).toBe(true);

    // A new device gets both back.
    local.clear();
    keys.__resetRecordKeysForTests();
    const r = await backup.restoreAny(fileOf(JSON.stringify(contents)));
    expect(r).toMatchObject({ deliveries: 1, sentCodes: 1 });
    expect(lab.deliveryForRecord('VEIL-R')?.recipient).toBe(lock);
    expect(transfers.sentCodeFor('TR-11111111')).toBe(`TR-11111111.9f8e7d6c.${lock}`);
  });

  it('restoring never replaces a delivery lock or a lab code already here', async () => {
    const { backup } = await setup();
    const lab = await import('./lab-results');
    const transfers = await import('./transfers');
    const mine = await lab.resultRecipientFor('3f'.repeat(32), 'TR-0A1B2C3D');
    const theirs = await lab.resultRecipientFor('40'.repeat(32), 'TR-0A1B2C3D');
    lab.rememberDelivery({ transferId: 'TR-0A1B2C3D', receivedRecordId: 'VEIL-R', recipient: mine, receivedAt: 1 });
    transfers.rememberSentCode(`TR-11111111.aaaa.${mine}`);
    const file = {
      ...backup.backupContents(),
      labDeliveries: {
        'TR-0A1B2C3D': { transferId: 'TR-0A1B2C3D', receivedRecordId: 'VEIL-R', recipient: theirs, receivedAt: 2 },
        'TR-22222222': { transferId: 'TR-22222222', receivedRecordId: 'VEIL-Q', recipient: theirs, receivedAt: 3 },
        'TR-BAD': { transferId: 'TR-OTHER', receivedRecordId: 'VEIL-Z', receivedAt: 3 },
      },
      sentCodes: { 'TR-11111111': `TR-11111111.bbbb.${theirs}`, 'TR-33333333': 'TR-33333333.cccc' },
    };
    const r = await backup.restoreAny(fileOf(JSON.stringify(file)));
    expect(r).toMatchObject({ deliveries: 1, sentCodes: 1 });
    expect(lab.deliveryForRecord('VEIL-R')?.recipient).toBe(mine);
    expect(lab.deliveryForRecord('VEIL-Q')?.recipient).toBe(theirs);
    expect(lab.deliveryForRecord('VEIL-Z')).toBeUndefined();
    expect(transfers.sentCodeFor('TR-11111111')).toBe(`TR-11111111.aaaa.${mine}`);
    expect(transfers.sentCodeFor('TR-33333333')).toBe('TR-33333333.cccc');
  });
});
