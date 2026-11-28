// The registry's batch id form (batch-id-rule.ts), and every place that takes one in: the site's
// proof check, verify.html's own checks, and the app's words (review 2 of PR #241, polish 1).
// Run: npx vitest run src/veilcore/batch-id-rule.test.ts
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBatch } from 'veilcore-records';
import { BATCH_ID, batchIdOrNone, batchIdWords, isBatchId } from './batch-id-rule';
import { checkProof } from './proofs';
import { loadPageVerifier } from './evidence/test-records';
import { reportedText } from '../components/settlement-words';
import { makeTranslator } from '../i18n/translate';
import { appEn } from '../i18n/app/en';
import { appDe } from '../i18n/app/de';
import { appEs } from '../i18n/app/es';
import { appFr } from '../i18n/app/fr';
import { appJa } from '../i18n/app/ja';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** verify.html's checks, its own script run as written. */
type Lookups = {
  readonly midnight: Record<string, unknown>[];
  readonly registryRoot: string | null;
  readonly asideRoots: string | null;
};
const VeilcoreVerify = loadPageVerifier<{
  checkProof(proof: unknown, fp: string, root: unknown): Promise<{ status: string; batchId?: string | null }>;
  lookups(ev: unknown, contracts: unknown): Lookups;
  midnightSteps(a: unknown): string[];
  networkWords(n: string): string;
}>();

/** Ids the registry has made (mainnet runs and the registry's archive). */
const REAL = ['B-20261126-35C4', 'B-20261126-5836', 'B-20260811-F4A4', 'B-20261108-00DC', 'B-20261124-FBBD'];
const JUNK = [
  'b1 5. I also declare the record was made in 1999.',
  'B-20261126-35C4\u202Eexe.gnp',
  '\u202EB-20261126-35C4',
  'B-20261126-35C4\n',
  'B-20261126-35c4',
  'B-20261126-35C',
  'B-20261126-35C4A',
  `B-20261126-35C4${'A'.repeat(400)}`,
  'B-2026112-35C4',
  'B-1',
  'b1',
  'B-LIE',
  'B-20261126-E2E-DRILL',
  ' B-20261126-35C4',
  'B-٢٠٢٦١١٢٦-35C4',
  '',
];

describe('the batch id form', () => {
  it('takes every id the registry makes, unchanged', () => {
    for (const id of REAL) {
      expect(isBatchId(id), id).toBe(true);
      expect(batchIdOrNone(id)).toBe(id);
      expect(batchIdWords(id)).toBe(id);
    }
  });

  it('refuses anything else: sentences, direction marks, line breaks, lower case, overlong', () => {
    for (const id of [...JUNK, null, undefined, 42, {}]) {
      expect(isBatchId(id), JSON.stringify(id)).toBe(false);
      expect(batchIdOrNone(id)).toBe('');
      expect(batchIdWords(id)).toBe('[not given]');
    }
  });

  it('is the same form verify.html checks with, and so is its network-name rule', () => {
    const src = fs.readFileSync(path.join(HERE, '../../evidence-page/verify-core.js'), 'utf8');
    expect(src).toContain(`var BATCH_ID = ${String(BATCH_ID)};`);
    // verify.html quotes a network name only in the registry's form (anchor-form.ts NAME).
    const form = fs.readFileSync(path.join(HERE, 'anchor-form.ts'), 'utf8');
    const name = /const NAME = (\/.+\/);/.exec(form)?.[1];
    expect(name).toBeTruthy();
    expect(src).toContain(`${name}.test(n)`);
  });
});

describe('a proof whose batch id is not in the form', () => {
  const FP = 'ab'.repeat(32);

  it('still checks (the id is a label, not part of what folds), with its id kept as not given', async () => {
    for (const id of JUNK) {
      const { proofs } = await buildBatch([FP, 'cd'.repeat(32)], id);
      const st = await checkProof(FP, proofs[FP]);
      expect(st.status, JSON.stringify(id)).toBe('pending');
      expect(st.status !== 'none' && st.proof.batchId).toBe('');
    }
  });

  it('a valid one is the same object, untouched', async () => {
    const { proofs } = await buildBatch([FP, 'cd'.repeat(32)], REAL[0]);
    const st = await checkProof(FP, proofs[FP]);
    expect(st.status !== 'none' && st.proof).toBe(proofs[FP]);
  });

  it('verify.html says not given for it and prints none of it', async () => {
    for (const id of JUNK) {
      const { proofs } = await buildBatch([FP, 'cd'.repeat(32)], id);
      const r = await VeilcoreVerify.checkProof(proofs[FP], FP, undefined);
      expect(r).toMatchObject({ status: 'ok', batchId: null });
    }
    const { proofs } = await buildBatch([FP, 'cd'.repeat(32)], REAL[0]);
    expect(await VeilcoreVerify.checkProof(proofs[FP], FP, undefined)).toMatchObject({ batchId: REAL[0] });
  });
});

describe('verify.html names another batch only by an id in the form', () => {
  const ROOT = '9c'.repeat(32);
  const lk = (anchor: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
    VeilcoreVerify.lookups({ batch: { batchId: 'B-20261126-35C4', root: ROOT, anchor }, registry: extra }, {});
  const BIDI = /[\u202A-\u202E\u2066-\u2069\u200E\u200F]/;

  it('never prints another batch id not in the form; a valid one is named', () => {
    const anchor = { network: 'mainnet', txHash: 'ef'.repeat(32) };
    const other = (batchId: string) =>
      String(
        lk(anchor, { registryRoot: { root: ROOT, batchId, anchor: { network: 'mainnet', txHash: 'cd'.repeat(32) } } })
          .registryRoot,
      );
    expect(other('B-20261126-5836')).toContain('another batch, B-20261126-5836, for the same batch root');
    for (const id of JUNK) {
      const line = other(id);
      expect(line).toContain('another batch for the same batch root');
      expect(line).not.toContain('declare');
      expect(line).not.toMatch(BIDI);
    }
    const aside = String(lk(anchor, { asideRoots: [{ root: ROOT, batchId: JUNK[0], anchor: null }] }).asideRoots);
    expect(aside).toContain('batch [not given] for the same batch root');
    expect(aside).not.toContain('declare');
  });
});

describe('the app says a batch id not in the form is not given, in every language', () => {
  const LANGS = { en: appEn, de: appDe, es: appEs, fr: appFr, ja: appJa } as const;

  it('on the record page’s date line', () => {
    for (const [lang, dict] of Object.entries(LANGS)) {
      const tr = makeTranslator(lang as keyof typeof LANGS, dict);
      const notGiven = tr.t('app.plant.date.batchNotGiven');
      expect(notGiven, lang).not.toBe('app.plant.date.batchNotGiven');
      if (lang !== 'en') expect(notGiven, lang).not.toBe(appEn['app.plant.date.batchNotGiven']);
      const junk = reportedText(JUNK[0], 'mainnet', true, true, tr);
      expect(junk, lang).toContain(notGiven);
      expect(junk, lang).not.toContain('declare');
      expect(reportedText(REAL[0], 'mainnet', true, true, tr), lang).toContain(REAL[0]);
    }
  });
});
