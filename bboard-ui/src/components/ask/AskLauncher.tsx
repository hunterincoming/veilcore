// The "Ask" chat bubble on the record app's pages (App.tsx AppLayout, through
// app-layout-parts.ts), bottom right. Never on the landing page or the public pages. The sheet
// itself (AskSheet.tsx) is its own file, fetched the first time the bubble is pressed.
//
// On a first visit a small hint sits by the bubble ("Try: cut 12 clones from Blue Dream", or a
// calves example for someone whose records are mostly animals) until it is dismissed or Ask is
// opened. The only thing stored is that flag (ask-local/hint-flag.ts).
// SPDX-License-Identifier: Apache-2.0

import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Fab, GlobalStyles, IconButton, Paper, Typography } from '@mui/material';
import ChatIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { useT } from '../../i18n/app';
import { useRecords } from '../../veilcore/records';
import { hintForAnimals } from '../../ask/hint';
import { ANIMAL_RECORDS_ENABLED } from '../../config/network';
import { askSeen, markAskSeen } from '../../ask-local/hint-flag';
import { MODEL_FLAG } from '../../ask-local/manifest';

const AskSheet = lazy(() => import('./AskSheet'));

/** The bubble's size and offset: the room left at the bottom of every page that shows it. */
export const BUBBLE_HEIGHT = 48;
export const BUBBLE_OFFSET = 16;
export const BUBBLE_ROOM = BUBBLE_HEIGHT + BUBBLE_OFFSET * 2;

export const AskLauncher: React.FC = () => {
  const { t } = useT();
  const records = useRecords();
  const [open, setOpen] = useState(false);
  const [wanted, setWanted] = useState(false);
  // Seen before this page loaded: no hint, and the sheet opens with what Ask can do folded away.
  const [seenAtLoad] = useState(askSeen);
  const [hint, setHint] = useState(!seenAtLoad);
  const animals = useMemo(() => hintForAnimals(records, ANIMAL_RECORDS_ENABLED), [records]);

  // The evaluation build only (scripts/eval-ask.mjs): never in a site build.
  useEffect(() => {
    if (MODEL_FLAG === 'eval') void import('../../ask-local/eval-hook').then((m) => m.installEvalHook());
  }, []);

  const seen = () => {
    setHint(false);
    markAskSeen();
  };
  const press = () => {
    seen();
    setWanted(true);
    setOpen(true);
  };

  return (
    <>
      {/* Room at the end of every page that shows the bubble, so it never covers the last line. */}
      <GlobalStyles styles={{ body: { paddingBottom: BUBBLE_ROOM } }} />
      {hint && (
        <Paper
          elevation={3}
          role="note"
          data-ask-hint=""
          sx={{
            position: 'fixed',
            right: BUBBLE_OFFSET,
            bottom: BUBBLE_OFFSET + BUBBLE_HEIGHT + 10,
            zIndex: (th) => th.zIndex.speedDial,
            maxWidth: 'min(320px, calc(100vw - 32px))',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            pl: 1.5,
            pr: 0.5,
            py: 0.5,
            borderRadius: 3,
            borderBottomRightRadius: 4,
          }}
        >
          <Typography
            variant="body2"
            component="button"
            onClick={press}
            sx={{
              border: 0,
              background: 'none',
              p: 0,
              textAlign: 'left',
              cursor: 'pointer',
              color: 'inherit',
              font: 'inherit',
            }}
          >
            {t(animals ? 'app.ask.hint.animal' : 'app.ask.hint.plant')}
          </Typography>
          <IconButton size="small" onClick={seen} aria-label={t('app.ask.hint.dismiss')} data-ask-hint-dismiss="">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      )}
      <Fab
        variant="extended"
        color="primary"
        onClick={press}
        aria-haspopup="dialog"
        data-ask-open=""
        sx={{
          position: 'fixed',
          right: BUBBLE_OFFSET,
          bottom: BUBBLE_OFFSET,
          height: BUBBLE_HEIGHT,
          borderRadius: `${BUBBLE_HEIGHT / 2}px ${BUBBLE_HEIGHT / 2}px 6px ${BUBBLE_HEIGHT / 2}px`,
          zIndex: (th) => th.zIndex.speedDial,
        }}
      >
        <ChatIcon sx={{ mr: 1 }} aria-hidden="true" />
        {t('app.ask.button')}
      </Fab>
      {wanted && (
        <Suspense fallback={null}>
          <AskSheet open={open} onClose={() => setOpen(false)} firstOpen={!seenAtLoad} />
        </Suspense>
      )}
    </>
  );
};
