// The wordmark on the app's pages: the plant-tag mark and "VeilCore", drawn exactly as in
// the public pages' navigation (site.css .brand), so the app and the landing page read as
// one product. It replaced a glowing dot and a tracked-out "VEILCORE" (15 October 2026).
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box } from '@mui/material';
import { TagMark } from './site/TagMark';
import { NOTARY, INK_COLOR } from '../config/theme';

export const Wordmark: React.FC = () => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '9px',
      fontSize: 22,
      fontWeight: 800,
      letterSpacing: '-0.015em',
      lineHeight: 1,
      color: INK_COLOR,
      // A Graphite tag, its stub stamped in notary blue (TagMark).
      '& svg': { color: INK_COLOR, '--tm-stub': NOTARY },
    }}
  >
    <TagMark />
    VeilCore
  </Box>
);
