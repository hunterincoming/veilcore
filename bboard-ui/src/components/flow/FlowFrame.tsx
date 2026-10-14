// The four sections of the app, and the frame every step screen sits in.
//
// Each section always looks the same wherever it appears: its icon, its name, its colour.
// The colours are the Okabe–Ito set, chosen to stay distinct for colour-blind readers, and
// never carry meaning alone: the icon and the name always come with them.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import SpaIcon from '@mui/icons-material/SpaOutlined';
import BoxIcon from '@mui/icons-material/Inventory2Outlined';
import DocIcon from '@mui/icons-material/DescriptionOutlined';
import CheckIcon from '@mui/icons-material/ManageSearchOutlined';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import { TEAL } from '../../config/theme';

export type Section = 'log' | 'send' | 'license' | 'prove';

export const SECTIONS: Record<Section, { name: string; color: string; Icon: typeof SpaIcon }> = {
  log: { name: 'Log', color: TEAL, Icon: SpaIcon },
  send: { name: 'Send & receive', color: '#56B4E9', Icon: BoxIcon },
  license: { name: 'License & royalties', color: '#CC79A7', Icon: DocIcon },
  prove: { name: 'Prove & check', color: '#E69F00', Icon: CheckIcon },
};

export const SectionBand: React.FC<{ section: Section; step?: string; extra?: React.ReactNode }> = ({
  section,
  step,
  extra,
}) => {
  const s = SECTIONS[section];
  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{
        alignItems: 'center',
        px: 2,
        py: 1.1,
        borderRadius: 2,
        border: `1px solid ${s.color}55`,
        borderBottom: `3px solid ${s.color}`,
        background: `${s.color}14`,
      }}
    >
      <s.Icon sx={{ color: s.color }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: s.color, flex: 1 }}>
        {s.name}
      </Typography>
      {extra}
      {step && (
        <Typography variant="body2" sx={{ fontWeight: 700, color: s.color }}>
          {step}
        </Typography>
      )}
    </Stack>
  );
};

/** One screen of a flow: the section band, the screen, and a way home that loses nothing. */
export const FlowFrame: React.FC<
  React.PropsWithChildren<{ section: Section; step?: string; extra?: React.ReactNode }>
> = ({ section, step, extra, children }) => (
  <Box sx={{ maxWidth: 600, mx: 'auto' }}>
    <SectionBand section={section} step={step} extra={extra} />
    <Paper sx={{ p: { xs: 2.25, md: 3.5 }, mt: 1.5 }}>{children}</Paper>
    <Box sx={{ textAlign: 'center', mt: 2 }}>
      <Button component={RouterLink} to="/records" startIcon={<HomeIcon />} color="inherit" sx={{ minHeight: 48 }}>
        Home. Your progress is saved.
      </Button>
    </Box>
  </Box>
);
