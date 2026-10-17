// "Copy details for support", wherever something fails: one click copies a short note
// (veilcore/support-details.ts: the release, the network, the time, the step, the first
// sentence of the error, the browser, and nothing secret or typed), with a link to email it.
// Where the browser won't copy, the note is shown to select by hand.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Box, Button, Link, Stack, Typography } from '@mui/material';
import CopyIcon from '@mui/icons-material/ContentCopyOutlined';
import { useT } from '../i18n/app';
import { SUPPORT_EMAIL, supportMailto, supportTextNow, type SupportStep } from '../veilcore/support-details';

export const SupportDetails: React.FC<{ step: SupportStep; error?: string }> = ({ step, error }) => {
  const { t } = useT();
  const [state, setState] = useState<
    { kind: 'idle' } | { kind: 'copied'; text: string } | { kind: 'shown'; text: string }
  >({ kind: 'idle' });
  const copy = async () => {
    const text = await supportTextNow(step, error);
    try {
      await navigator.clipboard.writeText(text);
      setState({ kind: 'copied', text });
    } catch {
      setState({ kind: 'shown', text });
    }
  };
  const text = state.kind === 'idle' ? undefined : state.text;
  return (
    <Stack spacing={0.5} data-support-details={step}>
      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Button
          variant="text"
          size="small"
          color="inherit"
          startIcon={<CopyIcon fontSize="small" />}
          onClick={() => void copy()}
          sx={{ minHeight: 40, textTransform: 'none' }}
        >
          {state.kind === 'copied' ? t('app.support.copied') : t('app.support.copy')}
        </Button>
        {text && (
          <Link href={supportMailto(text, step)} variant="body2" sx={{ overflowWrap: 'anywhere' }}>
            {t('app.support.email', { email: SUPPORT_EMAIL })}
          </Link>
        )}
      </Stack>
      {state.kind === 'shown' && (
        <>
          <Typography variant="caption" color="text.secondary">
            {t('app.support.selectIt')}
          </Typography>
          <Box
            component="pre"
            data-support-text=""
            sx={{ m: 0, p: 1, fontSize: 12, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', bgcolor: 'action.hover' }}
          >
            {state.text}
          </Box>
        </>
      )}
    </Stack>
  );
};
