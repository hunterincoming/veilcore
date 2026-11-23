// The app's pages on screen, by night and by day (config/theme.ts, 23 Nov 2026): every word reads
// on what it is drawn on, 4.5:1 or more (3:1 for large text), the header's gold button included.
// Review of PR 187 found that button drawing the night's light text on the gold (3.3:1) at desktop
// width; the phone's menu has its own copy of it, so the menu is opened and checked too.
// SPDX-License-Identifier: Apache-2.0
import { expect, test, type Page } from '@playwright/test';
import { isolate } from './helpers';
import { seededRecord } from './seeded-record';

/** A phone and a desktop. */
const WIDTHS = [390, 1440];
const SCHEMES = ['dark', 'light'] as const;

/** Every text on screen that reads under its minimum on what is behind it. */
const lowContrast = (page: Page) =>
  page.evaluate(() => {
    type C = { r: number; g: number; b: number; a: number };
    const rgba = (s: string): C | null => {
      const m = s.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, b, a = 1] = m[1]
        .split(/[ ,/]+/)
        .filter(Boolean)
        .map(Number);
      return { r, g, b, a };
    };
    const over = (top: C, under: C): C => ({
      r: top.r * top.a + under.r * (1 - top.a),
      g: top.g * top.a + under.g * (1 - top.a),
      b: top.b * top.a + under.b * (1 - top.a),
      a: 1,
    });
    const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const lum = (c: C) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
    const ratio = (a: C, b: C) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };
    /** What is behind an element: its own fill and its boxes', composited; null under a picture. */
    const behind = (el: Element): C | null => {
      const fills: C[] = [];
      for (let e: Element | null = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.backgroundImage !== 'none') return null;
        const c = rgba(cs.backgroundColor);
        if (c && c.a > 0) {
          fills.push(c);
          if (c.a >= 1) break;
        }
      }
      let out: C = { r: 255, g: 255, b: 255, a: 1 };
      for (const f of fills.reverse()) out = over(f, out);
      return out;
    };
    const shown = (el: Element) => {
      if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
      const r = el.getBoundingClientRect();
      return r.width > 1 && r.height > 1;
    };
    const found: string[] = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      const el = walk.currentNode.parentElement;
      const what = walk.currentNode.textContent?.trim() ?? '';
      if (!el || !what || el.closest('script,style,noscript,[aria-hidden="true"]') || !shown(el)) continue;
      // A control that can't be used now is exempt, as in WCAG 1.4.3.
      if (el.closest('[disabled], .Mui-disabled, [aria-disabled="true"]')) continue;
      const cs = getComputedStyle(el);
      const fg = rgba(cs.webkitTextFillColor || cs.color);
      const bg = behind(el);
      if (!fg || !bg) continue;
      const size = parseFloat(cs.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
      const r = ratio(over(fg, bg), bg);
      if (r < (large ? 3 : 4.5))
        found.push(`${r.toFixed(2)}:1 ${cs.color} on rgb(${bg.r},${bg.g},${bg.b}) "${what.slice(0, 40)}"`);
    }
    return found;
  });

for (const scheme of SCHEMES)
  for (const width of WIDTHS)
    test(`${scheme}, ${width}px: every word on the app's pages reads, the header's gold button too`, async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: scheme });
      const rec = seededRecord();
      await rec.hold(page);
      await isolate(page, rec.handlers);
      const found: Record<string, string[]> = {};
      for (const path of ['/records', `/record/${rec.id}`, '/new', '/settings', '/verify/example']) {
        await page.goto(path);
        await page.locator('[data-site-header]').first().waitFor();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
        if (width < 600) {
          // The phone's header keeps the gold button in its menu.
          await page.locator('[data-site-menu-button]').click();
          await expect(page.locator('[data-site-menu] :is([data-cta], [data-your-records])')).toBeVisible();
        } else await expect(page.locator('[data-site-header] [data-cta]').first()).toBeVisible();
        const low = await lowContrast(page);
        if (low.length) found[path.replace(rec.id, ':id')] = low;
        if (width < 600) await page.keyboard.press('Escape');
      }
      expect(found, 'text under 4.5:1 (3:1 large) on what it is drawn on').toEqual({});
    });
