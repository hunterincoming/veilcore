// A viability result (lab-result.ts; SDK SPEC 11.12, "Viability"): a sample taken before or after
// a kill step. Signed and read back, its call and stage in the field set, the strain record named
// by proof code only, an invalid run refused, a before/after pair read only under the rules, and
// the words every page uses: what the lab recovered under its stated method and limit, never
// "dead", "sterile" or "proves", in any language.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generateKeypair } from 'veilcore-records';
import {
  checkedStatement,
  makeLabResult,
  readLabResult,
  readResultsText,
  resultCode,
  viabilityPairs,
  type LabResultBundle,
  type LabResultInput,
  type LabResultStatement,
  type ViabilityResult,
} from './lab-result';
import { emptyDraft, tryDraft, type ResultDraft } from './lab-result-draft';
import { SCHEMAS } from './field-set';
import vectors from './fixtures/lab-result-v2.json';
import { claimMaterial } from './claims-input';
import { signatureParts } from './lab-attest';
import { claimsKeyFor } from './claims-key';
import { ClaimsSimulator } from '../../../contract/src/test/claims-simulator';
import { claimFromCells } from '../../../contract/src/verify-claims';
import { labresult as en } from '../i18n/app/en/labresult';
import { labresult as de } from '../i18n/app/de/labresult';
import { labresult as es } from '../i18n/app/es/labresult';
import { labresult as fr } from '../i18n/app/fr/labresult';
import { labresult as ja } from '../i18n/app/ja/labresult';

const STRAIN = 'd4'.repeat(32);
const SAMPLE_RECORD = 'a1'.repeat(32);

const before: LabResultInput = {
  labName: 'Example Micro Lab',
  statement: {
    kind: 'viability',
    subject: SAMPLE_RECORD,
    sampleId: 'MEAL-0907-PRE',
    accession: 'LAB-26-2201',
    method: { id: 'Spread plate on PDA, SOP-M7', version: '2' },
    received: '2026-11-03',
    tested: '2026-11-10',
    result: {
      batch: 'MEAL-26-0907',
      stage: 'before',
      strain: STRAIN,
      sampled: '2026-11-02',
      target: 'The production strain',
      portion: '10 g of meal',
      cultures: [{ medium: 'PDA with chloramphenicol', time: '7 days', temperature: '25 °C' }],
      lod: { value: '100', unit: 'CFU/g' },
      detected: true,
      count: { value: '4300000', unit: 'CFU/g' },
      controls: { positive: 'Production strain, about 50 CFU', positiveGrew: true, negativeGrew: false },
    },
  },
};
const afterOf = (beforeCode: string, extra: Partial<ViabilityResult> = {}): LabResultInput => ({
  labName: 'Example Micro Lab',
  statement: {
    ...before.statement,
    sampleId: 'MEAL-0907-POST',
    accession: 'LAB-26-2202',
    result: {
      ...(before.statement.result as ViabilityResult),
      stage: 'after',
      killStep: 'Steam, 95 °C core for 30 min',
      before: beforeCode,
      sampled: '2026-11-03',
      portion: '25 g of meal in 225 mL broth',
      lod: { value: '1', unit: 'CFU per 25 g' },
      detected: false,
      count: { value: '0', unit: 'CFU per 25 g' },
      ...extra,
    },
  },
});

describe('a viability result', () => {
  it('signs a before/after pair: the call and the stage in the field set, read back, paired', async () => {
    const lab = await generateKeypair();
    const b = await makeLabResult(lab.privateKey, before);
    const a = await makeLabResult(lab.privateKey, afterOf(b.commitment));
    expect(b.bundle.record.fieldSet.schema).toBe('veilcore/schema/viability/v1');
    expect(b.bundle.record.fieldSet.values.slice(0, 3)).toEqual(['1', '0', null]);
    expect(a.bundle.record.fieldSet.values.slice(0, 3)).toEqual(['0', '1', null]);
    const back = await readLabResult(JSON.parse(JSON.stringify(a.bundle)) as Record<string, unknown>);
    expect((back.statement.result as ViabilityResult).before).toBe(b.commitment);
    // The strain is in the statement by proof code and nothing else of it.
    expect(JSON.stringify(a.bundle)).toContain(STRAIN);
    const pairs = viabilityPairs([b.bundle, a.bundle]);
    expect(pairs.get(a.commitment)).toEqual({ state: 'paired', before: b.bundle });
    expect(pairs.get(b.commitment)).toBeUndefined();
    // Both files chosen together on the check page read as one set, in either order.
    const files = await Promise.all([a.bundle, b.bundle].map((x) => readResultsText(JSON.stringify(x))));
    const ok = files.flat().flatMap((r) => (r.ok ? [r.bundle] : []));
    expect(viabilityPairs(ok).get(a.commitment)?.state).toBe('paired');
  });

  it('the claims contract accepts the lab’s signature, so “none recovered” can be proved on Midnight', async () => {
    const lab = await generateKeypair();
    const { bundle } = await makeLabResult(lab.privateKey, afterOf('e5'.repeat(32)));
    const m = await claimMaterial(bundle.record);
    const { key, signature } = signatureParts(bundle.signature);
    const sim = new ClaimsSimulator();
    sim.call({ attester: key, signature }, 'proveAttested', m.commitment);
    const c = claimFromCells(sim.state);
    expect(c.kind).toBe('attested');
    expect(c.attester).toEqual(claimsKeyFor(lab.privateKey).key);
    expect(SCHEMAS['veilcore/schema/viability/v1'].slots.map((s) => s.path)).toEqual([
      'viability.recovered',
      'viability.stage',
    ]);
  });

  it('pairs only under the rules: same key, a before-sample, same batch and strain, not sampled later', async () => {
    const lab = await generateKeypair();
    const other = await generateKeypair();
    const b = await makeLabResult(lab.privateKey, before);
    const theirs = await makeLabResult(other.privateKey, before);
    const byOther = await makeLabResult(lab.privateKey, afterOf(theirs.commitment));
    expect(viabilityPairs([theirs.bundle, byOther.bundle]).get(byOther.commitment)?.state).toBe('unpaired');
    const otherBatch = await makeLabResult(lab.privateKey, afterOf(b.commitment, { batch: 'MEAL-26-0908' }));
    expect(viabilityPairs([b.bundle, otherBatch.bundle]).get(otherBatch.commitment)?.state).toBe('unpaired');
    const otherStrain = await makeLabResult(lab.privateKey, afterOf(b.commitment, { strain: 'c3'.repeat(32) }));
    expect(viabilityPairs([b.bundle, otherStrain.bundle]).get(otherStrain.commitment)?.state).toBe('unpaired');
    const alone = await makeLabResult(lab.privateKey, afterOf(b.commitment));
    expect(viabilityPairs([alone.bundle]).get(alone.commitment)).toEqual({ state: 'missing', code: b.commitment });
  });

  it('reads the SDK’s pair vectors as the SDK does', () => {
    type Pair = { name: string; after: unknown; before: unknown; beforeCode: string; paired: boolean };
    const pairs = (vectors as unknown as { labViabilityPairs: Pair[] }).labViabilityPairs;
    expect(pairs.length).toBeGreaterThan(5);
    for (const p of pairs) {
      const as = (s: unknown, code: string) =>
        ({ statement: checkedStatement(s), signature: { record: code, key: 'k' } }) as unknown as LabResultBundle;
      const a = as(p.after, 'ab'.repeat(32));
      const got = viabilityPairs([as(p.before, p.beforeCode), a]).get(resultCode(a))?.state === 'paired';
      expect(got, p.name).toBe(p.paired);
    }
  });

  it('refuses an invalid run, a before-sample with a kill step, and a strain named by name', () => {
    const s = { format: 'veilcore/lab-result/v2', ...afterOf('e5'.repeat(32)).statement } as LabResultStatement;
    const r = s.result as ViabilityResult;
    const bad = (result: object) => () => checkedStatement({ ...s, result: { ...r, ...result } });
    expect(bad({ controls: { positive: 'x', positiveGrew: false } })).toThrow(
      expect.objectContaining({ code: 'controls' }),
    );
    expect(bad({ controls: { positive: 'x', positiveGrew: true, negativeGrew: true } })).toThrow(
      expect.objectContaining({ code: 'controls' }),
    );
    expect(bad({ stage: 'before', before: undefined })).toThrow(expect.objectContaining({ code: 'killStep' }));
    expect(bad({ strain: 'Aspergillus oryzae RIB40' })).toThrow(expect.objectContaining({ code: 'strain' }));
    expect(bad({ count: { value: '3', unit: 'CFU per 25 g' } })).toThrow(expect.objectContaining({ code: 'count' }));
    expect(bad({ lod: { value: '1e2', unit: 'CFU/g' } })).toThrow(expect.objectContaining({ code: 'lod' }));
    expect(bad({ sampled: '2026-11-11' })).toThrow(expect.objectContaining({ code: 'sampled' }));
    expect(bad({ cultures: [] })).toThrow(expect.objectContaining({ code: 'cultures' }));
  });
});

describe('the lab’s form for a viability result', () => {
  const filled = (over: Partial<ResultDraft> = {}): ResultDraft => ({
    ...emptyDraft('viability'),
    subject: SAMPLE_RECORD.toUpperCase(),
    sampleId: 'MEAL-0907-POST',
    accession: 'LAB-26-2202',
    method: 'Enrichment then PDA',
    methodVersion: '1',
    tested: '2026-11-10',
    batch: ' MEAL-26-0907 ',
    stage: 'after',
    killStep: 'Steam, 95 °C core for 30 min',
    before: `https://veilcore.org/check?code=${'e5'.repeat(32)}`,
    strain: STRAIN,
    sampled: '2026-11-03',
    recovers: 'The production strain',
    portion: '25 g of meal in 225 mL broth',
    cultures: [
      { medium: 'Potato dextrose broth', time: '7 days', temperature: '25 °C' },
      { medium: '', time: '', temperature: '' },
    ],
    lodValue: '1',
    lodUnit: 'CFU per 25 g',
    detected: 'no',
    countValue: '0',
    countUnit: 'CFU per 25 g',
    positive: 'Production strain in killed meal',
    positiveGrew: 'yes',
    negativeGrew: 'no',
    ...over,
  });

  it('turns what the lab typed into the statement, and leaves out an empty medium row', () => {
    const d = tryDraft(filled(), 'Example Micro Lab');
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    const r = d.input.statement.result as ViabilityResult;
    expect(r.batch).toBe('MEAL-26-0907');
    expect(r.before).toBe('e5'.repeat(32));
    expect(r.cultures).toHaveLength(1);
    expect(r.controls).toEqual({
      positive: 'Production strain in killed meal',
      positiveGrew: true,
      negativeGrew: false,
    });
    expect(d.input.statement.subject).toBe(SAMPLE_RECORD);
    // A before-sample drops what only an after-sample carries.
    const b = tryDraft(filled({ stage: 'before', detected: 'yes', countValue: '' }), 'L');
    expect(b.ok && (b.input.statement.result as ViabilityResult)).toMatchObject({ stage: 'before' });
    expect(b.ok && 'killStep' in (b.input.statement.result as object)).toBe(false);
    expect(b.ok && 'before' in (b.input.statement.result as object)).toBe(false);
    // No negative control run: not written at all.
    const n = tryDraft(filled({ negativeGrew: 'not-run' }), 'L');
    expect(n.ok && (n.input.statement.result as ViabilityResult).controls).toEqual({
      positive: 'Production strain in killed meal',
      positiveGrew: true,
    });
  });

  it('won’t sign a run whose controls failed, and names the field to fix', () => {
    const code = (over: Partial<ResultDraft>) => {
      const d = tryDraft(filled(over), 'L');
      return d.ok ? 'signed' : d.code;
    };
    expect(code({ positiveGrew: 'no' })).toBe('controls');
    expect(code({ negativeGrew: 'yes' })).toBe('controls');
    expect(code({ positiveGrew: '' })).toBe('controls');
    expect(code({ stage: '' })).toBe('stage');
    expect(code({ strain: 'not a code' })).toBe('strain');
    expect(code({ countUnit: '' })).toBe('count');
    expect(code({ countValue: '2' })).toBe('count');
    expect(code({ killStep: '' })).toBe('killStep');
    expect(code({ lodValue: '0' })).toBe('lod');
  });
});

describe('the words for a viability result', () => {
  const KEYS = Object.keys(en).filter((k) =>
    /viability|recovered|noneRecovered|\.stage|killStep|recovers|portion|cultures?\b|\.lod|\.count|controls?|positive|negative|sampled|strain|before|pair/i.test(
      k,
    ),
  );
  // "Dead", "sterile" and "proves" in each language: what a "none recovered" result never says.
  const NEVER: Record<string, RegExp> = {
    en: /\bdead\b|steril|\bprove/i,
    de: /\btot\b|steril|beweis/i,
    es: /muert|estéril|esteril|prueba que|demuestra/i,
    fr: /\bmort|stérile|sterile|prouve|démontre/i,
    ja: /死|無菌|証明する|証明します/,
  };

  it('has every new word in all five languages', () => {
    expect(KEYS.length).toBeGreaterThan(40);
    for (const [lang, dict] of Object.entries({ de, es, fr, ja }))
      for (const k of KEYS) expect((dict as Record<string, string>)[k], `${lang} ${k}`).toBeTruthy();
  });

  it('never says the batch is dead or sterile, or that a result proves it, in any language', () => {
    for (const [lang, dict] of Object.entries({ en, de, es, fr, ja }))
      for (const k of KEYS) {
        const v = (dict as Record<string, string>)[k];
        expect(NEVER[lang].test(v), `${lang} ${k}: ${v}`).toBe(false);
      }
  });

  afterEach(() => vi.unstubAllGlobals());

  it('shows “no viable organisms recovered” with the method, the portion and the limit, and its limits', async () => {
    const lab = await generateKeypair();
    const { bundle } = await makeLabResult(lab.privateKey, afterOf('e5'.repeat(32)));
    const { LanguageProvider } = await import('../i18n');
    const { ResultFacts } = await import('../components/lab/ResultFacts');
    vi.stubGlobal('window', {
      localStorage: { getItem: () => null, setItem: () => undefined },
      location: { search: '' },
    });
    const html = renderToStaticMarkup(
      React.createElement(LanguageProvider, null, React.createElement(ResultFacts, { statement: bundle.statement })),
    );
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    expect(text).toContain('No viable organisms recovered');
    expect(text).toContain(
      'The lab reported no viable organisms recovered from 25 g of meal in 225 mL broth, under Spread plate on PDA, SOP-M7 (version 2), with a limit of detection of 1 CFU per 25 g.',
    );
    expect(text).toContain('After the kill step');
    expect(text).toContain('Steam, 95 °C core for 30 min');
    expect(text).toContain('positive control (Production strain, about 50 CFU) grew');
    expect(text).toContain('nothing in that record is in this result');
    expect(text).toContain('a portion may not stand for the whole batch');
    expect(text).not.toMatch(/\bdead\b|steril|\bproves?\b/i);
  });
});
