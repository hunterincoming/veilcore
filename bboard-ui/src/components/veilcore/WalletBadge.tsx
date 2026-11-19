// WalletBadge — the header's network indicator. It says which network this build
// describes, nothing about any one record: where a record was actually anchored is shown
// per record, from what the registry reports (an old record can sit on a test network
// even on the mainnet site).
//
// Test builds: "Demo" and "Test network", the warning that records there are practice data.
// A mainnet build shows no badge in the header (App.tsx, easy-mode review 19 Nov): "Web app"
// and "Main network" meant nothing to a first-time user, and the landing page's "What's live
// where" says what runs on the main network. The mainnet words stay here for any other use.
// The screens that simulate something say so where it happens.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Chip, Stack } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import ScienceIcon from '@mui/icons-material/ScienceOutlined';
import { useT } from '../../i18n/app';
import { NETWORK } from '../../config/network';

export const WalletBadge: React.FC<{ network: string }> = ({ network }) => {
  const { t } = useT();
  return (
    <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
      <Chip
        size="small"
        icon={<ScienceIcon />}
        variant="outlined"
        label={network === 'mainnet' ? t('app.common.badge.webApp') : t('app.common.badge.demo')}
      />
      <Chip
        size="small"
        icon={<BoltIcon />}
        variant="outlined"
        color={network === 'mainnet' ? 'primary' : 'default'}
        label={
          network === 'mainnet'
            ? t('app.common.badge.main')
            : network === 'undeployed'
              ? t('app.common.badge.local')
              : t('app.common.badge.test')
        }
      />
    </Stack>
  );
};

/** The header's badge for this build's network (SiteHeader on the app's pages). */
export const NetworkBadge: React.FC = () => <WalletBadge network={NETWORK} />;
