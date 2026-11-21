// The label sheet as a PDF file (docs/scan-and-labels.md), made on this device: one PDF page per
// sheet, at the paper's own size (2 × 1 in, US Letter or A4), with every label where it is on
// screen and in print (label-layouts.ts labelParts). Nothing is sent to make it.
//
// The QR codes are vector: each dark module is a filled rectangle, from the same QR library and
// settings as the screen (qrcode.react, QR_LEVEL, QR_MARGIN), so they stay sharp at any zoom and
// print. The words beside them are a picture at 600 dpi, drawn by the browser in the same fonts
// as the screen. A PDF's built-in fonts have no Japanese and no names in other scripts, and
// putting a font file in every download would make it large, so the words are drawn, not typed.
//
// Written by hand (PDF 1.4: a catalog, the pages, their drawing and the pictures, compressed with
// fflate, already in the site) so the site needs no PDF library.
// SPDX-License-Identifier: Apache-2.0

import { zlibSync } from 'fflate';
import { labelParts, slotAt, type LabelLine, type Labelled, type Layout } from './label-layouts';

/** A QR code as qrcode.react draws it: its size in modules (margin included) and its dark path. */
export type QrDrawing = { readonly cells: number; readonly d: string };

/** A label's words as a picture: grey levels (0 black, 255 white), row by row from the top. */
export type TextImage = { readonly width: number; readonly height: number; readonly gray: Uint8Array };

export type LabelsPdfInput = {
  readonly pages: readonly (readonly (Labelled | null)[])[];
  readonly layout: Layout;
  readonly showName: boolean;
  readonly scanToCheck: string;
  /** Every QR code's drawing, by the text it carries (label-download.ts, or a test's own). */
  readonly qr: (values: readonly string[]) => ReadonlyMap<string, QrDrawing>;
  /**
   * One label's words, drawn into a picture `width` × `height` pixels covering the box beside the
   * code (`box`, in millimetres, the lines' places in the same millimetres).
   */
  readonly text: (
    lines: readonly LabelLine[],
    box: { x: number; y: number; w: number; h: number },
    width: number,
    height: number,
  ) => TextImage;
  /** The words' resolution, in dots per inch. */
  readonly dpi?: number;
};

/** Points (1⁄72 in) per millimetre. */
const PT = 72 / 25.4;

/** A number as a PDF writes it: no exponent, at most four decimals. */
const num = (n: number): string => {
  const s = n.toFixed(4).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
};

/**
 * The dark modules of a QR code, as runs along a row, from qrcode.react's path: `M<x> <y>h<n>v1H<x>z`,
 * or `M<x>,<y> h<n>v1H<x>z` for a run that reaches the edge. Anything else is refused, so a change in
 * that library's drawing can't put a wrong code on a label without a test failing.
 */
export const qrRuns = (d: string): { x: number; y: number; len: number }[] => {
  const runs: { x: number; y: number; len: number }[] = [];
  const re = /M(\d+)[ ,](\d+) ?h(\d+)v1H(\d+)z/gy;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    if (m[1] !== m[4]) break;
    runs.push({ x: Number(m[1]), y: Number(m[2]), len: Number(m[3]) });
    if (re.lastIndex === d.length) return runs;
  }
  if (d === '') return runs;
  throw new Error('labels: the QR code drawing has a form this file does not read');
};

const enc = new TextEncoder();

/** The label sheet as a PDF file's bytes. */
export const labelsPdf = (input: LabelsPdfInput): Uint8Array => {
  const { pages, layout: l, showName, scanToCheck } = input;
  const dpi = input.dpi ?? 600;
  const W = l.page.w * PT;
  const H = l.page.h * PT;

  const values = new Set<string>();
  const plan = pages.map((page) =>
    page.flatMap((r, i) => {
      if (!r) return [];
      const { x, y } = slotAt(i, l);
      const parts = labelParts(r, showName, scanToCheck, x, y, l);
      values.add(parts.qr.value);
      return [{ ...parts, y }];
    }),
  );
  const drawings = input.qr([...values]);

  // Objects: 1 catalog, 2 page list, then each picture of words, then each page and its drawing.
  const objects: Uint8Array[] = [];
  const add = (head: string, stream?: Uint8Array): number => {
    objects.push(
      stream
        ? concat([
            enc.encode(`${head.replace(/>>$/, '')} /Length ${stream.length} >>\nstream\n`),
            stream,
            enc.encode('\nendstream'),
          ])
        : enc.encode(head),
    );
    return objects.length;
  };
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add(''); // the page list, written once the pages have numbers

  // The same record's words are the same picture wherever its label is: drawn and kept once.
  const images = new Map<string, { name: string; obj: number }>();
  const pictureOf = (lines: readonly LabelLine[], box: { x: number; y: number; w: number; h: number }) => {
    const key = lines.map((li) => `${li.font}${li.weight}${li.size}:${li.text}`).join('\n');
    let im = images.get(key);
    if (!im) {
      const width = Math.max(1, Math.ceil((box.w / 25.4) * dpi));
      const height = Math.max(1, Math.ceil((box.h / 25.4) * dpi));
      const pic = input.text(lines, box, width, height);
      if (pic.width !== width || pic.height !== height || pic.gray.length !== width * height)
        throw new Error('labels: the words were drawn at the wrong size');
      const obj = add(
        `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode >>`,
        zlibSync(pic.gray, { level: 6 }),
      );
      im = { name: `T${images.size}`, obj };
      images.set(key, im);
    }
    return im;
  };

  const pageObjs: number[] = [];
  for (const labels of plan) {
    // Drawn in millimetres from the top left, as on screen: the matrix turns them into points.
    const ops: string[] = [`${num(PT)} 0 0 ${num(-PT)} 0 ${num(H)} cm`];
    const used = new Map<string, number>();
    for (const { qr, text, lines, y } of labels) {
      const drawing = drawings.get(qr.value);
      if (!drawing || !(drawing.cells > 0)) throw new Error('labels: a QR code was not drawn');
      const m = qr.size / drawing.cells;
      const rects = qrRuns(drawing.d).map(
        (r) => `${num(qr.x + r.x * m)} ${num(qr.y + r.y * m)} ${num(r.len * m)} ${num(m)} re`,
      );
      // One fill for the whole code, so a viewer draws no hairline seams between modules.
      if (rects.length) ops.push('0 g', ...rects, 'f');
      // The picture covers only the lines (a little above the tallest letters, below the lowest
      // descenders), not the whole label: a third of the pixels to draw and keep.
      const top = Math.max(y, Math.min(...lines.map((li) => li.y - li.size)));
      const bottom = Math.min(y + l.label.h, Math.max(...lines.map((li) => li.y + li.size * 0.35)));
      const box = { x: text.x, y: top, w: text.w, h: bottom - top };
      const im = pictureOf(lines, box);
      used.set(im.name, im.obj);
      ops.push(`q ${num(box.w)} 0 0 ${num(-box.h)} ${num(box.x)} ${num(box.y + box.h)} cm /${im.name} Do Q`);
    }
    const contents = add('<< /Filter /FlateDecode >>', zlibSync(enc.encode(ops.join('\n')), { level: 9 }));
    const xo = [...used].map(([name, obj]) => `/${name} ${obj} 0 R`).join(' ');
    pageObjs.push(
      add(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(W)} ${num(H)}] /Resources << /XObject << ${xo} >> >> /Contents ${contents} 0 R >>`,
      ),
    );
  }
  objects[1] = enc.encode(
    `<< /Type /Pages /Kids [${pageObjs.map((n) => `${n} 0 R`).join(' ')}] /Count ${pageObjs.length} >>`,
  );
  const info = add('<< /Producer (VeilCore) /Title (VeilCore QR labels) >>');

  // The file: header, each object, the table of where each starts, and the trailer.
  // The second line's four high bytes tell a file transfer the file is binary, as PDFs do.
  const parts: Uint8Array[] = [enc.encode('%PDF-1.4\n'), new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])];
  let at = parts[0].length + parts[1].length;
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(at);
    const chunk = concat([enc.encode(`${i + 1} 0 obj\n`), o, enc.encode('\nendobj\n')]);
    parts.push(chunk);
    at += chunk.length;
  });
  const xref = [
    'xref',
    `0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n `),
    'trailer',
    `<< /Size ${objects.length + 1} /Root 1 0 R /Info ${info} 0 R >>`,
    'startxref',
    String(at),
    '%%EOF',
    '',
  ].join('\n');
  parts.push(enc.encode(xref));
  return concat(parts);
};

const concat = (parts: readonly Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
};
