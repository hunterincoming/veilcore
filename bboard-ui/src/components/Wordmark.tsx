// The wordmark on every page: the v2 mark (TagMark) and "VeilCore" in Archivo at weight 600, as
// the v2 logo sets it (21 November 2026). Archivo is self-hosted and OFL (src/fonts.css,
// public/fonts). It replaced the Caslon wordmark beside the old tag.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box } from '@mui/material';
import { TagMark } from './site/TagMark';
import { FONT } from '../config/theme';
import { color, night } from '../config/tokens';

/** The wordmark's face: Archivo, then the app's own sans. */
export const WORDMARK_FONT = `"VeilCore Archivo", ${FONT}`;

/** `tone`: 'dark' on a dark ground (the home page's header): the word turns light; the gold is one. */
export const Wordmark: React.FC<{ tone?: 'light' | 'dark' }> = ({ tone = 'light' }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      fontFamily: WORDMARK_FONT,
      fontSize: 20,
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1,
      color: tone === 'dark' ? night.text : color.text,
    }}
  >
    <TagMark tone={tone} />
    VeilCore
  </Box>
);
