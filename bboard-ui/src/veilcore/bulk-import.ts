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
import { inflateSync, strFromU8, unzipSync } from 'fflate';
import { allRecords, createRecords, type ParentRef, type StrainRecord } from './records';
import { loadLedger, saveLedger, type Ledger } from './bulk-import-ledger';
import { forgetKeys, keysFor } from './record-keys';
import { sealAnimalRecord, sealRecord } from './seal-record';
import { isAnimal, isCalendarDate, type AnimalDetails, type AnimalSex } from './animal-profile';
import type { SaveRefusal } from './store';
import { nameLinkParams, verifyPath } from './verify-link';

// ── Limits ─────────────────────────────────────────────────────────────────────────────

/** Rows sealed in one import. A bigger log is split into several files. */
export const MAX_ROWS = 500;
/** The largest file read. A 500-row log is far smaller, even as .xlsx. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
/** Columns read from a file. An accession log has a few dozen at most. */
export const MAX_COLUMNS = 100;
/** Lines of a CSV read before stopping: far more than MAX_ROWS, so a file over it is still named as one. */
const MAX_CSV_LINES = 20_000;
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
  /** The row the column names were taken from (as the spreadsheet numbers it); 0 for an empty file. */
  readonly headerLine: number;
  /** Every row with anything in it, the column names' row and anything above it included. */
  readonly raw: SheetRow[];
  /** What reading the file itself said, kept apart so picking another header row doesn't repeat it. */
  readonly fileWarnings: string[];
  /** Set when reading stopped early because the file has far more rows than an import takes. */
  readonly moreRows?: boolean;
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
 * Europe writes semicolons), or what an Excel "sep=" first line names: a comma, semicolon,
 * tab or bar only. Any other "sep=" (an "=" or a quote would turn the results file's lines
 * into formulas) is dropped and the separator found as usual.
 */
export const parseCsv = (
  input: string,
): { rows: string[][]; delimiter: string; warnings: string[]; moreRows?: boolean } => {
  let text = input.replace(/^\uFEFF/, '');
  let delimiter: string | undefined;
  const sep = /^sep=(.)\r?\n/i.exec(text);
  if (sep) {
    if ([',', ';', '\t', '|'].includes(sep[1])) delimiter = sep[1];
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
      if (rows.length >= MAX_CSV_LINES && i < text.length) return { rows, delimiter, warnings, moreRows: true };
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

const isFilled = (cells: string[]) => cells.some((c) => c.trim() !== '');
const filledCount = (cells: string[]) => cells.reduce((n, c) => (c.trim() ? n + 1 : n), 0);

/** How far down a file the column names are looked for. */
export const HEADER_SCAN = 20;

/**
 * A cell that reads like a column name this page knows ("Cultivar / Line", "Acc. #",
 * "Date"). Not one with a number in it: "Plant 7" and "ID-0042" are values ("Parent 1"
 * and "Parent 2" excepted).
 */
const knownColumnName = (v: string): boolean => {
  const t = v.trim();
  return (
    t !== '' &&
    t.length <= 60 &&
    !/\d/.test(t.replace(/parent\s*[12]\b/gi, '')) &&
    GUESSES.some(([, re]) => re.test(words(t)))
  );
};

/**
 * Which of the first rows holds the column names. A spreadsheet often starts with a title
 * ("Green Valley Lab — Accession Register", often merged across the columns, so one cell),
 * a date or a blank row, and the names come after. The pick: the first row that is about as
 * wide as the table and has at least two names this page knows; else the first row that is
 * about as wide as the table; else the first row. `rows` are the filled rows, in order.
 */
export const detectHeaderRow = (rows: readonly SheetRow[]): number => {
  const top = rows.slice(0, HEADER_SCAN);
  if (top.length === 0) return 0;
  const widest = Math.max(...top.map((r) => filledCount(r.cells)));
  const wide = widest <= 1 ? 1 : Math.max(2, Math.ceil(widest / 2));
  const named = top.findIndex((r) => filledCount(r.cells) >= wide && r.cells.filter(knownColumnName).length >= 2);
  if (named >= 0) return named;
  const first = top.findIndex((r) => filledCount(r.cells) >= wide);
  return first >= 0 ? first : 0;
};

/**
 * Rows to a sheet. The column names come from `headerLine` when given (the row the person
 * picked), else from detectHeaderRow; rows above them are left out, and so are empty rows.
 */
export const toSheet = (
  raw: { line: number; cells: string[] }[],
  kind: Sheet['kind'],
  delimiter: string,
  warnings: string[] = [],
  opts: { headerLine?: number; moreRows?: boolean } = {},
): Sheet => {
  const filledRows = raw.filter((r) => isFilled(r.cells));
  const base = { kind, delimiter, raw: filledRows, fileWarnings: warnings, moreRows: opts.moreRows || undefined };
  if (filledRows.length === 0) return { ...base, headers: [], rows: [], warnings, headerLine: 0 };
  const picked = opts.headerLine === undefined ? -1 : filledRows.findIndex((r) => r.line === opts.headerLine);
  const headerAt = picked >= 0 ? picked : detectHeaderRow(filledRows);
  const header = filledRows[headerAt];
  const body = filledRows.slice(headerAt + 1);
  const lastFilled = (cells: string[]) => {
    let n = cells.length;
    while (n > 0 && cells[n - 1].trim() === '') n--;
    return n;
  };
  const fullWidth = body.reduce((w, r) => Math.max(w, lastFilled(r.cells)), lastFilled(header.cells));
  const width = Math.min(fullWidth, MAX_COLUMNS);
  const seen = new Map<string, number>();
  const headers = Array.from({ length: width }, (_, i) => {
    const name = (header.cells[i] ?? '').replace(/\s+/g, ' ').trim() || `Column ${columnName(i)}`;
    const n = (seen.get(name.toLowerCase()) ?? 0) + 1;
    seen.set(name.toLowerCase(), n);
    return n === 1 ? name : `${name} (${n})`;
  });
  const rows = body.map((r) => ({
    line: r.line,
    cells: Array.from({ length: width }, (_, i) => r.cells[i] ?? ''),
  }));
  const own =
    fullWidth > MAX_COLUMNS
      ? [
          `Only the first ${MAX_COLUMNS} columns are read. The columns after ${columnName(MAX_COLUMNS - 1)} are left out.`,
        ]
      : [];
  return { ...base, headers, rows, warnings: [...warnings, ...own], headerLine: header.line };
};

/** The same file with its column names taken from another row (the "Which row" step). */
export const withHeaderRow = (sheet: Sheet, line: number): Sheet =>
  toSheet(sheet.raw, sheet.kind, sheet.delimiter, sheet.fileWarnings, { headerLine: line, moreRows: sheet.moreRows });

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

// The XML is read by hand, in one pass, not with regular expressions: a lazy "anything up
// to </row>" pattern goes back over the rest of the file for every <row> that is never
// closed, and a 1.4 KB .xlsx of unclosed tags froze the tab (round 2). Every scan below
// moves forward only.

const isSpace = (c: string) => c === ' ' || c === '\t' || c === '\n' || c === '\r';
const isNameChar = (c: string) => /[\w:.-]/.test(c);
/** Attributes read from one tag; more than this is no spreadsheet's. */
const MAX_ATTRS = 64;

/** A tag's attributes: name="value" or name='value'. */
const attrsOf = (s: string): Record<string, string> => {
  const out: Record<string, string> = {};
  let n = 0;
  let i = 0;
  while (i < s.length && n < MAX_ATTRS) {
    while (i < s.length && !isNameChar(s[i])) i++;
    const from = i;
    while (i < s.length && isNameChar(s[i])) i++;
    const name = s.slice(from, i);
    while (i < s.length && isSpace(s[i])) i++;
    if (s[i] !== '=') continue;
    i++;
    while (i < s.length && isSpace(s[i])) i++;
    const q = s[i];
    if (q !== '"' && q !== "'") continue;
    const end = s.indexOf(q, i + 1);
    if (end < 0) break;
    if (name) {
      out[name] = unescapeXml(s.slice(i + 1, end));
      n++;
    }
    i = end + 1;
  }
  return out;
};

type Element = {
  readonly attrs: Record<string, string>;
  readonly inner: string;
  readonly start: number;
  readonly end: number;
};

/**
 * Elements named `tag` (with or without a namespace prefix), in order: attributes, inner
 * XML, and where each starts and ends. Linear in the length of `xml`: once one element is
 * never closed, no later one can be (its closing tag would have been found), so the search
 * for closing tags stops there; and a tag never ended (no ">") ends the scan.
 */
function* scanElements(xml: string, tag: string): Generator<Element> {
  const open = new RegExp(`<(?:([\\w-]+):)?${tag}(?=[\\s/>])`, 'g');
  let unclosed = false;
  for (let m = open.exec(xml); m; m = open.exec(xml)) {
    // The end of the opening tag, outside quoted values.
    let i = m.index + m[0].length;
    let quote = '';
    for (; i < xml.length; i++) {
      const c = xml[i];
      if (quote) {
        if (c === quote) quote = '';
      } else if (c === '"' || c === "'") quote = c;
      else if (c === '>') break;
    }
    if (i >= xml.length) return;
    const selfClosing = xml[i - 1] === '/';
    const attrText = xml.slice(m.index + m[0].length, selfClosing ? i - 1 : i);
    open.lastIndex = i + 1;
    if (selfClosing) {
      yield { attrs: attrsOf(attrText), inner: '', start: m.index, end: i + 1 };
      continue;
    }
    if (unclosed) continue;
    const close = `</${m[1] ? `${m[1]}:` : ''}${tag}`;
    let from = i + 1;
    let at = -1;
    let after = -1;
    while (at < 0) {
      const k = xml.indexOf(close, from);
      if (k < 0) break;
      let p = k + close.length;
      while (p < xml.length && isSpace(xml[p])) p++;
      if (xml[p] === '>') {
        at = k;
        after = p + 1;
      } else from = k + close.length;
    }
    if (at < 0) {
      unclosed = true;
      continue;
    }
    open.lastIndex = after;
    yield { attrs: attrsOf(attrText), inner: xml.slice(i + 1, at), start: m.index, end: after };
  }
}

const elements = (xml: string, tag: string, limit = Infinity): Element[] => {
  const out: Element[] = [];
  if (limit <= 0) return out;
  for (const e of scanElements(xml, tag)) {
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
};

/** `xml` with every element named `tag` taken out. */
const without = (xml: string, tag: string): string => {
  let out = '';
  let at = 0;
  for (const e of scanElements(xml, tag)) {
    out += xml.slice(at, e.start);
    at = e.end;
  }
  return out + xml.slice(at);
};

/** The text of a string item: every <t>, phonetic guides (<rPh>) left out. */
const textOf = (inner: string): string =>
  elements(inner.includes('rPh') ? without(inner, 'rPh') : inner, 't')
    .map((t) => unescapeXml(t.inner))
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
const MAX_XML_BYTES = 20 * 1024 * 1024;
/** Rows with anything in them read from a sheet: room for a title and the column names over MAX_ROWS. */
const MAX_XLSX_ROWS = MAX_ROWS + HEADER_SCAN;
/** Rows and cells looked at in one sheet, filled or not, before it is called too large. */
const MAX_XLSX_TAGS = 1_000_000;
/** Shared strings read from a workbook. */
const MAX_SHARED_STRINGS = 500_000;

const NOT_XLSX = "That file couldn't be opened as an Excel (.xlsx) file. Save it as .xlsx or CSV and try again.";
const TOO_LARGE = 'That spreadsheet is too large to read here. Save it with fewer rows and try again.';
const CUT_SHORT =
  'Part of this file is damaged or cut short, so only the first part of the sheet was read. Open it in Excel, save it again, and pick the new file.';

const u16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u32 = (b: Uint8Array, i: number) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;

/**
 * The files `wanted` from a zip, read through its central directory. Each is unpacked into
 * room for one byte more than the size the zip states: a zip can state any size, and fflate
 * stops quietly where the room ends, so a file that fills that extra byte was longer than
 * stated. It is kept cut at the stated size and named in `cut`. A ZIP64 file (sizes over
 * 4 GB, which no spreadsheet has) goes through fflate's own reader, still with the size cap.
 */
const unzipWanted = (
  bytes: Uint8Array,
  wanted: (name: string) => boolean,
): { files: Record<string, Uint8Array>; cut: string[] } => {
  let e = bytes.length - 22;
  const stop = Math.max(0, bytes.length - 22 - 0xffff);
  while (e >= stop && u32(bytes, e) !== 0x06054b50) e--;
  if (e < stop) throw new Error(NOT_XLSX);
  const files: Record<string, Uint8Array> = {};
  const cut: string[] = [];
  let at = u32(bytes, e + 16);
  for (let n = u16(bytes, e + 10); n > 0; n--) {
    if (at + 46 > bytes.length || u32(bytes, at) !== 0x02014b50) throw new Error(NOT_XLSX);
    const method = u16(bytes, at + 10);
    const packed = u32(bytes, at + 20);
    const size = u32(bytes, at + 24);
    const nameLength = u16(bytes, at + 28);
    const local = u32(bytes, at + 42);
    const name = strFromU8(bytes.subarray(at + 46, at + 46 + nameLength), true);
    at += 46 + nameLength + u16(bytes, at + 30) + u16(bytes, at + 32);
    if (!wanted(name)) continue;
    if (packed === 0xffffffff || size === 0xffffffff || local === 0xffffffff)
      return { files: unzipFallback(bytes, wanted), cut: [] };
    if (size > MAX_XML_BYTES) throw new Error(TOO_LARGE);
    if (local + 30 > bytes.length || u32(bytes, local) !== 0x04034b50) throw new Error(NOT_XLSX);
    const from = local + 30 + u16(bytes, local + 26) + u16(bytes, local + 28);
    const data = bytes.subarray(from, Math.min(bytes.length, from + packed));
    let out: Uint8Array;
    if (method === 0) out = data.slice(0, size + 1);
    else if (method === 8) {
      try {
        out = inflateSync(data, { out: new Uint8Array(size + 1) });
      } catch {
        throw new Error(NOT_XLSX);
      }
    } else throw new Error(NOT_XLSX);
    if (out.length > size) {
      cut.push(name);
      out = out.subarray(0, size);
    }
    files[name] = out;
  }
  return { files, cut };
};

const unzipFallback = (bytes: Uint8Array, wanted: (name: string) => boolean): Record<string, Uint8Array> => {
  try {
    return unzipSync(bytes, {
      filter: (f) => {
        if (!wanted(f.name)) return false;
        if (f.originalSize > MAX_XML_BYTES) throw new Error('too large');
        return true;
      },
    });
  } catch (e) {
    throw new Error((e as Error).message === 'too large' ? TOO_LARGE : NOT_XLSX);
  }
};

export type XlsxRead = {
  readonly rows: SheetRow[];
  readonly warnings: string[];
  /** Reading stopped at MAX_XLSX_ROWS filled rows: the sheet has more. */
  readonly moreRows: boolean;
};

/**
 * The first sheet of an .xlsx, as rows of text: the filled rows only, at most
 * MAX_XLSX_ROWS of them and MAX_COLUMNS columns.
 */
export const readXlsx = (bytes: Uint8Array): XlsxRead => {
  const wanted = (name: string) =>
    name === 'xl/workbook.xml' ||
    name === 'xl/_rels/workbook.xml.rels' ||
    name === 'xl/sharedStrings.xml' ||
    name === 'xl/styles.xml' ||
    /^xl\/worksheets\/[^/]+\.xml$/.test(name);
  let unzipped: { files: Record<string, Uint8Array>; cut: string[] };
  try {
    unzipped = unzipWanted(bytes, wanted);
  } catch (e) {
    throw new Error((e as Error).message === TOO_LARGE ? TOO_LARGE : NOT_XLSX);
  }
  const { files } = unzipped;
  const warnings = unzipped.cut.length ? [CUT_SHORT] : [];
  const text = (name: string) => (files[name] ? strFromU8(files[name]) : '');
  const workbook = text('xl/workbook.xml');
  if (!workbook) throw new Error(NOT_XLSX);
  const date1904 = /^(1|true)$/i.test(elements(workbook, 'workbookPr', 1)[0]?.attrs.date1904 ?? '');

  // The first sheet in the workbook's own order, through its relationship.
  const firstSheet = elements(workbook, 'sheet', 1)[0];
  const rid =
    firstSheet && (firstSheet.attrs['r:id'] ?? Object.entries(firstSheet.attrs).find(([k]) => /:id$/.test(k))?.[1]);
  let rel: Element | undefined;
  for (const r of scanElements(text('xl/_rels/workbook.xml.rels'), 'Relationship')) {
    if (r.attrs.Id === rid) {
      rel = r;
      break;
    }
  }
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

  const shared = elements(text('xl/sharedStrings.xml'), 'si', MAX_SHARED_STRINGS + 1).map((si) => textOf(si.inner));
  if (shared.length > MAX_SHARED_STRINGS) throw new Error(TOO_LARGE);

  // Which cell styles are dates.
  const styles = text('xl/styles.xml');
  const customFormats = new Map(
    elements(styles, 'numFmt', 10_000).map((f) => [Number(f.attrs.numFmtId), f.attrs.formatCode] as const),
  );
  const cellXfs = elements(styles, 'cellXfs', 1)[0]?.inner ?? '';
  const dateStyles = elements(cellXfs, 'xf', 100_000).map((xf) => {
    const id = Number(xf.attrs.numFmtId ?? 0);
    return isDateFormat(id, customFormats.get(id));
  });

  const rows: SheetRow[] = [];
  let tags = 0;
  let nextRow = 1;
  for (const row of scanElements(text(sheetPath), 'row')) {
    if (++tags > MAX_XLSX_TAGS) throw new Error(TOO_LARGE);
    const line = Number(row.attrs.r) || nextRow;
    nextRow = line + 1;
    const cells: string[] = [];
    let nextCol = 0;
    for (const c of scanElements(row.inner, 'c')) {
      if (++tags > MAX_XLSX_TAGS) throw new Error(TOO_LARGE);
      const col = cellColumn(c.attrs.r) ?? nextCol;
      nextCol = col + 1;
      // Past the columns read (cells run left to right, so the rest of the row is too).
      if (col >= MAX_COLUMNS) {
        if (c.attrs.r !== undefined) break;
        continue;
      }
      const v = elements(c.inner, 'v', 1)[0]?.inner;
      const raw = v === undefined ? undefined : unescapeXml(v);
      let value = '';
      switch (c.attrs.t) {
        case 's':
          value = shared[Number(raw)] ?? '';
          break;
        case 'inlineStr':
          value = textOf(elements(c.inner, 'is', 1)[0]?.inner ?? '');
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
    if (!isFilled(cells)) continue;
    if (rows.length >= MAX_XLSX_ROWS) return { rows, warnings, moreRows: true };
    rows.push({ line, cells });
  }
  return { rows, warnings, moreRows: false };
};

/** The first sheet of an .xlsx, as its filled rows of text. */
export const parseXlsx = (bytes: Uint8Array): SheetRow[] => readXlsx(bytes).rows;

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
  if (isXlsx(file.name, bytes)) {
    const x = readXlsx(bytes);
    return toSheet(x.rows, 'xlsx', ',', x.warnings, { moreRows: x.moreRows });
  }
  const { rows, delimiter, warnings, moreRows } = parseCsv(decodeText(bytes));
  return toSheet(
    rows.map((cells, i) => ({ line: i + 1, cells })),
    'csv',
    delimiter,
    warnings,
    { moreRows },
  );
};

/** What to say about a file with more rows than one import takes. */
export const tooManyRows = (sheet: Pick<Sheet, 'rows' | 'moreRows'>): string =>
  `This file has ${sheet.moreRows ? `more than ${MAX_ROWS}` : sheet.rows.length} rows. Import up to ${MAX_ROWS} at a time: split the file and import the rest after.`;

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
  /**
   * Set when the file is a list of animals (an animal record each, animal-profile.ts): its
   * own columns, and the ID scheme and species for rows that don't say. The plant columns
   * above are then not used.
   */
  readonly animal?: AnimalMapping;
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

const MOTHER = / (mother|female|dam|maternal|seed parent|parent 1|parent1) /;
const FATHER = / (father|male|pollen|sire|paternal|pollen parent|parent 2|parent2) /;

/** Guess which column is which from the header names. Each column is used once. */
export const guessMapping = (headers: string[]): Mapping => {
  const m = emptyMapping();
  const columns = { ...m.columns };
  headers.forEach((h, i) => {
    const w = words(h);
    // A column naming both parents ("Parentage (Mother x Father)") holds both: it is the
    // parents column, not the second parent's because "father" is in its name (round 2).
    if (MOTHER.test(w) && FATHER.test(w)) {
      if (columns.parents === null) columns.parents = i;
      return;
    }
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

// ── Animals: their own columns ────────────────────────────────────────────────────────

/** An animal list's columns: an animal record each (animal-profile.ts). */
export const ANIMAL_FIELDS = [
  'name',
  'individualId',
  'species',
  'breed',
  'sex',
  'dateOfBirth',
  'sire',
  'sireId',
  'dam',
  'damId',
  'breeder',
  'herd',
  'notes',
] as const;
export type AnimalFieldKey = (typeof ANIMAL_FIELDS)[number];

export type AnimalMapping = {
  readonly columns: Record<AnimalFieldKey, number | null>;
  /** The ID scheme every individual ID in the file belongs to ("Japan cattle ID (10 digits)"). */
  readonly idScheme: string;
  /** The species, for rows whose own cell doesn't say (or with no species column). */
  readonly species: string;
};

export const emptyAnimalMapping = (): AnimalMapping => ({
  columns: Object.fromEntries(ANIMAL_FIELDS.map((f) => [f, null])) as Record<AnimalFieldKey, number | null>,
  idScheme: '',
  species: '',
});

/** First match wins: an ID column of a parent before the parent, and the animal's own ID last. */
const ANIMAL_GUESSES: [AnimalFieldKey, RegExp][] = [
  ['sireId', / (sire|father|paternal|bull) (id|no|nr|number|num|tag|code|reg|registration) /],
  ['damId', / (dam|mother|maternal) (id|no|nr|number|num|tag|code|reg|registration) /],
  ['sire', / (sire|father|paternal) /],
  ['dam', / (dam|mother|maternal) /],
  ['dateOfBirth', / (dob|birth|born|birthdate|date of birth|birth date|calved|calving date) /],
  ['species', / (species|taxon|animal type|kind) /],
  ['breed', / (breed|breed name) /],
  ['sex', / (sex|gender) /],
  ['breeder', / (breeder|bred by|holder|owner|keeper|producer|farmer) /],
  ['herd', / (herd|farm|ranch|holding|premises) /],
  ['notes', / (notes?|comments?|remarks?|description|memo) /],
  ['individualId', / (id|no|nr|number|num|tag|ear tag|eartag|reg|registration|code|identification|microchip|chip) /],
  ['name', / (name|animal|animal name) /],
];

/**
 * Japanese column names, read as written (the English guesses read letters only): a cattle
 * register's 個体識別番号, 父 / 種雄牛, 母 / 繁殖雌牛, 生年月日, 品種, 性別, 名号.
 */
const ANIMAL_GUESSES_JA: [AnimalFieldKey, RegExp][] = [
  ['sireId', /(父|種雄牛).*(番号|ID)/],
  ['damId', /(母|繁殖雌牛).*(番号|ID)/],
  ['sire', /父|種雄牛/],
  ['dam', /母|繁殖雌牛/],
  ['individualId', /個体識別|耳標|識別番号|登録番号/],
  ['dateOfBirth', /生年月日|出生/],
  ['breed', /品種/],
  ['sex', /性別|雌雄/],
  ['species', /畜種|動物種/],
  ['breeder', /生産者|飼養者|繁殖者/],
  ['herd', /農場|牧場/],
  ['notes', /備考|メモ/],
  ['name', /名号|名前|牛名/],
];

/** Guess which column is which in a list of animals. Each column is used once. */
export const guessAnimalMapping = (headers: string[]): AnimalMapping => {
  const m = emptyAnimalMapping();
  const columns = { ...m.columns };
  headers.forEach((h, i) => {
    // A grandparent (母の父, 祖父, 父の母…) is not this animal's sire or dam: left for the holder to pick.
    if (/母の父|父の母|父の父|母の母|祖/.test(h)) return;
    for (const [field, re] of ANIMAL_GUESSES_JA) {
      if (columns[field] === null && re.test(h)) {
        columns[field] = i;
        return;
      }
    }
    const w = words(h);
    if (/ (grand\w*|mgs|pgs|mgd|pgd) /.test(w)) return;
    for (const [field, re] of ANIMAL_GUESSES) {
      if (columns[field] !== null) continue;
      if (re.test(w)) {
        columns[field] = i;
        return;
      }
    }
  });
  return { ...m, columns };
};

/** A sex as written: female, male, or not stated; undefined for anything else (said as a problem). */
export const readSex = (v: string): AnimalSex | undefined => {
  const w = v.trim().toLowerCase();
  if (!w) return 'unknown';
  if (/^(f|female|cow|heifer|ewe|doe|sow|mare|hen|雌|メス|めす)$/.test(w)) return 'female';
  if (/^(m|male|bull|steer|ram|buck|boar|stallion|rooster|雄|オス|おす)$/.test(w)) return 'male';
  if (/^(unknown|not stated|-|n\/a|na|\?)$/.test(w)) return 'unknown';
  return undefined;
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
  /**
   * An animal row's own details (animal-profile.ts): then strainName is its name, refId its
   * individual ID, taxon its species, dateCreated its date of birth, parents its sire and dam.
   */
  readonly animal?: AnimalDetails;
  /** An animal row's sex cell, when it isn't female, male or empty (a problem to fix). */
  readonly sexAsWritten?: string;
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
    : detectDateOrder(
        sheet.rows.map((r) =>
          cellOf(r, mapping.animal ? mapping.animal.columns.dateOfBirth : mapping.columns.dateCreated),
        ),
      );

/** An animal row's values exactly as they would be sealed (animal-profile.ts). */
export const animalRowFields = (
  row: SheetRow,
  mapping: Mapping & { animal: AnimalMapping },
  order?: 'mdy' | 'dmy',
): RowFields & { dateAmbiguous: boolean } => {
  const c = mapping.animal.columns;
  const parent = (role: 'sire' | 'dam', nameCol: number | null, idCol: number | null): ParentRef[] => {
    const name = oneLine(cellOf(row, nameCol));
    const individualId = oneLine(cellOf(row, idCol));
    return name || individualId ? [{ role, name, individualId }] : [];
  };
  const date = normalizeDate(cellOf(row, c.dateOfBirth), order);
  const individualId = oneLine(cellOf(row, c.individualId));
  const sexCell = oneLine(cellOf(row, c.sex));
  const sex = readSex(sexCell);
  return {
    strainName: oneLine(cellOf(row, c.name)),
    refId: individualId,
    taxon: oneLine(cellOf(row, c.species)) || oneLine(mapping.animal.species),
    parents: [...parent('sire', c.sire, c.sireId), ...parent('dam', c.dam, c.damId)],
    bredBy: oneLine(cellOf(row, c.breeder)) || oneLine(mapping.bredByDefault),
    dateCreated: date.value,
    notes: multiLine(cellOf(row, c.notes)),
    animal: {
      breed: oneLine(cellOf(row, c.breed)),
      idScheme: individualId ? oneLine(mapping.animal.idScheme) : '',
      sex: sex ?? 'unknown',
      herd: oneLine(cellOf(row, c.herd)),
    },
    ...(sex === undefined ? { sexAsWritten: sexCell } : {}),
    dateAmbiguous: date.ambiguous,
  };
};

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
  f.animal
    ? hex(
        sha256(
          new TextEncoder().encode(
            JSON.stringify([
              'veilcore-bulk-animal-row-v1',
              f.strainName,
              f.refId,
              f.taxon,
              f.parents.map((p) => [p.role ?? '', p.name, p.individualId ?? '']),
              f.bredBy,
              f.dateCreated,
              f.notes,
              f.animal.breed,
              f.animal.idScheme,
              f.animal.sex,
              f.animal.herd,
            ]),
          ),
        ),
      )
    : hex(
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
    ...(isAnimal(r) && r.animal ? { animal: r.animal } : {}),
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
  /** Rows left out because they read like column names, not a plant (as the spreadsheet numbers them). */
  readonly headerRows: number[];
};

/** The same text compared as column names are: case, spaces and punctuation aside. */
const sameName = (a: string, b: string) => words(a).trim() !== '' && words(a) === words(b);

/**
 * Whether a row reads like column names rather than a plant: its name cell is one, and so
 * are more than two thirds of its filled cells (two at least); or two of its cells are this file's
 * own column names, in their own columns; or its name cell is its column's name. A title
 * row taken for the column names leaves the real ones in the rows, and sealing them would
 * make a record named "Cultivar / Line" that can never be taken back (round 2).
 */
export const looksLikeColumnNames = (row: SheetRow, headers: readonly string[], nameColumn: number | null): boolean => {
  const filledCells = row.cells.filter((c) => c.trim() !== '');
  const echoes = row.cells.filter((c, i) => headers[i] !== undefined && sameName(c, headers[i])).length;
  if (echoes >= 2) return true;
  if (nameColumn === null) return false;
  const name = row.cells[nameColumn] ?? '';
  if (sameName(name, headers[nameColumn] ?? '')) return true;
  if (!knownColumnName(name)) return false;
  const named = filledCells.filter(knownColumnName).length;
  return named >= 2 && named * 3 > filledCells.length * 2;
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
    // An animal is known by its individual ID when it has one, as the rows below are.
    if (!r.supersededBy)
      byNameId.set(
        isAnimal(r) && r.refId
          ? nameIdKey('', oneLine(r.refId))
          : nameIdKey(oneLine(r.strainName ?? ''), oneLine(r.refId ?? '')),
        r,
      );
  }
  const seenInFile = new Map<string, number>();
  const headerRows: number[] = [];
  const animal = mapping.animal;
  // A sire or dam whose ID is an animal already in this set is linked to its record.
  const animalById = new Map<string, StrainRecord>();
  if (animal)
    for (const r of ctx.existing)
      if (isAnimal(r) && r.refId && r.recordFingerprint && !r.supersededBy) animalById.set(oneLine(r.refId), r);
  const nameColumn = animal ? (animal.columns.name ?? animal.columns.individualId) : mapping.columns.strainName;
  const rows: PreparedRow[] = sheet.rows.map((row) => {
    const { dateAmbiguous, ...read } = animal
      ? animalRowFields(row, { ...mapping, animal }, order)
      : rowFields(row, mapping, order);
    const fields: RowFields = animal
      ? {
          ...read,
          parents: read.parents.map((p) => {
            const linked = p.individualId ? animalById.get(p.individualId) : undefined;
            return linked ? { ...p, recordId: linked.id } : p;
          }),
        }
      : read;
    const hash = rowHashOf(fields);
    const base = { line: row.line, cells: row.cells, fields, hash, dateAmbiguous };
    if (looksLikeColumnNames(row, sheet.headers, nameColumn)) {
      headerRows.push(row.line);
      return {
        ...base,
        status: 'problem' as const,
        problems: ['This row looks like column names, not a plant, so it is left out.'],
      };
    }
    const problems: string[] = [];
    if (animal) problems.push(...animalRowProblems(fields));
    else if (!fields.strainName) problems.push('No plant name.');
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

    // An animal is known by its individual ID when it has one: two rows with one ID are one animal.
    const key = animal && fields.refId ? nameIdKey('', fields.refId) : nameIdKey(fields.strainName, fields.refId);
    const named = Boolean(fields.strainName || (animal && fields.refId));
    const earlier = named ? seenInFile.get(key) : undefined;
    if (earlier !== undefined) {
      problems.push(
        animal && fields.refId
          ? `Same individual ID as row ${earlier}.`
          : fields.refId
            ? `Same name and ID as row ${earlier}.`
            : `Same name as row ${earlier}, and neither has an ID.`,
      );
    } else if (named) seenInFile.set(key, row.line);
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
  if (sheet.rows.length > MAX_ROWS || sheet.moreRows) {
    blocked = tooManyRows(sheet);
  } else if (animal && animal.columns.name === null && animal.columns.individualId === null) {
    blocked = 'Pick the column that has the animal’s name or its individual ID.';
  } else if (!animal && mapping.columns.strainName === null) {
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
    headerRows,
  };
};

/**
 * What stops an animal row being sealed under the animal profile (animal-profile.ts), in
 * plain sentences: the profile refuses a record in any other form, so the row says so first.
 */
const animalRowProblems = (f: RowFields): string[] => {
  const out: string[] = [];
  if (!f.strainName && !f.refId) out.push('No name and no individual ID.');
  if (f.refId && !f.animal?.idScheme) out.push('Say which ID scheme the individual IDs belong to.');
  if (!f.taxon) out.push('No species.');
  if (!f.bredBy) out.push('No breeder or holder.');
  if (f.sexAsWritten !== undefined)
    out.push(`Sex not understood: "${f.sexAsWritten.slice(0, 30)}". Use female, male, or leave it empty.`);
  if (f.dateCreated && !isCalendarDate(f.dateCreated))
    out.push(
      `The date of birth isn't a date that can be read: "${f.dateCreated.slice(0, 30)}". Write it as YYYY-MM-DD.`,
    );
  for (const [what, v] of [
    ['The name', f.strainName],
    ['The individual ID', f.refId],
    ['The species', f.taxon],
    ['The breed', f.animal?.breed ?? ''],
    ['The ID scheme', f.animal?.idScheme ?? ''],
    ['The breeder or holder', f.bredBy],
    ['The herd', f.animal?.herd ?? ''],
    ...f.parents.flatMap((p) => [
      [`The ${p.role}'s name`, p.name],
      [`The ${p.role}'s ID`, p.individualId ?? ''],
    ]),
  ] as [string, string][]) {
    const p = tooLong(what, v, 200);
    if (p) out.push(p);
  }
  const notes = tooLong('The notes', f.notes, LIMITS.notes);
  if (notes) out.push(notes);
  return out;
};

// ── Sealing ────────────────────────────────────────────────────────────────────────────

/**
 * The record for one row, sealed exactly as the logging flow seals one plant: the same
 * function (seal-record.ts), so the same fields, fingerprint and key binding. A row has no
 * breeding method and no photos. The shape is the one createRecord gives a record.
 */
export const sealRowRecord = async (f: RowFields, now = Date.now()): Promise<StrainRecord> => {
  // An animal row: sealed exactly as the logging flow seals one animal (seal-record.ts).
  if (f.animal) {
    const sealedAnimal = await sealAnimalRecord(
      {
        name: f.strainName,
        species: f.taxon,
        breed: f.animal.breed,
        individualId: f.refId,
        idScheme: f.animal.idScheme,
        sex: f.animal.sex,
        dateOfBirth: f.dateCreated,
        parents: f.parents,
        breeder: f.bredBy,
        herd: f.animal.herd,
        notes: f.notes,
        photoFingerprints: [],
      },
      now,
    );
    return { licenseIds: [], ...sealedAnimal };
  }
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

// The ledger (which rows became which records) lives in bulk-import-ledger.ts, so Home can
// read it without loading this file.
export { importedRecordIds, loadLedger, saveLedger } from './bulk-import-ledger';
export type { Ledger, LedgerEntry } from './bulk-import-ledger';

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

export const RESULT_COLUMNS = ['VeilCore record ID', 'Proof code', 'Check link', 'Result', 'DNA report'] as const;

/** The "DNA report" column for a record with none: what's missing and where to add it. */
export const NO_DNA_REPORT =
  'None yet, so the record is not tied to the plant. Add one on the plant’s page: Get a DNA report for this plant.';
/** The "DNA report" column for a record with one saved. */
export const DNA_REPORT_SAVED = 'Saved';

/** The ids of the records a row became or already was: sealed now, or sealed before. */
const rowRecordId = (r: PreparedRow, o: RowOutcome | undefined): string | undefined =>
  r.status === 'already' ? r.existingId : r.status === 'ready' && o?.state === 'sealed' ? o.recordId : undefined;

/**
 * How many of this import's records (sealed now or before) have no DNA report saved, so
 * aren't tied to the plant yet (veilcore/dna-tie.ts). A record sealed by the import never
 * has one: an import seals what the sheet says, and a DNA report is added on the plant's page.
 */
export const noDnaReportCount = (
  job: Pick<Job, 'rows' | 'outcomes'>,
  hasDnaReport: (recordId: string) => boolean = () => false,
): number =>
  job.rows.filter((r) => {
    const id = rowRecordId(r, job.outcomes[r.hash]);
    return id !== undefined && !hasDnaReport(id);
  }).length;

/**
 * The results file: every row of the original, as it was, plus the record it became, its
 * fingerprint, a link anyone can open to check it, and whether a DNA report ties it to the
 * plant yet. Same separator as the file read.
 */
export const resultsCsv = (
  job: Pick<Job, 'headers' | 'delimiter' | 'rows' | 'outcomes'>,
  origin: string,
  hasDnaReport: (recordId: string) => boolean = () => false,
): string => {
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
    // The record's name goes after the # (round 5, CONTRACT.md #28): the registry no longer
    // has it to show, and a server never receives that part of a link.
    // With its salt (`ns`, round 6): the check page then tells whether the name is the record's.
    const rec = id ? allRecords().find((x) => x.id === id) : undefined;
    const link = id ? `${origin.replace(/\/$/, '')}${verifyPath(id, fp, rec ? nameLinkParams(rec) : {})}` : '';
    const dna = id ? (hasDnaReport(id) ? DNA_REPORT_SAVED : NO_DNA_REPORT) : '';
    out.push(line([...job.headers.map((_, i) => r.cells[i] ?? ''), id, fp, link, result, dna]));
  }
  return `\uFEFF${out.join('\r\n')}\r\n`;
};

/** The results file's name, from the file read. */
export const resultsFileName = (fileName: string): string =>
  `${fileName.replace(/\.(csv|xlsx|txt|tsv)$/i, '') || 'collection'} - VeilCore records.csv`;

// ── Key date stamps, a few at a time ───────────────────────────────────────────────────

const STAMPS_KEY = 'veilcore.bulk-import.stamps.v1';

/**
 * Key date stamps one browser gets from the free fee service in a day: the sponsor's
 * per-browser quota for the anchor call (sponsor/src/limits.ts DEFAULT_LIMITS.perTicketDay).
 * The network a browser is on has its own, larger caps (3 an hour, 10 a day).
 */
export const KEY_STAMPS_PER_DAY = 3;

/** How long `waiting` key stamps take from one browser, in days (at least one). */
export const keyStampDays = (waiting: number): number => Math.max(1, Math.ceil(waiting / KEY_STAMPS_PER_DAY));

/**
 * Why the queue is waiting: the fee service didn't answer ('unreachable'); the network, or
 * the network or the fee service (a failed fetch doesn't say which), couldn't be reached
 * ('offline'); the free quota is used for now ('quota'); or something else.
 */
export type StampPause = 'unreachable' | 'offline' | 'quota' | 'other';

export type StampQueueState = { readonly pauseUntil?: number; readonly why?: StampPause; readonly stopped?: string };

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
  return { pauseUntil: now + seconds * 1000, why: stampPauseOf(e, msg) };
};

const OFFLINE =
  /reach|Failed to fetch|NetworkError|Load failed|timed? ?out|ECONN|ENOTFOUND|fetch failed|aborted|ERR_[A-Z_]+/i;

const stampPauseOf = (e: unknown, msg: string): StampPause => {
  const code = (e as { code?: unknown } | null)?.code;
  const status = (e as { status?: unknown } | null)?.status;
  // The sponsor client's own "not answering" (sponsor-client.ts): the fee service itself.
  if (code === 'unreachable' || /sponsor is not answering/i.test(msg)) return 'unreachable';
  if (code === 'rate' || status === 429 || /free (transactions|\w+ calls)|used (today|this hour)/i.test(msg))
    return 'quota';
  if ((e instanceof Error && /^(TypeError|AbortError|TimeoutError)$/.test(e.name)) || OFFLINE.test(msg))
    return 'offline';
  return 'other';
};

/** The queue's waiting line, by why it waits. */
export const stampPauseWords = (why: StampPause | undefined, nextTry: string): string =>
  why === 'unreachable'
    ? `Couldn't reach the fee service; trying again later. Next try: ${nextTry}.`
    : why === 'offline'
      ? `Couldn't reach the network or the fee service; trying again later. Next try: ${nextTry}.`
      : why === 'quota'
        ? `The free key stamps are used up for now. Next try: ${nextTry}.`
        : `A key stamp didn't go through. Next try: ${nextTry}.`;
