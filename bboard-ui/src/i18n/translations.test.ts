// The record app's translations, and the switch that publishes a language.
//
//   - every app key is in all five languages (src/i18n/app/<lang>), with no extra keys, the
//     same {placeholders} and the same <tags> as the English, and a `.one` plural form in
//     every language whose plurals have one (Japanese has none);
//   - sentences that join the one before keep its leading space in Spanish, German and
//     French, and Japanese never puts a space between two Japanese words;
//   - no ownership words in any language: a record shows what you held, not what you own
//     (所有, Besitz/besitzen/Eigentum, posséder/propriété, poseer/propiedad/dueño);
//   - the English the app showed before translation is the English it shows now: the stage
//     questions are stage-notes.ts's own words, English numbers are String(n) and English
//     dates the browser's own format;
//   - the helpers: placeholders filled in one pass, plurals by the language's own rules,
//     rich() laying out tags and keeping text exactly;
//   - which languages each build offers and starts in, and that a language is published
//     only with a fluent speaker's sign-off in docs/translations/README.md.
// Run: npx vitest run src/i18n/translations.test.ts
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { appEn } from './app/en';
import { appJa } from './app/ja';
import { appEs } from './app/es';
import { appDe } from './app/de';
import { appFr } from './app/fr';
import { makeTranslator, fill, enT } from './translate';
import { rich } from './app';
import { LANGUAGE_CODES, PUBLISHED_LANGUAGES, type Lang } from '../config/languages';
import { publishedLanguages, offeredLanguages, initialLanguage } from './index';
import { STAGE_PROMPT, SELECTED_PROMPT, SEAL_EACH_STAGE } from '../components/stage/stage-notes';
import { CONSEQUENCE } from '../veilcore/corrections';
import { FIELD_LABELS } from '../veilcore/bulk-import';
import { DISCLOSURE_FIELDS, GENETICS_LABEL, labelOf } from '../veilcore/disclosure';
import { WITHDRAW_CORRECTION_WARNING } from '../veilcore/lab-results';

const here = path.dirname(fileURLToPath(import.meta.url));
const EN = appEn as Record<string, string>;
const TRANSLATIONS: Record<Exclude<Lang, 'en'>, Record<string, string>> = {
  ja: appJa,
  es: appEs,
  de: appDe,
  fr: appFr,
};

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const tags = (s: string) => [...s.matchAll(/<(\w+)>/g)].map((m) => m[1]).sort();
const pluralBase = (k: string) => /\.(one|other)$/.test(k);

describe('the record app in every language', () => {
  it('has English for every key, namespaced by screen', () => {
    const keys = Object.keys(EN);
    expect(keys.length).toBeGreaterThan(1000);
    for (const k of keys) {
      expect(k, k).toMatch(/^app\.[a-z]+\./);
      expect(EN[k], k).toBeTruthy();
    }
  });

  for (const [lang, dict] of Object.entries(TRANSLATIONS)) {
    describe(lang, () => {
      const hasOne = new Intl.PluralRules(lang).resolvedOptions().pluralCategories.includes('one');

      it('has every key, and no key the English lacks', () => {
        const missing = Object.keys(EN).filter((k) => {
          if (k.endsWith('.one') && !hasOne) return false;
          // Empty only where the English is only a space (Japanese joins with none).
          return dict[k] === undefined || (dict[k] === '' && EN[k].trim() !== '');
        });
        expect(missing).toEqual([]);
        expect(Object.keys(dict).filter((k) => !(k in EN))).toEqual([]);
        if (!hasOne) expect(Object.keys(dict).filter((k) => k.endsWith('.one'))).toEqual([]);
      });

      it('keeps every placeholder and tag', () => {
        for (const [k, v] of Object.entries(dict)) {
          const en = EN[k];
          if (pluralBase(k)) {
            // A plural form may say "one" in words or with {count}, as the language does.
            const strip = (xs: string[]) => xs.filter((x) => x !== 'count');
            const base = k.replace(/\.(one|other)$/, '');
            const enAll = new Set([
              ...placeholders(EN[`${base}.other`] ?? ''),
              ...placeholders(EN[`${base}.one`] ?? ''),
            ]);
            for (const p of strip(placeholders(v))) expect(enAll.has(p), `${lang} ${k}: {${p}}`).toBe(true);
            expect(strip(placeholders(v)).sort(), `${lang} ${k}`).toEqual(strip(placeholders(en)).sort());
          } else {
            expect(placeholders(v), `${lang} ${k}: ${v}`).toEqual(placeholders(en));
          }
          expect(tags(v), `${lang} ${k}: ${v}`).toEqual(tags(en));
        }
      });

      it('joins sentences the way the language does', () => {
        for (const [k, v] of Object.entries(dict)) {
          const en = EN[k];
          if (lang === 'ja') {
            // A leading space only before a " · " separator; never between Japanese words.
            if (v.startsWith(' ')) expect(v.startsWith(' · ') || v === ' ', `${lang} ${k}: ${v}`).toBe(true);
            expect(/[぀-ヿ㐀-鿿！-｠] +[぀-ヿ㐀-鿿！-｠]/.test(v), `${lang} ${k}: ${v}`).toBe(false);
          } else {
            // French sets a space before ; : ! ? (" ; " for "; ").
            const frSpace = lang === 'fr' && /^ [;:!?]/.test(v);
            if (!frSpace) expect(v.startsWith(' '), `${lang} ${k}: "${v}"`).toBe(en.startsWith(' '));
            expect(v.endsWith(' '), `${lang} ${k}: "${v}"`).toBe(en.endsWith(' '));
          }
        }
      });

      it('is really translated: Japanese has Japanese in every line, and little is left as the English', () => {
        const same = Object.entries(dict).filter(
          ([k, v]) => v === EN[k] && /[A-Za-z]{3}/.test(v.replace(/\{\w+\}|<\/?\w+>/g, '')),
        );
        if (lang === 'ja') {
          // Lines that are only placeholders, punctuation or names are fine as they are.
          const noJapanese = Object.entries(dict).filter(
            ([, v]) =>
              /[A-Za-z]{3}/.test(
                v.replace(
                  /\{\w+\}|<\/?\w+>|VeilCore|Midnight|SHA-256|OpenTimestamps|ID|KB|MB|https?:\S+|[\w.-]+\.(org|com|bin|ots|html|zip)\b|ots (verify|upgrade)|Harbour Mist|Example Lab|UTC|A2LA|PJLA|\?fp=/g,
                  '',
                ),
              ) && !/[぀-ヿ㐀-鿿]/.test(v),
          );
          expect(noJapanese).toEqual([]);
        }
        // Words that are the same in both languages (Notes, Photos, Laboratorio…) are few.
        expect(same.length, `${lang}: ${same.map(([k]) => k).join(', ')}`).toBeLessThan(Object.keys(EN).length / 50);
      });
    });
  }

  it('never uses an ownership word, in any language', () => {
    const OWN: Record<Lang, RegExp> = {
      // "own" only as in "its own key", never as a verb.
      en: /\b(owns|owned|owner|owners|ownership)\b|(?<!(\b(its|their|your|our|his|her|my|whose)|['’]s)\s)\bown\b/i,
      ja: /所有/,
      de: /besitz|eigentum|eigentümer/i,
      fr: /posséd|possed|propriét/i,
      es: /\bposee|\bposeer|\bposeí|propiedad|propietari|dueñ/i,
    };
    for (const [lang, dict] of [['en', EN], ...Object.entries(TRANSLATIONS)] as [Lang, Record<string, string>][])
      for (const [k, v] of Object.entries(dict)) expect(OWN[lang].test(v), `${lang} ${k}: ${v}`).toBe(false);
  });

  it('never says VeilCore vouches, or "track and trace"', () => {
    for (const dict of [EN, ...Object.values(TRANSLATIONS)])
      for (const [k, v] of Object.entries(dict)) {
        expect(/track and trace/i.test(v), k).toBe(false);
        expect(/VeilCore (vouches|guarantees|certifies)/i.test(v), k).toBe(false);
      }
  });
});

describe('the English is what the app said before', () => {
  it('asks the stage questions in stage-notes.ts’s own words', () => {
    expect(EN['app.log.stagePrompt']).toBe(STAGE_PROMPT);
    expect(EN['app.log.selectedPrompt']).toBe(SELECTED_PROMPT);
    expect(EN['app.log.sealEachStage']).toBe(SEAL_EACH_STAGE);
  });

  it('says a correction’s consequence and the shareable facts in their modules’ own words', () => {
    for (const [sev, words] of Object.entries(CONSEQUENCE))
      expect(EN[`app.plant.fix.c.${sev.replace('|', '.')}`], sev).toBe(words);
    for (const f of DISCLOSURE_FIELDS) expect(labelOf(f.key), f.key).toBe(f.label);
    expect(EN['app.verify.field.genetics']).toBe(GENETICS_LABEL);
    expect(EN['app.lab.out.correctionWarning']).toBe(WITHDRAW_CORRECTION_WARNING);
    for (const [k, words] of Object.entries(FIELD_LABELS)) expect(EN[`app.import.field.${k}`], k).toBe(words);
  });

  it('writes English numbers and dates as before', () => {
    expect(enT.locale).toBeUndefined();
    expect(enT.num(1234567)).toBe('1234567');
    const t = Date.UTC(2026, 9, 14, 12);
    expect(enT.date(t)).toBe(new Date(t).toLocaleDateString());
    expect(enT.date(t, { timeZone: 'UTC' })).toBe(new Date(t).toLocaleDateString(undefined, { timeZone: 'UTC' }));
  });

  it('writes other languages’ numbers and dates their own way', () => {
    const t = Date.UTC(2026, 9, 14, 12);
    const de = makeTranslator('de', appDe);
    expect(de.num(1234567)).toBe('1.234.567');
    expect(de.date(t, { timeZone: 'UTC' })).toBe('14.10.2026');
    const ja = makeTranslator('ja', appJa);
    expect(ja.date(t, { timeZone: 'UTC' })).toBe('2026/10/14');
  });
});

describe('the helpers', () => {
  it('fills placeholders in one pass, never reading a value as a placeholder', () => {
    expect(fill('Hi {name}, {n} left', { name: '{n}', n: 3 }, String)).toBe('Hi {n}, 3 left');
    expect(fill('Kept {missing}', {}, String)).toBe('Kept {missing}');
  });

  it('picks plurals by the language’s own rules, and falls back to English for a missing key', () => {
    expect(enT.tp('app.plant.reportsCameBack', 1)).toBe(EN['app.plant.reportsCameBack.one']);
    expect(enT.tp('app.plant.reportsCameBack', 2)).toBe('2 lab reports came back, locked so only you can open them.');
    const ja = makeTranslator('ja', appJa);
    expect(ja.tp('app.plant.reportsCameBack', 1)).toContain('1件');
    const fr = makeTranslator('fr', appFr);
    expect(fr.tp('app.plant.reportsCameBack', 0)).toBe(
      (appFr as Record<string, string>)['app.plant.reportsCameBack.one'],
    );
    const partial = makeTranslator('es', {});
    expect(partial.t('app.plant.open')).toBe('Open');
  });

  it('lays out tags and placeholders, keeping the text exactly', () => {
    const html = (nodes: React.ReactNode[]) =>
      renderToStaticMarkup(React.createElement(React.Fragment, null, ...nodes));
    const b = (c: React.ReactNode) => React.createElement('b', null, c);
    expect(html(rich('<b>Optional.</b> Add it  now.', { b }))).toBe('<b>Optional.</b> Add it  now.');
    expect(html(rich('Saved to <b>{name}</b> · {n}', { b }, { name: '<x>', n: 2 }))).toBe(
      'Saved to <b>&lt;x&gt;</b> · 2',
    );
    // User text in a placeholder is never parsed as a tag.
    expect(html(rich('{v}', { b }, { v: '<b>not bold</b>' }))).toBe('&lt;b&gt;not bold&lt;/b&gt;');
    // Nested tags, and an unclosed one kept as text.
    expect(html(rich('<b>a <b>b</b> c</b> <i>x', { b }))).toBe('<b>a <b>b</b> c</b> &lt;i&gt;x');
    // A tag with no renderer keeps its text.
    expect(html(rich('<link>See it</link>'))).toBe('See it');
  });
});

describe('only the language in use is downloaded', () => {
  const src = (f: string) => fs.readFileSync(path.resolve(here, f), 'utf8');
  it('the site fetches a language’s words when it is chosen, never in the first file', () => {
    // index.tsx is in the first file: it names the drafts only in dynamic imports.
    for (const f of ['index.tsx', '../main.tsx', '../App.tsx', 'lazy-picker.tsx']) {
      const code = src(f);
      expect(code, f).not.toMatch(/^import[^;]*from '\.\/(ja|es|de|fr)'/m);
      expect(code, f).not.toMatch(/^import[^;]*from '\.\/(i18n\/)?catalogs'/m);
      expect(code, f).not.toMatch(/^import[^;]*from '\.\/(i18n\/)?app\/(en|ja|es|de|fr)'/m);
    }
    expect(src('index.tsx')).toMatch(/import\('\.\/ja'\)/);
    expect(src('app.tsx')).toMatch(/import\('\.\/app\/ja'\)/);
  });

  it('names every language in the picker, and has words for each in catalogs.ts', async () => {
    const { LANGUAGE_NAMES } = await import('./index');
    const { LANGUAGES } = await import('./catalogs');
    expect(Object.keys(LANGUAGE_NAMES).sort()).toEqual([...LANGUAGE_CODES].sort());
    expect(Object.keys(LANGUAGES).sort()).toEqual([...LANGUAGE_CODES].sort());
  });
});

describe('which languages each build shows', () => {
  it('publishes only English until a language is switched on', () => {
    expect(publishedLanguages({ en: true, ja: false, es: false, de: false, fr: false })).toEqual(['en']);
    expect(publishedLanguages({ en: false, ja: true, es: false, de: false, fr: false })).toEqual(['en', 'ja']);
  });

  it('offers every language on the test site and the demo; on veilcore.org the published ones and the ready drafts', () => {
    expect(offeredLanguages({ isMainnet: false }, ['en'])).toEqual([...LANGUAGE_CODES]);
    expect(offeredLanguages({ isMainnet: true }, ['en'], [])).toEqual(['en']);
    expect(offeredLanguages({ isMainnet: true }, ['en', 'ja'], [])).toEqual(['en', 'ja']);
    // veilcore.org also offers the drafts whose mainnet wording is translated (Japanese).
    expect(offeredLanguages({ isMainnet: true }, ['en'])).toEqual(['en', 'ja']);
    expect(offeredLanguages({ isMainnet: true }, ['en'], ['fr', 'ja'])).toEqual(['en', 'ja', 'fr']);
  });

  it('veilcore.org offers a draft only if its mainnet wording is translated too', async () => {
    const { MAINNET_DRAFTS } = await import('../config/languages');
    const { LANGUAGES } = await import('./catalogs');
    for (const l of MAINNET_DRAFTS) expect(typeof (LANGUAGES[l] as { mainnet?: unknown }).mainnet, l).toBe('function');
  });

  it('starts in a ?lang= link, then a kept choice the picker still offers, then a published browser language', () => {
    expect(initialLanguage('?lang=ja', null, [], ['en'])).toBe('ja');
    expect(initialLanguage('', 'es', [], ['en'], ['en', 'es'])).toBe('es');
    expect(initialLanguage('', 'es', [], ['en'], ['en'])).toBe('en');
    expect(initialLanguage('', null, ['fr-CA'], ['en'], [...LANGUAGE_CODES])).toBe('en');
    expect(initialLanguage('', null, ['fr-CA'], ['en', 'fr'])).toBe('fr');
  });

  it('switches a language on only with a fluent speaker’s sign-off in docs/translations/README.md', () => {
    const readme = fs.readFileSync(path.resolve(here, '../../../docs/translations/README.md'), 'utf8');
    const signOff = readme.split(/^## Sign-off\s*$/m)[1]?.split(/^## /m)[0] ?? '';
    expect(signOff, 'README has a "## Sign-off" section').not.toBe('');
    for (const lang of LANGUAGE_CODES) {
      if (lang === 'en' || !PUBLISHED_LANGUAGES[lang]) continue;
      // | ja | site and app | Reviewer name | 2026-11-02 |
      const line = new RegExp(
        `^\\|\\s*${lang}\\s*\\|\\s*site and app\\s*\\|\\s*[^|\\s][^|]*\\|\\s*\\d{4}-\\d{2}-\\d{2}\\s*\\|`,
        'm',
      );
      expect(line.test(signOff), `${lang} is published without a sign-off line`).toBe(true);
    }
    expect(PUBLISHED_LANGUAGES.en).toBe(true);
  });
});
