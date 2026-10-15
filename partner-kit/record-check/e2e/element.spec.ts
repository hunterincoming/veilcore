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

const open = async (page: Page) => {
  const hosts = new Set<string>();
  const errors: string[] = [];
  page.on('request', (r) => hosts.add(new URL(r.url()).origin));
  page.on('pageerror', (e) => errors.push(e.message));
  // A 404 from the registry (no such record, not batched yet) is an answer, not a script error.
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  await page.goto(`${SITE}/?registry=${encodeURIComponent(REG)}`);
  const field = page.getByLabel('VeilCore record check link');
  await expect(field).toBeVisible();
  return { field, hosts, errors };
};

const lastAnswer = (page: Page) =>
  page.evaluate(() => (window as unknown as { __last?: Record<string, unknown> }).__last);
const violations = (page: Page) => page.evaluate(() => (window as unknown as { __violations: string[] }).__violations);
const out = (page: Page) => page.locator('veilcore-record-check .out');

test('a matching link: the plain answer, the form submits, nothing but the registry is asked', async ({ page }) => {
  const { field, hosts, errors } = await open(page);
  // Required and empty: the form does not submit.
  await page.locator('#submit').click();
  expect(await page.evaluate(() => (window as unknown as { __submitted?: string }).__submitted)).toBeUndefined();

  await field.fill(reg.links.boundWithKey);
  await field.press('Enter');
  await expect(out(page)).toHaveAttribute('data-state', 'matches');
  await expect(out(page).getByRole('heading', { name: 'Record found, link matches' })).toBeVisible();
  await expect(out(page)).toContainText(
    'Checked: the link’s fingerprint is the one the registry reports for this record.',
  );
  await expect(out(page)).toContainText(`Registry’s word: in batch ${reg.batchId} (checked here)`);
  await expect(out(page)).toContainText('Test network: practice data');
  await expect(out(page)).toContainText(
    'signed by Test Lab (checked). VeilCore’s operator matched this name to cannabis.example.gov (license TL-1)',
  );
  await expect(out(page)).toContainText('It is the report file saved to this record now.');
  await expect(out(page)).toContainText('Key: Matched here: the record named this key when it was sealed.');
  await expect(page.getByRole('status')).toContainText('Record found, and the link’s fingerprint matches');
  // "What this does not show" is there, folded.
  await page.getByText('What this does not show').click();
  await expect(out(page)).toContainText('VeilCore never sees genetics');
  // The full check page link is built from the id and fingerprint, on veilcore.org.
  await expect(out(page).getByRole('link', { name: 'Open the full check page' })).toHaveAttribute(
    'href',
    `https://veilcore.org/verify/${reg.records.bound.id}?fp=${reg.records.bound.recordFingerprint}`,
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
    'Not counted: Lab’s receipt for a sample: withdrawn by its signer, so it is not counted.',
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
