// VeilCore's mark, the v2 logo from Mako's set (21 November 2026, "3 Logos/veilcore-logo-v2.svg"):
// a solid gold stroke for the left of the V, and the right side lifting away in seven thinner,
// lighter lines, all inside the V's outline. His geometry, unchanged (viewBox 258 208 282 244),
// in his one gold, #A67C00: 3.8:1 on white and 5.0:1 on the home page's night, both above the
// 3:1 a graphic needs. The same mark heads the public pages and the app (Wordmark, AppFooter);
// public/favicon.svg is the simple V from the same set, and public/icon.png that V drawn at
// 512 px. (The component keeps its old name, TagMark, so every place that shows the mark changed
// with this one file.)
// SPDX-License-Identifier: Apache-2.0

import React, { useId } from 'react';

/** The logo's gold, on paper and on a dark ground alike (Mako, 21 Nov: "all yellow is one colour"). */
export const MARK_GOLD = '#A67C00';
/** The same gold on a dark ground (the footer, the home page's header): one colour now. */
export const MARK_GOLD_ON_DARK = '#A67C00';

/** The V's outline: the right side's lines are clipped to it. */
const V = '262,212 333,212 398.5,337.7 464,212 535,212 412,448 385,448';
/** The left stroke of the V. */
const LEFT = '262,212 333,212 412.0,363.6 412,448 385,448';
/** The right side, as lines: x, width, opacity (each from y 212, 236 tall, then clipped). */
const BARS: readonly (readonly [number, number, number])[] = [
  [419.0, 14.0, 1.0],
  [438.5, 11.2, 0.93],
  [456.4, 9.0, 0.85],
  [473.1, 7.2, 0.78],
  [489.2, 5.7, 0.7],
  [505.1, 4.6, 0.62],
  [520.9, 3.7, 0.55],
];

/** `size` is the mark's height; it is a little wider than tall. `tone` is kept for callers; the gold is one. */
export const TagMark: React.FC<{ size?: number; className?: string; tone?: 'light' | 'dark' }> = ({
  size = 26,
  className,
  tone = 'light',
}) => {
  // Several marks on one page (header and footer): each needs its own clip id.
  const clip = `vcm${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const gold = tone === 'dark' ? MARK_GOLD_ON_DARK : MARK_GOLD;
  return (
    <svg
      className={className}
      width={Math.round((size * 282) / 244)}
      height={size}
      viewBox="258 208 282 244"
      aria-hidden="true"
      focusable="false"
      style={{ flex: 'none', display: 'block' }}
    >
      <clipPath id={clip}>
        <polygon points={V} />
      </clipPath>
      <polygon points={LEFT} fill={gold} />
      <g fill={gold} clipPath={`url(#${clip})`}>
        {BARS.map(([x, w, o]) => (
          <rect key={x} x={x} y={212} width={w} height={236} opacity={o} />
        ))}
      </g>
    </svg>
  );
};
