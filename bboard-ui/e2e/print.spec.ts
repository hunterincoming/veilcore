// Printed, the public pages are ink on white (site.css's print block). Reviews of PR 181 found
// the home pages printing white text on white, gold text at 1.4:1, the photo breaks and step
// pictures as dark boxes with the words on top, and (in a real print, where lazy photos load)
// photos printed under headings and buttons. This prints each page (print media, at a phone's,
// a sheet of Letter paper's and a desktop's width), loads every photo first, and checks:
// - every piece of text reads 4.5:1 or more on white: its colour, or the fill a text is drawn
//   with (-webkit-text-fill-color, an SVG text's fill), with the opacity of it and everything
//   it sits in;
// - nothing visible has a dark fill or a dark gradient (a printer with "background graphics" on
//   would print it, and the words on it);
// - no photo (an <img>, or a background image) lies under any text.
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';
import { isolate } from './helpers';

const PAGES = ['/', '/how-it-works', '/about', '/founders', '/privacy', '/terms', '/help', '/verify'];
/** A phone, Letter paper (8.5in at 96 CSS px an inch), and a desktop. */
const WIDTHS = [390, 816, 1280];

type Found = { text: string[]; dark: string[]; under: string[] };

for (const width of WIDTHS)
  for (const path of PAGES)
    test(`printed at ${width}px, ${path} is ink on white: text reads, nothing dark, no photo under words`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1056 });
      await isolate(page);
      await page.emulateMedia({ media: 'print' });
      await page.goto(path);
      await page.locator('main').first().waitFor();
      await page.waitForLoadState('networkidle');
      // A printer loads every photo, lazy or not: so does this, before it looks.
      await page.evaluate(async () => {
        for (const img of document.images) img.loading = 'eager';
        const step = Math.max(400, window.innerHeight - 100);
        for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
          window.scrollTo({ top: y, behavior: 'instant' });
          await new Promise((r) => setTimeout(r, 30));
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
        await Promise.all([...document.images].map((i) => i.decode().catch(() => undefined)));
      });
      await page.waitForLoadState('networkidle');
      const found: Found = await page.evaluate(() => {
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
        const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
        // Over white paper.
        const lum = (c: C) => {
          const [r, g, b] = [c.r, c.g, c.b].map((v) => v * c.a + 255 * (1 - c.a));
          return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        };
        /** The opacity it is drawn with: its own and every box it sits in. */
        const opacity = (el: Element) => {
          let o = 1;
          for (let e: Element | null = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
          return o;
        };
        const laidOut = (el: Element) => {
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) return false;
          for (let e: Element | null = el; e; e = e.parentElement) {
            const cs = getComputedStyle(e);
            if (cs.display === 'none' || cs.visibility === 'hidden') return false;
          }
          return true;
        };
        /** Drawn at all (fully transparent things are not on the paper). */
        const shown = (el: Element) => laidOut(el) && opacity(el) >= 0.05;
        const name = (el: Element) =>
          `${el.tagName.toLowerCase()}.${(el.getAttribute('class') ?? '').split(/\s+/).slice(0, 2).join('.')}`;
        const out: Found = { text: [], dark: [], under: [] };
        const check = (el: Element, colour: string, what: string) => {
          const c = rgba(colour);
          if (!c) return;
          c.a *= opacity(el);
          const ratio = 1.05 / (lum(c) + 0.05);
          if (ratio < 4.5) out.text.push(`${ratio.toFixed(2)}:1 ${name(el)} "${what.slice(0, 40)}"`);
        };

        // Text, and the boxes it is drawn in.
        const textBoxes: { r: DOMRect; what: string; el: Element }[] = [];
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walk.nextNode()) {
          const t = walk.currentNode as Text;
          const el = t.parentElement;
          const what = t.textContent?.trim() ?? '';
          if (!el || !what || el.closest('script,style,noscript,title') || !shown(el)) continue;
          const cs = getComputedStyle(el);
          if (el instanceof SVGElement) check(el, cs.fill, what);
          else {
            // -webkit-text-fill-color is what letters are filled with; it is `color` unless set.
            check(el, cs.webkitTextFillColor || cs.color, what);
            if (cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color) check(el, cs.color, what);
          }
          const range = document.createRange();
          range.selectNodeContents(t);
          for (const r of range.getClientRects()) if (r.width > 2 && r.height > 2) textBoxes.push({ r, what, el });
        }

        // Fills, and photos.
        const photos: { r: DOMRect; what: string; el: Element }[] = [];
        for (const el of document.querySelectorAll('body *')) {
          if (!shown(el)) continue;
          const r = el.getBoundingClientRect();
          if (r.width * r.height < 400) continue; // a dot, a tick, a rule, an icon
          if (el instanceof HTMLImageElement && !/\.svg(\?|$)/.test(el.currentSrc))
            photos.push({ r, what: name(el), el });
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
            if (/url\(/.test(cs.backgroundImage) && !/data:image\/svg|\.svg/.test(cs.backgroundImage))
              photos.push({ r, what: `${name(el)}${pseudo ?? ''} background image`, el });
          }
        }
        // No photo under words: a text box overlapping a photo by more than 4px each way.
        for (const p of photos)
          for (const t of textBoxes) {
            const w = Math.min(p.r.right, t.r.right) - Math.max(p.r.left, t.r.left);
            const h = Math.min(p.r.bottom, t.r.bottom) - Math.max(p.r.top, t.r.top);
            if (w <= 4 || h <= 4) continue;
            // Which is on top? A photo drawn over a text (a fallback under a portrait) hides it;
            // only words drawn on a photo count.
            const x = Math.max(p.r.left, t.r.left) + w / 2;
            const y = Math.max(p.r.top, t.r.top) + h / 2;
            window.scrollTo({ top: y - window.innerHeight / 2, behavior: 'instant' });
            const stack = document.elementsFromPoint(x, y - window.scrollY);
            window.scrollTo({ top: 0, behavior: 'instant' });
            const photoAt = stack.findIndex((e) => e === p.el || p.el.contains(e));
            let textAt = -1;
            for (let e: Element | null = t.el; e && textAt < 0; e = e.parentElement) textAt = stack.indexOf(e);
            if (photoAt >= 0 && photoAt < textAt) continue;
            out.under.push(`${p.what} under "${t.what.slice(0, 40)}"`);
            break;
          }
        return out;
      });
      expect(found.text, 'text that would not read on white paper').toEqual([]);
      expect(found.dark, 'dark fills that would print').toEqual([]);
      expect(found.under, 'photos that would print under words').toEqual([]);
    });
