// /for-labs: a lab's way in from the site ("Use it as a lab" in the header, the home page's lab
// slide, How it works). The co-founder was asked how a lab sets up its signing key and couldn't
// find it (21 Nov): the site had no way for labs, and in the app the lab view hid behind a footer
// link.
//
// Since the full review (22 Nov) this is a page for a lab owner first: what the lab gets, what
// changes in its work, what it costs, how to use VeilCore its own way, and what happens if VeilCore
// disappears. Opening it changes nothing. Only its one button, "Set up your lab", gives the lab
// view (role.ts labDoorStep) and lands on the lab's home (/records), with the signing key screen
// open when this browser has no key yet. A browser that holds records or has been used before is
// asked once, plainly, before the lab's tools are added beside what is there; "Not now" (or
// Escape) leaves the view as it was. Nothing about any record changes either way.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { OPEN_SIGNING_KEY_STATE, getRole, labDoorStep, setRole } from '../../veilcore/role';
import { useRecords } from '../../veilcore/records';
import { holderKeyIfAny } from '../../veilcore/holder';
import { useT } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';

const REPO = 'https://github.com/hunterincoming';
/** The open code and the documents that say how to use it without veilcore.org. */
export const OWN_WAY_LINKS = {
  partners: `${REPO}/veilcore/blob/main/docs/PARTNERS.md`,
  selfHosting: `${REPO}/veilcore/blob/main/docs/SELF-HOSTING.md`,
  without: `${REPO}/veilcore/blob/main/docs/without-veilcore.md`,
  policy: `${REPO}/veilcore/blob/main/docs/maintenance-policy.md`,
  site: `${REPO}/veilcore`,
  registry: `${REPO}/veilcore-api`,
  sdk: `${REPO}/veilcore-sdk`,
} as const;

const Section: React.FC<{ title: string; children: React.ReactNode; data?: string; id?: string }> = ({
  title,
  children,
  data,
  id,
}) => (
  <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, scrollMarginTop: 16 }} data-lab-page-section={data} id={id}>
    <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
      {title}
    </Typography>
    <Stack spacing={1}>{children}</Stack>
  </Paper>
);

const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="body1" color="text.secondary">
    {children}
  </Typography>
);

/** A labelled line: the choice in bold, then what it means. */
const Choice: React.FC<{ k: AppKey; p: AppKey; link?: { href: string; label: AppKey } }> = ({ k, p, link }) => {
  const { t } = useT();
  return (
    <Box component="li" sx={{ mb: 1 }}>
      <Typography variant="body1">
        <strong>{t(k)}</strong> {t(p)}{' '}
        {link && (
          <Link href={link.href} target="_blank" rel="noopener noreferrer">
            {t(link.label)}
          </Link>
        )}
      </Typography>
    </Box>
  );
};

/**
 * "Use it your way": veilcore.org, the contracts in a lab's own software, or a copy run from the
 * open code. Said as plainly as docs/without-veilcore.md says it: nobody outside VeilCore has run
 * their own registry or fee service yet.
 */
export const UseItYourWay: React.FC = () => {
  const { t } = useT();
  return (
    <Section title={t('app.labpage.own.title')} data="own-way" id="own-way">
      <P>{t('app.labpage.own.lede')}</P>
      <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
        <Choice k="app.labpage.own.site.t" p="app.labpage.own.site.p" />
        <Choice
          k="app.labpage.own.plug.t"
          p="app.labpage.own.plug.p"
          link={{ href: OWN_WAY_LINKS.partners, label: 'app.labpage.own.plug.link' }}
        />
        <Choice
          k="app.labpage.own.run.t"
          p="app.labpage.own.run.p"
          link={{ href: OWN_WAY_LINKS.selfHosting, label: 'app.labpage.own.run.link' }}
        />
      </Box>
      <P>{t('app.labpage.own.plainly')}</P>
      <Typography variant="body2">
        <Link href={OWN_WAY_LINKS.policy} target="_blank" rel="noopener noreferrer">
          {t('app.labpage.own.policyLink')}
        </Link>
        {' · '}
        <Link href={OWN_WAY_LINKS.site} target="_blank" rel="noopener noreferrer">
          {t('app.labpage.own.codeLink')}
        </Link>
      </Typography>
    </Section>
  );
};

export const LabDoor: React.FC = () => {
  const { t } = useT();
  const navigate = useNavigate();
  const records = useRecords();
  const [asking, setAsking] = useState(false);
  // Arrived at "Use it your way" from About (/for-labs#own-way): that section, not the top.
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === '#own-way') document.getElementById('own-way')?.scrollIntoView();
  }, [hash]);

  /** The lab's home, with the key screen asked for (AttesterSetup opens it if there's no key). */
  const toLabHome = () => void navigate('/records', { state: { [OPEN_SIGNING_KEY_STATE]: true } });

  // Only the button starts setting up the lab (22 Nov: opening the page used to switch the view).
  const go = () => {
    // Anything kept here, or a browser that has been used here at all (it holds a holder key),
    // counts as a breeder's: asked, never quietly switched. A registry that failed or is slow
    // shows few or no records, and a breeder who received cuttings is still a breeder
    // (independent review, 21 Nov), so the holder key decides, not what has loaded. Only a
    // browser with nothing in it goes straight to the lab view.
    const used = records.length > 0 || holderKeyIfAny() !== null;
    const step = labDoorStep(getRole(), used);
    if (step === 'ask') return setAsking(true);
    if (step === 'lab') setRole('lab');
    toLabHome();
  };

  const notNow = () => setAsking(false);
  const setUp = (
    <Button
      variant="contained"
      size="large"
      onClick={go}
      sx={{ minHeight: 48, alignSelf: 'flex-start' }}
      data-lab-set-up=""
    >
      {t('app.labpage.setUp')}
    </Button>
  );
  return (
    <Box component="main" id="main" sx={{ maxWidth: 720, mx: 'auto', px: 2, py: { xs: 3, md: 5 } }} data-lab-page="">
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h3" component="h1" sx={{ fontSize: { xs: '2rem', md: '2.6rem' }, mb: 1 }}>
            {t('app.labpage.title')}
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {t('app.labpage.lede')}
          </Typography>
          {setUp}
        </Box>

        <Section title={t('app.labpage.gets.title')}>
          <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
            <Choice k="app.labpage.gets.key.t" p="app.labpage.gets.key.p" />
            <Choice k="app.labpage.gets.arrived.t" p="app.labpage.gets.arrived.p" />
            <Choice k="app.labpage.gets.results.t" p="app.labpage.gets.results.p" />
          </Box>
        </Section>

        <Section title={t('app.labpage.work.title')}>
          <P>{t('app.labpage.work.p1')}</P>
          <P>{t('app.labpage.work.p2')}</P>
          {/* A lab's daily export, sealed at once (/records/import): its columns are remembered on
              this device after the first file (veilcore/import-layouts.ts). */}
          <P>{t('app.labpage.work.sheet')}</P>
          <Typography variant="body1">
            <Link component={RouterLink} to="/records/import" data-lab-sheet-link="door">
              {t('app.labpage.work.sheetLink')}
            </Link>
          </Typography>
        </Section>

        <Section title={t('app.labpage.cost.title')}>
          <P>{t('app.labpage.cost.p')}</P>
        </Section>

        <UseItYourWay />

        <Section title={t('app.labpage.gone.title')}>
          <P>{t('app.labpage.gone.p')}</P>
          <Typography variant="body2">
            <Link href={OWN_WAY_LINKS.without} target="_blank" rel="noopener noreferrer">
              {t('app.labpage.gone.link')}
            </Link>
          </Typography>
        </Section>

        {setUp}
      </Stack>

      {/* Escape and a tap outside are "Not now". */}
      <Dialog open={asking} onClose={notNow} maxWidth="xs" fullWidth aria-labelledby="lab-door-title" data-lab-door="">
        <DialogTitle id="lab-door-title">{t('app.home.labDoor.title')}</DialogTitle>
        <DialogContent>
          {/* What changes, then what doesn't (review, 21 Nov). */}
          <Typography variant="body1" sx={{ mb: 1 }}>
            {t('app.home.labDoor.what')}
          </Typography>
          <Typography variant="body1">{t('app.home.labDoor.text')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={notNow} sx={{ minHeight: 44 }}>
            {t('app.home.labDoor.notNow')}
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setRole('both');
              toLabHome();
            }}
            sx={{ minHeight: 44 }}
          >
            {t('app.home.labDoor.add')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
