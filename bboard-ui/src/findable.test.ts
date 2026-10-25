// Being found (findable.ts): veilcore.org is indexed and every other build isn't; what llms.txt
// says matches the site's own facts and the app's license switch; the schema.org data is inert.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  SITE,
  SITE_PAGES,
  agreementsLive,
  llmsFullTxt,
  llmsTxt,
  robotsTxt,
  sitemapXml,
  structuredData,
} from '../findable';
import { AGREEMENTS_LIVE } from './config/copy';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('being found', () => {
  it('veilcore.org names its sitemap; every other build disallows everything', () => {
    expect(robotsTxt(true)).toBe(`User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
    expect(robotsTxt(false)).toBe('User-agent: *\nDisallow: /\n');
  });

  it('the sitemap lists only public pages, and no date (a rebuild gives the same bytes)', () => {
    const xml = sitemapXml();
    for (const p of SITE_PAGES) expect(xml).toContain(`<loc>${SITE}${p}</loc>`);
    expect(xml).not.toMatch(/lastmod|\/records|\/backup|\/restore|\/license\/|\/lender/);
    expect(sitemapXml()).toBe(xml);
  });

  it("reads the app's own license switch", () => {
    expect(agreementsLive(ROOT)).toBe(AGREEMENTS_LIVE);
  });

  it('llms.txt says what VeilCore is and is not, plainly, in the llms.txt shape', () => {
    for (const live of [false, true]) {
      const t = llmsTxt(live);
      expect(t.startsWith('# VeilCore\n\n> ')).toBe(true);
      expect(t).toMatch(/prior possession/);
      expect(t).toMatch(/not ownership/);
      expect(t).toMatch(/does not test DNA/);
      expect(t).toMatch(/No token/);
      expect(t).toMatch(/No formal security audit/);
      expect(t).not.toMatch(/licence|cannabis|NIGHTGATE|—|customers|pilot/i);
      expect(t).toMatch(/^## Documents$/m);
    }
    expect(llmsTxt(false)).toMatch(/switched off until a final test run/);
    expect(llmsTxt(true)).not.toMatch(/switched off/);
  });

  it('llms-full.txt carries the three documents the site serves', () => {
    const full = llmsFullTxt(ROOT, false);
    expect(full).toContain('# The VeilCore Record Format');
    expect(full).toMatch(/#### 3\.6\.1 A record that names its own key/);
    expect(full.length).toBeGreaterThan(50_000);
  });

  it('the schema.org data is JSON with nothing that could close its script element', () => {
    const s = structuredData();
    expect(s).not.toMatch(/</);
    const d = JSON.parse(s) as { '@graph': { '@type': string }[] };
    expect(d['@graph'].map((x) => x['@type'])).toEqual(['Organization', 'WebSite']);
  });
});
