// One source for colours (config/tokens.ts): the CSS variables in site.css (`.vcm`, the paper
// set) and home.css (`.vcm .home`, the night set) carry the same names and the same values,
// and theme.ts writes none of the token values itself.
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

/** Night roles the dark baseline in theme.ts uses, not home.css. */
const NIGHT_NOT_IN_CSS = new Set(['ok', 'error']);

describe('colour tokens: one source', () => {
  it('names are roles, written the same way in CSS', () => {
    expect(cssName('textMuted')).toBe('text-muted');
    expect(cssName('surfaceQuietHover')).toBe('surface-quiet-hover');
    expect(color).toBe(paper);
  });

  it("site.css's .vcm holds every paper token, at its value, and no other colour variable", () => {
    const vars = colourVars(block(siteCss, '.vcm'));
    const want = Object.fromEntries(Object.entries(paper).map(([k, v]) => [`--${cssName(k)}`, v.toLowerCase()]));
    expect(vars).toEqual(want);
  });

  it("home.css's .vcm .home holds every night token, at its value, and no other colour variable", () => {
    const vars = colourVars(block(homeCss, '.vcm .home'));
    const want = Object.fromEntries(
      Object.entries(night)
        .filter(([k]) => !NIGHT_NOT_IN_CSS.has(k))
        .map(([k, v]) => [`--${cssName(k)}`, v.toLowerCase()]),
    );
    expect(vars).toEqual(want);
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
