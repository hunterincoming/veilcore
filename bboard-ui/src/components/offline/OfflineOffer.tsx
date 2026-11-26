// "Make VeilCore work offline": the offline download, offered with its size where it didn't start
// by itself (summit fix 5b.3; offline/register.ts offlineHeldBack): on a page someone was sent a
// link to, when the browser asks to save data, or on 2G. Shown in the install card on Home and in
// Settings, so it can always be found, even after the card's "Not now". Nothing when the download
// started by itself, or the browser already has VeilCore for use with no signal.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Button, Typography } from '@mui/material';
import { getOfflineCopy, megabytes, offlineDownloadBytes, useOfflineState, OFFLINE_ON } from '../../offline/register';
import { useT } from '../../i18n/app';

/** The offer's words and button, or the line that it is downloading; null when there is nothing to offer. */
// Always an outlined button: never a second filled one beside the screen's main action
// (complexity-budget.json, primary 1 on Home).
export const OfflineOffer: React.FC<{ intro?: boolean }> = ({ intro = true }) => {
  const s = useOfflineState();
  const { t } = useT();
  const [size, setSize] = useState<string | null>(null);
  const offering = OFFLINE_ON && s.held && !s.ready;
  useEffect(() => {
    if (!offering || size) return;
    let live = true;
    void offlineDownloadBytes().then((b) => {
      if (live && b) setSize(megabytes(b));
    });
    return () => {
      live = false;
    };
  }, [offering, size]);
  if (OFFLINE_ON && s.getting && !s.ready)
    return (
      <Typography variant="body2" sx={{ mb: 1 }} role="status" data-offline-getting="">
        {t('app.install.getting')}
      </Typography>
    );
  if (!offering) return null;
  return (
    <div data-offline-offer="">
      {intro && (
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          {t('app.install.offer')}
        </Typography>
      )}
      {size && (
        <Typography variant="body2" sx={{ mb: 1 }} data-offline-size="">
          {t('app.install.offerSize', { size })}
        </Typography>
      )}
      <Button variant="outlined" onClick={getOfflineCopy} sx={{ minHeight: 44, mb: 1 }} data-offline-get="">
        {t('app.install.get')}
      </Button>
    </div>
  );
};
