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
      <FlowFrame section="prove">
        <Title>Your request</Title>
        <Typography variant="body1" sx={{ mb: 2 }}>
          You asked the holder of {record ? <b>{record.strainName}</b> : 'this plant'} to prove they hold it. Send them
          this link if you haven&apos;t yet.
        </Typography>
        <ProveWatch ask={mine} />
        {mine.recordId && (
          <Button component={RouterLink} to={`/verify/${mine.recordId}`} sx={{ mt: 2 }}>
            Open the plant&apos;s check page
          </Button>
        )}
      </FlowFrame>
    );
  }

  if (req === 'loading') {
    return (
      <FlowFrame section="prove">
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <CircularProgress size={20} />
          <Typography>Opening the request…</Typography>
        </Stack>
      </FlowFrame>
    );
  }
  if (req === null || 'error' in req) {
    return (
      <FlowFrame section="prove">
        <Title>{req === null ? 'This request has ended' : 'Can’t open this right now'}</Title>
        <Typography variant="body1">
          {req === null
            ? 'It has expired (requests last a week), or the link is not complete. Ask them to send a new one.'
            : `${req.error.charAt(0).toUpperCase()}${req.error.slice(1)}.`}
        </Typography>
      </FlowFrame>
    );
  }

  const match = Object.values(allKeys).find((k) => k.anchor?.identity === req.identity);
  const record = match ? getRecord(match.recordId) : undefined;
  return (
    <FlowFrame section="prove">
      {match && !token ? (
        <>
          <Title>This link is missing its last part</Title>
          <Typography variant="body1">
            The answer can only go back with the whole link. Open the link exactly as they sent it, or ask them to send
            it again.
          </Typography>
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
          <Title>Someone wants you to prove you hold a plant</Title>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {Object.keys(allKeys).length === 0
              ? 'Your plants aren’t on this phone or computer. Open this link where you keep them, or get them back here from your backup file, then open the link again.'
              : 'None of the plants here is the one they asked about. If you keep it on another phone or computer, open this link there. If you only have it in a backup file, restore it here, then open the link again.'}
          </Typography>
          <Button variant="outlined" size="large" component={RouterLink} to="/restore" sx={{ py: 1.2 }}>
            Get my plants back from a backup
          </Button>
        </>
      )}
    </FlowFrame>
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

  const prove = () =>
    call.run(async (progress) => {
      const { proveOwnershipOnChain } = await import('../../veilcore/chain/actions');
      const receipt = await proveOwnershipOnChain(hexBytes(secret), req.challenge, { progress });
      progress('Sending the answer back…');
      const posted = await answerProveRequest(req.id, receipt.txId, token);
      return 'error' in posted
        ? { txId: receipt.txId, sent: false as const, why: posted.error }
        : { txId: receipt.txId, sent: true as const };
    });

  if (call.result) {
    return call.result.sent ? (
      <>
        <Title>Done</Title>
        <Typography variant="body1" sx={{ mb: 2 }}>
          They&apos;ll see the answer on their page. Nothing about the plant was sent: only proof that you hold its
          record.
        </Typography>
        <Button variant="contained" size="large" component={RouterLink} to={`/record/${recordId}`} sx={{ py: 1.3 }}>
          Back to {name ?? 'the plant'}
        </Button>
      </>
    ) : (
      <>
        <Title>Proved, but the answer didn&apos;t send</Title>
        <Typography variant="body1">
          ({call.result.why}.) Send them this instead; they can paste it under &quot;Do it by hand&quot;:
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', my: 1 }}>
          {call.result.txId}
        </Typography>
        <Button variant="outlined" onClick={() => void navigator.clipboard.writeText(call.result?.txId ?? '')}>
          Copy
        </Button>
      </>
    );
  }

  return (
    <Stack spacing={2}>
      <Box>
        <Title>Prove you hold {name ?? 'this plant'}</Title>
        {req.asker ? (
          <Typography variant="body1">
            Asked by someone who says they&apos;re <b>&ldquo;{req.asker}&rdquo;</b>.{' '}
            <Typography component="span" variant="body2" color="text.secondary">
              VeilCore hasn&apos;t checked that.
            </Typography>
          </Typography>
        ) : (
          <Typography variant="body1">Someone asked you to prove it. They didn&apos;t give a name.</Typography>
        )}
      </Box>
      <Alert severity="info" variant="outlined" icon={false}>
        <Typography variant="body2">
          <b>What this sends:</b> only proof that you hold this plant&apos;s record, put on the test network. No name,
          no genetics, nothing about your other plants.
        </Typography>
      </Alert>
      {notReady ? (
        <Alert severity="warning" variant="outlined">
          Proving works on the test version only right now.
        </Alert>
      ) : (
        <>
          <Typography variant="body2">
            Answering tells whoever sent you this link that you hold this plant&apos;s record.
          </Typography>
          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={call.busy}
            onClick={() => void prove()}
            sx={{ py: 1.6 }}
          >
            {call.busy ? 'Proving…' : 'Prove it'}
          </Button>
        </>
      )}
      <ChainStatusLine busy={call.busy} progress={call.progress} error={call.error} />
      <Typography variant="caption" color="text.secondary">
        It can take a few minutes. Test network: practice only.
      </Typography>
    </Stack>
  );
};
