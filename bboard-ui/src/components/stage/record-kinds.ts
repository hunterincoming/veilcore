// Plants and the records that date a lab report, told apart everywhere with one test
// (lab-report-notes.ts isLabReportRecord).
//
// A record that dates a lab report (lab-report-date.ts) is a record with its own key, but not
// a plant. Recheck 6 found it treated as one: listed on Home as a plant, counted as a plant
// in "5 plants have keys only on this device" and "Keys for N plants restored", offered as a
// parent when logging, and its own page offered a certificate, sending to a lab, licensing,
// saving a lab report and dating one. These are the words and lists those places use now.
//
// Kept apart from the components so the tests load it without the UI library.
// SPDX-License-Identifier: Apache-2.0

import type { ParentRef, StrainRecord } from '../../veilcore/records';
import { isLabReportRecord, parseLabReportNotes } from './lab-report-notes';

type Rec = Pick<StrainRecord, 'id' | 'strainName' | 'breedingMethod' | 'notes' | 'parents'>;

export { isLabReportRecord };

/**
 * Home's list: plants as cards, and each plant's dating records under it. A dating record
 * whose plant isn't in this set (another holder's, or not loaded) gets a card of its own, so
 * it is never hidden.
 */
export const homeList = <R extends Rec>(records: readonly R[]): { cards: R[]; datingsOf: ReadonlyMap<string, R[]> } => {
  const ids = new Set(records.filter((r) => !isLabReportRecord(r)).map((r) => r.id));
  const datingsOf = new Map<string, R[]>();
  const cards: R[] = [];
  for (const r of records) {
    const plant = isLabReportRecord(r) ? r.parents?.[0]?.recordId : undefined;
    if (plant && ids.has(plant)) datingsOf.set(plant, [...(datingsOf.get(plant) ?? []), r]);
    else cards.push(r);
  }
  return { cards, datingsOf };
};

/** The line under a plant's card for each record dating one of its lab reports. */
export const LAB_REPORT_DATED_HOME = 'Lab report dated';

/** A dating record's own card on Home (its plant isn't in the list): what it is, not a plant. */
export const datingCardLine = (r: Pick<Rec, 'parents'>): string =>
  `Dates a lab report for ${r.parents?.[0]?.name || 'a plant'}`;

/** Parents a new plant can be logged with: plants only, never a record that dates a lab report. */
export const parentOptionsOf = (records: readonly Rec[]): ParentRef[] =>
  records.filter((r) => !isLabReportRecord(r)).map((r) => ({ recordId: r.id, name: r.strainName }));

/** How many of these record ids are plants and how many date a lab report (unknown ids count as plants). */
export const countKinds = (ids: readonly string[], records: readonly Rec[]): { plants: number; datings: number } => {
  const byId = new Map(records.map((r) => [r.id, r]));
  let datings = 0;
  for (const id of ids) {
    const r = byId.get(id);
    if (r && isLabReportRecord(r)) datings++;
  }
  return { plants: ids.length - datings, datings };
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Home's backup warning: "A plant has", "5 plants have", or "6 records have" when they include dating records. */
export const keysOnlyHereSubject = (ids: readonly string[], records: readonly Rec[]): string => {
  const { datings } = countKinds(ids, records);
  const noun = datings > 0 ? 'record' : 'plant';
  return ids.length === 1 ? `A ${noun} has` : `${ids.length} ${noun}s have`;
};

/** The backup check's "It works." line. */
export const backupHoldsLine = (ids: readonly string[], records: readonly Rec[]): string => {
  if (ids.length === 0) return 'Your records are in it.';
  const { datings } = countKinds(ids, records);
  if (datings > 0) return ids.length === 1 ? 'Your record is in it.' : `All ${ids.length} of your records are in it.`;
  return ids.length === 1 ? 'Your plant is in it.' : `All ${ids.length} of your plants are in it.`;
};

/** "Keys for 3 plants restored." or "Keys for 4 records restored (3 plants, 1 dated lab report)." */
export const restoredKeysLine = (ids: readonly string[], records: readonly Rec[]): string => {
  if (ids.length === 0) return '';
  const { plants, datings } = countKinds(ids, records);
  if (datings === 0) return `Keys for ${plural(plants, 'plant', 'plants')} restored.`;
  return `Keys for ${plural(ids.length, 'record', 'records')} restored (${plural(plants, 'plant', 'plants')}, ${plural(datings, 'dated lab report', 'dated lab reports')}).`;
};

/** What a dating record's own page says it is, one line each, from its sealed notes. */
export const labReportPageLines = (r: Pick<Rec, 'notes' | 'parents'>): string[] => {
  const f = parseLabReportNotes(r.notes);
  if (!f) return [];
  return [
    `Lab report SHA-256: ${f.sha}`,
    ...(f.resultId ? [`Lab report code: ${f.resultId}`] : []),
    `Lab, as signed: ${f.lab ?? 'no lab signature matched the saved file'}`,
  ];
};

/**
 * A dating record's line on Home: only a missing backup is "not finished". Its key isn't
 * date stamped and doesn't need to be: its batch is what dates the report.
 */
export const datingHomeStatus = (
  d: Pick<StrainRecord, 'loggedAt'>,
  keys: { backedUpAt?: number } | undefined,
  realChain: boolean,
): { text: string; unfinished: boolean } =>
  realChain && keys && keys.backedUpAt === undefined
    ? { text: `${LAB_REPORT_DATED_HOME} · not finished · next: save your backup`, unfinished: true }
    : { text: `${LAB_REPORT_DATED_HOME} · sealed ${new Date(d.loggedAt).toLocaleDateString()}`, unfinished: false };
