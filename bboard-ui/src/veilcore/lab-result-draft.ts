// What a lab types for one result, turned into what it signs (lab-result.ts). The form keeps
// text as typed; this tidies only what has one meaning (a proof code's case, a check link around
// it, a FASTA header) and leaves the statement's own check to refuse anything else.
// SPDX-License-Identifier: Apache-2.0

import { numbersOf, type TypedNumbers } from './field-set';
import {
  LAB_RESULT_FORMAT,
  checkedStatement,
  isFutureDate,
  newMarkOpening,
  problemOf,
  sequenceOk,
  tidySequence,
  LabResultProblem,
  type LabResultInput,
  type LabResultStatement,
  type MarkOpening,
  type ProblemCode,
  type ReplaceReason,
  type ResultKind,
} from './lab-result';

export type YesNo = '' | 'yes' | 'no';

export type ResultDraft = {
  readonly kind: ResultKind;
  readonly title: string;
  readonly subject: string;
  readonly sampleId: string;
  readonly accession: string;
  readonly method: string;
  readonly methodVersion: string;
  readonly panel: string;
  readonly panelVersion: string;
  readonly tested: string;
  readonly received: string;
  readonly qc: readonly { readonly name: string; readonly value: string }[];
  readonly form: string;
  readonly typed: TypedNumbers;
  readonly target: string;
  readonly sampleType: string;
  readonly detected: YesNo;
  readonly ct: string;
  readonly other: string;
  readonly otherSampleId: string;
  readonly matches: YesNo;
  readonly compared: string;
  readonly differing: string;
  readonly parent1: string;
  readonly parent2: string;
  readonly consistent: YesNo;
  readonly conflicts1: string;
  readonly conflicts2: string;
  readonly sequence: string;
  readonly markLabel: string;
  readonly found: YesNo;
  readonly replaces: string;
  readonly reason: ReplaceReason | '';
};

/** Today on the lab's own calendar, YYYY-MM-DD (not UTC: an evening in the Americas is still today). */
export const today = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const emptyDraft = (kind: ResultKind = 'pathogen'): ResultDraft => ({
  kind,
  title: '',
  subject: '',
  sampleId: '',
  accession: '',
  method: '',
  methodVersion: '',
  panel: '',
  panelVersion: '',
  tested: today(),
  received: '',
  qc: [],
  form: '',
  typed: {},
  target: kind === 'pathogen' ? 'HLVd' : '',
  sampleType: '',
  detected: '',
  ct: '',
  other: '',
  otherSampleId: '',
  matches: '',
  compared: '',
  differing: '',
  parent1: '',
  parent2: '',
  consistent: '',
  conflicts1: '',
  conflicts2: '',
  sequence: '',
  markLabel: '',
  found: '',
  replaces: '',
  reason: '',
});

/**
 * A proof code as pasted: 64 hex in any case, alone, or as the one code at the end of a check
 * link. A cell holding two codes, or a code inside other text, is not read: a result signed about
 * the wrong record (or with one parent of two) can't be unsigned.
 */
export const proofCodeOf = (v: string): string | undefined => {
  const t = v.trim();
  if (/^[0-9a-fA-F]{64}$/.test(t)) return t.toLowerCase();
  const codes = [...t.matchAll(/(?:^|[^0-9a-fA-F])([0-9a-fA-F]{64})(?=[^0-9a-fA-F]|$)/g)].map((m) =>
    m[1].toLowerCase(),
  );
  const link = /^(https?:\/\/|\/)\S+$/i.test(t);
  return link && codes.length === 1 ? codes[0] : undefined;
};

const bad = (code: ProblemCode, message: string): never => {
  throw new LabResultProblem(code, message);
};

const count = (v: string): number | undefined => {
  const t = v.trim();
  if (!t) return undefined;
  if (!/^\d{1,10}$/.test(t)) bad('counts', 'Counts are whole numbers.');
  return Number(t);
};

const call = (v: YesNo, code: ProblemCode = 'result'): boolean => {
  if (v === '') bad(code, 'Choose the result.');
  return v === 'yes';
};

const code = (v: string, c: ProblemCode): string => proofCodeOf(v) ?? bad(c, 'A proof code is 64 hex characters.');

/**
 * The input to sign for a draft, and, for a DNA mark, the opening the lab must keep. Throws a
 * LabResultProblem naming the field to fix.
 */
export const draftToInput = (d: ResultDraft, labName: string): { input: LabResultInput; opening?: MarkOpening } => {
  const subject = code(d.subject, 'subject');
  let result: LabResultStatement['result'];
  let values: (bigint | null)[] | undefined;
  let opening: MarkOpening | undefined;
  switch (d.kind) {
    case 'numbers': {
      if (!d.form) bad('form', 'Choose the form of the numbers.');
      const n = numbersOf(d.form, d.typed);
      if (n.bad.length || !n.any) bad('calls', 'Type the numbers exactly as in your report.');
      result = { form: d.form };
      values = n.values;
      break;
    }
    case 'pathogen':
      result = {
        target: d.target.trim(),
        sampleType: d.sampleType.trim(),
        detected: call(d.detected),
        ...(d.ct.trim() ? { ct: d.ct.trim().replace(',', '.') } : {}),
      };
      break;
    case 'match': {
      const compared = count(d.compared);
      const differing = count(d.differing);
      result = {
        other: code(d.other, 'other'),
        ...(d.otherSampleId.trim() ? { otherSampleId: d.otherSampleId.trim() } : {}),
        matches: call(d.matches),
        ...(compared !== undefined ? { compared } : {}),
        ...(differing !== undefined ? { differing } : {}),
      };
      break;
    }
    case 'lineage': {
      const parents = [d.parent1, d.parent2].filter((p) => p.trim()).map((p) => code(p, 'parents'));
      if (!parents.length) bad('parents', 'Name at least one parent by its proof code.');
      const compared = count(d.compared);
      const conflicts = [count(d.conflicts1), count(d.conflicts2)].slice(0, parents.length);
      result = {
        parents,
        consistent: call(d.consistent),
        ...(compared !== undefined ? { compared } : {}),
        ...(conflicts.every((c) => c !== undefined) ? { conflicts: conflicts } : {}),
      };
      break;
    }
    case 'dna-mark': {
      const seq = tidySequence(d.sequence);
      if (!sequenceOk(seq)) bad('seal', 'A mark is 10 to 100,000 letters, A, C, G or T only.');
      opening = newMarkOpening(seq);
      result = {
        seal: opening.seal,
        found: call(d.found),
        ...(d.markLabel.trim() ? { label: d.markLabel.trim() } : {}),
      };
      break;
    }
    case 'retraction':
      result = undefined;
      break;
  }
  // A detail with no value (an unfilled row of the usual ones) isn't signed.
  const qc = d.qc.map((q) => ({ name: q.name.trim(), value: q.value.trim() })).filter((q) => q.value);
  const panel = d.panel.trim();
  const panelVersion = d.panelVersion.trim();
  const replaces = d.replaces.trim();
  const reason = d.kind === 'retraction' ? 'retraction' : d.reason;
  const statement = {
    kind: d.kind,
    subject,
    sampleId: d.sampleId.trim(),
    accession: d.accession.trim(),
    method: { id: d.method.trim(), version: d.methodVersion.trim() },
    ...(panel || panelVersion ? { panel: { id: panel, version: panelVersion } } : {}),
    tested: d.tested.trim(),
    ...(d.received.trim() ? { received: d.received.trim() } : {}),
    ...(qc.length ? { qc } : {}),
    ...(result !== undefined ? { result } : {}),
    ...(replaces || d.kind === 'retraction'
      ? { replaces: { result: code(replaces, 'replaces'), reason: reason || 're-test' } }
      : {}),
  };
  checkedStatement({ format: LAB_RESULT_FORMAT, ...statement });
  if (isFutureDate(statement.tested)) bad('future', 'The date tested is after tomorrow.');
  return {
    input: { labName, title: d.title.trim(), statement, ...(values ? { values } : {}) },
    ...(opening ? { opening } : {}),
  };
};

/** draftToInput, or the problem to show. */
export const tryDraft = (
  d: ResultDraft,
  labName: string,
): { ok: true; input: LabResultInput; opening?: MarkOpening } | { ok: false; code: ProblemCode; message: string } => {
  try {
    return { ok: true, ...draftToInput(d, labName) };
  } catch (e) {
    return { ok: false, ...problemOf(e) };
  }
};
