// The privacy policy veilcore.org shows at /privacy (PrivacyPolicy.tsx, i18n/privacy-policy/).
//
//   - every key the page shows exists in all five languages, keeps its {placeholders}, and is
//     really translated; no language has a key the English lacks;
//   - the English names every outside service a visitor's browser or our servers contact, and
//     the browser's list matches the site's security policy (scripts/vercel-config.mjs);
//   - it leaves out what is built but switched off on veilcore.org (paid plans, payments on
//     Midnight or Cardano), and says the page changes before any payment feature is turned on;
//   - no draft leftovers (a DRAFT banner, lawyer questions, bracketed placeholders), and nothing
//     about incorporation;
//   - only a mainnet build shows it: the test site keeps its short note.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { en } from '../../i18n/en';
import { LANGUAGES } from '../../i18n/catalogs';
import { policyEn } from '../../i18n/privacy-policy/en';
import { policyDe } from '../../i18n/privacy-policy/de';
import { policyEs } from '../../i18n/privacy-policy/es';
import { policyFr } from '../../i18n/privacy-policy/fr';
import { policyJa } from '../../i18n/privacy-policy/ja';
import { brokenPromises } from '../../i18n/promise-rule';
import { POLICY_KEYS, POLICY_UPDATED, policyDate } from './PrivacyPolicy';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => fs.readFileSync(path.resolve(HERE, rel), 'utf8');
const EN = policyEn as Record<string, string>;
const TRANSLATIONS: Record<string, Record<string, string>> = {
  de: policyDe,
  es: policyEs,
  fr: policyFr,
  ja: policyJa,
};
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const all = Object.values(EN).join('\n');

describe('the privacy policy in every language', () => {
  it('the page shows exactly the keys the English has', () => {
    expect([...POLICY_KEYS].sort()).toEqual(Object.keys(EN).sort());
    for (const k of POLICY_KEYS) expect(EN[k], k).toBeTruthy();
  });

  it('every language pack carries it', () => {
    const site = en as Record<string, string>;
    for (const k of POLICY_KEYS) expect(site[k], `en ${k}`).toBe(EN[k]);
    for (const [lang, pack] of Object.entries(LANGUAGES)) {
      const strings = pack.strings as Record<string, string>;
      for (const k of POLICY_KEYS) expect(strings[k], `${lang} ${k}`).toBeTruthy();
    }
  });

  for (const [lang, dict] of Object.entries(TRANSLATIONS))
    describe(lang, () => {
      it('has every key, and none the English lacks, with the same placeholders', () => {
        expect(Object.keys(dict).sort()).toEqual(Object.keys(EN).sort());
        for (const [k, v] of Object.entries(dict)) {
          expect(v.trim(), `${lang} ${k}`).not.toBe('');
          expect(placeholders(v), `${lang} ${k}`).toEqual(placeholders(EN[k]));
        }
      });
      it('is translated: only names (services, storage keys) read the same as the English', () => {
        const same = Object.entries(dict)
          .filter(([k, v]) => v === EN[k])
          .map(([k]) => k);
        for (const k of same)
          expect(k, `${lang} ${k} is still English`).toMatch(
            /\.(vercel|railway|blockfrost|backblaze)\.n$|^m\.pp\.col\.service$/,
          );
        if (lang === 'ja')
          for (const [k, v] of Object.entries(dict))
            expect(/[぀-ヿ㐀-鿿]/.test(v) || /\.n$/.test(k), `ja ${k}`).toBe(true);
      });
      it('keeps the facts the English states: numbers, addresses and service names', () => {
        for (const [k, v] of Object.entries(dict)) {
          const facts = (s: string) =>
            [
              ...s.matchAll(
                /\b\d+\b|hunter@veilcore\.org|mempool\.space|blockstream\.info|FreeTSA|DigiCert|Backblaze B2|Railway|Vercel|Blockfrost|OpenTimestamps|ICAR|veilcore[.-][\w<>-]+(?:\.[\w<>-]+)*/g,
              ),
            ].map((m) => m[0]);
          // Every one the English states is there (a language may add a digit of its own: 1日1回).
          const theirs = new Set(facts(v));
          expect(
            facts(EN[k]).filter((f) => !theirs.has(f)),
            `${lang} ${k}`,
          ).toEqual([]);
        }
      });
      it('keeps the promise rule: a "never leaves" sentence about what you typed says locked', () => {
        for (const [k, v] of Object.entries(dict)) expect(brokenPromises(v), `${lang} ${k}`).toEqual([]);
      });
    });

  it('English keeps the promise rule too', () => {
    for (const [k, v] of Object.entries(EN)) expect(brokenPromises(v), k).toEqual([]);
  });

  it('writes the date in the reader’s language', () => {
    expect(POLICY_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(policyDate('en')).toBe('20 November 2026');
    expect(policyDate('ja')).toBe('2026年11月20日');
    expect(policyDate('de')).toBe('20. November 2026');
  });
});

describe('what the English says', () => {
  it('names every outside service a browser or our servers contact', () => {
    for (const name of [
      'Vercel',
      'Railway',
      'Blockfrost',
      'Midnight',
      'OpenTimestamps',
      'FreeTSA',
      'DigiCert',
      'mempool.space',
      'blockstream.info',
      'Backblaze B2',
      'passkey provider',
      'A lab’s own website',
    ])
      expect(all, name).toContain(name);
  });

  it('lists the hosts the security policy lets a page reach, and no others', () => {
    // scripts/vercel-config.mjs writes files when run, so its source is read, not imported.
    // The policy describes veilcore.org with the Bitcoin check (site PR #148) deployed: its two
    // explorers are the only outside hosts the page may reach besides our own services.
    const cfg = read('../../../../scripts/vercel-config.mjs');
    const connect = /`connect-src 'self' \$\{API_ORIGIN\}([^`]*)`/.exec(cfg)?.[1] ?? '';
    expect(connect).toMatch(/^(?: \$\{BITCOIN_EXPLORERS\.join\(' '\)\})?\$\{chainOrigins\.length/);
    const explorers = /BITCOIN_EXPLORERS = \[([^\]]+)\]/.exec(cfg)?.[1];
    if (explorers !== undefined) {
      const hosts = [...explorers.matchAll(/'https:\/\/([^']+)'/g)].map((m) => m[1]);
      expect(hosts).toEqual(['mempool.space', 'blockstream.info']);
    }
    for (const h of ['mempool.space', 'blockstream.info']) expect(EN['m.pp.tech.network']).toContain(h);
    // The camera for this site only (scan, site PR #147), or for nobody; never the microphone or location.
    expect(cfg).toMatch(/'Permissions-Policy': 'camera=\((?:self)?\), microphone=\(\), geolocation=\(\)'/);
  });

  it('says no cookies, no analytics and no ads, and the site sets none', () => {
    expect(EN['m.pp.dont.2']).toMatch(/No ads, no analytics, .*no cookies/);
    const src = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
        const p = path.join(dir, d.name);
        if (d.isDirectory()) return src(p);
        return /\.(ts|tsx)$/.test(d.name) && !/\.test\.tsx?$/.test(d.name) ? [p] : [];
      });
    const code = src(path.resolve(HERE, '../..')).map((f) => fs.readFileSync(f, 'utf8'));
    for (const c of code) {
      expect(c).not.toMatch(/document\.cookie/);
      expect(c).not.toMatch(/googletagmanager|gtag\(|plausible\.io|posthog|@sentry|@vercel\/analytics/);
    }
  });

  it('leaves out payment features that are off on veilcore.org, and says it changes first', () => {
    expect(all).not.toMatch(/Paddle|paid plan|stablecoin|USDC|Cardano|in NIGHT|subscription|price/i);
    expect(EN['m.pp.pay.p']).toMatch(/Before any payment feature is turned on here, we will update this page\./);
    const copy = read('../../config/copy.ts');
    expect(copy).toMatch(/export const STABLECOIN_PAY_ON_MAINNET = false;/);
    expect(copy).toMatch(/export const ONCHAIN_PAYMENTS = !IS_MAINNET;/);
    expect(read('../../config/network.ts')).toMatch(
      /export const PAID_PLANS_ENABLED: boolean = import\.meta\.env\.VITE_PAID_PLANS === 'on';/,
    );
  });

  it('has no draft leftovers and says nothing about incorporation', () => {
    for (const lang of [EN, ...Object.values(TRANSLATIONS)])
      for (const [k, v] of Object.entries(lang)) {
        expect(v, k).not.toMatch(/\bDRAFT\b|TODO/);
        expect(v, k).not.toMatch(/not legal advice|lawyer|\[[^\]]*\]|to be set/i);
        expect(v, k).not.toMatch(/incorporat|法人化|gegründet|constituid|constituée/i);
      }
    expect(EN['m.pp.who.p']).toMatch(/VeilCore’s founders run this website, the registry and the fee sponsor/);
    expect(EN['m.pp.who.p']).toContain('hunter@veilcore.org');
  });

  it('says what stays after a deletion, and the retention the registry sets', () => {
    expect(EN['m.pp.rights.keep.p']).toMatch(/Anything on Midnight or Bitcoin\./);
    expect(EN['m.pp.server.results.keep']).toMatch(/180 days/);
    expect(EN['m.pp.server.prove.keep']).toMatch(/7 days/);
    expect(EN['m.pp.server.invites.keep']).toMatch(/30 days/);
  });
});

describe('where it shows', () => {
  it('only a mainnet build shows the policy; the test site keeps its note', () => {
    const page = read('./Privacy.tsx');
    expect(page).toMatch(/if \(IS_MAINNET\)\s*return \(\s*<SiteShell>\s*<PrivacyPolicy \/>/);
    expect(read('../../App.tsx')).toMatch(/\[\/\^\\\/privacy\/, IS_MAINNET \? 'Privacy policy' : 'Demo privacy'\]/);
  });
});
