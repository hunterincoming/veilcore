// About (/founders, and /about): Mako's About page (site draft, 21 November 2026) on the night
// ground of the home page (home.css, scoped by the root's class "home"). The two founders with
// their headshots, bios, what each leads and their profile links (the same facts as before); a
// photo for the people who grow things; where we are; the latest from the build; and talk to the
// founders (#contact), with what each kind of reader should write about. Nothing the page had is
// gone: the band's invitation is the contact section's lede, and its buttons are in the rows.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';
import type { StringKey } from '../../i18n/en';
import { FOUNDERS_MAIL, RoleLine, SDK_REPO, SiteShell, X_HANDLE } from './SiteShell';
import {
  Marquee,
  NightClose,
  PhotoCredits,
  PhotoScreen,
  Two,
  Updates,
  useHashScroll,
  useReveals,
  useScrollPieces,
} from './night-parts';
import { Ambient } from './EventDisplay';
import './home.css';

type Founder = {
  name: string;
  initials: string;
  photo: string;
  role: StringKey;
  bio1: StringKey;
  bio2: StringKey;
  leads: StringKey;
  also: StringKey;
  languages?: StringKey;
  links: { href: string; label: string }[];
};

const FOUNDERS: Founder[] = [
  {
    name: 'Mako Steiner',
    initials: 'MS',
    photo: '/team/mako.jpg',
    role: 'm.mako.role',
    bio1: 'm.mako.bio1',
    bio2: 'm.mako.bio2',
    leads: 'm.mako.leads',
    also: 'm.mako.also',
    languages: 'm.mako.languages',
    links: [
      { href: 'https://www.linkedin.com/in/makoto-steiner-3a6381182', label: 'LinkedIn' },
      { href: 'https://x.com/wasabimako', label: '@wasabimako' },
      { href: 'mailto:mako@veilcore.org', label: 'mako@veilcore.org' },
    ],
  },
  {
    name: 'Hunter Roberts',
    initials: 'HR',
    photo: '/team/hunter.jpg',
    role: 'm.hunter.role',
    bio1: 'm.hunter.bio1',
    bio2: 'm.hunter.bio2',
    leads: 'm.hunter.leads',
    also: 'm.hunter.also',
    links: [
      { href: 'https://www.linkedin.com/in/hunter-roberts-067016203', label: 'LinkedIn' },
      { href: 'https://x.com/hunterincoming', label: '@hunterincoming' },
      { href: 'https://github.com/hunterincoming', label: 'GitHub' },
      { href: 'mailto:hunter@veilcore.org', label: 'hunter@veilcore.org' },
    ],
  },
];

export const Founders: React.FC = () => {
  const { t, sp } = useI18n();
  const { hash } = useLocation();
  const root = useRef<HTMLDivElement>(null);
  useReveals(root);
  useScrollPieces(root);
  useHashScroll(hash);
  return (
    <SiteShell>
      <div className="home k-page k-about" ref={root}>
        <header className="k-screen k-page-hero k-intro" id="top">
          <Ambient seed="about" />
          <div className="k-wrap">
            <h1 className="k-giant">
              <span className="k-line">
                <span>{t('m.team.title1')}</span>
              </span>
              {sp}
              <span className="k-line k-mute">
                <span>{t('m.team.title2')}</span>
              </span>
            </h1>
            <p className="k-lead k-about-lede" data-intro="" style={{ '--i': 2 } as React.CSSProperties}>
              {t('m.founders.lede')}
            </p>
            <div className="k-founders" aria-label={t('m.founders.label')} role="group">
              {FOUNDERS.map((f, i) => (
                <article
                  className="k-founder"
                  key={f.name}
                  data-intro=""
                  style={{ '--i': 3 + i } as React.CSSProperties}
                >
                  <div className="k-founder-photo">
                    <span aria-hidden="true">{f.initials}</span>
                    <img
                      src={f.photo}
                      alt={t('m.portraitOf', { name: f.name })}
                      width={480}
                      height={480}
                      onError={(e) => e.currentTarget.remove()}
                    />
                  </div>
                  <h2>{f.name}</h2>
                  <RoleLine as="p" className="k-role" text={t(f.role)} />
                  <p>{t(f.bio1)}</p>
                  <p>{t(f.bio2)}</p>
                  <dl className="k-facts">
                    <div>
                      <dt>{t('m.founders.leads')}</dt>
                      <dd>
                        <ul className="k-tags">
                          {t(f.leads)
                            .split('|')
                            .map((x) => (
                              <li key={x}>{x}</li>
                            ))}
                        </ul>
                      </dd>
                    </div>
                    <div>
                      <dt>{t('m.founders.also')}</dt>
                      <dd>{t(f.also)}</dd>
                    </div>
                    {f.languages && (
                      <div>
                        <dt>{t('m.founders.languages')}</dt>
                        <dd>{t(f.languages)}</dd>
                      </div>
                    )}
                  </dl>
                  <ul className="k-links" aria-label={f.name}>
                    {f.links.map((l) => (
                      <li key={l.href}>
                        <a
                          href={l.href}
                          rel="me noopener noreferrer"
                          target={l.href.startsWith('mailto:') ? undefined : '_blank'}
                        >
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </header>

        <PhotoScreen labelledBy="grow-h" name="greenhouse" alt={t('m.home.alt.greenhouse')}>
          <h2 id="grow-h" className="k-giant" data-reveal="">
            {t('m.about.grow1')}
            {sp}
            <span className="k-hl">{t('m.about.grow2')}</span>
          </h2>
          <p className="k-lead" data-reveal="" style={{ '--d': 1 } as React.CSSProperties}>
            {t('m.about.growP')}
          </p>
        </PhotoScreen>

        <Marquee label={t('m.about.whereLabel')} list={t('m.about.where')} />

        <Updates />

        {/* Use it your way (22 Nov): nobody has to use veilcore.org; the three ways, and what is
            untested, are on the page for labs (lab/LabDoor.tsx, #own-way). */}
        <section className="k-sec" id="own-way" aria-labelledby="own-h" data-own-way="">
          <div className="k-wrap">
            <h2 id="own-h" className="k-h2" data-reveal="">
              {t('m.own.title')}
            </h2>
            <p className="k-lead" data-reveal="" style={{ '--d': 1 } as React.CSSProperties}>
              {t('m.own.p')}
            </p>
            <p className="k-lead" data-reveal="" style={{ '--d': 2 } as React.CSSProperties}>
              <RouterLink to="/how-it-works#own-way">{t('m.own.link')}</RouterLink>
            </p>
          </div>
        </section>

        {/* Talk to the founders: who should write about what (it was on the home page). */}
        <section className="k-sec" id="contact" aria-labelledby="contact-h">
          <Ambient seed="contact" faint />
          <div className="k-wrap">
            <h2 id="contact-h" className="k-giant" data-reveal="">
              <Two a={t('m.contact.title1')} b={t('m.contact.title2')} hl />
            </h2>
            <p className="k-lead" data-reveal="" style={{ '--d': 1 } as React.CSSProperties}>
              {t('m.founders.bandText')}
            </p>
            <dl className="audiences">
              <div>
                <dt>{t('m.contact.1t')}</dt>
                <dd>
                  <p>{t('m.contact.1p')}</p>
                  <a className="k-btn k-btn-primary" href={FOUNDERS_MAIL}>
                    {t('m.founders.emailBoth')}
                  </a>
                </dd>
              </div>
              <div>
                <dt>{t('m.contact.2t')}</dt>
                <dd>
                  <p>{t('m.contact.2p')}</p>
                  <a className="k-btn k-btn-ghost" href={FOUNDERS_MAIL}>
                    {t('m.contact.email')}
                  </a>
                  <RouterLink className="k-btn k-btn-ghost" to="/docs/spec">
                    {t('m.contact.spec')}
                  </RouterLink>
                </dd>
              </div>
              <div>
                <dt>{t('m.contact.3t')}</dt>
                <dd>
                  <p>{t('m.contact.3p')}</p>
                  <RouterLink className="k-btn k-btn-ghost" to="/docs/integrate">
                    {t('m.contact.integrate')}
                  </RouterLink>
                  <a className="k-btn k-btn-ghost" href={SDK_REPO} rel="noopener noreferrer" target="_blank">
                    GitHub
                  </a>
                </dd>
              </div>
              <div>
                <dt>{t('m.contact.4t')}</dt>
                <dd>
                  <p>{t('m.contact.4p')}</p>
                  <a className="k-btn k-btn-ghost" href="mailto:mako@veilcore.org">
                    mako@veilcore.org
                  </a>
                </dd>
              </div>
            </dl>
            <p className="k-fine k-follow">
              {t('m.updates.follow')}{' '}
              <a href={X_HANDLE} rel="noopener noreferrer" target="_blank">
                @VeilCoreProof
              </a>
            </p>
          </div>
        </section>

        <PhotoCredits names={['greenhouse']} />
        <NightClose />
      </div>
    </SiteShell>
  );
};

// A label's QR code, read with the camera on this device (scan/SiteScan.tsx): fetched only when
// pressed, so this page's first download doesn't grow.
const SiteScan = React.lazy(() => import('../../scan/SiteScan'));
const canScan = () =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices &&
  typeof navigator.mediaDevices.getUserMedia === 'function';

/** /verify with no identifier: ask for one, then open /verify/:id. */
export const VerifyLookup: React.FC = () => {
  const { t, sp } = useI18n();
  const navigate = useNavigate();
  const [id, setId] = React.useState('');
  const [scanning, setScanning] = React.useState(false);
  const idBox = React.useRef<HTMLInputElement>(null);
  // The proof code from the certificate (persona review, 17 Oct): with it the check page
  // checks the record against the code in hand, not only against the registry's answer.
  const [fp, setFp] = React.useState('');
  const [fpBad, setFpBad] = React.useState(false);
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const v = id.trim();
    if (!v) return;
    const code = fp.replace(/\s+/g, '').toLowerCase();
    if (code && !/^[0-9a-f]{64}$/.test(code)) return setFpBad(true);
    // The same path verify-link.ts verifyPath makes; not imported, so the first download
    // stays free of the record app's words (load-split.test.ts).
    void navigate(`/verify/${encodeURIComponent(v)}${code ? `?fp=${code}` : ''}`);
  };
  return (
    <SiteShell>
      <header className="wrap page">
        <h1>{t('m.verify.title')}</h1>
        <p>{t('m.verify.lede')}</p>
        <p className="verify-what">
          {t('m.verify.what')}
          {sp}
          <RouterLink to="/">{t('m.verify.home')}</RouterLink>
        </p>
        <form className="lookup" onSubmit={go}>
          <div className="field">
            <label htmlFor="vid">{t('m.verify.field')}</label>
            <input
              id="vid"
              ref={idBox}
              value={id}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setId(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="vfp">{t('m.verify.fpField')}</label>
            <input
              id="vfp"
              value={fp}
              autoComplete="off"
              spellCheck={false}
              aria-describedby="vfp-help"
              aria-invalid={fpBad || undefined}
              onChange={(e) => {
                setFp(e.target.value);
                setFpBad(false);
              }}
            />
            <small id="vfp-help" role={fpBad ? 'alert' : undefined}>
              {fpBad ? t('m.verify.fpBad') : t('m.verify.fpHelp')}
            </small>
          </div>
          <button type="submit" className="btn solid">
            {t('m.verify.go')}
          </button>
          {canScan() && (
            <button type="button" className="btn" onClick={() => setScanning(true)} data-verify-scan="">
              {t('m.verify.scan')}
            </button>
          )}
        </form>
        {scanning && (
          <React.Suspense fallback={null}>
            <SiteScan
              onClose={() => setScanning(false)}
              onText={(text) => {
                setId(text);
                window.setTimeout(() => idBox.current?.focus(), 0);
              }}
            />
          </React.Suspense>
        )}
        <p className="verify-what">
          <RouterLink to="/verify/example">{t('m.verify.example')}</RouterLink>
        </p>
      </header>
    </SiteShell>
  );
};
