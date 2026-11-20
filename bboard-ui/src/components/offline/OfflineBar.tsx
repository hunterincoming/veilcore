// The app's one line about the connection (docs/offline.md): with no signal, what still works
// and what waits; and, once the offline worker has copied a newer release than the page in front
// of the person, that a newer version is ready. Nothing when there is signal and nothing new.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Alert, Button } from '@mui/material';
import { useOfflineState } from '../../offline/register';
import { useT } from '../../i18n/app';

export const OfflineBar: React.FC = () => {
  const s = useOfflineState();
  const { t } = useT();
  if (!s.online)
    return (
      <Alert severity="info" variant="outlined" sx={{ mb: 2 }} data-offline-bar="" role="status">
        {t('app.offline.bar')}
      </Alert>
    );
  if (s.updateReady)
    return (
      <Alert
        severity="info"
        variant="outlined"
        sx={{ mb: 2 }}
        data-update-ready=""
        role="status"
        action={
          <Button color="inherit" onClick={() => location.reload()} sx={{ minHeight: 44 }}>
            {t('app.offline.reload')}
          </Button>
        }
      >
        {t('app.offline.updated')}
      </Alert>
    );
  return null;
};
