// What the screenshot run and its contact sheet share: languages, widths, file names, folder.
// SPDX-License-Identifier: Apache-2.0
import path from 'node:path';

export const LANGS = [
  { lang: 'en', locale: 'en-US' },
  { lang: 'ja', locale: 'ja-JP' },
] as const;

/** A phone (iPhone 14's CSS size) and a laptop. */
export const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
} as const;

export const shotsDir = (): string => path.resolve(process.env.SHOTS_DIR ?? path.join(import.meta.dirname, 'out'));

/** `/records/import` in ja on a phone -> `records_import.ja.phone.png`. */
export const shotName = (lang: string, viewport: string, p: string): string =>
  `${p.replace(/^\//, '').replace(/[^A-Za-z0-9-]+/g, '_') || 'home'}.${lang}.${viewport}.png`;
