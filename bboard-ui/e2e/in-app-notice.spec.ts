// Inside another app's built-in browser (Instagram here), a small note says to open the page in
// Chrome or Safari (veilcore/in-app-browser.ts; summit 5b item 17). It blocks nothing, closes
// with one tap and stays closed for the visit, and sits outside the page's main part with no
// filled (primary) button. An ordinary browser never shows it.
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';
import { expectNoErrors, isolate, watch } from './helpers';

const INSTAGRAM =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 307.0.3.18.108 (iPhone14,5; iOS 17_1_1; en_US; en; scale=3.00; 1170x2532; 532277137)';
const SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1';
const WORDS = 'Open this in Chrome or Safari so your records and keys stay on your phone.';

test('in Instagram: the note shows, blocks nothing, and closes for the visit', async ({ browser }) => {
  const ctx = await browser.newContext({ userAgent: INSTAGRAM, viewport: { width: 360, height: 800 } });
  const page = await ctx.newPage();
  const errors = watch(page);
  await isolate(page);
  await page.goto('/');
  const note = page.locator('[data-in-app-notice]');
  await expect(note).toHaveAttribute('data-in-app-notice', 'instagram');
  await expect(note.locator('p')).toHaveText(WORDS);
  await expect(page.locator('main [data-in-app-notice]')).toHaveCount(0);
  await expect(note.locator('.MuiButton-contained')).toHaveCount(0);
  // Nothing is blocked: the page's own way in still works.
  await page.locator('main a[href="/new"]').first().click();
  await expect(page).toHaveURL(/\/new$/);
  await expect(note).toBeVisible();
  await note.getByRole('button', { name: 'Close this notice' }).click();
  await expect(note).toHaveCount(0);
  await page.goto('/records');
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('[data-in-app-notice]')).toHaveCount(0);
  expectNoErrors(errors);
  await ctx.close();
});

test('in Safari: no note', async ({ browser }) => {
  const ctx = await browser.newContext({ userAgent: SAFARI });
  const page = await ctx.newPage();
  await isolate(page);
  await page.goto('/');
  await expect(page.locator('h1').first()).toBeVisible();
  await expect(page.locator('[data-in-app-notice]')).toHaveCount(0);
  await ctx.close();
});
