// The one header, on every page: the public pages, the app and the check pages (fresh-eyes
// review, 12 Nov: there were three, the app had no way back to the site, and "Home" meant two
// different pages). The mark always goes to veilcore.org's home page; the same links follow it
// everywhere (How it works, About, Check a record, Use it as a lab, Get my records back, and
// "Make a record" or your records);
// since the site design of 21 Nov, How it works and About are pages of their own (/how-it-works,
// /founders), drawn on the night ground like the home page;
// then the language, and on the app's pages which network this is. Since the dark home page
// (18 Nov) the links follow the design: Updates and Team are in the footer, and the button goes
// straight to making a record (/new). On the home page the same header is drawn on the night
// ground (home.css, "the header on the home page"); the markup is the same everywhere. Under it, the notices every page carries
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
//
// For labs (21 Nov): the public pages carry "Use it as a lab", to /for-labs (lab/LabDoor.tsx), a
// page for a lab owner whose button gives the lab view and opens the signing key screen; the
// co-founder couldn't find a lab's way in from the site. On the app's pages the view menu
// (ViewSwitch.tsx) is there instead, after the language: on a phone it starts the second line,
// beside the network on a test build.
//
// By task (22 Nov): every link is something to read first (How it works, About) or something to
// do (Check a record, Use it as a lab, Get my records back, Make a record). It had mixed an
// audience ("For labs"), a place ("Your records") and actions, and a lab read "Your records" as
// the breeder's.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { Box, Container, Link, Stack } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';
import { DraftBanner, LanguagePicker } from '../i18n/lazy-picker';
import { DatingPausedNotice } from './DatingPausedNotice';
import { Wordmark } from './Wordmark';
import { hasRecordsHere } from './site/returning';
import { color, mix } from '../config/tokens';

const linkSx = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44,
  px: 0.25,
  fontSize: 15,
  fontWeight: 600,
  color: color.text,
  textDecoration: 'none',
  '&:hover': { textDecoration: 'underline', backgroundColor: 'transparent' },
} as const;

/** A link to one of the public pages, marked as the current page when it is. */
const SectionLink: React.FC<{ to: string; sx?: object; children: React.ReactNode }> = ({ to, sx, children }) => {
  const here = useLocation().pathname === to;
  return (
    <Link component={RouterLink} to={to} sx={{ ...linkSx, ...sx }} aria-current={here ? 'page' : undefined}>
      {children}
    </Link>
  );
};

const ctaSx = {
  px: 1.5,
  borderRadius: '8px',
  background: color.accent,
  '&:hover': { textDecoration: 'none', filter: 'brightness(0.96)', background: color.accent },
} as const;

const menuCtaSx = {
  mt: 0.5,
  borderRadius: '6px',
  background: color.accent,
  '&:hover': { filter: 'brightness(0.96)', background: color.accent },
} as const;

/** Where AskLauncher puts Ask on a phone (App.tsx AppLayout): the first item under "Menu". */
export const ASK_SLOT_ID = 'veilcore-ask-slot';

/** The design's pages (21 Nov 2026), inline from md up; on a phone in the menu. */
const sections = [
  { to: '/how-it-works', key: 'm.hero.how' },
  { to: '/founders', key: 'm.nav.about' },
] as const;

/** A lab's way in (lab/LabDoor.tsx), on the public pages. */
// Not /lab: that was the old lab-signing page, retired on purpose (lab-attest.test.ts).
export const LAB_DOOR = '/for-labs';

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
  const item = { ...linkSx, display: 'flex', px: 2, '&:hover': { backgroundColor: mix(color.text, 4) } } as const;
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
          <li key={s.to}>
            <SectionLink to={s.to} sx={item}>
              {t(s.key)}
            </SectionLink>
          </li>
        ))}
        <li>
          <Link component={RouterLink} to="/verify" sx={item}>
            {t('m.foot.verify')}
          </Link>
        </li>
        {!ask && (
          <li>
            <Link component={RouterLink} to={LAB_DOOR} sx={item} data-for-labs="menu">
              {t('m.nav.forLabs')}
            </Link>
          </li>
        )}
        {!returning && (
          <li>
            <Link component={RouterLink} to="/restore" sx={item} data-get-back="menu">
              {t('m.nav.getBack')}
            </Link>
          </li>
        )}
        {/* On a phone the demo or your records is here, not beside the mark (no room). */}
        <Box component="li" sx={{ display: { xs: 'block', sm: 'none' } }}>
          {returning ? (
            <Link component={RouterLink} to="/records" sx={{ ...item, ...menuCtaSx }} data-your-records="">
              {t('m.nav.yours')}
            </Link>
          ) : (
            <Link component={RouterLink} to="/new" sx={{ ...item, ...menuCtaSx }} data-cta="">
              {t('m.nav.demo')}
            </Link>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export const SiteHeader: React.FC<{
  /** The app's pages: which network this build is about, beside the language (test builds only). */
  badge?: React.ReactNode;
  /** The app's pages (Ask in the phone menu), whether or not they carry a badge. */
  app?: boolean;
  /** The app's pages: which view this is, Breeder, Lab or Both (ViewSwitch.tsx). */
  view?: React.ReactNode;
}> = ({ badge, view, app = !!badge || !!view }) => {
  const { t } = useI18n();
  // The home page draws this header on its night ground (home.css): the mark takes its dark-ground gold.
  const onHome = useLocation().pathname === '/';
  // Someone coming back to this browser gets their records one click away.
  const [returning] = useState(hasRecordsHere);
  const wide = { display: { xs: 'none', md: 'inline-flex' } } as const;
  // The demo or your records: beside the links from sm up; on a phone, under "Menu".
  const cta = { display: { xs: 'none', sm: 'inline-flex' } } as const;
  return (
    <Box component="header" data-site-header="" sx={{ pt: { xs: 1, md: 2.5 } }}>
      {/* Skip to the page's main part: off screen until a keyboard reaches it (accessibility
          review, 22 Nov). Every page has one <main>; it takes the focus. */}
      <Box
        component="a"
        href="#main"
        data-skip-link=""
        onClick={(e: React.MouseEvent) => {
          const main = document.querySelector('main');
          if (!main) return;
          e.preventDefault();
          if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
          main.focus();
        }}
        sx={{
          position: 'absolute',
          left: 8,
          top: -100,
          zIndex: (th) => th.zIndex.tooltip,
          px: 2,
          py: 1,
          borderRadius: '8px',
          background: color.accent,
          color: color.onAccent,
          fontWeight: 700,
          textDecoration: 'none',
          '&:focus': { top: 8 },
        }}
      >
        {t('nav.skip')}
      </Box>
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
            <Wordmark tone={onHome ? 'dark' : 'light'} />
          </Stack>
          <Stack
            component="nav"
            aria-label={t('nav.main')}
            direction="row"
            useFlexGap
            sx={{ alignItems: 'center', columnGap: { xs: 1, md: 2.5 } }}
          >
            {sections.map((s) => (
              <SectionLink key={s.to} to={s.to} sx={wide}>
                {t(s.key)}
              </SectionLink>
            ))}
            <Link component={RouterLink} to="/verify" sx={{ ...linkSx, ...wide }}>
              {t('m.foot.verify')}
            </Link>
            {/* Use it as a lab, on the public pages; the app's pages have the view menu, which
                sets the same lab view, so a person never meets two pickers at once. */}
            {!app && (
              <Link component={RouterLink} to={LAB_DOOR} sx={{ ...linkSx, ...wide }} data-for-labs="nav">
                {t('m.nav.forLabs')}
              </Link>
            )}
            {/* Get my records back, for a browser with nothing in it: for them "Your records"
                opened an empty Home whose first offer was this. Someone coming back has the
                button, "Your records". */}
            {!returning && (
              <Link component={RouterLink} to="/restore" sx={{ ...linkSx, ...wide }} data-get-back="nav">
                {t('m.nav.getBack')}
              </Link>
            )}
            {returning ? (
              <Link
                component={RouterLink}
                to="/records"
                sx={{ ...linkSx, ...ctaSx, ...cta }}
                data-your-records=""
                data-cta=""
              >
                {t('m.nav.yours')}
              </Link>
            ) : (
              <Link component={RouterLink} to="/new" sx={{ ...linkSx, ...ctaSx, ...cta }} data-cta="">
                {t('m.nav.demo')}
              </Link>
            )}
            <PhoneMenu ask={app} returning={returning} />
          </Stack>
          <LanguagePicker />
          {/* On the app's pages, after the language: the view (Breeder, Lab or Both), then the network;
              on a phone the line under the mark (the first line has no room for the view). */}
          {(view || badge) && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
                flexBasis: { xs: '100%', md: 'auto' },
              }}
            >
              {view}
              {badge}
            </Box>
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
