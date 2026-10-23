// The licensor's side of handing a live license on (veilcore/hand-on.ts): a link for the new
// holder, the code read aloud with them, the signed 'handon' to the current holder, and the
// approval on chain once the current holder has proposed it. Every step is checked here
// against the chain, never taken from the registry's word.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import { canonicalUrl } from '../../config/network';
import { hexBytes } from '../../veilcore/record-keys';
import { setOnChain, type License, type OnChainLicense } from '../../veilcore/licenses';
import type { DealEntry, DealParty } from '../../veilcore/deal-client';
import {
  commitHashOf,
  createInvite,
  getInvite,
  handOnPath,
  licenseCode,
  licenseStatusNow,
  pendingTransferNow,
  postNonce,
} from '../../veilcore/license-invites';
import { afterHandOn, handOnAsked, issuerHandOnSteps } from '../../veilcore/hand-on';
import { useChainCall } from '../chain/useChainCall';
import { ChainStatusLine } from '../chain/ChainStatusLine';
import type { ChainReceipt } from '../../veilcore/chain/actions';
import { ConfirmInline, DealSteps, HowItWorks } from './DealSteps';

const POLL_MS = 8_000;

/** This side's deal with the new holder, once both keys are known. */
const newHolderParty = (oc: OnChainLicense): DealParty | undefined => {
  const h = oc.handOn;
  return h?.partySecret && h.licenseeNonce && h.commitment && oc.issuerRecord
    ? {
        side: 'issuer',
        mySecret: h.partySecret,
        theirPublic: h.licenseeNonce,
        commitment: h.commitment,
        issuerRecord: oc.issuerRecord,
        invite: { id: h.inviteId, token: h.issuerToken },
      }
    : undefined;
};

export const HandOnIssuer: React.FC<{
  license: License;
  /** The current holder's deal: the 'handon' goes to them here, and their request comes back. */
  party: DealParty;
  entries: readonly DealEntry[] | undefined;
  recordSecret: string;
  blocked: boolean;
  onToast: (m: string) => void;
}> = ({ license, party, entries, recordSecret, blocked, onToast }) => {
  const oc = license.onChain!;
  const h = oc.handOn;
  const asked = handOnAsked(entries, h?.invitedAt);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [code, setCode] = useState<string>();
  const [codeChecked, setCodeChecked] = useState(false);
  /** What the chain shows the current holder proposed: the code-checked commitment, another, or nothing. */
  const [proposed, setProposed] = useState<string>();
  const call = useChainCall<ChainReceipt>();
  const checking = useRef(false);

  useEffect(() => {
    let on = true;
    if (h?.commitment && oc.issuerRecord && h.licenseeNonce && h.issuerNonce)
      void licenseCode(h.commitment, oc.issuerRecord, h.licenseeNonce, h.issuerNonce).then((c) => on && setCode(c));
    else setCode(undefined);
    return () => {
      on = false;
    };
  }, [h?.commitment, h?.licenseeNonce, h?.issuerNonce, oc.issuerRecord]);

  // The same handshake as a new license, checked against the license's own issuing record.
  useEffect(() => {
    if (!h || h.approveTx) return;
    let active = true;
    const tick = async () => {
      if (checking.current) return;
      checking.current = true;
      try {
        if (h.askedAt && oc.commitment && oc.issuerRecord) {
          const p = await pendingTransferNow(oc.commitment, oc.issuerRecord);
          if (active) setProposed(p);
          return;
        }
        if (h.commitment) return;
        const inv = await getInvite(h.inviteId);
        if (!active || !inv) return;
        if (inv.commitHash && !h.issuerNonce) {
          const { newPartyKey } = await import('../../veilcore/deal');
          const k = newPartyKey();
          setOnChain(license.id, (c) => ({
            ...c!,
            handOn: { ...c!.handOn!, issuerNonce: k.public, partySecret: k.secret, commitHash: inv.commitHash! },
          }));
          await postNonce(h.inviteId, k.public, h.issuerToken);
          return;
        }
        if (h.issuerNonce && !inv.issuerNonce) {
          await postNonce(h.inviteId, h.issuerNonce, h.issuerToken);
          return;
        }
        if (h.issuerNonce && inv.issuerNonce && inv.issuerNonce !== h.issuerNonce) {
          setError('The registry shows a different answer than this page gave. Cancel this hand-on and start again.');
          return;
        }
        if (inv.commitment && inv.issuerRecord && inv.licenseeNonce && h.commitHash) {
          const matches = (await commitHashOf(inv.commitment, inv.issuerRecord, inv.licenseeNonce)) === h.commitHash;
          if (!active) return;
          if (!matches || inv.issuerRecord !== oc.issuerRecord) {
            setError(
              matches
                ? 'Their answer names a different record than this license’s. Cancel this hand-on and start again.'
                : 'Their answer doesn’t match what they first sent. Cancel this hand-on and start again.',
            );
            return;
          }
          if ((await licenseStatusNow(inv.commitment, oc.issuerRecord)) !== 'none') {
            if (active)
              setError('Their answer names a license that already exists. Cancel this hand-on and start again.');
            return;
          }
          setOnChain(license.id, (c) => ({
            ...c!,
            handOn: { ...c!.handOn!, commitment: inv.commitment!, licenseeNonce: inv.licenseeNonce! },
          }));
        }
      } catch {
        /* the next tick tries again */
      } finally {
        checking.current = false;
      }
    };
    void tick();
    const t = setInterval(() => void tick(), POLL_MS);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [h, oc.commitment, oc.issuerRecord, license.id]);

  const start = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const inv = await createInvite(oc.identity, label);
      setOnChain(license.id, (c) => ({
        ...c!,
        handOn: {
          inviteId: inv.inviteId,
          acceptToken: inv.acceptToken,
          issuerToken: inv.issuerToken,
          label: label.trim(),
          invitedAt: Date.now(),
        },
      }));
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setError(undefined);
    setCodeChecked(false);
    setProposed(undefined);
    setOnChain(license.id, (c) => {
      const { handOn: _gone, ...rest } = c!;
      return rest;
    });
  };

  /** After the code: the terms to the new holder, then the signed 'handon' to the current one. */
  const send = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const np = newHolderParty(oc);
      if (!np || !h?.commitment) throw new Error('They have not answered yet.');
      if (!license.agreementSalt) throw new Error('This agreement was drawn up before agreements had a salt.');
      const { say } = await import('../../veilcore/deal-client');
      if (!h.termsSentAt) {
        await say(np, {
          type: 'terms',
          agreementType: license.type,
          terms: JSON.parse(JSON.stringify(license.terms)) as Record<string, unknown>,
          recordFingerprint: license.recordFingerprint,
          agreementSalt: license.agreementSalt,
          agreementFingerprint: license.agreementFingerprint,
        });
        setOnChain(license.id, (c) => ({ ...c!, handOn: { ...c!.handOn!, termsSentAt: Date.now() } }));
      }
      await say(party, { type: 'handon', newLicense: h.commitment, to: h.label });
      setOnChain(license.id, (c) => ({ ...c!, handOn: { ...c!.handOn!, askedAt: Date.now() } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const approve = () =>
    call.run(async (progress) => {
      if (!h?.commitment || !oc.commitment || !oc.issuerRecord) throw new Error('Nothing to approve yet.');
      // Read again just before sending: it must still be the one checked by code.
      if ((await pendingTransferNow(oc.commitment, oc.issuerRecord)) !== h.commitment)
        throw new Error('The current holder has not handed it on to the person you checked. Nothing was sent.');
      const { approveTransferOnChain } = await import('../../veilcore/chain/actions');
      const r = await approveTransferOnChain(hexBytes(recordSecret), oc.commitment, oc.issuerRecord, h.commitment, {
        progress,
      });
      // Kept at once: the approval went through; the deal is now with the new holder.
      setOnChain(license.id, (c) => ({ ...c!, handOn: { ...c!.handOn!, approveTx: r.txId } }));
      setOnChain(license.id, (c) => afterHandOn(c!, r.txId, r.blockTime ?? Date.now()));
      onToast(`Handed on. The license is now ${h.label}’s.`);
      return r;
    });

  const copy = async (link: string) => {
    await navigator.clipboard.writeText(link);
    onToast('Link copied.');
  };

  if (!h) {
    return (
      <Stack spacing={1.25} data-hand-on="">
        {asked && (
          <Alert severity="warning" variant="outlined">
            They ask to hand this license on to <b>{asked.to}</b>
            {asked.note ? `: “${asked.note}”` : '.'} It moves only if you agree: start below, or ignore it.
          </Alert>
        )}
        {!open ? (
          <Button
            variant={asked ? 'contained' : 'text'}
            disabled={blocked}
            onClick={() => {
              setLabel(asked?.to ?? '');
              setOpen(true);
            }}
            sx={{ alignSelf: 'flex-start' }}
          >
            Hand this license on to someone new
          </Button>
        ) : (
          <Stack spacing={1.25}>
            <TextField
              label="Who is it going to? (they'll see this)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" disabled={busy || !label.trim()} onClick={() => void start()}>
                Make a link for them
              </Button>
              <Button color="inherit" onClick={() => setOpen(false)}>
                Not now
              </Button>
            </Stack>
            <HowItWorks>
              The license moves to the new holder on the same terms, keeping its place on Midnight. It takes all three
              of you: the new holder accepts with their own key and reads you a code, the current holder hands it on,
              and you approve it. Nobody can move it alone, you included. The current holder&apos;s royalty history
              stays with this license.
            </HowItWorks>
          </Stack>
        )}
        {error && (
          <Alert severity="error" variant="outlined">
            {error}
          </Alert>
        )}
      </Stack>
    );
  }

  const link = canonicalUrl(handOnPath(h.inviteId, h.acceptToken, oc.issuerRecord!));
  const holder = oc.label || 'the current holder';
  const wrongProposal = Boolean(proposed && proposed !== h.commitment);

  return (
    <Stack spacing={1.5} data-hand-on="">
      <Typography variant="subtitle2">Handing this license on to {h.label}</Typography>
      <DealSteps steps={issuerHandOnSteps(h, { proposed: proposed === h.commitment })}>
        {!h.commitment && (
          <Stack spacing={1.25}>
            <Typography variant="body2">
              {h.issuerNonce
                ? `${h.label} accepted. Finishing on their device: this takes a few seconds while their page is open.`
                : `Send this link to ${h.label}. This page moves on by itself when they accept.`}
            </Typography>
            <TextField
              label="Their link"
              value={link}
              size="small"
              fullWidth
              slotProps={{ input: { readOnly: true } }}
            />
            <Button
              variant="contained"
              startIcon={<ContentCopyIcon />}
              onClick={() => void copy(link)}
              sx={{ alignSelf: 'flex-start' }}
            >
              Copy link
            </Button>
          </Stack>
        )}

        {h.commitment && !h.askedAt && (
          <Stack spacing={1.25}>
            <Typography variant="body2">
              Call {h.label} or meet up. Their screen shows a code. It must be this one:
            </Typography>
            <Typography
              data-license-code=""
              sx={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 700, letterSpacing: '0.15em' }}
            >
              {code ?? '…'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              A different code means someone else answered your link: cancel and start again.
            </Typography>
            <FormControlLabel
              control={<Checkbox checked={codeChecked} onChange={(e) => setCodeChecked(e.target.checked)} />}
              label="They read me this same code"
            />
            <Button
              variant="contained"
              size="large"
              disabled={blocked || busy || !codeChecked || !code}
              onClick={() => void send()}
              sx={{ alignSelf: 'flex-start' }}
            >
              Send them the terms, and ask {holder} to hand it on
            </Button>
          </Stack>
        )}

        {h.askedAt && proposed !== h.commitment && (
          <Typography variant="body2">
            Waiting for {holder} to hand it on from their page, and for {h.label} to agree to the terms. This page reads
            the chain itself and moves on when they do.
          </Typography>
        )}

        {h.askedAt && proposed === h.commitment && (
          <Stack spacing={1.25}>
            <Typography variant="body2">
              {holder} handed it on to {h.label}, the person who read you the code (checked on chain). Approve it to
              finish: from then on the license is {h.label}&apos;s.
            </Typography>
            <Button
              variant="contained"
              size="large"
              disabled={blocked || call.busy}
              onClick={() => void approve()}
              sx={{ alignSelf: 'flex-start' }}
            >
              Approve the hand-on
            </Button>
          </Stack>
        )}
      </DealSteps>

      {wrongProposal && (
        <Alert severity="error" variant="outlined">
          {holder} proposed handing it to someone other than the person who read you the code. Don&apos;t approve: this
          page won&apos;t. Ask them to withdraw it.
        </Alert>
      )}
      {error && (
        <Alert severity="error" variant="outlined">
          {error}
        </Alert>
      )}
      <ConfirmInline
        label="Cancel the hand-on"
        question={`Stop handing this license on to ${h.label}? The license stays with ${holder}.`}
        confirmLabel="Yes, cancel it"
        disabled={call.busy}
        onConfirm={cancel}
      />
      <ChainStatusLine busy={call.busy} progress={call.progress} error={call.error} step="agreement" />
    </Stack>
  );
};
