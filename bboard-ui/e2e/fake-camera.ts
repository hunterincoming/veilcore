// A camera for the browser tests (scan-labels.spec.ts): Chromium's fake capture device, playing a
// still video of a QR code (`--use-file-for-fake-video-capture`). The QR code is drawn by the
// same library the labels use (qrcode.react), at test time, into a Y4M file in the test's own
// output folder, so no image is kept in the repository.
// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';

/** The QR code's modules, as rows of booleans (true is dark), from qrcode.react's own drawing. */
export const qrModules = (text: string): boolean[][] => {
  const svg = renderToStaticMarkup(React.createElement(QRCodeSVG, { value: text, level: 'M', marginSize: 0 }));
  const n = Number(/viewBox="0 0 (\d+) \d+"/.exec(svg)?.[1]);
  const grid = Array.from({ length: n }, () => Array<boolean>(n).fill(false));
  // The dark path is runs: M<x> <y>h<len>v1H<x>z (or "M<x>,<y> h…" for a run to the edge).
  const dark = [...svg.matchAll(/<path[^>]*d="([^"]+)"/g)].map((m) => m[1]).pop() ?? '';
  for (const m of dark.matchAll(/M(\d+)[ ,](\d+) ?h(\d+)v1H\d+z/g)) {
    const [x, y, len] = [Number(m[1]), Number(m[2]), Number(m[3])];
    for (let i = 0; i < len; i++) grid[y][x + i] = true;
  }
  return grid;
};

/**
 * A one-frame Y4M video (Chromium plays it in a loop) of `text` as a QR code, black on white in
 * the middle of a 640 × 480 grey picture. Returns its path.
 */
export const qrVideo = (text: string, name = 'qr'): string => {
  const W = 640;
  const H = 480;
  const grid = qrModules(text);
  const n = grid.length;
  const quiet = 4;
  const px = Math.floor((Math.min(W, H) * 0.8) / (n + 2 * quiet));
  const side = px * (n + 2 * quiet);
  const x0 = Math.floor((W - side) / 2);
  const y0 = Math.floor((H - side) / 2);
  const y = Buffer.alloc(W * H, 160);
  for (let r = 0; r < side; r++)
    for (let c = 0; c < side; c++) {
      const mr = Math.floor(r / px) - quiet;
      const mc = Math.floor(c / px) - quiet;
      const darkHere = mr >= 0 && mc >= 0 && mr < n && mc < n && grid[mr][mc];
      y[(y0 + r) * W + x0 + c] = darkHere ? 16 : 235;
    }
  const chroma = Buffer.alloc((W / 2) * (H / 2) * 2, 128);
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'veilcore-camera-')), `${name}.y4m`);
  fs.writeFileSync(
    file,
    Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F10:1 Ip A1:1 C420jpeg\n`), Buffer.from('FRAME\n'), y, chroma]),
  );
  return file;
};

/** Chromium's flags for a fake camera playing `file`, with the permission prompt answered "allow". */
export const fakeCameraArgs = (file: string): string[] => [
  '--use-fake-device-for-media-stream',
  '--use-fake-ui-for-media-stream',
  `--use-file-for-fake-video-capture=${file}`,
];
