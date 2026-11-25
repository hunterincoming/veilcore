// Farmers' rights on licenses (summit, 25 Nov 2026): the Seed license counts seed sold, gifts only
// when the licensor ticks it; a fixed line on every plant license, sealed with the terms; tonne, hectare and acre only on Custom. And what was signed before
// keeps its meaning and its fingerprint.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { agreementRows, sealAgreement, type License, type LicenseTerms } from './licenses';
import {
  CUSTOM_ONLY_UNITS,
  UNITS_FOR,
  applyPreset,
  carriesFarmersRights,
  freeShareTerms,
  countsGifts,
  termsSentence,
  termsToSeal,
  unitDefinitionText,
  unitsFor,
  withFarmersRights,
  type RoyaltyRule,
  type RoyaltyUnit,
} from './royalty-terms';
import { emptyTermsFor } from '../components/licensing/LicenseTermsFields';
import { enT, makeTranslator, type Translator } from '../i18n/translate';
import { appDe } from '../i18n/app/de';
import { appEs } from '../i18n/app/es';
import { appFr } from '../i18n/app/fr';
import { appJa } from '../i18n/app/ja';

const LINE =
  'Nothing in this license takes away or limits a right the law gives farmers to save, re-sow, exchange or sell farm-saved seed or other propagating material, where the law gives it.';
const ctx = { kind: 'plant' as const, currency: 'USD', governingLaw: 'New Jersey' };
const TR: Record<string, Translator> = {
  en: enT,
  de: makeTranslator('de', appDe),
  es: makeTranslator('es', appEs),
  fr: makeTranslator('fr', appFr),
  ja: makeTranslator('ja', appJa),
};

/** A seed license as the form makes it: the preset, a licensee, an amount, a territory. */
const seedTerms = (tr: Translator = enT): LicenseTerms => {
  const t = applyPreset('seed', emptyTermsFor('license', 'plant'), { ...ctx, tr });
  return {
    ...t,
    licensee: 'Hillside Nursery',
    territory: 'New Jersey',
    royalty: { ...(t.royalty as Extract<RoyaltyRule, { kind: 'per-unit' }>), amount: '0.50' },
  };
};

describe('the Seed license preset counts seed sold', () => {
  it('fills a definition that counts packs sold, never gifts, in every language', () => {
    for (const [lang, tr] of Object.entries(TR)) {
      const r = seedTerms(tr).royalty;
      expect(r?.kind === 'per-unit' && r.unit).toBe('seed-pack');
      expect(r?.kind === 'per-unit' && r.unitDefinition).toBe(tr.t('app.roy.unitDef.seed-pack'));
      expect(countsGifts(r, tr), lang).toBe(false);
      expect(tr.t('app.roy.unitDef.seed-pack'), lang).not.toBe(tr.t('app.roy.unitDefGifts.seed-pack'));
    }
    expect(seedTerms().royalty).toMatchObject({ unitDefinition: 'Each pack of seed sold counts once.' });
    expect(enT.t('app.roy.p.seedHelp')).toBe('A fee for each pack of seed they sell.');
  });

  it('counts gifts only when the licensor ticks it, and the tick reads back from the definition', () => {
    for (const unit of ['seed-pack', 'seed-kg'] as const) {
      const gifts = unitDefinitionText(unit, enT, true);
      expect(gifts).toMatch(/sold or given away/);
      expect(unitDefinitionText(unit, enT)).not.toMatch(/given away/);
      expect(countsGifts({ kind: 'per-unit', amount: '1', unit, unitDefinition: gifts }, enT)).toBe(true);
      expect(countsGifts({ kind: 'per-unit', amount: '1', unit, unitDefinition: 'My own words' }, enT)).toBe(false);
    }
    // No gifts variant for other units: the tick isn't offered, the definition is the usual one.
    expect(unitDefinitionText('cutting', enT, true)).toBe(unitDefinitionText('cutting', enT));
  });

  it('is a way of filling the form: no preset id is in what gets sealed', () => {
    const sealed = termsToSeal(seedTerms());
    expect(JSON.stringify(sealed)).not.toMatch(/"preset"|"seed"/);
    expect(sealed.royalty).toEqual({
      kind: 'per-unit',
      amount: '0.50',
      unit: 'seed-pack',
      unitDefinition: 'Each pack of seed sold counts once.',
    });
  });
});

describe('the fixed farmers’-rights line', () => {
  it('is on every plant license with money in it, whatever the unit, and on no animal or strain', () => {
    const per = (unit: RoyaltyUnit) =>
      ({ ...seedTerms(), royalty: { kind: 'per-unit', amount: '1', unit } }) as LicenseTerms;
    for (const u of [
      'seed-pack',
      'seed-kg',
      'tonne',
      'hectare',
      'acre',
      'harvest',
      'cutting',
      'plant',
      'unit-sold',
    ] as const)
      expect(withFarmersRights(per(u)).farmersRights, u).toBe(LINE);
    const pct = { ...seedTerms(), royalty: { kind: 'percent', rate: '8', base: 'gross' } } as LicenseTerms;
    expect(withFarmersRights(pct).farmersRights).toBe(LINE);
    // A plant license's offspring royalty alone carries it too.
    const { royalty: _r, ...noRoyalty } = pct;
    void _r;
    expect(carriesFarmersRights({ ...noRoyalty, offspring: { rule: { kind: 'percent', rate: '2' } } })).toBe(true);
    // No money, no line; animals and strains have no farm-saved seed.
    expect(carriesFarmersRights(noRoyalty)).toBe(false);
    expect(withFarmersRights({ ...per('dose'), subject: 'animal' }).farmersRights).toBeUndefined();
    expect(withFarmersRights({ ...per('batch'), subject: 'strain' }).farmersRights).toBeUndefined();
  });

  it('can’t be kept, edited or removed by hand', () => {
    const edited = { ...seedTerms(), farmersRights: 'Farmers may not save seed.' };
    expect(withFarmersRights(edited).farmersRights).toBe(LINE);
    expect(termsToSeal(edited).farmersRights).toBe(LINE);
    // Terms with no money at all: a stale line is taken off, never sealed.
    const { royalty: _r, ...free } = edited;
    void _r;
    expect('farmersRights' in termsToSeal(free)).toBe(false);
    expect('farmersRights' in termsToSeal({ ...edited, subject: 'animal' })).toBe(false);
  });

  it('is sealed with the terms, in the licensor’s language, and shown from what was sealed', () => {
    for (const [lang, tr] of Object.entries(TR)) {
      const sealed = termsToSeal(seedTerms(tr), tr);
      expect(sealed.farmersRights, lang).toBe(tr.t('app.roy.s.farmersRights'));
      // The licensee reads what was sealed, whatever language their screen is in.
      expect(termsSentence(sealed, enT)).toContain(sealed.farmersRights!);
      const rows = agreementRows({ type: 'license', terms: sealed } as License, enT);
      expect(rows).toContainEqual({ k: 'Farmers’ rights', v: sealed.farmersRights });
    }
    expect(termsToSeal(seedTerms()).farmersRights).toBe(LINE);
  });

  it('says it in all five languages, every one a full sentence', () => {
    for (const [lang, tr] of Object.entries(TR)) {
      const line = tr.t('app.roy.s.farmersRights');
      expect(line, lang).not.toBe('app.roy.s.farmersRights');
      expect(line.length, lang).toBeGreaterThan(40);
      expect(line, lang).toMatch(/[.。]$/);
      if (lang !== 'en') expect(line, lang).not.toBe(LINE);
    }
  });
});

describe('a free breeder share', () => {
  it('drops the line and every money term, also when a paid plant share is renewed as free', () => {
    const paid = termsToSeal({
      ...emptyTermsFor('breeder-share', 'plant'),
      licensee: 'Another breeder',
      currency: 'USD',
      governingLaw: 'New Jersey',
      offspringRoyaltyPct: '2',
      offspring: { rule: { kind: 'percent', rate: '2', base: 'gross' } },
    });
    expect(paid.farmersRights).toBe(LINE);
    const free = freeShareTerms({ ...paid, offspringRoyaltyPct: '' });
    for (const k of ['farmersRights', 'offspring', 'currency', 'governingLaw', 'reporting', 'licensor'])
      expect(k in free, k).toBe(false);
    expect(free.licensee).toBe('Another breeder');
    expect(termsSentence(free, enT)).not.toContain(LINE);
    // A share that was always free keeps the shape it always had.
    const never = { ...emptyTermsFor('breeder-share', 'plant'), licensee: 'Another breeder' };
    expect(freeShareTerms(never)).toEqual(never);
  });
});

describe('tonne, hectare and acre: only on Custom', () => {
  it('leaves them out of every preset’s unit list, and offers them on Custom', () => {
    expect(UNITS_FOR.plant).toEqual(['cutting', 'plant', 'seed-pack', 'seed-kg']);
    for (const u of ['tonne', 'hectare', 'acre'] as const) {
      expect(UNITS_FOR.plant).not.toContain(u);
      expect(unitsFor('plant', 'seed')).not.toContain(u);
      expect(unitsFor('plant', 'clone')).not.toContain(u);
      expect(unitsFor('plant', undefined)).not.toContain(u);
      expect(unitsFor('plant', 'custom')).toContain(u);
    }
    expect(CUSTOM_ONLY_UNITS.animal).toEqual([]);
    expect(unitsFor('animal', 'custom')).toEqual(UNITS_FOR.animal);
  });
});

describe('what was signed before keeps its meaning', () => {
  // A seed license sealed before 25 Nov 2026: the preset then counted gifts, and there was no line.
  const before = (): LicenseTerms => {
    const { farmersRights: _f, ...t } = termsToSeal({
      ...seedTerms(),
      royalty: {
        kind: 'per-unit',
        amount: '0.50',
        unit: 'seed-pack',
        unitDefinition: 'Each pack of seed sold or given away counts once.',
      },
    });
    void _f;
    return t;
  };

  it('keeps its fingerprint: the terms as stored are what is hashed', async () => {
    const t = before();
    const salt = 'ab'.repeat(16);
    const made = await sealAgreement('license', t, 'cd'.repeat(32), salt);
    // Read back from storage (JSON), checked again today: the same fingerprint.
    const stored = JSON.parse(JSON.stringify(t)) as LicenseTerms;
    expect(await sealAgreement('license', stored, 'cd'.repeat(32), salt)).toEqual(made);
    expect('farmersRights' in stored).toBe(false);
  });

  it('matches a fixed fingerprint for an old-format seed license (catches a change to the hashing)', async () => {
    // Written out by hand as an agreement sealed before 25 Nov 2026 stores it: no farmersRights.
    const old: LicenseTerms = {
      licensee: 'Hillside Nursery',
      startDate: '2026-01-01',
      endDate: '2027-01-01',
      extraTerms: '',
      rights: 'cultivate+propagate',
      territory: 'New Jersey',
      royaltyType: 'flat',
      royaltyAmount: '0.5',
      unitBasis: 'per-unit-sold',
      sublicensable: false,
      exclusive: false,
      offspringRoyaltyPct: '',
      currency: 'USD',
      licensor: 'E2E breeder',
      royalty: {
        kind: 'per-unit',
        amount: '0.5',
        unit: 'seed-pack',
        unitDefinition: 'Each pack of seed sold or given away counts once.',
      },
      reporting: { every: 'quarter', reportDueDays: 30, paymentDueDays: 14 },
      bankFees: 'each-own',
      recordsYears: 3,
      checkNoticeDays: 30,
      governingLaw: 'New Jersey',
    };
    const { agreementFingerprint } = await sealAgreement('license', old, 'cd'.repeat(32), 'ab'.repeat(16));
    // SHA-256 over the canonical JSON of {v, type, terms, record, salt}; worked out apart from this
    // code too (Python, sorted keys, no spaces), so a change to the hashing itself fails here.
    expect(agreementFingerprint).toBe('dab1e9270bb54ddd9b2860e0fb05ceb7e7c04b019602c0a823f801c5ed206f08');
  });

  it('shows what it said, and nothing it didn’t: its own definition, and no farmers’ line', () => {
    const t = before();
    const words = termsSentence(t, enT);
    expect(words).toContain('Each pack of seed sold or given away counts once.');
    expect(words).not.toContain(LINE);
    const rows = agreementRows({ type: 'license', terms: t } as License, enT);
    expect(rows.find((r) => r.k === 'Farmers’ rights')).toBeUndefined();
  });

  it('a renewal is new terms: it gets the line', () => {
    expect(termsToSeal(before()).farmersRights).toBe(LINE);
  });
});
