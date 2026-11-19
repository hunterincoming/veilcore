// Claims on a lab's genotype comparison or parentage check (marker-claims.ts; design "Route A"):
// what is offered per form, the rounded bound, what is public counted per marker panel, the
// allowlist for "differs in at least k", links carrying several claims on one record, the
// joined "M of N" line only when both checked, and the words in each state of the lab's signature.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  callPairs,
  joinedPlacement,
  markerSourceKey,
  samplesOf,
  DISTINCT_SCHEMAS,
  LINEAGE_SCHEMA,
  MARKER_OFFERS,
  MATCH_SCHEMA,
  distinctOffered,
  isExactCount,
  joinedCounts,
  linkClaims,
  offerAllowed,
  offersFor,
  panelClaims,
  roundedBound,
} from './marker-claims';
import { SCHEMAS } from './field-set';
import { CALL_SCHEMA, type LabResultStatement } from './lab-result';
import { CALL_WORDS } from './claim-call';
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

const VARIETY_SIMILARITY = 'veilcore/schema/variety-similarity/v1';
const POTENCY = 'veilcore/schema/potency/v1';
const REC = 'ab'.repeat(32);
const CONTRACT = 'c1'.repeat(32);
const OTHER = 'b2'.repeat(32);

const matchValues = (call: string, compared: string | null, differing: string | null) => [
  call,
  compared,
  differing,
  ...Array<null>(13).fill(null),
];

const claim = (over: Partial<MadeClaim>): MadeClaim => ({
  kind: 'range',
  contract: CONTRACT,
  txId: 'aa'.repeat(32),
  record: REC,
  schema: MATCH_SCHEMA,
  slot: 2,
  op: 'at-least',
  bound: '30',
  ...over,
});

const statement = (over: Partial<LabResultStatement>): LabResultStatement => ({
  format: 'veilcore/lab-result/v2',
  kind: 'match',
  subject: '11'.repeat(32),
  sampleId: 'S-1',
  accession: 'LAB-C-1',
  method: { id: 'SNP genotyping', version: '4' },
  panel: { id: 'CannSNP90', version: '2.1' },
  tested: '2026-11-10',
  ...over,
});

describe('what the panel offers, per form', () => {
  it('the schema ids are the ones lab results seal their calls under', () => {
    expect(MATCH_SCHEMA).toBe(CALL_SCHEMA.match);
    expect(LINEAGE_SCHEMA).toBe(CALL_SCHEMA.lineage);
  });

  it('a comparison: markers differing at least, markers compared at least, and the call as itself', () => {
    const o = offersFor({ schema: MATCH_SCHEMA, values: matchValues('0', '90', '31') });
    expect(o?.map((x) => [x.id, x.slot, x.how])).toEqual([
      ['differing', 2, 'at-least'],
      ['compared', 1, 'at-least'],
      ['call', 0, 'exactly'],
    ]);
  });

  it('a parentage check: the call, conflicts with each parent at most, and markers compared', () => {
    const v = ['1', '40', '0', '1', ...Array<null>(12).fill(null)];
    expect(offersFor({ schema: LINEAGE_SCHEMA, values: v })?.map((x) => [x.id, x.slot, x.how])).toEqual([
      ['call', 0, 'exactly'],
      ['conflictsFirst', 2, 'at-most'],
      ['conflictsSecond', 3, 'at-most'],
      ['compared', 1, 'at-least'],
    ]);
    // One parent named: no second-parent offer.
    const one = ['1', '40', '0', null, ...Array<null>(12).fill(null)];
    expect(offersFor({ schema: LINEAGE_SCHEMA, values: one })?.map((x) => x.id)).not.toContain('conflictsSecond');
  });

  it('only numbers the lab filled, and never "at least 0"', () => {
    expect(offersFor({ schema: MATCH_SCHEMA, values: matchValues('1', null, null) })?.map((x) => x.id)).toEqual([
      'call',
    ]);
    // A match with 0 differing: "differing at least 0" says nothing, so it isn't offered.
    expect(offersFor({ schema: MATCH_SCHEMA, values: matchValues('1', '90', '0') })?.map((x) => x.id)).toEqual([
      'compared',
      'call',
    ]);
  });

  it('nothing changes on any other form', () => {
    for (const id of Object.keys(SCHEMAS).filter((x) => x !== MATCH_SCHEMA && x !== LINEAGE_SCHEMA))
      expect(offersFor({ schema: id, values: ['1'] }), id).toBeUndefined();
    expect(offerAllowed(POTENCY, 0, 'at-most')).toBe(true);
    expect(offerAllowed(POTENCY, 0, 'exactly')).toBe(true);
  });

  it('every offer is a whole-number slot of its form, under the path its words are about', () => {
    const PATHS: Record<string, string> = {
      differing: 'match.differing',
      compared: '.compared',
      call: '',
      conflictsFirst: 'lineage.conflictsFirst',
      conflictsSecond: 'lineage.conflictsSecond',
    };
    for (const [schema, offers] of Object.entries(MARKER_OFFERS))
      for (const o of offers) {
        const s = SCHEMAS[schema].slots.find((x) => x.slot === o.slot);
        expect(s?.type, `${schema} ${o.id}`).toBe('uint');
        expect(s?.path.endsWith(PATHS[o.id]), `${schema} ${o.id}`).toBe(true);
        // A call is offered only as itself, and has its words; a count never as "exactly".
        if (o.id === 'call') expect(Object.keys(CALL_WORDS)).toContain(s?.path);
        else expect(o.how).not.toBe('exactly');
      }
  });

  it('refuses, in the call itself, a claim the form does not offer', async () => {
    const calls: ClaimCalls = {
      proveRangeOnChain: () => Promise.reject(new Error('must not be called')),
      proveValueOnChain: () => Promise.reject(new Error('must not be called')),
    };
    const record = {
      id: 'r1',
      fieldSet: { schema: MATCH_SCHEMA, values: matchValues('0', '90', '31'), fieldSecret: '00'.repeat(32) },
    } as unknown as StrainRecord;
    // "Markers differing: at most 40", the call as "at least 1", an exact count: none offered.
    for (const [slot, how] of [
      [2, 'at-most'],
      [0, 'at-least'],
      [2, 'exactly'],
      [1, 'at-most'],
    ] as const)
      await expect(proveNumber(record, slot, how, 40n, { calls })).rejects.toThrow('isn’t offered');
    expect(offerAllowed(MATCH_SCHEMA, 2, 'at-least')).toBe(true);
    expect(offerAllowed(MATCH_SCHEMA, 0, 'exactly')).toBe(true);
    expect(offerAllowed(LINEAGE_SCHEMA, 2, 'at-least')).toBe(false);
    // "At least 0" says nothing: refused, in the call too.
    expect(offerAllowed(MATCH_SCHEMA, 2, 'at-least', 0n)).toBe(false);
    expect(offerAllowed(MATCH_SCHEMA, 2, 'at-least', 1n)).toBe(true);
    await expect(proveNumber(record, 2, 'at-least', 0n, { calls })).rejects.toThrow('isn’t offered');
  });
});

describe('the bound filled in is rounded strictly away from the exact count', () => {
  it('down for "at least", to 5 below 100 and 10 from there, never below 1', () => {
    expect(roundedBound(37n, 'at-least')).toBe(35n);
    expect(roundedBound(31n, 'at-least')).toBe(30n);
    // A multiple of the step is not filled as itself.
    expect(roundedBound(35n, 'at-least')).toBe(30n);
    expect(roundedBound(90n, 'at-least')).toBe(85n);
    expect(roundedBound(100n, 'at-least')).toBe(90n);
    expect(roundedBound(127n, 'at-least')).toBe(120n);
    expect(roundedBound(3n, 'at-least')).toBe(1n);
    expect(roundedBound(1n, 'at-least')).toBe(1n);
  });

  it('up for "at most", a multiple of the step to the next one', () => {
    expect(roundedBound(0n, 'at-most')).toBe(5n);
    expect(roundedBound(1n, 'at-most')).toBe(5n);
    expect(roundedBound(5n, 'at-most')).toBe(10n);
    expect(roundedBound(100n, 'at-most')).toBe(110n);
    expect(roundedBound(101n, 'at-most')).toBe(110n);
  });

  it('always still holds, and is never the count itself except "at least 1" of 1', () => {
    for (let n = 1n; n < 400n; n++) {
      const lo = roundedBound(n, 'at-least');
      const hi = roundedBound(n, 'at-most');
      expect(lo <= n && hi > n).toBe(true);
      if (n > 1n) expect(lo < n).toBe(true);
    }
  });
});

describe('what is already public is counted per sample', () => {
  const S = '11'.repeat(32);
  const COMMIT = REC;
  const here = {
    id: 'A',
    labSignature: { record: COMMIT },
    labResult: { statement: statement({ result: { other: OTHER, matches: false } }) },
    fieldSet: { values: matchValues('0', '90', '31') },
    claims: [
      claim({ txId: '01'.repeat(32), slot: 2, bound: '30' }),
      claim({ txId: '02'.repeat(32), slot: 1, bound: '90' }),
    ],
  };
  const samePanel = {
    id: 'B',
    labSignature: { record: 'cd'.repeat(32) },
    labResult: { statement: statement({ accession: 'LAB-C-2', sampleId: 'S-2' }) },
    fieldSet: { values: matchValues('0', '90', '12') },
    claims: [claim({ txId: '03'.repeat(32), record: 'cd'.repeat(32), slot: 2, bound: '12' })],
  };
  // Another panel version, on the same sample: counts too.
  const otherPanel = {
    id: 'C',
    labResult: { statement: statement({ panel: { id: 'CannSNP90', version: '3.0' }, accession: 'LAB-C-3' }) },
    claims: [claim({ txId: '04'.repeat(32), record: 'c4'.repeat(32), slot: 2, bound: '5' })],
  };
  // This sample as the OTHER sample of someone else's comparison.
  const asOther = {
    id: 'G',
    labResult: {
      statement: statement({
        subject: '33'.repeat(32),
        accession: 'LAB-C-5',
        result: { other: S, matches: true },
      }),
    },
    claims: [claim({ txId: '07'.repeat(32), record: 'c7'.repeat(32), slot: 1, bound: '40' })],
  };
  // This sample as a parent in a parentage check.
  const asParent = {
    id: 'H',
    labResult: {
      statement: statement({
        kind: 'lineage',
        subject: '44'.repeat(32),
        accession: 'LAB-P-1',
        result: { parents: [S], consistent: true },
      }),
    },
    claims: [
      claim({
        txId: '08'.repeat(32),
        record: 'c8'.repeat(32),
        schema: LINEAGE_SCHEMA,
        slot: 2,
        op: 'at-most',
        bound: '5',
      }),
    ],
  };
  // The result's other sample, tested elsewhere: it is named by this result, so it counts.
  const otherTested = {
    id: 'I',
    labResult: { statement: statement({ subject: OTHER, accession: 'LAB-C-6' }) },
    claims: [claim({ txId: '09'.repeat(32), record: 'c9'.repeat(32), slot: 2, bound: '3' })],
  };
  const unrelated = {
    id: 'D',
    labResult: { statement: statement({ subject: '22'.repeat(32), accession: 'LAB-C-4' }) },
    claims: [claim({ txId: '05'.repeat(32), record: 'c5'.repeat(32), slot: 2, bound: '7' })],
  };
  const potency = { id: 'E', claims: [claim({ txId: '06'.repeat(32), schema: POTENCY, slot: 0 })] };

  it('every claim on any result naming one of the same samples, by any method or panel, and nothing else', () => {
    const got = panelClaims(here, [here, samePanel, otherPanel, asOther, asParent, otherTested, unrelated, potency]);
    expect(got.map((p) => [p.claim.txId.slice(0, 2), p.here, p.accession])).toEqual([
      ['01', true, 'LAB-C-1'],
      ['02', true, 'LAB-C-1'],
      ['03', false, 'LAB-C-2'],
      ['04', false, 'LAB-C-3'],
      ['07', false, 'LAB-C-5'],
      ['08', false, 'LAB-P-1'],
      ['09', false, 'LAB-C-6'],
    ]);
    // The panel is shown beside each result as detail.
    expect(got.find((p) => p.accession === 'LAB-C-3')?.panel).toBe('CannSNP90 3.0');
  });

  it('every number of this result counts, not only the one being proved', () => {
    expect(panelClaims(here, [here]).map((p) => p.claim.slot)).toEqual([2, 1]);
  });

  it('a claim is this result’s by its record commitment, not by this browser’s record id', () => {
    // Another copy of the same signed result, held here under another id: its claims are "this result", once each.
    const copy = {
      ...here,
      id: 'A2',
      claims: [
        ...here.claims,
        claim({ txId: '0a'.repeat(32), slot: 0, kind: 'value', value: '0', op: undefined, bound: undefined }),
      ],
    };
    const got = panelClaims(here, [here, copy]);
    expect(got.map((p) => [p.claim.txId.slice(0, 2), p.here])).toEqual([
      ['01', true],
      ['02', true],
      ['0a', true],
    ]);
  });

  it('marks exact counts: a bound equal to the lab’s number, or "exactly" on a count', () => {
    const got = panelClaims(here, [here, samePanel]);
    // 30 is not the lab's 31; 90 is the lab's 90; 12 is the other result's 12.
    expect(got.map((p) => p.exact)).toEqual([false, true, true]);
    expect(isExactCount(claim({ kind: 'value', value: '31', op: undefined, bound: undefined }))).toBe(true);
    // The call published as itself is not a count.
    expect(isExactCount(claim({ slot: 0, kind: 'value', value: '1', op: undefined, bound: undefined }))).toBe(false);
  });

  it('counts results where the lab’s call and a count are both public', () => {
    const call = claim({ txId: '0b'.repeat(32), slot: 0, kind: 'value', value: '0', op: undefined, bound: undefined });
    expect(callPairs(here.claims)).toBe(0);
    expect(callPairs([...here.claims, call])).toBe(1);
    // The call on one result and a count on another are not a pair.
    expect(callPairs([call, claim({ record: 'cd'.repeat(32) })])).toBe(0);
  });

  it('names every sample a result names', () => {
    expect(samplesOf(statement({ result: { other: OTHER, matches: true } }))).toEqual([S, OTHER]);
    expect(samplesOf(statement({ kind: 'pathogen' }))).toEqual([]);
  });
});

describe('"differs in at least k values" only under a form made for it', () => {
  it('is offered under no published form today', () => {
    expect(DISTINCT_SCHEMAS).toEqual([]);
    for (const id of Object.keys(SCHEMAS)) expect(distinctOffered(id), id).toBe(false);
  });

  it('the hazard the allowlist guards: the comparison forms mark their call comparable with k = 1', () => {
    for (const id of [MATCH_SCHEMA, VARIETY_SIMILARITY]) {
      const s = SCHEMAS[id] as unknown as { k: number; slots: { comparable?: boolean; path: string }[] };
      expect(s.k).toBe(1);
      expect(s.slots.some((x) => x.comparable)).toBe(true);
      expect(distinctOffered(id)).toBe(false);
    }
  });

  it('a form added to the list may not count a lab’s call as a compared value', () => {
    for (const id of DISTINCT_SCHEMAS) {
      const s = SCHEMAS[id] as unknown as { slots: { comparable?: boolean; path: string }[] };
      for (const x of s.slots) if (x.comparable) expect(Object.keys(CALL_WORDS)).not.toContain(x.path);
    }
  });
});

describe('a link with several claims on one record', () => {
  const differing = claim({ txId: '01'.repeat(32), slot: 2, bound: '30', blockHeight: 10 });
  const compared = claim({ txId: '02'.repeat(32), slot: 1, bound: '90' });
  const call = claim({ txId: '03'.repeat(32), slot: 0, kind: 'value', value: '0', op: undefined, bound: undefined });

  it('round-trips, each claim whole, the lab’s signature with the first only', () => {
    const one = withMore({ ...differing, attested: { txId: 'ef'.repeat(32), attester: '6f'.repeat(64) } }, [
      compared,
      call,
    ]);
    const back = readClaimLink(new URL(claimLink(one, 'https://veilcore.org')).hash);
    expect(back?.more).toHaveLength(2);
    const all = claimsOf(back!);
    expect(all.map((c) => [c.slot, c.kind, c.bound ?? c.value, c.record, c.contract, !!c.attested])).toEqual([
      [2, 'range', '30', REC, CONTRACT, true],
      [1, 'range', '90', REC, CONTRACT, false],
      [0, 'value', '0', REC, CONTRACT, false],
    ]);
  });

  const read = (o: Record<string, unknown>) =>
    readClaimLink(`#c=${Buffer.from(JSON.stringify({ v: 1, ...differing, ...o })).toString('base64url')}`);
  const m = { kind: 'range', txId: '02'.repeat(32), slot: 1, op: 'at-least', bound: '90' };

  it('refuses more claims on any other form, too many, the same call twice, or a slot the form lacks', () => {
    expect(read({ more: [m] })).toBeDefined();
    expect(read({ schema: POTENCY, slot: 0, more: [m] })).toBeUndefined();
    expect(read({ schema: VARIETY_SIMILARITY, more: [m] })).toBeUndefined();
    expect(read({ more: [] })).toBeUndefined();
    expect(
      read({ more: [1, 2, 3, 4, 5].map((i) => ({ ...m, txId: String(i).padStart(2, '0').repeat(32) })) }),
    ).toBeUndefined();
    expect(read({ more: [{ ...m, txId: differing.txId }] })).toBeUndefined();
    expect(read({ more: [m, m] })).toBeUndefined();
    expect(read({ more: [{ ...m, slot: 9 }] })).toBeUndefined();
    expect(read({ more: [{ ...m, bound: '-1' }] })).toBeUndefined();
    // One claim per number: a second claim on the first's number, or two on one number, is refused.
    expect(read({ more: [{ ...m, slot: 2 }] })).toBeUndefined();
    expect(read({ more: [m, { ...m, txId: '09'.repeat(32), bound: '80' }] })).toBeUndefined();
    // A further claim can't name its own record, schema or contract: they are the first's.
    const odd = read({ more: [{ ...m, record: 'ee'.repeat(32), schema: POTENCY, contract: 'dd'.repeat(32) }] });
    expect(claimsOf(odd!)[1]).toMatchObject({ record: REC, schema: MATCH_SCHEMA, contract: CONTRACT });
  });

  it('withMore refuses claims on another record, form or contract', () => {
    expect(() => withMore(differing, [{ ...compared, record: 'ee'.repeat(32) }])).toThrow();
    expect(() => withMore(differing, [{ ...compared, contract: 'dd'.repeat(32) }])).toThrow();
    expect(() => withMore(differing, [{ ...compared, slot: 2 }])).toThrow();
  });

  it('the panel puts the newest claim on each number in one link, same record and contract', () => {
    const older = claim({ txId: '04'.repeat(32), slot: 2, bound: '25' });
    const elsewhere = claim({ txId: '05'.repeat(32), slot: 1, contract: 'dd'.repeat(32) });
    expect(linkClaims(call, [older, differing, compared, elsewhere, call]).map((c) => c.txId.slice(0, 2))).toEqual([
      '03',
      '02',
      '01',
    ]);
  });
});

describe('"M of N compared" only when both claims checked, on the same record', () => {
  const d = { ...claim({ slot: 2, bound: '6' }), ok: true };
  const n = { ...claim({ txId: '02'.repeat(32), slot: 1, bound: '40' }), ok: true };

  it('joins a checked count with checked "markers compared"', () => {
    expect(joinedCounts([d, n])).toEqual({ key: 'app.marker.joined.differing', m: '6', n: '40', parts: [0, 1] });
    expect(enT.t('app.marker.joined.differing', { m: '6', n: '40' })).toBe(
      'Markers differing: at least 6 of at least 40 compared',
    );
  });

  it('not when either failed, is missing, or is on another record', () => {
    expect(joinedCounts([{ ...d, ok: false }, n])).toBeUndefined();
    expect(joinedCounts([d, { ...n, ok: false }])).toBeUndefined();
    expect(joinedCounts([d])).toBeUndefined();
    expect(joinedCounts([d, { ...n, record: 'ee'.repeat(32) }])).toBeUndefined();
    // "Markers compared: at most 40" is not a count of compared markers to join with.
    expect(joinedCounts([d, { ...n, op: 'at-most' }])).toBeUndefined();
  });

  it('a parentage check joins conflicts with markers compared', () => {
    const c = { ...claim({ schema: LINEAGE_SCHEMA, slot: 2, op: 'at-most', bound: '0' }), ok: true };
    const k = { ...claim({ schema: LINEAGE_SCHEMA, txId: '02'.repeat(32), slot: 1, bound: '40' }), ok: true };
    expect(joinedCounts([c, k])).toEqual({ key: 'app.marker.joined.conflictsFirst', m: '0', n: '40', parts: [0, 1] });
  });

  const call = {
    ...claim({ txId: '03'.repeat(32), slot: 0, kind: 'value', value: '0', op: undefined, bound: undefined }),
    ok: true,
  };

  it('in the headline only when the link’s first claim is one of the two; else under "Also in this link"', () => {
    expect(joinedPlacement([d, n], true)?.where).toBe('headline');
    expect(joinedPlacement([n, d], true)?.where).toBe('headline');
    // The call first (the newest claim made): the call stays the headline.
    expect(joinedPlacement([call, d, n], true)).toMatchObject({ where: 'more', m: '6', n: '40' });
    // Only the two joined decide it: the call failing doesn't stop it, either of the two does.
    expect(joinedPlacement([{ ...call, ok: false }, d, n], true)?.where).toBe('more');
    expect(joinedPlacement([call, { ...d, ok: false }, n], true)).toBeUndefined();
  });

  it('nowhere unless a laboratory stands behind the numbers', () => {
    expect(joinedPlacement([d, n], false)).toBeUndefined();
    expect(joinedPlacement([call, d, n], false)).toBeUndefined();
  });
});

describe('whose numbers the check page says they are, in each state', () => {
  const lab = (signer?: { kind: string }) => ({ ok: true, lab: { ok: true, ...(signer ? { signer } : {}) } });
  it('follows the footer’s states, and says a count or a call', () => {
    expect(markerSourceKey(undefined, true)).toBe('app.marker.source.checking');
    expect(markerSourceKey({ ok: false }, true)).toBe('app.marker.source.holder');
    expect(markerSourceKey({ ok: true }, true)).toBe('app.marker.source.holder');
    expect(markerSourceKey({ ok: true, lab: { ok: false } }, true)).toBe('app.marker.source.holder');
    expect(markerSourceKey(lab({ kind: 'none' }), true)).toBe('app.marker.source.unnamed');
    expect(markerSourceKey(lab({ kind: 'conflict' }), true)).toBe('app.marker.source.unnamed');
    expect(markerSourceKey(lab(), true)).toBe('app.marker.source.unnamed');
    expect(markerSourceKey(lab({ kind: 'retracted' }), true)).toBe('app.marker.source.withdrawn');
    expect(markerSourceKey(lab({ kind: 'bound' }), true)).toBe('app.marker.source.lab');
    expect(markerSourceKey(lab({ kind: 'bound' }), false)).toBe('app.marker.source.labCall');
  });

  it('never says no signature checks when one does, and never "count" under the call', () => {
    // A signature that checks but names no lab, or a withdrawn one, is not "no signature".
    expect(enT.t('app.marker.source.unnamed')).toContain('A key signed these numbers');
    expect(enT.t('app.marker.source.withdrawn')).toContain('withdrawn');
    expect(enT.t('app.marker.source.labCall')).toBe(
      'The laboratory’s call, from the result it signed. It is not a decision about the variety.',
    );
    expect(enT.t('app.marker.source.labCall')).not.toContain('count');
    expect(enT.t('app.marker.source.checking')).not.toMatch(/No laboratory/);
  });
});

describe('the words, in each state of the lab’s signature', () => {
  const LANGS = { en: appEn, de: appDe, es: appEs, fr: appFr, ja: appJa };
  const differing = claim({ slot: 2, bound: '30' });

  it('a lab standing behind it: the lab’s count in marker words; otherwise the slot and number', () => {
    expect(claimWords(differing, enT, true)).toBe('Markers differing: at least 30');
    expect(claimWords(differing, enT, false)).toBe('Markers that differ is at least 30');
    expect(claimWords(differing, enT)).toBe(claimRawWords(differing, enT));
    // A direction the form doesn't offer never gets the marker words.
    expect(claimWords({ ...differing, op: 'at-most' }, enT, true)).toBe('Markers that differ is at most 30');
    // The call, as before.
    const call = claim({ slot: 0, kind: 'value', value: '0', op: undefined, bound: undefined });
    expect(claimWords(call, enT, true)).toBe('Different genotype at the markers compared');
    expect(claimWords(call, enT, false)).toBe('Match (1 yes, 0 no) is 0');
  });

  it('in every language, the marker words name the number and differ from the plain line', () => {
    for (const [lang, dict] of Object.entries(LANGS)) {
      const tr = makeTranslator(lang as never, dict);
      const lab = claimWords(differing, tr, true);
      expect(lab, lang).toContain('30');
      expect(lab, lang).not.toBe(claimRawWords(differing, tr));
      for (const k of [
        'app.marker.source.lab',
        'app.marker.source.labCall',
        'app.marker.source.holder',
        'app.marker.source.unnamed',
        'app.marker.source.withdrawn',
        'app.marker.source.checking',
        'app.marker.limits.examine',
      ] as const)
        expect((dict as Record<string, string>)[k], `${lang} ${k}`).toBeTruthy();
    }
  });

  it('never calls a count a finding of distinctness, identity or ownership', () => {
    const BANNED =
      /\b(is|are) distinct\b|\bprove[sn]? (identity|ownership|distinct)|\bunique\b|\bsame variety\b(?! or)|replaces? (the )?examination/i;
    // Everything that says what a claim shows (the limits say what it doesn't, below).
    for (const [k, v] of Object.entries(appEn).filter(
      ([k]) => k.startsWith('app.marker.') && !k.startsWith('app.marker.limits.'),
    ))
      expect(BANNED.test(v), `${k}: ${v}`).toBe(false);
    // Distinctness is named only as the examining office's decision, which this doesn't replace.
    for (const [k, v] of Object.entries(appEn).filter(([k]) => k.startsWith('app.marker.limits.')))
      if (/distinct/i.test(v)) expect(v, k).toMatch(/Whether two varieties are distinct is for the examining office/);
    expect(appEn['app.marker.limits.examine']).toContain('This doesn’t replace that examination.');
  });

  it('in every language: no verdict words outside the limits, and distinctness only as the examining office’s', () => {
    // The word for "distinct", "identity", "unique" and "ownership" in each language.
    const VERDICT: Record<string, RegExp> = {
      en: /distinct|identity|unique|ownership/i,
      es: /distint|identidad|únic|propiedad/i,
      fr: /distinct|identité|unique|propriét/i,
      de: /unterscheidbar|identität|einzigartig|eigentum/i,
      ja: /区別|同一性|唯一|所有/,
    };
    const EXAMINER: Record<string, RegExp> = {
      en: /examining office/,
      es: /oficina examinadora/,
      fr: /office d’examen/,
      de: /Prüfstelle/,
      ja: /審査機関/,
    };
    for (const [lang, dict] of Object.entries(LANGS))
      for (const [k, v] of Object.entries(dict as Record<string, string>).filter(([k]) =>
        k.startsWith('app.marker.'),
      )) {
        if (!VERDICT[lang].test(v)) continue;
        // Only the limit that hands the decision to the examining office may use the word.
        expect(k, `${lang} ${k}: ${v}`).toBe('app.marker.limits.examine');
        expect(v, `${lang} ${k}`).toMatch(EXAMINER[lang]);
      }
  });
});

describe('the prove panel on a lab’s comparison', () => {
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
  const record: Partial<StrainRecord> = {
    id: 'A',
    fieldSet: { schema: MATCH_SCHEMA, values: matchValues('0', '90', '31'), fieldSecret: '00'.repeat(32) },
    labResult: { statement: statement({}) },
    claims: [claim({ txId: '02'.repeat(32), slot: 1, bound: '90' })],
  };

  it('offers the fixed list, fills a rounded bound, counts what is public on the panel, and states the limits', async () => {
    const html = await render(record);
    expect(html).toContain('data-marker-offer="differing"');
    expect(html).toContain('value="30"');
    expect(html).toContain('Filled in rounded down from the lab’s count of 31');
    expect(html).not.toContain('data-marker-exact');
    // The one claim already made, on this result, and that it published the exact count.
    expect(html).toContain('data-marker-panel="1"');
    expect(html).toContain('Markers compared is at least 90 (this result)');
    expect(html).toContain('Exact counts about these samples already public: 1.');
    expect(html).toContain('data-marker-limits');
    expect(html).toContain('This doesn’t replace that examination.');
    // The generic "which number / at most" pickers are not offered on this form.
    expect(html).not.toContain('It is at most…');
  });

  it('warns when the lab’s call and a count on this result would both be public', async () => {
    const call = claim({ txId: '03'.repeat(32), slot: 0, kind: 'value', value: '0', op: undefined, bound: undefined });
    expect(await render(record)).not.toContain('data-marker-pair');
    const html = await render({ ...record, claims: [call] });
    expect(html).toContain('data-marker-pair');
    expect(html).toContain('they bound the count from both sides');
    const both = await render({ ...record, claims: [call, claim({ txId: '04'.repeat(32), slot: 1, bound: '85' })] });
    expect(both).toContain('Results with both the lab’s call and a count public: 1.');
  });

  it('says claims in the holder’s words, whatever signature the record carries', async () => {
    const call = claim({ txId: '03'.repeat(32), slot: 0, kind: 'value', value: '0', op: undefined, bound: undefined });
    const html = await render({ ...record, claims: [call] });
    expect(html).toContain('Match (1 yes, 0 no) is 0 (this result)');
    expect(html).not.toContain('Different genotype at the markers compared (this result)');
  });

  it('a potency certificate keeps the plain panel, with no marker words or limits', async () => {
    const html = await render({
      id: 'P',
      fieldSet: { schema: POTENCY, values: ['300', ...Array<null>(15).fill(null)], fieldSecret: '00'.repeat(32) },
    });
    expect(html).toContain('data-prove-number');
    expect(html).not.toContain('data-marker-');
  });
});
