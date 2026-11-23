// VeilCore's colours, named by what they do (their role), not by what they look like. The one
// place a colour is written down: config/theme.ts and every component take theirs from here,
// and site.css (`.vcm`), home.css (`.home`) and partners.css use the same names as CSS
// variables (`textMuted` is `--text-muted`); tokens.test.ts checks the CSS values match.
//
// Why roles: "INK_COLOR" meant "text colour" in most places, a dark band in some and the text
// on a gold button in others. Named by role, a page can move to another set of values (night,
// day, print) by changing the set, not every place that uses it.
//
// Two sets today, with today's values exactly (nothing on screen changes):
//   paper  the app and the public back pages: herbarium paper, ink and pollen gold
//          (17 October 2026; the reasons for each value are in theme.ts and site.css).
//   night  Home, How it works and About (Mako's design, 18 November 2026; home.css).
// No imports, so the landing page can load this without MUI.
// SPDX-License-Identifier: Apache-2.0

export const paper = {
  /** The page. */
  ground: '#F6F3EC',
  /** Cards, records, inputs, dialogs: the specimen sheet. */
  surface: '#FFFDF7',
  /** Quiet fills: secondary buttons, the next step, hover. */
  surfaceQuiet: '#ECE6D8',
  /** A quiet fill under the pointer. */
  surfaceQuietHover: '#E0D8C6',
  /** Every other row of a table. */
  band: '#F0EBE0',
  /** Text and links: 16.0:1 on the ground. */
  text: '#16181D',
  /** Secondary text: 8.3:1 on the ground. */
  textMuted: '#4B4740',
  /** The one colour: the main button, stamps, link underlines. A fill, never text. */
  accent: '#F6DA3C',
  /** Text and icons on the accent: 12.7:1. */
  onAccent: '#16181D',
  /** The dashed rules between a record's rows. */
  rule: '#E4DCC8',
  /** Input edges: 4.0:1 on the surface, enough to see where to type. */
  edge: '#857E70',
  /** Lines that join things in order: a lineage, a history, steps. */
  line: '#CFC6B1',
  /** A check that passed (with a ✓), never the brand. */
  ok: '#2E6B55',
  /** Something to look at (with an icon). */
  warn: '#8F5500',
  /** Something went wrong: the only red, always with an icon and a sentence. */
  error: '#9E2A0B',
  /** The tints behind a passed, a warning and an error note. */
  okTint: '#E4EFEA',
  warnTint: '#FAF0E1',
  errorTint: '#FBECE6',
  /** The focus ring, outside a ring of `focusInner`, so it shows on paper, gold and ink. */
  focus: '#F6DA3C',
  focusInner: '#16181D',
  /** The dark band and the footer, and what is drawn on them. */
  inverse: '#16181D',
  inverseSurface: '#1F2128',
  onInverse: '#F6F3EC',
  onInverseMuted: '#BDB7AA',
} as const;

export const night = {
  /** The page: the night. */
  ground: '#0B0E14',
  /** A deeper night, behind a gallery. */
  groundDeep: '#0E121A',
  /** Cards and quiet buttons. */
  surface: '#141B26',
  /** A card on a card; a quiet button under the pointer. */
  surfaceRaised: '#1C2738',
  /** Every other row of a table. */
  band: '#111722',
  /** The few rules, and lines that join things. */
  rule: '#1A2331',
  /** The blue of the drawing's rings: a graphic, never text. */
  ring: '#5A7BA6',
  text: '#ECEEF1',
  textMuted: '#A4AFBF',
  /** Small print and labels: 5.4:1 on the ground. */
  textFaint: '#7A889C',
  /** The gold: the main button and the mark. */
  accent: '#A67C00',
  accentHover: '#B8890B',
  /** Proof codes and the drawing's light. */
  highlight: '#5FD3DF',
  /** A check that passed, and an error, on the night (with an icon). */
  ok: '#7BC4A6',
  error: '#F4A27F',
} as const;

export type Palette = typeof paper;

/** The set the app and the back pages draw with today. */
export const color = paper;

/** `textMuted` -> `text-muted`: the CSS variable's name for a token. */
export const cssName = (token: string): string => token.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
