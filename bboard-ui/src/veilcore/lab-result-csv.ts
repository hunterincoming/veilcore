// A lab's spreadsheet of results, one row per sample, signed in one go (lab-result.ts).
//
// Each row becomes its own signed result, with its own statement, record and signature, so one
// can be replaced, withdrawn or shown without the others. The lab's browser saves each as a
// record the lab holds, so each is dated in the next hourly batch like any record: nothing is
// sent to Midnight per row.
//
// The columns are the statement's fields by name (any case; spaces, "_" and "-" ignored). What
// is the same for the whole run (method, version, panel, date tested, target, sample type) can be
// typed once on the page instead; a cell fills or overrides it for its row. Columns named
// "qc: <name>" become QC figures. A row with a problem is shown and not signed; the rest are.
// SPDX-License-Identifier: Apache-2.0

import { normalizeDate, parseCsv } from './bulk-import';
import {
  QC_LINE_MAX,
  QC_MAX,
  checkedStatement,
  isCalendarDate,
  problemOf,
  LAB_RESULT_FORMAT,
  type LabResultStatement,
  type ProblemCode,
  type QcFigure,
  type ReplaceReason,
} from './lab-result';

/** The kinds a spreadsheet can carry: one call per row, no numbers form, no sequence. */
export const CSV_KINDS = ['pathogen', 'match', 'lineage'] as const;
export type CsvKind = (typeof CSV_KINDS)[number];
/** At most this many rows per run: each posts the lab's binding, inside the registry's write limit. */
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

export type CsvRow =
  | { readonly line: number; readonly ok: true; readonly statement: Omit<LabResultStatement, 'format'> }
  | { readonly line: number; readonly ok: false; readonly code: ProblemCode; readonly message: string };

const norm = (h: string): string =>
  h
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

const ALIASES: Readonly<Record<string, readonly string[]>> = {
  subject: ['subject', 'proofcode', 'record', 'subjectproofcode'],
  sampleId: ['sampleid', 'sample', 'clientsampleid'],
  accession: ['accession', 'accessionnumber', 'labref', 'labreference', 'labid'],
  method: ['method', 'sop'],
  methodVersion: ['methodversion', 'sopversion'],
  panel: ['panel', 'markerpanel'],
  panelVersion: ['panelversion'],
  tested: ['tested', 'datetested', 'testedon'],
  received: ['received', 'datereceived', 'receivedon'],
  target: ['target', 'pathogen', 'analyte'],
  sampleType: ['sampletype', 'tissue', 'matrix'],
  result: ['result', 'call', 'outcome'],
  ct: ['ct', 'cq'],
  other: ['other', 'comparedwith', 'reference', 'otherrecord'],
  parents: ['parents'],
  parent1: ['parent1', 'firstparent', 'sire', 'seedparent'],
  parent2: ['parent2', 'secondparent', 'dam', 'pollenparent'],
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
  match: { match: true, matches: true, yes: true, '1': true, nomatch: false, nomatches: false, no: false, '0': false },
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

const HEX = /^[0-9a-fA-F]{64}$/;
const COUNT = /^\d{1,10}$/;

/** One proof code as a person pastes it: 64 hex, any case, or the end of a check link. */
const codeOf = (v: string): string | undefined => {
  const t = v.trim();
  const m = /([0-9a-fA-F]{64})(?:[^0-9a-fA-F].*)?$/.exec(t);
  const h = HEX.test(t) ? t : m?.[1];
  return h?.toLowerCase();
};

const fail = (line: number, code: ProblemCode, message: string): CsvRow => ({ line, ok: false, code, message });

/** A template a lab can open in a spreadsheet: the header row, and one example row. */
export const csvTemplate = (kind: CsvKind): string => {
  const common = ['subject', 'sample id', 'accession', 'tested', 'received'];
  const per: Record<CsvKind, string[]> = {
    pathogen: ['target', 'sample type', 'result', 'ct', 'qc: internal control ct'],
    match: ['other', 'result', 'compared', 'differing', 'qc: call rate %'],
    lineage: ['parent 1', 'parent 2', 'result', 'compared', 'conflicts 1', 'conflicts 2', 'qc: call rate %'],
  };
  const example: Record<CsvKind, string[]> = {
    pathogen: ['HLVd', 'leaf', 'not detected', '', '24.1'],
    match: ['<proof code of the other record>', 'match', '90', '0', '99.4'],
    lineage: ['<proof code of a parent>', '<proof code of the other parent>', 'consistent', '88', '0', '1', '99.1'],
  };
  const head = [...common, ...per[kind], 'replaces', 'reason'];
  const row = [
    '<proof code of the record tested>',
    'S-0001',
    'LAB-0001',
    '2026-11-05',
    '2026-11-03',
    ...example[kind],
    '',
    '',
  ];
  const cell = (c: string) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);
  return `${head.map(cell).join(',')}\n${row.map(cell).join(',')}\n`;
};

/**
 * The rows of a lab's CSV as statements, each checked by the statement's own rules, or why one
 * can't be signed. Returns undefined columns as a problem for the whole file.
 */
export const readResultsCsv = (
  text: string,
  kind: CsvKind,
  d: CsvDefaults,
): { rows: CsvRow[]; tooMany: boolean } | { error: 'empty' | 'columns' } => {
  const { rows: all } = parseCsv(text);
  const rows = all.filter((r) => r.some((c) => c.trim() !== ''));
  if (rows.length < 2) return { error: 'empty' };
  const head = rows[0].map(norm);
  const col = (k: string): number => head.findIndex((h) => (ALIASES[k] ?? []).includes(h));
  const qcCols = rows[0]
    .map((h, i) => ({ i, m: /^\s*qc\s*:\s*(.+?)\s*$/i.exec(h) }))
    .filter((x) => x.m)
    .map((x) => ({ i: x.i, name: x.m![1] }));
  if (col('subject') < 0 || col('sampleId') < 0 || col('accession') < 0) return { error: 'columns' };
  const body = rows.slice(1);
  const tooMany = body.length > CSV_MAX_ROWS;
  const out: CsvRow[] = [];
  body.slice(0, CSV_MAX_ROWS).forEach((cells, idx) => {
    const line = idx + 2;
    const get = (k: string): string => {
      const i = col(k);
      return i < 0 ? '' : (cells[i] ?? '').trim();
    };
    const or = (k: string, dflt: string) => get(k) || dflt.trim();
    const date = (v: string): string => normalizeDate(v).value;
    const subject = codeOf(get('subject'));
    if (!subject) return out.push(fail(line, 'subject', 'The proof code of the record tested is 64 hex characters.'));
    const call = CALLS[kind][norm(get('result'))];
    if (call === undefined)
      return out.push(fail(line, 'result', 'The result cell isn’t one this kind of result takes.'));
    const count = (k: string): number | undefined | null => {
      const v = get(k);
      if (!v) return undefined;
      return COUNT.test(v) ? Number(v) : null;
    };
    let result: LabResultStatement['result'];
    if (kind === 'pathogen') {
      const ct = get('ct').replace(',', '.');
      result = {
        target: or('target', d.target),
        sampleType: or('sampleType', d.sampleType),
        detected: call,
        ...(ct ? { ct } : {}),
      };
    } else if (kind === 'match') {
      const other = codeOf(get('other'));
      if (!other) return out.push(fail(line, 'other', 'Name the other record by its proof code.'));
      const [compared, differing] = [count('compared'), count('differing')];
      if (compared === null || differing === null) return out.push(fail(line, 'counts', 'Counts are whole numbers.'));
      result = {
        other,
        matches: call,
        ...(compared !== undefined ? { compared } : {}),
        ...(differing !== undefined ? { differing } : {}),
      };
    } else {
      const named = get('parents')
        ? get('parents').split(/[\s;|]+/)
        : [get('parent1'), get('parent2')].filter((p) => p !== '');
      const parents = named.map(codeOf);
      if (parents.length === 0 || parents.some((p) => !p))
        return out.push(fail(line, 'parents', 'Name one or two parents by their proof codes.'));
      const [compared, c1, c2] = [count('compared'), count('conflicts1'), count('conflicts2')];
      if (compared === null || c1 === null || c2 === null)
        return out.push(fail(line, 'counts', 'Counts are whole numbers.'));
      const conflicts = [c1, c2].slice(0, parents.length);
      result = {
        parents: parents as string[],
        consistent: call,
        ...(compared !== undefined ? { compared } : {}),
        ...(conflicts.every((c) => c !== undefined) ? { conflicts: conflicts } : {}),
      };
    }
    const qc: QcFigure[] = qcCols
      .map((q) => ({ name: q.name.slice(0, QC_LINE_MAX), value: (cells[q.i] ?? '').trim() }))
      .filter((q) => q.value !== '')
      .slice(0, QC_MAX);
    const panel = or('panel', d.panel);
    const panelVersion = or('panelVersion', d.panelVersion);
    const tested = date(or('tested', d.tested));
    const received = date(get('received'));
    const replaces = codeOf(get('replaces'));
    const reason = norm(get('reason')).replace(/^retest$/, 're-test') as ReplaceReason;
    if (!isCalendarDate(tested)) return out.push(fail(line, 'tested', 'The date tested is a real date, YYYY-MM-DD.'));
    const statement = {
      kind,
      subject,
      sampleId: get('sampleId'),
      accession: get('accession'),
      method: { id: or('method', d.method), version: or('methodVersion', d.methodVersion) },
      ...(panel || panelVersion ? { panel: { id: panel, version: panelVersion } } : {}),
      tested,
      ...(received ? { received } : {}),
      ...(qc.length ? { qc } : {}),
      result,
      ...(replaces ? { replaces: { result: replaces, reason: reason || 're-test' } } : {}),
    };
    try {
      checkedStatement({ format: LAB_RESULT_FORMAT, ...statement });
      out.push({ line, ok: true, statement });
    } catch (e) {
      const p = problemOf(e);
      out.push(fail(line, p.code, p.message));
    }
  });
  // The same sample twice in one run is a mistake, not two results.
  const seen = new Map<string, number>();
  const checked = out.map((r) => {
    if (!r.ok) return r;
    const k = `${r.statement.accession}\u0000${r.statement.sampleId}`;
    if (seen.has(k)) return fail(r.line, 'accession', `The same accession and sample as line ${seen.get(k)}.`);
    seen.set(k, r.line);
    return r;
  });
  return { rows: checked, tooMany };
};

/** A summary a LIMS can map: one line per signed result, with the code a later result names. */
export const resultsSummaryCsv = (
  rows: readonly {
    readonly statement: Pick<LabResultStatement, 'kind' | 'subject' | 'sampleId' | 'accession' | 'tested' | 'result'>;
    readonly code: string;
    readonly recordId?: string;
  }[],
): string => {
  const callOf = (s: (typeof rows)[number]['statement']): string => {
    const r = s.result as Record<string, unknown> | undefined;
    if (!r) return 'withdrawn';
    if ('detected' in r) return r.detected ? 'detected' : 'not detected';
    if ('matches' in r) return r.matches ? 'match' : 'no match';
    if ('consistent' in r) return r.consistent ? 'consistent' : 'excluded';
    if ('found' in r) return r.found ? 'found' : 'not found';
    return 'numbers';
  };
  // A cell a spreadsheet would read as a formula is kept as text.
  const cell = (raw: string) => {
    const c = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return /[",\n;]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c;
  };
  const head = ['accession', 'sample id', 'subject', 'kind', 'call', 'tested', 'result code', 'record id'];
  return (
    [
      head.join(','),
      ...rows.map((r) =>
        [
          r.statement.accession,
          r.statement.sampleId,
          r.statement.subject,
          r.statement.kind,
          callOf(r.statement),
          r.statement.tested,
          r.code,
          r.recordId ?? '',
        ]
          .map(cell)
          .join(','),
      ),
    ].join('\n') + '\n'
  );
};
