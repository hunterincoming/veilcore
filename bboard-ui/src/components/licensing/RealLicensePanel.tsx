// The issuer's side of a real license on chain (license-invites.ts), in place of the
// practice issue button where this site sends transactions:
//   1. send the licensee a link (an invite on the registry);
//   2. they accept on their own device: their browser makes the license secret and answers
//      with the commitment;
//   3. both read each other a short code made from the commitment (the registry carries it
//      and could swap it), then issue it on chain from this record (VeilCore pays the fee);
//   4. they activate it from their device; this page reads their transaction from the chain
//      and only then calls the license live;
//   5. revoke it on chain, if it comes to that.
// The registry only carries messages: every step the other side reports is checked here,
// against this record's OWN head read from the chain, never against what the registry says.
// An issued license that is never activated can be cancelled (the contract caps pending ones).
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import { canonicalUrl } from '../../config/network';
import { hexBytes, useRecordKeys } from '../../veilcore/record-keys';
import { setOnChain, revokeLicense, type License } from '../../veilcore/licenses';
import {
  commitmentCode,
  createInvite,
  getInvite,
  headNow,
  invitePath,
  licenseStatusNow,
  postIssued,
  verifyActivated,
} from '../../veilcore/license-invites';
import { useChainCall } from '../chain/useChainCall';
import { ChainStatusLine } from '../chain/ChainStatusLine';
import type { ChainReceipt } from '../../veilcore/chain/actions';

const POLL_MS = 8_000;

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
  const call = useChainCall<ChainReceipt>();
  const checking = useRef(false);

  // Waiting on the other side: read the invite, take what is new, check it on chain first.
  const live = Boolean(oc && (oc.activateTx || oc.activeSeenAt) && !oc.revokeTx);
  const waiting = oc && !oc.revokeTx && (!oc.commitment || (oc.issueTx && !live));
  useEffect(() => {
    if (!oc || !waiting) return;
    let active = true;
    const tick = async () => {
      if (checking.current) return;
      checking.current = true;
      try {
        const inv = await getInvite(oc.inviteId);
        if (!active || !inv) return;
        if (!oc.commitment && inv.commitment && inv.issuerRecord) {
          // Their answer must name this record's head now: issueLicense files it there, so an
          // answer naming any other record (or an old key of this one) could never be activated
          // here, and its "activation" would be someone else's license.
          const head = await headNow(oc.identity);
          if (!active) return;
          if (inv.issuerRecord !== head) {
            setError(
              'The answer to your link names a different record, or an older key of this one. Don’t issue it: make a new link.',
            );
            return;
          }
          setOnChain(license.id, (c) => ({ ...c!, commitment: inv.commitment!, issuerRecord: head }));
        } else if (oc.issueTx && !live && oc.commitment && oc.issuerRecord) {
          // The chain itself, not only the transaction they posted: a junk post can't stall it.
          if (inv.activateTx) {
            const v = await verifyActivated(inv.activateTx, oc.commitment, oc.issuerRecord);
            if (!active) return;
            if (v.ok) {
              setOnChain(license.id, (c) => ({
                ...c!,
                activateTx: inv.activateTx!,
                activatedAt: inv.activatedAt ?? Date.now(),
              }));
              onToast('They activated it. The license is live on chain.');
              return;
            }
          }
          if ((await licenseStatusNow(oc.commitment, oc.issuerRecord)) === 'ACTIVE' && active) {
            setOnChain(license.id, (c) => ({ ...c!, activeSeenAt: Date.now(), activatedAt: Date.now() }));
            onToast('They activated it. The license is live on chain.');
          }
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
  }, [oc, waiting, live, license.id, onToast]);

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

  const issue = () =>
    call.run(async (progress) => {
      if (!oc?.commitment || !oc.issuerRecord) throw new Error('They have not accepted yet.');
      // Again just before sending: a rotation since their answer would strand it.
      if ((await headNow(oc.identity)) !== oc.issuerRecord)
        throw new Error('This record’s key changed since they accepted. Nothing was sent: make a new link.');
      const { issueLicenseOnChain } = await import('../../veilcore/chain/actions');
      const r = await issueLicenseOnChain(hexBytes(keys.recordSecret), oc.commitment, { progress });
      // Kept before it is posted: a post that fails is sent again, never the transaction.
      setOnChain(license.id, (c) => ({ ...c!, issueTx: r.txId, issuedAt: r.blockTime ?? Date.now() }));
      await postIssued(oc.inviteId, r.txId, oc.issuerToken).catch(() => undefined);
      return r;
    });

  const revoke = (what: 'revoke' | 'cancel') =>
    call.run(async (progress) => {
      if (!oc?.commitment || !oc.issuerRecord) throw new Error('Nothing to revoke on chain.');
      const reason =
        what === 'cancel' ? 'Cancelled before it was activated' : window.prompt('Reason for revoking this license?');
      if (reason === null) throw new Error('Not revoked.');
      const { revokeLicenseOnChain } = await import('../../veilcore/chain/actions');
      const r = await revokeLicenseOnChain(hexBytes(keys.recordSecret), oc.commitment, oc.issuerRecord, { progress });
      setOnChain(license.id, (c) => ({ ...c!, revokeTx: r.txId, revokedAt: r.blockTime ?? Date.now() }));
      revokeLicense(license.id, reason || 'No reason given');
      return r;
    });

  // A post that didn't reach the registry after the issue landed: send it again (same transaction).
  const repost = () => void postIssued(oc!.inviteId, oc!.issueTx!, oc!.issuerToken).then(() => onToast('Sent again.'));

  return (
    <Stack spacing={1.5}>
      {!oc && (
        <>
          <Typography variant="body2" color="text.secondary">
            A real license takes both of you. You send a link; they accept on their own phone or computer, and their own
            key is made there. You issue it, they activate it, and it is on Midnight with both your keys. VeilCore pays
            the network fee.
          </Typography>
          <TextField
            label="Who is it for? (they'll see this)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            size="small"
            slotProps={{ htmlInput: { maxLength: 80 } }}
          />
          <Button
            variant="contained"
            disabled={blocked || busy || !label.trim()}
            onClick={() => void send()}
            sx={{ alignSelf: 'flex-start' }}
          >
            Make a link for them
          </Button>
        </>
      )}

      {oc && !oc.commitment && (
        <>
          <Alert severity="info" variant="outlined">
            Send this link to {oc.label}. When they accept, the next step shows here.
          </Alert>
          <TextField label="Their link" value={link} fullWidth size="small" slotProps={{ input: { readOnly: true } }} />
          <Button
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={() => void copy()}
            sx={{ alignSelf: 'flex-start' }}
          >
            Copy link
          </Button>
        </>
      )}

      {oc?.commitment && !oc.issueTx && (
        <>
          <Alert severity="success" variant="outlined">
            {oc.label} accepted. Before you issue it, ask them to read you the code on their screen. It must be:{' '}
            <b style={{ fontFamily: 'monospace', fontSize: '1.15em' }}>{commitmentCode(oc.commitment)}</b>
          </Alert>
          <Typography variant="body2" color="text.secondary">
            The code is made from their license key. If it&apos;s different, don&apos;t issue: someone else answered the
            link. Make a new one.
          </Typography>
          <FormControlLabel
            control={<Checkbox checked={codeChecked} onChange={(e) => setCodeChecked(e.target.checked)} />}
            label="They read me this same code"
          />
          <Button
            variant="contained"
            disabled={blocked || call.busy || !codeChecked}
            onClick={() => void issue()}
            sx={{ alignSelf: 'flex-start' }}
          >
            Issue it
          </Button>
        </>
      )}

      {oc?.issueTx && !live && !oc.revokeTx && (
        <>
          <Alert severity="info" variant="outlined">
            Issued on Midnight. Waiting for {oc.label} to activate it from their device: their link shows them the
            button. This page checks their step on the chain itself.
          </Alert>
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
            <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => void copy()}>
              Copy their link again
            </Button>
            <Button variant="text" onClick={repost}>
              They don&apos;t see it? Send the issue again
            </Button>
            <Button color="error" variant="text" disabled={blocked || call.busy} onClick={() => void revoke('cancel')}>
              Cancel it
            </Button>
          </Stack>
        </>
      )}

      {live && oc && (
        <>
          <Alert severity="success" variant="outlined">
            Live on Midnight: issued from this record and activated by {oc.label} with their own key, on{' '}
            {new Date(oc.activatedAt ?? Date.now()).toLocaleDateString()}. They can prove they hold a live license from
            this record without showing which one.
          </Alert>
          <Button
            color="error"
            variant="text"
            disabled={blocked || call.busy}
            onClick={() => void revoke('revoke')}
            sx={{ alignSelf: 'flex-start' }}
          >
            Revoke on chain
          </Button>
        </>
      )}

      {oc?.revokeTx && (
        <Alert severity="error" variant="outlined">
          Revoked on Midnight{oc.revokedAt ? ` on ${new Date(oc.revokedAt).toLocaleDateString()}` : ''}.
        </Alert>
      )}

      {error && (
        <Alert severity="error" variant="outlined">
          {error}
        </Alert>
      )}
      <ChainStatusLine busy={call.busy} progress={call.progress} error={call.error} step="agreement" />
    </Stack>
  );
};
