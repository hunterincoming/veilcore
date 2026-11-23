// A key's identity level, in words, wherever a page shows a lab signature
// (docs/lab-identity-levels.md): "Not verified", "Listed on acme.com", "Verified against
// <listing>", or withdrawn. The words come from veilcore/lab-identity-words.ts; this draws them
// with an icon and a border so the level is plain at a glance, and links the website and the
// listing so a reader can look for themselves.
//
// Only phrasing elements (span, a, button): it sits inside a sentence's <p> on the check page.
// SPDX-License-Identifier: Apache-2.0

import React, { useId, useState } from 'react';
import { Box, Link } from '@mui/material';
import CautionIcon from '@mui/icons-material/WarningAmber';
import WebsiteIcon from '@mui/icons-material/Language';
import ListingIcon from '@mui/icons-material/CheckCircleOutlined';
import WithdrawnIcon from '@mui/icons-material/GppBad';
import type { LabIdentity } from '../veilcore/attesters';
import { labIdentityWords, type LabIdentityTone, type Part } from '../veilcore/lab-identity-words';
import { rich, useT } from '../i18n/app';
import { enT, type Translator } from '../i18n/translate';

/** Colours per tone, light and dark: the title text holds at least 7:1 on its background. */
const TONES: Record<LabIdentityTone, { light: [string, string, string]; dark: [string, string, string] }> = {
  // [background, border and icon, title]
  caution: { light: ['#FFF4E5', '#B26A00', '#6B3E00'], dark: ['rgba(255,167,38,0.14)', '#FFB74D', '#FFE0B2'] },
  withdrawn: { light: ['#FDECEA', '#C62828', '#7F1616'], dark: ['rgba(244,67,54,0.16)', '#EF9A9A', '#FFCDD2'] },
  website: { light: ['#E8F1FB', '#1565C0', '#0D3C78'], dark: ['rgba(66,165,245,0.14)', '#90CAF9', '#BBDEFB'] },
  listing: { light: ['#EAF5EC', '#2E7D32', '#1B4D1F'], dark: ['rgba(102,187,106,0.14)', '#A5D6A7', '#C8E6C9'] },
};

const ICONS: Record<LabIdentityTone, typeof CautionIcon> = {
  caution: CautionIcon,
  withdrawn: WithdrawnIcon,
  website: WebsiteIcon,
  listing: ListingIcon,
};

/** The app follows the device's light or dark setting (config/theme.ts appTheme); printed, light. */
const DARK = '@media screen and (prefers-color-scheme: dark)';
/** `pick` of a tone's colours, light, and dark on a dark screen. */
const toned = (tone: LabIdentityTone, pick: (c: [string, string, string]) => Record<string, string>) => ({
  ...pick(TONES[tone].light),
  [DARK]: pick(TONES[tone].dark),
});

/** "What does this mean?": what VeilCore checks, and how a lab becomes verified. */
const More: React.FC<{ tr: Translator }> = ({ tr }) => {
  const [open, setOpen] = useState(false);
  const id = useId();
  const b = (c: React.ReactNode) => <b>{c}</b>;
  return (
    <>
      <Link
        component="button"
        type="button"
        variant="body2"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        sx={{ display: 'block', mt: 0.75, minHeight: 32, textAlign: 'left', fontWeight: 600 }}
        data-lab-identity-more=""
      >
        {tr.t('app.labid.more')}
      </Link>
      {/* Drawn only when open, so a collapsed badge holds no other level's name. */}
      {open && (
        <Box component="span" id={id} sx={{ display: 'block', mt: 0.5 }}>
          {(
            [
              'app.labid.more.what',
              'app.labid.more.none',
              'app.labid.more.website',
              'app.labid.more.listing',
              'app.labid.more.withdrawn',
              'app.labid.more.how',
            ] as const
          ).map((k) => (
            <Box component="span" key={k} sx={{ display: 'block', mt: 0.5 }}>
              {rich(tr.t(k), { b })}
            </Box>
          ))}
        </Box>
      )}
    </>
  );
};

/**
 * `english`: inside a part that stays in English whatever the page's language (the certificate
 * card); there it has no "What does this mean?", as the card is also printed.
 */
export const LabIdentityBadge: React.FC<{ identity: LabIdentity; english?: boolean; more?: boolean }> = ({
  identity,
  english,
  more = true,
}) => {
  const page = useT();
  const tr = english ? enT : page;
  const w = labIdentityWords(identity, tr);
  const Icon = ICONS[w.tone];
  const href = 'href' in identity ? identity.href : '';
  const site = identity.level === 'listing' ? identity.website : null;
  // The website, shown in full and in bold, so a lookalike name is there to see.
  const domainLink = (domain: string, to: string, state: string) => (
    <Link
      href={to}
      target="_blank"
      rel="noopener noreferrer"
      data-lab-domain={state}
      // One unbroken line, so the whole name reads at once (a lookalike is spotted in full).
      sx={{
        fontWeight: 700,
        display: 'inline-block',
        maxWidth: '100%',
        whiteSpace: 'nowrap',
        overflowX: 'auto',
        verticalAlign: 'bottom',
      }}
    >
      {domain}
    </Link>
  );
  const nodes = (p: Part): React.ReactNode => {
    const vars: Record<string, React.ReactNode> = { ...p.vars };
    if (p.vars?.domain && identity.level === 'website') vars.domain = domainLink(identity.domain, href, 'listed');
    if (p.vars?.domain && identity.level === 'website-withdrawn')
      vars.domain = domainLink(identity.domain, href, 'withdrawn');
    if (p.vars?.domain && site) vars.domain = domainLink(site.domain, site.href, 'listed');
    if (p.vars?.listing && identity.level === 'listing')
      vars.listing = (
        <Link href={href} target="_blank" rel="noopener noreferrer" data-name-check-source="" sx={{ color: 'inherit' }}>
          {identity.listing}
        </Link>
      );
    // The sentence as written (placeholders kept), then laid out with the links in place.
    return rich(tr.t(p.key), {}, vars);
  };
  return (
    <Box
      component="span"
      role="group"
      aria-label={tr.t('app.labid.aria')}
      data-lab-identity={identity.level}
      sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'flex-start',
        mt: 1,
        p: 1.25,
        pl: 1.25,
        ...toned(w.tone, ([bg, edge]) => ({ backgroundColor: bg, border: `1px solid ${edge}` })),
        borderLeftWidth: 5,
        borderRadius: 1,
        color: 'text.primary',
        textAlign: 'left',
      }}
    >
      <Box
        component="span"
        sx={{ ...toned(w.tone, ([, edge]) => ({ color: edge })), display: 'inline-flex', pt: '1px' }}
      >
        <Icon fontSize="small" aria-hidden />
      </Box>
      <Box component="span" sx={{ display: 'block', minWidth: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
        <Box
          component="span"
          sx={{ fontWeight: 700, ...toned(w.tone, ([, , title]) => ({ color: title })) }}
          data-lab-identity-title=""
        >
          {nodes(w.title)}
        </Box>
        {tr.t('app.labid.dash')}
        {w.body.map((p, i) => (
          <React.Fragment key={p.key}>
            {i > 0 ? tr.t('app.signer.sep') : ''}
            {nodes(p)}
          </React.Fragment>
        ))}
        {more && !english && <More tr={tr} />}
      </Box>
    </Box>
  );
};
