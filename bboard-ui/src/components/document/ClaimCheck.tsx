// The page a claim link opens (/check-claim#c=…; veilcore/claim-link.ts). The claim is read
// from the claims contract's state for that one call and must match the link exactly; the
// record it is about is dated by its own proof code, recomputed from the claim and the key
// binding. What the claim can't show is said every time.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Alert, Box, CircularProgress, Container, Paper, Stack, Typography } from '@mui/material';
import { anchoredFingerprintOf, readClaimLink, type ClaimVerdict } from '../../veilcore/claim-link';
import { Wordmark } from '../Wordmark';
import { LanguageBar } from '../../i18n/LanguagePicker';
import { useT } from '../../i18n/app';
import { DocumentDate, Fact } from './DocumentParts';
import { claimWords } from './ProveNumber';
import { schemaWords } from './NumbersFields';

export const ClaimCheck: React.FC = () => {
  const tr = useT();
  const { t } = tr;
  const { hash } = useLocation();
  const link = readClaimLink(hash);
  const [verdict, setVerdict] = useState<ClaimVerdict>();
  useEffect(() => {
    if (!link) return;
    let live = true;
    void import('../../veilcore/chain/claim-check').then(({ checkClaim }) =>
      checkClaim(link).then((v) => live && setVerdict(v)),
    );
    return () => {
      live = false;
    };
    // The link is read from the hash; check again only when it changes.
  }, [hash]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }} data-claim-check="">
      <Container component="main" maxWidth="sm" sx={{ py: { xs: 5, md: 8 }, overflowWrap: 'anywhere' }}>
        <LanguageBar />
        <Stack
          component={RouterLink}
          to="/"
          direction="row"
          sx={{
            justifyContent: 'center',
            mb: 2,
            mx: 'auto',
            width: 'fit-content',
            minHeight: 44,
            color: 'text.primary',
          }}
        >
          <Wordmark />
        </Stack>
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          {t('app.claim.check.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t('app.claim.check.intro')}
        </Typography>
        {!link ? (
          <Alert severity="error" variant="outlined" data-claim-link="bad">
            {t('app.claim.check.bad')}
          </Alert>
        ) : (
          <Stack spacing={2.5}>
            <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
              <Typography variant="h6" component="p" sx={{ mb: 1 }} data-claim-statement="">
                {claimWords(link, tr)}
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
                  {t('app.claim.check.failed', { reason: verdict.reason })}
                </Alert>
              )}
            </Paper>
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
            <Typography variant="body2" color="text.secondary">
              {t('app.claim.check.what')}
            </Typography>
          </Stack>
        )}
      </Container>
    </Box>
  );
};
