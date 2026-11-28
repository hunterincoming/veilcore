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
// The certificate's saved-report sentence words a lab's signature: not what is tested here.
vi.mock('../../veilcore/saved-report', async (orig) => ({
  ...(await orig<typeof import('../../veilcore/saved-report')>()),
  savedReportSentence: () => 'Lab report saved.',
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
const { stillTesting, stampStateFor, dateStillTesting, reportedStillTesting } = await import('./anchor-words');
const { V2Caution } = await import('./V2Caution');
const { MAINNET_PINNED } = await import('../../../../api/src/pinned-contracts');
const { Fact } = await import('./DisclosedFacts');
const { TieLine, DocumentDateLine } = await import('../flow/AppHome');
const { CertificateDnaTie } = await import('../wizard/Step3Certificate');
const { claimVerdict } = await import('./verdict');
const { paper } = await import('../../config/tokens');
const { DeletedRecord, CheckPageInvite, useDeletedRecordDate } = await import('../../pages/VerifyPage');

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
      batchId: 'B-20261015-0001',
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
      draw(
        React.createElement(Fact, { status: 'checked', testing } as React.ComponentProps<typeof Fact>, 'Dated'),
        LANGS.en,
        state.date,
      );
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
    // Shown under "Record dated", not only in the copy folded under "Technical details".
    const fold = v2.indexOf('id="record-technical-details"');
    expect(fold).toBeGreaterThan(-1);
    expect(v2.slice(0, fold)).toContain('data-v2-caution');
    expect(v2.slice(0, fold)).toContain(esc(words(LANGS.en)));
    const v1 = draw(React.createElement(LabReportOverview, props), LANGS.en, { proof: proofOn('mainnet'), anchor: V1 });
    expect(v1).not.toContain('data-v2-caution');
  });
});

describe('Home and the certificate', () => {
  /** A v2-dated DNA report's date, as useDnaTie hands it over, in the given language. */
  const v2DnaDate = (tr: Translator) => dnaDateOf(true, recordDateRow(proofOn('mainnet'), V2, tr));
  const v1DnaDate = () => dnaDateOf(true, recordDateRow(proofOn('mainnet'), V1));
  /** The CSS emotion writes just before the element that carries data-v2-caution (its colour). */
  const styleOfCaution = (html: string) => {
    const at = html.indexOf('data-v2-caution');
    expect(at).toBeGreaterThan(-1);
    return html.slice(html.lastIndexOf('<style', at), at);
  };

  it('Home’s document row: the line in the warning colour beside a v2 date, in all five languages', () => {
    for (const [lang, tr] of Object.entries(LANGS)) {
      const html = draw(React.createElement(DocumentDateLine, { fingerprint: '12'.repeat(32), loggedAt: BLOCK }), tr, {
        proof: proofOn('mainnet'),
        anchor: V2,
      });
      expect(html, lang).toContain('data-home-document-date="testing"');
      expect(styleOfCaution(html), lang).toContain(color.warn);
      expect(html, lang).toContain(esc(words(tr)));
    }
    const v1 = draw(
      React.createElement(DocumentDateLine, { fingerprint: '12'.repeat(32), loggedAt: BLOCK }),
      LANGS.en,
      {
        proof: proofOn('mainnet'),
        anchor: V1,
      },
    );
    expect(v1).toContain('data-home-document-date="dated"');
    expect(v1).not.toContain('data-v2-caution');
  });

  it('Home’s plant tie line: the line in the warning colour, not grey, beside a v2 DNA report date', () => {
    for (const [lang, tr] of Object.entries(LANGS)) {
      state.dna = { tie: { state: 'self' }, date: v2DnaDate(tr) };
      const html = draw(React.createElement(TieLine, { record: RECORD }), tr, state.date);
      expect(styleOfCaution(html), lang).toContain(color.warn);
      expect(html.slice(html.indexOf('data-v2-caution')), lang).toContain(esc(words(tr)));
    }
    state.dna = { tie: { state: 'self' }, date: v1DnaDate() };
    expect(draw(React.createElement(TieLine, { record: RECORD }), LANGS.en, state.date)).not.toContain(
      'data-v2-caution',
    );
    state.dna = { tie: null, date: { state: 'not-dated' } };
  });

  it('the certificate: no ✓ and no green beside a v2 DNA report date, the line in the warning colour', () => {
    const en = LANGS.en;
    const record = { ...(RECORD as object), dnaFingerprint: '78'.repeat(32) } as never;
    const saved = { kind: 'lab', sha: '56'.repeat(32) } as never;
    const cert = (date: DnaDate) =>
      renderToStaticMarkup(
        React.createElement(CertificateDnaTie, {
          record,
          saved,
          dna: { tie: { state: 'lab', lead: 'signed by a lab' }, date },
          en,
        }),
      );
    const v2 = cert(v2DnaDate(en));
    expect(v2).not.toContain('✓');
    expect(v2).not.toContain(paper.ok);
    expect(styleOfCaution(v2)).toContain(paper.warn);
    expect(v2.slice(v2.indexOf('data-v2-caution'))).toContain(esc(words(en)));
    // Version 1 is unchanged: the lab's report is a ✓ in the quiet green.
    const v1 = cert(v1DnaDate());
    expect(v1).toContain('✓');
    expect(v1).toContain(paper.ok);
    expect(v1).not.toContain('data-v2-caution');
  });

  it('the claim check’s top line: never green when the record’s date is a v2 date', () => {
    const ok = { ok: true, blockTime: BLOCK } as never;
    expect(claimVerdict({ readable: true, off: false, verdict: ok, more: [], stillTesting: true })?.tone).toBe('warn');
    expect(claimVerdict({ readable: true, off: false, verdict: ok, more: [], stillTesting: false })?.tone).toBe('ok');
  });
});

describe('the check page for a deleted record', () => {
  const fp = '12'.repeat(32);
  /**
   * The deleted-record check page as VerifyPage puts it together: its card, with the date the
   * page looked up (useDeletedRecordDate), and the page's foot invite, which sees that date and
   * the record's own (none for a deleted record: the page has no proof of it).
   */
  const DeletedPage: React.FC = () => {
    const date = useDeletedRecordDate(fp, fp);
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(DeletedRecord, { id: 'VEIL-TEST', anchored: true, fp, storedFp: fp, date }),
      React.createElement(CheckPageInvite, {
        loading: false,
        dates: [
          { check: undefined, network: 'preprod' },
          { check: date.anchor, network: date.network },
        ],
      }),
    );
  };

  it('a v2 date: the line as a warning, and no "Make a record, free" box', () => {
    for (const [lang, tr] of Object.entries(LANGS)) {
      const html = draw(React.createElement(DeletedPage), tr, { proof: proofOn('mainnet'), anchor: V2 });
      expect(html, lang).toContain('data-deleted-record');
      expect(html, lang).toContain('data-v2-caution');
      expect(html, lang).toContain('MuiAlert-colorWarning');
      expect(html, lang).toContain(esc(words(tr)));
      expect(html, lang).not.toContain('data-make-your-own');
    }
  });

  it('a v1 date: unchanged, no line and the box', () => {
    const v1 = draw(React.createElement(DeletedPage), LANGS.en, { proof: proofOn('mainnet'), anchor: V1 });
    expect(v1).not.toContain('data-v2-caution');
    expect(v1).toContain('data-make-your-own');
  });

  it('the foot invite: hidden while loading or beside any date still in testing, fails closed', () => {
    const invite = (dates: { check: AnchorCheck | undefined; network: string }[], loading = false) =>
      draw(React.createElement(CheckPageInvite, { loading, dates }), LANGS.en, state.date);
    expect(invite([{ check: V1, network: 'mainnet' }])).toContain('data-make-your-own');
    expect(invite([{ check: V1, network: 'mainnet' }], true)).toBe('');
    for (const r of [V2, checkedOn('v3'), checkedOn(undefined)]) {
      expect(invite([{ check: r, network: 'mainnet' }])).toBe('');
      expect(
        invite([
          { check: V1, network: 'mainnet' },
          { check: r, network: 'mainnet' },
        ]),
      ).toBe('');
      expect(
        invite([
          { check: undefined, network: 'mainnet' },
          { check: r, network: 'mainnet' },
        ]),
      ).toBe('');
    }
  });
});

describe('a date no indexer confirmed: the contract the registry’s report names decides (fails closed)', () => {
  const main = (v: string) => MAINNET_PINNED.find((e) => e.kind === 'veilcore' && e.version === v)!.address;
  const claims = MAINNET_PINNED.find((e) => e.kind === 'claims' && e.version === 'v1')!.address;
  const V1_ADDR = main('v1');
  const V2_ADDR = main('v2');
  const UNREACHABLE = { status: 'unreachable', reason: 'no indexer answered' } as AnchorCheck;
  const NOT_CHECKED = { status: 'not-checked', why: 'not-configured', reason: 'none' } as AnchorCheck;
  const FAILED = { status: 'failed', reason: 'not that root' } as AnchorCheck;
  /** The registry's proof, its anchor naming a contract (or none). */
  const proofNaming = (network: string, contractAddress?: string): ProofState =>
    ({
      status: 'anchor-reported',
      proof: {
        batchId: 'B-20261015-0001',
        root: 'ef'.repeat(32),
        anchor: {
          network,
          txHash: TX,
          anchoredAt: '2026-11-20T09:29:00Z',
          ...(contractAddress ? { contractAddress } : {}),
        },
      },
    }) as never;

  it('version 1 as the live registry reports it is not flagged; anything else on mainnet is', () => {
    // Every mainnet anchor the registry had recorded by 26 Nov 2026 names the v1 main contract,
    // in lowercase hex without 0x. The same address however it is written still counts as v1.
    for (const a of [V1_ADDR, V1_ADDR.toUpperCase(), `0x${V1_ADDR}`])
      expect(reportedStillTesting({ network: 'mainnet', contractAddress: a }), a).toBe(false);
    for (const a of [V2_ADDR, claims, 'cd'.repeat(32), '', 'not hex', undefined])
      expect(reportedStillTesting({ network: 'mainnet', contractAddress: a }), String(a)).toBe(true);
    // A mainnet report that names no contract: still testing.
    expect(reportedStillTesting({ network: 'mainnet' })).toBe(true);
    // Off mainnet, or no report: a test network's own note already says the date carries no weight.
    expect(reportedStillTesting({ network: 'preprod', contractAddress: V2_ADDR })).toBe(false);
    expect(reportedStillTesting({ network: 'preprod' })).toBe(false);
    expect(reportedStillTesting(undefined)).toBe(false);
  });

  it('the report decides only while the date is unconfirmed; a confirmed check names the contract itself', () => {
    const v2 = { network: 'mainnet', contractAddress: V2_ADDR };
    const v1 = { network: 'mainnet', contractAddress: V1_ADDR };
    for (const c of [undefined, 'checking' as const, UNREACHABLE, NOT_CHECKED, FAILED]) {
      expect(dateStillTesting(c, 'mainnet', v2), JSON.stringify(c)).toBe(true);
      expect(dateStillTesting(c, 'mainnet', v1), JSON.stringify(c)).toBe(false);
      expect(dateStillTesting(c, 'mainnet', undefined), JSON.stringify(c)).toBe(false);
    }
    expect(dateStillTesting(V1, 'mainnet', v2)).toBe(false);
    expect(dateStillTesting(V2, 'mainnet', v1)).toBe(true);
  });

  it('the record’s line: shown as the warning in all five languages for a v2 or unnamed report, not for v1', () => {
    const line = (tr: Translator, reported: { network: string; contractAddress?: string }) =>
      draw(React.createElement(V2Caution, { check: UNREACHABLE, network: 'mainnet', reported, tr }), tr, state.date);
    for (const [lang, tr] of Object.entries(LANGS)) {
      for (const reported of [{ network: 'mainnet', contractAddress: V2_ADDR }, { network: 'mainnet' }]) {
        const html = line(tr, reported);
        expect(html, lang).toContain('data-v2-caution');
        expect(html, lang).toContain('MuiAlert-colorWarning');
        expect(html, lang).toContain(esc(words(tr)));
      }
      expect(line(tr, { network: 'mainnet', contractAddress: V1_ADDR }), lang).toBe('');
    }
  });

  it('the foot invite: hidden beside an unconfirmed date whose report names v2 or no contract, kept for v1', () => {
    const invite = (dates: { check: AnchorCheck | undefined; network: string; reported?: object }[]) =>
      draw(React.createElement(CheckPageInvite, { loading: false, dates } as never), LANGS.en, state.date);
    const at = (contractAddress?: string) => ({ network: 'mainnet', ...(contractAddress ? { contractAddress } : {}) });
    expect(invite([{ check: UNREACHABLE, network: 'mainnet', reported: at(V1_ADDR) }])).toContain('data-make-your-own');
    for (const reported of [at(V2_ADDR), at(), at('cd'.repeat(32))]) {
      expect(invite([{ check: UNREACHABLE, network: 'mainnet', reported }])).toBe('');
      expect(invite([{ check: undefined, network: 'mainnet', reported }])).toBe('');
      expect(
        invite([
          { check: V1, network: 'mainnet', reported: at(V1_ADDR) },
          { check: UNREACHABLE, network: 'mainnet', reported },
        ]),
      ).toBe('');
    }
  });

  describe('a deleted record', () => {
    const fp = '12'.repeat(32);
    /** As VerifyPage wires it: the hook with the registry's anchor, the card, and the foot invite. */
    const DeletedPage: React.FC<{
      linkFp: string | null;
      registry: { network: string; contractAddress?: string } | null;
    }> = ({ linkFp, registry }) => {
      const date = useDeletedRecordDate(linkFp, fp, registry);
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(DeletedRecord, { id: 'VEIL-TEST', anchored: true, fp: linkFp, storedFp: fp, date }),
        React.createElement(CheckPageInvite, {
          loading: false,
          dates: [{ check: date.anchor, network: date.network, reported: date.reported }],
        }),
      );
    };
    const page = (
      tr: Translator,
      props: { linkFp: string | null; registry: { network: string; contractAddress?: string } | null },
      proof: ProofState,
    ) => draw(React.createElement(DeletedPage, props), tr, { proof, anchor: props.linkFp ? UNREACHABLE : undefined });

    it('its own proof names v2, no indexer answered: the line as a warning, no box, in all five languages', () => {
      for (const [lang, tr] of Object.entries(LANGS)) {
        const html = page(tr, { linkFp: fp, registry: null }, proofNaming('mainnet', V2_ADDR));
        expect(html, lang).toContain('data-deleted-record');
        expect(html, lang).toContain('data-v2-caution');
        expect(html, lang).toContain('MuiAlert-colorWarning');
        expect(html, lang).toContain(esc(words(tr)));
        expect(html, lang).not.toContain('data-make-your-own');
      }
    });

    it('a link without its proof code: the registry’s answer names the contract, judged the same way', () => {
      const none = { status: 'none' } as ProofState;
      const v2 = page(LANGS.en, { linkFp: null, registry: { network: 'mainnet', contractAddress: V2_ADDR } }, none);
      expect(v2).toContain('data-v2-caution');
      expect(v2).not.toContain('data-make-your-own');
      const v1 = page(LANGS.en, { linkFp: null, registry: { network: 'mainnet', contractAddress: V1_ADDR } }, none);
      expect(v1).not.toContain('data-v2-caution');
      expect(v1).toContain('data-make-your-own');
    });

    it('version 1 as the registry reports it: unchanged, no line and the box', () => {
      const html = page(LANGS.en, { linkFp: fp, registry: null }, proofNaming('mainnet', V1_ADDR));
      expect(html).not.toContain('data-v2-caution');
      expect(html).toContain('data-make-your-own');
    });
  });
});
