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
import { subjectOf } from '../../veilcore/licenses';
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
  handOnRecordFromHash,
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
import { backupReturnTo } from '../flow/backup-return';
import { DealSteps, HowItWorks } from './DealSteps';
import { licenseeSteps } from './steps';
import { handOnOffered, newHolderSteps } from '../../veilcore/hand-on';
import { HandOnHolder } from './HandOnHolder';
import { ChainStatusLine } from '../chain/ChainStatusLine';
import type { ChainReceipt } from '../../veilcore/chain/actions';
import { Wordmark } from '../Wordmark';
import { rich, useT } from '../../i18n/app';
import { LanguageBar } from '../../i18n/LanguagePicker';

const POLL_MS = 8_000;
/** Enough of a record's key to compare with the sender: 16 characters, in groups of 4. */
const shown = (h: string) => (h.slice(0, 16).match(/..../g) ?? []).join(' ');

const Frame: React.FC<React.PropsWithChildren> = ({ children }) => (
  <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 7 } }}>
      <LanguageBar />
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
  const tr = useT();
  const held = useHeldLicenses().find((h) => h.inviteId === id);
  // A hand-on link (hand-on.ts) names the license's issuing record: this side takes over a
  // live license rather than being issued a new one.
  const handOnRecord = handOnRecordFromHash(hash);
  const handOnMode = Boolean(held?.handOn ?? handOnRecord);
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

  // Gone from the chain, and the license the licensor named for a hand-on is live: it was handed
  // on (perhaps proposed from another device), not cancelled or revoked. Checked on chain.
  const offer = handOnOffered(deal.entries);
  useEffect(() => {
    if (onChain !== 'none' || !held?.activatedAt || held.handOnTx || held.handedOnSeenAt || !offer) return;
    let live = true;
    void licenseStatusNow(offer.newLicense, held.issuerRecord)
      .then((s) => {
        if (live && s === 'ACTIVE')
          updateHeldLicense(id, (h) => ({ ...h, handOnTo: offer.to, handedOnSeenAt: Date.now() }));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [onChain, held, offer?.newLicense, offer?.to, id]);

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
          setError(tr.t('app.lic.inv.errNonce'));
          return;
        }
        const status = await licenseStatusNow(held.commitment, held.issuerRecord);
        if (!live) return;
        setOnChainStatus(status);
        // Taken over: live from the licensor's approval, with no activation from here.
        if (status === 'ACTIVE' && held.handOn && !held.activatedAt)
          updateHeldLicense(id, (h) => ({ ...h, activatedAt: Date.now() }));
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
  }, [id, held, load, token, tr]);

  // Agreements on chain are off on this site (a mainnet build before the switch): nothing is asked or sent.
  if (chainNotReady() || !AGREEMENTS_ON_CHAIN) {
    return (
      <Frame>
        <Typography>{tr.t('app.lic.inv.cant')}</Typography>
      </Frame>
    );
  }
  if (invite === 'loading' && error) {
    return (
      <Frame>
        <Alert severity="error" variant="outlined">
          {tr.t('app.lic.inv.openFailed', { error })}
        </Alert>
      </Frame>
    );
  }
  if (invite === 'loading') {
    return (
      <Frame>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <CircularProgress size={20} />
          <Typography>{tr.t('app.lic.inv.opening')}</Typography>
        </Stack>
      </Frame>
    );
  }
  if (!invite) {
    return (
      <Frame>
        <Typography sx={{ mb: 1 }}>{tr.t('app.lic.inv.expired')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {tr.t('app.lic.inv.askNew')}
        </Typography>
      </Frame>
    );
  }
  if (!token) {
    return (
      <Frame>
        <Alert severity="warning" variant="outlined">
          {tr.t('app.lic.proof.partial')}
        </Alert>
      </Frame>
    );
  }

  const takenByOther = Boolean(invite.commitHash && (!held || (myHash && myHash !== invite.commitHash)));
  // Issued: by the transaction it posted (checked on chain), or by the chain itself if that post was lost.
  const issued = Boolean(held?.issueTx || onChain === 'PENDING' || onChain === 'ACTIVE');
  const isLive = Boolean(held?.activateTx || onChain === 'ACTIVE');
  // Issued once, now gone from the chain: cancelled or revoked by the sender.
  const gone = Boolean(onChain === 'none' && (held?.issueTx || held?.activateTx || held?.activatedAt));
  // Gone because this side handed it on and the licensor approved it.
  const handedOn = Boolean(gone && (held?.handOnTx || held?.handedOnSeenAt));
  // Once accepted, the record is the one this device accepted for, whatever the registry says now.
  const issuerKey = held?.identity ?? invite.identity;
  const swapped = held && held.identity !== invite.identity;

  const accept = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await acceptAsLicensee(invite, token, handOnRecord);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  /** A hand-on: sign the agreement to the terms; the license goes live when the licensor approves. */
  const agreeOnly = async () => {
    setBusy(true);
    setError(undefined);
    try {
      if (!party || offered?.ok !== true) throw new Error(tr.t('app.lic.inv.noTerms'));
      await say(party, { type: 'agree', agreementFingerprint: offered.copy.agreementFingerprint });
      updateHeldLicense(id, (h) => ({ ...h, agreement: offered.copy, agreedAt: Date.now() }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const activate = () =>
    call.run(async (progress) => {
      if (!held || !issued) throw new Error(tr.t('app.lic.inv.notIssued'));
      if (!party || offered?.ok !== true) throw new Error(tr.t('app.lic.inv.noTerms'));
      // Their signed agreement to exactly these terms goes first, kept here and sent to the issuer.
      if (!held.agreedAt) {
        progress(tr.t('app.lic.inv.signing'));
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
        {handedOn
          ? tr.t('app.lic.inv.h.handedOn')
          : gone
            ? tr.t('app.lic.inv.h.cancelled')
            : isLive
              ? tr.t('app.lic.inv.h.live')
              : handOnMode
                ? tr.t('app.lic.inv.h.handOn')
                : tr.t('app.lic.inv.h.offered')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        {rich(
          tr.t('app.lic.inv.forWhom'),
          { b: (c) => <b>{c}</b> },
          {
            label: invite.label || tr.t('app.lic.inv.you'),
            key: <span style={{ fontFamily: 'monospace' }}>{shown(issuerKey)}</span>,
          },
        )}
      </Typography>

      {swapped && (
        <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
          {tr.t('app.lic.inv.swapped')}
        </Alert>
      )}

      {takenByOther && (
        <Alert severity="error" variant="outlined">
          {tr.t('app.lic.inv.taken')}
        </Alert>
      )}

      {!takenByOther && !isLive && !gone && handOnMode && (
        <DealSteps
          steps={newHolderSteps(
            {
              accepted: !!held,
              backedUp: !!held?.backedUpAt,
              agreed: !!held?.agreedAt,
              live: isLive,
            },
            tr,
          )}
        >
          {!held && (
            <Stack spacing={1.25}>
              <Button variant="contained" size="large" disabled={busy} onClick={() => void accept()}>
                {busy ? tr.t('app.lic.inv.accepting') : tr.t('app.lic.steps.l.accept')}
              </Button>
              <HowItWorks>{tr.t('app.lic.inv.howHandOn')}</HowItWorks>
            </Stack>
          )}

          {held && !held.backedUpAt && (
            <Stack spacing={1.25}>
              <Typography variant="body2">{tr.t('app.lic.inv.backupHandOn')}</Typography>
              <Button
                component={RouterLink}
                to="/backup"
                onClick={() => backupReturnTo(window.location.pathname + window.location.hash)}
                variant="contained"
                size="large"
                sx={{ alignSelf: 'flex-start' }}
              >
                {tr.t('app.lic.real.saveBackup')}
              </Button>
            </Stack>
          )}

          {held && held.backedUpAt && !held.agreedAt && offered?.ok !== true && (
            <Stack spacing={1.25}>
              {code ? (
                <>
                  <Typography variant="body2">{tr.t('app.lic.inv.readToLicensor')}</Typography>
                  <Typography
                    data-license-code=""
                    sx={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 700, letterSpacing: '0.15em' }}
                  >
                    {code}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tr.t('app.lic.inv.whenMatches')}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {tr.t('app.lic.inv.waitLicensor')}
                </Typography>
              )}
            </Stack>
          )}

          {held && held.backedUpAt && !held.agreedAt && offered?.ok === true && (
            <Stack spacing={1.25}>
              <Typography variant="body2">{tr.t('app.lic.inv.takeOverTerms')}</Typography>
              <TermsBox offered={offered} />
              <FormControlLabel
                control={<Checkbox checked={agreeChecked} onChange={(e) => setAgreeChecked(e.target.checked)} />}
                label={tr.t('app.lic.inv.iAgree')}
              />
              <Typography variant="caption" color="text.secondary" data-evidence-note="">
                {tr.t('app.lic.evidenceNote')}
              </Typography>
              <Button
                variant="contained"
                size="large"
                disabled={busy || !agreeChecked}
                onClick={() => void agreeOnly()}
                sx={{ alignSelf: 'flex-start' }}
              >
                {tr.t('app.lic.inv.agree')}
              </Button>
            </Stack>
          )}

          {held && held.agreedAt && <Typography variant="body2">{tr.t('app.lic.inv.waitHandOn')}</Typography>}
        </DealSteps>
      )}

      {!takenByOther && !isLive && !gone && !handOnMode && (
        <DealSteps steps={licenseeSteps({ accepted: !!held, backedUp: !!held?.backedUpAt, issued, live: isLive }, tr)}>
          {!held && (
            <Stack spacing={1.25}>
              <Button variant="contained" size="large" disabled={busy} onClick={() => void accept()}>
                {busy ? tr.t('app.lic.inv.accepting') : tr.t('app.lic.steps.l.accept')}
              </Button>
              <HowItWorks>{tr.t('app.lic.inv.how')}</HowItWorks>
            </Stack>
          )}

          {held && !held.backedUpAt && (
            <Stack spacing={1.25}>
              <Typography variant="body2">{tr.t('app.lic.inv.backup')}</Typography>
              <Button
                component={RouterLink}
                to="/backup"
                onClick={() => backupReturnTo(window.location.pathname + window.location.hash)}
                variant="contained"
                size="large"
                sx={{ alignSelf: 'flex-start' }}
              >
                {tr.t('app.lic.real.saveBackup')}
              </Button>
            </Stack>
          )}

          {held && held.backedUpAt && !issued && (
            <Stack spacing={1.25}>
              {code ? (
                <>
                  <Typography variant="body2">{tr.t('app.lic.inv.readCode')}</Typography>
                  <Typography
                    data-license-code=""
                    sx={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 700, letterSpacing: '0.15em' }}
                  >
                    {code}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tr.t('app.lic.inv.theirsToo')}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {tr.t('app.lic.inv.waitTheirs')}
                </Typography>
              )}
            </Stack>
          )}

          {held && held.backedUpAt && issued && (
            <Stack spacing={1.25}>
              <Typography variant="body2">{tr.t('app.lic.inv.issuedRead')}</Typography>
              <TermsBox offered={offered} />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={agreeChecked}
                    disabled={offered?.ok !== true}
                    onChange={(e) => setAgreeChecked(e.target.checked)}
                  />
                }
                label={tr.t('app.lic.inv.iAgree')}
              />
              <Typography variant="caption" color="text.secondary" data-evidence-note="">
                {tr.t('app.lic.evidenceNote')}
              </Typography>
              <Button
                variant="contained"
                size="large"
                disabled={call.busy || !agreeChecked || offered?.ok !== true}
                onClick={() => void activate()}
              >
                {tr.t('app.lic.inv.agreeActivate')}
              </Button>
            </Stack>
          )}
        </DealSteps>
      )}

      {handedOn && (
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          {tr.t('app.lic.inv.handedOn', { name: held?.handOnTo ?? tr.t('app.lic.inv.newHolder') })}
        </Alert>
      )}
      {gone && !handedOn && (
        <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
          {tr.t('app.lic.inv.gone')}
        </Alert>
      )}

      {held && isLive && !gone && held.agreement && (
        <Box sx={{ mb: 2 }}>
          <TermsBox offered={{ ok: true, copy: held.agreement }} agreedAt={held.agreedAt} />
        </Box>
      )}

      {held && isLive && !gone && (
        <Alert severity="success" variant="outlined" data-license-live="">
          {held.activatedAt
            ? tr.t('app.lic.inv.liveSince', { date: tr.date(held.activatedAt) })
            : tr.t('app.lic.inv.live')}
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

          <Box sx={{ mt: 2 }}>
            <HandOnHolder held={held} party={party} entries={deal.entries} refresh={deal.refresh} />
          </Box>

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
                kind={subjectOf(held.agreement.terms)}
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
