// AppHeader: the wordmark (to Home), the language and the network badge. Nothing else.
//
// It used to carry New record, Agreements, Receive, Signing key and Holder key: five
// controls on every screen, the "this is all over" Hunter named on 13 Oct 2026. Each now
// has one home: Log new and agreements on Home, a lab's two jobs in Home's lab panel, the
// holder key inside the one-file backup (Save your backup / Get your plants back). The
// receive and signing dialogs stay mounted here, without buttons, so Home and the paste
// box can open them from anywhere.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { ClaimTransfer } from './ClaimTransfer';
import { AttesterSetup } from './AttesterSetup';
import { Link as RouterLink } from 'react-router-dom';
import { WalletBadge } from './veilcore/WalletBadge';
import { ACCENT } from '../config/theme';
import { NETWORK } from '../config/network';
import { DraftBanner, LanguagePicker } from '../i18n/LanguagePicker';
import { useT } from '../i18n/app';

// The draft banner sits under the header, on every app page with one: a translation nobody
// fluent has checked yet says so (i18n/LanguagePicker.tsx). Nothing in a published language.
export const AppHeader: React.FC = () => {
  const { t } = useT();
  return (
    <>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: { xs: 3, md: 4 } }}
      >
        <Stack
          component={RouterLink}
          to="/records"
          aria-label={t('app.common.headerHome')}
          direction="row"
          spacing={1.25}
          sx={{ alignItems: 'center', textDecoration: 'none', minHeight: 44 }}
        >
          <Box
            aria-hidden="true"
            sx={{ width: 12, height: 12, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 14px ${ACCENT}` }}
          />
          {/* The wordmark is a link home, not a heading: each page's own h1 says where you are. */}
          <Typography
            variant="h6"
            component="span"
            sx={{ letterSpacing: '0.3em', fontWeight: 600, color: 'text.primary' }}
          >
            VEILCORE
          </Typography>
        </Stack>
        <ClaimTransfer hideButton />
        <AttesterSetup hideButton />
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <LanguagePicker />
          <WalletBadge network={NETWORK} />
        </Stack>
      </Stack>
      <DraftBanner />
    </>
  );
};
