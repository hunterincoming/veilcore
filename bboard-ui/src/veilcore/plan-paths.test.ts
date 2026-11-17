// Paid plans on the paths that add a record without the new-record form (billing.ts planGate):
//   - a record's one correction doesn't count; a correction of a correction past the free
//     number is refused before anything is sealed;
//   - an import that would pass the free number is refused whole, nothing stored or sent;
//   - a plan read for one key never applies after the key changes;
//   - the plan unknown (unreachable) refuses a new record; plans off at the registry never do.
// Against the in-memory registry (fixtures/fake-registry.ts), with the plan answered here.
// SPDX-License-Identifier: Apache-2.0

import { randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRegistry, type FakeRegistry } from './fixtures/fake-registry';
import { browser, fileOf, installStorage, type Browser } from './fixtures/browsers';
import { stubWebLocks } from './fixtures/web-locks';

vi.mock('../config/network', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../config/network')>()),
  PAID_PLANS_ENABLED: true,
}));

let reg: FakeRegistry;
let cap = 25;
let planAnswer: 'ok' | 'off' | 'down' = 'ok';
const planCalls: string[] = [];

beforeEach(() => {
  vi.unstubAllGlobals();
  installStorage();
  reg = fakeRegistry();
  cap = 25;
  planAnswer = 'ok';
  planCalls.length = 0;
  vi.stubGlobal('fetch', (url: string | URL, init?: RequestInit) => {
    if (String(url).endsWith('/api/billing/plan')) {
      planCalls.push(String((init?.headers as Record<string, string>)['x-holder-key']));
      if (planAnswer === 'down') return Promise.reject(new TypeError('offline'));
      if (planAnswer === 'off')
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'paid plans are not switched on' }), { status: 404 }),
        );
      const body = { plan: 'free', status: null, periodEnd: null, recordsHeld: 1, recordsCounted: 1, recordCap: cap };
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }),
      );
    }
    return reg.fetch(url, init);
  });
  stubWebLocks();
  (globalThis as { document?: unknown }).document ??= {
    visibilityState: 'visible',
    createElement: () => ({ click() {} }),
  };
});

const pup = async (b: Browser) =>
  b.run(async () => {
    const fields: Record<string, unknown> = {
      nonce: b.m.commitment.newNonce(),
      strainName: 'Plan test',
      bredBy: 'Test',
      dateCreated: '2026-11-01',
      notes: '',
      loggedAt: Date.UTC(2026, 10, 1),
      refId: '',
    };
    return {
      id: `VEIL-${randomBytes(16).toString('hex').toUpperCase()}`,
      ...fields,
      recordFingerprint: await b.m.commitment.fingerprintRecord(fields as never),
      licenseIds: [],
    };
  });

/** Browser A with one record saved and its vault key in a checked backup. */
const saved = async () => {
  const A = await browser('A');
  const rec = await pup(A);
  let backup = '';
  await A.run(async () => {
    A.m.holder.holderKey();
    A.m.vault.mintVault();
    A.m.vault.markVaultBackedUp();
    await A.m.records.createRecordSaved(rec as never);
    backup = JSON.stringify(A.m.backup.backupContents());
    await A.m.backup.checkBackup(fileOf(backup));
  });
  return { A, rec };
};

describe('the free number on other ways of adding a record', () => {
  it("a record's one correction is made at the free number; a correction of it is refused first", async () => {
    const { A, rec } = await saved();
    cap = 1;
    await A.run(() => A.m.billing.refreshPlan());
    const first = await A.run(() => A.m.records.issueCorrection(rec.id, { notes: 'fixed' }, 'typo')).catch(
      (e: unknown) => e,
    );
    expect((first as { key?: string })?.key).not.toBe('app.plan.full');
    const corrected = await A.run(() => A.m.records.getRecord(rec.id)?.supersededBy);
    expect(corrected).toBeTruthy();
    const before = reg.sent.length;
    const err = await A.run(() =>
      A.m.records.issueCorrection(corrected as string, { notes: 'fixed again' }, 'typo'),
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(A.m.records.CorrectionRefused);
    expect((err as { key: string }).key).toBe('app.plan.full');
    expect(reg.sent.slice(before).filter((s) => s.method === 'PUT')).toHaveLength(0);
  });

  it('an import past the free number is refused whole; nothing is stored or sent', async () => {
    const { A } = await saved();
    const rows = await A.run(() => A.m.records.recordsForBackup());
    const B = await browser('B');
    cap = 0;
    await B.run(async () => {
      B.m.holder.holderKey();
      B.m.vault.mintVault();
      await B.m.billing.refreshPlan();
    });
    const before = reg.sent.length;
    const err = await B.run(() => B.m.records.importRecordRows(rows)).catch((e: unknown) => e);
    expect(String(err)).toMatch(/Nothing was imported/);
    expect(reg.sent.slice(before).filter((s) => s.method === 'PUT')).toHaveLength(0);
    expect(await B.run(() => B.m.records.getRecord(rows[0].id))).toBeUndefined();
  });

  it('a plan read for one key does not apply after the key changes', async () => {
    const A = await browser('K');
    await A.run(async () => {
      A.m.holder.holderKey();
      cap = 0;
      await A.m.billing.refreshPlan();
      expect(A.m.billing.planGate(1, 0)).toBe('app.plan.full');
      A.m.holder.setHolderKey('ab'.repeat(32));
      // Another key: what was read no longer applies; unknown, so a new record waits for it.
      expect(A.m.billing.currentPlan()).toBeNull();
      cap = 5;
      expect(A.m.billing.planGate(1, 0)).toBe('app.plan.unknown');
      await A.m.billing.readPlan();
      expect(A.m.billing.currentPlan()?.recordCap).toBe(5);
      expect(A.m.billing.planGate(1, 0)).toBeNull();
    });
    expect(planCalls.at(-1)).toBe('ab'.repeat(32));
  });

  it('the plan unknown (VeilCore unreachable): no new record is made, and it says why', async () => {
    const A = await browser('U');
    planAnswer = 'down';
    const err = await A.run(async () => {
      A.m.holder.holderKey();
      A.m.vault.mintVault();
      return A.m.records.createRecordSaved((await pup(A)) as never).catch((e: unknown) => e);
    });
    expect(String(err)).toMatch(/couldn’t check your plan/);
    expect(await A.run(() => A.m.records.allRecords().length)).toBe(0);
  });

  it('paid plans off at the registry: never blocks', async () => {
    const A = await browser('O');
    planAnswer = 'off';
    await A.run(async () => {
      A.m.holder.holderKey();
      await A.m.billing.readPlan();
      expect(A.m.billing.planGate(1000, 0)).toBeNull();
    });
  });

  it('loading the records reads the plan, so it is known before the first new record', async () => {
    const { A } = await saved();
    planCalls.length = 0;
    await A.run(() => A.m.records.hydrate());
    await A.run(() => new Promise((r) => setTimeout(r, 20)));
    expect(planCalls.length).toBeGreaterThan(0);
    expect(await A.run(() => A.m.billing.currentPlan())).not.toBeNull();
  });
});
