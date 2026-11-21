// The parts the night pages share: the home page, How it works and About (Mako's design, 21
// November 2026, his components Updates, Marquee, PhotoScreen and the footer's "Date your first
// record."). Each page's root carries the class "home", the scope of home.css, so all three are
// drawn on the same night ground with the same header.
//
// Nothing here pins the page, holds its scroll or turns it sideways: reveals are two
// IntersectionObservers that add and remove a class, the word-light and the photo's opening
// follow the page from one passive scroll listener (useScrollPieces), the moving band stops off
// screen, under the pointer, on its button and with reduced motion, and photos load lazily with
// their size set.
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
 * Things that fade up as they come into view (Mako's reveals), and the footer's wordmark, whose
 * letters rise (his data-letters). As in his script they replay: a block animates in each time
 * it enters the view, from above or below, and quietly resets once it is fully off screen. Two
 * IntersectionObservers do it, so nothing is tied to the page's scroll and nothing holds it.
 * Without the observer, or with reduced motion, everything is simply shown. Only the look
 * changes: the words stay in the page for screen readers, find-in-page and the keyboard.
 */
export const useReveals = (root: React.RefObject<HTMLElement | null>): void => {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const all = [...el.querySelectorAll<HTMLElement>('[data-reveal],[data-letters]')];
    if (reduced() || typeof IntersectionObserver === 'undefined') {
      all.forEach((n) => n.classList.add('in'));
      return;
    }
    el.classList.add('k-js');
    const show = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) e.target.classList.add('in');
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    );
    const hide = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (!e.isIntersecting) e.target.classList.remove('in');
      },
      { threshold: 0 },
    );
    // A block that has focus is shown at once, wherever it is (a keyboard user tabbing into it):
    // no fade, so focus never lands on faint text.
    const focused = (e: FocusEvent) => {
      const block = (e.target as Element | null)?.closest?.('[data-reveal]');
      if (!block || !el.contains(block) || block.classList.contains('in')) return;
      block.classList.add('k-now', 'in');
      requestAnimationFrame(() => requestAnimationFrame(() => block.classList.remove('k-now')));
    };
    el.addEventListener('focusin', focused);
    all.forEach((n) => {
      show.observe(n);
      hide.observe(n);
    });
    return () => {
      show.disconnect();
      hide.disconnect();
      el.removeEventListener('focusin', focused);
      el.classList.remove('k-js');
      all.forEach((n) => n.classList.remove('in'));
    };
  }, [root]);
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * Mako's scramble: a code settles from random hex, left to right, in 0.9 s. For decoration only
 * (its box is hidden from screen readers); with reduced motion it is left as it is.
 */
export const scramble = (el: HTMLElement | null, target: string): (() => void) => {
  if (!el || reduced()) return () => undefined;
  const hex = '0123456789abcdef';
  const start = performance.now();
  let raf = 0;
  const step = (now: number) => {
    const t = clamp01((now - start) / 900);
    const fixed = Math.floor(easeOut(t) * target.length);
    let s = target.slice(0, fixed);
    for (let i = fixed; i < target.length; i++) s += hex[(Math.random() * 16) | 0];
    el.textContent = s;
    raf = t < 1 ? requestAnimationFrame(step) : 0;
  };
  raf = requestAnimationFrame(step);
  return () => {
    cancelAnimationFrame(raf);
    el.textContent = target;
  };
};

/**
 * How dim a word not yet lit is. Mako's is 0.16; 0.4 keeps every word at 3:1 or more on the
 * night (ink #ECEEF1 on #0B0E14), so the sentence can be read wherever it is on screen.
 */
const DIM = 0.4;

/** A view timeline in CSS (home.css @supports): then the photo and the timeline need no script. */
const cssViewTimeline = (): boolean =>
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('animation-timeline: view()');

/**
 * The scroll-linked pieces of Mako's script that only follow the page, never hold it or turn it
 * sideways: the paragraph whose words light up as it rises (his word-light), and, where the
 * browser has no CSS view timeline, the photo opening from an inset and the timeline filling
 * (home.css draws those itself where it can). One passive scroll listener, read in one
 * animation frame; it writes only opacity and CSS variables for transform and clip-path, and
 * skips what is off screen. With reduced motion everything is shown finished and nothing listens.
 */
export const useScrollPieces = (root: React.RefObject<HTMLElement | null>): void => {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const css = cssViewTimeline();
    const photos = css ? [] : [...el.querySelectorAll<HTMLElement>('.k-photo-frame')];
    const timelines = css ? [] : [...el.querySelectorAll<HTMLElement>('.k-timeline')];
    const lights = [...el.querySelectorAll<HTMLElement>('[data-wordlight]')].map((p) => ({
      p,
      words: [...p.querySelectorAll<HTMLElement>('.w')],
      last: -1,
    }));
    if (!photos.length && !timelines.length && !lights.length) return;
    const finish = () => {
      lights.forEach(({ words }) => words.forEach((w) => (w.style.opacity = '')));
      photos.forEach((f) => ['--ci', '--cr', '--sc'].forEach((v) => f.style.removeProperty(v)));
      timelines.forEach((t) => t.style.removeProperty('--p'));
    };
    if (reduced()) return finish;
    let ticking = false;
    const frame = () => {
      ticking = false;
      const vh = window.innerHeight;
      for (const t of timelines) {
        const r = t.getBoundingClientRect();
        t.style.setProperty('--p', clamp01((vh * 0.9 - r.top) / (vh * 0.6)).toFixed(3));
      }
      for (const f of photos) {
        const r = f.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        const p = clamp01((vh - r.top) / (vh * 0.9));
        f.style.setProperty('--ci', `${((1 - p) * 9).toFixed(2)}%`);
        f.style.setProperty('--cr', `${((1 - p) * 28).toFixed(1)}px`);
        f.style.setProperty('--sc', (1.16 - 0.16 * p).toFixed(4));
      }
      for (const l of lights) {
        const r = l.p.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        const p = clamp01((vh * 0.85 - r.top) / (r.height + vh * 0.35));
        if (p === l.last) continue;
        l.last = p;
        const n = l.words.length;
        l.words.forEach((w, i) => (w.style.opacity = (DIM + (1 - DIM) * clamp01(p * n * 1.15 - i)).toFixed(2)));
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(frame);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    frame();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      finish();
    };
  }, [root]);
};

/**
 * Mako's word-light: a paragraph whose words light up one by one as it rises through the window
 * (useScrollPieces). The words are the text itself, each in a span; only their opacity changes,
 * so screen readers and find-in-page read the sentence as written. Japanese, written without
 * spaces, is cut into words by the browser's own word breaker.
 */
export const WordLight: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const { lang } = useI18n();
  const parts: string[] = (() => {
    const Seg = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
    if (lang === 'ja' && Seg) return [...new Seg(lang, { granularity: 'word' }).segment(text)].map((s) => s.segment);
    return text.split(/(\s+)/);
  })();
  // Screen readers get the sentence whole (one span per word can be read a word at a time).
  return (
    <p className={`k-wordlight${className ? ` ${className}` : ''}`} data-wordlight="">
      <span style={SR_ONLY}>{text}</span>
      <span aria-hidden="true">
        {parts.map((w, i) =>
          /^\s*$/.test(w) ? (
            w
          ) : (
            <span className="w" key={i}>
              {w}
            </span>
          ),
        )}
      </span>
    </p>
  );
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
      {/* The letters rise as the wordmark comes into view (Mako's data-letters, useReveals). */}
      <p className="k-foot-word" aria-hidden="true" data-letters="">
        {[...'VeilCore'].map((ch, i) => (
          <span key={i} className={i === 4 ? 'c' : undefined} style={{ '--i': i } as React.CSSProperties}>
            {ch}
          </span>
        ))}
      </p>
    </div>
  );
};
