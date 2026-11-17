// Paid plans, the site's half (billing.ts), switched on for these tests.
//   - The plan comes from the registry, with the holder key; anything malformed is ignored.
//   - New records past the free number are refused before anything is sealed; a paid plan, or
//     a plan not read yet, never blocks here (the registry still has its own ceiling).
//   - A checkout opens a tab at once (in the click, so Safari allows it), then sends it only to
//     Paddle's own checkout page; anything else closes it.
//   - What counts is the holder's own records (deliveries received don't), and the larger of
//     that and the registry's count.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

vi.mock('../config/network', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../config/network')>()),
  PAID_PLANS_ENABLED: true,
}));

const KEY = 'ab'.repeat(32);
vi.mock('./holder', () => ({ holderKeyIfAny: () => KEY }));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('paid plans in the browser', async () => {
  const billing = await import('./billing');

  it('reads the plan with the holder key, and ignores a malformed answer', async () => {
    const key = KEY;
    const seen: RequestInit[] = [];
    const ok = await billing.refreshPlan(((_u: string, init: RequestInit) => {
      seen.push(init);
      return Promise.resolve(json(200, { plan: 'free', status: null, periodEnd: null, recordsHeld: 3, recordCap: 25 }));
    }) as unknown as typeof fetch);
    expect(ok?.recordCap).toBe(25);
    // An older registry's answer, without the count or the plan list: filled in.
    expect(ok?.recordsCounted).toBe(3);
    expect(ok?.plans).toEqual(['breeder', 'lab']);
    expect((seen[0].headers as Record<string, string>)['x-holder-key']).toBe(key);
    const bad = await billing.refreshPlan(() => Promise.resolve(json(200, { plan: 'free', recordCap: 'lots' })));
    expect(bad?.recordCap).toBe(25);
  });

  it('blocks new dates past the free number only on the free plan: the registry’s count plus what waits here', async () => {
    const plan = (p: object) =>
      billing.refreshPlan(() => Promise.resolve(json(200, { status: null, periodEnd: null, ...p })));
    await plan({ plan: 'free', recordsHeld: 24, recordsCounted: 24, recordCap: 25 });
    expect(billing.planBlocks(1, 0)).toBe(false);
    expect(billing.planBlocks(2, 0)).toBe(true);
    // A record waiting in this browser, not stored yet, counts on top.
    expect(billing.planBlocks(1, 1)).toBe(true);
    expect(billing.freeLeft(billing.currentPlan(), 0)).toBe(1);
    // Nothing new: never blocked.
    expect(billing.planBlocks(0, 30)).toBe(false);
    // Deleted on the registry but still counted there: the registry's count is what counts.
    await plan({ plan: 'free', recordsHeld: 20, recordsCounted: 25, recordCap: 25 });
    expect(billing.planBlocks(1, 0)).toBe(true);
    await plan({ plan: 'breeder', status: 'active', recordsHeld: 400, recordCap: 10000 });
    expect(billing.planBlocks(500, 0)).toBe(false);
    expect(billing.freeLeft(billing.currentPlan(), 0)).toBeNull();
  });

  it('counts what waits here as the registry will: dated content not stored yet, the first correction free', () => {
    const stored = new Set(['A']);
    const isStored = (id: string) => stored.has(id);
    const rs = [
      { id: 'A', recordFingerprint: 'fa' }, // stored: already in the registry's count
      { id: 'B', recordFingerprint: 'fb' }, // waiting: counts
      { id: 'C' }, // a stub with no proof code yet: nothing
      { id: 'D', recordFingerprint: 'fd', receivedFrom: 'VEIL-1' }, // received, sealed: counts
      { id: 'E', recordFingerprint: 'fe', supersedes: { recordId: 'A' } }, // A's first correction: free
      { id: 'F', recordFingerprint: 'ff', supersedes: { recordId: 'E' } }, // correction of a correction: counts
      { id: 'G', recordFingerprint: 'fg', supersedes: { recordId: 'D' } }, // correction of a received record: counts
    ];
    expect(billing.waitingCount(rs, isStored)).toBe(4);
  });

  it('one proof code is one date, and a record corrected twice here has only one free correction', () => {
    const none = () => false;
    expect(
      billing.waitingCount(
        [
          { id: 'X', recordFingerprint: 'same' },
          { id: 'Y', recordFingerprint: 'same' },
        ],
        none,
      ),
    ).toBe(1);
    const rs = [
      { id: 'A', recordFingerprint: 'fa' },
      { id: 'E1', recordFingerprint: 'e1', supersedes: { recordId: 'A' } },
      { id: 'E2', recordFingerprint: 'e2', supersedes: { recordId: 'A' } },
    ];
    // A stored; two corrections of it here: neither is known to be the free one, both count.
    expect(billing.waitingCount(rs, (id) => id === 'A')).toBe(2);
  });

  it('received records not sealed yet hold their slots', async () => {
    await billing.refreshPlan(() =>
      Promise.resolve(
        json(200, {
          plan: 'free',
          status: null,
          periodEnd: null,
          recordsHeld: 22,
          recordsCounted: 22,
          recordsReserved: 2,
          recordCap: 25,
        }),
      ),
    );
    expect(billing.freeLeft(billing.currentPlan(), 0)).toBe(1);
    expect(billing.planBlocks(2, 0)).toBe(true);
    // An older registry that doesn't say: none reserved.
    await billing.refreshPlan(() =>
      Promise.resolve(
        json(200, { plan: 'free', status: null, periodEnd: null, recordsHeld: 22, recordsCounted: 22, recordCap: 25 }),
      ),
    );
    expect(billing.freeLeft(billing.currentPlan(), 0)).toBe(3);
  });

  it('takes the plan names the registry sells', async () => {
    const p = await billing.refreshPlan(() =>
      Promise.resolve(
        json(200, {
          plan: 'free',
          status: null,
          periodEnd: null,
          recordsHeld: 0,
          recordCap: 25,
          plans: ['grower', 'x!', 'lab'],
        }),
      ),
    );
    expect(p?.plans).toEqual(['grower', 'lab']);
  });

  it('opens a tab at once, and sends it only to Paddle’s own checkout page', async () => {
    const tabs: { url: string | null; closed: boolean }[] = [];
    const tab = () => {
      const t = { url: null as string | null, closed: false };
      tabs.push(t);
      return { go: (u: string) => void (t.url = u), close: () => void (t.closed = true) };
    };
    const good = 'https://sandbox-pay.paddle.io/checkout/hsc_01abc123def456?transaction_id=txn_01abc123def456';
    expect(await billing.openCheckout('breeder', () => Promise.resolve(json(200, { url: good })), tab)).toBeNull();
    expect(tabs[0]).toEqual({ url: good, closed: false });
    for (const url of [
      'https://evil.example/checkout/hsc_01abc123def456?transaction_id=txn_01abc',
      'http://sandbox-pay.paddle.io/checkout/hsc_01abc123def456?transaction_id=txn_01abc',
      'javascript:alert(1)',
      `${good}&next=https://evil.example`,
    ]) {
      expect(await billing.openCheckout('lab', () => Promise.resolve(json(200, { url })), tab)).toBe(
        'app.plan.err.unreachable',
      );
      expect(tabs.at(-1)).toEqual({ url: null, closed: true });
    }
    expect(await billing.openCheckout('lab', () => Promise.resolve(json(429, {})), tab)).toBe('app.plan.err.busy');
    expect(await billing.openCheckout('lab', () => Promise.resolve(json(409, {})), tab)).toBe('app.plan.err.noRecord');
    expect(
      await billing.openCheckout('lab', (): Promise<Response> => Promise.reject(new TypeError('offline')), tab),
    ).toBe('app.plan.err.unreachable');
    expect(tabs.every((t) => t.url === good || t.closed)).toBe(true);
    // A blocked tab: said, and the registry isn't asked.
    let asked = false;
    const blocked = await billing.openCheckout(
      'lab',
      () => {
        asked = true;
        return Promise.resolve(json(200, { url: good }));
      },
      () => null,
    );
    expect([blocked, asked]).toEqual(['app.plan.err.blocked', false]);
    // A plan name that isn't one: nothing opened.
    expect(await billing.openCheckout('Lab<script>', () => Promise.resolve(json(200, { url: good })), tab)).toBe(
      'app.plan.err.off',
    );
  });
});
