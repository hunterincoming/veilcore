// Whether a plant's record is tied to the plant by a DNA report, and whether that report is
// dated, for the plant page, Home and the certificate (veilcore/dna-tie.ts has the words).
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react';
import { useRecords, type StrainRecord } from '../../veilcore/records';
import { attestationsFor } from '../../veilcore/attesters';
import { savedReportStatus, type SavedReport } from '../../veilcore/saved-report';
import { dnaDateOf, dnaTieOf, type DnaDate, type DnaTie } from '../../veilcore/dna-tie';
import { datingRecordFor } from '../stage/lab-report-notes';
import { useRecordDate } from '../verify/useAnchorCheck';
import { recordDateRow } from './plant-status-words';
import { enT, type Translator } from '../../i18n/translate';

/** The record that dates the DNA report saved to this plant, if one does. */
export const datingOf = (
  record: Pick<StrainRecord, 'id' | 'dnaFingerprint' | 'dnaFileSha256'>,
  saved: SavedReport | null | undefined,
  records: readonly StrainRecord[],
): StrainRecord | undefined => {
  if (!record.dnaFingerprint) return undefined;
  const sha = (saved && saved.kind !== 'none' ? saved.sha : undefined) ?? record.dnaFileSha256;
  return sha ? datingRecordFor(record.id, sha, records) : undefined;
};

/**
 * The tie and the DNA report's date. `tie` is null while the saved report is still being
 * checked (a report saved here may have been replaced or withdrawn by its lab). The date
 * is the dating record's own date row, looked up as the plant page looks up any record's.
 */
export const useDnaTie = (
  record: StrainRecord | undefined,
  saved: SavedReport | null | undefined,
  tr: Translator = enT,
): { tie: DnaTie | null; date: DnaDate; dating?: StrainRecord } => {
  const records = useRecords();
  const dating = record ? datingOf(record, saved, records) : undefined;
  const { proof, anchor } = useRecordDate(dating?.recordFingerprint);
  const date = dnaDateOf(!!dating, dating ? recordDateRow(proof, anchor, tr) : undefined);
  const tie = !record
    ? null
    : !record.dnaFingerprint
      ? ({ state: 'none' } as const)
      : saved
        ? dnaTieOf(saved, tr)
        : null;
  return { tie, date, ...(dating ? { dating } : {}) };
};

/**
 * Home: where the DNA report saved to each of these plants stands, from the signatures
 * about it checked here (a lab may have replaced or withdrawn it). Only plants with a
 * report saved are asked about, at most 40, the way Home asks about lab work.
 */
export const useSavedReports = (records: readonly StrainRecord[], enabled: boolean): Record<string, SavedReport> => {
  const [out, setOut] = useState<Record<string, SavedReport>>({});
  const mine = records.filter((r) => !r.receivedFrom && r.dnaFingerprint).slice(0, 40);
  const ids = mine.map((r) => `${r.id}:${r.dnaFingerprint}`).join(',');
  useEffect(() => {
    if (!enabled || !ids) return;
    let live = true;
    void (async () => {
      const found: Record<string, SavedReport> = {};
      for (const r of mine) {
        found[r.id] = savedReportStatus(r, [], await attestationsFor(r.recordFingerprint, { asHolder: true }));
        if (live) setOut({ ...found });
      }
    })();
    return () => {
      live = false;
    };
    // `records` changes identity on every sync; the ids and their saved reports are what matter.
  }, [ids, enabled]);
  return out;
};
