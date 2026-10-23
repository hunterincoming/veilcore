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
            onToast('They activated it. The license is live on chain.');
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
              onToast(`Handed on: the license is now ${oc.handOn.label}’s.`);
              return;
            }
          }
          if (status === 'none' && (issued || live)) {
            setOnChain(license.id, (c) => ({ ...c!, goneSeenAt: Date.now(), revokedAt: c!.revokedAt ?? Date.now() }));
            onToast('This license is no longer on chain: it was revoked or cancelled.');
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
          setError(
            'The registry shows a different answer than this page gave. Don’t issue: start over with a new link.',
          );
          return;
        }
        // They revealed: it must be what they committed to, and name this record's own head now.
        if (inv.commitment && inv.issuerRecord && inv.licenseeNonce && oc.commitHash) {
          const matches = (await commitHashOf(inv.commitment, inv.issuerRecord, inv.licenseeNonce)) === oc.commitHash;
          const head = await headNow(oc.identity);
          if (!active) return;
          if (!matches || inv.issuerRecord !== head) {
            setError(
              matches
                ? 'Their answer names a different record, or an older key of this one. Don’t issue it: start over with a new link.'
                : 'Their answer doesn’t match what they first sent. Don’t issue it: start over with a new link.',
            );
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
  }, [oc, gone, issued, live, license.id, onToast]);

  if (!keys?.anchor) {
    return (
      <Alert severity="info" variant="outlined">
        To license this record for real, first set up proof you hold it on its page. The license is issued from the
        record&apos;s own key.{' '}
        <RouterLink to={`/record/${encodeURIComponent(license.recordId)}`}>Open the record</RouterLink>
      </Alert>
    );
  }

  const link = oc ? canonicalUrl(invitePath(oc.inviteId, oc.acceptToken)) : '';
  const copy = async () => {
    await navigator.clipboard.writeText(link);
    onToast('Link copied.');
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
      if (!oc?.commitment || !oc.issuerRecord) throw new Error('They have not accepted yet.');
      // Again just before sending: a key change since their answer would strand it.
      if ((await headNow(oc.identity)) !== oc.issuerRecord)
        throw new Error('This record’s key changed since they accepted. Nothing was sent: start over with a new link.');
      // The terms go to them first, over the deal's own channel: they read them before they
      // activate, and their signed agreement comes back the same way.
      if (!oc.termsSentAt) {
        if (!oc.partySecret || !oc.licenseeNonce)
          throw new Error('This link was made before private messages. Start over with a new link.');
        if (!license.agreementSalt)
          throw new Error('This agreement was drawn up before agreements had a salt. Make a fresh one.');
        progress('Sending them the terms…');
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
      if (!oc?.commitment || !oc.issuerRecord) throw new Error('Nothing to revoke on chain.');
      const wasActive = (await licenseStatusNow(oc.commitment, oc.issuerRecord)) === 'ACTIVE';
      if (wasActive && !meantLive)
        throw new Error(
          'They activated it a moment ago, so it is live now. Nothing was sent. Revoke it below if you mean to.',
        );
      const { revokeLicenseOnChain } = await import('../../veilcore/chain/actions');
      const r = await revokeLicenseOnChain(hexBytes(keys.recordSecret), oc.commitment, oc.issuerRecord, { progress });
      setOnChain(license.id, (c) => ({ ...c!, revokeTx: r.txId, revokedAt: r.blockTime ?? Date.now() }));
      revokeLicense(license.id, wasActive ? reason || 'No reason given' : 'Cancelled before it was activated');
      return r;
    });

  // A post that didn't reach the registry after the issue landed: send it again (same transaction).
  const repost = () =>
    oc?.issueTx && void postIssued(oc.inviteId, oc.issueTx, oc.issuerToken).then(() => onToast('Sent again.'));

  const startOverButton = (
    <Button variant="text" color="inherit" onClick={startOver}>
      Start over with a new link
    </Button>
  );

  const steps = issuerSteps({ linkMade: !!oc, accepted: !!oc?.commitment, issued, live });
  const who = oc?.label || label.trim() || 'them';

  return (
    <Stack spacing={1.5}>
      {!live && !gone && (
        <DealSteps steps={steps}>
          {!oc && (
            <Stack spacing={1.25}>
              <TextField
                label="Who is it for? (they'll see this)"
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
                Make a link for them
              </Button>
              <HowItWorks>
                A real license takes both of you. You send a link; they accept on their own phone or computer, and their
                own key is made there. You read each other a 6-digit code, you issue it, they agree and activate it, and
                it is on Midnight with both keys. VeilCore pays the network fee and never sees the terms.
              </HowItWorks>
            </Stack>
          )}

          {oc && !oc.commitment && (
            <Stack spacing={1.25}>
              <Typography variant="body2">
                {oc.issuerNonce
                  ? `${who} accepted. Finishing on their device: this takes a few seconds while their page is open.`
                  : `Send this link to ${who}: text or email. This page moves on by itself when they accept.`}
              </Typography>
              <TextField
                label="Their link"
                value={link}
                fullWidth
                size="small"
                slotProps={{ input: { readOnly: true } }}
              />
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={() => void copy()}>
                  Copy link
                </Button>
                {startOverButton}
              </Stack>
            </Stack>
          )}

          {oc?.commitment && !issued && (
            <Stack spacing={1.25}>
              <Typography variant="body2">
                Call {who} or meet up. Their screen shows a code. It must be this one:
              </Typography>
              <Typography
                data-license-code=""
                sx={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 700, letterSpacing: '0.15em' }}
              >
                {code ?? '…'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                A different code means someone else answered your link: don&apos;t issue, start over.
              </Typography>
              <FormControlLabel
                control={<Checkbox checked={codeChecked} onChange={(e) => setCodeChecked(e.target.checked)} />}
                label="They read me this same code"
              />
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  disabled={blocked || call.busy || !codeChecked || !code}
                  onClick={() => void issue()}
                >
                  Issue it
                </Button>
                {startOverButton}
              </Stack>
            </Stack>
          )}

          {oc && issued && !live && (
            <Stack spacing={1.25}>
              <Typography variant="body2">
                Issued on Midnight. Waiting for {who} to read the terms, agree and activate it: their link shows them
                how. This page reads the chain itself and moves on when they do.
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => void copy()}>
                  Copy their link again
                </Button>
                {oc.issueTx && (
                  <Button variant="text" onClick={repost}>
                    They don&apos;t see it? Send it again
                  </Button>
                )}
              </Stack>
              <ConfirmInline
                label="Cancel it"
                question="Cancel this license? They won’t be able to activate it. This goes on Midnight and can’t be undone."
                confirmLabel="Yes, cancel it"
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
              Save backup
            </Button>
          }
        >
          Save a new backup: it now holds this license&apos;s key. Without it you can&apos;t read their statements on
          another device.
        </Alert>
      )}

      {live && oc && (
        <>
          <Alert severity="success" variant="outlined" data-license-live="">
            Live on Midnight since {new Date(oc.activatedAt ?? Date.now()).toLocaleDateString()}.
            {agreed && ` They agreed to these terms on ${new Date(agreed.at).toLocaleDateString()}.`}
          </Alert>
          <HowItWorks label="What “live” means">
            Issued from this record and activated with the key of whoever accepted your link and read you the code. They
            can prove they hold a live license from this record without showing which one. On chain it stays live until
            you revoke it, whatever end date the terms say.
          </HowItWorks>
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
                    .then(() => onToast('Lender pack downloaded.'))
                    .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
                    .finally(() => setBusy(false));
                }}
                sx={{ alignSelf: 'flex-start' }}
              >
                Download a pack for a lender or buyer
              </Button>
              <HowItWorks label="What’s in the pack">
                This license&apos;s royalty history as both of you signed it, with a summary and plain instructions. A
                lender checks it with a free open tool, no account, nothing from VeilCore. It shows what the licensee
                signed, which a spreadsheet can&apos;t. It can&apos;t show the licensee is a real separate person, so
                the pack tells the lender to confirm that with them. Share it only with someone you trust with the
                terms.
              </HowItWorks>
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
            label="Revoke on chain"
            question="Revoke this license? It stops being live on Midnight for everyone who checks it. This can’t be undone."
            confirmLabel="Yes, revoke it"
            reason="Reason (kept with your copy of the license)"
            disabled={blocked || call.busy}
            onConfirm={(r) => void revoke(r, true)}
          />
        </>
      )}

      {gone && (
        <Alert severity="error" variant="outlined">
          No longer on Midnight
          {oc?.revokedAt ? `: revoked or cancelled on ${new Date(oc.revokedAt).toLocaleDateString()}` : ''}.
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
