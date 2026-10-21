// /license-invite/:id — the LICENSEE's side of a real license (license-invites.ts).
//
// One link, three steps on the licensee's own device:
//   1. Accept: a license key is made here and kept here (never sent); the issuer gets only
//      the commitment built from it.
//   2. Save the backup (it holds the key): without it the license can't be shown on another
//      device, so Activate waits for a checked backup holding it.
//   3. Activate, once the issuer has issued it: this page first reads the issuer's
//      transaction from the chain, then countersigns with the key. VeilCore pays the fee.
// The link carries a token in its fragment (#t=…, never sent to a server); without it the
// registry takes no answer, so a link missing it is caught before anything is done.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams, Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Container, Paper, Stack, Typography } from '@mui/material';
import { tokenFromHash } from '../../veilcore/prove-relay';
import {
  acceptAsLicensee,
  commitmentCode,
  getInvite,
  postActivated,
  verifyIssued,
  type LicenseInvite,
} from '../../veilcore/license-invites';
import { hexBytes } from '../../veilcore/record-keys';
import { updateHeldLicense, useHeldLicenses } from '../../veilcore/held-licenses';
import { chainNotReady } from '../../veilcore/chain/config';
import { useChainCall } from '../chain/useChainCall';
import { ChainStatusLine } from '../chain/ChainStatusLine';
import type { ChainReceipt } from '../../veilcore/chain/actions';
import { Wordmark } from '../Wordmark';
import { InEnglishPage } from '../../i18n/app';
import { LanguageBar } from '../../i18n/LanguagePicker';

const POLL_MS = 8_000;
/** Enough of a record's key to compare with the sender: 16 characters, in groups of 4. */
const shown = (h: string) => (h.slice(0, 16).match(/..../g) ?? []).join(' ');

const Frame: React.FC<React.PropsWithChildren> = ({ children }) => (
  <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 7 } }}>
      <LanguageBar />
      <InEnglishPage />
      <Stack direction="row" sx={{ justifyContent: 'center', mb: 3 }}>
        <Wordmark />
      </Stack>
      <Paper sx={{ p: { xs: 2.5, md: 4 } }}>{children}</Paper>
    </Container>
  </Box>
);

export const LicenseInvitePage: React.FC = () => {
  const { id = '' } = useParams();
  const { hash } = useLocation();
  const token = tokenFromHash(hash);
  const held = useHeldLicenses().find((h) => h.inviteId === id);
  const [invite, setInvite] = useState<LicenseInvite | null | 'loading'>('loading');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const call = useChainCall<ChainReceipt>();

  const load = useCallback(async () => {
    try {
      const inv = await getInvite(id);
      setInvite(inv ?? null);
      return inv;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return undefined;
    }
  }, [id]);

  // Waiting for the issuer: read the invite until its issue shows, then check it on chain.
  useEffect(() => {
    let live = true;
    const tick = async () => {
      const inv = await load();
      if (!live || !inv || !held || held.issueTx || !inv.issueTx) return;
      const v = await verifyIssued(inv.issueTx, held.commitment, held.issuerRecord);
      if (!live) return;
      if (v.ok) updateHeldLicense(id, (h) => ({ ...h, issueTx: inv.issueTx! }));
      else setError(`The issue they reported didn't check out on chain: ${v.reason}`);
    };
    void tick();
    const t = setInterval(() => void tick(), POLL_MS);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [id, held, load]);

  if (chainNotReady()) {
    return (
      <Frame>
        <Typography>This site can&apos;t make real licenses. Open the link on the site it was made on.</Typography>
      </Frame>
    );
  }
  if (invite === 'loading' && error) {
    return (
      <Frame>
        <Alert severity="error" variant="outlined">
          Couldn&apos;t open this license: {error}
        </Alert>
      </Frame>
    );
  }
  if (invite === 'loading') {
    return (
      <Frame>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <CircularProgress size={20} />
          <Typography>Opening the license…</Typography>
        </Stack>
      </Frame>
    );
  }
  if (!invite) {
    return (
      <Frame>
        <Typography sx={{ mb: 1 }}>This license link has expired or doesn&apos;t exist.</Typography>
        <Typography variant="body2" color="text.secondary">
          Ask whoever sent it for a new one. Links last 30 days.
        </Typography>
      </Frame>
    );
  }
  if (!token) {
    return (
      <Frame>
        <Alert severity="warning" variant="outlined">
          This link is missing its last part. Open it again exactly as you got it (all of it, including what comes after
          the #).
        </Alert>
      </Frame>
    );
  }

  const takenByOther = invite.commitment && (!held || held.commitment !== invite.commitment);
  // Once accepted, the record is the one this device accepted for, whatever the registry says now.
  const issuerKey = held?.identity ?? invite.identity;
  const swapped = held && held.identity !== invite.identity;

  const accept = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await acceptAsLicensee(invite, token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const activate = () =>
    call.run(async (progress) => {
      if (!held?.issueTx) throw new Error('It has not been issued yet.');
      const { countersignLicenseOnChain } = await import('../../veilcore/chain/actions');
      const r = await countersignLicenseOnChain(hexBytes(held.secret), held.issuerRecord, { progress });
      // Kept before it is posted: a post that fails is sent again, never the transaction.
      updateHeldLicense(id, (h) => ({ ...h, activateTx: r.txId, activatedAt: r.blockTime ?? Date.now() }));
      await postActivated(id, r.txId, token).catch(() => undefined);
      return r;
    });

  return (
    <Frame>
      <Typography variant="h5" component="h1" sx={{ mb: 1 }}>
        {held?.activateTx ? 'Your license is live' : 'You’ve been offered a license'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        For: <b>{invite.label || 'you'}</b> · from the record with on-chain key{' '}
        <span style={{ fontFamily: 'monospace' }}>{shown(issuerKey)}</span>. Check that key with whoever sent you this.
      </Typography>

      {swapped && (
        <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
          The registry now names a different record than the one you accepted for. Don&apos;t rely on this page: ask the
          sender to check their license on their own page.
        </Alert>
      )}

      {takenByOther && (
        <Alert severity="error" variant="outlined">
          This link was already accepted on another device. If that wasn&apos;t you, tell whoever sent it: they should
          make a new link and not issue this one.
        </Alert>
      )}

      {!takenByOther && !held && (
        <Stack spacing={1.5}>
          <Typography variant="body2">
            Accepting makes your own license key on this device. It never leaves it: the person who sent this gets only
            a code made from it. Once they issue the license, you activate it with your key, and it&apos;s on Midnight
            with both of your keys. VeilCore pays the network fee.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The terms are between you and them. VeilCore records that the license exists and is live; it doesn&apos;t
            write or enforce the terms.
          </Typography>
          <Button variant="contained" size="large" disabled={busy} onClick={() => void accept()}>
            {busy ? 'Accepting…' : 'Accept'}
          </Button>
        </Stack>
      )}

      {held && !takenByOther && !held.issueTx && (
        <Stack spacing={1.5}>
          <Alert severity="success" variant="outlined">
            Accepted. Your license key is on this device.
          </Alert>
          <Alert severity="info" variant="outlined">
            Read this code to the person who sent the link, by phone or in person. They check it before they issue:{' '}
            <b style={{ fontFamily: 'monospace', fontSize: '1.15em' }}>{commitmentCode(held.commitment)}</b>
          </Alert>
          {!held.backedUpAt && (
            <Alert
              severity="warning"
              variant="outlined"
              action={
                <Button component={RouterLink} to="/backup" color="inherit" variant="outlined">
                  Save backup
                </Button>
              }
            >
              Save your backup now: it holds your license key. You&apos;ll need it to activate.
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary">
            Waiting for them to issue it. This page checks every few seconds; you can close it and open the link again
            later.
          </Typography>
        </Stack>
      )}

      {held && !takenByOther && held.issueTx && !held.activateTx && (
        <Stack spacing={1.5}>
          <Alert severity="info" variant="outlined">
            They issued it on Midnight (checked on chain). Activate it with your key.
          </Alert>
          {!held.backedUpAt ? (
            <Alert
              severity="warning"
              variant="outlined"
              action={
                <Button component={RouterLink} to="/backup" color="inherit" variant="outlined">
                  Save backup
                </Button>
              }
            >
              First save and check your backup: it holds your license key. Without it you couldn&apos;t show this
              license from another device.
            </Alert>
          ) : (
            <Button variant="contained" size="large" disabled={call.busy} onClick={() => void activate()}>
              Activate
            </Button>
          )}
        </Stack>
      )}

      {held?.activateTx && (
        <Alert severity="success" variant="outlined">
          Live on Midnight since {new Date(held.activatedAt ?? Date.now()).toLocaleDateString()}, issued by the record
          above and activated with your key. Keep your backup: it&apos;s how you prove this license later.
        </Alert>
      )}

      {error && (
        <Alert severity="error" variant="outlined" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ mt: 1.5 }}>
        <ChainStatusLine busy={call.busy} progress={call.progress} error={call.error} step="agreement" />
      </Box>
    </Frame>
  );
};
