// The DNA report is what ties a record to the plant, in the browser against the stand-in
// registry: seal a plant (the optional DNA report screen says why it matters), see "Not tied
// to the plant yet" and the next step "Get a DNA report for this plant" with its two
// ways, save a report, see the status change, then date it from the next step. Home, Show
// someone and the certificate say the same. All records are practice data; VeilCore tests
// no DNA.
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
  openRecordRows,
  plainRowRefusal,
  watch,
  startPlant,
} from './helpers';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

type Rec = { id: string; strainName: string; breedingMethod?: string; parents?: { recordId?: string }[] };

const HOLDER = randomBytes(32).toString('hex');
/** The holder's vault key: the stand-in keeps records sealed, as the registry does; the test opens them with it. */
const VAULT = newVaultKey();
/** E2E_SHOTS=<dir> saves a picture of each screen, for review. */
const shot = async (page: Page, name: string) => {
  if (process.env.E2E_SHOTS) await page.screenshot({ path: `${process.env.E2E_SHOTS}/${name}.png`, fullPage: true });
};

const DNA_FILE = Buffer.from(`Practice DNA report (test data, not a real genotype) ${Date.now()}\n`);

/** The registry, as far as these screens need it: the holder's set, kept in memory, sealed. */
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

test('seal, see it is not tied to the plant, save a DNA report, see it tied, date it', async ({ page }) => {
  const errors = watch(page);
  const held = await standIn(page);
  const name = `DNA tie test (practice) ${Date.now()}`;

  // 1. Seal a plant. The optional screen says in one line why a DNA report matters, and
  //    stays optional (not counted in the steps).
  await page.goto('/new');
  await startPlant(page);
  await page.getByLabel(/Plant or line name/).fill(name);
  await page.getByLabel(/Bred by/).fill('E2E');
  await page.getByRole('button', { name: /Next: check it/ }).click();
  await page.getByRole('button', { name: /Seal it/ }).click();
  // The network is blocked on purpose: the key's date stamp fails safely and waits.
  await page.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
  await expect(page.getByRole('heading', { name: /Save your DNA report to this plant/ })).toBeVisible();
  await expect(page.getByText('Optional', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/This is what ties your record to the actual plant\./)).toBeVisible();
  await page.getByRole('button', { name: /No report yet: skip/ }).click();
  await expect(page.getByRole('button', { name: /Save backup file/ })).toBeVisible();

  // The backup and the key's date stamp are the steps before; here they are taken as done,
  // so the plant's next step is the DNA fingerprint.
  const recordId = await page.evaluate(() => {
    const all = JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as Record<string, object>;
    const id = Object.keys(all)[0];
    all[id] = {
      ...all[id],
      backedUpAt: Date.now(),
      anchor: {
        identity: '11'.repeat(32),
        network: 'preview',
        contractAddress: '0'.repeat(64),
        txId: 'tx-practice',
        txHash: '22'.repeat(32),
        blockHeight: 1,
      },
    };
    localStorage.setItem('veilcore.record-keys.v1', JSON.stringify(all));
    return id;
  });
  expect(recordId).toMatch(/^VEIL-/);

  // 2. Not tied to the plant yet, said plainly, and the next step is getting a DNA fingerprint.
  await page.goto(`/record/${recordId}`);
  await expect(page.getByRole('heading', { name })).toBeVisible();
  const row = page.locator('[data-status-row="DNA report"]');
  await expect(row).toHaveAttribute('data-mark', 'wait');
  await expect(row).toContainText('Not tied to the plant yet');
  await expect(row).toContainText('add a DNA report');
  await expect(row).toContainText('A DNA report from your lab is what ties a record to the plant itself.');
  const next = page.locator('[data-next-step]');
  await expect(next.getByRole('heading', { name: 'Get a DNA report for this plant' })).toBeVisible();
  const paths = next.locator('[data-dna-paths]');
  await expect(paths).toContainText('Send a sample to a lab');
  await expect(paths).toContainText('The lab’s DNA report comes back here, locked so only you can open it.');
  await expect(paths.getByRole('button', { name: 'Send to a lab' })).toBeVisible();
  await expect(paths).toContainText('Already have a DNA report?');
  await shot(page, 'dna-1-not-tied');

  // Home says the same.
  await page.goto('/records');
  const card = page.getByRole('link', { name: `Open ${name}`, exact: true });
  await expect(card.locator('[data-home-tie="none"]')).toHaveText('Not tied to the plant yet: add a DNA report.');

  // 3. Save a report the holder already has: read on the device, never uploaded.
  await card.click();
  await page.locator('[data-next-step]').getByRole('button', { name: 'Save a DNA report' }).click();
  await expect(page.getByRole('heading', { name: /Save your DNA report to this plant/ })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'Practice DNA report.txt',
    mimeType: 'text/plain',
    buffer: DNA_FILE,
  });
  await page.getByRole('button', { name: /^Save it to this plant$/ }).click();
  await expect(page.getByRole('heading', { name: /DNA report saved to this plant/ })).toBeVisible();
  await page.getByRole('button', { name: /Back to the plant/ }).click();

  // 4. Tied to the plant now: whose report it is, and that it isn't dated yet.
  await expect(row).toHaveAttribute('data-mark', 'done');
  await expect(row).toContainText('Tied to the plant');
  await expect(row).toContainText('DNA report you saved (no lab signature matches it)');
  await expect(row).toContainText('Report not dated yet. A lab can compare a new test of the plant with it.');

  // 5. The next step is dating it. One record, holding only the report's SHA-256.
  await expect(next.getByRole('heading', { name: 'Date this DNA report' })).toBeVisible();
  await shot(page, 'dna-2-tied-date-it');
  await next.getByRole('button', { name: 'Date this DNA report' }).click();
  // Opened as the holder's browser opens them: the registry has the records only sealed.
  const opened = () => openRecordRows(held.records, VAULT);
  await expect.poll(() => opened().filter((r) => r.breedingMethod === 'Lab report').length).toBe(1);
  await expect(row).toContainText('Report being dated (waiting for a batch).');
  // Dated, so the next step moves on: a lab signing for a sample is a second party.
  await expect(next.getByRole('heading', { name: 'Send a sample to a lab' })).toBeVisible();
  await shot(page, 'dna-3-being-dated');
  // The report itself never left the device: not in the clear, not inside the seal.
  expect(JSON.stringify(held.records)).not.toContain('Practice DNA report (test data');
  expect(JSON.stringify(opened())).not.toContain('Practice DNA report (test data');

  // 6. Show someone: the check page will say it neutrally, and what a DNA report is for.
  await page.getByRole('button', { name: /Show someone/ }).click();
  const tie = page.locator('[data-dna-tie="self"]');
  // The DNA report is off until the holder switches it on (round 3, P7): on, it publishes the
  // report's fingerprint. Off, the check page says nothing about it.
  const dnaSwitch = page.getByRole('switch', { name: 'Whether a DNA report is saved' });
  await expect(dnaSwitch).not.toBeChecked();
  await expect(tie).toHaveCount(0);
  await dnaSwitch.check();
  await expect(tie).toContainText('Tied to the plant: DNA report the holder saved (no lab signature matches it).');
  await expect(tie).toContainText('It doesn’t show by itself that a plant matches.');
  await page.getByRole('button', { name: 'Back to the plant' }).first().click();

  // 7. The certificate says it, with the report's date state.
  await page.getByText('Certificate', { exact: true }).click();
  await expect(page.locator('[data-certificate] [data-dna-tie="self"]')).toContainText(
    'Tied to the plant: DNA report you saved (no lab signature matches it), being dated (waiting for a batch).',
  );

  // 8. And Home.
  await page.goto('/records');
  await expect(
    page.getByRole('link', { name: `Open ${name}`, exact: true }).locator('[data-home-tie="self"]'),
  ).toHaveText(
    'Tied to the plant: DNA report you saved (no lab signature matches it), being dated (waiting for a batch).',
  );
  expectNoErrors(errors);
});
