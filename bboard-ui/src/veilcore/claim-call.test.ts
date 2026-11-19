import { describe, expect, it } from 'vitest';
import {
  CALL_WORDS,
  callWordKey,
  claimFooterKey,
  forcedCall,
  labStands,
  labStandsOnRecord,
  labWordsFor,
} from './claim-call';
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
    // The slots are plain whole numbers on chain: "at least 1" doesn't force a 1.
    expect(forcedCall(atLeast('1'))).toBeUndefined();
    expect(forcedCall(exactly('0'))).toBe(0);
    expect(forcedCall(exactly('1'))).toBe(1);
    // "At most 1" and "at least 0" hold for both answers: no word, the plain line stays.
    expect(forcedCall(atMost('1'))).toBeUndefined();
    expect(forcedCall(atLeast('0'))).toBeUndefined();
    expect(forcedCall(atLeast('2'))).toBeUndefined();
    expect(forcedCall(exactly('7'))).toBeUndefined();
    expect(forcedCall({ kind: 'range', bound: '0' })).toBeUndefined();
  });

  it('the run of 18 November: HLVd not detected, at most 0 and exactly 0, with a lab standing behind it', () => {
    const at = { schema: PATHOGEN, slot: 0 };
    expect(claimWords({ ...at, ...atMost('0') }, enT, true)).toBe('Not detected');
    expect(claimWords({ ...at, ...exactly('0') }, enT, true)).toBe('Not detected');
    expect(claimWords({ ...at, ...exactly('1') }, enT, true)).toBe('Detected');
    expect(claimWords({ ...at, ...atLeast('1') }, enT, true)).toBe('Detected (1 yes, 0 no) is at least 1');
    // No lab standing behind it (the default): the slot and the number, whatever the comparison.
    expect(claimWords({ ...at, ...atMost('0') }, enT)).toBe('Detected (1 yes, 0 no) is at most 0');
    expect(claimWords({ ...at, ...exactly('1') }, enT, false)).toBe('Detected (1 yes, 0 no) is 1');
    // The raw slot stays available for the details.
    expect(claimRawWords({ ...at, ...atMost('0') }, enT)).toBe('Detected (1 yes, 0 no) is at most 0');
    // A bound that settles nothing keeps the plain line.
    expect(claimWords({ ...at, ...atMost('1') }, enT, true)).toBe(claimRawWords({ ...at, ...atMost('1') }, enT));
  });

  it('every call slot of a lab result, and only those, has its words', () => {
    expect(callWordKey('pathogen.detected', atMost('0'))).toBe('app.lr.call.notDetected');
    expect(callWordKey('match.matches', exactly('1'))).toBe('app.lr.call.match');
    expect(callWordKey('lineage.consistent', exactly('0'))).toBe('app.lr.call.excluded');
    expect(callWordKey('mark.found', exactly('1'))).toBe('app.lr.call.found');
    expect(callWordKey('mark.found', atLeast('1'))).toBeUndefined();
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
      claimWords(at, makeTranslator((['de', 'es', 'fr', 'ja'] as const)[i], d), true),
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
  it('a key that signs but no single lab is tied to: read as the holder’s own, never "the holder typed"', () => {
    for (const kind of ['none', 'conflict']) expect(claimFooterKey(lab(kind))).toBe('app.claim.check.whatLabUnnamed');
    for (const [lang, d] of [
      ['en', undefined],
      ['de', appDe],
      ['es', appEs],
      ['fr', appFr],
      ['ja', appJa],
    ] as const) {
      const tr = d ? makeTranslator(lang, d) : enT;
      const text = tr.t('app.claim.check.whatLabUnnamed');
      expect(text, lang).not.toMatch(
        /holder typed|Inhaber hat die Zahlen eingegeben|titular escribió|détenteur a saisi/,
      );
      expect(text, lang).toMatch(
        /holder’s own|Eingaben des Inhabers|propio titular|ceux du détenteur|保有者自身が入力したものとして扱って/,
      );
    }
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

describe('when the claim page may say the result word', () => {
  const v = (lab?: { ok: boolean; signer?: { kind: string } }) => ({ ok: true, lab });
  it('only with a lab whose signature checks, tied to its key, not withdrawn', () => {
    expect(labStands(v({ ok: true, signer: { kind: 'bound' } }))).toBe(true);
    // Checking, failed, no lab, lab check failed, unidentified, conflicting, withdrawn: never.
    expect(labStands(undefined)).toBe(false);
    expect(labStands({ ok: false, lab: { ok: true, signer: { kind: 'bound' } } })).toBe(false);
    expect(labStands(v())).toBe(false);
    expect(labStands(v({ ok: false }))).toBe(false);
    for (const kind of ['none', 'conflict', 'retracted'])
      expect(labStands(v({ ok: true, signer: { kind } })), kind).toBe(false);
    expect(labStands(v({ ok: true }))).toBe(false);
  });
});

describe('on a record’s own page, the lab’s words only where its lab stands', () => {
  it('the same rule as the check page: signature checks, one lab tied to the key, not withdrawn', () => {
    expect(labStandsOnRecord(true, { kind: 'bound' })).toBe(true);
    expect(labStandsOnRecord(true, { kind: 'none' })).toBe(false);
    expect(labStandsOnRecord(true, { kind: 'conflict' })).toBe(false);
    expect(labStandsOnRecord(true, { kind: 'retracted' })).toBe(false);
    expect(labStandsOnRecord(false, { kind: 'bound' })).toBe(false);
    // Still checking, either part: not yet.
    expect(labStandsOnRecord(undefined, { kind: 'bound' })).toBe(false);
    expect(labStandsOnRecord(true, undefined)).toBe(false);
  });

  it('only for a claim on this very record', () => {
    const here = { commitment: 'ab'.repeat(32), stands: true };
    expect(labWordsFor({ record: 'ab'.repeat(32) }, here)).toBe(true);
    expect(labWordsFor({ record: 'cd'.repeat(32) }, here)).toBe(false);
    expect(labWordsFor({ record: 'ab'.repeat(32) }, { ...here, stands: false })).toBe(false);
    expect(labWordsFor({ record: 'ab'.repeat(32) }, { commitment: undefined, stands: true })).toBe(false);
  });

  it('the mainnet test run’s line: "This proves: Not detected" before proving, with a lab standing behind it', () => {
    // docs/lab-mainnet-test.md step 7.
    expect(
      enT.t('app.claim.preview', { claim: claimWords({ schema: PATHOGEN, slot: 0, ...exactly('0') }, enT, true) }),
    ).toBe('This proves: Not detected.');
  });
});
