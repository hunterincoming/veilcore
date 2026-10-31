// A first visit asks nothing about who you are: no "Which describes you?" over the page. A
// newcomer is a breeder; the new-record page's one question is what they want to prove. A lab
// says so itself, with "I'm a lab" on the home screen.
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';
import { expectNoErrors, isolate, json, watch } from './helpers';

test('a first visit goes straight in; a lab switches with one button', async ({ page }) => {
  const errors = watch(page);
  await isolate(page, {
    'GET /api/records': (route) => json(route, 200, []),
    'GET /api/licenses': (route) => json(route, 200, []),
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
  });
  await page.goto('/new');
  await expect(page.getByRole('heading', { name: 'What do you want to prove?' })).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.goto('/records');
  await page.getByRole('button', { name: "I'm a lab" }).click();
  await expect(page.getByRole('dialog', { name: 'Which describes you?' })).toBeVisible();
  await page.getByRole('button', { name: /I run a lab/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('veilcore.role.v1'))).toBe('lab');
  expectNoErrors(errors);
});
