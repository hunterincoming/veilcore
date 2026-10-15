// The checker's side of a "prove it" link: wait for the answer, then check it on chain.
//
// Every answer is checked against the challenge and identity this browser kept when it
// made the request (prove-relay.ts), never against what the registry hands back.
//
// It looks every 5 seconds for 2 minutes (from opening, or from the latest new answer),
// then every 30 seconds, and stops when the request expires. Each look checks each
// answer not yet refused once.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import ShareIcon from '@mui/icons-material/IosShareOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import { localStamp } from '../../veilcore/time';
import {
  checkAnswers,
  getProveRequest,
  keyStampWords,
  nextPollMs,
  proveLink,
  type MyAsk,
} from '../../veilcore/prove-relay';

const WEEK = 7 * 24 * 60 * 60_000;
const when = (t: number) => localStamp(t);

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

/** The key, shortened (first 8…last 6), with a button to copy all of it. */
const KeyLine: React.FC<{ identity: string }> = ({ identity }) => {
  const [copied, setCopied] = useState(false);
  return (
    <Stack direction="row" spacing={1} sx={{ mt: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
      <Typography variant="body2">
        Key:{' '}
        <Box component="span" sx={{ fontFamily: 'monospace' }} title={identity}>
          {identity.slice(0, 8)}…{identity.slice(-6)}
        </Box>
      </Typography>
      <Button
        size="small"
        startIcon={<ContentCopyIcon />}
        onClick={() => {
          void navigator.clipboard.writeText(identity);
          setCopied(true);
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </Stack>
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

  // When the fast polling window started, the answers seen so far, and when the request ends.
  const since = useRef(Date.now());
  const known = useRef(new Set<string>());
  const expiresAt = useRef(initial.createdAt + WEEK);

  useEffect(() => {
    setAsk(initial);
    since.current = Date.now();
    known.current = new Set();
    expiresAt.current = initial.createdAt + WEEK;
  }, [initial]);

  useEffect(() => {
    if (ask.confirmed) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (running.current || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return;
      running.current = true;
      try {
        const r = await getProveRequest(ask.id);
        if (!live) return;
        if (r === null) return setState('expired');
        if ('error' in r) return setState('unreachable');
        setState('waiting');
        expiresAt.current = r.expiresAt;
        const fresh = r.answers.filter((a) => !known.current.has(a.txId));
        if (fresh.length > 0) {
          for (const a of fresh) known.current.add(a.txId);
          since.current = Date.now(); // something new: look often again for a while
        }
        if (!r.answers.some((a) => !ask.refused?.[a.txId])) return;
        setChecking(true);
        const deps = await import('../../veilcore/chain/ownership-check');
        const next = await checkAnswers(ask, r.answers, deps);
        if (!live) return;
        setPending(!next.confirmed && r.answers.some((a) => !next.refused?.[a.txId]));
        if (next !== ask) setAsk(next);
      } finally {
        running.current = false;
        if (live) setChecking(false);
      }
    };
    const loop = async () => {
      await tick();
      if (!live) return;
      const wait = nextPollMs(since.current, Date.now(), expiresAt.current);
      if (wait === null) return setState('expired');
      timer = setTimeout(() => void loop(), wait);
    };
    void loop();
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [ask]);

  const refusals = Object.values(ask.refused ?? {});

  if (ask.confirmed) {
    // What this shows, and no more. A record that names its own key (ask.record, checked
    // against its fingerprint before asking and again with the answer): whoever answered
    // controls that key. An older record: the key named in the link, which the holder
    // chose (key-binding.ts, ownership-check.ts).
    const bound = !!ask.record;
    return (
      <Alert severity="success" variant="outlined">
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Confirmed
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {bound
            ? 'Whoever answered controls this record’s own key, right now. The record named that key when it was sealed, so it can’t be swapped.'
            : 'Whoever answered controls the key named in this link, right now.'}
        </Typography>
        {ask.confirmed.anchor === true && (
          <Typography variant="body2" sx={{ mt: 0.75 }}>
            {keyStampWords(bound, ask.confirmed.anchoredAt)}
          </Typography>
        )}
        {ask.confirmed.anchor === false && (
          <Typography variant="body2" sx={{ mt: 0.75 }}>
            The key&apos;s date stamp named in the link could not be confirmed.
          </Typography>
        )}
        {bound ? (
          <Typography variant="body2" sx={{ mt: 0.75 }}>
            It doesn&apos;t show who they are or who bred the plant.
          </Typography>
        ) : (
          <>
            <Typography variant="body2" sx={{ mt: 0.75, fontWeight: 700 }}>
              Older record: key not bound to this record.
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.25 }}>
              That this key belongs to this plant&apos;s record is the holder&apos;s statement for now. It doesn&apos;t
              show who they are or who bred the plant.
            </Typography>
          </>
        )}
        <KeyLine identity={ask.identity} />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          Checked {when(ask.confirmed.at)} on the test network, which can be reset: practice only, no evidential weight.
        </Typography>
      </Alert>
    );
  }

  return (
    <Stack spacing={1.5}>
      {showLink && state !== 'expired' && <SendLink link={proveLink(ask.id, ask.token)} asker={asker} />}
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
                ? 'An answer came in. The network hasn’t shown it yet, so this keeps checking.'
                : state === 'unreachable'
                  ? 'Can’t reach VeilCore right now. Still trying.'
                  : 'Waiting for them to prove it. You can close this page: to see the answer, open the link you sent them, in this browser.'}
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
