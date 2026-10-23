// /backup: the one-file backup on its own page, for "Finish: save your backup" on Home, and
// for a license waiting on it (it goes back there when done: backup-return.ts).
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../AppHeader';
import { BackupStep } from './BackupStep';
import { FlowFrame } from './FlowFrame';
import { useT } from '../../i18n/app';
import { takeBackupReturn } from './backup-return';

export const BackupPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useT();
  return (
    <Box>
      <AppHeader />
      <FlowFrame section="log">
        <BackupStep
          title={t('app.backup.title')}
          finishLabel={t('app.backup.done')}
          onDone={() => void navigate(takeBackupReturn() ?? '/records')}
        />
      </FlowFrame>
    </Box>
  );
};
