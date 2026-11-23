// The home page, in the site design of 21 November 2026 (ported from the 18 November
// draft): night ground, the logo's gold #A67C00, Archivo and JetBrains Mono.
//
// Since 22 Nov 2026 a short page (it was about 25 phone screens and 60 headings): the hero with
// one line, "Make a record" and "Check a record"; how it works in three steps; who it is for,
// each to its own page; one line on privacy and Midnight's part; use it your way; links to
// everything else. What it carried below that is How it works' now (MovedFromHome below, the
// try-it proof code with it: TryIt); latest from the build and talk to the founders are on About.
// An old link to one of those sections is sent there (MOVED_ANCHORS).
//
// How it works (/how-it-works) and About (/founders) are the design's other two pages; the
// sections they share with this one are in night-parts.tsx, LiveWhere.tsx and Claims.tsx.
//
// Ported, not copied: the draft pinned sections and moved them as you scrolled (the steps, the
// gallery, the stacked cards). The brief (18 Nov): modern, fewer words, effects fine, no
// scroll-jacking, fast on a computer. So nothing here is pinned, holds the page or turns its
// scroll sideways: the steps follow the one in the middle of the window, the gallery is a row
// you swipe or step through with its buttons. The draft's motion that only follows the page is kept
// (site-motion, 21 Nov): reveals that replay, the timeline filling, the photo opening, the words
// lighting up, the code settling from random hex, the hero's intro and the page curtain
// (Curtain.tsx), from IntersectionObservers and one passive scroll listener (night-parts.tsx). The event display draws only for
// about a second after the proof code changes, never while off screen or hidden, at no more than
// 1.5 device pixels per pixel, and not at all in motion with reduced motion. The moving band of
// names has a pause button, stops off screen, and stands still with reduced motion. Photos are
// the design's re-exports with an 800-wide copy for phones, lazy below the first screen, with their
// size set (public/media/home/CREDITS.md).
//
// Every sentence is the site's own, from the translations, and holds to its rules (copy-truth
// and the promise rule): where the draft said genetic data never leaves your computer, this
// says DNA files never leave it and what you type reaches our server locked. What is live where
// comes from the flags in config/copy.ts, never from text written in by hand.
//
// Technical detail (SHA-256, test vectors, OpenTimestamps, the contract addresses, the claims
// contract's status, the maintenance key) lives only in "For technical readers": still on the
// page, still true, but out of a breeder's way.
//
// The proof code in the hero is a real record commitment (veilcore-records), not a stand-in
// hash: what a visitor sees change is what the format publishes.
//
// Content rules: "prior possession", never "ownership"; no customer, pilot or partner
// claims; plant AND animal genetics; the three implementations have one author and are never
// called independent; the status stays honest and current, and the technical section says
// plainly who holds the maintenance key (docs/maintenance-policy.md, APPROVED 7 Oct).
// Strings that flip on mainnet day are grouped in i18n/en.ts under "MAINNET DAY".
//
// Every in-page anchor other pages link to stays reachable (e2e/home.spec.ts): top, about, steps,
// private, own-way and more here; the moved ones on How it works or About, by MOVED_ANCHORS.
//
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { computeCommitment, newNonce } from 'veilcore-records';
import { useI18n } from '../../i18n';
import { FOUNDERS_MAIL, SiteShell } from './SiteShell';
import { hasRecordsHere } from './returning';
import { PASTE_ENTRY } from './paste-entry';
import { LAB_DOOR } from '../SiteHeader';
import { IS_MAINNET, MAINNET_CLAIMS_ADDRESS, MAINNET_CONTRACT_ADDRESS, explorerFor } from '../../config/network';
import { AGREEMENTS_LIVE, LAB_SIGNING_RUN_ON_MAINNET, ROYALTIES_RUN_ON_MAINNET } from '../../config/copy';
import { Ambient, EventDisplay } from './EventDisplay';
import {
  APP_REPO,
  Arrow,
  Marquee,
  NightClose,
  NightEnd,
  Photo,
  PhotoCredits,
  PhotoScreen,
  SR_ONLY,
  Two,
  WordLight,
  arrowed,
  scramble,
  useHashScroll,
  useReveals,
  useScrollPieces,
} from './night-parts';
import { Gallery, type Slide } from './Gallery';
import './home.css';

/** The proof code in groups of eight, the way a long lab code is printed. */
const groupsOf = (hex: string, prev = '') => {
  // A character that changed rolls in (site.css .chg), each a few milliseconds after the one
  // before it, like the wheels of a numbering stamp.
  let rolled = 0;
  const chars = [...hex].map((c, i) =>
    prev && prev[i] !== c ? (
      <span key={`${i}-${c}`} className="chg" style={{ '--i': rolled++ } as React.CSSProperties}>
        {c}
      </span>
    ) : (
      <React.Fragment key={i}>{c}</React.Fragment>
    ),
  );
  const out: React.ReactNode[] = [];
  for (let i = 0; i < chars.length; i += 8)
    out.push(
      <span className="g" key={i}>
        {chars.slice(i, i + 8)}
      </span>,
    );
  return out;
};

/** Try it: what you type is turned into a real proof code here, and nothing is sent. */
const Fingerprint: React.FC<{ onHash: (hex: string) => void }> = ({ onHash }) => {
  const { t } = useI18n();
  const [cultivar, setCultivar] = useState('Harbour Mist');
  const [bredBy, setBredBy] = useState(() => t('m.hero.bredByDefault'));
  const [hash, setHash] = useState('');
  const prev = useRef('');
  const [nonce] = useState(() => newNonce());
  // The digest changes on every keystroke; reading 64 characters each time drowns out the
  // typing. Instead, once typing pauses, a short line says it changed.
  const [announce, setAnnounce] = useState('');
  const seen = useRef(false);
  useEffect(() => {
    if (!hash) return;
    if (!seen.current) {
      seen.current = true;
      return;
    }
    // The same words twice in a row aren't read again, so every other time it ends in a
    // no-break space a screen reader doesn't speak.
    const said = t('m.hero.fpUpdated');
    const timer = window.setTimeout(() => setAnnounce((a) => (a === said ? `${said}\u00a0` : said)), 800);
    return () => window.clearTimeout(timer);
  }, [hash, t]);

  useEffect(() => {
    let live = true;
    void computeCommitment({
      formatVersion: '0.1',
      recordId: 'demo',
      subjectType: 'plant-genetic-material',
      profile: 'veilcore/profile/plant-variety/v1',
      commitment: '',
      commitmentAlgorithm: 'sha256/canonical-json/v1',
      anchor: { chain: 'midnight', network: 'undeployed' },
      sealedAt: '2026-01-01T00:00:00Z',
      holder: { id: 'demo' },
      parents: [],
      attestations: [],
      // Name and breeder are envelope fields under the plant-variety profile, as in the app.
      subject: { name: cultivar, originator: bredBy || undefined },
      profileData: { nonce },
    } as never).then((h) => {
      if (!live) return;
      setHash((old) => {
        prev.current = old;
        return h;
      });
      onHash(h);
    });
    return () => {
      live = false;
    };
  }, [cultivar, bredBy, nonce, onHash]);

  return (
    <div className="k-try" role="group" aria-label={t('m.hero.demoLabel')}>
      <p className="k-lbl">{t('m.home.try')}</p>
      <div className="k-try-row">
        <div className="k-field">
          <label htmlFor="cv">{t('m.hero.cultivar')}</label>
          <input
            id="cv"
            value={cultivar}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setCultivar(e.target.value)}
          />
        </div>
        <div className="k-field">
          <label htmlFor="by">{t('m.hero.bredBy')}</label>
          <input
            id="by"
            value={bredBy}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setBredBy(e.target.value)}
          />
        </div>
        <div className="k-field">
          <span>{t('m.hero.goes')}</span>
          <div className="k-hash">{hash ? groupsOf(hash, prev.current) : '—'}</div>
        </div>
      </div>
      <span role="status" style={SR_ONLY}>
        {announce}
      </span>
      <p className="k-fine k-try-note">{t('m.home.tryNote')}</p>
    </div>
  );
};

/** Mainnet builds: the two contract addresses, in full, so anyone can look them up. */
const Contracts: React.FC = () => {
  const { t } = useI18n();
  return (
    <div className="contracts">
      <h3>{t('m.addr.title')}</h3>
      <dl>
        <div>
          <dt>{t('m.addr.main')}</dt>
          <dd>
            <code>{MAINNET_CONTRACT_ADDRESS}</code>
          </dd>
        </div>
        <div>
          <dt>{t('m.addr.claims')}</dt>
          <dd>{MAINNET_CLAIMS_ADDRESS ? <code>{MAINNET_CLAIMS_ADDRESS}</code> : t('m.addr.claimsPending')}</dd>
        </div>
      </dl>
      <a className="more" href={explorerFor('mainnet')} rel="noopener noreferrer" target="_blank">
        {arrowed(t('m.addr.explorer'))}
      </a>
    </div>
  );
};

/** Everything a technical reader wants, in one block that stays closed until asked for. */
const Technical: React.FC = () => {
  const { t, sp } = useI18n();
  // Opened when arrived at from the app footer's "How checking works" (/#technical).
  const { hash } = useLocation();
  return (
    <section id="technical" className="k-sec k-tight">
      <div className="k-wrap">
        <h2 className="k-h2">{t('m.tech.title')}</h2>
        <p className="k-sub">{t('m.tech.lede')}</p>
        <details className="tech" open={hash === '#technical' || undefined}>
          <summary className="k-btn k-btn-ghost">{t('m.tech.show')}</summary>
          <div className="points">
            <div className="pt">
              <h3>{t('m.tech.check.t')}</h3>
              <p>
                {t('m.tech.check.p')}
                {sp}
                <RouterLink to="/docs/spec">{arrowed(t('m.open.6link'))}</RouterLink>
              </p>
            </div>
            <div className="pt">
              <h3>{t('m.tech.impl.t')}</h3>
              <p>
                {t('m.tech.impl.p')}
                {sp}
                <RouterLink to="/implementations">{arrowed(t('m.open.1link'))}</RouterLink>
              </p>
            </div>
            <div className="pt">
              <h3>{t('m.tech.btc.t')}</h3>
              <p>{t('m.tech.btc.p')}</p>
            </div>
            <div className="pt">
              <h3>{t('m.tech.dna.t')}</h3>
              <p>{t('m.tech.dna.p')}</p>
            </div>
            {/* Keeping one file and checking without us are in "If VeilCore disappears", and running
                your own in "Use it your way", on the same page (22 Nov: they were here twice). */}
            <div className="pt">
              <h3>{t('m.claims.statusTitle')}</h3>
              <p>{t('m.claims.status')}</p>
            </div>
            <div className="pt wide">
              <h3>{t('m.status.keyTitle')}</h3>
              <p>
                {t('m.status.keyText')}
                {sp}
                <a href={`${APP_REPO}/blob/main/docs/maintenance-policy.md`} rel="noopener noreferrer" target="_blank">
                  {arrowed(t('m.status.keyLink'))}
                </a>
              </p>
            </div>
          </div>
          {IS_MAINNET && <Contracts />}
        </details>
      </div>
    </section>
  );
};

/** The explainer in the page's language: every word in the video is translated (media-src/explainer). */
export const walkthroughFile = (lang: string, ext: 'mp4' | 'jpg'): string =>
  ['de', 'es', 'fr', 'ja'].includes(lang)
    ? `/media/veilcore-walkthrough.${lang}.${ext}`
    : `/media/veilcore-walkthrough.${ext}`;

/**
 * Ask (components/ask) is in every build with no switch, and it is on veilcore.org: its sheet is
 * in the mainnet release lists since 13 November 2026 (releases/mainnet). It drafts on the app's
 * pages and never signs or sends, so it touches no chain. If it is ever switched off for a site,
 * this goes false and its card leaves the page.
 */
const ASK_ON_SITE = true;

const StackMark: React.FC<{ r: number }> = ({ r }) => (
  <svg className="k-stack-mark" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeOpacity=".28" strokeWidth="1" />
    <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="60" cy="60" r="4" fill="currentColor" />
  </svg>
);

/** The doors' photos: decoration behind the words, which say it all. */
const DoorPhoto: React.FC<{ name: 'hand' | 'seed' }> = ({ name }) => (
  <Photo name={name} alt="" sizes="(max-width: 760px) 100vw, 50vw" className="k-door-img" />
);

/** How a lab's parentage result is proved, in plain words first. */
const PARENTAGE_DOC = 'https://github.com/hunterincoming/veilcore/blob/main/docs/parentage.md';

/**
 * What the home page carried below its first screens until 22 Nov 2026, moved whole to How it
 * works (HowItWorks.tsx) when the home page was cut to a short page: who it is for, what did you
 * have and when, where it matters, we can't read your records, the two doors with
 * the paste box and the video, more than a date, where it stops, questions, technical readers,
 * and the second band of names. Nothing in it was deleted; what How it works already said (share
 * proof, not data; if VeilCore disappears) is said there once. The four steps and the jar photo
 * are How it works' own, near its top (HowItWorks.tsx); the home page keeps a three-step summary.
 * The home page sends an old link to one of these sections there (MOVED_ANCHORS).
 */
export const MovedFromHome: React.FC = () => {
  const { t, lang, sp } = useI18n();
  const [showVideo, setShowVideo] = useState(false);

  const slides: Slide[] = [
    {
      key: '1',
      photo: 'cutting',
      position: '50% 55%',
      alt: t('m.home.alt.cutting'),
      title: t('m.for.1t'),
      body: t('m.for.1p'),
    },
    {
      key: '2',
      photo: 'greenhouse',
      alt: t('m.home.alt.greenhouse'),
      title: t('m.for.2t'),
      body: (
        <>
          {t('m.for.2p')}
          {sp}
          <a href="#claims">{arrowed(t('m.for.2link'))}</a>
        </>
      ),
    },
    {
      key: '3',
      photo: 'lab',
      alt: t('m.home.alt.lab'),
      title: t('m.for.3t'),
      // A lab's way in (lab/LabDoor.tsx): the co-founder couldn't find one from the site (21 Nov).
      body: (
        <>
          {t('m.for.3p')}
          {sp}
          <RouterLink to={LAB_DOOR} data-for-labs="slide">
            {arrowed(t('m.for.3link'))}
          </RouterLink>
        </>
      ),
    },
    {
      key: '6',
      photo: 'hand',
      position: '50% 40%',
      alt: t('m.home.alt.hand'),
      title: t('m.for.6t'),
      body: t('m.for.6p'),
    },
    {
      key: '5',
      photo: 'cattle',
      position: '50% 45%',
      alt: t('m.home.alt.cattle'),
      title: t('m.for.5t'),
      body: (
        <>
          {t('m.for.5p')}
          {sp}
          {/* Parentage is live (docs/parentage.md), and was findable nowhere on the site (review, 22 Nov). */}
          {t('m.for.5parent')}{' '}
          <a href={PARENTAGE_DOC} target="_blank" rel="noopener noreferrer" data-parentage-link="">
            {t('m.for.5parentLink')}
          </a>
          {sp}
          <a href={`${FOUNDERS_MAIL}&subject=${encodeURIComponent('Animal records')}`}>{t('m.for.5ask')}</a>
        </>
      ),
    },
  ];

  // More than a date (the design's six). Licenses and lab-signed results take the design's words once they have
  // worked on veilcore.org (config/copy.ts); until then the site's earlier words, which say what
  // is built and what is not.
  const features: [string, string][] = [
    [t('m.home.f1t'), t('m.home.f1p')],
    [t('m.home.f2t'), t('m.home.f2p')],
    AGREEMENTS_LIVE && ROYALTIES_RUN_ON_MAINNET ? [t('m.home.f3t'), t('m.home.f3p')] : [t('m.get.2a'), t('m.get.2b')],
    LAB_SIGNING_RUN_ON_MAINNET ? [t('m.home.f4t'), t('m.home.f4p')] : [t('m.for.4t'), t('m.for.4p')],
    ...(ASK_ON_SITE ? [[t('m.home.ask.t'), t('m.home.ask.p')] as [string, string]] : []),
    [t('m.home.f5t'), t('m.home.f5p')],
  ];

  const stops: [string, string, string, number][] = [
    [t('m.stops.1a'), t('m.stops.1b'), 'k-t-night', 14],
    [t('m.stops.2a'), t('m.stops.2b'), 'k-t-cyan', 24],
    [t('m.stops.3a'), t('m.stops.3b'), 'k-t-paper', 34],
    [t('m.stops.4a'), t('m.stops.4b'), 'k-t-night', 44],
  ];

  return (
    <>
      <Marquee label={t('m.home.audLabel')} list={t('m.home.audience')} />

      <section className="k-screen k-question" id="about" aria-labelledby="q-h">
        <div className="k-wrap">
          <p className="k-lead" data-reveal="">
            {t('m.for.title1')}
          </p>
          <h2 id="q-h" className="k-giant k-hl" data-reveal="" style={{ '--d': 1 } as React.CSSProperties}>
            {t('m.for.title2')}
          </h2>
          {/* A record dated early, a question asked later: drawn, so hidden from screen readers. */}
          <div className="k-timeline" aria-hidden="true">
            <div className="k-tl-axis" />
            <div className="k-tl-ticks">
              {Array.from({ length: 37 }, (_, i) => (
                <i key={i} />
              ))}
            </div>
            <div className="k-tl-fill" />
            <div className="k-tl-pin a">
              <span>{t('m.home.tlDated')}</span>
              <b />
            </div>
            <div className="k-tl-pin b">
              <span>{t('m.home.tlAsks')}</span>
              <b />
            </div>
          </div>
          <WordLight text={t('m.for.lede')} />
          <p className="k-lead k-answer" data-reveal="">
            <b>{t('m.get.1a')}</b>
            {sp}
            {t('m.get.1b')}
          </p>
        </div>
      </section>

      <section className="k-hgal" id="matters" aria-labelledby="hgal-h">
        <Gallery
          labelledBy="hgal-h"
          slides={slides}
          heading={
            <h2 id="hgal-h" className="k-h2">
              {t('m.home.matters')}
            </h2>
          }
        />
      </section>

      <section className="k-screen k-drench" id="open" aria-labelledby="custody-h">
        {/* The leaf texture: the dark leaf multiplied over the gold, away from the words. */}
        <img
          className="k-drench-tex"
          src="/media/home/leaf-800.webp"
          srcSet="/media/home/leaf-800.webp 800w, /media/home/leaf.webp 1458w"
          sizes="60vw"
          width={1458}
          height={972}
          alt=""
          loading="lazy"
          decoding="async"
        />
        <div className="k-wrap">
          <h2 id="custody-h" className="k-giant" data-reveal="">
            {t('m.home.custody.t')}
          </h2>
          <div className="k-drench-grid">
            <p data-reveal="" style={{ '--d': 2 } as React.CSSProperties}>
              {t('m.home.custody.p1')}
            </p>
            <p data-reveal="" style={{ '--d': 3 } as React.CSSProperties}>
              {t('m.home.custody.p2')}
            </p>
          </div>
        </div>
      </section>

      {/* The design's Records page, as this page's ways in: two doors, then the paste box and the
            video, which veilcore.org had and the draft didn't. */}
      <section className="k-sec k-ways-sec" id="demo" aria-labelledby="demo-h">
        <div className="k-wrap">
          <h2 id="demo-h" className="k-h2" data-reveal="">
            <Two a={t('m.demo.title1')} b={t('m.demo.title2')} />
          </h2>
          <p className="k-lead" data-reveal="" style={{ '--d': 1 } as React.CSSProperties}>
            {t('m.demo.lede')}
            {sp}
            <RouterLink to="/privacy">{arrowed(t('m.demo.privacy'))}</RouterLink>
          </p>
        </div>
        <div className="k-doors">
          <RouterLink className="k-door k-door-make" to="/new">
            <DoorPhoto name="hand" />
            <Ambient seed="make" />
            <span className="k-chips">
              <span className="k-chip live">{t('m.chip.interactive')}</span>
              <span className="k-chip">{t('m.chip.3min')}</span>
            </span>
            <h3>{t('m.demo.create.title')}</h3>
            <p>{t('m.demo.create.text')}</p>
            <span className="k-btn k-btn-primary k-door-go">
              {t('m.demo.create.title')}
              <Arrow />
            </span>
          </RouterLink>
          <RouterLink className="k-door k-door-verify" to="/verify">
            <DoorPhoto name="seed" />
            <Ambient seed="verify" />
            <span className="k-chips">
              <span className="k-chip live">{t('m.chip.interactive')}</span>
              <span className="k-chip">{t('m.chip.1min')}</span>
            </span>
            <h3>{t('m.demo.verify.title')}</h3>
            <p>{t('m.demo.verify.text')}</p>
            <span className="k-btn k-btn-ghost k-door-go">
              {t('m.demo.verify.title')}
              <Arrow />
            </span>
          </RouterLink>
        </div>
        <div className="k-wrap">
          <div className="k-grid4 k-ways">
            <RouterLink className="k-way" to={PASTE_ENTRY} data-paste-entry="demo">
              <h3>{t('m.demo.paste.title')}</h3>
              <p>{t('m.demo.paste.text')}</p>
              <span className="k-chips">
                <span className="k-chip live">{t('m.chip.interactive')}</span>
                <span className="k-chip">{t('m.chip.1min')}</span>
              </span>
            </RouterLink>
            <button
              type="button"
              className="k-way"
              aria-expanded={showVideo}
              aria-controls="walkthrough"
              onClick={() => setShowVideo(!showVideo)}
            >
              <h3>{t('m.demo.video.title')}</h3>
              <p>{t('m.demo.video.text')}</p>
              <span className="k-chips">
                <span className="k-chip">{t('m.chip.video')}</span>
                <span className="k-chip">{t('m.chip.60s')}</span>
              </span>
            </button>
          </div>
          {showVideo && (
            <div className="walkthrough" id="walkthrough">
              <video
                key={lang}
                src={walkthroughFile(lang, 'mp4')}
                poster={walkthroughFile(lang, 'jpg')}
                controls
                autoPlay
                playsInline
                preload="metadata"
                aria-label={t('m.demo.video.title')}
              />
            </div>
          )}
        </div>
      </section>

      <section className="k-screen" id="value" aria-labelledby="more-h">
        <div className="k-wrap">
          {/* The same size as "Where it matters" (Mako's note, 22 Nov), like every section title here. */}
          <h2 id="more-h" className="k-h2" data-reveal="">
            {t('m.home.more')}
          </h2>
          <div className="k-grid4 k-grid3">
            {features.map(([title, text], i) => (
              <div key={title} data-reveal="" style={{ '--d': i } as React.CSSProperties}>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="k-screen" id="status" aria-labelledby="limits-h">
        <div className="k-wrap">
          <h2 id="limits-h" className="k-h2" data-reveal="">
            {t('m.stops.title')}
          </h2>
          <div className="k-stack">
            {stops.map(([title, text, tone, r]) => (
              <article className={`k-stack-card ${tone}`} key={title} data-reveal="">
                <div className="k-stack-inner">
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
                <StackMark r={r} />
              </article>
            ))}
          </div>
          <h3 className="k-h2 k-h2-next">
            <Two a={t('m.status.title1')} b={t('m.status.title2')} />
          </h3>
          <p className="k-sub">{t('m.status.lede')}</p>
          <p className="k-fine k-where-link">
            <a href="#where">{arrowed(t('m.status.whereLink'))}</a>
          </p>
        </div>
      </section>

      <section className="k-sec" id="questions" aria-labelledby="faq-h">
        <div className="k-wrap">
          <h2 id="faq-h" className="k-h2" data-reveal="">
            <Two a={t('m.faq.title1')} b={t('m.faq.title2')} />
          </h2>
          <div className="faq">
            <details>
              <summary>{t('m.faq.1q')}</summary>
              <p>{t('m.faq.1a')}</p>
            </details>
            <details>
              <summary>{t('m.faq.2q')}</summary>
              <p>{t('m.faq.2a')}</p>
            </details>
            <details>
              <summary>{t('m.faq.3q')}</summary>
              <p>
                {t('m.faq.3a')}
                {sp}
                <RouterLink to="/docs/evidence">{arrowed(t('m.faq.3link'))}</RouterLink>
              </p>
            </details>
            <details>
              <summary>{t('m.faq.4q')}</summary>
              <p>
                {t('m.faq.4a')}
                {sp}
                <RouterLink to="/privacy">{arrowed(t('m.faq.4link1'))}</RouterLink>{' '}
                <RouterLink to="/docs/integrate">{arrowed(t('m.faq.4link2'))}</RouterLink>
              </p>
            </details>
            <details>
              <summary>{t('m.faq.6q')}</summary>
              <p>{t('m.faq.6a')}</p>
            </details>
          </div>
        </div>
      </section>

      <Technical />

      <Marquee label={t('m.home.trustLabel')} list={t('m.home.trust')} />
    </>
  );
};

/**
 * "Try it. Nothing is sent.": the proof code worked out as you type, and the event display drawn
 * from it (the home page's hero until 22 Nov; on How it works since).
 */
export const TryIt: React.FC<{ onHash: (hex: string) => void }> = ({ onHash }) => {
  const { lang } = useI18n();
  return (
    <div className="k-wrap" data-intro="" style={{ '--i': 4 } as React.CSSProperties}>
      <Fingerprint key={lang} onHash={onHash} />
    </div>
  );
};

/**
 * Old links into the home page's sections, and where each is now: a section of How it works or
 * About (the four steps are How it works' #how), the top of one, or a section of this page under
 * its new name.
 */
export const MOVED_ANCHORS: Record<string, string> = {
  how: '/how-it-works#how',
  demo: '/how-it-works#demo',
  claims: '/how-it-works#claims',
  value: '/how-it-works#value',
  open: '/how-it-works#open',
  status: '/how-it-works#status',
  live: '/how-it-works#where',
  questions: '/how-it-works#questions',
  technical: '/how-it-works#technical',
  matters: '/how-it-works#matters',
  updates: '/founders#updates',
  contact: '/founders#contact',
  team: '/founders',
  keep: '/#private',
};

/** The hero's event display on the home page: drawn from a fixed code (SHA-256 of "veilcore"). */
const HOME_HEX = 'f4f83986ca01724bd31765a409cbac032357ac5de60e6e6184611ad466954934';

/**
 * The home page since 22 Nov 2026: short (it was about 25 phone screens). A hero with one line and
 * the two things to do; how it works in three steps; who it is for, each to its own page; one
 * line on privacy and Midnight's part; use it your way; and a list of links to everything that
 * moved (How it works, About, Help). complexity-budget.json holds it to that ("site.home").
 */
/** The example proof code drawn in step 2 (the same one How it works shows). */
const STEP_CODE = '3f9a1c07b2e84d6a91c5f0e27b4d8a3c6e1f95b0d27a4c8e3b61f0a9d5c27e48';

/**
 * What each of the three steps looks like, drawn above it (Mako's note, 22 Nov: the landing had
 * too little to look at). The same pictures as How it works' four steps, still: an example
 * record, its proof code, the check. Decoration: the step's own words say it.
 */
const StepPicture: React.FC<{ n: number }> = ({ n }) => {
  const { t } = useI18n();
  // The code settles from random hex each time it comes into view (Mako's scramble, as on How it
  // works); the check mark draws itself (home.css). Both still with reduced motion.
  const code = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = code.current;
    if (!el) return;
    el.textContent = STEP_CODE;
    if (typeof IntersectionObserver === 'undefined') return;
    let stop: (() => void) | undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          stop?.();
          stop = scramble(el, STEP_CODE);
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stop?.();
    };
  }, []);
  return (
    <div className="k-step-pic" aria-hidden="true">
      {n === 0 && (
        <dl className="k-rec">
          <div>
            <dt>{t('m.hero.cultivar')}</dt>
            <dd>Harbour Mist</dd>
          </div>
          <div>
            <dt>{t('m.home.ex.dna')}</dt>
            <dd>report.pdf</dd>
          </div>
        </dl>
      )}
      {n === 1 && <p className="k-bigcode" ref={code} />}
      {n === 2 && (
        <svg className="k-check" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="70" />
          <circle className="ring" cx="80" cy="80" r="70" />
          <path className="ok" d="M52 82 L72 101 L110 61" />
        </svg>
      )}
    </div>
  );
};

export const Home: React.FC = () => {
  const { t, lang, sp } = useI18n();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const [returning] = useState(hasRecordsHere);
  const root = useRef<HTMLDivElement>(null);
  useReveals(root);
  useScrollPieces(root);
  useHashScroll(hash);
  // An old link to a section that moved: to its new page, at the same section.
  useEffect(() => {
    const id = decodeURIComponent(hash.slice(1));
    const to = MOVED_ANCHORS[id];
    if (to) void navigate(to, { replace: true });
  }, [hash]);

  const steps: [string, string][] = [
    [t('m.home2.s1t'), t('m.home2.s1p')],
    [t('m.home2.s2t'), t('m.home2.s2p')],
    [t('m.home2.s3t'), t('m.home2.s3p')],
  ];
  // Each kind of user with one of Mako's photos (his note, 22 Nov: too little to look at).
  const who: [string, string, string, string, 'greenhouse' | 'lab' | 'cattle'][] = [
    [t('m.home2.w1t'), t('m.home2.w1p'), '/new', t('m.demo.create.title'), 'greenhouse'],
    [t('m.home2.w2t'), t('m.home2.w2p'), LAB_DOOR, t('title.forLabs'), 'lab'],
    [t('m.home2.w3t'), t('m.home2.w3p'), '/partners', t('title.partners'), 'cattle'],
  ];
  const more: [string, string][] = [
    // How it works, About and their updates are in the menu on every page, and "All of how it
    // works" sits under the steps, so they left this list when the steps got their pictures
    // (Mako's note, 22 Nov).
    ['/how-it-works#claims', t('m.claims.label')],
    // Parentage, live since 21 Nov, on the home page too (review of #169).
    [PARENTAGE_DOC, t('m.for.5parentLink')],
    ['/how-it-works#status', t('m.stops.title')],
    ['/how-it-works#demo', t('m.demo.video.title')],
    ['/how-it-works#questions', t('m.home2.l.faq')],
    ['/how-it-works#technical', t('m.tech.title')],
    ['/help', t('footer.help')],
    ['/founders#contact', t('m.home2.l.contact')],
    // (Privacy is linked from the privacy line above.)
    ['/docs/spec', t('title.spec')],
    ['/docs/evidence', t('title.evidence')],
    ['/docs/integrate', t('title.integrate')],
  ];

  return (
    <SiteShell after={<NightEnd />}>
      <div className="home" ref={root}>
        <header className="k-screen k-hero k-intro" id="top">
          <div className="k-wrap k-hero-grid">
            <div className={`k-hero-text${lang === 'ja' ? ' cjk' : ''}`}>
              <h1>
                <span className="k-line">
                  <span>{t('m.hero.title1')}</span>
                </span>
                {sp}
                <span className="k-line k-hl">
                  <span>{t('m.hero.title2')}</span>
                </span>
              </h1>
              <p className="k-lede" data-intro="" style={{ '--i': 2 } as React.CSSProperties}>
                {t('m.home2.lede')}
              </p>
              <div className="k-actions hero-actions" data-intro="" style={{ '--i': 3 } as React.CSSProperties}>
                {returning && (
                  <RouterLink className="k-btn k-btn-primary" to="/records" data-your-records="">
                    {t('m.nav.yours')}
                  </RouterLink>
                )}
                <RouterLink className={`k-btn ${returning ? 'k-btn-ghost' : 'k-btn-primary'}`} to="/new">
                  {t('m.demo.create.title')}
                  <Arrow />
                </RouterLink>
                <RouterLink className="k-btn k-btn-ghost" to="/verify" data-check-entry="hero">
                  {t('m.demo.verify.title')}
                </RouterLink>
              </div>
              {/* The third way in (a lab tested it, 8 Nov): anyone who was sent a lab code or a
                  link goes straight to the box that opens it (paste-entry.ts). Under the two
                  buttons since 22 Nov, on a phone too. */}
              <p className="k-paste hero-paste" data-intro="" style={{ '--i': 3 } as React.CSSProperties}>
                {t('m.hero.pasteQ')}
                {sp}
                <RouterLink to={PASTE_ENTRY} data-paste-entry="hero">
                  {arrowed(t('m.hero.pasteGo'))}
                </RouterLink>
              </p>
              {/* A first visit on a new phone or computer (the live test, 19 Nov 2026). */}
              {!returning && (
                <p className="k-paste hero-restore" data-intro="" style={{ '--i': 3 } as React.CSSProperties}>
                  {t('m.hero.restoreQ')}
                  {sp}
                  <RouterLink to="/restore" data-restore-entry="hero">
                    {arrowed(t('m.hero.restoreGo'))}
                  </RouterLink>
                </p>
              )}
            </div>
            <EventDisplay hex={HOME_HEX} />
          </div>
        </header>

        <section className="k-sec" id="steps" aria-labelledby="steps-h">
          <div className="k-wrap">
            <h2 id="steps-h" className="k-h2" data-reveal="">
              {t('m.home2.stepsTitle')}
            </h2>
            <ol className="k-grid4 k-grid3 k-plain-steps">
              {steps.map(([title, text], i) => (
                <li key={title} data-reveal="" style={{ '--d': i } as React.CSSProperties}>
                  <StepPicture n={i} />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
            <p className="k-fine k-steps-more">
              <RouterLink to="/how-it-works">{arrowed(t('m.home2.howLink'))}</RouterLink>
            </p>
          </div>
        </section>

        <section className="k-sec" id="about" aria-labelledby="who-h">
          <div className="k-wrap">
            <h2 id="who-h" className="k-h2" data-reveal="">
              {t('m.home2.whoTitle')}
            </h2>
            <div className="k-grid4 k-grid3">
              {who.map(([title, text, to, link, photo], i) => (
                <div key={title} data-reveal="" style={{ '--d': i } as React.CSSProperties}>
                  <Photo
                    className="k-who-pic"
                    name={photo}
                    alt={t(`m.home.alt.${photo}`)}
                    sizes="(max-width: 760px) 100vw, 33vw"
                  />
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <p>
                    <RouterLink to={to} {...(to === LAB_DOOR ? { 'data-for-labs': 'home' } : {})}>
                      {arrowed(`${link} →`)}
                    </RouterLink>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mako's jar, back on the landing (his note, 22 Nov: too little to look at). The same
            photo and words as How it works, opening from an inset as it comes into view. */}
        <PhotoScreen id="private" labelledBy="keep-h" name="jar" alt={t('m.home.alt.jar')} position="50% 60%">
          <h2 id="keep-h" className="k-giant" data-reveal="">
            {t('m.home.keep.t')}
          </h2>
          <p className="k-lead" data-reveal="" style={{ '--d': 1 } as React.CSSProperties}>
            {t('m.home.keep.p')}
            {sp}
            <RouterLink to="/privacy">{arrowed(t('m.demo.privacy'))}</RouterLink>
          </p>
        </PhotoScreen>

        <section className="k-sec" id="own-way" aria-labelledby="own-h" data-own-way="">
          <div className="k-wrap">
            <h2 id="own-h" className="k-h2" data-reveal="">
              {t('m.own.title')}
            </h2>
            <p className="k-lead" data-reveal="" style={{ '--d': 1 } as React.CSSProperties}>
              {t('m.own.short')}
              {sp}
              <RouterLink to="/how-it-works#own-way">{arrowed(t('m.own.link'))}</RouterLink>
            </p>
          </div>
        </section>

        <section className="k-sec" id="more" aria-labelledby="more-links-h">
          <div className="k-wrap">
            <h2 id="more-links-h" className="k-h2" data-reveal="">
              {t('m.home2.moreTitle')}
            </h2>
            <ul className="k-link-list" data-home-more="">
              {more.map(([to, label]) => (
                <li key={to}>
                  {to.startsWith('https://') ? (
                    <a href={to} target="_blank" rel="noopener noreferrer">
                      {arrowed(label)}
                    </a>
                  ) : (
                    <RouterLink to={to}>{arrowed(`${label} →`)}</RouterLink>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <PhotoCredits names={['jar', 'greenhouse', 'lab', 'cattle']} />

        <NightClose />
      </div>
    </SiteShell>
  );
};
