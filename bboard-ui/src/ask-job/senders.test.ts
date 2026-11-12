// "Do it for me": what the report step really sends (senders.ts sendReport), through the real
// deal encryption and sayOnce, against a stand-in deal channel (review L12): one signed report for
// the amount approved; a lost answer stops and asks, and trying again finds it and sends no second;
// an amount that changed since approval is never signed. And the approved amount itself
// (prepare.ts reportAmounts) includes the top-up to a yearly minimum (review S5).
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as deal from '../veilcore/deal';
import { __resetOutboxForTests } from '../veilcore/deal-client';
import { resetHeldLicensesForTests } from '../veilcore/held-licenses';
import { sendReport } from './senders';
import { reportAmounts } from './prepare';
import type { Job, ReportRef } from './store';

const H = (c: string) => c.repeat(64);
const ISS = 'a1'.repeat(32);
const LIC = 'b2'.repeat(32);

const local = new Map<string, string>();
const channel: { seq: number; iv: string; ct: string; receivedAt: number }[] = [];
let loseAnswer = false;
beforeEach(() => {
  local.clear();
  channel.length = 0;
  loseAnswer = false;
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  });
  vi.stubGlobal('fetch', (url: string, init?: { body?: string }) => {
    const path = new URL(url).pathname;
    const body = JSON.parse(init?.body ?? '{}') as { iv?: string; ct?: string; after?: number };
    const json = (b: unknown) => Promise.resolve(new Response(JSON.stringify(b), { status: 200 }));
    if (path.endsWith('/read')) return json({ messages: channel.filter((m) => m.seq > (body.after ?? 0)) });
    if (path.endsWith('/messages')) {
      channel.push({ seq: channel.length + 1, iv: body.iv!, ct: body.ct!, receivedAt: Date.now() });
      if (loseAnswer) {
        loseAnswer = false;
        return Promise.reject(new TypeError('Failed to fetch'));
      }
      return json({ seq: channel.length, fingerprint: 'f'.repeat(64) });
    }
    return Promise.resolve(new Response('{}', { status: 404 }));
  });
  __resetOutboxForTests();
  resetHeldLicensesForTests();
});

const terms = (extra: Record<string, unknown> = {}) => ({
  licensee: 'G',
  startDate: '2026-01-01',
  endDate: '2027-12-31',
  currency: 'USD',
  royalty: { kind: 'percent', rate: '10', base: 'gross' },
  reporting: { every: 'quarter', reportDueDays: 30, paymentDueDays: 15 },
  ...extra,
});

const hold = (t = terms()) =>
  local.set(
    'veilcore.held-licenses.v1',
    JSON.stringify([
      {
        inviteId: 'LI-1',
        secret: H('1'),
        commitment: H('c'),
        identity: H('2'),
        issuerRecord: H('d'),
        licenseeNonce: deal.publicOf(LIC),
        partySecret: LIC,
        issuerNonce: deal.publicOf(ISS),
        label: 'their words',
        acceptedAt: 1,
        activatedAt: 2,
        agreement: {
          type: 'license',
          terms: t,
          recordFingerprint: H('3'),
          agreementSalt: H('4'),
          agreementFingerprint: H('5'),
        },
      },
    ]),
  );

const ref: ReportRef = {
  inviteId: 'LI-1',
  periodFrom: '2026-07-01',
  periodTo: '2026-09-30',
  statementId: 's-1',
  currency: 'USD',
};
const job = { id: 'j' } as Job;

describe('the report step', () => {
  it('sends one signed report for the amount approved; a lost answer asks, and the retry sends no second', async () => {
    hold();
    loseAnswer = true;
    const first = await sendReport(job, ref, { quantity: '1000', amount: '100.00', currency: 'USD' });
    expect(first.kind).toBe('needsYou');
    expect(channel).toHaveLength(1);
    const again = await sendReport(job, ref, { quantity: '1000', amount: '100.00', currency: 'USD' });
    expect(again).toEqual({ kind: 'done', note: 'already' });
    expect(channel).toHaveLength(1);
  });

  it('never signs an amount or currency other than what Approve showed', async () => {
    hold();
    expect(await sendReport(job, ref, { quantity: '1000', amount: '99.00', currency: 'USD' })).toEqual({
      kind: 'failed',
      why: 'amount:USD 100.00',
    });
    expect(await sendReport(job, ref, { quantity: '1000', amount: '100.00', currency: 'EUR' })).toEqual({
      kind: 'failed',
      why: 'amount:USD 100.00',
    });
    expect(channel).toEqual([]);
  });
});

describe('the amount approved (review S5)', () => {
  it('includes the top-up to the yearly minimum, counting the reports before it in the job', () => {
    hold(terms({ yearlyMinimum: '500', reporting: { every: 'half', reportDueDays: 30, paymentDueDays: 15 } }));
    const minimum = { yearFrom: '2026-01-01', yearTo: '2026-12-31', owedBefore: '0.00', minimum: '500.00' };
    const refs: ReportRef[] = [
      { ...ref, periodFrom: '2026-01-01', periodTo: '2026-06-30', statementId: 'a' },
      { ...ref, periodFrom: '2026-07-01', periodTo: '2026-12-31', statementId: 'b', minimum },
    ];
    const amounts = reportAmounts({
      refs: { reports: refs },
      figures: { report0: { quantity: '1000' }, report1: { quantity: '2000' } },
    });
    // 100 + 200 owed by royalty; the year's last report tops up to 500.
    expect(amounts.map((a) => [a?.amount, a?.topUp])).toEqual([
      ['100.00', '0.00'],
      ['400.00', '200.00'],
    ]);
  });
});
