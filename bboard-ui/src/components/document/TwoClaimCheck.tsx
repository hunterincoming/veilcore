// The page a link to a claim about two records opens (/check-claim#p=…; veilcore/two-record-claims.ts).
// The claim is read from the claims contract's state for that one call and must match the link
// exactly (chain/claim-check.ts checkTwoClaim); each record it names is dated by its own proof
// code. What the claim does not show is said every time, and the numbers are said to be the
// holder's own: these forms are typed in by the holder, never signed by a laboratory.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert, CircularProgress, Container, Paper, Stack, Typography, Box } from '@mui/material';
import { comparedOf, datedCodesOf, readTwoClaimLink, type TwoVerdict } from '../../veilcore/two-record-claims';
import { DatedNotOrigin } from '../verify/DatedNotOrigin';
import { CheckVerdict, CheckYourself, MakeYourOwn } from '../verify/CheckParts';
import { claimVerdict, VERDICT_DATE } from '../verify/verdict';
import { useT } from '../../i18n/app';
import { DocumentDateView, Fact } from './DocumentParts';
import { useRecordDate } from '../verify/useAnchorCheck';
import { stillTesting } from '../verify/anchor-words';
import { NETWORK } from '../../config/network';
import { schemaWords } from './NumbersFields';
import { errorReason, messageOf } from '../../i18n/error-words';
import { TwoRecordLimits, slotList } from './TwoRecordParts';

type DateLookup = ReturnType<typeof useRecordDate>;

const RecordDated: React.FC<{ label: string; code: string; date: DateLookup }> = ({ label, code, date }) => {
  const { t } = useT();
  return (
    <Paper sx={{ p: { xs: 2.5, md: 3 } }} data-two-record={code}>
      <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
        {label}
      </Typography>
      <Stack spacing={1.5}>
        <DocumentDateView proof={date.proof} anchor={date.anchor} checker />
        <Fact label={t('app.doc.k.proofCode')} mono>
          {code}
        </Fact>
      </Stack>
    </Paper>
  );
};

/** Whether a record's date comes from a contract VeilCore is still testing (ClaimCheck.tsx does the same). */
const testing = (d: DateLookup): boolean =>
  stillTesting(
    d.anchor,
    d.proof !== 'checking' && d.proof.status === 'anchor-reported'
      ? (d.proof.proof.anchor?.network ?? NETWORK)
      : NETWORK,
  );

export const TwoClaimCheck: React.FC = () => {
  const tr = useT();
  const { t } = tr;
  const { hash } = useLocation();
  const link = readTwoClaimLink(hash);
  const [verdict, setVerdict] = useState<TwoVerdict>();
  useEffect(() => {
    // A new link starts unchecked: the last link's answer never shows under this one.
    setVerdict(undefined);
    if (!link) return;
    let live = true;
    void import('../../veilcore/chain/claim-check')
      .then(({ checkTwoClaim }) => checkTwoClaim(link))
      .catch((e: unknown) => ({ ok: false as const, reason: messageOf(e) }))
      .then((v) => live && setVerdict(v));
    return () => {
      live = false;
    };
    // The link is read from the hash; check again only when it changes.
  }, [hash]);

  const codes = link ? datedCodesOf(link) : undefined;
  // Both records' dates, looked up once for their cards and for whether to invite a record.
  const firstDate = useRecordDate(codes?.first);
  const secondDate = useRecordDate(codes?.second);
  const testingDate = testing(firstDate) || testing(secondDate);
  const top = claimVerdict({ readable: !!link, off: false, verdict, more: [], stillTesting: testingDate });
  const statement = !link
    ? ''
    : link.kind === 'distinct'
      ? t('app.tworec.check.distinct', { k: String(comparedOf(link.schema).k) })
      : (link.mayChange ?? []).length === 0
        ? t('app.tworec.check.unchangedNone')
        : t('app.tworec.check.unchanged', { list: slotList(link.schema, link.mayChange ?? [], tr) });

  return (
    <Box sx={{ bgcolor: 'background.default' }} data-claim-check="" data-two-check={link?.kind ?? 'bad'}>
      <Container component="main" maxWidth="sm" sx={{ py: { xs: 5, md: 8 }, overflowWrap: 'anywhere' }}>
        {top && (
          <CheckVerdict tone={top.tone}>
            {t(top.key, { date: top.date !== undefined ? tr.date(top.date, VERDICT_DATE) : '' })}
          </CheckVerdict>
        )}
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          {t('app.tworec.check.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t('app.tworec.check.intro')}
        </Typography>
        <CheckYourself sx={{ mt: -1.5, mb: 3 }} />
        <DatedNotOrigin kind="document" />
        {!link || !codes ? (
          <Alert severity="error" variant="outlined" data-claim-link="bad">
            {t('app.claim.check.bad')}
          </Alert>
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
              >
                {statement}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {t('app.claim.check.schema', { schema: schemaWords(link.schema, tr) })}
              </Typography>
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
                  {t('app.claim.check.failed', { reason: errorReason(verdict.reason, tr) })}
                </Alert>
              )}
            </Paper>
            <RecordDated
              label={t(link.kind === 'distinct' ? 'app.tworec.check.first' : 'app.tworec.check.earlier')}
              code={codes.first}
              date={firstDate}
            />
            <RecordDated
              label={t(link.kind === 'distinct' ? 'app.tworec.check.second' : 'app.tworec.check.correction')}
              code={codes.second}
              date={secondDate}
            />
            <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
              <TwoRecordLimits kind={link.kind} />
            </Paper>
          </Stack>
        )}
        {!testingDate && <MakeYourOwn />}
      </Container>
    </Box>
  );
};
