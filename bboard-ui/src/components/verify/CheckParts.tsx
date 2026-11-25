// The parts every check page shares (easy-mode review, 19 Nov): the one plain line at the very
// top, the "See the checks" fold for the detail behind it, and, at the bottom, the way to make a
// record of your own. Someone who opens a check link is often the next person to make a record.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Box, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import HourglassIcon from '@mui/icons-material/HourglassEmptyOutlined';
import WarningIcon from '@mui/icons-material/ReportProblemOutlined';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import { useT } from '../../i18n/app';
import type { VerdictTone } from './verdict';
import { recognise } from '../../veilcore/paste';

const ICON: Record<VerdictTone, React.ElementType> = {
  ok: CheckCircleIcon,
  wait: HourglassIcon,
  warn: WarningIcon,
  fail: CancelIcon,
};
const COLOR: Record<VerdictTone, string> = {
  ok: 'success.main',
  wait: 'text.secondary',
  warn: 'warning.main',
  fail: 'error.main',
};

/** The page's answer in one line. The words carry it; the mark beside them is decoration. */
export const CheckVerdict: React.FC<{ tone: VerdictTone; children: React.ReactNode }> = ({ tone, children }) => {
  const Mark = ICON[tone];
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start', mb: 1.5 }} role="status" data-verdict={tone}>
      <Mark aria-hidden="true" sx={{ color: COLOR[tone], fontSize: 28, mt: '1px', flexShrink: 0 }} />
      <Typography component="p" variant="h6" sx={{ lineHeight: 1.35, fontWeight: 700 }}>
        {children}
      </Typography>
    </Stack>
  );
};

/** "See the checks": opens the detail behind the answer. */
export const SeeTheChecks: React.FC<{ open: boolean; onToggle: () => void; controls: string }> = ({
  open,
  onToggle,
  controls,
}) => {
  const { t } = useT();
  return (
    <Link
      component="button"
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      data-see-checks=""
      sx={{ fontWeight: 700, minHeight: 44, textAlign: 'left' }}
    >
      {open ? t('app.verify.checks.hide') : t('app.verify.checks.see')}
    </Link>
  );
};

/** At the bottom of a check page: a date like this for your own plants or animals. */
export const MakeYourOwn: React.FC = () => {
  const { t } = useT();
  return (
    <Box
      component="aside"
      data-make-your-own=""
      sx={{ mt: 4, p: { xs: 2.5, md: 3 }, border: 1, borderColor: 'divider', borderRadius: 1, textAlign: 'center' }}
    >
      <Typography variant="subtitle1" component="p" sx={{ fontWeight: 700, mb: 1.5 }}>
        {t('app.verify.cta')}
      </Typography>
      <Button component={RouterLink} to="/new" variant="contained" size="large" sx={{ minHeight: 48 }}>
        {t('app.verify.ctaButton')}
      </Button>
    </Box>
  );
};

/**
 * One line wherever a record is shown to someone else (summit 5b item 15): a lookalike page or
 * an edited file looks just like this one, so the reader checks at veilcore.org or with a
 * checker they installed themselves.
 */
export const CheckYourself: React.FC<{ sx?: React.ComponentProps<typeof Typography>['sx'] }> = ({ sx }) => {
  const { t } = useT();
  return (
    <Typography variant="body2" color="text.secondary" data-check-yourself="" sx={sx}>
      {t('app.verify.checkYourself')}
    </Typography>
  );
};

/** The other check pages a link can name (their own words travel after the #). */
const CHECK_PAGES = ['/check-document', '/check-claim', '/check-lab-result'];

/**
 * A document, claim or lab-result check link: its path on this site, with its query and its #
 * part, whatever host it was written with, so a pasted link never leads off this site.
 */
export const checkPagePath = (raw: string): string | undefined => {
  const v = raw.replace(/\s+/g, '');
  if (!v.includes('/')) return undefined;
  const withScheme = /^[a-z0-9.-]+\.[a-z]{2,}(:\d+)?\//i.test(v) ? `https://${v}` : v;
  try {
    const u = new URL(withScheme, 'https://paste.invalid');
    return CHECK_PAGES.includes(u.pathname) ? `${u.pathname}${u.search}${u.hash}` : undefined;
  } catch {
    return undefined;
  }
};

/**
 * "Have another ID or link?" on a check page that found nothing. Only a record ID or a check link
 * opens anything (veilcore/paste.ts recognise: a link keeps only its path, so a pasted link never
 * leads off this site), and what was typed is never shown back.
 */
export const AnotherRecord: React.FC = () => {
  const { t } = useT();
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [bad, setBad] = useState(false);
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const p = recognise(value);
    const to = p.kind === 'record-link' ? p.path : checkPagePath(value);
    if (!to) return setBad(true);
    setValue('');
    void navigate(to);
  };
  return (
    <Box component="form" onSubmit={go} sx={{ mt: 2, textAlign: 'left' }} data-another-record="">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'flex-start' } }}>
        <TextField
          label={t('app.verify.another.label')}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setBad(false);
          }}
          error={bad}
          helperText={bad ? t('app.verify.another.bad') : ' '}
          size="small"
          fullWidth
          autoComplete="off"
          slotProps={{ htmlInput: { spellCheck: false } }}
        />
        <Button type="submit" variant="outlined" sx={{ minHeight: 40, flexShrink: 0 }}>
          {t('app.verify.another.go')}
        </Button>
      </Stack>
    </Box>
  );
};
