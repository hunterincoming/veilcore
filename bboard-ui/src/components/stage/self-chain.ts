// A breeder's own selection chain, as the lineage views show it (HeritableRights.tsx,
// LineageGraph.tsx).
//
// "Add the next generation or selection" makes chains of the breeder's own records: F1,
// then F2 with F1 as its linked parent, then F3. Two things read wrongly on such a chain:
//   - An offspring royalty in one of the breeder's own agreements: the obligations panel
//     said it "applies to offspring declared from this cultivar: records sealed with it as
//     a parent", which is exactly what the breeder's own F2 is, so it read as a royalty the
//     breeder owes themselves. Round 2 answered that with a conclusion ("in your favour,
//     owed by the other party, not by you"), which is a legal reading VeilCore can't make
//     (recheck 6). The panel now says only facts: these are the breeder's own records, the
//     agreement names its counterparty, and whether its royalty reaches the breeder's own
//     records is for the agreement's terms. The registry records obligations; it doesn't
//     judge them.
//   - A record dating a lab report (lab-report-date.ts) has the plant as its parent, but it
//     is not offspring. The family tree lists those apart, as dated lab reports.
// And "Check its ancestry" said "No unpaid obligations found in its declared ancestry (0
// generations checked)" beside "1 declared ancestor": the registry walks only links both
// holders confirmed, and none was, so nothing upstream was checked. It now says that, and
// on a self-chain it names the breeder's own agreements the obligation would come from.
//
// Kept apart from the components so the tests load it without the UI library.
// SPDX-License-Identifier: Apache-2.0

import type { StrainRecord } from '../../veilcore/records';
import type { DescentVerdict } from '../../veilcore/lineage';
import { isLabReportRecord } from './lab-report-notes';

type Rec = Pick<StrainRecord, 'id' | 'strainName' | 'parents' | 'receivedFrom' | 'breedingMethod' | 'notes'>;

/** A record this browser's holder sealed themselves: not one that came through a delivery. */
const sealedHere = (r: Rec): boolean => !r.receivedFrom;

/** Records sealed with this one as a linked parent, lab report dating records left out. */
export const offspringOf = <R extends Rec>(id: string, all: readonly R[]): R[] =>
  all.filter((r) => !isLabReportRecord(r) && (r.parents ?? []).some((p) => p.recordId === id));

/** The breeder's own next generations from this record (in their set, sealed by them). */
export const ownOffspringOf = <R extends Rec>(record: Rec, all: readonly R[]): R[] =>
  sealedHere(record) ? offspringOf(record.id, all).filter(sealedHere) : [];

/**
 * The breeder's own records upstream of this one, nearest first: linked parents in their
 * set that they sealed themselves, and those records' own such parents. Stops at a record
 * that came through a delivery (that line is someone else's) and never loops.
 */
export const ownAncestorsOf = <R extends Rec>(record: Rec, all: readonly R[]): R[] => {
  if (!sealedHere(record)) return [];
  const byId = new Map(all.map((r) => [r.id, r]));
  const out: R[] = [];
  const seen = new Set([record.id]);
  let level: Rec[] = [record];
  while (level.length && out.length < 500) {
    const next: R[] = [];
    for (const r of level) {
      for (const p of r.parents ?? []) {
        if (!p.recordId || seen.has(p.recordId)) continue;
        seen.add(p.recordId);
        const parent = byId.get(p.recordId);
        if (parent && sealedHere(parent) && !isLabReportRecord(parent)) next.push(parent);
      }
    }
    out.push(...next);
    level = next;
  }
  return out;
};

const names = (rs: readonly Pick<Rec, 'strainName'>[]): string => {
  const shown = rs.slice(0, 3).map((r) => r.strainName);
  return rs.length > 3 ? `${shown.join(', ')} and ${rs.length - 3} more` : shown.join(', ');
};

/** An agreement as these notes need it: its id and the counterparty it names. */
export type AgreementRef = { readonly id: string; readonly terms: { readonly licensee: string } };

const andList = (xs: readonly string[]): string =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

/**
 * "The agreement on this plant names Test Grower; whether its royalty applies to your own
 * records is a question for the agreement’s terms, not something VeilCore decides."
 */
const agreementsSentence = (where: string, ls: readonly AgreementRef[]): string => {
  const parties = [...new Set(ls.map((l) => l.terms.licensee.trim() || 'no counterparty'))];
  const many = ls.length > 1;
  return `The agreement${many ? 's' : ''} on ${where} name${many ? '' : 's'} ${andList(parties)}; whether ${
    many ? 'their royalties apply' : 'its royalty applies'
  } to your own records is a question for the agreement${many ? 's’' : '’s'} terms, not something VeilCore decides.`;
};

/** Said wherever the registry's obligations come up on a self-chain. */
export const RECORDS_NOT_JUDGES = 'The registry records obligations; it doesn’t judge who owes them.';

/**
 * Under an offspring royalty on the breeder's own record: their own next generations are
 * named, and the agreement's counterparty, as facts. Undefined when there are none.
 */
export const ownOffspringNote = (
  record: Rec,
  all: readonly Rec[],
  agreements: readonly AgreementRef[],
): string | undefined => {
  const own = ownOffspringOf(record, all);
  if (!own.length || !agreements.length) return undefined;
  return `${own.length === 1 ? 'This next generation is your own record' : 'These next generations are your own records'}: ${names(own)}. ${agreementsSentence('this plant', agreements)}`;
};

/** The breeder's own records upstream of this one that carry an agreement with an offspring royalty. */
export const upstreamOwnRoyalties = <R extends Rec>(
  record: Rec,
  all: readonly R[],
  heritableOn: (recordId: string) => readonly AgreementRef[],
): { record: R; agreements: readonly AgreementRef[] }[] =>
  ownAncestorsOf(record, all)
    .map((a) => ({ record: a, agreements: heritableOn(a.id) }))
    .filter((x) => x.agreements.length > 0);

/**
 * On a later stage: the breeder's own records upstream that carry an offspring royalty, and
 * what the agreement names, as facts. Undefined when there are none.
 */
export const upstreamOwnRoyaltyNote = (
  record: Rec,
  all: readonly Rec[],
  heritableOn: (recordId: string) => readonly AgreementRef[],
): string | undefined => {
  const upstream = upstreamOwnRoyalties(record, all, heritableOn);
  if (!upstream.length) return undefined;
  const one = upstream.length === 1;
  const recs = upstream.map((u) => u.record);
  return `${names(recs)} upstream ${one ? 'is your own record' : 'are your own records'}, with an offspring royalty in an agreement. ${agreementsSentence(
    one ? names(recs) : 'them',
    upstream.flatMap((u) => u.agreements),
  )}`;
};

/**
 * What "Check its ancestry" says. When the registry walked no confirmed link (it walks only
 * links both holders confirmed), it says nothing upstream was checked, instead of "no
 * obligations found" beside a count of declared ancestors. On a self-chain (`own`: the
 * breeder's own agreements with an offspring royalty, on this record or upstream) it names
 * them, and says the registry records obligations and doesn't judge them.
 */
export const ancestryVerdictText = (
  verdict: DescentVerdict,
  declaredParents: number,
  own: readonly { name: string; agreements: readonly AgreementRef[] }[] = [],
): string => {
  const ownWords = own.length
    ? ` Your own agreements with an offspring royalty on this line: ${own
        .map((o) => `${o.agreements.map((a) => a.id).join(', ')} on ${o.name}`)
        .join('; ')}. ${RECORDS_NOT_JUDGES}`
    : '';
  if (!verdict.ok) {
    const reason = verdict.reason ?? 'The registry did not accept this record’s ancestry.';
    return ownWords ? `${reason}${/[.!?]$/.test(reason) ? '' : '.'}${ownWords}` : reason;
  }
  const n = verdict.generationsChecked ?? 0;
  if (n === 0) {
    return (
      (declaredParents > 0
        ? 'The registry reports no obligation in force on this record. It has no confirmed link to its parents, so nothing upstream was checked.'
        : 'The registry reports no obligation in force on this record. It has no declared ancestors to check.') +
      ownWords
    );
  }
  return `No obligation in force found in its declared ancestry (${n} generation${n === 1 ? '' : 's'} checked, as the registry reports).${ownWords}`;
};
