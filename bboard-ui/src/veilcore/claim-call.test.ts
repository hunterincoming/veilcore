import { describe, expect, it } from 'vitest';
import { CALL_WORDS, callWordKey, claimFooterKey, forcedCall } from './claim-call';
import { SCHEMAS } from './field-set';
import { enT, makeTranslator } from '../i18n/translate';
import { appDe } from '../i18n/app/de';
import { appEs } from '../i18n/app/es';
import { appFr } from '../i18n/app/fr';
import { appJa } from '../i18n/app/ja';
import { claimRawWords, claimWords } from '../components/document/ProveNumber';

const PATHOGEN = 'veilcore/schema/pathogen/v1';
const atMost = (bound: string) => ({ kind: 'range' as const, op: 'at-most' as const, bound });
const atLeast = (bound: string) => ({ kind: 'range' as const, op: 'at-least' as const, bound });
const exactly = (value: string) => ({ kind: 'value' as const, value });

describe('a claim on a yes/no slot says the result', () => {
  it('forces a call only where the comparison does', () => {
    expect(forcedCall(atMost('0'))).toBe(0);
    expect(forcedCall(atLeast('1'))).toBe(1);
    expect(forcedCall(exactly('0'))).toBe(0);
    expect(forcedCall(exactly('1'))).toBe(1);
    // "At most 1" and "at least 0" hold for both answers: no word, the plain line stays.
    expect(forcedCall(atMost('1'))).toBeUndefined();
    expect(forcedCall(atLeast('0'))).toBeUndefined();
    expect(forcedCall(atLeast('2'))).toBeUndefined();
    expect(forcedCall(exactly('7'))).toBeUndefined();
    expect(forcedCall({ kind: 'range', bound: '0' })).toBeUndefined();
  });

  it('the run of 18 November: HLVd not detected, at most 0 and exactly 0', () => {
    const at = { schema: PATHOGEN, slot: 0 };
    expect(claimWords({ ...at, ...atMost('0') }, enT)).toBe('Not detected');
    expect(claimWords({ ...at, ...exactly('0') }, enT)).toBe('Not detected');
    expect(claimWords({ ...at, ...atLeast('1') }, enT)).toBe('Detected');
    expect(claimWords({ ...at, ...exactly('1') }, enT)).toBe('Detected');
    // The raw slot stays available for the details.
    expect(claimRawWords({ ...at, ...atMost('0') }, enT)).toBe('Detected (1 yes, 0 no) is at most 0');
    // A bound that settles nothing keeps the plain line.
    expect(claimWords({ ...at, ...atMost('1') }, enT)).toBe(claimRawWords({ ...at, ...atMost('1') }, enT));
  });

  it('every call slot of a lab result, and only those, has its words', () => {
    expect(callWordKey('pathogen.detected', atMost('0'))).toBe('app.lr.call.notDetected');
    expect(callWordKey('match.matches', exactly('1'))).toBe('app.lr.call.match');
    expect(callWordKey('lineage.consistent', exactly('0'))).toBe('app.lr.call.excluded');
    expect(callWordKey('mark.found', atLeast('1'))).toBe('app.lr.call.found');
    expect(callWordKey('viability.recovered', atMost('0'))).toBe('app.lr.call.noneRecovered');
    expect(callWordKey('viability.stage', exactly('1'))).toBe('app.lr.stage.after');
    expect(callWordKey('retraction.withdrawn', exactly('0'))).toBeUndefined();
    expect(callWordKey('potency.thcTotal', atMost('0'))).toBeUndefined();
    // Each listed path is a slot of a published form.
    const paths = Object.values(SCHEMAS).flatMap((s) => s.slots.map((x) => x.path));
    for (const p of Object.keys(CALL_WORDS)) expect(paths, p).toContain(p);
  });

  it('in every language', () => {
    const at = { schema: PATHOGEN, slot: 0, ...atMost('0') };
    const got = [appDe, appEs, appFr, appJa].map((d, i) =>
      claimWords(at, makeTranslator((['de', 'es', 'fr', 'ja'] as const)[i], d)),
    );
    expect(got).toEqual(['Nicht nachgewiesen', 'No detectado', 'Non détecté', '不検出']);
  });
});

describe('the claim page’s closing line', () => {
  const lab = (kind: string) => ({ ok: true, lab: { ok: true, signer: { kind } } });
  it('a withdrawn lab result says the lab signed it and withdrew it, never that the holder typed it', () => {
    expect(claimFooterKey(lab('retracted'))).toBe('app.claim.check.whatLabWithdrawn');
    for (const [lang, d] of [
      ['en', undefined],
      ['de', appDe],
      ['es', appEs],
      ['fr', appFr],
      ['ja', appJa],
    ] as const) {
      const tr = d ? makeTranslator(lang, d) : enT;
      const text = tr.t('app.claim.check.whatLabWithdrawn');
      expect(text, lang).not.toBe(tr.t('app.claim.check.what'));
      expect(text, lang).not.toMatch(
        /holder typed|Inhaber hat die Zahlen|titular escribió|détenteur a saisi|保有者が入力/,
      );
    }
    expect(enT.t('app.claim.check.whatLabWithdrawn')).toMatch(
      /the key above signed .* The lab has since withdrawn this result/,
    );
  });
  it('a lab still standing behind it, and a claim with no lab signature, as before', () => {
    expect(claimFooterKey(lab('bound'))).toBe('app.claim.check.whatLab');
    expect(claimFooterKey({ ok: true })).toBe('app.claim.check.what');
    expect(claimFooterKey({ ok: true, lab: { ok: false } })).toBe('app.claim.check.what');
    expect(claimFooterKey({ ok: false, lab: { ok: true, signer: { kind: 'retracted' } } })).toBe(
      'app.claim.check.what',
    );
    expect(claimFooterKey(undefined)).toBe('app.claim.check.what');
  });
});
