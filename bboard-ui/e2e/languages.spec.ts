// Japanese, Spanish, German and French are switched on (config/languages.ts): a visitor whose
// phone or browser asks for one gets it on the first visit, with no draft banner, and the
// picker still offers all five. A ?lang= link and a language picked before both beat the
// browser's own language.
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';
import { expectNoErrors, isolate, json, watch, type Handler } from './helpers';

const LOCALES = [
  { locale: 'ja-JP', lang: 'ja', newHeading: '何を証明しますか？' },
  { locale: 'es-AR', lang: 'es', newHeading: '¿Qué quiere demostrar?' },
  { locale: 'de-DE', lang: 'de', newHeading: 'Was möchten Sie belegen?' },
  { locale: 'fr-FR', lang: 'fr', newHeading: 'Que voulez-vous prouver ?' },
] as const;

const EMPTY: Record<string, Handler> = {
  'GET /api/records': (route) => json(route, 200, []),
  'GET /api/licenses': (route) => json(route, 200, []),
  'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
};

for (const { locale, lang, newHeading } of LOCALES) {
  test.describe(`a phone set to ${locale}`, () => {
    test.use({ locale });

    test(`gets ${lang} on the first visit, with no draft banner, and the picker offers all five`, async ({ page }) => {
      const errors = watch(page);
      await isolate(page, EMPTY);
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page.locator('[data-language-picker]').first()).toBeVisible();
      await expect(page.locator('[data-draft-notice]')).toHaveCount(0);

      await page.goto('/new');
      await expect(page.getByRole('heading', { name: newHeading })).toBeVisible();
      await expect(page.locator('[data-draft-notice]')).toHaveCount(0);

      // The picker lists every language.
      await page.locator('[data-language-picker] [role="combobox"]').first().click();
      await expect(page.getByRole('option')).toHaveCount(5);
      await page.keyboard.press('Escape');
      expectNoErrors(errors);
    });
  });
}

test.describe('the browser language never overrides a choice', () => {
  test.use({ locale: 'ja-JP' });

  test('a ?lang= link wins, and a language picked before is kept', async ({ page }) => {
    const errors = watch(page);
    await isolate(page, EMPTY);
    await page.goto('/new?lang=en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { name: 'What do you want to prove?' })).toBeVisible();

    // Pick Español in the picker; a later visit with no link keeps it over the phone's Japanese.
    await page.locator('[data-language-picker] [role="combobox"]').first().click();
    await page.getByRole('option', { name: 'Español' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await page.goto('/new');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { name: '¿Qué quiere demostrar?' })).toBeVisible();
    expectNoErrors(errors);
  });
});
