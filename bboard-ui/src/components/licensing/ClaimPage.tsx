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
import { InEnglishPage } from '../../i18n/app';
import { LanguageBar } from '../../i18n/LanguagePicker';

const short = (h: string) => (h.slice(0, 16).match(/..../g) ?? []).join(' ');

const Frame: React.FC<React.PropsWithChildren> = ({ children }) => (
  <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 7 } }}>
      <LanguageBar />
      <InEnglishPage />
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
        <Typography>This site can&apos;t record claims. Open the link on the site it was made on.</Typography>
      </Frame>
    );
  if (!claim)
    return (
      <Frame>
        <Alert severity="warning" variant="outlined">
          This claim link is incomplete. Open it again exactly as you got it, including everything after the #.
        </Alert>
      </Frame>
    );

  const answer = (accept: boolean) =>
    call.run(async (progress) => {
      if (!mine) throw new Error('This device doesn’t hold the record.');
      if ((await claimStatusNow(claim)) !== 'proposed')
        throw new Error('The claim is no longer waiting. Nothing was sent.');
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
        {status === 'in-force' ? 'A claim is in force on your record' : 'A claim on your record'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        From: <b>{claim.name}</b> (their words; check who they are as you would for any loan) · their on-chain key{' '}
        <span style={{ fontFamily: 'monospace' }}>{short(claim.claimant)}</span>
      </Typography>

      {!mine && (
        <Stack spacing={1.25}>
          <Typography variant="body2">
            This device doesn&apos;t hold the record this claim is on (key{' '}
            <span style={{ fontFamily: 'monospace' }}>{short(claim.record)}</span>). Open the link on the device that
            holds it, or restore your backup here first.
          </Typography>
          <Button variant="outlined" component={RouterLink} to="/restore" sx={{ alignSelf: 'flex-start' }}>
            Restore a backup
          </Button>
        </Stack>
      )}

      {mine && status === 'loading' && !readError && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <CircularProgress size={20} />
          <Typography>Reading the claim on Midnight…</Typography>
        </Stack>
      )}

      {mine && status === 'none' && (
        <Alert severity="info" variant="outlined">
          Midnight shows no claim like this waiting on <b>{record ? recordTitle(record) : mine.recordId}</b>: it was
          withdrawn, rejected, or never made. Nothing to do.
        </Alert>
      )}

      {mine && status === 'proposed' && (
        <Stack spacing={1.5}>
          <Typography variant="body1">
            <b>{claim.name}</b> asks to record a claim on <b>{record ? recordTitle(record) : mine.recordId}</b> (checked
            on Midnight).
          </Typography>
          <Typography variant="body2">
            If you accept, anyone who checks this record sees a claim is in force, until {claim.name} releases it. Only
            they can. It doesn&apos;t move the record or stop you using it.
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Button variant="contained" size="large" disabled={call.busy} onClick={() => void answer(true)}>
              Accept the claim
            </Button>
            <ConfirmInline
              label="Reject it"
              question={`Reject ${claim.name}’s claim? It is cleared from Midnight. They can ask again.`}
              confirmLabel="Yes, reject it"
              disabled={call.busy}
              onConfirm={() => void answer(false)}
            />
          </Stack>
          <HowItWorks>
            Lenders use a claim to show a record is pledged to them, so it can&apos;t quietly be pledged twice. It is
            not a legal filing: a lender still files its own paperwork. The terms stay between you; Midnight shows only
            that a claim exists and who can release it. VeilCore pays the network fee.
          </HowItWorks>
        </Stack>
      )}

      {mine && status === 'in-force' && (
        <Alert severity="success" variant="outlined" data-claim="in-force">
          In force on Midnight. Only {claim.name} can release it. Anyone checking{' '}
          {record ? recordTitle(record) : 'this record'} sees a claim is in force.
        </Alert>
      )}

      {readError && (
        <Alert severity="error" variant="outlined" sx={{ mt: 2 }}>
          Couldn&apos;t read Midnight just now: {readError}
        </Alert>
      )}
      <Box sx={{ mt: 1.5 }}>
        <ChainStatusLine busy={call.busy} progress={call.progress} error={call.error} step="agreement" />
      </Box>
    </Frame>
  );
};
