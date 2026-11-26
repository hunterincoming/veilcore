// The backup's step 2, "Put a copy somewhere else" (founder test on a Mac in Chrome, 17 Oct):
// Chrome on a Mac said it could share a file (navigator.canShare) and then threw on
// navigator.share, so the button failed and step 3 looked locked behind it.
//   - step 2 says it is recommended, not required;
//   - a computer (no touch) never gets the share button: the by-hand line and "Save another
//     copy", which downloads the same file again;
//   - on a phone whose share sheet fails, the same by-hand line and button;
//   - step 3's button is the filled one as soon as step 1 is saved.
// And a file holding a lab's signing key can't be saved without a password (summit 5b.12): no
// switch, one line saying why; without a lab key the switch stays, on by default.
// Stand-in registry, so it runs the CI way too. All data is practice data.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { generateKeypair } from 'veilcore-records';
import { E2E_BACKUP_PASSWORD, isolate, noBackupPassword, watch, expectNoErrors } from './helpers';

/** The backup page (no first-visit question: everyone starts as a breeder). */
const openBackup = async (page: Page) => {
  await page.goto('/backup');
  await expect(page.getByRole('button', { name: /Save backup file/ })).toBeVisible();
};

test('on a computer: no share button, the by-hand way and "Save another copy" (the same file)', async ({ page }) => {
  const errors = watch(page);
  await isolate(page);
  await openBackup(page);
  await expect(page.getByRole('heading', { name: /Put a copy somewhere else \(recommended\)/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Save a copy somewhere else/ })).toHaveCount(0);
  // Where to keep it is said once (live walk, 18 Nov); where the saved file is, only once saved;
  // and Safari's 7-day warning only in Safari or on iOS, not in this Chromium.
  await expect(page.getByText(/USB stick/)).toHaveCount(1);
  await expect(page.getByText(/Best: a USB stick or a password manager\./)).toBeVisible();
  await expect(page.locator('[data-backup-never-asks]')).toHaveText(
    'VeilCore never asks for your backup file or code.',
  );
  await expect(page.locator('[data-backup-saved-where]')).toHaveCount(0);
  await expect(page.getByText(/the file you just saved/)).toHaveCount(0);
  await expect(page.locator('[data-backup-safari]')).toHaveCount(0);

  const first = page.waitForEvent('download');
  await noBackupPassword(page);
  await page.getByRole('button', { name: /Save backup file/ }).click();
  const firstFile = await first;
  await expect(page.locator('[data-backup-saved-where]')).toHaveText(
    'It’s the file you just saved, in your Downloads folder.',
  );
  await expect(page.getByText(/USB stick/)).toHaveCount(1);
  // Step 3's button is now the filled (contained) one: the next thing to do.
  await expect(page.getByRole('button', { name: /Open my saved copy/ })).toHaveClass(/MuiButton-contained/);

  const again = page.waitForEvent('download');
  await page.getByRole('button', { name: /Save another copy/ }).click();
  const againFile = await again;
  expect(againFile.suggestedFilename()).toBe(firstFile.suggestedFilename());
  expect(readFileSync(await againFile.path(), 'utf8')).toBe(readFileSync(await firstFile.path(), 'utf8'));
  await expect(page.getByRole('button', { name: /Saved another copy/ })).toBeVisible();
  expectNoErrors(errors);
});

test('on an iPhone: Safari’s 7-day warning is shown', async ({ browser }) => {
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  });
  const page = await ctx.newPage();
  await isolate(page);
  await openBackup(page);
  await expect(page.locator('[data-backup-safari]')).toContainText('This browser can clear a site’s data after 7 days');
  await ctx.close();
});

test.describe('on a phone', () => {
  test.use({ hasTouch: true, isMobile: true });

  test('a share sheet that fails gives the by-hand way and "Save another copy", not only a failure', async ({
    page,
  }) => {
    await isolate(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
      Object.defineProperty(navigator, 'share', {
        value: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
        configurable: true,
      });
    });
    await openBackup(page);
    const download = page.waitForEvent('download');
    await noBackupPassword(page);
    await page.getByRole('button', { name: /Save backup file/ }).click();
    await download;
    await page.getByRole('button', { name: /Save a copy somewhere else/ }).click();
    await expect(page.getByText(/couldn.t open its share menu/)).toBeVisible();
    await expect(page.locator('[data-backup-saved-where]')).toHaveText(
      'It’s the file you just saved, in your Downloads folder.',
    );
    await expect(page.getByRole('button', { name: /Save another copy/ })).toBeVisible();
  });
});

test('without a lab key the password is on by default and can be switched off', async ({ page }) => {
  await isolate(page);
  await openBackup(page);
  const sw = page.locator('[data-backup-password] input[type="checkbox"]');
  await expect(sw).toBeChecked();
  await expect(page.locator('[data-backup-password-required]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Save backup file/ })).toBeDisabled();
  await sw.click();
  await expect(page.getByRole('button', { name: /Save backup file/ })).toBeEnabled();
});

test("a lab's backup: the password can't be switched off, it says why, and the file is locked", async ({ page }) => {
  const errors = watch(page);
  const keypair = await generateKeypair();
  await page.addInitScript(
    (k) => localStorage.setItem('veilcore.attester.v1', JSON.stringify({ keypair: k, role: 'laboratory' })),
    keypair,
  );
  await isolate(page);
  await openBackup(page);
  await expect(page.locator('[data-backup-password] input[type="checkbox"]')).toHaveCount(0);
  await expect(page.locator('[data-backup-password-required]')).toHaveText(
    "A password is required: this file holds your lab's signing key, and whoever had it could sign results as your lab.",
  );
  await expect(page.getByText('Lock it with a password (suggested)')).toHaveCount(0);
  // The same strength rule as everyone's: at least 10 characters, typed twice.
  const save = page.getByRole('button', { name: /Save backup file/ });
  await expect(save).toBeDisabled();
  await page.getByLabel('Password for the backup file').fill('short');
  await page.getByLabel('Type it again').fill('short');
  await expect(save).toBeDisabled();
  expect(await noBackupPassword(page)).toBe(E2E_BACKUP_PASSWORD);
  await expect(save).toBeEnabled();

  const download = page.waitForEvent('download');
  await save.click();
  const file = await (await download).path();
  const text = readFileSync(file, 'utf8');
  expect(JSON.parse(text)).toMatchObject({ format: 'veilcore-backup', version: 4 });
  expect(text).not.toContain(keypair.privateKey);

  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Open my saved copy/ }).click();
  await (await chooser).setFiles(file);
  await page.getByLabel("The backup's password").fill(E2E_BACKUP_PASSWORD);
  await page.getByRole('button', { name: 'Open it' }).click();
  await expect(page.getByText('It works.')).toBeVisible();
  expectNoErrors(errors);
});
