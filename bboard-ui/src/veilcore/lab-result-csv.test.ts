// A lab's CSV of results (lab-result-csv.ts): one statement per row, checked by the statement's
// own rules; a bad row is named and left out, never tidied into something else.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { csvTemplate, readResultsCsv, resultsSummaryCsv, CSV_MAX_ROWS } from './lab-result-csv';

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

describe('a lab’s CSV of results', () => {
  it('reads pathogen rows, taking what the page says for every row and what a cell overrides', () => {
    const csv = [
      'Subject,Sample ID,Accession,Result,Ct,QC: Internal control Ct,Sample type',
      `${A},S-1,L-1,Not detected,,24.1,`,
      `${A.toUpperCase()},S-2,L-2,detected,"31,5",23.9,root`,
      `nope,S-3,L-3,detected,,,`,
      `${A},S-4,L-4,maybe,,,`,
    ].join('\n');
    const out = readResultsCsv(csv, 'pathogen', d);
    if ('error' in out) throw new Error(out.error);
    const [r1, r2, r3, r4] = out.rows;
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
    expect(r3).toMatchObject({ ok: false, code: 'subject', line: 4 });
    expect(r4).toMatchObject({ ok: false, code: 'result', line: 5 });
  });

  it('reads comparisons and parentage checks by proof code only', () => {
    const m = readResultsCsv(
      `subject,sample,accession,other,result,compared,differing\n${A},S,L,${B},match,90,0\n`,
      'match',
      d,
    );
    if ('error' in m) throw new Error(m.error);
    expect(m.rows[0]).toMatchObject({
      ok: true,
      statement: { result: { other: B, matches: true, compared: 90, differing: 0 } },
    });
    const l = readResultsCsv(
      `subject,sample,accession,parent 1,parent 2,result,compared,conflicts 1,conflicts 2\n${A},S,L,${B},${C},excluded,88,0,7\n${A},S2,L2,${A},,consistent,,,\n`,
      'lineage',
      d,
    );
    if ('error' in l) throw new Error(l.error);
    expect(l.rows[0]).toMatchObject({
      ok: true,
      statement: { result: { parents: [B, C], consistent: false, conflicts: [0, 7] } },
    });
    // A sample can't be its own parent.
    expect(l.rows[1]).toMatchObject({ ok: false, code: 'parents' });
  });

  it('refuses a file without the columns that name the sample, and the same sample twice', () => {
    expect(readResultsCsv('a,b\n1,2\n', 'pathogen', d)).toEqual({ error: 'columns' });
    expect(readResultsCsv('subject\n', 'pathogen', d)).toEqual({ error: 'empty' });
    const out = readResultsCsv(`subject,sample id,accession,result\n${A},S,L,nd\n${A},S,L,nd\n`, 'pathogen', d);
    if ('error' in out) throw new Error(out.error);
    expect(out.rows.map((r) => r.ok)).toEqual([true, false]);
    const many = [
      'subject,sample id,accession,result',
      ...Array.from({ length: CSV_MAX_ROWS + 1 }, (_, i) => `${A},S${i},L${i},nd`),
    ];
    const big = readResultsCsv(many.join('\n'), 'pathogen', d);
    if ('error' in big) throw new Error(big.error);
    expect(big.tooMany).toBe(true);
    expect(big.rows).toHaveLength(CSV_MAX_ROWS);
  });

  it('its template reads back, and the summary keeps a formula as text', () => {
    for (const k of ['pathogen', 'match', 'lineage'] as const) {
      const out = readResultsCsv(csvTemplate(k), k, d);
      expect('error' in out ? out.error : out.rows.length).toBe(1);
    }
    const s = resultsSummaryCsv([
      {
        statement: {
          kind: 'pathogen',
          subject: A,
          sampleId: '=1+1',
          accession: 'L',
          tested: '2026-11-05',
          result: { target: 'HLVd', sampleType: 'leaf', detected: false },
        },
        code: B,
      },
    ]);
    expect(s).toContain("'=1+1");
    expect(s).toContain('not detected');
  });
});
