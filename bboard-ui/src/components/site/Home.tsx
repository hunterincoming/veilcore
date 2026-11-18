// The home page, in the layout of Mako's design (lambent-cajeta-c3212a.netlify.app, 18 November
// 2026): night ground, his yellow, Archivo and JetBrains Mono, photos between the sections. In
// order: the hero with the event display drawn from the live proof code; who it is for; your
// genetics stay with you (photo); what did you have, and when; where it matters (a carousel); we
// don't hold your keys; four steps; the demo's ways in; share proof, not data; more than a date;
// where it stops, with the status and what's live where; what it gives you; updates; questions;
// technical readers; the founders; tell us where it fails.
//
// Ported, not copied: his page pinned three sections and moved them as you scrolled (the steps,
// the timeline, the gallery). A tester found the page stopped moving under the wheel, so nothing
// here is pinned or driven by the page's scroll: the steps change when one is chosen, the
// timeline is drawn complete, the gallery is a row you swipe or step through with its buttons.
// No scroll listeners. The event display draws only for about a second after the proof code
// changes, never while off screen or hidden, at no more than 1.5 device pixels per pixel, and
// not at all in motion with reduced motion. The moving band of names has a pause button, stops
// off screen, and stands still with reduced motion. Photos are resized (800 and 1600 wide),
// lazy below the first screen, with their size set (public/media/home/CREDITS.md).
//
// Every sentence is the site's own, from the translations, and holds to its rules (copy-truth
// and the promise rule): where Mako's draft said genetic data never leaves your computer, this
// says DNA files never leave it and what you type reaches our server locked.
//
// Technical detail (SHA-256, test vectors, OpenTimestamps, the contract addresses, the claims
// contract's status, the maintenance key) lives only in "For technical readers": still on the
// page, still true, but out of a breeder's way. What's live where stays on the page, folded.
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
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { computeCommitment, newNonce } from 'veilcore-records';
import { IS_TEST_SITE, MAINNET_SENDS, THIS_BUILD, useI18n } from '../../i18n';
import { FOUNDERS_MAIL, RoleLine, SDK_REPO, SiteShell, X_HANDLE } from './SiteShell';
import { FoldGroup, usePhone } from './Fold';
import { hasRecordsHere } from './returning';
import { PASTE_ENTRY } from './paste-entry';
import { IS_MAINNET, MAINNET_CLAIMS_ADDRESS, MAINNET_CONTRACT_ADDRESS, explorerFor } from '../../config/network';
import {
  AGREEMENTS_LIVE,
  DEVICE_ONLY_CLAIMS_RUN_ON_MAINNET,
  DEVICE_ONLY_RUN_ON_MAINNET,
  DOCUMENT_CHAIN_RUN_ON_MAINNET,
  LAB_SIGNING_RUN_ON_MAINNET,
  ROYALTIES_RUN_ON_MAINNET,
  ROYALTIES_RUN_ON_TEST,
} from '../../config/copy';
import { EventDisplay } from './EventDisplay';
import './home.css';

const APP_REPO = 'https://github.com/hunterincoming/veilcore';
/** The public test site (docs/test-site.md). It goes live with this release. */
const TEST_SITE_URL = 'https://test.veilcore.org';
/** Our own reviews (not audits), listed in the public repository's audit pack, section 8. */
const REVIEWS_URL = `${APP_REPO}/blob/main/docs/audit/README.md#8-history-of-internal-attack-rounds`;

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

/** Read by screen readers, not shown. */
const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/**
 * A link's closing arrow ("Read the spec →"). Archivo has no arrow, so the character stays in
 * the text (screen readers and find-in-page see it) but is drawn as a small SVG in the text's
 * colour (home.css .k-gl), not borrowed from another font.
 */
const arrowed = (s: string): React.ReactNode => {
  const m = /\s*→\s*$/.exec(s);
  if (!m) return s;
  return (
    <>
      {s.slice(0, m.index)}
      {s.slice(m.index, m.index + m[0].indexOf('→'))}
      <span className="k-gl">→</span>
    </>
  );
};

/** A heading written in two halves, read as one sentence: the second half quieter. */
const Two: React.FC<{ a: string; b: string }> = ({ a, b }) => {
  const { sp } = useI18n();
  return (
    <>
      {a}
      {sp}
      <span className="k-mute">{b}</span>
    </>
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

/** One update, dated first: the site is about dates, so updates read like a log book. */
const Post: React.FC<{
  href: string;
  date: string;
  iso: string;
  tag: string;
  title: string;
  text: string;
  go: string;
}> = (p) => (
  <a className="post" href={p.href} rel="noopener noreferrer" target="_blank">
    <span className="when">
      <time dateTime={p.iso}>{p.date}</time>
      <span className="tag">{p.tag}</span>
    </span>
    <div className="what">
      <h3>{p.title}</h3>
      <p>{p.text}</p>
      <span className="go">{arrowed(p.go)}</span>
    </div>
  </a>
);

/**
 * What's live where: one row per feature, and for each the sites it works on. Read from
 * the code and docs on 14 October 2026 (i18n/en.ts, "What's live where"); a cell left out
 * means the feature isn't there (a dash on wide screens, nothing on a phone). A table on
 * wide screens; on a phone each row stacks, and each cell names its site.
 */
const LIVE_ROWS = [
  ['stamp', true, true, false],
  // The registry stamps every sealed batch on Bitcoin (OpenTimestamps), and the plant page
  // offers the batch's stamp file (round 5). The test site's registry runs with it off
  // (docs/no-wallet-run-12oct.md), so no test-site cell.
  ['btc', true, false, false],
  // The check page looking the date up on Midnight itself (docs/check-on-chain.md): on the
  // test site through the sponsor's relay; on veilcore.org once the read-only relay is live
  // (its cell says "Not yet" in en.ts, "Yes." from the mainnet overlay on a build with one).
  ['chain', true, true, false],
  ['share', true, true, false],
  ['lab', true, true, false],
  // Lab reports locked to the breeder: on veilcore.org too since 16 Oct 2026 (config/network.ts).
  ['results', true, true, false],
  // Numbers and results a lab signs (config/network.ts LAB_SIGNING_ENABLED): switched on for
  // veilcore.org too (from the first site deploy that carries it). Its cell says "built, not yet tried" until it has worked there
  // (config/copy.ts LAB_SIGNING_RUN_ON_MAINNET, cellKey below).
  ['signed', true, true, false],
  // A document kept on this device only (config/network.ts DEVICE_ONLY_RECORDS_ENABLED): on in
  // every build. Its veilcore.org cell says "built, not yet tried" until one has been sealed and
  // checked there (config/copy.ts DEVICE_ONLY_RUN_ON_MAINNET, cellKey below).
  ['local', true, true, false],
  // A production chain as document records (config/network.ts DOCUMENT_CHAIN_ENABLED), and
  // proving a number from a document kept on the device only (DEVICE_ONLY_CLAIMS_ENABLED): on in
  // every build. Neither has been tried on a network yet, so both cells say "built", and the
  // veilcore.org cell keeps saying so until each has worked there (config/copy.ts
  // DOCUMENT_CHAIN_RUN_ON_MAINNET, DEVICE_ONLY_CLAIMS_RUN_ON_MAINNET, cellKey below).
  ['docchain', true, true, false],
  ['localclaims', true, true, false],
  ['dna', true, true, false],
  ['prove', false, true, true],
  ['claims', true, false, true],
  ['lic', true, true, true],
] as const;

/**
 * With the mainnet sponsor live (scripts/deploy-mainnet.mjs), "prove it by link" works on
 * veilcore.org exactly as on the test site, so its cell says the same thing the test cell does.
 */
type LiveRow = (typeof LIVE_ROWS)[number];
const CLAIMS_ON_SITE = THIS_BUILD.claimsOnSite === true;
/** veilcore.org itself, built with licenses on and the mainnet sponsor live. */
const LICENSES_ON_SITE = THIS_BUILD.agreementsLive === true && MAINNET_SENDS;
const liveRows = (): readonly LiveRow[] =>
  LIVE_ROWS.map((r): LiveRow => {
    if (MAINNET_SENDS && r[0] === 'prove') return ['prove', true, true, false] as unknown as LiveRow;
    // Licenses: a tick in the veilcore.org column on every build while AGREEMENTS_LIVE is on. The
    // cell's words (cellKey, below) say "Yes" once royalties have worked on veilcore.org
    // (config/copy.ts ROYALTIES_RUN_ON_MAINNET): on veilcore.org's own build, and on the test
    // site and the demo too, since it is a fact about veilcore.org. Until then they say licenses
    // come with the deploy (m.live.lic.mainNext).
    if (AGREEMENTS_LIVE && r[0] === 'lic') return ['lic', true, true, false] as unknown as LiveRow;
    // "Prove one number" on veilcore.org (the sponsor pays for VeilCore's claims contract).
    if (CLAIMS_ON_SITE && r[0] === 'claims') return ['claims', true, true, false] as unknown as LiveRow;
    return r;
  });
const cellKey = (row: string, col: string) =>
  (MAINNET_SENDS && row === 'prove' && col === 'main'
    ? 'm.live.prove.test'
    : AGREEMENTS_LIVE && row === 'lic' && col === 'main'
      ? // "Yes" only once royalties have worked on veilcore.org. After that, a mainnet build says
        // "Yes" only with licenses on (veilcore.org's own build); the test site and the demo say
        // it too, since it is a fact about veilcore.org, not about the build.
        !ROYALTIES_RUN_ON_MAINNET
        ? 'm.live.lic.mainNext'
        : LICENSES_ON_SITE || !IS_MAINNET
          ? 'm.live.lic.live'
          : 'm.live.lic.next'
      : // The test site: licenses are there; royalties say "Yes" only once v2 has run there.
        row === 'lic' && col === 'test' && !ROYALTIES_RUN_ON_TEST
        ? 'm.live.lic.testNext'
        : CLAIMS_ON_SITE && row === 'claims' && col !== 'not'
          ? 'm.live.claims.live'
          : // Lab signing: "Yes" on veilcore.org only once it has worked there, on every build.
            LAB_SIGNING_RUN_ON_MAINNET && row === 'signed' && col === 'main'
            ? 'm.live.signed.live'
            : // Kept on this device only: "Yes" on veilcore.org only once it has worked there.
              DEVICE_ONLY_RUN_ON_MAINNET && row === 'local' && col === 'main'
              ? 'm.live.local.live'
              : // A production chain, and a number proved from a device-only document: the same rule.
                DOCUMENT_CHAIN_RUN_ON_MAINNET && row === 'docchain' && col === 'main'
                ? 'm.live.docchain.live'
                : DEVICE_ONLY_CLAIMS_RUN_ON_MAINNET && row === 'localclaims' && col === 'main'
                  ? 'm.live.localclaims.live'
                  : `m.live.${row}.${col}`) as Parameters<ReturnType<typeof useI18n>['t']>[0];

const LiveWhere: React.FC = () => {
  const { t } = useI18n();
  const { hash } = useLocation();
  const rows = liveRows();
  // The "Not yet" column is there only while some feature has a cell in it: an empty column
  // of dashes says nothing.
  const showNot = rows.some((r) => r[3]);
  const cols = (
    [
      ['main', 'chip live', t('m.live.colMain')],
      ['test', 'chip', t('m.live.colTest')],
      ['not', 'chip', t('m.live.colNot')],
    ] as const
  ).filter(([col]) => col !== 'not' || showNot);
  const table = (
    <table className="live-table">
      <thead>
        <tr>
          <th scope="col">
            <span style={SR_ONLY}>{t('m.live.feature')}</span>
          </th>
          <th scope="col">{t('m.live.colMain')}</th>
          <th scope="col">
            {/* On the test site itself, a link to itself reads oddly. No launch date beside it: a date like that goes stale. */}
            {IS_TEST_SITE ? (
              t('m.live.colTestHere')
            ) : (
              <a href={TEST_SITE_URL} rel="noopener noreferrer" target="_blank">
                {t('m.live.colTest')}
              </a>
            )}
          </th>
          {showNot && <th scope="col">{t('m.live.colNot')}</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map(([row, ...has]) => (
          <tr key={row}>
            <th scope="row">{t(`m.live.${row}.t`)}</th>
            {cols.map(([col, chip, name], i) =>
              has[i] ? (
                <td key={col}>
                  <span className={chip}>{name}</span> {t(cellKey(row, col))}
                </td>
              ) : (
                <td key={col} className="no">
                  <span aria-hidden="true">—</span>
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
  // Folded on every screen size (the page is short); opened when arrived at by /#live, the
  // footer's "What's live where" and Help's answer for labs.
  return (
    <div className="k-live" id="live">
      <h3 className="k-h3">
        <Two a={t('m.live.title1')} b={t('m.live.title2')} />
      </h3>
      <p className="k-sub">{t('m.live.lede')}</p>
      <details className="older-posts live-fold" open={hash === '#live' || undefined}>
        <summary>{t('m.live.show')}</summary>
        {table}
      </details>
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

/** A pipe-separated list from the translations ("Breeders|Seed companies|…"). */
const items = (s: string) => s.split('|').filter(Boolean);

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Things that fade up as they come into view (Mako's reveals): an IntersectionObserver adds
 * .in once, so nothing is tied to the page's scroll and nothing holds it. Without the observer,
 * or with reduced motion, everything is simply shown.
 */
const useReveals = (root: React.RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const all = [...el.querySelectorAll<HTMLElement>('[data-reveal]')];
    if (reduced() || typeof IntersectionObserver === 'undefined') {
      all.forEach((n) => n.classList.add('in'));
      return;
    }
    el.classList.add('k-js');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );
    all.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [root]);
};

/**
 * A band of names that runs sideways (Mako's marquee). It moves by CSS alone; it stops while off
 * screen, under the pointer, and when its button is pressed, and stands still with reduced
 * motion. Screen readers get the names once, as a sentence.
 */
const Marquee: React.FC<{ label: string; list: string }> = ({ label, list }) => {
  const { t, lang } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [away, setAway] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setAway(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const names = items(list);
  const run = [...names, ...names];
  return (
    <div className={`k-marquee${paused || away ? ' is-paused' : ''}`} role="region" aria-label={label} ref={box}>
      <p className="k-sr">{names.join(lang === 'ja' ? '、' : ', ')}</p>
      <div className="k-marquee-track" aria-hidden="true">
        {[0, 1].map((r) => (
          <div className="k-marquee-run" key={r}>
            {run.map((n, i) => (
              <span key={i} className={i % 2 ? 'o' : undefined}>
                {n}
                <i />
              </span>
            ))}
          </div>
        ))}
      </div>
      <button
        type="button"
        className="k-mq-btn"
        onClick={() => setPaused(!paused)}
        aria-label={paused ? t('m.home.play') : t('m.home.pause')}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          {paused ? <path d="M8 5v14l11-7z" /> : <path d="M8 5h3v14H8zM13 5h3v14h-3z" />}
        </svg>
      </button>
    </div>
  );
};

type PhotoName = 'cutting' | 'greenhouse' | 'lab' | 'hand' | 'cattle';

/** A 3:2 photo, 800 or 1600 wide by the space it has (public/media/home). */
const Photo: React.FC<{ name: PhotoName; alt: string; sizes: string }> = ({ name, alt, sizes }) => (
  <img
    src={`/media/home/${name}-800.webp`}
    srcSet={`/media/home/${name}-800.webp 800w, /media/home/${name}.webp ${name === 'greenhouse' ? 1280 : 1600}w`}
    sizes={sizes}
    alt={alt}
    width={1600}
    height={1067}
    loading="lazy"
    decoding="async"
  />
);

/** Who took the photos (public/media/home/CREDITS.md). Names are not translated. */
const PHOTO_CREDITS: readonly [string, string][] = [
  ['Henry Lai', 'https://unsplash.com/photos/a-glass-jar-with-a-plant-inside-of-it-cPBPHCAPQnI'],
  ['Pranav Gavali', 'https://unsplash.com/photos/a-young-green-seedling-growing-from-dark-soil-4KnaYSLHnAI'],
  ['Abigail Lynn', 'https://unsplash.com/photos/greenhouse-interior-9y8c_YDUrYA'],
  ['Adam Bezer', 'https://unsplash.com/photos/a-laboratory-table-is-filled-with-tools-k6HAXK61FWw'],
  ['Nikola Jovanovic', 'https://unsplash.com/photos/woman-holding-green-leafed-seedling-OBok3F8buKY'],
  ['Brianna Sanders', 'https://unsplash.com/photos/cows-in-a-field-at-sunset-g82y7lmqS2U'],
];

type Slide = { key: string; photo: PhotoName; alt: string; title: string; body: React.ReactNode };

/**
 * Where it matters (Mako's gallery, unpinned): a row of panels that scrolls sideways and snaps,
 * with momentum on a phone. The buttons step one panel; the arrow keys work on the focused row.
 * The counter follows the panel in view, from an IntersectionObserver on the row (no scroll
 * listener). The page's own scroll never stops here: the wheel moves the page.
 */
const Gallery: React.FC<{ labelledBy: string; slides: Slide[]; heading: React.ReactNode }> = ({
  labelledBy,
  slides,
  heading,
}) => {
  const { t } = useI18n();
  const track = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  useEffect(() => {
    const el = track.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const panels = [...el.children];
    const ratios = new Map<Element, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set(e.target, e.intersectionRatio);
        let best = 0;
        let bestRatio = -1;
        panels.forEach((p, i) => {
          const r = ratios.get(p) ?? 0;
          if (r > bestRatio + 0.01) {
            best = i;
            bestRatio = r;
          }
        });
        setCurrent(best);
        setAtStart((ratios.get(panels[0]) ?? 0) > 0.95);
        setAtEnd((ratios.get(panels[panels.length - 1]) ?? 0) > 0.95);
      },
      { root: el, threshold: [0, 0.25, 0.5, 0.75, 0.96, 1] },
    );
    panels.forEach((p) => io.observe(p));
    return () => io.disconnect();
  }, []);
  const go = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const panel = el.children[0] as HTMLElement | undefined;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const step = panel ? panel.getBoundingClientRect().width + gap : el.clientWidth;
    el.scrollBy({ left: dir * step, behavior: reduced() ? 'auto' : 'smooth' });
  };
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <>
      <div className="k-hgal-head k-wrap">
        {heading}
        <div className="k-hgal-side">
          <p className="k-lbl k-count" aria-hidden="true">
            {pad(current + 1)} / {pad(slides.length)}
          </p>
          <button
            type="button"
            className="k-arrow"
            onClick={() => go(-1)}
            disabled={atStart}
            aria-label={t('m.home.prev')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            className="k-arrow"
            onClick={() => go(1)}
            disabled={atEnd}
            aria-label={t('m.home.next')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
      <ul className="k-hgal-track" ref={track} tabIndex={0} aria-labelledby={labelledBy}>
        {slides.map((s, i) => (
          <li className={`k-hpanel${i === current ? ' is-near' : ''}`} key={s.key}>
            <div className="k-hpanel-img">
              <Photo name={s.photo} alt={s.alt} sizes="(max-width: 1080px) 84vw, 680px" />
            </div>
            <div className="k-hpanel-copy">
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="k-hgal-bar k-wrap" aria-hidden="true">
        <i style={{ '--p': slides.length > 1 ? current / (slides.length - 1) : 1 } as React.CSSProperties} />
      </div>
    </>
  );
};

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

/** Sixteen sealed values, drawn as bars: their heights are made up, for the picture only. */
const BARS = [62, 48, 81, 35, 70, 92, 55, 40, 77, 97, 44, 66, 58, 85, 38, 73];
const BARS_B = [62, 48, 52, 35, 70, 92, 55, 61, 77, 97, 44, 66, 30, 85, 38, 73];
const MODES = ['1', '2', '3', '4', '5'] as const;
type Mode = (typeof MODES)[number];

/** Share proof, not data: one kind of claim at a time, its picture beside it. */
const Claims: React.FC = () => {
  const { t, sp } = useI18n();
  const [mode, setMode] = useState<Mode>('1');
  const cls = (i: number, row: 'a' | 'b') => {
    if (mode === '1') return i === 5 ? 'on' : '';
    if (mode === '2') return i === 9 ? 'pass' : '';
    if (mode === '3') return BARS[i] !== BARS_B[i] ? 'on' : row === 'a' ? '' : 'same';
    if (mode === '4') return i === 4 ? 'fix' : 'same';
    return 'sig';
  };
  const row = (values: number[], r: 'a' | 'b') => (
    <div className={`k-cal-row${r === 'b' ? ' k-cal-row-b' : ''}`}>
      {values.map((h, i) => (
        <span key={i} className={`k-v ${cls(i, r)}`} style={{ '--h': `${h}%` } as React.CSSProperties}>
          <i />
        </span>
      ))}
    </div>
  );
  return (
    <>
      <div className="k-wrap k-claims">
        <div>
          <h2 id="claims-h" className="k-h2" data-reveal="">
            <Two a={t('m.claims.title1')} b={t('m.claims.title2')} />
          </h2>
          <p className="k-lead" data-reveal="" style={{ '--d': 1 } as React.CSSProperties}>
            {t('m.claims.lede')}
          </p>
          <div className="k-claim-list" role="group" aria-label={t('m.claims.label')}>
            {MODES.map((n) => (
              <button key={n} type="button" className="k-claim" aria-pressed={mode === n} onClick={() => setMode(n)}>
                {t(`m.claims.${n}t`)}
              </button>
            ))}
          </div>
        </div>
        <figure className="k-cal" data-mode={mode}>
          <div className="k-cal-rows" aria-hidden="true">
            {row(BARS, 'a')}
            {row(BARS_B, 'b')}
            <div className="k-bar-line">
              <span>95%</span>
            </div>
          </div>
          <figcaption aria-live="polite">{t(`m.claims.${mode}p`)}</figcaption>
        </figure>
      </div>
      <div className="k-wrap">
        <p className="k-fine k-claims-fine">
          <b>{t('m.claims.limitsTitle')}</b>
          {sp}
          {t('m.claims.limits')}
          {sp}
          <RouterLink to="/docs/spec">{arrowed(t('m.claims.link'))}</RouterLink>
        </p>
      </div>
    </>
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

const Arrow: React.FC = () => (
  <span className="k-arr k-gl" aria-hidden="true">
    →
  </span>
);

export const Home: React.FC = () => {
  const { t, lang, sp } = useI18n();
  const { hash } = useLocation();
  const [showVideo, setShowVideo] = useState(false);
  const [returning] = useState(hasRecordsHere);
  const [hex, setHex] = useState('');
  const phone = usePhone();
  const root = useRef<HTMLDivElement>(null);
  useReveals(root);

  // Arriving from another page at /#section: the router does not scroll to it.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  const post = (
    k: 'postG' | 'postF' | 'postE' | 'postD' | 'postC' | 'postB' | 'postA' | 'post0' | 'post1' | 'post2',
    doc: string,
    iso: string,
  ) => (
    <Post
      key={k}
      href={`${APP_REPO}/blob/main/docs/${doc}`}
      iso={iso}
      date={t(`m.${k}.date`)}
      tag={t(`m.${k}.tag`)}
      title={t(`m.${k}.title`)}
      text={t(`m.${k}.text`)}
      go={t('m.updates.read')}
    />
  );
  const latest = [
    post('postG', 'document-chain.md', '2026-11-16'),
    post('postF', 'device-only-records.md', '2026-11-16'),
  ];
  const third = post('postE', 'evidence-bundle.md', '2026-11-02');
  const older = [
    post('postD', 'document-profile.md', '2026-10-31'),
    post('postC', 'mainnet-sponsor.md', '2026-10-19'),
    post('postB', 'mainnet-completeness.md', '2026-10-11'),
    post('postA', 'deployment-record-revision-4.md', '2026-10-08'),
    post('post0', 'log/preprod-run-4oct.md', '2026-10-04'),
    post('post1', 'log/self-audit-3oct.md', '2026-10-03'),
    post('post2', 'log/preprod-run-2oct.md', '2026-10-02'),
  ];

  const slides: Slide[] = [
    { key: '1', photo: 'cutting', alt: t('m.home.alt.cutting'), title: t('m.for.1t'), body: t('m.for.1p') },
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
    { key: '6', photo: 'hand', alt: t('m.home.alt.hand'), title: t('m.for.6t'), body: t('m.for.6p') },
    {
      key: '5',
      photo: 'cattle',
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

  const features: [string, string][] = [
    [t('m.home.f1t'), t('m.home.f1p')],
    [t('m.home.f2t'), t('m.home.f2p')],
    [t('m.get.2a'), t('m.get.2b')],
    [t('m.for.4t'), t('m.for.4p')],
    [t('m.get.3a'), t('m.get.3b')],
    ...(ASK_ON_SITE ? [[t('m.home.ask.t'), t('m.home.ask.p')] as [string, string]] : []),
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
                <a className="k-link-quiet" href="#how">
                  {t('m.hero.how')}
                </a>
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
              <p className="k-fine k-status-line">{t('m.hero.status')}</p>
            </div>
            <EventDisplay hex={hex} />
          </div>
          <div className="k-wrap">
            <Fingerprint key={lang} onHash={setHex} />
          </div>
        </header>

        <Marquee label={t('m.home.audLabel')} list={t('m.home.audience')} />

        <section className="k-photo" id="keep" aria-labelledby="keep-h">
          <div className="k-photo-frame">
            <picture>
              <source media="(max-width: 760px)" srcSet="/media/home/jar-800.webp" width={533} height={800} />
              <img
                src="/media/home/jar-wide-960.webp"
                srcSet="/media/home/jar-wide-960.webp 960w, /media/home/jar-wide.webp 1600w"
                sizes="100vw"
                width={1600}
                height={1000}
                alt={t('m.home.alt.jar')}
                loading="lazy"
                decoding="async"
              />
            </picture>
          </div>
          <div className="k-photo-copy k-wrap">
            <h2 id="keep-h" className="k-giant" data-reveal="">
              {t('m.home.keep.t')}
            </h2>
            <p className="k-lead" data-reveal="" style={{ '--d': 1 } as React.CSSProperties}>
              {t('m.home.keep.p')}
            </p>
          </div>
        </section>

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

        <section className="k-sec" id="demo" aria-labelledby="demo-h">
          <div className="k-wrap">
            <h2 id="demo-h" className="k-h2" data-reveal="">
              <Two a={t('m.demo.title1')} b={t('m.demo.title2')} />
            </h2>
            <p className="k-lead" data-reveal="" style={{ '--d': 1 } as React.CSSProperties}>
              {t('m.demo.lede')}
              {sp}
              <RouterLink to="/privacy">{arrowed(t('m.demo.privacy'))}</RouterLink>
            </p>
            <div className="k-grid4 k-ways">
              <RouterLink className="k-way" to="/new">
                <h3>{t('m.demo.create.title')}</h3>
                <p>{t('m.demo.create.text')}</p>
                <span className="k-chips">
                  <span className="k-chip live">{t('m.chip.interactive')}</span>
                  <span className="k-chip">{t('m.chip.3min')}</span>
                </span>
              </RouterLink>
              <RouterLink className="k-way" to="/verify">
                <h3>{t('m.demo.verify.title')}</h3>
                <p>{t('m.demo.verify.text')}</p>
                <span className="k-chips">
                  <span className="k-chip live">{t('m.chip.interactive')}</span>
                  <span className="k-chip">{t('m.chip.1min')}</span>
                </span>
              </RouterLink>
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
            <ul className="k-status">
              <li>
                <i className="k-m k-m-on" />
                <b>{t('m.stat2.b')}</b>
                {sp}
                {t('m.stat2.s')}
              </li>
              <li>
                <i className="k-m k-m-off" />
                <b>{t('m.stat3.b')}</b>
                {sp}
                {t('m.stat3.s')}
                {sp}
                {/* Where the reviews really are: the public repository's audit pack, section 8. */}
                <a href={REVIEWS_URL} rel="noopener noreferrer" target="_blank">
                  {arrowed(t('m.stat3.link'))}
                </a>
              </li>
              <li>
                <i className="k-m k-m-on" />
                <b>{t('m.stat4.b')}</b>
                {sp}
                {t('m.stat4.s')}
              </li>
            </ul>
            <LiveWhere />
          </div>
        </section>

        <Marquee label={t('m.home.trustLabel')} list={t('m.home.trust')} />

        <section className="k-sec" id="updates" aria-labelledby="updates-h">
          <div className="k-wrap">
            <h2 id="updates-h" className="k-h2" data-reveal="">
              <Two a={t('m.updates.title1')} b={t('m.updates.title2')} />
            </h2>
            {phone ? (
              <div className="posts">
                {latest}
                <FoldGroup label={t('m.updates.more')}>
                  {third}
                  {older}
                </FoldGroup>
              </div>
            ) : (
              <>
                <div className="posts">
                  {latest}
                  {third}
                </div>
                <details className="older-posts">
                  <summary>{t('m.updates.older')}</summary>
                  <div className="posts">{older}</div>
                </details>
              </>
            )}
            <div className="subscribe">
              <a className="more" href={`${SDK_REPO}/commits/main`} rel="noopener noreferrer" target="_blank">
                {arrowed(t('m.updates.all'))}
              </a>
              <span>
                {t('m.updates.follow')}{' '}
                <a className="x-link" href={X_HANDLE} rel="noopener noreferrer" target="_blank">
                  @VeilCoreProof
                </a>
              </span>
            </div>
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

        <section className="k-sec" id="contact" aria-labelledby="contact-h">
          <div className="k-wrap">
            <h2 id="contact-h" className="k-h2" data-reveal="">
              <Two a={t('m.contact.title1')} b={t('m.contact.title2')} />
            </h2>
            <dl className="audiences">
              <div>
                <dt>{t('m.contact.1t')}</dt>
                <dd>
                  <p>{t('m.contact.1p')}</p>
                  <a className="k-btn k-btn-primary" href={FOUNDERS_MAIL}>
                    {t('m.contact.email')}
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
            <div
              className="team-row"
              id="team"
              role="group"
              aria-label={`${t('m.team.title1')}${sp}${t('m.team.title2')}`}
            >
              <div className="team">
                {(
                  [
                    ['Mako Steiner', 'MS', '/team/mako.jpg', 'm.mako.role', 'm.mako.short'],
                    ['Hunter Roberts', 'HR', '/team/hunter.jpg', 'm.hunter.role', 'm.hunter.short'],
                  ] as const
                ).map(([name, initials, photo, role, short]) => (
                  <RouterLink className="person" to="/founders" key={name}>
                    <Avatar initials={initials} photo={photo} />
                    <span>
                      <h3>{name}</h3>
                      <RoleLine className="role" text={t(role)} />
                      <p>{t(short)}</p>
                    </span>
                  </RouterLink>
                ))}
              </div>
              <RouterLink className="more" to="/founders">
                {arrowed(t('m.team.more'))}
              </RouterLink>
            </div>
          </div>
        </section>

        <section className="k-screen k-drench k-close" aria-labelledby="close-h">
          <div className="k-wrap">
            <h2 id="close-h" className="k-giant" data-reveal="">
              {t('m.home.fails')}
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
          </div>
        </section>

        {/* The photos are free under the Unsplash License, which asks for no credit; we give it. */}
        <p className="k-wrap k-credit">
          {t('m.home.photos')}
          {sp}
          {PHOTO_CREDITS.map(([name, url], i) => (
            <React.Fragment key={name}>
              {i > 0 && (lang === 'ja' ? '、' : ', ')}
              <a href={url} rel="noopener noreferrer" target="_blank">
                {name}
              </a>
            </React.Fragment>
          ))}
        </p>
      </div>
    </SiteShell>
  );
};
