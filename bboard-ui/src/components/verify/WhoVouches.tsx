// The box at the top of a check page: what each fact rests on (who-vouches.ts says what
// each row may claim). Plain text rows; the mark beside each is decoration, the words carry it.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import DrawOutlinedIcon from '@mui/icons-material/DrawOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import { useT } from '../../i18n/app';
import type { Basis, WhoRow } from './who-vouches';

const MARK: Record<Basis, React.ElementType> = {
  checked: CheckCircleOutlineIcon,
  signed: DrawOutlinedIcon,
  registry: StorageOutlinedIcon,
  explorer: PublicOutlinedIcon,
  holder: ChatBubbleOutlineIcon,
  none: RemoveCircleOutlineIcon,
};

/** `after`: something to show under a row, by its id (the Bitcoin row's check button). */
export const WhoVouches: React.FC<{
  rows: readonly WhoRow[];
  after?: Readonly<Partial<Record<NonNullable<WhoRow['id']>, React.ReactNode>>>;
}> = ({ rows, after }) => {
  const { t } = useT();
  return (
    <Box
      component="section"
      aria-labelledby="who-vouches-title"
      data-who-vouches=""
      sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: { xs: 1.5, sm: 2 }, mb: 2.5 }}
    >
      <Typography id="who-vouches-title" variant="subtitle2" component="h2" sx={{ mb: 1 }}>
        {t('app.verify.who.title')}
      </Typography>
      <Box component="dl" sx={{ m: 0, display: 'grid', gap: 1 }}>
        {rows.map((r) => {
          const Mark = MARK[r.basis];
          // A dl may group each dt and dd in a div (HTML); the mark sits inside the dt.
          return (
            <Box key={r.fact} data-who-row={r.basis} data-who-id={r.id}>
              <Typography
                component="dt"
                variant="body2"
                sx={{ fontWeight: 600, display: 'flex', gap: 1, alignItems: 'center' }}
              >
                <Mark aria-hidden="true" sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
                {r.fact}
              </Typography>
              <Typography
                component="dd"
                variant="body2"
                color="text.secondary"
                sx={{ m: 0, pl: 3.25, overflowWrap: 'anywhere' }}
              >
                {r.who}
              </Typography>
              {r.id && after?.[r.id] && <Box sx={{ pl: 3.25, mt: 0.75 }}>{after[r.id]}</Box>}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
