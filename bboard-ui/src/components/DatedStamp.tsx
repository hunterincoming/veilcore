// The DATED stamp: a round pollen-gold stamp pressed onto a record's specimen sheet once the
// record has its date (PlantStatus, the check page, the certificate). It is the app's one
// moment of motion: the first time this browser sees a record dated, or when the date
// arrives while the page is open, the stamp comes down with a short thunk (a quarter of a
// second, scale and turn, then still). With reduced motion it is simply there.
//
// Three states, never confused: `dated` (gold, the real thing), `practice` (a date on a test
// network: no gold, an ink ring drawn dashed, the word PRACTICE), and `waiting` (the dashed
// outline of where the stamp will go, in pencil). The stamp is a picture of a fact the row
// beside it already says in words, so it is hidden from screen readers.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { DISPLAY_FONT, INK_COLOR, LINE_COLOR, MUTED_COLOR, POLLEN, REDUCED_MOTION, SHEET } from '../config/theme';

export type StampState = 'dated' | 'practice' | 'waiting';

const press = keyframes`
  0%   { transform: scale(1.45) rotate(-16deg); opacity: 0; }
  55%  { transform: scale(0.93) rotate(-7deg);  opacity: 1; }
  78%  { transform: scale(1.03) rotate(-8.5deg); }
  100% { transform: scale(1)    rotate(-8deg); }
`;

/** Records whose stamp this browser has already pressed (a per-viewer nicety only). */
const SEEN_KEY = 'veilcore.stamp-pressed.v1';
const seen = (): string[] => {
  try {
    const v = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? '[]') as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};
const markSeen = (id: string) => {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen().filter((x) => x !== id), id].slice(-200)));
  } catch {
    /* storage unavailable: the stamp simply presses again next time */
  }
};

export const DatedStamp: React.FC<{
  state: StampState;
  /** The top word: "Dated", "Practice", "Not dated yet" (the caller's language). */
  word: string;
  /** The date, short: "17 Oct 2026". */
  date?: string;
  /** Which record: the stamp presses the first time this browser sees it dated. */
  pressKey?: string;
  size?: number | { xs: number; sm: number };
  sx?: object;
}> = ({ state, word, date, pressKey, size = 96, sx }) => {
  const was = useRef(state);
  const [pressing, setPressing] = useState(false);
  useEffect(() => {
    if (state === 'waiting' || REDUCED_MOTION) {
      was.current = state;
      return;
    }
    const arrived = was.current === 'waiting' || was.current === state;
    was.current = state;
    const first = pressKey ? !seen().includes(pressKey) : false;
    if (arrived && (first || !pressKey)) setPressing(true);
    if (pressKey) markSeen(pressKey);
  }, [state, pressKey]);

  const dated = state === 'dated';
  const waiting = state === 'waiting';
  const ink = waiting ? MUTED_COLOR : INK_COLOR;
  const px = (n: number) =>
    typeof size === 'number' ? n * (size / 96) : { xs: n * (size.xs / 96), sm: n * (size.sm / 96) };
  return (
    <Box
      aria-hidden="true"
      data-stamp={state}
      sx={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: '50%',
        display: 'grid',
        placeContent: 'center',
        justifyItems: 'center',
        textAlign: 'center',
        color: ink,
        background: dated
          ? `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.28), transparent 46%), ${POLLEN}`
          : waiting
            ? 'transparent'
            : SHEET,
        // A stamp's two rings: an outer edge and an inner ring a few points in.
        border: dated ? 0 : `2px dashed ${waiting ? LINE_COLOR : INK_COLOR}`,
        boxShadow: dated
          ? `inset 0 0 0 2px ${INK_COLOR}, inset 0 0 0 5px ${POLLEN}, inset 0 0 0 6.5px ${INK_COLOR}`
          : 'none',
        transform: 'rotate(-8deg)',
        animation: pressing ? `${press} 280ms cubic-bezier(.2,.8,.25,1) both` : 'none',
        userSelect: 'none',
        ...sx,
      }}
      onAnimationEnd={() => setPressing(false)}
    >
      <Box
        component="span"
        sx={{
          fontSize: px(waiting ? 11.5 : 12),
          fontWeight: 800,
          letterSpacing: waiting ? '0.02em' : '0.14em',
          textTransform: waiting ? 'none' : 'uppercase',
          lineHeight: 1.1,
          maxWidth: px(74),
        }}
      >
        {word}
      </Box>
      {date && (
        <Box
          component="span"
          sx={{
            fontFamily: DISPLAY_FONT,
            fontWeight: 700,
            fontSize: px(17),
            lineHeight: 1.05,
            mt: 0.25,
            maxWidth: px(76),
            ':lang(ja) &': { fontFamily: 'inherit' },
          }}
        >
          {date}
        </Box>
      )}
    </Box>
  );
};
