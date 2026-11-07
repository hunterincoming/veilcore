// The license form (TermsBuilder) in a browser, against the stand-in registry: the
// controlled-plant question and its warnings, the territory and a state-level law that must be
// named before a license can be saved, and the saved license's page showing readable labels and
// no green "active" chip for a license that isn't on Midnight (panel review).
// SPDX-License-Identifier: Apache-2.0
import { randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';
import {
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

test('a plant license: the cannabis question, the territory and the law come first', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watch(page);
  const holder = randomBytes(32).toString('hex');
  const held: { records: { id: string }[]; licenses: unknown[] } = { records: [], licenses: [] };
  await page.addInitScript((h) => {
    localStorage.setItem('veilcore.holder.v1', h);
    localStorage.setItem('veilcore.role.v1', 'breeder');
  }, holder);
  await holdVaultKey(page, newVaultKey());
  await isolate(page, {
    'GET /api/records': (route) => json(route, 200, held.records),
    'PUT /api/records': (route, _u, body) => {
      const refusal = plainRowRefusal(body);
      if (refusal) return json(route, 400, { error: refusal });
      const sent = body as { id: string }[];
      const ids = new Set(sent.map((r) => r.id));
      held.records = [...sent, ...held.records.filter((r) => !ids.has(r.id))];
      return json(route, 200, { ok: true });
    },
    'GET /api/licenses': (route) => json(route, 200, held.licenses),
    'PUT /api/licenses': (route, _u, body) => {
      held.licenses = body as unknown[];
      return json(route, 200, { ok: true });
    },
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
  });

  // A plant whose species says cannabis.
  await page.goto('/new');
  await startPlant(page);
  await page.getByLabel(/Plant or line name/).fill('Harbour Mist');
  await page.getByLabel(/Bred by/).fill('E2E breeder');
  await page.getByRole('button', { name: /Add parents, species, photos or notes/ }).click();
  await page.getByLabel(/^Species/).fill('Cannabis sativa');
  await page.getByRole('button', { name: /Next: check it/ }).click();
  await page.getByRole('button', { name: /Seal it/ }).click();
  await page.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
  await page.getByRole('button', { name: /No report yet: skip/ }).click();
  await saveAndCheckBackup(page);
  await page.getByRole('button', { name: /Finish/ }).click();
  await expect(page.getByRole('heading', { name: 'Harbour Mist' })).toBeVisible();
  await expect.poll(() => held.records.length, { timeout: 30_000 }).toBe(1);
  const recId = held.records[0].id;

  // The question is asked, preselected from the species, and the warnings show while it's Yes.
  await page.getByText('License it', { exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/record/${recId}/license`));
  const question = page.locator('[data-controlled-question]');
  await expect(question).toContainText('Is this cannabis, hemp or another controlled plant?');
  await expect(page.locator('[data-controlled="yes"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(question).toContainText('looks like cannabis, so Yes is picked');
  const warnings = page.locator('[data-controlled-warnings]');
  await expect(warnings).toContainText('across a state or national border is a crime');
  await expect(warnings).toContainText('In Japan, growing, selling or using cannabis without a license is a crime');
  await expect(warnings).toContainText('disclosed to the licensee’s cannabis regulator');
  await expect(warnings).toContainText('Some courts have refused to enforce cannabis agreements');
  // The general note no longer carries the cannabis line (it's only on cannabis licenses).
  await expect(page.locator('[data-evidence-note]')).not.toContainText('cannabis');
  await page.locator('[data-controlled="no"]').click();
  await expect(warnings).toHaveCount(0);
  await page.locator('[data-controlled="yes"]').click();
  await expect(warnings).toBeVisible();

  // The quick terms: who, how much, the territory (required) and the law (no first guess for the US).
  await page.locator('[data-preset="clone"]').click();
  const territory = page.locator('[data-territory]');
  await expect(territory).toBeVisible();
  await expect(territory).toHaveAttribute('required', '');
  await expect(page.locator('[data-law]')).toHaveValue('');
  await page.getByLabel(/Licensee \(name or company\)/).fill('A grower');
  await page.locator('[data-amount]').fill('2.50');
  const needed = page.locator('[data-still-needed]');
  await expect(needed).toContainText('the governing law');
  await expect(needed).toContainText('the territory');
  const save = page.getByRole('button', { name: 'Save as a draft' });
  await expect(save).toBeDisabled();
  // "United States" is not a governing law.
  await page.locator('[data-law]').fill('United States');
  await expect(needed).toContainText('a state or province for the governing law, not just the country');
  await page.locator('[data-law]').fill('New Jersey');
  await expect(needed).not.toContainText('governing law');
  await expect(needed).toContainText('the territory');
  await territory.fill('New Jersey');
  await expect(needed).toHaveCount(0);
  await expect(save).toBeEnabled();
  await save.click();

  // The saved license's page: readable labels, and the state chip is "Draft", not green.
  await expect(page).toHaveURL(/\/license\/LIC-/);
  await expect(page.getByRole('heading', { name: /License agreement/ })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/app\.(lic|roy)\./);
  await expect(page.locator('[data-license-state="draft"]')).toBeVisible();
  await expect(page.locator('[data-license-state="active"]')).toHaveCount(0);
  expectNoErrors(errors);
});
