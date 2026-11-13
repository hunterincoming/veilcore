// The frame of the public pages: the one header and footer (SiteHeader.tsx, AppFooter.tsx).
// Laid out from Mako's 25 September templates; light since 14 October 2026, like the
// record pages (config/theme.ts). Redesigned 15 October around the plant tag: the same
// palette, typeface (main.tsx) and mark as the app. The record pages keep their own layout.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { ThemeProvider } from '@mui/material';
import { useI18n } from '../../i18n';
import { lightTheme } from '../../config/theme';
import { SiteHeader } from '../SiteHeader';
import { AppFooter } from '../AppFooter';
import './site.css';

export const SDK_REPO = 'https://github.com/hunterincoming/veilcore-sdk';
export const X_HANDLE = 'https://x.com/VeilCoreProof';
export const FOUNDERS_MAIL = 'mailto:mako@veilcore.org?cc=hunter@veilcore.org';

/**
 * A founder's role as the translations write it, "Co-Founder & CEO · Tokyo": the title and
 * the place are set on two lines instead of joined by a dot. The words are unchanged.
 */
export const roleParts = (text: string): string[] => text.split(/\s*·\s*/);

export const RoleLine: React.FC<{ text: string; className?: string; as?: 'span' | 'p' }> = ({
  text,
  className,
  as: Tag = 'span',
}) => (
  <Tag className={className}>
    {roleParts(text).map((part, i) => (
      <span className="role-part" key={i}>
        {part}
      </span>
    ))}
  </Tag>
);

export const SiteShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { lang } = useI18n();
  // The language picker, the draft notice, the header and footer are MUI parts: give them the
  // light theme too. The header and footer are the ones every page has (fresh-eyes review,
  // 12 Nov), outside .vcm so the public pages' own styles don't reach them.
  return (
    <ThemeProvider theme={lightTheme}>
      <SiteHeader />
      {/* lang here as well as on <html>: site.css sets Japanese line breaking with :lang(ja). */}
      <div className="vcm" lang={lang}>
        <main>{children}</main>
      </div>
      <AppFooter />
    </ThemeProvider>
  );
};
