// Being found (findable.ts): veilcore.org is indexed and every other build isn't; what llms.txt
// says matches the site's own facts and the app's license switch; the schema.org data is inert.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import {
  SITE,
  SITE_PAGES,
  WHERE_LABEL,
  agreementsLive,
  llmsFullTxt,
  llmsTxt,
  robotsTxt,
  sitemapXml,
  statusFlags,
  statusItems,
  structuredData,
  type StatusFlags,
} from '../findable';
import {
  AGREEMENTS_LIVE,
  DEVICE_ONLY_CLAIMS_RUN_ON_MAINNET,
  DEVICE_ONLY_RUN_ON_MAINNET,
  DOCUMENT_CHAIN_RUN_ON_MAINNET,
  LAB_SIGNING_RUN_ON_MAINNET,
  ROYALTIES_RUN_ON_MAINNET,
} from './config/copy';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const FLAG_NAMES = [
  'agreementsLive',
  'royaltiesRunOnMainnet',
  'labSigningRunOnMainnet',
  'deviceOnlyRunOnMainnet',
  'deviceOnlyClaimsRunOnMainnet',
  'documentChainRunOnMainnet',
] as const;
/** Every combination of the switches llms.txt reads. */
const ALL_FLAGS: StatusFlags[] = Array.from(
  { length: 2 ** FLAG_NAMES.length },
  (_, n) => Object.fromEntries(FLAG_NAMES.map((k, i) => [k, ((n >> i) & 1) === 1])) as unknown as StatusFlags,
);
const OFF = ALL_FLAGS[0];

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

  it("reads the app's own switches", () => {
    expect(agreementsLive(ROOT)).toBe(AGREEMENTS_LIVE);
    expect(statusFlags(ROOT)).toEqual({
      agreementsLive: AGREEMENTS_LIVE,
      royaltiesRunOnMainnet: ROYALTIES_RUN_ON_MAINNET,
      labSigningRunOnMainnet: LAB_SIGNING_RUN_ON_MAINNET,
      deviceOnlyRunOnMainnet: DEVICE_ONLY_RUN_ON_MAINNET,
      deviceOnlyClaimsRunOnMainnet: DEVICE_ONLY_CLAIMS_RUN_ON_MAINNET,
      documentChainRunOnMainnet: DOCUMENT_CHAIN_RUN_ON_MAINNET,
    });
  });

  it("llms.txt puts each feature in the same row as the README's status table", () => {
    const readme = fs.readFileSync(path.resolve(ROOT, '..', 'README.md'), 'utf8');
    const row = (label: string) => {
      const line = readme.split('\n').find((l) => l.startsWith(`| **${label}** |`));
      expect(line, `README status row "${label}"`).toBeDefined();
      return line ?? '';
    };
    const items = statusItems(statusFlags(ROOT));
    for (const item of items) {
      expect(row(WHERE_LABEL[item.where]), `${item.text} (README row "${WHERE_LABEL[item.where]}")`).toMatch(item.key);
      // ...and in no other row.
      for (const [w, label] of Object.entries(WHERE_LABEL))
        if (w !== item.where && readme.includes(`| **${label}** |`))
          expect(row(label), `${item.text} also in README row "${label}"`).not.toMatch(item.key);
    }
    const t = llmsTxt(statusFlags(ROOT));
    for (const item of items) expect(t).toContain(item.text);
  });

  it('llms.txt says what VeilCore is and is not, plainly, in the llms.txt shape', () => {
    for (const flags of ALL_FLAGS) {
      const t = llmsTxt(flags);
      expect(t.startsWith('# VeilCore\n\n> ')).toBe(true);
      expect(t).toMatch(/prior possession/);
      expect(t).toMatch(/not ownership/);
      expect(t).toMatch(/does not test DNA/);
      expect(t).toMatch(/No token/);
      expect(t).toMatch(/No formal security audit/);
      expect(t).not.toMatch(/licence|cannabis|NIGHTGATE|—|customers|pilot/i);
      expect(t).toMatch(/^## Documents$/m);
    }
    expect(llmsTxt(OFF)).toMatch(/switched off until a final test run/);
    for (const f of ALL_FLAGS.filter((x) => x.agreementsLive)) {
      expect(llmsTxt(f)).not.toMatch(/switched off until a final test run/);
      // Handing a license on has not run on mainnet: never in the live line.
      expect(llmsTxt(f)).toMatch(/^- Built, not yet run on mainnet: .*handing a license on/m);
      expect(llmsTxt(f)).not.toMatch(/^- Live on veilcore\.org: .*handing a license on/m);
    }
  });

  it('llms-full.txt carries the three documents the site serves', () => {
    const full = llmsFullTxt(ROOT, OFF);
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
