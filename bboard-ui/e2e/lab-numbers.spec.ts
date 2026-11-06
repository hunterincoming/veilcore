// Numbers a lab signs with its report (docs/lab-signing.md), against a real registry: the lab
// adds them when sending, the breeder opens the report, adds them as a record, and that record's
// page names the lab through the lab's own binding, in the wording every page uses. All records
// and files are practice data.
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';
import {
  REAL_REGISTRY,
  isolate,
  backupAfterLogging,
  receiveWithBackupFirst,
  expectNoErrors,
  watch,
  startPlant,
} from './helpers';

test.skip(!REAL_REGISTRY, 'needs a real registry: set E2E_API_BASE and build with it');

test('a lab signs numbers with its report; the breeder adds them; the record names the lab', async ({ browser }) => {
  const report = Buffer.from(`%PDF-1.7\nE2E germination report ${Date.now()}`);

  // The breeder logs a plant and makes a code for the lab.
  const breederCtx = await browser.newContext({ acceptDownloads: true });
  const breeder = await breederCtx.newPage();
  const breederErrors = watch(breeder);
  await isolate(breeder);
  await breeder.goto('/records');
  await breeder.getByText('Start', { exact: true }).click();
  await startPlant(breeder);
  await breeder.getByLabel(/Plant or line name/).fill(`E2E Numbers ${Date.now()}`);
  await breeder.getByLabel(/Bred by/).fill('E2E breeder');
  await breeder.getByRole('button', { name: /Next: check it/ }).click();
  await breeder.getByRole('button', { name: /Seal it/ }).click();
  await breeder.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
  const recordId = await breeder.evaluate(
    () => Object.keys(JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as object)[0],
  );
  await backupAfterLogging(breeder, recordId);
  await breeder.goto(`/record/${recordId}`);
  await breeder.getByText('Send it to a lab or breeder').click();
  await breeder.getByLabel(/Who are you sending it to/).fill('lab@e2e');
  await breeder.getByRole('button', { name: /Make a code for the lab/ }).click();
  const code = (await breeder.getByText(/^TR-[0-9A-F]{8}\./).innerText()).trim();
  await breeder.getByRole('button', { name: /^Done$/ }).click();

  // The lab: its key, the delivery, then the report with numbers.
  const labCtx = await browser.newContext();
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
  await lab.getByRole('button', { name: /^Send results back to the breeder/ }).click();
  const chooser = lab.waitForEvent('filechooser');
  await lab.getByRole('button', { name: /Choose the report/ }).click();
  await (await chooser).setFiles({ name: 'germination.pdf', mimeType: 'application/pdf', buffer: report });
  await lab.getByLabel('Other lab report', { exact: true }).check();
  const box = lab.locator('[data-lab-numbers]');
  await expect(box).toContainText('Numbers from this report, signed by you');
  await box.getByLabel('Which numbers').click();
  // A lab is offered the genetic forms; a holder typing their own numbers never is.
  await expect(lab.getByRole('option', { name: 'Genetic similarity to one named variety' })).toBeVisible();
  await expect(lab.getByRole('option', { name: 'Animal parentage (SNP, ICAR)' })).toBeVisible();
  await lab.getByRole('option', { name: 'Seed quality' }).click();
  await box.getByLabel('Germination').fill('96');
  await box.getByLabel(/Name of this result/).fill('GT-2026-0412');
  await lab.getByRole('button', { name: /Sign, lock and send/ }).click();
  await expect(lab.getByRole('heading', { name: /^Sent$/ })).toBeVisible();
  expectNoErrors(labErrors);

  // The breeder opens it: the numbers are there, checked, and added as a record.
  await breeder.goto(`/record/${recordId}`);
  await breeder
    .getByRole('alert')
    .filter({ hasText: /lab report came back/ })
    .getByRole('button', { name: 'Open' })
    .click();
  const nums = breeder.locator('[data-lab-numbers-in]');
  await expect(nums).toContainText('Numbers the lab signed with this report (Seed quality)');
  await expect(nums).toContainText('Germination: 96.00');
  await nums.locator('[data-lab-numbers-add]').click();
  await nums.getByRole('link', { name: 'Open the record with these numbers' }).click();

  // The record: the lab named through its binding, unchecked, as every page says it.
  const panel = breeder.locator('[data-lab-signature]');
  await expect(panel.locator('[data-lab-signed="bound"]')).toBeVisible({ timeout: 20_000 });
  await expect(panel).toContainText('Signed by a key named “E2E Lab” (name not checked)');
  await expect(breeder.locator('[data-held-numbers]')).toContainText('Germination: 96.00');
  await expect(breeder.getByRole('heading', { name: 'GT-2026-0412' })).toBeVisible();
  expectNoErrors(breederErrors);
  await breederCtx.close();
  await labCtx.close();
});
