// The one footer, on every page: the public pages, the app and the check pages (fresh-eyes
// review, 12 Nov: there were three). Ink, paper-coloured text, the tag wordmark; the public
// pages' links and the app's in one set, so every page ends the same way.
//
// Documents are reachable from the landing page and nowhere else, which means anyone
// who has started working has to leave what they are doing to find them. A lab needs
// the integration guide while integrating; counsel follows a record back to the
// evidence note. Both are the wrong moment to go hunting.
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, Container, Link, Stack, Typography } from '@mui/material';
import { DISPLAY_FONT, INK_COLOR, POLLEN } from '../config/theme';
import { TagMark } from './site/TagMark';
import { Link as RouterLink } from 'react-router-dom';
import { useI18n } from '../i18n';

// On Ink: warm grey links (8.9:1), paper for the group names, and pollen gold (12.7:1) on
// the mark's stub, the underlines and the focus ring.
export const ON_DARK_MUTED = '#BDB7AA';
export const ON_DARK = '#F6F3EC';
const groupName = {
  display: 'block',
  fontSize: 15,
  fontWeight: 700,
  color: ON_DARK,
  textTransform: 'none',
  letterSpacing: 0,
  mb: { xs: 0, sm: 0.25 },
  flexBasis: { xs: '100%', sm: 'auto' },
} as const;
// Phones: a group's links run in rows that wrap, each a full finger tall, as in the public
// pages' footer (site.css), instead of one long column of single links.
const group = { flexWrap: 'wrap', columnGap: 2.5, rowGap: { xs: 0, sm: 1 } } as const;
export const linkBox = {
  display: { xs: 'inline-flex', sm: 'inline' },
  alignItems: 'center',
  minHeight: { xs: 44, sm: 'auto' },
} as const;

const Item: React.FC<{ to: string; children: React.ReactNode; external?: boolean }> = ({ to, children, external }) => (
  <Link
    {...(external
      ? to.startsWith('http')
        ? { href: to, target: '_blank', rel: 'noopener' }
        : { href: to }
      : { component: RouterLink, to })}
    underline="hover"
    sx={{
      ...linkBox,
      color: ON_DARK_MUTED,
      fontSize: 15,
      fontWeight: 400,
      '&:hover': { color: ON_DARK, backgroundColor: 'transparent' },
    }}
  >
    {children}
  </Link>
);

export const AppFooter: React.FC<{
  /** More of "This site": the app's "change view" (App.tsx AppLayout), where the role picker is. */
  children?: React.ReactNode;
}> = ({ children }) => {
  const { t } = useI18n();
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: INK_COLOR,
        color: ON_DARK_MUTED,
        mt: { xs: 7, sm: 12 },
        pt: { xs: 5, sm: 8 },
        pb: { xs: 5, sm: 6 },
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 3, md: 6 }}
          sx={{ justifyContent: 'space-between' }}
        >
          <Box sx={{ maxWidth: 360 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                fontFamily: DISPLAY_FONT,
                fontSize: 23,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: ON_DARK,
                mb: 1.5,
                '& svg': { color: ON_DARK, '--tm-stub': POLLEN },
              }}
            >
              <TagMark />
              VeilCore
            </Box>
            <Typography
              variant="caption"
              sx={{ display: 'block', color: ON_DARK_MUTED, lineHeight: 1.6, fontSize: 15 }}
            >
              {t('footer.about')}
            </Typography>
            {/* How a record is checked by hand lives in the home page's technical section. */}
            <Link
              component={RouterLink}
              to="/#technical"
              underline="always"
              sx={{
                ...linkBox,
                display: 'inline-block',
                mt: 1,
                color: ON_DARK,
                fontSize: 15,
                '&:hover': { backgroundColor: 'transparent' },
              }}
            >
              {t('footer.howCheck')}
            </Link>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 3, sm: 5 }} sx={{ flexWrap: 'wrap' }}>
            <Stack direction={{ xs: 'row', sm: 'column' }} useFlexGap sx={group}>
              <Typography component="p" sx={groupName}>
                {t('m.foot.explore')}
              </Typography>
              <Item to="/#about">{t('m.nav.about')}</Item>
              <Item to="/#demo">{t('m.foot.demo')}</Item>
              <Item to="/#updates">{t('m.nav.updates')}</Item>
              <Item to="/#live">{t('m.live.label')}</Item>
              <Item to="/founders">{t('m.nav.team')}</Item>
              <Item to="/verify">{t('m.foot.verify')}</Item>
            </Stack>

            <Stack direction={{ xs: 'row', sm: 'column' }} useFlexGap sx={group}>
              <Typography component="p" sx={groupName}>
                {t('footer.documents')}
              </Typography>
              <Item to="/docs/spec">{t('footer.spec')}</Item>
              <Item to="/docs/evidence">{t('footer.evidence')}</Item>
              <Item to="/docs/integrate">{t('footer.integrate')}</Item>
              <Item to="/partners">{t('footer.partners')}</Item>
            </Stack>

            <Stack direction={{ xs: 'row', sm: 'column' }} useFlexGap sx={group}>
              <Typography component="p" sx={groupName}>
                {t('footer.source')}
              </Typography>
              <Item to="/implementations">{t('footer.allImplementations')}</Item>
              <Item to="https://github.com/hunterincoming/veilcore-sdk" external>
                {t('footer.referenceImplementation')}
              </Item>
              <Item to="https://github.com/hunterincoming/veilcore-rs" external>
                {t('footer.rustImplementation')}
              </Item>
              {/* This site's own repository (re-review of ux-polish, 13 Nov: "GitHub" went to the
                  SDK a second time, and the site's code had no link). */}
              <Item to="https://github.com/hunterincoming/veilcore" external>
                {t('footer.siteCode')}
              </Item>
            </Stack>

            <Stack direction={{ xs: 'row', sm: 'column' }} useFlexGap sx={group}>
              <Typography component="p" sx={groupName}>
                {t('footer.thisSite')}
              </Typography>
              <Item to="/records">{t('footer.yourRecords')}</Item>
              <Item to="/licenses">{t('footer.agreements')}</Item>
              <Item to="/privacy">{t('footer.privacy')}</Item>
              <Item to="/terms">{t('footer.terms')}</Item>
              {children}
            </Stack>

            <Stack direction={{ xs: 'row', sm: 'column' }} useFlexGap sx={group}>
              <Typography component="p" sx={groupName}>
                {t('m.foot.contact')}
              </Typography>
              <Item to="mailto:mako@veilcore.org" external>
                mako@veilcore.org
              </Item>
              <Item to="mailto:hunter@veilcore.org" external>
                hunter@veilcore.org
              </Item>
              <Item to="https://x.com/VeilCoreProof" external>
                @VeilCoreProof
              </Item>
            </Stack>
          </Stack>
        </Stack>
        <Typography
          component="p"
          sx={{ mt: { xs: 4, sm: 6 }, color: ON_DARK_MUTED, fontSize: 13, display: 'flex', flexWrap: 'wrap', gap: 2 }}
        >
          <span>© 2026 VeilCore</span>
          <span>{t('m.foot.fine')}</span>
        </Typography>
      </Container>
    </Box>
  );
};
