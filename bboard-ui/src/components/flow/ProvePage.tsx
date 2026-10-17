// /prove/:id: one link, two people.
//
// The person who asked (this browser made the request) sees whether it has been answered.
// The holder (this browser holds the plant whose on-chain identity it names) sees what
// is being asked and one button. Anyone else is told plainly why there's nothing to do.
// The link carries an answer token in its fragment (#t=…, never sent to a server); the
// answer is accepted only with it, so a link missing it is caught before anything is
// put on the network.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { useLocation, useParams, Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import {
  getProveRequest,
  answerProveRequest,
  myAsk,
  tokenFromHash,
  type ProveRequest,
} from '../../veilcore/prove-relay';
import { hexBytes, useRecordKeys } from '../../veilcore/record-keys';
import { getRecord, useRecords } from '../../veilcore/records';
import { chainNotReady } from '../../veilcore/chain/config';
import { useChainCall } from '../chain/useChainCall';
import { ChainStatusLine } from '../chain/ChainStatusLine';
import { ProveWatch } from '../chain/ProveWatch';
import { FlowFrame } from './FlowFrame';
import { rich, useT } from '../../i18n/app';
import { LanguageBar } from '../../i18n/LanguagePicker';

/** This page has no app header: the language picker and the draft banner sit above its frame. */
const ProveFrame: React.FC<React.PropsWithChildren> = ({ children }) => (
  <>
    <LanguageBar />
    <FlowFrame section="prove">{children}</FlowFrame>
  </>
);

const Title: React.FC<React.PropsWithChildren> = ({ children }) => (
  <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.7rem', md: '2.1rem' }, mb: 1 }}>
    {children}
  </Typography>
);

export const ProvePage: React.FC = () => {
  const { id = '' } = useParams();
  const { hash } = useLocation();
  const token = tokenFromHash(hash);
  const mine = myAsk(id);
  const [req, setReq] = useState<ProveRequest | null | 'loading' | { error: string }>('loading');
  useRecords();
  const allKeys = useRecordKeys();
  const { t } = useT();
  const b = (c: React.ReactNode) => <b>{c}</b>;

  useEffect(() => {
    let live = true;
    void getProveRequest(id).then((r) => live && setReq(r));
    return () => {
      live = false;
    };
  }, [id]);

  // The person who asked: their own page, whatever the registry says.
  if (mine) {
    const record = mine.recordId ? getRecord(mine.recordId) : undefined;
    return (
      <ProveFrame>
        <Title>{t('app.prove.yourRequest')}</Title>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {record ? rich(t('app.prove.youAskedNamed'), { b }, { name: record.strainName }) : t('app.prove.youAsked')}
        </Typography>
        <ProveWatch ask={mine} />
        {mine.recordId && (
          <Button component={RouterLink} to={`/verify/${mine.recordId}`} sx={{ mt: 2 }}>
            {t('app.prove.openCheckPage')}
          </Button>
        )}
      </ProveFrame>
    );
  }

  if (req === 'loading') {
    return (
      <ProveFrame>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <CircularProgress size={20} />
          <Typography>{t('app.prove.opening')}</Typography>
        </Stack>
      </ProveFrame>
    );
  }
  if (req === null || 'error' in req) {
    return (
      <ProveFrame>
        <Title>{req === null ? t('app.prove.ended') : t('app.prove.cantOpen')}</Title>
        <Typography variant="body1">
          {req === null
            ? t('app.prove.expired')
            : t('app.lab.custody.line', { v: `${req.error.charAt(0).toUpperCase()}${req.error.slice(1)}` })}
        </Typography>
      </ProveFrame>
    );
  }

  const match = Object.values(allKeys).find((k) => k.anchor?.identity === req.identity);
  const record = match ? getRecord(match.recordId) : undefined;
  return (
    <ProveFrame>
      {match && !token ? (
        <>
          <Title>{t('app.prove.missingPart')}</Title>
          <Typography variant="body1">{t('app.prove.missingPartText')}</Typography>
        </>
      ) : match && token ? (
        <Answer
          req={req}
          token={token}
          recordId={match.recordId}
          name={record?.strainName}
          secret={match.recordSecret}
        />
      ) : (
        <>
          <Title>{t('app.prove.someoneWants')}</Title>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {Object.keys(allKeys).length === 0 ? t('app.prove.noPlantsHere') : t('app.prove.notThisPlant')}
          </Typography>
          <Button variant="outlined" size="large" component={RouterLink} to="/restore" sx={{ py: 1.2 }}>
            {t('app.prove.getBack')}
          </Button>
        </>
      )}
    </ProveFrame>
  );
};

const Answer: React.FC<{ req: ProveRequest; token: string; recordId: string; name?: string; secret: string }> = ({
  req,
  token,
  recordId,
  name,
  secret,
}) => {
  const call = useChainCall<{ txId: string; sent: true } | { txId: string; sent: false; why: string }>();
  const notReady = chainNotReady();
  const { t } = useT();
  const b = (c: React.ReactNode) => <b>{c}</b>;

  const prove = () =>
    call.run(async (progress) => {
      const { proveOwnershipOnChain } = await import('../../veilcore/chain/actions');
      const receipt = await proveOwnershipOnChain(hexBytes(secret), req.challenge, { progress });
      progress('Sending the answer back…'); // shown in the visitor's language (progress-words.ts)
      const posted = await answerProveRequest(req.id, receipt.txId, token);
      return 'error' in posted
        ? { txId: receipt.txId, sent: false as const, why: posted.error }
        : { txId: receipt.txId, sent: true as const };
    });

  if (call.result) {
    return call.result.sent ? (
      <>
        <Title>{t('app.prove.done')}</Title>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {t('app.prove.doneText')}
        </Typography>
        <Button variant="contained" size="large" component={RouterLink} to={`/record/${recordId}`} sx={{ py: 1.3 }}>
          {t('app.plant.next.backTo', { name: name ?? t('app.prove.thePlant') })}
        </Button>
      </>
    ) : (
      <>
        <Title>{t('app.prove.didntSend')}</Title>
        <Typography variant="body1">{t('app.prove.sendInstead', { why: call.result.why })}</Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', my: 1 }}>
          {call.result.txId}
        </Typography>
        <Button variant="outlined" onClick={() => void navigator.clipboard.writeText(call.result?.txId ?? '')}>
          {t('app.prove.copy')}
        </Button>
      </>
    );
  }

  return (
    <Stack spacing={2}>
      <Box>
        <Title>{t('app.prove.title', { name: name ?? t('app.prove.thisPlant') })}</Title>
        {req.asker ? (
          <Typography variant="body1">
            {rich(
              t('app.prove.askedBy'),
              {
                b,
                muted: (c) => (
                  <Typography component="span" variant="body2" color="text.secondary">
                    {c}
                  </Typography>
                ),
              },
              { asker: req.asker },
            )}
          </Typography>
        ) : (
          <Typography variant="body1">{t('app.prove.askedAnon')}</Typography>
        )}
      </Box>
      <Alert severity="info" variant="outlined" icon={false}>
        <Typography variant="body2">{rich(t('app.prove.whatSends'), { b })}</Typography>
      </Alert>
      {notReady ? (
        <Alert severity="warning" variant="outlined">
          {t('app.prove.testOnly')}
        </Alert>
      ) : (
        <>
          <Typography variant="body2">{t('app.prove.answering')}</Typography>
          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={call.busy}
            onClick={() => void prove()}
            sx={{ py: 1.6 }}
          >
            {call.busy ? t('app.prove.proving') : t('app.prove.proveIt')}
          </Button>
        </>
      )}
      <ChainStatusLine busy={call.busy} progress={call.progress} error={call.error} step="proving you hold a record" />
      <Typography variant="caption" color="text.secondary">
        {t('app.prove.fewMinutes')}
      </Typography>
    </Stack>
  );
};
