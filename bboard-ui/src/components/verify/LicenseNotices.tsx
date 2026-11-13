// On a record's public check page: what its holder says about royalties on licenses from it
// (veilcore/license-notices.ts), worded as their claim, with what VeilCore's registry checked
// itself (the day it received their notice of breach, and that the time to pay ran out by its own
// clock before a "revoked for non-payment" line was accepted) and the licensee's own answers beside
// it, which the holder can't remove. Never an amount, a term, a period, a name or which license.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Alert, Paper, Stack, Typography } from '@mui/material';
import { noticesOf } from '../../veilcore/license-notices';
import { CURE_DAYS } from '../../veilcore/royalty-ledger';
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
            {n.breachNoticeOn && (
              <Typography variant="body2" sx={{ mt: 0.5 }} data-license-notice-breach={n.breachNoticeOn}>
                {n.kind === 'overdue'
                  ? tr.t('app.rpay.pub.breach', { date: dateWords(n.breachNoticeOn, tr) })
                  : tr.t('app.rpay.pub.revokedChecked', { date: dateWords(n.breachNoticeOn, tr), days: CURE_DAYS })}
              </Typography>
            )}
            {(n.answers ?? []).map((a) => (
              <Typography
                key={a.type}
                variant="body2"
                sx={{ mt: 0.5, fontWeight: 600 }}
                data-license-notice-answer={a.type}
                data-on={a.on}
              >
                {tr.t(a.type === 'paid' ? 'app.rpay.pub.answerPaid' : 'app.rpay.pub.disputed', {
                  date: dateWords(a.on, tr),
                })}
              </Typography>
            ))}
          </Alert>
        ))}
        <Typography variant="body2" color="text.secondary">
          {tr.t('app.rpay.pub.who')}
        </Typography>
      </Stack>
    </Paper>
  );
};
