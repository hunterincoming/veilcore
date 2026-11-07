// Panel review fixes on the license form and pages: the controlled-plant question and its
// warnings, the territory and governing law that must be named, the currency first guess, labels
// that never show a raw key, and the green chip only for a license live on Midnight.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { enT } from '../i18n/translate';
import { appEn } from '../i18n/app/en';
import { appDe } from '../i18n/app/de';
import { appEs } from '../i18n/app/es';
import { appFr } from '../i18n/app/fr';
import { appJa } from '../i18n/app/ja';
import {
  currencyForLocale,
  isCannabisRecord,
  isControlledTerms,
  lawForLocale,
  lawProblem,
  termsProblems,
  termsSentence,
  applyPreset,
} from './royalty-terms';
import { agreementRows, rightsLabel, type License, type LicenseTerms } from './licenses';
import { emptyTermsFor } from '../components/licensing/LicenseTermsFields';
import { LicenseStateChip } from '../components/licensing/LicenseStateChip';

describe('cannabis or another controlled plant', () => {
  it('the species only hints, in every language the panel named', () => {
    for (const taxon of [
      'Cannabis sativa',
      'hemp',
      'Marihuana',
      'C. sativa',
      'C.indica',
      '大麻',
      'Hanf',
      'chanvre',
      'cáñamo',
      'canamo',
      'ヘンプ',
    ])
      expect(isCannabisRecord({ profile: 'plant', taxon }), taxon).toBe(true);
    for (const taxon of ['Solanum lycopersicum', 'Humulus lupulus', 'flax', '亜麻', ''])
      expect(isCannabisRecord({ profile: 'plant', taxon }), taxon).toBe(false);
  });
  it('the licensor’s answer decides; old terms fall back to the hint; an animal never is one', () => {
    expect(isControlledTerms({ controlled: false }, { profile: 'plant', taxon: 'Cannabis' })).toBe(false);
    expect(isControlledTerms({ controlled: true }, { profile: 'plant', taxon: 'Tomato' })).toBe(true);
    expect(isControlledTerms({}, { profile: 'plant', taxon: 'Cannabis' })).toBe(true);
    expect(isControlledTerms({}, { profile: 'animal', taxon: '' })).toBe(false);
  });
  it('a license can’t be saved until the question is answered', () => {
    const t = { ...ready(), controlled: undefined };
    expect(termsProblems(t, { territoryRequired: true, controlledUnanswered: true })).toContain('controlled');
    expect(termsProblems(t, { territoryRequired: true, controlledUnanswered: false })).toEqual([]);
  });
  it('the warnings exist in every language and the enforceability line is no longer in the general note', () => {
    for (const k of [
      'app.lic.controlled.q',
      'app.lic.controlled.border',
      'app.lic.controlled.japan',
      'app.lic.controlled.regulator',
      'app.lic.controlled.courts',
      'app.lic.inv.revokeNote',
    ])
      for (const [lang, app] of Object.entries({ en: appEn, de: appDe, es: appEs, fr: appFr, ja: appJa }))
        expect((app as Record<string, string>)[k], `${lang} ${k}`).toBeTruthy();
    expect(appEn['app.lic.evidenceNote']).not.toMatch(/cannabis/i);
    expect(appEn['app.lic.controlled.japan']).toMatch(
      /In Japan, growing, selling or using cannabis without a license is a crime/,
    );
  });
});

/** A license ready to save, apart from what each test changes. */
const ready = (): LicenseTerms => ({
  ...applyPreset('clone', emptyTermsFor('license'), { kind: 'plant', currency: 'USD', governingLaw: 'New Jersey' }),
  licensee: 'A grower',
  territory: 'New Jersey',
  royalty: { kind: 'per-unit', amount: '2.50', unit: 'cutting', unitDefinition: 'x' },
});

describe('territory and governing law', () => {
  it('the territory is required on every license; there is no “any territory” default', () => {
    expect(termsProblems({ ...ready(), territory: '' }, { territoryRequired: true })).toContain('territory');
    expect(emptyTermsFor('license').territory).toBe('');
  });
  it('“United States” is not a governing law: a state is', () => {
    for (const law of [
      'United States',
      'USA',
      'U.S.',
      'the United States of America',
      'Canada',
      'Estados Unidos',
      'アメリカ合衆国',
    ])
      expect(lawProblem(law), law).toBe('lawState');
    for (const law of ['New Jersey', 'California, USA', 'Ontario', 'Germany', '日本'])
      expect(lawProblem(law), law).toBeUndefined();
    expect(lawProblem('')).toBe('law');
    expect(termsProblems({ ...ready(), governingLaw: 'United States' }, { territoryRequired: true })).toEqual([
      'lawState',
    ]);
  });
  it('no first guess for a federal country; a country elsewhere', () => {
    expect(lawForLocale('en-US')).toBe('');
    expect(lawForLocale('en-CA')).toBe('');
    expect(lawForLocale('en-AU')).toBe('');
    expect(lawForLocale('de-DE', 'en')).toBe('Germany');
  });
});

describe('currency first guess', () => {
  it('Latin-American Spanish is never euros', () => {
    for (const l of ['es-CL', 'es-PE', 'es-419', 'es-VE', 'es-US']) expect(currencyForLocale(l), l).not.toBe('EUR');
    expect(currencyForLocale('es-CL')).toBe('USD');
    expect(currencyForLocale('es-MX')).toBe('MXN');
    expect(currencyForLocale('es-ES')).toBe('EUR');
    expect(currencyForLocale('es')).toBe('EUR');
  });
});

describe('labels never show a raw key', () => {
  it('an unknown value from the other side reads “Other: <value>”', () => {
    expect(rightsLabel('grow-and-sell' as never, enT)).toBe('Other: grow-and-sell');
    const terms = { ...ready(), rights: 'grow-and-sell', bankFees: 'split-weird', unitBasis: 'gross-sales' } as never;
    const rows = agreementRows({ type: 'license', terms } as unknown as License, enT);
    expect(JSON.stringify(rows)).not.toMatch(/app\.(lic|roy)\./);
    expect(termsSentence(terms, enT)).not.toMatch(/app\.(lic|roy)\./);
    expect(termsSentence(terms, enT)).toContain('Other: grow-and-sell');
  });
});

describe('the green “active” chip', () => {
  const base = { id: 'LIC-1', type: 'license', recordId: 'R', state: 'active', royaltyLog: [], terms: ready() };
  const render = async (l: object): Promise<string> => {
    const { LanguageProvider } = await import('../i18n');
    vi.stubGlobal('window', {
      localStorage: { getItem: () => null, setItem: () => undefined },
      location: { search: '' },
    });
    try {
      return renderToStaticMarkup(
        React.createElement(LanguageProvider, null, React.createElement(LicenseStateChip, { license: l as License })),
      );
    } finally {
      vi.stubGlobal('window', undefined);
    }
  };
  afterEach(() => vi.unstubAllGlobals());
  it('only on a license live on Midnight', async () => {
    const off = await render({ ...base, breederSignedAt: 1 });
    expect(off).toContain('data-license-state="active-off-chain"');
    expect(off).toContain('Marked active here, not on Midnight');
    expect(off).not.toMatch(/MuiChip-colorSuccess/);
    const on = await render({
      ...base,
      breederSignedAt: 1,
      onChain: { activateTx: 'tx', inviteId: 'i', issuerToken: 't' },
    });
    expect(on).toContain('data-license-state="active"');
    expect(on).toMatch(/MuiChip-colorSuccess/);
  });
});
