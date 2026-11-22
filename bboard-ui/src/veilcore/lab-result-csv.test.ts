// A lab's CSV of results (lab-result-csv.ts): one statement per row, checked by the statement's
// own rules; a bad row is named and left out, never tidied into something else, and a file
// too large for one run is refused whole.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  alreadySigned,
  csvTemplate,
  readResultsCsv,
  resultsSummaryCsv,
  CSV_MAX_ROWS,
  type CsvRead,
  type CsvRow,
} from './lab-result-csv';
import { parseCsv } from './bulk-import';

const A = 'a1'.repeat(32);
const B = 'b2'.repeat(32);
const C = 'c3'.repeat(32);
const d = {
  method: 'RT-qPCR SOP-14',
  methodVersion: '3',
  panel: '',
  panelVersion: '',
  tested: '2026-11-05',
  target: 'HLVd',
  sampleType: 'leaf',
};
const NOW = new Date(2026, 10, 7);
const rowsOf = (r: CsvRead) => {
  if ('error' in r) throw new Error(r.error);
  return r.rows;
};

describe('a lab’s CSV of results', () => {
  it('reads pathogen rows, taking what the page says for every row and what a cell overrides', () => {
    const csv = [
      'Subject,Sample ID,Accession,Result,Ct,QC: Internal control Ct,Sample type',
      `${A},S-1,L-1,Not detected,,24.1,`,
      `${A.toUpperCase()},S-2,L-2,detected,"31,5",23.9,root`,
      `nope,S-3,L-3,detected,,,`,
      `${A},S-4,L-4,maybe,,,`,
    ].join('\n');
    const [r1, r2, r3, r4] = rowsOf(readResultsCsv(csv, 'pathogen', d, NOW));
    expect(r1).toMatchObject({
      ok: true,
      statement: {
        subject: A,
        method: { id: 'RT-qPCR SOP-14', version: '3' },
        tested: '2026-11-05',
        qc: [{ name: 'Internal control Ct', value: '24.1' }],
        result: { target: 'HLVd', sampleType: 'leaf', detected: false },
      },
    });
    expect(r2).toMatchObject({
      ok: true,
      statement: { subject: A, result: { detected: true, ct: '31.5', sampleType: 'root' } },
    });
    expect(r3).toMatchObject({ ok: false, code: 'subject', line: 4, sampleId: 'S-3' });
    expect(r4).toMatchObject({ ok: false, code: 'result', line: 5 });
  });

  // Review blocker: a cell with one hex character too many, or a 128-character key, was read as
  // its last 64 characters, so the result was signed about another record.
  it('never reads part of a longer hex string as a proof code', () => {
    const csv = (subject: string, other = B, replaces = '') =>
      `subject,sample id,accession,other,result,replaces\n${subject},S,L,${other},match,${replaces}\n`;
    expect(rowsOf(readResultsCsv(csv('f' + A), 'match', d, NOW))[0]).toMatchObject({ ok: false, code: 'subject' });
    expect(rowsOf(readResultsCsv(csv('a'.repeat(128)), 'match', d, NOW))[0]).toMatchObject({
      ok: false,
      code: 'subject',
    });
    expect(rowsOf(readResultsCsv(csv(A, B + '0'), 'match', d, NOW))[0]).toMatchObject({ ok: false, code: 'other' });
    expect(rowsOf(readResultsCsv(csv(A, B, '0' + C), 'match', d, NOW))[0]).toMatchObject({
      ok: false,
      code: 'replaces',
    });
    // The end of a check link still reads, whole.
    const link = `https://veilcore.org/verify/VEIL-1?fp=${A}`;
    expect(rowsOf(readResultsCsv(csv(link), 'match', d, NOW))[0]).toMatchObject({
      ok: true,
      statement: { subject: A },
    });
  });

  it('takes a qPCR export as it comes: no Ct for a negative, its header names, a panel per sample', () => {
    const csv = [
      'Sample Name,Lab Sample ID,Subject,Target Name,Interpretation,Cq Mean,Run Date',
      `S-1,L-1,${A},HLVd,Negative,Undetermined,2026-11-05`,
      `S-1,L-1,${A},CBCVd,Negative,N/A,2026-11-05`,
      `S-1,L-1,${A},TMV,Negative,>40,2026-11-05`,
      `S-2,L-2,${A},HLVd,Positive,24.1287,2026-11-05`,
      `S-3,L-3,${A},HLVd,Inconclusive,36.2,2026-11-05`,
      `S-4,L-4,${A},HLVd,Negative,,03/11/2026`,
      `S-5,L-5,${A},HLVd,Negative,,2026-12-25`,
      `S-1,L-1,${A},hlvd,Negative,,2026-11-05`,
    ].join('\n');
    const rows = rowsOf(readResultsCsv(csv, 'pathogen', d, NOW));
    expect(rows.slice(0, 3).map((r) => r.ok)).toEqual([true, true, true]);
    expect(rows[0]).toMatchObject({ statement: { result: { target: 'HLVd', detected: false } } });
    expect((rows[0] as { statement: { result: object } }).statement.result).not.toHaveProperty('ct');
    // Not rounded: a Ct is signed as the report shows it.
    expect(rows[3]).toMatchObject({ ok: false, code: 'ct' });
    expect(rows[4]).toMatchObject({ ok: false, code: 'inconclusive' });
    expect(rows[5]).toMatchObject({ ok: false, code: 'tested' });
    expect(rows[6]).toMatchObject({ ok: false, code: 'future' });
    // The same sample, accession and target twice (in any case) is one too many.
    expect(rows[7]).toMatchObject({ ok: false, code: 'duplicate' });
  });

  it('reads comparisons and parentage checks by proof code only, parents by position, not by role', () => {
    const m = rowsOf(
      readResultsCsv(
        `subject,sample,accession,other,other sample id,result,compared,differing\n${A},S,L,${B},REF-7,match,90,0\n`,
        'match',
        d,
        NOW,
      ),
    );
    expect(m[0]).toMatchObject({
      ok: true,
      statement: { result: { other: B, otherSampleId: 'REF-7', matches: true, compared: 90, differing: 0 } },
    });
    const l = rowsOf(
      readResultsCsv(
        `subject,sample,accession,parent 1,parent 2,result,compared,conflicts 1,conflicts 2\n${A},S,L,${B},${C},excluded,88,0,7\n${A},S2,L2,${A},,consistent,,,\n`,
        'lineage',
        d,
        NOW,
      ),
    );
    expect(l[0]).toMatchObject({
      ok: true,
      statement: { result: { parents: [B, C], consistent: false, conflicts: [0, 7] } },
    });
    expect(l[1]).toMatchObject({ ok: false, code: 'parents' });
    // A sire/dam file isn't read as parents: the order would depend on the file's wording. With
    // no parent column at all, the file is refused whole, the column named.
    const roles = readResultsCsv(
      `subject,sample,accession,sire,dam,result\n${A},S,L,${B},${C},consistent\n`,
      'lineage',
      d,
      NOW,
    );
    expect(roles).toEqual({ error: 'columns', missing: ['parent 1'] });
  });

  it('refuses a file without the columns that name the sample, and one too long for a run, whole', () => {
    // Every column missing is named at once, not one per try.
    expect(readResultsCsv('a,b\n1,2\n', 'pathogen', d, NOW)).toEqual({
      error: 'columns',
      missing: ['subject', 'sample id', 'accession', 'result'],
    });
    expect(readResultsCsv(`subject,sample id,accession\n${A},S,L\n`, 'match', d, NOW)).toEqual({
      error: 'columns',
      missing: ['result', 'other'],
    });
    expect(readResultsCsv('subject\n', 'pathogen', d, NOW)).toEqual({ error: 'empty' });
    const many = [
      'subject,sample id,accession,result',
      ...Array.from({ length: CSV_MAX_ROWS + 1 }, (_, i) => `${A},S${i},L${i},nd`),
    ];
    expect(readResultsCsv(many.join('\n'), 'pathogen', d, NOW)).toEqual({
      error: 'tooMany',
      rows: CSV_MAX_ROWS + 1,
      lastLine: CSV_MAX_ROWS + 1,
    });
  });

  it('its templates read back, and the summary lists every row, keeping a formula as text', () => {
    for (const k of ['pathogen', 'match', 'lineage'] as const) {
      const out = readResultsCsv(csvTemplate(k), k, d, NOW);
      expect('error' in out ? out.error : out.rows.length).toBe(1);
    }
    expect(csvTemplate('pathogen')).toContain('qc: ct cut-off,qc: limit of detection');
    const s = resultsSummaryCsv([
      {
        statement: {
          kind: 'pathogen',
          subject: A,
          sampleId: '=1+1',
          accession: 'L',
          tested: '2026-11-05',
          method: { id: 'RT-qPCR', version: '3' },
          result: { target: 'HLVd', sampleType: 'leaf', detected: false },
        },
        code: B,
      },
      { unsigned: { sampleId: 'S-9', accession: 'L-9', target: 'HLVd', why: 'inconclusive' } },
    ]);
    expect(s).toContain("'=1+1");
    expect(s).toContain('signed,L,');
    expect(s).toContain(',HLVd,');
    expect(s).toContain('not detected,RT-qPCR 3');
    expect(s).toContain('not signed: inconclusive,L-9,S-9,HLVd');
  });

  // Verification N1: a cell with two codes was read as its first one, silently dropping a parent.
  it('reads a parents cell with two codes, however separated, and refuses a cell that holds two subjects', () => {
    for (const cell of [`"${B},${C}"`, `"${B} ${C}"`, `"${B}; ${C}"`]) {
      const r = rowsOf(
        readResultsCsv(`subject,sample,accession,parents,result\n${A},S,L,${cell},consistent\n`, 'lineage', d, NOW),
      );
      expect(r[0], cell).toMatchObject({ ok: true, statement: { result: { parents: [B, C] } } });
    }
    const two = rowsOf(readResultsCsv(`subject,sample,accession,result\n"${A} ${B}",S,L,nd\n`, 'pathogen', d, NOW));
    expect(two[0]).toMatchObject({ ok: false, code: 'subject' });
    const parent = rowsOf(
      readResultsCsv(`subject,sample,accession,parent 1,result\n${A},S,L,"${B},${C}",consistent\n`, 'lineage', d, NOW),
    );
    expect(parent[0]).toMatchObject({ ok: false, code: 'parents' });
  });

  // Verification N3: "detected" with "Undetermined" is a mixed-up column, not a result.
  it('refuses a detected result whose Ct says nothing crossed the threshold', () => {
    const r = rowsOf(
      readResultsCsv(
        `subject,sample,accession,result,ct\n${A},S,L,detected,Undetermined\n${A},S2,L2,detected,\n`,
        'pathogen',
        d,
        NOW,
      ),
    );
    expect(r[0]).toMatchObject({ ok: false, code: 'ctMissing' });
    // A detected result with the Ct cell left empty is the lab's choice not to report one.
    expect(r[1]).toMatchObject({ ok: true });
  });

  // Plant-users review: the help named 4 columns while 7 were needed, and the template had no
  // method columns, so a technician met them one refusal at a time.
  it('its template has every column a row needs, with one example row that reads', () => {
    const empty = { ...d, method: '', methodVersion: '', sampleType: '', target: '' };
    const needs = {
      pathogen: ['target', 'sample type'],
      match: ['other'],
      lineage: ['parent 1'],
    } as const;
    for (const k of ['pathogen', 'match', 'lineage'] as const) {
      const [head, example, ...more] = parseCsv(csvTemplate(k)).rows.filter((r) => r.some(Boolean));
      expect(more, k).toEqual([]);
      for (const c of ['subject', 'sample id', 'accession', 'method', 'method version', 'result', ...needs[k]])
        expect(head, `${k}: ${c}`).toContain(c);
      expect(example.length).toBe(head.length);
      // With nothing typed on the page and the placeholders swapped for real codes, it signs.
      const real = example.map((c) =>
        c.startsWith('<proof code')
          ? c.includes('other parent')
            ? C
            : c.includes('parent') || c.includes('other')
              ? B
              : A
          : c,
      );
      const rows = rowsOf(readResultsCsv(`${head.join(',')}\n${real.map((c) => `"${c}"`).join(',')}\n`, k, empty, NOW));
      expect(rows[0], k).toMatchObject({ ok: true });
    }
  });

  it('names every problem in every row at once, each by its column', () => {
    const empty = { ...d, method: '', methodVersion: '', sampleType: '' };
    const csv = [
      'subject,sample id,accession,result,ct,tested',
      `${A},S-1,L-1,not detected,,2026-11-05`,
      `,,L-2,,,`,
      `${A},S-3,,maybe,1000,2026-12-30`,
    ].join('\n');
    const [r1, r2, r3] = rowsOf(readResultsCsv(csv, 'pathogen', empty, NOW));
    const said = (r: CsvRow) => (r.ok ? [] : r.problems.map((p) => `${p.missing ? 'empty' : 'bad'} ${p.column}`));
    // Nothing typed on the page and no column: every row says so, not just the first.
    expect(said(r1)).toEqual(['empty method', 'empty method version', 'empty sample type']);
    expect(said(r2)).toEqual([
      'empty subject',
      'empty sample id',
      'empty method',
      'empty method version',
      'empty result',
      'empty sample type',
    ]);
    expect(said(r3)).toEqual([
      'empty accession',
      'empty method',
      'empty method version',
      'bad result',
      'empty sample type',
      'bad ct',
      'bad tested',
    ]);
    expect(r3).toMatchObject({ ok: false, line: 4, sampleId: 'S-3', code: 'accession' });
    // Typed once on the page, the same file has only its own cells' problems.
    const typed = rowsOf(readResultsCsv(csv, 'pathogen', d, NOW));
    expect(typed[0]).toMatchObject({ ok: true });
    expect(said(typed[1])).toEqual(['empty subject', 'empty sample id', 'empty result']);
  });

  it('numbers each row as the spreadsheet does, blank rows counted', () => {
    const csv = ['subject,sample id,accession,result', '', `${A},S-1,L-1,nd`, ',,,', `${A},S-2,L-2,maybe`].join('\n');
    const rows = rowsOf(readResultsCsv(csv, 'pathogen', d, NOW));
    expect(rows.map((r) => [r.line, r.ok])).toEqual([
      [3, true],
      [5, false],
    ]);
  });

  it('a comparison and a parentage row say every bad cell too', () => {
    const m = rowsOf(
      readResultsCsv(
        `subject,sample id,accession,other,result,compared,differing\n${A},S,L,${A},yes,x,91\n`,
        'match',
        d,
        NOW,
      ),
    );
    expect(m[0]).toMatchObject({
      ok: false,
      problems: [
        { code: 'other', column: 'other' },
        { code: 'counts', column: 'compared' },
      ],
    });
    const l = rowsOf(readResultsCsv(`subject,sample id,accession,parent 1,result\n${A},S,L,,\n`, 'lineage', d, NOW));
    expect(l[0]).toMatchObject({
      ok: false,
      problems: [
        { code: 'result', column: 'result', missing: true },
        { code: 'parents', column: 'parent 1', missing: true },
      ],
    });
  });
});

// Plant-users review: running the same file twice signed every result again, with no warning.
describe('rows already signed in this browser', () => {
  const csv = [
    'subject,sample id,accession,target,result,replaces',
    `${A},S-1,L-1,HLVd,not detected,`,
    `${A},S-1,L-1,CBCVd,not detected,`,
    `${A},S-2,L-2,HLVd,detected,`,
    `${A},S-3,L-3,HLVd,not detected,${C}`,
    `${B},S-4,L-4,HLVd,not detected,`,
  ].join('\n');
  const rows = rowsOf(readResultsCsv(csv, 'pathogen', d, NOW));
  const signed = (r: CsvRow, code: string) => {
    if (!r.ok) throw new Error('row not ok');
    return { statement: r.statement, code };
  };

  it('finds the same result again: record, sample ID, accession, target and call', () => {
    expect(rows.every((r) => r.ok)).toBe(true);
    const before = rows.map((r, i) => signed(r, String(i).repeat(64).slice(0, 64)));
    const again = alreadySigned(rows, before);
    // Row 5 names a result it replaces: a re-test is meant, never counted as a copy.
    expect([...again.keys()]).toEqual([2, 3, 4, 6]);
    expect(again.get(2)).toBe(before[0].code);
    expect(alreadySigned(rows, [])).toEqual(new Map());
  });

  it('doesn’t count a different target, call, sample, accession or record as the same', () => {
    const one = signed(rows[0], 'e'.repeat(64));
    const variants = [
      `${A},S-1,L-1,CBCVd,not detected,`, // another target
      `${A},S-1,L-1,HLVd,detected,`, // another call: a conflicting result, not a copy
      `${A},S-9,L-1,HLVd,not detected,`,
      `${A},S-1,L-9,HLVd,not detected,`,
      `${B},S-1,L-1,HLVd,not detected,`,
      `${A},S-1,L-1,hlvd,not detected,`, // the same target in another case: the same
    ];
    const got = variants.map(
      (v) =>
        alreadySigned(
          rowsOf(readResultsCsv(`subject,sample id,accession,target,result,ct\n${v}`, 'pathogen', d, NOW)),
          [one],
        ).size,
    );
    expect(got).toEqual([0, 0, 0, 0, 0, 1]);
  });

  it('compares a comparison by its other record, and a parentage check by its parents in any order', () => {
    const m = (other: string, call: string) =>
      rowsOf(readResultsCsv(`subject,sample id,accession,other,result\n${A},S,L,${other},${call}\n`, 'match', d, NOW));
    const before = [signed(m(B, 'match')[0], 'f'.repeat(64))];
    expect(alreadySigned(m(B, 'match'), before).size).toBe(1);
    expect(alreadySigned(m(C, 'match'), before).size).toBe(0);
    expect(alreadySigned(m(B, 'no match'), before).size).toBe(0);
    const l = (p1: string, p2: string) =>
      rowsOf(
        readResultsCsv(
          `subject,sample id,accession,parent 1,parent 2,result\n${A},S,L,${p1},${p2},consistent\n`,
          'lineage',
          d,
          NOW,
        ),
      );
    const lb = [signed(l(B, C)[0], 'f'.repeat(64))];
    expect(alreadySigned(l(C, B), lb).size).toBe(1);
  });

  it('the summary lists a skipped row with the code it was signed under before', () => {
    const r = rows[0];
    if (!r.ok) throw new Error('row not ok');
    const s = resultsSummaryCsv([{ already: r.statement, code: 'e'.repeat(64) }]);
    expect(s).toContain(`already signed before: skipped,L-1,S-1,HLVd,${A},pathogen,not detected`);
    expect(s).toContain('e'.repeat(64));
  });
});
