// A breeder's own selection chain, as the lineage views show it (HeritableRights.tsx,
// LineageGraph.tsx).
//
// "Add the next generation or selection" makes chains of the breeder's own records: F1,
// then F2 with F1 as its linked parent, then F3. Two things read wrongly on such a chain:
//   - An offspring royalty in one of the breeder's own agreements is in the breeder's
//     favour, owed by whoever they license to on what that party breeds. The obligations
//     panel said it "applies to offspring declared from this cultivar: records sealed with
//     it as a parent", which is exactly what the breeder's own F2 is. So it read as a
//     royalty the breeder owes themselves. The panel now names their own next generations
//     and says the royalty is in their favour, not owed by them.
//   - A record dating a lab report (lab-report-date.ts) has the plant as its parent, but it
//     is not offspring. The family tree lists those apart, as dated lab reports.
// And "Check its ancestry" said "No unpaid obligations found in its declared ancestry (0
// generations checked)" beside "1 declared ancestor": the registry walks only links both
// holders confirmed, and none was, so nothing upstream was checked. It now says that.
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

/**
 * Under an offspring royalty on the breeder's own record: their own next generations are
 * named, and the royalty said to be in their favour. Undefined when there are none.
 */
export const ownOffspringNote = (record: Rec, all: readonly Rec[]): string | undefined => {
  const own = ownOffspringOf(record, all);
  if (!own.length) return undefined;
  return `Next generations you sealed from it yourself (${names(own)}): the royalty in your agreement is in your favour, owed by the other party on what they breed, not by you.`;
};

/**
 * On a later stage: the breeder's own records upstream that carry an offspring royalty in
 * their favour (from the breeder's own agreements), so the plant isn't read as owing it.
 */
export const upstreamOwnRoyaltyNote = (
  record: Rec,
  all: readonly Rec[],
  heritableOn: (recordId: string) => readonly { id: string }[],
): string | undefined => {
  const upstream = ownAncestorsOf(record, all).filter((a) => heritableOn(a.id).length > 0);
  if (!upstream.length) return undefined;
  const one = upstream.length === 1;
  return `${names(upstream)} upstream ${one ? 'is a record' : 'are records'} you sealed yourself, with an offspring royalty in your favour. It isn’t owed by you on this plant.`;
};

/**
 * What "Check its ancestry" says. When the registry walked no confirmed link (it walks only
 * links both holders confirmed), it says nothing upstream was checked, instead of "no
 * unpaid obligations found" beside a count of declared ancestors.
 */
export const ancestryVerdictText = (verdict: DescentVerdict, declaredParents: number): string => {
  if (!verdict.ok) return verdict.reason ?? 'The registry did not accept this record’s ancestry.';
  const n = verdict.generationsChecked ?? 0;
  if (n === 0) {
    return declaredParents > 0
      ? 'The registry reports no unpaid obligation on this record. It has no confirmed link to its parents, so nothing upstream was checked.'
      : 'The registry reports no unpaid obligation on this record. It has no declared ancestors to check.';
  }
  return `No unpaid obligations found in its declared ancestry (${n} generation${n === 1 ? '' : 's'} checked, as the registry reports).`;
};
