// A small note when the page is open inside another app's built-in browser (Facebook, Instagram,
// Messenger, Line, WeChat, TikTok, X; veilcore/in-app-browser.ts): records and keys kept there
// live in that app's web view, which the app can clear or watch. It only says so, and closes
// with one tap: nothing is blocked. It sits in the header, outside the page's main part, and
// its close button is a plain icon, never a filled (primary) button.
// Plain markup, no MUI: the public pages show it too, and they don't load MUI for the first view.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { inAppBrowserOf } from '../veilcore/in-app-browser';

const CLOSED = 'veilcore.in-app-notice.closed';

const closedBefore = (): boolean => {
  try {
    return sessionStorage.getItem(CLOSED) === '1';
  } catch {
    return false;
  }
};

const STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 4,
  padding: '2px 2px 2px 12px',
  marginBottom: 16,
  border: '1px solid rgba(255,200,80,0.45)',
  borderRadius: 4,
  background: 'rgba(255,200,80,0.08)',
  fontSize: 14,
  lineHeight: 1.45,
};

const CLOSE: React.CSSProperties = {
  flex: 'none',
  width: 44,
  height: 44,
  border: 0,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontSize: 22,
  lineHeight: 1,
  cursor: 'pointer',
};

/** `ua`: for a test; the browser's own user agent otherwise. */
export const InAppBrowserNotice: React.FC<{ readonly ua?: string }> = ({ ua }) => {
  const { t } = useI18n();
  const [closed, setClosed] = useState(closedBefore);
  const app = inAppBrowserOf(ua ?? (typeof navigator === 'undefined' ? '' : navigator.userAgent));
  if (!app || closed) return null;
  const close = () => {
    setClosed(true);
    try {
      sessionStorage.setItem(CLOSED, '1');
    } catch {
      /* shown again on the next page load */
    }
  };
  return (
    <div role="note" data-in-app-notice={app} style={STYLE}>
      <p style={{ margin: 0, padding: '10px 0', flex: 1, minWidth: 0 }}>{t('notice.inApp')}</p>
      <button type="button" onClick={close} aria-label={t('draft.close')} style={CLOSE}>
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
};
