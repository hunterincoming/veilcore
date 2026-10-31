// The frame of the public pages: navigation, language picker, draft banner, footer.
// Laid out from Mako's 25 September templates; light since 14 October 2026, like the
// record pages (config/theme.ts). Redesigned 15 October around the plant tag: the same
// palette, typeface (main.tsx) and mark as the app. The record pages keep their own layout.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { useI18n } from '../../i18n';
import { lightTheme } from '../../config/theme';
import { DraftBanner, LanguagePicker } from '../../i18n/lazy-picker';
import { TagMark } from './TagMark';
import { hasRecordsHere } from './returning';
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

/** An in-page section link that works from any public page: on home it scrolls, elsewhere it goes home first. */
const Section: React.FC<{ id: string; className?: string; children: React.ReactNode; onClick?: () => void }> = ({
  id,
  className,
  children,
  onClick,
}) => {
  const onHome = useLocation().pathname === '/';
  return onHome ? (
    <a href={`#${id}`} className={className} onClick={onClick}>
      {children}
    </a>
  ) : (
    <RouterLink to={`/#${id}`} className={className} onClick={onClick}>
      {children}
    </RouterLink>
  );
};

export const SiteShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  // Someone coming back to this browser gets their records one click away.
  const [returning] = useState(hasRecordsHere);
  const close = () => setOpen(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  // Escape closes the open menu, on every public page, and puts focus back on its button.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      menuBtn.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  // The language picker and the draft banner are MUI parts: give them the light theme too.
  return (
    <ThemeProvider theme={lightTheme}>
      {/* lang here as well as on <html>: site.css sets Japanese line breaking with :lang(ja). */}
      <div className="vcm" lang={lang}>
        <nav className="top" aria-label={t('nav.main')}>
          <div className="nav-in">
            <RouterLink className="brand" to="/">
              <TagMark />
              VeilCore
            </RouterLink>
            <div className="nav-right">
              <button
                ref={menuBtn}
                type="button"
                className="menu-btn"
                aria-expanded={open}
                aria-controls="site-menu"
                onClick={() => setOpen(!open)}
              >
                {t('m.nav.menu')}
              </button>
              <ul className={`nav-links${open ? ' open' : ''}`} id="site-menu">
                {/* Every item is a section of the home page, in the order they come down it, so
                    the menu behaves one way (Mako's note, 30 Oct). The specification is for
                    engineers: it's in the footer with the other documents. */}
                <li>
                  <Section id="about" onClick={close}>
                    {t('m.nav.about')}
                  </Section>
                </li>
                <li>
                  <Section id="updates" onClick={close}>
                    {t('m.nav.updates')}
                  </Section>
                </li>
                <li>
                  <Section id="team" onClick={close}>
                    {t('m.nav.team')}
                  </Section>
                </li>
                <li>
                  {returning ? (
                    <RouterLink to="/records" className="nav-cta" onClick={close} data-your-records="">
                      {t('m.nav.yours')}
                    </RouterLink>
                  ) : (
                    <Section id="demo" className="nav-cta" onClick={close}>
                      {t('m.nav.demo')}
                    </Section>
                  )}
                </li>
              </ul>
              <LanguagePicker />
            </div>
          </div>
        </nav>

        <main>
          <div className="wrap draft-wrap">
            <DraftBanner />
          </div>
          {children}
        </main>

        <footer className="bottom">
          <div className="wrap">
            <div className="foot">
              <div>
                <RouterLink className="brand" to="/">
                  <TagMark />
                  VeilCore
                </RouterLink>
                <p className="foot-about">{t('m.foot.about')}</p>
              </div>
              <div>
                <h3>{t('m.foot.explore')}</h3>
                <ul>
                  <li>
                    <Section id="about">{t('m.nav.about')}</Section>
                  </li>
                  <li>
                    <Section id="demo">{t('m.foot.demo')}</Section>
                  </li>
                  <li>
                    <RouterLink to="/founders">{t('m.nav.team')}</RouterLink>
                  </li>
                  <li>
                    <Section id="updates">{t('m.nav.updates')}</Section>
                  </li>
                  <li>
                    <Section id="live">{t('m.live.label')}</Section>
                  </li>
                </ul>
              </div>
              <div>
                <h3>{t('m.foot.build')}</h3>
                <ul>
                  <li>
                    <RouterLink to="/docs/spec">{t('footer.spec')}</RouterLink>
                  </li>
                  <li>
                    <RouterLink to="/partners">{t('footer.partners')}</RouterLink>
                  </li>
                  <li>
                    <RouterLink to="/docs/integrate">{t('footer.integrate')}</RouterLink>
                  </li>
                  <li>
                    <RouterLink to="/docs/evidence">{t('footer.evidence')}</RouterLink>
                  </li>
                  <li>
                    <RouterLink to="/implementations">{t('footer.allImplementations')}</RouterLink>
                  </li>
                  <li>
                    <a href={SDK_REPO} rel="noopener noreferrer" target="_blank">
                      GitHub
                    </a>
                  </li>
                  <li>
                    <RouterLink to="/verify">{t('m.foot.verify')}</RouterLink>
                  </li>
                </ul>
              </div>
              <div>
                <h3>{t('m.foot.contact')}</h3>
                <ul>
                  <li>
                    <a href="mailto:mako@veilcore.org">mako@veilcore.org</a>
                  </li>
                  <li>
                    <a href="mailto:hunter@veilcore.org">hunter@veilcore.org</a>
                  </li>
                  <li>
                    <a href={X_HANDLE} rel="noopener noreferrer" target="_blank">
                      @VeilCoreProof
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="fine">
              <span>© 2026 VeilCore</span>
              <span>{t('m.foot.fine')}</span>
              <RouterLink to="/privacy">{t('m.foot.privacy')}</RouterLink>
              <RouterLink to="/terms">{t('m.foot.terms')}</RouterLink>
            </div>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
};
