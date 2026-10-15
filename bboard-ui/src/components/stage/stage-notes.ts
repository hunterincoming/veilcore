// "Add the next generation or selection": what the next stage's record says, written into
// the fields a record already has (product-ideas.md item 1).
//
// A breeding history is a chain of records: each stage is its own record, with the stage
// before it as its linked parent, sealed when it happens. There are no stage fields yet,
// so the two answers go into the notes, one line each, in a form that can be read back
// (veilcore/breeding-history/notes.ts parseStageNotes reads the same lines):
//
//   Stage: F3
//   Selected for: tight internodes, early finish
//
//   <anything else the breeder wrote>
//
// Kept apart from the components so the tests load it without the UI library.
// SPDX-License-Identifier: Apache-2.0

import type { StrainRecord } from '../../veilcore/records';
import { isLabReportRecord } from './lab-report-notes';

export const STAGE_PROMPT = 'What stage is this? (e.g. F3, second clone run)';
export const SELECTED_PROMPT = 'What did you select for?';

/** Said on the first screen of a next stage, plainly, before anything is typed. */
export const SEAL_EACH_STAGE =
  'A record dates nothing earlier than the day it’s sealed. Seal each stage when it happens.';

/** One line: a line break typed into an answer would start a line of its own and be read as something else. */
const oneLine = (s: string | undefined): string => (s ?? '').replace(/\s*[\r\n]+\s*/g, ' ').trim();

/**
 * The notes a next stage is sealed with: "Stage:" and "Selected for:" first, one line each
 * (only the ones answered), then a blank line and the rest as written. With neither
 * answered, the notes are the breeder's own, unchanged but for trimming.
 */
export const stageNotes = (stage: string | undefined, selectedFor: string | undefined, notes: string): string => {
  const lines = [
    ...(oneLine(stage) ? [`Stage: ${oneLine(stage)}`] : []),
    ...(oneLine(selectedFor) ? [`Selected for: ${oneLine(selectedFor)}`] : []),
  ];
  const rest = notes.trim();
  if (!lines.length) return rest;
  return rest ? `${lines.join('\n')}\n\n${rest}` : lines.join('\n');
};

/**
 * Whether a plant's page offers "Add the next generation or selection": the breeder's own
 * records only. Not a record that came through a delivery (the material is someone
 * else's line), not a corrected record (the correction is the one to build on), not a
 * record that dates a lab report (it is not a plant), and not for a lab-only account.
 */
export const canAddNextStage = (
  record: Pick<
    StrainRecord,
    'receivedFrom' | 'supersededBy' | 'recordFingerprint' | 'breedingMethod' | 'notes' | 'parents'
  >,
  labOnly: boolean,
): boolean =>
  !labOnly && !record.receivedFrom && !record.supersededBy && !!record.recordFingerprint && !isLabReportRecord(record);

/** The address of the log flow, prefilled as the next stage of this record (LogFlow.tsx reads `next`). */
export const nextStagePath = (recordId: string): string => `/new?next=${encodeURIComponent(recordId)}`;
