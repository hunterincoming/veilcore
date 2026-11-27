// The checker's answer to "prove it by link", and the license check panel, in the record's own
// words: an animal record's "Confirmed" box never says "this plant's key" or "who bred the
// plant", and its license panel never says "licensed to grow" (mainnet run, 27 Nov 2026).
// A strain (microbe, cell line or insect line) is held to the same rule in all five languages,
// and any sentence with an animal version must have a strain version too, or a strain falls
// back to the plant's words (PR #239 review: a strain's share text said "this plant").
// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { appEn } from '../../i18n/app/en';
import { appDe } from '../../i18n/app/de';
import { appEs } from '../../i18n/app/es';
import { appFr } from '../../i18n/app/fr';
import { appJa } from '../../i18n/app/ja';
import { forKind, makeTranslator } from '../../i18n/translate';
import { keyStampWords } from '../../veilcore/prove-relay';
import { shareText } from './ProveWatch';

const DICTS = { en: appEn, de: appDe, es: appEs, fr: appFr, ja: appJa } as const;
type Lang = keyof typeof DICTS;
const PLANT: Record<Lang, RegExp> = {
  en: /\bplants?\b|cultivar|\bgrow\b/i,
  de: /pflanze|sorte|anzubauen/i,
  es: /\bplantas?\b|cultivar/i,
  fr: /\bplantes?\b|cultivar/i,
  ja: /植物|栽培/,
};
const ANIMAL: Record<Lang, RegExp> = {
  en: /animal/,
  de: /Tier/,
  es: /animal/,
  fr: /animal/,
  ja: /動物/,
};
const STRAIN: Record<Lang, RegExp> = {
  en: /strain/,
  de: /Linie/,
  es: /cepa/,
  fr: /souche/,
  ja: /系統/,
};
const WORDS = { animal: ANIMAL, strain: STRAIN } as const;
// Every sentence ProveWatch, SendLink, LicenseProofPanel and the asker's /prove page show that names the record.
const KEYS = [
  'app.prove.youAsked',
  'app.prove.watch.notWho',
  'app.prove.watch.holderStatement',
  'app.prove.watch.share',
  'app.prove.watch.shareAsker',
  'app.lic.proof.panelText',
] as const;
const SRC = path.resolve(__dirname, '../..');
const read = (f: string) => fs.readFileSync(path.join(SRC, f), 'utf8');

describe("prove by link, in an animal's and a strain's words", () => {
  for (const kind of ['animal', 'strain'] as const) {
    for (const lang of Object.keys(DICTS) as Lang[]) {
      it(`${lang}: the checker's answer and the license panel say "${kind}" for a ${kind}`, () => {
        const plant = makeTranslator(lang, DICTS[lang]);
        const kinded = forKind(plant, kind);
        const vars = { asker: 'A lab', link: 'https://veilcore.org/prove/PR-1#t=x' };
        for (const k of KEYS) {
          const a = kinded.t(k, vars);
          expect(a, `${kind} ${lang} ${k}`).not.toBe(plant.t(k, vars));
          expect(a, `${kind} ${lang} ${k}`).toMatch(WORDS[kind][lang]);
          expect(a, `${kind} ${lang} ${k}`).not.toMatch(PLANT[lang]);
        }
        // The key's date stamp line (keyStampWords), with and without a date.
        for (const at of [undefined, Date.UTC(2026, 10, 27)]) {
          const a = keyStampWords(true, at, kinded);
          expect(a, `${kind} ${lang} stamp ${at}`).toMatch(WORDS[kind][lang]);
          expect(a, `${kind} ${lang} stamp ${at}`).not.toMatch(PLANT[lang]);
        }
        // A plant's words are unchanged.
        expect(plant.t('app.prove.watch.notWho')).toBe(
          (DICTS[lang] as Record<string, string>)['app.prove.watch.notWho'],
        );
      });
    }
  }

  // A sentence that needed an animal version names the plant, so a strain needs its own too.
  // (Strain-only versions are fine: they replace breeding words that already fit an animal.)
  for (const lang of Object.keys(DICTS) as Lang[]) {
    it(`${lang}: every sentence with an animal version has a strain version`, () => {
      const dict = DICTS[lang] as Record<string, string>;
      const animalKeys = Object.keys(dict).filter((k) => k.startsWith('app.animal.v.'));
      expect(animalKeys.length).toBeGreaterThan(0);
      const missing = animalKeys
        .map((k) => k.slice('app.animal.v.'.length))
        .filter((k) => !(`app.strain.v.${k}` in dict));
      expect(missing, `${lang}: animal version but no strain version`).toEqual([]);
    });
  }

  it("the check page and the checker's own /prove page pass the record's kind through", () => {
    const watch = read('components/chain/ProveWatch.tsx');
    expect(watch).toMatch(/const tr = forKind\(useT\(\), kind\);/);
    expect(watch).toMatch(/<SendLink link=\{proveLink\(ask\.id, ask\.token\)\} asker=\{asker\} kind=\{kind\} \/>/);
    const panel = read('components/chain/VerifierChallengePanel.tsx');
    expect(panel).toMatch(/<ProveWatch ask=\{ask\} asker=\{asker\.trim\(\) \|\| undefined\} kind=\{kind\} \/>/);
    expect(panel).toMatch(/subject: kind/);
    const lic = read('components/licensing/LicenseProof.tsx');
    expect(lic).toMatch(/const tr = forKind\(useT\(\), kind\);/);
    const verify = read('pages/VerifyPage.tsx');
    expect(verify).toMatch(/kind=\{recordKind\}\s*\/>/);
    expect(verify).toMatch(
      /<LicenseProofPanel identity=\{linked\('chain'\) \?\? ''\} recordId=\{id\} kind=\{recordKind\} \/>/,
    );
    const prove = read('components/flow/ProvePage.tsx');
    expect(prove).toMatch(/<ProveWatch ask=\{mine\} kind=\{askedKind\} \/>/);
    expect(prove).toMatch(/askSubject\(mine\)/);
  });

  // The license link asks for a live license from the record, not for the record itself, so its
  // share text names no kind: before this, an animal's or a strain's license check sent "prove
  // you hold this plant" (PR #239 review, round 3).
  for (const lang of Object.keys(DICTS) as Lang[]) {
    it(`${lang}: the license link's share text names no plant, animal or strain, for any kind`, () => {
      const link = 'https://veilcore.org/prove-license/PR-1#t=x';
      const seen = new Set<string>();
      for (const kind of ['plant', 'animal', 'strain'] as const) {
        const tr = forKind(makeTranslator(lang, DICTS[lang]), kind);
        for (const asker of [undefined, 'A lab']) {
          const a = shareText(tr.t, link, asker, 'license');
          expect(a, `${lang} ${kind} ${asker}`).toContain(link);
          if (asker) expect(a, `${lang} ${kind} ${asker}`).toContain(asker);
          expect(a, `${lang} ${kind} ${asker}`).not.toMatch(PLANT[lang]);
          expect(a, `${lang} ${kind} ${asker}`).not.toMatch(ANIMAL[lang]);
          expect(a, `${lang} ${kind} ${asker}`).not.toMatch(STRAIN[lang]);
          expect(a, `${lang} ${kind} ${asker}`).not.toBe(shareText(tr.t, link, asker, 'record'));
          seen.add(`${asker ?? ''}|${a}`);
        }
      }
      // The same two sentences for every kind.
      expect(seen.size, lang).toBe(2);
      const dict = DICTS[lang] as Record<string, string>;
      for (const k of ['app.lic.proof.share', 'app.lic.proof.shareAsker']) {
        expect(dict[k], `${lang} ${k}`).toBeTruthy();
        expect(`app.animal.v.${k}` in dict, `${lang} ${k} has no animal version`).toBe(false);
        expect(`app.strain.v.${k}` in dict, `${lang} ${k} has no strain version`).toBe(false);
      }
    });
  }

  it('the license check sends the license sentence; the record link keeps its own', () => {
    const lic = read('components/licensing/LicenseProof.tsx');
    expect(lic).toMatch(
      /<SendLink link=\{proveLink\(ask\.id, ask\.token, 'license'\)\} asker=\{asker\} sentence="license" \/>/,
    );
    expect(lic.match(/<SendLink\b/g)?.length).toBe(1);
    const watch = read('components/chain/ProveWatch.tsx');
    expect(watch).toMatch(/const text = shareText\(t, link, asker, sentence\);/);
    expect(watch).toMatch(/sentence = 'record',/);
    // The record-prove link passes no sentence, so it stays 'record'.
    expect(watch).not.toMatch(/<SendLink[^>]*sentence=/);
  });
});
