// "Couldn't read Midnight" is never said as "Midnight says no", in any of the five languages
// (foundation review, 26 Nov 2026, items 1 and 5): a state in a format this build can't decode,
// a transaction the indexer hasn't reached, an indexer that didn't answer, and one of two
// indexers that couldn't confirm are each a warning with the registry's date as its report,
// never a cross, never "don't rely on it", never green. A claim that couldn't be read is the same.
import { describe, expect, it } from 'vitest';
import { anchorCheckFailed, anchorHeading, anchorHistoryEvent, anchorLine, type AnchorState } from './anchor-words';
import { claimVerdict, recordVerdict } from './verdict';
import { recordDateRow } from '../flow/plant-status-words';
import { appEn } from '../../i18n/app/en';
import { appDe } from '../../i18n/app/de';
import { appEs } from '../../i18n/app/es';
import { appFr } from '../../i18n/app/fr';
import { appJa } from '../../i18n/app/ja';
import { makeTranslator, type Translator } from '../../i18n/translate';
import type { ProofState } from '../../veilcore/proofs';
import type { AppKey } from '../../i18n/app/en';
import type { InclusionProof } from 'veilcore-records';

const LANGS: Translator[] = [
  makeTranslator('en', appEn),
  makeTranslator('de', appDe),
  makeTranslator('es', appEs),
  makeTranslator('fr', appFr),
  makeTranslator('ja', appJa),
];

const AT = '2026-10-11T14:03:07.000Z';
const CANT: Record<string, { state: AnchorState; key: AppKey }> = {
  unreadable: {
    state: {
      status: 'unreachable',
      why: 'unreadable',
      reason: 'the contract state is in a format this page can’t read yet (midnight:contract-state[v99])',
    },
    key: 'app.verify.anchor.unreadable',
  },
  'not-yet': {
    state: { status: 'unreachable', why: 'not-yet', reason: 'Midnight’s indexer doesn’t have transaction e13c… yet' },
    key: 'app.verify.anchor.notYet',
  },
  'no-answer': {
    state: { status: 'unreachable', why: 'no-answer', reason: 'the indexer did not answer' },
    key: 'app.verify.anchor.noIndexer',
  },
  'one-of-two': {
    state: { status: 'unreachable', why: 'one-of-two', reason: 'only one of the two indexers could confirm it' },
    key: 'app.verify.anchor.oneIndexer',
  },
};
const FAILED: AnchorState = { status: 'failed', reason: 'that transaction wrote a different batch root (abc…)' };

const proof = {
  formatVersion: '1',
  commitment: 'aa'.repeat(32),
  path: [],
  root: 'bb'.repeat(32),
  batchId: 'b1',
  sealedAt: AT,
  anchor: { chain: 'midnight', network: 'mainnet', txHash: 'cc'.repeat(32), anchoredAt: AT },
} as unknown as InclusionProof;
const reported: ProofState = { status: 'anchor-reported', proof };

describe.each(LANGS.map((tr) => [tr.lang, tr] as const))('in %s', (_lang, tr) => {
  const failedLine = anchorLine(FAILED, { network: 'mainnet', bound: true }, tr)?.text ?? '';
  const dontRely = tr.t('app.verify.anchor.failed', { reason: '' }).split(':').pop()?.trim() ?? '';

  it.each(Object.entries(CANT))('%s: a warning with the registry’s date, never the failure', (_why, { state, key }) => {
    const line = anchorLine(state, { network: 'mainnet', bound: true, reportedAt: AT }, tr);
    const date = tr.t('app.verify.anchor.dateNotChecked', {
      date: tr.t('app.verify.anchor.registryDate', { date: '2026-10-11 14:03 UTC' }),
    });
    expect(line).toEqual({ status: 'reported', text: tr.t(key, { date }) });
    expect(line?.text).not.toBe(failedLine);
    expect(line?.text).not.toContain(dontRely);
    // The heading stays the registry's report, the "What each fact rests on" box isn't told it failed.
    expect(anchorHeading('base', state, true, 'mainnet', tr)).toBe('base');
    expect(anchorCheckFailed(state)).toBe(false);
    // The top line: amber, the server's report; never green, never the cross.
    const top = recordVerdict({
      sealed: true,
      bound: true,
      proof: reported,
      anchor: state,
      signaturesChecking: false,
      failed: false,
      testNetwork: false,
      reportedAt: AT,
    });
    expect(top).toMatchObject({ tone: 'warn', key: 'app.verify.verdict.reported' });
    // History: the registry's report, not "don't rely on it".
    const ev = anchorHistoryEvent(
      state,
      { network: 'mainnet', txHash: 'cc'.repeat(32), anchoredAt: AT, batchId: 'b1' },
      tr,
    );
    expect(ev.title).toBe(tr.t('app.verify.anchor.eventReportedTitle'));
    expect(ev.strong).toBe(false);
    // The plant page's row: the registry's report, a neutral mark.
    const row = recordDateRow(reported, state, tr);
    expect(row.mark).toBe('reported');
    expect(row.sub).not.toBe(tr.t('app.plant.notConfirmed'));
  });

  it('a state it can’t read, or a transaction not reached yet, says “couldn’t read”, not “couldn’t reach”', () => {
    for (const why of ['unreadable', 'not-yet'] as const) {
      const { state } = CANT[why];
      const ev = anchorHistoryEvent(state, { network: 'mainnet', anchoredAt: AT, batchId: 'b1' }, tr);
      expect(ev.detail).toContain(tr.t('app.verify.anchor.whyUnread'));
      expect(recordDateRow(reported, state, tr).sub).toContain(tr.t('app.plant.couldntRead'));
    }
    const ev = anchorHistoryEvent(CANT['no-answer'].state, { network: 'mainnet', anchoredAt: AT, batchId: 'b1' }, tr);
    expect(ev.detail).toContain(tr.t('app.verify.anchor.whyUnreachable'));
  });

  it('every new sentence is in the language, not English left in place', () => {
    if (tr.lang === 'en') return;
    for (const key of [
      'app.verify.anchor.unreadable',
      'app.verify.anchor.notYet',
      'app.verify.anchor.whyUnread',
      'app.plant.couldntRead',
      'app.claim.verdict.unreadable',
      'app.err.chain.callUnreadable',
      'app.err.chain.noSuchTx',
    ] as const) {
      expect(tr.t(key), key).not.toBe(appEn[key]);
      expect(tr.t(key).length, key).toBeGreaterThan(10);
    }
  });

  it('a genuine contradiction is still the failure', () => {
    expect(anchorLine(FAILED, { network: 'mainnet', bound: true }, tr)?.status).toBe('failed');
    expect(anchorHeading('base', FAILED, true, 'mainnet', tr)).toBe(tr.t('app.verify.anchor.headingFailed'));
    expect(recordDateRow(reported, FAILED, tr).mark).toBe('failed');
  });
});

describe('the claim page', () => {
  const base = { readable: true, off: false, more: [] as const };
  it('a claim that couldn’t be read is amber, never the cross; one Midnight contradicts is the cross', () => {
    expect(claimVerdict({ ...base, verdict: { ok: false, reason: 'x', unreadable: true } })).toEqual({
      tone: 'warn',
      key: 'app.claim.verdict.unreadable',
    });
    expect(claimVerdict({ ...base, verdict: { ok: false, reason: 'That transaction did not succeed.' } })).toEqual({
      tone: 'fail',
      key: 'app.claim.verdict.failed',
    });
  });

  it('another claim in the link that couldn’t be read isn’t called failed', () => {
    const ok = { ok: true, blockTime: 1 } as const;
    expect(claimVerdict({ ...base, verdict: ok, more: [{ ok: false, reason: 'x', unreadable: true }] })).toEqual({
      tone: 'warn',
      key: 'app.claim.verdict.unreadable',
    });
    expect(claimVerdict({ ...base, verdict: ok, more: [{ ok: false, reason: 'x' }] })).toMatchObject({
      key: 'app.claim.verdict.someFailed',
    });
  });
});
