// The checker's side of a "prove it" link: wait for the answer, then check it on chain.
//
// Every answer is checked against the challenge and identity this browser kept when it
// made the request (prove-relay.ts), never against what the registry hands back.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import ShareIcon from '@mui/icons-material/IosShareOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import { checkAnswers, getProveRequest, proveLink, type MyAsk } from '../../veilcore/prove-relay';

const POLL_MS = 5_000;
const when = (t: number) => new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export const SendLink: React.FC<{ link: string; asker?: string }> = ({ link, asker }) => {
  const [copied, setCopied] = useState(false);
  const text = `${asker ? `${asker} is asking` : 'I’m asking'} you to prove you hold this plant on VeilCore. Open this link: ${link}`;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  return (
    <Box>
      <Typography
        variant="body2"
        sx={{
          fontFamily: 'monospace',
          wordBreak: 'break-all',
          p: 1.25,
          borderRadius: 1,
          bgcolor: 'rgba(22,32,27,0.05)',
        }}
      >
        {link}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
        {canShare && (
          <Button
            variant="contained"
            startIcon={<ShareIcon />}
            onClick={() => void navigator.share({ text }).catch(() => undefined)}
            sx={{ minHeight: 44 }}
          >
            Send it
          </Button>
        )}
        <Button
          variant={canShare ? 'outlined' : 'contained'}
          startIcon={<ContentCopyIcon />}
          onClick={() => {
            void navigator.clipboard.writeText(link);
            setCopied(true);
          }}
          sx={{ minHeight: 44 }}
        >
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </Stack>
    </Box>
  );
};

type State = 'waiting' | 'expired' | 'unreachable';

export const ProveWatch: React.FC<{ ask: MyAsk; asker?: string; showLink?: boolean }> = ({
  ask: initial,
  asker,
  showLink = true,
}) => {
  const [ask, setAsk] = useState(initial);
  const [state, setState] = useState<State>('waiting');
  const [checking, setChecking] = useState(false);
  // An answer is in but the network can't show it yet (just sent, or the indexer is down).
  const [pending, setPending] = useState(false);
  const running = useRef(false);

  useEffect(() => setAsk(initial), [initial]);

  useEffect(() => {
    if (ask.confirmed) return;
    let live = true;
    const tick = async () => {
      if (running.current || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return;
      running.current = true;
      try {
        const r = await getProveRequest(ask.id);
        if (!live) return;
        if (r === null) return setState('expired');
        if ('error' in r) return setState('unreachable');
        setState('waiting');
        if (!r.answers.some((t) => !ask.refused?.[t])) return;
        setChecking(true);
        const deps = await import('../../veilcore/chain/ownership-check');
        const next = await checkAnswers(ask, r.answers, deps);
        if (!live) return;
        setPending(!next.confirmed && r.answers.some((t) => !next.refused?.[t]));
        if (next !== ask) setAsk(next);
      } finally {
        running.current = false;
        if (live) setChecking(false);
      }
    };
    void tick();
    const t = setInterval(() => void tick(), POLL_MS);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [ask]);

  const refusals = Object.values(ask.refused ?? {});

  if (ask.confirmed) {
    return (
      <Alert severity="success" variant="outlined">
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Confirmed
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Whoever answered holds this plant&apos;s record right now.
          {ask.confirmed.anchor === true && ' Its date stamp checks out too, so they have held it since then.'}
          {ask.confirmed.anchor === false && ' The date stamp named in the link could not be confirmed.'}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          It doesn&apos;t prove who bred the plant, or who the person is.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          Checked {when(ask.confirmed.at)} on the test network, which can be reset: practice only, no evidential weight.
        </Typography>
      </Alert>
    );
  }

  return (
    <Stack spacing={1.5}>
      {showLink && state !== 'expired' && <SendLink link={proveLink(ask.id)} asker={asker} />}
      {state === 'expired' ? (
        <Alert severity="info" variant="outlined">
          This request expired without an answer. Make a new one.
        </Alert>
      ) : (
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <CircularProgress size={18} />
          <Typography variant="body2">
            {checking && !pending
              ? 'An answer came in. Checking it on the network…'
              : pending
                ? 'An answer came in. The network hasn’t shown it yet, so this keeps checking every few seconds.'
                : state === 'unreachable'
                  ? 'Can’t reach VeilCore right now. Still trying.'
                  : 'Waiting for them to prove it. You can close this page: open the same link again in this browser to see the answer.'}
          </Typography>
        </Stack>
      )}
      {refusals.length > 0 && (
        <Alert severity="warning" variant="outlined">
          {refusals.length === 1
            ? 'An answer came back that didn’t check out'
            : `${refusals.length} answers didn’t check out`}
          : {refusals[refusals.length - 1]}
        </Alert>
      )}
    </Stack>
  );
};
