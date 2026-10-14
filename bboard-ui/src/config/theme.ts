// VeilCore brand theme: bioluminescent teal on near-black.
// SPDX-License-Identifier: Apache-2.0

import { createTheme, alpha } from '@mui/material';

// Signature accent — a bioluminescent teal evoking genetics + a privacy "veil".
export const TEAL = '#2ff0cf';
export const TEAL_DIM = '#12b39a';
const INK = '#04070a'; // near-black canvas
const PANEL = '#0a1114'; // raised surface
const TEXT = '#e7f4f1';
const MUTED = '#7f9a95';
/** Below MUI's "sm" breakpoint (600px). */
const PHONE = '@media (max-width:599.95px)';

export const theme = createTheme({
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
    fontFamily: '"Inter", system-ui, sans-serif',
    h1: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, letterSpacing: '-0.02em' },
    h2: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, letterSpacing: '-0.02em' },
    h3: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
    h5: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 500 },
    h6: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 500, letterSpacing: '0.01em' },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
    allVariants: { color: TEXT },
    // Phones: the two smallest variants come up from 12px to 13px. Desktop unchanged.
    overline: { letterSpacing: '0.28em', color: MUTED, [PHONE]: { fontSize: '0.8125rem', letterSpacing: '0.22em' } },
    caption: { [PHONE]: { fontSize: '0.8125rem' } },
  },
  components: {
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
        input: { color: TEXT, fontFamily: '"Space Grotesk", monospace' },
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
// The app's light theme (13 Oct 2026). The public site keeps the dark brand above; the app
// pages, where people read and fill things in, use dark text on a light ground: easier to
// read for longer, and in a bright greenhouse or outdoors on a phone. Hunter's call after
// seeing the light mockup next to the dark build.
//
// Every colour here passes WCAG AA for text on its background. ACCENT replaces the neon
// TEAL on these pages, which is unreadable as text on white.
export const ACCENT = '#00785A';
const L_INK = '#16201B';
const L_MUTED = '#4A564F';
const L_GROUND = '#F5F6F2';
const L_LINE = '#DADFD8';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: ACCENT, light: '#2E9C7E', dark: '#005C45', contrastText: '#FFFFFF' },
    secondary: { main: '#9C3F78' },
    background: { default: L_GROUND, paper: '#FFFFFF' },
    text: { primary: L_INK, secondary: L_MUTED },
    success: { main: ACCENT },
    warning: { main: '#9A5B00' },
    error: { main: '#B3261E' },
    info: { main: '#0060A0' },
    divider: L_LINE,
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Inter", system-ui, sans-serif',
    h1: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, letterSpacing: '-0.01em' },
    h4: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 },
    h5: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
    body1: { fontSize: '1.0625rem', lineHeight: 1.5 },
    body2: { fontSize: '0.9375rem', lineHeight: 1.5 },
    button: { textTransform: 'none', fontWeight: 700, letterSpacing: '0.01em', fontSize: '1rem' },
    overline: { letterSpacing: '0.16em', color: L_MUTED, fontWeight: 700 },
    caption: { fontSize: '0.875rem', color: L_MUTED },
  },
  components: {
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none', border: `1px solid ${L_LINE}` } },
    },
    MuiButton: {
      styleOverrides: { root: { borderRadius: 12, paddingInline: 20, paddingBlock: 10, boxShadow: 'none' } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          '& fieldset': { borderColor: '#C7CEC8', borderWidth: 1.5 },
        },
      },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 600 } } },
    MuiAlert: { styleOverrides: { root: { backgroundColor: '#FFFFFF', fontSize: '1rem' } } },
  },
});
