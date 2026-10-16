// The progress line under a real call, and its error. Says what is happening, in order:
// preparing, proving on this device, the sponsor paying the fee, waiting for the network.
// The error is shown in plain words (chainProblem); the raw error stays on the element's
// data-error attribute for test scripts and support, not on screen.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Alert, CircularProgress, Stack, Typography } from '@mui/material';
import { chainProblem } from '../flow/log-flow-state';
import { useT } from '../../i18n/app';
import { progressWords } from './progress-words';

export const ChainStatusLine: React.FC<{ busy: boolean; progress?: string; error?: string }> = ({
  busy,
  progress,
  error,
}) => {
  const tr = useT();
  return (
    <>
      {busy && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }} role="status" aria-live="polite">
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            {progressWords(progress, tr) ?? tr.t('app.chain.working')}
          </Typography>
        </Stack>
      )}
      {error && (
        <Alert severity="error" variant="outlined" data-error={error}>
          {chainProblem(error, tr).text}
        </Alert>
      )}
    </>
  );
};

/** Transaction details, shown in full: Midnight's explorers have no per-transaction link. */
export const TxLine: React.FC<{ label: string; txHash: string; blockHeight: number }> = ({
  label,
  txHash,
  blockHeight,
}) => {
  const { t } = useT();
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: 'block', wordBreak: 'break-all', fontFamily: 'monospace' }}
    >
      {t('app.chain.txLine', { label, tx: txHash, block: String(blockHeight) })}
    </Typography>
  );
};
