// "Date this lab report" (product-ideas.md item 3): a small follow-up record that dates a
// saved lab report's existence without showing the report.
//
// A lab report saved to a plant is a note beside the sealed record, not part of it, so the
// batch that dates the plant does not date the report. This seals one more record, with the
// plant as its parent and method "Lab report", whose notes hold only the report file's
// SHA-256, the lab report's code and the lab's name as signed:
//
//   Lab report SHA-256: <64 hex>
//   Result: LR-…
//   Lab: <the name as signed>
//
// That record is batch-dated like any other, which dates the report's existence. The report
// itself never leaves the breeder: anyone later shown the file can hash it and match.
// One record per report: asking again for the same plant and file gives the same record.
//
// Kept apart from the components so the tests load it without the UI library. The notes
// themselves are written and read in lab-report-notes.ts.
// SPDX-License-Identifier: Apache-2.0

import type { ParentRef, StrainRecord } from '../../veilcore/records';
import { LAB_REPORT_METHOD, datingRecordFor, labReportNotes, type LabReportFacts } from './lab-report-notes';
import type { SealInput, SealedRecord } from '../../veilcore/seal-record';
import type { SavedReport } from '../../veilcore/saved-report';
import { signerLabel } from '../../veilcore/attesters';
import { shortResultId } from '../../veilcore/lab-results';
import type { RowMark } from '../flow/plant-status-words';

const HEX64 = /^[0-9a-f]{64}$/;

/** Why, in one line, beside the button and the status. */
export const DATE_REPORT_WHY = 'So you can show this report existed by that date without showing anyone the markers.';

/**
 * What would be dated for the report saved to this plant, or nothing. Only a report that
 * stands: one the lab signed, or one the breeder saved themselves (said so in the "Lab:"
 * line). A report the lab replaced or withdrew is not offered, and an old pairing saved
 * before its SHA-256 was kept can't be dated: there is no SHA-256 to seal.
 */
export const labReportFacts = (
  record: Pick<StrainRecord, 'dnaFingerprint' | 'dnaResultId' | 'receivedFrom'>,
  saved: SavedReport | null | undefined,
): LabReportFacts | undefined => {
  if (!saved || record.receivedFrom || !record.dnaFingerprint) return undefined;
  if (saved.kind === 'lab') {
    const resultId = saved.resultId ?? record.dnaResultId;
    return {
      sha: saved.sha.toLowerCase(),
      ...(resultId ? { resultId } : {}),
      lab: signerLabel(saved.signed, '').who,
    };
  }
  if (saved.kind === 'self' && saved.sha && HEX64.test(saved.sha.toLowerCase())) {
    return { sha: saved.sha.toLowerCase(), ...(record.dnaResultId ? { resultId: record.dnaResultId } : {}) };
  }
  return undefined;
};

/** "Harbour Mist — lab report LR-3F2A" (or the SHA-256's first 8 when it came from no lab report). */
export const labReportRecordName = (plantName: string, f: LabReportFacts): string =>
  `${plantName} — lab report ${f.resultId ? shortResultId(f.resultId) : f.sha.slice(0, 8)}`;

/** What the follow-up record is sealed as (seal-record.ts sealRecord). */
export const labReportSealInput = (
  plant: Pick<StrainRecord, 'id' | 'strainName' | 'bredBy' | 'taxon'>,
  f: LabReportFacts,
  today: string,
): SealInput => {
  const parent: ParentRef = { recordId: plant.id, name: plant.strainName };
  return {
    strainName: labReportRecordName(plant.strainName, f),
    bredBy: plant.bredBy,
    dateCreated: today,
    notes: labReportNotes(f),
    parents: [parent],
    breedingMethod: LAB_REPORT_METHOD,
    photoFingerprints: [],
    refId: '',
    taxon: plant.taxon ?? '',
  };
};

/**
 * The plant page's line: "Lab report dated: in VEIL-… (waiting for a batch)", or "(dated
 * 2026-10-11 UTC — checked on Midnight)" once its batch is dated. The words in brackets are
 * the record's own date row (plant-status-words.ts recordDateRow), never made up here.
 */
export const labReportDatedLine = (recordId: string, row: { mark: RowMark; value: string }): string =>
  `Lab report dated: in ${recordId} (${row.mark === 'done' || row.mark === 'reported' ? `dated ${row.value}` : row.value})`;

// --- sealing it once ---------------------------------------------------------------------

export type DateLabReportDeps = {
  all: () => readonly StrainRecord[];
  seal: (input: SealInput) => Promise<SealedRecord>;
  create: (sealed: SealedRecord) => StrainRecord;
  /** Forget the keys made for a record that was sealed but never saved (as LogFlow.tsx does). */
  forget: (id: string) => void;
  today: () => string;
};

const inFlight = new Map<string, Promise<StrainRecord>>();

/**
 * Seal the follow-up record for this plant's report, once. A record already dating the same
 * report on the same plant is returned instead of a second one, and a second tap (or the
 * other button, on the lab reports screen) while the first is sealing waits for the same one.
 */
export const dateLabReportWith = async (
  deps: DateLabReportDeps,
  plant: Pick<StrainRecord, 'id' | 'strainName' | 'bredBy' | 'taxon'>,
  f: LabReportFacts,
): Promise<StrainRecord> => {
  const existing = datingRecordFor(plant.id, f.sha, deps.all());
  if (existing) return existing;
  const key = `${plant.id}:${f.sha.toLowerCase()}`;
  const pending = inFlight.get(key);
  if (pending) return pending;
  const run = (async () => {
    const sealed = await deps.seal(labReportSealInput(plant, f, deps.today()));
    try {
      return deps.create(sealed);
    } catch (e) {
      deps.forget(sealed.id);
      throw e;
    }
  })();
  inFlight.set(key, run);
  try {
    return await run;
  } finally {
    inFlight.delete(key);
  }
};

export {
  LAB_REPORT_METHOD,
  NO_LAB_SIGNATURE,
  datedReportsOf,
  datingRecordFor,
  isLabReportRecord,
  labReportNotes,
  parseLabReportNotes,
  type LabReportFacts,
} from './lab-report-notes';
