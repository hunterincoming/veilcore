// The sample's chain of custody against a REAL registry (E2E_API_BASE, see e2e/README.md):
// the breeder writes the sample's label and seal with the lab code, the lab confirms or
// corrects them and signs its receipt over both, and a difference shows plainly on the
// breeder's plant page, certificate and check page, and on the lab's own plant page.
// Skipped without a real registry.
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { API, REAL_REGISTRY, expectNoErrors, isolate, watch } from './helpers';

test.skip(!REAL_REGISTRY, 'needs a real registry: set E2E_API_BASE and build with it');

const shot = async (page: Page, name: string) => {
  if (process.env.E2E_SHOTS) await page.screenshot({ path: `${process.env.E2E_SHOTS}/${name}.png`, fullPage: true });
};

/** A breeder logs a plant and makes a lab code with the sample's details; the lab receives it and signs. */
const sendAndReceive = async (browser: Browser, arrivedSeal: string, tag: string) => {
  const breederCtx = await browser.newContext();
  const breeder = await breederCtx.newPage();
  const breederErrors = watch(breeder);
  await isolate(breeder);
  await breeder.goto('/records');
  await breeder.getByRole('button', { name: /I breed or hold genetics/ }).click();
  await breeder.getByText('Start', { exact: true }).click();
  await breeder.getByLabel(/Plant or line name/).fill(`E2E Custody ${tag} ${Date.now()}`);
  await breeder.getByLabel(/Bred by/).fill('E2E');
  await breeder.getByRole('button', { name: /Next: check it/ }).click();
  await breeder.getByRole('button', { name: /Seal it/ }).click();
  await breeder.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
  const recordId = await breeder.evaluate(
    () => Object.keys(JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as object)[0],
  );
  await breeder.goto(`/record/${recordId}`);
  await breeder.getByText('Send it to a lab or breeder').click();
  await breeder.getByLabel(/Who are you sending it to/).fill('lab@e2e');
  await breeder.getByRole('button', { name: /Add the sample.s label and seal/ }).click();
  await breeder.getByLabel(/Sample ID \/ label on the tube or bag/).fill('BLU-07');
  await breeder.getByLabel(/Seal or bag number/).fill('4471');
  await breeder.getByLabel(/^Taken from/).fill('Mother M3, bench 2');
  await breeder.getByLabel(/^Taken on/).fill('2026-10-14');
  await breeder.getByLabel(/^Witness/).fill('J. Doe');
  await shot(breeder, `custody-${tag}-1-send`);
  await breeder.getByRole('button', { name: /Make a code for the lab/ }).click();
  const codeEl = breeder.getByText(/^TR-[0-9A-F]{8}\./);
  await expect(codeEl).toBeVisible();
  const code = (await codeEl.innerText()).trim();
  await expect(breeder.locator('[data-sample-sent]')).toContainText('Sample BLU-07 · seal 4471');
  await breeder.getByRole('button', { name: /^Done$/ }).click();

  const labCtx = await browser.newContext();
  const lab = await labCtx.newPage();
  const labErrors = watch(lab);
  await isolate(lab);
  await lab.goto('/records');
  await lab.getByRole('button', { name: /I run a lab/ }).click();
  await lab.getByRole('button', { name: /Set up your lab.s signature/ }).click();
  await lab.getByLabel(/^Name/).fill('E2E Lab');
  await lab.getByRole('button', { name: /Create my key/ }).click();
  await lab.getByRole('button', { name: /^Done$/ }).click();
  await lab.getByLabel(/Someone sent you a code or link/).fill(code);
  await lab.getByRole('button', { name: /^Go$/ }).click();
  await lab.getByRole('button', { name: /Receive it/ }).click();

  // The form starts from what the breeder wrote; the lab confirms or corrects it.
  await expect(lab.getByLabel('Sample ID on arrival')).toHaveValue('BLU-07');
  await expect(lab.getByLabel('Seal number on arrival')).toHaveValue('4471');
  await expect(lab.locator('[data-receipt-statement]')).toContainText(
    'The breeder wrote: Sample BLU-07 · seal 4471 · taken from Mother M3, bench 2 on 2026-10-14 · witness J. Doe (VeilCore doesn’t check this)',
  );
  await lab.getByLabel('Seal number on arrival').fill(arrivedSeal);
  await lab.getByLabel('Yes', { exact: true }).check();
  await lab.getByLabel('Arrived on').fill('2026-10-15');
  await lab.getByLabel('Condition').fill('Cold, bag dry');
  await lab.getByLabel('Your accession no.').fill(`ACC-${tag}`);
  if (arrivedSeal !== '4471') {
    await expect(lab.locator('[data-arrival-differs]')).toContainText(
      `Seal number differs: sent 4471, received ${arrivedSeal}.`,
    );
  } else {
    await expect(lab.locator('[data-arrival-differs]')).toHaveCount(0);
  }
  await expect(lab.locator('[data-receipt-statement]')).toContainText(
    `On arrival: Sample BLU-07 · seal ${arrivedSeal}, seal intact · arrived 2026-10-15 · condition: Cold, bag dry · lab no. ACC-${tag}`,
  );
  await shot(lab, `custody-${tag}-2-sign`);
  await lab.getByLabel(/I physically received this material/).check();
  await lab.getByRole('button', { name: /Sign with my key/ }).click();
  await expect(lab).toHaveURL(/\/record\//);

  return { breeder, lab, breederCtx, labCtx, breederErrors, labErrors, recordId, transferId: code.split('.')[0] };
};

test('a matching seal: the receipt covers the sample details and the breeder sees they match', async ({ browser }) => {
  const r = await sendAndReceive(browser, '4471', 'match');

  // What the registry holds, and the receipt's id carries their digest.
  const holder = await r.breeder.evaluate(() => localStorage.getItem('veilcore.holder.v1') ?? '');
  const custody = (await (
    await fetch(`${API}/transfers/${r.transferId}/custody`, { headers: { 'x-holder-key': holder } })
  ).json()) as { sample: Record<string, string>; arrival: Record<string, string>; receiptAttestationId: string };
  expect(custody.sample).toEqual({
    sampleId: 'BLU-07',
    sealNumber: '4471',
    takenFrom: 'Mother M3, bench 2',
    takenOn: '2026-10-14',
    witness: 'J. Doe',
  });
  expect(custody.arrival).toEqual({
    sampleId: 'BLU-07',
    sealNumber: '4471',
    sealIntact: 'yes',
    arrivedOn: '2026-10-15',
    condition: 'Cold, bag dry',
    labRef: 'ACC-match',
  });
  expect(custody.receiptAttestationId).toMatch(/^att_[0-9a-f]{16}_sc1_[0-9a-f]{64}$/);

  // The lab's plant page.
  await expect(r.lab.locator('[data-sample-details]')).toContainText('The breeder wrote: Sample BLU-07 · seal 4471');
  await expect(r.lab.locator('[data-arrival-details]')).toContainText(
    'On arrival (your receipt): Sample BLU-07 · seal 4471, seal intact',
  );
  await expect(r.lab.locator('[data-custody-line]')).toHaveCount(0);

  // The breeder's plant page.
  await r.breeder.goto(`/record/${r.recordId}`);
  const row = r.breeder.locator('[data-status-row="Receipt signed"]');
  await expect(row).toBeVisible();
  await expect(row).toContainText('Sample ID and seal number match what was sent.');
  await shot(r.breeder, 'custody-match-3-plant');

  expectNoErrors(r.breederErrors);
  expectNoErrors(r.labErrors);
  await r.breederCtx.close();
  await r.labCtx.close();
});

test('a different seal number: said plainly on the breeder’s plant page, certificate and check page, and the lab’s', async ({
  browser,
}) => {
  const r = await sendAndReceive(browser, '4417', 'differs');
  const line = 'Seal number differs: sent 4471, received 4417.';

  // The lab's plant page.
  await expect(r.lab.locator('[data-custody-line]')).toHaveText(line);
  await shot(r.lab, 'custody-differs-3-lab');

  // The breeder's plant page.
  await r.breeder.goto(`/record/${r.recordId}`);
  const row = r.breeder.locator('[data-status-row="Receipt signed"]');
  await expect(row).toContainText(line);
  await expect(row).not.toContainText(/match what was sent/);
  await shot(r.breeder, 'custody-differs-4-plant');

  // The certificate.
  await r.breeder.getByText('Certificate', { exact: true }).click();
  const cert = r.breeder.locator('[data-custody-line]');
  await expect(cert.first()).toHaveText(line);
  await expect(cert.nth(1)).toContainText('Sent: Sample BLU-07 · seal 4471');
  await expect(cert.nth(2)).toContainText('Received: Sample BLU-07 · seal 4417, seal intact · arrived 2026-10-15');
  await shot(r.breeder, 'custody-differs-5-certificate');

  // The check page, in the breeder's own browser, reached from inside the app: the public
  // check page loads no records of its own (App.tsx), so a fresh load of it can't know the
  // plant is this browser's.
  await r.breeder.goto(`/record/${r.recordId}`);
  await expect(r.breeder.locator('[data-status-row="Receipt signed"]')).toBeVisible();
  await r.breeder.evaluate((path) => {
    history.pushState({}, '', path);
    dispatchEvent(new PopStateEvent('popstate'));
  }, `/verify/${r.recordId}`);
  await expect(r.breeder.getByText(/linked to your delivery TR-/)).toBeVisible();
  await expect(r.breeder.locator('[data-custody-line]').first()).toHaveText(line);
  await shot(r.breeder, 'custody-differs-6-check');

  // A stranger's check page (round 2 of the 15 Oct review): with the holder sharing the lab
  // status, the registry reports the difference under the receipt, never the details.
  const breederKey = await r.breeder.evaluate(() => localStorage.getItem('veilcore.holder.v1') ?? '');
  const publicView = async () =>
    (await (await fetch(`${API}/verify/${r.recordId}`)).json()) as {
      custody?: unknown;
      recordFingerprint?: string;
      staleGrant?: string[];
    };
  const before = await publicView();
  expect(before.custody).toBeUndefined();
  // What the app sends (disclosure.ts saveGrant): the keys, the fingerprint the values were
  // read from, and the values. This plant has no DNA report saved, so there are none.
  const granted = await fetch(`${API}/api/records/${r.recordId}/disclosure`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-holder-key': breederKey },
    body: JSON.stringify({
      show: ['existence', 'attestation-status'],
      forFingerprint: before.recordFingerprint,
      values: {},
    }),
  });
  expect(granted.status).toBe(200);
  const shared = await publicView();
  expect(shared.custody).toEqual([
    {
      receiptAttestationId: expect.stringMatching(/^att_[0-9a-f]{16}_sc1_[0-9a-f]{64}$/) as unknown,
      covered: 'covered',
      differences: ['Seal number differs: sent 4471, received 4417'],
    },
  ]);
  expect(shared.staleGrant).toBeUndefined();
  for (const secret of ['Mother M3', 'J. Doe', 'Cold, bag dry', 'ACC-differs', r.transferId])
    expect(JSON.stringify(shared)).not.toContain(secret);
  const strangerCtx = await browser.newContext();
  const stranger = await strangerCtx.newPage();
  const strangerErrors = watch(stranger);
  await stranger.goto(`/verify/${r.recordId}`);
  await expect(stranger.locator('[data-public-custody]')).toContainText(line);
  await shot(stranger, 'custody-differs-7-public-check');

  // Changing the lab's side after signing: no longer shown as covered.
  const labKey = await r.lab.evaluate(() => localStorage.getItem('veilcore.holder.v1') ?? '');
  const changed = await fetch(`${API}/transfers/${r.transferId}/custody`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-holder-key': labKey },
    body: JSON.stringify({ arrival: { sampleId: 'BLU-07', sealNumber: '4471', sealIntact: 'yes' } }),
  });
  expect(changed.status).toBe(200);
  await r.breeder.goto(`/record/${r.recordId}`);
  await expect(r.breeder.locator('[data-status-row="Receipt signed"]')).toContainText(
    'The lab changed its arrival details after signing, so its receipt doesn’t cover them.',
  );
  await stranger.reload();
  await expect(stranger.locator('[data-public-custody]')).toContainText(
    'The lab changed its arrival details after signing, so its receipt doesn’t cover them.',
  );
  expectNoErrors(strangerErrors);
  await strangerCtx.close();

  expectNoErrors(r.breederErrors);
  expectNoErrors(r.labErrors);
  await r.breederCtx.close();
  await r.labCtx.close();
});
