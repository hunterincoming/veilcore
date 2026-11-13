// A viability result (veilcore/lab-result.ts; SDK SPEC 11.12, "Viability"), against a real
// registry: a producer logs its production strain and sends a sample to a lab; the lab signs a
// before/after pair for one batch, the after-sample naming the before-sample's result and the
// strain record by proof code only; the producer checks the two files together, sees them paired
// and the honest words ("no viable organisms recovered" under the stated method and limit), and
// adds the after result to its strain record. A run whose positive control didn't grow is refused,
// and so is a number typed with separators ("1,000", "4,300"): nothing is tidied or guessed. None
// recovered reads as below the limit of detection, never as a count of 0. When the lab withdraws
// the before-sample's result, the two no longer read as a pair.
// All records and files are practice data.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  API,
  REAL_REGISTRY,
  isolate,
  backupAfterLogging,
  receiveWithBackupFirst,
  expectNoErrors,
  watch,
} from './helpers';

test.skip(!REAL_REGISTRY, 'needs a real registry: set E2E_API_BASE and build with it');

const SHOTS = process.env.E2E_SHOTS;
const shot = async (page: Page, name: string) => {
  if (!SHOTS) return;
  await page.setViewportSize({ width: 360, height: 800 });
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
};

/** Choose an option in the MUI select labelled `label`. */
const choose = async (scope: Page | Locator, page: Page, label: string, option: string | RegExp) => {
  await scope.getByLabel(label, { exact: true }).click();
  await page.getByRole('option', { name: option, exact: typeof option === 'string' }).click();
};

const download = async (page: Page, click: () => Promise<void>): Promise<string> => {
  const d = page.waitForEvent('download');
  await click();
  return await (await d).path();
};

/** A date this many days before today, on this computer's calendar, YYYY-MM-DD. */
const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

test('a lab signs a before/after kill-step pair; the producer checks them together and adds one', async ({
  browser,
}) => {
  // The producer logs its production strain, saves it, and makes a code for the lab.
  const prodCtx = await browser.newContext({ acceptDownloads: true });
  const producer = await prodCtx.newPage();
  const prodErrors = watch(producer);
  await isolate(producer);
  await producer.goto('/new');
  await producer.getByRole('button', { name: /Microbes and cell lines/ }).click();
  await producer.getByLabel('Strain name').fill(`E2E Meal Strain ${Date.now()}`);
  await producer.getByLabel('Your designation').fill('AO-E2E-1');
  await producer.getByLabel('What kind').click();
  await producer.getByRole('option', { name: /Filamentous fungus/ }).click();
  await producer.getByLabel(/^Species/).fill('Aspergillus oryzae');
  await producer.getByLabel(/^Made or isolated by/).fill('E2E producer (test data)');
  await producer.getByRole('button', { name: /Next: check it/ }).click();
  await producer.getByRole('button', { name: /Seal it/ }).click();
  await producer.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
  const recordId = await producer.evaluate(
    () => Object.keys(JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as object)[0],
  );
  await backupAfterLogging(producer, recordId);
  const strain = await producer.evaluate(
    async ({ api, id }) => {
      const res = await fetch(`${api}/api/records`, {
        headers: { 'x-holder-key': localStorage.getItem('veilcore.holder.v1') ?? '' },
      });
      const rows = (await res.json()) as { id: string; recordFingerprint: string }[];
      return rows.find((r) => r.id === id)?.recordFingerprint ?? '';
    },
    { api: API, id: recordId },
  );
  expect(strain).toMatch(/^[0-9a-f]{64}$/);
  await producer.goto(`/record/${recordId}`);
  await producer.getByText('Send it to a lab or breeder').click();
  await producer.getByLabel(/Who are you sending it to/).fill('micro-lab@e2e');
  await producer.getByRole('button', { name: /Make a code for the lab/ }).click();
  const code = (await producer.getByText(/^TR-[0-9A-F]{8}\./).innerText()).trim();
  await producer.getByRole('button', { name: /^Done$/ }).click();

  // The lab: its key, the delivery (which also makes and checks its backup), then its tools.
  const labCtx = await browser.newContext({ acceptDownloads: true });
  const lab = await labCtx.newPage();
  const labErrors = watch(lab);
  await isolate(lab);
  await lab.goto('/records');
  await lab.getByRole('button', { name: "I'm a lab" }).click();
  await lab.getByRole('button', { name: /I run a lab/ }).click();
  await lab.getByRole('button', { name: /Set up your lab.s signature/ }).click();
  await lab.getByLabel(/^Name/).fill('E2E Micro Lab');
  await lab.getByRole('button', { name: /Create my key/ }).click();
  await lab.getByRole('button', { name: /^(Continue|Done)$/ }).click();
  await receiveWithBackupFirst(lab, code);
  await lab.getByLabel(/I physically received this material/).check();
  await lab.getByRole('button', { name: /Sign with my key/ }).click();
  await expect(lab).toHaveURL(/\/record\//);
  await lab.goto('/records');
  await lab.locator('[data-lab-results-link]').click();
  await expect(lab.getByRole('heading', { name: 'Sign lab results' })).toBeVisible();

  const form = lab.locator('[data-result-form]');
  /** What both samples of the batch share, as the lab types it from its report. */
  const common = async (sampleId: string, accession: string) => {
    await choose(form, lab, 'What kind of result', 'Viability test before or after a kill step');
    await form.getByLabel(/Proof code the sender gave for this sample/).fill(strain);
    await form.getByLabel(/Sample ID/).fill(sampleId);
    await form.getByLabel('Your accession number').fill(accession);
    await form.getByLabel('Date read (end of incubation)').fill(daysAgo(0));
    await form.getByLabel('Batch or lot ID').fill('MEAL-26-0907');
    await form.getByLabel('Proof code of the strain record the batch was made from').fill(strain);
    await form.getByLabel('What the test recovers', { exact: false }).fill('The production strain');
    await form.getByLabel('Positive control (organism and amount)').fill('Production strain, about 50 CFU');
    await choose(form, lab, 'Positive control', 'Grew');
    await choose(form, lab, 'Negative control', 'No growth');
  };

  // The before-sample: the meal before the kill step, plated; the strain grew back.
  await common('MEAL-0907-PRE', 'LAB-26-2201');
  await form.getByLabel('Method or SOP').fill('Spread plate on PDA, SOP-M7');
  await form.getByLabel('Method version').fill('2');
  await choose(form, lab, 'When the sample was taken', 'Before the kill step');
  await form.getByLabel('Date sampled').fill(daysAgo(8));
  await form.getByLabel(/Portion tested and its amount/).fill('10 g of meal, 1 in 10, 0.1 mL on 3 plates');
  await form.locator('[data-culture="0"]').getByLabel('Medium').fill('PDA with chloramphenicol');
  await form.locator('[data-culture="0"]').getByLabel('Time').fill('7 days');
  await form.locator('[data-culture="0"]').getByLabel('Temperature').fill('25 °C');
  // A number with separators is refused, with how to type it: "1,000" could be a thousand or one.
  await form.getByLabel('Limit of detection').fill('1,000');
  await form.getByLabel(/^Unit/).nth(0).fill('CFU/g');
  await choose(form, lab, 'Result', 'Viable organisms recovered');
  await form.getByLabel(/Count as reported/).fill('4300000');
  await form.getByLabel(/^Unit/).nth(1).fill('CFU/g');
  await lab.getByRole('button', { name: 'Sign this result' }).click();
  await expect(lab.locator('[data-result-problem="lodNumber"]')).toContainText('type a thousand as 1000');
  await form.getByLabel('Limit of detection').fill('100');
  await form.getByLabel(/Count as reported/).fill('4,300');
  await lab.getByRole('button', { name: 'Sign this result' }).click();
  await expect(lab.locator('[data-result-problem="countNumber"]')).toContainText('plain number');
  await form.getByLabel(/Count as reported/).fill('4300000');
  await shot(lab, 'viability-before-form');
  await lab.getByRole('button', { name: 'Sign this result' }).click();
  await expect(lab.getByRole('heading', { name: 'Signed and kept' })).toBeVisible({ timeout: 60_000 });
  await expect(lab.getByText('Your lab’s name is on it.')).toBeVisible();
  await expect(lab.locator('[data-lab-result-call]')).toHaveText('Viable organisms recovered');
  const beforeFile = await download(lab, () => lab.locator('[data-result-download]').click());

  // The after-sample: the same batch after the kill step, enriched in broth then plated.
  await lab.getByRole('button', { name: 'Sign another' }).click();
  await common('MEAL-0907-POST', 'LAB-26-2202');
  await form.getByLabel('Method or SOP').fill('Enrichment then PDA, SOP-M9');
  await form.getByLabel('Method version').fill('1');
  await choose(form, lab, 'When the sample was taken', 'After the kill step');
  await form.getByLabel('Kill step: method and parameters').fill('Steam, 95 °C core for 30 min, then dried at 70 °C');
  // The before-sample's result is offered by batch, from the lab's own results.
  await choose(form, lab, 'The before-sample result for this batch (optional)', /LAB-26-2201 · MEAL-0907-PRE/);
  await form.getByLabel('Date sampled').fill(daysAgo(7));
  await form.getByLabel(/Portion tested and its amount/).fill('25 g of meal in 225 mL broth');
  await form.locator('[data-culture="0"]').getByLabel('Medium').fill('Potato dextrose broth');
  await form.locator('[data-culture="0"]').getByLabel('Time').fill('7 days');
  await form.locator('[data-culture="0"]').getByLabel('Temperature').fill('25 °C');
  await form.getByRole('button', { name: 'Add a medium' }).click();
  await form.locator('[data-culture="1"]').getByLabel('Medium').fill('PDA with chloramphenicol');
  await form.locator('[data-culture="1"]').getByLabel('Time').fill('5 days');
  await form.locator('[data-culture="1"]').getByLabel('Temperature').fill('25 °C');
  await form.getByLabel('Limit of detection').fill('1');
  await form.getByLabel(/^Unit/).nth(0).fill('CFU per 25 g');
  await choose(form, lab, 'Result', 'No viable organisms recovered');
  // None recovered: no count to type; the result is below the limit of detection.
  await expect(form.getByLabel(/Count as reported/)).toHaveCount(0);
  await expect(form.locator('[data-viability-below]')).toContainText('never as 0');
  // An invalid run can't be signed: a positive control that didn't grow is refused, by name.
  await choose(form, lab, 'Positive control', 'No growth');
  await lab.getByRole('button', { name: 'Sign this result' }).click();
  await expect(lab.locator('[data-result-problem="controls"]')).toContainText('can’t be signed');
  await choose(form, lab, 'Positive control', 'Grew');
  await shot(lab, 'viability-after-form');
  await lab.getByRole('button', { name: 'Sign this result' }).click();
  await expect(lab.getByRole('heading', { name: 'Signed and kept' })).toBeVisible({ timeout: 60_000 });
  await expect(lab.getByText('Your lab’s name is on it.')).toBeVisible();
  await expect(lab.locator('[data-lab-result-call]')).toHaveText('No viable organisms recovered');
  await shot(lab, 'viability-after-signed');
  const afterFile = await download(lab, () => lab.locator('[data-result-download]').click());
  // The strain is in the result by proof code only: its name and species are not.
  const afterText = readFileSync(afterFile, 'utf8');
  expect(afterText).toContain(strain);
  expect(afterText).not.toContain('Aspergillus');
  expect(afterText).not.toContain('E2E Meal Strain');
  expectNoErrors(labErrors);

  // The producer checks the after-sample alone: it names a before-sample that isn't there.
  await producer.goto('/check-lab-result');
  await producer.locator('[data-result-input]').setInputFiles(afterFile);
  await expect(producer.locator('[data-viability-pair="missing"]')).toContainText('Choose both files together');

  // Both files together: paired, signed by the same key, with the honest words.
  await producer.goto('/check-lab-result');
  await producer.locator('[data-result-input]').setInputFiles([beforeFile, afterFile]);
  const checked = producer.locator('[data-lab-result-checked]');
  await expect(checked).toHaveCount(2);
  const after = checked.filter({ has: producer.locator('[data-viability-stage="after"]') });
  await expect(after.locator('[data-viability-pair="paired"]')).toContainText(
    'both tests looked for The production strain. Before the kill step: Viable organisms recovered. After it: No viable organisms recovered.',
  );
  // The two used different methods: said plainly.
  await expect(after.locator('[data-viability-pair-method="differ"]')).toContainText(
    'The two tests used different methods (Spread plate on PDA, SOP-M7 (2) before, Enrichment then PDA, SOP-M9 (1) after).',
  );
  // None recovered is "< LOD", never a count of 0.
  await expect(after.locator('[data-viability-found="below-lod"]')).toHaveText(
    '< 1 CFU per 25 g: none recovered above the limit of detection',
  );
  await expect(after.locator('[data-lab-result-call]')).toHaveText('No viable organisms recovered');
  await expect(after.locator('[data-viability-note="none"]')).toHaveText(
    'The lab reported no viable organisms recovered from 25 g of meal in 225 mL broth, under Enrichment then PDA, SOP-M9 (version 1), with a limit of detection of 1 CFU per 25 g.',
  );
  await expect(after).toContainText(
    'Potato dextrose broth: 7 days at 25 °C · PDA with chloramphenicol: 5 days at 25 °C',
  );
  await expect(after).toContainText('a portion may not stand for the whole batch');
  await expect(after).toContainText('nothing in that record is in this result');
  const pageText = await producer.locator('[data-lab-result-check]').innerText();
  expect(pageText).not.toMatch(/\bdead\b|steril|\bproves?\b/i);
  expect(pageText).not.toMatch(/as reported\s*:?\s*0\b/i);
  await after.locator('[data-lab-name-find]').click();
  await expect(after).toHaveAttribute('data-signer', 'bound', { timeout: 20_000 });
  await expect(after).toContainText('Signed by a key named “E2E Micro Lab” (name not checked)');
  await shot(producer, 'viability-check-pair');

  // The producer adds the after result to its strain record, and sees it there.
  await after.locator('[data-lab-result-find]').click();
  await after.locator('[data-lab-result-add]').click();
  await after.getByRole('link', { name: 'Open the record' }).click();
  const panel = producer.locator('[data-lab-result-panel]');
  await expect(panel).toContainText('No viable organisms recovered');
  await expect(panel).toContainText('After the kill step');
  await expect(panel).toContainText('MEAL-26-0907');
  await shot(producer, 'viability-record');

  // The lab withdraws the before-sample's result. Checked with all three files, the after-sample
  // no longer reads as paired: it says the before-sample's result was withdrawn.
  await lab.getByRole('button', { name: 'Sign another' }).click();
  await choose(form, lab, 'What kind of result', 'Withdrawal of an earlier result');
  await form.getByLabel(/Proof code the sender gave for this sample/).fill(strain);
  await form.getByLabel(/Sample ID/).fill('MEAL-0907-PRE');
  await form.getByLabel('Your accession number').fill('LAB-26-2209');
  await form.getByLabel('Method or SOP').fill('Spread plate on PDA, SOP-M7');
  await form.getByLabel('Method version').fill('2');
  await form.getByLabel('Date tested').fill(daysAgo(0));
  await choose(form, lab, 'The result to withdraw', /LAB-26-2201 · MEAL-0907-PRE/);
  await lab.getByRole('button', { name: 'Sign this result' }).click();
  await expect(lab.getByRole('heading', { name: 'Signed and kept' })).toBeVisible({ timeout: 60_000 });
  const withdrawFile = await download(lab, () => lab.locator('[data-result-download]').click());
  await producer.goto('/check-lab-result');
  await producer.locator('[data-result-input]').setInputFiles([beforeFile, afterFile, withdrawFile]);
  await expect(producer.locator('[data-lab-result-checked]')).toHaveCount(3);
  const after3 = producer
    .locator('[data-lab-result-checked]')
    .filter({ has: producer.locator('[data-viability-stage="after"]') });
  await expect(after3.locator('[data-viability-pair="paired"]')).toHaveCount(0);
  await expect(after3.locator('[data-viability-pair="broken"]')).toContainText(
    'but that result was withdrawn by result',
  );
  await expect(after3.locator('[data-viability-pair="broken"]')).toHaveAttribute('data-pair-side', 'before');
  await shot(producer, 'viability-check-withdrawn');
  expectNoErrors(labErrors);
  expectNoErrors(prodErrors);
  await prodCtx.close();
  await labCtx.close();
});
