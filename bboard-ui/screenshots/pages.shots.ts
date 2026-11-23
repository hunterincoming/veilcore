// Every page that opens without a record, at phone and desktop width, in English and Japanese
// (docs/screenshots.md). The page list comes from config/route-tiers.ts, so a new page is
// photographed without anyone adding it here. Pages that need a record or a licence (a path
// with ":") are listed on the contact sheet as skipped; two stand-ins are used instead:
// /docs/spec for /docs/:doc, and a made-up path for the not-found page.
// SHOTS_DIR=<folder> sets where the pictures go (default screenshots/out, git-ignored).
// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import { isolate, json, type Handler } from '../e2e/helpers';
import { ROUTE_TIERS } from '../src/config/route-tiers';
import { LANGS, VIEWPORTS, shotName, shotsDir } from './shots';

/** Paths in route-tiers.ts that need a record, and the path photographed in their place. */
const STAND_INS: Record<string, string> = {
  '/docs/:doc': '/docs/spec',
  '*': '/no-such-page',
};
/** The browser tests' own page: not in a real build. */
const LEFT_OUT = new Set(['/e2e/royalty-pay']);

const routes = Object.keys(ROUTE_TIERS)
  .filter((r) => !LEFT_OUT.has(r))
  .map((r) => ({ route: r, path: STAND_INS[r] ?? r }))
  .filter((r) => !r.path.includes(':'));

// A first-time visitor: no records, no licences, nothing sent. Everything else answers 404.
const EMPTY: Record<string, Handler> = {
  'GET /api/records': (route) => json(route, 200, []),
  'GET /api/licenses': (route) => json(route, 200, []),
  'GET /api/disclosures': (route) => json(route, 200, []),
  'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
};

const OUT = shotsDir();
mkdirSync(OUT, { recursive: true });
writeFileSync(
  path.join(OUT, 'skipped.json'),
  JSON.stringify(Object.keys(ROUTE_TIERS).filter((r) => !routes.some((x) => x.route === r))),
);

for (const { lang, locale } of LANGS) {
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`${lang} ${vpName}`, () => {
      test.use({ locale, viewport, timezoneId: 'UTC' });

      for (const { route, path: p } of routes) {
        test(p, async ({ page }) => {
          // The page's clock is the test's: the same date on every run, and timers and animation
          // frames move only when the test moves them, so an animation is always caught at the
          // same point.
          await page.clock.install({ time: new Date('2026-11-22T12:00:00Z') });
          // The same "random" numbers on every run: the landing page's drawing turns by a random
          // angle, and How it works shows a proof code made with a random salt. Safe only here:
          // this browser profile is thrown away and nothing it makes leaves the machine (isolate).
          await page.addInitScript(() => {
            let s = 0x9e3779b9;
            const next = () => {
              s = (s + 0x6d2b79f5) | 0;
              let t = Math.imul(s ^ (s >>> 15), 1 | s);
              t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
              return (t ^ (t >>> 14)) >>> 0;
            };
            Math.random = () => next() / 4294967296;
            crypto.getRandomValues = <T extends ArrayBufferView | null>(a: T): T => {
              if (a) {
                const b = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
                for (let i = 0; i < b.length; i++) b[i] = next() & 255;
              }
              return a;
            };
          });
          await isolate(page, EMPTY);
          await page.goto(p, { waitUntil: 'networkidle' });
          // Lazy pages load (real time), then their timers and animations run to the end (page
          // time), twice over, so a page that loads more after a timer is caught too.
          for (let i = 0; i < 2; i++) {
            await page.clock.runFor(5_000);
            await page.waitForLoadState('networkidle');
            await page.evaluate(() => document.fonts.ready.then(() => undefined));
          }
          // Scroll down the page a screen at a time, as a reader would, so what draws or loads
          // only when on screen has done so, then back to the top. Each step runs to its end.
          const height = await page.evaluate(() => document.documentElement.scrollHeight);
          for (let y = 0; y < height; y += viewport.height) {
            await page.evaluate((top) => window.scrollTo(0, top), y);
            // The browser's own frames (which tell a page what is on screen) run in real time.
            await page.waitForTimeout(150);
            await page.clock.runFor(2_000);
          }
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.clock.runFor(5_000);
          await page.waitForLoadState('networkidle');
          await page.evaluate(() => document.fonts.ready.then(() => undefined));
          const file = shotName(lang, vpName, p);
          await page.screenshot({
            path: path.join(OUT, file),
            fullPage: true,
            animations: 'disabled',
            caret: 'hide',
          });
          const landed = new URL(page.url());
          writeFileSync(
            path.join(OUT, file.replace(/\.png$/, '.json')),
            JSON.stringify({
              route,
              path: p,
              lang,
              viewport: vpName,
              landed: landed.pathname + landed.hash,
              title: await page.title(),
            }),
          );
        });
      }
    });
  }
}
