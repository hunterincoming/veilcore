// A strain or line record's screens in a strain's words (translate.ts forKind, app/<lang>/strain.ts):
// every strain sentence stands for a plant sentence that exists, says the same with the same
// placeholders and tags, and never says "plant"; and the form's words exist in every language.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { appEn } from './app/en';
import { appJa } from './app/ja';
import { appEs } from './app/es';
import { appDe } from './app/de';
import { appFr } from './app/fr';
import { enT, forKind } from './translate';
import { dnaTieSentence } from '../veilcore/dna-tie';
import { STRAIN_GROUPS } from '../veilcore/strain-profile';

const EN = appEn as Record<string, string>;
const PREFIX = 'app.strain.v.';
const VARIANTS = Object.keys(EN).filter((k) => k.startsWith(PREFIX));
const FORM = Object.keys(EN).filter((k) => k.startsWith('app.strain.') && !k.startsWith(PREFIX));
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const tags = (s: string) => [...s.matchAll(/<(\w+)>/g)].map((m) => m[1]).sort();
const DICTS: Record<string, Record<string, string>> = { en: EN, ja: appJa, es: appEs, de: appDe, fr: appFr };

describe("a strain record's words", () => {
  it('every strain sentence stands for a plant sentence, with the same placeholders and tags', () => {
    expect(VARIANTS.length).toBeGreaterThan(80);
    for (const k of VARIANTS) {
      const base = k.slice(PREFIX.length);
      expect(EN[base], `${k} names ${base}`).toBeDefined();
      expect(placeholders(EN[k]), k).toEqual(placeholders(EN[base]));
      expect(tags(EN[k]), k).toEqual(tags(EN[base]));
    }
  });

  it('no strain sentence names a plant, a cultivar, a variety or breeding, in any language', () => {
    // A strain is made or isolated, not bred (fix.bredBy says so).
    const PLANT: Record<string, RegExp> = {
      en: /\bplants?\b|cultivar|variety|\bbred\b|breeder/i,
      ja: /植物|品種|育成/,
      es: /\bplantas?\b|cultivar|variedad|criad/i,
      de: /pflanze|sorte|gezüchtet|züchter/i,
      fr: /\bplantes?\b|cultivar|variété|obtenteur/i,
    };
    for (const [lang, dict] of Object.entries(DICTS))
      for (const k of VARIANTS) expect(PLANT[lang].test(dict[k] ?? ''), `${lang} ${k}: ${dict[k]}`).toBe(false);
  });

  it('every form word is in every language, with the same placeholders', () => {
    for (const g of STRAIN_GROUPS) expect(EN[`app.strain.g.${g}`], g).toBeDefined();
    for (const [lang, dict] of Object.entries(DICTS))
      for (const k of FORM) {
        expect(dict[k], `${lang} ${k}`).toBeTruthy();
        expect(placeholders(dict[k]), `${lang} ${k}`).toEqual(placeholders(EN[k]));
      }
  });

  it('forKind picks the strain sentence where there is one', () => {
    const s = forKind(enT, 'strain');
    expect(s.t('app.plant.tie.tied')).toBe('Tied to the strain');
    expect(s).toBe(forKind(enT, 'strain'));
    expect(dnaTieSentence({ state: 'none' }, undefined, 'public', s)).toBe(
      'Not tied to the strain yet: no DNA report is saved to this record.',
    );
  });
});
