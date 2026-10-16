// On a record's verify page: ask whoever claims this record to prove they hold it.
// The usual way is one link (prove-relay.ts): the checker sends it, the holder opens it
// and proves, and the answer shows up here, checked on chain. Doing it by hand (copy the
// challenge, paste back the transaction id) stays as a fallback.
// Real-chain builds only. Rule 8 of the verifier rules (docs/design.md).
//
// A record that names its own key (key-binding.ts): before anything is asked, the key in
// the link is matched to the record's fingerprint; a key that isn't the record's is
// refused here, with the reason, and no request is made. An older record (nothing to
// match) gets the earlier wording, labelled as an older record.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Alert, Box, Button, Collapse, Paper, Stack, TextField, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import { askToProve, myAsks, type MyAsk } from '../../veilcore/prove-relay';
import { checkLinkKey, type KeyCheck, type KeyedRecord } from '../../veilcore/key-binding';
import { SectionBand } from '../flow/FlowFrame';
import { ProveWatch } from './ProveWatch';
import { chainNotReady } from '../../veilcore/chain/config';
import { useChainCall } from './useChainCall';
import { ChainStatusLine } from './ChainStatusLine';
import { useT } from '../../i18n/app';
import { keyReasonWords } from './key-reason-words';

/**
 * What the holder's link says: the record's on-chain identity and its anchor transaction,
 * and for a record that names its key, the key's salt (ks) and its content hash (cd).
 * `fingerprint` is the link's, given only when the registry reports the same one;
 * `keyBound` is the registry's report that the record names a key.
 */
export type ClaimedChainAnchor = {
  identity: string;
  txId?: string;
  keySalt?: string | null;
  contentHash?: string | null;
  fingerprint?: string;
  keyBound?: boolean;
};

/** Why no request can be made, for a key that doesn't belong to this record. */
const KeyRefused: React.FC<{ reason: string }> = ({ reason }) => {
  const tr = useT();
  return (
    <Alert severity="error" variant="outlined">
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {tr.t('app.prove.ask.cantAsk')}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        {tr.t('app.prove.ask.refused', { reason: keyReasonWords(reason, tr) })}
      </Typography>
    </Alert>
  );
};

export const VerifierChallengePanel: React.FC<{ claim?: ClaimedChainAnchor | null; recordId?: string }> = ({
  claim,
  recordId,
}) => {
  const identity = claim?.identity.trim().toLowerCase() ?? '';
  const keyCheck: KeyCheck = checkLinkKey({
    identity,
    fingerprint: claim?.fingerprint,
    keySalt: claim?.keySalt,
    contentHash: claim?.contentHash,
    keyBound: claim?.keyBound,
  });
  const bound = keyCheck.kind === 'bound' ? keyCheck.record : undefined;
  const [ask, setAsk] = useState<MyAsk | undefined>(() =>
    myAsks().find(
      (a) =>
        a.identity === identity &&
        (!recordId || a.recordId === recordId) &&
        // A request made for a record that names its key is shown only for that record.
        (a.record?.fingerprint ?? '') === (bound?.fingerprint ?? ''),
    ),
  );
  const [asker, setAsker] = useState('');
  const [making, setMaking] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [byHand, setByHand] = useState(false);
  const { t } = useT();
  if (chainNotReady() || !claim || !/^[0-9a-f]{64}$/.test(identity)) return null;

  const make = async () => {
    setMaking(true);
    setProblem(undefined);
    const r = await askToProve({
      identity,
      asker,
      recordId,
      anchorTx: claim.txId,
      ...(bound ? { record: bound } : {}),
    }).catch((e: unknown) => ({
      error: e instanceof Error ? e.message : String(e),
    }));
    setMaking(false);
    if ('error' in r) setProblem(t('app.prove.ask.noLink', { error: r.error }));
    else setAsk(r.ask);
  };

  return (
    <Box sx={{ mt: 3 }}>
      <SectionBand section="prove" />
      <Paper variant="outlined" sx={{ p: { xs: 2.25, md: 3 }, mt: 1.5 }}>
        <Stack spacing={1.75}>
          <Box>
            <Typography variant="h6" component="h2">
              {t('app.prove.ask.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('app.prove.ask.intro')}
            </Typography>
            {keyCheck.kind === 'bound' && (
              <Typography variant="body2" sx={{ mt: 0.75 }}>
                {t('app.prove.ask.bound')}
              </Typography>
            )}
            {keyCheck.kind === 'older' && (
              <Typography variant="body2" sx={{ mt: 0.75 }}>
                {t('app.prove.ask.older')}
              </Typography>
            )}
          </Box>

          {keyCheck.kind === 'refused' ? (
            <KeyRefused reason={keyCheck.reason} />
          ) : ask ? (
            <>
              <ProveWatch ask={ask} asker={asker.trim() || undefined} />
              <Button variant="text" onClick={() => setAsk(undefined)} sx={{ alignSelf: 'flex-start' }}>
                {t('app.prove.ask.newRequest')}
              </Button>
            </>
          ) : (
            <>
              <TextField
                label={t('app.prove.ask.name')}
                helperText={t('app.prove.ask.nameHelp')}
                value={asker}
                onChange={(e) => setAsker(e.target.value.slice(0, 80))}
                fullWidth
              />
              <Button variant="contained" size="large" disabled={making} onClick={() => void make()} sx={{ py: 1.3 }}>
                {making ? t('app.prove.ask.making') : t('app.prove.ask.make')}
              </Button>
              {problem && (
                <Alert severity="warning" variant="outlined">
                  {problem}
                </Alert>
              )}
            </>
          )}

          {keyCheck.kind !== 'refused' && (
            <Box>
              <Button size="small" color="inherit" onClick={() => setByHand((v) => !v)}>
                {byHand ? t('app.lab.send.hide') : t('app.prove.ask.byHand')}
              </Button>
              <Collapse in={byHand} unmountOnExit>
                <ByHand claim={{ ...claim, identity }} record={bound} />
              </Collapse>
            </Box>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};

/** The fallback: copy a challenge to them, paste back their transaction id. */
const ByHand: React.FC<{ claim: ClaimedChainAnchor; record?: KeyedRecord }> = ({ claim, record }) => {
  const [challenge, setChallenge] = useState<string>();
  const [txId, setTxId] = useState('');
  const call = useChainCall<{ accepted: boolean; reason: string; anchor?: boolean }>();
  const { t } = useT();

  const make = async () => {
    const { newChallenge } = await import('../../veilcore/chain/challenge-book');
    setChallenge(newChallenge());
    setTxId('');
  };
  const check = () =>
    call.run(async (progress) => {
      progress('Reading the answer from the network…');
      const { checkOwnership, checkAnchor } = await import('../../veilcore/chain/ownership-check');
      const v = await checkOwnership({
        txId,
        identity: claim.identity,
        challenge: challenge ?? '',
        ...(record ? { record } : {}),
      });
      const anchor = claim.txId ? await checkAnchor(claim.txId, claim.identity) : undefined;
      return { ...v, anchor };
    });

  return (
    <Stack spacing={1.5} sx={{ mt: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {t('app.prove.hand.intro', {
          id: claim.identity.slice(0, 16),
          bound: record ? t('app.prove.hand.bound') : t('app.prove.hand.older'),
        })}
      </Typography>
      {!challenge ? (
        <Button variant="outlined" onClick={() => void make()} sx={{ alignSelf: 'flex-start' }}>
          {t('app.prove.hand.make')}
        </Button>
      ) : (
        <>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('app.prove.hand.yourChallenge')}
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {challenge}
            </Typography>
            <Button
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={() => void navigator.clipboard.writeText(challenge)}
            >
              {t('app.prove.copy')}
            </Button>
          </Box>
          <TextField
            label={t('app.prove.hand.txId')}
            value={txId}
            onChange={(e) => setTxId(e.target.value)}
            size="small"
            fullWidth
          />
          <Button
            variant="contained"
            disabled={!txId.trim() || call.busy}
            onClick={() => void check()}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('app.prove.hand.check')}
          </Button>
        </>
      )}
      <ChainStatusLine busy={call.busy} progress={call.progress} error={call.error} />
      {call.result && (
        <Alert severity={call.result.accepted ? 'success' : 'error'} variant="outlined">
          {call.result.accepted
            ? record
              ? t('app.prove.hand.acceptedKey')
              : t('app.prove.hand.acceptedSecret')
            : t('app.prove.hand.notAccepted', { reason: call.result.reason })}
          {call.result.anchor === true && t('app.prove.hand.anchorYes')}
          {call.result.anchor === false && t('app.prove.hand.anchorNo')}
        </Alert>
      )}
    </Stack>
  );
};
