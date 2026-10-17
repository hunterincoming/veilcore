// The four sections of the app, and the frame every step screen sits in.
//
// Each section always looks the same wherever it appears: its icon, its name, its colour.
// The colours (16 October 2026) are the inks a register is kept in, not a rainbow: Log is
// graphite (the pencil of the log book), Send slate, License violet (copying pencil),
// Prove iron-gall brown. None is notary blue, which is kept for what is actually dated or
// sealed, so a page of jobs isn't a page of blue, and none is red, which means an error. Each reads as text on white and on Wash
// (5.6:1 or more), they stay apart for colour-blind readers, and they never carry meaning
// alone: the icon and the name always come with them. Log's icon is a
// calendar being written in, not a leaf: a record can be a plant or an animal.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import LogIcon from '@mui/icons-material/EditCalendarOutlined';
import BoxIcon from '@mui/icons-material/Inventory2Outlined';
import DocIcon from '@mui/icons-material/DescriptionOutlined';
import CheckIcon from '@mui/icons-material/ManageSearchOutlined';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import { INK_COLOR, WASH } from '../../config/theme';
import { useI18n } from '../../i18n';

export type Section = 'log' | 'send' | 'license' | 'prove';

/**
 * `name` is the section's English name; useSectionName gives it in the visitor's language.
 * The frame's words are with the public pages' text (i18n/en.ts, app.frame.*): this file
 * comes with the first download (App.tsx focusScreenHeading), the app's own text doesn't.
 */
export const SECTIONS: Record<Section, { name: string; color: string; Icon: typeof LogIcon }> = {
  log: { name: 'Log', color: INK_COLOR, Icon: LogIcon },
  send: { name: 'Send & receive', color: '#485B75', Icon: BoxIcon },
  license: { name: 'License & royalties', color: '#542E61', Icon: DocIcon },
  prove: { name: 'Prove & check', color: '#684F36', Icon: CheckIcon },
};

/** A section's name in the visitor's language. */
export const useSectionName = (section: Section): string => useI18n().t(`app.frame.section.${section}`);

export const SectionBand: React.FC<{ section: Section; step?: string; extra?: React.ReactNode }> = ({
  section,
  step,
  extra,
}) => {
  const s = SECTIONS[section];
  const name = useSectionName(section);
  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{
        alignItems: 'center',
        px: 2,
        py: 1.1,
        borderRadius: 2,
        // One quiet ground for every job, with its name and icon in the job's colour: the
        // band says which job you are in without an outline round it (15 October 2026), and
        // Log's band is never a pink panel that could be taken for an error (16 October 2026).
        background: WASH,
      }}
    >
      <s.Icon sx={{ color: s.color }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: s.color, flex: 1 }}>
        {name}
      </Typography>
      {extra}
      {/* Shown here, read with the screen's heading (ScreenHeading), so it isn't read twice. */}
      {step && (
        <Typography variant="body2" aria-hidden="true" sx={{ fontWeight: 700, color: s.color }}>
          {step}
        </Typography>
      )}
    </Stack>
  );
};

/** Read by screen readers, not shown. */
export const visuallyHidden: React.CSSProperties = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: 1,
  margin: -1,
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: 1,
};

/**
 * Start a new screen at the top with focus on its heading (the h1, or the screen heading a
 * flow marks), so a screen reader says where they are and Tab starts from there. The
 * heading can arrive a moment later (a page that loads its record first), so it looks for
 * a second before giving up. Returns a cancel function for an effect's cleanup.
 */
export const focusScreenHeading = (): (() => void) => {
  if (typeof window === 'undefined') return () => undefined;
  window.scrollTo(0, 0);
  let tries = 0;
  let timer: number | undefined;
  const attempt = () => {
    const h =
      document.querySelector<HTMLElement>('[data-screen-heading]') ??
      document.querySelector<HTMLElement>('main h1, h1');
    if (h) {
      if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      return;
    }
    if (++tries < 20) timer = window.setTimeout(attempt, 50);
  };
  timer = window.setTimeout(attempt, 0);
  return () => window.clearTimeout(timer);
};

/**
 * A flow screen's heading. It takes focus when the screen changes (tabIndex -1: reachable
 * by script, not by Tab), and a step counter, when there is one, is part of what a screen
 * reader reads: "Step 3 of 4: Adding your date stamp".
 */
export const ScreenHeading: React.FC<
  React.PropsWithChildren<{ step?: string; component?: 'h1' | 'h2'; variant?: 'h4' | 'h5'; mb?: number }>
> = ({ step, component = 'h1', variant = 'h4', mb, children }) => (
  <Typography
    variant={variant}
    component={component}
    tabIndex={-1}
    data-screen-heading=""
    sx={{
      ...(variant === 'h4' ? { fontSize: { xs: '1.8rem', md: '2.2rem' } } : {}),
      overflowWrap: 'anywhere',
      scrollMarginTop: 16,
      ...(mb === undefined ? {} : { mb }),
    }}
  >
    {step && <span style={visuallyHidden}>{step}: </span>}
    {children}
  </Typography>
);

/**
 * A button that can't be used yet but can still be reached with Tab: it says it is
 * unavailable (aria-disabled), points at the line that says why (aria-describedby), and
 * looks disabled. The caller's onClick must check the same condition.
 */
export const softDisabled = (off: boolean, hintId: string) =>
  off ? { 'aria-disabled': true as const, 'aria-describedby': hintId, className: 'Mui-disabled' } : {};

/** A phone or tablet: say "tap", not "drag or click". */
export const isTouch = (): boolean => {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
  } catch {
    return false;
  }
};

/** One screen of a flow: the section band, the screen, and a way home that loses nothing. */
export const FlowFrame: React.FC<
  React.PropsWithChildren<{ section: Section; step?: string; extra?: React.ReactNode }>
> = ({ section, step, extra, children }) => {
  const { t } = useI18n();
  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <SectionBand section={section} step={step} extra={extra} />
      <Paper sx={{ p: { xs: 2.25, md: 3.5 }, mt: 1.5 }}>{children}</Paper>
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Button component={RouterLink} to="/records" startIcon={<HomeIcon />} color="inherit" sx={{ minHeight: 48 }}>
          {t('app.frame.home')}
        </Button>
      </Box>
    </Box>
  );
};
