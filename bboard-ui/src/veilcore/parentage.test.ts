// A laboratory's parentage result under animal-parentage/v1 (parentage.ts, docs/parentage.md):
// ICAR 2023's bands (vectors from the research prototype's rules tests), the fixed class bounds
// the panel offers and nothing rounded into "doubtful", when a link says "meets ICAR 2023
// acceptance", and the certificate's words in five languages.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ACCEPTANCE, ICAR_2023, PARENTAGE_SCHEMA, PARENTAGE_SLOT, icarBand, meetsAcceptance } from './parentage';
import { MARKER_OFFERS, isExactCount, linkClaims, offerAllowed, offersFor, unmetOffers } from './marker-claims';
import { SCHEMAS } from './field-set';
import { claimLink, claimsOf, readClaimLink, withMore, type MadeClaim } from './claim-link';
import { proveNumber, type ClaimCalls } from './prove-number';
import type { StrainRecord } from './records';
import { enT, makeTranslator } from '../i18n/translate';
import { appEn } from '../i18n/app/en';
import { appDe } from '../i18n/app/de';
import { appEs } from '../i18n/app/es';
import { appFr } from '../i18n/app/fr';
import { appJa } from '../i18n/app/ja';
import { claimRawWords, claimWords } from '../components/document/ProveNumber';

vi.mock('./chain/config', async (actual) => ({ ...(await actual<Record<string, unknown>>()), CLAIMS_READY: true }));

const REC = 'ab'.repeat(32);
const CONTRACT = 'c1'.repeat(32);

/**
 * A lab's field set: species, panel, sire compared / conflicts / outcome, dam the same, trio
 * conflicts / outcome, sire and dam registration numbers (animal-parentage-v1.json).
 */
const values = (o: {
  sireCompared?: number;
  sireConflicts?: number;
  damCompared?: number;
  damConflicts?: number;
  trioConflicts?: number;
}): (string | null)[] => {
  const { sireCompared = 190, sireConflicts = 1, damCompared = 188, damConflicts = 0, trioConflicts = 2 } = o;
  const band = (n: number, t: 'single' | 'trio') =>
    String(['accepted', 'doubtful', 'excluded'].indexOf(icarBand(BigInt(n), t)));
  return [
    '1',
    '195',
    String(sireCompared),
    String(sireConflicts),
    band(sireConflicts, 'single'),
    String(damCompared),
    String(damConflicts),
    band(damConflicts, 'single'),
    String(trioConflicts),
    band(trioConflicts, 'trio'),
    '3101234567',
    '3107654321',
    ...Array<null>(4).fill(null),
  ];
};

const claim = (over: Partial<MadeClaim>): MadeClaim => ({
  kind: 'range',
  contract: CONTRACT,
  txId: 'aa'.repeat(32),
  record: REC,
  schema: PARENTAGE_SCHEMA,
  slot: PARENTAGE_SLOT.sireConflicts,
  op: 'at-most',
  bound: '2',
  ...over,
});

/** The five acceptance claims, as the panel makes them. */
const five = (): MadeClaim[] =>
  ACCEPTANCE.map((a, i) =>
    claim({
      txId: String(i + 1)
        .padStart(2, '0')
        .repeat(32),
      slot: a.slot,
      op: a.how,
      bound: a.bound.toString(),
    }),
  );

describe('ICAR 2023 bands (the prototype’s vectors)', () => {
  it('one parent: 0-2 accepted, 3-5 doubtful, above 5 excluded', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 40].map((n) => icarBand(BigInt(n), 'single'))).toEqual([
      'accepted',
      'accepted',
      'accepted',
      'doubtful',
      'doubtful',
      'doubtful',
      'excluded',
      'excluded',
    ]);
  });

  it('the trio: 0-3 accepted, 4-7 doubtful, above 7 excluded', () => {
    expect([0, 3, 4, 7, 8].map((n) => icarBand(BigInt(n), 'trio'))).toEqual([
      'accepted',
      'accepted',
      'doubtful',
      'doubtful',
      'excluded',
    ]);
  });

  it('the minimums: 185 SNPs called per animal, 175 in common with one parent, 165 in all three of the trio', () => {
    expect(ICAR_2023.minCalledPerAnimal).toBe(185n);
    expect(ICAR_2023.minCommonSingle).toBe(175n);
    expect(ICAR_2023.minCommonTrio).toBe(165n);
  });

  it('the slots are the published form’s, and the form has no slot for the trio’s SNPs in common', () => {
    const s = SCHEMAS[PARENTAGE_SCHEMA];
    for (const [id, slot] of Object.entries(PARENTAGE_SLOT))
      expect(s.slots.find((x) => x.slot === slot)?.path, id).toBe(`parentage.${id}`);
    expect(s.slots.some((x) => /trio.*compared|common/i.test(x.path))).toBe(false);
  });
});

describe('what the panel offers on a parentage result', () => {
  it('an accepted trio: ICAR’s five class bounds, fixed, in order, and nothing else', () => {
    const o = offersFor({ schema: PARENTAGE_SCHEMA, values: values({}) });
    expect(o?.map((x) => [x.id, x.slot, x.how, x.fixed])).toEqual([
      ['sireConflicts', 3, 'at-most', 2n],
      ['damConflicts', 6, 'at-most', 2n],
      ['trioConflicts', 8, 'at-most', 3n],
      ['sireCompared', 2, 'at-least', 175n],
      ['damCompared', 5, 'at-least', 175n],
    ]);
    expect(unmetOffers({ schema: PARENTAGE_SCHEMA, values: values({}) })).toEqual([]);
  });

  it('never rounds a count into "doubtful": a sire count of 3 or 4 is not offered at all, never as "at most 5"', () => {
    for (const n of [3, 4, 5, 9]) {
      const v = values({ sireConflicts: n });
      const o = offersFor({ schema: PARENTAGE_SCHEMA, values: v });
      expect(
        o?.map((x) => x.id),
        String(n),
      ).not.toContain('sireConflicts');
      // The sire is out of the accepted band, so ICAR doesn't grade the trio: neither is offered.
      expect(unmetOffers({ schema: PARENTAGE_SCHEMA, values: v }).map((x) => [x.offer.id, x.why])).toEqual([
        ['sireConflicts', 'count'],
        ['trioConflicts', 'parents'],
      ]);
      expect(offerAllowed(PARENTAGE_SCHEMA, PARENTAGE_SLOT.sireConflicts, 'at-most', 5n)).toBe(false);
    }
    // At the edges of the accepted band: offered at 2 (single) and 3 (trio), not one above.
    expect(
      offersFor({ schema: PARENTAGE_SCHEMA, values: values({ sireConflicts: 2, trioConflicts: 3 }) }),
    ).toHaveLength(5);
    expect(
      offersFor({ schema: PARENTAGE_SCHEMA, values: values({ trioConflicts: 4 }) })?.map((x) => x.id),
    ).not.toContain('trioConflicts');
    // Too few SNPs compared: the minimum is not offered.
    expect(
      unmetOffers({ schema: PARENTAGE_SCHEMA, values: values({ damCompared: 174 }) }).map((x) => x.offer.id),
    ).toEqual(['damCompared']);
  });

  it('never "(ICAR accepted)" for a test the laboratory didn’t accept, nor the trio unless both parents are', () => {
    // The counts fit, but the lab graded the sire doubtful (it may have re-tested, or used more SNPs).
    const v = values({});
    v[4] = '1';
    const o = offersFor({ schema: PARENTAGE_SCHEMA, values: v })?.map((x) => x.id);
    expect(o).not.toContain('sireConflicts');
    expect(o).not.toContain('trioConflicts');
    expect(o).toContain('damConflicts');
    expect(unmetOffers({ schema: PARENTAGE_SCHEMA, values: v }).map((x) => [x.offer.id, x.why])).toEqual([
      ['sireConflicts', 'grade'],
      ['trioConflicts', 'parents'],
    ]);
    // Both parents accepted, the trio graded doubtful by the lab: no trio claim.
    const t = values({});
    t[9] = '1';
    expect(unmetOffers({ schema: PARENTAGE_SCHEMA, values: t }).map((x) => [x.offer.id, x.why])).toEqual([
      ['trioConflicts', 'grade'],
    ]);
    // No grade at all is not "accepted".
    const none = values({});
    none[7] = null;
    expect(offersFor({ schema: PARENTAGE_SCHEMA, values: none })?.map((x) => x.id)).not.toContain('damConflicts');
    // The compared minimums are facts about the panel: offered whenever met.
    expect(offersFor({ schema: PARENTAGE_SCHEMA, values: v })?.map((x) => x.id)).toEqual(
      expect.arrayContaining(['sireCompared', 'damCompared']),
    );
  });

  it('refuses any other bound or direction, in the call itself too', async () => {
    const ok: [number, 'at-most' | 'at-least', bigint][] = [
      [3, 'at-most', 2n],
      [6, 'at-most', 2n],
      [8, 'at-most', 3n],
      [2, 'at-least', 175n],
      [5, 'at-least', 175n],
    ];
    for (const [slot, how, b] of ok) expect(offerAllowed(PARENTAGE_SCHEMA, slot, how, b), `${slot}`).toBe(true);
    for (const [slot, how, b] of [
      [3, 'at-most', 5n], // the top of "doubtful"
      [3, 'at-most', 1n], // a tighter bound narrows the count
      [3, 'at-least', 1n], // "at least" a conflict count says nothing asked
      [2, 'at-most', 200n], // "at most" a compared count, likewise
      [2, 'at-least', 180n],
      [8, 'at-most', 7n],
      [10, 'at-most', 1n], // the sire's number: not offered
      [4, 'at-most', 0n], // the lab's grade: not offered
    ] as const)
      expect(offerAllowed(PARENTAGE_SCHEMA, slot, how, b), `${slot} ${how} ${b}`).toBe(false);
    expect(offerAllowed(PARENTAGE_SCHEMA, 3, 'exactly')).toBe(false);
    expect(offerAllowed(PARENTAGE_SCHEMA, 10, 'exactly')).toBe(false);

    const calls: ClaimCalls = {
      proveRangeOnChain: () => Promise.reject(new Error('must not be called')),
      proveValueOnChain: () => Promise.reject(new Error('must not be called')),
    };
    const record = {
      id: 'r1',
      fieldSet: { schema: PARENTAGE_SCHEMA, values: values({ sireConflicts: 1 }), fieldSecret: '00'.repeat(32) },
    } as unknown as StrainRecord;
    await expect(proveNumber(record, 3, 'at-most', 5n, { calls })).rejects.toThrow('isn’t offered');
    await expect(proveNumber(record, 3, 'exactly', 1n, { calls })).rejects.toThrow('isn’t offered');
  });

  it('a fixed class bound is not an exact count, even when the lab’s count equals it', () => {
    const v = values({ sireConflicts: 2 });
    expect(isExactCount(claim({ bound: '2' }), v)).toBe(false);
    // Any other bound equal to the count still is (another client could prove it).
    expect(isExactCount(claim({ slot: PARENTAGE_SLOT.sireCompared, op: 'at-least', bound: '190' }), v)).toBe(true);
    expect(isExactCount(claim({ kind: 'value', value: '2', op: undefined, bound: undefined }), v)).toBe(true);
  });

  it('every offer is the form’s whole-number slot and its words name ICAR’s bound', () => {
    for (const o of MARKER_OFFERS[PARENTAGE_SCHEMA]) {
      expect(SCHEMAS[PARENTAGE_SCHEMA].slots.find((x) => x.slot === o.slot)?.type).toBe('uint');
      expect(o.count).toBe(true);
      expect(o.fixed).toBeDefined();
    }
  });
});

describe('when a link says "meets five of ICAR 2023’s parentage checks"', () => {
  const checked = (cs: MadeClaim[], ok = true) => cs.map((c) => ({ ...c, ok }));

  it('all five, each checked, on one record under the parentage form', () => {
    expect(meetsAcceptance(checked(five()))).toBe(true);
    // In any order.
    expect(meetsAcceptance(checked(five().reverse()))).toBe(true);
  });

  it('not with one missing, one failed, one on another record, or on another form', () => {
    for (let i = 0; i < 5; i++) {
      const cs = five();
      expect(meetsAcceptance(checked(cs.filter((_, j) => j !== i))), `missing ${i}`).toBe(false);
      const failed = checked(cs).map((c, j) => (j === i ? { ...c, ok: false } : c));
      expect(meetsAcceptance(failed), `failed ${i}`).toBe(false);
      const moved = checked(cs).map((c, j) => (j === i && i > 0 ? { ...c, record: 'ee'.repeat(32) } : c));
      if (i > 0) expect(meetsAcceptance(moved), `moved ${i}`).toBe(false);
    }
    expect(meetsAcceptance(checked(five()).map((c) => ({ ...c, schema: 'veilcore/schema/lineage-check/v1' })))).toBe(
      false,
    );
    expect(meetsAcceptance([])).toBe(false);
  });

  it('not with a weaker bound ("at most 5" is doubtful), or the wrong direction', () => {
    const weaker = five().map((c) => (c.slot === PARENTAGE_SLOT.sireConflicts ? { ...c, bound: '5' } : c));
    expect(meetsAcceptance(checked(weaker))).toBe(false);
    const few = five().map((c) => (c.slot === PARENTAGE_SLOT.damCompared ? { ...c, bound: '100' } : c));
    expect(meetsAcceptance(checked(few))).toBe(false);
    const wrong = five().map((c) => (c.slot === PARENTAGE_SLOT.trioConflicts ? { ...c, op: 'at-least' as const } : c));
    expect(meetsAcceptance(checked(wrong))).toBe(false);
    // A stricter bound still meets it.
    const stricter = five().map((c) => (c.slot === PARENTAGE_SLOT.sireConflicts ? { ...c, bound: '0' } : c));
    expect(meetsAcceptance(checked(stricter))).toBe(true);
  });

  it('all five fit one link, and the panel puts them in it', () => {
    const [first, ...rest] = five();
    const back = readClaimLink(new URL(claimLink(withMore(first, rest), 'https://veilcore.org')).hash);
    expect(back && claimsOf(back).map((c) => [c.slot, c.op, c.bound])).toEqual(
      ACCEPTANCE.map((a) => [a.slot, a.how, a.bound.toString()]),
    );
    expect(linkClaims(rest[3], five())).toHaveLength(5);
  });
});

describe('the words', () => {
  const LANGS = { en: appEn, de: appDe, es: appEs, fr: appFr, ja: appJa };

  it('the certificate says exactly what tier A is, in English', () => {
    expect(appEn['app.parentage.cert.text']).toBe(
      'A laboratory’s signed parentage result, dated on Midnight. The holder proved, without showing the genotypes or the counts, that it meets ICAR 2023’s conflict limits and its minimum of SNPs compared with each parent. The laboratory saw the genotypes. Consistent with descent is not proof of descent. VeilCore tested nothing.',
    );
    expect(appEn['app.parentage.cert.title']).toBe('Meets five of ICAR 2023’s parentage checks');
  });

  it('says which ICAR minimums were not proved, and never that the parents share the trio’s SNPs', () => {
    for (const k of ['app.parentage.cert.bounds', 'app.parentage.limits.trioMin', 'app.parentage.bands.compared'])
      for (const n of ['185', '165']) expect(appEn[k as keyof typeof appEn], `${k} ${n}`).toContain(n);
    expect(appEn['app.parentage.cert.bounds']).toContain('Not proved');
    for (const v of Object.values(appEn).filter((v) => /ICAR|trio/.test(v)))
      expect(v).not.toMatch(/two parents (share|have in common)|parents share/);
    expect(appEn['app.parentage.cert.title']).not.toMatch(/acceptance/);
  });

  it('every parentage string in all five languages, keeping ICAR’s numbers and the limits', () => {
    const keys = Object.keys(appEn).filter((k) => k.startsWith('app.parentage.'));
    expect(keys.length).toBeGreaterThan(30);
    for (const [lang, dict] of Object.entries(LANGS)) {
      const d = dict as Record<string, string>;
      for (const k of keys) {
        expect(d[k], `${lang} ${k}`).toBeTruthy();
        // The same numbers as the English (bands, minimums, "2023"), and the same placeholders.
        const nums = (s: string) => (s.match(/\d+|\{\w+\}/g) ?? []).sort();
        expect(nums(d[k]), `${lang} ${k}`).toEqual(nums((appEn as Record<string, string>)[k]));
      }
      const cert = d['app.parentage.cert.text'];
      for (const w of ['Midnight', 'ICAR 2023', 'VeilCore']) expect(cert, `${lang} ${w}`).toContain(w);
    }
  });

  it('never says ownership, proof of a parent, or that VeilCore checked anything', () => {
    const BANNED: Record<string, RegExp> = {
      en: /\bown(s|ed|er|ership)\b|proves? (the|who|a) (sire|dam|parent)|VeilCore (checked|tested|verified|confirms?) (it|the|this|that)\b/i,
      de: /Eigentum|besitz|VeilCore hat (geprüft|bestätigt)/i,
      es: /propiedad|propietari|dueñ|posesi|tenencia|VeilCore (comprobó|verificó)/i,
      fr: /propriét|posséd|VeilCore a (vérifié|contrôlé)/i,
      ja: /所有|VeilCoreが(確認|検査)しました/,
    };
    for (const [lang, dict] of Object.entries(LANGS))
      for (const [k, v] of Object.entries(dict as Record<string, string>).filter(([k]) =>
        k.startsWith('app.parentage.'),
      ))
        expect(BANNED[lang].test(v), `${lang} ${k}: ${v}`).toBe(false);
  });

  it('a lab standing behind it: ICAR’s words for the claim; otherwise the slot and number', () => {
    const c = claim({});
    expect(claimWords(c, enT, true)).toBe('Conflicts with the sire: at most 2');
    expect(claimWords(c, enT, false)).toBe('Conflicts with the sire is at most 2');
    for (const [lang, dict] of Object.entries(LANGS)) {
      const tr = makeTranslator(lang as never, dict);
      expect(claimWords(c, tr, true), lang).toContain('2');
      expect(claimWords(c, tr, true), lang).not.toBe(claimRawWords(c, tr));
    }
  });
});

describe('the prove panel on a parentage result', () => {
  const render = async (r: Partial<StrainRecord>) => {
    const { LanguageProvider } = await import('../i18n');
    const { ProveNumber } = await import('../components/document/ProveNumber');
    vi.stubGlobal('window', {
      localStorage: { getItem: () => null, setItem: () => undefined },
      location: { search: '', origin: 'https://test.veilcore.org' },
    });
    try {
      return renderToStaticMarkup(
        React.createElement(LanguageProvider, null, React.createElement(ProveNumber, { record: r as StrainRecord })),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  };
  const record = (v: (string | null)[]): Partial<StrainRecord> => ({
    id: 'P',
    fieldSet: { schema: PARENTAGE_SCHEMA, values: v, fieldSecret: '00'.repeat(32) },
  });

  it('offers ICAR’s bound, fixed, with no box to type a bound, no rounding note and no exact-count warning', async () => {
    const html = await render(record(values({ sireConflicts: 2 })));
    expect(html).toContain('data-marker-offer="sireConflicts"');
    expect(html).toContain('data-parentage-fixed="2"');
    expect(html).not.toContain('inputmode="decimal"');
    expect(html).not.toContain('data-marker-rounded');
    expect(html).not.toContain('data-marker-exact');
    expect(html).toContain('0 to 2 conflicts is accepted, 3 to 5 is doubtful, more than 5 is excluded');
    expect(html).toContain('“at most 5” would be the top of the doubtful band');
    expect(html).toContain('data-parentage-all');
    expect(html).toContain('data-marker-limits="parentage"');
    expect(html).toContain('Consistent with descent is not proof of descent.');
    // The variety words of a plant comparison are not a parentage result's limits.
    expect(html).not.toContain('This doesn’t replace that examination.');
  });

  it('a doubtful sire: says why no claim about the sire is offered', async () => {
    const html = await render(record(values({ sireConflicts: 4 })));
    expect(html).toContain('data-parentage-unmet="sireConflicts"');
    expect(html).not.toContain('data-marker-offer="sireConflicts"');
    expect(html).toContain('data-marker-offer="damConflicts"');
  });

  it('nothing in the accepted band: the panel says so rather than showing nothing', async () => {
    const html = await render(
      record(values({ sireConflicts: 9, damConflicts: 7, trioConflicts: 12, sireCompared: 100, damCompared: 90 })),
    );
    expect(html).toContain('data-parentage-none');
    expect(html).toContain('no claim is offered');
    expect(html).not.toContain('data-prove-go');
  });
});
