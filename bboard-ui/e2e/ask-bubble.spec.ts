// The Ask chat bubble (docs/ask-veilcore.md, "What it is"): bottom right, never covering a page's
// last line, and out of the way of a text field on a touch screen; no hint for someone with no
// record yet (e2e/ask.spec.ts tries the hint once there is one); what Ask can do shown on the
// first open, as a list that claims only what Ask does, then folded under "What can Ask do?".
// ASK_SHOTS=<dir> saves fix-bubble-*.png (phone and desktop) for review.
// SPDX-License-Identifier: Apache-2.0
import { expect, test, type Page } from '@playwright/test';
import { REAL_REGISTRY, expectNoErrors, isolate, watch } from './helpers';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

const shot = async (page: Page, name: string) => {
  const dir = process.env.ASK_SHOTS;
  if (!dir) return;
  await page.screenshot({ path: `${dir}/fix-bubble-${name}.png` });
};

const CAN = [
  'Cut clones or record offspring, many at once',
  'Show what’s due',
  'Explain words like “proof code”',
  'Find your records',
  'Fill in a new record for you to check and save',
  'Do it for me: I get a whole job ready; you approve it once.',
];

test('phone: Ask is a button in the header, in the page, over nothing', async ({ page }) => {
  // Review of ux-polish, 13 Nov: even as an icon the bubble sat on the record's status lines at
  // 390px in German. On a phone it is in the header, beside the language and the network.
  const errors = watch(page);
  await isolate(page);
  await page.goto('/records');
  const ask = page.locator('[data-ask-open]');
  await expect(ask).toBeVisible();
  await expect(ask).toHaveText('Ask');
  await expect(ask).toHaveAttribute('data-ask-compact', '');
  expect(await ask.evaluate((el) => !!el.closest('[data-site-header]'))).toBe(true);
  expect(await ask.evaluate((el) => getComputedStyle(el).position)).not.toBe('fixed');
  // No room kept under the page for a bubble that isn't there.
  expect(await page.evaluate(() => getComputedStyle(document.body).paddingBottom)).toBe('0px');
  await expect(page.locator('[data-ask-hint]')).toHaveCount(0);
  await shot(page, 'phone');
  await ask.click();
  await expect(page.locator('[data-ask-can]')).toBeVisible();
  await shot(page, 'phone-card');
  expectNoErrors(errors);
});

for (const [label, viewport] of [
  ['tablet', { width: 800, height: 1000 }],
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
    await expect(bubble).not.toHaveAttribute('data-ask-compact');
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
    // No record yet: no hint (the page's own Start is the first step).
    await expect(page.locator('[data-ask-hint]')).toHaveCount(0);
    await shot(page, label);
    await page.locator('[data-ask-open]').click();
    await expect(page.locator('[data-ask-can]')).toBeVisible();
    // The card keeps its full height, above the text that follows it.
    const can = await page.locator('[data-ask-can]').boundingBox();
    const intro = await page.getByText('Pick one, or type what you want to do.').boundingBox();
    expect(can && intro && can.y + can.height <= intro.y).toBe(true);
    await shot(page, `${label}-card`);
    expectNoErrors(errors);
  });
}

test('first open: what Ask can do, as a list, then folded under "What can Ask do?"', async ({ page }) => {
  const errors = watch(page);
  await isolate(page);
  await page.goto('/records');
  await page.locator('[data-ask-open]').click();
  const card = page.locator('[data-ask-can]');
  await expect(card).toContainText('I can:');
  await expect(card.locator('li')).toHaveText(CAN);
  await expect(card).toContainText('I never sign or send anything. You do.');
  await expect(page.locator('[data-ask-can-toggle]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('[data-ask-sheet]')).toBeHidden();
  // Opening Ask is remembered, as the one flag.
  expect(await page.evaluate(() => localStorage.getItem('veilcore.ask.seen.v1'))).toBe('opened');
  await page.locator('[data-ask-open]').click();
  await expect(page.locator('[data-ask-can]')).toHaveCount(0);
  const toggle = page.locator('[data-ask-can-toggle]');
  await expect(toggle).toHaveText('What can Ask do?');
  // 44px, give or take the browser's sub-pixel rounding (43.99997).
  expect((await toggle.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  await toggle.click();
  await expect(page.locator('[data-ask-can] li')).toHaveText(CAN);
  // Seen before this page loaded: the next visit opens folded too.
  await page.reload();
  await page.locator('[data-ask-open]').click();
  await expect(page.locator('[data-ask-can]')).toHaveCount(0);
  expectNoErrors(errors);
});

test('on a phone the bubble stays off an agreement’s screens (terms, accepting, royalties); on a computer it is there', async ({
  page,
}) => {
  const errors = watch(page);
  await isolate(page);
  for (const path of ['/license/LIC-E2E', '/record/VEIL-0E2E/license', '/license-invite/INV-E2E']) {
    await page.goto(path);
    await page.waitForTimeout(800);
    await expect(page.locator('[data-ask-open]'), path).toHaveCount(0);
  }
  await page.goto('/records');
  await expect(page.locator('[data-ask-open]')).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/license/LIC-E2E');
  await expect(page.locator('[data-ask-open]')).toBeVisible();
  expectNoErrors(errors);
});

test.describe('on a touch screen', () => {
  // A tablet: the bubble floats there (on a phone it is in the header and steps aside for nothing).
  test.use({ viewport: { width: 800, height: 1000 }, hasTouch: true, isMobile: true });
  test('the bubble steps aside while a text field on the page has focus', async ({ page }) => {
    const errors = watch(page);
    await isolate(page);
    await page.goto('/records');
    const bubble = page.locator('[data-ask-open]');
    await expect(bubble).toBeVisible();
    const field = page.getByPlaceholder('Paste it here');
    await field.focus();
    await page.setViewportSize({ width: 800, height: 560 });
    await expect(bubble).toHaveCount(0);
    await shot(page, 'phone-keyboard');
    await field.blur();
    await page.setViewportSize({ width: 800, height: 1000 });
    await expect(bubble).toBeVisible();
    // A checkbox or radio brings up no keyboard: the bubble stays.
    await page.evaluate(() => {
      for (const type of ['checkbox', 'radio']) {
        const el = document.createElement('input');
        el.type = type;
        el.dataset.probe = type;
        document.querySelector('main')?.prepend(el);
      }
    });
    for (const type of ['checkbox', 'radio']) {
      await page.locator(`[data-probe="${type}"]`).focus();
      await page.waitForTimeout(100);
      await expect(bubble, type).toBeVisible();
    }
    // A field inside Ask itself does not hide it (the sheet is open over it anyway).
    await bubble.click();
    await page.locator('[data-ask-input]').focus();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(bubble).toBeVisible();
    expectNoErrors(errors);
  });
});
