// How it works (/how-it-works): Mako's page of that name (site draft, 21 November 2026), on the
// night ground of the home page (home.css, scoped by the root's class "home"). In order: the
// title, with an event display drawn from a fixed code; the four steps (#how); share proof, not
// data, right after them (Mako's note, 22 Nov); the jar photo, opening as it comes into view;
// what stays with you and what goes on Midnight; a second party on the record (photo); lineage,
// licenses and labs; what the home page carried until 22 Nov; if VeilCore disappears; use it
// your way; and what works where (#where), open, with where things stand.
//
// The four steps and the jar photo are Mako's (18 Nov draft, the home page until 22 Nov). #169
// dropped both by mistake; they are back here unchanged, in all five languages (22 Nov).
//
// Copy is the site's own wherever the site already said it (and so already in five languages
// and held by copy-truth.test.ts); the few new lines are in i18n (m.hiw.*). Where Mako's draft
// disagreed with the code, the code wins (PR notes): his "Marker results ... never leave your
// device" is DNA files (typed values reach our server, locked); his "Only a proof code goes on
// Midnight" is "Codes, never your genetics" (key stamps, report codes and parent links go there
// too: the privacy page lists them, linked here); his "Batches are also stamped on Bitcoin" is
// said of veilcore.org only (the test site's registry doesn't stamp); his "Our own registry code
// isn't published" is the site's "public, under the Apache-2.0 license" (m.own.p, Use it your way); and the
// table is the site's LiveWhere, driven by the flags in config/copy.ts, not his hand-written rows.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { SiteShell } from './SiteShell';
import { LAB_DOOR } from '../SiteHeader';
import { EventDisplay } from './EventDisplay';
import {
  Arrow,
  NightClose,
  NightEnd,
  PhotoCredits,
  PhotoScreen,
  Two,
  arrowed,
  scramble,
  useHashScroll,
  useReveals,
  useScrollPieces,
} from './night-parts';
import { Claims } from './Claims';
import { MovedFromHome, TryIt } from './Home';
import { LiveWhere, StandList } from './LiveWhere';
import './home.css';

/** How a lab or software vendor plugs the smart contracts into its own software. */
const PARTNERS_DOC = 'https://github.com/hunterincoming/veilcore/blob/main/docs/PARTNERS.md';

/** The title's event display: drawn from a fixed code (SHA-256 of "how-it-works"), not a record. */
const HOW_HEX = 'a4bc41d13611d125b6b91a85a77972588a326187dabb9d3aa0699f8483e16f8c';

/** An illustration, not a record: the example in "Four steps". */
const EXAMPLE_CODE = '3f9a1c07b2e84d6a91c5f0e27b4d8a3c6e1f95b0d27a4c8e3b61f0a9d5c27e48';

/**
 * Four steps (the draft's pinned stage, unpinned). The step in the middle of the window is the lit
 * one, from an IntersectionObserver; choosing a step lights it too. The picture beside the
 * steps shows that step. The page scrolls on as normal.
 */
const Steps: React.FC = () => {
  const { t, sp } = useI18n();
  const [step, setStep] = useState(0);
  const list = useRef<HTMLOListElement>(null);
  // The example code settles from random hex when its step lights (the design's scramble). Written
  // here, not by React, so the scramble and React never both own the text.
  const code = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    if (code.current) code.current.textContent = EXAMPLE_CODE;
  }, []);
  useEffect(() => (step === 1 ? scramble(code.current, EXAMPLE_CODE) : undefined), [step]);
  useEffect(() => {
    const el = list.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const lis = [...el.children];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setStep(lis.indexOf(e.target));
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    lis.forEach((li) => io.observe(li));
    return () => io.disconnect();
  }, []);
  const layer = (i: number) => `k-layer${i === step ? ' is-on' : ''}`;
  return (
    <div className="k-wrap k-how-grid">
      <div>
        <h2 id="how-h" className="k-h2" data-reveal="">
          <Two a={t('m.how.title1')} b={t('m.how.title2')} />
        </h2>
        <ol className="k-steps" ref={list}>
          {(['1', '2', '3', '4'] as const).map((n, i) => (
            <li key={n} className={i === step ? 'is-active' : undefined}>
              <h3>
                <button type="button" aria-pressed={i === step} onClick={() => setStep(i)}>
                  {t(`m.step${n}.title`)}
                </button>
              </h3>
              <p>{t(`m.step${n}.text`)}</p>
            </li>
          ))}
        </ol>
      </div>
      {/* What each step looks like: decoration beside the steps, which say it in words. */}
      <div className="k-stagebox" aria-hidden="true">
        <div className={layer(0)}>
          <dl className="k-rec">
            <div>
              <dt>{t('m.hero.cultivar')}</dt>
              <dd>Harbour Mist</dd>
            </div>
            <div>
              <dt>{t('m.hero.bredBy')}</dt>
              <dd>{t('m.hero.bredByDefault')}</dd>
            </div>
            <div>
              <dt>{t('m.home.ex.dna')}</dt>
              <dd>report.pdf</dd>
            </div>
          </dl>
          <p className="k-layer-cap">{t('m.home.ex.label')}</p>
        </div>
        <div className={layer(1)}>
          <p className="k-bigcode" ref={code} />
          <p className="k-layer-cap">{t('m.home.l2')}</p>
        </div>
        <div className={layer(2)}>
          <div className="k-batch">
            <div className="k-batch-grid">
              {Array.from({ length: 64 }, (_, i) => (
                <i key={i} className={i === 27 ? 'me' : undefined} />
              ))}
            </div>
            <span className="k-batch-arrow" />
            <div className="k-block">
              <b>
                {t('m.hero.stampWord')}
                {sp}
                {t('m.hero.stampLine')}
              </b>
              <span>{t('m.home.l3b')}</span>
            </div>
          </div>
          <p className="k-layer-cap">{t('m.home.l3')}</p>
        </div>
        <div className={layer(3)}>
          <svg className="k-check" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="70" />
            <circle className="ring" cx="80" cy="80" r="70" transform="rotate(-90 80 80)" />
            <path className="ok" d="M52 82 L72 101 L110 61" />
          </svg>
          <p className="k-verdict">{t('m.home.l4v')}</p>
          <p className="k-layer-cap">{t('m.home.l4')}</p>
        </div>
      </div>
    </div>
  );
};

export const HowItWorks: React.FC = () => {
  const { t, sp, lang } = useI18n();
  const { hash } = useLocation();
  // The title's display follows the try-it code once something is typed (TryIt, from the home page).
  const [hex, setHex] = useState('');
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
    <SiteShell after={<NightEnd />}>
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
              {/* Where things stand (the home page's hero line until 22 Nov). */}
              <p className="k-fine k-status-line" data-intro="" style={{ '--i': 3 } as React.CSSProperties}>
                {t('m.hero.status')}
              </p>
            </div>
            <EventDisplay hex={hex || HOW_HEX} />
          </div>
          <TryIt onHash={setHex} />
        </header>

        {/* Mako's four steps (the 18 Nov draft's pinned stage, unpinned: Steps above), then share
            proof, not data, right after them (his note, 22 Nov). */}
        <section className="k-screen k-how" id="how" aria-labelledby="how-h">
          <Steps />
        </section>

        <section className="k-screen" id="claims" aria-labelledby="claims-h">
          <Claims />
        </section>

        {/* Mako's jar: the photo opens from an inset as it comes into view (PhotoScreen), shown
            open with reduced motion. No id: the old #keep link goes to the home page's privacy
            line (Home.tsx MOVED_ANCHORS). */}
        <PhotoScreen labelledBy="keep-h" name="jar" alt={t('m.home.alt.jar')} position="50% 60%">
          <h2 id="keep-h" className="k-giant" data-reveal="">
            {t('m.home.keep.t')}
          </h2>
          <p className="k-lead" data-reveal="" style={{ '--d': 1 } as React.CSSProperties}>
            {t('m.home.keep.p')}
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
                  // What Midnight itself does beyond dating (full review, 22 Nov: it wasn't said).
                  [t('m.hiw.chain4t'), t('m.hiw.chain4p')],
                ])}
                <p className="k-fine">
                  <RouterLink to="/privacy">{arrowed(t('m.hiw.chainMore'))}</RouterLink>
                </p>
              </div>
            </div>
          </div>
        </section>

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

        {/* What the home page carried until 22 Nov 2026 (Home.tsx MovedFromHome): nothing deleted. */}
        <MovedFromHome />

        <section className="k-sec" id="gone" aria-labelledby="gone-h">
          <div className="k-wrap">
            <h2 id="gone-h" className="k-giant" data-reveal="">
              <Two a={t('m.open.title1')} b={t('m.open.title2')} />
            </h2>
            {grid([
              [t('m.open.1t'), t('m.open.1p')],
              [t('m.open.2t'), t('m.open.2p')],
              [t('m.open.6t'), t('m.open.6p')],
            ])}
          </div>
        </section>

        {/* Use it your way (22 Nov): nobody has to use veilcore.org. What works today, and what
            nobody outside VeilCore has done yet, said plainly; the three ways in full are on the
            page for labs (lab/LabDoor.tsx #own-way). Replaces the "Anyone can run a registry" card. */}
        <section className="k-sec" id="own-way" aria-labelledby="own-h" data-own-way="">
          <div className="k-wrap">
            <h2 id="own-h" className="k-h2" data-reveal="">
              {t('m.own.title')}
            </h2>
            <p className="k-lead" data-reveal="" style={{ '--d': 1 } as React.CSSProperties}>
              {t('m.own.p')}
            </p>
            <p className="k-lead" data-reveal="" style={{ '--d': 2 } as React.CSSProperties}>
              <a href={PARTNERS_DOC} target="_blank" rel="noopener noreferrer">
                {arrowed(t('m.own.plugLink'))}
              </a>
              {sp}
              <RouterLink to="/for-labs#own-way">{arrowed(t('m.own.link'))}</RouterLink>
            </p>
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

        <PhotoCredits names={['jar', 'lab', 'cutting', 'greenhouse', 'hand', 'cattle', 'seed', 'leaf']} />
        <NightClose />
      </div>
    </SiteShell>
  );
};
