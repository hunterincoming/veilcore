// Round 6: an opened lab report downloads with the right file type, worked out from its
// bytes, and the list says which type it is. A CSV used to download as ".bin".
import { describe, expect, it } from 'vitest';
import { reportFileName, reportFileType, zipEntryNames } from './lab-results';

const enc = (s: string) => new TextEncoder().encode(s);

/** A ZIP with these (empty-ish, stored) entries, central directory and all. */
const zip = (names: readonly string[], { cut = false } = {}): Uint8Array => {
  const parts: number[] = [];
  const central: number[] = [];
  const le16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
  const le32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
  for (const name of names) {
    const offset = parts.length;
    const n = [...enc(name)];
    const data = [...enc('x')];
    parts.push(...le32(0x04034b50), ...le16(20), ...le16(0), ...le16(0), ...le16(0), ...le16(0));
    parts.push(...le32(0), ...le32(data.length), ...le32(data.length), ...le16(n.length), ...le16(0), ...n, ...data);
    central.push(...le32(0x02014b50), ...le16(20), ...le16(20), ...le16(0), ...le16(0), ...le16(0), ...le16(0));
    central.push(...le32(0), ...le32(data.length), ...le32(data.length), ...le16(n.length), ...le16(0), ...le16(0));
    central.push(...le16(0), ...le16(0), ...le32(0), ...le32(offset), ...n);
  }
  const cdOffset = parts.length;
  const end = [
    ...le32(0x06054b50),
    ...le16(0),
    ...le16(0),
    ...le16(names.length),
    ...le16(names.length),
    ...le32(central.length),
    ...le32(cdOffset),
    ...le16(0),
  ];
  return Uint8Array.from(cut ? parts : [...parts, ...central, ...end]);
};

const OFFICE = (folder: string) => ['[Content_Types].xml', '_rels/.rels', `${folder}/document.xml`];

describe('the type of an opened lab report, from its bytes', () => {
  it('PDF, PNG and JPEG by their signatures', () => {
    expect(reportFileType(enc('%PDF-1.7\n1 0 obj')).ext).toBe('pdf');
    // Some writers put a few bytes before the header; readers accept it.
    expect(reportFileType(enc('\n\n%PDF-1.4 x')).ext).toBe('pdf');
    expect(reportFileType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])).ext).toBe(
      'png',
    );
    expect(reportFileType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46])).ext).toBe('jpg');
    expect(reportFileType(enc('%PDF-1.7')).label).toBe('PDF');
  });

  it('ZIP-based files by what is inside: spreadsheet, Word, slides, else a ZIP', () => {
    expect(reportFileType(zip(OFFICE('xl'))).ext).toBe('xlsx');
    expect(reportFileType(zip(OFFICE('word'))).ext).toBe('docx');
    expect(reportFileType(zip(OFFICE('ppt'))).ext).toBe('pptx');
    expect(reportFileType(zip(['results/run1.csv', 'results/run2.csv'])).ext).toBe('zip');
    // [Content_Types].xml alone is not enough to call it an Office file.
    expect(reportFileType(zip(['[Content_Types].xml', 'other/a.xml'])).ext).toBe('zip');
    // A file cut before its central directory: the local headers still name the parts.
    expect(reportFileType(zip(OFFICE('xl'), { cut: true })).ext).toBe('xlsx');
    expect(zipEntryNames(zip(['a.txt', 'b/c.txt']))).toEqual(['a.txt', 'b/c.txt']);
    expect(reportFileType(zip(OFFICE('xl'))).mime).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('text: CSV by commas (or semicolons), TSV by tabs, else plain text', () => {
    const csv = 'sample,marker,allele\nHM-1,A12,7\nHM-1,B7,"3,4"\nHM-2,A12,9\n';
    expect(reportFileType(enc(csv))).toMatchObject({ ext: 'csv', label: 'CSV' });
    expect(reportFileType(enc('﻿' + csv)).ext).toBe('csv');
    expect(reportFileType(enc('a;b;c\r\n1;2;3\r\n4;5;6\r\n')).ext).toBe('csv');
    expect(reportFileType(enc('sample\tmarker\nHM-1\tA12\nHM-2\tB7\n')).ext).toBe('tsv');
    expect(reportFileType(enc('Lab report for Harbour Mist.\nAll markers within range, see attached.\n')).ext).toBe(
      'txt',
    );
    // One line with a comma isn't a table.
    expect(reportFileType(enc('Result: pass, see notes')).ext).toBe('txt');
    // Accented UTF-8 is still text.
    expect(reportFileType(enc('échantillon,marqueur\nHM-1,A12\nHM-2,B7\n')).ext).toBe('csv');
  });

  it('a long CSV sampled from its start is still a CSV', () => {
    const rows = Array.from({ length: 6000 }, (_, i) => `HM-${i},A12,${i % 9},ok`).join('\n');
    expect(reportFileType(enc(`sample,marker,allele,flag\n${rows}\n`)).ext).toBe('csv');
  });

  it('anything else is "Unknown type", saved as .bin', () => {
    expect(reportFileType(Uint8Array.from([0, 1, 2, 3, 250, 251, 252, 0, 7]))).toMatchObject({
      ext: 'bin',
      label: 'Unknown type',
    });
    expect(reportFileType(new Uint8Array(0)).ext).toBe('bin');
    expect(reportFileType(enc('   \n  \n')).ext).toBe('bin');
  });

  it('the download is named with the type it is', () => {
    const at = new Date(2026, 9, 15, 14, 32).getTime();
    const id = 'LR-3f2a9c00000000000000000000000000';
    expect(reportFileName(enc('a,b\n1,2\n3,4\n'), at, id)).toBe('Lab report 2026-10-15 14-32 LR-3F2A.csv');
    expect(reportFileName(zip(OFFICE('xl')), at, id)).toBe('Lab report 2026-10-15 14-32 LR-3F2A.xlsx');
    expect(reportFileName(enc('notes only'), at, id)).toBe('Lab report 2026-10-15 14-32 LR-3F2A.txt');
  });
});
