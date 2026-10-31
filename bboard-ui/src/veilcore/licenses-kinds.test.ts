// Licenses on animal and strain records: each kind of record gets its own rights, royalty bases
// and words (licenses.ts RIGHTS_FOR, BASES_FOR; i18n forKind), and a plant's terms are exactly
// what they were before, so every plant agreement already made keeps its fingerprint.
// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  BASES_FOR,
  RIGHTS_FOR,
  agreementRows,
  basisLabel,
  rightsLabel,
  sealAgreement,
  subjectOf,
  type License,
  type LicenseTerms,
} from './licenses';
import {
  AgreementTermsFields,
  emptyTermsFor,
  rightOptionKey,
  basisOptionKey,
} from '../components/licensing/LicenseTermsFields';
import { appEn } from '../i18n/app/en';
import { appDe } from '../i18n/app/de';
import { appEs } from '../i18n/app/es';
import { appFr } from '../i18n/app/fr';
import { appJa } from '../i18n/app/ja';
import { enT } from '../i18n/translate';
import { LanguageProvider } from '../i18n';

const DICTS: Record<string, Record<string, string>> = {
  en: appEn,
  de: appDe,
  es: appEs,
  fr: appFr,
  ja: appJa,
};

const licenseOn = (terms: LicenseTerms): License => ({
  id: 'LIC-TEST',
  type: 'license',
  recordId: 'VEIL-TEST',
  recordFingerprint: 'f'.repeat(64),
  terms,
  agreementFingerprint: 'a'.repeat(64),
  state: 'draft',
  createdAt: 0,
  royaltyLog: [],
});

describe('licenses on every kind of record', () => {
  it("a plant's new terms carry no subject, so plant agreements are sealed as before", async () => {
    const t = emptyTermsFor('license');
    expect('subject' in t).toBe(false);
    expect(t.rights).toBe('cultivate');
    expect(t.unitBasis).toBe('per-unit-sold');
    expect(subjectOf(t)).toBe('plant');
    // Same terms, same salt, same record: same fingerprint as an agreement made before.
    const fixed = { ...t, startDate: '2026-01-01', endDate: '2027-01-01' };
    const a = await sealAgreement('license', fixed, 'f'.repeat(64), '0'.repeat(64));
    const b = await sealAgreement('license', { ...fixed }, 'f'.repeat(64), '0'.repeat(64));
    expect(a.agreementFingerprint).toBe(b.agreementFingerprint);
  });

  it('an animal or strain license seals what it is about with the terms', async () => {
    const animal = emptyTermsFor('license', 'animal');
    const strain = emptyTermsFor('license', 'strain');
    expect(animal.subject).toBe('animal');
    expect(strain.subject).toBe('strain');
    expect(animal.rights).toBe('breed');
    expect(animal.unitBasis).toBe('per-dose');
    expect(strain.rights).toBe('use');
    expect(strain.unitBasis).toBe('per-batch');
    // The subject is inside the fingerprint: swapping it changes the agreement.
    const a = await sealAgreement('license', animal, 'f'.repeat(64), '0'.repeat(64));
    const b = await sealAgreement('license', { ...animal, subject: 'strain' }, 'f'.repeat(64), '0'.repeat(64));
    expect(a.agreementFingerprint).not.toBe(b.agreementFingerprint);
  });

  it('every right and basis has its words, as a label and as a form option, in every language', () => {
    for (const [lang, d] of Object.entries(DICTS)) {
      for (const r of new Set(Object.values(RIGHTS_FOR).flat())) {
        expect(d[`app.lic.rights.${r}`], `${lang} app.lic.rights.${r}`).toBeTruthy();
        expect(d[rightOptionKey(r)], `${lang} ${rightOptionKey(r)}`).toBeTruthy();
      }
      for (const b of new Set(Object.values(BASES_FOR).flat())) {
        expect(d[`app.lic.basis.${b}`], `${lang} app.lic.basis.${b}`).toBeTruthy();
        expect(d[basisOptionKey(b)], `${lang} ${basisOptionKey(b)}`).toBeTruthy();
      }
    }
    expect(rightsLabel('breed+sell')).toBe('Breed, collect + sell');
    expect(basisLabel('per-offspring')).toBe('per offspring');
    // A value no kind lists (written by hand, or by a future version) is shown as saved.
    expect(basisLabel('per-acre')).toBe('per-acre');
  });

  it("each kind's form offers only its own rights and bases, in its own words", () => {
    const html = (kind: 'plant' | 'animal' | 'strain') => {
      // The language picker reads the page's address and storage: English, no ?lang=.
      const mem = new Map<string, string>();
      const localStorage = {
        getItem: (k: string) => mem.get(k) ?? null,
        setItem: (k: string, v: string) => void mem.set(k, v),
        removeItem: (k: string) => void mem.delete(k),
      };
      vi.stubGlobal('window', { localStorage, location: { search: '' } });
      try {
        return renderToStaticMarkup(
          React.createElement(
            LanguageProvider,
            null,
            React.createElement(AgreementTermsFields, {
              type: 'license',
              terms: emptyTermsFor('license', kind),
              set: () => undefined,
            }),
          ),
        );
      } finally {
        vi.stubGlobal('window', undefined);
      }
    };
    const animal = html('animal');
    expect(animal).toContain('sire or dam, both holders confirming');
    expect(animal).toContain('no resale of straws');
    expect(animal).not.toMatch(/cultivar|Cultivate/);
    const strain = html('strain');
    expect(strain).toContain('Royalty on derived strains (%)');
    expect(strain).toContain('Undeclared derivation is not detected');
    expect(strain).not.toMatch(/cultivar|Cultivate|offspring/i);
    const plant = html('plant');
    expect(plant).toContain('Royalty on offspring (%)');
  });

  it("the licensee's rows say what the record is about, without the record in their browser", () => {
    const rowsOf = (t: LicenseTerms) =>
      Object.fromEntries(
        agreementRows(licenseOn({ ...t, royaltyAmount: '5', offspringRoyaltyPct: '2' }), enT).map((r) => [r.k, r.v]),
      );
    const animal = rowsOf(emptyTermsFor('license', 'animal'));
    expect(animal['Rights granted'] ?? Object.values(animal).join(' ')).toContain('Breed only');
    expect(animal['Royalty on offspring']).toBe('2%, on offspring declared from this animal');
    const strain = rowsOf(emptyTermsFor('license', 'strain'));
    expect(strain['Royalty on derived strains']).toBe('2%, on strains declared as derived from this one');
    expect(Object.keys(strain).join(' ')).not.toMatch(/offspring/i);
    const plant = rowsOf(emptyTermsFor('license'));
    expect(plant['Royalty on offspring']).toMatch(/cultivar/);
  });
});
