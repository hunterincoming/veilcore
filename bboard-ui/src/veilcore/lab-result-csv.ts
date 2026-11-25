// A lab's spreadsheet of results, one row per sample and target, signed in one go (lab-result.ts).
//
// Each row becomes its own signed result, with its own statement, record and signature, so one
// can be replaced, withdrawn or given to its own client without the others. The lab's browser
// saves each as a record the lab holds, so each is dated in the next hourly batch like any
// record: nothing is sent to Midnight per row.
//
// The columns are the statement's fields by name (any case; spaces, "_" and "-" ignored), plus
// the names qPCR software and LIMS exports use (QuantStudio's "Sample Name" and "Target Name",
// CFX's "Cq Mean"). What is the same for the whole run (method, version, panel, date tested,
// target, sample type) can be typed once on the page; a cell fills or overrides it for its row.
// Columns named "qc: <name>" become run and QC details. A row with a problem is shown with every
// problem it has at once, listed in the summary as not signed, and never signed; the rest are.
// A file with more rows than one run takes, or without a column no row can do without, is
// refused whole, so no row is quietly left out. Rows this browser already signed (the same
// result again) are found before signing, so a file run twice isn't signed twice by mistake.
// SPDX-License-Identifier: Apache-2.0

import { normalizeDate, parseCsv } from './bulk-import';
import {
  QC_LINE_MAX,
  QC_MAX,
  CT,
  checkedStatement,
  isCalendarDate,
  isLine,
  isFutureDate,
  problemOf,
  LAB_RESULT_FORMAT,
  type LabResultStatement,
  type PathogenResult,
  type ProblemCode,
  type QcFigure,
  type ReplaceReason,
} from './lab-result';
import { proofCodeOf } from './lab-result-draft';

/** The kinds a spreadsheet can carry: one call per row, no numbers form, no sequence. */
export const CSV_KINDS = ['pathogen', 'match', 'lineage'] as const;
export type CsvKind = (typeof CSV_KINDS)[number];
/** At most this many rows per run (a 96-well plate fits): each posts the lab's binding. */
export const CSV_MAX_ROWS = 100;

/** What the lab types once on the page for every row. */
export type CsvDefaults = {
  readonly method: string;
  readonly methodVersion: string;
  readonly panel: string;
  readonly panelVersion: string;
  readonly tested: string;
  readonly target: string;
  readonly sampleType: string;
};

/**
 * One thing wrong with a row: a needed cell left empty (`missing`), or one that can't be signed.
 * `column` is the template's name for the cell, so the lab knows where to look.
 */
export type CsvProblem = { readonly code: ProblemCode; readonly column: string; readonly missing?: true };

export type CsvRow =
  | { readonly line: number; readonly ok: true; readonly statement: Omit<LabResultStatement, 'format'> }
  | {
      readonly line: number;
      readonly ok: false;
      /** The first problem, for the summary; `problems` has all of them. */
      readonly code: ProblemCode;
      readonly message: string;
      /** Every problem in the row at once, so the lab fixes the file in one go. */
      readonly problems: readonly CsvProblem[];
      /** What the row names, so the summary can list it as not signed. */
      readonly sampleId: string;
      readonly accession: string;
      readonly target: string;
    };

export type CsvRead =
  | { readonly rows: CsvRow[] }
  | { readonly error: 'empty' }
  /** Columns no row can do without, and nothing on the page fills: all of them named. */
  | { readonly error: 'columns'; readonly missing: readonly string[] }
  | { readonly error: 'tooMany'; readonly rows: number; readonly lastLine: number };

const norm = (h: string): string =>
  h
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

// Parent roles (sire, dam, seed parent, pollen parent) are left out on purpose: a sire/dam file
// and a seed/pollen file would put the parents in opposite orders.
const ALIASES: Readonly<Record<string, readonly string[]>> = {
  subject: ['subject', 'proofcode', 'record', 'subjectproofcode'],
  sampleId: ['sampleid', 'sample', 'samplename', 'clientsampleid', 'clientid', 'clientref', 'customersampleid'],
  accession: ['accession', 'accessionnumber', 'labref', 'labreference', 'labid', 'labsampleid', 'workorder'],
  method: ['method', 'sop'],
  methodVersion: ['methodversion', 'sopversion'],
  panel: ['panel', 'markerpanel'],
  panelVersion: ['panelversion'],
  tested: ['tested', 'datetested', 'testedon', 'analysisdate', 'rundate', 'dateanalyzed'],
  received: ['received', 'datereceived', 'receivedon'],
  target: ['target', 'targetname', 'pathogen', 'analyte'],
  sampleType: ['sampletype', 'tissue', 'matrix'],
  result: ['result', 'call', 'outcome', 'interpretation', 'finalresult'],
  ct: ['ct', 'cq', 'ctmean', 'cqmean', 'targetct'],
  other: ['other', 'comparedwith', 'reference', 'otherrecord'],
  otherSampleId: ['othersampleid', 'referencesample', 'comparedsample'],
  parents: ['parents'],
  parent1: ['parent1', 'firstparent'],
  parent2: ['parent2', 'secondparent'],
  compared: ['compared', 'markerscompared'],
  differing: ['differing', 'markersdiffering', 'mismatches'],
  conflicts1: ['conflicts1', 'conflictsparent1', 'conflictsfirst'],
  conflicts2: ['conflicts2', 'conflictsparent2', 'conflictssecond'],
  replaces: ['replaces', 'replacesresult'],
  reason: ['reason', 'replacereason'],
};

const CALLS: Readonly<Record<CsvKind, Readonly<Record<string, boolean>>>> = {
  pathogen: {
    detected: true,
    positive: true,
    pos: true,
    '1': true,
    notdetected: false,
    negative: false,
    neg: false,
    nd: false,
    '0': false,
  },
  match: {
    match: true,
    matches: true,
    same: true,
    yes: true,
    '1': true,
    nomatch: false,
    different: false,
    no: false,
    '0': false,
  },
  lineage: {
    consistent: true,
    yes: true,
    '1': true,
    excluded: false,
    inconsistent: false,
    no: false,
    '0': false,
  },
};

/** A result a lab can't sign as a call: it is re-tested, and the re-test is signed. */
const INCONCLUSIVE = new Set(['inconclusive', 'invalid', 'indeterminate', 'equivocal', 'retest', 'failed', 'error']);
/** What qPCR software writes for "no Ct": the target never crossed the threshold. */
const NO_CT = new Set(['', 'undetermined', 'undet', 'n/a', 'na', 'nan', '-', '--', 'noct', 'nocq', 'none']);
const COUNT = /^\d{1,10}$/;

/**
 * The template for each kind: every column a row needs (method and version too, which the page
 * can also fill), then the run and QC details a lab director looks for first, and one example row.
 */
const TEMPLATE: Readonly<Record<CsvKind, { method: [string, string]; head: string[]; example: string[] }>> = {
  pathogen: {
    method: ['RT-qPCR HLVd SOP-14', '3'],
    head: [
      'target',
      'sample type',
      'result',
      'ct',
      'qc: ct cut-off',
      'qc: limit of detection',
      'qc: internal control ct',
      'qc: positive control',
      'qc: negative control',
      'qc: run id',
    ],
    example: [
      'HLVd',
      'leaf',
      'not detected',
      'Undetermined',
      '35',
      '10 copies/µL',
      '24.1',
      'passed',
      'passed',
      'RUN-0412',
    ],
  },
  match: {
    method: ['SNP genotyping', '4'],
    head: ['other', 'other sample id', 'result', 'panel', 'panel version', 'compared', 'differing', 'qc: call rate %'],
    example: [
      '<proof code the other sample was sent under>',
      'REF-0007',
      'match',
      'CannSNP90',
      '2.1',
      '90',
      '0',
      '99.4',
    ],
  },
  lineage: {
    method: ['SNP genotyping', '4'],
    head: [
      'parent 1',
      'parent 2',
      'result',
      'panel',
      'panel version',
      'compared',
      'conflicts 1',
      'conflicts 2',
      'qc: call rate %',
    ],
    example: [
      '<proof code of a parent>',
      '<proof code of the other parent>',
      'consistent',
      'CannSNP90',
      '2.1',
      '88',
      '0',
      '1',
      '99.1',
    ],
  },
};

/** A template a lab can open in a spreadsheet: the header row, and one example row. */
export const csvTemplate = (kind: CsvKind): string => {
  const head = [
    'subject',
    'sample id',
    'accession',
    'method',
    'method version',
    'tested',
    'received',
    ...TEMPLATE[kind].head,
    'replaces',
    'reason',
  ];
  const row = [
    '<proof code the sender gave for the sample>',
    'S-0001',
    'LAB-0001',
    ...TEMPLATE[kind].method,
    '2026-11-05',
    '2026-11-03',
    ...TEMPLATE[kind].example,
    '',
    '',
  ];
  const cell = (c: string) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);
  return `${head.map(cell).join(',')}\n${row.map(cell).join(',')}\n`;
};

/** The column a problem the statement's own check finds points to, by the template's name. */
const COLUMN_OF: Partial<Record<ProblemCode, string>> = {
  subject: 'subject',
  sampleId: 'sample id',
  accession: 'accession',
  method: 'method',
  panel: 'panel',
  tested: 'tested',
  future: 'tested',
  received: 'received',
  qc: 'qc:',
  result: 'result',
  inconclusive: 'result',
  target: 'target',
  sampleType: 'sample type',
  ct: 'ct',
  ctMissing: 'ct',
  other: 'other',
  parents: 'parent 1',
  counts: 'compared',
  replaces: 'replaces',
  duplicate: 'accession',
};

/** The columns a row of this kind can't do without and nothing on the page fills. */
const neededColumns = (kind: CsvKind): readonly { key: string; name: string; or?: string[] }[] => [
  { key: 'subject', name: 'subject' },
  { key: 'sampleId', name: 'sample id' },
  { key: 'accession', name: 'accession' },
  { key: 'result', name: 'result' },
  ...(kind === 'match' ? [{ key: 'other', name: 'other' }] : []),
  ...(kind === 'lineage' ? [{ key: 'parent1', name: 'parent 1', or: ['parents', 'parent2'] }] : []),
];

const failRow = (
  line: number,
  problems: readonly CsvProblem[],
  named: { sampleId: string; accession: string; target: string },
): CsvRow => ({
  line,
  ok: false,
  code: problems[0].code,
  message: problems.map((p) => `${p.missing ? 'empty' : 'not usable'}: ${p.column}`).join('; '),
  problems,
  ...named,
});

/**
 * The rows of a lab's CSV as statements, each checked by the statement's own rules, or every
 * reason one can't be signed (each empty or unusable cell, all at once). `line` is the row's
 * number in a spreadsheet, the header being row 1. A file with more than CSV_MAX_ROWS rows, or
 * without a column no row can do without, is refused whole, every missing column named.
 */
export const readResultsCsv = (text: string, kind: CsvKind, d: CsvDefaults, now = new Date()): CsvRead => {
  const { rows: all } = parseCsv(text);
  // Blank rows are skipped but still counted, so a row's number is the one the spreadsheet shows.
  const rows = all.map((cells, i) => ({ cells, line: i + 1 })).filter((r) => r.cells.some((c) => c.trim() !== ''));
  if (rows.length < 2) return { error: 'empty' };
  const header = rows[0].cells;
  const head = header.map(norm);
  const col = (k: string): number => head.findIndex((h) => (ALIASES[k] ?? []).includes(h));
  const missingColumns = neededColumns(kind)
    .filter((c) => col(c.key) < 0 && !(c.or ?? []).some((k) => col(k) >= 0))
    .map((c) => c.name);
  if (missingColumns.length) return { error: 'columns', missing: missingColumns };
  const qcCols = header
    .map((h, i) => ({ i, m: /^\s*qc\s*:\s*(.+?)\s*$/i.exec(h) }))
    .filter((x) => x.m)
    .map((x) => ({ i: x.i, name: x.m![1] }));
  const body = rows.slice(1);
  if (body.length > CSV_MAX_ROWS) return { error: 'tooMany', rows: body.length, lastLine: CSV_MAX_ROWS + 1 };
  const out: CsvRow[] = [];
  for (const { cells, line } of body) {
    const get = (k: string): string => {
      const i = col(k);
      return i < 0 ? '' : (cells[i] ?? '').trim();
    };
    const or = (k: string, dflt: string) => get(k) || dflt.trim();
    const named = {
      sampleId: get('sampleId'),
      accession: get('accession'),
      target: kind === 'pathogen' ? or('target', d.target) : '',
    };
    const problems: CsvProblem[] = [];
    const bad = (code: ProblemCode, column: string) => {
      if (!problems.some((p) => p.code === code && p.column === column)) problems.push({ code, column });
    };
    const empty = (code: ProblemCode, column: string) => problems.push({ code, column, missing: true });
    /** A one-line cell the row needs: empty, or not one line, is said. */
    const line1 = (v: string, code: ProblemCode, column: string): string => {
      if (!v) empty(code, column);
      else if (!isLine(v)) bad(code, column);
      return v;
    };
    const count = (k: string, column: string): number | undefined => {
      const v = get(k);
      if (!v) return undefined;
      if (COUNT.test(v)) return Number(v);
      bad('counts', column);
      return undefined;
    };

    const subjectCell = get('subject');
    const subject = proofCodeOf(subjectCell);
    if (!subjectCell) empty('subject', 'subject');
    else if (!subject) bad('subject', 'subject');
    line1(named.sampleId, 'sampleId', 'sample id');
    line1(named.accession, 'accession', 'accession');
    const methodId = line1(or('method', d.method), 'method', 'method');
    const methodVersion = line1(or('methodVersion', d.methodVersion), 'method', 'method version');

    const cell = norm(get('result'));
    const call: boolean | undefined = INCONCLUSIVE.has(cell) ? undefined : CALLS[kind][cell];
    if (!cell) empty('result', 'result');
    else if (INCONCLUSIVE.has(cell)) bad('inconclusive', 'result');
    else if (call === undefined) bad('result', 'result');

    let result: LabResultStatement['result'] | undefined;
    if (kind === 'pathogen') {
      line1(named.target, 'target', 'target');
      const sampleType = line1(or('sampleType', d.sampleType), 'sampleType', 'sample type');
      const raw = get('ct').replace(',', '.');
      const noCt = NO_CT.has(raw.toLowerCase().replace(/\s+/g, '')) || /^>\s*\d/.test(raw);
      // "Detected" with "Undetermined" contradicts itself: most likely a mixed-up column.
      if (call && raw !== '' && noCt) bad('ctMissing', 'ct');
      const ct = noCt ? '' : raw;
      if (ct && !CT.test(ct)) bad('ct', 'ct');
      if (call !== undefined)
        result = {
          target: named.target,
          sampleType,
          detected: call,
          ...(ct ? { ct } : {}),
        } satisfies PathogenResult;
    } else if (kind === 'match') {
      const otherCell = get('other');
      const other = proofCodeOf(otherCell);
      if (!otherCell) empty('other', 'other');
      else if (!other || other === subject) bad('other', 'other');
      const compared = count('compared', 'compared');
      const differing = count('differing', 'differing');
      if (compared !== undefined && compared < 1) bad('counts', 'compared');
      if (compared !== undefined && differing !== undefined && differing > compared) bad('counts', 'differing');
      const otherSampleId = get('otherSampleId');
      if (otherSampleId && !isLine(otherSampleId)) bad('sampleId', 'other sample id');
      if (call !== undefined && other)
        result = {
          other,
          ...(otherSampleId ? { otherSampleId } : {}),
          matches: call,
          ...(compared !== undefined ? { compared } : {}),
          ...(differing !== undefined ? { differing } : {}),
        };
    } else {
      const cells2 = get('parents')
        ? get('parents')
            .split(/[\s;|,]+/)
            .filter((p) => p !== '')
        : [get('parent1'), get('parent2')].filter((p) => p !== '');
      const parents = cells2.map(proofCodeOf);
      if (cells2.length === 0) empty('parents', 'parent 1');
      else if (
        parents.some((p) => !p || p === subject) ||
        new Set(parents).size !== parents.length ||
        parents.length > 2
      )
        bad('parents', get('parents') ? 'parents' : 'parent 1');
      const compared = count('compared', 'compared');
      const c1 = count('conflicts1', 'conflicts 1');
      const c2 = count('conflicts2', 'conflicts 2');
      if (compared !== undefined && compared < 1) bad('counts', 'compared');
      const conflicts = [c1, c2].slice(0, parents.length);
      if (compared !== undefined && conflicts.some((c) => c !== undefined && c > compared))
        bad('counts', 'conflicts 1');
      if (call !== undefined && parents.length > 0 && parents.every((p) => p))
        result = {
          parents: parents as string[],
          consistent: call,
          ...(compared !== undefined ? { compared } : {}),
          ...(conflicts.every((c) => c !== undefined) ? { conflicts } : {}),
        };
    }

    const panel = or('panel', d.panel);
    const panelVersion = or('panelVersion', d.panelVersion);
    if ((panel || panelVersion) && !(isLine(panel) && isLine(panelVersion)))
      bad('panel', panel && !panelVersion ? 'panel version' : 'panel');
    const testedCell = or('tested', d.tested);
    const tested = normalizeDate(testedCell);
    if (!testedCell) empty('tested', 'tested');
    else if (tested.ambiguous || !isCalendarDate(tested.value)) bad('tested', 'tested');
    else if (isFutureDate(tested.value, now)) bad('future', 'tested');
    const received = normalizeDate(get('received'));
    if (received.ambiguous || (received.value && !isCalendarDate(received.value))) bad('received', 'received');
    else if (received.value && isCalendarDate(tested.value) && received.value > tested.value)
      bad('received', 'received');
    const replacesCell = get('replaces');
    const replaces = replacesCell ? proofCodeOf(replacesCell) : undefined;
    if (replacesCell && !replaces) bad('replaces', 'replaces');
    const reason = norm(get('reason')).replace(/^retest$/, 're-test') as ReplaceReason;
    if (replaces && reason && !['re-test', 'correction'].includes(reason)) bad('replaces', 'reason');
    const qc: QcFigure[] = qcCols
      .map((q) => ({ name: q.name.slice(0, QC_LINE_MAX), value: (cells[q.i] ?? '').trim() }))
      .filter((q) => q.value !== '')
      .slice(0, QC_MAX);

    if (problems.length > 0 || !subject || !result) {
      out.push(failRow(line, problems.length ? problems : [{ code: 'result', column: 'result' }], named));
      continue;
    }
    const statement = {
      kind,
      subject,
      sampleId: named.sampleId,
      accession: named.accession,
      method: { id: methodId, version: methodVersion },
      ...(panel || panelVersion ? { panel: { id: panel, version: panelVersion } } : {}),
      tested: tested.value,
      ...(received.value ? { received: received.value } : {}),
      ...(qc.length ? { qc } : {}),
      result,
      ...(replaces ? { replaces: { result: replaces, reason: reason || 're-test' } } : {}),
    };
    // The statement's own rules have the last word: anything the checks above don't cover.
    try {
      checkedStatement({ format: LAB_RESULT_FORMAT, ...statement });
      out.push({ line, ok: true, statement });
    } catch (e) {
      const p = problemOf(e);
      out.push(failRow(line, [{ code: p.code, column: COLUMN_OF[p.code] ?? '' }], named));
    }
  }
  // The same sample twice in one run is a mistake, not two results. A pathogen panel tests one
  // sample for several targets, one row each, so there the target is part of what must differ.
  const seen = new Map<string, number>();
  const checked = out.map((r) => {
    if (!r.ok) return r;
    const t = r.statement.kind === 'pathogen' ? (r.statement.result as PathogenResult).target.toLowerCase() : '';
    const k = `${r.statement.accession}\u0000${r.statement.sampleId}\u0000${t}`;
    if (seen.has(k))
      return failRow(r.line, [{ code: 'duplicate', column: 'accession' }], {
        sampleId: r.statement.sampleId,
        accession: r.statement.accession,
        target: t,
      });
    seen.set(k, r.line);
    return r;
  });
  return { rows: checked };
};

/** A result this lab already signed, as this browser keeps it: its statement and its code. */
export type SignedBefore = {
  readonly statement: Pick<LabResultStatement, 'kind' | 'subject' | 'sampleId' | 'accession' | 'result'>;
  readonly code: string;
};

/**
 * What makes two results the same result signed twice: the same record, sample ID, accession,
 * kind and call, about the same target (pathogen), other record (comparison) or parents
 * (parentage). A different call is not a copy: it is a conflicting result, which names the one
 * it replaces.
 */
const sameResultKey = (s: SignedBefore['statement']): string | undefined => {
  const r = s.result as Record<string, unknown> | undefined;
  if (!r) return undefined;
  const about =
    s.kind === 'pathogen'
      ? `${String(r.target).toLowerCase()}:${String(r.detected)}`
      : s.kind === 'match'
        ? `${String(r.other)}:${String(r.matches)}`
        : s.kind === 'lineage'
          ? `${[...(r.parents as string[])].sort().join('+')}:${String(r.consistent)}`
          : undefined;
  return about === undefined ? undefined : [s.kind, s.subject, s.sampleId, s.accession, about].join('\u0000');
};

/**
 * The rows of a run already signed in this browser, by line, each with the code of the result
 * signed before. Signing one again would make a second copy of the same result. A row that names
 * a result it replaces is never counted: a re-test is meant.
 */
export const alreadySigned = (
  rows: readonly CsvRow[],
  before: readonly SignedBefore[],
): ReadonlyMap<number, string> => {
  const earlier = new Map<string, string>();
  for (const b of before) {
    const k = sameResultKey(b.statement);
    if (k && !earlier.has(k)) earlier.set(k, b.code);
  }
  const out = new Map<number, string>();
  for (const r of rows) {
    if (!r.ok || r.statement.replaces) continue;
    const k = sameResultKey(r.statement);
    const code = k ? earlier.get(k) : undefined;
    if (code) out.set(r.line, code);
  }
  return out;
};

type Summarised = Pick<
  LabResultStatement,
  'kind' | 'subject' | 'sampleId' | 'accession' | 'tested' | 'result' | 'method' | 'replaces'
>;

/**
 * A summary a LIMS can map: one line per row of the run, signed or not, with the code a later
 * result names, so nothing left unsigned is forgotten.
 */
export const resultsSummaryCsv = (
  rows: readonly (
    | { readonly statement: Summarised; readonly code: string; readonly recordId?: string }
    | { readonly unsigned: { sampleId: string; accession: string; target: string; why: string } }
    /** Skipped: already signed in this browser, under `code`. */
    | { readonly already: Summarised; readonly code: string }
  )[],
): string => {
  const callOf = (s: Summarised): string => {
    const r = s.result as Record<string, unknown> | undefined;
    if (!r) return 'withdrawal';
    if ('detected' in r) return r.detected ? 'detected' : 'not detected';
    // Never a bare "same genotype": the summary ends up on paper, away from the counts.
    if ('matches' in r) return r.matches ? 'same at the markers compared' : 'different at the markers compared';
    if ('consistent' in r) return r.consistent ? 'consistent' : 'excluded';
    if ('found' in r) return r.found ? 'found' : 'not found';
    return 'numbers';
  };
  // A cell a spreadsheet would read as a formula is kept as text.
  const cell = (raw: string) => {
    const c = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return /[",\n;]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c;
  };
  const head = [
    'status',
    'accession',
    'sample id',
    'target',
    'subject',
    'kind',
    'call',
    'method',
    'tested',
    'result code',
    'replaces',
    'record id',
  ];
  return (
    [
      head.join(','),
      ...rows.map((r) => {
        if ('already' in r) {
          const s = r.already;
          const target = s.kind === 'pathogen' ? (s.result as PathogenResult).target : '';
          return [
            'already signed before: skipped',
            s.accession,
            s.sampleId,
            target,
            s.subject,
            s.kind,
            callOf(s),
            `${s.method.id} ${s.method.version}`,
            s.tested,
            r.code,
            '',
            '',
          ]
            .map(cell)
            .join(',');
        }
        if ('unsigned' in r)
          return [
            `not signed: ${r.unsigned.why}`,
            r.unsigned.accession,
            r.unsigned.sampleId,
            r.unsigned.target,
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
          ]
            .map(cell)
            .join(',');
        const s = r.statement;
        const target = s.kind === 'pathogen' ? (s.result as PathogenResult).target : '';
        return [
          'signed',
          s.accession,
          s.sampleId,
          target,
          s.subject,
          s.kind,
          callOf(s),
          `${s.method.id} ${s.method.version}`,
          s.tested,
          r.code,
          s.replaces ? `${s.replaces.result} (${s.replaces.reason})` : '',
          r.recordId ?? '',
        ]
          .map(cell)
          .join(',');
      }),
    ].join('\n') + '\n'
  );
};
