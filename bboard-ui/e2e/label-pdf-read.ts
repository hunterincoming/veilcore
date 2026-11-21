// Reads back the first QR code of a downloaded label sheet (label-pdf.ts) for the browser tests:
// the first page's drawing, its first code's modules drawn as a printer would at 300 dpi, read
// with zxing-wasm, the site's own reader. Only for the PDFs that file writes, not any PDF.
// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { inflateSync } from 'node:zlib';
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';

export const readLabelPdfCode = async (pdf: Buffer): Promise<string | undefined> => {
  const s = pdf.toString('latin1');
  const page = /\d+ 0 obj\n<< \/Type \/Page [^\n]*\/Contents (\d+) 0 R/.exec(s);
  if (!page) return undefined;
  const obj = new RegExp(`(?:^|\\n)${page[1]} 0 obj\\n<<[^\\n]*/Length (\\d+) >>\\nstream\\n`).exec(s);
  if (!obj) return undefined;
  const start = obj.index + obj[0].length;
  const ops = inflateSync(pdf.subarray(start, start + Number(obj[1]))).toString('latin1');
  const rects = (ops.split('\n0 g\n')[1] ?? '')
    .split('\nf')[0]
    .split('\n')
    .map((l) => l.split(' ').slice(0, 4).map(Number));
  if (!rects.length) return undefined;
  const x0 = Math.min(...rects.map((r) => r[0]));
  const y0 = Math.min(...rects.map((r) => r[1]));
  const x1 = Math.max(...rects.map((r) => r[0] + r[2]));
  const k = 300 / 25.4;
  const q = 20;
  const side = Math.ceil((x1 - x0) * k) + 2 * q;
  const data = new Uint8ClampedArray(side * side * 4).fill(255);
  for (const [rx, ry, rw, rh] of rects)
    for (let py = Math.round((ry - y0) * k) + q; py < Math.round((ry - y0 + rh) * k) + q; py++)
      for (let px = Math.round((rx - x0) * k) + q; px < Math.round((rx - x0 + rw) * k) + q; px++) {
        const i = (py * side + px) * 4;
        data[i] = data[i + 1] = data[i + 2] = 0;
      }
  const wasm = fs.readFileSync(createRequire(import.meta.url).resolve('zxing-wasm/reader/zxing_reader.wasm'));
  await prepareZXingModule({ overrides: { wasmBinary: wasm.buffer as ArrayBuffer }, fireImmediately: true });
  const [read] = await readBarcodes({ data, width: side, height: side, colorSpace: 'srgb' } as ImageData, {
    formats: ['QRCode'],
  });
  return read?.text;
};
