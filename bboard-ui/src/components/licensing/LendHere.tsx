// On a record's check page: a lender can record a claim on this record (LenderPage), starting
// from the on-chain key the holder's own check link carries. The holder still accepts it from
// their own device; this only saves the lender copying the key across.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { chainNotReady } from '../../veilcore/chain/config';
import { useT } from '../../i18n/app';

export const LendHere: React.FC<{ identity: string; recordId?: string }> = ({ identity: raw, recordId }) => {
  const tr = useT();
  const identity = raw.trim().toLowerCase();
  if (chainNotReady() || !/^[0-9a-f]{64}$/.test(identity)) return null;
  const q = new URLSearchParams({ r: identity, ...(recordId ? { id: recordId } : {}) });
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2.25, md: 3 }, mt: 3 }} data-lend-here="">
      <Stack spacing={1.5}>
        <Box>
          <Typography variant="h6" component="h2">
            {tr.t('app.lic.lend.fromCheck.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {tr.t('app.lic.lend.fromCheck.text')}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          component={RouterLink}
          to={`/lender#${q.toString()}`}
          sx={{ alignSelf: 'flex-start' }}
        >
          {tr.t('app.lic.lend.fromCheck.button')}
        </Button>
      </Stack>
    </Paper>
  );
};
