// How it works (/how-it-works): Mako's page of that name (site draft, 21 November 2026), on the
// night ground of the home page (home.css, scoped by the root's class "home"). In order: the
// title, with an event display drawn from a fixed code; a second party on the record (photo);
// what stays with you and what goes on Midnight; share proof, not data; lineage, licenses and
// labs; if VeilCore disappears; and what works where (#where), open, with where things stand.
//
// Copy is the site's own wherever the site already said it (and so already in five languages
// and held by copy-truth.test.ts); the few new lines are in i18n (m.hiw.*). Where Mako's draft
// disagreed with the code, the code wins (PR notes): his "Marker results ... never leave your
// device" is DNA files (typed values reach our server, locked); his "Only a proof code goes on
// Midnight" is "Codes, never your genetics" (key stamps, report codes and parent links go there
// too: the privacy page lists them, linked here); his "Batches are also stamped on Bitcoin" is
// said of veilcore.org only (the test site's registry doesn't stamp); his "Our own registry code
// isn't published" is the site's "public, under the Apache-2.0 license" (m.open.4p); and the
// table is the site's LiveWhere, driven by the flags in config/copy.ts, not his hand-written rows.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { SiteShell } from './SiteShell';
import { LAB_DOOR } from '../SiteHeader';
import { EventDisplay } from './EventDisplay';
import {
  Arrow,
  NightClose,
  PhotoCredits,
  PhotoScreen,
  Two,
  arrowed,
  useHashScroll,
  useReveals,
  useScrollPieces,
} from './night-parts';
import { Claims } from './Claims';
import { LiveWhere, StandList } from './LiveWhere';
import './home.css';

/** The title's event display: drawn from a fixed code (SHA-256 of "how-it-works"), not a record. */
const HOW_HEX = 'a4bc41d13611d125b6b91a85a77972588a326187dabb9d3aa0699f8483e16f8c';

export const HowItWorks: React.FC = () => {
  const { t, sp, lang } = useI18n();
  const { hash } = useLocation();
  const root = useRef<HTMLDivElement>(null);
  useReveals(root);
  useScrollPieces(root);
  useHashScroll(hash);

  const side = (keys: [string, string][]) => (
    <ul>
      {keys.map(([title, text]) => (
        <li key={title}>
          <b>{title}</b>
          {text}
        </li>
      ))}
    </ul>
  );

  const grid = (cells: [string, string][]) => (
    <div className="k-grid4 k-grid2">
      {cells.map(([title, text], i) => (
        <div key={title} data-reveal="" style={{ '--d': i } as React.CSSProperties}>
          <h3>{title}</h3>
          <p>{text}</p>
        </div>
      ))}
    </div>
  );

  return (
    <SiteShell>
      <div className="home k-page" ref={root}>
        <header className="k-screen k-hero k-page-hero k-intro" id="top">
          <div className="k-wrap k-hero-grid">
            <div className={`k-hero-text${lang === 'ja' ? ' cjk' : ''}`}>
              <h1>
                <span className="k-line">
                  <span>{t('m.hiw.title1')}</span>
                </span>
                {sp}
                <span className="k-line k-hl">
                  <span>{t('m.hiw.title2')}</span>
                </span>
              </h1>
              <p className="k-lede" data-intro="" style={{ '--i': 2 } as React.CSSProperties}>
                {t('m.hiw.lede')}
              </p>
              <div className="k-actions hero-actions" data-intro="" style={{ '--i': 3 } as React.CSSProperties}>
                <RouterLink className="k-btn k-btn-primary" to="/new">
                  {t('m.demo.create.title')}
                  <Arrow />
                </RouterLink>
                <RouterLink className="k-link-quiet" to="/docs/spec">
                  {t('m.contact.spec')}
                </RouterLink>
              </div>
            </div>
            <EventDisplay hex={HOW_HEX} />
          </div>
        </header>

        <PhotoScreen labelledBy="party-h" name="lab" alt={t('m.home.alt.lab')}>
          <h2 id="party-h" className="k-giant" data-reveal="">
            {t('m.hiw.lab1')}
            {sp}
            <span className="k-hl">{t('m.hiw.lab2')}</span>
          </h2>
          <p className="k-lead" data-reveal="" style={{ '--d': 1 } as React.CSSProperties}>
            {t('m.hiw.labP')}
          </p>
          {/* A lab's way in (lab/LabDoor.tsx), where the page says what a lab does. */}
          <p className="k-lead" data-reveal="" style={{ '--d': 2 } as React.CSSProperties}>
            <RouterLink to={LAB_DOOR} data-for-labs="how">
              {arrowed(t('m.for.3link'))}
            </RouterLink>
          </p>
        </PhotoScreen>

        <section className="k-sec" id="split" aria-labelledby="split-h">
          <div className="k-wrap">
            <h2 id="split-h" className="k-h2" data-reveal="">
              <Two a={t('m.hiw.split1')} b={t('m.hiw.split2')} />
            </h2>
            <div className="k-split2">
              <div className="k-side" data-reveal="" style={{ '--d': 1 } as React.CSSProperties}>
                <p className="k-lbl">{t('m.hiw.youLbl')}</p>
                <h3>{t('m.hiw.youT')}</h3>
                {side([
                  [t('m.hiw.you1t'), t('m.hiw.you1p')],
                  [t('m.hiw.you2t'), t('m.hiw.you2p')],
                  [t('m.hiw.you3t'), t('m.hiw.you3p')],
                ])}
              </div>
              <div className="k-flow" aria-hidden="true">
                <span className="k-flow-bar" />
                <span className="k-flow-code">9ed27f4c…</span>
                <span className="k-flow-bar" />
              </div>
              <div className="k-side k-side-chain" data-reveal="" style={{ '--d': 3 } as React.CSSProperties}>
                <p className="k-lbl">{t('m.hiw.chainLbl')}</p>
                <h3>{t('m.hiw.chainT')}</h3>
                {side([
                  [t('m.hiw.chain1t'), t('m.hiw.chain1p')],
                  [t('m.hiw.chain2t'), t('m.hiw.chain2p')],
                  [t('m.hiw.chain3t'), t('m.hiw.chain3p')],
                ])}
                <p className="k-fine">
                  <RouterLink to="/privacy">{arrowed(t('m.hiw.chainMore'))}</RouterLink>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="k-screen" id="claims" aria-labelledby="claims-h">
          <Claims />
        </section>

        <section className="k-sec" id="labs" aria-labelledby="labs-h">
          <div className="k-wrap">
            <h2 id="labs-h" className="k-h2" data-reveal="">
              <Two a={t('m.hiw.more1')} b={t('m.hiw.more2')} />
            </h2>
            {grid([
              [t('m.get.3a'), t('m.get.3b')],
              [t('m.get.2a'), t('m.get.2b')],
              [t('m.for.3t'), t('m.for.3p')],
              [t('m.open.3t'), t('m.open.3p')],
            ])}
          </div>
        </section>

        <section className="k-sec" id="gone" aria-labelledby="gone-h">
          <div className="k-wrap">
            <h2 id="gone-h" className="k-giant" data-reveal="">
              <Two a={t('m.open.title1')} b={t('m.open.title2')} />
            </h2>
            {grid([
              [t('m.open.1t'), t('m.open.1p')],
              [t('m.open.2t'), t('m.open.2p')],
              [t('m.open.6t'), t('m.open.6p')],
              [t('m.open.4t'), t('m.open.4p')],
            ])}
          </div>
        </section>

        <section className="k-sec" id="where" aria-labelledby="where-h">
          <div className="k-wrap">
            <h2 id="where-h" className="k-h2" data-reveal="">
              <Two a={t('m.live.title1')} b={t('m.live.title2')} />
            </h2>
            <StandList />
            <LiveWhere open />
          </div>
        </section>

        <PhotoCredits names={['lab']} />
        <NightClose />
      </div>
    </SiteShell>
  );
};
