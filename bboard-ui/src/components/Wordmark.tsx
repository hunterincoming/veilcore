// The wordmark on the app's pages: the plant-tag mark and "VeilCore" set in Caslon, drawn
// exactly as in the public pages' navigation (site.css .brand), so the app and the landing
// page read as one product. It replaced a glowing dot and a tracked-out "VEILCORE"
// (15 October 2026).
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box } from '@mui/material';
import { TagMark } from './site/TagMark';
import { DISPLAY_FONT, INK_COLOR, POLLEN } from '../config/theme';

export const Wordmark: React.FC = () => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '9px',
      fontFamily: DISPLAY_FONT,
      fontSize: 23,
      fontWeight: 700,
      letterSpacing: '-0.01em',
      lineHeight: 1,
      color: INK_COLOR,
      // An ink tag, its stub in pollen gold edged in ink (TagMark).
      '& svg': { color: INK_COLOR, '--tm-stub': POLLEN, '--tm-edge': INK_COLOR },
    }}
  >
    <TagMark />
    VeilCore
  </Box>
);
