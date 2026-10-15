// Date a whole collection at once: a CSV or Excel accession log, one record per row.
//
// A lab or a breeder already keeps a spreadsheet of what they hold. Typing each row into
// the logging flow again is the cost that stops them, so this reads the file in the
// browser, lets them say which column is which, and seals every row as an ordinary record:
// the same fields, the same fingerprint and the same key binding as logging one plant by
// hand, because both seal through seal-record.ts. Nothing about the file leaves the
// browser except those record fields, which the registry stores for any record.
//
// What keeps it safe to run on 500 rows:
//   - each row is known by a hash of the values it would be sealed with (rowHashOf), and a
//     row whose hash is already sealed (in this browser's ledger, or as a record in the
//     holder's set, from any device) is never sealed again;
//   - a record is written to the ledger, whole, BEFORE it is sent. A send that may or may
//     not have landed (no answer, the registry busy) is sent again as the same record, same
//     id and fingerprint: the registry stores by id, so that cannot make a second record.
//     Only a record the registry refused by id is dropped, with its keys;
//   - rows go to the registry in batches, one save per batch, not one save per row: the app
//     re-sends the whole set on every save, and 500 single saves would pass the registry's
//     write limits;
//   - the job (rows, mapping, phase) is kept in this browser, so a closed tab picks up
//     where it stopped.
// SPDX-License-Identifier: Apache-2.0

import { sha256 } from '@noble/hashes/sha2.js';
import { strFromU8, unzipSync } from 'fflate';
import { allRecords, createRecords, type ParentRef, type StrainRecord } from './records';
import { forgetKeys, keysFor } from './record-keys';
import { sealRecord } from './seal-record';
import type { SaveRefusal } from './store';
import { verifyPath } from './verify-link';

// ── Limits ─────────────────────────────────────────────────────────────────────────────

/** Rows sealed in one import. A bigger log is split into several files. */
export const MAX_ROWS = 500;
/** The largest file read. A 500-row log is far smaller, even as .xlsx. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
/** The registry hands back at most 1,000 records in one read (server.js WHOLE_SET.max). */
export const MAX_SET = 1000;
/** Per field, as the logging flow keeps them (log-flow-state.ts parseDraft). */
export const LIMITS = {
  strainName: 200,
  refId: 200,
  taxon: 200,
  bredBy: 200,
  dateCreated: 64,
  notes: 2000,
  parentName: 200,
  parents: 20,
} as const;

// ── Reading the file ───────────────────────────────────────────────────────────────────

export type SheetRow = {
  /** The row number the person sees in their spreadsheet (the header is usually row 1). */
  readonly line: number;
  readonly cells: string[];
};

export type Sheet = {
  readonly kind: 'csv' | 'xlsx';
  readonly headers: string[];
  readonly rows: SheetRow[];
  /** The CSV's separator; a comma for .xlsx. The results file uses the same one. */
  readonly delimiter: string;
  readonly warnings: string[];
};

/** Bytes to text: UTF-8 (BOM dropped), UTF-16 with a BOM, else Windows-1252 (Excel's "CSV" on Windows). */
export const decodeText = (bytes: Uint8Array): string => {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
};

/** The separator: the one used most in the first row, outside quotes. Ties go to the comma. */
const detectDelimiter = (text: string): string => {
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 };
  let quoted = false;
  const end = Math.min(text.length, 64 * 1024);
  for (let i = 0; i < end; i++) {
    const c = text[i];
    if (c === '"') quoted = !quoted;
    else if (!quoted && (c === '\n' || c === '\r')) {
      if (counts[','] + counts[';'] + counts['\t'] > 0) break;
    } else if (!quoted && c in counts) counts[c]++;
  }
  return [',', ';', '\t'].reduce((best, d) => (counts[d] > counts[best] ? d : best), ',');
};

/**
 * CSV to rows. Quoted cells may hold the separator, line breaks and doubled quotes; lines
 * end in CRLF, LF or CR; the separator is a comma, semicolon or tab (Excel in much of
 * Europe writes semicolons), or what an Excel "sep=" first line names.
 */
export const parseCsv = (input: string): { rows: string[][]; delimiter: string; warnings: string[] } => {
  let text = input.replace(/^\uFEFF/, '');
  let delimiter: string | undefined;
  const sep = /^sep=(.)\r?\n/i.exec(text);
  if (sep) {
    delimiter = sep[1];
    text = text.slice(sep[0].length);
  }
  delimiter ??= detectDelimiter(text);
  const rows: string[][] = [];
  const warnings: string[] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let wasQuoted = false;
  let i = 0;
  const endField = () => {
    row.push(wasQuoted ? field : field.trim());
    field = '';
    wasQuoted = false;
  };
  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"' && !wasQuoted && field.trim() === '') {
      quoted = true;
      wasQuoted = true;
      field = '';
      i++;
      continue;
    }
    if (c === delimiter) {
      endField();
      i++;
      continue;
    }
    if (c === '\r' || c === '\n') {
      endField();
      rows.push(row);
      row = [];
      i += c === '\r' && text[i + 1] === '\n' ? 2 : 1;
      continue;
    }
    // Text after a closing quote ("abc" def) is kept, as Excel does.
    field += c;
    i++;
  }
  if (quoted)
    warnings.push('A quote mark in the file is never closed, so the end of the file may be read as one cell.');
  if (field !== '' || wasQuoted || row.length) {
    endField();
    rows.push(row);
  }
  return { rows, delimiter, warnings };
};

const columnName = (i: number): string => {
  let n = i + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

/** Rows to a sheet: the first row with anything in it is the header; empty rows are dropped. */
export const toSheet = (
  raw: { line: number; cells: string[] }[],
  kind: Sheet['kind'],
  delimiter: string,
  warnings: string[] = [],
): Sheet => {
  const filled = (cells: string[]) => cells.some((c) => c.trim() !== '');
  const headerAt = raw.findIndex((r) => filled(r.cells));
  if (headerAt < 0) return { kind, headers: [], rows: [], delimiter, warnings };
  const body = raw.slice(headerAt + 1).filter((r) => filled(r.cells));
  const lastFilled = (cells: string[]) => {
    let n = cells.length;
    while (n > 0 && cells[n - 1].trim() === '') n--;
    return n;
  };
  const width = Math.max(lastFilled(raw[headerAt].cells), ...body.map((r) => lastFilled(r.cells)));
  const seen = new Map<string, number>();
  const headers = Array.from({ length: width }, (_, i) => {
    const base = (raw[headerAt].cells[i] ?? '').replace(/\s+/g, ' ').trim() || `Column ${columnName(i)}`;
    const n = (seen.get(base.toLowerCase()) ?? 0) + 1;
    seen.set(base.toLowerCase(), n);
    return n === 1 ? base : `${base} (${n})`;
  });
  const rows = body.map((r) => ({
    line: r.line,
    cells: Array.from({ length: width }, (_, i) => r.cells[i] ?? ''),
  }));
  return { kind, headers, rows, delimiter, warnings };
};

// ── .xlsx ──────────────────────────────────────────────────────────────────────────────
// An .xlsx file is a zip of XML files. Only what a table of text needs is read: the
// first sheet, its shared strings, and which cells are formatted as dates. Read with
// fflate (already used for the evidence bundle), so no spreadsheet library is added.

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

const fromCodePoint = (n: number): string => {
  try {
    return String.fromCodePoint(n);
  } catch {
    return '';
  }
};

/** XML text to plain text: entities, and Excel's own _xHHHH_ escapes (a line break is _x000D_). */
export const unescapeXml = (s: string): string =>
  s
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e: string) =>
      e.startsWith('#x') || e.startsWith('#X')
        ? fromCodePoint(parseInt(e.slice(2), 16))
        : e.startsWith('#')
          ? fromCodePoint(parseInt(e.slice(1), 10))
          : (ENTITIES[e.toLowerCase()] ?? m),
    )
    .replace(/_x([0-9a-f]{4})_/gi, (_, h: string) => fromCodePoint(parseInt(h, 16)));

const attrsOf = (s: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const m of s.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) out[m[1]] = unescapeXml(m[2] ?? m[3] ?? '');
  return out;
};

/** Elements named `tag` (with or without a namespace prefix): their attributes and inner XML. */
const elements = (xml: string, tag: string): { attrs: Record<string, string>; inner: string }[] => {
  const re = new RegExp(`<(?:[\\w-]+:)?${tag}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>)`, 'g');
  return [...xml.matchAll(re)].map((m) => ({ attrs: attrsOf(m[1]), inner: m[2] ?? '' }));
};

/** The text of a string item: every <t>, phonetic guides (<rPh>) left out. */
const textOf = (inner: string): string =>
  [
    ...inner
      .replace(/<(?:[\w-]+:)?rPh\b[\s\S]*?<\/(?:[\w-]+:)?rPh>/g, '')
      .matchAll(/<(?:[\w-]+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w-]+:)?t>/g),
  ]
    .map((m) => unescapeXml(m[1]))
    .join('');

/** Excel's built-in date formats (not the time-only ones). */
const BUILTIN_DATE_FORMATS = new Set([
  14, 15, 16, 17, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 50, 51, 52, 53, 54, 55, 56, 57, 58,
]);

/** A custom number format that shows a date: it has a day or a year in it, outside quotes and brackets. */
export const isDateFormat = (id: number, code?: string): boolean => {
  if (BUILTIN_DATE_FORMATS.has(id)) return true;
  if (!code) return false;
  const bare = code
    .replace(/"[^"]*"/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\\./g, '');
  return /[dy]/i.test(bare);
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * An Excel date serial to YYYY-MM-DD (the time of day, if any, is dropped). Excel counts
 * 1900 as a leap year, so serials before 1 March 1900 are a day off from the usual rule.
 */
export const serialToIso = (serial: number, date1904 = false): string | undefined => {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2_958_465) return undefined;
  const days = Math.floor(serial);
  const base = date1904 ? Date.UTC(1904, 0, 1) : days < 60 ? Date.UTC(1899, 11, 31) : Date.UTC(1899, 11, 30);
  if (!date1904 && days === 60) return '1900-02-29';
  const d = new Date(base + days * 86_400_000);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
};

const cellColumn = (ref: string | undefined): number | undefined => {
  const m = /^([A-Z]+)\d*$/i.exec(ref ?? '');
  if (!m) return undefined;
  let n = 0;
  for (const ch of m[1].toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

/** The largest single file inside an .xlsx that is unpacked (a zip can claim any size). */
const MAX_XML_BYTES = 40 * 1024 * 1024;

/** The first sheet of an .xlsx, as rows of text. */
export const parseXlsx = (bytes: Uint8Array): { line: number; cells: string[] }[] => {
  const wanted = (name: string) =>
    name === 'xl/workbook.xml' ||
    name === 'xl/_rels/workbook.xml.rels' ||
    name === 'xl/sharedStrings.xml' ||
    name === 'xl/styles.xml' ||
    /^xl\/worksheets\/[^/]+\.xml$/.test(name);
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      filter: (f) => {
        if (!wanted(f.name)) return false;
        if (f.originalSize > MAX_XML_BYTES) throw new Error('too large');
        return true;
      },
    });
  } catch (e) {
    throw new Error(
      (e as Error).message === 'too large'
        ? 'That spreadsheet is too large to read here. Save it with fewer rows and try again.'
        : "That file couldn't be opened as an Excel (.xlsx) file. Save it as .xlsx or CSV and try again.",
    );
  }
  const text = (name: string) => (files[name] ? strFromU8(files[name]) : '');
  const workbook = text('xl/workbook.xml');
  if (!workbook)
    throw new Error("That file couldn't be opened as an Excel (.xlsx) file. Save it as .xlsx or CSV and try again.");
  const date1904 = /<(?:[\w-]+:)?workbookPr\b[^>]*\bdate1904\s*=\s*["'](1|true)["']/i.test(workbook);

  // The first sheet in the workbook's own order, through its relationship.
  const firstSheet = elements(workbook, 'sheet')[0];
  const rid =
    firstSheet && (firstSheet.attrs['r:id'] ?? Object.entries(firstSheet.attrs).find(([k]) => /:id$/.test(k))?.[1]);
  const rel = elements(text('xl/_rels/workbook.xml.rels'), 'Relationship').find((r) => r.attrs.Id === rid);
  let sheetPath: string | undefined;
  if (rel?.attrs.Target) {
    const t = rel.attrs.Target.replace(/\\/g, '/');
    sheetPath = t.startsWith('/') ? t.slice(1) : `xl/${t.replace(/^\.\//, '')}`;
  }
  if (!sheetPath || !files[sheetPath]) {
    sheetPath = Object.keys(files)
      .filter((n) => /^xl\/worksheets\/[^/]+\.xml$/.test(n))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[0];
  }
  if (!sheetPath) throw new Error('That spreadsheet has no sheet in it.');

  const shared = elements(text('xl/sharedStrings.xml'), 'si').map((si) => textOf(si.inner));

  // Which cell styles are dates.
  const styles = text('xl/styles.xml');
  const customFormats = new Map(
    elements(styles, 'numFmt').map((f) => [Number(f.attrs.numFmtId), f.attrs.formatCode] as const),
  );
  const cellXfs = elements(styles, 'cellXfs')[0]?.inner ?? '';
  const dateStyles = elements(cellXfs, 'xf').map((xf) => {
    const id = Number(xf.attrs.numFmtId ?? 0);
    return isDateFormat(id, customFormats.get(id));
  });

  const out: { line: number; cells: string[] }[] = [];
  let nextRow = 1;
  for (const row of elements(text(sheetPath), 'row')) {
    const line = Number(row.attrs.r) || nextRow;
    nextRow = line + 1;
    const cells: string[] = [];
    let nextCol = 0;
    for (const c of elements(row.inner, 'c')) {
      const col = cellColumn(c.attrs.r) ?? nextCol;
      nextCol = col + 1;
      if (col > 16_383) continue;
      const v = /<(?:[\w-]+:)?v(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w-]+:)?v>/.exec(c.inner)?.[1];
      const raw = v === undefined ? undefined : unescapeXml(v);
      let value = '';
      switch (c.attrs.t) {
        case 's':
          value = shared[Number(raw)] ?? '';
          break;
        case 'inlineStr':
          value = textOf(elements(c.inner, 'is')[0]?.inner ?? '');
          break;
        case 'b':
          value = raw === undefined ? '' : raw === '1' ? 'TRUE' : 'FALSE';
          break;
        case 'd':
          value = (raw ?? '').slice(0, 10);
          break;
        case 'str':
        case 'e':
          value = raw ?? '';
          break;
        default: {
          // A number, unless its style shows it as a date.
          const style = Number(c.attrs.s ?? 0);
          value = raw ?? '';
          if (raw !== undefined && dateStyles[style]) value = serialToIso(Number(raw), date1904) ?? raw;
        }
      }
      while (cells.length < col) cells.push('');
      cells[col] = value;
    }
    out.push({ line, cells });
  }
  return out;
};

const isXlsx = (name: string, bytes: Uint8Array) =>
  /\.xlsx$/i.test(name) || (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04);

/** Read a picked file into a sheet, in the browser. Throws with a plain sentence when it can't. */
export const readSheet = async (file: Pick<File, 'name' | 'size' | 'arrayBuffer'>): Promise<Sheet> => {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `That file is larger than ${MAX_FILE_BYTES / (1024 * 1024)} MB. Import up to ${MAX_ROWS} rows at a time.`,
    );
  }
  if (/\.(xls|xlsm|xlsb|ods|numbers)$/i.test(file.name)) {
    throw new Error('That kind of spreadsheet isn’t read here. Save it as Excel (.xlsx) or CSV and pick that.');
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (isXlsx(file.name, bytes)) return toSheet(parseXlsx(bytes), 'xlsx', ',');
  const { rows, delimiter, warnings } = parseCsv(decodeText(bytes));
  return toSheet(
    rows.map((cells, i) => ({ line: i + 1, cells })),
    'csv',
    delimiter,
    warnings,
  );
};

// ── Which column is which ──────────────────────────────────────────────────────────────

export const FIELDS = [
  'strainName',
  'refId',
  'taxon',
  'parents',
  'parents2',
  'bredBy',
  'dateCreated',
  'notes',
] as const;
export type FieldKey = (typeof FIELDS)[number];

export const FIELD_LABELS: Record<FieldKey, string> = {
  strainName: 'Plant or line name',
  refId: 'Your ID (accession or lot number)',
  taxon: 'Species',
  parents: 'Parents',
  parents2: 'Second parent',
  bredBy: 'Bred by',
  dateCreated: 'Date (your own note)',
  notes: 'Notes',
};

export type DateOrder = 'auto' | 'mdy' | 'dmy';

export type Mapping = {
  readonly columns: Record<FieldKey, number | null>;
  /** Bred by, for rows where the file doesn't say (or has no such column). */
  readonly bredByDefault: string;
  /** How dates like 03/04/2021 are read: found from the column when it can be. */
  readonly dateOrder: DateOrder;
};

export const emptyMapping = (): Mapping => ({
  columns: {
    strainName: null,
    refId: null,
    taxon: null,
    parents: null,
    parents2: null,
    bredBy: null,
    dateCreated: null,
    notes: null,
  },
  bredByDefault: '',
  dateOrder: 'auto',
});

const words = (h: string) =>
  ` ${h
    .toLowerCase()
    .replace(/#/g, ' no ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;

/** First match wins, in this order: the specific names come before the general ones. */
const GUESSES: [FieldKey, RegExp][] = [
  ['taxon', / (species|taxon|taxa|scientific name|botanical name|latin name|common name|genus|crop) /],
  ['bredBy', / (bred by|breeder|breeders|breeder name|originator|developer|developed by|made by|created by|bredby) /],
  ['dateCreated', / (date|dated|year|when|created|made|bred|initiated) /],
  ['parents2', / (father|male|pollen|sire|paternal|parent 2|parent2|second parent) /],
  ['parents', / (parents?|parentage|pedigree|lineage|cross|mother|female|dam|maternal|parent 1|parent1|genetics) /],
  ['notes', / (notes?|comments?|remarks?|description|details|observations?|memo) /],
  ['strainName', / (name) /],
  ['refId', / (id|no|nr|number|num|code|ref|reference|lot|accession|catalog|catalogue|tag|sku|barcode|sample) /],
  ['strainName', / (cultivar|variety|strain|plant|line|genotype|clone|selection|accession name|label) /],
];

/** Guess which column is which from the header names. Each column is used once. */
export const guessMapping = (headers: string[]): Mapping => {
  const m = emptyMapping();
  const columns = { ...m.columns };
  headers.forEach((h, i) => {
    const w = words(h);
    for (const [field, re] of GUESSES) {
      if (columns[field] !== null) continue;
      if (re.test(w)) {
        columns[field] = i;
        return;
      }
    }
  });
  return { ...m, columns };
};

// ── A row as it would be sealed ────────────────────────────────────────────────────────

export type RowFields = {
  readonly strainName: string;
  readonly refId: string;
  readonly taxon: string;
  readonly parents: ParentRef[];
  readonly bredBy: string;
  readonly dateCreated: string;
  readonly notes: string;
};

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
/** One line: control characters out, runs of spaces and line breaks to one space. */
const oneLine = (s: string) => s.replace(CONTROL, '').replace(/\s+/g, ' ').trim();
/** Notes keep their line breaks. */
const multiLine = (s: string) =>
  s
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();

/**
 * Parents written in one cell: "Mother x Father", "A × B", "A; B", "(A x B) x C". Split
 * only outside brackets, so a cross named as a parent stays one parent.
 */
export const splitParents = (s: string): string[] => {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  const spaced = (i: number) => /\s/.test(s[i - 1] ?? '') && /\s/.test(s[i + 1] ?? '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[') depth++;
    else if ((c === ')' || c === ']') && depth > 0) depth--;
    if (depth === 0 && (c === '×' || c === ';' || c === '\n' || ((c === 'x' || c === 'X' || c === '/') && spaced(i)))) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out.map(oneLine).filter(Boolean);
};

const DMY_OR_MDY = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})$/;

const validYmd = (y: number, m: number, d: number) =>
  m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(y, m, 0)).getUTCDate();

const iso = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`;

/** Two-digit years as Excel reads them: 00–29 are 2000s, 30–99 are 1900s. */
const fullYear = (y: string) => (y.length === 4 ? Number(y) : Number(y) + (Number(y) < 30 ? 2000 : 1900));

/** Which order a date column uses, when any value shows it (a first part over 12 is a day). */
export const detectDateOrder = (values: string[]): 'mdy' | 'dmy' | undefined => {
  let dmy = false;
  let mdy = false;
  for (const v of values) {
    const m = DMY_OR_MDY.exec(v.trim());
    if (!m) continue;
    if (Number(m[1]) > 12 && Number(m[2]) <= 12) dmy = true;
    if (Number(m[2]) > 12 && Number(m[1]) <= 12) mdy = true;
  }
  return dmy === mdy ? undefined : dmy ? 'dmy' : 'mdy';
};

/**
 * A stated date as it is sealed: YYYY-MM-DD when the cell is clearly a date (ISO, a known
 * order, an Excel serial number in a CSV), else exactly as written ("Spring 2019", "2019").
 * `ambiguous` says it was kept as written because day and month could be either.
 */
export const normalizeDate = (value: string, order?: 'mdy' | 'dmy'): { value: string; ambiguous: boolean } => {
  const v = oneLine(value);
  if (!v) return { value: '', ambiguous: false };
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ].*)?$/.exec(v);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return { value: validYmd(y, mo, d) ? iso(y, mo, d) : v, ambiguous: false };
  }
  m = DMY_OR_MDY.exec(v);
  if (m) {
    const [a, b, y] = [Number(m[1]), Number(m[2]), fullYear(m[3])];
    let use = order;
    if (a > 12 && b <= 12) use = 'dmy';
    else if (b > 12 && a <= 12) use = 'mdy';
    else if (a === b) use = 'mdy';
    // Dots are the European way of writing a date: day first.
    else if (!use && v.includes('.')) use = 'dmy';
    if (!use) return { value: v, ambiguous: true };
    const [mo, d] = use === 'mdy' ? [a, b] : [b, a];
    return { value: validYmd(y, mo, d) ? iso(y, mo, d) : v, ambiguous: false };
  }
  // An Excel date serial that came through a CSV (a date column formatted as a number).
  if (/^\d{5}(\.\d+)?$/.test(v)) {
    const n = Number(v);
    if (n >= 20_000 && n <= 80_000) return { value: serialToIso(n) ?? v, ambiguous: false };
  }
  return { value: v, ambiguous: false };
};

const cellOf = (row: SheetRow, col: number | null) => (col === null ? '' : (row.cells[col] ?? ''));

/** The order the date column uses, from the mapping or, on auto, from its values. */
export const dateOrderFor = (sheet: Sheet, mapping: Mapping): 'mdy' | 'dmy' | undefined =>
  mapping.dateOrder !== 'auto'
    ? mapping.dateOrder
    : detectDateOrder(sheet.rows.map((r) => cellOf(r, mapping.columns.dateCreated)));

/** A row's values exactly as they would be sealed. */
export const rowFields = (
  row: SheetRow,
  mapping: Mapping,
  order?: 'mdy' | 'dmy',
): RowFields & { dateAmbiguous: boolean } => {
  const c = mapping.columns;
  const parents = [...splitParents(cellOf(row, c.parents)), ...splitParents(cellOf(row, c.parents2))].map((name) => ({
    name,
  }));
  const date = normalizeDate(cellOf(row, c.dateCreated), order);
  return {
    strainName: oneLine(cellOf(row, c.strainName)),
    refId: oneLine(cellOf(row, c.refId)),
    taxon: oneLine(cellOf(row, c.taxon)),
    parents,
    bredBy: oneLine(cellOf(row, c.bredBy)) || oneLine(mapping.bredByDefault),
    dateCreated: date.value,
    notes: multiLine(cellOf(row, c.notes)),
    dateAmbiguous: date.ambiguous,
  };
};

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/** What a row is known by: a hash of the values it is sealed with. Same values, same hash. */
export const rowHashOf = (f: RowFields): string =>
  hex(
    sha256(
      new TextEncoder().encode(
        JSON.stringify([
          'veilcore-bulk-row-v1',
          f.strainName,
          f.refId,
          f.taxon,
          f.parents.map((p) => p.name),
          f.bredBy,
          f.dateCreated,
          f.notes,
        ]),
      ),
    ),
  );

/** The same hash for a record already in the set, so a row sealed on another device is found too. */
export const recordRowHash = (r: StrainRecord): string =>
  rowHashOf({
    strainName: r.strainName ?? '',
    refId: r.refId ?? '',
    taxon: r.taxon ?? '',
    parents: r.parents ?? [],
    bredBy: r.bredBy ?? '',
    dateCreated: r.dateCreated ?? '',
    notes: r.notes ?? '',
  });

const nameIdKey = (name: string, id: string) => `${name.toLowerCase()}\u0000${id.toLowerCase()}`;

// ── Checking every row ─────────────────────────────────────────────────────────────────

export type RowStatus = 'ready' | 'already' | 'problem';

export type PreparedRow = {
  readonly line: number;
  readonly cells: string[];
  readonly fields: RowFields;
  readonly hash: string;
  readonly status: RowStatus;
  /** Plain sentences, for a row that can't be sealed. */
  readonly problems: string[];
  /** The record this row already is (status 'already'). */
  readonly existingId?: string;
  readonly existingFingerprint?: string;
  readonly dateAmbiguous?: boolean;
};

export type Checked = {
  readonly rows: PreparedRow[];
  readonly ready: number;
  readonly already: number;
  readonly problems: number;
  /** Dates kept as written because day and month could be either way round. */
  readonly ambiguousDates: number;
  /** Set when the import can't go ahead at all: too many rows, or no name column. */
  readonly blocked?: string;
};

const tooLong = (what: string, v: string, max: number) =>
  v.length > max ? `${what} is too long: ${v.length} characters, the most is ${max}.` : undefined;

/**
 * Check every row against the limits, the rest of the file and the holder's records.
 * A row already sealed (same values) is not a problem: it is skipped and named.
 */
export const checkRows = (
  sheet: Sheet,
  mapping: Mapping,
  ctx: { existing: readonly StrainRecord[]; ledger?: Ledger } = { existing: [] },
): Checked => {
  const order = dateOrderFor(sheet, mapping);
  const ledger = ctx.ledger ?? loadLedger();
  const byHash = new Map<string, StrainRecord>();
  const byNameId = new Map<string, StrainRecord>();
  for (const r of ctx.existing) {
    if (!r.recordFingerprint) continue;
    byHash.set(recordRowHash(r), r);
    if (!r.supersededBy) byNameId.set(nameIdKey(oneLine(r.strainName ?? ''), oneLine(r.refId ?? '')), r);
  }
  const seenInFile = new Map<string, number>();
  const rows: PreparedRow[] = sheet.rows.map((row) => {
    const { dateAmbiguous, ...fields } = rowFields(row, mapping, order);
    const hash = rowHashOf(fields);
    const base = { line: row.line, cells: row.cells, fields, hash, dateAmbiguous };
    const problems: string[] = [];
    if (!fields.strainName) problems.push('No plant name.');
    for (const p of [
      tooLong('The plant name', fields.strainName, LIMITS.strainName),
      tooLong('The ID', fields.refId, LIMITS.refId),
      tooLong('The species', fields.taxon, LIMITS.taxon),
      tooLong('Bred by', fields.bredBy, LIMITS.bredBy),
      tooLong('The date', fields.dateCreated, LIMITS.dateCreated),
      tooLong('The notes', fields.notes, LIMITS.notes),
      ...fields.parents.map((p) => tooLong(`The parent "${p.name.slice(0, 30)}…"`, p.name, LIMITS.parentName)),
    ])
      if (p) problems.push(p);
    if (fields.parents.length > LIMITS.parents)
      problems.push(`Too many parents: ${fields.parents.length}, the most is ${LIMITS.parents}.`);

    const key = nameIdKey(fields.strainName, fields.refId);
    const earlier = fields.strainName ? seenInFile.get(key) : undefined;
    if (earlier !== undefined) {
      problems.push(
        fields.refId ? `Same name and ID as row ${earlier}.` : `Same name as row ${earlier}, and neither has an ID.`,
      );
    } else if (fields.strainName) seenInFile.set(key, row.line);
    if (problems.length) return { ...base, status: 'problem' as const, problems };

    // Already sealed: by this browser (the ledger), or a record with the same values.
    const entry = ledger.rows[hash];
    const record = byHash.get(hash);
    if (entry?.state === 'sealed' || record) {
      return {
        ...base,
        status: 'already' as const,
        problems: [],
        existingId: entry?.state === 'sealed' ? entry.recordId : record?.id,
        existingFingerprint: entry?.state === 'sealed' ? entry.fingerprint : record?.recordFingerprint,
      };
    }
    const sameName = entry ? undefined : byNameId.get(key);
    if (sameName) {
      return {
        ...base,
        status: 'problem' as const,
        problems: [
          `Already in your records with other details (${sameName.id}). Leave this row out, or change that record with a correction.`,
        ],
      };
    }
    return { ...base, status: 'ready' as const, problems: [] };
  });

  const count = (s: RowStatus) => rows.filter((r) => r.status === s).length;
  let blocked: string | undefined;
  if (sheet.rows.length > MAX_ROWS) {
    blocked = `This file has ${sheet.rows.length} rows. Import up to ${MAX_ROWS} at a time: split the file and import the rest after.`;
  } else if (mapping.columns.strainName === null) {
    blocked = 'Pick the column that has the plant or line name.';
  } else if (ctx.existing.length + count('ready') > MAX_SET) {
    blocked = `That would make ${ctx.existing.length + count('ready')} records, and this site shows at most ${MAX_SET}. Import fewer rows.`;
  }
  return {
    rows,
    ready: count('ready'),
    already: count('already'),
    problems: count('problem'),
    ambiguousDates: rows.filter((r) => r.dateAmbiguous && r.status !== 'problem').length,
    blocked,
  };
};

// ── Sealing ────────────────────────────────────────────────────────────────────────────

/**
 * The record for one row, sealed exactly as the logging flow seals one plant: the same
 * function (seal-record.ts), so the same fields, fingerprint and key binding. A row has no
 * breeding method and no photos. The shape is the one createRecord gives a record.
 */
export const sealRowRecord = async (f: RowFields, now = Date.now()): Promise<StrainRecord> => {
  const sealed = await sealRecord(
    {
      strainName: f.strainName,
      bredBy: f.bredBy,
      dateCreated: f.dateCreated,
      notes: f.notes,
      parents: f.parents,
      breedingMethod: '',
      photoFingerprints: [],
      refId: f.refId,
      taxon: f.taxon,
    },
    now,
  );
  return { licenseIds: [], ...sealed };
};

/** What happened to one batch at the registry. */
export type CommitResult = {
  /** Ids the registry now holds. */
  readonly stored: string[];
  /** Ids it refused, each with its reason: never stored. */
  readonly refused: SaveRefusal[];
  /** Set when the batch may or may not have landed: send the same records again later. */
  readonly retry?: string;
};

export type Committer = (batch: StrainRecord[]) => Promise<CommitResult>;

/**
 * Send a batch: one save of the whole set with the batch in it (records.ts createRecords,
 * which reads the set back so the app shows the new records). Awaited, so the next batch
 * never reads the set before this one is in it.
 */
export const registryCommit: Committer = async (batch) => {
  const ids = new Set(batch.map((r) => r.id));
  const result = await createRecords(batch);
  if (result.offline) return { stored: [], refused: [], retry: "Couldn't reach VeilCore's server." };
  const whole = result.refused.find((r) => r.id === '*');
  if (whole) return { stored: [], refused: [], retry: whole.reason };
  const refused = result.refused.filter((r) => ids.has(r.id));
  const no = new Set(refused.map((r) => r.id));
  return { stored: batch.filter((r) => !no.has(r.id)).map((r) => r.id), refused };
};

export type RowOutcome =
  | { readonly state: 'sealed'; readonly recordId: string; readonly fingerprint: string; readonly before?: boolean }
  | { readonly state: 'refused'; readonly reason: string };

export type SealResult = {
  readonly outcomes: Record<string, RowOutcome>;
  /** Set when sealing stopped early and can be picked up again. */
  readonly stopped?: string;
};

export type SealProgress = { readonly done: number; readonly total: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Seal the ready rows, in batches. Safe to call again with the same rows at any point
 * (after a closed tab, a lost connection): sealed rows are skipped, and a row with a
 * record waiting in the ledger is sent as that record, never as a new one.
 */
export const sealRows = async (
  rows: readonly PreparedRow[],
  opts: {
    commit?: Committer;
    batchSize?: number;
    /** Between batches, so the registry's read limit (30 a minute) is never reached. */
    gapMs?: number;
    onProgress?: (p: SealProgress) => void;
    shouldStop?: () => boolean;
  } = {},
): Promise<SealResult> => {
  const commit = opts.commit ?? registryCommit;
  const size = opts.batchSize ?? 50;
  const gap = opts.gapMs ?? 2500;
  const todo = rows.filter((r) => r.status === 'ready');
  const outcomes: Record<string, RowOutcome> = {};
  let done = 0;
  const report = () => opts.onProgress?.({ done, total: todo.length });
  report();

  for (let at = 0; at < todo.length; at += size) {
    if (opts.shouldStop?.()) return { outcomes, stopped: 'Stopped. Pick it up again any time.' };
    if (at > 0 && gap > 0) await sleep(gap);
    const ledger = loadLedger();
    const inSet = new Map(allRecords().map((r) => [recordRowHash(r), r] as const));
    const batch: StrainRecord[] = [];
    const hashOf = new Map<string, string>();
    for (const row of todo.slice(at, at + size)) {
      const entry = ledger.rows[row.hash];
      if (entry?.state === 'sealed') {
        outcomes[row.hash] = { state: 'sealed', recordId: entry.recordId, fingerprint: entry.fingerprint };
        continue;
      }
      if (entry?.state === 'pending' && entry.record && keysFor(entry.recordId)) {
        // Sent before and not confirmed: the same record again.
        batch.push(entry.record);
        hashOf.set(entry.recordId, row.hash);
        continue;
      }
      const found = inSet.get(row.hash);
      if (found?.recordFingerprint) {
        ledger.rows[row.hash] = {
          recordId: found.id,
          fingerprint: found.recordFingerprint,
          state: 'sealed',
          at: Date.now(),
        };
        outcomes[row.hash] = { state: 'sealed', recordId: found.id, fingerprint: found.recordFingerprint };
        continue;
      }
      try {
        const record = await sealRowRecord(row.fields);
        ledger.rows[row.hash] = {
          recordId: record.id,
          fingerprint: record.recordFingerprint,
          state: 'pending',
          at: Date.now(),
          record,
        };
        batch.push(record);
        hashOf.set(record.id, row.hash);
      } catch (e) {
        outcomes[row.hash] = { state: 'refused', reason: e instanceof Error ? e.message : String(e) };
      }
    }
    // Written down before anything is sent: a closed tab from here on loses nothing.
    saveLedger(ledger);

    if (batch.length) {
      const result = await commit(batch);
      const after = loadLedger();
      for (const id of result.stored) {
        const h = hashOf.get(id);
        if (!h) continue;
        const e = after.rows[h] ?? ledger.rows[h];
        after.rows[h] = { recordId: id, fingerprint: e.fingerprint, state: 'sealed', at: Date.now() };
        outcomes[h] = { state: 'sealed', recordId: id, fingerprint: e.fingerprint };
      }
      for (const r of result.refused) {
        const h = hashOf.get(r.id);
        if (!h) continue;
        // Refused by id: never stored, so its keys name nothing.
        forgetKeys(r.id);
        delete after.rows[h];
        outcomes[h] = { state: 'refused', reason: r.reason };
      }
      saveLedger(after);
      if (result.retry) {
        report();
        return {
          outcomes,
          stopped: `${result.retry} The last ${batch.length === 1 ? 'row was' : `${batch.length} rows were`} kept here and will be sent again, as the same records.`,
        };
      }
    }
    done = Math.min(todo.length, at + size);
    report();
  }
  return { outcomes };
};

// ── What this browser keeps: the ledger and the job ────────────────────────────────────

const LEDGER_KEY = 'veilcore.bulk-import.v1';

export type LedgerEntry = {
  readonly recordId: string;
  readonly fingerprint: string;
  readonly state: 'pending' | 'sealed';
  readonly at: number;
  /** The whole record while it is waiting to be confirmed (it is what the registry gets anyway). */
  readonly record?: StrainRecord;
};

export type Ledger = { version: 1; rows: Record<string, LedgerEntry> };

export const loadLedger = (): Ledger => {
  try {
    const v = JSON.parse(localStorage.getItem(LEDGER_KEY) ?? 'null') as Ledger | null;
    if (v && v.version === 1 && v.rows && typeof v.rows === 'object') return v;
  } catch {
    /* nothing kept, or unreadable: start empty */
  }
  return { version: 1, rows: {} };
};

/** False when this browser won't keep it (private window, full storage). */
export const saveLedger = (l: Ledger): boolean => {
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(l));
    return true;
  } catch {
    return false;
  }
};

const JOB_KEY = 'veilcore.bulk-import.job.v1';

export type JobPhase = 'sealing' | 'sealed' | 'backed-up';

/** One import, kept so a closed tab comes back to where it was. */
export type Job = {
  readonly version: 1;
  readonly fileName: string;
  readonly startedAt: number;
  readonly headers: string[];
  readonly delimiter: string;
  readonly rows: PreparedRow[];
  readonly phase: JobPhase;
  readonly outcomes: Record<string, RowOutcome>;
};

export const loadJob = (): Job | undefined => {
  try {
    const v = JSON.parse(localStorage.getItem(JOB_KEY) ?? 'null') as Job | null;
    if (v && v.version === 1 && Array.isArray(v.rows) && Array.isArray(v.headers)) return v;
  } catch {
    /* none kept */
  }
  return undefined;
};

export const saveJob = (job: Job): boolean => {
  try {
    localStorage.setItem(JOB_KEY, JSON.stringify(job));
    return true;
  } catch {
    return false;
  }
};

export const clearJob = (): void => {
  try {
    localStorage.removeItem(JOB_KEY);
  } catch {
    /* nothing kept */
  }
};

/** Every row's outcome: what was sealed now, what was sealed before, what couldn't be. */
export const jobSummary = (job: Pick<Job, 'rows' | 'outcomes'>) => {
  let sealed = 0;
  let before = 0;
  let notSealed = 0;
  let waiting = 0;
  for (const r of job.rows) {
    const o = job.outcomes[r.hash];
    if (r.status === 'already') before++;
    else if (r.status === 'problem' || o?.state === 'refused') notSealed++;
    else if (o?.state === 'sealed') sealed++;
    else waiting++;
  }
  return { sealed, before, notSealed, waiting };
};

/** The ids of the records this job made (not those sealed before it). */
export const jobRecordIds = (job: Pick<Job, 'rows' | 'outcomes'>): string[] =>
  job.rows
    .filter((r) => r.status === 'ready')
    .map((r) => job.outcomes[r.hash])
    .flatMap((o) => (o?.state === 'sealed' ? [o.recordId] : []));

// ── The results file ───────────────────────────────────────────────────────────────────

/**
 * One cell of the results CSV. A cell that a spreadsheet would run as a formula (=, +, @,
 * or a minus that isn't a number) gets a leading apostrophe, so opening the file runs
 * nothing.
 */
export const csvCell = (v: string, delimiter: string): string => {
  const safe = /^[=+@\t\r]/.test(v) || /^-(?![\d.]+$)/.test(v) ? `'${v}` : v;
  return /["\r\n]/.test(safe) || safe.includes(delimiter) || /^\s|\s$/.test(safe)
    ? `"${safe.replace(/"/g, '""')}"`
    : safe;
};

export const RESULT_COLUMNS = ['VeilCore record ID', 'Fingerprint', 'Check link', 'Result'] as const;

/**
 * The results file: every row of the original, as it was, plus the record it became, its
 * fingerprint and a link anyone can open to check it. Same separator as the file read.
 */
export const resultsCsv = (job: Pick<Job, 'headers' | 'delimiter' | 'rows' | 'outcomes'>, origin: string): string => {
  const d = job.delimiter || ',';
  const line = (cells: string[]) => cells.map((c) => csvCell(c, d)).join(d);
  const out = [line([...job.headers, ...RESULT_COLUMNS])];
  for (const r of job.rows) {
    const o = job.outcomes[r.hash];
    let id = '';
    let fp = '';
    let result: string;
    if (r.status === 'already') {
      id = r.existingId ?? '';
      fp = r.existingFingerprint ?? '';
      result = 'Already sealed before';
    } else if (r.status === 'problem') {
      result = `Not sealed: ${r.problems.join(' ')}`;
    } else if (o?.state === 'sealed') {
      id = o.recordId;
      fp = o.fingerprint;
      result = 'Sealed';
    } else if (o?.state === 'refused') {
      result = `Not sealed: ${o.reason}`;
    } else {
      result = 'Not sealed yet';
    }
    const link = id ? `${origin.replace(/\/$/, '')}${verifyPath(id, fp)}` : '';
    out.push(line([...job.headers.map((_, i) => r.cells[i] ?? ''), id, fp, link, result]));
  }
  return `\uFEFF${out.join('\r\n')}\r\n`;
};

/** The results file's name, from the file read. */
export const resultsFileName = (fileName: string): string =>
  `${fileName.replace(/\.(csv|xlsx|txt|tsv)$/i, '') || 'collection'} - VeilCore records.csv`;

// ── Key date stamps, a few at a time ───────────────────────────────────────────────────

const STAMPS_KEY = 'veilcore.bulk-import.stamps.v1';

export type StampQueueState = { readonly pauseUntil?: number; readonly stopped?: string };

export const loadStampState = (): StampQueueState => {
  try {
    const v = JSON.parse(localStorage.getItem(STAMPS_KEY) ?? 'null') as StampQueueState | null;
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
};

export const saveStampState = (s: StampQueueState): void => {
  try {
    localStorage.setItem(STAMPS_KEY, JSON.stringify(s));
  } catch {
    /* kept on this screen only */
  }
};

/**
 * What the queue does after a key date stamp fails. A transaction that WAS sent stops the
 * queue: sending again could send it twice. Anything else waits: as long as the fee
 * service said, or by what its words say (this hour, today), and at least a minute.
 */
export const stampWait = (e: unknown, now = Date.now()): StampQueueState => {
  const msg = e instanceof Error ? e.message : String(e);
  if (/WAS sent/.test(msg)) {
    const tx = /WAS sent \(([^)]+)\)/.exec(msg)?.[1];
    return {
      stopped: `A date stamp may already have gone out${tx ? ` (transaction ${tx})` : ''}. Stopped so nothing is sent twice. Check it on that plant's page before going on.`,
    };
  }
  const given = (e as { retryAfterSeconds?: unknown } | null)?.retryAfterSeconds;
  let seconds =
    typeof given === 'number' && given > 0
      ? given
      : /tomorrow|today/i.test(msg)
        ? 6 * 3600
        : /hour/i.test(msg)
          ? 3600
          : /minute/i.test(msg)
            ? 60
            : 5 * 60;
  seconds = Math.min(Math.max(seconds, 60), 24 * 3600);
  return { pauseUntil: now + seconds * 1000 };
};
