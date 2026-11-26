// Condition 5 of docs/contract-v2.md 7, as the screens draw it: a date from a contract VeilCore
// is still testing (version 2 on mainnet, or any contract other than version 1) always carries
// the line "not for your records" as a warning, and never gets the gold DATED stamp, a green
// tick or verdict, or the "Make a record, free" box beside it. Version 1 stays as it was.
//
// The screens are drawn here (react-dom/server) with their look-ups stood in for, so a change
// that drops the line, presses gold or ticks green on any of them fails a test.
// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { makeTranslator, type Translator } from '../../i18n/translate';
import { appEn } from '../../i18n/app/en';
import { appDe } from '../../i18n/app/de';
import { appEs } from '../../i18n/app/es';
import { appFr } from '../../i18n/app/fr';
import { appJa } from '../../i18n/app/ja';
import type { AnchorCheck } from '../../veilcore/chain/anchor-check';
import type { ProofState } from '../../veilcore/proofs';
import type { DnaDate, DnaTie } from '../../veilcore/dna-tie';
import { color } from '../../config/tokens';

const LANGS: Record<string, Translator> = {
  en: makeTranslator('en', appEn),
  de: makeTranslator('de', appDe),
  es: makeTranslator('es', appEs),
  fr: makeTranslator('fr', appFr),
  ja: makeTranslator('ja', appJa),
};

/** What the stood-in look-ups answer, set by each test. */
const state: {
  tr: Translator;
  date: { proof: ProofState | 'checking'; anchor: AnchorCheck | 'checking' | undefined };
  instant: string[];
  dna: { tie: DnaTie | null; date: DnaDate };
  dating: unknown;
} = {
  tr: LANGS.en,
  date: { proof: 'checking', anchor: undefined },
  instant: [],
  dna: { tie: null, date: { state: 'not-dated' } },
  dating: undefined,
};

vi.mock('../../i18n/app', async (orig) => ({
  ...(await orig<typeof import('../../i18n/app')>()),
  useT: () => state.tr,
  useRecordT: () => state.tr,
}));
vi.mock('./useAnchorCheck', async (orig) => ({
  ...(await orig<typeof import('./useAnchorCheck')>()),
  useRecordDate: () => state.date,
}));
vi.mock('../../veilcore/instant-stamp', async (orig) => ({
  ...(await orig<typeof import('../../veilcore/instant-stamp')>()),
  useInstantStamp: () => undefined,
}));
vi.mock('../offline/offline-words', async (orig) => ({
  ...(await orig<typeof import('../offline/offline-words')>()),
  instantLinesHere: () => state.instant,
}));
vi.mock('../../offline/register', async (orig) => ({
  ...(await orig<typeof import('../../offline/register')>()),
  useOfflineState: () => ({ online: true }),
}));
vi.mock('../chain/useKeyStamp', async (orig) => ({
  ...(await orig<typeof import('../chain/useKeyStamp')>()),
  useStampRetries: () => ({}),
}));
vi.mock('../flow/dating-words', async (orig) => ({
  ...(await orig<typeof import('../flow/dating-words')>()),
  useAnchorCadence: () => undefined,
}));
vi.mock('../flow/useDnaTie', async (orig) => ({
  ...(await orig<typeof import('../flow/useDnaTie')>()),
  useDnaTie: () => state.dna,
}));
vi.mock('../../veilcore/records', async (orig) => ({
  ...(await orig<typeof import('../../veilcore/records')>()),
  proofCodeSent: () => true,
  waitsToBeSent: () => false,
  useRecords: () => [],
}));
// The lab report page's bundle button reads the sealed records store: not what is tested here.
vi.mock('../EvidenceBundle', () => ({ EvidenceBundle: () => null }));
vi.mock('../flow/FlowFrame', async (orig) => ({
  ...(await orig<typeof import('../flow/FlowFrame')>()),
  useSectionName: () => 'Section',
}));
vi.mock('../stage/lab-report-date', async (orig) => ({
  ...(await orig<typeof import('../stage/lab-report-date')>()),
  labReportFacts: () => undefined,
  datingRecordFor: () => state.dating,
}));

const { PlantStatus } = await import('../flow/PlantParts');
const { DocumentDateView } = await import('../document/DocumentParts');
const { DocumentCheck } = await import('../document/DocumentCheck');
const { ClaimCheck } = await import('../document/ClaimCheck');
const { DateLabReport } = await import('../stage/DateLabReport');
const { LabReportOverview } = await import('../stage/LabReportOverview');
const { documentVerdict, documentDateTesting } = await import('../document/document-verdict');
const { recordDateRow } = await import('../flow/plant-status-words');
const { dnaDateOf, dnaTieRow, dnaTieSentence } = await import('../../veilcore/dna-tie');
const { stillTesting, stampStateFor } = await import('./anchor-words');
const { Fact } = await import('./DisclosedFacts');

const TX = 'ab'.repeat(32);
const BLOCK = Date.UTC(2026, 10, 20, 9, 30);
const checkedOn = (version: string | undefined): AnchorCheck =>
  ({
    status: 'checked',
    txHash: TX,
    blockHeight: 4_100_000,
    blockTime: BLOCK,
    indexers: 2,
    ...(version ? { contract: { version, address: 'cd'.repeat(32) }, nameContract: version !== 'v1' } : {}),
  }) as AnchorCheck;
const V1 = checkedOn('v1');
const V2 = checkedOn('v2');
const proofOn = (network: string): ProofState =>
  ({
    status: 'anchor-reported',
    proof: {
      batchId: 'B-1',
      root: 'ef'.repeat(32),
      anchor: { network, txHash: TX, anchoredAt: '2026-11-20T09:29:00Z' },
    },
  }) as never;
const RECORD = {
  id: 'VEIL-TEST',
  strainName: 'Test plant',
  bredBy: 'me',
  dateCreated: '2026-11-01',
  notes: '',
  loggedAt: BLOCK - 60_000,
  recordFingerprint: '12'.repeat(32),
} as never;

const words = (tr: Translator) => tr.t('app.verify.anchor.v2Caution');
/** React's escaping of text, as the markup carries it. */
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const draw = (el: React.ReactElement, tr: Translator, date: typeof state.date) => {
  state.tr = tr;
  state.date = date;
  return renderToStaticMarkup(React.createElement(MemoryRouter, null, el));
};
/** One status row's markup, by its English id. */
const rowOf = (html: string, id: string) => {
  const at = html.indexOf(`data-status-row="${id}"`);
  expect(at, id).toBeGreaterThan(-1);
  const next = html.indexOf('data-status-row=', at + 20);
  return html.slice(at, next === -1 ? undefined : next);
};

describe('which dates are still in testing: only version 1 is public (fails closed)', () => {
  it('version 2, a later version, or a check that names no contract: still testing on mainnet', () => {
    for (const r of [V2, checkedOn('v3'), checkedOn(undefined)]) {
      expect(stillTesting(r, 'mainnet')).toBe(true);
      expect(stampStateFor(r, 'mainnet')).toBe('testing');
      expect(recordDateRow(proofOn('mainnet'), r).mark).toBe('testing');
    }
    expect(stillTesting(V1, 'mainnet')).toBe(false);
    expect(stampStateFor(V1, 'mainnet')).toBe('dated');
    expect(recordDateRow(proofOn('mainnet'), V1)).toEqual({
      mark: 'done',
      value: recordDateRow(proofOn('mainnet'), V1).value,
    });
    // Off mainnet every date is practice, its own warning already said.
    expect(stillTesting(V2, 'preprod')).toBe(false);
    expect(stampStateFor(V2, 'preprod')).toBe('practice');
  });
});

describe('the plant page: no gold stamp, no green tick, and the line always shown', () => {
  const plant = (tr: Translator, anchor: AnchorCheck) =>
    draw(React.createElement(PlantStatus, { record: RECORD }), tr, { proof: proofOn('mainnet'), anchor });

  it('a v2 date: TESTING stamp in the warning colour, ⚠ on the row, and the line, in all five languages', () => {
    state.instant = [];
    for (const [lang, tr] of Object.entries(LANGS)) {
      const html = plant(tr, V2);
      expect(html, lang).toContain('data-stamp="testing"');
      expect(html, lang).not.toContain('data-stamp="dated"');
      expect(html, lang).not.toContain(color.accent);
      const row = rowOf(html, 'Record dated');
      expect(row, lang).toContain('data-mark="testing"');
      expect(row, lang).toContain('data-v2-caution');
      expect(row, lang).toContain(esc(words(tr)));
      expect(row, lang).toContain(color.warn);
      // Never the green tick: MUI's success colour on the row's mark.
      expect(row, lang).not.toMatch(/colorSuccess/);
    }
  });

  it('the line stays beside the record’s own timestamp lines, never pushed out by them', () => {
    state.instant = ['Also stamped at 09:01 by a timestamp authority.'];
    const html = plant(LANGS.en, V2);
    const row = rowOf(html, 'Record dated');
    expect(row).toContain('Also stamped at 09:01 by a timestamp authority.');
    expect(row).toContain(esc(words(LANGS.en)));
    state.instant = [];
  });

  it('a v1 date: unchanged, gold DATED stamp, ✓ and no line', () => {
    const html = plant(LANGS.en, V1);
    expect(html).toContain('data-stamp="dated"');
    expect(html).toContain(color.accent);
    const row = rowOf(html, 'Record dated');
    expect(row).toContain('data-mark="done"');
    expect(row).toMatch(/colorSuccess/);
    expect(html).not.toContain('data-v2-caution');
  });

  it('the DNA report row: ⚠ and the line when its dating record is a v2 date, ✓ for v1', () => {
    for (const [lang, tr] of Object.entries(LANGS)) {
      // The dating record's own date row, as useDnaTie hands it over (dnaDateOf).
      const v2Date = dnaDateOf(true, recordDateRow(proofOn('mainnet'), V2, tr));
      expect(v2Date, lang).toMatchObject({ state: 'dated', caution: words(tr) });
      state.dna = { tie: { state: 'self' }, date: v2Date };
      const row = rowOf(plant(tr, V1), 'DNA report');
      expect(row, lang).toContain('data-mark="testing"');
      expect(row, lang).toContain(esc(words(tr)));
      expect(row, lang).not.toMatch(/colorSuccess/);
      // Every other place the tie is said (Home, the certificate) carries the line too.
      expect(dnaTieSentence({ state: 'self' }, v2Date, 'holder', tr), lang).toContain(words(tr));
      expect(dnaTieRow({ state: 'self' }, v2Date, {}, tr), lang).toMatchObject({ mark: 'testing', caution: words(tr) });
    }
    const v1Date = dnaDateOf(true, recordDateRow(proofOn('mainnet'), V1));
    expect(v1Date).toEqual({ state: 'dated', date: recordDateRow(proofOn('mainnet'), V1).value });
    state.dna = { tie: { state: 'self' }, date: v1Date };
    const row = rowOf(plant(LANGS.en, V1), 'DNA report');
    expect(row).toContain('data-mark="done"');
    expect(row).not.toContain('data-v2-caution');
    state.dna = { tie: null, date: { state: 'not-dated' } };
  });
});

describe('the document date, the document check and the claim check', () => {
  it('the document date view: the line as a warning beside a v2 date, none for v1', () => {
    for (const [lang, tr] of Object.entries(LANGS)) {
      const date = { proof: proofOn('mainnet'), anchor: V2 };
      const html = draw(React.createElement(DocumentDateView, { ...date, checker: true }), tr, date);
      expect(html, lang).toContain('data-v2-caution');
      expect(html, lang).toContain('MuiAlert-colorWarning');
      expect(html, lang).toContain(esc(words(tr)));
      expect(html, lang).not.toContain('data-document-not-dated');
    }
    const date = { proof: proofOn('mainnet'), anchor: V1 };
    const html = draw(React.createElement(DocumentDateView, { ...date, checker: true }), LANGS.en, date);
    expect(html).not.toContain('data-v2-caution');
  });

  it('the document check’s top line: never the green verdict beside a v2 date', () => {
    const read = { ok: true, fields: { files: [] }, fingerprint: '12'.repeat(32), chain: [] } as never;
    const v2 = { proof: proofOn('mainnet'), anchor: V2 };
    const v1 = { proof: proofOn('mainnet'), anchor: V1 };
    expect(documentDateTesting(v2)).toBe(true);
    expect(documentDateTesting(v1)).toBe(false);
    for (const picked of [null, true]) {
      expect(documentVerdict(read, v2, picked).tone).toBe('warn');
      expect(documentVerdict(read, v1, picked).tone).toBe('ok');
    }
  });

  it('no "Make a record, free" beside a v2 date on the document check or the claim check', () => {
    const v2 = { proof: proofOn('mainnet'), anchor: V2 };
    const v1 = { proof: proofOn('mainnet'), anchor: V1 };
    for (const page of [DocumentCheck, ClaimCheck]) {
      expect(draw(React.createElement(page), LANGS.en, v2), page.name).not.toContain('data-make-your-own');
      expect(draw(React.createElement(page), LANGS.en, v1), page.name).toContain('data-make-your-own');
    }
  });
});

describe('the check page’s and the plant panel’s dated line', () => {
  it('checked, beside a v2 date: the warning mark, never the green tick', () => {
    const fact = (testing: boolean) =>
      draw(React.createElement(Fact, { status: 'checked', testing, children: 'Dated' }), LANGS.en, state.date);
    expect(fact(true)).toContain(color.warn);
    expect(fact(true)).not.toContain(color.ok);
    expect(fact(true)).toContain('data-fact-testing');
    expect(fact(false)).toContain(color.ok);
  });
});

describe('the DNA report’s dated line and the lab report’s page', () => {
  const dating = { ...(RECORD as object), id: 'VEIL-DATING', recordFingerprint: '34'.repeat(32) } as never;
  // A DNA report saved to the plant: the record dating it is the stood-in `dating`.
  const SAVED = { kind: 'self', sha: '56'.repeat(32) } as never;

  it('"DNA report dated": the line as a warning beside a v2 date, none for v1', () => {
    state.dating = dating;
    for (const [lang, tr] of Object.entries(LANGS)) {
      const html = draw(React.createElement(DateLabReport, { record: RECORD, saved: SAVED }), tr, {
        proof: proofOn('mainnet'),
        anchor: V2,
      });
      expect(html, lang).toContain('data-lab-report-dated');
      expect(html, lang).toContain('data-v2-caution');
      expect(html, lang).toContain(esc(words(tr)));
    }
    const html = draw(React.createElement(DateLabReport, { record: RECORD, saved: SAVED }), LANGS.en, {
      proof: proofOn('mainnet'),
      anchor: V1,
    });
    expect(html).toContain('data-lab-report-dated');
    expect(html).not.toContain('data-v2-caution');
    state.dating = undefined;
  });

  it('the lab report record’s own page: the line beside a v2 date', () => {
    const props = { record: RECORD, onShare: () => undefined, onBackup: () => undefined };
    const v2 = draw(React.createElement(LabReportOverview, props), LANGS.en, { proof: proofOn('mainnet'), anchor: V2 });
    expect(v2).toContain(esc(words(LANGS.en)));
    const v1 = draw(React.createElement(LabReportOverview, props), LANGS.en, { proof: proofOn('mainnet'), anchor: V1 });
    expect(v1).not.toContain('data-v2-caution');
  });
});
