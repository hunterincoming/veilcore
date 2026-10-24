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
import { AGREEMENTS_ON_CHAIN } from '../../config/copy';
import { useChainCall } from '../chain/useChainCall';
import { ChainStatusLine } from '../chain/ChainStatusLine';
import { SendLink } from '../chain/ProveWatch';
import { Wordmark } from '../Wordmark';
import { rich, useT } from '../../i18n/app';
import { LanguageBar } from '../../i18n/LanguagePicker';

const WEEK = 7 * 24 * 60 * 60_000;
const shortKey = (h: string) => `${h.slice(0, 8)}…${h.slice(-6)}`;

// --- the checker -----------------------------------------------------------------------

/** Wait for the holder's answer and check it on chain. */
export const LicenseProofWatch: React.FC<{ ask: MyAsk; asker?: string }> = ({ ask: initial, asker }) => {
  const tr = useT();
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
          {tr.t('app.lic.proof.ok')}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {rich(
            tr.t('app.lic.proof.okText'),
            {},
            {
              key: <span style={{ fontFamily: 'monospace' }}>{shortKey(ask.identity)}</span>,
              when: new Date(ask.confirmed.at).toLocaleString(tr.locale),
            },
          )}
        </Typography>
      </Alert>
    );
  }
  const refusals = Object.values(ask.refused ?? {});
  return (
    <Stack spacing={1.5}>
      {state !== 'expired' && (
        <>
          <Typography variant="body2">{tr.t('app.lic.proof.sendLink')}</Typography>
          <SendLink link={proveLink(ask.id, ask.token, 'license')} asker={asker} />
        </>
      )}
      {state === 'expired' ? (
        <Alert severity="warning" variant="outlined">
          {tr.t('app.lic.proof.ended')}
        </Alert>
      ) : state === 'unreachable' ? (
        <Alert severity="warning" variant="outlined">
          {tr.t('app.lic.proof.unreachable')}
        </Alert>
      ) : (
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            {pending ? tr.t('app.lic.proof.pending') : tr.t('app.lic.proof.waiting')}
          </Typography>
        </Stack>
      )}
      {refusals.length > 0 && (
        <Alert severity="error" variant="outlined">
          {refusals.length === 1
            ? tr.t('app.lic.proof.refusedOne', { why: refusals[0] })
            : tr.t('app.lic.proof.refusedMany', { count: refusals.length, why: refusals[refusals.length - 1] })}
        </Alert>
      )}
    </Stack>
  );
};

/** On a record's check page: ask someone to prove they hold a live license from it. */
export const LicenseProofPanel: React.FC<{ identity: string; recordId?: string }> = ({ identity: raw, recordId }) => {
  const tr = useT();
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
    if ('error' in r) setProblem(tr.t('app.lic.proof.couldnt', { error: r.error }));
    else setAsk(r.ask);
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2.25, md: 3 }, mt: 3 }}>
      <Stack spacing={1.75}>
        <Box>
          <Typography variant="h6" component="h2">
            {tr.t('app.lic.proof.panelTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {tr.t('app.lic.proof.panelText')}
          </Typography>
        </Box>
        {ask ? (
          <>
            <LicenseProofWatch ask={ask} asker={asker.trim() || undefined} />
            <Button variant="text" onClick={() => setAsk(undefined)} sx={{ alignSelf: 'flex-start' }}>
              {tr.t('app.lic.proof.newRequest')}
            </Button>
          </>
        ) : (
          <>
            <TextField
              label={tr.t('app.lic.proof.who')}
              value={asker}
              onChange={(e) => setAsker(e.target.value.slice(0, 80))}
              fullWidth
              size="small"
            />
            <Button variant="outlined" disabled={making} onClick={() => void make()} sx={{ alignSelf: 'flex-start' }}>
              {making ? tr.t('app.lic.proof.making') : tr.t('app.lic.proof.make')}
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
  const tr = useT();
  const mine = myAsk(id);
  const held = useHeldLicenses();
  const [req, setReq] = useState<ProveRequest | null | 'loading' | { error: string }>('loading');

  useEffect(() => {
    if (!AGREEMENTS_ON_CHAIN) return;
    let live = true;
    void getProveRequest(id).then((r) => live && setReq(r));
    return () => {
      live = false;
    };
  }, [id]);

  if (!AGREEMENTS_ON_CHAIN || chainNotReady()) {
    return (
      <Frame>
        <Typography>{tr.t('app.lic.proof.cant')}</Typography>
      </Frame>
    );
  }
  if (mine?.kind === 'license') {
    return (
      <Frame>
        <Typography variant="h5" component="h1" sx={{ mb: 1.5 }}>
          {tr.t('app.lic.proof.yourCheck')}
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
          <Typography>{tr.t('app.lic.proof.opening')}</Typography>
        </Stack>
      </Frame>
    );
  }
  if (req === null || 'error' in req) {
    return (
      <Frame>
        <Typography>
          {req === null ? tr.t('app.lic.proof.gone') : tr.t('app.lic.proof.openFailed', { error: req.error })}
        </Typography>
      </Frame>
    );
  }
  if (!token) {
    return (
      <Frame>
        <Alert severity="warning" variant="outlined">
          {tr.t('app.lic.proof.partial')}
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
          {tr.t('app.lic.proof.someoneChecks')}
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {rich(
            tr.t('app.lic.proof.noneHere'),
            {},
            {
              key: <span style={{ fontFamily: 'monospace' }}>{shortKey(req.identity)}</span>,
            },
          )}
        </Typography>
        <Button variant="outlined" component={RouterLink} to="/restore">
          {tr.t('app.lic.proof.restore')}
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
  const tr = useT();
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
      if (!pick) throw new Error(tr.t('app.lic.proof.revoked'));
      const { proveLicenseOnChain } = await import('../../veilcore/chain/actions');
      const r = await proveLicenseOnChain(hexBytes(pick.secret), pick.issuerRecord, req.challenge, { progress });
      progress(tr.t('app.lic.proof.sendingBack'));
      const posted = await answerProveRequest(req.id, r.txId, token);
      return 'error' in posted ? { txId: r.txId, sent: false, why: posted.error } : { txId: r.txId, sent: true };
    });

  if (call.result) {
    return call.result.sent ? (
      <Alert severity="success" variant="outlined">
        {tr.t('app.lic.proof.done')}
      </Alert>
    ) : (
      <Stack spacing={1}>
        <Alert severity="warning" variant="outlined">
          {tr.t('app.lic.proof.sendFailed', { why: call.result.why ?? '' })}
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
        {tr.t('app.lic.proof.prove')}
      </Typography>
      <Typography variant="body1">
        {rich(
          req.asker ? tr.t('app.lic.proof.askerWants') : tr.t('app.lic.proof.someoneWants'),
          { b: (c) => <b>{c}</b> },
          { asker: req.asker ?? '', key: <span style={{ fontFamily: 'monospace' }}>{shortKey(req.identity)}</span> },
        )}
      </Typography>
      <Alert severity="info" variant="outlined" icon={false}>
        <Typography variant="body2">{tr.t('app.lic.proof.learn')}</Typography>
      </Alert>
      <Button variant="contained" size="large" fullWidth disabled={call.busy} onClick={() => void prove()}>
        {call.busy ? tr.t('app.lic.proof.proving') : tr.t('app.lic.proof.proveIt')}
      </Button>
      <ChainStatusLine busy={call.busy} progress={call.progress} error={call.error} step="agreement" />
      <Typography variant="caption" color="text.secondary">
        {tr.t('app.lic.proof.minutes')}
      </Typography>
    </Stack>
  );
};
