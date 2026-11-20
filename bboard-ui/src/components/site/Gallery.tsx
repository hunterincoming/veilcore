// "Where it matters" (Mako's horizontal gallery), as a plain sideways strip: a row of panels
// that scrolls sideways and snaps, with momentum on a phone, a trackpad's sideways swipe on a
// computer, and two buttons that step one panel. Hunter's direction (18 Nov 2026): no
// scroll-jacking. Mako's draft pinned this section and drove it sideways from the page's
// vertical scroll; here the wheel always moves the page, and nothing listens to the page's scroll.
// The counter follows the panel in view, from an IntersectionObserver on the row. Kept small and
// on its own, so the pinned version could be put back here alone if that is ever decided.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { GALLERY_SIZES, type PhotoName } from './photo-src';
import { Photo, reduced } from './night-parts';

export type Slide = {
  key: string;
  photo: PhotoName;
  alt: string;
  title: string;
  body: React.ReactNode;
  /** Where the photo is centred in its frame (CSS object-position), for a portrait photo. */
  position?: string;
};

/**
 * Where it matters (Mako's gallery, unpinned): a row of panels that scrolls sideways and snaps,
 * with momentum on a phone. The buttons step one panel; the arrow keys work on the focused row.
 * The counter follows the panel in view, from an IntersectionObserver on the row (no scroll
 * listener). The page's own scroll never stops here: the wheel moves the page.
 */
export const Gallery: React.FC<{ labelledBy: string; slides: Slide[]; heading: React.ReactNode }> = ({
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
              <Photo name={s.photo} alt={s.alt} sizes={GALLERY_SIZES} position={s.position} />
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
