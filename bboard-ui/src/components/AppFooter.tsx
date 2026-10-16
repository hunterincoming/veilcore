// The footer. Since 15 October 2026 it is the public pages' footer band (site.css
// footer.bottom): Graphite, light text, the tag wordmark. The page ends the same way
// on the landing page and in the app, so they read as one product.
//
// Documents are reachable from the landing page and nowhere else, which means anyone
// who has started working has to leave what they are doing to find them. A lab needs
// the integration guide while integrating; counsel follows a record back to the
// evidence note. Both are the wrong moment to go hunting.
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, Container, Link, Stack, Typography } from '@mui/material';
import { INK_COLOR } from '../config/theme';
import { TagMark } from './site/TagMark';
import { Link as RouterLink } from 'react-router-dom';
import { useI18n } from '../i18n';
import { requestRoleChange, useRole } from '../veilcore/role';
import { useT } from '../i18n/app';

// On Graphite: 9.5:1 for the links, white for the group names and the focus ring, and the
// stamp red lightened for a dark ground (5.3:1) on the mark's stub.
const ON_DARK_MUTED = '#C3C8CF';
const ON_DARK_ACCENT = '#EC6A80';
const groupName = {
  display: 'block',
  fontSize: 15,
  fontWeight: 700,
  color: '#FFFFFF',
  textTransform: 'none',
  letterSpacing: 0,
  mb: { xs: 0, sm: 0.25 },
  flexBasis: { xs: '100%', sm: 'auto' },
} as const;
// Phones: a group's links run in rows that wrap, each a full finger tall, as in the public
// pages' footer (site.css), instead of one long column of single links.
const group = { flexWrap: 'wrap', columnGap: 2.5, rowGap: { xs: 0, sm: 1 } } as const;
const linkBox = {
  display: { xs: 'inline-flex', sm: 'inline' },
  alignItems: 'center',
  minHeight: { xs: 44, sm: 'auto' },
} as const;

const Item: React.FC<{ to: string; children: React.ReactNode; external?: boolean }> = ({ to, children, external }) => (
  <Link
    {...(external ? { href: to, target: '_blank', rel: 'noopener' } : { component: RouterLink, to })}
    underline="hover"
    sx={{
      ...linkBox,
      color: ON_DARK_MUTED,
      fontSize: 15,
      '&:hover': { color: '#FFFFFF' },
      '&:focus-visible': { outlineColor: '#FFFFFF' },
    }}
  >
    {children}
  </Link>
);

export const AppFooter: React.FC = () => {
  const { t } = useI18n();
  const tr = useT();
  const role = useRole();
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
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: '-0.015em',
                color: '#FFFFFF',
                mb: 1.5,
                '& svg': { color: '#FFFFFF', '--tm-stub': ON_DARK_ACCENT },
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
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 3, sm: 6 }}>
            <Stack direction={{ xs: 'row', sm: 'column' }} useFlexGap sx={group}>
              <Typography component="p" sx={groupName}>
                {t('footer.documents')}
              </Typography>
              <Item to="/docs/spec">{t('footer.spec')}</Item>
              <Item to="/docs/evidence">{t('footer.evidence')}</Item>
              <Item to="/docs/integrate">{t('footer.integrate')}</Item>
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
            </Stack>

            <Stack direction={{ xs: 'row', sm: 'column' }} useFlexGap sx={group}>
              <Typography component="p" sx={groupName}>
                {t('footer.thisSite')}
              </Typography>
              <Item to="/">{t('footer.whatThisIs')}</Item>
              <Item to="/records">{t('footer.yourRecords')}</Item>
              <Item to="/licenses">{t('footer.agreements')}</Item>
              <Item to="/privacy">{t('footer.privacy')}</Item>
              <Link
                component="button"
                type="button"
                onClick={requestRoleChange}
                underline="hover"
                sx={{
                  color: ON_DARK_MUTED,
                  '&:hover': { color: '#FFFFFF' },
                  '&:focus-visible': { outlineColor: '#FFFFFF' },
                  ...linkBox,
                  fontSize: 15,
                  textAlign: 'left',
                }}
              >
                {role
                  ? tr.t('app.home.roleChange', { view: tr.t(`app.home.roleView.${role}`) })
                  : tr.t('app.home.chooseView')}
              </Link>
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};
