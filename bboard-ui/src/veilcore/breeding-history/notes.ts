// A record's notes, read for the breeding history: the "Stage:" and "Selected for:" header
// the "Add the next generation or selection" flow writes, and the rest as written. Read
// only: the notes are sealed, so nothing here changes them.
//
// The header is read with the same function that defines how it is written
// (components/stage/stage-notes.ts parseStageHeader): the first line exactly "Stage: …"
// and/or the next exactly "Selected for: …", then a blank line. A "Stage:" anywhere else is
// the breeder's own notes, never a stage, and a value is never split: an answer of
// "F3 Selected for: vigour" is shown as exactly that (recheck 6).
// SPDX-License-Identifier: Apache-2.0

import { parseStageHeader, type StageHeader } from '../../components/stage/stage-notes';

export type StageNotes = StageHeader;

export const parseStageNotes = (notes: unknown): StageNotes => parseStageHeader(notes);
