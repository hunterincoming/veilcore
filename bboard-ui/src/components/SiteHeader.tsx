// The one header, on every page: the public pages, the app and the check pages (fresh-eyes
// review, 12 Nov: there were three, the app had no way back to the site, and "Home" meant two
// different pages). The mark always goes to veilcore.org's home page; the same links follow it
// everywhere (About, Updates, Team, Verify, and the demo or your records); then the language,
// and on the app's pages which network this is. Under it, the notices every page carries
// (dating paused, a draft translation).
//
// The parts come in the page in the order they are drawn, so the keyboard meets them in the
// order the eye does (review of ux-polish, 13 Nov: no CSS order).
//
// On a phone it is one line (the mark, the language, "Menu"), and on the app's pages a second
// line with the network (re-review of ux-polish, 13 Nov: it had grown to three or four lines
// at 360px and pushed the Japanese home page's way in for labs under the first screen). The
// section links, Verify, the demo or your records, and on the app's pages Ask, are under
// "Menu" (Ask is put there by AskLauncher.tsx; as a bubble or a header button it either
// covered the page or took a line of its own).
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
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

const menuCtaSx = {
  mt: 0.5,
  borderRadius: '6px',
  background: POLLEN,
  '&:hover': { filter: 'brightness(0.96)', background: POLLEN },
} as const;

/** Where AskLauncher puts Ask on a phone (App.tsx AppLayout): the first item under "Menu". */
export const ASK_SLOT_ID = 'veilcore-ask-slot';

/** The section links, inline from md up; on a phone in the menu. */
const sections = [
  { id: 'about', key: 'm.nav.about' },
  { id: 'updates', key: 'm.nav.updates' },
  { id: 'team', key: 'm.nav.team' },
] as const;

/**
 * Below md: the section links and Verify under one "Menu" button, a list that drops below it; on
 * a phone also the demo or your records, and on the app's pages Ask. The list is always in the
 * page (hidden while closed), so AskLauncher has somewhere to put Ask.
 */
const PhoneMenu: React.FC<{ ask: boolean; returning: boolean }> = ({ ask, returning }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const { pathname, hash } = useLocation();
  // A link followed closes it.
  useEffect(() => setOpen(false), [pathname, hash]);
  // Escape closes it and puts focus back on its button; a tap outside closes it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    // Anything chosen in it closes it, Ask too (a portal: React's own click never reaches here).
    const onClick = (e: MouseEvent) => {
      const hit = e.target instanceof Element ? e.target.closest('a, button') : null;
      if (hit && box.current?.querySelector('ul')?.contains(hit)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('click', onClick);
    };
  }, [open]);
  const item = { ...linkSx, display: 'flex', px: 2, '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } } as const;
  return (
    <Box ref={box} sx={{ position: 'relative', display: { xs: 'block', md: 'none' } }}>
      <Box
        component="button"
        type="button"
        ref={button}
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen(!open)}
        data-site-menu-button=""
        sx={{
          ...linkSx,
          px: 1.25,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px',
          background: 'transparent',
          cursor: 'pointer',
          font: 'inherit',
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        {t('m.nav.menu')}
      </Box>
      <Box
        component="ul"
        id="site-menu"
        data-site-menu=""
        hidden={!open}
        sx={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 4px)',
          zIndex: (th) => th.zIndex.appBar,
          m: 0,
          p: 0.5,
          listStyle: 'none',
          minWidth: 200,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px',
          boxShadow: 3,
          '&[hidden]': { display: 'none' },
          '& > li:empty': { display: 'none' },
        }}
      >
        {/* Ask, on the app's pages, where AskLauncher offers it (not on an agreement's screens). */}
        {ask && <li id={ASK_SLOT_ID} />}
        {sections.map((s) => (
          <li key={s.id}>
            <SectionLink id={s.id} sx={item}>
              {t(s.key)}
            </SectionLink>
          </li>
        ))}
        <li>
          <Link component={RouterLink} to="/verify" sx={item}>
            {t('m.foot.verify')}
          </Link>
        </li>
        {/* On a phone the demo or your records is here, not beside the mark (no room). */}
        <Box component="li" sx={{ display: { xs: 'block', sm: 'none' } }}>
          {returning ? (
            <Link component={RouterLink} to="/records" sx={{ ...item, ...menuCtaSx }} data-your-records="">
              {t('m.nav.yours')}
            </Link>
          ) : (
            <SectionLink id="demo" sx={{ ...item, ...menuCtaSx }}>
              {t('m.nav.demo')}
            </SectionLink>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export const SiteHeader: React.FC<{
  /** The app's pages: which network this build is about, beside the language. */
  badge?: React.ReactNode;
}> = ({ badge }) => {
  const { t } = useI18n();
  // Someone coming back to this browser gets their records one click away.
  const [returning] = useState(hasRecordsHere);
  const wide = { display: { xs: 'none', md: 'inline-flex' } } as const;
  // The demo or your records: beside the links from sm up; on a phone, under "Menu".
  const cta = { display: { xs: 'none', sm: 'inline-flex' } } as const;
  return (
    <Box component="header" data-site-header="" sx={{ pt: { xs: 1, md: 2.5 } }}>
      <Container maxWidth="lg">
        <Stack
          direction="row"
          useFlexGap
          sx={{ alignItems: 'center', flexWrap: 'wrap', columnGap: { xs: 1, md: 2.5 }, rowGap: 0.5 }}
        >
          <Stack
            component={RouterLink}
            to="/"
            aria-label={t('nav.home')}
            direction="row"
            sx={{ alignItems: 'center', textDecoration: 'none', minHeight: 44, mr: 'auto' }}
          >
            <Wordmark />
          </Stack>
          <Stack
            component="nav"
            aria-label={t('nav.main')}
            direction="row"
            useFlexGap
            sx={{ alignItems: 'center', columnGap: { xs: 1, md: 2.5 } }}
          >
            {sections.map((s) => (
              <SectionLink key={s.id} id={s.id} sx={wide}>
                {t(s.key)}
              </SectionLink>
            ))}
            <Link component={RouterLink} to="/verify" sx={{ ...linkSx, ...wide }}>
              {t('m.foot.verify')}
            </Link>
            {returning ? (
              <Link component={RouterLink} to="/records" sx={{ ...linkSx, ...ctaSx, ...cta }} data-your-records="">
                {t('m.nav.yours')}
              </Link>
            ) : (
              <SectionLink id="demo" sx={{ ...ctaSx, ...cta }}>
                {t('m.nav.demo')}
              </SectionLink>
            )}
            <PhoneMenu ask={!!badge} returning={returning} />
          </Stack>
          <LanguagePicker />
          {/* On the app's pages, after the language: on a phone the line under the mark. */}
          {badge && (
            <Box sx={{ display: 'flex', alignItems: 'center', flexBasis: { xs: '100%', md: 'auto' } }}>{badge}</Box>
          )}
        </Stack>
        <Box sx={{ mt: { xs: 1, md: 2 }, '&:empty': { display: 'none' } }}>
          <DatingPausedNotice />
          <DraftBanner />
        </Box>
      </Container>
    </Box>
  );
};
