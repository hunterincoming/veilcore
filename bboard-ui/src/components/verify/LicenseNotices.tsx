// On a record's public check page: what its holder says about royalties on licenses from it
// (veilcore/license-notices.ts). Only "a royalty statement is overdue since <date>" and "a
// license from this record was revoked on <date> for non-payment": never an amount, a term, a
// period, a name or which license. Said as the holder's word, because it is.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Alert, Paper, Stack, Typography } from '@mui/material';
import { noticesOf } from '../../veilcore/license-notices';
import { dateWords } from '../../veilcore/royalty-terms';
import { useT } from '../../i18n/app';

export const LicenseNotices: React.FC<{ verify: unknown }> = ({ verify }) => {
  const tr = useT();
  const notices = noticesOf(verify);
  if (notices.length === 0) return null;
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2.25, md: 3 }, mt: 3 }} data-license-notices="">
      <Stack spacing={1.25}>
        <Typography variant="h6" component="h2">
          {tr.t('app.rpay.pub.title')}
        </Typography>
        {notices.map((n) => (
          <Alert key={n.ref} severity="warning" variant="outlined" data-license-notice={n.kind}>
            {n.kind === 'overdue'
              ? tr.t('app.rpay.pub.overdue', { date: dateWords(n.since, tr) })
              : tr.t('app.rpay.pub.revoked', { date: dateWords(n.on, tr) })}
          </Alert>
        ))}
        <Typography variant="body2" color="text.secondary">
          {tr.t('app.rpay.pub.who')}
        </Typography>
      </Stack>
    </Paper>
  );
};
