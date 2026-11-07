// The "Ask" chat bubble on the record app's pages (App.tsx AppLayout, through
// app-layout-parts.ts), bottom right. Never on the landing page or the public pages. The sheet
// itself (AskSheet.tsx) is its own file, fetched the first time the bubble is pressed.
//
// Once someone has a record, a small hint sits by the bubble with an example that names their
// own record ("Try: cut 6 clones from Gelato", or calves for someone whose records are mostly
// animals). Tapping it opens Ask with the example typed in. It shows on three visits at most,
// and not again once dismissed or once Ask is opened (ask-local/hint-flag.ts: the only thing
// stored). On a touch screen the bubble and hint step aside while a text field on the page has
// focus, so they never sit on the field or its button with the keyboard up.
// SPDX-License-Identifier: Apache-2.0

import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Fab, GlobalStyles, IconButton, Paper, Typography } from '@mui/material';
import ChatIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { useT } from '../../i18n/app';
import { useRecords } from '../../veilcore/records';
import { hintExample } from '../../ask/hint';
import { ANIMAL_RECORDS_ENABLED } from '../../config/network';
import { askSeen, markAskSeen, noteHintShown } from '../../ask-local/hint-flag';

const AskSheet = lazy(() => import('./AskSheet'));

/** The bubble's size and offset: the room left at the bottom of every page that shows it. */
export const BUBBLE_HEIGHT = 48;
export const BUBBLE_OFFSET = 16;
export const BUBBLE_ROOM = BUBBLE_HEIGHT + BUBBLE_OFFSET * 2;

const TYPING = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

/** On a touch screen: whether a text field on the page (not in Ask) has focus. */
const useTypingOnTouch = (): boolean => {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    if (typeof matchMedia === 'undefined' || !matchMedia('(pointer: coarse)').matches) return;
    const check = () => {
      const el = document.activeElement;
      setTyping(!!el && el.matches(TYPING) && !el.closest('[data-ask-sheet]'));
    };
    const later = () => setTimeout(check, 0);
    document.addEventListener('focusin', check);
    document.addEventListener('focusout', later);
    return () => {
      document.removeEventListener('focusin', check);
      document.removeEventListener('focusout', later);
    };
  }, []);
  return typing;
};

export const AskLauncher: React.FC = () => {
  const { t } = useT();
  const records = useRecords();
  const [open, setOpen] = useState(false);
  const [wanted, setWanted] = useState(false);
  const [prefill, setPrefill] = useState<{ text: string; n: number } | undefined>();
  // Seen before this page loaded: no hint, and the sheet opens with what Ask can do folded away.
  const [seenAtLoad] = useState(askSeen);
  const [dismissed, setDismissed] = useState(false);
  const typing = useTypingOnTouch();
  const example = useMemo(() => hintExample(records, ANIMAL_RECORDS_ENABLED), [records]);
  const exampleText = example
    ? t(example.kind === 'calves' ? 'app.ask.example.calves' : 'app.ask.example.clones', { name: example.name })
    : '';
  const hint = !seenAtLoad && !dismissed && !!example;

  // Counted once per visit, the first time the hint shows.
  const [counted, setCounted] = useState(false);
  useEffect(() => {
    if (hint && !counted) {
      setCounted(true);
      noteHintShown();
    }
  }, [hint, counted]);

  // The evaluation build only (scripts/eval-ask.mjs): never in a site build.
  useEffect(() => {
    if (import.meta.env.VITE_ASK_MODEL === 'eval')
      void import('../../ask-local/eval-hook').then((m) => m.installEvalHook());
  }, []);

  const seen = () => {
    setDismissed(true);
    markAskSeen();
  };
  const press = (withExample = false) => {
    seen();
    if (withExample) setPrefill((p) => ({ text: exampleText, n: (p?.n ?? 0) + 1 }));
    setWanted(true);
    setOpen(true);
  };

  return (
    <>
      {/* Room at the end of every page that shows the bubble, so it never covers the last line. */}
      <GlobalStyles styles={{ body: { paddingBottom: BUBBLE_ROOM } }} />
      {hint && !typing && (
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
            pr: 0,
            borderRadius: 3,
            borderBottomRightRadius: 4,
          }}
        >
          <Typography
            variant="body2"
            component="button"
            onClick={() => press(true)}
            data-ask-hint-try=""
            sx={{
              border: 0,
              background: 'none',
              p: 0,
              minHeight: 44,
              textAlign: 'left',
              cursor: 'pointer',
              color: 'inherit',
              font: 'inherit',
            }}
          >
            {t('app.ask.hint.try', { example: exampleText })}
          </Typography>
          <IconButton
            onClick={seen}
            aria-label={t('app.ask.hint.dismiss')}
            data-ask-hint-dismiss=""
            sx={{ width: 44, height: 44 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      )}
      {!typing && (
        <Fab
          variant="extended"
          color="primary"
          onClick={() => press()}
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
      )}
      {wanted && (
        <Suspense fallback={null}>
          <AskSheet open={open} onClose={() => setOpen(false)} firstOpen={!seenAtLoad} prefill={prefill} />
        </Suspense>
      )}
    </>
  );
};
