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
import { TEAL } from '../config/theme';
import { NETWORK } from '../config/network';
import { LanguagePicker } from '../i18n/LanguagePicker';

export const AppHeader: React.FC = () => (
  <Stack
    direction="row"
    sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: { xs: 3, md: 4 } }}
  >
    <Stack
      component={RouterLink}
      to="/records"
      aria-label="VeilCore: your plants"
      direction="row"
      spacing={1.25}
      sx={{ alignItems: 'center', textDecoration: 'none', minHeight: 44 }}
    >
      <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: TEAL, boxShadow: `0 0 14px ${TEAL}` }} />
      <Typography variant="h6" sx={{ letterSpacing: '0.3em', fontWeight: 600, color: 'text.primary' }}>
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
);
