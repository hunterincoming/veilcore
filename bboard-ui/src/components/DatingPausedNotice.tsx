// The notice that dating on Midnight is paused while Midnight upgrades its network. Off unless
// the build turns it on (DATING_PAUSED, config/network.ts). Plain markup, no MUI: the public
// pages show it too, and they do not load MUI for the first view.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { DATING_PAUSED } from '../config/network';
import { useI18n } from '../i18n';

const STYLE: React.CSSProperties = {
  padding: '10px 16px',
  marginBottom: 24,
  border: '1px solid rgba(255,200,80,0.35)',
  borderRadius: 4,
  background: 'rgba(255,200,80,0.06)',
  fontSize: 14,
  lineHeight: 1.5,
};

export const DatingPausedNotice: React.FC<{ readonly on?: boolean }> = ({ on = DATING_PAUSED }) => {
  const { t } = useI18n();
  if (!on) return null;
  return (
    <div role="status" data-dating-paused="" style={STYLE}>
      {t('notice.datingPaused')}
    </div>
  );
};
