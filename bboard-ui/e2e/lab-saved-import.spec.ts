// "Seal today's sheet": a tissue culture lab's daily export, two days running, in the built site
// with the stand-in registry (veilcore/import-layouts.ts, lab-import/BulkImportPage.tsx).
//   - the way in: the lab's home and the For labs page both lead to the import;
//   - day 1: the columns are picked by hand, "remember these columns" is on, and the rows seal;
//   - day 2: the next file with the same columns opens straight on the check screen, filled in,
//     with the row count and one button, and seals;
//   - the layout is kept in this browser only: nothing about it goes to the registry, and it can
//     be forgotten, after which the next file asks for its columns again.
// NEW_SHOTS saves screenshots at 360 px.
// SPDX-License-Identifier: Apache-2.0
import { randomBytes } from 'node:crypto';
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

type Rec = Record<string, unknown> & { id: string };

const LAYOUTS_KEY = 'veilcore.import-layouts.v1';
const JOB_KEY = 'veilcore.bulk-import.job.v1';

const shot = async (page: Page, name: string) => {
  const dir = process.env.NEW_SHOTS;
  if (!dir) return;
  const size = page.viewportSize();
  await page.setViewportSize({ width: 360, height: 740 });
  await page.screenshot({ path: `${dir}/${name}-360.png`, fullPage: true });
  if (size) await page.setViewportSize(size);
};

/** A lab's browser with a checked backup key, and a registry that keeps what it is sent. */
const standIn = async (page: Page) => {
  const holder = randomBytes(32).toString('hex');
  await page.addInitScript((h) => {
    localStorage.setItem('veilcore.holder.v1', h);
    localStorage.setItem('veilcore.role.v1', 'lab');
  }, holder);
  await holdVaultKey(page, newVaultKey());
  const held: { records: Rec[]; bodies: string[] } = { records: [], bodies: [] };
  await isolate(page, {
    'GET /api/records': (route) => json(route, 200, held.records),
    'PUT /api/records': (route, _url, body) => {
      held.bodies.push(JSON.stringify(body));
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

const upload = (page: Page, name: string, lines: string[]) =>
  page
    .locator('input[type="file"]')
    .setInputFiles({ name, mimeType: 'text/csv', buffer: Buffer.from(lines.join('\n')) });

const choose = async (page: Page, label: string | RegExp, option: string) => {
  await page.getByRole('combobox', { name: label }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
  await expect(page.getByRole('listbox')).toBeHidden();
};

const HEADER = 'Vessel,Clone,Stage,Initiated,Tech';

test('a lab seals its daily sheet: columns picked once, then one button the next day', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watch(page);
  const held = await standIn(page);

  // The way in: the lab's home, and the For labs page.
  await page.goto('/records?lang=en');
  const fromHome = page.locator('[data-lab-sheet-link="home"]');
  await expect(fromHome).toHaveText("Seal today's sheet");
  await page.goto('/for-labs?lang=en');
  const fromDoor = page.locator('[data-lab-sheet-link="door"]');
  await expect(fromDoor).toBeVisible();
  await fromDoor.click();
  await expect(page).toHaveURL(/\/records\/import/);
  await expect(page.locator('[data-saved-layouts]')).toHaveCount(0);

  // ---- Day 1: the columns, by hand ----
  await upload(page, 'TC_export_2026-11-24.csv', [
    HEADER,
    'V-001,Lab Clone A (test data),Multiply,2026-11-24,AR',
    'V-002,Lab Clone B (test data),Root,2026-11-24,AR',
  ]);
  await page.getByRole('button', { name: 'Next: which column is which' }).click();
  await choose(page, /^Plant or line name/, 'Clone');
  await choose(page, /^Your ID/, 'Vessel');
  await choose(page, /^Notes/, 'Stage');
  await page.getByLabel('Bred by, where a row doesn’t say').fill('Practice lab (test data)');
  await page.getByRole('button', { name: 'Next: check the rows' }).click();
  await expect(page.locator('[data-screen-heading]')).toContainText('Is this right?');
  const remember = page.getByRole('checkbox', { name: 'Remember these columns on this device for next time' });
  await expect(remember).toBeChecked();
  await expect(page.locator('[data-saved-layout-used]')).toHaveCount(0);
  await shot(page, 'lab-sheet-1-day1-check');
  await page.getByRole('button', { name: 'Seal 2 records' }).click();
  await expect(page.locator('[data-screen-heading]')).not.toContainText('Is this right?', { timeout: 60_000 });
  await expect.poll(() => held.records.length, { timeout: 60_000 }).toBe(2);

  // Kept in this browser: the column names and which is which, and no cell of the file.
  const kept = await page.evaluate((k) => localStorage.getItem(k), LAYOUTS_KEY);
  expect(kept).toContain('"name":"TC export"');
  expect(kept).toContain('"strainName":"clone"');
  expect(kept).not.toContain('Lab Clone A');
  // And nothing of the layout is sent: the registry never sees the column names.
  for (const b of held.bodies) expect(b).not.toContain('import-layouts');

  // ---- Day 2: yesterday's import was put away ("Import another file" clears it) ----
  await page.evaluate((k) => localStorage.removeItem(k), JOB_KEY);
  await page.goto('/records/import?lang=en');
  await expect(page.locator('[data-saved-layout="TC export"]')).toBeVisible();
  await upload(page, 'TC_export_2026-11-25.csv', [
    HEADER,
    'V-003,Lab Clone C (test data),Multiply,2026-11-25,JS',
    'V-004,Lab Clone D (test data),Multiply,2026-11-25,JS',
    'V-005,Lab Clone E (test data),Root,2026-11-25,JS',
  ]);
  // Straight to the check screen: filled in, the row count, and one button.
  await expect(page.locator('[data-screen-heading]')).toContainText('Is this right?');
  await expect(page.locator('[data-saved-layout-used="TC export"]')).toContainText(
    'Same columns as last time (TC export), filled in for you.',
  );
  await expect(page.getByText(/^3 rows? ready/)).toBeVisible();
  await expect(page.locator('[data-preview-row="2"]')).toContainText('Lab Clone C (test data)');
  await expect(page.locator('[data-preview-row="2"]')).toContainText('V-003');
  await expect(page.locator('[data-preview-row="2"]')).toContainText('Practice lab (test data)');
  await expect(page.locator('main .MuiButton-contained')).toHaveCount(1);
  await shot(page, 'lab-sheet-2-day2-check');
  await page.getByRole('button', { name: 'Seal 3 records' }).click();
  await expect.poll(() => held.records.length, { timeout: 60_000 }).toBe(5);

  // ---- Forgetting: the next file asks for its columns again ----
  await page.evaluate((k) => localStorage.removeItem(k), JOB_KEY);
  await page.goto('/records/import?lang=en');
  await page.getByRole('button', { name: 'Forget the columns for TC export' }).click();
  await expect(page.locator('[data-saved-layouts]')).toHaveCount(0);
  expect(await page.evaluate((k) => localStorage.getItem(k), LAYOUTS_KEY)).toBeNull();
  await upload(page, 'TC_export_2026-11-26.csv', [HEADER, 'V-006,Lab Clone F (test data),Root,2026-11-26,JS']);
  await expect(page.getByRole('button', { name: 'Next: which column is which' })).toBeVisible();

  expectNoErrors(errors);
});
