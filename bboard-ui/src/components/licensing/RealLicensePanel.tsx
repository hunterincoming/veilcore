// The issuer's side of a real license on chain (license-invites.ts), in place of the
// practice issue button where this site sends transactions:
//   1. send the licensee a link (an invite on the registry);
//   2. they accept on their own device: their browser makes the license secret and commits to
//      it; this page answers with a random nonce (no tap needed); they reveal;
//   3. both read each other a 6-digit code made from all of that (the registry carries the
//      commitment and could swap it; the code can't be steered to match), then issue it on
//      chain from this record (VeilCore pays the fee);
//   4. they activate it from their device;
//   5. cancel it before it is activated, or revoke it after.
// The registry only carries messages. Every step is checked here against this record's OWN
// head read from the chain, and the license's state is read from the chain itself, so a lost
// save, a lost post or a junk post can't leave this page showing the wrong thing.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import { canonicalUrl } from '../../config/network';
import { hexBytes, useRecordKeys } from '../../veilcore/record-keys';
import {
  clearOnChain,
  issuerDealBackedUp,
  setOnChain,
  revokeLicense,
  type License,
  type OnChainLicense,
} from '../../veilcore/licenses';
import { useDeal, type DealParty } from '../../veilcore/deal-client';
import { RoyaltyLedger } from './RoyaltyLedger';
import { OffspringRoyalty } from './OffspringRoyalty';
import { HandOnIssuer } from './HandOnIssuer';
import {
  commitHashOf,
  createInvite,
  getInvite,
  headNow,
  invitePath,
  licenseCode,
  licenseStatusNow,
  postIssued,
  postNonce,
  verifyActivated,
} from '../../veilcore/license-invites';
import { useChainCall } from '../chain/useChainCall';
import { backupReturnTo } from '../flow/backup-return';
import { ConfirmInline, DealSteps, HowItWorks } from './DealSteps';
import { issuerSteps } from './steps';
import { ChainStatusLine } from '../chain/ChainStatusLine';
import type { ChainReceipt } from '../../veilcore/chain/actions';
import { useT } from '../../i18n/app';

const POLL_MS = 8_000;

/** The issuer's side of the deal's channel, once both keys and the license are known. */
export const dealParty = (oc: OnChainLicense): DealParty | undefined =>
  oc.partySecret && oc.licenseeNonce && oc.commitment && oc.issuerRecord
    ? {
        side: 'issuer',
        mySecret: oc.partySecret,
        theirPublic: oc.licenseeNonce,
        commitment: oc.commitment,
        issuerRecord: oc.issuerRecord,
        invite: { id: oc.inviteId, token: oc.issuerToken },
      }
    : undefined;
/** Once live: read the chain now and then, so a revoke from another device shows. */
const LIVE_POLL_MS = 60_000;

export const RealLicensePanel: React.FC<{ license: License; blocked: boolean; onToast: (m: string) => void }> = ({
  license,
  blocked,
  onToast,
}) => {
  const tr = useT();
  const keys = useRecordKeys()[license.recordId];
  const oc = license.onChain;
  const [label, setLabel] = useState(license.terms.licensee ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [codeChecked, setCodeChecked] = useState(false);
  const [code, setCode] = useState<string>();
  const call = useChainCall<ChainReceipt>();
  const checking = useRef(false);
  const party = oc ? dealParty(oc) : undefined;
  // The deal's channel, once the terms have gone: their agreement and royalties come back here.
  const deal = useDeal(oc?.termsSentAt ? party : undefined);
  const agreed = deal.entries?.find(
    (e) => e.type === 'agree' && !e.mine && e.agreementFingerprint === license.agreementFingerprint,
  );

  const gone = Boolean(oc?.revokeTx || oc?.goneSeenAt);
  const issued = Boolean(oc?.issueTx || oc?.issueSeenAt);
  const live = Boolean(oc && (oc.activateTx || oc.activeSeenAt) && !gone);

  // The code, made here from what this page kept: never from the registry's answer alone.
  useEffect(() => {
    let on = true;
    if (oc?.commitment && oc.issuerRecord && oc.licenseeNonce && oc.issuerNonce) {
      void licenseCode(oc.commitment, oc.issuerRecord, oc.licenseeNonce, oc.issuerNonce).then((c) => on && setCode(c));
    } else setCode(undefined);
    return () => {
      on = false;
    };
  }, [oc?.commitment, oc?.issuerRecord, oc?.licenseeNonce, oc?.issuerNonce]);

  useEffect(() => {
    if (!oc || gone) return;
    let active = true;
    const tick = async () => {
      if (checking.current) return;
      checking.current = true;
      try {
        // Once there is a commitment, the chain says how far it got, whatever was saved or posted.
        if (oc.commitment && oc.issuerRecord) {
          const status = await licenseStatusNow(oc.commitment, oc.issuerRecord);
          if (!active) return;
          if (status === 'ACTIVE' && !live) {
            setOnChain(license.id, (c) => ({
              ...c!,
              activeSeenAt: Date.now(),
              activatedAt: c!.activatedAt ?? Date.now(),
            }));
            onToast(tr.t('app.lic.real.toastLive'));
            return;
          }
          if (status === 'PENDING' && !issued) {
            setOnChain(license.id, (c) => ({ ...c!, issueSeenAt: Date.now() }));
            return;
          }
          // Gone because it was handed on (approved here or on another device): the license
          // is now the new holder's, not revoked.
          if (status === 'none' && live && oc.handOn?.commitment) {
            const moved = await licenseStatusNow(oc.handOn.commitment, oc.issuerRecord);
            if (!active) return;
            if (moved === 'ACTIVE') {
              const { afterHandOn } = await import('../../veilcore/hand-on');
              setOnChain(license.id, (c) => afterHandOn(c!, c!.handOn?.approveTx, Date.now()));
              onToast(tr.t('app.lic.real.toastHandedOn', { name: oc.handOn.label }));
              return;
            }
          }
          if (status === 'none' && (issued || live)) {
            setOnChain(license.id, (c) => ({ ...c!, goneSeenAt: Date.now(), revokedAt: c!.revokedAt ?? Date.now() }));
            onToast(tr.t('app.lic.real.toastGone'));
            return;
          }
          if (live && !oc.activateTx) {
            // A posted activation that checks out is kept, for the record.
            const inv = await getInvite(oc.inviteId).catch(() => undefined);
            if (active && inv?.activateTx) {
              const v = await verifyActivated(inv.activateTx, oc.commitment, oc.issuerRecord);
              if (active && v.ok) setOnChain(license.id, (c) => ({ ...c!, activateTx: inv.activateTx! }));
            }
          }
          return;
        }
        const inv = await getInvite(oc.inviteId);
        if (!active || !inv) return;
        // They committed: answer with a nonce, kept before it is posted and never replaced.
        if (inv.commitHash && !oc.issuerNonce) {
          // This side's key for the deal; its public half is the nonce the code is made with.
          const { newPartyKey } = await import('../../veilcore/deal');
          const party = newPartyKey();
          setOnChain(license.id, (c) => ({
            ...c!,
            issuerNonce: party.public,
            partySecret: party.secret,
            commitHash: inv.commitHash!,
          }));
          await postNonce(oc.inviteId, party.public, oc.issuerToken);
          return;
        }
        if (oc.issuerNonce && !inv.issuerNonce) {
          await postNonce(oc.inviteId, oc.issuerNonce, oc.issuerToken); // the first post didn't land
          return;
        }
        if (oc.issuerNonce && inv.issuerNonce && inv.issuerNonce !== oc.issuerNonce) {
          setError(tr.t('app.lic.real.errNonce'));
          return;
        }
        // They revealed: it must be what they committed to, and name this record's own head now.
        if (inv.commitment && inv.issuerRecord && inv.licenseeNonce && oc.commitHash) {
          const matches = (await commitHashOf(inv.commitment, inv.issuerRecord, inv.licenseeNonce)) === oc.commitHash;
          const head = await headNow(oc.identity);
          if (!active) return;
          if (!matches || inv.issuerRecord !== head) {
            setError(matches ? tr.t('app.lic.real.errRecord') : tr.t('app.lic.real.errCommit'));
            return;
          }
          setOnChain(license.id, (c) => ({
            ...c!,
            commitment: inv.commitment!,
            issuerRecord: head,
            licenseeNonce: inv.licenseeNonce!,
          }));
        }
      } catch {
        /* the next tick tries again */
      } finally {
        checking.current = false;
      }
    };
    void tick();
    const t = setInterval(() => void tick(), live ? LIVE_POLL_MS : POLL_MS);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [oc, gone, issued, live, license.id, onToast, tr]);

  if (!keys?.anchor) {
    return (
      <Alert severity="info" variant="outlined">
        {tr.t('app.lic.real.needAnchor')}{' '}
        <RouterLink to={`/record/${encodeURIComponent(license.recordId)}`}>
          {tr.t('app.lic.real.openRecord')}
        </RouterLink>
      </Alert>
    );
  }

  const link = oc ? canonicalUrl(invitePath(oc.inviteId, oc.acceptToken)) : '';
  const copy = async () => {
    await navigator.clipboard.writeText(link);
    onToast(tr.t('app.lic.detail.copied'));
  };

  const send = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const inv = await createInvite(keys.anchor!.identity, label);
      setOnChain(license.id, () => ({
        inviteId: inv.inviteId,
        acceptToken: inv.acceptToken,
        issuerToken: inv.issuerToken,
        identity: keys.anchor!.identity,
        label: label.trim(),
        invitedAt: Date.now(),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const startOver = () => {
    setError(undefined);
    setCodeChecked(false);
    try {
      clearOnChain(license.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const issue = () =>
    call.run(async (progress) => {
      if (!oc?.commitment || !oc.issuerRecord) throw new Error(tr.t('app.lic.real.notAccepted'));
      // Again just before sending: a key change since their answer would strand it.
      if ((await headNow(oc.identity)) !== oc.issuerRecord) throw new Error(tr.t('app.lic.real.keyChanged'));
      // The terms go to them first, over the deal's own channel: they read them before they
      // activate, and their signed agreement comes back the same way.
      if (!oc.termsSentAt) {
        if (!oc.partySecret || !oc.licenseeNonce) throw new Error(tr.t('app.lic.real.oldLink'));
        if (!license.agreementSalt) throw new Error(tr.t('app.lic.real.noSalt'));
        progress(tr.t('app.lic.real.sendingTerms'));
        const { say } = await import('../../veilcore/deal-client');
        await say(dealParty(oc)!, {
          type: 'terms',
          agreementType: license.type,
          terms: JSON.parse(JSON.stringify(license.terms)) as Record<string, unknown>,
          recordFingerprint: license.recordFingerprint,
          agreementSalt: license.agreementSalt,
          agreementFingerprint: license.agreementFingerprint,
        });
        setOnChain(license.id, (c) => ({ ...c!, termsSentAt: Date.now() }));
      }
      const { issueLicenseOnChain } = await import('../../veilcore/chain/actions');
      const r = await issueLicenseOnChain(hexBytes(keys.recordSecret), oc.commitment, { progress });
      // Kept before it is posted: a post that fails is sent again, never the transaction.
      setOnChain(license.id, (c) => ({ ...c!, issueTx: r.txId, issuedAt: r.blockTime ?? Date.now() }));
      await postIssued(oc.inviteId, r.txId, oc.issuerToken).catch(() => undefined);
      return r;
    });

  /**
   * Cancel (not activated yet) or revoke (live), confirmed on the page. The chain is read first:
   * if they activated it a moment ago, a cancel is not turned into a revoke without asking.
   */
  const revoke = (reason: string, meantLive: boolean) =>
    call.run(async (progress) => {
      if (!oc?.commitment || !oc.issuerRecord) throw new Error(tr.t('app.lic.real.nothingToRevoke'));
      const wasActive = (await licenseStatusNow(oc.commitment, oc.issuerRecord)) === 'ACTIVE';
      if (wasActive && !meantLive) throw new Error(tr.t('app.lic.real.justActivated'));
      const { revokeLicenseOnChain } = await import('../../veilcore/chain/actions');
      const r = await revokeLicenseOnChain(hexBytes(keys.recordSecret), oc.commitment, oc.issuerRecord, { progress });
      setOnChain(license.id, (c) => ({ ...c!, revokeTx: r.txId, revokedAt: r.blockTime ?? Date.now() }));
      revokeLicense(
        license.id,
        wasActive ? reason || tr.t('app.lic.detail.noReason') : tr.t('app.lic.real.cancelledBefore'),
      );
      return r;
    });

  // A post that didn't reach the registry after the issue landed: send it again (same transaction).
  const repost = () =>
    oc?.issueTx &&
    void postIssued(oc.inviteId, oc.issueTx, oc.issuerToken).then(() => onToast(tr.t('app.lic.real.sentAgain')));

  const startOverButton = (
    <Button variant="text" color="inherit" onClick={startOver}>
      {tr.t('app.lic.real.startOver')}
    </Button>
  );

  const steps = issuerSteps({ linkMade: !!oc, accepted: !!oc?.commitment, issued, live }, tr);
  const who = oc?.label || label.trim() || tr.t('app.lic.real.them');

  return (
    <Stack spacing={1.5}>
      {!live && !gone && (
        <DealSteps steps={steps}>
          {!oc && (
            <Stack spacing={1.25}>
              <TextField
                label={tr.t('app.lic.real.whoFor')}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                slotProps={{ htmlInput: { maxLength: 80 } }}
              />
              <Button
                variant="contained"
                size="large"
                disabled={blocked || busy || !label.trim()}
                onClick={() => void send()}
                sx={{ alignSelf: 'flex-start' }}
              >
                {tr.t('app.lic.proof.make')}
              </Button>
              <HowItWorks>{tr.t('app.lic.real.how')}</HowItWorks>
            </Stack>
          )}

          {oc && !oc.commitment && (
            <Stack spacing={1.25}>
              <Typography variant="body2">
                {oc.issuerNonce ? tr.t('app.lic.real.accepted', { who }) : tr.t('app.lic.real.sendLink', { who })}
              </Typography>
              <TextField
                label={tr.t('app.lic.real.theirLink')}
                value={link}
                fullWidth
                size="small"
                slotProps={{ input: { readOnly: true } }}
              />
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={() => void copy()}>
                  {tr.t('app.lic.detail.copyLink')}
                </Button>
                {startOverButton}
              </Stack>
            </Stack>
          )}

          {oc?.commitment && !issued && (
            <Stack spacing={1.25}>
              <Typography variant="body2">{tr.t('app.lic.real.callThem', { who })}</Typography>
              <Typography
                data-license-code=""
                sx={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 700, letterSpacing: '0.15em' }}
              >
                {code ?? '…'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {tr.t('app.lic.real.differentCode')}
              </Typography>
              <FormControlLabel
                control={<Checkbox checked={codeChecked} onChange={(e) => setCodeChecked(e.target.checked)} />}
                label={tr.t('app.lic.real.sameCode')}
              />
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  disabled={blocked || call.busy || !codeChecked || !code}
                  onClick={() => void issue()}
                >
                  {tr.t('app.lic.detail.issue')}
                </Button>
                {startOverButton}
              </Stack>
            </Stack>
          )}

          {oc && issued && !live && (
            <Stack spacing={1.25}>
              <Typography variant="body2">{tr.t('app.lic.real.issued', { who })}</Typography>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => void copy()}>
                  {tr.t('app.lic.real.copyAgain')}
                </Button>
                {oc.issueTx && (
                  <Button variant="text" onClick={repost}>
                    {tr.t('app.lic.real.resend')}
                  </Button>
                )}
              </Stack>
              <ConfirmInline
                label={tr.t('app.lic.real.cancel')}
                question={tr.t('app.lic.real.cancelQ')}
                confirmLabel={tr.t('app.lic.real.cancelYes')}
                disabled={blocked || call.busy}
                onConfirm={(r) => void revoke(r, false)}
              />
            </Stack>
          )}
        </DealSteps>
      )}

      {oc?.partySecret && !issuerDealBackedUp(license) && !gone && (
        <Alert
          severity="warning"
          variant="outlined"
          action={
            <Button
              component={RouterLink}
              to="/backup"
              onClick={() => backupReturnTo(window.location.pathname + window.location.hash)}
              color="inherit"
              variant="outlined"
            >
              {tr.t('app.lic.real.saveBackup')}
            </Button>
          }
        >
          {tr.t('app.lic.real.backupNow')}
        </Alert>
      )}

      {live && oc && (
        <>
          <Alert severity="success" variant="outlined" data-license-live="">
            {tr.t('app.lic.real.liveSince', { date: tr.date(oc.activatedAt ?? Date.now()) })}
            {agreed && ` ${tr.t('app.lic.real.agreedOn', { date: tr.date(agreed.at) })}`}
          </Alert>
          <HowItWorks label={tr.t('app.lic.real.liveMeans')}>{tr.t('app.lic.real.liveText')}</HowItWorks>
          {party && oc.termsSentAt && license.type === 'license' && (
            <RoyaltyLedger
              party={party}
              side="issuer"
              terms={license.terms}
              entries={deal.entries}
              refresh={deal.refresh}
              agreed={{
                agreementType: license.type,
                agreementFingerprint: license.agreementFingerprint,
                notBefore: oc.termsSentAt,
              }}
            />
          )}
          {party && oc.termsSentAt && (Number(license.terms.offspringRoyaltyPct) || 0) > 0 && (
            <OffspringRoyalty
              side="issuer"
              party={party}
              entries={deal.entries}
              refresh={deal.refresh}
              pct={license.terms.offspringRoyaltyPct ?? ''}
              obligation={license.agreementFingerprint}
              beneficiary={oc.identity}
              issuerSecret={keys.recordSecret}
            />
          )}
          {party && oc.termsSentAt && (
            <Stack spacing={0.75} data-lender-pack="">
              <Button
                variant="text"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setError(undefined);
                  void import('../../veilcore/lender-pack')
                    .then((m) => m.downloadLenderPack(license))
                    .then(() => onToast(tr.t('app.lic.real.packDone')))
                    .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
                    .finally(() => setBusy(false));
                }}
                sx={{ alignSelf: 'flex-start' }}
              >
                {tr.t('app.lic.real.pack')}
              </Button>
              <HowItWorks label={tr.t('app.lic.real.packWhat')}>{tr.t('app.lic.real.packText')}</HowItWorks>
            </Stack>
          )}
          {party && oc.termsSentAt && (
            <HandOnIssuer
              license={license}
              party={party}
              entries={deal.entries}
              recordSecret={keys.recordSecret}
              blocked={blocked}
              onToast={onToast}
            />
          )}
          <ConfirmInline
            label={tr.t('app.lic.real.revoke')}
            question={tr.t('app.lic.real.revokeQ')}
            confirmLabel={tr.t('app.lic.detail.revokeYes')}
            reason={tr.t('app.lic.real.revokeReason')}
            disabled={blocked || call.busy}
            onConfirm={(r) => void revoke(r, true)}
          />
        </>
      )}

      {gone && (
        <Alert severity="error" variant="outlined">
          {oc?.revokedAt ? tr.t('app.lic.real.goneOn', { date: tr.date(oc.revokedAt) }) : tr.t('app.lic.real.gone')}
        </Alert>
      )}

      {error && (
        <Alert severity="error" variant="outlined" action={!issued && oc ? startOverButton : undefined}>
          {error}
        </Alert>
      )}
      <ChainStatusLine busy={call.busy} progress={call.progress} error={call.error} step="agreement" />
    </Stack>
  );
};
