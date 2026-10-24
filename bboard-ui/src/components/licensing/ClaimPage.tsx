// /claim#r=…&o=…&b=…&n=… — the holder's side of a claim on their record (veilcore/claims.ts):
// a lender, or anyone the holder pledges the record to, asked on chain to record that claim,
// and only they will be able to release it. This page reads the chain for exactly that claim
// and lets the holder accept or reject it from the record's own key. VeilCore pays the fee.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Container, Paper, Stack, Typography } from '@mui/material';
import { claimFromHash, claimStatusNow, type ClaimStatus } from '../../veilcore/claims';
import { hexBytes, useRecordKeys } from '../../veilcore/record-keys';
import { useRecords } from '../../veilcore/records';
import { recordTitle } from '../../veilcore/animal-profile';
import { chainNotReady } from '../../veilcore/chain/config';
import { AGREEMENTS_ON_CHAIN } from '../../config/copy';
import { useChainCall } from '../chain/useChainCall';
import { ChainStatusLine } from '../chain/ChainStatusLine';
import type { ChainReceipt } from '../../veilcore/chain/actions';
import { ConfirmInline, HowItWorks } from './DealSteps';
import { Wordmark } from '../Wordmark';
import { rich, useT } from '../../i18n/app';
import { LanguageBar } from '../../i18n/LanguagePicker';

const short = (h: string) => (h.slice(0, 16).match(/..../g) ?? []).join(' ');

const Frame: React.FC<React.PropsWithChildren> = ({ children }) => (
  <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 7 } }}>
      <LanguageBar />
      <Stack direction="row" sx={{ justifyContent: 'center', mb: 3 }}>
        <Wordmark />
      </Stack>
      <Paper sx={{ p: { xs: 2.5, md: 4 } }}>{children}</Paper>
    </Container>
  </Box>
);

export const ClaimPage: React.FC = () => {
  const { hash } = useLocation();
  const claim = claimFromHash(hash);
  const tr = useT();
  const keys = useRecordKeys();
  const records = useRecords();
  const [status, setStatus] = useState<ClaimStatus | 'loading'>('loading');
  const [readError, setReadError] = useState<string>();
  const call = useChainCall<ChainReceipt>();

  const mine = claim ? Object.values(keys).find((k) => k.anchor?.identity === claim.record) : undefined;
  const record = mine ? records.find((r) => r.id === mine.recordId) : undefined;

  useEffect(() => {
    // Read from the link itself, so the effect depends on the link alone.
    const claim = claimFromHash(hash);
    if (!claim || !AGREEMENTS_ON_CHAIN || chainNotReady()) return;
    let on = true;
    const read = () =>
      void claimStatusNow(claim)
        .then((s) => on && (setStatus(s), setReadError(undefined)))
        .catch((e: unknown) => on && setReadError(e instanceof Error ? e.message : String(e)));
    read();
    const t = setInterval(read, 15_000);
    return () => {
      on = false;
      clearInterval(t);
    };
  }, [hash]);

  if (!AGREEMENTS_ON_CHAIN || chainNotReady())
    return (
      <Frame>
        <Typography>{tr.t('app.lic.claim.cant')}</Typography>
      </Frame>
    );
  if (!claim)
    return (
      <Frame>
        <Alert severity="warning" variant="outlined">
          {tr.t('app.lic.claim.partial')}
        </Alert>
      </Frame>
    );

  const answer = (accept: boolean) =>
    call.run(async (progress) => {
      if (!mine) throw new Error(tr.t('app.lic.claim.notHeld'));
      if ((await claimStatusNow(claim)) !== 'proposed') throw new Error(tr.t('app.lic.claim.notWaiting'));
      const { acceptObligationOnChain, rejectObligationOnChain } = await import('../../veilcore/chain/actions');
      const r = await (accept ? acceptObligationOnChain : rejectObligationOnChain)(
        hexBytes(mine.recordSecret),
        claim.claim,
        claim.claimant,
        { progress },
      );
      setStatus(accept ? 'in-force' : 'none');
      return r;
    });

  return (
    <Frame>
      <Typography variant="h5" component="h1" sx={{ mb: 1 }}>
        {status === 'in-force' ? tr.t('app.lic.claim.hInForce') : tr.t('app.lic.claim.h')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        {rich(
          tr.t('app.lic.claim.from'),
          { b: (c) => <b>{c}</b> },
          { name: claim.name, key: <span style={{ fontFamily: 'monospace' }}>{short(claim.claimant)}</span> },
        )}
      </Typography>

      {!mine && (
        <Stack spacing={1.25}>
          <Typography variant="body2">
            {rich(
              tr.t('app.lic.claim.noRecord'),
              {},
              {
                key: <span style={{ fontFamily: 'monospace' }}>{short(claim.record)}</span>,
              },
            )}
          </Typography>
          <Button variant="outlined" component={RouterLink} to="/restore" sx={{ alignSelf: 'flex-start' }}>
            {tr.t('app.lic.proof.restore')}
          </Button>
        </Stack>
      )}

      {mine && status === 'loading' && !readError && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <CircularProgress size={20} />
          <Typography>{tr.t('app.lic.claim.reading')}</Typography>
        </Stack>
      )}

      {mine && status === 'none' && (
        <Alert severity="info" variant="outlined">
          {rich(
            tr.t('app.lic.claim.none'),
            { b: (c) => <b>{c}</b> },
            { record: record ? recordTitle(record) : mine.recordId },
          )}
        </Alert>
      )}

      {mine && status === 'proposed' && (
        <Stack spacing={1.5}>
          <Typography variant="body1">
            {rich(
              tr.t('app.lic.claim.asks'),
              { b: (c) => <b>{c}</b> },
              { name: claim.name, record: record ? recordTitle(record) : mine.recordId },
            )}
          </Typography>
          <Typography variant="body2">{tr.t('app.lic.claim.ifAccept', { name: claim.name })}</Typography>
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Button variant="contained" size="large" disabled={call.busy} onClick={() => void answer(true)}>
              {tr.t('app.lic.claim.accept')}
            </Button>
            <ConfirmInline
              label={tr.t('app.lic.claim.reject')}
              question={tr.t('app.lic.claim.rejectQ', { name: claim.name })}
              confirmLabel={tr.t('app.lic.claim.rejectYes')}
              disabled={call.busy}
              onConfirm={() => void answer(false)}
            />
          </Stack>
          <HowItWorks>{tr.t('app.lic.claim.how')}</HowItWorks>
        </Stack>
      )}

      {mine && status === 'in-force' && (
        <Alert severity="success" variant="outlined" data-claim="in-force">
          {tr.t('app.lic.claim.inForce', {
            name: claim.name,
            record: record ? recordTitle(record) : tr.t('app.lic.claim.thisRecord'),
          })}
        </Alert>
      )}

      {readError && (
        <Alert severity="error" variant="outlined" sx={{ mt: 2 }}>
          {tr.t('app.lic.claim.readError', { error: readError })}
        </Alert>
      )}
      <Box sx={{ mt: 1.5 }}>
        <ChainStatusLine busy={call.busy} progress={call.progress} error={call.error} step="agreement" />
      </Box>
    </Frame>
  );
};
