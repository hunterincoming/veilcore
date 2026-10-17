// The backup's step 2, "Put a copy somewhere else" (founder test on a Mac in Chrome, 17 Oct):
// Chrome on a Mac said it could share a file (navigator.canShare) and then threw on
// navigator.share, so the button failed and step 3 looked locked behind it.
//   - step 2 says it is recommended, not required;
//   - a computer (no touch) never gets the share button: the by-hand line and "Save another
//     copy", which downloads the same file again;
//   - on a phone whose share sheet fails, the same by-hand line and button;
//   - step 3's button is the filled one as soon as step 1 is saved.
// Stand-in registry, so it runs the CI way too. All data is practice data.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { isolate, watch, expectNoErrors } from './helpers';

/** The backup page, past the first-visit "Which describes you?" question. */
const openBackup = async (page: Page) => {
  await page.goto('/backup');
  await page.getByRole('button', { name: /I breed or hold genetics/ }).click();
  await expect(page.getByRole('button', { name: /Save backup file/ })).toBeVisible();
};

test('on a computer: no share button, the by-hand way and "Save another copy" (the same file)', async ({ page }) => {
  const errors = watch(page);
  await isolate(page);
  await openBackup(page);
  await expect(page.getByRole('heading', { name: /Put a copy somewhere else \(recommended\)/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Send a copy/ })).toHaveCount(0);
  await expect(page.getByText(/Put it on a USB stick or in a password manager/)).toBeVisible();

  const first = page.waitForEvent('download');
  await page.getByRole('button', { name: /Save backup file/ }).click();
  const firstFile = await first;
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
    await page.getByRole('button', { name: /Save backup file/ }).click();
    await download;
    await page.getByRole('button', { name: /Send a copy/ }).click();
    await expect(page.getByText(/couldn.t open its share menu/)).toBeVisible();
    await expect(page.getByText(/Put it on a USB stick or in a password manager/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Save another copy/ })).toBeVisible();
  });
});
