// "Share proof, not data": one kind of claim at a time, its picture beside it (Mako's Claims).
// On the home page (#claims) and on How it works. Moved here from Home.tsx unchanged.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { Two, arrowed } from './night-parts';

/** Sixteen sealed values, drawn as bars: their heights are made up, for the picture only. */
const BARS = [62, 48, 81, 35, 70, 92, 55, 40, 77, 97, 44, 66, 58, 85, 38, 73];
const BARS_B = [62, 48, 52, 35, 70, 92, 55, 61, 77, 97, 44, 66, 30, 85, 38, 73];
const MODES = ['1', '2', '3', '4', '5'] as const;
type Mode = (typeof MODES)[number];

/** Share proof, not data: one kind of claim at a time, its picture beside it. */
export const Claims: React.FC = () => {
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
