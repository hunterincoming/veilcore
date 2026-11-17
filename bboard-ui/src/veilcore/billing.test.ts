// Paid plans, the site's half (billing.ts), switched on for these tests.
//   - The plan comes from the registry, with the holder key; anything malformed is ignored.
//   - New records past the free number are refused before anything is sealed; a paid plan, or
//     a plan not read yet, never blocks here (the registry still has its own ceiling).
//   - A checkout opens only a link on Paddle's own checkout page; anything else is not opened.
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
    expect((seen[0].headers as Record<string, string>)['x-holder-key']).toBe(key);
    const bad = await billing.refreshPlan(() => Promise.resolve(json(200, { plan: 'free', recordCap: 'lots' })));
    expect(bad?.recordCap).toBe(25);
  });

  it('blocks new records past the free number only on the free plan', async () => {
    const plan = (p: object) =>
      billing.refreshPlan(() => Promise.resolve(json(200, { status: null, periodEnd: null, ...p })));
    await plan({ plan: 'free', recordsHeld: 24, recordCap: 25 });
    expect(billing.planBlocks(1, 24)).toBe(false);
    expect(billing.planBlocks(2, 24)).toBe(true);
    // A record waiting in this browser counts too.
    expect(billing.planBlocks(1, 25)).toBe(true);
    expect(billing.freeLeft(billing.currentPlan(), 10)).toBe(1);
    await plan({ plan: 'breeder', status: 'active', recordsHeld: 400, recordCap: 10000 });
    expect(billing.planBlocks(500, 400)).toBe(false);
    expect(billing.freeLeft(billing.currentPlan(), 400)).toBeNull();
  });

  it('opens only Paddle’s own checkout page, in a new tab', async () => {
    const opened: string[] = [];
    const good = 'https://sandbox-pay.paddle.io/checkout/hsc_01abc123def456?transaction_id=txn_01abc123def456';
    const r = await billing.openCheckout(
      'breeder',
      () => Promise.resolve(json(200, { url: good })),
      (u) => opened.push(u),
    );
    expect(r).toBeNull();
    expect(opened).toEqual([good]);
    for (const url of [
      'https://evil.example/checkout/hsc_01abc123def456?transaction_id=txn_01abc',
      'http://sandbox-pay.paddle.io/checkout/hsc_01abc123def456?transaction_id=txn_01abc',
      'javascript:alert(1)',
      `${good}&next=https://evil.example`,
    ]) {
      expect(
        await billing.openCheckout(
          'lab',
          () => Promise.resolve(json(200, { url })),
          (u) => opened.push(u),
        ),
      ).toBe('app.plan.err.unreachable');
    }
    expect(opened).toHaveLength(1);
    expect(await billing.openCheckout('lab', () => Promise.resolve(json(429, {})))).toBe('app.plan.err.busy');
    expect(await billing.openCheckout('lab', (): Promise<Response> => Promise.reject(new TypeError('offline')))).toBe(
      'app.plan.err.unreachable',
    );
  });
});
