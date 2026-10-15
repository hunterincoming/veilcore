// A record's notes, read for the breeding history: the "Stage:" and "Selected for:" lines
// the "Seal the next stage" flow writes into the notes (one line each), and the rest as
// written. Read only: the notes are sealed, so nothing here changes them.
// SPDX-License-Identifier: Apache-2.0

export type StageNotes = {
  /** "F3", "second clone run": what the breeder wrote after "Stage:". */
  readonly stage?: string;
  /** What the breeder wrote after "Selected for:". */
  readonly selectedFor?: string;
  /** Every other line, as written. */
  readonly rest: string;
};

// A line may start with a list mark; the label is matched in any case.
const STAGE = /^\s*(?:[-*•]\s*)?stage\s*:\s*(.*)$/i;
const SELECTED = /^\s*(?:[-*•]\s*)?selected\s+for\s*:\s*(.*)$/i;
const SELECTED_INLINE = /\bselected\s+for\s*:/i;

export const parseStageNotes = (notes: unknown): StageNotes => {
  if (typeof notes !== 'string' || !notes) return { rest: '' };
  const stage: string[] = [];
  const selected: string[] = [];
  const rest: string[] = [];
  for (const line of notes.split(/\r\n|\r|\n/)) {
    const s = STAGE.exec(line);
    if (s) {
      // "Stage: F3 Selected for: vigour" on one line: two answers.
      const inline = SELECTED_INLINE.exec(s[1]);
      const stagePart = (inline ? s[1].slice(0, inline.index) : s[1])
        .trim()
        .replace(/[.;,]$/, '')
        .trim();
      if (stagePart) stage.push(stagePart);
      if (inline) {
        const sel = s[1].slice(inline.index + inline[0].length).trim();
        if (sel) selected.push(sel);
      }
      continue;
    }
    const f = SELECTED.exec(line);
    if (f) {
      if (f[1].trim()) selected.push(f[1].trim());
      continue;
    }
    rest.push(line);
  }
  return {
    ...(stage.length ? { stage: stage.join('; ') } : {}),
    ...(selected.length ? { selectedFor: selected.join('; ') } : {}),
    rest: rest.join('\n').trim(),
  };
};
