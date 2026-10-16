// VeilCore's mark: a tag with its eyelet, the plant tag or the ear tag a record already is.
// VeilCore gives that tag a date nobody can change, so the tag's tear-off stub (the part
// that goes on Midnight) is stamped: it takes --tm-stub, the stamp red, and the tag body
// takes the text colour. The same mark heads the public pages and the app (AppHeader), so
// they read as one product. public/favicon.svg is this drawing.
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
  </svg>
);
