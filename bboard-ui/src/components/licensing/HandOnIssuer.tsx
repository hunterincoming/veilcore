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
import { useDeal, type DealEntry, type DealParty } from '../../veilcore/deal-client';
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
import { rich, useT } from '../../i18n/app';

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
  const tr = useT();
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
  // The new holder's signed agreement to exactly these terms: no approval without it, or the
  // license would go live for someone who never agreed and whose page then has no terms.
  const newHolder = useDeal(h?.termsSentAt ? newHolderParty(oc) : undefined, POLL_MS);
  const agreedBy = (es: readonly DealEntry[] | undefined) =>
    !!es?.some((e) => e.type === 'agree' && !e.mine && e.agreementFingerprint === license.agreementFingerprint);
  const agreed = agreedBy(newHolder.entries);

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
          setError(tr.t('app.lic.hi.errNonce'));
          return;
        }
        if (inv.commitment && inv.issuerRecord && inv.licenseeNonce && h.commitHash) {
          const matches = (await commitHashOf(inv.commitment, inv.issuerRecord, inv.licenseeNonce)) === h.commitHash;
          if (!active) return;
          if (!matches || inv.issuerRecord !== oc.issuerRecord) {
            setError(matches ? tr.t('app.lic.hi.errRecord') : tr.t('app.lic.hi.errCommit'));
            return;
          }
          if ((await licenseStatusNow(inv.commitment, oc.issuerRecord)) !== 'none') {
            if (active) setError(tr.t('app.lic.hi.errExists'));
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
  }, [h, oc.commitment, oc.issuerRecord, license.id, tr]);

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

  const cancel = async () => {
    setError(undefined);
    // Tell the current holder, so their page stops offering it. If this can't be sent, the
    // hand-on still can't complete: only the licensor approves, and only this commitment.
    if (h?.askedAt && h.commitment) {
      try {
        const { say } = await import('../../veilcore/deal-client');
        await say(party, { type: 'handon-off', newLicense: h.commitment });
      } catch {
        /* best effort */
      }
    }
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
      if (!np || !h?.commitment) throw new Error(tr.t('app.lic.hi.notAnswered'));
      if (!license.agreementSalt) throw new Error(tr.t('app.lic.real.noSalt'));
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
      if (!h?.commitment || !oc.commitment || !oc.issuerRecord) throw new Error(tr.t('app.lic.hi.nothing'));
      const np = newHolderParty(oc);
      const { readAll } = await import('../../veilcore/deal-client');
      if (!np || !agreedBy(await readAll(np))) throw new Error(tr.t('app.lic.hi.notAgreed', { name: h.label }));
      // Read again just before sending: it must still be the one checked by code.
      if ((await pendingTransferNow(oc.commitment, oc.issuerRecord)) !== h.commitment)
        throw new Error(tr.t('app.lic.hi.notProposed'));
      const { approveTransferOnChain } = await import('../../veilcore/chain/actions');
      const r = await approveTransferOnChain(hexBytes(recordSecret), oc.commitment, oc.issuerRecord, h.commitment, {
        progress,
      });
      // Kept at once: the approval went through; the deal is now with the new holder.
      setOnChain(license.id, (c) => ({ ...c!, handOn: { ...c!.handOn!, approveTx: r.txId } }));
      setOnChain(license.id, (c) => afterHandOn(c!, r.txId, r.blockTime ?? Date.now()));
      onToast(tr.t('app.lic.hi.done', { name: h.label }));
      return r;
    });

  const copy = async (link: string) => {
    await navigator.clipboard.writeText(link);
    onToast(tr.t('app.lic.detail.copied'));
  };

  if (!h) {
    return (
      <Stack spacing={1.25} data-hand-on="">
        {asked && (
          <Alert severity="warning" variant="outlined">
            {rich(
              asked.note ? tr.t('app.lic.hi.askedNote') : tr.t('app.lic.hi.asked'),
              { b: (c) => <b>{c}</b> },
              { to: asked.to, note: asked.note ?? '' },
            )}
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
            {tr.t('app.lic.hi.start')}
          </Button>
        ) : (
          <Stack spacing={1.25}>
            <TextField
              label={tr.t('app.lic.hi.whoTo')}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" disabled={busy || !label.trim()} onClick={() => void start()}>
                {tr.t('app.lic.proof.make')}
              </Button>
              <Button color="inherit" onClick={() => setOpen(false)}>
                {tr.t('app.lic.hi.notNow')}
              </Button>
            </Stack>
            <HowItWorks>{tr.t('app.lic.hi.how')}</HowItWorks>
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
  const holder = oc.label || tr.t('app.lic.hi.currentHolder');
  const wrongProposal = Boolean(proposed && proposed !== h.commitment);

  return (
    <Stack spacing={1.5} data-hand-on="">
      <Typography variant="subtitle2">{tr.t('app.lic.hi.title', { name: h.label })}</Typography>
      <DealSteps steps={issuerHandOnSteps(h, { proposed: proposed === h.commitment, agreed }, tr)}>
        {!h.commitment && (
          <Stack spacing={1.25}>
            <Typography variant="body2">
              {h.issuerNonce
                ? tr.t('app.lic.real.accepted', { who: h.label })
                : tr.t('app.lic.hi.sendLink', { who: h.label })}
            </Typography>
            <TextField
              label={tr.t('app.lic.real.theirLink')}
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
              {tr.t('app.lic.detail.copyLink')}
            </Button>
          </Stack>
        )}

        {h.commitment && !h.askedAt && (
          <Stack spacing={1.25}>
            <Typography variant="body2">{tr.t('app.lic.real.callThem', { who: h.label })}</Typography>
            <Typography
              data-license-code=""
              sx={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 700, letterSpacing: '0.15em' }}
            >
              {code ?? '…'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tr.t('app.lic.hi.differentCode')}
            </Typography>
            <FormControlLabel
              control={<Checkbox checked={codeChecked} onChange={(e) => setCodeChecked(e.target.checked)} />}
              label={tr.t('app.lic.real.sameCode')}
            />
            <Button
              variant="contained"
              size="large"
              disabled={blocked || busy || !codeChecked || !code}
              onClick={() => void send()}
              sx={{ alignSelf: 'flex-start' }}
            >
              {tr.t('app.lic.hi.send', { holder })}
            </Button>
          </Stack>
        )}

        {h.askedAt && (proposed !== h.commitment || !agreed) && (
          <Typography variant="body2">{tr.t('app.lic.hi.waiting', { holder, name: h.label })}</Typography>
        )}

        {h.askedAt && proposed === h.commitment && agreed && (
          <Stack spacing={1.25}>
            <Typography variant="body2">{tr.t('app.lic.hi.ready', { holder, name: h.label })}</Typography>
            <Button
              variant="contained"
              size="large"
              disabled={blocked || call.busy}
              onClick={() => void approve()}
              sx={{ alignSelf: 'flex-start' }}
            >
              {tr.t('app.lic.hi.approve')}
            </Button>
          </Stack>
        )}
      </DealSteps>

      {wrongProposal && (
        <Alert severity="error" variant="outlined">
          {tr.t('app.lic.hi.wrong', { holder })}
        </Alert>
      )}
      {error && (
        <Alert severity="error" variant="outlined">
          {error}
        </Alert>
      )}
      <ConfirmInline
        label={tr.t('app.lic.hi.cancel')}
        question={tr.t('app.lic.hi.cancelQ', { name: h.label, holder })}
        confirmLabel={tr.t('app.lic.real.cancelYes')}
        disabled={call.busy}
        onConfirm={() => void cancel()}
      />
      <ChainStatusLine busy={call.busy} progress={call.progress} error={call.error} step="agreement" />
    </Stack>
  );
};
