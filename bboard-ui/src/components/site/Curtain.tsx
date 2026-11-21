// Mako's page curtain: on a link from one of the night pages to another (home, How it works,
// Founders), a gold panel wipes up over the old page with the next page's name, the router moves
// on behind it, and it lifts away once the new page is drawn.
//
// Kept to his timing and never slower: the panel takes 0.52 s to cover and the router moves then,
// always; the next page's files are fetched while it covers (as his script loads the next page
// while the curtain rises), and a slow network never holds the curtain up longer. If the visitor
// goes Back meanwhile, the pending move is dropped. A link can opt out with data-no-curtain (one
// that needs the router's own replace or state). Not on the first load, not for a link
// within the same page (#section), not for a link opened in a new tab or with a modifier key,
// and not to or from the app's own pages (making, checking or proving a record): those open at
// once. With reduced motion there is no curtain at all. It is decoration, hidden from screen
// readers; focus moves to the new page's heading as on any navigation (App.tsx NewPageFocus).
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';
import type { StringKey } from '../../i18n/en';
import { reduced } from './night-parts';

/** The night pages, and the name the curtain shows for each (the tab titles' words). */
const NIGHT: Record<string, StringKey | null> = {
  '/': null,
  '/how-it-works': 'title.how',
  '/founders': 'title.founders',
  '/about': 'title.founders',
};
const norm = (p: string) => p.replace(/\/+$/, '') || '/';
const isNight = (p: string) => norm(p) in NIGHT;
/** His timing (app.js, global.css .curtain): 0.52 s to cover, 0.7 s to lift. */
const COVER_MS = 520;
const LIFT_FALLBACK_MS = 1200;

export const Curtain: React.FC<{ preload: (pathname: string) => Promise<unknown> }> = ({ preload }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { pathname, hash, key } = useLocation();
  const box = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const busy = useRef(false);
  const here = useRef(pathname);
  here.current = pathname;
  const at = useRef(key);
  at.current = key;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const a = (e.target as Element | null)?.closest?.('a[href]');
      if (!(a instanceof HTMLAnchorElement)) return;
      // While it covers, a second link (Enter on a link under it) waits for the first move.
      if (busy.current) {
        if (new URL(a.href, window.location.href).origin === window.location.origin) e.preventDefault();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.hasAttribute('data-no-curtain')) return;
      if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (!isNight(here.current) || !isNight(url.pathname)) return;
      if (norm(url.pathname) === norm(here.current)) return;
      const el = box.current;
      if (!el || reduced()) return;
      // Ours from here: the router's own link sees the click handled and leaves it to us.
      e.preventDefault();
      busy.current = true;
      const name = NIGHT[norm(url.pathname)];
      if (label.current) label.current.textContent = name ? t(name) : 'VeilCore';
      el.hidden = false;
      el.classList.remove('is-out');
      void el.offsetWidth;
      el.classList.add('is-in');
      const to = `${url.pathname}${url.search}${url.hash}`;
      const from = at.current;
      void preload(url.pathname).catch(() => undefined);
      window.setTimeout(() => {
        // Back or Forward while it covered: that move stands, and the curtain lifts from it.
        if (at.current === from) void navigate(to);
      }, COVER_MS);
    };
    // Capture: before the router's link handles the click.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [navigate, preload, t]);

  // The next page is drawn: lift the curtain away, then hide it.
  useEffect(() => {
    const el = box.current;
    if (!el || !busy.current) return;
    let timer = 0;
    const done = (ev?: TransitionEvent) => {
      if (ev && (ev.target !== el || ev.propertyName !== 'transform')) return;
      el.removeEventListener('transitionend', done);
      window.clearTimeout(timer);
      el.classList.remove('is-out');
      el.hidden = true;
      busy.current = false;
    };
    const raf = requestAnimationFrame(() => {
      el.classList.add('is-out');
      el.classList.remove('is-in');
      el.addEventListener('transitionend', done);
      timer = window.setTimeout(done, LIFT_FALLBACK_MS);
    });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      el.removeEventListener('transitionend', done);
    };
  }, [pathname, hash, key]);

  return (
    <div className="vc-curtain" ref={box} aria-hidden="true" hidden>
      <span className="vc-curtain-t" ref={label} />
    </div>
  );
};
