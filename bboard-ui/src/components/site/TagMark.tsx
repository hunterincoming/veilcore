// VeilCore's mark: a plant tag with its eyelet. The record a breeder keeps is the tag on the
// plant; VeilCore gives that tag a date nobody can change. The same mark heads the public
// pages and the app (AppHeader), so they read as one product.
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
      d="M4 0h6l4 4v14H0V4zM7 3.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z"
    />
  </svg>
);
