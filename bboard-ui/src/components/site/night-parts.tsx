// The parts the night pages share: the home page, How it works and About (Mako's design, 21
// November 2026, his components Updates, Marquee, PhotoScreen and the footer's "Date your first
// record."). Each page's root carries the class "home", the scope of home.css, so all three are
// drawn on the same night ground with the same header.
//
// Nothing here pins the page or listens to its scroll: reveals are an IntersectionObserver that
// adds a class once, the moving band stops off screen, under the pointer, on its button and with
// reduced motion, and photos load lazily with their size set.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useI18n } from '../../i18n';
import type { StringKey } from '../../i18n/en';
import { FoldGroup, usePhone } from './Fold';
import { SDK_REPO, X_HANDLE } from './SiteShell';
import { PHOTO_SIZE, photoSrc, photoSrcSet, type PhotoName } from './photo-src';

export const APP_REPO = 'https://github.com/hunterincoming/veilcore';

/** Read by screen readers, not shown. */
export const SR_ONLY: React.CSSProperties = {
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
export const arrowed = (s: string): React.ReactNode => {
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
export const Two: React.FC<{ a: string; b: string; hl?: boolean }> = ({ a, b, hl }) => {
  const { sp } = useI18n();
  return (
    <>
      {a}
      {sp}
      <span className={hl ? 'k-hl' : 'k-mute'}>{b}</span>
    </>
  );
};

/** The round arrow on a button. */
export const Arrow: React.FC = () => (
  <span className="k-arr k-gl" aria-hidden="true">
    →
  </span>
);

/** A pipe-separated list from the translations ("Breeders|Seed companies|…"). */
export const items = (s: string): string[] => s.split('|').filter(Boolean);

export const reduced = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Things that fade up as they come into view (Mako's reveals): an IntersectionObserver adds
 * .in once, so nothing is tied to the page's scroll and nothing holds it. Without the observer,
 * or with reduced motion, everything is simply shown.
 */
export const useReveals = (root: React.RefObject<HTMLElement | null>): void => {
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

/** Arriving from another page at #section: the router does not scroll to it. */
export const useHashScroll = (hash: string): void => {
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [hash]);
};

/**
 * A band of names that runs sideways (Mako's marquee). It moves by CSS alone; it stops while off
 * screen, under the pointer, and when its button is pressed, and stands still with reduced
 * motion. Screen readers get the names once, as a sentence.
 */
export const Marquee: React.FC<{ label: string; list: string }> = ({ label, list }) => {
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

/** A photo at its real size, lazy unless asked: 800 wide or Mako's own copy, by the space it has. */
export const Photo: React.FC<{
  name: PhotoName;
  alt: string;
  sizes: string;
  eager?: boolean;
  className?: string;
  position?: string;
}> = ({ name, alt, sizes, eager, className, position }) => (
  <img
    className={className}
    src={photoSrc(name)}
    srcSet={photoSrcSet(name)}
    sizes={sizes}
    alt={alt}
    width={PHOTO_SIZE[name][0]}
    height={PHOTO_SIZE[name][1]}
    loading={eager ? 'eager' : 'lazy'}
    decoding="async"
    style={position ? { objectPosition: position } : undefined}
  />
);

/**
 * A full-screen photo with a giant headline over its lower left (Mako's PhotoScreen). It opens
 * from an inset as it comes into view by a CSS scroll-driven animation (home.css), which follows
 * the page and never holds it; reduced motion shows it open.
 */
export const PhotoScreen: React.FC<{
  id?: string;
  labelledBy: string;
  name: PhotoName;
  alt: string;
  position?: string;
  children: React.ReactNode;
}> = ({ id, labelledBy, name, alt, position, children }) => (
  <section className="k-photo" id={id} aria-labelledby={labelledBy}>
    <div className="k-photo-frame">
      <Photo name={name} alt={alt} sizes="100vw" position={position} />
    </div>
    <div className="k-photo-copy k-wrap">{children}</div>
  </section>
);

/** Who took the photos (public/media/home/CREDITS.md). Names are not translated. */
export const PHOTO_CREDITS: Record<PhotoName, readonly [string, string]> = {
  jar: ['Henry Lai', 'https://unsplash.com/photos/a-glass-jar-with-a-plant-inside-of-it-cPBPHCAPQnI'],
  leaf: ['Mike Hindle', 'https://unsplash.com/photos/dark-textured-leaf-surface-with-prominent-veins-I8rNyiCKX0U'],
  seed: ['Trương Tuyết Ly', 'https://unsplash.com/photos/a-single-plant-seed-on-a-dark-surface-GDA37NJ5nys'],
  cutting: ['Oleksandra Ustynovych', 'https://unsplash.com/photos/a-plant-cutting-in-a-jar-with-sunlight-fBpVUgj1bhE'],
  greenhouse: ['Abigail Lynn', 'https://unsplash.com/photos/greenhouse-interior-9y8c_YDUrYA'],
  lab: ['Adam Bezer', 'https://unsplash.com/photos/a-laboratory-bench-is-full-of-scientific-equipment-oJnENqfM_H0'],
  hand: ['Zoe Richardson', 'https://unsplash.com/photos/green-plant-on-persons-hand-tbiV-yc903g'],
  cattle: ['Annie Spratt', 'https://unsplash.com/photos/photo-of-brown-white-and-black-cows-nkFlmZu9PrE'],
};

/** The photos are free under the Unsplash License, which asks for no credit; we give it, per page. */
export const PhotoCredits: React.FC<{ names: PhotoName[] }> = ({ names }) => {
  const { t, lang, sp } = useI18n();
  const seen = [...new Set(names.map((n) => PHOTO_CREDITS[n][0]))];
  return (
    <p className="k-wrap k-credit">
      {t('m.home.photos')}
      {sp}
      {seen.map((name, i) => {
        const url = Object.values(PHOTO_CREDITS).find(([n]) => n === name)?.[1] ?? '';
        return (
          <React.Fragment key={name}>
            {i > 0 && (lang === 'ja' ? '、' : ', ')}
            <a href={url} rel="noopener noreferrer" target="_blank">
              {name}
            </a>
          </React.Fragment>
        );
      })}
    </p>
  );
};

/**
 * "Latest from the build" (Mako's data/updates.js): newest first. Each entry is a dated post in
 * the translations (m.postX.*) and the document in the public repository it comes from. The
 * first three show; the rest fold under "Older updates".
 */
export const UPDATES: readonly { key: string; doc: string; iso: string }[] = [
  { key: 'postG', doc: 'document-chain.md', iso: '2026-11-16' },
  { key: 'postF', doc: 'device-only-records.md', iso: '2026-11-16' },
  { key: 'postE', doc: 'evidence-bundle.md', iso: '2026-11-02' },
  { key: 'postD', doc: 'document-profile.md', iso: '2026-10-31' },
  { key: 'postC', doc: 'mainnet-sponsor.md', iso: '2026-10-19' },
  { key: 'postB', doc: 'mainnet-completeness.md', iso: '2026-10-11' },
  { key: 'postA', doc: 'deployment-record-revision-4.md', iso: '2026-10-08' },
  { key: 'post0', doc: 'log/preprod-run-4oct.md', iso: '2026-10-04' },
  { key: 'post1', doc: 'log/self-audit-3oct.md', iso: '2026-10-03' },
  { key: 'post2', doc: 'log/preprod-run-2oct.md', iso: '2026-10-02' },
];

/** One update, dated first: the site is about dates, so updates read like a log book. */
const Post: React.FC<{ entry: (typeof UPDATES)[number] }> = ({ entry }) => {
  const { t } = useI18n();
  const k = (part: string) => `m.${entry.key}.${part}` as StringKey;
  return (
    <a className="post" href={`${APP_REPO}/blob/main/docs/${entry.doc}`} rel="noopener noreferrer" target="_blank">
      <span className="when">
        <time dateTime={entry.iso}>{t(k('date'))}</time>
        <span className="tag">{t(k('tag'))}</span>
      </span>
      <div className="what">
        <h3>{t(k('title'))}</h3>
        <p>{t(k('text'))}</p>
        <span className="go">{arrowed(t('m.updates.read'))}</span>
      </div>
    </a>
  );
};

/** Latest from the build: on the home page (#updates) and on About. */
export const Updates: React.FC<{ id?: string }> = ({ id = 'updates' }) => {
  const { t } = useI18n();
  const phone = usePhone();
  const latest = UPDATES.slice(0, 2).map((u) => <Post key={u.key} entry={u} />);
  const third = <Post key={UPDATES[2].key} entry={UPDATES[2]} />;
  const older = UPDATES.slice(3).map((u) => <Post key={u.key} entry={u} />);
  const h = `${id}-h`;
  return (
    <section className="k-sec" id={id} aria-labelledby={h}>
      <div className="k-wrap">
        <h2 id={h} className="k-h2" data-reveal="">
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
  );
};

/**
 * The end of every night page (Mako's footer): one large link to make a record, with a round
 * gold arrow, and the wordmark across the full width, its C in gold. The links themselves are in
 * the site's one footer below (AppFooter.tsx), the same on every page.
 */
export const NightClose: React.FC = () => {
  const { t } = useI18n();
  return (
    <div className="k-foot">
      <div className="k-wrap">
        <RouterLink className="k-foot-cta" to="/new">
          <span className="k-foot-cta-t">{t('m.foot.cta')}</span>
          <span className="k-foot-cta-go" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </RouterLink>
      </div>
      <p className="k-foot-word" aria-hidden="true">
        Veil<span>C</span>ore
      </p>
    </div>
  );
};
