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

  it('says when it was sealed while its date is being looked up', () => {
    expect(documentHomeDate('checking', loggedAt)).toBe(sealed);
  });

  it('waits for its date until its batch is reported on Midnight', () => {
    for (const p of [{ status: 'none' }, { status: 'pending', proof: proof() }] as ProofState[])
      expect(documentHomeDate(p, loggedAt)).toBe(`${sealed} · waiting for its date`);
  });

  it('is dated by its batch, with the date the registry reports', () => {
    const at = '2026-11-19T03:00:00.000Z';
    expect(documentHomeDate({ status: 'anchor-reported', proof: proof(at) }, loggedAt)).toBe(`Dated ${enT.date(at)}`);
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
      for (const p of ['checking', { status: 'none' }] as const) {
        const line = documentHomeDate(p, loggedAt, tr);
        expect(line, lang).not.toContain(tr.t('app.home.keyNotStamped'));
        expect(line, lang).not.toMatch(/\{|\}/);
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
