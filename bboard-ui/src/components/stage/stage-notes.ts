// "Add the next generation or selection": what the next stage's record says, written into
// the fields a record already has (product-ideas.md item 1).
//
// A breeding history is a chain of records: each stage is its own record, with the stage
// before it as its linked parent, sealed when it happens. There are no stage fields yet,
// so the two answers go first in the notes, as a header, then a blank line, then the rest:
//
//   Stage: F3
//   Selected for: tight internodes, early finish
//
//   <anything else the breeder wrote>
//
// Written by stageNotes and read back by parseStageHeader, here, and nowhere else
// (veilcore/breeding-history/notes.ts uses parseStageHeader). Only that header is read:
// the first line exactly "Stage: …" and/or the next exactly "Selected for: …", ended by a
// blank line or the end of the notes. "Stage:" further down, in the breeder's own notes,
// is the breeder's text, never a stage (recheck 6). Each answer is flattened to one line
// when it is written (every kind of line break becomes a space), so an answer can never
// start a line of its own, and a value is shown exactly as sealed: never split, never
// trimmed of anything but the spaces around it.
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

/**
 * One line: a line break typed into an answer would start a line of its own and be read as
 * something else. Every kind of line break, the ones a browser shows as one included.
 */
export const flattenAnswer = (s: string | undefined): string =>
  (s ?? '').replace(/\s*[\r\n\u2028\u2029\u0085\v\f]+\s*/g, ' ').trim();
const oneLine = flattenAnswer;

const STAGE_LABEL = 'Stage: ';
const SELECTED_LABEL = 'Selected for: ';

export type StageHeader = {
  /** What the breeder answered to "What stage is this?", as sealed. */
  readonly stage?: string;
  /** What the breeder answered to "What did you select for?", as sealed. */
  readonly selectedFor?: string;
  /** The notes after the header, as written (the whole notes when there is no header). */
  readonly rest: string;
};

/**
 * Read the header stageNotes writes, and only that. Anything else (no header, a header not
 * ended by a blank line, "Stage:" anywhere but the first line) is the breeder's own notes,
 * returned whole as `rest`.
 */
export const parseStageHeader = (notes: unknown): StageHeader => {
  if (typeof notes !== 'string' || !notes) return { rest: '' };
  const lines = notes.split(/\r\n|\r|\n/);
  let i = 0;
  let stage: string | undefined;
  let selectedFor: string | undefined;
  if (lines[i]?.startsWith(STAGE_LABEL)) stage = lines[i++].slice(STAGE_LABEL.length).trim();
  if (lines[i]?.startsWith(SELECTED_LABEL)) selectedFor = lines[i++].slice(SELECTED_LABEL.length).trim();
  const ended = i === lines.length || lines[i] === '';
  if (i === 0 || !ended || (!stage && !selectedFor)) return { rest: notes.trim() };
  return {
    ...(stage ? { stage } : {}),
    ...(selectedFor ? { selectedFor } : {}),
    rest: lines
      .slice(i + 1)
      .join('\n')
      .trim(),
  };
};

/**
 * The notes a next stage is sealed with: "Stage:" and "Selected for:" first, one line each
 * (only the ones answered), then a blank line and the rest as written. With neither
 * answered, the notes are the breeder's own, unchanged but for trimming.
 */
export const stageNotes = (stage: string | undefined, selectedFor: string | undefined, notes: string): string => {
  const lines = [
    ...(oneLine(stage) ? [`${STAGE_LABEL}${oneLine(stage)}`] : []),
    ...(oneLine(selectedFor) ? [`${SELECTED_LABEL}${oneLine(selectedFor)}`] : []),
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
