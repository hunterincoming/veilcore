// The complexity budget's own rules (docs/complexity-budget.md), without a browser:
//   - every page in App.tsx has a tier in config/route-tiers.ts, and nothing is listed there
//     that isn't a page, so a new page can't appear without a decision about where it goes;
//   - the number of core pages stays within complexity-budget.json ("coreRoutes");
//   - the budget file itself is whole: every screen has every number, in every language, and
//     the jargon it lists as "there today" is jargon it checks for.
// The screens themselves are measured in a browser (e2e/complexity-budget.spec.ts).
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUTE_TIERS } from './config/route-tiers';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LANGS = ['en', 'de', 'es', 'fr', 'ja'] as const;

type Budget = {
  coreRoutes: number;
  screens: Record<
    string,
    { screen: string; primary: number; buttons: number; moreDepth: number; words: Record<string, number> }
  >;
  firstSeal: { screens: number; taps: number };
  siteHomeHeight: number;
  howItWorksHeight: number;
  jargon: { terms: Record<string, string[]>; today: Record<string, Record<string, string[]>> };
};
const budget = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'complexity-budget.json'), 'utf8')) as Budget;

/** Every `path="…"` of a <Route> in App.tsx, on one line or spread over several. */
const appRoutes = (): string[] => {
  const app = fs.readFileSync(path.join(HERE, 'App.tsx'), 'utf8');
  return [...app.matchAll(/<Route\s+(?:[^>]*?\s)?path="([^"]+)"/gs)].map((m) => m[1]);
};

describe('every page has a tier', () => {
  it('reads the pages from App.tsx', () => {
    // A sanity check on the reading itself: if this breaks, the test below proves nothing.
    expect(appRoutes()).toEqual(expect.arrayContaining(['/', '/records', '/record/:id', '/verify/:id', '*']));
    expect(appRoutes().length).toBeGreaterThan(30);
  });

  it('each page in App.tsx is listed in config/route-tiers.ts, and each listed page exists', () => {
    const routes = appRoutes();
    const missing = routes.filter((r) => !(r in ROUTE_TIERS));
    expect(missing, `give these pages a tier in src/config/route-tiers.ts: ${missing.join(', ')}`).toEqual([]);
    const stale = Object.keys(ROUTE_TIERS).filter((r) => !routes.includes(r));
    expect(stale, `no longer pages in App.tsx; take them out of route-tiers.ts: ${stale.join(', ')}`).toEqual([]);
    expect(new Set(routes).size, 'a path is declared twice in App.tsx').toBe(routes.length);
  });

  it('each tier is core, role (naming the role) or advanced', () => {
    for (const [route, t] of Object.entries(ROUTE_TIERS)) {
      expect(['core', 'role', 'advanced'], route).toContain(t.tier);
      if (t.tier === 'role') expect(['lab', 'licensing', 'collections'], route).toContain(t.role);
    }
  });

  it('the number of core pages stays within the budget', () => {
    const core = Object.entries(ROUTE_TIERS)
      .filter(([, t]) => t.tier === 'core')
      .map(([r]) => r);
    expect(core.length, `core pages: ${core.join(', ')}`).toBeLessThanOrEqual(budget.coreRoutes);
  });
});

describe('the budget file is whole', () => {
  const whole = (n: unknown) => Number.isInteger(n) && (n as number) >= 0;

  it('every screen has every number, and words in all five languages', () => {
    expect(Object.keys(budget.screens).length).toBeGreaterThan(0);
    for (const [name, s] of Object.entries(budget.screens)) {
      expect(s.screen, name).toMatch(/\S/);
      for (const k of ['primary', 'buttons', 'moreDepth'] as const) expect(whole(s[k]), `${name}.${k}`).toBe(true);
      expect(Object.keys(s.words).sort(), `${name}.words`).toEqual([...LANGS].sort());
      for (const lang of LANGS) expect(whole(s.words[lang]), `${name}.words.${lang}`).toBe(true);
    }
    expect(whole(budget.firstSeal.screens) && whole(budget.firstSeal.taps)).toBe(true);
    expect(whole(budget.coreRoutes)).toBe(true);
    // The landing page's height on the phone (22 Nov 2026: it was about 25,400 px).
    expect(whole(budget.siteHomeHeight) && budget.siteHomeHeight > 0).toBe(true);
    expect(whole(budget.howItWorksHeight) && budget.howItWorksHeight > 0).toBe(true);
  });

  it('jargon is listed for every language, and what is "there today" is jargon it checks for', () => {
    expect(Object.keys(budget.jargon.terms).sort()).toEqual([...LANGS].sort());
    for (const lang of LANGS) expect(budget.jargon.terms[lang].length, lang).toBeGreaterThan(0);
    for (const [screen, byLang] of Object.entries(budget.jargon.today)) {
      expect(Object.keys(budget.screens), `jargon.today.${screen} is not a budgeted screen`).toContain(screen);
      for (const [lang, terms] of Object.entries(byLang))
        for (const t of terms) expect(budget.jargon.terms[lang], `jargon.today.${screen}.${lang}`).toContain(t);
    }
  });
});
