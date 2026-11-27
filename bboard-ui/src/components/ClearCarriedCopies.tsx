// "Clear copies from backup files" (review 5 of PR #233): the holder's way out when this browser
// keeps as many backup files' date proofs as it can (veilcore/stamps.ts MAX_SECTIONS), or keeps
// a file's that isn't theirs. It removes only those copies: what VeilCore's server gave this
// browser stays, and the holder's backup files on their own device are never touched. Asks
// first. Shown in the restore page's "full" message, and in the evidence bundle dialog (under
// Technical details) whenever there are copies to clear.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { useT } from '../i18n/app';

export const ClearCarriedCopies: React.FC<{
  /** Show the button even before the count is known (the restore page's "full" message). */
  readonly always?: boolean;
  readonly onCleared?: () => void;
}> = ({ always, onCleared }) => {
  const { t } = useT();
  const [count, setCount] = useState<number | undefined>(undefined);
  const [asking, setAsking] = useState(false);
  const [cleared, setCleared] = useState(false);
  useEffect(() => {
    let live = true;
    void import('../veilcore/stamps').then(
      (m) => live && setCount(m.carriedCount()),
      () => live && setCount(0),
    );
    return () => {
      live = false;
    };
  }, [cleared]);
  if (cleared)
    return (
      <Alert severity="success" variant="outlined" data-carried-cleared="">
        {t('app.carried.cleared')}
      </Alert>
    );
  if (!always && !count) return null;
  const clear = async () => {
    const m = await import('../veilcore/stamps');
    m.clearCarried();
    setAsking(false);
    setCleared(true);
    onCleared?.();
  };
  return (
    <Stack spacing={0.5} data-carried-clear="">
      {!always && (
        <Typography variant="body2" color="text.secondary" data-carried-what="">
          {t('app.carried.what')}
        </Typography>
      )}
      <Button size="small" variant="outlined" onClick={() => setAsking(true)} sx={{ alignSelf: 'flex-start' }}>
        {t('app.carried.clear')}
      </Button>
      <Dialog open={asking} onClose={() => setAsking(false)} aria-labelledby="carried-clear-title">
        <DialogTitle id="carried-clear-title">{t('app.carried.confirmTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{t('app.carried.confirmText')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAsking(false)}>{t('app.common.cancel')}</Button>
          <Button variant="contained" color="warning" onClick={() => void clear()}>
            {t('app.carried.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
