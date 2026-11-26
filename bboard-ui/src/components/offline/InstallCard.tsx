// "Use VeilCore with no signal" (docs/offline.md): how to put VeilCore on the Home Screen, worded
// so nobody is surprised after.
//
//   - Where the browser offers to install (Chrome, Edge, Samsung Internet), one button asks it.
//   - On iPhone and iPad there is no such offer: the steps in Safari. And the two things people
//     trip on there, said before they do it: the Home Screen app has its own storage, apart from
//     Safari, so it opens empty and the records come back with Face ID or the backup file (and
//     anything still waiting to send in Safari should go first); and on the Home Screen VeilCore
//     isn't cleared the way Safari clears a site after 7 days without a visit.
//   - Elsewhere (a computer with no install offer), only that this browser keeps a copy and
//     opens with no signal, once the offline worker is in place.
//   - Where the offline download didn't start by itself (a link page first, the browser asking to
//     save data, 2G: offline/register.ts), only "Make VeilCore work offline" with its size
//     (OfflineOffer), within Home's budget. Settings offers it too, so "Not now" hides nothing.
// Not shown once VeilCore is opened from the Home Screen, or after "Not now" (kept in this
// browser only). On Home the iPhone steps open from "Show me how" (22 Nov: they were a third of
// Home's words, open by default); they are still read before anyone does it.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { askToInstall, useOfflineState, OFFLINE_ON } from '../../offline/register';
import { OfflineOffer } from './OfflineOffer';
import { thisBrowserClearsAfterSevenDays } from '../flow/webkit-storage';
import { useT } from '../../i18n/app';

const DISMISSED = 'veilcore.install-card.v1';
const dismissedHere = (): boolean => {
  try {
    return localStorage.getItem(DISMISSED) === 'no';
  } catch {
    return false;
  }
};

const isIos = (): boolean => {
  try {
    return (
      /\b(iPhone|iPad|iPod)\b/.test(navigator.userAgent) ||
      (/\bMacintosh\b/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
    );
  } catch {
    return false;
  }
};

export const InstallCard: React.FC = () => {
  const s = useOfflineState();
  const { t } = useT();
  const [gone, setGone] = useState(dismissedHere);
  const [how, setHow] = useState(false);
  if (!OFFLINE_ON || s.installed || gone) return null;
  const ios = isIos();
  const offer = s.held || s.getting;
  // A computer with no install offer and no worker yet, and nothing held back to offer: nothing to say.
  if (!ios && !s.canInstall && !s.ready && !offer) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED, 'no');
    } catch {
      /* this page only */
    }
    setGone(true);
  };
  // The download waited to be asked: the card is that one question, with its size, in place of
  // the Home Screen steps (Home's budget allows no more words or taps; the steps come back once
  // the copy is here). Opening VeilCore from the Home Screen also starts it.
  if (offer)
    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }} data-install-card="offer">
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, mb: 0.5 }}>
          {t('app.install.title')}
        </Typography>
        <OfflineOffer intro={false} />
        <Button onClick={dismiss} sx={{ minHeight: 44 }}>
          {t('app.install.dismiss')}
        </Button>
      </Paper>
    );
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }} data-install-card={ios ? 'ios' : s.canInstall ? 'prompt' : 'ready'}>
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, mb: 0.5 }}>
        {t('app.install.title')}
      </Typography>
      {ios || s.canInstall ? (
        <Typography variant="body2" sx={{ mb: 1 }}>
          {t('app.install.text')}
        </Typography>
      ) : (
        <Typography variant="body2" sx={{ mb: 1 }} data-install-ready="">
          {t('app.install.ready')}
        </Typography>
      )}
      {ios && (
        <Dialog open={how} onClose={() => setHow(false)} aria-labelledby="install-how-title" data-install-how="">
          <DialogTitle id="install-how-title">{t('app.install.title')}</DialogTitle>
          <DialogContent>
            <Box component="ul" sx={{ pl: 2.5, my: 0, '& li': { mb: 0.75 } }}>
              <Typography component="li" variant="body2">
                {t('app.install.iosSteps')}
              </Typography>
              <Typography component="li" variant="body2" data-install-ios-empty="">
                {t('app.install.iosEmpty')}
              </Typography>
              {thisBrowserClearsAfterSevenDays() && (
                <Typography component="li" variant="body2">
                  {t('app.install.iosKeep')}
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setHow(false)} sx={{ minHeight: 44 }}>
              {t('app.install.gotIt')}
            </Button>
          </DialogActions>
        </Dialog>
      )}
      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
        {ios && (
          <Button
            variant="outlined"
            aria-haspopup="dialog"
            onClick={() => setHow(true)}
            sx={{ minHeight: 44 }}
            data-install-show-how=""
          >
            {t('app.install.showHow')}
          </Button>
        )}
        {s.canInstall && (
          <Button variant="contained" onClick={() => void askToInstall()} sx={{ minHeight: 44 }}>
            {t('app.install.button')}
          </Button>
        )}
        <Button onClick={dismiss} sx={{ minHeight: 44 }}>
          {t('app.install.dismiss')}
        </Button>
      </Stack>
    </Paper>
  );
};
