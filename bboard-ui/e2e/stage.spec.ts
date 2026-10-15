// A breeding history, one sealed stage at a time, in the browser against the stand-in
// registry: seal a plant and save a lab report to it, add the next generation from its page
// (prefilled, the parent linked, the stage answers sealed in the notes), then date the lab
// report from the plant's page, once (product-ideas.md items 1 and 3). All records are
// practice data.
// SPDX-License-Identifier: Apache-2.0
import { createHash, randomBytes } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { REAL_REGISTRY, expectNoErrors, isolate, json, watch } from './helpers';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

type Rec = {
  id: string;
  strainName: string;
  bredBy: string;
  notes: string;
  breedingMethod?: string;
  taxon?: string;
  parents?: { recordId?: string; name: string }[];
  dnaFileSha256?: string;
};

const HOLDER = randomBytes(32).toString('hex');
const LAB_FILE = Buffer.from(`Practice lab report (test data) ${Date.now()}\n`);
const LAB_SHA = createHash('sha256').update(LAB_FILE).digest('hex');

/** The registry, as far as these screens need it: the holder's set, kept in memory. */
const standIn = async (page: Page) => {
  const held: { records: Rec[] } = { records: [] };
  await page.addInitScript((holder) => {
    localStorage.setItem('veilcore.holder.v1', holder);
    localStorage.setItem('veilcore.role.v1', 'breeder');
  }, HOLDER);
  await isolate(page, {
    'GET /api/records': (route) => json(route, 200, held.records),
    'PUT /api/records': (route, _url, body) => {
      held.records = body as Rec[];
      return json(route, 200, { ok: true });
    },
    'GET /api/licenses': (route) => json(route, 200, []),
    'PUT /api/licenses': (route) => json(route, 200, { ok: true }),
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
  });
  return held;
};

const keyIds = (page: Page) =>
  page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as object));

test('seal a plant, add the next stage from its page, and date its lab report once', async ({ page }) => {
  const errors = watch(page);
  const held = await standIn(page);
  const f1 = `Stage test F1 (practice) ${Date.now()}`;

  // 1. Seal a plant, and save a lab report to it on the optional screen.
  await page.goto('/new');
  await page.getByLabel(/Plant or line name/).fill(f1);
  await page.getByLabel(/Bred by/).fill('E2E');
  await page.getByRole('button', { name: /\+ Add parents, species/ }).click();
  await page.getByLabel('Species').fill('Cannabis sativa');
  await page.getByRole('button', { name: /Next: check it/ }).click();
  await page.getByRole('button', { name: /Seal it/ }).click();
  // The network is blocked on purpose: the key's date stamp fails safely and waits.
  await page.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
  await page.locator('input[type="file"]').setInputFiles({
    name: 'Practice lab report.txt',
    mimeType: 'text/plain',
    buffer: LAB_FILE,
  });
  await page.getByRole('button', { name: /^Save it to this plant$/ }).click();
  await expect(page.getByRole('heading', { name: /Lab report saved to this plant/ })).toBeVisible();
  const [f1Id] = await keyIds(page);
  expect(f1Id).toMatch(/^VEIL-/);
  await expect.poll(() => held.records.find((r) => r.id === f1Id)?.dnaFileSha256).toBe(LAB_SHA);

  // 2. Its page offers the next generation; the log flow opens prefilled.
  await page.goto(`/record/${f1Id}`);
  await expect(page.getByRole('heading', { name: f1 })).toBeVisible();
  await page.getByRole('button', { name: /Add the next generation or selection/ }).click();
  await expect(page).toHaveURL(/\/new$/); // `next` is dropped once used: a reload keeps what is typed
  await expect(page.getByRole('heading', { name: /Log the next generation or selection/ })).toBeVisible();
  await expect(page.locator('[data-seal-each-stage]')).toContainText(
    'A record dates nothing earlier than the day it’s sealed. Seal each stage when it happens.',
  );
  await expect(page.getByLabel(/Plant or line name/)).toHaveValue(f1);
  await expect(page.getByLabel(/Bred by/)).toHaveValue('E2E');
  await expect(page.getByLabel('Species')).toHaveValue('Cannabis sativa');
  await expect(page.getByRole('button', { name: f1 })).toBeVisible(); // the linked parent's chip
  const f2 = `Stage test F2 (practice) ${Date.now()}`;
  await page.getByLabel(/Plant or line name/).fill(f2);
  await page.getByLabel('What stage is this? (e.g. F3, second clone run)').fill('F2');
  await page.getByLabel('What did you select for?').fill('vigour, early finish');
  await page.reload();
  await expect(page.getByLabel(/Plant or line name/)).toHaveValue(f2);
  await expect(page.getByLabel('What stage is this? (e.g. F3, second clone run)')).toHaveValue('F2');
  await page.getByRole('button', { name: /Next: check it/ }).click();
  await expect(page.getByText(/Stage: F2 · Selected for: vigour, early finish/)).toBeVisible();
  await page.getByRole('button', { name: /Seal it/ }).click();
  await page.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
  await expect.poll(() => held.records.some((r) => r.strainName === f2)).toBe(true);
  const sealedF2 = held.records.find((r) => r.strainName === f2)!;
  expect(sealedF2.notes).toBe('Stage: F2\nSelected for: vigour, early finish');
  expect(sealedF2.parents).toEqual([{ recordId: f1Id, name: f1 }]);
  expect(sealedF2.taxon).toBe('Cannabis sativa');

  // 3. Date the lab report from the plant's page: a small record, notes only, once.
  await page.goto(`/record/${f1Id}`);
  await expect(page.getByRole('heading', { name: f1 })).toBeVisible();
  const box = page.locator('[data-date-lab-report]');
  await expect(box).toContainText(
    'So you can show this report existed by that date without showing anyone the markers.',
  );
  await box.getByRole('button', { name: 'Date this lab report' }).click();
  const dated = page.locator('[data-lab-report-dated]');
  await expect(dated).toHaveText(/^Lab report dated: in VEIL-[0-9A-F]{32} \(waiting for a batch\)$/);
  await expect.poll(() => held.records.filter((r) => r.breedingMethod === 'Lab report').length).toBe(1);
  const report = held.records.find((r) => r.breedingMethod === 'Lab report')!;
  expect(report.notes).toBe(`Lab report SHA-256: ${LAB_SHA}\nLab: no lab signature matches this file`);
  expect(report.parents).toEqual([{ recordId: f1Id, name: f1 }]);
  expect(report.strainName).toBe(`${f1} — lab report ${LAB_SHA.slice(0, 8)}`);
  expect(JSON.stringify(report)).not.toContain('Practice lab report (test data)');
  await expect(dated).toContainText(report.id);

  // Never twice: after a reload the page shows where it was dated, with no button.
  await page.reload();
  await expect(page.locator('[data-lab-report-dated]')).toContainText(report.id);
  await expect(
    page.locator('[data-date-lab-report]').getByRole('button', { name: 'Date this lab report' }),
  ).toHaveCount(0);
  expect(held.records.filter((r) => r.breedingMethod === 'Lab report')).toHaveLength(1);

  // The family tree: F2 is offspring; the record dating the report is not.
  await page.getByRole('button', { name: /Family tree/ }).click();
  await expect(page.getByRole('link', { name: f2 })).toBeVisible();
  await expect(page.locator('[data-dated-reports]')).toContainText('Dated lab reports (not offspring)');
  await expect(page.locator('[data-dated-reports]')).toContainText(report.strainName);

  // The dating record's own page says what it is, and offers no next generation.
  await page.goto(`/record/${report.id}`);
  await expect(page.getByRole('heading', { name: report.strainName })).toBeVisible();
  await expect(page.getByRole('button', { name: /Add the next generation or selection/ })).toHaveCount(0);

  expectNoErrors(errors);
});
