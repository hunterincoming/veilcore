// The page a claim link opens (/check-claim#c=…; veilcore/claim-link.ts). The claim is read
// from the claims contract's state for that one call and must match the link exactly; the
// record it is about is dated by its own proof code, recomputed from the claim and the key
// binding. What the claim can't show is said every time.
//
// A link on a lab's genotype comparison or parentage check may carry more claims on the same
// record (claim-link.ts `more`). Each is checked on its own and shown with its own answer.
// "Markers differing: at least 6 of at least 40 compared" is said as one line only when both
// claims checked and a laboratory stands behind the numbers (marker-claims.ts joinedPlacement):
// as the headline when the link's first claim is one of the two, else under "Also in this
// link"; otherwise each is said alone, in the holder's words. Whose numbers they are is said in
// the same states as the footer (markerSourceKey). The limits are always said.
//
// On a laboratory's parentage result (animal-parentage/v1, veilcore/parentage.ts) the page says
// "meets five of ICAR 2023's parentage checks", in the words docs/parentage.md fixes, only when the link
// carries all five acceptance claims, every one checked on Midnight, and a laboratory stands
// behind the numbers. ICAR's bands are said in plain words, and a parentage result's own limits.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert, Box, CircularProgress, Container, Paper, Stack, Typography } from '@mui/material';
import { anchoredFingerprintOf, claimsOf, readClaimLink, type ClaimVerdict } from '../../veilcore/claim-link';
import { isMarkerSchema, joinedPlacement, markerSourceKey, offerOf } from '../../veilcore/marker-claims';
import { DatedNotOrigin } from '../verify/DatedNotOrigin';
import { CheckVerdict, CheckYourself, MakeYourOwn } from '../verify/CheckParts';
import { claimVerdict, VERDICT_DATE } from '../verify/verdict';
import { useT } from '../../i18n/app';
import { DocumentDateView, Fact } from './DocumentParts';
import { useRecordDate } from '../verify/useAnchorCheck';
import { stillTesting } from '../verify/anchor-words';
import { claimRawWords, claimWords, MarkerLimits, ParentageBands } from './ProveNumber';
import { PARENTAGE_SCHEMA, meetsAcceptance } from '../../veilcore/parentage';
import { claimFooter, labStands } from '../../veilcore/claim-call';
import { schemaWords } from './NumbersFields';
import { keyShort } from '../../veilcore/lab-key-text';
import { signerLabel, type ResolvedAttestation } from '../../veilcore/attesters';
import { labIdentitySeverity } from '../../veilcore/lab-identity-words';
import { NameCheckText } from '../NameCheckText';
import { RESULT_CALL_SCHEMAS, SCHEMAS } from '../../veilcore/field-set';
import { ClaimResultFile } from '../lab/ClaimResultFile';
import { ViabilityNotRead } from '../lab/ResultFacts';
import { NETWORK, viabilityNotRead } from '../../config/network';
import { withdrawnWords } from '../lab/signer-words';
import { errorReason } from '../../i18n/error-words';

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
  // The record's date, looked up once for its line below and for whether to invite a record.
  const recordDate = useRecordDate(link ? anchoredFingerprintOf(link) : undefined);
  const dateNetwork =
    recordDate.proof !== 'checking' && recordDate.proof.status === 'anchor-reported'
      ? (recordDate.proof.proof.anchor?.network ?? NETWORK)
      : NETWORK;
  // A date from a contract VeilCore is still testing (version 2 on mainnet, docs/contract-v2.md 7
  // condition 5): no "make a record" beside it.
  const testingDate = stillTesting(recordDate.anchor, dateNetwork);
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
    link && isMarker
      ? joinedPlacement(
          [{ ...link, ok: !!verdict?.ok }, ...more.map((m, i) => ({ ...m, ok: !!moreVerdicts[i]?.ok }))],
          stands,
        )
      : undefined;
  const headline = link
    ? joined?.where === 'headline'
      ? t(joined.key, { m: joined.m, n: joined.n })
      : claimWords(link, tr, stands)
    : '';
  const parentage = !!link && link.schema === PARENTAGE_SCHEMA;
  // The closing line fits the claim's kind: a number's bound, or a lab result's yes/no call.
  const footer = link
    ? claimFooter(verdict, SCHEMAS[link.schema]?.slots.find((x) => x.slot === link.slot)?.path, link)
    : undefined;
  const markerSource = link ? markerSourceKey(verdict, !!offerOf(link)?.count) : undefined;
  // A parentage result's counts are not "a decision about the variety".
  const sourceKey = parentage && markerSource === 'app.marker.source.lab' ? 'app.parentage.source.lab' : markerSource;
  // "Meets five of ICAR 2023's parentage checks": all five claims, each checked, a laboratory standing behind them.
  const certified =
    !!link &&
    parentage &&
    stands &&
    meetsAcceptance([{ ...link, ok: !!verdict?.ok }, ...more.map((m, i) => ({ ...m, ok: !!moreVerdicts[i]?.ok }))]);
  // The one plain line at the top (easy-mode review, 19 Nov), never kinder than the answers below:
  // every claim in the link and the lab's signature on it count.
  const top = claimVerdict({
    readable: !!link,
    off: viabilityOff,
    verdict,
    more: more.map((_, i) => moreVerdicts[i]),
    stillTesting: testingDate,
  });
  // The lab's signer, with its key's level (docs/lab-identity-levels.md), when the registry tied it.
  const signer = verdict?.ok && verdict.lab?.ok ? verdict.lab.signer : undefined;
  const signerWords =
    signer?.kind === 'bound'
      ? signerLabel(signer.attestation as ResolvedAttestation, 'Signed by', Date.now(), tr)
      : null;

  return (
    <Box sx={{ bgcolor: 'background.default' }} data-claim-check="">
      <Container component="main" maxWidth="sm" sx={{ py: { xs: 5, md: 8 }, overflowWrap: 'anywhere' }}>
        {top && (
          <CheckVerdict tone={top.tone}>
            {t(top.key, { date: top.date !== undefined ? tr.date(top.date, VERDICT_DATE) : '' })}
          </CheckVerdict>
        )}
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          {t('app.claim.check.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t('app.claim.check.intro')}
        </Typography>
        <CheckYourself sx={{ mt: -1.5, mb: 3 }} />
        {/* A number in a document: no plant or animal to be older than the date. */}
        <DatedNotOrigin kind="document" />
        {!link ? (
          <Alert severity="error" variant="outlined" data-claim-link="bad">
            {t('app.claim.check.bad')}
          </Alert>
        ) : viabilityOff ? (
          <ViabilityNotRead />
        ) : (
          <Stack spacing={2.5}>
            {certified && (
              <Paper sx={{ p: { xs: 2.5, md: 3 } }} data-parentage-cert="">
                <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
                  {t('app.parentage.cert.title')}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1.5 }}>
                  {t('app.parentage.cert.text')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('app.parentage.cert.bounds')}
                </Typography>
              </Paper>
            )}
            <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
              {/* What the link says: plain until the chain confirms it, never styled as a fact before. */}
              <Typography
                variant="h6"
                component="p"
                color={verdict?.ok ? 'text.primary' : 'text.secondary'}
                sx={{ mb: 1, textDecoration: verdict && !verdict.ok && !verdict.unreadable ? 'line-through' : 'none' }}
                data-claim-statement=""
                data-marker-joined={joined?.where === 'headline' ? '' : undefined}
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
              {/* Couldn't read it from Midnight: a warning, never the failure's cross (chain/read-failure.ts). */}
              {verdict && !verdict.ok && verdict.unreadable && (
                <Alert severity="warning" variant="outlined" data-claim-verdict="unreadable">
                  {t('app.claim.verdict.unreadable')}
                </Alert>
              )}
              {verdict && !verdict.ok && !verdict.unreadable && (
                <Alert severity="error" variant="outlined" data-claim-verdict="failed">
                  {t('app.claim.check.failed', { reason: errorReason(verdict.reason, tr) })}
                </Alert>
              )}
              {/* Whose numbers these are, in the footer's states: the lab's (count or call) only where it stands behind them. */}
              {isMarker && sourceKey && (
                <Typography variant="body2" sx={{ mt: 1.5 }} data-marker-source={sourceKey.split('.').pop()}>
                  {t(sourceKey)}
                </Typography>
              )}
            </Paper>
            {more.length > 0 && (
              <Paper sx={{ p: { xs: 2.5, md: 3 } }} data-marker-more={String(more.length)}>
                <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
                  {t('app.marker.more.title')}
                </Typography>
                <Stack spacing={1.5}>
                  {/* The joined line, when the link's first claim isn't one of the two: both checked. */}
                  {joined?.where === 'more' && (
                    <Typography variant="body1" sx={{ fontWeight: 700 }} data-marker-joined="more">
                      {t(joined.key, { m: joined.m, n: joined.n })}
                    </Typography>
                  )}
                  {more.map((m, i) => {
                    const v = moreVerdicts[i];
                    const failed = !!v && !v.ok && !v.unreadable;
                    return (
                      <Box
                        key={m.txId}
                        data-marker-more-claim={v ? (v.ok ? 'ok' : v.unreadable ? 'unreadable' : 'failed') : 'checking'}
                      >
                        <Typography
                          variant="body1"
                          color={v?.ok ? 'text.primary' : 'text.secondary'}
                          sx={{ textDecoration: failed ? 'line-through' : 'none' }}
                        >
                          {claimWords(m, tr, stands && !!v?.ok)}
                        </Typography>
                        <Typography variant="body2" color={failed ? 'error' : 'text.secondary'}>
                          {!v
                            ? t('app.claim.check.checking')
                            : v.ok
                              ? t('app.claim.check.okWhen', {
                                  block: String(v.blockHeight ?? '?'),
                                  date: v.blockTime ? ` (${tr.date(v.blockTime)})` : '',
                                })
                              : v.unreadable
                                ? t('app.claim.verdict.unreadable')
                                : t('app.claim.check.failed', { reason: errorReason(v.reason, tr) })}
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
                      severity={signerWords ? labIdentitySeverity(signerWords.identity.level) : 'info'}
                      variant="outlined"
                      data-claim-signer={verdict.lab.signer?.kind ?? 'none'}
                    >
                      {t('app.claim.check.labOk', {
                        key: keyShort(verdict.lab.attester),
                        block: String(verdict.lab.blockHeight ?? '?'),
                        date: verdict.lab.blockTime ? ` (${tr.date(verdict.lab.blockTime)})` : '',
                      })}{' '}
                      {signerWords ? (
                        <>
                          {signerWords.lead}
                          {t('app.common.period')}
                          <NameCheckText label={signerWords} />
                        </>
                      ) : verdict.lab.signer?.kind === 'retracted' ? (
                        withdrawnWords(verdict.lab.signer, isCall, tr)
                      ) : verdict.lab.signer?.kind === 'conflict' ? (
                        t('app.claim.check.labConflict')
                      ) : (
                        t('app.claim.check.labUnidentified')
                      )}
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
                    {/* A result file below says it with the result itself. */}
                    {!isCall && verdict.lab.signer?.kind !== 'retracted' && (
                      <Typography variant="body2" color="text.secondary" data-lab-sample-note="">
                        {t('app.lr.note.sample')}
                      </Typography>
                    )}
                  </Stack>
                ) : (
                  <Alert severity="error" variant="outlined">
                    {t('app.claim.check.labFailed', { reason: errorReason(verdict.lab.reason, tr) })}
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
                <DocumentDateView proof={recordDate.proof} anchor={recordDate.anchor} checker />
                <Fact label={t('app.doc.k.proofCode')} mono>
                  {anchoredFingerprintOf(link)}
                </Fact>
              </Stack>
            </Paper>
            {parentage && (
              <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
                <ParentageBands />
              </Paper>
            )}
            {isMarker && (
              <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
                <MarkerLimits parentage={parentage} />
              </Paper>
            )}
            <Typography variant="body2" color="text.secondary">
              {footer && t(footer.key, footer.call ? { call: t(footer.call) } : undefined)}
            </Typography>
          </Stack>
        )}
        {!testingDate && <MakeYourOwn />}
      </Container>
    </Box>
  );
};
