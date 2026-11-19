// The first screen of VeilCore opened from an iPhone Home Screen with nothing in it (home-screen.ts
// says when): nothing is lost, the records are in the other storage, here is how to bring them in.
// Calm, and not a dead end: someone new to VeilCore can start without records.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { SiteShell } from './SiteShell';
import { hasRecordsHere } from './returning';
import { HOME_SCREEN_DISMISSED, isIosHomeScreenApp, showHomeScreenStart } from './home-screen';

const dismissedThisLaunch = (): boolean => {
  try {
    return sessionStorage.getItem(HOME_SCREEN_DISMISSED) === '1';
  } catch {
    return false;
  }
};

/** The screen itself, or the page asked for when it isn't needed. */
export const HomeScreenStart: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(dismissedThisLaunch);
  const show = showHomeScreenStart({
    standalone: isIosHomeScreenApp(),
    hasRecords: hasRecordsHere(),
    pathname,
    dismissed,
  });
  if (!show) return <>{children}</>;
  const startFresh = () => {
    try {
      sessionStorage.setItem(HOME_SCREEN_DISMISSED, '1');
    } catch {
      // Storage blocked: this launch still goes on without records.
    }
    setDismissed(true);
  };
  return (
    <SiteShell>
      <header className="wrap page" data-home-screen-start="">
        <h1>{t('m.homescreen.title')}</h1>
        <p>{t('m.homescreen.text')}</p>
        <p>{t('m.homescreen.lost')}</p>
        <div className="contact">
          <RouterLink className="btn solid" to="/restore">
            {t('m.homescreen.restore')}
          </RouterLink>
          <button type="button" className="btn" onClick={startFresh}>
            {t('m.homescreen.fresh')}
          </button>
        </div>
        <p className="verify-what">{t('m.homescreen.safari')}</p>
      </header>
    </SiteShell>
  );
};
