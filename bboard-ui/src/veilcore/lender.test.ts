// A lender's claims from the browser (lender.ts): the claim commitment is the partner kit's,
// the lender's secrets and every claim's salt go in the backup, a backup without them doesn't
// pass, and restoring never replaces a different lender already here.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordKeyFrom } from '../components/licensing/LenderPage';

const local = new Map<string, string>();
const fileOf = (text: string) => ({ text: () => Promise.resolve(text) }) as unknown as File;
const fakeIdentity = (secret: Uint8Array) => createHash('sha256').update(secret).digest('hex');

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

const RECORD = 'ab'.repeat(32);

describe('a lender in the browser', () => {
  it('the claim is SHA-256(salt || words), as the partner kit makes it', async () => {
    const { claimCommitment } = await import('./lender');
    const salt = '11'.repeat(32);
    const words = 'Loan 2026-114';
    const kit = createHash('sha256').update(Buffer.from(salt, 'hex')).update(words, 'utf8').digest('hex');
    expect(await claimCommitment(words, salt)).toBe(kit);
    await expect(claimCommitment('  ', salt)).rejects.toThrow();
  });

  it('makes one identity, keeps its secrets, and keeps each claim with its salt and words', async () => {
    const lender = await import('./lender');
    const l = lender.makeLender('  Practice Lender  ', fakeIdentity, 5);
    expect(l.name).toBe('Practice Lender');
    expect(l.identity).toBe(fakeIdentity(Buffer.from(l.secret, 'hex')));
    expect(lender.makeLender('Someone Else', fakeIdentity).secret).toBe(l.secret); // never replaced
    expect(() => lender.updateLender((x) => ({ ...x, secret: '00'.repeat(32) }))).toThrow();

    const c = await lender.startClaim(RECORD.toUpperCase(), ' Loan 7 ', 'VEIL-ABC');
    expect(c.record).toBe(RECORD);
    expect(c.words).toBe('Loan 7');
    expect(c.claim).toBe(await lender.claimCommitment('Loan 7', c.salt));
    await expect(lender.startClaim(l.identity, 'Loan 8')).rejects.toThrow(); // not on its own identity
    await expect(lender.startClaim('nope', 'Loan 8')).rejects.toThrow();
    expect(() => lender.updateClaim(c.claim, (x) => ({ ...x, words: 'other' }))).toThrow();
    lender.updateClaim(c.claim, (x) => ({ ...x, proposeTx: 'tx-1' }));
    expect(lender.lender()?.claims[0].proposeTx).toBe('tx-1');
  });

  it('goes in the backup; a file without it, or without a newer claim, does not pass', async () => {
    const lender = await import('./lender');
    const backup = await import('./backup');
    lender.makeLender('Practice Lender', fakeIdentity);
    const first = JSON.stringify(backup.backupContents());
    expect(first).toContain(lender.lender()!.secret);
    expect(first).toContain(lender.lender()!.recoverySecret);
    expect((await backup.checkBackup(fileOf(first))).ok).toBe(true);
    expect(lender.lender()!.backedUpAt).toBeTypeOf('number');

    const c = await lender.startClaim(RECORD, 'Loan 9');
    expect(lender.lender()!.backedUpAt).toBeUndefined(); // a new claim needs a new backup
    const stale = await backup.checkBackup(fileOf(first));
    expect(stale.ok).toBe(false);
    const second = JSON.stringify(backup.backupContents());
    expect(second).toContain(c.salt);
    expect((await backup.checkBackup(fileOf(second))).ok).toBe(true);
  });

  it('restores into a browser with none, adds claims with the same secrets, never replaces a different lender', async () => {
    const lender = await import('./lender');
    const l = lender.makeLender('Practice Lender', fakeIdentity);
    await lender.startClaim(RECORD, 'Loan 10');
    const file = lender.lenderForBackup();

    local.clear();
    lender._resetLenderCache();
    lender.mergeLender(file);
    expect(lender.lender()?.secret).toBe(l.secret);
    expect(lender.lender()?.claims).toHaveLength(1);

    local.clear();
    lender._resetLenderCache();
    const other = lender.makeLender('Other Lender', fakeIdentity);
    lender.mergeLender(file);
    expect(lender.lender()?.secret).toBe(other.secret);
    expect(lender.lender()?.claims).toHaveLength(0);
  });
});

describe('what a lender pastes', () => {
  it('a check link carrying the key, or the key itself', () => {
    expect(recordKeyFrom(`https://veilcore.org/verify/VEIL-1?x=1#chain=${RECORD}&anchorTx=tx`)).toBe(RECORD);
    expect(recordKeyFrom(`  ${RECORD.toUpperCase()} `)).toBe(RECORD);
    expect(recordKeyFrom('https://veilcore.org/verify/VEIL-1')).toBeUndefined();
    expect(recordKeyFrom(`#chain=${RECORD}ff`)).toBeUndefined();
  });
});
