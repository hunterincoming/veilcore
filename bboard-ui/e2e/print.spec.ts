// Printed, the public pages are ink on white (site.css's print block). A review of PR 181 found
// the home pages printing white text on white, gold text at 1.4:1, and the photo breaks and step
// pictures as dark boxes with the words on top. This prints each page (print media) and checks
// what is on it: every piece of text reads on white, and nothing visible has a dark fill or a
// dark gradient (a printer with "background graphics" on would print it, and the words on it).
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';
import { isolate } from './helpers';

const PAGES = ['/', '/how-it-works', '/about', '/founders', '/privacy', '/terms', '/help', '/verify'];

type Found = { text: string[]; dark: string[] };

for (const width of [390, 1280])
  for (const path of PAGES)
    test(`printed at ${width}px, ${path} is ink on white: text reads, nothing is dark`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await isolate(page);
      await page.emulateMedia({ media: 'print' });
      await page.goto(path);
      await page.locator('main').first().waitFor();
      await page.waitForLoadState('networkidle');
      const found: Found = await page.evaluate(() => {
        const rgba = (s: string) => {
          const m = s.match(/rgba?\(([^)]+)\)/);
          if (!m) return null;
          const [r, g, b, a = 1] = m[1]
            .split(/[ ,/]+/)
            .filter(Boolean)
            .map(Number);
          return { r, g, b, a };
        };
        const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
        const lum = (c: { r: number; g: number; b: number; a: number }) => {
          // Over white paper.
          const [r, g, b] = [c.r, c.g, c.b].map((v) => v * c.a + 255 * (1 - c.a));
          return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        };
        const shown = (el: Element) => {
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) return false;
          for (let e: Element | null = el; e; e = e.parentElement) {
            const cs = getComputedStyle(e);
            if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.1) return false;
          }
          return true;
        };
        const name = (el: Element) =>
          `${el.tagName.toLowerCase()}.${(el.getAttribute('class') ?? '').split(/\s+/).slice(0, 2).join('.')}`;
        const out: Found = { text: [], dark: [] };
        // Text: 4.5:1 or more on white, and never see-through (outline-only) letters.
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walk.nextNode()) {
          const t = walk.currentNode as Text;
          const el = t.parentElement;
          if (!el || !t.textContent?.trim() || !shown(el) || el.closest('script,style,noscript')) continue;
          const c = rgba(getComputedStyle(el).color);
          if (!c) continue;
          const ratio = 1.05 / (lum(c) + 0.05);
          if (c.a < 0.5 || ratio < 4.5)
            out.text.push(`${ratio.toFixed(2)}:1 ${name(el)} "${t.textContent.trim().slice(0, 40)}"`);
        }
        // Fills: no visible dark background colour, and no gradient with a dark stop.
        for (const el of document.querySelectorAll('body *')) {
          if (!shown(el)) continue;
          const r = el.getBoundingClientRect();
          if (r.width * r.height < 400) continue; // a dot, a tick, a rule
          for (const pseudo of [null, '::before', '::after']) {
            const cs = getComputedStyle(el, pseudo);
            if (pseudo && (cs.content === 'none' || cs.content === 'normal' || cs.display === 'none')) continue;
            const bg = rgba(cs.backgroundColor);
            if (bg && bg.a > 0.3 && lum(bg) < 0.4) out.dark.push(`${name(el)}${pseudo ?? ''} ${cs.backgroundColor}`);
            for (const stop of cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)) {
              const s = rgba(stop[0]);
              if (s && s.a > 0.3 && lum(s) < 0.4) {
                out.dark.push(`${name(el)}${pseudo ?? ''} gradient ${stop[0]}`);
                break;
              }
            }
          }
        }
        return out;
      });
      expect(found.text, 'text that would not read on white paper').toEqual([]);
      expect(found.dark, 'dark fills that would print').toEqual([]);
    });
