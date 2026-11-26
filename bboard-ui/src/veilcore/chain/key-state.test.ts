// The check page's key state beside a date (docs/contract-v2.md 3.3 and section 7): who could
// change the contract that dated a batch, read from the contract state the network recorded at
// that call and judged against the pinned entry's published key states, as the partner kit does
// (partner-kit/src/verify.ts checkBatchAnchor). With version 1 alone (mainnet before the v2 pin) nothing
// changes: the authority is not even read.
//
// Version 2 is pinned on a made-up address, the way the real pin will be: an entry added to
// deployments/mainnet.json with its keyStates. Its states are fixtures/v2-anchor-fixture.json
// (v2's ledger data after one anchorBatch, inside a real ledger 9 state) with the maintenance
// authority set to each case; v1's are real mainnet answers (fixtures/v1-mainnet-anchors.json).
// SPDX-License-Identifier: Apache-2.0
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import * as Ledger9 from '@midnightntwrk/ledger-v9';
import golden from './fixtures/v1-mainnet-anchors.json';
import v2 from './fixtures/v2-anchor-fixture.json';
import { checkAnchorOnChain, type AnchorCheck, type AnchorCheckDeps } from './anchor-check';
import { maintenanceAuthorityOf } from './anchor-decode';
import { anchorContractsFor, countedContractsFor, type PinnedContract } from './config';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { anchorHistoryEvent, anchorLine, keyStateWords, v2CautionWords } from '../../components/verify/anchor-words';
import { V2Caution } from '../../components/verify/V2Caution';
import { DatedStamp } from '../../components/DatedStamp';
import { STAMP_WORD, stampStateFor } from '../../components/verify/anchor-words';
import { recordVerdict } from '../../components/verify/verdict';
import { color } from '../../config/tokens';
import { recordDateRow } from '../../components/flow/plant-status-words';
import { dateLines } from '../authority-pack';
import { MAINNET_PINNED, PREPROD_PINNED, pinnedContractsFrom } from '../../../../api/src/pinned-contracts';
import { authorityReportOf, matchKeyState } from '../../../../api/src/key-states';
import { makeTranslator, type Translator } from '../../i18n/translate';
import { utcStamp } from '../time';
import { appEn } from '../../i18n/app/en';
import { appDe } from '../../i18n/app/de';
import { appEs } from '../../i18n/app/es';
import { appFr } from '../../i18n/app/fr';
import { appJa } from '../../i18n/app/ja';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const V1 = golden.contract;
const V2 = v2.contract;
const v1Tx = golden.transactions.find((t) => t.stateLedger === 'ledger9')!;
const V1_STATE = v1Tx.indexerAnswer.byHash[0].contractActions[0].state;
const TX = 'ab'.repeat(32);
const BLOCK_MS = Date.UTC(2026, 11, 1, 12, 0, 0);

const hexToBytes = (h: string) => Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));
const bytesToHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/** v2's fixture state with its maintenance authority replaced: `keys` signing keys, `threshold`, `counter`. */
const v2StateWith = (keys: number, threshold: number, counter: bigint): string => {
  const s = Ledger9.ContractState.deserialize(hexToBytes(v2.stateHex));
  const committee = Array.from({ length: keys }, () => Ledger9.signatureVerifyingKey(Ledger9.sampleSigningKey()));
  s.maintenanceAuthority = new Ledger9.ContractMaintenanceAuthority(committee, threshold, counter);
  return bytesToHex(s.serialize());
};

const SINGLE = {
  retired: false,
  committee: 1,
  threshold: 1,
  counter: 16,
  block: 3600000,
  label: 'one key, not yet handed to the committee',
};
const COMMITTEE = {
  retired: false,
  committee: 3,
  threshold: 2,
  counter: 19,
  block: 3700000,
  label: 'held by the 2-of-3 committee',
};

const fullJson = JSON.parse(read('../../../../deployments/mainnet.json')) as {
  contracts: Record<string, unknown>[];
};
/** deployments/mainnet.json with its version 1 entries only, as it was before v2's pin. */
const mainnetJson = { ...fullJson, contracts: fullJson.contracts.filter((c) => (c.contractVersion ?? 1) === 1) };
/** deployments/mainnet.json with version 2's main contract pinned, listing `keyStates`. */
const pinnedWithV2 = (keyStates: readonly unknown[]) =>
  pinnedContractsFrom({
    ...mainnetJson,
    contracts: [
      ...mainnetJson.contracts,
      {
        ...(mainnetJson.contracts.find((c) => c.name === 'veilcore') as Record<string, unknown>),
        contractVersion: 2,
        source: 'contract-v2/src/veilcore.compact',
        address: V2,
        keyStates,
      },
    ],
  });

const answer = (actions: { address: string; state: string; entryPoint: string }[]) =>
  new Response(
    JSON.stringify({
      data: {
        byHash: [
          {
            hash: TX,
            block: { height: 3600100, timestamp: BLOCK_MS },
            identifiers: [],
            transactionResult: { status: 'SUCCESS' },
            contractActions: actions,
          },
        ],
        byId: [],
      },
    }),
  );

const run = (
  network: string,
  contracts: readonly PinnedContract[],
  counted: readonly string[],
  call: { address: string; state: string },
  root: string,
  extra: Partial<AnchorCheckDeps> = {},
): Promise<AnchorCheck> =>
  checkAnchorOnChain(
    { network, txId: TX, contracts, counted, expectedRoot: root },
    {
      buildNetwork: network,
      indexers: ['https://relay.example/indexer'],
      fetch: () => Promise.resolve(answer([{ ...call, entryPoint: 'anchorBatch' }])),
      ...extra,
    },
  );

/** The check page on mainnet with `pinned` as its list. */
const onMainnet = (pinned: ReturnType<typeof pinnedWithV2>, call: { address: string; state: string }, root: string) => {
  const both = { mainnet: pinned, preprod: PREPROD_PINNED };
  const contracts = anchorContractsFor('mainnet', V1, undefined, undefined, both);
  return run('mainnet', contracts, countedContractsFor('mainnet', contracts, both), call, root);
};

const LANGS: Record<string, Translator> = {
  en: makeTranslator('en', appEn),
  de: makeTranslator('de', appDe),
  es: makeTranslator('es', appEs),
  fr: makeTranslator('fr', appFr),
  ja: makeTranslator('ja', appJa),
};

describe('reading the maintenance authority from the state itself', () => {
  it('every real v1 mainnet state (both ledgers) is in v1’s published state: one key, counter 16', () => {
    const v1States = MAINNET_PINNED.find((e) => e.kind === 'veilcore')!.keyStates;
    for (const t of golden.transactions) {
      const a = authorityReportOf(maintenanceAuthorityOf(t.indexerAnswer.byHash[0].contractActions[0].state, 'v1'));
      expect(a, t.stateLedger).toEqual({ committee: 1, threshold: 1, counter: 16n, retired: false });
      expect(matchKeyState(v1States, a)?.label).toBe('one key, counter 16');
    }
  });

  it('v2 is read by v2’s decoder only, from ledger 9 bytes', () => {
    expect(authorityReportOf(maintenanceAuthorityOf(v2StateWith(3, 2, 19n), 'v2'))).toEqual({
      committee: 3,
      threshold: 2,
      counter: 19n,
      retired: false,
    });
    const ledger8 = golden.transactions.find((t) => t.stateLedger === 'ledger8')!;
    expect(() => maintenanceAuthorityOf(ledger8.indexerAnswer.byHash[0].contractActions[0].state, 'v2')).toThrow(
      /Not a ledger 9 contract state/,
    );
  });
});

describe('with version 1 alone pinned (mainnet before 25 November 2026)', () => {
  it('the authority is never read, nothing new is said, and the line reads exactly as before', async () => {
    const authorityOf = vi.fn(() => {
      throw new Error('must not be read');
    });
    const contracts = anchorContractsFor('mainnet', V1, undefined, undefined, {
      mainnet: pinnedContractsFrom(mainnetJson),
      preprod: PREPROD_PINNED,
    });
    expect(contracts).toHaveLength(1);
    const r = await run(
      'mainnet',
      contracts,
      countedContractsFor('mainnet', contracts),
      { address: V1, state: V1_STATE },
      v1Tx.root,
      {
        authorityOf,
      },
    );
    expect(authorityOf).not.toHaveBeenCalled();
    expect(r).toEqual({
      status: 'checked',
      txHash: TX,
      blockHeight: 3600100,
      blockTime: BLOCK_MS,
      indexers: 1,
      contract: { version: 'v1', address: V1 },
      nameContract: false,
    });
    for (const [lang, tr] of Object.entries(LANGS)) {
      const text = anchorLine(r, { network: 'mainnet', bound: true }, tr)?.text ?? '';
      expect(text, lang).toBe(
        tr.t('app.verify.anchor.checked', {
          tx: TX,
          block: '3600100',
          at: utcStamp(BLOCK_MS),
          contract: '',
          two: '',
          test: '',
        }),
      );
      expect(text, lang).not.toContain(tr.t('app.verify.anchor.keys.oneKey').trim().slice(0, 10));
    }
  });
});

describe('with version 2 pinned beside version 1', () => {
  it('a v2 batch with one key: the date names v2 and says the key is not yet handed to the committee, in all five languages', async () => {
    const r = await onMainnet(pinnedWithV2([SINGLE]), { address: V2, state: v2.stateHex }, v2.root);
    expect(r).toMatchObject({ status: 'checked', contract: { version: 'v2' }, nameContract: true });
    expect(r.status === 'checked' && r.keyState?.label).toBe('one key, not yet handed to the committee');
    expect(anchorLine(r, { network: 'mainnet', bound: true })?.text).toContain(
      'VeilCore contract version 2 gave this date. Who can change that contract: one key, not yet handed to the committee.',
    );
    for (const [lang, tr] of Object.entries(LANGS)) {
      const text = anchorLine(r, { network: 'mainnet', bound: true }, tr)?.text ?? '';
      expect(text, lang).toContain(tr.t('app.verify.anchor.keys.oneKey'));
      expect(text, lang).not.toMatch(/\{\w+\}/);
    }
  });

  it('a v2 batch after the handover: held by the 2-of-3 committee', async () => {
    const r = await onMainnet(
      pinnedWithV2([SINGLE, COMMITTEE]),
      { address: V2, state: v2StateWith(3, 2, 19n) },
      v2.root,
    );
    expect(r.status === 'checked' && r.keyState?.label).toBe('held by the 2-of-3 committee');
    expect(anchorLine(r, { network: 'mainnet', bound: true })?.text).toContain(
      'Who can change that contract: the 2-of-3 committee (2 of its 3 members must agree).',
    );
    for (const [lang, tr] of Object.entries(LANGS)) {
      const text = anchorLine(r, { network: 'mainnet', bound: true }, tr)?.text ?? '';
      expect(text, lang).toContain(tr.t('app.verify.anchor.keys.committee', { threshold: '2', committee: '3' }));
      expect(text, lang).not.toContain(tr.t('app.verify.anchor.keys.oneKey'));
      expect(text, lang).not.toMatch(/\{\w+\}/);
    }
  });

  it('REFUSED: a state in none of the published key states (a key swapped in, or the counter moved)', async () => {
    const why =
      'the keys that can change VeilCore’s contract were, at that call, in none of the states VeilCore published for it';
    // The committee installed, but only the single key is published.
    expect(await onMainnet(pinnedWithV2([SINGLE]), { address: V2, state: v2StateWith(3, 2, 19n) }, v2.root)).toEqual({
      status: 'failed',
      reason: why,
    });
    // One key still, but the counter moved: it has been used since it was published.
    expect(await onMainnet(pinnedWithV2([SINGLE]), { address: V2, state: v2StateWith(1, 1, 17n) }, v2.root)).toEqual({
      status: 'failed',
      reason: why,
    });
    const r = await onMainnet(pinnedWithV2([SINGLE]), { address: V2, state: v2StateWith(1, 1, 17n) }, v2.root);
    for (const [lang, tr] of Object.entries(LANGS))
      expect(anchorLine(r, { network: 'mainnet', bound: true }, tr)?.status, lang).toBe('failed');
  });

  it('a v1 batch: judged against v1’s own key states (real mainnet bytes pass), and no key words on its line', async () => {
    const r = await onMainnet(pinnedWithV2([SINGLE]), { address: V1, state: V1_STATE }, v1Tx.root);
    expect(r).toMatchObject({ status: 'checked', contract: { version: 'v1' }, nameContract: true });
    expect(r.status === 'checked' && 'keyState' in r).toBe(false);
    const text = anchorLine(r, { network: 'mainnet', bound: true })?.text ?? '';
    expect(text).toContain(' VeilCore contract version 1 gave this date.');
    expect(text).not.toContain('Who can change');
  });

  it('two indexers that disagree about who could change the contract: refused', async () => {
    const both = { mainnet: pinnedWithV2([SINGLE, COMMITTEE]), preprod: PREPROD_PINNED };
    const contracts = anchorContractsFor('mainnet', V1, undefined, undefined, both);
    const states = [v2.stateHex, v2StateWith(3, 2, 19n)];
    let n = 0;
    const r = await checkAnchorOnChain(
      {
        network: 'mainnet',
        txId: TX,
        contracts,
        counted: countedContractsFor('mainnet', contracts, both),
        expectedRoot: v2.root,
      },
      {
        buildNetwork: 'mainnet',
        indexers: ['https://one.example/indexer', 'https://two.example/indexer'],
        fetch: () => Promise.resolve(answer([{ address: V2, state: states[n++ % 2], entryPoint: 'anchorBatch' }])),
      },
    );
    expect(r).toEqual({ status: 'failed', reason: 'the two indexers disagree about that transaction' });
  });
});

describe('off mainnet, as the partner kit', () => {
  it('a test build’s v2 demo contract: no key states pinned, so none judged or shown', async () => {
    const contracts = anchorContractsFor('undeployed', V1, V2, 'v2');
    expect(contracts).toEqual([{ version: 'v2', address: V2 }]);
    const r = await run(
      'undeployed',
      contracts,
      countedContractsFor('undeployed', contracts),
      { address: V2, state: v2StateWith(1, 1, 99n) },
      v2.root,
    );
    expect(r).toMatchObject({ status: 'checked', nameContract: true });
    expect(r.status === 'checked' && 'keyState' in r).toBe(false);
  });
});

describe('keyStateWords', () => {
  it('words the matched state, never the deployments label, in every language', () => {
    for (const [lang, tr] of Object.entries(LANGS)) {
      expect(keyStateWords(undefined, tr), lang).toBe('');
      expect(keyStateWords({ retired: true, committee: 0, threshold: 1 }, tr), lang).toBe(
        tr.t('app.verify.anchor.keys.retired'),
      );
      expect(keyStateWords({ retired: false, committee: 1, threshold: 1 }, tr), lang).toBe(
        tr.t('app.verify.anchor.keys.oneKey'),
      );
      expect(keyStateWords({ retired: false, committee: 3, threshold: 2 }, tr), lang).toMatch(/2[^0-9]+3|3[^0-9]+2/);
    }
  });
});

// Condition 5 of docs/contract-v2.md 7: every date from contract version 2 on mainnet carries
// "deployed on mainnet for testing by VeilCore; not yet independently reviewed; not for your
// records", on every surface that shows a checked date, as a caution and never as a tick.
describe('a date from version 2 on mainnet always says it is for testing and not for your records', () => {
  const BUNDLE =
    'VeilCore contract version 2 is deployed on mainnet for testing by VeilCore. It is not yet independently reviewed and not for your records.';
  const proofOn = (network: string) =>
    ({ status: 'anchor-reported', proof: { batchId: 'B-1', root: v2.root, anchor: { network, txHash: TX } } }) as never;
  const v2Checked = () => onMainnet(pinnedWithV2([SINGLE]), { address: V2, state: v2.stateHex }, v2.root);
  const v1Checked = () => onMainnet(pinnedWithV2([SINGLE]), { address: V1, state: V1_STATE }, v1Tx.root);
  /** The caution as each surface renders it: the check page and plant panel, the date row, the History and the authority pack. */
  const surfaces = (r: AnchorCheck, network: string, tr: Translator) => ({
    alert: renderToStaticMarkup(React.createElement(V2Caution, { check: r, network, tr })),
    row: recordDateRow(proofOn(network), r, tr).caution ?? '',
    mark: recordDateRow(proofOn(network), r, tr).mark,
    history: anchorHistoryEvent(r, { network, txHash: TX, batchId: 'B-1' }, tr),
    pack: dateLines({ state: 'anchored', midnight: { network, check: r } } as never, tr).join(' '),
  });

  it('uses the evidence bundle’s and verify.html’s exact English words', () => {
    expect(LANGS.en.t('app.verify.anchor.v2Caution')).toBe(BUNDLE);
    expect(read('../evidence/words.ts')).toContain(BUNDLE);
    expect(read('../../../evidence-page/verify-core.js')).toContain(BUNDLE);
  });

  it('a v2 date on mainnet: the line on every surface, in all five languages, as a caution', async () => {
    const r = await v2Checked();
    expect(r).toMatchObject({ status: 'checked', contract: { version: 'v2' } });
    for (const [lang, tr] of Object.entries(LANGS)) {
      const words = tr.t('app.verify.anchor.v2Caution');
      expect(words, lang).not.toBe(lang === 'en' ? '' : BUNDLE);
      expect(v2CautionWords(r, 'mainnet', tr), lang).toBe(words);
      const s = surfaces(r, 'mainnet', tr);
      const html = words.replace(/'/g, '&#x27;');
      expect(s.alert, lang).toContain(html);
      expect(s.alert, lang).toContain('data-v2-caution');
      // A caution, never the green of a passed check.
      expect(s.alert, lang).toContain('MuiAlert-colorWarning');
      expect(s.alert, lang).not.toMatch(/[Ss]uccess/);
      expect(s.row, lang).toBe(words);
      // The date row's mark is ⚠ testing, never the ✓ of a full success.
      expect(s.mark, lang).toBe('testing');
      expect(s.history.detail, lang).toContain(words);
      expect(s.history.strong, lang).toBe(false);
      expect(s.pack, lang).toContain(words);
    }
  });

  it('only there: no line for a v1 date, a v2 date off mainnet, or a date not checked', async () => {
    const v1 = await v1Checked();
    const v2r = await v2Checked();
    for (const [lang, tr] of Object.entries(LANGS)) {
      const words = tr.t('app.verify.anchor.v2Caution');
      for (const [r, network] of [
        [v1, 'mainnet'],
        [v2r, 'preprod'],
        [{ status: 'unreachable', reason: 'x' } as AnchorCheck, 'mainnet'],
      ] as const) {
        expect(v2CautionWords(r, network, tr), lang).toBeUndefined();
        const s = surfaces(r, network, tr);
        expect(s.alert, lang).toBe('');
        expect(s.mark, lang).not.toBe('testing');
        for (const text of [s.row, s.history.detail, s.pack]) expect(text, lang).not.toContain(words);
      }
      expect(v2CautionWords('checking', 'mainnet', tr), lang).toBeUndefined();
    }
  });

  // A new screen that shows a checked date must not be able to skip the line. The words come
  // only through these: every file that renders anchorLine (the check page's and the plant
  // panel's dated line) renders V2Caution beside it, and every other file that looks a record's
  // date up goes through recordDateRow, the History, the authority pack or the bundle, which
  // carry it (tested above and in evidence/bundle.test.ts).
  it('every surface that shows a checked date carries it', () => {
    const root = new URL('../../', import.meta.url);
    const files: string[] = [];
    const walk = (dir: URL) => {
      for (const name of readdirSync(dir)) {
        const u = new URL(name, dir);
        if (statSync(u).isDirectory()) walk(new URL(`${name}/`, dir));
        else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) files.push(u.pathname);
      }
    };
    walk(root);
    const src = (f: string) => readFileSync(f, 'utf8');
    const rel = (f: string) => f.slice(root.pathname.length);
    const lines = files.filter((f) => /\banchorLine\(/.test(src(f)) && !f.endsWith('anchor-words.ts'));
    expect(lines.map(rel).sort()).toEqual(['components/SettlementStatus.tsx', 'pages/VerifyPage.tsx']);
    for (const f of lines) expect(src(f), rel(f)).toMatch(/<V2Caution\b/);
    // On the check page the caution takes the invitation's place, so the page stays within its
    // word budget (complexity-budget.json "check") with the line shown.
    expect(read('../../pages/VerifyPage.tsx')).toMatch(/!v2Dated && <MakeYourOwn \/>/);
    // Every other reader of a record's date, and how its words reach the line. Calling
    // recordDateRow is not enough on its own: the file must show the row's `caution` (or hand
    // the row to something that does). A file that only reads the mark says why.
    const readers = files.filter(
      (f) =>
        /\buseRecordDate\(|\blookUpAnchor\(|\bcheckAnchorOnChain\(|\brecordDateRow\(/.test(src(f)) &&
        !/(useAnchorCheck|anchor-lookup|anchor-check|proofs|plant-status-words)\.ts$/.test(f),
    );
    const SHOWS =
      /\.caution\b|<V2Caution\b|v2CautionWords\(|anchorHistoryEvent\(|<DocumentDateView\b|<SettlementStatus\b/;
    /** Files that read the date and show none of it as a checked date, or pass it on, each with why. */
    const PASSES_ON: Record<string, string> = {
      // Home's list row for a document: the holder's own records, dated through the site's v1 anchorer only.
      'components/flow/AppHome.tsx': 'documentHomeDate',
      // Uses the look-up only to tell a failed or missing date apart; DocumentDate shows the date.
      'components/document/DocumentDetail.tsx': 'dateAnchor',
      // Hands each record's look-up to gatherPackFacts; dateLines words it (tested above).
      'components/authority-pack/AuthorityPackPage.tsx': 'gatherPackFacts',
      // Hands the row to dnaDateOf, which keeps its caution (tested in v2-not-for-records.test.ts).
      'components/flow/useDnaTie.ts': 'dnaDateOf(',
      // Reads the row's mark only; its date line is DocumentDateView, its verdict document-verdict.ts.
      'components/document/DocumentCheck.tsx': '<DocumentDateView',
    };
    for (const f of readers) {
      const r = rel(f);
      if (r in PASSES_ON) expect(src(f), r).toContain(PASSES_ON[r]);
      else expect(src(f), r).toMatch(SHOWS);
    }
    // Every "Make a record, free" box on a page that shows a record's date is kept from beside a
    // still-testing date; the two that show none say why.
    const NO_DATE: Record<string, string> = {
      // A lab result's signature check: no record date on the page.
      'components/lab/LabResultCheck.tsx': 'useSigner',
      // The example check page: a made-up record, never a looked-up date.
      'components/verify/VerifyExample.tsx': 'VerifyExample',
    };
    const invites = files.filter((f) => /<MakeYourOwn\b/.test(src(f)));
    expect(invites.length).toBeGreaterThan(0);
    for (const f of invites) {
      const r = rel(f);
      if (r in NO_DATE) {
        expect(src(f), r).toContain(NO_DATE[r]);
        expect(src(f), r).not.toMatch(/useRecordDate\(|useAnchorCheck\(|DocumentDate/);
      } else
        for (const line of src(f)
          .split('\n')
          .filter((l) => /<MakeYourOwn\b/.test(l)))
          expect(line, r).toMatch(/!(v2Dated|testingDate) && <MakeYourOwn \/>/);
    }
    // Every verdict on a record's date says whether that date is still in testing.
    const verdicts = files.filter((f) => /\brecordVerdict\(/.test(src(f)) && !f.endsWith('/verify/verdict.ts'));
    expect(verdicts.map(rel).sort()).toEqual(['components/document/document-verdict.ts', 'pages/VerifyPage.tsx']);
    for (const f of verdicts) expect(src(f), rel(f)).toMatch(/stillTesting: /);
  });
});

// The same condition: a v2 date on mainnet never gets the gold DATED stamp or a green verdict.
describe('a date from version 2 on mainnet is never shown as a full gold or green success', () => {
  const stamp = (state: 'dated' | 'practice' | 'testing') =>
    renderToStaticMarkup(React.createElement(DatedStamp, { state, word: state.toUpperCase(), date: '1 Dec 2026' }));
  const verdictFor = (r: AnchorCheck, stillTesting: boolean) =>
    recordVerdict({
      sealed: true,
      bound: true,
      proof: { status: 'anchor-reported', proof: {} } as never,
      anchor: r,
      signaturesChecking: false,
      failed: false,
      testNetwork: false,
      stillTesting,
    });

  it('the stamp: TESTING in the warning colour for v2 on mainnet, gold DATED only for v1', async () => {
    const v2r = await onMainnet(pinnedWithV2([SINGLE]), { address: V2, state: v2.stateHex }, v2.root);
    const v1r = await onMainnet(pinnedWithV2([SINGLE]), { address: V1, state: V1_STATE }, v1Tx.root);
    expect(stampStateFor(v2r, 'mainnet')).toBe('testing');
    expect(stampStateFor(v1r, 'mainnet')).toBe('dated');
    expect(stampStateFor(v2r, 'preprod')).toBe('practice');
    expect(stampStateFor('checking', 'mainnet')).toBeUndefined();
    const gold = color.accent;
    expect(stamp('dated')).toContain(gold);
    const testing = stamp(stampStateFor(v2r, 'mainnet')!);
    expect(testing).toContain('data-stamp="testing"');
    expect(testing).not.toContain(gold);
    expect(testing).toContain(color.warn);
    for (const [lang, tr] of Object.entries(LANGS)) {
      const word = tr.t(STAMP_WORD.testing);
      expect(word, lang).toBeTruthy();
      expect(word, lang).not.toBe(tr.t(STAMP_WORD.dated));
      expect(word, lang).not.toBe(tr.t(STAMP_WORD.practice));
    }
  });

  it('the verdict: never the green "ok" beside a v2 date', async () => {
    const v2r = await onMainnet(pinnedWithV2([SINGLE]), { address: V2, state: v2.stateHex }, v2.root);
    expect(verdictFor(v2r, true).tone).toBe('warn');
    expect(verdictFor(v2r, false).tone).toBe('ok');
  });

  // Every screen with a stamp picks it through stampStateFor, so none can press gold on a v2
  // date; the check page also keeps its gold mark and green verdict to a plain seal.
  it('every stamp on a page comes from stampStateFor', () => {
    const page = read('../../pages/VerifyPage.tsx');
    const plant = read('../../components/flow/PlantParts.tsx');
    for (const [name, src] of [
      ['VerifyPage', page],
      ['PlantParts', plant],
    ] as const) {
      expect(src, name).toMatch(/stampStateFor\(anchor/);
      expect(src, name).not.toMatch(/state[=:]\s*\{?[^}\n]*'dated'/);
    }
    expect(page).toMatch(/\.\.\.\(plainSeal\s*\?\s*\{ bgcolor: color\.accent/);
    expect(page).toMatch(/stillTesting: v2Dated/);
    // The fold's dated line beside a v2 date: the warning mark, not the green tick.
    expect(page).toMatch(/<Fact status=\{anchorText\.status\} testing=\{v2Dated\}>/);
    const root = new URL('../../', import.meta.url).pathname;
    const users: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const f = `${dir}${name}`;
        if (statSync(f).isDirectory()) walk(`${f}/`);
        else if (/\.tsx$/.test(name) && !/\.test\./.test(name) && /<DatedStamp\b/.test(readFileSync(f, 'utf8')))
          users.push(f.slice(root.length));
      }
    };
    walk(root);
    expect(users.sort()).toEqual(['components/flow/PlantParts.tsx', 'pages/VerifyPage.tsx']);
  });
});
