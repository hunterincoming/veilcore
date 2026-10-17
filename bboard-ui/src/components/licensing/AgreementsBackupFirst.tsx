// Before the key that locks agreements is in a checked backup, nothing about an agreement
// can be saved (round 3, L1, L3): a change made then used to look done, and was gone on
// reload. Every agreement page shows this in place of the change, with the way forward.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Alert, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAgreementsWaitForBackup } from '../../veilcore/licenses';
import { useT } from '../../i18n/app';

export const AgreementsBackupFirst: React.FC = () => {
  const blocked = useAgreementsWaitForBackup();
  const { t } = useT();
  if (!blocked) return null;
  return (
    <Alert
      severity="warning"
      variant="outlined"
      data-agreements-backup-first=""
      sx={{ mb: 2 }}
      action={
        <Button component={RouterLink} to="/backup" color="inherit" variant="outlined" sx={{ minHeight: 44 }}>
          {t('app.home.saveIt')}
        </Button>
      }
    >
      {t('app.sealed.agreementsBackupFirst')}
    </Alert>
  );
};
