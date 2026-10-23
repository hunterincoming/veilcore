// The current holder's side of handing a license on (veilcore/hand-on.ts): ask the licensor,
// then, once the licensor has checked the new holder by code and signed who it is, hand it
// on (proposeTransfer) or take that back before they approve it (withdrawTransfer).
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { hexBytes } from '../../veilcore/record-keys';
import { updateHeldLicense, type HeldLicense } from '../../veilcore/held-licenses';
import type { DealEntry, DealParty } from '../../veilcore/deal-client';
import { handOnOffered } from '../../veilcore/hand-on';
import { pendingTransferNow } from '../../veilcore/license-invites';
import { useChainCall } from '../chain/useChainCall';
import { ChainStatusLine } from '../chain/ChainStatusLine';
import type { ChainReceipt } from '../../veilcore/chain/actions';
import { ConfirmInline, HowItWorks } from './DealSteps';

const POLL_MS = 15_000;

export const HandOnHolder: React.FC<{
  held: HeldLicense;
  party: DealParty;
  entries: readonly DealEntry[] | undefined;
  refresh: () => void;
}> = ({ held, party, entries, refresh }) => {
  const offer = handOnOffered(entries);
  const mineAsked = [...(entries ?? [])]
    .filter((e) => e.type === 'handon-ask' && e.mine)
    .sort((a, b) => b.at - a.at)[0] as (DealEntry & { to?: string }) | undefined;
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  /** What the chain shows this license is proposed to move to, if anything. */
  const [pending, setPending] = useState<string | null>();
  const call = useChainCall<ChainReceipt>();

  useEffect(() => {
    let on = true;
    const read = () =>
      void pendingTransferNow(held.commitment, held.issuerRecord)
        .then((p) => on && setPending(p ?? null))
        .catch(() => undefined);
    read();
    const t = setInterval(read, POLL_MS);
    return () => {
      on = false;
      clearInterval(t);
    };
  }, [held.commitment, held.issuerRecord, held.handOnTx]);

  const ask = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const { say } = await import('../../veilcore/deal-client');
      await say(party, { type: 'handon-ask', to: to.trim(), ...(note.trim() ? { note: note.trim() } : {}) });
      setOpen(false);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handOn = () =>
    call.run(async (progress) => {
      if (!offer) throw new Error('They have not named the new holder yet.');
      const { proposeTransferOnChain } = await import('../../veilcore/chain/actions');
      const r = await proposeTransferOnChain(hexBytes(held.secret), held.issuerRecord, offer.newLicense, { progress });
      updateHeldLicense(held.inviteId, (h) => ({
        ...h,
        handOnTx: r.txId,
        handOnTo: offer.to,
        handOnCommitment: offer.newLicense,
      }));
      setPending(offer.newLicense);
      return r;
    });

  const withdraw = () =>
    call.run(async (progress) => {
      const { withdrawTransferOnChain } = await import('../../veilcore/chain/actions');
      const r = await withdrawTransferOnChain(hexBytes(held.secret), held.issuerRecord, { progress });
      updateHeldLicense(held.inviteId, (h) => {
        const { handOnTx: _t, handOnTo: _to, handOnCommitment: _c, ...rest } = h;
        return rest;
      });
      setPending(null);
      return r;
    });

  // Proposed on chain (from here, or from another device with this backup).
  if (pending) {
    const toWhom = pending === offer?.newLicense ? offer.to : held.handOnTo;
    return (
      <Stack spacing={1.25} data-hand-on-holder="proposed">
        <Alert severity="info" variant="outlined">
          You handed this license on{toWhom ? ` to ${toWhom}` : ''}. It is still yours until the licensor approves it;
          then it is theirs and stops being yours.
        </Alert>
        <ConfirmInline
          label="Take it back"
          question="Withdraw handing it on? It stays yours. This goes on Midnight."
          confirmLabel="Yes, withdraw"
          disabled={call.busy}
          onConfirm={() => void withdraw()}
        />
        <ChainStatusLine busy={call.busy} progress={call.progress} error={call.error} step="agreement" />
      </Stack>
    );
  }

  if (offer) {
    return (
      <Stack spacing={1.25} data-hand-on-holder="offered">
        <Alert severity="warning" variant="outlined">
          The licensor set up handing this license on to <b>{offer.to}</b> and checked them by code. If you agreed to
          this, hand it on. Once they approve it, it is {offer.to}&apos;s and no longer yours. Your royalty history
          stays with the license.
        </Alert>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          <ConfirmInline
            label={`Hand it on to ${offer.to}`}
            question={`Hand this license on to ${offer.to}? This goes on Midnight. You can take it back until the licensor approves it.`}
            confirmLabel="Yes, hand it on"
            disabled={call.busy}
            onConfirm={() => void handOn()}
          />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Didn&apos;t agree to this? Do nothing: it can&apos;t move without you.
        </Typography>
        <ChainStatusLine busy={call.busy} progress={call.progress} error={call.error} step="agreement" />
      </Stack>
    );
  }

  return (
    <Stack spacing={1.25} data-hand-on-holder="">
      {mineAsked && (
        <Typography variant="body2" color="text.secondary">
          You asked the licensor to hand this on to {mineAsked.to} ({new Date(mineAsked.at).toLocaleDateString()}).
          Waiting for them to start it.
        </Typography>
      )}
      {!open ? (
        <Button variant="text" onClick={() => setOpen(true)} sx={{ alignSelf: 'flex-start' }}>
          {mineAsked ? 'Ask again' : 'Hand this license on to someone else'}
        </Button>
      ) : (
        <Stack spacing={1.25}>
          <TextField
            label="Who to? (the licensor sees this)"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 80 } }}
          />
          <TextField
            label="Note for the licensor (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 300 } }}
          />
          <Stack direction="row" spacing={1.5}>
            <Button variant="contained" disabled={busy || !to.trim()} onClick={() => void ask()}>
              Ask the licensor
            </Button>
            <Button color="inherit" onClick={() => setOpen(false)}>
              Not now
            </Button>
          </Stack>
          <HowItWorks>
            A license moves only with the licensor&apos;s yes. They send the new holder a link and check them by a code
            read aloud; then you hand it on here and they approve it. Nobody can move it alone.
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
};
