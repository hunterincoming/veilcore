// An animal record's screens in an animal's words (translate.ts forKind, app/<lang>/animal.ts):
// every animal sentence stands for a plant sentence that exists, says the same with the same
// placeholders and tags, and never says "plant"; plant screens are unchanged.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { appEn } from './app/en';
import { appJa } from './app/ja';
import { appEs } from './app/es';
import { appDe } from './app/de';
import { appFr } from './app/fr';
import { enT, forKind, makeTranslator } from './translate';
import { dnaTieSentence, dnaTieRow } from '../veilcore/dna-tie';
import { DISCLOSURE_FIELDS, LEGACY_NAME, fieldsFor, labelOf } from '../veilcore/disclosure';

const EN = appEn as Record<string, string>;
const PREFIX = 'app.animal.v.';
const VARIANTS = Object.keys(EN).filter((k) => k.startsWith(PREFIX));
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const tags = (s: string) => [...s.matchAll(/<(\w+)>/g)].map((m) => m[1]).sort();

describe("an animal record's words", () => {
  it('every animal sentence stands for a plant sentence, with the same placeholders and tags', () => {
    expect(VARIANTS.length).toBeGreaterThan(80);
    for (const k of VARIANTS) {
      const base = k.slice(PREFIX.length);
      expect(EN[base], `${k} names ${base}`).toBeDefined();
      expect(placeholders(EN[k]), k).toEqual(placeholders(EN[base]));
      expect(tags(EN[k]), k).toEqual(tags(EN[base]));
    }
  });

  it('no animal sentence names a plant or a cultivar, in any language', () => {
    const PLANT: Record<string, RegExp> = {
      en: /\bplants?\b|cultivar/i,
      ja: /植物|品種名|育成者：/,
      es: /\bplantas?\b|cultivar/i,
      de: /pflanze|sorte/i,
      fr: /\bplantes?\b|cultivar/i,
    };
    const dicts: Record<string, Record<string, string>> = { en: EN, ja: appJa, es: appEs, de: appDe, fr: appFr };
    for (const [lang, dict] of Object.entries(dicts))
      for (const k of VARIANTS) expect(PLANT[lang].test(dict[k] ?? ''), `${lang} ${k}: ${dict[k]}`).toBe(false);
  });

  it('forKind picks the animal sentence where there is one, and the plant one otherwise', () => {
    const a = forKind(enT, 'animal');
    expect(a.t('app.plant.tie.tied')).toBe('Tied to the animal');
    expect(a.t('app.pair.title')).toBe('Save your DNA report to this animal');
    expect(a.t('app.plant.moreYouCanDo')).toBe(EN['app.plant.moreYouCanDo']); // no animal version: as before
    expect(forKind(enT, 'plant')).toBe(enT);
    expect(forKind(enT, 'animal')).toBe(a); // one translator per language, so screens don't redraw
    const ja = forKind(makeTranslator('ja', appJa), 'animal');
    expect(ja.t('app.plant.tie.tied')).toBe('動物に結び付いています');
  });

  it('the DNA tie says "Tied to the animal" for an animal and "Tied to the plant" for a plant', () => {
    const a = forKind(enT, 'animal');
    expect(dnaTieSentence({ state: 'self' }, { state: 'not-dated' }, 'holder', a)).toBe(
      'Tied to the animal: DNA report you saved (no lab signature matches it), not dated yet.',
    );
    expect(dnaTieSentence({ state: 'none' }, undefined, 'public', a)).toBe(
      'Not tied to the animal yet: no DNA report is saved to this record.',
    );
    expect(dnaTieRow({ state: 'none' }, { state: 'not-dated' }, {}, a).label).toBe('Not tied to the animal yet');
    expect(dnaTieSentence({ state: 'self' }, { state: 'not-dated' })).toMatch(/^Tied to the plant: /);
  });
});

describe('what a holder can share, by kind of record', () => {
  it('a plant shares a breeding method, an animal its individual ID instead', () => {
    const keys = (k: 'plant' | 'animal') => fieldsFor(k).map((f) => f.key);
    expect(keys('plant')).toContain('breeding-method');
    expect(keys('plant')).not.toContain('individual-id');
    expect(keys('animal')).toContain('individual-id');
    expect(keys('animal')).not.toContain('breeding-method');
    expect(keys('animal')).toContain('parent-names');
    // Off unless the holder turns it on, and named for the registry's `disclosed` list.
    expect(DISCLOSURE_FIELDS.find((f) => f.key === 'individual-id')?.def).toBe(false);
    expect(LEGACY_NAME['individual-id']).toBe('individualId');
  });

  it('for an animal, parent names read as its sire and dam', () => {
    expect(labelOf('parent-names', forKind(enT, 'animal'))).toBe('Sire and dam (names and IDs)');
    expect(labelOf('parent-names')).toBe('Parent cultivar names');
    expect(labelOf('individual-id')).toBe('Individual ID and its scheme');
  });
});
