// VeilCore's themes. `theme` is a dark baseline under the pages (main.tsx), on the same
// ink and pollen gold; every page people see is drawn on `lightTheme` below or on the
// public pages' site.css, which share one set of tokens (15 October 2026 redesign; palette
// 16 October 2026; pollen and ink 17 October 2026).
// SPDX-License-Identifier: Apache-2.0

import { createTheme, alpha } from '@mui/material';

/**
 * The body and interface typeface, for the public pages and the app alike: Atkinson
 * Hyperlegible Next (main.tsx loads it). It was drawn so that characters people confuse
 * (I l 1, O 0, B 8) look different, and people here copy lab codes, record codes and
 * fingerprints off a phone. Japanese falls back to the system's Japanese face. site.css's
 * --font is the same list.
 */
export const FONT =
  '"Atkinson Hyperlegible Next Variable", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Noto Sans JP", system-ui, -apple-system, "Segoe UI", sans-serif';
/**
 * Headings only: Libre Caslon Text Bold (SIL Open Font License), a revival of the face
 * William Caslon cut in the 1720s, the type of the century's registers, herbaria labels and
 * stud books. One weight, subset to Latin (16 KB, public/fonts, src/fonts.css). Until it
 * loads, a serif already on the device stands in, scaled to the same width so nothing moves
 * when it arrives. Japanese headings use the body face (App.tsx, site.css).
 */
export const DISPLAY_FONT = `"VeilCore Caslon", "VeilCore Caslon fallback", Georgia, ${FONT}`;
/** Codes and fingerprints: the same face, with figures that line up and a slashed zero. */
export const CODE_TEXT = {
  fontFamily: FONT,
  fontVariantNumeric: 'tabular-nums slashed-zero',
  letterSpacing: '0.02em',
} as const;

// The dark baseline: Ink, with pollen gold (12.7:1 on Ink). No page people see is drawn
// on it.
const INK = '#16181D';
const PANEL = '#1F2128';
const TEXT = '#F6F3EC';
const MUTED = '#BDB7AA';
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
      main: '#F6DA3C',
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
// palette 17 Oct 2026: pollen and ink). The landing page and the app are one product, so
// they use one set of tokens: the same colours, the same typefaces, the same shapes.
// site.css repeats these values as CSS variables (--ground, --sheet, --ink, --muted,
// --pollen, --wash, --hairline).
//
// Pollen and ink. Pollen gold is where every new variety and bloodline begins: the moment
// VeilCore dates. Ink on archival paper is how genetics have been recorded for 300 years:
// herbarium specimen sheets and stud books. So the pages are herbarium paper and ink, and
// the one colour is pollen gold, on what is dated or pressed: the main button, the DATED
// stamp, the proof code's strip, link underlines and the focus ring. Gold is never text on
// paper (1.3:1): on paper it is always a fill under ink, or a mark beside ink.
//
//   Paper     #F6F3EC  the page: herbarium paper
//   Sheet     #FFFDF7  cards, records, inputs, dialogs: the specimen sheet
//   Ink       #16181D  text and links             16.0:1 on Paper, 17.5:1 on Sheet
//   Pencil    #4B4740  secondary text, warm grey   8.3:1 on Paper, 9.1:1 on Sheet, 7.4:1 on Wash
//   Pollen    #F6DA3C  the main button (ink text 12.7:1), stamps, the proof code strip,
//                      link underlines, the focus ring (with an ink inner ring)
//   Wash      #ECE6D8  quiet fills: secondary buttons, the next step, hover
//   Hairline  #E4DCC8  the dashed rules between a record's rows, nothing else
//
// Why this gold and not the first idea (#F2B705): that one is CIEDE2000 1.8 from Binance
// yellow (#F3BA2F). A marigold light enough to stay 10:1 under ink lands on Binance too;
// the warm golds that get away are pale butter or a dull mustard (7:1). This one is a clear
// pollen yellow, 10.5 from Binance and 25.0 from Bitcoin orange (#F7931A).
//
// An error is always a tinted note with an icon and a sentence, in red (#9E2A0B, 7.4:1 on
// Sheet), the only red anywhere; a check that passed is a ✓ in a quiet green (#2E6B55,
// 5.7:1), never the brand. Choosing something (a checkbox, a switch, a role) is Ink: it is
// not a date. Every text colour passes WCAG AA, and the brand pair AAA.
export const POLLEN = '#F6DA3C';
export const INK_COLOR = '#16181D';
export const MUTED_COLOR = '#4B4740';
export const GROUND = '#F6F3EC';
export const SHEET = '#FFFDF7';
export const WASH = '#ECE6D8';
export const WASH_STRONG = '#E0D8C6';
/** The dashed rule between a record's rows (a specimen sheet's ruled lines). */
export const HAIRLINE = '#E4DCC8';
/** A check that passed (✓): its own quiet colour, not the brand's. */
export const OK_COLOR = '#2E6B55';
/** Something went wrong: the only red, and always with an icon. */
export const ERROR_COLOR = '#9E2A0B';
/** Lines that join things in order (a lineage, a history): Wash-strong's darker step. */
export const LINE_COLOR = '#CFC6B1';
const L_INK = INK_COLOR;
const L_MUTED = MUTED_COLOR;
const L_GROUND = GROUND;
/** The few rules left (inside technical detail): Hairline, so they separate without shouting. */
const L_LINE = HAIRLINE;
/** Input edges: 4.0:1 on Sheet, 3.6:1 on Paper, enough to see where to type (WCAG 1.4.11). */
const L_EDGE = '#857E70';

/**
 * One visible focus ring for everything a keyboard can reach on the light pages: an ink
 * ring hugging the element (16:1 on paper) inside a pollen ring (12.7:1 on ink), so it
 * shows on paper, on a gold button and on the ink band alike. MUI marks keyboard focus with
 * .Mui-focusVisible (buttons, list buttons, chips, switches); plain links and clickable
 * cards use :focus-visible. Nothing on these pages turns the outline off.
 */
export const FOCUS_RING = {
  outline: `3px solid ${POLLEN}`,
  outlineOffset: 2,
  boxShadow: `0 0 0 2px ${INK_COLOR}`,
} as const;

/** The same ring for elements MUI doesn't draw (plain links, cards with a role). Used by App.tsx. */
export const lightFocusStyles = {
  'a:focus-visible, [role="button"]:focus-visible, [role="link"]:focus-visible, summary:focus-visible, [tabindex]:not([tabindex="-1"]):focus-visible':
    FOCUS_RING,
} as const;

/**
 * A plain router link drawn like MuiLink: ink, with a thick pollen underline. For anchors
 * that aren't MUI Links (a Box rendered as a RouterLink).
 */
export const LINK_SX = {
  color: INK_COLOR,
  fontWeight: 700,
  textDecoration: 'underline',
  textDecorationColor: POLLEN,
  textDecorationThickness: 3,
  textUnderlineOffset: 3,
  textDecorationSkipInk: 'none',
  '&:hover': { backgroundColor: alpha(POLLEN, 0.45) },
} as const;

/**
 * Things you press feel like paper on a desk: a gold button sits on a thin ink shadow,
 * lifts a pixel under the pointer and goes down when pressed. Without motion, the same
 * shadows, no movement.
 */
const PRESS = {
  rest: `0 1px 0 ${alpha(INK_COLOR, 0.28)}, 0 2px 6px -2px ${alpha(INK_COLOR, 0.24)}`,
  lift: `0 2px 0 ${alpha(INK_COLOR, 0.3)}, 0 8px 16px -6px ${alpha(INK_COLOR, 0.3)}`,
  down: `0 0 0 ${alpha(INK_COLOR, 0.3)}, 0 1px 2px ${alpha(INK_COLOR, 0.2)}`,
};
const pressable = (reduce: boolean) => ({
  boxShadow: PRESS.rest,
  transition: reduce ? 'none' : 'transform 120ms ease-out, box-shadow 120ms ease-out',
  '&:hover': { boxShadow: PRESS.lift, transform: reduce ? 'none' : 'translateY(-1px)' },
  '&:active': { boxShadow: PRESS.down, transform: 'none' },
  '&.Mui-focusVisible': { ...FOCUS_RING, boxShadow: `0 0 0 2px ${INK_COLOR}` },
  '&.Mui-disabled': { backgroundColor: WASH, color: alpha(INK_COLOR, 0.42), boxShadow: 'none' },
});

// Type scale (ratio about 1.25 from a 17px body). Headings in Caslon: a serif's colour is
// lighter than a heavy sans at the same weight, so they sit a step larger, tracked at zero.
const HEADING = { fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.005em', lineHeight: 1.12 } as const;

export const lightTheme = createTheme({
  transitions: MOTION.transitions,
  palette: {
    mode: 'light',
    // The gold is a fill under ink, never ink itself: primary text and icons are drawn in
    // Ink below (MuiButton text, MuiLink, MuiChip), and only fills take the gold.
    primary: { main: POLLEN, light: POLLEN, dark: POLLEN, contrastText: L_INK },
    // Choosing, not dating: checkboxes, switches, radios and progress are Ink.
    secondary: { main: L_INK, light: '#3A3B40', dark: '#000000', contrastText: SHEET },
    background: { default: L_GROUND, paper: SHEET },
    text: { primary: L_INK, secondary: L_MUTED },
    success: { main: OK_COLOR },
    warning: { main: '#8F5500' },
    error: { main: ERROR_COLOR },
    // A neutral note in ink on Wash: no blue.
    info: { main: L_MUTED },
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
    h5: { ...HEADING, fontSize: '1.4375rem', lineHeight: 1.25 },
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
    // A link is ink with a thick pollen underline; under the pointer the underline fills
    // in behind the word, like a highlighter.
    MuiLink: {
      defaultProps: { color: 'inherit' },
      styleOverrides: {
        root: {
          '&:focus-visible': FOCUS_RING,
          color: L_INK,
          fontWeight: 700,
          textDecorationColor: POLLEN,
          textDecorationThickness: 3,
          textUnderlineOffset: 3,
          textDecorationSkipInk: 'none',
          '&:hover': { backgroundColor: alpha(POLLEN, 0.45), textDecorationColor: POLLEN },
        },
      },
    },
    // A dialog's title is a heading: Caslon, like the page's.
    MuiDialogTitle: {
      styleOverrides: { root: { fontFamily: DISPLAY_FONT, fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.25 } },
    },
    MuiBackdrop: {
      styleOverrides: { root: { '&:not(.MuiBackdrop-invisible)': { backgroundColor: alpha(INK_COLOR, 0.55) } } },
    },
    MuiCardActionArea: {
      styleOverrides: { root: { '&.Mui-focusVisible': FOCUS_RING } },
    },
    // Subtitles are emphasis, not headings: as h6 they broke the heading outline.
    MuiTypography: {
      defaultProps: { variantMapping: { subtitle1: 'p', subtitle2: 'p' } },
    },
    // A sheet is the specimen sheet on the Paper ground: no outline, a hairline of shadow
    // so it sits on the paper. Menus and dialogs set their own elevation and keep the
    // shadow that lifts them over the page.
    MuiPaper: {
      defaultProps: { elevation: 0 },
      // A sheet inside a sheet (a panel inside a step screen) is a recess in the ground
      // colour, so it still reads as its own part without a border.
      styleOverrides: {
        root: { backgroundImage: 'none', '& .MuiPaper-root:not(.MuiAlert-root)': { backgroundColor: L_GROUND } },
        rounded: { borderRadius: 12 },
        elevation0: { boxShadow: `0 0 0 1px ${alpha('#5C4F2E', 0.08)}, 0 1px 2px ${alpha('#5C4F2E', 0.06)}` },
      },
    },
    // Filled, never outlined: the main action in pollen gold under ink, the others in
    // Wash, as on the public pages. An outlined button keeps its variant (and behaviour);
    // only its look changes. A text button is ink, never gold text.
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, paddingInline: 20, paddingBlock: 10, boxShadow: 'none' },
        contained: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
      },
      variants: [
        { props: { variant: 'contained', color: 'primary' }, style: pressable(REDUCED_MOTION) },
        { props: { variant: 'text', color: 'primary' }, style: { color: L_INK, '&:hover': { backgroundColor: WASH } } },
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
    MuiIconButton: {
      variants: [{ props: { color: 'primary' }, style: { color: L_INK } }],
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: SHEET,
          borderRadius: 8,
          '& fieldset': { borderColor: L_EDGE, borderWidth: 1.5 },
          '&.Mui-focused fieldset': { borderColor: `${L_INK} !important` },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { '&.Mui-focused': { color: L_INK } } },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 6, fontWeight: 600 } },
      variants: [
        // A primary chip is a gold label under ink; outlined, an ink label with a gold edge.
        {
          props: { color: 'primary', variant: 'outlined' },
          style: { color: L_INK, borderColor: POLLEN, borderWidth: 2 },
        },
      ],
    },
    // Choosing something, or waiting for it, is not a date: these are Ink (secondary),
    // so pollen gold stays on what is dated, sealed, linked or pressed.
    MuiCheckbox: { defaultProps: { color: 'secondary' } },
    MuiRadio: { defaultProps: { color: 'secondary' } },
    MuiCircularProgress: { defaultProps: { color: 'secondary' } },
    MuiLinearProgress: { defaultProps: { color: 'secondary' } },
    // A notice is told apart by a tint of its own colour, not by an outline: an outlined
    // alert keeps its variant (and behaviour) and is drawn like a filled note. The text
    // stays MUI's darkened severity colour, 7:1 or more on each tint. An error always has its
    // icon and a sentence: that, not the hue alone, is how it reads as a problem.
    MuiAlert: {
      styleOverrides: {
        root: { fontSize: '1rem', borderRadius: 12 },
        // A short action ("Save it") stays on one line beside the sentence.
        action: { alignItems: 'center', '& .MuiButton-root': { whiteSpace: 'nowrap' } },
      },
      variants: (
        [
          ['success', '#E4EFEA'],
          ['info', WASH],
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
