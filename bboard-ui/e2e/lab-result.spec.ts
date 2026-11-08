// Lab results v2 (veilcore/lab-result.ts), against a real registry: a lab signs a pathogen
// result bound to a breeder's record, a DNA mark whose sequence stays sealed, and a CSV of
// comparisons in one go; the breeder checks each file on the check page, sees the lab named
// through its binding, adds the result to its records, and checks the mark's opening. A changed
// file is refused. All records and files are practice data.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import {
  API,
  REAL_REGISTRY,
  isolate,
  backupAfterLogging,
  receiveWithBackupFirst,
  expectNoErrors,
  watch,
  startPlant,
} from './helpers';

test.skip(!REAL_REGISTRY, 'needs a real registry: set E2E_API_BASE and build with it');

const SHOTS = process.env.E2E_SHOTS;
const shot = async (page: Page, name: string) => {
  if (!SHOTS) return;
  await page.setViewportSize({ width: 360, height: 800 });
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
};

const B = 'b2'.repeat(32);
const C = 'c3'.repeat(32);

/** Choose an option in the MUI select labelled `label`. */
const choose = async (page: Page, label: string | RegExp, option: string | RegExp) => {
  await (typeof label === 'string' ? page.getByLabel(label, { exact: true }) : page.getByLabel(label)).click();
  await page.getByRole('option', { name: option }).click();
};

const download = async (page: Page, click: () => Promise<void>): Promise<string> => {
  const d = page.waitForEvent('download');
  await click();
  return await (await d).path();
};

test('a lab signs results bound to a record; the breeder checks them, adds one, and checks a mark', async ({
  browser,
}, info) => {
  // The breeder logs a plant, saves it, and makes a code for the lab.
  const breederCtx = await browser.newContext({ acceptDownloads: true });
  const breeder = await breederCtx.newPage();
  const breederErrors = watch(breeder);
  await isolate(breeder);
  await breeder.goto('/records');
  await breeder.getByText('Start', { exact: true }).click();
  await startPlant(breeder);
  await breeder.getByLabel(/Plant or line name/).fill(`E2E Result ${Date.now()}`);
  await breeder.getByLabel(/Bred by/).fill('E2E breeder');
  await breeder.getByRole('button', { name: /Next: check it/ }).click();
  await breeder.getByRole('button', { name: /Seal it/ }).click();
  await breeder.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
  const recordId = await breeder.evaluate(
    () => Object.keys(JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as object)[0],
  );
  await backupAfterLogging(breeder, recordId);
  const subject = await breeder.evaluate(
    async ({ api, id }) => {
      const res = await fetch(`${api}/api/records`, {
        headers: { 'x-holder-key': localStorage.getItem('veilcore.holder.v1') ?? '' },
      });
      const rows = (await res.json()) as { id: string; recordFingerprint: string }[];
      return rows.find((r) => r.id === id)?.recordFingerprint ?? '';
    },
    { api: API, id: recordId },
  );
  expect(subject).toMatch(/^[0-9a-f]{64}$/);
  await breeder.goto(`/record/${recordId}`);
  await breeder.getByText('Send it to a lab or breeder').click();
  await breeder.getByLabel(/Who are you sending it to/).fill('lab@e2e');
  await breeder.getByRole('button', { name: /Make a code for the lab/ }).click();
  const code = (await breeder.getByText(/^TR-[0-9A-F]{8}\./).innerText()).trim();
  await breeder.getByRole('button', { name: /^Done$/ }).click();

  // The lab: its key, the delivery (which also makes and checks its backup), then its tools.
  const labCtx = await browser.newContext({ acceptDownloads: true });
  const lab = await labCtx.newPage();
  const labErrors = watch(lab);
  await isolate(lab);
  await lab.goto('/records');
  await lab.getByRole('button', { name: "I'm a lab" }).click();
  await lab.getByRole('button', { name: /I run a lab/ }).click();
  await lab.getByRole('button', { name: /Set up your lab.s signature/ }).click();
  await lab.getByLabel(/^Name/).fill('E2E Lab');
  await lab.getByRole('button', { name: /Create my key/ }).click();
  await lab.getByRole('button', { name: /^Done$/ }).click();
  await receiveWithBackupFirst(lab, code);
  await lab.getByLabel(/I physically received this material/).check();
  await lab.getByRole('button', { name: /Sign with my key/ }).click();
  await expect(lab).toHaveURL(/\/record\//);
  await lab.goto('/records');
  await lab.locator('[data-lab-results-link]').click();
  await expect(lab.getByRole('heading', { name: 'Sign lab results' })).toBeVisible();

  // One pathogen result: HLVd not detected, bound to the breeder's record.
  const form = lab.locator('[data-result-form]');
  await form.getByLabel(/Proof code the sender gave for this sample/).fill(subject.toUpperCase());
  await form.getByLabel(/Sample ID/).fill('S-0412');
  await form.getByLabel('Your accession number').fill('LAB-26-1187');
  await form.getByLabel('Method or SOP').fill('RT-qPCR HLVd SOP-14');
  await form.getByLabel('Method version').fill('3');
  await form.getByLabel(/Sample type/).fill('leaf');
  await choose(lab, 'Result', 'Not detected');
  await form.getByRole('button', { name: 'Add a QC figure' }).click();
  await form.getByLabel('QC figure').fill('Internal control Ct');
  await form.getByLabel('Value').fill('24.1');
  await shot(lab, 'lab-sign-form');
  await lab.getByRole('button', { name: 'Sign this result' }).click();
  await expect(lab.getByRole('heading', { name: 'Signed and kept' })).toBeVisible({ timeout: 60_000 });
  await expect(lab.getByText('Your lab’s name is on it.')).toBeVisible();
  await expect(lab.locator('[data-lab-result-call]')).toHaveText('Not detected');
  await shot(lab, 'lab-signed');
  const pathogenFile = await download(lab, () => lab.locator('[data-result-download]').click());

  // A DNA mark: its sequence sealed, and an opening the lab keeps.
  await lab.getByRole('button', { name: 'Sign another' }).click();
  await choose(lab, 'What kind of result', 'DNA mark');
  await form.getByLabel(/Proof code the sender gave for this sample/).fill(subject);
  await form.getByLabel(/Sample ID/).fill('S-0413');
  await form.getByLabel('Your accession number').fill('LAB-26-1188');
  await form.getByLabel('Method or SOP').fill('Mark PCR');
  await form.getByLabel('Method version').fill('1');
  await form.getByLabel(/The mark’s sequence/).fill('>mark 7\nacgtacgtac gttgcaacgt\n');
  await choose(lab, 'Result', 'Mark found');
  await shot(lab, 'lab-mark-form');
  await lab.getByRole('button', { name: 'Sign this result' }).click();
  await expect(lab.locator('[data-mark-keep]')).toBeVisible({ timeout: 60_000 });
  // The sequence file exists only here: nothing else can be signed until it is saved.
  await expect(lab.locator('[data-sign-another]')).toBeDisabled();
  const openingFile = await download(lab, () => lab.locator('[data-mark-download]').click());
  await expect(lab.locator('[data-mark-keep]')).toHaveAttribute('data-mark-keep', 'saved');
  const markFile = await download(lab, () => lab.locator('[data-result-download]').click());
  expect(readFileSync(markFile, 'utf8')).not.toContain('ACGTACGTACGTTGCAACGT');
  expect(readFileSync(openingFile, 'utf8')).toContain('ACGTACGTACGTTGCAACGT');

  // A spreadsheet of comparisons: each row its own signed result; a bad row is named, not signed.
  await lab.getByRole('button', { name: 'Sign another' }).click();
  await lab.getByRole('tab', { name: 'From a spreadsheet (CSV)' }).click();
  await choose(lab, 'What the rows are', 'Comparison with another record');
  const csvBox = lab.locator('[data-lab-csv]');
  await csvBox.getByLabel('Method or SOP').fill('SNP genotyping');
  await csvBox.getByLabel('Method version').fill('4');
  await csvBox.getByLabel(/Marker panel/).fill('CannSNP90');
  await csvBox.getByLabel('Panel version').fill('2.1');
  const csvPath = info.outputPath('results.csv');
  writeFileSync(
    csvPath,
    [
      'subject,sample id,accession,other,result,compared,differing,qc: call rate %',
      `${subject},S-1,LAB-C-1,${B},match,90,0,99.4`,
      `${subject},S-2,LAB-C-2,${C},no match,90,31,98.7`,
      `${subject},S-3,LAB-C-3,${subject},match,90,0,99.0`,
    ].join('\n'),
  );
  await lab.locator('[data-csv-input]').setInputFiles(csvPath);
  await expect(csvBox).toContainText('2 ready to sign. 1 won’t be signed');
  await expect(csvBox.locator('[data-csv-bad="4"]')).toContainText('Line 4');
  await shot(lab, 'lab-csv');
  await lab.getByRole('button', { name: 'Sign 2 results' }).click();
  await expect(lab.getByRole('heading', { name: 'Signed and kept: 2' })).toBeVisible({ timeout: 90_000 });
  await shot(lab, 'lab-csv-signed');
  // Each result is its own file, for its own client: one per row, or all of them as a zip of
  // separate files. The one-file archive is for the lab's records and says so.
  await expect(lab.locator('[data-row-download]')).toHaveCount(2);
  const secondRow = await download(lab, () => lab.locator('[data-row-download]').nth(1).click());
  const zip = await download(lab, () => lab.locator('[data-result-download]').click());
  expect(readFileSync(zip).subarray(0, 2).toString('latin1')).toBe('PK');
  const resultsFile = await download(lab, () => lab.locator('[data-result-archive]').click());
  // The summary lists the row that wasn't signed, so it isn't forgotten.
  const summary = await download(lab, () => lab.getByRole('button', { name: /summary for your LIMS/ }).click());
  expect(readFileSync(summary, 'utf8')).toContain('not signed: line 4');
  // The lab's own list now holds all four, each a record it holds.
  await expect(lab.locator('[data-my-results]')).toContainText('LAB-C-2');
  expectNoErrors(labErrors);

  // The breeder checks the pathogen result: bound, the lab named, the call; then adds it.
  await breeder.goto('/check-lab-result');
  await breeder.locator('[data-result-input]').setInputFiles(pathogenFile);
  const checked = breeder.locator('[data-lab-result-checked]');
  // Nothing is looked up until the checker asks: the lookup sends the result's code.
  await expect(checked).toHaveAttribute('data-signer', 'not-asked');
  await checked.locator('[data-lab-name-find]').click();
  await expect(checked).toHaveAttribute('data-signer', 'bound', { timeout: 20_000 });
  await expect(checked).toContainText('Signed by a key named “E2E Lab” (name not checked)');
  await expect(checked.locator('[data-lab-result-call]')).toHaveText('Not detected');
  await expect(checked).toContainText('RT-qPCR HLVd SOP-14, version 3');
  await expect(checked).toContainText('VeilCore didn’t take or test this sample');
  await shot(breeder, 'lab-check');
  // The page reads the breeder's records only when asked (the sync sends the holder key).
  await checked.locator('[data-lab-result-find]').click();
  await checked.locator('[data-lab-result-add]').click();
  await checked.getByRole('link', { name: 'Open the record' }).click();
  await expect(breeder.locator('[data-lab-result-panel]')).toContainText('Not detected');
  await expect(breeder.locator('[data-lab-signature] [data-lab-signed="bound"]')).toBeVisible({ timeout: 20_000 });
  await shot(breeder, 'lab-record');

  // The mark: the seal shown, the sequence not; the lab's opening matches it.
  await breeder.goto('/check-lab-result');
  await breeder.locator('[data-result-input]').setInputFiles(markFile);
  await expect(breeder.locator('[data-lab-result-checked]')).toContainText('Mark found');
  await breeder.locator('[data-opening-input]').setInputFiles(openingFile);
  await expect(breeder.locator('[data-mark-answer="yes"]')).toContainText('20 letters');
  await shot(breeder, 'lab-mark-dispute');

  // The CSV run's file: two separately signed results.
  await breeder.goto('/check-lab-result');
  await breeder.locator('[data-result-input]').setInputFiles(resultsFile);
  await expect(breeder.locator('[data-lab-result-checked]')).toHaveCount(2);
  await expect(breeder.locator('[data-lab-result-checked]').nth(1)).toContainText('Different genotype at the markers compared');
  await expect(breeder.locator('[data-lab-result-checked]').nth(1)).toContainText('(90 markers compared, 31 differ)');
  // The second row's own file holds that one result only.
  await breeder.goto('/check-lab-result');
  await breeder.locator('[data-result-input]').setInputFiles(secondRow);
  await expect(breeder.locator('[data-lab-result-checked]')).toHaveCount(1);
  await expect(breeder.locator('[data-lab-result-checked]')).toContainText('LAB-C-2');

  // A result changed after signing is refused, by name.
  const changed = JSON.parse(readFileSync(pathogenFile, 'utf8')) as { statement: { sampleId: string } };
  changed.statement.sampleId = 'S-9999';
  const changedPath = info.outputPath('changed.json');
  writeFileSync(changedPath, JSON.stringify(changed));
  await breeder.goto('/check-lab-result');
  await breeder.locator('[data-result-input]').setInputFiles(changedPath);
  await expect(breeder.locator('[data-lab-result-bad="file"]')).toContainText('isn’t the one the lab signed');
  await shot(breeder, 'lab-check-refused');
  expectNoErrors(breederErrors);
  await breederCtx.close();
  await labCtx.close();
});
