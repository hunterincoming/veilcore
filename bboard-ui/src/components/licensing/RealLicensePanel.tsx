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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import { canonicalUrl } from '../../config/network';
import { hexBytes, useRecordKeys } from '../../veilcore/record-keys';
import {
  subjectOf,
  clearOnChain,
  issuerDealBackedUp,
  setOnChain,
  revokeLicense,
  type License,
} from '../../veilcore/licenses';
import { dealParty, sayOnce, useDeal } from '../../veilcore/deal-client';
import { RoyaltyLedger } from './RoyaltyLedger';
import { ledgerOf, noticeDayOf, paymentAlerts, revokedNoticeOf, type Report } from '../../veilcore/royalty-ledger';
import {
  dealNotices,
  holderNotices,
  registryGate,
  registryNow,
  syncGoneNotices,
  syncNotices,
} from '../../veilcore/license-notices';
import { utcDay } from '../../veilcore/royalty-terms';
import { getRecord } from '../../veilcore/records';
import { hasOffspringRoyalty, isControlledTerms } from '../../veilcore/royalty-terms';
import { OffspringRoyalty } from './OffspringRoyalty';
import { HandOnIssuer } from './HandOnIssuer';
import {
  commitHashOf,
  createInvite,
  getInvite,
  headNow,
  InviteOutcomeUnknown,
  inviteUnsure,
  setInviteUnsure,
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
import { DisclosureReceipt } from '../chain/DisclosureReceipt';

const POLL_MS = 8_000;

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
  /** The last invite may or may not have been made: another is made only when asked. */
  const [unsure, setUnsureHere] = useState(() => inviteUnsure(license.id));
  const setUnsure = (on: boolean) => {
    setInviteUnsure(license.id, on);
    setUnsureHere(on);
  };
  const sending = useRef(false);
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
  /** Whether the record's public check page says it was revoked for non-payment (the registry decides). */
  const [revokedPublic, setRevokedPublic] = useState<'shown' | 'not-shown'>();
  // Revoked for non-payment, as the deal's signed messages say (any device), not this browser.
  const revokedNotice = useMemo(
    () => (deal.entries ? revokedNoticeOf(ledgerOf(deal.entries)) : undefined),
    [deal.entries],
  );
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

  /** The licensor's signed word that the license was revoked for non-payment of `r`, dated by the chain. */
  const sayRevoked = async (r: Report, at: number): Promise<boolean> => {
    if (!party) return false;
    await sayOnce(party, {
      type: 'notice',
      kind: 'revoked',
      about: 'payment',
      periodFrom: r.statement.periodFrom,
      periodTo: r.statement.periodTo,
      statementSig: r.statement.signature,
      asOf: utcDay(new Date(at)),
      note: tr.t('app.rpay.revoke.note', { n: r.number }),
    });
    return true;
  };

  // Once the license is gone from the chain (revoked here, on another device, or by a plain
  // "Revoke"), the record's public check page says what the deal's signed messages say, worked
  // out the same way on every device (license-notices.ts dealNotices): the overdue lines come
  // off, and "revoked for non-payment" goes up only if the deal holds the licensor's signed
  // `revoked` notice. Run whenever this page opens with the license gone, so a lost answer, a
  // cleared browser or another device all end with the same public page.
  const dealRead = deal.entries !== undefined;
  const entriesKey = (deal.entries ?? []).map((e) => e.signature).join(',');
  useEffect(() => {
    if (!gone || !dealRead || !party || !oc) return;
    let on = true;
    void (async () => {
      const ledger = ledgerOf(deal.entries ?? []);
      // Revoked for non-payment here, but the signed notice saying so never landed: send it again
      // (the same notice, dated by the revocation's own time, never this moment; sayOnce never
      // sends two). Only this device knows to, and only while it knows when the revocation was.
      if (oc.revokedFor === 'non-payment' && oc.revokedForStatement && oc.revokedAt && !revokedNoticeOf(ledger)) {
        const r = ledger.reports.find((x) => x.statement.signature === oc.revokedForStatement);
        if (r) {
          const sent = await sayRevoked(r, oc.revokedAt).catch(() => false);
          if (sent && on) deal.refresh();
          return; // the page runs this again with the notice in the deal
        }
      }
      // "Revoked for non-payment" goes public only if the registry's own notice of breach, clock
      // and answers allow it (license-notices.ts dealNotices); it refuses otherwise anyway.
      // Nothing is sent without the registry's own view (license-notices.ts syncGoneNotices).
      const synced = await syncGoneNotices(license.recordId, ledger, party.mySecret);
      if (!synced) return;
      if (on && synced.outcome === 'ok')
        setRevokedPublic(synced.shown.some((n) => n.kind === 'revoked') ? 'shown' : 'not-shown');
    })();
    return () => {
      on = false;
    };
    // entriesKey stands for deal.entries: run again only when the deal's messages change.
  }, [gone, dealRead, entriesKey, oc?.revokedFor, oc?.revokedForStatement]);

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
    // One invite per tap: a second tap before the first answers makes nothing.
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError(undefined);
    setUnsure(false);
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
      if (e instanceof InviteOutcomeUnknown) setUnsure(true);
      else setError(e instanceof Error ? e.message : String(e));
    } finally {
      sending.current = false;
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

  /**
   * Revoke for non-payment of an overdue report (docs/royalty-pay.md, "Overdue, notice, cure,
   * revoke"): only once a notice of breach about it has been sent and its cure period has run out
   * with no "I paid" (royalty-ledger.ts paymentAlerts `revocable`, checked again here). The
   * revocation goes on Midnight first, the same as "Revoke"; only then the signed `revoked`
   * notice to the licensee, so it never says something the chain doesn't. The record's public
   * check page follows from that notice (the effect above).
   */
  const revokeForNonPayment = (r: Report) =>
    call.run(async (progress) => {
      if (!oc?.commitment || !oc.issuerRecord || !party) throw new Error(tr.t('app.lic.real.nothingToRevoke'));
      const now = ledgerOf(deal.entries ?? []);
      // Checked again against the registry, now: its date for the notice of breach and its clock,
      // never this device's (a device set to a later date offers nothing early).
      const had = await holderNotices(license.recordId);
      // A failed read says so: it is not a sign that the time to pay hasn't run out.
      if (!('view' in had)) throw new Error(tr.t('app.rpay.revoke.registryDown'));
      const view = had.view;
      const gate = registryGate(view);
      const alert = paymentAlerts(license.terms, now, utcDay(), undefined, undefined, gate).find(
        (a) => a.kind === 'overdue' && a.report.statement.signature === r.statement.signature,
      );
      if (!alert?.revocable) throw new Error(tr.t('app.rpay.revoke.notYet'));
      const { revokeLicenseOnChain } = await import('../../veilcore/chain/actions');
      const done = await revokeLicenseOnChain(hexBytes(keys.recordSecret), oc.commitment, oc.issuerRecord, {
        progress,
      });
      // Dated by the chain's block time, or else the registry's clock: never this device's date.
      const at = done.blockTime ?? registryNow(view);
      setOnChain(license.id, (c) => ({
        ...c!,
        revokeTx: done.txId,
        revokedAt: at,
        revokedFor: 'non-payment',
        revokedForStatement: r.statement.signature,
      }));
      revokeLicense(license.id, tr.t('app.rpay.revoke.reason'));
      // If this send doesn't land, the effect above sends it again when the page next opens.
      await sayRevoked(r, at).catch(() => undefined);
      deal.refresh();
      return done;
    });

  // A post that didn't reach the registry after the issue landed: send it again (same transaction).
  // It only posts the notice; their page also reads the chain itself.
  const repost = () => {
    if (!oc?.issueTx) return;
    setError(undefined);
    postIssued(oc.inviteId, oc.issueTx, oc.issuerToken)
      .then(() => onToast(tr.t('app.lic.real.sentAgain')))
      .catch((e: unknown) => {
        const error = e instanceof Error ? e.message : String(e);
        onToast(tr.t('app.lic.real.resendFailed', { error }));
        setError(tr.t('app.lic.real.resendFailed', { error }));
      });
  };

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
                disabled={blocked || busy || unsure || !label.trim()}
                onClick={() => void send()}
                sx={{ alignSelf: 'flex-start' }}
              >
                {tr.t('app.lic.proof.make')}
              </Button>
              {unsure && (
                <Alert
                  severity="warning"
                  variant="outlined"
                  data-invite-unsure=""
                  action={
                    <Button color="inherit" disabled={blocked || busy} onClick={() => void send()}>
                      {tr.t('app.lic.real.inviteAgain')}
                    </Button>
                  }
                >
                  {tr.t('app.lic.real.inviteUnsure')}
                </Alert>
              )}
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
              {!code && (
                <Typography variant="body2" color="text.secondary" role="status" data-code-making="">
                  {tr.t('app.lic.code.making')}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                {tr.t('app.lic.real.differentCode')}
              </Typography>
              <FormControlLabel
                control={<Checkbox checked={codeChecked} onChange={(e) => setCodeChecked(e.target.checked)} />}
                label={tr.t('app.lic.real.sameCode')}
              />
              <DisclosureReceipt circuits={['issueLicense']} />
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
                receipt={<DisclosureReceipt circuits={['revokeLicense']} dense />}
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
          {party &&
            oc.termsSentAt &&
            (license.type === 'license' ||
              (license.type === 'breeder-share' && hasOffspringRoyalty(license.terms))) && (
              <RoyaltyLedger
                party={party}
                side="issuer"
                terms={license.terms}
                agreementType={license.type}
                cannabis={isControlledTerms(license.terms, getRecord(license.recordId))}
                entries={deal.entries}
                refresh={deal.refresh}
                publicRecordId={license.recordId}
                onRevokeForNonPayment={(r) => void revokeForNonPayment(r)}
                revoking={blocked || call.busy}
                agreed={{
                  agreementType: license.type,
                  agreementFingerprint: license.agreementFingerprint,
                  notBefore: oc.termsSentAt,
                }}
              />
            )}
          {party && oc.termsSentAt && hasOffspringRoyalty(license.terms) && (
            <OffspringRoyalty
              side="issuer"
              party={party}
              entries={deal.entries}
              refresh={deal.refresh}
              terms={license.terms}
              obligation={license.agreementFingerprint}
              beneficiary={oc.identity}
              issuerSecret={keys.recordSecret}
              kind={subjectOf(license.terms)}
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
            receipt={<DisclosureReceipt circuits={['revokeLicense']} dense />}
            disabled={blocked || call.busy}
            onConfirm={(r) => void revoke(r, true)}
          />
        </>
      )}

      {gone && (
        <Alert
          severity="error"
          variant="outlined"
          data-license-gone={revokedNotice ? 'non-payment' : ''}
          {...(revokedNotice && revokedPublic ? { 'data-revoked-public': revokedPublic } : {})}
        >
          {revokedNotice
            ? [
                tr.t('app.rpay.revoke.done', { date: tr.date(`${noticeDayOf(revokedNotice)}T12:00:00Z`) }),
                revokedPublic === 'shown'
                  ? tr.t('app.rpay.revoke.public')
                  : revokedPublic === 'not-shown'
                    ? tr.t('app.rpay.revoke.notPublic')
                    : '',
              ]
                .filter(Boolean)
                .join(' ')
            : oc?.revokedAt
              ? tr.t('app.lic.real.goneOn', { date: tr.date(oc.revokedAt) })
              : tr.t('app.lic.real.gone')}
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
