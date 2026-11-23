// One source for colours (config/tokens.ts): the CSS variables in site.css (`.vcm`, the night
// set every public page draws with; its print block, the paper set) carry the same names and
// the same values; home.css (`.vcm .home`) takes them from .vcm and sets none of its own; and
// theme.ts writes none of the token values itself.
// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { appNight, appPrint, color, cssName, day, mix, night, paper, paperRoles, vcVars } from './tokens';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p: string) => fs.readFileSync(path.join(here, p), 'utf8');
const siteCss = read('../components/site/site.css');
const homeCss = read('../components/site/home.css');
const themeTs = read('theme.ts');

/** The declarations of the first rule whose selector is exactly `selector`. */
const block = (css: string, selector: string): string => {
  const start = css.indexOf(`\n${selector} {`);
  expect(start, `${selector} in the CSS`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf('\n}', start)).replace(/\/\*[\s\S]*?\*\//g, '');
};
/** Every `--name: #rrggbb` in a block. */
const colourVars = (decls: string): Record<string, string> =>
  Object.fromEntries(
    [...decls.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2].toLowerCase()]),
  );

/** Night roles the public pages don't draw (yet). None today: every night role is in .vcm. */
const NIGHT_NOT_IN_CSS = new Set<string>([]);
/** Printed, the page, its cards and its bands are white, and what is drawn on a band is ink;
 *  everything else is the paper set. */
const PRINT_OVERRIDES: Record<string, string> = {
  ground: '#ffffff',
  surface: '#ffffff',
  inverse: '#ffffff',
  onInverse: paper.text.toLowerCase(),
  onInverseMuted: paper.textMuted.toLowerCase(),
};

/** The `.vcm` rule inside site.css's `@media print`. */
const printBlock = (): string => {
  const at = siteCss.indexOf('@media print {');
  expect(at, '@media print in site.css').toBeGreaterThanOrEqual(0);
  const start = siteCss.indexOf('\n  .vcm {', at);
  return siteCss.slice(start, siteCss.indexOf('\n  }', start)).replace(/\/\*[\s\S]*?\*\//g, '');
};

describe('colour tokens: one source', () => {
  it('names are roles, written the same way in CSS', () => {
    expect(cssName('textMuted')).toBe('text-muted');
    expect(cssName('surfaceQuietHover')).toBe('surface-quiet-hover');
  });

  it("the app's colours are CSS variables, one for each role, and each set fills every one", () => {
    expect(color.text).toBe('var(--vc-text)');
    expect(color.surfaceQuietHover).toBe('var(--vc-surface-quiet-hover)');
    const roles = Object.keys(appNight).sort();
    for (const set of [day, appPrint, paperRoles]) expect(Object.keys(set).sort()).toEqual(roles);
    expect(Object.keys(vcVars(day)).sort()).toEqual(
      Object.values(color)
        .map((v) => v.slice(4, -1))
        .sort(),
    );
    expect(mix(color.text, 7)).toBe('color-mix(in srgb, var(--vc-text) 7%, transparent)');
  });

  it("the app's night is the public pages' night, wherever a role is in both", () => {
    for (const [k, v] of Object.entries(appNight)) if (k in night) expect(v, k).toBe(night[k as keyof typeof night]);
  });

  it("the day is paper and ink with Mako's gold: no pollen, and gold is never text", () => {
    expect(day.accent).toBe(night.accent);
    expect(Object.values(day)).not.toContain(paper.accent);
    expect(day.accentText).toBe(day.text);
  });

  it("the app's sets read: text 4.5:1 on what it sits on, never light text on gold, edges 3:1", () => {
    const channel = (h: string, i: number) => {
      const c = parseInt(h.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const lum = (h: string) => 0.2126 * channel(h, 1) + 0.7152 * channel(h, 3) + 0.0722 * channel(h, 5);
    const ratio = (a: string, b: string) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };
    for (const [name, s] of Object.entries({ day, appNight, appPrint })) {
      const at = (fg: string, bg: string, min: number, what: string) =>
        expect(ratio(fg, bg), `${name}: ${what} ${fg} on ${bg}`).toBeGreaterThanOrEqual(min);
      for (const bg of ['ground', 'surface', 'surfaceRaised', 'surfaceQuiet', 'band'] as const) {
        at(s.text, s[bg], 4.5, `text on ${bg}`);
        at(s.textMuted, s[bg], 4.5, `muted text on ${bg}`);
      }
      for (const fg of ['ok', 'warn', 'error'] as const) {
        at(s[fg], s.ground, 4.5, `${fg} on the ground`);
        at(s[fg], s.surface, 4.5, `${fg} on a card`);
        at(s[fg], s[`${fg}Tint`], 4.5, `${fg} on its tint`);
        at(s.text, s[`${fg}Tint`], 4.5, `text on the ${fg} tint`);
      }
      at(s.onAccent, s.accent, 4.5, 'text on the gold');
      at(s.onAccent, s.accentHover, 4.5, 'text on the gold under the pointer');
      at(s.accentText, s.ground, 4.5, 'gold as text on the ground');
      at(s.accentText, s.surface, 4.5, 'gold as text on a card');
      at(s.onInverse, s.inverse, 4.5, 'text on the band');
      at(s.onInverseMuted, s.inverse, 4.5, 'muted text on the band');
      at(s.edge, s.ground, 3, "a field's or quiet button's edge on the ground");
      at(s.edge, s.surface, 3, "a field's edge on a card");
      // Never light text on gold: what is drawn on it is darker than it.
      expect(lum(s.onAccent), `${name}: text on gold is dark`).toBeLessThan(lum(s.accent));
      // "Needs a look" is not the brand's gold.
      expect(s.warn).not.toBe(s.accent);
    }
    // Printed, the page is white, and the gold is a light fill (a printer drops it; with
    // background graphics on, ink still reads on it).
    expect(appPrint.ground).toBe('#FFFFFF');
    expect(lum(appPrint.accent)).toBeGreaterThan(0.4);
  });

  it("site.css's .vcm holds every night token, at its value, and no other colour variable", () => {
    const vars = colourVars(block(siteCss, '.vcm'));
    const want = Object.fromEntries(
      Object.entries(night)
        .filter(([k]) => !NIGHT_NOT_IN_CSS.has(k))
        .map(([k, v]) => [`--${cssName(k)}`, v.toLowerCase()]),
    );
    expect(vars).toEqual(want);
  });

  it("home.css's .vcm .home sets no colour of its own: it draws with .vcm's night", () => {
    expect(colourVars(block(homeCss, '.vcm .home'))).toEqual({});
  });

  it('printed, every colour .vcm sets is a paper token (the page and its cards white)', () => {
    const print = colourVars(printBlock());
    expect(Object.keys(print).sort()).toEqual(Object.keys(colourVars(block(siteCss, '.vcm'))).sort());
    const paperValues = new Set(Object.values(paper).map((v) => v.toLowerCase()));
    for (const [name, value] of Object.entries(print)) {
      const role = name.slice(2).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      if (role in PRINT_OVERRIDES) expect(value, name).toBe(PRINT_OVERRIDES[role]);
      else if (role in paper) expect(value, name).toBe(paper[role as keyof typeof paper].toLowerCase());
      else expect(paperValues.has(value) || value === '#ffffff', `${name} ${value}`).toBe(true);
    }
  });

  it('printed, every colour variable used as text reads on white paper (4.5:1 or more)', () => {
    // Browsers drop backgrounds when printing, so whatever fill text sat on, it lands on white.
    // Text in `var(--ground)` printed white and gold text pollen (1.4:1) (review of PR 181).
    const print = colourVars(printBlock());
    const channel = (h: string, i: number) => {
      const c = parseInt(h.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const lum = (h: string) => 0.2126 * channel(h, 1) + 0.7152 * channel(h, 3) + 0.0722 * channel(h, 5);
    const onWhite = (h: string) => 1.05 / (lum(h) + 0.05);
    const partnersCss = read('../components/partners/partners.css');
    const used = new Set<string>();
    for (const css of [siteCss, homeCss, partnersCss])
      for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?:^|[;\s{])color:\s*var\((--[\w-]+)/g))
        used.add(m[1]);
    expect(used.size).toBeGreaterThan(5);
    for (const name of used) {
      if (!(name in print)) continue; // not a .vcm colour (a page's own variable)
      expect(print[name], name).not.toBe('#ffffff');
      expect(print[name], name).not.toBe(paper.accent.toLowerCase());
      expect(onWhite(print[name]), `${name} ${print[name]} on white`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('every token value is a #RRGGBB colour', () => {
    for (const v of [paper, night, appNight, day, appPrint].flatMap((s) => Object.values(s)))
      expect(v).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('theme.ts takes its colours from tokens.ts: none of their values is written there', () => {
    const code = themeTs.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const values = new Set([...Object.values(paper), ...Object.values(night)].map((v) => v.toUpperCase()));
    const written = [...code.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toUpperCase());
    expect(written.filter((h) => values.has(h))).toEqual([]);
  });

  it('the old colour names are gone from theme.ts', () => {
    expect(themeTs).not.toMatch(
      /export const (POLLEN|INK_COLOR|MUTED_COLOR|GROUND|SHEET|WASH|WASH_STRONG|HAIRLINE|OK_COLOR|ERROR_COLOR|LINE_COLOR)\b/,
    );
  });
});
