// Revoking a license with a royalty overdue, on the REAL license page (/license/:id:
// LicenseDetail, RealLicensePanel, RoyaltyLedger), and what the record's public check page says
// afterwards (docs/royalty-pay.md, "Overdue, notice, cure, revoke"):
//   - revoked for non-payment from a second device: the overdue line the first device put up is
//     replaced by the revoked line, and the first device, opened again, agrees;
//   - revoked for non-payment while the registry's notices were down, then the browser's storage
//     cleared and the license opened again from the registry's copy: the stuck overdue line
//     comes off and the revoked line goes up;
//   - a plain "Revoke": the overdue line comes off, and nothing about payment is said.
// What is public is worked out from the deal's signed messages and the chain, never from a flag
// one browser kept. Midnight's two steps the page takes here (reading the license's state, and
// the revocation) are stood in for in the e2e build only (src/veilcore/chain/e2e-chain.ts); the
// deal, the notices and the sealed license go through a stand-in registry. The licensee's side
// is the e2e fixture page (it seeds the deal: the payout, an accepted report now overdue).
// Time to pay after the notice of breach is CURE_DAYS (30): the licensor's browser clock is
// moved past it. Screenshots to E2E_SHOTS (when set) as revoke-*.png. All practice data.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { ed25519 } from '@noble/curves/ed25519.js';
import {
  API,
  REAL_REGISTRY,
  expectNoErrors,
  holdVaultKey,
  isolate,
  json,
  newVaultKey,
  sealedLicenseRow,
  watch,
} from './helpers';

const RECORD = `VEIL-${'E2'.repeat(16)}`;
const HOLDER = 'ab'.repeat(32);
const LICENSE = 'LIC-E2E1';
// The e2e fixture's practice deal (src/e2e-fixtures/RoyaltyPayFixture.tsx).
const ISSUER_SECRET = '1a'.repeat(32);
const LICENSEE_SECRET = '2b'.repeat(32);
const COMMITMENT = '3c'.repeat(32);
const ISSUER_RECORD = '4d'.repeat(32);
const DAY = 86_400_000;
const SHOTS = process.env.E2E_SHOTS;
const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');
const publicOf = (secret: string) => hex(ed25519.getPublicKey(Buffer.from(secret, 'hex')));

test.use({ viewport: { width: 360, height: 780 } });

type Registry = {
  messages: { seq: number; iv: string; ct: string; receivedAt: number; fingerprint: string }[];
  notices: Record<string, unknown>[];
  noticesDown: boolean;
  licenseRows: Record<string, unknown>[];
};

/** The stand-in registry: records and licenses, the deal channel, the record's notices and its check page. */
const standIn = async (page: Page, state: Registry, original?: Record<string, unknown>[]) => {
  await isolate(page, {
    'GET /api/records': (route) => json(route, 200, []),
    'PUT /api/records': (route) => json(route, 200, { ok: true }),
    // `original`: this browser gets the copy from before the revocation (a save that didn't land).
    'GET /api/licenses': (route) => json(route, 200, original ?? state.licenseRows),
    'PUT /api/licenses': (route, _u, body) => {
      if (!original) state.licenseRows = body as Record<string, unknown>[];
      return json(route, 200, { ok: true });
    },
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
  });
  await page.route(`${API}/**`, async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const body = (() => {
      try {
        return JSON.parse(route.request().postData() ?? 'null') as Record<string, unknown>;
      } catch {
        return null;
      }
    })();
    if (method === 'POST' && url.pathname === '/deals') return json(route, 200, { ok: true });
    const m = /^\/deals\/([0-9a-f]{32})\/(messages|read)$/.exec(url.pathname);
    if (m && method === 'POST' && m[2] === 'messages') {
      const iv = String(body?.iv);
      const ct = String(body?.ct);
      const fingerprint = createHash('sha256').update(`${iv}.${ct}`).digest('hex');
      const seq = state.messages.length + 1;
      state.messages.push({ seq, iv, ct, receivedAt: Date.now(), fingerprint });
      return json(route, 200, { seq, fingerprint, receivedAt: Date.now() });
    }
    if (m && method === 'POST' && m[2] === 'read')
      return json(route, 200, { messages: state.messages.filter((x) => x.seq > Number(body?.after ?? 0)) });
    const n = /^\/api\/records\/([^/]+)\/license-notices\/([0-9a-f]{32})$/.exec(url.pathname);
    if (n && state.noticesDown) return json(route, 503, { error: 'down' });
    if (n && method === 'PUT') {
      state.notices = [...state.notices.filter((x) => x.ref !== n[2]), { ref: n[2], ...(body ?? {}) }];
      return json(route, 200, { ok: true });
    }
    if (n && method === 'DELETE') {
      state.notices = state.notices.filter((x) => x.ref !== n[2]);
      return json(route, 200, { removed: true });
    }
    if (method === 'GET' && url.pathname === `/verify/${RECORD}`) {
      if (state.noticesDown) return json(route, 503, { error: 'down' });
      return json(route, 200, {
        found: true,
        id: RECORD,
        recordFingerprint: '3f'.repeat(32),
        disclosed: ['own'],
        ...(state.notices.length ? { licenseNotices: state.notices, licenseNoticesBy: 'record-holder' } : {}),
      });
    }
    return route.fallback();
  });
};

/** The licensor's browser: holder key, a checked backup's vault key, the record's keys, and Midnight stood in. */
const licensorDevice = async (
  browser: Browser,
  state: Registry,
  vault: string,
  chain: 'ACTIVE' | 'none',
  opts: { clock?: number; original?: Record<string, unknown>[] } = {},
) => {
  const page = await browser.newPage();
  const errors = watch(page);
  if (opts.clock) await page.clock.setFixedTime(opts.clock);
  await page.addInitScript(
    ([holder, record, keys, status]) => {
      localStorage.setItem('veilcore.holder.v1', holder);
      localStorage.setItem('veilcore.lang', 'en');
      localStorage.setItem('veilcore.role.v1', 'breeder');
      if (!localStorage.getItem('veilcore.record-keys.v1'))
        localStorage.setItem('veilcore.record-keys.v1', JSON.stringify({ [record]: JSON.parse(keys) }));
      let now = status;
      (window as unknown as { __veilcoreE2EChain: unknown }).__veilcoreE2EChain = {
        status: () => now,
        revoke: () => {
          now = 'none';
          return { txId: `e2e-revoke-${Date.now()}`, blockTime: Date.now() };
        },
      };
    },
    [
      HOLDER,
      RECORD,
      JSON.stringify({
        recordId: RECORD,
        recordSecret: '7e'.repeat(32),
        recoverySecret: '8f'.repeat(32),
        createdAt: Date.now() - 300 * DAY,
        backedUpAt: Date.now() - 300 * DAY,
        anchor: {
          identity: '5e'.repeat(32),
          network: 'preview',
          contractAddress: '00'.repeat(32),
          txId: 'e2e-anchor',
          txHash: 'e2e-anchor',
          blockHeight: 1,
          anchoredAt: Date.now() - 300 * DAY,
        },
      }),
      chain,
    ] as const,
  );
  await holdVaultKey(page, vault);
  await standIn(page, state, opts.original);
  return { page, errors };
};

/** The deal seeded by the licensee's page, and the license the licensor's page opens, sealed at the registry. */
const setUp = async (browser: Browser) => {
  const state: Registry = { messages: [], notices: [], noticesDown: false, licenseRows: [] };
  const vault = newVaultKey();
  const licensee = await browser.newPage();
  const licenseeErrors = watch(licensee);
  await licensee.addInitScript((h) => {
    localStorage.setItem('veilcore.holder.v1', h);
    localStorage.setItem('veilcore.lang', 'en');
  }, '2c'.repeat(32));
  await standIn(licensee, state);
  await licensee.goto('/e2e/royalty-pay?side=licensee&scenario=overdue');
  await expect(licensee.locator('[data-payment-alert="overdue"]')).toBeVisible({ timeout: 60_000 });
  const terms = await licensee.evaluate(() => (window as unknown as { __e2eTerms: unknown }).__e2eTerms);
  const t0 = Date.now() - 200 * DAY;
  const license = {
    id: LICENSE,
    type: 'license',
    recordId: RECORD,
    recordFingerprint: '3f'.repeat(32),
    terms,
    agreementFingerprint: '5a'.repeat(32),
    agreementSalt: '6b'.repeat(16),
    state: 'active',
    createdAt: t0,
    royaltyLog: [],
    onChain: {
      inviteId: 'e2e-invite-1',
      acceptToken: 'e2e-accept',
      issuerToken: 'e2e-issuer',
      identity: '5e'.repeat(32),
      label: 'Practice Grower',
      invitedAt: t0,
      issuerNonce: publicOf(ISSUER_SECRET),
      partySecret: ISSUER_SECRET,
      termsSentAt: t0,
      commitment: COMMITMENT,
      issuerRecord: ISSUER_RECORD,
      licenseeNonce: publicOf(LICENSEE_SECRET),
      issueTx: 'e2e-issue',
      issuedAt: t0,
      activateTx: 'e2e-activate',
      activatedAt: t0,
    },
  };
  state.licenseRows = [sealedLicenseRow(license, vault)];
  const original = structuredClone(state.licenseRows);
  return { state, vault, licensee, licenseeErrors, original };
};

const shot = async (page: Page, name: string) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `revoke-${name}.png`), fullPage: true });
};

/** On the real license page, live: the overdue line goes up, then the notice of breach. Returns the day the cure period ends. */
const overdueThenBreach = async (page: Page, state: Registry): Promise<string> => {
  await page.goto(`/license/${LICENSE}`);
  await expect(page.locator('[data-license-live]')).toBeVisible({ timeout: 90_000 });
  const alert = page.locator('[data-payment-alert="overdue"]');
  await expect(alert).toHaveAttribute('data-cure', 'no-notice', { timeout: 60_000 });
  await expect(page.locator('[data-public-notice="shown"]')).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => state.notices.map((n) => n.kind)).toEqual(['overdue']);
  await expect(page.getByRole('button', { name: 'Revoke for non-payment' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Send a notice of breach' }).click();
  await page.locator('[data-confirm-inline] button').first().click();
  await expect(alert).toHaveAttribute('data-cure', 'running', { timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Revoke for non-payment' })).toHaveCount(0);
  return (await alert.locator('[data-cure-by]').getAttribute('data-cure-by'))!;
};

/** The day after the cure period ends, in the licensor's browser. */
const afterCure = (cureBy: string) => Date.parse(`${cureBy}T00:00:00Z`) + DAY + 3_600_000;

const revokeForNonPayment = async (page: Page) => {
  await expect(page.locator('[data-payment-alert="overdue"]')).toHaveAttribute('data-cure', 'over', {
    timeout: 90_000,
  });
  await page.getByRole('button', { name: 'Revoke for non-payment' }).click();
  await expect(page.locator('[data-confirm-inline]')).toContainText('can’t be undone');
  await shot(page, 'confirm');
  await page.locator('[data-confirm-inline] button').first().click();
  await expect(page.locator('[data-license-gone="non-payment"]')).toBeVisible({ timeout: 60_000 });
};

const publicPage = async (browser: Browser, state: Registry) => {
  const visitor = await browser.newPage();
  const errors = watch(visitor);
  await visitor.addInitScript(() => localStorage.setItem('veilcore.lang', 'en'));
  await standIn(visitor, state);
  await visitor.goto(`/verify/${RECORD}`);
  return { visitor, errors };
};

test.describe('revoking on the real license page: the public check page follows the deal, on any device', () => {
  test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

  test('revoked for non-payment from a second device: the overdue line becomes the revoked line', async ({
    browser,
  }) => {
    test.setTimeout(360_000);
    const { state, vault, licensee, licenseeErrors } = await setUp(browser);
    const a = await licensorDevice(browser, state, vault, 'ACTIVE');
    const cureBy = await overdueThenBreach(a.page, state);
    await a.page.close();

    // A second device, after the cure period: the license page offers the revoke, and does it.
    const b = await licensorDevice(browser, state, vault, 'ACTIVE', { clock: afterCure(cureBy) });
    await b.page.goto(`/license/${LICENSE}`);
    await revokeForNonPayment(b.page);
    await expect.poll(() => state.notices.map((n) => n.kind), { timeout: 30_000 }).toEqual(['revoked']);
    await shot(b.page, 'second-device');

    // The licensee holds the signed word that it was revoked for non-payment.
    await licensee.clock.setFixedTime(afterCure(cureBy));
    await licensee.reload();
    await expect(licensee.locator('[data-notice="revoked"]')).toBeVisible({ timeout: 60_000 });

    // The first device, opened again: it reads the license gone, says why from the deal, and
    // changes nothing public.
    const again = await licensorDevice(browser, state, vault, 'none', { clock: afterCure(cureBy) + DAY });
    await again.page.goto(`/license/${LICENSE}`);
    await expect(again.page.locator('[data-license-gone="non-payment"]')).toBeVisible({ timeout: 90_000 });
    await expect.poll(() => state.notices.map((n) => n.kind)).toEqual(['revoked']);

    const { visitor, errors } = await publicPage(browser, state);
    await expect(visitor.locator('[data-license-notice="revoked"]')).toContainText('for non-payment');
    await expect(visitor.locator('[data-license-notice="overdue"]')).toHaveCount(0);
    expectNoErrors([...a.errors, ...b.errors, ...again.errors, ...errors, ...licenseeErrors]);
  });

  test('revoked while the notices were down, then the browser cleared: the stuck line is put right', async ({
    browser,
  }) => {
    test.setTimeout(360_000);
    const { state, vault, original } = await setUp(browser);
    const a = await licensorDevice(browser, state, vault, 'ACTIVE');
    const cureBy = await overdueThenBreach(a.page, state);
    await a.page.close();

    // Revoked for non-payment while the registry's notices are down: the public page is stuck
    // on the overdue line.
    const b = await licensorDevice(browser, state, vault, 'ACTIVE', { clock: afterCure(cureBy) });
    await b.page.goto(`/license/${LICENSE}`);
    await expect(b.page.locator('[data-payment-alert="overdue"]')).toHaveAttribute('data-cure', 'over', {
      timeout: 90_000,
    });
    state.noticesDown = true;
    await revokeForNonPayment(b.page);
    await b.page.close();
    state.noticesDown = false;
    expect(state.notices.map((n) => n.kind)).toEqual(['overdue']);

    // The same licensor, storage cleared and their keys back (as from a backup): the license as
    // the registry had it before the revocation (no revocation, no reason on it).
    const c = await licensorDevice(browser, state, vault, 'none', { clock: afterCure(cureBy), original });
    await c.page.goto(`/license/${LICENSE}`);
    await expect(c.page.locator('[data-license-gone="non-payment"]')).toBeVisible({ timeout: 90_000 });
    await expect.poll(() => state.notices.map((n) => n.kind), { timeout: 30_000 }).toEqual(['revoked']);
    await shot(c.page, 'cleared');

    const { visitor, errors } = await publicPage(browser, state);
    await expect(visitor.locator('[data-license-notice="revoked"]')).toBeVisible();
    await expect(visitor.locator('[data-license-notice="overdue"]')).toHaveCount(0);
    expectNoErrors([...a.errors, ...c.errors, ...errors]);
  });

  test('a plain revoke: the overdue line comes off and nothing about payment is said', async ({ browser }) => {
    test.setTimeout(300_000);
    const { state, vault } = await setUp(browser);
    const a = await licensorDevice(browser, state, vault, 'ACTIVE');
    await a.page.goto(`/license/${LICENSE}`);
    await expect(a.page.locator('[data-public-notice="shown"]')).toBeVisible({ timeout: 90_000 });
    await expect.poll(() => state.notices.map((n) => n.kind)).toEqual(['overdue']);
    await a.page.getByRole('button', { name: 'Revoke on chain' }).click();
    await a.page.locator('[data-confirm-inline] input').fill('Ending the deal');
    await a.page.locator('[data-confirm-inline] button').first().click();
    await expect(a.page.locator('[data-license-gone=""]')).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => state.notices, { timeout: 30_000 }).toEqual([]);
    await shot(a.page, 'plain');

    const { visitor, errors } = await publicPage(browser, state);
    await expect(visitor.locator('[data-verify-result], main')).toBeVisible({ timeout: 30_000 });
    await expect(visitor.locator('[data-license-notices]')).toHaveCount(0);
    expectNoErrors([...a.errors, ...errors]);
  });
});
