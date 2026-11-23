// The app's theme (theme.ts appTheme): MUI writes its dark colours under
// `prefers-color-scheme: dark`, which a printer matches too, so theme.ts moves them to screens
// only. That leans on MUI's own functions (generateStyleSheets, getColorSchemeSelector, MUI 9):
// this fails first if an MUI upgrade changes them, before a page prints dark.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { appColourStyles, appTheme } from './theme';

const BARE = '@media (prefers-color-scheme: dark)';
const SCREEN = '@media screen and (prefers-color-scheme: dark)';

/** Every key in a style object, at any depth. */
const keys = (o: unknown): string[] =>
  o && typeof o === 'object' ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => [k, ...keys(v)]) : [];

describe("the app theme's dark colours are for screens only", () => {
  it("MUI's style sheets: dark under the screen query, never the bare one", () => {
    const t = appTheme as unknown as { generateStyleSheets: () => unknown[] };
    const all = keys(t.generateStyleSheets());
    expect(all).toContain(SCREEN);
    expect(all).not.toContain(BARE);
    // The dark sheet sets MUI's colours: the night's ground is in it.
    expect(JSON.stringify(t.generateStyleSheets())).toMatch(/#0B0E14/i);
  });

  it("MUI's applyStyles('dark') (its own parts' dark looks) uses the screen query too", () => {
    const t = appTheme as unknown as { getColorSchemeSelector: (s: string) => string };
    expect(t.getColorSchemeSelector('dark')).toBe(SCREEN);
    expect(keys(appTheme.applyStyles('dark', { color: 'red' }))).toEqual([SCREEN, 'color']);
  });

  it("VeilCore's own colour variables: day, the night on a dark screen, and paper in print", () => {
    expect(Object.keys(appColourStyles)).toEqual(expect.arrayContaining([':root:root', SCREEN, '@media print']));
    expect(Object.keys(appColourStyles)).not.toContain(BARE);
  });
});
