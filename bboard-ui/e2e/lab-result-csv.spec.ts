// A lab's spreadsheet of results on /lab/results (veilcore/lab-result-csv.ts), in the built site
// with the stand-in registry. Nothing is signed here: this is what a technician sees before
// signing (plant-users review, 22 Nov):
//   - the help lists every column a row needs for the kind chosen, and the template has them
//     all (method and method version too) with one example row;
//   - a file with problems lists every problem in every row at once, by row and column, and a
//     file missing columns names every one of them;
//   - "won't be signed" shows only when some row won't be.
// Signing a file twice (the warning, skip by default) needs a real registry: lab-result.spec.ts.
// E2E_SHOTS saves screenshots at 390 and 1366 px.
// SPDX-License-Identifier: Apache-2.0
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { generateKeypair } from 'veilcore-records';
import { REAL_REGISTRY, expectNoErrors, isolate, json, watch } from './helpers';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

const FP = randomBytes(32).toString('hex');
const SHOTS = process.env.E2E_SHOTS;

const shoot = async (page: Page, name: string, at?: () => Promise<void>) => {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const width of [390, 1366]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await at?.();
    await page.screenshot({ path: path.join(SHOTS, `${name}-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
};

/** The lab's spreadsheet tab, with a signing key in this browser (made here, never published). */
const openCsv = async (page: Page) => {
  const keypair = await generateKeypair();
  await page.addInitScript(
    (k) => localStorage.setItem('veilcore.attester.v1', JSON.stringify({ keypair: k, role: 'laboratory' })),
    keypair,
  );
  await isolate(page, {
    'GET /api/records': (route) => json(route, 200, []),
    'GET /api/licenses': (route) => json(route, 200, []),
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
  });
  await page.goto('/lab/results?lang=en');
  await expect(page.getByRole('heading', { name: 'Sign lab results', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'From a spreadsheet (CSV)' }).click();
  return page.locator('[data-lab-csv]');
};

const choose = async (page: Page, label: string, option: string | RegExp) => {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option }).click();
  await expect(page.getByRole('listbox')).toBeHidden();
};

const upload = async (page: Page, name: string, lines: string[]) => {
  const file = test.info().outputPath(name);
  fs.writeFileSync(file, lines.join('\n'));
  await page.locator('[data-csv-input]').setInputFiles(file);
};

test('the help and the template list every column a row needs, for each kind', async ({ page }) => {
  const errors = watch(page);
  const csv = await openCsv(page);
  const help = csv.locator('[data-csv-help]');
  const needs = async () =>
    help.locator('[data-csv-needs]').evaluateAll((els) => els.map((e) => e.getAttribute('data-csv-needs')));
  expect(await needs()).toEqual([
    'subject',
    'sample id',
    'accession',
    'method, method version',
    'result',
    'target, sample type',
  ]);
  await expect(help).toContainText('“detected” or “not detected”');
  await expect(help).toContainText('or type them once above, for every row');
  await expect(help).toContainText('The template has every column, with one example row.');
  await expect(csv).toContainText('A USB barcode scanner can fill the subject column');
  await shoot(page, 'lab-csv-help', () => help.scrollIntoViewIfNeeded());

  // The template: the header and one example row, method and method version among the columns.
  const saved = page.waitForEvent('download');
  await csv.locator('[data-csv-template]').click();
  const template = fs
    .readFileSync(await (await saved).path(), 'utf8')
    .trim()
    .split('\n');
  expect(template).toHaveLength(2);
  for (const c of ['subject', 'sample id', 'accession', 'method', 'method version', 'result', 'target', 'sample type'])
    expect(template[0].split(','), c).toContain(c);

  await choose(page, 'What the rows are', 'Comparison with another record');
  expect(await needs()).toContain('other');
  await expect(help).toContainText('“match” or “no match”');
  await choose(page, 'What the rows are', /Parentage/);
  expect(await needs()).toContain('parent 1');
  await expect(help).toContainText('“consistent” or “excluded”');
  expectNoErrors(errors);
});

test("a file's problems are all listed at once, by row and column; with none, nothing says it won't be signed", async ({
  page,
}) => {
  const errors = watch(page);
  const csv = await openCsv(page);
  // Nothing typed on the page for the method, its version or the sample type.
  await upload(page, 'problems.csv', [
    'subject,sample id,accession,result,ct',
    `${FP},S-1,L-1,not detected,`,
    '',
    `,,L-3,maybe,1000`,
  ]);
  await expect(csv.locator('[data-csv-ready]')).toHaveText(
    '0 ready to sign. 2 won’t be signed: fix them and run them again.',
  );
  await expect(csv.locator('[data-csv-bad="2"]')).toHaveText('Row 2: Missing: method, method version, sample type.');
  // The blank row is counted, so the number is the one the spreadsheet shows.
  await expect(csv.locator('[data-csv-bad="4"]')).toHaveText(
    'Row 4: Missing: subject, sample id, method, method version, sample type. The result cell isn’t one this kind of result takes (for a pathogen test: detected or not detected). Ct is a number under 100 with at most two decimals (24.13, not 24.1287). Round it in the file the way your report shows it.',
  );
  await shoot(page, 'lab-csv-problems', () => csv.locator('[data-csv-problems]').scrollIntoViewIfNeeded());

  // Typed once on the page: row 2 is ready, row 4 keeps only its own cells' problems.
  await csv.getByLabel('Method or SOP').fill('RT-qPCR HLVd SOP-14');
  await csv.getByLabel('Method version').fill('3');
  await csv.getByLabel(/Sample type/).fill('leaf');
  await expect(csv.locator('[data-csv-ready]')).toHaveText(
    '1 ready to sign. 1 won’t be signed: fix them and run them again.',
  );
  await expect(csv.locator('[data-csv-bad="4"]')).toContainText('Row 4: Missing: subject, sample id.');
  await expect(csv.locator('[data-csv-bad="2"]')).toHaveCount(0);

  // Nothing wrong: no "0 won't be signed".
  await upload(page, 'good.csv', ['subject,sample id,accession,result', `${FP},S-1,L-1,not detected`]);
  await expect(csv.locator('[data-csv-ready]')).toHaveText('1 ready to sign.');
  await expect(csv).not.toContainText('won’t be signed');
  await expect(csv.locator('[data-csv-problems]')).toHaveCount(0);
  await expect(csv.getByRole('button', { name: 'Sign 1 result' })).toBeVisible();
  await shoot(page, 'lab-csv-ready', () => csv.locator('[data-csv-ready]').scrollIntoViewIfNeeded());

  // A file without the columns no row can do without: every missing one named, nothing read.
  await upload(page, 'columns.csv', ['sample,well', 'S-1,A1']);
  await expect(csv.locator('[data-csv-refused="columns"]')).toHaveText(
    'The file has no column for: subject, accession, result. Every row needs them; the template has every column.',
  );
  expectNoErrors(errors);
});
