// The complexity budget (docs/complexity-budget.md): the default screens a first-time person sees,
// measured on an iPhone 14 in all five languages, against the numbers in complexity-budget.json.
// A number may go down; it may not go up. Counted on each screen, in the page's main part only:
//   - primary: filled (contained) buttons, the one thing the screen asks for;
//   - buttons: everything that can be tapped (buttons, links, summaries), an action inside
//     another counted once;
//   - words: words shown (Japanese: characters ÷ 2.5);
//   - moreDepth: how many "More"/"Technical details" levels deep the screen goes;
// plus how many screens and taps it takes from the landing page to sealing a first record, and
// any jargon shown on a default screen that the budget doesn't already list as there today.
// The landing page (site.home) and How it works (site.how) are measured too, with their heights on
// the phone (siteHomeHeight, howItWorksHeight).
// Against the stand-in registry; the network and the fee sponsor are refused.
// BUDGET_REPORT=<file> writes what was measured, for updating the budget by hand.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync, writeFileSync } from 'node:fs';
import { devices, expect, test, type Page, type Route } from '@playwright/test';
import { REAL_REGISTRY, expectNoErrors, isolate, json, watch, type Handler } from './helpers';
import { log as logEn } from '../src/i18n/app/en/log';
import { log as logDe } from '../src/i18n/app/de/log';
import { log as logEs } from '../src/i18n/app/es/log';
import { log as logFr } from '../src/i18n/app/fr/log';
import { log as logJa } from '../src/i18n/app/ja/log';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

type Lang = 'en' | 'de' | 'es' | 'fr' | 'ja';
type Measure = { primary: number; buttons: number; words: number; moreDepth: number; jargon: string[] };
type ScreenBudget = { primary: number; buttons: number; moreDepth: number; words: Record<Lang, number> };
type Budget = {
  screens: Record<string, ScreenBudget>;
  /** The landing page's height on an iPhone 14, in CSS pixels. */
  siteHomeHeight: number;
  firstSeal: { screens: number; taps: number };
  jargon: { terms: Record<Lang, string[]>; today: Record<string, Partial<Record<Lang, string[]>>> };
};

const budget = JSON.parse(readFileSync(new URL('../complexity-budget.json', import.meta.url), 'utf8')) as Budget;

const LANGS: { lang: Lang; locale: string; words: Record<string, string> }[] = [
  { lang: 'en', locale: 'en-US', words: logEn },
  { lang: 'de', locale: 'de-DE', words: logDe },
  { lang: 'es', locale: 'es-AR', words: logEs },
  { lang: 'fr', locale: 'fr-FR', words: logFr },
  { lang: 'ja', locale: 'ja-JP', words: logJa },
];

// iPhone 14's screen, touch and user agent, in the Chromium every other browser test uses.
const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices['iPhone 14'];
const iPhone14 = { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch };

// ---- the check page's record: the same real bytes easy-mode.spec.ts uses ------------------
const fixture = JSON.parse(
  readFileSync(new URL('../src/veilcore/chain/fixtures/anchor-indexer.json', import.meta.url), 'utf8'),
) as { fingerprint: string; proof: Record<string, unknown>; stateHex: string };
const CHECKED = `VEIL-${'5D'.repeat(16)}`;
const TX = 'e13c88f5a2fb38cf4feb08d7188d1c0dc3c575a4fb4dba3dbacb2f601896bcbf';
const CONTRACT = '00'.repeat(32);
const indexer = (route: Route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify({
      data: {
        byHash: [
          {
            hash: TX,
            block: { height: 2973563, timestamp: Date.UTC(2026, 9, 11, 14, 3, 7) },
            identifiers: ['ab'.repeat(32)],
            transactionResult: { status: 'SUCCESS' },
            contractActions: [{ address: CONTRACT, state: fixture.stateHex, entryPoint: 'anchorBatch' }],
          },
        ],
        byId: [],
      },
    }),
  });

type Row = Record<string, unknown> & { id: string };

/** The stand-in registry: a first-time holder's records, and one dated record for the check page. */
const standIn = async (page: Page) => {
  let rows: Row[] = [];
  const handlers: Record<string, Handler> = {
    'GET /api/records': (route) => json(route, 200, rows),
    'PUT /api/records/dating': (route, _url, body) => {
      for (const r of body as Row[]) if (!rows.some((x) => x.id === r.id)) rows.push({ ...r, bodyPending: true });
      return json(route, 200, { ok: true, dated: (body as Row[]).map((r) => r.id) });
    },
    'PUT /api/records': (route, _url, body) => {
      const ids = new Set((body as Row[]).map((r) => r.id));
      rows = [...(body as Row[]), ...rows.filter((r) => !ids.has(r.id))];
      return json(route, 200, { ok: true, count: ids.size, integrityCheckedBy: 'holder' });
    },
    'GET /api/licenses': (route) => json(route, 200, []),
    'PUT /api/licenses': (route) => json(route, 200, { ok: true }),
    'GET /api/disclosures': (route) => json(route, 200, []),
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
    'GET /verify/:record': (route) =>
      json(route, 200, {
        found: true,
        id: CHECKED,
        recordFingerprint: fixture.fingerprint,
        anchored: true,
        anchor: { network: 'preview', txHash: TX },
        disclosed: [],
      }),
    [`GET /proof/${fixture.fingerprint}`]: (route) =>
      json(route, 200, {
        ...fixture.proof,
        anchor: {
          chain: 'midnight',
          network: 'preview',
          contractAddress: CONTRACT,
          txHash: TX,
          anchoredAt: '2026-10-11T14:00:00.000Z',
        },
      }),
  };
  await isolate(page, handlers);
  await page.route('https://indexer.preview.midnight.network/**', indexer);
};

// ---- measuring ----------------------------------------------------------------------------

/** What the screen shows by default, before anything is opened: in `main`, or in a sheet over it. */
const measureDefault = (page: Page, lang: Lang, rootSelector: string) =>
  page.evaluate(
    ({ lang, terms, rootSelector }) => {
      const root = document.querySelector(rootSelector);
      if (!root) throw new Error(`no ${rootSelector} on this screen`);
      // On screen: rendered, not transparent, not folded away, and not hidden from people
      // (an outlined field's notch repeats its label, aria-hidden).
      const shown = (el: Element) => {
        if (el.closest('[aria-hidden="true"]')) return false;
        if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const ACTION = 'button, a[href], [role="button"], [role="link"], [role="tab"], summary';
      const actions = [...root.querySelectorAll(ACTION)]
        .filter(shown)
        // A button inside a tappable card is one thing to tap, not two.
        .filter((el) => {
          const outer = el.parentElement?.closest(ACTION);
          return !outer || !root.contains(outer);
        });
      const primary = actions.filter((el) => el.matches('.MuiButton-contained, .MuiFab-root')).length;
      // The words a person can see: text whose element is on screen.
      const parts: string[] = [];
      const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const el = n.parentElement;
        if (el && !el.closest('script, style') && shown(el)) parts.push(n.textContent ?? '');
      }
      const text = parts.join(' ');
      // Words: anything between spaces with a letter or digit in it. Japanese has no spaces, so
      // its characters are counted apart, 2.5 to a word. Plain counting, so the same text gives
      // the same number in every browser version.
      const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu;
      const cjk = (text.match(CJK) ?? []).length;
      const spaced = text
        .replace(CJK, ' ')
        .split(/\s+/)
        .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
      const words = spaced + Math.round(cjk / 2.5);
      // A term matches at the start of a word ("anchor" finds "anchored", never "re-anchor"
      // inside another word); Japanese has no spaces, so there it matches anywhere.
      const jargon = terms.filter((t) => {
        const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(lang === 'ja' ? escaped : `(?<![\\p{L}\\p{N}])${escaped}`, 'iu').test(text);
      });
      return { primary, buttons: actions.length, words, jargon, text };
    },
    { lang, terms: budget.jargon.terms[lang], rootSelector },
  );

/**
 * How many levels of "More" the screen has: open every closed disclosure (aria-expanded="false",
 * a closed <details>), then any that showed up inside those, and so on. Menus and pickers
 * (aria-haspopup, combobox) are not disclosures. Run after the default view is measured.
 */
const moreDepth = async (page: Page, rootSelector: string): Promise<number> => {
  const url = page.url();
  let depth = 0;
  for (let level = 0; level < 6; level++) {
    const opened = await page.evaluate((rootSelector) => {
      const root = document.querySelector(rootSelector)!;
      const shown = (el: Element) => {
        if (el.closest('[aria-hidden="true"]')) return false;
        if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const toggles = [
        ...root.querySelectorAll<HTMLElement>(
          '[aria-expanded="false"]:not([aria-haspopup]):not([role="combobox"]), details:not([open]) > summary',
        ),
      ].filter((el) => shown(el) && !el.hasAttribute('data-budget-opened'));
      for (const el of toggles) {
        el.setAttribute('data-budget-opened', '');
        el.click();
      }
      return toggles.length;
    }, rootSelector);
    if (!opened) break;
    depth++;
    await page.waitForTimeout(600);
    expect(page.url(), 'opening a disclosure must not leave the screen').toBe(url);
  }
  return depth;
};

const SCREENS: Record<string, Partial<Record<Lang, Measure>>> = {};
const TEXTS: Record<string, Partial<Record<Lang, string>>> = {};
const FIRST_SEAL: Partial<Record<Lang, { screens: number; taps: number }>> = {};
const HEIGHTS: Partial<Record<Lang, number>> = {};
const HOW_HEIGHTS: Partial<Record<Lang, number>> = {};

/** Measure one screen: its default view first, then how deep its "More"s go. */
const measure = async (page: Page, lang: Lang, screen: string, rootSelector: string) => {
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(800);
  const { text, ...m } = await measureDefault(page, lang, rootSelector);
  const result: Measure = { ...m, moreDepth: await moreDepth(page, rootSelector) };
  (SCREENS[screen] ??= {})[lang] = result;
  (TEXTS[screen] ??= {})[lang] = text;
  return result;
};

/** The measured numbers against the budget: a list of what went over (empty when within it). */
const overBudget = (screen: string, lang: Lang, m: Measure): string[] => {
  const b = budget.screens[screen];
  if (!b) return [`${screen}: not in complexity-budget.json`];
  const over: string[] = [];
  if (m.primary > b.primary) over.push(`${screen} (${lang}): ${m.primary} primary buttons, budget ${b.primary}`);
  if (m.buttons > b.buttons) over.push(`${screen} (${lang}): ${m.buttons} things to tap, budget ${b.buttons}`);
  if (m.words > b.words[lang]) over.push(`${screen} (${lang}): ${m.words} words, budget ${b.words[lang]}`);
  if (m.moreDepth > b.moreDepth) over.push(`${screen} (${lang}): ${m.moreDepth} levels of More, budget ${b.moreDepth}`);
  // Jargon already there today is reported, not failed, until it is removed; anything new fails.
  const known = budget.jargon.today[screen]?.[lang] ?? [];
  const fresh = m.jargon.filter((t) => !known.includes(t));
  if (fresh.length) over.push(`${screen} (${lang}): jargon on a default screen: ${fresh.join(', ')}`);
  const still = m.jargon.filter((t) => known.includes(t));
  if (still.length) console.log(`report only: ${screen} (${lang}) still shows ${still.join(', ')}`);
  const gone = known.filter((t) => !m.jargon.includes(t));
  if (gone.length) console.log(`gone from ${screen} (${lang}): ${gone.join(', ')}; take it off jargon.today`);
  return over;
};

/** A label or name that starts with these words (a required field adds " *"). */
const starting = (words: string) => new RegExp(`^${words.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);

// ---- the walk -----------------------------------------------------------------------------

for (const { lang, locale, words } of LANGS) {
  test.describe(`on an iPhone 14 in ${lang}`, () => {
    test.use({ ...iPhone14, locale });

    test(`the default screens stay within the complexity budget (${lang})`, async ({ page }) => {
      test.setTimeout(300_000);
      const errors = watch(page);
      await standIn(page);
      const over: string[] = [];
      const check = async (screen: string, rootSelector = 'main') =>
        over.push(...overBudget(screen, lang, await measure(page, lang, screen, rootSelector)));

      // A new device: Home with nothing on it, and the way to get records back.
      await page.goto('/records');
      await expect(page.locator('main h1')).toBeVisible();
      await check('home.empty');
      await page.goto('/restore');
      await expect(page.locator('main h1, main [data-screen-heading]').first()).toBeVisible();
      await check('restore');

      // From the landing page to a first sealed record, counting screens and taps. A sheet that
      // opens by itself on the way counts as a screen too.
      let screens = 1;
      let taps = 0;
      await page.goto('/');
      await expect(page.locator('h1').first()).toBeVisible();
      // The landing page itself (22 Nov 2026: it was about 25 phone screens), and how tall it is.
      // With reduced motion, so every section is shown at once rather than as it scrolls in (a
      // section still fading in would not be counted).
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      await expect(page.locator('h1').first()).toBeVisible();
      await check('site.home');
      const tall = await page.evaluate(() => document.documentElement.scrollHeight);
      if (tall > budget.siteHomeHeight)
        over.push(`site.home (${lang}): ${tall}px tall, budget ${budget.siteHomeHeight}px`);
      HEIGHTS[lang] = tall;
      // How it works carries what the landing page used to (review of #169): held too.
      await page.goto('/how-it-works');
      await expect(page.locator('h1').first()).toBeVisible();
      await check('site.how');
      const howTall = await page.evaluate(() => document.documentElement.scrollHeight);
      if (howTall > budget.howItWorksHeight)
        over.push(`site.how (${lang}): ${howTall}px tall, budget ${budget.howItWorksHeight}px`);
      HOW_HEIGHTS[lang] = howTall;
      await page.emulateMedia({ reducedMotion: null });
      await page.goto('/');
      await expect(page.locator('h1').first()).toBeVisible();
      const heading = page.locator('[data-screen-heading]').first();
      const nextScreen = async (before: string | null) => {
        if (before !== null) await expect(heading).not.toHaveText(before);
        await expect(heading).toBeVisible();
        screens++;
        await page.waitForTimeout(500);
        if (await page.getByRole('dialog').isVisible()) screens++;
      };
      const tap = async (target: ReturnType<Page['locator']>) => {
        const before = (await heading.count()) ? await heading.textContent() : null;
        await target.click();
        taps++;
        return before;
      };
      await tap(page.locator('main a[href="/new"]').first());
      await nextScreen(null);
      if (await page.locator('[data-start-choice]').isVisible()) {
        await check('seal.start');
        await nextScreen(await tap(page.locator('[data-start="plant"]')));
      }
      await check('seal.form');
      await page.getByRole('textbox', { name: starting(words['app.log.nameLabel']) }).fill('Budget plant (test data)');
      await page.getByRole('textbox', { name: starting(words['app.log.bredBy']) }).fill('E2E');
      await nextScreen(await tap(page.getByRole('button', { name: words['app.log.nextCheck'] })));
      await check('seal.review');
      // Sealing: the screen with the Seal button was the last one before the record is sealed.
      FIRST_SEAL[lang] = { screens, taps: taps + 1 };
      await tap(page.getByRole('button', { name: words['app.log.seal'] }));
      await expect(page.locator('[data-record-dated-next]').first()).toBeVisible({ timeout: 60_000 });
      if (screens > budget.firstSeal.screens)
        over.push(`${lang}: ${screens} screens to a first sealed record, budget ${budget.firstSeal.screens}`);
      if (taps > budget.firstSeal.taps)
        over.push(`${lang}: ${taps} taps to a first sealed record, budget ${budget.firstSeal.taps}`);
      // The screen that says it's sealed. The test build can't reach the network, so the key's
      // date stamp fails and waits to try again: measured in that state, the same every run.
      await expect(page.locator('[data-stamp-retry-in]')).toBeVisible({ timeout: 90_000 });
      await check('seal.sealed');

      const [recordId] = await page.evaluate(() =>
        Object.keys(JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as object),
      );
      expect(recordId).toMatch(/^VEIL-/);

      // Coming back: Home with the record on it, and the record's own page.
      await page.goto('/records');
      await expect(page.locator('main h1')).toBeVisible();
      await check('home.records');
      // Keeping records safe: the sheet Home's account line opens.
      const keepSafe = page.locator('[data-account-line] button').first();
      await expect(keepSafe).toBeVisible();
      await keepSafe.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await check('keepSafe', '[role="dialog"]');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await page.goto(`/record/${recordId}`);
      await expect(page.locator('main h1, main h2').first()).toBeVisible();
      await check('record');

      // A stranger's check page for a dated record.
      await page.goto(`/verify/${CHECKED}?fp=${fixture.fingerprint}`);
      await expect(page.locator('[data-verdict]')).toHaveAttribute('data-verdict', /.+/, { timeout: 30_000 });
      await check('check');

      report(lang);
      // Every budgeted screen was measured: a screen can't drop out of the budget unnoticed.
      for (const screen of Object.keys(budget.screens))
        if (!SCREENS[screen]?.[lang]) over.push(`${screen} (${lang}): in the budget but not measured`);
      expect(over, over.join('\n')).toEqual([]);
      expectNoErrors(errors);
    });
  });
}

/**
 * What this language measured: printed, and (with BUDGET_REPORT=<file>) added to that file with
 * the text each screen showed, so the budget can be read and updated by hand.
 */
const report = (lang: Lang) => {
  const mine = {
    screens: Object.fromEntries(Object.entries(SCREENS).map(([k, v]) => [k, v[lang]])),
    firstSeal: FIRST_SEAL[lang],
    siteHomeHeight: HEIGHTS[lang],
    howItWorksHeight: HOW_HEIGHTS[lang],
  };
  console.log(`complexity budget, measured (${lang}): ${JSON.stringify(mine)}`);
  const file = process.env.BUDGET_REPORT;
  if (!file) return;
  let all: Record<string, unknown> = {};
  try {
    all = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  } catch {
    // No report yet: this is the first language.
  }
  const texts = Object.fromEntries(Object.entries(TEXTS).map(([k, v]) => [k, v[lang]]));
  writeFileSync(file, JSON.stringify({ ...all, [lang]: { ...mine, texts } }, null, 2));
};
