// The home page in the site layout (18 November 2026): the page always moves when you scroll, every
// anchor other pages link to is still there, every way in goes to a real page, and the gallery
// moves with its buttons. A tester found the draft held the page still while pinned sections
// played; nothing here may do that again.
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';
import { expectNoErrors, isolate, watch } from './helpers';

/** The short home page's own sections (22 Nov 2026). */
const ANCHORS = ['top', 'steps', 'about', 'private', 'own-way', 'more'];

/**
 * The anchors older links point at on the home page: the old header (#how, #about), the app
 * footer (#demo, #updates, #live, #technical), Help (#live), the gallery (#claims), and older
 * links (#team, #contact, #status, #questions, #value, #open). Those sections moved to How it
 * works or About when the home page was cut short; an old link lands on the same section there.
 */
const MOVED: [string, string][] = [
  ['how', '/how-it-works'],
  ['demo', '/how-it-works#demo'],
  ['claims', '/how-it-works#claims'],
  ['value', '/how-it-works#value'],
  ['open', '/how-it-works#open'],
  ['status', '/how-it-works#status'],
  ['live', '/how-it-works#where'],
  ['questions', '/how-it-works#questions'],
  ['technical', '/how-it-works#technical'],
  ['matters', '/how-it-works#matters'],
  ['updates', '/founders#updates'],
  ['contact', '/founders#contact'],
  ['team', '/founders'],
  ['keep', '/#private'],
];

test.describe('the home page', () => {
  test('scrolls on every step from top to bottom, and pins nothing', async ({ page }) => {
    const errors = watch(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await isolate(page);
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    // Smooth scrolling would make a step land late; this measures where each step lands.
    await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
    // The pointer over the middle of the page, so each wheel step lands on whatever is there.
    await page.mouse.move(640, 400);
    const stalls: number[] = [];
    let last = await page.evaluate(() => window.scrollY);
    for (let i = 0; i < 200; i++) {
      const bottom = await page.evaluate(
        () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2,
      );
      if (bottom) break;
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(60);
      const now = await page.evaluate(() => window.scrollY);
      if (now <= last) stalls.push(last);
      last = now;
    }
    expect(stalls, 'scroll positions where a wheel step did not move the page').toEqual([]);
    expect(await page.evaluate(() => window.scrollY + window.innerHeight)).toBeGreaterThanOrEqual(
      (await page.evaluate(() => document.documentElement.scrollHeight)) - 2,
    );

    // Nothing is sticky or fixed but the site header.
    const pinned = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((el) => ['sticky', 'fixed'].includes(getComputedStyle(el).position))
        .filter((el) => !el.closest('[data-site-header]'))
        .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`),
    );
    expect(pinned).toEqual([]);
    // No sideways scroll.
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    expectNoErrors(errors);
  });

  test('every anchor other pages link to is still reached, once', async ({ page }) => {
    await isolate(page);
    await page.goto('/');
    for (const id of ANCHORS) await expect(page.locator(`[id="${id}"]`), id).toHaveCount(1);
    // An old link to a section that moved lands on that section on its new page.
    for (const [id, to] of MOVED) {
      await page.goto(`/#${id}`);
      await expect(page, id).toHaveURL(new RegExp(`${to.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
      const hash = to.split('#')[1];
      if (hash) await expect(page.locator(`[id="${hash}"]`), id).toHaveCount(1);
    }
    // Each section once on How it works, the moved ones included (review of #169).
    await page.goto('/how-it-works');
    for (const id of ['claims', 'demo', 'value', 'status', 'questions', 'technical', 'matters', 'open', 'own-way'])
      await expect(page.locator(`[id="${id}"]`), id).toHaveCount(1);
    // Arriving at #live opens what's live where; #technical opens the technical section.
    // What's live where is drawn open on How it works (#where), with its table.
    await page.goto('/#live');
    await expect(page.locator('#where table')).toHaveCount(1);
    await page.goto('/#technical');
    await expect(page.locator('#technical details')).toHaveAttribute('open', '');
  });

  test('is short: hero, three steps, who it is for, privacy, use it your way, links', async ({ page }) => {
    await isolate(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    // "Make a record" and "Check a record" are the hero's two buttons, before the paste line.
    const make = page.locator('.hero-actions a[href="/new"]');
    await expect(make).toBeVisible();
    await expect(page.locator('.hero-actions a[href="/verify"]')).toBeVisible();
    const paste = await page.locator('[data-paste-entry="hero"]').boundingBox();
    const buttons = await page.locator('.hero-actions').boundingBox();
    expect(paste && buttons && paste.y > buttons.y).toBe(true);
    await expect(make).toBeInViewport();
    // It was about 25,400 px (some 30 phone screens) with 60 headings.
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(844 * 8);
    expect(await page.locator('main :is(h1, h2, h3)').count()).toBeLessThanOrEqual(14);
    // Who it is for: each to its own page.
    const who = page.locator('#about');
    for (const to of ['/new', '/for-labs', '/partners']) await expect(who.locator(`a[href="${to}"]`)).toHaveCount(1);
  });

  test('the ways in go to real pages', async ({ page }) => {
    await isolate(page);
    await page.goto('/');
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll('main a[href]')].map((a) => a.getAttribute('href') ?? ''),
    );
    for (const h of hrefs.filter((x) => x.startsWith('#'))) expect(ANCHORS, h).toContain(h.slice(1));
    const routes = [...new Set(hrefs.filter((h) => h.startsWith('/')))].sort();
    expect(routes).toEqual(
      expect.arrayContaining([
        '/new',
        '/verify',
        '/privacy',
        '/founders',
        '/docs/spec',
        '/docs/integrate',
        '/docs/evidence',
      ]),
    );
    for (const r of routes) {
      const res = await page.request.get(r);
      expect(res.status(), r).toBe(200);
    }
    await expect(page.locator('main a[href="/new"]').first()).toBeVisible();
  });

  test('the gallery steps with its buttons and the page keeps its place', async ({ page }) => {
    const errors = watch(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await isolate(page);
    // On How it works since the home page was cut short (22 Nov).
    await page.goto('/how-it-works');
    await page.locator('#matters').scrollIntoViewIfNeeded();
    const y = await page.evaluate(() => window.scrollY);
    const track = page.locator('#matters ul');
    const prev = page.getByRole('button', { name: 'Previous' });
    const next = page.getByRole('button', { name: 'Next' });
    await expect(prev).toBeDisabled();
    await next.click();
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
    await expect(prev).toBeEnabled();
    expect(await page.evaluate(() => window.scrollY)).toBe(y);
    // Five panels, each with its photo's size set, so nothing shifts as they load. The design's photos
    // (21 Nov) come in their own sizes, so each img carries its own file's width and height.
    await expect(track.locator('li img')).toHaveCount(5);
    for (const img of await track.locator('li img').all()) {
      await expect(img).toHaveAttribute('width', /^[1-9]\d{2,3}$/);
      await expect(img).toHaveAttribute('height', /^[1-9]\d{2,3}$/);
      await expect(img).toHaveAttribute('loading', 'lazy');
      await expect(img).toHaveAttribute('alt', /.+/);
    }
    expectNoErrors(errors);
  });

  test('the moving names can be paused, and screen readers get them once', async ({ page }) => {
    await isolate(page);
    await page.goto('/how-it-works');
    const band = page.getByRole('region', { name: 'Who it is for' });
    await expect(band).toContainText('Breeders, Seed companies');
    await band.getByRole('button', { name: 'Pause the moving names' }).click();
    await expect(band.getByRole('button', { name: 'Play the moving names' })).toBeVisible();
  });
});
