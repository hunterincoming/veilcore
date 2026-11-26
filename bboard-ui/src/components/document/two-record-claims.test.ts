// "Compare two of your records" on a record's page, in all five languages (TwoRecordClaims.tsx,
// TwoClaimCheck.tsx): folded under "More ways to prove", only on the forms offered,
// what would be proved and what it doesn't show, the refusals, the button off while the sponsor
// doesn't pay, and the status line held to its flag: "built, not yet run on Midnight's main
// network" until config/copy.ts TWO_RECORD_CLAIMS_RUN_ON_MAINNET is turned on in a reviewed commit.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { makeTranslator, type Translator } from '../../i18n/translate';
import { appEn } from '../../i18n/app/en';
import { appDe } from '../../i18n/app/de';
import { appEs } from '../../i18n/app/es';
import { appFr } from '../../i18n/app/fr';
import { appJa } from '../../i18n/app/ja';
import { MATCH, POTENCY, potency, sealedNumbers } from '../../veilcore/two-record-test-records';
import { twoClaimLink, twoRecordStatusKey } from '../../veilcore/two-record-claims';

const LANGS = { en: appEn, de: appDe, es: appEs, fr: appFr, ja: appJa } as const;
type Lang = keyof typeof LANGS;
let current: Translator = makeTranslator('en', appEn);
vi.mock('../../i18n/app', async (actual) => ({
  ...(await actual<Record<string, unknown>>()),
  useT: () => current,
}));

const HERE = path.dirname(fileURLToPath(import.meta.url));
const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

const render = async (lang: Lang, el: React.ReactElement, url = '/') => {
  current = makeTranslator(lang, LANGS[lang]);
  const { LanguageProvider } = await import('../../i18n');
  vi.stubGlobal('window', {
    localStorage: { getItem: () => null, setItem: () => undefined },
    location: { search: '', origin: 'https://test.veilcore.org' },
  });
  try {
    return renderToStaticMarkup(
      React.createElement(LanguageProvider, null, React.createElement(MemoryRouter, { initialEntries: [url] }, el)),
    );
  } finally {
    vi.unstubAllGlobals();
  }
};

afterEach(() => vi.unstubAllGlobals());

const pair = async () => ({
  a: await sealedNumbers(POTENCY, potency(300n, 11400n)),
  b: await sealedNumbers(POTENCY, potency(210n, 11400n)),
});

describe('the status line, held to its flag', () => {
  const NOT_YET: Record<Lang, RegExp> = {
    en: /not yet run on Midnight’s main network/,
    de: /im Hauptnetz von Midnight noch nicht ausgeführt/,
    es: /aún no usado en la red principal de Midnight/,
    fr: /pas encore utilisé sur le réseau principal de Midnight/,
    ja: /メインネットワークではまだ実行していません/,
  };

  it('is off in the source: nothing says these have run on mainnet, and the sponsor doesn’t pay', () => {
    const copy = fs.readFileSync(path.join(HERE, '../../config/copy.ts'), 'utf8');
    expect(copy).toMatch(/export const TWO_RECORD_CLAIMS_RUN_ON_MAINNET = false;/);
    expect(copy).toMatch(/export const TWO_RECORD_CLAIMS_SPONSORED = false;/);
  });

  it('can’t say it has run on mainnet while the sponsor doesn’t pay for them', async () => {
    const { TWO_RECORD_CLAIMS_RUN_ON_MAINNET, TWO_RECORD_CLAIMS_SPONSORED } = await import('../../config/copy');
    if (TWO_RECORD_CLAIMS_RUN_ON_MAINNET) expect(TWO_RECORD_CLAIMS_SPONSORED).toBe(true);
  });

  it('flipping the flag changes the words, in every language; off, they say it hasn’t run', async () => {
    const { TwoRecordStatus } = await import('./TwoRecordParts');
    const { TWO_RECORD_CLAIMS_RUN_ON_MAINNET } = await import('../../config/copy');
    expect(twoRecordStatusKey(false)).not.toBe(twoRecordStatusKey(true));
    for (const lang of Object.keys(LANGS) as Lang[]) {
      const off = await render(lang, React.createElement(TwoRecordStatus, { ranOnMainnet: false }));
      const on = await render(lang, React.createElement(TwoRecordStatus, { ranOnMainnet: true }));
      const asBuilt = await render(lang, React.createElement(TwoRecordStatus));
      expect(off, lang).not.toBe(on);
      expect(off, lang).toMatch(NOT_YET[lang]);
      expect(on, lang).not.toMatch(NOT_YET[lang]);
      // The page uses the flag itself: as built, it says what the flag says.
      expect(asBuilt, lang).toBe(TWO_RECORD_CLAIMS_RUN_ON_MAINNET ? on : off);
    }
  });
});

describe('the way in, on a record’s page', () => {
  it('is folded under "More ways to prove": closed, nothing of the panel drawn until opened', async () => {
    const { TwoRecordWayIn } = await import('./TwoRecordClaims');
    const { a, b } = await pair();
    for (const lang of Object.keys(LANGS) as Lang[]) {
      const html = await render(lang, React.createElement(TwoRecordWayIn, { record: a, all: [a, b] }));
      const d = LANGS[lang] as Record<string, string>;
      expect(html, lang).toContain('data-two-way-in');
      expect(html, lang).toContain(escape(d['app.tworec.more.title']));
      // Folded: an accordion, closed until tapped, its panel not drawn.
      expect(html, lang).toContain('aria-expanded="false"');
      expect(html, lang).not.toContain('data-two-panel');
      expect(html, lang).not.toContain('data-two-go');
    }
  });

  it('opened: both claims as plain sentences, and the status line', async () => {
    const { TwoRecordWayIn } = await import('./TwoRecordClaims');
    const { a, b } = await pair();
    const { TWO_RECORD_CLAIMS_RUN_ON_MAINNET } = await import('../../config/copy');
    for (const lang of Object.keys(LANGS) as Lang[]) {
      const d = LANGS[lang] as Record<string, string>;
      const open = await render(
        lang,
        React.createElement(TwoRecordWayIn, { record: a, all: [a, b], initialOpen: true }),
      );
      expect(open, lang).toContain('aria-expanded="true"');
      expect(open, lang).toContain('data-two-link="distinct"');
      expect(open, lang).toContain(escape(d['app.tworec.more.distinct']));
      expect(open, lang).toContain(escape(d['app.tworec.more.unchanged']));
      expect(open, lang).toContain(
        escape(d[TWO_RECORD_CLAIMS_RUN_ON_MAINNET ? 'app.tworec.status.ran' : 'app.tworec.status.notYet']),
      );
      // A sentence picked: its panel.
      const picked = await render(
        lang,
        React.createElement(TwoRecordWayIn, { record: a, all: [a, b], initialKind: 'unchanged', ready: false }),
      );
      expect(picked, lang).toContain('data-two-panel="unchanged"');
    }
  });

  it('isn’t there on a lab’s result form, or for a record kept on this device only', async () => {
    const { TwoRecordWayIn } = await import('./TwoRecordClaims');
    const lab = await sealedNumbers(MATCH, [0n, 90n, 31n]);
    const local = await sealedNumbers(POTENCY, potency(1n, 1n), { deviceOnly: true });
    expect(await render('en', React.createElement(TwoRecordWayIn, { record: lab, all: [lab] }))).toBe('');
    expect(await render('en', React.createElement(TwoRecordWayIn, { record: local, all: [local] }))).toBe('');
  });

  it('isn’t there on a lab’s copy of its own result, open or not, nor its panel', async () => {
    const { TwoRecordWayIn, TwoRecordPanel } = await import('./TwoRecordClaims');
    const { a } = await pair();
    const copy = await sealedNumbers(POTENCY, potency(300n, 11400n), {
      copy: true,
      labSignature: { record: 'ab'.repeat(32), key: '6f'.repeat(64) },
    } as never);
    for (const props of [{}, { initialOpen: true }, { initialKind: 'distinct' as const, ready: true }])
      expect(await render('en', React.createElement(TwoRecordWayIn, { record: copy, all: [copy, a], ...props }))).toBe(
        '',
      );
    const panel = await render(
      'en',
      React.createElement(TwoRecordPanel, { record: copy, all: [copy, a], ready: true }),
    );
    expect(panel).toContain('data-two-not-offered');
    expect(panel).not.toContain('data-two-go');
  });
});

describe('the panel, in all five languages', () => {
  it('"different": what it proves, what it doesn’t show, and the button off while unpaid', async () => {
    const { TwoRecordPanel } = await import('./TwoRecordClaims');
    const { a, b } = await pair();
    for (const lang of Object.keys(LANGS) as Lang[]) {
      const d = LANGS[lang] as Record<string, string>;
      const html = await render(
        lang,
        React.createElement(TwoRecordPanel, { record: a, all: [a, b], initialKind: 'distinct', ready: false }),
      );
      expect(html, lang).toContain('data-two-preview');
      expect(html, lang).toContain(escape(d['app.tworec.preview.distinct'].replace('{k}', '1')));
      expect(html, lang).toContain('data-two-limits="distinct"');
      for (const k of [
        'app.tworec.not.examine',
        'app.tworec.not.which',
        'app.tworec.not.typed',
        'app.tworec.not.reference',
      ])
        expect(html, `${lang} ${k}`).toContain(escape(d[k]));
      expect(html, lang).toContain(escape(d['app.tworec.tie']));
      expect(html, lang).toContain('data-two-unpaid');
      expect(html, lang).toMatch(/data-two-go=""[^>]*disabled|disabled[^>]*data-two-go=""/);
      // The receipt names what goes public.
      expect(html, lang).toContain(escape(d['app.receipt.fact.otherCertificate']));
    }
  });

  it('"different": refused in the language for two records with the same compared numbers', async () => {
    const { TwoRecordPanel } = await import('./TwoRecordClaims');
    const a = await sealedNumbers(POTENCY, potency(210n, 11400n));
    const same = await sealedNumbers(POTENCY, potency(210n, 11400n));
    for (const lang of Object.keys(LANGS) as Lang[]) {
      const html = await render(
        lang,
        React.createElement(TwoRecordPanel, { record: a, all: [a, same], initialKind: 'distinct', ready: true }),
      );
      expect(html, lang).toContain('data-two-refusal="tooFew"');
      expect(html, lang).not.toContain('data-two-preview');
      expect(html, lang).toMatch(/data-two-go=""[^>]*disabled|disabled[^>]*data-two-go=""/);
    }
  });

  it('"correction": the changed number ticked and marked, the preview names it, limits said', async () => {
    const { TwoRecordPanel } = await import('./TwoRecordClaims');
    const { a, b } = await pair();
    for (const lang of Object.keys(LANGS) as Lang[]) {
      const d = LANGS[lang] as Record<string, string>;
      const html = await render(
        lang,
        React.createElement(TwoRecordPanel, { record: a, all: [a, b], initialKind: 'unchanged', ready: true }),
      );
      const thc = d['app.doc.slot.totalThc'];
      expect(html, lang).toContain('data-two-mask="0"');
      expect(html, lang).toContain(escape(d['app.tworec.unchanged.changed'].replace('{label}', thc)));
      expect(html, lang).toContain(escape(d['app.tworec.preview.unchanged'].replace('{list}', thc)));
      expect(html, lang).toContain('data-two-limits="unchanged"');
      expect(html, lang).toContain(escape(d['app.tworec.not.correction']));
      expect(html, lang).not.toContain('data-two-unpaid');
      expect(html, lang).not.toMatch(/data-two-go=""[^>]*disabled|disabled[^>]*data-two-go=""/);
    }
  });

  it('"correction": what earlier claims on the earlier record made public, and that it carries over', async () => {
    const { TwoRecordPanel } = await import('./TwoRecordClaims');
    const claim = (slot: number, bound: string) => ({
      kind: 'range' as const,
      contract: 'c1'.repeat(32),
      txId: String(slot).padStart(2, '0').repeat(32),
      record: 'ab'.repeat(32),
      schema: POTENCY,
      slot,
      op: 'at-most' as const,
      bound,
    });
    // On the earlier record: a claim on total THC (which changed, and is ticked) and on total CBD (left unticked).
    const original = await sealedNumbers(POTENCY, potency(210n, 11400n), {
      claims: [claim(0, '300'), claim(3, '12000')],
    });
    const corrected = await sealedNumbers(POTENCY, potency(300n, 11400n));
    for (const lang of Object.keys(LANGS) as Lang[]) {
      const d = LANGS[lang] as Record<string, string>;
      const html = await render(
        lang,
        React.createElement(TwoRecordPanel, {
          record: corrected,
          all: [corrected, original],
          initialKind: 'unchanged',
          ready: false,
        }),
      );
      // Only the one on an unticked number carries over.
      expect(html, lang).toContain('data-two-carries="1"');
      const lead = d['app.tworec.unchanged.carries'].split('{list}')[0];
      expect(html, lang).toContain(escape(lead));
      expect(html, lang).toContain(escape(d['app.doc.slot.totalCbd']));
      expect(html, lang).toContain('12');
    }
    // With nothing published about it before, nothing is said.
    const plain = await sealedNumbers(POTENCY, potency(210n, 11400n));
    const none = await render(
      'en',
      React.createElement(TwoRecordPanel, { record: corrected, all: [corrected, plain], initialKind: 'unchanged' }),
    );
    expect(none).not.toContain('data-two-carries');
  });

  it('with no other record under the form, or on a form not offered: says so', async () => {
    const { TwoRecordPanel } = await import('./TwoRecordClaims');
    const { a } = await pair();
    const lab = await sealedNumbers(MATCH, [0n, 90n, 31n]);
    for (const lang of Object.keys(LANGS) as Lang[]) {
      expect(await render(lang, React.createElement(TwoRecordPanel, { record: a, all: [a] })), lang).toContain(
        'data-two-none',
      );
      const off = await render(lang, React.createElement(TwoRecordPanel, { record: lab, all: [lab] }));
      expect(off, lang).toContain('data-two-not-offered');
      // The forms it does work for, by their names in the language.
      expect(off, lang).toContain(escape((LANGS[lang] as Record<string, string>)['app.doc.schema.potency']));
    }
  });
});

describe('the check page for a link about two records, in all five languages', () => {
  it('says the claim plainly, both records, and what it doesn’t show, before the chain answers', async () => {
    const { ClaimCheck } = await import('./ClaimCheck');
    const link = twoClaimLink(
      {
        kind: 'unchanged',
        contract: 'c1'.repeat(32),
        txId: 'ab'.repeat(32),
        record: '01'.repeat(32),
        other: '02'.repeat(32),
        schema: POTENCY,
        mayChange: [0],
      },
      '',
    );
    for (const lang of Object.keys(LANGS) as Lang[]) {
      const d = LANGS[lang] as Record<string, string>;
      const html = await render(lang, React.createElement(ClaimCheck), link);
      expect(html, lang).toContain('data-two-check="unchanged"');
      expect(html, lang).toContain(
        escape(d['app.tworec.check.unchanged'].replace('{list}', d['app.doc.slot.totalThc'])),
      );
      expect(html, lang).toContain(escape(d['app.tworec.check.earlier']));
      expect(html, lang).toContain(escape(d['app.tworec.check.correction']));
      expect(html, lang).toContain(escape(d['app.tworec.not.correction']));
      expect(html, lang).toContain(escape(d['app.tworec.not.typed']));
      // Not a fact until Midnight says so: still being read.
      expect(html, lang).not.toContain('data-claim-verdict="ok"');
    }
  });

  it('a link about one number still opens the one-number page', async () => {
    const { ClaimCheck } = await import('./ClaimCheck');
    const html = await render('en', React.createElement(ClaimCheck), '/check-claim#c=bad');
    expect(html).not.toContain('data-two-check');
    expect(html).toContain('data-claim-link="bad"');
  });
});

describe('the words, in every language', () => {
  it('every key exists in all five, and distinctness is named only as the examiner’s decision', () => {
    const VERDICT: Record<Lang, RegExp> = {
      en: /distinct|identity|unique|ownership/i,
      es: /distint|identidad|únic|propiedad/i,
      fr: /distinct|identité|unique|propriét/i,
      de: /unterscheidbar|identität|einzigartig|eigentum/i,
      ja: /区別|同一性|唯一|所有/,
    };
    const EXAMINER: Record<Lang, RegExp> = {
      en: /examining office/,
      es: /oficina examinadora/,
      fr: /office d’examen/,
      de: /Prüfstelle/,
      ja: /審査機関/,
    };
    const keys = Object.keys(appEn).filter((k) => k.startsWith('app.tworec.'));
    expect(keys.length).toBeGreaterThan(50);
    for (const lang of Object.keys(LANGS) as Lang[]) {
      const d = LANGS[lang] as Record<string, string>;
      for (const k of keys) {
        expect(d[k], `${lang} ${k}`).toBeTruthy();
        if (VERDICT[lang].test(d[k])) {
          expect(k, `${lang} ${k}: ${d[k]}`).toBe('app.tworec.not.examine');
          expect(d[k], `${lang} ${k}`).toMatch(EXAMINER[lang]);
        }
      }
    }
  });
});
