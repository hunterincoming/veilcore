// /verify/example — what a record's check page looks like, line by line, with a note on
// what each line means. For a visitor who has no record id yet (the "Verify a record"
// demo on the home page sends them to /verify, which links here).
//
// Nothing here is fetched or checked, and the page says so at the top and in its title.
// Every line is drawn with the grey "reported" mark, never the tick: a tick on made-up
// data would be the thing VeilCore's check page exists to avoid. The legend shows what a
// tick means instead.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Alert, Box, Container, Divider, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import VerifiedIcon from '@mui/icons-material/VerifiedOutlined';
import LockIcon from '@mui/icons-material/LockOutlined';
import { ACCENT } from '../../config/theme';
import { Wordmark } from '../Wordmark';
import { IS_MAINNET } from '../../config/network';
import { Fact, FactKey } from './DisclosedFacts';
import { geneticsLabel } from '../../veilcore/disclosure';
import { useT } from '../../i18n/app';
import { networkWords } from '../../i18n/network-words';
import { LanguageBar } from '../../i18n/LanguagePicker';

const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="caption" sx={{ display: 'block', color: ACCENT, pl: 3.25, mt: -0.5, mb: 0.5 }}>
    {children}
  </Typography>
);

export const VerifyExample: React.FC = () => {
  const tr = useT();
  const { t } = tr;
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
        <LanguageBar />
        <Stack
          component={RouterLink}
          to="/"
          aria-label={t('app.verify.homeAria')}
          direction="row"
          spacing={1.25}
          sx={{
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
            mx: 'auto',
            width: 'fit-content',
            minHeight: 44,
            textDecoration: 'none',
            color: 'text.primary',
          }}
        >
          <Wordmark />
        </Stack>

        <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">{t('app.verify.ex.title')}</Typography>
          <Typography variant="body2">{t('app.verify.ex.intro')}</Typography>
        </Alert>

        <Paper sx={{ p: { xs: 3, md: 4 } }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
            <VerifiedIcon sx={{ color: 'text.disabled', fontSize: 30 }} />
            <Box>
              <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                {t('app.verify.ex.status')}
              </Typography>
              <Typography variant="h5">{t('app.verify.ex.name')}</Typography>
            </Box>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            VEIL-EXAMPLE
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Stack spacing={1.25}>
            <Fact ok={false}>{t('app.verify.ex.fact1')}</Fact>
            <Note>{t('app.verify.ex.note1')}</Note>
            <Fact ok={false}>{t('app.verify.ex.fact2')}</Fact>
            <Note>{t('app.verify.ex.note2')}</Note>
            <Fact ok={false}>{t('app.verify.ex.fact3', { test: IS_MAINNET ? '' : t('app.plant.date.testNote') })}</Fact>
            <Note>{t('app.verify.ex.note3', { network: networkWords(IS_MAINNET ? 'mainnet' : 'preprod', tr) })}</Note>
            <Fact ok={false}>{t('app.verify.ex.fact4')}</Fact>
            <Note>{t('app.verify.ex.note4')}</Note>

            <Divider sx={{ my: 0.5 }} />
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>
              {t('app.verify.sharedTitle')}
            </Typography>
            <Fact ok={false}>{t('app.verify.ex.fact5')}</Fact>
            <Note>{t('app.verify.ex.note5')}</Note>
            <Divider sx={{ my: 0.5 }} />
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <LockIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              <Typography variant="body2" color="text.disabled">
                {geneticsLabel(tr)}
              </Typography>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2.5 }} />
          <Stack spacing={1}>
            <FactKey />
            <Typography variant="body2" color="text.secondary">
              {t('app.verify.ex.marks')}
            </Typography>
          </Stack>
        </Paper>

        <Stack direction="row" spacing={3} sx={{ justifyContent: 'center', mt: 3, flexWrap: 'wrap', rowGap: 1 }}>
          <Box component={RouterLink} to="/verify" sx={{ color: ACCENT, py: 1 }}>
            {t('app.verify.ex.checkReal')}
          </Box>
          <Box component={RouterLink} to="/" sx={{ color: ACCENT, py: 1 }}>
            {t('app.verify.ex.what')}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};
