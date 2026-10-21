// The issuer's deal keys go in the backup file and come back on restore (review round 3, L5).
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  const m = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  });
});

describe('issuer deal keys in the backup', () => {
  it('a file without a license’s deal key is not a full backup; restoring keeps the file’s keys', async () => {
    const { issuerDealsMissingFrom, mergeIssuerDeals, issuerDealsForBackup } = await import('./licenses');
    const deal = { inviteId: 'LI-1', partySecret: 'ab'.repeat(32) };
    expect(issuerDealsMissingFrom({})).toEqual([]);
    expect(mergeIssuerDeals({ 'LIC-1': deal, junk: { inviteId: 'x' } })).toBe(1);
    expect(issuerDealsForBackup()).toEqual({ 'LIC-1': deal });
    // Never replaced by a later file.
    expect(mergeIssuerDeals({ 'LIC-1': { inviteId: 'LI-2', partySecret: 'cd'.repeat(32) } })).toBe(0);
    expect(issuerDealsForBackup()['LIC-1'].partySecret).toBe('ab'.repeat(32));
  });
});
