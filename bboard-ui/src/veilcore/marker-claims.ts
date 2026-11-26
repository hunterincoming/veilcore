// Claims on a laboratory's signed genotype comparison or parentage check (lab result v2, SPEC
// 11.12; "Route A" of review/marker-proofs-on-site-design.md): "markers differing: at least M",
// "markers compared: at least N", the lab's call, "conflicts with parent 1: at most …".
//
// The lab did the comparison; the holder only proves what the lab signed, one number at a time,
// with the existing range and value claims (no new circuit, no contract change). What is offered
// is a fixed list per form, so a slot can't be proved in a direction that reads wrongly ("markers
// differing: at most 40" says nothing an examiner asked), and the call is proved only as itself.
// The list is this site's policy, checked by the page and by prove-number.ts: the claims contract
// has no such rule, and another client could prove any slot in any direction.
//
// Rules from the reviews of 17 and 18 Nov 2026:
//   1. The bound offered is rounded strictly away from the exact count (down for "at least", up
//      for "at most"), and an exact bound is warned about: exact distances to known references,
//      taken together, narrow down the genotype. "At least 0" says nothing and is refused.
//   2. What is already public is counted per sample, not per number or per panel: every claim on
//      any result that names the sample (as the one tested, the other compared, or a parent), by
//      any method or panel, since each one narrows the same genotype (SPEC 4.5, disclosure
//      accounting). Claims are matched by record commitment, not by this browser's record id.
//   3. The lab's call and a count on the same result together bound the count from both sides
//      (through the lab's own threshold): warned before it happens, and counted once it has.
//   4. "Differs in at least k values" (proveDistinct) is never offered on a lab's genotype
//      comparison, parentage check or other result form: genetic-match/v1 and
//      variety-similarity/v1 mark their call slot comparable with k = 1, so a distinct claim over
//      two of them would publish only that the two calls differ. Since 26 Nov 2026 it is offered
//      (two-record-claims.ts, "Show these two records are different") only on the forms listed
//      in DISTINCT_SCHEMAS below: numbers a holder types in, never a lab's call.
//   5. "M of N compared" is said as one line only when both claims checked and are on the same
//      record (a link carries claims on one record only: claim-link.ts `more`), and in the
//      headline only when the link's first claim is one of the two.
//   6. A laboratory's parentage result under animal-parentage/v1 (parentage.ts, 20 Nov 2026) is
//      offered ICAR 2023's class bounds only, fixed, never a rounded one: rounding a count of 0 to
//      4 up gave "at most 5", the top of ICAR's doubtful band. A bound the lab's number doesn't
//      meet is not offered at all. Its conflict counts are never offered as "at least" and its
//      compared counts never as "at most", which say nothing anyone asked.
// SPDX-License-Identifier: Apache-2.0

import type { AppKey } from '../i18n/app/en';
import type { LabResultStatement } from './lab-result';
import type { HeldFieldSet } from './field-set';
import type { MadeClaim } from './claim-link';
import type { How } from './prove-number';
import { ACCEPTANCE, PARENTAGE_SCHEMA, blockedBy, meetsBound, type ParentageTest } from './parentage';

/** lab-result.ts CALL_SCHEMA.match and .lineage (named here so a claim link doesn't load lab-result.ts). */
export const MATCH_SCHEMA = 'veilcore/schema/genetic-match/v1';
export const LINEAGE_SCHEMA = 'veilcore/schema/lineage-check/v1';

/** One claim the panel offers on a result: which number, which way, and its words. */
export type MarkerOffer = {
  readonly id:
    | 'differing'
    | 'compared'
    | 'call'
    | 'conflictsFirst'
    | 'conflictsSecond'
    | 'sireConflicts'
    | 'damConflicts'
    | 'trioConflicts'
    | 'sireCompared'
    | 'damCompared';
  readonly slot: number;
  readonly how: How;
  /** A count (rounded bound, exact-count warning), or the lab's call (published as it is). */
  readonly count: boolean;
  /**
   * The only bound offered, fixed by a published rule (ICAR 2023's class bounds on a parentage
   * result): never rounded from the count, never typed. Not offered when the lab's number doesn't meet it.
   */
  readonly fixed?: bigint;
};

/** The claims offered per form, in the order shown. Nothing else is offered on these forms. */
export const MARKER_OFFERS: Readonly<Record<string, readonly MarkerOffer[]>> = {
  [MATCH_SCHEMA]: [
    { id: 'differing', slot: 2, how: 'at-least', count: true },
    { id: 'compared', slot: 1, how: 'at-least', count: true },
    { id: 'call', slot: 0, how: 'exactly', count: false },
  ],
  [LINEAGE_SCHEMA]: [
    { id: 'call', slot: 0, how: 'exactly', count: false },
    { id: 'conflictsFirst', slot: 2, how: 'at-most', count: true },
    { id: 'conflictsSecond', slot: 3, how: 'at-most', count: true },
    { id: 'compared', slot: 1, how: 'at-least', count: true },
  ],
  [PARENTAGE_SCHEMA]: ACCEPTANCE.map((a) => ({ id: a.id, slot: a.slot, how: a.how, count: true, fixed: a.bound })),
};

export const isMarkerSchema = (schema: string): boolean => Object.hasOwn(MARKER_OFFERS, schema);

/**
 * The offers for a held field set: only numbers the lab filled, and never "at least" a count of
 * 0, which says nothing. Undefined for any form that isn't a genotype comparison or parentage check.
 */
export const offersFor = (held: Pick<HeldFieldSet, 'schema' | 'values'>): readonly MarkerOffer[] | undefined => {
  const all = MARKER_OFFERS[held.schema];
  if (!all) return undefined;
  return all.filter((o) => {
    const v = held.values[o.slot];
    if (v === null || v === undefined) return false;
    // A fixed bound the lab's number doesn't meet: the claim would fail, and no other bound is offered.
    if (o.fixed !== undefined && o.how !== 'exactly' && !meetsBound(BigInt(v), o.how, o.fixed)) return false;
    // On a parentage result, never "(within ICAR’s accepted band)" for a test the lab didn't accept, nor the trio
    // unless both parents are accepted (ICAR grades the trio only then).
    if (held.schema === PARENTAGE_SCHEMA && blockedBy(o.id as ParentageTest, held.values)) return false;
    if (o.fixed !== undefined) return true;
    return !(o.how === 'at-least' && BigInt(v) === 0n);
  });
};

/**
 * The offers of a form a held result can't make, and why: the lab's number doesn't meet the
 * fixed bound (`count`), the lab graded the test as not accepted (`grade`), or the trio, with a
 * parent not accepted (`parents`).
 */
export const unmetOffers = (
  held: Pick<HeldFieldSet, 'schema' | 'values'>,
): readonly { readonly offer: MarkerOffer; readonly why: 'count' | 'grade' | 'parents' }[] => {
  const offered = offersFor(held) ?? [];
  type Unmet = { readonly offer: MarkerOffer; readonly why: 'count' | 'grade' | 'parents' };
  return (MARKER_OFFERS[held.schema] ?? []).flatMap((o): Unmet[] => {
    const v = held.values[o.slot];
    if (o.fixed === undefined || v === null || v === undefined || offered.includes(o) || o.how === 'exactly') return [];
    if (!meetsBound(BigInt(v), o.how, o.fixed)) return [{ offer: o, why: 'count' as const }];
    const b = held.schema === PARENTAGE_SCHEMA ? blockedBy(o.id as ParentageTest, held.values) : undefined;
    return b ? [{ offer: o, why: b }] : [];
  });
};

/** The offer a claim is, on a marker form; undefined when it isn't one of them. */
export const offerOf = (c: Pick<MadeClaim, 'schema' | 'slot' | 'kind' | 'op'>): MarkerOffer | undefined =>
  MARKER_OFFERS[c.schema]?.find(
    (o) => o.slot === c.slot && (o.how === 'exactly' ? c.kind === 'value' : c.kind === 'range' && c.op === o.how),
  );

/**
 * Whether a claim may be proved on this form: on a marker form, only what is offered, and never
 * "at least 0" (it says nothing). Site policy, not a contract rule (see the header).
 */
export const offerAllowed = (schema: string, slot: number, how: How, bound?: bigint): boolean => {
  const offers = MARKER_OFFERS[schema];
  if (!offers) return true;
  if (how === 'at-least' && bound === 0n) return false;
  return offers.some((o) => o.slot === slot && o.how === how && (o.fixed === undefined || bound === o.fixed));
};

/**
 * The only forms "differs in at least k values" (proveDistinct) and "a correction only changed
 * what it says" (proveUnchanged) are offered under (two-record-claims.ts): the certificates and
 * counts a holder types in. No lab result form is here (rule 4), and no form with comparable
 * marker slots and a k someone other than VeilCore set exists yet, so a marker panel isn't either.
 */
export const DISTINCT_SCHEMAS: readonly string[] = [
  'veilcore/schema/potency/v1',
  'veilcore/schema/seed-quality/v1',
  'veilcore/schema/grow-batch/v1',
  'veilcore/schema/harvest-lot/v1',
];
export const distinctOffered = (schema: string): boolean => DISTINCT_SCHEMAS.includes(schema);

/** The step a count is rounded to: 5 below 100, 10 from there. */
const stepFor = (n: bigint): bigint => (n >= 100n ? 10n : 5n);

/**
 * The bound filled in for a count: strictly away from the exact count, so the exact count is not
 * the one published ("at least 37" is filled as 35, "at least 35" as 30, "at most 3" as 5, "at
 * most 5" as 10). "At least" never goes below 1: a count of 1 can only be filled as itself.
 */
export const roundedBound = (sealed: bigint, how: 'at-least' | 'at-most'): bigint => {
  const step = stepFor(sealed);
  if (how === 'at-least') {
    if (sealed <= 0n) return 0n;
    const r = ((sealed - 1n) / step) * step;
    return r < 1n ? 1n : r;
  }
  return (sealed / step + 1n) * step;
};

/** The samples a result names, by proof code: the one tested, the other compared, the parents. */
export const samplesOf = (s: Pick<LabResultStatement, 'kind' | 'subject' | 'result'>): readonly string[] => {
  if (s.kind !== 'match' && s.kind !== 'lineage') return [];
  const r = s.result as { other?: unknown; parents?: unknown } | undefined;
  return [
    s.subject,
    ...(typeof r?.other === 'string' ? [r.other] : []),
    ...(Array.isArray(r?.parents) ? r.parents.filter((p): p is string => typeof p === 'string') : []),
  ];
};

/** The panel a result was read on, as shown beside it ("CannSNP90 2.1", or the method when no panel). */
export const panelLabel = (s: Pick<LabResultStatement, 'method' | 'panel'>): string =>
  s.panel ? `${s.panel.id} ${s.panel.version}` : `${s.method.id} ${s.method.version}`;

type Held = {
  readonly id: string;
  readonly claims?: readonly MadeClaim[];
  readonly labResult?: { readonly statement: LabResultStatement };
  readonly fieldSet?: Pick<HeldFieldSet, 'values'>;
  /** The lab's signature: its `record` is the result's record commitment. */
  readonly labSignature?: { readonly record: string };
};

/** A claim already public, and which result it is on (`here`: the result being proved from). */
export type PanelClaim = {
  readonly claim: MadeClaim;
  readonly here: boolean;
  readonly accession?: string;
  /** The panel (or method) the result was read on, shown as detail. */
  readonly panel?: string;
  /** It published a count exactly: "exactly", or a bound equal to the lab's number. */
  readonly exact: boolean;
};

/** Whether a claim published a count exactly, given the numbers its record holds. */
export const isExactCount = (
  c: Pick<MadeClaim, 'schema' | 'slot' | 'kind' | 'bound' | 'value'>,
  values?: readonly (string | null)[],
): boolean => {
  const offer = MARKER_OFFERS[c.schema]?.find((o) => o.count && o.slot === c.slot);
  if (!offer) return false;
  if (c.kind === 'value') return true;
  // A fixed class bound (ICAR's "at most 2") publishes the band, not the count, whatever the count.
  if (offer.fixed !== undefined && c.bound === offer.fixed.toString()) return false;
  const v = values?.[c.slot];
  return v !== null && v !== undefined && c.bound === v;
};

/**
 * What is already public about the samples this result names: every claim on this result (any
 * number), and on every other result this browser holds that names one of the same samples (as
 * tested, compared or parent), whatever the method or panel. A claim is this result's when it
 * names this result's record commitment. Each claim (by transaction) is counted once.
 */
export const panelClaims = (record: Held, all: readonly Held[]): readonly PanelClaim[] => {
  const mine = record.labSignature?.record;
  const isHere = (r: Held, c: MadeClaim) => (mine ? c.record === mine : r.id === record.id);
  const samples = new Set(record.labResult ? samplesOf(record.labResult.statement) : []);
  const related = all.filter(
    (r) =>
      r.id !== record.id &&
      ((mine !== undefined && r.labSignature?.record === mine) ||
        (r.labResult && samplesOf(r.labResult.statement).some((x) => samples.has(x)))),
  );
  const seen = new Set<string>();
  return [record, ...related].flatMap((r) =>
    (r.claims ?? [])
      .filter((c) => isMarkerSchema(c.schema) && !seen.has(c.txId) && (seen.add(c.txId), true))
      .map((claim) => ({
        claim,
        here: isHere(r, claim),
        ...(r.labResult
          ? { accession: r.labResult.statement.accession, panel: panelLabel(r.labResult.statement) }
          : {}),
        exact: isExactCount(claim, r.fieldSet?.values),
      })),
  );
};

/**
 * Results on which the lab's call and a count are both public, by record commitment. With the
 * lab's own threshold the call bounds the count from the other side: "no match" with "differing
 * at least 30" says the count is above the lab's cut-off and at least 30.
 */
export const callPairs = (claims: readonly Pick<MadeClaim, 'schema' | 'slot' | 'kind' | 'op' | 'record'>[]): number => {
  const by = new Map<string, { call: boolean; count: boolean }>();
  for (const c of claims) {
    const o = offerOf(c);
    if (!o) continue;
    const e = by.get(c.record) ?? { call: false, count: false };
    if (o.count) e.count = true;
    else e.call = true;
    by.set(c.record, e);
  }
  return [...by.values()].filter((e) => e.call && e.count).length;
};

/** The words of an offered claim with its number: "Markers differing: at least 6". */
export const LINE_KEYS: Readonly<Record<Exclude<MarkerOffer['id'], 'call'>, AppKey>> = {
  differing: 'app.marker.line.differing',
  compared: 'app.marker.line.compared',
  conflictsFirst: 'app.marker.line.conflictsFirst',
  conflictsSecond: 'app.marker.line.conflictsSecond',
  sireConflicts: 'app.parentage.line.sireConflicts',
  damConflicts: 'app.parentage.line.damConflicts',
  trioConflicts: 'app.parentage.line.trioConflicts',
  sireCompared: 'app.parentage.line.sireCompared',
  damCompared: 'app.parentage.line.damCompared',
};

/** The offer in the panel's list: "Markers differing: at least …". */
export const OFFER_KEYS: Readonly<Record<Exclude<MarkerOffer['id'], 'call'>, AppKey>> = {
  differing: 'app.marker.offer.differing',
  compared: 'app.marker.offer.compared',
  conflictsFirst: 'app.marker.offer.conflictsFirst',
  conflictsSecond: 'app.marker.offer.conflictsSecond',
  sireConflicts: 'app.parentage.offer.sireConflicts',
  damConflicts: 'app.parentage.offer.damConflicts',
  trioConflicts: 'app.parentage.offer.trioConflicts',
  sireCompared: 'app.parentage.offer.sireCompared',
  damCompared: 'app.parentage.offer.damCompared',
};

/** A claim as the check page reads it: what it says, and whether it checked on Midnight. */
export type CheckedClaim = Pick<MadeClaim, 'schema' | 'slot' | 'kind' | 'op' | 'bound' | 'value' | 'record'> & {
  readonly ok: boolean;
};

/**
 * "M of N compared" as one line: a count and "markers compared: at least N", both checked, on
 * the same record. Undefined otherwise, and the claims are said one by one. `parts` are the
 * indexes, in `claims`, of the two joined: only those two decide it.
 */
export const joinedCounts = (
  claims: readonly CheckedClaim[],
):
  | { readonly key: AppKey; readonly m: string; readonly n: string; readonly parts: readonly [number, number] }
  | undefined => {
  const compared = claims.findIndex((c) => c.ok && offerOf(c)?.id === 'compared' && !!c.bound);
  if (compared < 0) return undefined;
  const k = claims[compared];
  const main = claims.findIndex((c) => {
    const id = offerOf(c)?.id;
    return (
      c.ok &&
      !!c.bound &&
      c.schema === k.schema &&
      c.record === k.record &&
      (id === 'differing' || id === 'conflictsFirst' || id === 'conflictsSecond')
    );
  });
  if (main < 0) return undefined;
  const id = offerOf(claims[main])?.id;
  const key: AppKey =
    id === 'differing'
      ? 'app.marker.joined.differing'
      : id === 'conflictsFirst'
        ? 'app.marker.joined.conflictsFirst'
        : 'app.marker.joined.conflictsSecond';
  return { key, m: claims[main].bound ?? '', n: k.bound ?? '', parts: [main, compared] };
};

type SourceVerdict =
  | {
      readonly ok: boolean;
      readonly lab?: { readonly ok: boolean; readonly signer?: { readonly kind: string } };
    }
  | undefined;

/**
 * Whose numbers the check page says these are, in the same states as claim-call.ts
 * claimFooterKey: still checking; no laboratory signature that checks (or the claim itself
 * failed); a key that signs but no single lab is tied to it; a lab that withdrew the result; a
 * lab standing behind it, said as its count or as its call.
 */
export const markerSourceKey = (v: SourceVerdict, isCount: boolean): AppKey => {
  if (!v) return 'app.marker.source.checking';
  if (!v.ok || !v.lab?.ok) return 'app.marker.source.holder';
  if (v.lab.signer?.kind === 'bound') return isCount ? 'app.marker.source.lab' : 'app.marker.source.labCall';
  if (v.lab.signer?.kind === 'retracted') return 'app.marker.source.withdrawn';
  return 'app.marker.source.unnamed';
};

/**
 * Where the joined "M of N" line goes on the check page: as the headline when the link's first
 * claim is one of the two joined, else in "Also in this link"; nowhere unless a lab stands
 * behind the numbers and both checked.
 */
export const joinedPlacement = (
  claims: readonly CheckedClaim[],
  stands: boolean,
):
  | { readonly where: 'headline' | 'more'; readonly key: AppKey; readonly m: string; readonly n: string }
  | undefined => {
  if (!stands) return undefined;
  const j = joinedCounts(claims);
  if (!j) return undefined;
  return { where: j.parts.includes(0) ? 'headline' : 'more', key: j.key, m: j.m, n: j.n };
};

/**
 * The claims one link carries for a result: the newest claim on each number, on the same claims
 * contract, at most one per offer. The clicked claim comes first.
 */
export const linkClaims = (first: MadeClaim, all: readonly MadeClaim[]): readonly MadeClaim[] => {
  const out: MadeClaim[] = [first];
  for (const c of [...all].reverse()) {
    if (c.txId === first.txId || c.contract !== first.contract || c.schema !== first.schema) continue;
    if (c.record !== first.record || !offerOf(c)) continue;
    if (out.some((o) => o.slot === c.slot)) continue;
    out.push(c);
  }
  return out;
};
