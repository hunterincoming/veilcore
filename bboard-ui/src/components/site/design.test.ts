// The 15 October 2026 redesign's promises, checked against the files:
//   - the landing page and the app are one product: site.css and config/theme.ts carry the
//     same colours and the same typefaces;
//   - the public pages draw no rules or outlined boxes (the founder's brief: "with all the
//     lines separating everything you can tell the site was built by ai"); the only edge is
//     the one round a text field, so people can see where to type;
//   - a founder's role ("Co-Founder & CEO · Tokyo") is set as title and place on two lines,
//     with the translations' words unchanged, in every language;
//   - the palette (17 October 2026, pollen and ink): ink on herbarium paper and one colour,
//     pollen gold, clearly not Binance yellow or Bitcoin orange, a fill under ink and never
//     text on paper; red only for errors; pollen, the ✓ green, the error red and ink stay
//     apart for red-green and blue-yellow colour-blind readers;
//   - headings in a self-hosted Caslon with a stand-in sized to match, so nothing shifts.
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
const stampTsx = fs.readFileSync(path.join(here, '../DatedStamp.tsx'), 'utf8');
const fontsCss = fs.readFileSync(path.join(here, '../../fonts.css'), 'utf8');
const indexHtml = fs.readFileSync(path.join(here, '../../../index.html'), 'utf8');
const faviconSvg = fs.readFileSync(path.join(here, '../../../public/favicon.svg'), 'utf8');
const caslonFile = path.join(here, '../../../public/fonts/libre-caslon-text-700.woff2');
const partnerKit = fs.readFileSync(path.join(here, '../../../../partner-kit/record-check/src/element.ts'), 'utf8');
const themeHex = (name: string) => new RegExp(`export const ${name} = '(#[0-9A-Fa-f]{6})'`).exec(themeTs)?.[1];
const GROUND = themeHex('GROUND') ?? '';
const SHEET = themeHex('SHEET') ?? '';
const INK_COLOR = themeHex('INK_COLOR') ?? '';
const MUTED_COLOR = themeHex('MUTED_COLOR') ?? '';
const POLLEN = themeHex('POLLEN') ?? '';
const WASH = themeHex('WASH') ?? '';
const HAIRLINE = themeHex('HAIRLINE') ?? '';
const OK_COLOR = themeHex('OK_COLOR') ?? '';
const ERROR_COLOR = themeHex('ERROR_COLOR') ?? '';
const FONT = /export const FONT =\s*'([^']+)'/.exec(themeTs)?.[1] ?? '';
const split = /export const roleParts = \(text: string\): string\[\] => text\.split\(\/(.+?)\/\);/.exec(shellTsx)?.[1];
const roleParts = (text: string) => text.split(new RegExp(split ?? 'missing'));
const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(siteCss)?.[1]?.toLowerCase();
/** The brands the gold must never be taken for. */
const BINANCE_YELLOW = '#F3BA2F';
const BITCOIN_ORANGE = '#F7931A';

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
/** WCAG 2 contrast ratio of two #rrggbb colours. */
const lum = (hex: string) => {
  const [r, g, b] = channels(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** Hue in degrees and saturation (0..1, HSL) of a #rrggbb colour. */
const hueSat = (hex: string) => {
  const [r, g, b] = channels(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { hue: (h * 60 + 360) % 360, sat };
};
/** CIELAB (D65) of linear RGB, clamped. */
const labOfLinear = ([r, g, b]: number[]) => {
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
const lab = (hex: string) => labOfLinear(channels(hex).map(linear));
/** CIEDE2000 colour difference (Sharma, Wu & Dalal 2005). */
const de2000 = ([L1, a1, b1]: number[], [L2, a2, b2]: number[]) => {
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cb7 = ((C1 + C2) / 2) ** 7;
  const G = 0.5 * (1 - Math.sqrt(Cb7 / (Cb7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const h = (b: number, a: number) => (((Math.atan2(b, a) / rad) % 360) + 360) % 360;
  const h1p = h(b1, a1p);
  const h2p = h(b2, a2p);
  let dh = h2p - h1p;
  if (C1p * C2p === 0) dh = 0;
  else if (dh > 180) dh -= 360;
  else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh / 2) * rad);
  const Lb = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;
  const hb =
    C1p * C2p === 0
      ? h1p + h2p
      : Math.abs(h1p - h2p) <= 180
        ? (h1p + h2p) / 2
        : h1p + h2p < 360
          ? (h1p + h2p + 360) / 2
          : (h1p + h2p - 360) / 2;
  const T =
    1 -
    0.17 * Math.cos((hb - 30) * rad) +
    0.24 * Math.cos(2 * hb * rad) +
    0.32 * Math.cos((3 * hb + 6) * rad) -
    0.2 * Math.cos((4 * hb - 63) * rad);
  const Rc = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const Rt = -Math.sin(2 * 30 * Math.exp(-(((hb - 275) / 25) ** 2)) * rad) * Rc;
  const Sl = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2);
  const Sc = 1 + 0.045 * Cbp;
  const Sh = 1 + 0.015 * Cbp * T;
  const [x, y, z] = [(L2 - L1) / Sl, (C2p - C1p) / Sc, dH / Sh];
  return Math.sqrt(x * x + y * y + z * z + Rt * y * z);
};
/** Declarations only: comments explain where lines used to be. */
const rules = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const hexes = (src: string) => [...rules(src).matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toUpperCase());

describe('one product: the site and the app share their tokens', () => {
  it('the same colours', () => {
    for (const c of [GROUND, SHEET, INK_COLOR, MUTED_COLOR, POLLEN, WASH, HAIRLINE]) expect(c).toMatch(/^#/);
    expect(token('ground')).toBe(GROUND.toLowerCase());
    expect(token('sheet')).toBe(SHEET.toLowerCase());
    expect(token('ink')).toBe(INK_COLOR.toLowerCase());
    expect(token('muted')).toBe(MUTED_COLOR.toLowerCase());
    expect(token('pollen')).toBe(POLLEN.toLowerCase());
    expect(token('wash')).toBe(WASH.toLowerCase());
    expect(token('hairline')).toBe(HAIRLINE.toLowerCase());
  });

  it('the same body typeface, first in both lists', () => {
    const site = /--font:\s*'([^']+)'/.exec(siteCss)?.[1];
    expect(site).toBe('Atkinson Hyperlegible Next Variable');
    expect(FONT.startsWith(`"${site}"`)).toBe(true);
  });

  it('the same heading face: self-hosted Caslon, swapped in without moving anything', () => {
    expect(/--display:\s*'VeilCore Caslon', 'VeilCore Caslon fallback'/.test(siteCss)).toBe(true);
    expect(themeTs).toMatch(/DISPLAY_FONT = `"VeilCore Caslon", "VeilCore Caslon fallback"/);
    // Our own origin (font-src 'self'), shown at once in the stand-in, then swapped.
    expect(fontsCss).toMatch(/src: url\('\/fonts\/libre-caslon-text-700\.woff2'\) format\('woff2'\)/);
    expect(fontsCss).toMatch(/font-display: swap/);
    // The stand-in is a local serif scaled to Caslon's width and line metrics.
    for (const d of ['size-adjust', 'ascent-override', 'descent-override', 'line-gap-override'])
      expect(fontsCss).toMatch(new RegExp(`${d}: [0-9.]+%`));
    expect(indexHtml).toContain('<link rel="preload" href="/fonts/libre-caslon-text-700.woff2" as="font"');
    // One weight, subset: far under the 80 KB budget for added fonts.
    expect(fs.statSync(caslonFile).size).toBeLessThan(30 * 1024);
  });
});

describe('the palette: pollen and ink; red only for errors; no green brand', () => {
  it('the colours are the ones the founder signed off', () => {
    expect({ GROUND, SHEET, INK_COLOR, MUTED_COLOR, POLLEN, WASH, HAIRLINE }).toEqual({
      GROUND: '#F6F3EC',
      SHEET: '#FFFDF7',
      INK_COLOR: '#16181D',
      MUTED_COLOR: '#4B4740',
      POLLEN: '#F6DA3C',
      WASH: '#ECE6D8',
      HAIRLINE: '#E4DCC8',
    });
  });

  it('nothing is left of the blue, the red brand or the cool greys', () => {
    for (const src of [siteCss, partnersCss, themeTs, flowFrameTsx, faviconSvg, partnerKit])
      for (const old of ['#1C3BB0', '#152C86', '#A3B5F8', '#B3173B', '#F3F5F7', '#1E2227', '#575E66'])
        expect(hexes(src)).not.toContain(old);
    expect(themeTs).not.toMatch(/NOTARY/);
  });

  it('paper is warm archival paper; ink is a designed near-black, not a black tint', () => {
    for (const c of [GROUND, SHEET, WASH, HAIRLINE]) {
      const { hue } = hueSat(c);
      expect(hue).toBeGreaterThan(30);
      expect(hue).toBeLessThan(60);
      // A paper, not a colour: a little chroma only (CIELAB).
      const [, a, bb] = lab(c);
      expect(Math.hypot(a, bb)).toBeLessThan(12);
    }
    expect(lum(SHEET)).toBeGreaterThan(lum(GROUND));
    expect(hueSat(INK_COLOR).sat).toBeLessThan(0.2);
    expect(lum(INK_COLOR)).toBeGreaterThan(lum('#111111'));
  });

  it('pollen gold is clearly not Binance yellow or Bitcoin orange (CIEDE2000 10 or more)', () => {
    expect(de2000(lab(POLLEN), lab(BINANCE_YELLOW))).toBeGreaterThanOrEqual(10);
    expect(de2000(lab(POLLEN), lab(BITCOIN_ORANGE))).toBeGreaterThanOrEqual(10);
    // The formula itself, on Sharma's published pairs.
    expect(de2000([50, 2.6772, -79.7751], [50, 0, -82.7485])).toBeCloseTo(2.0425, 3);
    expect(de2000([50, 2.5, 0], [73, 25, -18])).toBeCloseTo(27.1492, 3);
  });

  it('ink on pollen reads at 10:1 or more; on the ink band pollen and paper read at 7:1 or more', () => {
    expect(contrast(INK_COLOR, POLLEN)).toBeGreaterThanOrEqual(10);
    expect(contrast(POLLEN, INK_COLOR)).toBeGreaterThanOrEqual(7);
    expect(contrast(token('on-dark') ?? '', INK_COLOR)).toBeGreaterThanOrEqual(7);
    expect(contrast(token('on-dark-muted') ?? '', INK_COLOR)).toBeGreaterThanOrEqual(7);
  });

  it('secondary text is a warm grey at 7:1 or more on the page and the sheet', () => {
    for (const ground of [GROUND, SHEET]) expect(contrast(MUTED_COLOR, ground)).toBeGreaterThanOrEqual(7);
    expect(hueSat(MUTED_COLOR).hue).toBeGreaterThan(20);
    expect(hueSat(MUTED_COLOR).hue).toBeLessThan(60);
  });

  it('pollen is never text on paper (1.3:1): only a fill, a mark or text on the ink band', () => {
    expect(contrast(POLLEN, GROUND)).toBeLessThan(1.5);
    // In the CSS, a pollen text colour only under the ink band, the dark section or the footer.
    for (const css of [siteCss, partnersCss])
      for (const m of rules(css).matchAll(/([^{};]+)\{([^{}]*)\}/g))
        if (/(^|[^-])color:\s*var\(--pollen\)/.test(m[2]))
          expect(m[1], m[1].trim()).toMatch(/hero|\.dark|\.demo|footer/);
    // In the app: never `color: POLLEN` (a fill, an underline or a ring only).
    for (const src of [themeTs, stampTsx]) expect(src).not.toMatch(/[^A-Za-z]color:\s*POLLEN/);
    // The partner kit's button is the accent under ink; its links are ink with an accent underline.
    expect(partnerKit).toMatch(/--_accent:var\(--vc-accent,#f6da3c\)/);
    expect(partnerKit).toMatch(/background:var\(--_accent\);color:var\(--_on\)/);
    expect(partnerKit).toMatch(/a\{color:var\(--_ink\)/);
  });

  it('red means a problem: the error is red, and no other shared colour is', () => {
    const err = hueSat(ERROR_COLOR).hue;
    expect(err < 30 || err > 330).toBe(true);
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

  it('pollen, the ✓ green, the error red and ink stay apart for colour-blind readers', () => {
    // Machado, Oliveira & Fernandes (2009) at full severity, on linear RGB; distance in CIELAB.
    // The numbers at the time of writing (ΔE76 / CIEDE2000):
    //              pollen-ok pollen-err pollen-ink  ok-err  ok-ink  err-ink
    //   normal       85/49     80/58     112/84     82/49   43/32   72/35
    //   protanopia   84/43     73/53     115/81     30/17   37/28   45/28
    //   deuteranopia 84/48     55/41     111/86     43/20   33/24   60/36
    //   tritanopia   65/54     68/46      81/78     94/54   40/30   77/33
    const SIM = {
      none: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      protanopia: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
      deuteranopia: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
      tritanopia: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
    };
    const seen = (hex: string, m: number[]) => {
      const c = channels(hex).map(linear);
      return labOfLinear(
        [0, 1, 2].map((i) => Math.min(1, Math.max(0, m[i * 3] * c[0] + m[i * 3 + 1] * c[1] + m[i * 3 + 2] * c[2]))),
      );
    };
    const colours = { pollen: POLLEN, ok: OK_COLOR, error: ERROR_COLOR, ink: INK_COLOR };
    const names = Object.keys(colours) as (keyof typeof colours)[];
    for (const [sim, m] of Object.entries(SIM))
      for (let i = 0; i < names.length; i++)
        for (let j = i + 1; j < names.length; j++) {
          const [a, b] = [seen(colours[names[i]], m), seen(colours[names[j]], m)];
          const label = `${names[i]} vs ${names[j]}, ${sim}`;
          expect(Math.hypot(...a.map((v, k) => v - b[k])), label).toBeGreaterThan(25);
          expect(de2000(a, b), label).toBeGreaterThan(15);
        }
  });

  it('no colour in the shared tokens is green, except the ✓ of a check that passed', () => {
    const greens = [...hexes(siteCss), ...hexes(themeTs), ...hexes(partnersCss), ...hexes(flowFrameTsx)].filter((h) => {
      const { hue, sat } = hueSat(h);
      return hue > 75 && hue < 175 && sat > 0.15;
    });
    // The ✓ colour, its note's pale tint, and the same ✓ lightened for the dark baseline.
    expect(new Set(greens)).toEqual(new Set([OK_COLOR.toUpperCase(), '#E4EFEA', '#7BC4A6']));
    expect(token('ok')).toBe(OK_COLOR.toLowerCase());
  });

  it('every text pair passes WCAG AA (4.5:1), ink AAA everywhere', () => {
    for (const ground of [GROUND, SHEET, WASH]) {
      for (const text of [INK_COLOR, MUTED_COLOR, OK_COLOR, ERROR_COLOR])
        expect(contrast(text, ground), `${text} on ${ground}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(INK_COLOR, ground)).toBeGreaterThanOrEqual(7);
    }
  });

  it("the app's four jobs: a register's inks, readable, none pollen, none red, none green", () => {
    const inks = Object.fromEntries(
      [...flowFrameTsx.matchAll(/^\s+(\w+): \{ name: '[^']+', color: ('#[0-9A-Fa-f]{6}'|INK_COLOR)/gm)].map((m) => [
        m[1],
        m[2] === 'INK_COLOR' ? INK_COLOR : m[2].slice(1, -1),
      ]),
    );
    expect(Object.keys(inks)).toEqual(['log', 'send', 'license', 'prove']);
    expect(inks.log).toBe(INK_COLOR);
    for (const ink of Object.values(inks)) {
      expect(ink).not.toBe(POLLEN);
      expect(contrast(ink, WASH)).toBeGreaterThanOrEqual(4.5);
      const { hue, sat } = hueSat(ink);
      expect(hue > 75 && hue < 175 && sat > 0.15).toBe(false);
    }
    // A leaf said "plants only"; the Log icon is a calendar being written in.
    expect(flowFrameTsx).not.toMatch(/icons-material\/(Spa|Eco|Grass|Yard|LocalFlorist|Park|Forest)/);
  });

  it('the browser bar, the tab icon and the mark carry the same colours', () => {
    expect(/<meta name="theme-color" content="(#[0-9A-F]{6})"/.exec(indexHtml)?.[1]).toBe(GROUND);
    // A version on the links, so browsers drop the old tab icon they cached (18-19 Oct: tag -> ring).
    expect(indexHtml).toMatch(/href="\/favicon\.svg\?v=\w+"/);
    expect(faviconSvg.toLowerCase()).toContain(INK_COLOR.toLowerCase());
    expect(faviconSvg.toLowerCase()).toContain(POLLEN.toLowerCase());
    // The mark is a badge with its own colours (ink disc, paper ring, pollen V), so it reads on a
    // light or dark tab bar alike and needs no dark-mode variant.
    expect(faviconSvg.toLowerCase()).toContain('#f6f3ec');
  });

  it('the hero note points at the strip in the brand colour: gold, never blue, green or red', () => {
    for (const strings of [en, ja, de, es, fr] as Record<string, string>[])
      for (const key of ['m.hero.note', 'm.hero.noteShort']) {
        expect(strings[key]).not.toMatch(
          /blue|blau|azul|bleu|青|green|grün|verde|vert|緑|\bred\b|\brote\b|roja|rouge|赤/i,
        );
        expect(strings[key]).toMatch(/gold|dorad|dorée|金/i);
      }
  });

  it('the DATED stamp is pollen only when real: a test network gets a dashed PRACTICE stamp', () => {
    expect(stampTsx).toMatch(/export type StampState = 'dated' \| 'practice' \| 'waiting'/);
    expect(stampTsx).toMatch(/background: dated\s*\?[^:]*POLLEN/);
    // It presses once, and not at all with reduced motion.
    expect(stampTsx).toMatch(/REDUCED_MOTION/);
    expect(siteCss).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none !important/);
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
