// A breeding history, one sealed stage at a time, in the browser against the stand-in
// registry: seal a plant and save a lab report to it, add the next generation from its page
// (the parent linked, an unsaved plant kept, the stage answers sealed in the notes), then
// date the lab report from two tabs at once and get one record (product-ideas.md items 1
// and 3; recheck 6). The dating record is shown under its plant on Home, never offered as a
// parent, and its own page is a short one. All records are practice data.
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
  openRecordRows,
  plainRowRefusal,
  watch,
} from './helpers';

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
/** The holder's vault key: the stand-in keeps records sealed, as the registry does; the test opens them with it. */
const VAULT = newVaultKey();
const LAB_FILE = Buffer.from(`Practice lab report (test data) ${Date.now()}\n`);
const LAB_SHA = createHash('sha256').update(LAB_FILE).digest('hex');

/**
 * The registry, as far as these screens need it: the holder's set, kept in memory, stored by
 * id as the real registry stores it (a save adds or replaces records, never drops others),
 * and sealed (it refuses a record in plain text). Two tabs share one.
 */
const standIn = async (page: Page, held: { records: Rec[] } = { records: [] }) => {
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

/** The held records as the holder's browser opens them (the stand-in has them only sealed). */
const opened = (held: { records: Rec[] }) => openRecordRows(held.records, VAULT);

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
  await expect(page.getByRole('heading', { name: /DNA report saved to this plant/ })).toBeVisible();
  const [f1Id] = await keyIds(page);
  expect(f1Id).toMatch(/^VEIL-/);
  await expect.poll(() => opened(held).find((r) => r.id === f1Id)?.dnaFileSha256).toBe(LAB_SHA);

  // A plant half-logged, not sealed: starting a next stage must not replace it.
  const unsaved = 'Unsaved mother (practice)';
  await page.goto('/new');
  await page.getByLabel(/Plant or line name/).fill(unsaved);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('veilcore.log-draft.v1') ?? '')).toContain(unsaved);

  // 2. Its page offers the next generation; the log flow asks about the unsaved plant first.
  await page.goto(`/record/${f1Id}`);
  await expect(page.getByRole('heading', { name: f1 })).toBeVisible();
  await page.getByRole('button', { name: /Add the next generation or selection/ }).click();
  await expect(page).toHaveURL(new RegExp(`/new\\?next=${f1Id}$`)); // kept: a reload comes back to this stage
  await expect(page.locator('[data-unsaved-plant]')).toContainText(`You have an unsaved plant: ${unsaved}.`);
  await expect(page.getByRole('button', { name: 'Continue that plant' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep it and start the next stage' }).click();
  await expect(page.getByRole('heading', { name: /Log the next generation or selection/ })).toBeVisible();
  await expect(page.locator('[data-seal-each-stage]')).toContainText(
    'A record dates nothing earlier than the day it’s sealed. Seal each stage when it happens.',
  );
  // The name is this stage's: empty, a name only suggested.
  await expect(page.getByLabel(/Plant or line name/)).toHaveValue('');
  await expect(page.getByLabel(/Plant or line name/)).toHaveAttribute('placeholder', `e.g. ${f1}, next selection`);
  await expect(page.getByText('How was this stage made? It isn’t carried over from the parent.')).toBeVisible();
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
  // The name is sealed with the rest (round 5): found by opening the rows, never in the clear.
  await expect.poll(() => opened(held).some((r) => r.strainName === f2)).toBe(true);
  expect(JSON.stringify(held.records)).not.toContain(f2);
  const sealedF2 = opened(held).find((r) => r.strainName === f2)!;
  expect(sealedF2.notes).toBe('Stage: F2\nSelected for: vigour, early finish');
  expect(sealedF2.parents).toEqual([{ recordId: f1Id, name: f1 }]);
  expect(sealedF2.taxon).toBe('Cannabis sativa');
  // The unsaved plant is still there to finish.
  await page.goto('/new');
  await expect(page.getByLabel(/Plant or line name/)).toHaveValue(unsaved);

  // 3. Date the lab report from two tabs at once: one small record, notes only, one key.
  const tabB = await page.context().newPage();
  const errorsB = watch(tabB);
  await standIn(tabB, held);
  await page.goto(`/record/${f1Id}`);
  await tabB.goto(`/record/${f1Id}`);
  await expect(page.getByRole('heading', { name: f1 })).toBeVisible();
  await expect(tabB.getByRole('heading', { name: f1 })).toBeVisible();
  const box = page.locator('[data-date-lab-report]');
  await expect(box).toContainText(
    'So you can show this report existed by that date without showing anyone the markers.',
  );
  await Promise.all([
    box.getByRole('button', { name: 'Date this DNA report' }).click(),
    tabB.locator('[data-date-lab-report]').getByRole('button', { name: 'Date this DNA report' }).click(),
  ]);
  const dated = page.locator('[data-lab-report-dated]');
  await expect(dated).toHaveText(/^DNA report dated: in VEIL-[0-9A-F]{32} \(waiting for a batch\)$/);
  await expect(tabB.locator('[data-lab-report-dated]')).toHaveText(
    /^DNA report dated: in VEIL-[0-9A-F]{32} \(waiting for a batch\)$/,
  );
  await expect.poll(() => opened(held).filter((r) => r.breedingMethod === 'Lab report').length).toBe(1);
  const report = opened(held).find((r) => r.breedingMethod === 'Lab report')!;
  await expect(tabB.locator('[data-lab-report-dated]')).toContainText(report.id);
  // Its key is in the browser, and no key was left for a record that doesn't exist.
  const keysNow = await keyIds(page);
  expect(keysNow).toContain(report.id);
  expect(keysNow.sort()).toEqual(held.records.map((r) => r.id).sort());
  expectNoErrors(errorsB);
  await tabB.close();
  expect(report.notes).toBe(`Lab report SHA-256: ${LAB_SHA}\nLab: no lab signature matches this file`);
  expect(report.parents).toEqual([{ recordId: f1Id, name: f1 }]);
  // Round 4 (F9): a neutral public name, nothing from the report.
  expect(report.strainName).toBe(`${f1} — lab report`);
  expect(report.strainName).not.toContain(LAB_SHA.slice(0, 8));
  // The report itself never left the device: not inside the seal, not in the clear.
  expect(JSON.stringify(report)).not.toContain('Practice lab report (test data)');
  expect(JSON.stringify(held.records)).not.toContain('Practice lab report (test data)');
  await expect(dated).toContainText(report.id);

  // Never twice: after a reload the page shows where it was dated, with no button.
  await page.reload();
  await expect(page.locator('[data-lab-report-dated]')).toContainText(report.id);
  await expect(
    page.locator('[data-date-lab-report]').getByRole('button', { name: 'Date this DNA report' }),
  ).toHaveCount(0);
  expect(opened(held).filter((r) => r.breedingMethod === 'Lab report')).toHaveLength(1);

  // The family tree: F2 is offspring; the record dating the report is not.
  await page.getByRole('button', { name: /Family tree/ }).click();
  await expect(page.getByRole('link', { name: f2 })).toBeVisible();
  await expect(page.locator('[data-dated-reports]')).toContainText('Dated DNA reports (not offspring)');
  await expect(page.locator('[data-dated-reports]')).toContainText(report.strainName);

  // The dating record's own page: what it dates, and only what makes sense for it.
  await page.goto(`/record/${report.id}`);
  await expect(page.getByRole('heading', { name: report.strainName })).toBeVisible();
  const own = page.locator('[data-lab-report-page]');
  await expect(own).toContainText(`This record dates a DNA report for ${f1}`);
  await expect(own).toContainText(`Lab report SHA-256: ${LAB_SHA}`);
  await expect(own.getByRole('link', { name: f1 })).toBeVisible();
  await expect(page.getByRole('button', { name: /Show someone/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Technical details/ })).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: /Add the next generation|Certificate|Send it to a lab|License it|Save a DNA report|Date this DNA report|Family tree/,
    }),
  ).toHaveCount(0);

  // Home: the dating record sits under its plant, not as a plant; counts say "records".
  await page.goto('/records');
  const f1Card = page.getByRole('link', { name: `Open ${f1}`, exact: true });
  await expect(f1Card.locator(`[data-home-dated="${report.id}"]`)).toContainText('DNA report dated');
  await expect(page.getByRole('link', { name: `Open ${report.strainName}` })).toHaveCount(0);
  await expect(page.getByText(/3 records have keys only on this device/)).toBeVisible();

  // Logging: it is never offered as a parent.
  await page.goto('/new');
  await page.getByRole('button', { name: /\+ Add parents, species/ }).click();
  await page.getByLabel('Parents').click();
  await expect(page.getByRole('option', { name: f1, exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: report.strainName })).toHaveCount(0);

  expectNoErrors(errors);
});
