// The record page's "Open check page" button (RecordDetail.tsx), in the built site against the
// stand-in registry: once VeilCore has the record it sits under the record's code, and opens the
// same link the certificate copies (the fingerprint in the query, the name after the #).
// SPDX-License-Identifier: Apache-2.0
import { randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';
import {
  REAL_REGISTRY,
  expectNoErrors,
  holdVaultKey,
  isolate,
  json,
  newVaultKey,
  plainRowRefusal,
  saveAndCheckBackup,
  startPlant,
  watch,
} from './helpers';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

type Rec = Record<string, unknown> & { id: string; recordFingerprint?: string };

test('a saved record has an "Open check page" button at the top that opens its check link', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watch(page);
  const held: { records: Rec[] } = { records: [] };
  await page.addInitScript((h) => {
    if (!localStorage.getItem('veilcore.holder.v1')) localStorage.setItem('veilcore.holder.v1', h);
    localStorage.setItem('veilcore.role.v1', 'breeder');
  }, randomBytes(32).toString('hex'));
  await holdVaultKey(page, newVaultKey());
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

  await page.goto('/new?lang=en');
  await startPlant(page);
  await page.getByLabel(/Plant or line name/).fill('Check Me (test data)');
  await page.getByLabel(/Bred by/).fill('E2E breeder');
  await page.getByRole('button', { name: /Next: check it/ }).click();
  await page.getByRole('button', { name: /Seal it/ }).click();
  await page.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
  await page.getByRole('button', { name: /No report yet: skip/ }).click();
  await saveAndCheckBackup(page);
  await page.getByRole('button', { name: /Finish/ }).click();
  await expect.poll(() => held.records.length, { timeout: 30_000 }).toBe(1);
  const { id, recordFingerprint: fp } = held.records[0];
  expect(fp).toMatch(/^[0-9a-f]{64}$/);

  await page.goto(`/record/${id}?lang=en`);
  const open = page.getByRole('link', { name: 'Open check page' });
  await expect(open).toBeVisible();
  const href = (await open.getAttribute('href')) ?? '';
  expect(href.startsWith(`/verify/${id}?`)).toBe(true);
  expect(new URL(href, 'https://x').searchParams.get('fp')).toBe(fp);
  expect(new URLSearchParams(href.split('#')[1] ?? '').get('n')).toBeTruthy();

  await open.click();
  await expect(page).toHaveURL(new RegExp(`/verify/${id}\\?`));
  expectNoErrors(errors);
});
