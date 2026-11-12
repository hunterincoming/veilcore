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
/** The result without the fields set to undefined (left out, as a statement leaves them). */
const defined = (r: Partial<ViabilityResult>): ViabilityResult =>
  Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)) as ViabilityResult;
const afterOf = (beforeCode: string, extra: Partial<ViabilityResult> = {}): LabResultInput => ({
  labName: 'Example Micro Lab',
  statement: {
    ...before.statement,
    sampleId: 'MEAL-0907-POST',
    accession: 'LAB-26-2202',
    result: defined({
      ...(before.statement.result as ViabilityResult),
      stage: 'after',
      killStep: 'Steam, 95 °C core for 30 min',
      before: beforeCode,
      sampled: '2026-11-03',
      portion: '25 g of meal in 225 mL broth',
      lod: { value: '1', unit: 'CFU per 25 g' },
      detected: false,
      // None recovered: no count (below the limit of detection, never 0).
      count: undefined,
      ...extra,
    }),
  },
});
/** A withdrawal (or, with another reason, a replacement) of `code`, for the same sample record. */
const withdrawalOf = (code: string, reason: 'retraction' | 're-test' = 'retraction'): LabResultInput => ({
  labName: 'Example Micro Lab',
  statement:
    reason === 'retraction'
      ? {
          kind: 'retraction',
          subject: SAMPLE_RECORD,
          sampleId: 'MEAL-0907-PRE',
          accession: 'LAB-26-2209',
          method: before.statement.method,
          tested: '2026-11-11',
          replaces: { result: code, reason },
        }
      : { ...before.statement, accession: 'LAB-26-2210', tested: '2026-11-11', replaces: { result: code, reason } },
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
    expect(pairs.get(a.commitment)).toEqual({ state: 'paired', before: b.bundle, methodsDiffer: false });
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
    // Both tests must have looked for the same thing.
    const otherTarget = await makeLabResult(lab.privateKey, afterOf(b.commitment, { target: 'Total aerobic count' }));
    expect(viabilityPairs([b.bundle, otherTarget.bundle]).get(otherTarget.commitment)?.state).toBe('unpaired');
  });

  it('a pair by two different methods still pairs, and says the methods differ', async () => {
    const lab = await generateKeypair();
    const b = await makeLabResult(lab.privateKey, before);
    const input = afterOf(b.commitment);
    const a = await makeLabResult(lab.privateKey, {
      ...input,
      statement: { ...input.statement, method: { id: 'Enrichment then PDA, SOP-M9', version: '1' } },
    });
    expect(viabilityPairs([b.bundle, a.bundle]).get(a.commitment)).toMatchObject({
      state: 'paired',
      methodsDiffer: true,
    });
  });

  it('a withdrawn or replaced result breaks the pair, whichever of the two it is', async () => {
    const lab = await generateKeypair();
    const other = await generateKeypair();
    const b = await makeLabResult(lab.privateKey, before);
    const a = await makeLabResult(lab.privateKey, afterOf(b.commitment));
    // The before-sample withdrawn.
    const wb = await makeLabResult(lab.privateKey, withdrawalOf(b.commitment));
    expect(viabilityPairs([b.bundle, a.bundle, wb.bundle]).get(a.commitment)).toEqual({
      state: 'broken',
      code: b.commitment,
      side: 'before',
      reason: 'retraction',
      by: wb.commitment,
    });
    // The after-sample withdrawn.
    const wa = await makeLabResult(lab.privateKey, withdrawalOf(a.commitment));
    expect(viabilityPairs([b.bundle, a.bundle, wa.bundle]).get(a.commitment)).toMatchObject({
      state: 'broken',
      side: 'after',
      reason: 'retraction',
    });
    // The before-sample replaced by a re-test.
    const rb = await makeLabResult(lab.privateKey, withdrawalOf(b.commitment, 're-test'));
    expect(viabilityPairs([b.bundle, a.bundle, rb.bundle]).get(a.commitment)).toMatchObject({
      state: 'broken',
      side: 'before',
      reason: 're-test',
    });
    // A withdrawal signed by another key withdraws nothing: still a pair.
    const theirs = await makeLabResult(other.privateKey, withdrawalOf(b.commitment));
    expect(viabilityPairs([b.bundle, a.bundle, theirs.bundle]).get(a.commitment)?.state).toBe('paired');
  });

  it('reads the SDK’s pair vectors as the SDK does', () => {
    type Held = { statement: unknown; code: string };
    type Pair = {
      name: string;
      after: unknown;
      before: unknown;
      beforeCode: string;
      afterCode: string;
      held: Held[];
      paired: boolean;
    };
    const pairs = (vectors as unknown as { labViabilityPairs: Pair[] }).labViabilityPairs;
    expect(pairs.length).toBeGreaterThan(15);
    expect(pairs.some((p) => p.held.length > 0 && !p.paired)).toBe(true);
    for (const p of pairs) {
      // Every result here is signed by the same key ('k'): the vectors leave the keys to the caller.
      const as = (s: unknown, code: string) => {
        try {
          return {
            statement: checkedStatement(s),
            signature: { record: code, key: 'k' },
          } as unknown as LabResultBundle;
        } catch {
          return undefined; // a statement the format refuses is no result at all
        }
      };
      const a = as(p.after, p.afterCode)!;
      const all = [as(p.before, p.beforeCode), a, ...p.held.map((h) => as(h.statement, h.code))].filter(
        (x): x is LabResultBundle => x !== undefined,
      );
      const got = viabilityPairs(all).get(resultCode(a))?.state === 'paired';
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
    // None recovered carries no count, not even 0; some recovered carries one, above 0.
    expect(bad({ count: { value: '0', unit: 'CFU per 25 g' } })).toThrow(expect.objectContaining({ code: 'count' }));
    expect(bad({ detected: true })).toThrow(expect.objectContaining({ code: 'count' }));
    expect(bad({ detected: true, count: { value: '0', unit: 'CFU per 25 g' } })).toThrow(
      expect.objectContaining({ code: 'count' }),
    );
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
    countValue: '',
    countUnit: '',
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
    const b = tryDraft(filled({ stage: 'before', detected: 'yes', countValue: '4300000', countUnit: 'CFU/g' }), 'L');
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
    expect(code({ detected: 'yes', countValue: '', countUnit: 'CFU per 25 g' })).toBe('count');
    expect(code({ detected: 'yes', countValue: '2', countUnit: '' })).toBe('count');
    expect(code({ killStep: '' })).toBe('killStep');
    expect(code({ lodValue: '0' })).toBe('lod');
  });

  it('none recovered signs no count (a count left in a hidden field is not used), some recovered signs one', () => {
    const none = tryDraft(filled({ countValue: '0', countUnit: 'CFU per 25 g' }), 'L');
    expect(none.ok && 'count' in (none.input.statement.result as object)).toBe(false);
    const some = tryDraft(filled({ detected: 'yes', countValue: '3', countUnit: 'CFU per 25 g' }), 'L');
    expect(some.ok && (some.input.statement.result as ViabilityResult).count).toEqual({
      value: '3',
      unit: 'CFU per 25 g',
    });
  });

  it('refuses a number that isn’t a plain decimal, never tidying or guessing it', () => {
    const code = (over: Partial<ResultDraft>) => {
      const d = tryDraft(filled(over), 'L');
      return d.ok ? (d.input.statement.result as ViabilityResult) : d.code;
    };
    // "1,000" is a thousand in the US and one in Germany; "1.000" the other way round: neither is read.
    for (const v of [
      '1,000',
      '4,300',
      '1.000',
      '0,5',
      '1 000',
      '1.000,5',
      '4,300,000',
      '4.300',
      '+1',
      '-1',
      '1e3',
      '１０',
    ])
      expect(code({ lodValue: v }), v).toBe('lodNumber');
    for (const v of ['1,000', '4,300', '1.000', '0,5'])
      expect(code({ detected: 'yes', countValue: v, countUnit: 'CFU/g' }), v).toBe('countNumber');
    // Plain decimals go in exactly as typed.
    for (const v of ['1000', '1', '0.5', '0.125', '2.1250', '100000'])
      expect(code({ lodValue: v }), v).toMatchObject({ lod: { value: v, unit: 'CFU per 25 g' } });
    expect(code({ lodValue: ' 100 ' })).toMatchObject({ lod: { value: '100' } });
    expect(code({ detected: 'yes', countValue: '4300000', countUnit: 'CFU/g' })).toMatchObject({
      count: { value: '4300000', unit: 'CFU/g' },
    });
  });
});

describe('the words for a viability result', () => {
  const KEYS = Object.keys(en).filter((k) =>
    /viability|recovered|noneRecovered|\.stage|killStep|recovers|portion|cultures?\b|\.lod|\.count|belowLod|numberHelp|controls?|positive|negative|sampled|strain|before|pair/i.test(
      k,
    ),
  );
  // "Dead", "sterile" and "proves" in each language: what a "none recovered" result never says.
  const NEVER: Record<string, RegExp> = {
    en: /\bdead\b|steril|\bprove/i,
    de: /\btot\b|steril|beweis/i,
    es: /muert|estéril|esteril|prueba que|demuestra/i,
    fr: /\bmort|stérile|sterile|prouve|démontre/i,
    // 証明 on its own is "proof"; 証明コード is the site's word for a proof code, which is a code.
    ja: /死|無菌|証明(?!コード)/,
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
    const text = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/\s+/g, ' ');
    expect(text).toContain('No viable organisms recovered');
    expect(text).toContain(
      'The lab reported no viable organisms recovered from 25 g of meal in 225 mL broth, under Spread plate on PDA, SOP-M7 (version 2), with a limit of detection of 1 CFU per 25 g.',
    );
    expect(text).toContain('After the kill step');
    expect(text).toContain('Steam, 95 °C core for 30 min');
    expect(text).toContain('positive control (Production strain, about 50 CFU) grew');
    expect(text).toContain('nothing in that record is in this result');
    expect(text).toContain('a portion may not stand for the whole batch');
    // None recovered reads as below the limit of detection, as a report gives it, never as 0.
    expect(text).toContain('Result, as reported < 1 CFU per 25 g: none recovered above the limit of detection');
    expect(text).not.toMatch(/as reported:? 0\b/);
    expect(text).not.toMatch(/\bdead\b|steril|\bproves?\b/i);
  });
});
