// Claims on a laboratory's signed genotype comparison or parentage check (lab result v2, SPEC
// 11.12; "Route A" of review/marker-proofs-on-site-design.md): "markers differing: at least M",
// "markers compared: at least N", the lab's call, "conflicts with parent 1: at most …".
//
// The lab did the comparison; the holder only proves what the lab signed, one number at a time,
// with the existing range and value claims (no new circuit, no contract change). What is offered
// is a fixed list per form, so a slot can't be proved in a direction that reads wrongly ("markers
// differing: at most 40" says nothing an examiner asked), and the call is proved only as itself.
//
// Four rules from the review of 17 Nov 2026:
//   1. The bound offered is rounded away from the exact count (down for "at least", up for "at
//      most"), and an exact count is warned about: exact distances to known references, taken
//      together, narrow down the genotype.
//   2. What is already public is counted per marker panel, not per number: every claim on any
//      result about the same sample by the same method and panel, since each one narrows the same
//      genotype (SPEC 4.5, disclosure accounting).
//   3. "Differs in at least k values" (proveDistinct) is offered only under a form made for it:
//      an allowlist, empty today. genetic-match/v1 and variety-similarity/v1 mark their call slot
//      comparable with k = 1, so a distinct claim over two of them would publish only that the two
//      calls differ. The ids are fixed, so the guard is the list, not the forms.
//   4. "M of N compared" is said as one line only when both claims checked and are on the same
//      record (a link carries claims on one record only: claim-link.ts `more`).
// SPDX-License-Identifier: Apache-2.0

import type { AppKey } from '../i18n/app/en';
import type { LabResultStatement } from './lab-result';
import type { HeldFieldSet } from './field-set';
import type { MadeClaim } from './claim-link';
import type { How } from './prove-number';

/** lab-result.ts CALL_SCHEMA.match and .lineage (named here so a claim link doesn't load lab-result.ts). */
export const MATCH_SCHEMA = 'veilcore/schema/genetic-match/v1';
export const LINEAGE_SCHEMA = 'veilcore/schema/lineage-check/v1';

/** One claim the panel offers on a result: which number, which way, and its words. */
export type MarkerOffer = {
  readonly id: 'differing' | 'compared' | 'call' | 'conflictsFirst' | 'conflictsSecond';
  readonly slot: number;
  readonly how: How;
  /** A count (rounded bound, exact-count warning), or the lab's call (published as it is). */
  readonly count: boolean;
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
    return !(o.how === 'at-least' && BigInt(v) === 0n);
  });
};

/** The offer a claim is, on a marker form; undefined when it isn't one of them. */
export const offerOf = (c: Pick<MadeClaim, 'schema' | 'slot' | 'kind' | 'op'>): MarkerOffer | undefined =>
  MARKER_OFFERS[c.schema]?.find(
    (o) => o.slot === c.slot && (o.how === 'exactly' ? c.kind === 'value' : c.kind === 'range' && c.op === o.how),
  );

/** Whether a claim may be proved on this form: on a marker form, only what is offered. */
export const offerAllowed = (schema: string, slot: number, how: How): boolean => {
  const offers = MARKER_OFFERS[schema];
  return !offers || offers.some((o) => o.slot === slot && o.how === how);
};

/**
 * The forms a "differs in at least k values" claim (proveDistinct) may be offered under. Empty:
 * no published form has comparable marker slots and a k someone other than VeilCore set (design,
 * section 5). Adding one is a decision, not a code change: see the test.
 */
export const DISTINCT_SCHEMAS: readonly string[] = [];
export const distinctOffered = (schema: string): boolean => DISTINCT_SCHEMAS.includes(schema);

/** The step a count is rounded to: 5 below 100, 10 from there. */
const stepFor = (n: bigint): bigint => (n >= 100n ? 10n : 5n);

/**
 * The bound filled in for a count: rounded away from the exact count so the claim still holds
 * ("at least 37" is filled as 35, "at most 3" as 5). A count of 0 stays 0 for "at most" (that is
 * the claim worth making); "at least" a small count is filled as 1, never 0.
 */
export const roundedBound = (sealed: bigint, how: 'at-least' | 'at-most'): bigint => {
  const step = stepFor(sealed);
  if (how === 'at-least') {
    const r = (sealed / step) * step;
    return r === 0n && sealed > 0n ? 1n : r;
  }
  return ((sealed + step - 1n) / step) * step;
};

/** The marker panel a result was read on: the sample, the method and the panel, with versions. */
export const panelKey = (s: Pick<LabResultStatement, 'kind' | 'subject' | 'method' | 'panel'>): string | undefined =>
  s.kind === 'match' || s.kind === 'lineage'
    ? JSON.stringify([s.subject, s.method.id, s.method.version, s.panel?.id ?? '', s.panel?.version ?? ''])
    : undefined;

type Held = {
  readonly id: string;
  readonly claims?: readonly MadeClaim[];
  readonly labResult?: { readonly statement: LabResultStatement };
  readonly fieldSet?: Pick<HeldFieldSet, 'values'>;
};

/** A claim already public, and which result it is on (`here`: the result being proved from). */
export type PanelClaim = {
  readonly claim: MadeClaim;
  readonly here: boolean;
  readonly accession?: string;
  /** It published a count exactly: "exactly", or a bound equal to the lab's number. */
  readonly exact: boolean;
};

/** Whether a claim published a count exactly, given the numbers its record holds. */
export const isExactCount = (
  c: Pick<MadeClaim, 'schema' | 'slot' | 'kind' | 'bound' | 'value'>,
  values?: readonly (string | null)[],
): boolean => {
  if (!MARKER_OFFERS[c.schema]?.some((o) => o.count && o.slot === c.slot)) return false;
  if (c.kind === 'value') return true;
  const v = values?.[c.slot];
  return v !== null && v !== undefined && c.bound === v;
};

/**
 * What is already public about this sample on this marker panel: every claim on this result
 * (any number), and on every other result this browser holds about the same sample, method and
 * panel. A result without a statement counts its own claims only.
 */
export const panelClaims = (record: Held, all: readonly Held[]): readonly PanelClaim[] => {
  const key = record.labResult ? panelKey(record.labResult.statement) : undefined;
  const same = key
    ? all.filter((r) => r.id === record.id || (r.labResult && panelKey(r.labResult.statement) === key))
    : [record];
  if (!same.some((r) => r.id === record.id)) same.unshift(record);
  return same.flatMap((r) =>
    (r.claims ?? [])
      .filter((c) => isMarkerSchema(c.schema))
      .map((claim) => ({
        claim,
        here: r.id === record.id,
        ...(r.labResult ? { accession: r.labResult.statement.accession } : {}),
        exact: isExactCount(claim, r.fieldSet?.values),
      })),
  );
};

/** The words of an offered claim with its number: "Markers differing: at least 6". */
export const LINE_KEYS: Readonly<Record<Exclude<MarkerOffer['id'], 'call'>, AppKey>> = {
  differing: 'app.marker.line.differing',
  compared: 'app.marker.line.compared',
  conflictsFirst: 'app.marker.line.conflictsFirst',
  conflictsSecond: 'app.marker.line.conflictsSecond',
};

/** The offer in the panel's list: "Markers differing: at least …". */
export const OFFER_KEYS: Readonly<Record<Exclude<MarkerOffer['id'], 'call'>, AppKey>> = {
  differing: 'app.marker.offer.differing',
  compared: 'app.marker.offer.compared',
  conflictsFirst: 'app.marker.offer.conflictsFirst',
  conflictsSecond: 'app.marker.offer.conflictsSecond',
};

/** A claim as the check page reads it: what it says, and whether it checked on Midnight. */
export type CheckedClaim = Pick<MadeClaim, 'schema' | 'slot' | 'kind' | 'op' | 'bound' | 'value' | 'record'> & {
  readonly ok: boolean;
};

/**
 * "M of N compared" as one line: a count and "markers compared: at least N", both checked, on
 * the same record. Undefined otherwise, and the claims are said one by one.
 */
export const joinedCounts = (
  claims: readonly CheckedClaim[],
): { readonly key: AppKey; readonly m: string; readonly n: string } | undefined => {
  const ok = claims.filter((c) => c.ok);
  const compared = ok.find((c) => offerOf(c)?.id === 'compared');
  if (!compared?.bound) return undefined;
  const main = ok.find((c) => {
    const id = offerOf(c)?.id;
    return (
      c.schema === compared.schema &&
      c.record === compared.record &&
      (id === 'differing' || id === 'conflictsFirst' || id === 'conflictsSecond')
    );
  });
  if (!main?.bound) return undefined;
  const id = offerOf(main)?.id;
  const key: AppKey =
    id === 'differing'
      ? 'app.marker.joined.differing'
      : id === 'conflictsFirst'
        ? 'app.marker.joined.conflictsFirst'
        : 'app.marker.joined.conflictsSecond';
  return { key, m: main.bound, n: compared.bound };
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
