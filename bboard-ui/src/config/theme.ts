// VeilCore's themes. `theme` is a dark baseline under the pages (main.tsx), on the same
// graphite and notary blue; every page people see is drawn on `lightTheme` below or on the
// public pages' site.css, which share one set of tokens (15 October 2026 redesign; palette
// 16 October 2026; notary blue 17 October 2026).
// SPDX-License-Identifier: Apache-2.0

import { createTheme, alpha } from '@mui/material';

/**
 * The one typeface, for the public pages and the app alike: Atkinson Hyperlegible Next
 * (main.tsx loads it). It was drawn so that characters people confuse (I l 1, O 0, B 8)
 * look different, and people here copy lab codes, record codes and fingerprints off a
 * phone. Japanese falls back to the system's Japanese face. site.css's --font is the same list.
 */
export const FONT =
  '"Atkinson Hyperlegible Next Variable", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Noto Sans JP", system-ui, -apple-system, "Segoe UI", sans-serif';
/** Codes and fingerprints: the same face, with figures that line up and a slashed zero. */
export const CODE_TEXT = {
  fontFamily: FONT,
  fontVariantNumeric: 'tabular-nums slashed-zero',
  letterSpacing: '0.02em',
} as const;

// The dark baseline: Graphite, with notary blue lightened for a dark ground (8.0:1). (It was
// the first brand's teal until 16 October 2026; no page people see is drawn on it.)
const NOTARY_ON_DARK = '#A3B5F8';
const INK = '#1E2227';
const PANEL = '#262B31';
const TEXT = '#F3F5F7';
const MUTED = '#C3C8CF';
/** Below MUI's "sm" breakpoint (600px). */
const PHONE = '@media (max-width:599.95px)';

/**
 * Whether the person asked their device for less motion. Read once, when the page loads:
 * a change in the setting applies on the next load. Both themes then drop MUI's ripple and
 * every transition (collapses, menus and dialogs open at once).
 */
export const REDUCED_MOTION: boolean = (() => {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
})();

const motionOptions = (reduce: boolean) =>
  reduce
    ? {
        transitions: { create: () => 'none' },
        ripple: { MuiButtonBase: { defaultProps: { disableRipple: true, disableTouchRipple: true } } },
      }
    : { transitions: {}, ripple: {} };
const MOTION = motionOptions(REDUCED_MOTION);

export const theme = createTheme({
  transitions: MOTION.transitions,
  palette: {
    mode: 'dark',
    primary: {
      main: NOTARY_ON_DARK,
      contrastText: INK,
    },
    secondary: {
      main: MUTED,
    },
    background: {
      default: INK,
      paper: PANEL,
    },
    text: {
      primary: TEXT,
      secondary: MUTED,
    },
    success: { main: '#7BC4A6' },
    error: { main: '#F4A27F' },
    divider: alpha('#FFFFFF', 0.14),
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: FONT,
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.01em' },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
    allVariants: { color: TEXT },
    // Phones: the two smallest variants come up from 12px to 13px. Desktop unchanged.
    overline: { letterSpacing: '0.28em', color: MUTED, [PHONE]: { fontSize: '0.8125rem', letterSpacing: '0.22em' } },
    caption: { [PHONE]: { fontSize: '0.8125rem' } },
  },
  components: {
    ...MOTION.ripple,
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${alpha('#FFFFFF', 0.12)}`,
          backgroundColor: PANEL,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 22,
          paddingBlock: 10,
          boxShadow: 'none',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: alpha('#000000', 0.2),
          '& fieldset': { borderColor: alpha('#FFFFFF', 0.3) },
          '&:hover fieldset': { borderColor: alpha('#FFFFFF', 0.5) },
        },
        input: { color: TEXT },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600, letterSpacing: '0.02em' },
      },
    },
  },
});

// ---------------------------------------------------------------------------------------
// The app's light theme (13 Oct 2026; redrawn 15 Oct 2026 to match the public pages;
// palette 16 Oct 2026). The landing page and the app are one product, so they use one set
// of tokens: the same colours, the same typeface, the same shapes. site.css repeats these
// values as CSS variables (--ground, --tag, --ink, --muted, --notary, --wash).
//
// VeilCore is neutral infrastructure for plant and animal genetics, sold on one promise: a
// date nobody can backdate. So the page is paper and graphite, and the one colour is notary
// blue, used only where something is dated or sealed. Notaries and officials sign and stamp
// in blue so an original stands out from a black photocopy, and blue is the colour people
// most associate with trust and security. (It was a stamp red until 17 October 2026; red
// now means one thing only: something went wrong.)
//
//   Paper     #F3F5F7  the page: cool register paper, not cream
//   Tag       #FFFFFF  sheets, inputs: the white of a tag (plant tag or ear tag)
//   Graphite  #1E2227  text                          16.0:1 on Tag, 14.6:1 on Paper
//   Pencil    #575E66  secondary text                 6.6:1 on Tag, 6.0:1 on Paper
//   Notary    #1C3BB0  the fingerprint, dates, seals, the main button, links, the focus ring
//                                                    9.1:1 on Tag, 8.4:1 on Paper; white on it 9.1:1
//   Notary deep #152C86 hover and pressed            12.1:1 on Tag, 11.1:1 on Paper; white on it 12.1:1
//   Wash      #E6E9ED  quiet fills: secondary buttons, the next step, hover
//
// Notary blue is ink, never a tinted panel. An error is always a tinted note with an icon
// and a sentence, in red (#9E2A0B, 7.5:1 on Tag), the only red anywhere; a check that passed is a ✓ in a
// quiet green (#2E6B55, 6.3:1), never the brand. Choosing something (a checkbox, a switch,
// a role) is Graphite: it is not a date. Every text colour passes WCAG AA.
export const NOTARY = '#1C3BB0';
export const NOTARY_DEEP = '#152C86';
export const INK_COLOR = '#1E2227';
export const MUTED_COLOR = '#575E66';
export const GROUND = '#F3F5F7';
export const WASH = '#E6E9ED';
export const WASH_STRONG = '#D9DDE2';
/** A check that passed (✓): its own quiet colour, not the brand's. */
export const OK_COLOR = '#2E6B55';
/** Something went wrong: the only red, and always with an icon. */
export const ERROR_COLOR = '#9E2A0B';
/** Lines that join things in order (a lineage, a history): Wash-strong's darker step. */
export const LINE_COLOR = '#C2C7CD';
const L_INK = INK_COLOR;
const L_MUTED = MUTED_COLOR;
const L_GROUND = GROUND;
/** The few rules left (inside technical detail): Wash, so they separate without shouting. */
const L_LINE = WASH;
/** Input edges: 3.7:1 on Tag, enough to see where to type (WCAG 1.4.11). */
const L_EDGE = '#80868F';

/**
 * One visible focus ring for everything a keyboard can reach on the light pages: 2px of
 * notary blue, 2px clear of the element. MUI marks keyboard focus with .Mui-focusVisible
 * (buttons, list buttons, chips, switches); plain links and clickable cards use
 * :focus-visible. Nothing on these pages turns the outline off.
 */
export const FOCUS_RING = { outline: `2px solid ${NOTARY}`, outlineOffset: 2 } as const;

/** The same ring for elements MUI doesn't draw (plain links, cards with a role). Used by App.tsx. */
export const lightFocusStyles = {
  'a:focus-visible, [role="button"]:focus-visible, [role="link"]:focus-visible, summary:focus-visible, [tabindex]:not([tabindex="-1"]):focus-visible':
    FOCUS_RING,
} as const;

// Type scale (ratio about 1.25 from a 17px body), weights from the one variable file.
const HEADING = { fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 } as const;

export const lightTheme = createTheme({
  transitions: MOTION.transitions,
  palette: {
    mode: 'light',
    primary: { main: NOTARY, light: '#3550C0', dark: NOTARY_DEEP, contrastText: '#FFFFFF' },
    // Choosing, not dating: checkboxes, switches, radios and progress are Graphite.
    secondary: { main: L_INK, light: '#3E454D', dark: '#000000', contrastText: '#FFFFFF' },
    background: { default: L_GROUND, paper: '#FFFFFF' },
    text: { primary: L_INK, secondary: L_MUTED },
    success: { main: OK_COLOR },
    warning: { main: '#8F5500' },
    error: { main: ERROR_COLOR },
    info: { main: '#1D5F96' },
    divider: L_LINE,
  },
  // Shape by hierarchy: controls 8, sheets 12 (MuiPaper below), chips 6.
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: FONT,
    h1: { ...HEADING, fontSize: '3rem' },
    h2: { ...HEADING, fontSize: '2.5rem' },
    h3: { ...HEADING, fontSize: '2.125rem' },
    h4: { ...HEADING, fontSize: '2rem', [PHONE]: { fontSize: '1.75rem' } },
    h5: { fontWeight: 750, letterSpacing: '-0.01em', fontSize: '1.375rem', lineHeight: 1.25 },
    h6: { fontWeight: 700, letterSpacing: '-0.005em', fontSize: '1.1875rem', lineHeight: 1.3 },
    subtitle1: { fontWeight: 700, fontSize: '1.0625rem' },
    body1: { fontSize: '1.0625rem', lineHeight: 1.55 },
    body2: { fontSize: '0.9375rem', lineHeight: 1.5 },
    button: { textTransform: 'none', fontWeight: 700, letterSpacing: 0, fontSize: '1rem' },
    // What MUI calls an overline is a field's name or a small group's name here ("Bred by",
    // "Next step"). It is information, so it stays, but in sentence case: no capitals, no
    // tracking, which is how an eyebrow label looks.
    overline: {
      textTransform: 'none',
      letterSpacing: 0,
      fontSize: '0.9375rem',
      lineHeight: 1.5,
      fontWeight: 700,
      color: L_MUTED,
    },
    caption: { fontSize: '0.875rem', color: L_MUTED },
  },
  components: {
    MuiButtonBase: {
      defaultProps: REDUCED_MOTION ? { disableRipple: true, disableTouchRipple: true } : {},
      styleOverrides: { root: { '&.Mui-focusVisible': FOCUS_RING } },
    },
    // A switch's focus lands on its hidden input; the ring goes on the thumb's button.
    MuiSwitch: {
      defaultProps: { color: 'secondary' },
      styleOverrides: { switchBase: { '&.Mui-focusVisible': FOCUS_RING } },
    },
    MuiLink: {
      styleOverrides: { root: { '&:focus-visible': FOCUS_RING, textUnderlineOffset: 3 } },
    },
    MuiCardActionArea: {
      styleOverrides: { root: { '&.Mui-focusVisible': FOCUS_RING } },
    },
    // Subtitles are emphasis, not headings: as h6 they broke the heading outline.
    MuiTypography: {
      defaultProps: { variantMapping: { subtitle1: 'p', subtitle2: 'p' } },
    },
    // A sheet is white on the Paper ground: no outline, no shadow. Menus and dialogs
    // set their own elevation and keep the shadow that lifts them over the page.
    MuiPaper: {
      defaultProps: { elevation: 0 },
      // A sheet inside a sheet (a panel inside a step screen) is a recess in the ground
      // colour, so it still reads as its own part without a border.
      styleOverrides: {
        root: { backgroundImage: 'none', '& .MuiPaper-root:not(.MuiAlert-root)': { backgroundColor: L_GROUND } },
        rounded: { borderRadius: 12 },
      },
    },
    // Filled, never outlined: the main action in Notary blue, the others in Wash, as on
    // the public pages. An outlined button keeps its variant (and behaviour); only its look
    // changes.
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, paddingInline: 20, paddingBlock: 10, boxShadow: 'none' },
        contained: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
      },
      variants: [
        // Any other outlined button (inside a notice, in its own colour): a light fill of
        // that colour instead of an outline.
        {
          props: { variant: 'outlined' },
          style: {
            borderColor: 'transparent',
            backgroundColor: 'color-mix(in srgb, currentColor 10%, transparent)',
            '&:hover': {
              borderColor: 'transparent',
              backgroundColor: 'color-mix(in srgb, currentColor 16%, transparent)',
            },
          },
        },
        {
          props: { variant: 'outlined', color: 'primary' },
          style: {
            color: L_INK,
            backgroundColor: WASH,
            borderColor: 'transparent',
            '&:hover': { backgroundColor: WASH_STRONG, borderColor: 'transparent' },
          },
        },
      ],
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          '& fieldset': { borderColor: L_EDGE, borderWidth: 1.5 },
        },
      },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: 6, fontWeight: 600 } } },
    // Choosing something, or waiting for it, is not a date: these are Graphite (secondary),
    // so notary blue stays on what is dated, sealed, linked or pressed.
    MuiCheckbox: { defaultProps: { color: 'secondary' } },
    MuiRadio: { defaultProps: { color: 'secondary' } },
    MuiCircularProgress: { defaultProps: { color: 'secondary' } },
    MuiLinearProgress: { defaultProps: { color: 'secondary' } },
    // A notice is told apart by a tint of its own colour, not by an outline: an outlined
    // alert keeps its variant (and behaviour) and is drawn like a filled note. The text
    // stays MUI's darkened severity colour, 7:1 or more on each tint. An error always has its
    // icon and a sentence: that, not the hue alone, is how it differs from a date in Notary blue.
    MuiAlert: {
      styleOverrides: { root: { fontSize: '1rem', borderRadius: 12 } },
      variants: (
        [
          ['success', '#E4EFEA'],
          ['info', '#E6EEF5'],
          ['warning', '#FAF0E1'],
          ['error', '#FBECE6'],
        ] as const
      ).map(([severity, tint]) => ({
        props: { variant: 'outlined' as const, severity },
        style: { border: 0, backgroundColor: tint },
      })),
    },
  },
});
