// TrustPanel — answers the killer objection in plain breeder language:
// "What stops me from logging YOUR cultivar?"
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import ScheduleIcon from '@mui/icons-material/ScheduleOutlined';
import ScienceIcon from '@mui/icons-material/ScienceOutlined';
import GroupIcon from '@mui/icons-material/GroupOutlined';
import { ACCENT } from '../config/theme';
import { rich, useT } from '../i18n/app';
import type { AppKey } from '../i18n/app/en';

const POINTS: { icon: React.ReactNode; title: AppKey; body: AppKey }[] = [
  { icon: <ScheduleIcon />, title: 'app.home.trust.1t', body: 'app.home.trust.1b' },
  { icon: <ScienceIcon />, title: 'app.home.trust.2t', body: 'app.home.trust.2b' },
  { icon: <GroupIcon />, title: 'app.home.trust.3t', body: 'app.home.trust.3b' },
];

export const TrustPanel: React.FC = () => {
  const { t } = useT();
  return (
    <Paper sx={{ p: { xs: 2.5, md: 3.5 } }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        {rich(t('app.home.trust.title'), {
          em: (c) => (
            <Box component="span" sx={{ color: ACCENT }}>
              {c}
            </Box>
          ),
        })}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        {t('app.home.trust.lede')}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        {POINTS.map((p) => (
          <Stack key={p.title} direction="row" spacing={1.5}>
            <Box sx={{ color: ACCENT, mt: 0.25 }}>{p.icon}</Box>
            <Box>
              <Typography variant="subtitle2">{t(p.title)}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t(p.body, { thisSite: t('app.copy.thisSite') })}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Box>
    </Paper>
  );
};
