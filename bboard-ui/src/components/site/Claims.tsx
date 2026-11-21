// "Share proof, not data": one kind of claim at a time, its picture beside it (Mako's Claims).
// On the home page (#claims) and on How it works.
//
// The picture moves as Mako's does: sixteen sealed values stand at one height, so nothing about
// them shows; choosing a claim grows the one value it shows to its real height and labels it,
// or marks the bar it clears, while the rest stay level. "Two varieties differ" shows a second
// set, both sealed: which values differ stays private, as the words say. A short count beside
// the words says what is shown and what stays sealed (his status line). Bar heights change by a
// CSS transition, and not at all with reduced motion.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { Two, arrowed } from './night-parts';

/** Sixteen sealed values (Mako's): made up, for the picture only. */
const VALS = [62, 48, 81, 35, 70, 97, 55, 40, 66, 29, 74, 51, 88, 44, 59, 37];
/** The one height every sealed value is drawn at, so a sealed value shows nothing. */
const SEALED = '72%';
const MODES = ['1', '2', '3', '4', '5'] as const;
type Mode = (typeof MODES)[number];
type Cell = { cls: string; label: string; h: string };

/** What each claim shows of the sixteen, as in Mako's script. */
const cellFor = (mode: Mode, i: number, fixed: string): Cell => {
  if (mode === '1') return i === 3 ? { cls: 'on', label: `${VALS[i]}%`, h: `${VALS[i]}%` } : sealed('');
  if (mode === '2') return i === 5 ? { cls: 'pass', label: '≥ 95%', h: '100%' } : sealed('');
  if (mode === '4') return i === 9 ? { cls: 'fix', label: fixed, h: '48%' } : sealed('same');
  if (mode === '5') return sealed('sig');
  return sealed('');
};
const sealed = (cls: string): Cell => ({ cls, label: '', h: SEALED });

/** Share proof, not data: one kind of claim at a time, its picture beside it. */
export const Claims: React.FC = () => {
  const { t, sp } = useI18n();
  const [mode, setMode] = useState<Mode>('1');
  const fixed = t('m.claims.fixed');
  const row = (r: 'a' | 'b') => (
    <div className={`k-cal-row${r === 'b' ? ' k-cal-row-b' : ''}`}>
      {VALS.map((_, i) => {
        const c = r === 'b' ? sealed('') : cellFor(mode, i, fixed);
        return (
          <span key={i} className={`k-v ${c.cls}`} style={{ '--h': c.h } as React.CSSProperties}>
            <em>{c.label}</em>
            <i />
          </span>
        );
      })}
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
          <div
            className="k-claim-list"
            role="group"
            aria-label={t('m.claims.label')}
            data-reveal=""
            style={{ '--d': 2 } as React.CSSProperties}
          >
            {MODES.map((n) => (
              <button key={n} type="button" className="k-claim" aria-pressed={mode === n} onClick={() => setMode(n)}>
                {t(`m.claims.${n}t`)}
              </button>
            ))}
          </div>
        </div>
        <figure className="k-cal" data-mode={mode} data-reveal="" style={{ '--d': 2 } as React.CSSProperties}>
          <div className="k-cal-rows" aria-hidden="true">
            {row('a')}
            {row('b')}
            <div className="k-bar-line">
              <span>95%</span>
            </div>
          </div>
          <figcaption aria-live="polite">
            {/* A count for the picture, which is hidden from screen readers: not read out. */}
            <span className="k-cal-status" aria-hidden="true">
              {t(`m.claims.${mode}s`)}
            </span>
            <span>{t(`m.claims.${mode}p`)}</span>
          </figcaption>
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
