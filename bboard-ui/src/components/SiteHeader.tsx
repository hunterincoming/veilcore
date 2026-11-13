// The one header, on every page: the public pages, the app and the check pages (fresh-eyes
// review, 12 Nov: there were three, the app had no way back to the site, and "Home" meant two
// different pages). The mark always goes to veilcore.org's home page; the same few links
// follow it everywhere; then the language, and on the app's pages which network this is.
// Under it, the notices every page carries (dating paused, a draft translation).
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Box, Container, Link, Stack } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';
import { DraftBanner, LanguagePicker } from '../i18n/lazy-picker';
import { DatingPausedNotice } from './DatingPausedNotice';
import { Wordmark } from './Wordmark';
import { hasRecordsHere } from './site/returning';
import { INK_COLOR, POLLEN } from '../config/theme';

const linkSx = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44,
  px: 0.25,
  fontSize: 15,
  fontWeight: 600,
  color: INK_COLOR,
  textDecoration: 'none',
  '&:hover': { textDecoration: 'underline', backgroundColor: 'transparent' },
} as const;

/** A link to a section of the home page: on the home page it scrolls, elsewhere it goes there first. */
const SectionLink: React.FC<{ id: string; sx?: object; children: React.ReactNode; data?: string }> = ({
  id,
  sx,
  children,
  data,
}) => {
  const onHome = useLocation().pathname === '/';
  const attrs = data ? { [data]: '' } : {};
  return onHome ? (
    <Link href={`#${id}`} sx={{ ...linkSx, ...sx }} {...attrs}>
      {children}
    </Link>
  ) : (
    <Link component={RouterLink} to={`/#${id}`} sx={{ ...linkSx, ...sx }} {...attrs}>
      {children}
    </Link>
  );
};

const ctaSx = {
  px: 1.5,
  borderRadius: '8px',
  background: POLLEN,
  '&:hover': { textDecoration: 'none', filter: 'brightness(0.96)', background: POLLEN },
} as const;

export const SiteHeader: React.FC<{
  /** The app's pages: which network this build is about, beside the language. */
  badge?: React.ReactNode;
}> = ({ badge }) => {
  const { t } = useI18n();
  // Someone coming back to this browser gets their records one click away.
  const [returning] = useState(hasRecordsHere);
  return (
    <Box component="header" data-site-header="" sx={{ pt: { xs: 1, md: 2.5 } }}>
      <Container maxWidth="lg">
        <Stack
          direction="row"
          useFlexGap
          sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 2, rowGap: 0.5 }}
        >
          <Stack
            component={RouterLink}
            to="/"
            aria-label={t('nav.home')}
            direction="row"
            sx={{ alignItems: 'center', textDecoration: 'none', minHeight: 44 }}
          >
            <Wordmark />
          </Stack>
          <Stack
            direction="row"
            useFlexGap
            sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, order: { xs: 1, md: 2 } }}
          >
            <LanguagePicker />
            {badge}
          </Stack>
          <Stack
            component="nav"
            aria-label={t('nav.main')}
            direction="row"
            useFlexGap
            sx={{
              alignItems: 'center',
              flexWrap: 'wrap',
              columnGap: { xs: 2, md: 2.5 },
              order: { xs: 2, md: 1 },
              flexBasis: { xs: '100%', md: 'auto' },
              ml: { md: 'auto' },
            }}
          >
            <SectionLink id="about">{t('m.nav.about')}</SectionLink>
            <Link component={RouterLink} to="/verify" sx={linkSx}>
              {t('m.foot.verify')}
            </Link>
            {returning ? (
              <Link component={RouterLink} to="/records" sx={{ ...linkSx, ...ctaSx }} data-your-records="">
                {t('m.nav.yours')}
              </Link>
            ) : (
              <SectionLink id="demo" sx={ctaSx}>
                {t('m.nav.demo')}
              </SectionLink>
            )}
          </Stack>
        </Stack>
        <Box sx={{ mt: { xs: 1, md: 2 }, '&:empty': { display: 'none' } }}>
          <DatingPausedNotice />
          <DraftBanner />
        </Box>
      </Container>
    </Box>
  );
};
