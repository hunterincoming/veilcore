// VeilCore's themes. `theme` is the old dark brand, kept only as the baseline under the
// pages (main.tsx); every page people see is drawn on `lightTheme` below or on the public
// pages' site.css, which share one set of tokens (15 October 2026 redesign).
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

// Signature accent — a bioluminescent teal evoking genetics + a privacy "veil".
export const TEAL = '#2ff0cf';
export const TEAL_DIM = '#12b39a';
const INK = '#04070a'; // near-black canvas
const PANEL = '#0a1114'; // raised surface
const TEXT = '#e7f4f1';
const MUTED = '#7f9a95';
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
      main: TEAL,
      light: '#69f6de',
      dark: TEAL_DIM,
      contrastText: '#02110d',
    },
    secondary: {
      main: '#8a7dff', // restrained violet complement, used sparingly
    },
    background: {
      default: INK,
      paper: PANEL,
    },
    text: {
      primary: TEXT,
      secondary: MUTED,
    },
    success: { main: TEAL },
    error: { main: '#ff5c72' },
    divider: alpha('#2ff0cf', 0.14),
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
          border: `1px solid ${alpha(TEAL, 0.12)}`,
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
          '&.MuiButton-containedPrimary': {
            boxShadow: `0 0 0 1px ${alpha(TEAL, 0.5)}, 0 8px 30px ${alpha(TEAL, 0.25)}`,
          },
          '&.MuiButton-containedPrimary:hover': {
            boxShadow: `0 0 0 1px ${TEAL}, 0 10px 40px ${alpha(TEAL, 0.4)}`,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: alpha('#00120f', 0.5),
          '& fieldset': { borderColor: alpha(TEAL, 0.2) },
          '&:hover fieldset': { borderColor: alpha(TEAL, 0.45) },
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
// The app's light theme (13 Oct 2026; redrawn 15 Oct 2026 to match the public pages).
// The landing page and the app are one product, so they use one set of tokens: the same
// five colours, the same typeface, the same shapes. site.css repeats these values as CSS
// variables (--ground, --tag, --ink, --muted, --accent, --wash).
//
//   Leaf ink     #1B2E24  text                         14.4:1 on Tag, 13.0:1 on Greenhouse
//   Stem         #4D6156  secondary text                6.7:1 on Tag, 6.0:1 on Greenhouse
//   Greenhouse   #F2F5EF  the page: the cool light under greenhouse glazing
//   Tag          #FFFFFF  sheets, inputs: the white of a plastic plant tag
//   Chlorophyll  #11733F  actions, links, done marks   5.9:1 on Tag; white on it 5.9:1
//   Seedling     #E2ECDD  quiet fills: secondary buttons, the next step, hover
//
// No outlines round every block: a sheet is told from the page by its white, not by a
// border, and the rows inside it by space, not rules. Every text colour passes WCAG AA.
export const ACCENT = '#11733F';
export const ACCENT_DEEP = '#0B5A30';
export const INK_COLOR = '#1B2E24';
export const MUTED_COLOR = '#4D6156';
export const GROUND = '#F2F5EF';
export const WASH = '#E2ECDD';
export const WASH_STRONG = '#D3E2CC';
const L_INK = INK_COLOR;
const L_MUTED = MUTED_COLOR;
const L_GROUND = GROUND;
/** The few rules left (inside technical detail): Seedling, so they separate without shouting. */
const L_LINE = WASH;
/** Input edges: 3.3:1 on Tag, enough to see where to type (WCAG 1.4.11). */
const L_EDGE = '#7E9187';

/**
 * One visible focus ring for everything a keyboard can reach on the light pages: 2px of
 * the accent, 2px clear of the element. MUI marks keyboard focus with .Mui-focusVisible
 * (buttons, list buttons, chips, switches); plain links and clickable cards use
 * :focus-visible. Nothing on these pages turns the outline off.
 */
export const FOCUS_RING = { outline: `2px solid ${ACCENT}`, outlineOffset: 2 } as const;

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
    primary: { main: ACCENT, light: '#2E8F5A', dark: ACCENT_DEEP, contrastText: '#FFFFFF' },
    secondary: { main: '#8E3B73' },
    background: { default: L_GROUND, paper: '#FFFFFF' },
    text: { primary: L_INK, secondary: L_MUTED },
    success: { main: ACCENT },
    warning: { main: '#9A5B00' },
    error: { main: '#B3261E' },
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
    // A sheet is white on the Greenhouse ground: no outline, no shadow. Menus and dialogs
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
    // Filled, never outlined: the main action in Chlorophyll, the others in Seedling, as on
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
    // A notice is told apart by a tint of its own colour, not by an outline: an outlined
    // alert keeps its variant (and behaviour) and is drawn like a filled note. The text
    // stays MUI's darkened severity colour, 7:1 or more on each tint.
    MuiAlert: {
      styleOverrides: { root: { fontSize: '1rem', borderRadius: 12 } },
      variants: (
        [
          ['success', WASH],
          ['info', '#E6EEF5'],
          ['warning', '#FAF0E1'],
          ['error', '#FBEAE8'],
        ] as const
      ).map(([severity, tint]) => ({
        props: { variant: 'outlined' as const, severity },
        style: { border: 0, backgroundColor: tint },
      })),
    },
  },
});
