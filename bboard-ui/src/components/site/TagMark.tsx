// VeilCore's mark: a thin ring with a V, from the founders' first logo, redrawn in the
// site's colours. An ink disc, a paper ring, a pollen V: it reads the same on the paper
// pages and on the ink band and footer, so it carries its own colours wherever it sits. The
// same mark heads the public pages and the app (AppHeader), and public/favicon.svg and
// public/icon.png are this drawing. (The component keeps its old name, TagMark, so every
// place that shows the mark changed with this one file.)
// SPDX-License-Identifier: Apache-2.0

import React from 'react';

/** The colours, fixed: the mark is a badge, not a glyph that takes the text colour. */
export const MARK = { disc: '#16181D', ring: '#F6F3EC', arrow: '#F6DA3C' } as const;

/** The drawing, as SVG markup, for public/favicon.svg and the icon renders (scripts/make-icons.mjs). */
export const MARK_SVG_INNER =
  `<circle cx="12" cy="12" r="12" fill="${MARK.disc}"/>` +
  `<circle cx="12" cy="12" r="8.6" fill="none" stroke="${MARK.ring}" stroke-width="1.1"/>` +
  `<path d="M7.9 9.1 12 15.2l4.1-6.1" fill="none" stroke="${MARK.arrow}" stroke-width="2.3" stroke-linejoin="miter" stroke-linecap="butt"/>`;

export const TagMark: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    style={{ flex: 'none', display: 'block' }}
  >
    {/* The same drawing as MARK_SVG_INNER, as elements (the site's policy forbids setting markup). */}
    <circle cx="12" cy="12" r="12" fill={MARK.disc} />
    <circle cx="12" cy="12" r="8.6" fill="none" stroke={MARK.ring} strokeWidth="1.1" />
    <path
      d="M7.9 9.1 12 15.2l4.1-6.1"
      fill="none"
      stroke={MARK.arrow}
      strokeWidth="2.3"
      strokeLinejoin="miter"
      strokeLinecap="butt"
    />
  </svg>
);
