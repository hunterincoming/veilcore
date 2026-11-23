// VeilCore's themes. `theme` is a dark baseline under the pages (main.tsx). The app's pages
// (App.tsx `Light`) are drawn on `appTheme`, which follows the device's light or dark setting
// in Mako's night and gold (23 November 2026); the public pages on site.css, with `lightTheme`
// for the few MUI parts in their frame. One set of components serves both, drawn with the
// `--vc-*` colour variables (config/tokens.ts `color`), so a component never names a set.
// SPDX-License-Identifier: Apache-2.0

import { createTheme, alpha, type Theme, type ThemeOptions } from '@mui/material';
import { appNight, appPrint, color, day, mix, night, paper, paperRoles, vcVars, type AppPalette } from './tokens';

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
export const CODE_FONT =
  '"VeilCore Mono", "VeilCore Mono fallback", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
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
// The app's themes: night and day (23 Nov 2026), on the roles of config/tokens.ts.
//
// The night is Mako's: the void (#0B0E14), fills (#141B26), ink (#ECEEF1) and his gold
// (#A67C00). The day is the same gold and roles on herbarium paper and ink, for phones in the
// sun and greenhouses. Which one a page shows is the device's setting (prefers-color-scheme);
// printed, it is always the day on white (tokens.ts appPrint), because printers drop
// backgrounds and light text would print faint.
//
// The rules both keep (plan v2, both reviews):
// - Never light text on gold (3.8:1): the main button is gold under the night, 5.1:1 (6.1:1
//   under the pointer). Gold is never text on the day's paper (3.4:1), nor on a raised fill.
// - A quiet button is its fill and a 1px line in the fields' edge colour (5.4:1 on the night,
//   3.6:1 on paper), so its shape shows; no outlines.
// - Choosing something (a checkbox, a switch, a role) is ink, not gold: gold is what is dated,
//   sealed, linked or pressed.
// - A passed check is a ✓ in green, a warning (orange, not the brand's gold) and an error each
//   with an icon and a sentence, never colour alone. Every text colour passes WCAG AA.
// - The focus ring is gold outside a ring of the ground's darkest ink, so it shows on the night,
//   on paper and on a gold button alike.
// Shape by hierarchy: controls 8, sheets 12, chips 6.

/**
 * One visible focus ring for everything a keyboard can reach on the light pages: an ink
 * ring hugging the element inside a gold ring, so it shows on the ground, on a gold button
 * and on the ink band alike. MUI marks keyboard focus with .Mui-focusVisible (buttons, list
 * buttons, chips, switches); plain links and clickable cards use :focus-visible. Nothing on
 * these pages turns the outline off.
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
 * A plain router link drawn like MuiLink: ink, with a thick gold underline. For anchors
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
  '&:hover': { backgroundColor: mix(color.accent, 45) },
} as const;

/** A quiet button's edge: its fill alone is 1.1:1 on the ground, so a 1px line shows its shape. */
export const QUIET_EDGE = `inset 0 0 0 1px ${color.edge}`;

/**
 * Things you press sit on a thin shadow, lift a pixel under the pointer and go down when
 * pressed. Without motion, the same shadows, no movement.
 */
const PRESS = {
  rest: `0 1px 0 ${mix(color.shadow, 28)}, 0 2px 6px -2px ${mix(color.shadow, 24)}`,
  lift: `0 2px 0 ${mix(color.shadow, 30)}, 0 8px 16px -6px ${mix(color.shadow, 30)}`,
  down: `0 0 0 ${mix(color.shadow, 30)}, 0 1px 2px ${mix(color.shadow, 20)}`,
};
const pressable = (reduce: boolean) => ({
  boxShadow: PRESS.rest,
  transition: reduce ? 'none' : 'transform 120ms ease-out, box-shadow 120ms ease-out, background-color 120ms',
  '&:hover': {
    boxShadow: PRESS.lift,
    transform: reduce ? 'none' : 'translateY(-1px)',
    backgroundColor: color.accentHover,
  },
  '&:active': { boxShadow: PRESS.down, transform: 'none' },
  '&.Mui-focusVisible': { ...FOCUS_RING, boxShadow: `0 0 0 2px ${color.focusInner}` },
  '&.Mui-disabled': { backgroundColor: color.surfaceQuiet, color: mix(color.text, 42), boxShadow: 'none' },
});

// Type scale (ratio about 1.25 from a 17px body). Headings in Archivo, set a little tight.
const HEADING = { fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.12 } as const;

/** MUI's palette for one set: what MUI's own parts (fields, menus, checkboxes) draw with. */
const muiPalette = (c: AppPalette, mode: 'light' | 'dark') => ({
  mode,
  // The gold is a fill under the night, never text: primary text and icons are drawn in ink
  // below (MuiButton text, MuiLink, MuiChip), and only fills take the gold.
  primary: { main: c.accent, light: c.accent, dark: c.accent, contrastText: c.onAccent },
  // Choosing, not dating: checkboxes, switches, radios and progress are ink.
  secondary: { main: c.text, contrastText: c.ground },
  background: { default: c.ground, paper: c.surface },
  text: { primary: c.text, secondary: c.textMuted },
  success: { main: c.ok },
  warning: { main: c.warn },
  error: { main: c.error },
  // A neutral note in ink on the quiet fill: no blue.
  info: { main: c.textMuted },
  divider: c.rule,
});

/** Everything but the colours' values: the same type, shapes and parts in every set. */
const shared: ThemeOptions = {
  transitions: MOTION.transitions,
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
      color: color.textMuted,
    },
    caption: { fontSize: '0.875rem', color: color.textMuted },
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
    // A link is ink with a thick gold underline; under the pointer the underline fills
    // in behind the word, like a highlighter.
    MuiLink: {
      defaultProps: { color: 'inherit' },
      styleOverrides: {
        root: {
          '&:focus-visible': FOCUS_RING,
          color: color.text,
          fontWeight: 700,
          textDecorationColor: color.accent,
          textDecorationThickness: 3,
          textUnderlineOffset: 3,
          textDecorationSkipInk: 'none',
          '&:hover': { backgroundColor: mix(color.accent, 45), textDecorationColor: color.accent },
        },
      },
    },
    // A dialog's title is a heading: Archivo, like the page's.
    MuiDialogTitle: {
      styleOverrides: { root: { fontFamily: DISPLAY_FONT, fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.25 } },
    },
    // Dialogs and menus stand a step above the page: the raised fill (on paper, the sheet).
    MuiDialog: { styleOverrides: { paper: { backgroundColor: color.surfaceRaised } } },
    MuiPopover: { styleOverrides: { paper: { backgroundColor: color.surfaceRaised } } },
    MuiBackdrop: {
      styleOverrides: { root: { '&:not(.MuiBackdrop-invisible)': { backgroundColor: mix(color.scrim, 62) } } },
    },
    MuiCardActionArea: {
      styleOverrides: { root: { '&.Mui-focusVisible': FOCUS_RING } },
    },
    // Subtitles are emphasis, not headings: as h6 they broke the heading outline.
    MuiTypography: {
      defaultProps: { variantMapping: { subtitle1: 'p', subtitle2: 'p' } },
    },
    // A sheet is a card on the ground: no outline, a hairline of shadow on paper (none shows on
    // the night, where the fill alone sets it apart, as on Mako's pages). Menus and dialogs set
    // their own elevation and keep the shadow that lifts them over the page.
    MuiPaper: {
      defaultProps: { elevation: 0 },
      // A sheet inside a sheet (a panel inside a step screen) is a recess in the ground
      // colour, so it still reads as its own part without a border.
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          '& .MuiPaper-root:not(.MuiAlert-root)': { backgroundColor: color.ground },
        },
        rounded: { borderRadius: 12 },
        elevation0: { boxShadow: `0 0 0 1px ${mix(color.shadow, 8)}, 0 1px 2px ${mix(color.shadow, 6)}` },
      },
    },
    // Filled, never outlined: the main action gold under the night, the others the quiet fill
    // with its edge. An outlined button keeps its variant (and behaviour); only its look
    // changes. A text button is ink, never gold text.
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, paddingInline: 20, paddingBlock: 10, boxShadow: 'none' },
        contained: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
      },
      variants: [
        {
          props: { variant: 'contained', color: 'primary' },
          style: { backgroundColor: color.accent, color: color.onAccent, ...pressable(REDUCED_MOTION) },
        },
        {
          props: { variant: 'text', color: 'primary' },
          style: { color: color.text, '&:hover': { backgroundColor: color.surfaceQuiet } },
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
            color: color.text,
            backgroundColor: color.surfaceQuiet,
            borderColor: 'transparent',
            boxShadow: QUIET_EDGE,
            '&:hover': { backgroundColor: color.surfaceQuietHover, borderColor: 'transparent' },
          },
        },
      ],
    },
    MuiIconButton: {
      variants: [{ props: { color: 'primary' }, style: { color: color.text } }],
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: color.surface,
          borderRadius: 8,
          '& fieldset': { borderColor: color.edge, borderWidth: 1.5 },
          '&.Mui-focused fieldset': { borderColor: `${color.text} !important` },
          // A browser's autofill paints its own pale fill: on the night, the field keeps its fill
          // and its ink.
          '& input:-webkit-autofill': {
            WebkitBoxShadow: `0 0 0 100px ${color.surface} inset`,
            WebkitTextFillColor: color.text,
            caretColor: color.text,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { '&.Mui-focused': { color: color.text } } },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 6, fontWeight: 600 } },
      variants: [
        // A primary chip is a gold label under the night; outlined, an ink label with a gold edge.
        {
          props: { color: 'primary', variant: 'outlined' },
          style: { color: color.text, borderColor: color.accent, borderWidth: 2 },
        },
      ],
    },
    // Choosing something, or waiting for it, is not a date: these are ink (secondary),
    // so the gold stays on what is dated, sealed, linked or pressed.
    MuiCheckbox: { defaultProps: { color: 'secondary' } },
    MuiRadio: { defaultProps: { color: 'secondary' } },
    MuiCircularProgress: { defaultProps: { color: 'secondary' } },
    MuiLinearProgress: { defaultProps: { color: 'secondary' } },
    // A notice is told apart by a tint of its own colour, not by an outline: an outlined
    // alert keeps its variant (and behaviour) and is drawn like a filled note, its text in
    // the set's text colour and its icon in the notice's colour (6.4:1 or more on each tint).
    // An error always has its icon and a sentence: that, not the hue alone, is how it reads.
    MuiAlert: {
      styleOverrides: {
        root: { fontSize: '1rem', borderRadius: 12 },
        // A short action ("Save it") stays on one line beside the sentence.
        action: { alignItems: 'center', '& .MuiButton-root': { whiteSpace: 'nowrap' } },
      },
      variants: (
        [
          ['success', color.okTint, color.ok],
          ['info', color.surfaceQuiet, color.textMuted],
          ['warning', color.warnTint, color.warn],
          ['error', color.errorTint, color.error],
        ] as const
      ).map(([severity, tint, mark]) => ({
        props: { variant: 'outlined' as const, severity },
        style: { border: 0, backgroundColor: tint, color: color.text, '& .MuiAlert-icon': { color: mark } },
      })),
    },
  },
};

/**
 * The public pages' frame (SiteShell.tsx): the header's and footer's MUI parts. The colour
 * variables there hold the paper set (main.tsx paperColourStyles); site.css draws the night
 * over them.
 */
export const lightTheme = createTheme({ ...shared, palette: muiPalette(paperRoles, 'light') });

const DARK_MEDIA = '@media (prefers-color-scheme: dark)';
const DARK_SCREEN = '@media screen and (prefers-color-scheme: dark)';
/** `{ '@media (prefers-color-scheme: dark)': x }` anywhere in a style object, on screens only. */
const onScreen = (styles: unknown): unknown => {
  if (Array.isArray(styles)) return styles.map(onScreen);
  if (!styles || typeof styles !== 'object') return styles;
  return Object.fromEntries(
    Object.entries(styles as Record<string, unknown>).map(([k, v]) => [
      k === DARK_MEDIA ? DARK_SCREEN : k,
      onScreen(v),
    ]),
  );
};

/**
 * The app: day and night, the device's choice, in MUI's colour schemes (CSS variables, so the
 * page doesn't flash or redraw when the setting changes). MUI writes its dark colours under
 * `prefers-color-scheme: dark`, which a printer can match too: here they are for screens only,
 * so a page prints in the day's colours (and appColourStyles' print set) on a dark phone.
 */
export const appTheme: Theme = (() => {
  const t = createTheme({
    ...shared,
    cssVariables: { colorSchemeSelector: 'media' },
    colorSchemes: { light: { palette: muiPalette(day, 'light') }, dark: { palette: muiPalette(appNight, 'dark') } },
  }) as Theme & { generateStyleSheets: () => unknown[]; getColorSchemeSelector: (scheme: string) => string };
  const sheets = t.generateStyleSheets;
  t.generateStyleSheets = () => onScreen(sheets()) as unknown[];
  const selector = t.getColorSchemeSelector;
  t.getColorSchemeSelector = (scheme) => {
    const s = selector(scheme);
    return s === DARK_MEDIA ? DARK_SCREEN : s;
  };
  return t;
})();

/**
 * The app's colour variables (App.tsx `Light`): the day, the night on a screen set to dark, and
 * paper when printed. `:root:root` so they win over the public pages' defaults (main.tsx).
 */
export const appColourStyles = {
  ':root:root': { ...vcVars(day), colorScheme: 'light' },
  [DARK_SCREEN]: { ':root:root': { ...vcVars(appNight), colorScheme: 'dark' } },
  '@media print': {
    // MUI's own gold (a floating button, a tab's line) as the print set's light gold too.
    ':root:root': { ...vcVars(appPrint), '--mui-palette-primary-main': appPrint.accent, colorScheme: 'light' },
    // Ask's button and its hint are for the screen: on paper there is nothing to press.
    '.MuiFab-root, [data-ask-open], [data-ask-hint]': { display: 'none !important' },
    'html:root body': { paddingBottom: 0 },
  },
  // Past the page's end (a short page, overscroll), the ground goes on.
  'html:root, html:root body': { backgroundColor: color.ground, color: color.text },
  // A plain link nobody styled (a router link in a sentence) was the browser's blue, 2:1 on the
  // night: it reads like every other link instead, ink with a gold underline.
  ':where(a:not([class]))': {
    color: color.text,
    textDecorationColor: color.accent,
    textDecorationThickness: 2,
    textUnderlineOffset: 3,
  },
} as const;

/** Outside the app the variables hold the paper set: the header and footer's MUI parts (main.tsx). */
export const paperColourStyles = { ':root': vcVars(paperRoles) } as const;
