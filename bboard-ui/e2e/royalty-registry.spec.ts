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
//   - the licensee's page registers its report there (with the due date from the terms); a notice
//     of breach about another deal message, or one dated before the due date, is refused, and a
//     stranger's line about the statement on their own record is refused (review round 3, B2, L1);
//   - R5-5 (review round 5, B1), on a second practice deal: a licensee page that registers a later
//     due date than the terms say, now passed. The licensor's page dates the line from the day
//     after it, says the dates differ, and the notice of breach is filed.
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
// One vault key for the holder's records in every test: the registry refuses a record sealed under
// another vault key than the holder's others (DIFFERENT_VAULT_KEY).
const VAULT = newVaultKey();
const HOLDER = randomBytes(32).toString('hex');
const RECORD = `VEIL-${randomBytes(16).toString('hex').toUpperCase()}`;
const LICENSE = 'LIC-E2E-REG';
// The e2e fixture's practice deals (src/e2e-fixtures/RoyaltyPayFixture.tsx): `a`, and `b` (`deal=b`).
type Deal = { issuer: string; licensee: string; commitment: string; record: string };
const DEAL_A: Deal = {
  issuer: '1a'.repeat(32),
  licensee: '2b'.repeat(32),
  commitment: '3c'.repeat(32),
  record: '4d'.repeat(32),
};
const DEAL_B: Deal = {
  issuer: '1b'.repeat(32),
  licensee: '2c'.repeat(32),
  commitment: '3d'.repeat(32),
  record: '4e'.repeat(32),
};
const ISSUER_SECRET = DEAL_A.issuer;
const IDENTITY = '5e'.repeat(32);
const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');
const publicOf = (secret: string) => hex(ed25519.getPublicKey(Buffer.from(secret, 'hex')));
const utc = (ms: number) => new Date(ms).toISOString().slice(0, 10);
/** A line signed as the site's license-notices.ts lineSignature signs it, with `secret`. */
const signedLine = (secret: string, recordId: string, line: Record<string, string>) => ({
  ...line,
  signature: hex(
    ed25519.sign(
      new TextEncoder().encode(`veilcore/license-line/v1\n${canonicalise({ ...line, recordId })}`),
      Buffer.from(secret, 'hex'),
    ),
  ),
});
const refOf = (fp: string) =>
  createHash('sha256').update(`veilcore/license-notice/v2\n${fp}`).digest('hex').slice(0, 32);

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
const seedRegistry = async (vault: string, deal: Deal = DEAL_A, recordId = RECORD) => {
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
    [sealedRecordRow({ id: recordId, ...committed, recordFingerprint }, vault)],
    HOLDER,
  );
  expect(saved.status, JSON.stringify(saved.json)).toBe(200);
  expect(saved.json.rejected ?? [], JSON.stringify(saved.json)).toEqual([]);
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
  const licenseeNonce = publicOf(deal.licensee);
  const commitHash = createHash('sha256')
    .update(Buffer.from(deal.commitment + deal.record + licenseeNonce, 'hex'))
    .digest('hex');
  expect((await call('POST', `/license-invites/${id}/accept`, { commitHash, token: accept })).status).toBe(200);
  expect(
    (await call('POST', `/license-invites/${id}/nonce`, { issuerNonce: publicOf(deal.issuer), token: issuer })).status,
  ).toBe(200);
  expect(
    (
      await call('POST', `/license-invites/${id}/reveal`, {
        commitment: deal.commitment,
        issuerRecord: deal.record,
        licenseeNonce,
        token: accept,
      })
    ).status,
  ).toBe(200);
  // The channel's id and token, as deal.ts dealKeys makes them.
  const shared = x25519.getSharedSecret(
    ed25519.utils.toMontgomerySecret(Buffer.from(deal.issuer, 'hex')),
    ed25519.utils.toMontgomery(Buffer.from(licenseeNonce, 'hex')),
  );
  const okm = hkdf(
    sha256,
    shared,
    sha256(Buffer.from(deal.commitment + deal.record, 'hex')),
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

/** The licensor's license on deal `deal`, live since 200 days ago, as the license page reads it. */
const licenseFor = (id: string, recordId: string, deal: Deal, terms: unknown) => {
  const t0 = Date.now() - 200 * DAY;
  return {
    id,
    type: 'license',
    recordId,
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
      issuerNonce: publicOf(deal.issuer),
      partySecret: deal.issuer,
      termsSentAt: t0,
      commitment: deal.commitment,
      issuerRecord: deal.record,
      licenseeNonce: publicOf(deal.licensee),
      issueTx: 'e2e-issue',
      issuedAt: t0,
      activateTx: 'e2e-activate',
      activatedAt: t0,
    },
  };
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
  recordId = RECORD,
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
      recordId,
      JSON.stringify({
        recordId,
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
    const vault = VAULT;
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
    const license = licenseFor(LICENSE, RECORD, DEAL_A, terms);
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
    const statement = await statementOf(ref);
    const early = await call(
      'PUT',
      `/api/records/${RECORD}/license-notices/${ref}`,
      // The statement's fingerprint is what the ref is made from; the registry checks it, and the
      // licensor's signature with the deal's key.
      signedLine(ISSUER_SECRET, RECORD, { kind: 'revoked', reason: 'non-payment', on: today, statement }),
      HOLDER,
    );
    expect(early.status, JSON.stringify(early.json)).toBe(409);
    expect(early.json.code).toBe('cure-not-over');
    expect((await verify()).licenseNotices).toMatchObject([{ kind: 'overdue' }]);

    // B2: the licensee's page registered the report, with the due date from the terms; the notice
    // of breach was filed after it. Another deal message (the licensor's own payout, say) was
    // never registered: no notice of breach about it. One dated on or before the due date: refused.
    const reg = (await call('GET', `/license-answers/${statement}`)).json.registered as { dueOn: string; on: string };
    expect(reg.dueOn < today).toBe(true);
    const others = (await dealMessages()).filter((f) => f !== statement);
    expect(others.length).toBeGreaterThan(0);
    const P1 = await call(
      'PUT',
      `/api/records/${RECORD}/license-notices/${refOf(others[0])}`,
      signedLine(ISSUER_SECRET, RECORD, { kind: 'breach', since: today, statement: others[0] }),
      HOLDER,
    );
    expect([P1.status, P1.json.code]).toEqual([409, 'not-registered']);
    // L1: a stranger who learned the fingerprint, on their own record: refused.
    const stranger = randomBytes(32).toString('hex');
    const strangerRecord = `VEIL-${randomBytes(16).toString('hex').toUpperCase()}`;
    await saveRecord(strangerRecord, stranger, vault);
    const P2 = await call(
      'PUT',
      `/api/records/${strangerRecord}/license-notices/${ref}`,
      signedLine(randomBytes(32).toString('hex'), strangerRecord, { kind: 'overdue', since: today, statement }),
      stranger,
    );
    expect([P2.status, P2.json.code]).toEqual([403, 'not-licensor']);
    expect((await call('GET', `/license-answers/${statement}`)).json.lines).toMatchObject([
      { kind: 'overdue', breachNoticeOn: today },
    ]);

    // The licensee disputes it: signed, filed at the registry in their own name, beside the line.
    await licensee.reload();
    const lAlert = licensee.locator('[data-payment-alert="overdue"]');
    await expect(lAlert).toHaveAttribute('data-cure', 'running', { timeout: 90_000 });
    await expect(lAlert.locator(`[data-cure-by="${cureBy}"]`)).toBeVisible();
    // The licensee's page shows what the public page says, with the day of the notice of breach.
    await expect(licensee.locator(`[data-licensee-line="overdue"] [data-line-breach="${today}"]`)).toBeVisible();
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

  test('R5-5: a licensee page that registers a later due date than the terms can’t keep the licensor’s line off (B1)', async ({
    browser,
  }) => {
    test.setTimeout(300_000);
    await setClock(0);
    const vault = VAULT;
    const recordB = `VEIL-${randomBytes(16).toString('hex').toUpperCase()}`;
    await seedRegistry(vault, DEAL_B, recordB);
    const today = utc(Date.now());
    // The fixture's report is due 20 days ago by the terms; this licensee's page registers it as
    // due 5 days ago instead (a modified client: the registration is re-signed with its deal key).
    const later = utc(Date.now() - 5 * DAY);
    const licensee = await browser.newPage();
    const licenseeErrors = watch(licensee);
    await licensee.addInitScript((h) => {
      localStorage.setItem('veilcore.holder.v1', h);
      localStorage.setItem('veilcore.lang', 'en');
    }, '2d'.repeat(32));
    await isolate(licensee);
    await licensee.route(`${API}/license-answers`, async (route) => {
      const body = JSON.parse(route.request().postData() ?? '{}') as { answer?: Record<string, unknown> };
      if (route.request().method() !== 'POST' || body.answer?.type !== 'statement') return route.continue();
      const answer = { ...body.answer, dueOn: later };
      const signature = hex(
        ed25519.sign(
          new TextEncoder().encode(`veilcore/license-answer/v1\n${canonicalise(answer)}`),
          Buffer.from(DEAL_B.licensee, 'hex'),
        ),
      );
      return route.continue({ postData: JSON.stringify({ answer, signature }) });
    });
    await licensee.goto('/e2e/royalty-pay?side=licensee&scenario=overdue&deal=b');
    await expect(licensee.locator('[data-payment-alert="overdue"]')).toBeVisible({ timeout: 90_000 });
    const terms = (await licensee.evaluate(() => (window as unknown as { __e2eTerms: unknown }).__e2eTerms)) as {
      startDate: string;
    };
    // The registry holds the later date for the report.
    let statement = '';
    await expect
      .poll(
        async () => {
          for (const fp of await dealMessages(DEAL_B)) {
            const r = (await call('GET', `/license-answers/${fp}`)).json.registered as { dueOn?: string } | undefined;
            if (r?.dueOn) {
              statement = fp;
              return r.dueOn;
            }
          }
          return '';
        },
        { timeout: 60_000 },
      )
      .toBe(later);
    await licensee.close();

    // The licensor's page dates the line from the day after the registered date, says the dates
    // differ, and the notice of breach is filed.
    const rows = [sealedLicenseRow(licenseFor('LIC-E2E-REG-B', recordB, DEAL_B, terms), vault)];
    const a = await licensorDevice(browser, vault, () => rows, undefined, recordB);
    await a.page.goto('/license/LIC-E2E-REG-B');
    const alert = a.page.locator('[data-payment-alert="overdue"]');
    await expect(alert).toHaveAttribute('data-cure', 'no-notice', { timeout: 90_000 });
    await expect(a.page.locator('[data-public-notice="shown"]')).toBeVisible({ timeout: 30_000 });
    await expect(alert.locator(`[data-due-differs="${later}"]`)).toBeVisible();
    const dayAfter = utc(Date.parse(`${later}T00:00:00Z`) + DAY);
    const onRecord = async () => (await call('GET', `/verify/${recordB}`)).json.licenseNotices;
    expect(await onRecord()).toMatchObject([{ kind: 'overdue', since: dayAfter }]);
    await a.page.getByRole('button', { name: 'Send a notice of breach' }).click();
    await a.page.locator('[data-confirm-inline] button').first().click();
    await expect(alert).toHaveAttribute('data-cure', 'running', { timeout: 30_000 });
    await expect(a.page.locator(`[data-public-breach="${today}"]`)).toBeVisible({ timeout: 30_000 });
    await expect(alert.locator('[data-breach-held]')).toHaveCount(0);
    expect(await onRecord()).toMatchObject([{ kind: 'overdue', since: dayAfter, breachNoticeOn: today }]);
    expect((await call('GET', `/license-answers/${statement}`)).json.lines).toMatchObject([
      { since: dayAfter, breachNoticeOn: today },
    ]);
    expectNoErrors([...a.errors, ...licenseeErrors]);
  });
});

/**
 * The statement fingerprint behind a line's reference: the deal message whose fingerprint makes
 * it (a modified licensor client has the deal, so it knows this too). Found by trying the deal's
 * messages, read with the fixture deal's token.
 */
const dealMessages = async (deal: Deal = DEAL_A): Promise<string[]> => {
  const licenseeNonce = publicOf(deal.licensee);
  const shared = x25519.getSharedSecret(
    ed25519.utils.toMontgomerySecret(Buffer.from(deal.issuer, 'hex')),
    ed25519.utils.toMontgomery(Buffer.from(licenseeNonce, 'hex')),
  );
  const okm = hkdf(
    sha256,
    shared,
    sha256(Buffer.from(deal.commitment + deal.record, 'hex')),
    new TextEncoder().encode('veilcore/deal/v1'),
    64,
  );
  const dealId = hex(okm.slice(32, 48));
  const token = Buffer.from(okm.slice(48, 64)).toString('base64url');
  const r = await call('POST', `/deals/${dealId}/read`, { token, after: 0 });
  return ((r.json.messages ?? []) as { fingerprint: string }[]).map((m) => m.fingerprint);
};
const statementOf = async (ref: string): Promise<string> => {
  const fp = (await dealMessages()).find((f) => refOf(f) === ref);
  expect(fp, 'a deal message makes the line’s reference').toBeTruthy();
  return fp!;
};

/** A record saved under `holder` (someone else's, for the stranger's probe). */
const saveRecord = async (id: string, holder: string, vault: string) => {
  const committed = {
    breedingMethod: '',
    bredBy: 'Someone Else',
    dateCreated: '2026-01-01',
    loggedAt: Date.now() - 100 * DAY,
    nonce: randomBytes(16).toString('hex'),
    notes: '',
    parents: [],
    photoFingerprints: [],
    refId: '',
    strainName: 'Other Plant',
  };
  const recordFingerprint = createHash('sha256').update(canonicalise(committed)).digest('hex');
  const saved = await call(
    'PUT',
    '/api/records',
    [sealedRecordRow({ id, ...committed, recordFingerprint }, vault)],
    holder,
  );
  expect(saved.status, JSON.stringify(saved.json)).toBe(200);
};
