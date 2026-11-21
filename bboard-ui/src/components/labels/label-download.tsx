// "Download PDF" on the labels page (docs/scan-and-labels.md): the browser parts of label-pdf.ts.
// The QR codes are drawn by qrcode.react, as on screen, into an element that is never on the page;
// the words are drawn on a canvas; the file is saved from a blob: address in this tab. Nothing is
// sent anywhere, and no other site is reached.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { QRCodeSVG } from 'qrcode.react';
import { LABEL_FONTS, QR_LEVEL, QR_MARGIN, type LabelLine } from './label-layouts';
import type { QrDrawing, TextImage } from './label-pdf';

/** Each QR code as qrcode.react draws it, with the same settings as the labels on screen. */
export const drawQrCodes = (values: readonly string[]): Map<string, QrDrawing> => {
  const host = document.createElement('div');
  const root = createRoot(host);
  try {
    flushSync(() =>
      root.render(
        <>
          {values.map((v) => (
            <QRCodeSVG key={v} value={v} level={QR_LEVEL} marginSize={QR_MARGIN} />
          ))}
        </>,
      ),
    );
    const svgs = [...host.querySelectorAll('svg')];
    if (svgs.length !== values.length) throw new Error('labels: a QR code was not drawn');
    return new Map(
      svgs.map((svg, i) => {
        const cells = Number(/^0 0 (\d+) \1$/.exec(svg.getAttribute('viewBox') ?? '')?.[1]);
        // The second path is the dark modules; the first is the white square under them.
        const d = svg.querySelectorAll('path')[1]?.getAttribute('d') ?? '';
        return [values[i], { cells, d }];
      }),
    );
  } finally {
    root.unmount();
  }
};

let canvas: HTMLCanvasElement | undefined;

/** One label's words on white, in the screen's fonts, each line squeezed to fit its room. */
export const drawWords = (
  lines: readonly LabelLine[],
  box: { x: number; y: number; w: number; h: number },
  width: number,
  height: number,
): TextImage => {
  canvas ??= document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('labels: this browser draws no canvas');
  const k = width / box.w;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  for (const li of lines) {
    ctx.font = `${li.weight} ${li.size * k}px ${LABEL_FONTS[li.font]}`;
    ctx.fillText(li.text, (li.x - box.x) * k, (li.y - box.y) * k, li.room * k);
  }
  const rgba = ctx.getImageData(0, 0, width, height).data;
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) gray[i] = rgba[i * 4];
  return { width, height, gray };
};

/**
 * Saves a file in one tap: a blob: address and a link with `download`, which Safari on iPhone and
 * iPad (13 and later), Chrome, Firefox and Edge all take. A browser without `download` gets the
 * file in a new tab, where its own Share or Save is; if that tab is blocked, the page shows a link
 * to the file instead ('blocked', with the address: the page lets it go when it is done with it).
 */
export const saveFile = (
  bytes: Uint8Array,
  name: string,
  type: string,
): { how: 'saved' | 'opened'; url?: undefined } | { how: 'blocked'; url: string } => {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
  // Safari reads the file after the tap returns: the address is kept a while, not let go at once.
  const later = () => setTimeout(() => URL.revokeObjectURL(url), 120_000);
  if ('download' in HTMLAnchorElement.prototype) {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    later();
    return { how: 'saved' };
  }
  // Not 'noopener': with it, window.open always returns null. The new tab is this site's own file.
  if (window.open(url, '_blank')) {
    later();
    return { how: 'opened' };
  }
  return { how: 'blocked', url };
};
