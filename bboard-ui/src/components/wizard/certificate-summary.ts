// The certificate's "Download summary (JSON)": a file the holder hands to someone else.
//
// It carries the record as anyone may read it (records.ts shareableRecord: no secrets, no
// offer keys, no names given to recipients, no sharing choices) and, of its agreements, only
// how many there are. An agreement's terms (licensee, royalty, territory, extra terms, sales
// figures) and its salt stay out: the Share dialog's promise is that what isn't chosen isn't
// in the file at all, and its own file (license-certificate.ts) is the way to share them.
// SPDX-License-Identifier: Apache-2.0

import { shareableRecord, type StrainRecord } from '../../veilcore/records';
import type { License } from '../../veilcore/licenses';

export type SummaryInput = {
  readonly practice?: string;
  readonly record: StrainRecord;
  /** The record's agreements. Only their number goes in the file. */
  readonly agreements?: readonly License[];
  readonly anchored: string;
  readonly secondParty: string;
  readonly sampleCustody?: unknown;
  readonly dnaReport?: string;
  readonly labReportSaved?: string;
  readonly note: string;
  readonly now?: Date;
};

export const certificateSummary = (i: SummaryInput): Record<string, unknown> => ({
  ...(i.practice ? { practice: i.practice } : {}),
  record: shareableRecord(i.record),
  ...(i.agreements ? { agreements: i.agreements.length } : {}),
  anchored: i.anchored,
  secondParty: i.secondParty,
  // The sample sent, what the lab found on arrival, and any differences, as the certificate shows them.
  ...(i.sampleCustody ? { sampleCustody: i.sampleCustody } : {}),
  // Whether a DNA report ties the record to the plant, and that report's date (veilcore/dna-tie.ts).
  ...(i.dnaReport ? { dnaReport: i.dnaReport } : {}),
  ...(i.labReportSaved ? { labReportSaved: i.labReportSaved } : {}),
  sealedAtSource: "the sealing device's clock",
  generatedAt: (i.now ?? new Date()).toISOString(),
  note: i.note,
});
