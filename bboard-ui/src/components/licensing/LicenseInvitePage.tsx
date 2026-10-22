// /license-invite/:id — the LICENSEE's side of a real license (license-invites.ts).
//
// One link, three steps on the licensee's own device:
//   1. Accept: a license key is made here and kept here (never sent); the issuer gets only
//      the commitment built from it, first as a hash, then (once the issuer's page has answered
//      with its own random nonce) in full. Both pages show a 6-digit code made from all of it,
//      read aloud between the two people: a registry that swapped anything can't make them match.
//   2. Save the backup (it holds the key): without it the license can't be shown on another
//      device, so Activate waits for a checked backup holding it.
//   3. Activate, once the issuer has issued it: this page first reads the issuer's
//      transaction from the chain, then countersigns with the key. VeilCore pays the fee.
// The link carries a token in its fragment (#t=…, never sent to a server); without it the
// registry takes no answer, so a link missing it is caught before anything is done.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams, Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  FormControlLabel,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { say, useDeal, type DealParty } from '../../veilcore/deal-client';
import { TermsBox, useOfferedTerms } from './DealTerms';
import { RoyaltyLedger } from './RoyaltyLedger';
import { OffspringRoyalty } from './OffspringRoyalty';
import { tokenFromHash } from '../../veilcore/prove-relay';
import {
  acceptAsLicensee,
  commitHashOf,
  getInvite,
  licenseCode,
  licenseStatusNow,
  postActivated,
  revealAsLicensee,
  verifyIssued,
  type LicenseInvite,
} from '../../veilcore/license-invites';
import { hexBytes } from '../../veilcore/record-keys';
import { updateHeldLicense, useHeldLicenses } from '../../veilcore/held-licenses';
import { chainNotReady } from '../../veilcore/chain/config';
import { AGREEMENTS_ON_CHAIN } from '../../config/copy';
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
  const [myHash, setMyHash] = useState<string>();
  const [code, setCode] = useState<string>();
  /** The license on chain now, read by this page itself: posts to the registry can be lost. */
  const [onChain, setOnChainStatus] = useState<'PENDING' | 'ACTIVE' | 'none'>();
  const [agreeChecked, setAgreeChecked] = useState(false);
  // The deal's private channel, once both keys are known: the terms arrive here, signed by the issuer.
  const party: DealParty | undefined =
    held?.partySecret && held.issuerNonce
      ? {
          side: 'licensee',
          mySecret: held.partySecret,
          theirPublic: held.issuerNonce,
          commitment: held.commitment,
          issuerRecord: held.issuerRecord,
          ...(token ? { invite: { id: held.inviteId, token } } : {}),
        }
      : undefined;
  const deal = useDeal(party);
  const offered = useOfferedTerms(deal.entries);
  // A device restored from a backup made before agreeing: the agreement is still on the channel,
  // signed by this side, so it is taken back from there (review round 3, L5).
  useEffect(() => {
    if (!held || held.agreement || offered?.ok !== true) return;
    const signed = deal.entries?.find(
      (e) => e.type === 'agree' && e.mine && e.agreementFingerprint === offered.copy.agreementFingerprint,
    );
    if (signed) updateHeldLicense(id, (h) => ({ ...h, agreement: offered.copy, agreedAt: signed.at }));
  }, [held, offered, deal.entries, id]);

  useEffect(() => {
    let on = true;
    if (held) void commitHashOf(held.commitment, held.issuerRecord, held.licenseeNonce).then((h) => on && setMyHash(h));
    if (held?.issuerNonce)
      void licenseCode(held.commitment, held.issuerRecord, held.licenseeNonce, held.issuerNonce).then(
        (c) => on && setCode(c),
      );
    return () => {
      on = false;
    };
  }, [held]);

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
      if (!AGREEMENTS_ON_CHAIN) return;
      const inv = await load();
      if (!live || !inv || !held || !token) return;
      try {
        // The issuer's page answered: reveal (the first answer seen is the one kept).
        if (inv.issuerNonce && !inv.commitment) await revealAsLicensee(inv, token);
        if (held.issuerNonce && inv.issuerNonce && held.issuerNonce !== inv.issuerNonce) {
          setError(
            'The registry now shows a different answer from the sender than before. Tell them; don’t rely on this link.',
          );
          return;
        }
        const status = await licenseStatusNow(held.commitment, held.issuerRecord);
        if (!live) return;
        setOnChainStatus(status);
        if (!held.issueTx && inv.issueTx) {
          const v = await verifyIssued(inv.issueTx, held.commitment, held.issuerRecord);
          if (!live) return;
          if (v.ok) updateHeldLicense(id, (h) => ({ ...h, issueTx: inv.issueTx! }));
        }
      } catch {
        /* the next tick tries again */
      }
    };
    void tick();
    const t = setInterval(() => void tick(), POLL_MS);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [id, held, load, token]);

  // Agreements on chain are off on this site (a mainnet build before the switch): nothing is asked or sent.
  if (chainNotReady() || !AGREEMENTS_ON_CHAIN) {
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

  const takenByOther = Boolean(invite.commitHash && (!held || (myHash && myHash !== invite.commitHash)));
  // Issued: by the transaction it posted (checked on chain), or by the chain itself if that post was lost.
  const issued = Boolean(held?.issueTx || onChain === 'PENDING' || onChain === 'ACTIVE');
  const isLive = Boolean(held?.activateTx || onChain === 'ACTIVE');
  // Issued once, now gone from the chain: cancelled or revoked by the sender.
  const gone = Boolean(onChain === 'none' && (held?.issueTx || held?.activateTx));
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
      if (!held || !issued) throw new Error('It has not been issued yet.');
      if (!party || offered?.ok !== true) throw new Error('The terms have not arrived, or didn’t check out.');
      // Their signed agreement to exactly these terms goes first, kept here and sent to the issuer.
      if (!held.agreedAt) {
        progress('Signing your agreement to the terms…');
        await say(party, { type: 'agree', agreementFingerprint: offered.copy.agreementFingerprint });
        updateHeldLicense(id, (h) => ({ ...h, agreement: offered.copy, agreedAt: Date.now() }));
      }
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
        {gone ? 'This license was cancelled' : isLive ? 'Your license is live' : 'You’ve been offered a license'}
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

      {gone && (
        <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
          It is no longer on Midnight: the sender cancelled or revoked it. Ask them if you think that&apos;s a mistake.
        </Alert>
      )}

      {held && !takenByOther && !issued && !gone && (
        <Stack spacing={1.5}>
          <Alert severity="success" variant="outlined">
            Accepted. Your license key is on this device.
          </Alert>
          {code ? (
            <Alert severity="info" variant="outlined">
              Read this code to the person who sent the link, by phone or in person. Their screen shows one too, and
              they check it before they issue:{' '}
              <b style={{ fontFamily: 'monospace', fontSize: '1.3em', whiteSpace: 'nowrap' }}>{code}</b>
            </Alert>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Waiting for the sender&apos;s page to answer. Your code shows here once it does; their page needs to be
              open.
            </Typography>
          )}
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
            Then they issue it. This page checks every few seconds. If you close it, open the link again later to carry
            on.
          </Typography>
        </Stack>
      )}

      {held && !takenByOther && issued && !isLive && !gone && (
        <Stack spacing={1.5}>
          <Alert severity="info" variant="outlined">
            They issued it on Midnight (checked on chain). Read the terms, then activate it with your key.
          </Alert>
          <TermsBox offered={offered} />
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
            <>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={agreeChecked}
                    disabled={offered?.ok !== true}
                    onChange={(e) => setAgreeChecked(e.target.checked)}
                  />
                }
                label="I agree to these terms"
              />
              <Button
                variant="contained"
                size="large"
                disabled={call.busy || !agreeChecked || offered?.ok !== true}
                onClick={() => void activate()}
              >
                Agree and activate
              </Button>
            </>
          )}
        </Stack>
      )}

      {held && isLive && !gone && held.agreement && (
        <Box sx={{ mb: 2 }}>
          <TermsBox offered={{ ok: true, copy: held.agreement }} agreedAt={held.agreedAt} />
        </Box>
      )}

      {held && isLive && !gone && (
        <Alert severity="success" variant="outlined">
          Live on Midnight{held.activatedAt ? ` since ${new Date(held.activatedAt).toLocaleDateString()}` : ''}, issued
          by the record above and activated with your key. Keep your backup: it&apos;s how you prove this license later.
        </Alert>
      )}

      {held && isLive && !gone && party && held.agreement && (
        <Box sx={{ mt: 2 }}>
          {held.agreement.type === 'license' && (
            <RoyaltyLedger
              party={party}
              side="licensee"
              terms={held.agreement.terms}
              entries={deal.entries}
              refresh={deal.refresh}
              agreed={{
                agreementType: held.agreement.type,
                agreementFingerprint: held.agreement.agreementFingerprint,
              }}
            />
          )}

          {(Number(held.agreement.terms.offspringRoyaltyPct) || 0) > 0 && (
            <Box sx={{ mt: 2 }}>
              <OffspringRoyalty
                side="licensee"
                party={party}
                entries={deal.entries}
                refresh={deal.refresh}
                pct={String(held.agreement.terms.offspringRoyaltyPct)}
                obligation={held.agreement.agreementFingerprint}
                beneficiary={held.identity}
              />
            </Box>
          )}
        </Box>
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
