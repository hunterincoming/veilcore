// The downloaded label sheet (label-pdf.ts): one PDF page per sheet at the paper's true size, one
// vector QR code per label where the screen puts it, and each code reads back (with zxing-wasm,
// the site's own reader) as the label's check link.
// SPDX-License-Identifier: Apache-2.0
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { unzlibSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import {
  LAYOUTS,
  QR_LEVEL,
  QR_MARGIN,
  labelFileName,
  labelLink,
  labelParts,
  paginate,
  slotAt,
  type LabelSize,
} from './label-layouts';
import { labelsPdf, qrRuns, type QrDrawing } from './label-pdf';

/** A PDF renderer on this machine (poppler's pdftoppm), for the test that draws the file as a reader would. */
const PDFTOPPM = (() => {
  try {
    execFileSync('pdftoppm', ['-v'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

const prepared = (async () => {
  const wasm = fs.readFileSync(createRequire(import.meta.url).resolve('zxing-wasm/reader/zxing_reader.wasm'));
  await prepareZXingModule({ overrides: { wasmBinary: wasm.buffer }, fireImmediately: true });
})();

const FP = 'ab'.repeat(32);
const rec = (n: number) => ({
  id: `VEIL-${n.toString(16).toUpperCase().padStart(32, '0')}`,
  recordFingerprint: FP,
  strainName: `Plant ${n}`,
  nameSalt: 'cd'.repeat(32),
});

/** The same drawing the browser makes (label-download.ts drawQrCodes), here without a DOM. */
const qr = (values: readonly string[]): Map<string, QrDrawing> =>
  new Map(
    values.map((v) => {
      const svg = renderToStaticMarkup(
        React.createElement(QRCodeSVG, { value: v, level: QR_LEVEL, marginSize: QR_MARGIN }),
      );
      const cells = Number(/viewBox="0 0 (\d+) \d+"/.exec(svg)?.[1]);
      const d = [...svg.matchAll(/<path[^>]*d="([^"]+)"/g)].map((m) => m[1])[1] ?? '';
      return [v, { cells, d }];
    }),
  );

const words: string[][] = [];
const text = (lines: readonly { text: string }[], _box: unknown, width: number, height: number) => {
  words.push(lines.map((l) => l.text));
  return { width, height, gray: new Uint8Array(width * height).fill(255) };
};

const latin1 = (b: Uint8Array) => Buffer.from(b).toString('latin1');

/** Each object's dictionary and its stream (inflated), from the file as written. */
const objectsOf = (pdf: Uint8Array) => {
  const s = latin1(pdf);
  const out = new Map<number, { dict: string; stream?: Uint8Array; at: number }>();
  for (const m of s.matchAll(/(\d+) 0 obj\n/g)) {
    const at = m.index;
    const start = at + m[0].length;
    const end = s.indexOf('\nendobj', start);
    const body = s.slice(start, end);
    const sm = /^(<<[\s\S]*?>>)\nstream\n/.exec(body);
    if (sm) {
      const len = Number(/\/Length (\d+)/.exec(sm[1])?.[1]);
      const raw = pdf.subarray(start + sm[0].length, start + sm[0].length + len);
      out.set(Number(m[1]), { dict: sm[1], stream: unzlibSync(raw), at });
    } else out.set(Number(m[1]), { dict: body, at });
  }
  return out;
};

const pagesOf = (pdf: Uint8Array) => {
  const objs = objectsOf(pdf);
  return [...objs.values()]
    .filter((o) => /\/Type \/Page\b/.test(o.dict))
    .map((o) => {
      const box = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(o.dict)!;
      const contents = objs.get(Number(/\/Contents (\d+) 0 R/.exec(o.dict)![1]))!;
      const ops = new TextDecoder().decode(contents.stream);
      return { w: Number(box[1]), h: Number(box[2]), ops };
    });
};

/** The QR codes on a page: each fill's rectangles, in millimetres. */
const codesOn = (ops: string) =>
  ops
    .split('\n0 g\n')
    .slice(1)
    .map((chunk) =>
      chunk
        .split('\nf')[0]
        .split('\n')
        .map((l) => l.split(' ').slice(0, 4).map(Number)),
    );

const make = (size: LabelSize, n: number, opts: { copies?: number; skip?: number; showName?: boolean } = {}) => {
  const layout = LAYOUTS[size];
  const pages = paginate(
    Array.from({ length: n }, (_, i) => rec(i + 1)),
    opts.copies ?? 1,
    opts.skip ?? 0,
    layout,
  );
  return {
    pages,
    pdf: labelsPdf({ pages, layout, showName: !!opts.showName, scanToCheck: 'Scan to check', qr, text, dpi: 50 }),
  };
};

describe('the downloaded label sheet', () => {
  it('is a PDF whose every page is the sheet at its true size', () => {
    // Points: US Letter 8.5 × 11 in, A4 210 × 297 mm, a 2 × 1 in label.
    const want: Record<LabelSize, [number, number]> = {
      letter: [612, 792],
      a4: [595.2756, 841.8898],
      thermal: [144, 72],
    };
    for (const size of ['letter', 'a4', 'thermal'] as const) {
      const { pdf, pages } = make(size, 40);
      expect(latin1(pdf.subarray(0, 8))).toBe('%PDF-1.4');
      expect(latin1(pdf.subarray(-6))).toBe('%%EOF\n');
      const got = pagesOf(pdf);
      expect(got).toHaveLength(pages.length);
      for (const p of got) expect([p.w, p.h], size).toEqual(want[size]);
      expect(latin1(pdf)).toContain(`/Count ${pages.length}`);
    }
  });

  it('has a table that points at every object, as a PDF reader needs', () => {
    const { pdf } = make('a4', 5);
    const s = latin1(pdf);
    const objs = objectsOf(pdf);
    const start = Number(/startxref\n(\d+)\n/.exec(s)![1]);
    expect(s.slice(start, start + 4)).toBe('xref');
    const rows = [...s.slice(start).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    expect(rows).toHaveLength(objs.size);
    rows.forEach((at, i) => expect(objs.get(i + 1)?.at).toBe(at));
  });

  it('one QR code per label, where the screen puts it, after the places already used', () => {
    words.length = 0;
    const { pdf, pages } = make('letter', 2, { copies: 3, skip: 28 });
    const got = pagesOf(pdf);
    expect(got).toHaveLength(2);
    const l = LAYOUTS.letter;
    got.forEach((p, i) => {
      const codes = codesOn(p.ops);
      const labels = pages[i].flatMap((r, slot) => (r ? [{ r, slot }] : []));
      expect(codes).toHaveLength(labels.length);
      // Each code's first module sits in its label's place.
      labels.forEach(({ r, slot }, k) => {
        const { x, y } = slotAt(slot, l);
        const parts = labelParts(r, false, 'Scan to check', x, y, l);
        const xs = codes[k].map((c) => c[0]);
        const ys = codes[k].map((c) => c[1]);
        expect(Math.min(...xs)).toBeGreaterThanOrEqual(parts.qr.x);
        expect(Math.max(...codes[k].map((c) => c[0] + c[2]))).toBeLessThanOrEqual(parts.qr.x + parts.qr.size + 1e-3);
        expect(Math.min(...ys)).toBeGreaterThanOrEqual(parts.qr.y);
        expect(Math.max(...ys)).toBeLessThanOrEqual(parts.qr.y + parts.qr.size);
      });
      // Each label's words too.
      expect(p.ops.match(/ Do Q/g) ?? []).toHaveLength(labels.length);
    });
    // The words are drawn once per record, not once per copy.
    expect(words).toEqual([
      ['VEIL-0000…0001', 'Scan to check'],
      ['VEIL-0000…0002', 'Scan to check'],
    ]);
  });

  it('the name is in the words only when chosen', () => {
    words.length = 0;
    make('a4', 1, { showName: true });
    expect(words).toEqual([['VEIL-0000…0001', 'Scan to check', 'Plant 1']]);
  });

  it('each QR code reads back as its label’s check link', async () => {
    await prepared;
    for (const [size, showName] of [
      ['thermal', false],
      ['letter', true],
      ['a4', false],
    ] as const) {
      const { pdf, pages } = make(size, 2, { showName });
      const l = LAYOUTS[size];
      const p = pagesOf(pdf)[0];
      const code = codesOn(p.ops)[0];
      const r = pages[0].find((x) => x)!;
      const { x, y } = slotAt(pages[0].indexOf(r), l);
      const box = labelParts(r, showName, 'Scan to check', x, y, l).qr;
      // Drawn as a printer would at 300 dpi, black on white, with the label's white round it.
      const k = 300 / 25.4;
      const side = Math.ceil(box.size * k) + 40;
      const data = new Uint8ClampedArray(side * side * 4).fill(255);
      for (const [rx, ry, rw, rh] of code) {
        for (let py = Math.round((ry - box.y) * k) + 20; py < Math.round((ry - box.y + rh) * k) + 20; py++)
          for (let px = Math.round((rx - box.x) * k) + 20; px < Math.round((rx - box.x + rw) * k) + 20; px++) {
            const i = (py * side + px) * 4;
            data[i] = data[i + 1] = data[i + 2] = 0;
          }
      }
      const [read] = await readBarcodes(
        { data, width: side, height: side, colorSpace: 'srgb' },
        {
          formats: ['QRCode'],
        },
      );
      expect(read?.text, size).toBe(labelLink(r, showName));
    }
  });

  it.skipIf(!PDFTOPPM)(
    'drawn by a real PDF reader: the code reads back and the words are the right way up',
    async () => {
      await prepared;
      const l = LAYOUTS.thermal;
      const pages = paginate([rec(3)], 1, 0, l);
      let box = { x: 0, y: 0, w: 0, h: 0 };
      // The words' picture: black in its top quarter, white below, to see which way up it lands.
      const pdf = labelsPdf({
        pages,
        layout: l,
        showName: false,
        scanToCheck: 'Scan to check',
        qr,
        text: (_lines, b, width, height) => {
          box = b;
          const gray = new Uint8Array(width * height).fill(255);
          gray.fill(0, 0, width * Math.floor(height / 4));
          return { width, height, gray };
        },
      });
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'labels-pdf-'));
      try {
        fs.writeFileSync(path.join(dir, 'l.pdf'), pdf);
        execFileSync('pdftoppm', ['-r', '300', '-gray', '-singlefile', path.join(dir, 'l.pdf'), path.join(dir, 'l')]);
        const pgm = fs.readFileSync(path.join(dir, 'l.pgm'));
        const head = /^P5\s+(\d+)\s+(\d+)\s+255\s/.exec(pgm.subarray(0, 40).toString('latin1'))!;
        const [width, height] = [Number(head[1]), Number(head[2])];
        // 2 × 1 inch at 300 dpi.
        expect([width, height]).toEqual([600, 300]);
        const px = pgm.subarray(head[0].length);
        const at = (xMm: number, yMm: number) =>
          px[Math.round((yMm / 25.4) * 300) * width + Math.round((xMm / 25.4) * 300)];
        const cx = box.x + box.w / 2;
        expect(at(cx, box.y + box.h * 0.1)).toBeLessThan(64);
        expect(at(cx, box.y + box.h * 0.9)).toBeGreaterThan(192);
        const data = new Uint8ClampedArray(width * height * 4);
        for (let i = 0; i < width * height; i++) {
          data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = px[i];
          data[i * 4 + 3] = 255;
        }
        const [read] = await readBarcodes(
          { data, width, height, colorSpace: 'srgb' },
          {
            formats: ['QRCode'],
          },
        );
        expect(read?.text).toBe(labelLink(rec(3), false));
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    },
  );

  it('refuses a QR drawing it does not read, rather than print a wrong code', () => {
    expect(qrRuns('M2 3h4v1H2zM0,1 h1v1H0z')).toEqual([
      { x: 2, y: 3, len: 4 },
      { x: 0, y: 1, len: 1 },
    ]);
    expect(qrRuns('')).toEqual([]);
    expect(() => qrRuns('M2 3h4v1H2zM1 1L4 4z')).toThrow();
    expect(() => qrRuns('M2 3h4v1H3z')).toThrow();
  });

  it('is named for the record, or the day when there are several, and the paper', () => {
    const id = rec(7).id;
    const day = new Date(2026, 10, 21, 23, 30);
    expect(labelFileName([id], 'letter', day)).toBe(`veilcore-labels-${id}-letter.pdf`);
    expect(labelFileName([id, rec(8).id], 'a4', day)).toBe('veilcore-labels-2026-11-21-a4.pdf');
    expect(labelFileName(['../x'], 'thermal', day)).toBe('veilcore-labels-2026-11-21-2x1in.pdf');
  });
});
