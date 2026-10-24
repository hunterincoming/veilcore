// /lender — a lender records a claim on a holder's record from the browser (veilcore/lender.ts):
// its own key on Midnight, a claim proposed on the record, the link the holder accepts it from
// (/claim), and later a withdrawal or a release. Arriving from a record's check page, the link
// carries the record's on-chain key (#r=…&id=…). Nothing here is believed by the holder's page:
// it reads the chain for exactly that claim. VeilCore pays the network fee.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import { canonicalUrl } from '../../config/network';
import { AGREEMENTS_ON_CHAIN } from '../../config/copy';
import { chainNotReady } from '../../veilcore/chain/config';
import { claimPath, claimStatusNow, type ClaimStatus } from '../../veilcore/claims';
import {
  makeLender,
  startClaim,
  updateClaim,
  updateLender,
  useLender,
  type Lender,
  type LenderClaim,
} from '../../veilcore/lender';
import { useChainCall } from '../chain/useChainCall';
import { ChainStatusLine } from '../chain/ChainStatusLine';
import type { ChainReceipt } from '../../veilcore/chain/actions';
import { ConfirmInline, HowItWorks } from './DealSteps';
import { backupReturnTo } from '../flow/backup-return';
import { Wordmark } from '../Wordmark';
import { useT } from '../../i18n/app';
import { LanguageBar } from '../../i18n/LanguagePicker';

const HEX64 = /^[0-9a-f]{64}$/;
const short = (h: string) => (h.slice(0, 16).match(/..../g) ?? []).join(' ');
const bytes = (h: string) => Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));

/** A record's on-chain key from what a lender pastes: the key itself, or a check link carrying it (#chain=…). */
export const recordKeyFrom = (text: string): string | undefined => {
  const t = text.trim().toLowerCase();
  const fromLink = /[#&?]chain=([0-9a-f]{64})(?![0-9a-f])/.exec(t)?.[1];
  if (fromLink) return fromLink;
  const bare = t.replace(/\s+/g, '');
  return HEX64.test(bare) ? bare : undefined;
};

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

const SaveBackup: React.FC<{ text: string }> = ({ text }) => {
  const tr = useT();
  return (
    <Stack spacing={1.25}>
      <Typography variant="body2">{text}</Typography>
      <Button
        component={RouterLink}
        to="/backup"
        onClick={() => backupReturnTo(window.location.pathname + window.location.hash)}
        variant="contained"
        sx={{ alignSelf: 'flex-start' }}
      >
        {tr.t('app.lic.real.saveBackup')}
      </Button>
    </Stack>
  );
};

/** One claim: its state on chain, and what the lender can do with it now. */
const ClaimRow: React.FC<{ l: Lender; c: LenderClaim; busy: boolean; run: Run; onToast: (m: string) => void }> = ({
  l,
  c,
  busy,
  run,
  onToast,
}) => {
  const tr = useT();
  const [status, setStatus] = useState<ClaimStatus | 'loading'>('loading');
  const backedUp = !!l.backedUpAt && l.backedUpAt >= c.createdAt;

  useEffect(() => {
    if (!c.proposeTx) {
      setStatus('none');
      return;
    }
    let on = true;
    const read = () =>
      void claimStatusNow({ record: c.record, claim: c.claim, claimant: l.identity })
        .then((s) => on && setStatus(s))
        .catch(() => undefined);
    read();
    const t = setInterval(read, 15_000);
    return () => {
      on = false;
      clearInterval(t);
    };
  }, [c.proposeTx, c.record, c.claim, l.identity, c.withdrawTx, c.releaseTx]);

  const link = canonicalUrl(claimPath({ record: c.record, claim: c.claim, claimant: l.identity, name: l.name }));
  const copy = async () => {
    await navigator.clipboard.writeText(link);
    onToast(tr.t('app.lic.detail.copied'));
  };

  const propose = () =>
    run(async (progress) => {
      const { proposeObligationOnChain } = await import('../../veilcore/chain/actions');
      const r = await proposeObligationOnChain(bytes(l.secret), c.record, c.claim, { progress });
      updateClaim(c.claim, (x) => ({ ...x, proposeTx: r.txId }));
      setStatus('proposed');
      return r;
    });
  const withdraw = () =>
    run(async (progress) => {
      if ((await claimStatusNow({ record: c.record, claim: c.claim, claimant: l.identity })) !== 'proposed')
        throw new Error(tr.t('app.lic.lend.notWaiting'));
      const { withdrawObligationOnChain } = await import('../../veilcore/chain/actions');
      const r = await withdrawObligationOnChain(bytes(l.secret), c.record, c.claim, { progress });
      updateClaim(c.claim, (x) => ({ ...x, withdrawTx: r.txId }));
      setStatus('none');
      return r;
    });
  const release = () =>
    run(async (progress) => {
      if ((await claimStatusNow({ record: c.record, claim: c.claim, claimant: l.identity })) !== 'in-force')
        throw new Error(tr.t('app.lic.lend.notInForce'));
      const { dischargeOnChain } = await import('../../veilcore/chain/actions');
      const r = await dischargeOnChain(bytes(l.secret), c.record, c.claim, { progress });
      updateClaim(c.claim, (x) => ({ ...x, releaseTx: r.txId }));
      setStatus('none');
      return r;
    });

  const ended = c.withdrawTx ? 'withdrawn' : c.releaseTx ? 'released' : undefined;

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-lender-claim={c.claim}>
      <Typography variant="subtitle2">{c.words}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {tr.t('app.lic.lend.onRecord', {
          record: c.recordId ?? short(c.record),
        })}
      </Typography>

      {!c.proposeTx && !backedUp && <SaveBackup text={tr.t('app.lic.lend.backupClaim')} />}
      {!c.proposeTx && backedUp && (
        <Stack spacing={1}>
          <Typography variant="body2">{tr.t('app.lic.lend.readyToSend')}</Typography>
          <Button variant="contained" disabled={busy} onClick={() => void propose()} sx={{ alignSelf: 'flex-start' }}>
            {tr.t('app.lic.lend.send')}
          </Button>
        </Stack>
      )}

      {c.proposeTx && status === 'loading' && <Typography variant="body2">{tr.t('app.lic.claim.reading')}</Typography>}
      {c.proposeTx && status === 'proposed' && (
        <Stack spacing={1.25}>
          <Typography variant="body2">{tr.t('app.lic.lend.proposed')}</Typography>
          <TextField
            label={tr.t('app.lic.lend.holderLink')}
            value={link}
            size="small"
            fullWidth
            slotProps={{ input: { readOnly: true } }}
          />
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => void copy()}>
              {tr.t('app.lic.detail.copyLink')}
            </Button>
            <ConfirmInline
              label={tr.t('app.lic.lend.withdraw')}
              question={tr.t('app.lic.lend.withdrawQ')}
              confirmLabel={tr.t('app.lic.lend.withdrawYes')}
              disabled={busy}
              onConfirm={() => void withdraw()}
            />
          </Stack>
        </Stack>
      )}
      {c.proposeTx && status === 'in-force' && (
        <Stack spacing={1.25}>
          <Alert severity="success" variant="outlined" data-claim="in-force">
            {tr.t('app.lic.lend.inForce')}
          </Alert>
          <ConfirmInline
            label={tr.t('app.lic.lend.release')}
            question={tr.t('app.lic.lend.releaseQ')}
            confirmLabel={tr.t('app.lic.lend.releaseYes')}
            disabled={busy}
            onConfirm={() => void release()}
          />
        </Stack>
      )}
      {c.proposeTx && status === 'none' && (
        <Typography variant="body2" color="text.secondary">
          {ended === 'released'
            ? tr.t('app.lic.lend.released')
            : ended === 'withdrawn'
              ? tr.t('app.lic.lend.withdrawn')
              : tr.t('app.lic.lend.gone')}
        </Typography>
      )}
    </Paper>
  );
};

type Run = (f: (progress: (m: string) => void) => Promise<ChainReceipt>) => Promise<unknown>;

export const LenderPage: React.FC = () => {
  const tr = useT();
  const { hash } = useLocation();
  const l = useLender();
  const call = useChainCall<ChainReceipt>();
  const [name, setName] = useState('');
  const fromLink = new URLSearchParams(hash.replace(/^#/, ''));
  const [recordText, setRecordText] = useState(fromLink.get('r') ?? '');
  const recordId = (fromLink.get('id') ?? '').slice(0, 40) || undefined;
  const [words, setWords] = useState('');
  const [error, setError] = useState<string>();
  const [toast, setToast] = useState<string>();
  const run: Run = (f) => call.run(f);

  if (!AGREEMENTS_ON_CHAIN || chainNotReady())
    return (
      <Frame>
        <Typography>{tr.t('app.lic.claim.cant')}</Typography>
      </Frame>
    );

  const make = async () => {
    setError(undefined);
    try {
      const { identityOf } = await import('../../veilcore/chain/identity');
      makeLender(name, identityOf);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const anchor = () =>
    call.run(async (progress) => {
      if (!l) throw new Error('No lender identity in this browser.');
      const { anchorOnChain } = await import('../../veilcore/chain/actions');
      const r = await anchorOnChain(bytes(l.secret), bytes(l.recoverySecret), { progress });
      updateLender((x) => ({ ...x, anchorTx: r.txId, anchoredAt: r.blockTime ?? Date.now() }));
      return r;
    });

  const newClaim = async () => {
    setError(undefined);
    const record = recordKeyFrom(recordText);
    if (!record) {
      setError(tr.t('app.lic.lend.badRecord'));
      return;
    }
    if (record === l?.identity) {
      setError(tr.t('app.lic.lend.ownRecord'));
      return;
    }
    try {
      await startClaim(record, words, recordId);
      setWords('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Frame>
      <Typography variant="h5" component="h1" sx={{ mb: 1 }}>
        {tr.t('app.lic.lend.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        {tr.t('app.lic.lend.intro')}
      </Typography>

      {!l && (
        <Stack spacing={1.5}>
          <TextField
            label={tr.t('app.lic.lend.name')}
            helperText={tr.t('app.lic.lend.nameHelp')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 80 } }}
          />
          <Button
            variant="contained"
            disabled={!name.trim()}
            onClick={() => void make()}
            sx={{ alignSelf: 'flex-start' }}
          >
            {tr.t('app.lic.lend.make')}
          </Button>
          <HowItWorks>{tr.t('app.lic.claim.how')}</HowItWorks>
        </Stack>
      )}

      {l && !l.anchorTx && !l.backedUpAt && <SaveBackup text={tr.t('app.lic.lend.backupKey')} />}

      {l && !l.anchorTx && l.backedUpAt && (
        <Stack spacing={1.25}>
          <Typography variant="body2">{tr.t('app.lic.lend.anchorWhy', { name: l.name })}</Typography>
          <Button
            variant="contained"
            disabled={call.busy}
            onClick={() => void anchor()}
            sx={{ alignSelf: 'flex-start' }}
          >
            {tr.t('app.lic.lend.anchor')}
          </Button>
        </Stack>
      )}

      {l && l.anchorTx && (
        <Stack spacing={2.5}>
          <Typography variant="body2" data-lender-key="">
            {tr.t('app.lic.lend.yourKey', { name: l.name })}{' '}
            <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{l.identity}</span>
          </Typography>

          <Stack spacing={1.5}>
            <Typography variant="subtitle1" component="h2">
              {tr.t('app.lic.lend.newTitle')}
            </Typography>
            <TextField
              label={tr.t('app.lic.lend.record')}
              helperText={
                recordId ? tr.t('app.lic.lend.recordFromCheck', { id: recordId }) : tr.t('app.lic.lend.recordHelp')
              }
              value={recordText}
              onChange={(e) => setRecordText(e.target.value)}
            />
            <TextField
              label={tr.t('app.lic.lend.words')}
              helperText={tr.t('app.lic.lend.wordsHelp')}
              value={words}
              onChange={(e) => setWords(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            <Button
              variant="contained"
              disabled={!recordText.trim() || !words.trim()}
              onClick={() => void newClaim()}
              sx={{ alignSelf: 'flex-start' }}
            >
              {tr.t('app.lic.lend.start')}
            </Button>
          </Stack>

          {l.claims.length > 0 && (
            <Stack spacing={1.5}>
              <Typography variant="subtitle1" component="h2">
                {tr.t('app.lic.lend.yours')}
              </Typography>
              {l.claims.map((c) => (
                <ClaimRow key={c.claim} l={l} c={c} busy={call.busy} run={run} onToast={setToast} />
              ))}
            </Stack>
          )}
          <HowItWorks>{tr.t('app.lic.claim.how')}</HowItWorks>
        </Stack>
      )}

      {error && (
        <Alert severity="error" variant="outlined" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {toast && (
        <Alert severity="success" variant="outlined" sx={{ mt: 2 }} onClose={() => setToast(undefined)}>
          {toast}
        </Alert>
      )}
      <Box sx={{ mt: 1.5 }}>
        <ChainStatusLine busy={call.busy} progress={call.progress} error={call.error} step="agreement" />
      </Box>
    </Frame>
  );
};
