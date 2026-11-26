// A document's line on the records list (document-home-words.ts) and what Ask suggests on a
// document's page (secretary walkthrough, 18 Nov): one plain status, never the key stamp, and an
// example that Ask reads as "Explain" in every language.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { documentHomeDate } from './document-home-words';
import { enT, makeTranslator } from '../../i18n/translate';
import { appDe } from '../../i18n/app/de';
import { appEn } from '../../i18n/app/en';
import { appEs } from '../../i18n/app/es';
import { appFr } from '../../i18n/app/fr';
import { appJa } from '../../i18n/app/ja';
import { interpret } from '../../ask/shortcuts';
import type { ProofState } from '../../veilcore/proofs';

const loggedAt = Date.UTC(2026, 10, 18, 12);
const proof = (anchoredAt?: string) => ({ root: 'ab', anchor: anchoredAt ? { anchoredAt } : undefined }) as never;

describe('a document on the records list', () => {
  const sealed = `Sealed ${enT.date(loggedAt)}`;
  const at = '2026-11-19T03:00:00.000Z';
  const reported = { status: 'anchor-reported', proof: proof(at) } as ProofState;
  const line = (p: ProofState | 'checking', a?: Parameters<typeof documentHomeDate>[1]) =>
    documentHomeDate(p, a, loggedAt);

  it('says when it was sealed while its date is being looked up', () => {
    expect(line('checking')).toEqual({ mark: 'checking', text: sealed });
  });

  it('waits for its date until its batch is reported on Midnight', () => {
    for (const p of [{ status: 'none' }, { status: 'pending', proof: proof() }] as ProofState[])
      expect(line(p)).toEqual({ mark: 'waiting', text: `${sealed} · waiting for its date` });
  });

  it('says "Dated" only once the date is checked on Midnight, with the block’s time', () => {
    const blockTime = Date.parse('2026-11-19T04:00:00.000Z');
    const checked = { status: 'checked', txHash: 'c3', blockHeight: 1, blockTime, indexers: 1 } as const;
    expect(line(reported, checked)).toEqual({ mark: 'dated', text: `Dated ${enT.date(blockTime)}` });
  });

  it('a date from a contract still in testing (any but version 1, on mainnet): its line, never plain "Dated"', () => {
    const blockTime = Date.parse('2026-11-19T04:00:00.000Z');
    const onMainnet = {
      status: 'anchor-reported',
      proof: { root: 'ab', anchor: { network: 'mainnet', anchoredAt: at } },
    } as never;
    const checked = (version?: string) =>
      ({
        status: 'checked',
        txHash: 'c3',
        blockHeight: 1,
        blockTime,
        indexers: 1,
        ...(version ? { contract: { version, address: 'cd' } } : {}),
      }) as never;
    const caution = enT.t('app.verify.anchor.v2Caution');
    for (const v of ['v2', 'v3', undefined])
      expect(line(onMainnet, checked(v)), String(v)).toEqual({
        mark: 'testing',
        text: `Dated ${enT.date(blockTime)}`,
        caution,
      });
    expect(line(onMainnet, checked('v1'))).toEqual({ mark: 'dated', text: `Dated ${enT.date(blockTime)}` });
  });

  it('a report not yet checked is never "Dated" alone', () => {
    expect(line(reported, 'checking')).toEqual({ mark: 'checking', text: `${sealed} · date reported, being checked` });
    expect(line(reported, undefined).mark).toBe('checking');
    expect(line(reported, { status: 'unreachable' } as never)).toEqual({
      mark: 'reported',
      text: `Dated ${enT.date(at)} (VeilCore’s report)`,
    });
    expect(line(reported, { status: 'failed', reason: 'x' } as never)).toEqual({
      mark: 'failed',
      text: `${sealed} · date not confirmed on Midnight`,
    });
  });

  it('never mentions the key stamp, in any language', () => {
    for (const [lang, dict] of [
      ['en', appEn],
      ['de', appDe],
      ['es', appEs],
      ['fr', appFr],
      ['ja', appJa],
    ] as const) {
      const tr = makeTranslator(lang, dict);
      for (const [p, a] of [
        ['checking', undefined],
        [{ status: 'none' }, undefined],
        [reported, { status: 'unreachable' }],
        [reported, { status: 'failed', reason: 'x' }],
      ] as const) {
        const { text } = documentHomeDate(p, a as never, loggedAt, tr);
        expect(text, lang).not.toContain(tr.t('app.home.keyNotStamped'));
        expect(text, lang).not.toMatch(/\{|\}/);
      }
    }
  });
});

describe('Ask’s example on a document page', () => {
  it('is read as "Explain: proof code" in every language', () => {
    for (const [lang, dict] of [
      ['en', appEn],
      ['de', appDe],
      ['es', appEs],
      ['fr', appFr],
      ['ja', appJa],
    ] as const) {
      const text = makeTranslator(lang, dict)
        .t('app.ask.inputPlaceholderDoc')
        .replace(/^(e\.g\.|p\. ej\.|z\. B\.|ex\.|例：)\s*/, '');
      expect(interpret(text, { records: [], kinds: ['plant'] }), lang).toEqual({ type: 'explain', topic: 'proofCode' });
    }
  });
});
