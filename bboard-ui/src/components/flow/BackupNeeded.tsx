// Home's one backup line, for the whole account, shown only while a backup is needed (easy-mode
// review, 19 Nov). It replaces three ways of saying the same thing: "1 locked copy not uploaded
// yet — save and check your backup…" in "Still in progress", "Not in your backup yet · next:
// save your backup" on each new record, and a red line under some of them.
//
// Wording and layout only: what needs a backup, and what waits for one, are as before (keys only
// in this browser, keys-only-here.ts; locked copies held back until a checked backup, records.ts
// unsavedReason; the vault key, useVaultNeedsBackup). Records saved before locking keep their own
// longer warning, which says what stays readable until then (app.sealed.backupBeforeLocking).
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Alert, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { rich, useT } from '../../i18n/app';

/** Whether Home should ask for a backup, and in which words. */
export const backupNeed = (f: {
  keysOnlyHere: number;
  waitingForBackup: boolean;
  vaultUnbacked: boolean;
  legacyWaiting: boolean;
}): 'none' | 'line' | 'before-locking' =>
  f.vaultUnbacked && f.legacyWaiting
    ? 'before-locking'
    : f.keysOnlyHere > 0 || f.waitingForBackup || f.vaultUnbacked
      ? 'line'
      : 'none';

export const BackupNeeded: React.FC<{ need: 'none' | 'line' | 'before-locking' }> = ({ need }) => {
  const { t } = useT();
  const navigate = useNavigate();
  if (need === 'none') return null;
  return (
    // The button under the sentence, not beside it: on a phone a side button squeezed the line
    // into one word per row.
    <Alert severity="warning" variant="outlined" data-backup-needed={need}>
      {rich(t(need === 'before-locking' ? 'app.sealed.backupBeforeLocking' : 'app.home.backupLine'), {
        b: (c) => <b>{c}</b>,
      })}
      <Box sx={{ mt: 1.25 }}>
        <Button color="inherit" variant="outlined" onClick={() => void navigate('/backup')} sx={{ minHeight: 44 }}>
          {t('app.pickup.saveBackup')}
        </Button>
      </Box>
    </Alert>
  );
};
