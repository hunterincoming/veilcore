// The 15 October 2026 redesign's promises, checked against the files:
//   - the landing page and the app are one product: site.css and config/theme.ts carry the
//     same colours and the same typeface;
//   - the public pages draw no rules or outlined boxes (the founder's brief: "with all the
//     lines separating everything you can tell the site was built by ai"); the only edge is
//     the one round a text field, so people can see where to type;
//   - a founder's role ("Co-Founder & CEO · Tokyo") is set as title and place on two lines,
//     with the translations' words unchanged, in every language;
//   - the palette (16 October 2026): no green brand. Paper, Graphite and one accent, the red
//     of a date stamp, blue-leaning (not terracotta, not orange); errors in a different,
//     browner red; every text pair at least 4.5:1.
// Run: npx vitest run src/components/site/design.test.ts
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { en } from '../../i18n/en';
import { ja } from '../../i18n/ja';
import { de } from '../../i18n/de';
import { es } from '../../i18n/es';
import { fr } from '../../i18n/fr';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteCss = fs.readFileSync(path.join(here, 'site.css'), 'utf8');
const partnersCss = fs.readFileSync(path.join(here, '../partners/partners.css'), 'utf8');
// Read as text, like load-split.test.ts: importing theme.ts or SiteShell.tsx would load MUI.
const themeTs = fs.readFileSync(path.join(here, '../../config/theme.ts'), 'utf8');
const shellTsx = fs.readFileSync(path.join(here, 'SiteShell.tsx'), 'utf8');
const flowFrameTsx = fs.readFileSync(path.join(here, '../flow/FlowFrame.tsx'), 'utf8');
const indexHtml = fs.readFileSync(path.join(here, '../../../index.html'), 'utf8');
const faviconSvg = fs.readFileSync(path.join(here, '../../../public/favicon.svg'), 'utf8');
const themeHex = (name: string) => new RegExp(`export const ${name} = '(#[0-9A-Fa-f]{6})'`).exec(themeTs)?.[1];
const GROUND = themeHex('GROUND') ?? '';
const INK_COLOR = themeHex('INK_COLOR') ?? '';
const MUTED_COLOR = themeHex('MUTED_COLOR') ?? '';
const ACCENT = themeHex('ACCENT') ?? '';
const WASH = themeHex('WASH') ?? '';
const OK_COLOR = themeHex('OK_COLOR') ?? '';
const ERROR_COLOR = themeHex('ERROR_COLOR') ?? '';
const ACCENT_DEEP = themeHex('ACCENT_DEEP') ?? '';
const FONT = /export const FONT =\s*'([^']+)'/.exec(themeTs)?.[1] ?? '';
const split = /export const roleParts = \(text: string\): string\[\] => text\.split\(\/(.+?)\/\);/.exec(shellTsx)?.[1];
const roleParts = (text: string) => text.split(new RegExp(split ?? 'missing'));
const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(siteCss)?.[1]?.toLowerCase();
/** WCAG 2 contrast ratio of two #rrggbb colours. */
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** Hue in degrees and saturation (0..1, HSL) of a #rrggbb colour. */
const hueSat = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { hue: (h * 60 + 360) % 360, sat };
};
/** Declarations only: comments explain where lines used to be. */
const rules = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('one product: the site and the app share their tokens', () => {
  it('the same five colours', () => {
    for (const c of [GROUND, INK_COLOR, MUTED_COLOR, ACCENT, WASH]) expect(c).toMatch(/^#/);
    expect(token('ground')).toBe(GROUND.toLowerCase());
    expect(token('ink')).toBe(INK_COLOR.toLowerCase());
    expect(token('muted')).toBe(MUTED_COLOR.toLowerCase());
    expect(token('accent')).toBe(ACCENT.toLowerCase());
    expect(token('wash')).toBe(WASH.toLowerCase());
  });

  it('the same typeface, first in both lists', () => {
    const site = /--font:\s*'([^']+)'/.exec(siteCss)?.[1];
    expect(site).toBe('Atkinson Hyperlegible Next Variable');
    expect(FONT.startsWith(`"${site}"`)).toBe(true);
  });
});

describe('the palette: paper, graphite and one stamp red; no green brand', () => {
  it('the five colours are the ones the founder signed off', () => {
    expect({ GROUND, INK_COLOR, MUTED_COLOR, ACCENT, WASH }).toEqual({
      GROUND: '#F3F5F7',
      INK_COLOR: '#1E2227',
      MUTED_COLOR: '#575E66',
      ACCENT: '#B3173B',
      WASH: '#E6E9ED',
    });
  });

  it('Paper is a cool white, not cream; Graphite is a designed neutral, not a black tint', () => {
    const paper = hueSat(GROUND);
    expect(paper.hue).toBeGreaterThan(180);
    expect(paper.hue).toBeLessThan(260);
    const ink = hueSat(INK_COLOR);
    expect(ink.sat).toBeLessThan(0.2);
    expect(lum(INK_COLOR)).toBeGreaterThan(lum('#111111'));
  });

  it('the accent is a blue-leaning stamp red: not terracotta, not orange', () => {
    const { hue, sat } = hueSat(ACCENT);
    expect(hue).toBeGreaterThan(330);
    expect(sat).toBeGreaterThan(0.6);
    expect(contrast(ACCENT, '#D97757')).toBeGreaterThan(2);
  });

  it('an error is a different red from a date: browner, darker, on the other side of pure red', () => {
    expect(ERROR_COLOR).not.toBe(ACCENT);
    const err = hueSat(ERROR_COLOR).hue;
    expect(err).toBeGreaterThan(0);
    expect(err).toBeLessThan(30);
    expect(lum(ERROR_COLOR)).toBeLessThan(lum(ACCENT));
  });

  it('no colour in the shared tokens is green, except the ✓ of a check that passed', () => {
    const hexes = (src: string) => [...rules(src).matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toUpperCase());
    const greens = [...hexes(siteCss), ...hexes(themeTs), ...hexes(partnersCss), ...hexes(flowFrameTsx)].filter((h) => {
      const { hue, sat } = hueSat(h);
      return hue > 75 && hue < 175 && sat > 0.15;
    });
    // The ✓ colour, its note's pale tint, and the same ✓ lightened for the dark baseline.
    expect(new Set(greens)).toEqual(new Set([OK_COLOR.toUpperCase(), '#E4EFEA', '#7BC4A6']));
    expect(token('ok')).toBe(OK_COLOR.toLowerCase());
  });

  it('every text pair passes WCAG AA (4.5:1)', () => {
    for (const ground of [GROUND, '#FFFFFF', WASH]) {
      for (const text of [INK_COLOR, MUTED_COLOR, ACCENT, ACCENT_DEEP, OK_COLOR, ERROR_COLOR])
        expect(contrast(text, ground), `${text} on ${ground}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast('#FFFFFF', ACCENT)).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#FFFFFF', ACCENT_DEEP)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('on-dark-muted') ?? '', INK_COLOR)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('on-dark-accent') ?? '', INK_COLOR)).toBeGreaterThanOrEqual(4.5);
  });

  it("the app's four jobs: a register's inks, readable, none the stamp red, none green", () => {
    const inks = Object.fromEntries(
      [...flowFrameTsx.matchAll(/^\s+(\w+): \{ name: '[^']+', color: ('#[0-9A-Fa-f]{6}'|INK_COLOR)/gm)].map((m) => [
        m[1],
        m[2] === 'INK_COLOR' ? INK_COLOR : m[2].slice(1, -1),
      ]),
    );
    expect(Object.keys(inks)).toEqual(['log', 'send', 'license', 'prove']);
    expect(inks.log).toBe(INK_COLOR);
    for (const ink of Object.values(inks)) {
      expect(ink).not.toBe(ACCENT);
      expect(contrast(ink, WASH)).toBeGreaterThanOrEqual(4.5);
      const { hue, sat } = hueSat(ink);
      expect(hue > 75 && hue < 175 && sat > 0.15).toBe(false);
    }
    // A leaf said "plants only"; the Log icon is a calendar being written in.
    expect(flowFrameTsx).not.toMatch(/icons-material\/(Spa|Eco|Grass|Yard|LocalFlorist|Park|Forest)/);
  });

  it('the browser bar, the tab icon and the mark carry the same colours', () => {
    expect(/<meta name="theme-color" content="(#[0-9A-F]{6})"/.exec(indexHtml)?.[1]).toBe(GROUND);
    expect(indexHtml).toContain('href="/favicon.svg"');
    expect(faviconSvg.toLowerCase()).toContain(INK_COLOR.toLowerCase());
    expect(faviconSvg.toLowerCase()).toContain(ACCENT.toLowerCase());
  });

  it('no page tells people to look for "the green line"', () => {
    for (const strings of [en, ja, de, es, fr] as Record<string, string>[])
      for (const key of ['m.hero.note', 'm.hero.noteShort'])
        expect(strings[key]).not.toMatch(/green|grün|verde|vert|緑/i);
  });
});

describe('no lines between things on the public pages', () => {
  it('no rules: nothing draws a top, bottom, left or right border', () => {
    for (const css of [siteCss, partnersCss]) expect(rules(css)).not.toMatch(/border-(top|bottom|left|right)\s*:/);
  });

  it('no outlined boxes: the only solid border is the text field edge', () => {
    const solid = [...rules(siteCss).matchAll(/border:\s*[^;]*solid[^;]*;/g)].map((m) => m[0]);
    expect(solid).toEqual(['border: 1.5px solid var(--edge);']);
    expect(rules(partnersCss)).not.toMatch(/border:\s*[^;]*solid/);
  });

  it('every token the partners page uses is one site.css defines', () => {
    const used = new Set([...rules(partnersCss).matchAll(/var\(--([\w-]+)\)/g)].map((m) => m[1]));
    for (const name of used) if (!name.startsWith('vc-')) expect(siteCss).toContain(`--${name}:`);
  });
});

describe("a founder's role: title and place on two lines, words unchanged", () => {
  const langs = { en, ja, de, es, fr } as const;
  for (const [lang, strings] of Object.entries(langs))
    for (const key of ['m.mako.role', 'm.hunter.role'] as const)
      it(`${lang} ${key}`, () => {
        expect(split).toBeTruthy();
        const text = (strings as Record<string, string>)[key];
        const parts = roleParts(text);
        expect(parts).toHaveLength(2);
        expect(parts.join(' · ')).toBe(text);
      });
});
