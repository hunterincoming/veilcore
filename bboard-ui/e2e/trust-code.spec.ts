// What "we can't read your records" rests on, as a person sees it, in all five languages: on
// How it works, "What do you see of my data?" opens to say it holds for the website code we
// publish, with a link to check this site; the privacy note says it beside "Stored locked, we
// can't read it", and its link opens the check page. (The words themselves:
// src/components/site/trust-code.test.ts.)
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { expectNoErrors, isolate, watch } from './helpers';

const LANGS = ['en', 'de', 'es', 'fr', 'ja'] as const;

/**
 * One string from a language's catalog, read from its source: the catalogs read the build's
 * settings when imported, which a Playwright spec doesn't have.
 */
const word = (lang: string, key: string): string => {
  const src = readFileSync(new URL(`../src/i18n/${lang}.ts`, import.meta.url), 'utf8');
  const at = src.indexOf(`'${key}':`);
  if (at < 0) throw new Error(`${key} not in ${lang}.ts`);
  const m = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/.exec(src.slice(at + key.length + 3));
  if (!m) throw new Error(`${key} in ${lang}.ts is not a plain string`);
  return (m[1] ?? m[2]).replace(/\\(.)/g, '$1');
};

for (const lang of LANGS) {
  test(`says what "we can't read it" rests on, with a way to check (${lang})`, async ({ page }) => {
    const errors = watch(page);
    await isolate(page);
    const sentence = word(lang, 'm.trust.code');
    const checkTitle = word(lang, 'm.checksite.title');

    await page.goto(`/how-it-works?lang=${lang}`);
    await expect(page.locator('h1').first()).toBeVisible();
    const question = page.locator('details', { has: page.locator('summary', { hasText: word(lang, 'm.faq.4q') }) });
    // Folded away until opened.
    await expect(question.locator('[data-trust-code]')).toBeHidden();
    await question.locator('summary').click();
    await expect(question.locator('[data-trust-code]')).toHaveText(sentence);
    await expect(question.locator('a[href="/check-this-site"]')).toBeVisible();

    await page.goto(`/privacy?lang=${lang}`);
    const summary = page.locator('[data-privacy-summary]');
    await expect(summary.getByText(word(lang, 'm.privacy.sum.locked.t'))).toBeVisible();
    await expect(summary.locator('[data-trust-code]')).toHaveText(sentence);
    await summary.locator('a[href="/check-this-site"]').click();
    await expect(page).toHaveURL(/\/check-this-site/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(checkTitle);
    expectNoErrors(errors);
  });
}
