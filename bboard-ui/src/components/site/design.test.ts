// The 15 October 2026 redesign's promises, checked against the files:
//   - the landing page and the app are one product: site.css and config/theme.ts carry the
//     same colours and the same typeface;
//   - the public pages draw no rules or outlined boxes (the founder's brief: "with all the
//     lines separating everything you can tell the site was built by ai"); the only edge is
//     the one round a text field, so people can see where to type;
//   - a founder's role ("Co-Founder & CEO · Tokyo") is set as title and place on two lines,
//     with the translations' words unchanged, in every language;
//   - the palette (16 October 2026; notary blue 17 October 2026): no green brand. Paper,
//     Graphite and one colour, notary blue (the ink notaries sign and stamp in); red only for
//     errors; the brand pair at least 7:1 as text and under white; notary blue, the ✓ green
//     and the error red stay apart for red-green and blue-yellow colour-blind readers.
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
const NOTARY = themeHex('NOTARY') ?? '';
const WASH = themeHex('WASH') ?? '';
const OK_COLOR = themeHex('OK_COLOR') ?? '';
const ERROR_COLOR = themeHex('ERROR_COLOR') ?? '';
const NOTARY_DEEP = themeHex('NOTARY_DEEP') ?? '';
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
    for (const c of [GROUND, INK_COLOR, MUTED_COLOR, NOTARY, WASH]) expect(c).toMatch(/^#/);
    expect(token('ground')).toBe(GROUND.toLowerCase());
    expect(token('ink')).toBe(INK_COLOR.toLowerCase());
    expect(token('muted')).toBe(MUTED_COLOR.toLowerCase());
    expect(token('notary')).toBe(NOTARY.toLowerCase());
    expect(token('notary-deep')).toBe(NOTARY_DEEP.toLowerCase());
    expect(token('wash')).toBe(WASH.toLowerCase());
  });

  it('the same typeface, first in both lists', () => {
    const site = /--font:\s*'([^']+)'/.exec(siteCss)?.[1];
    expect(site).toBe('Atkinson Hyperlegible Next Variable');
    expect(FONT.startsWith(`"${site}"`)).toBe(true);
  });
});

describe('the palette: paper, graphite and notary blue; red only for errors; no green brand', () => {
  it('the five colours are the ones the founder signed off', () => {
    expect({ GROUND, INK_COLOR, MUTED_COLOR, NOTARY, NOTARY_DEEP, WASH }).toEqual({
      GROUND: '#F3F5F7',
      INK_COLOR: '#1E2227',
      MUTED_COLOR: '#575E66',
      NOTARY: '#1C3BB0',
      NOTARY_DEEP: '#152C86',
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

  it('the brand is notary blue: a saturated blue, its deep shade the same hue, darker', () => {
    for (const c of [NOTARY, NOTARY_DEEP]) {
      const { hue, sat } = hueSat(c);
      expect(hue).toBeGreaterThan(215);
      expect(hue).toBeLessThan(240);
      expect(sat).toBeGreaterThan(0.6);
    }
    expect(lum(NOTARY_DEEP)).toBeLessThan(lum(NOTARY));
  });

  it('notary blue reads at 7:1 (WCAG AAA) as text on Tag and Paper, and under white text', () => {
    for (const c of [NOTARY, NOTARY_DEEP]) {
      for (const ground of ['#FFFFFF', GROUND])
        expect(contrast(c, ground), `${c} on ${ground}`).toBeGreaterThanOrEqual(7);
      expect(contrast('#FFFFFF', c), `white on ${c}`).toBeGreaterThanOrEqual(7);
    }
  });

  it('red means a problem: the error is red, and no other shared colour is', () => {
    const err = hueSat(ERROR_COLOR).hue;
    expect(err < 30 || err > 330).toBe(true);
    const hexes = (src: string) => [...rules(src).matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toUpperCase());
    const reds = [
      ...hexes(siteCss),
      ...hexes(themeTs),
      ...hexes(partnersCss),
      ...hexes(flowFrameTsx),
      ...hexes(faviconSvg),
    ].filter((h) => {
      const { hue, sat } = hueSat(h);
      return (hue < 30 || hue > 330) && sat > 0.3;
    });
    // The error, its note's pale tint, and the same error lightened for the dark baseline.
    expect(new Set(reds)).toEqual(new Set([ERROR_COLOR.toUpperCase(), '#FBECE6', '#F4A27F']));
  });

  it('notary blue, the ✓ green and the error red stay apart for colour-blind readers', () => {
    // Machado, Oliveira & Fernandes (2009) at full severity, on linear RGB; distance in CIELAB.
    const SIM = {
      none: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      protanopia: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
      deuteranopia: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
      tritanopia: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
    };
    const lab = (hex: string, m: number[]) => {
      const c = [1, 3, 5]
        .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      const [r, g, b] = [0, 1, 2].map((i) =>
        Math.min(1, Math.max(0, m[i * 3] * c[0] + m[i * 3 + 1] * c[1] + m[i * 3 + 2] * c[2])),
      );
      const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
      const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.9505);
      const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
      const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.089);
      return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
    };
    const dE = (a: string, b: string, m: number[]) => Math.hypot(...lab(a, m).map((v, i) => v - lab(b, m)[i]));
    for (const [name, m] of Object.entries(SIM)) {
      const pairs = [
        [NOTARY, OK_COLOR],
        [NOTARY, ERROR_COLOR],
        [OK_COLOR, ERROR_COLOR],
      ];
      for (const [a, b] of pairs) expect(dE(a, b, m), `${a} vs ${b}, ${name}`).toBeGreaterThan(15);
    }
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
      for (const text of [INK_COLOR, MUTED_COLOR, NOTARY, NOTARY_DEEP, OK_COLOR, ERROR_COLOR])
        expect(contrast(text, ground), `${text} on ${ground}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(token('on-dark-muted') ?? '', INK_COLOR)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('on-dark-notary') ?? '', INK_COLOR)).toBeGreaterThanOrEqual(7);
  });

  it("the app's four jobs: a register's inks, readable, none notary blue, none red, none green", () => {
    const inks = Object.fromEntries(
      [...flowFrameTsx.matchAll(/^\s+(\w+): \{ name: '[^']+', color: ('#[0-9A-Fa-f]{6}'|INK_COLOR)/gm)].map((m) => [
        m[1],
        m[2] === 'INK_COLOR' ? INK_COLOR : m[2].slice(1, -1),
      ]),
    );
    expect(Object.keys(inks)).toEqual(['log', 'send', 'license', 'prove']);
    expect(inks.log).toBe(INK_COLOR);
    for (const ink of Object.values(inks)) {
      expect(ink).not.toBe(NOTARY);
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
    expect(faviconSvg.toLowerCase()).toContain(NOTARY.toLowerCase());
  });

  it('the hero note points at the line in the brand colour: blue, never green or red', () => {
    for (const strings of [en, ja, de, es, fr] as Record<string, string>[])
      for (const key of ['m.hero.note', 'm.hero.noteShort']) {
        expect(strings[key]).not.toMatch(/green|grün|verde|vert|緑|\bred\b|\brote\b|roja|rouge|赤/i);
        expect(strings[key]).toMatch(/blue|blaue|azul|bleue|青/i);
      }
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
