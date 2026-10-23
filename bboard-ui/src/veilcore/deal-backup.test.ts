// The backup keeps each deal's signed messages (deal-backup.ts), read from the deal's channel,
// in the "signed record of this deal" format; reading never opens a channel.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const local = new Map<string, string>();
beforeEach(() => {
  local.clear();
  vi.resetModules();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("a deal's messages in the backup", () => {
  it("the licensee's backup holds the issuer's signed message, and no channel is opened", async () => {
    const deal = await import('./deal');
    const issuer = deal.newPartyKey();
    const licensee = deal.newPartyKey();
    const commitment = 'aa'.repeat(32);
    const issuerRecord = 'bb'.repeat(32);
    const keys = await deal.dealKeys(issuer.secret, licensee.public, commitment, issuerRecord);
    const sealed = await deal.sealMessage(
      {
        type: 'payout',
        method: 'bank transfer',
        account: 'Practice Bank 0001',
        currency: 'USD',
        from: 'issuer',
        at: Date.parse('2026-10-20'),
      },
      issuer.secret,
      keys,
    );
    const posts: string[] = [];
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      posts.push(String(url));
      if (String(url).endsWith(`/deals/${keys.dealId}/read`))
        return Promise.resolve(
          new Response(JSON.stringify({ messages: [{ seq: 1, iv: sealed.iv, ct: sealed.ct, receivedAt: 5 }] })),
        );
      return Promise.resolve(
        new Response(JSON.stringify({ error: `unexpected ${init?.method} ${url}` }), { status: 400 }),
      );
    });
    const held = await import('./held-licenses');
    held.keepHeldLicense({
      inviteId: 'LI-1',
      secret: 'cc'.repeat(32),
      commitment,
      identity: 'dd'.repeat(32),
      issuerRecord,
      licenseeNonce: licensee.public,
      partySecret: licensee.secret,
      issuerNonce: issuer.public,
      label: 'Practice Grower',
      acceptedAt: 1,
    });
    const { dealRecordsForBackup } = await import('./deal-backup');
    const recs = (await dealRecordsForBackup()) as {
      v: string;
      keys: unknown;
      messages: { message: { type: string } }[];
    }[];
    expect(recs).toHaveLength(1);
    expect(recs[0].v).toBe('veilcore/deal-record/v1');
    expect(recs[0].keys).toEqual({ issuer: issuer.public, licensee: licensee.public });
    expect(recs[0].messages.map((m) => m.message.type)).toEqual(['payout']);
    expect(posts.every((u) => u.endsWith('/read'))).toBe(true); // read only: nothing opened
  });

  it('a registry that does not answer leaves deals out, and the backup is still made', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
    const deal = await import('./deal');
    const k = deal.newPartyKey();
    const held = await import('./held-licenses');
    held.keepHeldLicense({
      inviteId: 'LI-2',
      secret: 'cc'.repeat(32),
      commitment: 'aa'.repeat(32),
      identity: 'dd'.repeat(32),
      issuerRecord: 'bb'.repeat(32),
      licenseeNonce: k.public,
      partySecret: k.secret,
      issuerNonce: deal.newPartyKey().public,
      label: 'x',
      acceptedAt: 1,
    });
    const backup = await import('./backup');
    const file = JSON.parse(await backup.backupFileText()) as Record<string, unknown>;
    expect(file.dealRecords).toBeUndefined();
    expect(file.heldLicenses).toHaveLength(1);
  });
});
