// A keyboard and a screen reader, in all five languages (accessibility review, 22 Nov): the
// first Tab reaches "Skip to main content", which is off screen until then and takes the
// focus to the page's <main>; the language picker has a name and a focus ring a person can
// see. And a failure is said in the page's language (i18n/error-words.ts), not in English.
// SHOT_DIR=<folder> saves a screenshot of each focused state, for looking at by hand.
// SPDX-License-Identifier: Apache-2.0
import { expect, test, type Page } from '@playwright/test';
import { expectNoErrors, isolate, json, watch, type Handler } from './helpers';
import { errors as errEn } from '../src/i18n/app/en/errors';
import { errors as errDe } from '../src/i18n/app/de/errors';
import { errors as errEs } from '../src/i18n/app/es/errors';
import { errors as errFr } from '../src/i18n/app/fr/errors';
import { errors as errJa } from '../src/i18n/app/ja/errors';

// The site's own words for these (src/i18n/<lang>.ts 'nav.skip', 'nav.language'): those files
// read the build's settings, which a test outside the browser doesn't have.
const LANGS = [
  { lang: 'en', site: { skip: 'Skip to main content', language: 'Language' }, err: errEn },
  { lang: 'de', site: { skip: 'Zum Hauptinhalt springen', language: 'Sprache' }, err: errDe },
  { lang: 'es', site: { skip: 'Ir al contenido principal', language: 'Idioma' }, err: errEs },
  { lang: 'fr', site: { skip: 'Aller au contenu principal', language: 'Langue' }, err: errFr },
  { lang: 'ja', site: { skip: '本文へ移動', language: '言語' }, err: errJa },
] as const;

const EMPTY: Record<string, Handler> = {
  'GET /api/records': (route) => json(route, 200, []),
  'GET /api/licenses': (route) => json(route, 200, []),
  'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
};

const shot = async (page: Page, name: string) => {
  const dir = process.env.SHOT_DIR;
  if (dir) await page.screenshot({ path: `${dir}/${name}.png` });
};

/** Tab until the focus is inside `selector`; how many presses it took. */
const tabTo = async (page: Page, selector: string): Promise<number> => {
  for (let n = 1; n <= 40; n++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate((s) => !!document.activeElement?.closest(s), selector)) return n;
  }
  throw new Error(`Tab never reached ${selector}`);
};

for (const { lang, site } of LANGS)
  for (const where of ['/', '/new'])
    test(`${lang} ${where}: skip link first, then a named picker with a visible focus ring`, async ({ page }) => {
      const errors = watch(page);
      await isolate(page, EMPTY);
      await page.goto(`${where}?lang=${lang}`);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      const picker = page.getByRole('combobox', { name: site.language });
      await expect(picker).toBeVisible();

      // Before any key: the skip link is off screen, and never part of the page's main part
      // (the complexity budget counts only <main>).
      const skip = page.locator('[data-skip-link]');
      await expect(skip).toHaveText(site.skip);
      expect((await skip.boundingBox())!.y + (await skip.boundingBox())!.height).toBeLessThanOrEqual(0);
      expect(await skip.evaluate((el) => !!el.closest('main'))).toBe(false);

      // The first Tab: the skip link shows, in the language.
      await page.keyboard.press('Tab');
      await expect(skip).toBeFocused();
      const box = (await skip.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.height).toBeGreaterThan(20);
      await shot(page, `skip-${lang}${where === '/' ? '-home' : '-new'}`);

      // The picker by keyboard: a ring a person can see.
      await tabTo(page, '[data-language-picker]');
      await expect(picker).toBeFocused();
      const ring = await picker.evaluate((el) => {
        const s = getComputedStyle(el);
        return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), shadow: s.boxShadow };
      });
      expect(ring.style !== 'none' && ring.width >= 2, JSON.stringify(ring)).toBe(true);
      await shot(page, `picker-${lang}${where === '/' ? '-home' : '-new'}`);

      // Enter on the skip link puts the focus on <main>.
      await skip.focus();
      await expect(skip).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('main').first()).toBeFocused();
      expectNoErrors(errors);
    });

for (const { lang, err } of LANGS)
  test(`${lang}: a spreadsheet kind the site can't read is refused in the language`, async ({ page }) => {
    const errors = watch(page);
    await isolate(page, EMPTY);
    await page.goto(`/records/import?lang=${lang}`);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: 'plants.xls',
        mimeType: 'application/vnd.ms-excel',
        buffer: Buffer.from('old excel'),
      });
    await expect(page.getByText(err['app.err.sheet.wrongKind'])).toBeVisible();
    if (lang !== 'en') await expect(page.getByText(errEn['app.err.sheet.wrongKind'])).toHaveCount(0);
    await shot(page, `error-${lang}`);
    expectNoErrors(errors);
  });
