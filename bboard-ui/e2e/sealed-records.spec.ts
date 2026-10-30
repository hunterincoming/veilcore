// Sealed records against a REAL registry (E2E_API_BASE, see e2e/README.md): what a holder
// types can't be read by VeilCore's registry (the site's sealed-records CONTRACT.md).
//
//   (a) a plant logged through the app with a marker in every field it has, sent to a lab
//       that receives it: none of the markers is anywhere in the registry's database file
//       (E2E_REGISTRY_DB names it; that test is skipped without it);
//   (b) the backup file, restored in a fresh browser: the records open, none locked;
//   (c) a fresh browser with the holder key and not the vault key: the records show as
//       locked, with the way back (the backup file) said plainly.
//
// Skipped without a real registry.
// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import {
  REAL_REGISTRY,
  backupAfterLogging,
  expectNoErrors,
  isolate,
  receiveWithBackupFirst,
  watch,
  startPlant,
} from './helpers';

test.skip(!REAL_REGISTRY, 'needs a real registry: set E2E_API_BASE and build with it');

const DB = process.env.E2E_REGISTRY_DB ?? '';

type Plant = {
  name: string;
  bredBy: string;
  made?: string;
  parent?: string;
  species?: string;
  refId?: string;
  notes?: string;
};

/**
 * Log a plant through the app, as a breeder would, through the backup step: the backup file
 * is saved and checked, so the plant is saved on the registry (round 3, L1). Returns its id
 * and the backup file.
 */
const logPlant = async (page: Page, p: Plant): Promise<{ recordId: string; backupFile: string }> => {
  await page.goto('/records');
  await page.getByText('Start', { exact: true }).click();
  await startPlant(page);
  await page.getByLabel(/Plant or line name/).fill(p.name);
  await page.getByLabel(/Bred by/).fill(p.bredBy);
  if (p.made) await page.getByLabel(/When you made it/).fill(p.made);
  if (p.parent || p.species || p.refId || p.notes) {
    await page.getByRole('button', { name: /Add parents, species, photos or notes/ }).click();
    if (p.parent) {
      await page.getByLabel(/^Parents/).fill(p.parent);
      await page.getByLabel(/^Parents/).press('Enter');
    }
    if (p.species) await page.getByLabel(/^Species/).fill(p.species);
    // How it was made is a fixed list: a choice, not something typed.
    await page.getByLabel(/How it was made/).click();
    await page.getByRole('option').nth(1).click();
    if (p.refId) await page.getByLabel(/Your own lot or reference number/).fill(p.refId);
    if (p.notes) await page.getByLabel(/^Notes/).fill(p.notes);
  }
  await page.getByRole('button', { name: /Next: check it/ }).click();
  await page.getByRole('button', { name: /Seal it/ }).click();
  await page.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
  const recordId = await page.evaluate(
    () => Object.keys(JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as object)[0],
  );
  const backupFile = await backupAfterLogging(page, recordId);
  return { recordId, backupFile };
};

const newPage = async (browser: Browser, opts: { acceptDownloads?: boolean } = {}) => {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = watch(page);
  await isolate(page);
  return { ctx, page, errors };
};

test('(a) a plant with a marker in every field, sent to a lab: no marker is in the registry’s database file', async ({
  browser,
}) => {
  test.skip(!DB, 'needs E2E_REGISTRY_DB: the registry’s database file');
  const tag = Date.now().toString(36);
  const name = `E2E Sealed ${tag}`;
  const markers = {
    bredBy: `MARK-${tag}-bredby`,
    made: '1907-07-07',
    parent: `MARK-${tag}-parent`,
    species: `MARK-${tag}-species`,
    refId: `MARK-${tag}-ref`,
    notes: `MARK-${tag}-notes`,
    quantity: `MARK-${tag}-quantity`,
    note: `MARK-${tag}-lab-note`,
  };

  const b = await newPage(browser);
  const { recordId } = await logPlant(b.page, { name, ...markers });
  await b.page.goto(`/record/${recordId}`);
  await expect(b.page.getByRole('heading', { name })).toBeVisible();
  await b.page.getByText('Send it to a lab or breeder').click();
  await b.page.getByLabel(/Who are you sending it to/).fill('lab@e2e');
  await b.page.getByLabel(/Quantity/).fill(markers.quantity);
  await b.page.getByLabel(/Note for the lab/).fill(markers.note);
  await b.page.getByRole('button', { name: /Make a code for the lab/ }).click();
  const codeEl = b.page.getByText(/^TR-[0-9A-F]{8}\./);
  await expect(codeEl).toBeVisible();
  const code = (await codeEl.innerText()).trim();
  await b.page.getByRole('button', { name: /^Done$/ }).click();

  // The lab receives it: the sender's details reach its browser, through the sealed offer.
  const l = await newPage(browser);
  await l.page.goto('/records');
  await l.page.getByRole('button', { name: "I'm a lab" }).click();
  await l.page.getByRole('button', { name: /I run a lab/ }).click();
  await l.page.getByRole('button', { name: /Set up your lab.s signature/ }).click();
  await l.page.getByLabel(/^Name/).fill('E2E Lab');
  await l.page.getByRole('button', { name: /Create my key/ }).click();
  await l.page.getByRole('button', { name: /^Done$/ }).click();
  await receiveWithBackupFirst(l.page, code);
  await l.page.getByLabel(/I physically received this material/).check();
  await l.page.getByRole('button', { name: /Sign with my key/ }).click();
  await expect(l.page).toHaveURL(/\/record\//);
  await expect(l.page.getByText(markers.bredBy).first()).toBeVisible();
  // Its own sealed save has reached the registry before the file is read.
  const labKey = await l.page.evaluate(() => localStorage.getItem('veilcore.holder.v1') ?? '');
  const labRecordId = new URL(l.page.url()).pathname.split('/').pop() ?? '';
  await expect
    .poll(async () => {
      const res = await fetch(`${process.env.E2E_API_BASE}/api/records`, { headers: { 'x-holder-key': labKey } });
      const rows = (await res.json()) as { id: string; sealed?: unknown; recordFingerprint?: string }[];
      return rows.some((r) => r.id === labRecordId && r.sealed && r.recordFingerprint);
    })
    .toBe(true);

  // The database file, byte for byte, with any journal beside it.
  const bytes = Buffer.concat(
    [DB, `${DB}-wal`, `${DB}-journal`].filter((f) => fs.existsSync(f)).map((f) => fs.readFileSync(f)),
  );
  // The scan reads the right file: the records are there by id. Nothing typed is, the name
  // included (round 5, CONTRACT.md #28).
  expect(bytes.includes(Buffer.from(labRecordId))).toBe(true);
  expect(bytes.includes(Buffer.from(name)), 'the name in the registry’s database file').toBe(false);
  for (const [field, value] of Object.entries(markers)) {
    expect(bytes.includes(Buffer.from(value)), `${field} in the registry’s database file`).toBe(false);
  }

  expectNoErrors(b.errors);
  expectNoErrors(l.errors);
  await b.ctx.close();
  await l.ctx.close();
});

test('(b) the backup file, restored in a fresh browser: the records open, none locked', async ({ browser }) => {
  const tag = Date.now().toString(36);
  const name = `E2E Backup ${tag}`;
  const bredBy = `Backup breeder ${tag}`;
  const first = await newPage(browser, { acceptDownloads: true });
  const { recordId, backupFile: file } = await logPlant(first.page, { name, bredBy });
  const saved = JSON.parse(fs.readFileSync(file, 'utf8')) as { version: number; vaultKey?: string };
  expect(saved.version).toBe(3);
  expect(saved.vaultKey).toMatch(/^[A-Za-z0-9_-]{43}$/);

  // Another browser, nothing in it but the answer to "who are you" (asked on every app page).
  const fresh = await newPage(browser);
  await fresh.page.addInitScript(() => localStorage.setItem('veilcore.role.v1', 'breeder'));
  await fresh.page.goto('/restore');
  const chooser = fresh.page.waitForEvent('filechooser');
  await fresh.page.getByRole('button', { name: /Open my backup file/ }).click();
  await (await chooser).setFiles(file);
  await expect(fresh.page.getByRole('heading', { name: /Your records are back/ })).toBeVisible();
  await expect(fresh.page.locator('[data-still-locked]')).toHaveCount(0);
  await fresh.page.getByRole('link', { name: /See my records/ }).click();
  await expect(fresh.page.getByText(name).first()).toBeVisible();
  await expect(fresh.page.locator('[data-locked-records]')).toHaveCount(0);
  await fresh.page.goto(`/record/${recordId}`);
  await expect(fresh.page.getByRole('heading', { name })).toBeVisible();
  await expect(fresh.page.getByText(bredBy).first()).toBeVisible();
  await expect(fresh.page.getByText(/This record is locked/)).toHaveCount(0);

  expectNoErrors(first.errors);
  expectNoErrors(fresh.errors);
  await first.ctx.close();
  await fresh.ctx.close();
});

test('(c) a fresh browser with the holder key but not the vault key: the records show as locked, with the way back', async ({
  browser,
}) => {
  const tag = Date.now().toString(36);
  const name = `E2E Locked ${tag}`;
  const first = await newPage(browser);
  const { recordId } = await logPlant(first.page, { name, bredBy: `Locked breeder ${tag}` });
  const holderKey = await first.page.evaluate(() => localStorage.getItem('veilcore.holder.v1') ?? '');
  expect(holderKey).toMatch(/^[0-9a-f]{64}$/);

  const other = await newPage(browser);
  await other.page.addInitScript((key) => {
    if (!localStorage.getItem('veilcore.holder.v1')) {
      localStorage.setItem('veilcore.holder.v1', key);
      localStorage.setItem('veilcore.role.v1', 'breeder');
    }
  }, holderKey);
  await other.page.goto('/records');
  const panel = other.page.locator('[data-locked-records]');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('1 locked record');
  await expect(panel).toContainText(
    'This browser doesn’t have the key for these records. Restore your latest backup file. VeilCore can’t open them for you.',
  );
  await expect(panel).toContainText('A locked record can’t be changed or sent. You can delete it.');
  // Its name is locked with the rest (round 5): this browser can't read it, and says so.
  await expect(panel.locator(`[data-locked-record="${recordId}"]`)).toContainText('Name locked');
  await expect(panel.locator(`[data-locked-record="${recordId}"]`)).not.toContainText(name);
  await expect(panel.getByRole('link', { name: /Restore my backup/ })).toBeVisible();
  // Nothing of it opens here, and nothing was made in its place.
  expect(await other.page.evaluate(() => localStorage.getItem('veilcore.vault.v1'))).toBeNull();
  await other.page.goto(`/record/${recordId}`);
  await expect(other.page.getByText(/This record is locked/)).toBeVisible();

  expectNoErrors(first.errors);
  expectNoErrors(other.errors);
  await first.ctx.close();
  await other.ctx.close();
});
