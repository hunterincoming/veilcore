// A document record, in the browser against the stand-in registry (docs/document-profile.md):
// from the first screen to "Seal a document", pick two files (hashed in the browser, never
// sent), seal it, see its page, compare the same file and a different one, copy the check link,
// and open it as a stranger would: the proof code is recomputed from the link, the file is
// compared byte for byte, and with nothing dating it the page says not to rely on it. A changed
// link recomputes to another proof code. All files and records are test data.
// SPDX-License-Identifier: Apache-2.0
import { createHash, randomBytes } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import {
  REAL_REGISTRY,
  expectNoErrors,
  holdVaultKey,
  isolate,
  json,
  newVaultKey,
  plainRowRefusal,
  watch,
} from './helpers';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

type Rec = Record<string, unknown> & { id: string; recordFingerprint: string };
const HOLDER = randomBytes(32).toString('hex');
const VAULT = newVaultKey();
const PERMIT = Buffer.from(`Practice permit (test data) ${Date.now()}\n`);
const ANNEX = Buffer.from(`Practice annex (test data) ${Date.now()}\n`);
const OTHER = Buffer.from(`Not the permit (test data) ${Date.now()}\n`);
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');

const standIn = async (page: Page) => {
  const held: { records: Rec[] } = { records: [] };
  await page.addInitScript((holder) => {
    localStorage.setItem('veilcore.holder.v1', holder);
    localStorage.setItem('veilcore.role.v1', 'breeder');
  }, HOLDER);
  await holdVaultKey(page, VAULT);
  await isolate(page, {
    'GET /api/records': (route) => json(route, 200, held.records),
    'PUT /api/records': (route, _url, body) => {
      const refusal = plainRowRefusal(body);
      if (refusal) return json(route, 400, { error: refusal });
      const sent = body as Rec[];
      const ids = new Set(sent.map((r) => r.id));
      held.records = [...sent, ...held.records.filter((r) => !ids.has(r.id))];
      return json(route, 200, { ok: true });
    },
    'GET /api/licenses': (route) => json(route, 200, []),
    'PUT /api/licenses': (route) => json(route, 200, { ok: true }),
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
  });
  return held;
};

test('seal a document from its files, compare a file, and check it from the link as a stranger', async ({
  page,
  context,
}) => {
  const errors = watch(page);
  await standIn(page);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  // 1. From the first screen: a document is one link away, on a page of its own.
  await page.goto('/new');
  await expect(page.locator('[data-or-document]')).toBeVisible();
  await page.getByRole('link', { name: 'Seal a document' }).click();
  await expect(page).toHaveURL(/\/documents\/new$/);
  await expect(page.getByRole('heading', { name: 'Seal a document' })).toBeVisible();

  // 2. Nothing is sealed without a file; two files are hashed here.
  await page.getByRole('button', { name: 'Seal it' }).click();
  await expect(page.locator('[data-document-missing]')).toHaveText('Add the file first.');
  await page.locator('input[type=file]').setInputFiles([
    { name: 'permit 0042.pdf', mimeType: 'application/pdf', buffer: PERMIT },
    { name: 'annex.pdf', mimeType: 'application/pdf', buffer: ANNEX },
  ]);
  await expect(page.locator('[data-picked-file]')).toHaveCount(2);
  // The title starts as the first file's name.
  await expect(page.getByLabel('Title')).toHaveValue('permit 0042');
  await page.getByLabel('Title').fill('Practice permit 0042');
  await page.getByLabel('Type').click();
  await page.getByRole('option', { name: 'Permit or licence' }).click();
  await page.getByLabel('Issued by (optional)').fill('Practice Authority (test data)');
  await page.getByLabel('Reference number (optional)').fill('P-0042');
  await page.getByLabel('Held by').fill('E2E association (test data)');
  await page.getByRole('button', { name: 'Seal it' }).click();

  // 3. Its own page: a document, its files by fingerprint, no plant rows.
  await expect(page).toHaveURL(/\/record\/VEIL-[0-9A-F]+$/);
  await expect(page.locator('[data-document-page]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Practice permit 0042' })).toBeVisible();
  const facts = page.locator('[data-document-facts]');
  await expect(facts).toContainText('Permit or licence');
  await expect(facts).toContainText('Practice Authority (test data)');
  await expect(facts).toContainText(`SHA-256 ${sha(PERMIT)}`);
  await expect(facts).toContainText(`SHA-256 ${sha(ANNEX)}`);
  await expect(page.getByText('License it')).toHaveCount(0);
  await expect(page.getByText(/DNA report/)).toHaveCount(0);

  // 4. Is this the same file? The annex is; another file is not.
  const compare = page.locator('[data-file-compare]');
  await compare
    .locator('input[type=file]')
    .setInputFiles({ name: 'from-them.pdf', mimeType: 'application/pdf', buffer: ANNEX });
  await expect(page.locator('[data-compare="match"]')).toContainText('is byte for byte annex.pdf');
  await compare
    .locator('input[type=file]')
    .setInputFiles({ name: 'other.pdf', mimeType: 'application/pdf', buffer: OTHER });
  await expect(page.locator('[data-compare="no-match"]')).toBeVisible();

  // 5. The check link: everything after the #, and the record's own proof code.
  const proofCode = (
    await page
      .locator('[data-document-page]')
      .getByText(/^[0-9a-f]{64}$/)
      .first()
      .textContent()
  )?.trim();
  await page.getByRole('button', { name: 'Copy the check link' }).click();
  await expect(page.getByText('Copied.')).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/\/check-document#d=[A-Za-z0-9_-]+$/);

  // 6. As a stranger: the proof code recomputed from the link matches the record's; the file is
  //    compared here; nothing dates it on the stand-in, so the page says not to rely on it.
  await page.goto(link.replace(/^https?:\/\/[^/]+/, ''));
  await expect(page.getByRole('heading', { name: 'Check a document' })).toBeVisible();
  const check = page.locator('[data-document-check]');
  await expect(check).toContainText(proofCode ?? 'missing');
  await expect(check).toContainText('Practice permit 0042');
  await expect(check).toContainText('Issued by (the holder’s statement)');
  await expect(page.locator('[data-document-not-dated]')).toBeVisible();
  await check
    .locator('input[type=file]')
    .setInputFiles({ name: 'sent.pdf', mimeType: 'application/pdf', buffer: PERMIT });
  await expect(page.locator('[data-compare="match"]')).toContainText('is byte for byte permit 0042.pdf');

  // 7. A link someone changed (one character of a file fingerprint) recomputes to another proof code.
  const json1 = JSON.parse(Buffer.from(link.split('#d=')[1], 'base64url').toString('utf8')) as {
    fields: { files: { sha256: string }[] };
  };
  const s0 = json1.fields.files[0].sha256;
  json1.fields.files[0].sha256 = `${s0.slice(0, 63)}${s0.endsWith('0') ? '1' : '0'}`;
  await page.goto(`/check-document#d=${Buffer.from(JSON.stringify(json1)).toString('base64url')}`);
  await expect(page.getByRole('heading', { name: 'Check a document' })).toBeVisible();
  await expect(page.locator('[data-document-check]')).not.toContainText(proofCode ?? 'missing');

  // 8. A link with nothing in it says so.
  await page.goto('/check-document');
  await expect(page.locator('[data-document-link="missing"]')).toBeVisible();
  expectNoErrors(errors);
});

test('seal a certificate with its numbers: refused until each one fits, then kept only in the holder’s copy', async ({
  page,
}) => {
  const errors = watch(page);
  const held = await standIn(page);
  await page.goto('/documents/new');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name: 'coa-7.pdf', mimeType: 'application/pdf', buffer: PERMIT });
  await page.getByLabel('Type').click();
  await page.getByRole('option', { name: 'Certificate of analysis (COA)' }).click();
  await page.getByLabel('Which numbers').click();
  await page.getByRole('option', { name: 'Cannabinoid potency' }).click();
  // Four decimals where the form holds three: refused, never rounded.
  await page.getByLabel('Total THC').fill('0.2105');
  await page.getByLabel('Total CBD').fill('11.4');
  await page.getByLabel('Held by').fill('E2E grower (test data)');
  await page.getByRole('button', { name: 'Seal it' }).click();
  await expect(page.locator('[data-document-missing]')).toContainText('isn’t one this form can hold');
  await expect(page.getByText('A number with at most 3 decimals, like 0.21.')).toBeVisible();
  await page.getByLabel('Total THC').fill('0.21');
  await page.getByRole('button', { name: 'Seal it' }).click();

  await expect(page.locator('[data-document-page]')).toBeVisible();
  const nums = page.locator('[data-held-numbers]');
  await expect(nums).toContainText('Total THC: 0.210 %');
  await expect(nums).toContainText('Total CBD: 11.400 %');
  await expect(nums).toContainText('Sealed with this document as Cannabinoid potency');
  // What reached the registry is sealed: neither the numbers nor the field secret are readable.
  const sent = JSON.stringify(held.records);
  expect(sent).not.toContain('11400');
  expect(sent).not.toContain('fieldSecret');
  expectNoErrors(errors);
});
