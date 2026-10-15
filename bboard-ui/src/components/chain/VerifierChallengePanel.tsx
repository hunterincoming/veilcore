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
const KeyRefused: React.FC<{ reason: string }> = ({ reason }) => (
  <Alert severity="error" variant="outlined">
    <Typography variant="body2" sx={{ fontWeight: 700 }}>
      Can&apos;t ask for a proof from this link
    </Typography>
    <Typography variant="body2" sx={{ mt: 0.5 }}>
      {reason}. A proof made with it would say nothing about this record.
    </Typography>
  </Alert>
);

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
    if ('error' in r) setProblem(`No link was made: ${r.error}.`);
    else setAsk(r.ask);
  };

  return (
    <Box sx={{ mt: 3 }}>
      <SectionBand section="prove" />
      <Paper variant="outlined" sx={{ p: { xs: 2.25, md: 3 }, mt: 1.5 }}>
        <Stack spacing={1.75}>
          <Box>
            <Typography variant="h6" component="h2">
              Ask them to prove they hold it
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              You send them a link. They open it and tap Prove it. The answer shows up here. This page checks the answer
              on the network itself, through a Midnight indexer (on the test site, reached through VeilCore&apos;s
              relay). For a decision that matters, check the transaction on a second indexer. Test network only.
            </Typography>
            {keyCheck.kind === 'bound' && (
              <Typography variant="body2" sx={{ mt: 0.75 }}>
                This record named its own key when it was sealed. This page checked that the key in your link is that
                one.
              </Typography>
            )}
            {keyCheck.kind === 'older' && (
              <Typography variant="body2" sx={{ mt: 0.75 }}>
                Older record: key not bound to this record. A proof shows control of the key the link names, which the
                holder chose.
              </Typography>
            )}
          </Box>

          {keyCheck.kind === 'refused' ? (
            <KeyRefused reason={keyCheck.reason} />
          ) : ask ? (
            <>
              <ProveWatch ask={ask} asker={asker.trim() || undefined} />
              <Button variant="text" onClick={() => setAsk(undefined)} sx={{ alignSelf: 'flex-start' }}>
                Make a new request
              </Button>
            </>
          ) : (
            <>
              <TextField
                label="Your name or business (optional)"
                helperText="They'll see it, marked as not checked by VeilCore."
                value={asker}
                onChange={(e) => setAsker(e.target.value.slice(0, 80))}
                fullWidth
              />
              <Button variant="contained" size="large" disabled={making} onClick={() => void make()} sx={{ py: 1.3 }}>
                {making ? 'Making the link…' : 'Make a link to send them'}
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
                {byHand ? 'Hide' : 'Do it by hand instead'}
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
        The link you were sent names an on-chain identity for this record ({claim.identity.slice(0, 16)}…). Make a
        challenge, send it to them, and paste back the transaction id they give you. The answer must come from that
        identity, answer your challenge, and the identity must be anchored and current.{' '}
        {record
          ? 'The record named this key when it was sealed, and this page checked that against its fingerprint.'
          : 'Older record: key not bound to this record. That this identity belongs to it is the holder’s statement.'}
      </Typography>
      {!challenge ? (
        <Button variant="outlined" onClick={() => void make()} sx={{ alignSelf: 'flex-start' }}>
          Make a challenge
        </Button>
      ) : (
        <>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Your challenge (send it to the holder; it works once, in this tab):
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {challenge}
            </Typography>
            <Button
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={() => void navigator.clipboard.writeText(challenge)}
            >
              Copy
            </Button>
          </Box>
          <TextField
            label="The holder’s transaction id"
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
            Check the answer
          </Button>
        </>
      )}
      <ChainStatusLine busy={call.busy} progress={call.progress} error={call.error} />
      {call.result && (
        <Alert severity={call.result.accepted ? 'success' : 'error'} variant="outlined">
          {call.result.accepted
            ? record
              ? 'Accepted: whoever sent that transaction controls this record’s own key, and answered your challenge.'
              : 'Accepted: whoever sent that transaction holds this identity’s secret, and answered your challenge.'
            : `Not accepted: ${call.result.reason}.`}
          {call.result.anchor === true && ' The anchor transaction the holder gave does create this identity.'}
          {call.result.anchor === false && ' The anchor transaction the holder gave could not be confirmed.'}
        </Alert>
      )}
    </Stack>
  );
};
