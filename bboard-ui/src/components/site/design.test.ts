// The 15 October 2026 redesign's promises, checked against the files:
//   - the landing page and the app are one product: site.css and config/theme.ts carry the
//     same colours and the same typeface;
//   - the public pages draw no rules or outlined boxes (the founder's brief: "with all the
//     lines separating everything you can tell the site was built by ai"); the only edge is
//     the one round a text field, so people can see where to type;
//   - a founder's role ("Co-Founder & CEO · Tokyo") is set as title and place on two lines,
//     with the translations' words unchanged, in every language.
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
const themeHex = (name: string) => new RegExp(`export const ${name} = '(#[0-9A-Fa-f]{6})'`).exec(themeTs)?.[1];
const GROUND = themeHex('GROUND') ?? '';
const INK_COLOR = themeHex('INK_COLOR') ?? '';
const MUTED_COLOR = themeHex('MUTED_COLOR') ?? '';
const ACCENT = themeHex('ACCENT') ?? '';
const WASH = themeHex('WASH') ?? '';
const FONT = /export const FONT =\s*'([^']+)'/.exec(themeTs)?.[1] ?? '';
const split = /export const roleParts = \(text: string\): string\[\] => text\.split\(\/(.+?)\/\);/.exec(shellTsx)?.[1];
const roleParts = (text: string) => text.split(new RegExp(split ?? 'missing'));
const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(siteCss)?.[1]?.toLowerCase();
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
