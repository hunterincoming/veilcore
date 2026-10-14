// /backup: the one-file backup on its own page, for "Finish: save your backup" on Home.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../AppHeader';
import { BackupStep } from './BackupStep';
import { FlowFrame } from './FlowFrame';

export const BackupPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Box>
      <AppHeader />
      <FlowFrame section="log">
        <BackupStep title="Save your backup" finishLabel="Done" onDone={() => void navigate('/records')} />
      </FlowFrame>
    </Box>
  );
};
