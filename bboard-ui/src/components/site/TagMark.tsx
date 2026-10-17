// VeilCore's mark: a tag with its eyelet, the plant tag or the ear tag a record already is.
// VeilCore gives that tag a date nobody can change, so the tag's tear-off stub (the part
// that goes on Midnight) is pollen gold: it takes --tm-stub, and the tag body takes the text
// colour. On paper the gold stub is edged in ink (--tm-edge), because gold alone is too pale
// to hold its shape on a light ground; on the ink band and footer it needs no edge. The same
// mark heads the public pages and the app (AppHeader), so they read as one product.
// public/favicon.svg is this drawing.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';

export const TagMark: React.FC<{ size?: number; className?: string }> = ({ size = 18, className }) => (
  <svg
    className={className}
    width={(size * 14) / 18}
    height={size}
    viewBox="0 0 14 18"
    aria-hidden="true"
    focusable="false"
    style={{ flex: 'none', display: 'block' }}
  >
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M4 0h6l4 4v8.6H0V4zM7 3.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z"
    />
    <path style={{ fill: 'var(--tm-stub, currentColor)' }} d="M0 13.9h14V18H0z" />
    <path style={{ fill: 'none', stroke: 'var(--tm-edge, transparent)', strokeWidth: 1.2 }} d="M.6 14.5h12.8v2.9H.6z" />
  </svg>
);
