// <veilcore-record-check> in Chromium: a partner's intake form on a page with a strict CSP
// (no inline script or style, Trusted Types required, connect-src only the registry), the
// field checking links against a local registry seeded with test records.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { startRegistry } from './local-registry.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_DIR = process.env.REGISTRY_DIR ?? path.resolve(here, '../../../../backups');
const SCRATCH = process.env.E2E_SCRATCH ?? path.resolve(here, '../../../../../partner');
const REG_PORT = Number(process.env.REGISTRY_PORT ?? 8920);
const PAGE_PORT = REG_PORT + 1;
const REG = `http://127.0.0.1:${REG_PORT}`;
const SITE = `http://127.0.0.1:${PAGE_PORT}`;

const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  `connect-src ${REG}`,
  "style-src 'none'",
  "img-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "require-trusted-types-for 'script'",
  "trusted-types 'none'",
].join('; ');

let reg: Awaited<ReturnType<typeof startRegistry>>;
let server: http.Server;

test.beforeAll(async () => {
  reg = await startRegistry({ registryDir: REGISTRY_DIR, port: REG_PORT, dir: SCRATCH });
  const files: Record<string, [string, string]> = {
    '/': [path.join(here, 'page', 'index.html'), 'text/html'],
    '/page.js': [path.join(here, 'page', 'page.js'), 'text/javascript'],
    '/veilcore-record-check.js': [path.join(here, '..', 'dist', 'veilcore-record-check.js'), 'text/javascript'],
  };
  server = http.createServer((req, res) => {
    const f = files[new URL(req.url ?? '/', SITE).pathname];
    if (!f) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': f[1], 'content-security-policy': CSP }).end(readFileSync(f[0]));
  });
  await new Promise<void>((r) => server.listen(PAGE_PORT, '127.0.0.1', r));
});

test.afterAll(async () => {
  reg?.stop();
  await new Promise((r) => server?.close(r));
});

const open = async (page: Page, params: Record<string, string> = {}) => {
  const hosts = new Set<string>();
  const errors: string[] = [];
  page.on('request', (r) => hosts.add(new URL(r.url()).origin));
  page.on('pageerror', (e) => errors.push(e.message));
  // A 404 from the registry (no such record, not batched yet) is an answer, not a script error.
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  await page.goto(`${SITE}/?${new URLSearchParams({ registry: REG, ...params }).toString()}`);
  const field = page.getByLabel('VeilCore record check link');
  await expect(field).toBeVisible();
  return { field, hosts, errors };
};

const lastAnswer = (page: Page) =>
  page.evaluate(() => (window as unknown as { __last?: Record<string, unknown> }).__last);
const violations = (page: Page) => page.evaluate(() => (window as unknown as { __violations: string[] }).__violations);
const out = (page: Page) => page.locator('veilcore-record-check .out');
const submitted = (page: Page) =>
  page.evaluate(() => (window as unknown as { __submitted?: string }).__submitted ?? null);
const valid = (page: Page) =>
  page.locator('veilcore-record-check').evaluate((e) => (e as HTMLObjectElement).checkValidity());

test('a matching link: the plain answer, the form submits, nothing but the registry is asked', async ({ page }) => {
  // The local registry dates on preprod, a test network: this form accepts test data.
  const { field, hosts, errors } = await open(page, { allowTest: '1' });
  // Required and empty: the form does not submit.
  await page.locator('#submit').click();
  expect(await page.evaluate(() => (window as unknown as { __submitted?: string }).__submitted)).toBeUndefined();

  await field.fill(reg.links.boundWithKey);
  await field.press('Enter');
  await expect(out(page)).toHaveAttribute('data-state', 'matches');
  await expect(out(page).getByRole('heading', { name: 'Record found, link matches' })).toBeVisible();
  await expect(out(page)).toContainText(
    'Checked: the link’s proof code is the one the registry reports for this record.',
  );
  await expect(out(page)).toContainText(`Registry’s word: in batch ${reg.batchId} (checked here)`);
  await expect(out(page)).toContainText('Test network: practice data');
  await expect(out(page)).toContainText(
    'signed by Test Lab (checked). VeilCore’s operator matched this name to cannabis.example.gov (license TL-1)',
  );
  // The lab report is signed bound to the record (round 6): no file hash is public, so this
  // can't say which file it is; the one signed before round 6 is withheld and said so.
  await expect(out(page)).toContainText(
    'The lab signed the report bound to this record; which file it is can be checked only with the file and the holder’s link.',
  );
  await expect(out(page)).not.toContainText('It is the report file saved to this record now.');
  await expect(out(page)).toContainText(
    'The registry says a lab signed a report about this record before 17 October 2026. That signature names the report file, so the registry shows it only to the delivery’s sender and lab, and it was not checked here.',
  );
  // Receipts tied to deliveries of the record, over sample details stored locked: the
  // registry can't compare them, so the sender's app's word is said as the sender's. One
  // matches, one's seal doesn't; no seal number is ever shown.
  await expect(out(page).locator('li[data-kind="info"]', { hasText: 'Receipt:' }).first()).toContainText(
    'Receipt: Lab’s receipt for a sample, signature verified, signed by Test Lab (checked).',
  );
  await expect(out(page)).toContainText(
    'The lab’s receipt names sample details. They are stored locked, so the registry can’t check them; the holder’s app can. The sender’s app says what arrived matches what was sent (the sender’s word).',
  );
  await expect(out(page).locator('li[data-kind="bad"]')).toContainText(
    'Does not match (sender’s word): Lab’s receipt for a sample, signature verified',
  );
  await expect(out(page).locator('li[data-kind="bad"]')).toContainText(
    'The sender’s app says these differ between what was sent and what arrived: seal number (the sender’s word).',
  );
  for (const value of ['5500', '5505', 'E2E-1', 'E2E-2', '4471']) await expect(out(page)).not.toContainText(value);
  // A custody signature tied to no delivery: a signed statement, not counted, never green.
  await expect(out(page).locator('li[data-kind="info"]', { hasText: 'Signed custody statement' })).toContainText(
    'Not counted: Signed custody statement (not tied to a delivery): signature verified',
  );
  await expect(out(page)).toContainText('Key: Matched here: the record named this key when it was sealed.');
  await expect(page.getByRole('status')).toContainText('Record found, and the link’s proof code matches');
  // "What this does not show" is there, folded.
  await page.getByText('What this does not show').click();
  await expect(out(page)).toContainText('VeilCore never sees genetics');
  // The full check page link is built from the id and fingerprint, on veilcore.org.
  // The name came from the link, after the #, checked against the record's name code (round 6),
  // and goes on to the full check page the same way, with its salt.
  await expect(out(page)).toContainText('Name matches the record: Partner check test record');
  await expect(out(page).getByRole('link', { name: 'Open the full check page' })).toHaveAttribute(
    'href',
    `https://veilcore.org/verify/${reg.records.bound.id}?fp=${reg.records.bound.recordFingerprint}#n=${reg.nameParam('Partner check test record')}&ns=${reg.records.bound.nameSalt}`,
  );

  const a = await lastAnswer(page);
  expect(a).toMatchObject({
    recordExists: true,
    fingerprintMatches: true,
    dated: { status: 'reported', checkedOnChain: false },
  });
  await page.locator('#submit').click();
  expect(await page.evaluate(() => (window as unknown as { __submitted?: string }).__submitted)).toBe(
    reg.links.boundWithKey,
  );

  expect(await violations(page)).toEqual([]);
  expect(errors).toEqual([]);
  expect([...hosts].sort()).toEqual([REG, SITE].sort());
});

test('a link someone edited: do not rely on it, and the form will not submit', async ({ page }) => {
  const { field } = await open(page);
  await field.fill(reg.links.tampered);
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(out(page)).toHaveAttribute('data-state', 'mismatch');
  await expect(out(page).getByRole('heading', { name: 'This link does not match the record' })).toBeVisible();
  await expect(out(page)).toContainText('Do not rely on it:');
  await expect(out(page)).not.toContainText('Do not rely on it: Do not rely');
  await expect(out(page)).not.toContainText('Test Lab');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  expect(await page.locator('veilcore-record-check').evaluate((e) => (e as HTMLObjectElement).checkValidity())).toBe(
    false,
  );
  await page.locator('#submit').click();
  expect(await page.evaluate(() => (window as unknown as { __submitted?: string }).__submitted)).toBeUndefined();
  expect(await violations(page)).toEqual([]);
});

test('a withdrawn receipt, an undated record, a missing record, a bare id and nonsense', async ({ page }) => {
  const { field, errors } = await open(page);

  await field.fill(reg.links.older);
  await field.press('Enter');
  await expect(out(page)).toHaveAttribute('data-state', 'matches');
  await expect(out(page)).toContainText(
    'Not counted: Signed custody statement (not tied to a delivery): withdrawn by its signer, so it is not counted.',
  );

  await field.fill(reg.links.undated);
  await field.press('Enter');
  await expect(out(page)).toContainText('Date: Not in a batch yet, so there is no date stamp.');
  await expect(out(page)).toContainText('Lab signatures: none about this record.');

  await field.fill(reg.links.missing);
  await field.press('Enter');
  await expect(out(page)).toHaveAttribute('data-state', 'not-found');
  await expect(out(page).getByRole('heading', { name: 'No record found' })).toBeVisible();

  await field.fill(reg.links.bareId);
  await field.press('Enter');
  await expect(out(page)).toHaveAttribute('data-state', 'unbound');
  await expect(out(page)).toContainText('Not tied to the link:');
  expect(await page.locator('veilcore-record-check').evaluate((e) => (e as HTMLObjectElement).checkValidity())).toBe(
    false,
  );

  await field.fill('not a link');
  await field.press('Enter');
  await expect(out(page)).toHaveAttribute('data-state', 'error');
  await expect(out(page)).toContainText('Not checked: That is not a check link.');

  expect(await violations(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test('keyboard only: tab to the field, paste, and the answer is announced', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.shadowRoot?.activeElement?.tagName);
  expect(focused).toBe('INPUT');
  await page.keyboard.insertText(reg.links.bound);
  await page.keyboard.press('Tab'); // change fires: the check runs
  await expect(page.getByRole('status')).toContainText('Record found');
  await expect(page.getByRole('button', { name: 'Check' })).toBeFocused();
});

test('a genuine link forwarded with another name after the #: the name is flagged, never shown as the holder’s', async ({
  page,
}) => {
  // The fifth review's finding 2, in the partner's form (round 6, CONTRACT.md #33).
  const { field } = await open(page, { allowTest: '1' });
  await field.fill(reg.links.boundForgedName);
  await field.press('Enter');
  await expect(out(page)).toHaveAttribute('data-state', 'matches');
  await expect(out(page)).toContainText('This name does not match the record: Gelato 41 (lab certified clone)');
  await expect(out(page)).not.toContainText('Name matches the record');
  await expect(out(page).getByRole('link', { name: 'Open the full check page' })).toHaveAttribute(
    'href',
    `https://veilcore.org/verify/${reg.records.bound.id}?fp=${reg.records.bound.recordFingerprint}`,
  );
  expect(await lastAnswer(page)).toMatchObject({ nameCheck: 'does-not-match', nameByHolder: null });
});

test('a test network date: shown, and refused unless the form allows test data', async ({ page }) => {
  const { field } = await open(page);
  await field.fill(reg.links.bound);
  await field.press('Enter');
  await expect(out(page).getByRole('heading', { name: 'Record found, dated on a test network' })).toBeVisible();
  await expect(out(page)).toContainText('so this form does not accept it');
  // A link without the name after the #: the registry doesn't have it, so it isn't shown (round 5).
  await expect(out(page)).toContainText('Name: This link doesn’t carry the name.');
  await expect(out(page)).not.toContainText('Partner check test record');
  expect(await valid(page)).toBe(false);
  expect(
    await page
      .locator('veilcore-record-check')
      .evaluate((e) => (e as unknown as { validationMessage: string }).validationMessage),
  ).toMatch(/test network/);
  await page.locator('#submit').click();
  expect(await submitted(page)).toBeNull();
});

test('an answer for the old link never validates a new one typed while it was being checked', async ({ page }) => {
  const { field } = await open(page, { allowTest: '1' });
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route(
    (u) => u.pathname === `/verify/${reg.records.bound.id}`,
    async (route) => {
      await gate;
      await route.continue();
    },
  );
  await field.fill(reg.links.bound);
  await field.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Checking…');
  // The applicant replaces the link before the answer comes back.
  await field.fill(reg.links.missing);
  release();
  await page.waitForTimeout(500);
  await expect(out(page)).toHaveAttribute('data-state', 'empty');
  expect(await lastAnswer(page)).toBeUndefined();
  expect(await valid(page)).toBe(false);
  // Submitting blurs the box: the new link is checked, and the form still won't go.
  await page.locator('#submit').click();
  expect(await submitted(page)).toBeNull();
  await expect(out(page)).toHaveAttribute('data-state', 'not-found');
  expect(await valid(page)).toBe(false);
  expect(await lastAnswer(page)).toMatchObject({ recordExists: false });
});

test('a cut-off link: said once, plainly', async ({ page }) => {
  const { field } = await open(page);
  await field.fill(reg.links.bound.slice(0, -24));
  await field.press('Enter');
  await expect(out(page)).toHaveAttribute('data-state', 'cut');
  await expect(out(page).getByRole('heading', { name: 'This link looks cut off' })).toBeVisible();
  await expect(out(page)).toContainText('Not checked: Ask for the whole link.');
  await expect(out(page)).not.toContainText('different proof code');
  await expect(page.getByRole('status')).toHaveText(
    'This link looks cut off. Ask for the whole link. Nothing was checked.',
  );
});

test('the registry down: a required field blocks the form by default', async ({ page }) => {
  const { field } = await open(page, { allowTest: '1' });
  await page.route(`${REG}/**`, (route) => route.abort('connectionrefused'));
  await field.fill(reg.links.bound);
  await field.press('Enter');
  await expect(out(page)).toHaveAttribute('data-state', 'unreachable');
  await expect(out(page)).toContainText('Not checked: The registry did not answer.');
  expect(await valid(page)).toBe(false);
  await page.locator('#submit').click();
  expect(await submitted(page)).toBeNull();
});

test('the registry down, with when-unreachable="allow": the form goes, the link marked as not checked', async ({
  page,
}) => {
  const { field } = await open(page, { unreachable: 'allow' });
  await page.route(`${REG}/**`, (route) => route.abort('connectionrefused'));
  await field.fill(reg.links.bound);
  await field.press('Enter');
  await expect(out(page)).toContainText('Sent unchecked:');
  expect(await valid(page)).toBe(true);
  expect(await lastAnswer(page)).toMatchObject({
    checked: false,
    reason: 'registry-unreachable',
    link: reg.links.bound,
  });
  await page.locator('#submit').click();
  expect(await submitted(page)).toBe(reg.links.bound);
  expect(await page.evaluate(() => (window as unknown as { __unchecked?: string }).__unchecked)).toBe(
    'registry-unreachable',
  );
});
