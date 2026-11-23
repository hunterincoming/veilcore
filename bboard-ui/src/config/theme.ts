// VeilCore's themes. `theme` is a dark baseline under the pages (main.tsx), on the same
// ink and pollen gold; every page people see is drawn on `lightTheme` below or on the
// public pages' site.css, which share one set of tokens (15 October 2026 redesign; palette
// 16 October 2026; pollen and ink 17 October 2026).
// SPDX-License-Identifier: Apache-2.0

import { createTheme, alpha } from '@mui/material';
import { color, night, paper } from './tokens';

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
 * Headings, buttons and the wordmark: Archivo (SIL Open Font License), Mako's design face,
 * self-hosted (public/fonts, src/fonts.css) and preloaded. Until it loads, Arial or Liberation
 * Sans stands in, scaled to Archivo's width so little moves when it arrives. Japanese headings
 * and buttons use the body face (App.tsx, site.css): Archivo has no Japanese.
 */
export const DISPLAY_FONT = `"VeilCore Archivo", "VeilCore Archivo fallback", ${FONT}`;
/**
 * Codes and fingerprints: JetBrains Mono (src/fonts.css), whose 0 has a slash and whose I, l
 * and 1 differ, so a code copied off a phone is copied right.
 */
export const CODE_FONT = '"VeilCore Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
/** A code or fingerprint: the code face, with figures that line up and a slashed zero. */
export const CODE_TEXT = {
  fontFamily: CODE_FONT,
  fontVariantNumeric: 'tabular-nums slashed-zero',
  letterSpacing: 0,
} as const;

// The dark baseline: Ink, with pollen gold (12.7:1 on Ink). No page people see is drawn
// on it.
const INK = paper.inverse;
const PANEL = paper.inverseSurface;
const TEXT = paper.onInverse;
const MUTED = paper.onInverseMuted;
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
      main: paper.accent,
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
    success: { main: night.ok },
    error: { main: night.error },
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
// The values live in config/tokens.ts (`paper`), named by role; site.css uses the same names
// as CSS variables (--ground, --surface, --text, --text-muted, --accent, --surface-quiet,
// --rule), and tokens.test.ts checks they match.
//
// Pollen and ink. Pollen gold is where every new variety and bloodline begins: the moment
// VeilCore dates. Ink on archival paper is how genetics have been recorded for 300 years:
// herbarium specimen sheets and stud books. So the pages are herbarium paper and ink, and
// the one colour is pollen gold, on what is dated or pressed: the main button, the DATED
// stamp, the proof code's strip, link underlines and the focus ring. Gold is never text on
// paper (1.3:1): on paper it is always a fill under ink, or a mark beside ink.
//
//   ground        Paper     #F6F3EC  the page: herbarium paper
//   surface       Sheet     #FFFDF7  cards, records, inputs, dialogs: the specimen sheet
//   text          Ink       #16181D  text and links     16.0:1 on Paper, 17.5:1 on Sheet
//   textMuted     Pencil    #4B4740  secondary text      8.3:1 on Paper, 9.1:1 on Sheet, 7.4:1 on Wash
//   accent        Pollen    #F6DA3C  the main button (ink text 12.7:1), stamps, the proof code
//                                    strip, link underlines, the focus ring (ink inner ring)
//   surfaceQuiet  Wash      #ECE6D8  quiet fills: secondary buttons, the next step, hover
//   rule          Hairline  #E4DCC8  the dashed rules between a record's rows, nothing else
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
const L_INK = color.text;
const L_MUTED = color.textMuted;
const L_GROUND = color.ground;
/** The few rules left (inside technical detail): the rule colour, so they separate without shouting. */
const L_LINE = color.rule;
/** Input edges: 4.0:1 on the surface, 3.6:1 on the ground, enough to see where to type (WCAG 1.4.11). */
const L_EDGE = color.edge;

/**
 * One visible focus ring for everything a keyboard can reach on the light pages: an ink
 * ring hugging the element (16:1 on paper) inside a pollen ring (12.7:1 on ink), so it
 * shows on paper, on a gold button and on the ink band alike. MUI marks keyboard focus with
 * .Mui-focusVisible (buttons, list buttons, chips, switches); plain links and clickable
 * cards use :focus-visible. Nothing on these pages turns the outline off.
 */
export const FOCUS_RING = {
  outline: `3px solid ${color.focus}`,
  outlineOffset: 2,
  boxShadow: `0 0 0 2px ${color.focusInner}`,
} as const;

/** The same ring for elements MUI doesn't draw (plain links, cards with a role). Used by App.tsx. */
export const lightFocusStyles = {
  'a:focus-visible, [role="button"]:focus-visible, [role="link"]:focus-visible, summary:focus-visible, [tabindex]:not([tabindex="-1"]):focus-visible':
    FOCUS_RING,
  // A screen's heading takes focus by script when the screen changes (FlowFrame.tsx
  // ScreenHeading, tabIndex -1), so a screen reader starts there. It can't be reached with Tab
  // and does nothing, so it draws no ring: browsers drew their own black box round the title
  // on a fresh page load, which read as a broken layout. Nothing a keyboard can reach is affected.
  'h1[tabindex="-1"]:focus, h2[tabindex="-1"]:focus, [data-screen-heading]:focus': { outline: 'none' },
} as const;

/**
 * A plain router link drawn like MuiLink: ink, with a thick pollen underline. For anchors
 * that aren't MUI Links (a Box rendered as a RouterLink).
 */
export const LINK_SX = {
  color: color.text,
  fontWeight: 700,
  textDecoration: 'underline',
  textDecorationColor: color.accent,
  textDecorationThickness: 3,
  textUnderlineOffset: 3,
  textDecorationSkipInk: 'none',
  '&:hover': { backgroundColor: alpha(color.accent, 0.45) },
} as const;

/**
 * Things you press feel like paper on a desk: a gold button sits on a thin ink shadow,
 * lifts a pixel under the pointer and goes down when pressed. Without motion, the same
 * shadows, no movement.
 */
const PRESS = {
  rest: `0 1px 0 ${alpha(color.text, 0.28)}, 0 2px 6px -2px ${alpha(color.text, 0.24)}`,
  lift: `0 2px 0 ${alpha(color.text, 0.3)}, 0 8px 16px -6px ${alpha(color.text, 0.3)}`,
  down: `0 0 0 ${alpha(color.text, 0.3)}, 0 1px 2px ${alpha(color.text, 0.2)}`,
};
const pressable = (reduce: boolean) => ({
  boxShadow: PRESS.rest,
  transition: reduce ? 'none' : 'transform 120ms ease-out, box-shadow 120ms ease-out',
  '&:hover': { boxShadow: PRESS.lift, transform: reduce ? 'none' : 'translateY(-1px)' },
  '&:active': { boxShadow: PRESS.down, transform: 'none' },
  '&.Mui-focusVisible': { ...FOCUS_RING, boxShadow: `0 0 0 2px ${color.focusInner}` },
  '&.Mui-disabled': { backgroundColor: color.surfaceQuiet, color: alpha(color.text, 0.42), boxShadow: 'none' },
});

// Type scale (ratio about 1.25 from a 17px body). Headings in Archivo, set a little tight.
const HEADING = { fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.12 } as const;

export const lightTheme = createTheme({
  transitions: MOTION.transitions,
  palette: {
    mode: 'light',
    // The gold is a fill under ink, never ink itself: primary text and icons are drawn in
    // Ink below (MuiButton text, MuiLink, MuiChip), and only fills take the gold.
    primary: { main: color.accent, light: color.accent, dark: color.accent, contrastText: color.onAccent },
    // Choosing, not dating: checkboxes, switches, radios and progress are Ink.
    secondary: { main: L_INK, light: '#3A3B40', dark: '#000000', contrastText: color.surface },
    background: { default: L_GROUND, paper: color.surface },
    text: { primary: L_INK, secondary: L_MUTED },
    success: { main: color.ok },
    warning: { main: color.warn },
    error: { main: color.error },
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
    h6: {
      fontFamily: DISPLAY_FONT,
      fontWeight: 700,
      letterSpacing: '-0.005em',
      fontSize: '1.1875rem',
      lineHeight: 1.3,
    },
    subtitle1: { fontWeight: 700, fontSize: '1.0625rem' },
    body1: { fontSize: '1.0625rem', lineHeight: 1.55 },
    body2: { fontSize: '0.9375rem', lineHeight: 1.5 },
    button: { fontFamily: DISPLAY_FONT, textTransform: 'none', fontWeight: 600, letterSpacing: 0, fontSize: '1rem' },
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
          textDecorationColor: color.accent,
          textDecorationThickness: 3,
          textUnderlineOffset: 3,
          textDecorationSkipInk: 'none',
          '&:hover': { backgroundColor: alpha(color.accent, 0.45), textDecorationColor: color.accent },
        },
      },
    },
    // A dialog's title is a heading: Archivo, like the page's.
    MuiDialogTitle: {
      styleOverrides: { root: { fontFamily: DISPLAY_FONT, fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.25 } },
    },
    MuiBackdrop: {
      styleOverrides: { root: { '&:not(.MuiBackdrop-invisible)': { backgroundColor: alpha(color.text, 0.55) } } },
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
        {
          props: { variant: 'text', color: 'primary' },
          style: { color: L_INK, '&:hover': { backgroundColor: color.surfaceQuiet } },
        },
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
            backgroundColor: color.surfaceQuiet,
            borderColor: 'transparent',
            '&:hover': { backgroundColor: color.surfaceQuietHover, borderColor: 'transparent' },
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
          backgroundColor: color.surface,
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
          style: { color: L_INK, borderColor: color.accent, borderWidth: 2 },
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
          ['success', color.okTint],
          ['info', color.surfaceQuiet],
          ['warning', color.warnTint],
          ['error', color.errorTint],
        ] as const
      ).map(([severity, tint]) => ({
        props: { variant: 'outlined' as const, severity },
        style: { border: 0, backgroundColor: tint },
      })),
    },
  },
});
