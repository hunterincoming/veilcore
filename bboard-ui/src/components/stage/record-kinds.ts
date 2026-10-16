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
import { enT, type Translator } from '../../i18n/translate';

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
export const LAB_REPORT_DATED_HOME = 'DNA report dated';

/** A dating record's own card on Home (its plant isn't in the list): what it is, not a plant. */
export const datingCardLine = (r: Pick<Rec, 'parents'>, tr: Translator = enT): string =>
  tr.t('app.home.datesReportFor', { name: r.parents?.[0]?.name || tr.t('app.home.aPlant') });

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

/** Home's backup warning: "A plant has", "5 plants have", or "6 records have" when they include dating records. */
export const keysOnlyHereSubject = (ids: readonly string[], records: readonly Rec[]): string => {
  const { datings } = countKinds(ids, records);
  const noun = datings > 0 ? 'record' : 'plant';
  return ids.length === 1 ? `A ${noun} has` : `${ids.length} ${noun}s have`;
};

/**
 * Home's backup warning in the visitor's language, as a whole sentence: keysOnlyHereSubject's
 * subject and the rest. `alert`: "… keys only on this device."; `reset`: "… keys with no
 * checked backup. Save your backup first: …" (the Start over question).
 */
export const keysOnlyHereLine = (
  ids: readonly string[],
  records: readonly Rec[],
  kind: 'alert' | 'reset',
  tr: Translator = enT,
): string => {
  const { datings } = countKinds(ids, records);
  const noun = datings > 0 ? 'Records' : 'Plants';
  return tr.tp(kind === 'alert' ? `app.home.keysOnlyHere${noun}` : `app.home.resetWarning${noun}`, ids.length);
};

/** The backup check's "It works." line. */
export const backupHoldsLine = (ids: readonly string[], records: readonly Rec[], tr: Translator = enT): string => {
  if (ids.length === 0) return tr.t('app.backup.holds.none');
  const { datings } = countKinds(ids, records);
  return tr.tp(datings > 0 ? 'app.backup.holds.records' : 'app.backup.holds.plants', ids.length);
};

/** "Keys for 3 plants restored." or "Keys for 4 records restored (3 plants, 1 dated lab report)." */
export const restoredKeysLine = (ids: readonly string[], records: readonly Rec[], tr: Translator = enT): string => {
  if (ids.length === 0) return '';
  const { plants, datings } = countKinds(ids, records);
  if (datings === 0) return tr.tp('app.backup.restoredPlants', plants);
  return tr.tp('app.backup.restoredRecords', ids.length, {
    plants: tr.tp('app.backup.nPlants', plants),
    datings: tr.tp('app.backup.nDatedReports', datings),
  });
};

/** What a dating record's own page says it is, one line each, from its sealed notes. */
export const labReportPageLines = (r: Pick<Rec, 'notes' | 'parents'>, tr: Translator = enT): string[] => {
  const f = parseLabReportNotes(r.notes);
  if (!f) return [];
  return [
    tr.t('app.plant.labReportSha', { sha: f.sha }),
    ...(f.resultId ? [tr.t('app.plant.labReportCode', { code: f.resultId })] : []),
    tr.t('app.plant.labAsSigned', { lab: f.lab ?? tr.t('app.plant.noLabMatched') }),
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
  tr: Translator = enT,
): { text: string; unfinished: boolean } =>
  realChain && keys && keys.backedUpAt === undefined
    ? { text: tr.t('app.home.datingUnfinished', { dated: tr.t('app.home.labReportDated') }), unfinished: true }
    : {
        text: tr.t('app.home.datingSealed', { dated: tr.t('app.home.labReportDated'), date: tr.date(d.loggedAt) }),
        unfinished: false,
      };
