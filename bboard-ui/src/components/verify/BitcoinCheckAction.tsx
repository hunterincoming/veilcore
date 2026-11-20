// The button under the Bitcoin row of "What each fact rests on": check the stamp in this
// browser (useBitcoinCheck.ts). Shown before a check and after one that couldn't reach the
// explorers; the note says who is asked and what they see.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useT } from '../../i18n/app';
import type { BitcoinRow } from './who-vouches';

export const BitcoinCheckAction: React.FC<{ row: BitcoinRow; run: () => void }> = ({ row, run }) => {
  const { t } = useT();
  if (row.state !== 'reported' && row.state !== 'checking' && row.state !== 'unreachable') return null;
  const busy = row.state === 'checking';
  return (
    <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
      <Button
        size="small"
        variant="outlined"
        onClick={run}
        disabled={busy}
        data-bitcoin-check=""
        startIcon={busy ? <CircularProgress size={14} color="inherit" /> : undefined}
        sx={{ minHeight: 40 }}
      >
        {t(row.state === 'unreachable' ? 'app.verify.who.btc.again' : 'app.verify.who.btc.check')}
      </Button>
      <Typography variant="caption" color="text.secondary">
        {t('app.verify.who.btc.note')}
      </Typography>
    </Stack>
  );
};
