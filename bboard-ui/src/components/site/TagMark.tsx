// VeilCore's mark, from Mako's logo (18 November 2026): a solid gold stroke for the left of the V,
// and the right side lifting away in thinner, lighter lines. Redrawn as vectors from his
// artwork, in a darker gold (#B8860B, 3.2:1 on white) so it reads on the paper pages as well as
// on the ink band. The same mark heads the public pages and the app (Wordmark, AppFooter);
// public/favicon.svg is the simple V from the same set, and public/icon.png this drawing.
// (The component keeps its old name, TagMark, so every place that shows the mark changed with
// this one file.)
// SPDX-License-Identifier: Apache-2.0

import React from 'react';

export const MARK_GOLD = '#B8860B';
/**
 * The same gold on a dark ground (the footer, the home page's header): the site's one accent
 * there (home.css --yellow), 7.5:1 on the home page's night and 6.9:1 on the footer's ink; a brass gold, CIEDE2000 6.5 from
 * #B8860B so the two read as one family, and 10 or more from Binance's and IMDb's yellows.
 * The darker #B8860B is for paper, where it reads at 3.2:1 on white.
 */
export const MARK_GOLD_ON_DARK = '#C99A3A';

/** The left stroke of the V. */
const LEFT = 'M4 10 H30 L52 92 H40 Z';
/** The right side, as lines: x, y, width, height, opacity (viewBox 0 0 88 100). */
const BARS: readonly (readonly [number, number, number, number, number])[] = [
  [44.0, 77.12, 5.0, 14.88, 1.0],
  [50.5, 66.1, 4.6, 25.9, 0.92],
  [56.6, 55.86, 4.1, 36.14, 0.83],
  [62.3, 46.33, 3.6, 41.4, 0.74],
  [67.6, 37.49, 3.1, 39.2, 0.66],
  [72.5, 29.35, 2.6, 37.0, 0.57],
  [77.0, 21.91, 2.1, 34.8, 0.49],
  [81.1, 15.09, 1.7, 32.6, 0.4],
];

/** `size` is the mark's height; it is a little narrower than tall. */
export const TagMark: React.FC<{ size?: number; className?: string; tone?: 'light' | 'dark' }> = ({
  size = 30,
  className,
  tone = 'light',
}) => {
  const gold = tone === 'dark' ? MARK_GOLD_ON_DARK : MARK_GOLD;
  return (
    <svg
      className={className}
      width={Math.round(size * 0.88)}
      height={size}
      viewBox="0 0 88 100"
      aria-hidden="true"
      focusable="false"
      style={{ flex: 'none', display: 'block' }}
    >
      <path d={LEFT} fill={gold} />
      {BARS.map(([x, y, w, h, o]) => (
        <rect key={x} x={x} y={y} width={w} height={h} fill={gold} fillOpacity={o} />
      ))}
    </svg>
  );
};
