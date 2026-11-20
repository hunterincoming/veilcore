// The label pages themselves (label-layouts.ts): one SVG per page, measured in millimetres, so the
// print is exact at 100% and the screen shows the same page scaled to fit. Each label: the QR code
// of its check link, the short record ID, "Scan to check" and, if the holder chose it, the name.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { fitName, labelLink, shortId, slotAt, type Labelled, type Layout } from './label-layouts';

const INK = '#000';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** One label, drawn at (x, y) in a page's millimetres. */
const Label: React.FC<{ r: Labelled; showName: boolean; scanToCheck: string; x: number; y: number; l: Layout }> = ({
  r,
  showName,
  scanToCheck,
  x,
  y,
  l,
}) => {
  const { w, h } = l.label;
  // The quiet zone round the code: two modules inside it (marginSize) and the label's edge.
  const pad = Math.min(2.5, h * 0.08);
  const qr = h - 2 * pad;
  const tx = x + pad + qr + 2;
  const room = w - (tx - x) - pad;
  // Type sized to the label's height: about 3 mm on a 1 inch label, larger on L7160.
  const big = Math.min(4.2, h * 0.13);
  const small = big * 0.8;
  const name =
    showName && r.strainName?.trim() ? fitName(r.strainName, Math.max(4, Math.floor(room / (small * 0.55)))) : '';
  const lines = [
    { text: shortId(r.id), size: big, font: MONO, weight: 700 },
    { text: scanToCheck, size: small, font: SANS, weight: 400 },
    ...(name ? [{ text: name, size: small, font: SANS, weight: 700 }] : []),
  ];
  const total = lines.reduce((n, li) => n + li.size * 1.35, 0);
  let cy = y + (h - total) / 2;
  return (
    <g data-label={r.id}>
      <QRCodeSVG
        value={labelLink(r, showName)}
        x={x + pad}
        y={y + pad}
        size={qr}
        level="M"
        marginSize={2}
        bgColor="#fff"
        fgColor={INK}
      />
      {lines.map((li, i) => {
        cy += li.size * 1.35;
        return (
          <text
            key={i}
            x={tx}
            y={cy - li.size * 0.3}
            fontSize={li.size}
            fontFamily={li.font}
            fontWeight={li.weight}
            fill={INK}
            textLength={li.text.length * li.size * 0.6 > room ? room : undefined}
            lengthAdjust="spacingAndGlyphs"
          >
            {li.text}
          </text>
        );
      })}
    </g>
  );
};

export const LabelPages: React.FC<{
  pages: (Labelled | null)[][];
  layout: Layout;
  showName: boolean;
  scanToCheck: string;
  /** "Page 1 of 3", for screen readers. */
  pageName: (n: number, of: number) => string;
  /** Faint label outlines on screen, so the sheet can be seen; never printed. */
  outlines?: boolean;
}> = ({ pages, layout: l, showName, scanToCheck, pageName, outlines = true }) => (
  <>
    {pages.map((page, p) => (
      <svg
        key={p}
        className="label-page"
        viewBox={`0 0 ${l.page.w} ${l.page.h}`}
        width={`${l.page.w}mm`}
        height={`${l.page.h}mm`}
        role="img"
        aria-label={pageName(p + 1, pages.length)}
        data-label-page={p + 1}
      >
        <rect width={l.page.w} height={l.page.h} fill="#fff" />
        {page.map((r, i) => {
          const { x, y } = slotAt(i, l);
          return (
            <React.Fragment key={i}>
              {outlines && (
                <rect
                  className="label-outline"
                  x={x}
                  y={y}
                  width={l.label.w}
                  height={l.label.h}
                  rx={1.5}
                  fill="none"
                  stroke="#c9ccd2"
                  strokeWidth={0.2}
                />
              )}
              {r && <Label r={r} showName={showName} scanToCheck={scanToCheck} x={x} y={y} l={l} />}
            </React.Fragment>
          );
        })}
      </svg>
    ))}
  </>
);
