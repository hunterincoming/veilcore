// The notice that dating on Midnight is paused: off unless a build turns it on, the same
// words in every language, and shown on the public pages and in the app when on.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { en } from '../i18n/en';
import { de } from '../i18n/de';
import { es } from '../i18n/es';
import { fr } from '../i18n/fr';
import { ja } from '../i18n/ja';
import { DATING_PAUSED } from '../config/network';
import { DatingPausedNotice } from './DatingPausedNotice';

const KEY = 'notice.datingPaused';

const render = async (on?: boolean): Promise<string> => {
  const { LanguageProvider } = await import('../i18n');
  vi.stubGlobal('window', {
    localStorage: { getItem: () => null, setItem: () => undefined },
    location: { search: '' },
  });
  try {
    return renderToStaticMarkup(
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(DatingPausedNotice, on === undefined ? {} : { on }),
      ),
    );
  } finally {
    vi.stubGlobal('window', undefined);
  }
};

afterEach(() => vi.unstubAllGlobals());

describe('the dating-paused notice', () => {
  it('is off by default: a build without VITE_DATING_PAUSED=true shows nothing', async () => {
    expect(DATING_PAUSED).toBe(false);
    expect(await render()).toBe('');
    expect(await render(false)).toBe('');
  });

  it('says exactly the agreed words when on', async () => {
    const html = await render(true);
    expect(html).toContain('role="status"');
    expect(html).toContain(
      'Dating on Midnight is paused for Midnight&#x27;s network upgrade. Your records are saved and will be dated when it&#x27;s back.',
    );
  });

  it('exists in all five languages, each naming Midnight twice, as the English does', () => {
    for (const [lang, catalog] of Object.entries({ en, de, es, fr, ja })) {
      const text = (catalog as Record<string, string>)[KEY];
      expect(text, lang).toBeTypeOf('string');
      expect(text.match(/Midnight/g), lang).toHaveLength(2);
      if (lang !== 'en') expect(text, lang).not.toBe(en[KEY]);
    }
  });

  it('sits in the one header, which the public pages, the app and the check pages all have', () => {
    const at = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf8');
    expect(at('./SiteHeader.tsx')).toContain('<DatingPausedNotice />');
    expect(at('./site/SiteShell.tsx')).toContain('<SiteHeader />');
    // The app's frame and the check pages' frame (App.tsx).
    expect(at('../App.tsx').match(/<SiteHeader\b/g)?.length).toBe(2);
  });
});
