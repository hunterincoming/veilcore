// "We can't read your records" is true only while the site's code is the code we publish
// (docs/SECURITY-REVIEW.md: "The website build is trusted"). Next to each place the site says it,
// one plain sentence says so, with a link to /check-this-site:
//
//   - /how-it-works, in "What do you see of my data?" (a fold: the page is at its word and tap
//     budget, so the sentence can't go beside the custody heading itself);
//   - the test site's privacy note, beside "Stored locked, we can't read it";
//   - veilcore.org's privacy policy, after "we don't have the key" in the short version.
//
// In all five languages, one sentence each, and never more than the check page can show (it
// can't prove a host sent everyone the same files).
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { en } from '../../i18n/en';
import { de } from '../../i18n/de';
import { es } from '../../i18n/es';
import { fr } from '../../i18n/fr';
import { ja } from '../../i18n/ja';
import { policyEn } from '../../i18n/privacy-policy/en';
import { policyDe } from '../../i18n/privacy-policy/de';
import { policyEs } from '../../i18n/privacy-policy/es';
import { policyFr } from '../../i18n/privacy-policy/fr';
import { policyJa } from '../../i18n/privacy-policy/ja';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const source = (f: string) => fs.readFileSync(path.join(HERE, f), 'utf8');

const SITE = { en, de, es, fr, ja } as Record<string, Record<string, string>>;
const POLICY = { en: policyEn, de: policyDe, es: policyEs, fr: policyFr, ja: policyJa } as Record<
  string,
  Record<string, string>
>;
/** The word for the site's code in each language: the sentence is about the code, not the data. */
const CODE_WORD: Record<string, RegExp> = {
  en: /\bcode\b/,
  de: /Code\b/,
  es: /\bcódigo\b/,
  fr: /\bcode\b/,
  ja: /コード/,
};

describe('what "we can\'t read it" rests on', () => {
  for (const lang of Object.keys(SITE))
    describe(lang, () => {
      const s = SITE[lang]['m.trust.code'];
      it('says it in one sentence about the published code', () => {
        expect(s, `${lang} m.trust.code`).toBeTruthy();
        expect(s).toMatch(CODE_WORD[lang]);
        // One sentence: one full stop, at the end.
        const stops = (s.match(/[.。](?=\s|$)/g) ?? []).length;
        expect(stops, s).toBe(1);
        expect(s.trim()).toMatch(/[.。]$/);
      });

      it('is translated, not English', () => {
        if (lang === 'en') return;
        expect(s).not.toBe(en['m.trust.code']);
        if (lang === 'ja') expect(/[぀-ヿ㐀-鿿]/.test(s)).toBe(true);
      });

      it('says the same in the privacy policy', () => {
        expect(POLICY[lang]['m.pp.short.code']).toBe(s);
      });

      it('promises no more than the check page shows', () => {
        // The check page: "It can't prove a host sent everyone the same files."
        expect(s).not.toMatch(/guarant|garant|prove|beweis|prueba|prouve|証明|everyone|alle |todos|tous/i);
      });
    });

  it('sits next to each claim, with a link to the check page', () => {
    const home = source('Home.tsx');
    const faq = home.slice(home.indexOf("t('m.faq.4a')"), home.indexOf("t('m.faq.6q')"));
    expect(faq).toContain("t('m.trust.code')");
    expect(faq).toContain('to="/check-this-site"');

    const note = source('Privacy.tsx');
    const locked = note.slice(note.indexOf("k === 'locked'"));
    expect(locked).toContain("t('m.trust.code')");
    expect(locked.slice(0, 400)).toContain('to="/check-this-site"');

    const policy = source('PrivacyPolicy.tsx');
    const short = policy.slice(policy.indexOf('n === 2 &&'));
    expect(short).toContain("k('m.pp.short.code')");
    expect(short.slice(0, 400)).toContain('to="/check-this-site"');
  });

  it('the claims it sits next to are still there', () => {
    expect(en['m.faq.4q']).toMatch(/what do you see of my data/i);
    expect(en['m.privacy.sum.locked.t']).toMatch(/can't read/);
    expect(policyEn['m.pp.short.2']).toMatch(/don’t have the key/);
  });
});
