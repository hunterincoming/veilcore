// The notes of a record that dates a lab report (lab-report-date.ts), written and read
// back, and how such a record is told apart from a plant. No UI and nothing heavy, so the
// logging flow's state and the lineage views can use it.
// SPDX-License-Identifier: Apache-2.0

import type { StrainRecord } from '../../veilcore/records';

export const LAB_REPORT_METHOD = 'Lab report';

/** The "Lab:" line when no lab signature matches the saved file. */
export const NO_LAB_SIGNATURE = 'no lab signature matches this file';

const SHA_LINE = /^Lab report SHA-256: ([0-9a-f]{64})$/;
const RESULT_LINE = /^Result: (\S+)$/;
const LAB_LINE = /^Lab: (.+)$/;

export type LabReportFacts = {
  /** The report file's SHA-256, lowercase hex: what a lab signs. */
  readonly sha: string;
  /** The lab report (registry result id) the saved file came from, when it came from one. */
  readonly resultId?: string;
  /** The lab's name as its signature carries it; absent when no lab signature matches. */
  readonly lab?: string;
};

/** The follow-up record's notes: the SHA-256, the result id and the lab, one line each. Never the report. */
export const labReportNotes = (f: LabReportFacts): string =>
  [
    `Lab report SHA-256: ${f.sha.toLowerCase()}`,
    ...(f.resultId ? [`Result: ${f.resultId.replace(/\s+/g, '')}`] : []),
    `Lab: ${(f.lab ?? NO_LAB_SIGNATURE).replace(/\s*[\r\n]+\s*/g, ' ').trim()}`,
  ].join('\n');

/** Read those notes back. Undefined for notes that don't start with the SHA-256 line. */
export const parseLabReportNotes = (notes: string | undefined): LabReportFacts | undefined => {
  if (typeof notes !== 'string') return undefined;
  const [first, ...rest] = notes.split(/\r\n|\r|\n/);
  const sha = SHA_LINE.exec(first ?? '')?.[1];
  if (!sha) return undefined;
  let resultId: string | undefined;
  let lab: string | undefined;
  for (const line of rest) {
    resultId ??= RESULT_LINE.exec(line)?.[1];
    lab ??= LAB_LINE.exec(line)?.[1];
  }
  return { sha, ...(resultId ? { resultId } : {}), ...(lab && lab !== NO_LAB_SIGNATURE ? { lab } : {}) };
};

/** A record that dates a lab report, not a plant: method "Lab report" and the notes above. */
export const isLabReportRecord = (r: Partial<Pick<StrainRecord, 'breedingMethod' | 'notes' | 'parents'>>): boolean =>
  r.breedingMethod === LAB_REPORT_METHOD && (r.parents?.length ?? 0) === 1 && !!parseLabReportNotes(r.notes);

/** The record already dating this report on this plant, if there is one (the newest, if ever two). */
export const datingRecordFor = (plantId: string, sha: string, all: readonly StrainRecord[]): StrainRecord | undefined =>
  all
    .filter(
      (r) =>
        isLabReportRecord(r) &&
        r.parents?.[0]?.recordId === plantId &&
        parseLabReportNotes(r.notes)?.sha === sha.toLowerCase(),
    )
    .sort((a, b) => b.loggedAt - a.loggedAt)[0];

/** Every record dating a lab report of this plant: the family tree shows them apart from offspring. */
export const datedReportsOf = (plantId: string, all: readonly StrainRecord[]): StrainRecord[] =>
  all.filter((r) => isLabReportRecord(r) && r.parents?.[0]?.recordId === plantId);
