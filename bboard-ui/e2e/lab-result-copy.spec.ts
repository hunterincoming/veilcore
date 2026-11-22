// A lab's signed result, added by the breeder it was signed for, against a real registry.
//
// The lab keeps every result it signs as a record it holds, so that result's proof code is the
// lab's on VeilCore (it is dated in the lab's batch). The breeder's copy, added from the result
// file on /check-lab-result, used to be refused at every save ("this fingerprint is already
// registered by another holder"): it stayed in the breeder's browser only, and anything kept on
// it was put back on the next read. Now the copy keeps the proof code inside its locked copy
// and not in the clear (records.ts `copy`), so VeilCore keeps it for the breeder and ties
// nothing about that proof code to them. All records and files are practice data.
// SPDX-License-Identifier: Apache-2.0
import { expect, test, type Page } from '@playwright/test';
import {
  API,
  REAL_REGISTRY,
  backupAfterLogging,
  expectNoErrors,
  holderKeyOf,
  isolate,
  receiveWithBackupFirst,
  startPlant,
  watch,
} from './helpers';

test.skip(!REAL_REGISTRY, 'needs a real registry: set E2E_API_BASE and build with it');

const choose = async (page: Page, label: string, option: string | RegExp) => {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole('option', { name: option }).click();
};

/** The rows the registry holds for this page's holder ([] while it asks to wait). */
const rowsOf = async (page: Page) => {
  const key = await holderKeyOf(page);
  const res = await fetch(`${API}/api/records`, { headers: { 'x-holder-key': key } });
  if (!res.ok) return [];
  return (await res.json()) as { id: string; recordFingerprint?: string; sealed?: unknown }[];
};

/** Every save the registry refused for this page because another holder has the proof code. */
const heldElsewhere = (page: Page): string[] => {
  const seen: string[] = [];
  page.on('response', (res) => {
    if (res.request().method() !== 'PUT' || !/\/api\/records(\/dating)?$/.test(new URL(res.url()).pathname)) return;
    void res
      .text()
      .then((t) => {
        if (t.includes('already registered by another holder')) seen.push(`${new URL(res.url()).pathname}: ${t}`);
      })
      .catch(() => undefined);
  });
  return seen;
};

test('the breeder adds the lab’s signed result: VeilCore keeps the copy, and it is still there after a reload', async ({
  browser,
}) => {
  test.setTimeout(240_000);
  // The breeder logs a plant, saves it, and makes a code for the lab.
  const breederCtx = await browser.newContext({ acceptDownloads: true });
  const breeder = await breederCtx.newPage();
  const breederErrors = watch(breeder);
  const refused = heldElsewhere(breeder);
  await isolate(breeder);
  await breeder.goto('/records');
  await breeder.getByText('Start', { exact: true }).click();
  await startPlant(breeder);
  await breeder.getByLabel(/Plant or line name/).fill(`E2E Copy ${Date.now()}`);
  await breeder.getByLabel(/Bred by/).fill('E2E breeder');
  await breeder.getByRole('button', { name: /Next: check it/ }).click();
  await breeder.getByRole('button', { name: /Seal it/ }).click();
  await breeder.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
  const plantId = await breeder.evaluate(
    () => Object.keys(JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as object)[0],
  );
  await backupAfterLogging(breeder, plantId);
  const subject = (await rowsOf(breeder)).find((r) => r.id === plantId)?.recordFingerprint ?? '';
  expect(subject).toMatch(/^[0-9a-f]{64}$/);
  await breeder.goto(`/record/${plantId}`);
  await breeder.getByText('Send it to a lab or breeder').click();
  await breeder.getByLabel(/Who are you sending it to/).fill('lab@e2e');
  await breeder.getByRole('button', { name: /Make a code for the lab/ }).click();
  const code = (await breeder.getByText(/^TR-[0-9A-F]{8}\./).innerText()).trim();
  await breeder.getByRole('button', { name: /^Done$/ }).click();

  // The lab: its key, the delivery, then one pathogen result bound to the breeder's plant.
  const labCtx = await browser.newContext({ acceptDownloads: true });
  const lab = await labCtx.newPage();
  const labErrors = watch(lab);
  await isolate(lab);
  await lab.goto('/records');
  await lab.getByRole('button', { name: "I'm a lab" }).click();
  await lab.getByRole('button', { name: /I run a lab/ }).click();
  await lab.getByRole('button', { name: /Set up your lab.s signing key/ }).click();
  await lab.getByLabel(/^Name/).fill('E2E Lab');
  await lab.getByRole('button', { name: /Create my key/ }).click();
  await lab.getByRole('button', { name: /^(Continue|Done)$/ }).click();
  await receiveWithBackupFirst(lab, code);
  await lab.getByLabel(/I physically received this material/).check();
  await lab.getByRole('button', { name: /Sign with my key/ }).click();
  await expect(lab).toHaveURL(/\/record\//);
  await lab.goto('/lab/results');
  const form = lab.locator('[data-result-form]');
  await form.getByLabel(/Proof code the sender gave for this sample/).fill(subject);
  await form.getByLabel(/Sample ID/).fill('S-0601');
  await form.getByLabel('Your accession number').fill('LAB-COPY-0601');
  await form.getByLabel('Method or SOP').fill('RT-qPCR HLVd SOP-14');
  await form.getByLabel('Method version').fill('3');
  await form.getByLabel(/Sample type/).fill('leaf');
  await choose(lab, 'Result', 'Not detected');
  await lab.getByRole('button', { name: 'Sign this result' }).click();
  await expect(lab.getByRole('heading', { name: 'Signed and kept' })).toBeVisible({ timeout: 60_000 });
  const d = lab.waitForEvent('download');
  await lab.locator('[data-result-download]').click();
  const file = await (await d).path();
  // The lab holds the result, in the clear on VeilCore by its proof code: that is what dates it.
  const labResultId = ((await lab.locator('[data-my-results] a').first().getAttribute('href')) ?? '').split('/').pop();
  const labRow = (await rowsOf(lab)).find((r) => r.id === labResultId);
  expect(labRow?.recordFingerprint).toMatch(/^[0-9a-f]{64}$/);
  const resultCode = labRow!.recordFingerprint!;
  expectNoErrors(labErrors);

  // The breeder adds it.
  await breeder.goto('/check-lab-result');
  await breeder.locator('[data-result-input]').setInputFiles(file);
  const checked = breeder.locator('[data-lab-result-checked]');
  await checked.locator('[data-lab-result-find]').click();
  await checked.locator('[data-lab-result-add]').click();
  await checked.getByRole('link', { name: 'Open the record' }).click();
  await expect(breeder.locator('[data-lab-result-panel]')).toContainText('Not detected');
  const copyId = new URL(breeder.url()).pathname.split('/').pop()!;

  // VeilCore keeps the breeder's copy, sealed, without the proof code in the clear: the proof
  // code stays the lab's alone, and the copy is no longer refused.
  await expect
    .poll(async () => (await rowsOf(breeder)).find((r) => r.id === copyId), { timeout: 30_000, intervals: [1000] })
    .toMatchObject({ id: copyId });
  const copyRow = (await rowsOf(breeder)).find((r) => r.id === copyId)!;
  expect(copyRow.sealed).toBeTruthy();
  expect(copyRow.recordFingerprint).toBeUndefined();
  // Nothing about it waits in this browser to be sent.
  await expect
    .poll(() => breeder.evaluate((id) => (localStorage.getItem('veilcore.outbox.v1') ?? '').includes(id), copyId), {
      intervals: [1000],
    })
    .toBe(false);

  // A reload reads the copy back from VeilCore: the result, its proof code and the lab's signature.
  await breeder.reload();
  await expect(breeder.locator('[data-lab-result-panel]')).toContainText('Not detected', { timeout: 20_000 });
  await expect(breeder.getByText(resultCode).first()).toBeVisible();
  await expect(breeder.locator('[data-lab-signature] [data-lab-signed="bound"]')).toBeVisible({ timeout: 20_000 });
  // It says it is a copy and that the date is the lab's, and offers nothing that would present it
  // as dated by the breeder: no date of its own, no check link, no evidence bundle, no key stamp.
  await expect(breeder.locator('[data-document-copy]')).toContainText(
    'A copy of a result E2E Lab keeps. The date is the lab’s, not yours. VeilCore keeps this copy but can’t date it for you.',
  );
  await expect(breeder.locator('[data-document-date]')).toHaveCount(0);
  await expect(breeder.locator('[data-document-share]')).toHaveCount(0);
  await expect(breeder.getByText('proves you had this file')).toHaveCount(0);
  await expect(breeder.locator('[data-document-bundle]')).toHaveCount(0);
  await expect(breeder.locator('[data-document-technical]')).toHaveCount(0);
  // Its card on the records page says the same.
  await breeder.goto('/records');
  await expect(breeder.getByText('Copy of a result E2E Lab keeps: the date is the lab’s')).toBeVisible({
    timeout: 20_000,
  });
  // And the check page knows it is held here now.
  await breeder.goto('/check-lab-result');
  await breeder.locator('[data-result-input]').setInputFiles(file);
  await checked.locator('[data-lab-result-find]').click();
  await expect(checked.getByRole('link', { name: 'Open the record' })).toBeVisible();
  await expect(checked.locator('[data-lab-result-add]')).toHaveCount(0);

  // The lab's own copy is untouched: still its, with the proof code in the clear.
  expect((await rowsOf(lab)).find((r) => r.id === labRow!.id)?.recordFingerprint).toBe(resultCode);
  // And no save of the breeder's was refused for the lab's proof code.
  expect(refused).toEqual([]);
  expectNoErrors(breederErrors);
  await breederCtx.close();
  await labCtx.close();
});
