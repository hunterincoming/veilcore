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
// Columns named "qc: <name>" become run and QC details. A row with a problem is shown, listed in
// the summary as not signed, and never signed; the rest are. A file with more rows than one run
// takes is refused whole, so no row is quietly left out.
// SPDX-License-Identifier: Apache-2.0

import { normalizeDate, parseCsv } from './bulk-import';
import {
  QC_LINE_MAX,
  QC_MAX,
  checkedStatement,
  isCalendarDate,
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

export type CsvRow =
  | { readonly line: number; readonly ok: true; readonly statement: Omit<LabResultStatement, 'format'> }
  | {
      readonly line: number;
      readonly ok: false;
      readonly code: ProblemCode;
      readonly message: string;
      /** What the row names, so the summary can list it as not signed. */
      readonly sampleId: string;
      readonly accession: string;
      readonly target: string;
    };

export type CsvRead =
  | { readonly rows: CsvRow[] }
  | { readonly error: 'empty' | 'columns' }
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

const fail = (
  line: number,
  code: ProblemCode,
  message: string,
  named: { sampleId: string; accession: string; target: string },
): CsvRow => ({ line, ok: false, code, message, ...named });

/** The columns of the template for each kind: the run and QC details a lab director looks for first. */
const TEMPLATE: Readonly<Record<CsvKind, { head: string[]; example: string[] }>> = {
  pathogen: {
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
    head: ['other', 'other sample id', 'result', 'compared', 'differing', 'qc: call rate %'],
    example: ['<proof code the other sample was sent under>', 'REF-0007', 'match', '90', '0', '99.4'],
  },
  lineage: {
    head: ['parent 1', 'parent 2', 'result', 'compared', 'conflicts 1', 'conflicts 2', 'qc: call rate %'],
    example: ['<proof code of a parent>', '<proof code of the other parent>', 'consistent', '88', '0', '1', '99.1'],
  },
};

/** A template a lab can open in a spreadsheet: the header row, and one example row. */
export const csvTemplate = (kind: CsvKind): string => {
  const head = [
    'subject',
    'sample id',
    'accession',
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
    '2026-11-05',
    '2026-11-03',
    ...TEMPLATE[kind].example,
    '',
    '',
  ];
  const cell = (c: string) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);
  return `${head.map(cell).join(',')}\n${row.map(cell).join(',')}\n`;
};

/**
 * The rows of a lab's CSV as statements, each checked by the statement's own rules, or why one
 * can't be signed. A file with more than CSV_MAX_ROWS rows is refused whole.
 */
export const readResultsCsv = (text: string, kind: CsvKind, d: CsvDefaults, now = new Date()): CsvRead => {
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
  if (body.length > CSV_MAX_ROWS) return { error: 'tooMany', rows: body.length, lastLine: CSV_MAX_ROWS + 1 };
  const out: CsvRow[] = [];
  body.forEach((cells, idx) => {
    const line = idx + 2;
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
    const no = (code: ProblemCode, message: string) => out.push(fail(line, code, message, named));
    const date = (v: string): { value: string; ambiguous: boolean } => normalizeDate(v);
    const subject = proofCodeOf(get('subject'));
    if (!subject) return no('subject', 'The proof code is 64 hex characters, alone or at the end of a check link.');
    const cell = norm(get('result'));
    if (INCONCLUSIVE.has(cell)) return no('inconclusive', 'An inconclusive or invalid result isn’t signed.');
    const call = CALLS[kind][cell];
    if (call === undefined) return no('result', 'The result cell isn’t one this kind of result takes.');
    const count = (k: string): number | undefined | null => {
      const v = get(k);
      if (!v) return undefined;
      return COUNT.test(v) ? Number(v) : null;
    };
    let result: LabResultStatement['result'];
    if (kind === 'pathogen') {
      const raw = get('ct').replace(',', '.');
      const ct = NO_CT.has(raw.toLowerCase().replace(/\s+/g, '')) || /^>\s*\d/.test(raw) ? '' : raw;
      result = {
        target: named.target,
        sampleType: or('sampleType', d.sampleType),
        detected: call,
        ...(ct ? { ct } : {}),
      } satisfies PathogenResult;
    } else if (kind === 'match') {
      const other = proofCodeOf(get('other'));
      if (!other) return no('other', 'Name the other record by its proof code.');
      const [compared, differing] = [count('compared'), count('differing')];
      if (compared === null || differing === null) return no('counts', 'Counts are whole numbers.');
      const otherSampleId = get('otherSampleId');
      result = {
        other,
        ...(otherSampleId ? { otherSampleId } : {}),
        matches: call,
        ...(compared !== undefined ? { compared } : {}),
        ...(differing !== undefined ? { differing } : {}),
      };
    } else {
      const named2 = get('parents')
        ? get('parents').split(/[\s;|]+/)
        : [get('parent1'), get('parent2')].filter((p) => p !== '');
      const parents = named2.map(proofCodeOf);
      if (parents.length === 0 || parents.some((p) => !p))
        return no('parents', 'Name one or two parents by their proof codes.');
      const [compared, c1, c2] = [count('compared'), count('conflicts1'), count('conflicts2')];
      if (compared === null || c1 === null || c2 === null) return no('counts', 'Counts are whole numbers.');
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
    const replacesCell = get('replaces');
    const replaces = replacesCell ? proofCodeOf(replacesCell) : undefined;
    if (replacesCell && !replaces) return no('replaces', 'A replaced result is named by its 64-character code.');
    const reason = norm(get('reason')).replace(/^retest$/, 're-test') as ReplaceReason;
    if (tested.ambiguous || !isCalendarDate(tested.value)) return no('tested', 'The date tested is a real date.');
    if (isFutureDate(tested.value, now)) return no('future', 'The date tested is after tomorrow.');
    if (received.ambiguous) return no('received', 'The date received is a real date.');
    const statement = {
      kind,
      subject,
      sampleId: named.sampleId,
      accession: named.accession,
      method: { id: or('method', d.method), version: or('methodVersion', d.methodVersion) },
      ...(panel || panelVersion ? { panel: { id: panel, version: panelVersion } } : {}),
      tested: tested.value,
      ...(received.value ? { received: received.value } : {}),
      ...(qc.length ? { qc } : {}),
      result,
      ...(replaces ? { replaces: { result: replaces, reason: reason || 're-test' } } : {}),
    };
    try {
      checkedStatement({ format: LAB_RESULT_FORMAT, ...statement });
      out.push({ line, ok: true, statement });
    } catch (e) {
      const p = problemOf(e);
      no(p.code, p.message);
    }
  });
  // The same sample twice in one run is a mistake, not two results. A pathogen panel tests one
  // sample for several targets, one row each, so there the target is part of what must differ.
  const seen = new Map<string, number>();
  const checked = out.map((r) => {
    if (!r.ok) return r;
    const t = r.statement.kind === 'pathogen' ? (r.statement.result as PathogenResult).target.toLowerCase() : '';
    const k = `${r.statement.accession}\u0000${r.statement.sampleId}\u0000${t}`;
    if (seen.has(k))
      return fail(r.line, 'duplicate', `The same accession, sample and target as line ${seen.get(k)}.`, {
        sampleId: r.statement.sampleId,
        accession: r.statement.accession,
        target: t,
      });
    seen.set(k, r.line);
    return r;
  });
  return { rows: checked };
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
  )[],
): string => {
  const callOf = (s: Summarised): string => {
    const r = s.result as Record<string, unknown> | undefined;
    if (!r) return 'withdrawal';
    if ('detected' in r) return r.detected ? 'detected' : 'not detected';
    if ('matches' in r) return r.matches ? 'same genotype' : 'different genotype';
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
