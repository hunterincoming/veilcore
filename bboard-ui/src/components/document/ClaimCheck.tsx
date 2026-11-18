// The page a claim link opens (/check-claim#c=…; veilcore/claim-link.ts). The claim is read
// from the claims contract's state for that one call and must match the link exactly; the
// record it is about is dated by its own proof code, recomputed from the claim and the key
// binding. What the claim can't show is said every time.
//
// A link on a lab's genotype comparison or parentage check may carry more claims on the same
// record (claim-link.ts `more`). Each is checked on its own and shown with its own answer.
// "Markers differing: at least 6 of at least 40 compared" is said as one line only when both
// claims checked and a laboratory stands behind the numbers (marker-claims.ts joinedCounts);
// otherwise each is said alone, in the holder's words. The limits are always said.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert, Box, CircularProgress, Container, Paper, Stack, Typography } from '@mui/material';
import { anchoredFingerprintOf, claimsOf, readClaimLink, type ClaimVerdict } from '../../veilcore/claim-link';
import { isMarkerSchema, joinedCounts } from '../../veilcore/marker-claims';
import { DatedNotOrigin } from '../verify/DatedNotOrigin';
import { useT } from '../../i18n/app';
import { DocumentDate, Fact } from './DocumentParts';
import { claimRawWords, claimWords, MarkerLimits } from './ProveNumber';
import { claimFooterKey, labStands } from '../../veilcore/claim-call';
import { schemaWords } from './NumbersFields';
import { keyShort } from '../../veilcore/lab-key-text';
import { signerLabel, type ResolvedAttestation } from '../../veilcore/attesters';
import { RESULT_CALL_SCHEMAS } from '../../veilcore/field-set';
import { ClaimResultFile } from '../lab/ClaimResultFile';
import { ViabilityNotRead } from '../lab/ResultFacts';
import { viabilityNotRead } from '../../config/network';
import { withdrawnWords } from '../lab/signer-words';

export const ClaimCheck: React.FC = () => {
  const tr = useT();
  const { t } = tr;
  const { hash } = useLocation();
  const link = readClaimLink(hash);
  // A claim on a lab result v2's call proves the call only (SPEC 11.12): what was tested for, or
  // compared, is in the lab's result file, which the checker can add beside it.
  const isCall = !!link && RESULT_CALL_SCHEMAS.includes(link.schema);
  // A claim on a viability result is not read where those are off (mainnet): not shown, not checked.
  const viabilityOff = !!link && viabilityNotRead({ schema: link.schema });
  const isMarker = !!link && isMarkerSchema(link.schema);
  const more = link ? claimsOf(link).slice(1) : [];
  const [verdict, setVerdict] = useState<ClaimVerdict>();
  const [moreVerdicts, setMoreVerdicts] = useState<readonly (ClaimVerdict | undefined)[]>([]);
  useEffect(() => {
    // A new link starts unchecked: the last link's "Proved on Midnight" must never show under
    // this one's claim while it is being read (security round, 2 Nov 2026).
    setVerdict(undefined);
    setMoreVerdicts([]);
    if (!link || viabilityOff) return;
    let live = true;
    const failed = (e: unknown) => ({ ok: false as const, reason: e instanceof Error ? e.message : String(e) });
    const checker = import('../../veilcore/chain/claim-check');
    void checker
      .then(({ checkClaim }) => checkClaim(link))
      .catch(failed)
      .then((v) => live && setVerdict(v));
    // Each further claim on the same record, read and compared on its own.
    more.forEach((m, i) => {
      void checker
        .then(({ checkClaim }) => checkClaim(m))
        .catch(failed)
        .then((v) => {
          if (live)
            setMoreVerdicts((all) => {
              const next = [...all];
              next[i] = v;
              return next;
            });
        });
    });
    return () => {
      live = false;
    };
    // The link is read from the hash; check again only when it changes.
  }, [hash]);

  const stands = labStands(verdict);
  // "M of N compared": both checked, on the same record (one link is one record), a lab standing behind them.
  const joined =
    link && isMarker && stands
      ? joinedCounts([{ ...link, ok: !!verdict?.ok }, ...more.map((m, i) => ({ ...m, ok: !!moreVerdicts[i]?.ok }))])
      : undefined;
  const headline = link ? (joined ? t(joined.key, { m: joined.m, n: joined.n }) : claimWords(link, tr, stands)) : '';

  return (
    <Box sx={{ bgcolor: 'background.default' }} data-claim-check="">
      <Container component="main" maxWidth="sm" sx={{ py: { xs: 5, md: 8 }, overflowWrap: 'anywhere' }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          {t('app.claim.check.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t('app.claim.check.intro')}
        </Typography>
        <DatedNotOrigin />
        {!link ? (
          <Alert severity="error" variant="outlined" data-claim-link="bad">
            {t('app.claim.check.bad')}
          </Alert>
        ) : viabilityOff ? (
          <ViabilityNotRead />
        ) : (
          <Stack spacing={2.5}>
            <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
              {/* What the link says: plain until the chain confirms it, never styled as a fact before. */}
              <Typography
                variant="h6"
                component="p"
                color={verdict?.ok ? 'text.primary' : 'text.secondary'}
                sx={{ mb: 1, textDecoration: verdict && !verdict.ok ? 'line-through' : 'none' }}
                data-claim-statement=""
                data-marker-joined={joined ? '' : undefined}
              >
                {headline}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {t('app.claim.check.schema', { schema: schemaWords(link.schema, tr) })}
              </Typography>
              {/* A yes/no call a lab stands behind is said as the result ("Not detected"); the slot and number it proves stay here. */}
              {headline !== claimRawWords(link, tr) && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }} data-claim-raw="">
                  {t('app.claim.check.raw', { raw: claimRawWords(link, tr) })}
                </Typography>
              )}
              {!verdict && (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2">{t('app.claim.check.checking')}</Typography>
                </Stack>
              )}
              {verdict?.ok && (
                <Alert severity="success" variant="outlined" data-claim-verdict="ok">
                  {t('app.claim.check.okWhen', {
                    block: String(verdict.blockHeight ?? '?'),
                    date: verdict.blockTime ? ` (${tr.date(verdict.blockTime)})` : '',
                  })}
                </Alert>
              )}
              {verdict && !verdict.ok && (
                <Alert severity="error" variant="outlined" data-claim-verdict="failed">
                  {t('app.claim.check.failed', { reason: verdict.reason })}
                </Alert>
              )}
              {/* Whose numbers these are: the lab's only where its signature stands, else the holder's. */}
              {isMarker && (
                <Typography variant="body2" sx={{ mt: 1.5 }} data-marker-source={stands ? 'lab' : 'holder'}>
                  {t(stands ? 'app.marker.source.lab' : 'app.marker.source.holder')}
                </Typography>
              )}
            </Paper>
            {more.length > 0 && (
              <Paper sx={{ p: { xs: 2.5, md: 3 } }} data-marker-more={String(more.length)}>
                <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
                  {t('app.marker.more.title')}
                </Typography>
                <Stack spacing={1.5}>
                  {more.map((m, i) => {
                    const v = moreVerdicts[i];
                    return (
                      <Box key={m.txId} data-marker-more-claim={v ? (v.ok ? 'ok' : 'failed') : 'checking'}>
                        <Typography
                          variant="body1"
                          color={v?.ok ? 'text.primary' : 'text.secondary'}
                          sx={{ textDecoration: v && !v.ok ? 'line-through' : 'none' }}
                        >
                          {claimWords(m, tr, stands && !!v?.ok)}
                        </Typography>
                        <Typography variant="body2" color={v && !v.ok ? 'error' : 'text.secondary'}>
                          {!v
                            ? t('app.claim.check.checking')
                            : v.ok
                              ? t('app.claim.check.okWhen', {
                                  block: String(v.blockHeight ?? '?'),
                                  date: v.blockTime ? ` (${tr.date(v.blockTime)})` : '',
                                })
                              : t('app.claim.check.failed', { reason: v.reason })}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </Paper>
            )}
            {verdict?.ok && verdict.lab && (
              <Paper sx={{ p: { xs: 2.5, md: 3 } }} data-claim-lab={verdict.lab.ok ? 'ok' : 'failed'}>
                {verdict.lab.ok ? (
                  <Stack spacing={1.5}>
                    <Alert
                      severity={
                        verdict.lab.signer?.kind === 'bound' &&
                        signerLabel(verdict.lab.signer.attestation as ResolvedAttestation, 'Signed by', Date.now(), tr)
                          .checked
                          ? 'success'
                          : 'info'
                      }
                      variant="outlined"
                      data-claim-signer={verdict.lab.signer?.kind ?? 'none'}
                    >
                      {t('app.claim.check.labOk', {
                        key: keyShort(verdict.lab.attester),
                        block: String(verdict.lab.blockHeight ?? '?'),
                        date: verdict.lab.blockTime ? ` (${tr.date(verdict.lab.blockTime)})` : '',
                      })}{' '}
                      {verdict.lab.signer?.kind === 'bound'
                        ? signerLabel(
                            verdict.lab.signer.attestation as ResolvedAttestation,
                            'Signed by',
                            Date.now(),
                            tr,
                          ).text
                        : verdict.lab.signer?.kind === 'retracted'
                          ? withdrawnWords(verdict.lab.signer, isCall, tr)
                          : verdict.lab.signer?.kind === 'conflict'
                            ? t('app.claim.check.labConflict')
                            : t('app.claim.check.labUnidentified')}
                    </Alert>
                    {verdict.lab.signer?.kind === 'bound' && link?.attested?.about && (
                      <Fact label={t('app.claim.check.labAbout')} mono>
                        {link.attested.about}
                      </Fact>
                    )}
                    <Fact label={t('app.claim.check.labKey')} mono>
                      {verdict.lab.attester}
                    </Fact>
                    {verdict.lab.signer?.kind === 'bound' && (
                      <Typography variant="body2">{t('app.claim.check.labFieldSecret')}</Typography>
                    )}
                  </Stack>
                ) : (
                  <Alert severity="error" variant="outlined">
                    {t('app.claim.check.labFailed', { reason: verdict.lab.reason })}
                  </Alert>
                )}
              </Paper>
            )}
            {isCall && <ClaimResultFile record={link.record} schema={link.schema} />}
            <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
              <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
                {t('app.claim.check.record')}
              </Typography>
              <Stack spacing={1.5}>
                <DocumentDate fingerprint={anchoredFingerprintOf(link)} checker />
                <Fact label={t('app.doc.k.proofCode')} mono>
                  {anchoredFingerprintOf(link)}
                </Fact>
              </Stack>
            </Paper>
            {isMarker && (
              <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
                <MarkerLimits />
              </Paper>
            )}
            <Typography variant="body2" color="text.secondary">
              {t(claimFooterKey(verdict))}
            </Typography>
          </Stack>
        )}
      </Container>
    </Box>
  );
};
