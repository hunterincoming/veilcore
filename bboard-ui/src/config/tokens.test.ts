// One source for colours (config/tokens.ts): the CSS variables in site.css (`.vcm`, the night
// set every public page draws with; its print block, the paper set) carry the same names and
// the same values; home.css (`.vcm .home`) takes them from .vcm and sets none of its own; and
// theme.ts writes none of the token values itself.
// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { color, cssName, night, paper } from './tokens';

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
    expect(color).toBe(paper);
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

  it('every token value is a #RRGGBB colour', () => {
    for (const v of [...Object.values(paper), ...Object.values(night)]) expect(v).toMatch(/^#[0-9A-F]{6}$/);
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
