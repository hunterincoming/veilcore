// Royalty notices against a REAL registry (E2E_API_BASE, started with VEILCORE_TEST_CLOCK=on and a
// fresh database; e2e/README.md), so the registry's own gates are what the browser meets, end to
// end (docs/royalty-pay.md, "Overdue, notice, cure, revoke"):
//   - the overdue line, then the notice of breach, dated by the registry;
//   - "revoked for non-payment" sent early, as a modified licensor client would: the registry
//     refuses it (409);
//   - the licensee's dispute, filed at the registry in their own name, beside the line;
//   - a licensor browser with its clock past the time to pay while the registry's clock is not:
//     nothing offered;
//   - the registry's clock moved past the time to pay (its test clock, never on a deployed
//     registry): revoke for non-payment on the real license page, the registry accepts the line,
//     and the public page shows it with the registry's date for the notice and the licensee's
//     answer beside it; the licensee's page shows it too.
// The deal channel, the notices, the answers and the check page are the real registry's. Only what
// the license page lists (records, licenses, deliveries) is stood in for, as in
// royalty-revoke.spec.ts, and Midnight's two steps (src/veilcore/chain/e2e-chain.ts). The licensee
// is the e2e fixture page (its practice deal keys are fixed, so the registry must be fresh).
// SPDX-License-Identifier: Apache-2.0
import { createHash, randomBytes } from 'node:crypto';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { canonicalise } from 'veilcore-records';
import {
  API,
  REAL_REGISTRY,
  expectNoErrors,
  holdVaultKey,
  isolate,
  json,
  newVaultKey,
  sealedLicenseRow,
  sealedRecordRow,
  watch,
} from './helpers';

const DAY = 86_400_000;
const HOLDER = randomBytes(32).toString('hex');
const RECORD = `VEIL-${randomBytes(16).toString('hex').toUpperCase()}`;
const LICENSE = 'LIC-E2E-REG';
// The e2e fixture's practice deal (src/e2e-fixtures/RoyaltyPayFixture.tsx).
const ISSUER_SECRET = '1a'.repeat(32);
const LICENSEE_SECRET = '2b'.repeat(32);
const COMMITMENT = '3c'.repeat(32);
const ISSUER_RECORD = '4d'.repeat(32);
const IDENTITY = '5e'.repeat(32);
const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');
const publicOf = (secret: string) => hex(ed25519.getPublicKey(Buffer.from(secret, 'hex')));
const utc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

test.use({ viewport: { width: 360, height: 780 } });

const call = async (method: string, path: string, body?: unknown, holder?: string) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(holder ? { 'x-holder-key': holder } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  let out: unknown;
  try {
    out = JSON.parse(text);
  } catch {
    out = text;
  }
  return { status: res.status, json: out as Record<string, unknown> };
};
const tokenHash = (t: string) => createHash('sha256').update(t, 'utf8').digest('hex');
const verify = async () => (await call('GET', `/verify/${RECORD}`)).json;
const setClock = async (offsetMs: number) => {
  const r = await call('POST', '/__test/clock', { offsetMs });
  expect(r.status, 'start the registry with VEILCORE_TEST_CLOCK=on (test only)').toBe(200);
};

/**
 * What the registry needs before the browsers start: the licensor's record under their holder key,
 * and the fixture deal's channel opened the way the site opens it (a license invite taken to the
 * reveal, with the two sides' deal keys as its nonces), so the registry holds the licensee's key.
 */
const seedRegistry = async (vault: string) => {
  const committed = {
    breedingMethod: '',
    bredBy: 'Hana Rivera',
    dateCreated: '2026-01-01',
    loggedAt: Date.now() - 300 * DAY,
    nonce: randomBytes(16).toString('hex'),
    notes: '',
    parents: [],
    photoFingerprints: [],
    refId: '',
    strainName: 'Practice Plant',
  };
  const recordFingerprint = createHash('sha256').update(canonicalise(committed)).digest('hex');
  const saved = await call(
    'PUT',
    '/api/records',
    [sealedRecordRow({ id: RECORD, ...committed, recordFingerprint }, vault)],
    HOLDER,
  );
  expect(saved.status, JSON.stringify(saved.json)).toBe(200);
  const accept = randomBytes(16).toString('base64url');
  const issuer = randomBytes(16).toString('base64url');
  const inv = await call('POST', '/license-invites', {
    identity: IDENTITY,
    label: 'Practice Grower',
    acceptTokenHash: tokenHash(accept),
    issuerTokenHash: tokenHash(issuer),
  });
  expect(inv.status, JSON.stringify(inv.json)).toBe(200);
  const id = String(inv.json.id);
  const licenseeNonce = publicOf(LICENSEE_SECRET);
  const commitHash = createHash('sha256')
    .update(Buffer.from(COMMITMENT + ISSUER_RECORD + licenseeNonce, 'hex'))
    .digest('hex');
  expect((await call('POST', `/license-invites/${id}/accept`, { commitHash, token: accept })).status).toBe(200);
  expect(
    (await call('POST', `/license-invites/${id}/nonce`, { issuerNonce: publicOf(ISSUER_SECRET), token: issuer }))
      .status,
  ).toBe(200);
  expect(
    (
      await call('POST', `/license-invites/${id}/reveal`, {
        commitment: COMMITMENT,
        issuerRecord: ISSUER_RECORD,
        licenseeNonce,
        token: accept,
      })
    ).status,
  ).toBe(200);
  // The channel's id and token, as deal.ts dealKeys makes them.
  const shared = x25519.getSharedSecret(
    ed25519.utils.toMontgomerySecret(Buffer.from(ISSUER_SECRET, 'hex')),
    ed25519.utils.toMontgomery(Buffer.from(licenseeNonce, 'hex')),
  );
  const okm = hkdf(
    sha256,
    shared,
    sha256(Buffer.from(COMMITMENT + ISSUER_RECORD, 'hex')),
    new TextEncoder().encode('veilcore/deal/v1'),
    64,
  );
  const dealId = hex(okm.slice(32, 48));
  const writeToken = Buffer.from(okm.slice(48, 64)).toString('base64url');
  const opened = await call('POST', '/deals', {
    dealId,
    writeTokenHash: tokenHash(writeToken),
    inviteId: id,
    token: issuer,
  });
  expect(
    opened.status,
    `${JSON.stringify(opened.json)} (the registry must be fresh: the fixture's deal keys are fixed)`,
  ).toBe(200);
  expect(opened.json.opened).toBe(true);
};

/** Only what the license page lists is stood in for; the deal, notices and answers are the real registry's. */
const listings = async (page: Page, rows: () => Record<string, unknown>[]) => {
  await isolate(page);
  await page.route(`${API}/api/records`, (route) =>
    route.request().method() === 'GET' ? json(route, 200, []) : json(route, 200, { ok: true }),
  );
  await page.route(`${API}/api/records?*`, (route) => json(route, 200, []));
  await page.route(`${API}/api/licenses*`, (route) =>
    route.request().method() === 'GET' ? json(route, 200, rows()) : json(route, 200, { ok: true }),
  );
  await page.route(`${API}/transfers/sent*`, (route) => json(route, 200, { transfers: [] }));
};

const licensorDevice = async (
  browser: Browser,
  vault: string,
  rows: () => Record<string, unknown>[],
  clock?: number,
) => {
  const page = await browser.newPage();
  const errors = watch(page);
  if (clock) await page.clock.setFixedTime(clock);
  await page.addInitScript(
    ([holder, record, keys]) => {
      localStorage.setItem('veilcore.holder.v1', holder);
      localStorage.setItem('veilcore.lang', 'en');
      localStorage.setItem('veilcore.role.v1', 'breeder');
      if (!localStorage.getItem('veilcore.record-keys.v1'))
        localStorage.setItem('veilcore.record-keys.v1', JSON.stringify({ [record]: JSON.parse(keys) as unknown }));
      let now = 'ACTIVE';
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
          identity: IDENTITY,
          network: 'preview',
          contractAddress: '00'.repeat(32),
          txId: 'e2e-anchor',
          txHash: 'e2e-anchor',
          blockHeight: 1,
          anchoredAt: Date.now() - 300 * DAY,
        },
      }),
    ] as const,
  );
  await holdVaultKey(page, vault);
  await listings(page, rows);
  return { page, errors };
};

test.describe('royalty notices against a real registry: its clock and its gates', () => {
  test.skip(!REAL_REGISTRY, 'needs a real registry: set E2E_API_BASE and build with it');
  test.afterAll(async () => {
    if (REAL_REGISTRY) await call('POST', '/__test/clock', { offsetMs: 0 });
  });

  test('breach, a refused early revoke, the licensee’s answer, the revoke after the cure period', async ({
    browser,
  }) => {
    test.setTimeout(420_000);
    await setClock(0);
    const vault = newVaultKey();
    await seedRegistry(vault);

    // The licensee's page seeds the deal through the registry: a payout, an accepted report now overdue.
    const licensee = await browser.newPage();
    const licenseeErrors = watch(licensee);
    await licensee.addInitScript((h) => {
      localStorage.setItem('veilcore.holder.v1', h);
      localStorage.setItem('veilcore.lang', 'en');
    }, '2c'.repeat(32));
    await isolate(licensee);
    await licensee.goto('/e2e/royalty-pay?side=licensee&scenario=overdue');
    await expect(licensee.locator('[data-payment-alert="overdue"]')).toBeVisible({ timeout: 90_000 });
    const terms = await licensee.evaluate(() => (window as unknown as { __e2eTerms: unknown }).__e2eTerms);
    const start = await licensee.locator('[data-e2e-start]').getAttribute('data-e2e-start');
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
        identity: IDENTITY,
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
    const rows = [sealedLicenseRow(license, vault)];

    // The licensor's license page: the overdue line goes up at the registry, then the notice of
    // breach, dated by the registry.
    const a = await licensorDevice(browser, vault, () => rows);
    await a.page.goto(`/license/${LICENSE}`);
    const alert = a.page.locator('[data-payment-alert="overdue"]');
    await expect(alert).toHaveAttribute('data-cure', 'no-notice', { timeout: 90_000 });
    await expect(a.page.locator('[data-public-notice="shown"]')).toBeVisible({ timeout: 30_000 });
    let v = await verify();
    expect((v.licenseNotices as { kind: string }[]).map((n) => n.kind)).toEqual(['overdue']);
    expect(v.licenseNoticesBy).toBe('record-holder');
    await a.page.getByRole('button', { name: 'Send a notice of breach' }).click();
    await a.page.locator('[data-confirm-inline] button').first().click();
    await expect(alert).toHaveAttribute('data-cure', 'running', { timeout: 30_000 });
    const today = utc(Date.now());
    await expect(a.page.locator(`[data-public-breach="${today}"]`)).toBeVisible({ timeout: 30_000 });
    const cureBy = (await alert.locator('[data-cure-by]').getAttribute('data-cure-by'))!;
    v = await verify();
    const line = (v.licenseNotices as Record<string, unknown>[])[0];
    expect(line).toMatchObject({ kind: 'overdue', breachNoticeOn: today });
    await a.page.close();

    // A modified licensor client sends "revoked for non-payment" now: the registry refuses it.
    const own = await call('GET', `/api/records/${RECORD}/license-notices`, undefined, HOLDER);
    expect(own.status).toBe(200);
    const ref = String(line.ref);
    const early = await call(
      'PUT',
      `/api/records/${RECORD}/license-notices/${ref}`,
      // The statement's fingerprint is what the ref is made from; the registry checks it.
      { kind: 'revoked', reason: 'non-payment', on: today, statement: await statementOf(ref) },
      HOLDER,
    );
    expect(early.status, JSON.stringify(early.json)).toBe(409);
    expect(early.json.code).toBe('cure-not-over');
    expect((await verify()).licenseNotices).toMatchObject([{ kind: 'overdue' }]);

    // The licensee disputes it: signed, filed at the registry in their own name, beside the line.
    await licensee.reload();
    const lAlert = licensee.locator('[data-payment-alert="overdue"]');
    await expect(lAlert).toHaveAttribute('data-cure', 'running', { timeout: 90_000 });
    await expect(lAlert.locator(`[data-cure-by="${cureBy}"]`)).toBeVisible();
    await lAlert.locator('[data-respond-dispute]').click();
    await licensee.locator('[data-dispute-note] textarea').first().fill('Paid by bank transfer on the due date.');
    await licensee.locator('[data-dispute-send]').click();
    await expect(lAlert.locator('[data-answer="filed"]')).toBeVisible({ timeout: 60_000 });
    expect((await verify()).licenseNotices).toMatchObject([
      { kind: 'overdue', answers: [{ type: 'disputed', on: today }] },
    ]);
    expect(JSON.stringify(await verify())).not.toContain('bank transfer');

    // A licensor browser 40 days past the time to pay, the registry's clock not: nothing offered.
    const afterCure = Date.parse(`${cureBy}T00:00:00Z`) + DAY + 3_600_000;
    const b = await licensorDevice(browser, vault, () => rows, afterCure + 40 * DAY);
    await b.page.goto(`/license/${LICENSE}`);
    await expect(b.page.locator('[data-public-notice="shown"]')).toBeVisible({ timeout: 90_000 });
    await expect(b.page.locator('[data-payment-alert="overdue"]')).toHaveAttribute('data-cure', 'running');
    await expect(b.page.getByRole('button', { name: 'Revoke for non-payment' })).toHaveCount(0);
    await b.page.close();

    // The registry's clock past the time to pay: the revoke is offered, done on the real license
    // page, and the registry accepts the line.
    await setClock(afterCure - Date.now());
    const c = await licensorDevice(browser, vault, () => rows, afterCure);
    await c.page.goto(`/license/${LICENSE}`);
    await expect(c.page.locator('[data-payment-alert="overdue"]')).toHaveAttribute('data-cure', 'over', {
      timeout: 90_000,
    });
    await c.page.getByRole('button', { name: 'Revoke for non-payment' }).click();
    await c.page.locator('[data-confirm-inline] button').first().click();
    await expect(c.page.locator('[data-license-gone="non-payment"]')).toBeVisible({ timeout: 60_000 });
    await expect(c.page.locator('[data-revoked-public="shown"]')).toBeVisible({ timeout: 60_000 });
    v = await verify();
    expect(v.licenseNotices).toMatchObject([
      {
        kind: 'revoked',
        reason: 'non-payment',
        on: utc(afterCure),
        breachNoticeOn: today,
        answers: [{ type: 'disputed', on: today }],
      },
    ]);
    expect(v.licenseAnswersBy).toBe('licensee');

    // The public check page, from the real registry.
    const visitor = await browser.newPage();
    const visitorErrors = watch(visitor);
    await visitor.addInitScript(() => localStorage.setItem('veilcore.lang', 'en'));
    await isolate(visitor);
    await visitor.goto(`/verify/${RECORD}`);
    const revoked = visitor.locator('[data-license-notice="revoked"]');
    await expect(revoked).toContainText('The record holder says a license from this record was revoked on', {
      timeout: 60_000,
    });
    await expect(revoked.locator('[data-license-notice-breach]')).toBeVisible();
    await expect(revoked.locator('[data-license-notice-answer="disputed"]')).toContainText(
      'The licensee disputes this',
    );
    await expect(visitor.locator('[data-license-notices]')).not.toContainText('bank transfer');

    // The licensee: the signed notice, and that the public page says so.
    await licensee.clock.setFixedTime(afterCure);
    await licensee.goto(`/e2e/royalty-pay?side=licensee&scenario=overdue&start=${start}`);
    const after = licensee.locator('[data-revoked-for-non-payment]');
    await expect(after).toBeVisible({ timeout: 90_000 });
    await expect(after.locator('[data-revoked-public="shown"]')).toBeVisible({ timeout: 30_000 });
    await expect(after.locator('[data-answer="filed"]')).toBeVisible();
    expectNoErrors([...a.errors, ...b.errors, ...c.errors, ...licenseeErrors, ...visitorErrors]);
  });
});

/**
 * The statement fingerprint behind a line's reference: the deal message whose fingerprint makes
 * it (a modified licensor client has the deal, so it knows this too). Found by trying the deal's
 * messages, read with the fixture deal's token.
 */
const statementOf = async (ref: string): Promise<string> => {
  const licenseeNonce = publicOf(LICENSEE_SECRET);
  const shared = x25519.getSharedSecret(
    ed25519.utils.toMontgomerySecret(Buffer.from(ISSUER_SECRET, 'hex')),
    ed25519.utils.toMontgomery(Buffer.from(licenseeNonce, 'hex')),
  );
  const okm = hkdf(
    sha256,
    shared,
    sha256(Buffer.from(COMMITMENT + ISSUER_RECORD, 'hex')),
    new TextEncoder().encode('veilcore/deal/v1'),
    64,
  );
  const dealId = hex(okm.slice(32, 48));
  const token = Buffer.from(okm.slice(48, 64)).toString('base64url');
  const r = await call('POST', `/deals/${dealId}/read`, { token, after: 0 });
  const messages = (r.json.messages ?? []) as { fingerprint: string }[];
  const fp = messages
    .map((m) => m.fingerprint)
    .find((f) => createHash('sha256').update(`veilcore/license-notice/v2\n${f}`).digest('hex').slice(0, 32) === ref);
  expect(fp, 'a deal message makes the line’s reference').toBeTruthy();
  return fp!;
};
