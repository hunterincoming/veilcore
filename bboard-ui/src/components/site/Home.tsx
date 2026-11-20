// The home page, in Mako's design (his site draft of 21 November 2026, ported from the 18 November
// one): night ground, the logo's gold #A67C00, Archivo and JetBrains Mono, photos between the
// sections. In order: the hero with the event display drawn from the live proof code; who it is
// for; your genetics stay with you (photo); what did you have, and when; where it matters (a
// sideways strip, Gallery.tsx); we can't read your records; four steps; make a record or check
// one (Mako's Records page: his two doors, with the paste box and the video beside them); share
// proof, not data; more than a date; where it stops, where things stand and what works where;
// latest from the build; questions; technical readers; talk to the founders.
//
// How it works (/how-it-works) and About (/founders) are the other two of Mako's pages; the
// sections they share with this one are in night-parts.tsx, LiveWhere.tsx and Claims.tsx.
//
// Ported, not copied: his page pinned sections and moved them as you scrolled (the steps, the
// timeline, the gallery). Hunter's direction (18 Nov): modern, fewer words, effects fine, no
// scroll-jacking, fast on a computer. So nothing here is pinned or driven by the page's scroll:
// the steps change when one is chosen, the timeline is drawn complete, the gallery is a row you
// swipe or step through with its buttons. No scroll listeners. The event display draws only for
// about a second after the proof code changes, never while off screen or hidden, at no more than
// 1.5 device pixels per pixel, and not at all in motion with reduced motion. The moving band of
// names has a pause button, stops off screen, and stands still with reduced motion. Photos are
// Mako's re-exports with an 800-wide copy for phones, lazy below the first screen, with their
// size set (public/media/home/CREDITS.md).
//
// Every sentence is the site's own, from the translations, and holds to its rules (copy-truth
// and the promise rule): where Mako's draft said genetic data never leaves your computer, this
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
// Content rules (Mako's): "prior possession", never "ownership"; no customer, pilot or partner
// claims; plant AND animal genetics; the three implementations have one author and are never
// called independent; the status stays honest and current, and the technical section says
// plainly who holds the maintenance key (docs/maintenance-policy.md, APPROVED 7 Oct).
// Strings that flip on mainnet day are grouped in i18n/en.ts under "MAINNET DAY".
//
// Every in-page anchor other pages link to stays here once (e2e/home.spec.ts): top, about, how,
// demo, claims, value, open, status, live, updates, questions, technical, contact, team.
//
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { computeCommitment, newNonce } from 'veilcore-records';
import { useI18n } from '../../i18n';
import { FOUNDERS_MAIL, SiteShell } from './SiteShell';
import { hasRecordsHere } from './returning';
import { PASTE_ENTRY } from './paste-entry';
import { IS_MAINNET, MAINNET_CLAIMS_ADDRESS, MAINNET_CONTRACT_ADDRESS, explorerFor } from '../../config/network';
import { AGREEMENTS_LIVE, LAB_SIGNING_RUN_ON_MAINNET, ROYALTIES_RUN_ON_MAINNET } from '../../config/copy';
import { EventDisplay } from './EventDisplay';
import {
  APP_REPO,
  Arrow,
  Marquee,
  NightClose,
  Photo,
  PhotoCredits,
  PhotoScreen,
  SR_ONLY,
  Two,
  Updates,
  arrowed,
  useHashScroll,
  useReveals,
} from './night-parts';
import { LiveWhere, StandList } from './LiveWhere';
import { Gallery, type Slide } from './Gallery';
import { Claims } from './Claims';
import './home.css';

/**
 * A founder's photo, as on the Founders page. The initials show only if the photo can't
 * load. Not lazy: it is two small files, and a lazy one showed as initials in a full-page
 * screenshot (persona review, 17 Oct).
 */
const Avatar: React.FC<{ initials: string; photo: string }> = ({ initials, photo }) => {
  const [failed, setFailed] = useState(false);
  return (
    <span className="avatar">{failed ? initials : <img src={photo} alt="" onError={() => setFailed(true)} />}</span>
  );
};

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
        <h2 className="k-h3">{t('m.tech.title')}</h2>
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
            <div className="pt">
              <h3>{t('m.open.2t')}</h3>
              <p>{t('m.open.2p')}</p>
            </div>
            <div className="pt">
              <h3>{t('m.open.6t')}</h3>
              <p>
                {t('m.open.6p')}
                {sp}
                <RouterLink to="/docs/spec">{arrowed(t('m.open.6link'))}</RouterLink>
              </p>
            </div>
            <div className="pt">
              <h3>{t('m.open.4t')}</h3>
              <p>{t('m.open.4p')}</p>
            </div>
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

/** An illustration, not a record: the example in "Four steps". */
const EXAMPLE_CODE = '3f9a1c07b2e84d6a91c5f0e27b4d8a3c6e1f95b0d27a4c8e3b61f0a9d5c27e48';

/**
 * Four steps (Mako's pinned stage, unpinned). The step in the middle of the window is the lit
 * one, from an IntersectionObserver; choosing a step lights it too. The picture beside the
 * steps shows that step. The page scrolls on as normal.
 */
const Steps: React.FC = () => {
  const { t, sp } = useI18n();
  const [step, setStep] = useState(0);
  const list = useRef<HTMLOListElement>(null);
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
          <p className="k-bigcode">{EXAMPLE_CODE}</p>
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

/** The round marks on the cards of "Where it stops" (Mako's), a wider ring on each. */
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

export const Home: React.FC = () => {
  const { t, lang, sp } = useI18n();
  const { hash } = useLocation();
  const [showVideo, setShowVideo] = useState(false);
  const [returning] = useState(hasRecordsHere);
  const [hex, setHex] = useState('');
  const root = useRef<HTMLDivElement>(null);
  useReveals(root);
  useHashScroll(hash);

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
    { key: '3', photo: 'lab', alt: t('m.home.alt.lab'), title: t('m.for.3t'), body: t('m.for.3p') },
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
          <a href={`${FOUNDERS_MAIL}&subject=${encodeURIComponent('Animal records')}`}>{t('m.for.5ask')}</a>
        </>
      ),
    },
  ];

  // More than a date (Mako's six). Licenses and lab-signed results take his words once they have
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
    // Where VeilCore stops with labs: it shows who signed, never vouches.
    [t('m.open.3t'), t('m.open.3p'), 'k-t-yellow', 52],
  ];

  return (
    <SiteShell>
      <div className="home" ref={root}>
        <header className="k-screen k-hero" id="top">
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
              <p className="k-lede">{t('m.hero.lede')}</p>
              <div className="k-actions hero-actions">
                {returning && (
                  <RouterLink className="k-btn k-btn-primary" to="/records" data-your-records="">
                    {t('m.nav.yours')}
                  </RouterLink>
                )}
                <RouterLink className={`k-btn ${returning ? 'k-btn-ghost' : 'k-btn-primary'}`} to="/new">
                  {t('m.demo.create.title')}
                  <Arrow />
                </RouterLink>
                <RouterLink className="k-link-quiet" to="/how-it-works">
                  {t('m.hero.how')}
                </RouterLink>
              </div>
              {/* The third way in (a lab tested it, 8 Nov): anyone who was sent a lab code or a
                  link goes straight to the box that opens it (paste-entry.ts). */}
              <p className="k-paste hero-paste">
                {t('m.hero.pasteQ')}
                {sp}
                <RouterLink to={PASTE_ENTRY} data-paste-entry="hero">
                  {arrowed(t('m.hero.pasteGo'))}
                </RouterLink>
              </p>
              {/* A first visit on a new phone or computer (the live test, 19 Nov 2026): the way back
                  to records made elsewhere is next to "Make a record", not only inside the app. */}
              {!returning && (
                <p className="k-paste hero-restore">
                  {t('m.hero.restoreQ')}
                  {sp}
                  <RouterLink to="/restore" data-restore-entry="hero">
                    {arrowed(t('m.hero.restoreGo'))}
                  </RouterLink>
                </p>
              )}
              <p className="k-fine k-status-line">{t('m.hero.status')}</p>
            </div>
            <EventDisplay hex={hex} />
          </div>
          <div className="k-wrap">
            <Fingerprint key={lang} onHash={setHex} />
          </div>
        </header>

        <Marquee label={t('m.home.audLabel')} list={t('m.home.audience')} />

        <PhotoScreen id="keep" labelledBy="keep-h" name="jar" alt={t('m.home.alt.jar')} position="50% 60%">
          <h2 id="keep-h" className="k-giant" data-reveal="">
            {t('m.home.keep.t')}
          </h2>
          <p className="k-lead" data-reveal="" style={{ '--d': 1 } as React.CSSProperties}>
            {t('m.home.keep.p')}
          </p>
        </PhotoScreen>

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
            <p className="k-wordlight" data-reveal="">
              {t('m.for.lede')}
            </p>
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
          {/* Mako's leaf texture: the dark leaf multiplied over the gold, away from the words. */}
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
              <p data-reveal="" style={{ '--d': 4 } as React.CSSProperties}>
                <b>
                  {t('m.open.title1')}
                  {sp}
                  {t('m.open.title2')}
                </b>
                {sp}
                {t('m.open.1t')}
                {sp}
                {t('m.open.1p')}
              </p>
            </div>
          </div>
        </section>

        <section className="k-screen k-how" id="how" aria-labelledby="how-h">
          <Steps />
        </section>

        {/* Mako's Records page, as this page's ways in: his two doors, then the paste box and the
            video, which veilcore.org had and his draft didn't. */}
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

        <section className="k-screen" id="claims" aria-labelledby="claims-h">
          <Claims />
        </section>

        <section className="k-screen" id="value" aria-labelledby="more-h">
          <div className="k-wrap">
            <h2 id="more-h" className="k-giant" data-reveal="">
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
            <h3 className="k-h3">
              <Two a={t('m.status.title1')} b={t('m.status.title2')} />
            </h3>
            <p className="k-sub">{t('m.status.lede')}</p>
            <StandList />
            <LiveWhere />
            <p className="k-fine k-where-link">
              <RouterLink to="/how-it-works#where">{arrowed(t('m.status.whereLink'))}</RouterLink>
            </p>
          </div>
        </section>

        <Updates />

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

        {/* Talk to the founders (Mako's close): who to write to, and their faces. What each kind of
            reader should write about is on About (/founders#contact). */}
        <section className="k-screen k-drench k-close" id="contact" aria-labelledby="close-h">
          <div className="k-wrap">
            {/* One colour on the gold: night text throughout (Mako: small text on gold is black). */}
            <h2 id="close-h" className="k-giant" data-reveal="">
              {t('m.contact.title1')}
              {sp}
              {t('m.contact.title2')}
            </h2>
            <div className="k-close-row">
              <p className="k-drench-lead" data-reveal="" style={{ '--d': 1 } as React.CSSProperties}>
                {t('m.home.closeLede')}
                {sp}
                <a href="mailto:mako@veilcore.org">mako@veilcore.org</a>
                {lang === 'ja' ? '・' : ', '}
                <a href="mailto:hunter@veilcore.org">hunter@veilcore.org</a>
              </p>
              <div className="k-actions" data-reveal="" style={{ '--d': 2 } as React.CSSProperties}>
                <RouterLink className="k-btn k-btn-dark" to="/new">
                  {t('m.demo.create.title')}
                  <Arrow />
                </RouterLink>
                <a className="k-btn k-btn-line" href={FOUNDERS_MAIL}>
                  {t('m.contact.email')}
                </a>
              </div>
            </div>
            <div
              className="team-row k-close-team"
              id="team"
              role="group"
              aria-label={`${t('m.team.title1')}${sp}${t('m.team.title2')}`}
            >
              {(
                [
                  ['Mako Steiner', 'MS', '/team/mako.jpg', 'm.mako.role'],
                  ['Hunter Roberts', 'HR', '/team/hunter.jpg', 'm.hunter.role'],
                ] as const
              ).map(([name, initials, photo, role]) => (
                <RouterLink className="person" to="/founders" key={name}>
                  <Avatar initials={initials} photo={photo} />
                  <span>
                    <b>{name}</b>
                    <span className="role">{t(role)}</span>
                  </span>
                </RouterLink>
              ))}
            </div>
          </div>
        </section>

        <PhotoCredits names={['jar', 'cutting', 'greenhouse', 'lab', 'hand', 'cattle', 'seed', 'leaf']} />
        <NightClose />
      </div>
    </SiteShell>
  );
};
