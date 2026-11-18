// The record page's "Open check page" button (RecordDetail.tsx), in the built site against the
// stand-in registry: once VeilCore has the record it sits under the record's code, and opens the
// same link the certificate copies (the fingerprint in the query, the name after the #), and the
// check page it opens finds the record and says the name matches. Before then it isn't shown.
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
  // The registry refuses saves at first, so the record waits here to be sent.
  let down = true;
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
      if (down) return json(route, 503, { error: 'registry down (test)' });
      const sent = body as Rec[];
      const ids = new Set(sent.map((r) => r.id));
      held.records = [...sent, ...held.records.filter((r) => !ids.has(r.id))];
      return json(route, 200, { ok: true });
    },
    'GET /api/licenses': (route) => json(route, 200, []),
    'PUT /api/licenses': (route) => json(route, 200, { ok: true }),
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
    // The registry's answer to a stranger: the record's fingerprint and salted name code.
    'GET /verify/:record': (route, url) => {
      const r = held.records.find((x) => x.id === decodeURIComponent(url.pathname.split('/').pop() ?? ''));
      if (!r) return json(route, 404, { found: false });
      return json(route, 200, {
        found: true,
        id: r.id,
        recordFingerprint: r.recordFingerprint,
        ...(typeof r.nameCode === 'string' ? { nameCode: r.nameCode } : {}),
        registryFirstSeen: new Date().toISOString(),
        supersededBy: null,
        supersedes: null,
        keyBound: true,
        signedAttestation: false,
        attestedByVettedLab: false,
        attested: false,
        anchored: false,
        disclosed: [],
      });
    },
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

  // Sealed, not on VeilCore yet: no button, as its check page would find nothing.
  await page.goto('/records?lang=en');
  await page.getByText('Check Me (test data)').first().click();
  await expect(page.getByRole('heading', { name: 'Check Me (test data)' })).toBeVisible();
  await expect(page.locator('[data-open-check-page]')).toHaveCount(0);
  expect(held.records).toHaveLength(0);

  // The registry is back and takes it.
  down = false;
  await page.reload();
  await expect.poll(() => held.records.length, { timeout: 60_000 }).toBe(1);
  const { id, recordFingerprint: fp } = held.records[0];
  expect(fp).toMatch(/^[0-9a-f]{64}$/);

  await page.goto(`/record/${id}?lang=en`);
  const open = page.getByRole('link', { name: 'Open check page' });
  await expect(open).toBeVisible();
  const href = (await open.getAttribute('href')) ?? '';
  expect(href.startsWith(`/verify/${id}?`)).toBe(true);
  expect(new URL(href, 'https://x').searchParams.get('fp')).toBe(fp);
  const fragment = new URLSearchParams(href.split('#')[1] ?? '');
  expect(fragment.get('n')).toBeTruthy();
  expect(fragment.get('ns')).toMatch(/^[0-9a-f]{64}$/);

  // The check page it opens finds the record and checks the name against it.
  await open.click();
  await expect(page).toHaveURL(new RegExp(`/verify/${id}\\?`));
  await expect(page.locator('[data-holder-name]')).toContainText('Name matches the record: Check Me (test data)');
  await expect(page.locator('body')).not.toContainText('doesn’t match any record');
  expectNoErrors(errors);
});
