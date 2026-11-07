// The Ask chat bubble (docs/ask-veilcore.md, "What it is"): bottom right, never covering a page's
// last line; the hint on a first visit, gone once dismissed, with only a flag kept; what Ask can
// do shown on the first open, then folded under "What can Ask do?".
// ASK_SHOTS=<dir> saves ask-bubble-*.png (phone and desktop) for review.
// SPDX-License-Identifier: Apache-2.0
import { expect, test, type Page } from '@playwright/test';
import { REAL_REGISTRY, expectNoErrors, isolate, watch } from './helpers';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

const shot = async (page: Page, name: string) => {
  const dir = process.env.ASK_SHOTS;
  if (!dir) return;
  await page.screenshot({ path: `${dir}/ask-bubble-${name}.png` });
};

const CAN =
  'cut clones or record offspring in one go · show what’s due · explain any word · find your records · open any screen filled in for you';

for (const [label, viewport] of [
  ['phone', { width: 390, height: 844 }],
  ['desktop', { width: 1280, height: 800 }],
] as const) {
  test(`${label}: the bubble sits bottom right, with room left under every page`, async ({ page }) => {
    const errors = watch(page);
    await page.setViewportSize(viewport);
    await isolate(page);
    await page.goto('/records');
    const bubble = page.locator('[data-ask-open]');
    await expect(bubble).toBeVisible();
    await expect(bubble).toHaveText('Ask');
    await expect(bubble.locator('svg')).toHaveCount(1);
    const box = await bubble.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    expect(Math.round(viewport.width - (box.x + box.width))).toBe(16);
    expect(Math.round(viewport.height - (box.y + box.height))).toBe(16);
    // The page ends with room for the bubble: scrolled to the bottom, the last line is above it.
    expect(await page.evaluate(() => getComputedStyle(document.body).paddingBottom)).toBe('80px');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    // The footer is the page's last part: its whole box ends above the bubble.
    const last = await page.evaluate(() => document.querySelector('footer')?.getBoundingClientRect().bottom ?? 0);
    expect(last).toBeGreaterThan(0);
    expect(last).toBeLessThanOrEqual(box.y);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator('[data-ask-hint]')).toBeVisible();
    await shot(page, label);
    await page.locator('[data-ask-open]').click();
    await expect(page.locator('[data-ask-can]')).toBeVisible();
    await shot(page, `${label}-card`);
    expectNoErrors(errors);
  });
}

test('the hint shows on a first visit and stays gone once dismissed; only a flag is stored', async ({ page }) => {
  const errors = watch(page);
  await isolate(page);
  await page.goto('/records');
  const hint = page.locator('[data-ask-hint]');
  await expect(hint).toBeVisible();
  await expect(hint).toContainText('Try: cut 12 clones from Blue Dream');
  const before = await page.evaluate(() => Object.keys(localStorage).sort());
  await hint.getByRole('button', { name: 'Dismiss' }).click();
  await expect(hint).toHaveCount(0);
  const after = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  // One new key, and it holds only "1".
  expect(Object.keys(after).filter((k) => !before.includes(k))).toEqual(['veilcore.ask.seen.v1']);
  expect(after['veilcore.ask.seen.v1']).toBe('1');
  await page.reload();
  await expect(page.locator('[data-ask-open]')).toBeVisible();
  await expect(page.locator('[data-ask-hint]')).toHaveCount(0);
  // Seen before: the sheet opens with what Ask can do folded away, under the link.
  await page.locator('[data-ask-open]').click();
  await expect(page.locator('[data-ask-sheet]')).toBeVisible();
  await expect(page.locator('[data-ask-can]')).toHaveCount(0);
  await page.locator('[data-ask-can-toggle]').click();
  await expect(page.locator('[data-ask-can]')).toContainText(CAN);
  expectNoErrors(errors);
});

test('first open: what Ask can do, then folded under "What can Ask do?"', async ({ page }) => {
  const errors = watch(page);
  await isolate(page);
  await page.goto('/records');
  await expect(page.locator('[data-ask-hint]')).toBeVisible();
  await page.locator('[data-ask-open]').click();
  const card = page.locator('[data-ask-can]');
  await expect(card).toContainText('I can:');
  await expect(card).toContainText(CAN);
  await expect(card).toContainText('I never sign or send anything. You do.');
  await expect(page.locator('[data-ask-can-toggle]')).toHaveCount(0);
  // Opening Ask counts as seeing it: the hint is gone.
  await expect(page.locator('[data-ask-hint]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('[data-ask-sheet]')).toBeHidden();
  await page.locator('[data-ask-open]').click();
  await expect(page.locator('[data-ask-can]')).toHaveCount(0);
  await expect(page.locator('[data-ask-can-toggle]')).toHaveText('What can Ask do?');
  expectNoErrors(errors);
});
