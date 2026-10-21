// "Prove you hold a live license from this record", both sides, by one link.
//
// The checker (a buyer, a dispensary, a lab) is on a record's check page. They make a
// request (prove-relay.ts, kind 'license') and send the link, /prove-license/<id>#t=…
// The license holder opens it on the device that holds their license key
// (held-licenses.ts), taps once, and their browser proves on chain (proveLicense) and
// posts the transaction id back. The checker's page checks it on chain itself
// (license-check.ts, verifier rule 5).
//
// What it shows, and no more: whoever answered held a live license from that record when
// the answer landed. Not which license, not its terms, not who they are. The registry is
// only a mailbox: a lying registry can make a check fail, never pass.
//
// In English in every language, like the rest of licensing (components/licensing).
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useParams, Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import {
  NEVER_APPEARED,
  NOT_INDEXED_GRACE_MS,
  answerProveRequest,
  askToProve,
  getProveRequest,
  myAsk,
  myAsks,
  nextPollMs,
  notIndexedYet,
  proveLink,
  tokenFromHash,
  updateMyAsk,
  worthRetrying,
  type MyAsk,
  type ProveRequest,
} from '../../veilcore/prove-relay';
import { useHeldLicenses, type HeldLicense } from '../../veilcore/held-licenses';
import { hexBytes } from '../../veilcore/record-keys';
import { chainNotReady } from '../../veilcore/chain/config';
import { useChainCall } from '../chain/useChainCall';
import { ChainStatusLine } from '../chain/ChainStatusLine';
import { SendLink } from '../chain/ProveWatch';
import { Wordmark } from '../Wordmark';
import { InEnglishPage } from '../../i18n/app';
import { LanguageBar } from '../../i18n/LanguagePicker';

const WEEK = 7 * 24 * 60 * 60_000;
const shortKey = (h: string) => `${h.slice(0, 8)}…${h.slice(-6)}`;

// --- the checker -----------------------------------------------------------------------

/** Wait for the holder's answer and check it on chain. */
export const LicenseProofWatch: React.FC<{ ask: MyAsk; asker?: string }> = ({ ask: initial, asker }) => {
  const [ask, setAsk] = useState(initial);
  const [state, setState] = useState<'waiting' | 'expired' | 'unreachable'>('waiting');
  const [pending, setPending] = useState(false);
  const running = useRef(false);
  const since = useRef(Date.now());
  const expiresAt = useRef(initial.createdAt + WEEK);

  useEffect(() => setAsk(initial), [initial]);

  useEffect(() => {
    if (ask.confirmed) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (running.current) return;
      running.current = true;
      try {
        const r = await getProveRequest(ask.id);
        if (!live) return;
        if (r === null) return setState('expired');
        if ('error' in r) return setState('unreachable');
        setState('waiting');
        expiresAt.current = r.expiresAt;
        const { checkLicense } = await import('../../veilcore/chain/license-check');
        let now = ask;
        for (const a of r.answers) {
          const txId = a.txId.trim().toLowerCase();
          if (now.refused?.[txId]) continue;
          since.current = Date.now();
          const v = await checkLicense({ txId, identity: ask.identity, challenge: ask.challenge });
          if (v.accepted) {
            now = { ...now, confirmed: { txId, at: v.landedAt ?? Date.now() } };
            break;
          }
          if (notIndexedYet(v.reason)) {
            if (Date.now() - a.answeredAt > NOT_INDEXED_GRACE_MS)
              now = { ...now, refused: { ...now.refused, [txId]: NEVER_APPEARED } };
          } else if (!worthRetrying(v.reason)) now = { ...now, refused: { ...now.refused, [txId]: v.reason } };
        }
        if (!live) return;
        setPending(!now.confirmed && r.answers.some((a) => !now.refused?.[a.txId.trim().toLowerCase()]));
        if (now !== ask) {
          const result = now;
          updateMyAsk(ask.id, () => result);
          setAsk(result);
        }
      } finally {
        running.current = false;
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

  if (ask.confirmed) {
    return (
      <Alert severity="success" variant="outlined">
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Checked on Midnight: a live license from this record
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Whoever answered your link held a live license issued from the record with key{' '}
          <span style={{ fontFamily: 'monospace' }}>{shortKey(ask.identity)}</span> when their answer landed, on{' '}
          {new Date(ask.confirmed.at).toLocaleString()}. It does not show which license, its terms, or who they are.
          Licenses can be revoked later: for a fresh answer, make a new request.
        </Typography>
      </Alert>
    );
  }
  const refusals = Object.values(ask.refused ?? {});
  return (
    <Stack spacing={1.5}>
      {state !== 'expired' && (
        <>
          <Typography variant="body2">Send them this link. Their answer shows here, checked on chain.</Typography>
          <SendLink link={proveLink(ask.id, ask.token, 'license')} asker={asker} />
        </>
      )}
      {state === 'expired' ? (
        <Alert severity="warning" variant="outlined">
          This request has ended. Make a new one.
        </Alert>
      ) : state === 'unreachable' ? (
        <Alert severity="warning" variant="outlined">
          Can&apos;t reach the VeilCore registry right now. This page keeps trying.
        </Alert>
      ) : (
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            {pending ? 'An answer came in. Waiting for the network to show it…' : 'Waiting for their answer…'}
          </Typography>
        </Stack>
      )}
      {refusals.length > 0 && (
        <Alert severity="error" variant="outlined">
          {refusals.length === 1
            ? 'An answer did not check out: '
            : `${refusals.length} answers did not check out. Latest: `}
          {refusals[refusals.length - 1]}
        </Alert>
      )}
    </Stack>
  );
};

/** On a record's check page: ask someone to prove they hold a live license from it. */
export const LicenseProofPanel: React.FC<{ identity: string; recordId?: string }> = ({ identity: raw, recordId }) => {
  const identity = raw.trim().toLowerCase();
  const [ask, setAsk] = useState<MyAsk | undefined>(() =>
    myAsks().find((a) => a.kind === 'license' && a.identity === identity && (!recordId || a.recordId === recordId)),
  );
  const [asker, setAsker] = useState('');
  const [making, setMaking] = useState(false);
  const [problem, setProblem] = useState<string>();
  if (chainNotReady() || !/^[0-9a-f]{64}$/.test(identity)) return null;

  const make = async () => {
    setMaking(true);
    setProblem(undefined);
    const r = await askToProve({ identity, asker, recordId, kind: 'license' }).catch((e: unknown) => ({
      error: e instanceof Error ? e.message : String(e),
    }));
    setMaking(false);
    if ('error' in r) setProblem(`Couldn't make the link: ${r.error}`);
    else setAsk(r.ask);
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2.25, md: 3 }, mt: 3 }} lang="en">
      <Stack spacing={1.75}>
        <Box>
          <Typography variant="h6" component="h2">
            Check someone holds a license from this record
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Someone says they&apos;re licensed to grow or sell this. Send them a link; they answer from the device that
            holds their license, and this page checks it on Midnight. You learn only that they held a live license from
            this record when they answered.
          </Typography>
        </Box>
        {ask ? (
          <>
            <LicenseProofWatch ask={ask} asker={asker.trim() || undefined} />
            <Button variant="text" onClick={() => setAsk(undefined)} sx={{ alignSelf: 'flex-start' }}>
              Make a new request
            </Button>
          </>
        ) : (
          <>
            <TextField
              label="Who's asking? (they'll see it)"
              value={asker}
              onChange={(e) => setAsker(e.target.value.slice(0, 80))}
              fullWidth
              size="small"
            />
            <Button variant="outlined" disabled={making} onClick={() => void make()} sx={{ alignSelf: 'flex-start' }}>
              {making ? 'Making the link…' : 'Make a link for them'}
            </Button>
            {problem && (
              <Alert severity="warning" variant="outlined">
                {problem}
              </Alert>
            )}
          </>
        )}
      </Stack>
    </Paper>
  );
};

// --- the holder ------------------------------------------------------------------------

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

/** /prove-license/:id — the asker sees their request; the license holder answers it. */
export const ProveLicensePage: React.FC = () => {
  const { id = '' } = useParams();
  const { hash } = useLocation();
  const token = tokenFromHash(hash);
  const mine = myAsk(id);
  const held = useHeldLicenses();
  const [req, setReq] = useState<ProveRequest | null | 'loading' | { error: string }>('loading');

  useEffect(() => {
    let live = true;
    void getProveRequest(id).then((r) => live && setReq(r));
    return () => {
      live = false;
    };
  }, [id]);

  if (mine?.kind === 'license') {
    return (
      <Frame>
        <Typography variant="h5" component="h1" sx={{ mb: 1.5 }}>
          Your license check
        </Typography>
        <LicenseProofWatch ask={mine} />
      </Frame>
    );
  }
  if (req === 'loading') {
    return (
      <Frame>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <CircularProgress size={20} />
          <Typography>Opening the request…</Typography>
        </Stack>
      </Frame>
    );
  }
  if (req === null || 'error' in req) {
    return (
      <Frame>
        <Typography>
          {req === null
            ? 'This request has ended or doesn’t exist. Ask whoever sent it for a new one.'
            : `Couldn’t open this request: ${req.error}`}
        </Typography>
      </Frame>
    );
  }
  if (!token) {
    return (
      <Frame>
        <Alert severity="warning" variant="outlined">
          This link is missing its last part. Open it again exactly as you got it, including what comes after the #.
        </Alert>
      </Frame>
    );
  }
  // Licenses this device holds from the record asked about; the answer uses one still live on chain.
  const mineFrom = held.filter((h) => h.identity === req.identity);
  if (mineFrom.length === 0) {
    return (
      <Frame>
        <Typography variant="h5" component="h1" sx={{ mb: 1 }}>
          Someone wants to check your license
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          This device holds no license from the record they asked about (key{' '}
          <span style={{ fontFamily: 'monospace' }}>{shortKey(req.identity)}</span>). Open the link on the device where
          you accepted the license, or restore your backup here first.
        </Typography>
        <Button variant="outlined" component={RouterLink} to="/restore">
          Restore a backup
        </Button>
      </Frame>
    );
  }
  return (
    <Frame>
      <HolderAnswer req={req} token={token} licenses={mineFrom} />
    </Frame>
  );
};

const HolderAnswer: React.FC<{ req: ProveRequest; token: string; licenses: readonly HeldLicense[] }> = ({
  req,
  token,
  licenses,
}) => {
  const call = useChainCall<{ txId: string; sent: boolean; why?: string }>();

  const prove = () =>
    call.run(async (progress) => {
      const { licenseStatusNow } = await import('../../veilcore/license-invites');
      // The first of them still live on chain: a revoked one can't answer and costs a failed try.
      let pick: HeldLicense | undefined;
      for (const h of licenses) {
        if ((await licenseStatusNow(h.commitment, h.issuerRecord)) === 'ACTIVE') {
          pick = h;
          break;
        }
      }
      if (!pick) throw new Error('Your license from this record is no longer live on chain: it was revoked.');
      const { proveLicenseOnChain } = await import('../../veilcore/chain/actions');
      const r = await proveLicenseOnChain(hexBytes(pick.secret), pick.issuerRecord, req.challenge, { progress });
      progress('Sending the answer back…');
      const posted = await answerProveRequest(req.id, r.txId, token);
      return 'error' in posted ? { txId: r.txId, sent: false, why: posted.error } : { txId: r.txId, sent: true };
    });

  if (call.result) {
    return call.result.sent ? (
      <Alert severity="success" variant="outlined">
        Done. Your answer is on Midnight and sent back; their page checks it there. You can close this page.
      </Alert>
    ) : (
      <Stack spacing={1}>
        <Alert severity="warning" variant="outlined">
          Your answer is on Midnight, but sending it back didn&apos;t work ({call.result.why}). Send them this
          transaction id instead:
        </Alert>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
          {call.result.txId}
        </Typography>
      </Stack>
    );
  }
  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1">
        Prove your license
      </Typography>
      <Typography variant="body1">
        {req.asker ? (
          <>
            <b>{req.asker}</b> wants to check
          </>
        ) : (
          'Someone wants to check'
        )}{' '}
        that you hold a live license from the record with key{' '}
        <span style={{ fontFamily: 'monospace' }}>{shortKey(req.identity)}</span>.
      </Typography>
      <Alert severity="info" variant="outlined" icon={false}>
        <Typography variant="body2">
          What they learn: that you held a live license from that record when you answered. Not which license, not its
          terms, and nothing about you. VeilCore pays the network fee.
        </Typography>
      </Alert>
      <Button variant="contained" size="large" fullWidth disabled={call.busy} onClick={() => void prove()}>
        {call.busy ? 'Proving…' : 'Prove it'}
      </Button>
      <ChainStatusLine busy={call.busy} progress={call.progress} error={call.error} step="agreement" />
      <Typography variant="caption" color="text.secondary">
        It takes a few minutes. Keep this page open.
      </Typography>
    </Stack>
  );
};
