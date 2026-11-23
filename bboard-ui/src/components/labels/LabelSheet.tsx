// The label pages themselves (label-layouts.ts): one SVG per page, measured in millimetres, so the
// print is exact at 100% and the screen shows the same page scaled to fit. Each label: the QR code
// of its check link, the short record ID, the proof code's last 6 characters (large, to match the
// check page by eye), "Scan to check" and, if the holder chose it, the name.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { LABEL_FONTS, QR_LEVEL, QR_MARGIN, labelParts, slotAt, type Labelled, type Layout } from './label-layouts';

const INK = '#000';

/** One label, drawn at (x, y) in a page's millimetres (label-layouts.ts labelParts). */
const Label: React.FC<{ r: Labelled; showName: boolean; scanToCheck: string; x: number; y: number; l: Layout }> = ({
  r,
  showName,
  scanToCheck,
  x,
  y,
  l,
}) => {
  const { qr, lines } = labelParts(r, showName, scanToCheck, x, y, l);
  return (
    <g data-label={r.id}>
      <QRCodeSVG
        value={qr.value}
        x={qr.x}
        y={qr.y}
        size={qr.size}
        level={QR_LEVEL}
        marginSize={QR_MARGIN}
        bgColor="#fff"
        fgColor={INK}
      />
      {lines.map((li, i) => (
        <text
          key={i}
          x={li.x}
          y={li.y}
          fontSize={li.size}
          fontFamily={LABEL_FONTS[li.font]}
          fontWeight={li.weight}
          fill={INK}
          textLength={li.text.length * li.size * 0.6 > li.room ? li.room : undefined}
          lengthAdjust="spacingAndGlyphs"
        >
          {li.text}
        </text>
      ))}
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
