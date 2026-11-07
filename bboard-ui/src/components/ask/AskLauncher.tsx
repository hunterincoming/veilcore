// The "Ask" button on the record app's pages (App.tsx AppLayout, through app-layout-parts.ts).
// Never on the landing page or the public pages. The sheet itself (AskSheet.tsx) is its own
// file, fetched the first time the button is pressed.
// SPDX-License-Identifier: Apache-2.0

import React, { Suspense, lazy, useState } from 'react';
import { Box, Fab } from '@mui/material';
import ChatIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import { useT } from '../../i18n/app';

const AskSheet = lazy(() => import('./AskSheet'));

export const AskLauncher: React.FC = () => {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [wanted, setWanted] = useState(false);
  return (
    <>
      {/* Room at the end of the page, so the button never covers its last line. */}
      <Box aria-hidden="true" sx={{ height: 72 }} />
      <Fab
        variant="extended"
        color="primary"
        size="medium"
        onClick={() => {
          setWanted(true);
          setOpen(true);
        }}
        aria-haspopup="dialog"
        data-ask-open=""
        sx={{ position: 'fixed', right: 16, bottom: 16, zIndex: (th) => th.zIndex.speedDial }}
      >
        <ChatIcon sx={{ mr: 1 }} aria-hidden="true" />
        {t('app.ask.button')}
      </Fab>
      {wanted && (
        <Suspense fallback={null}>
          <AskSheet open={open} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
};
