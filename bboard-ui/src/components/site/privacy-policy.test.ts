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
//   - only a mainnet build shows it: the test site keeps its short note;
//   - its technical list names every browser storage key, IndexedDB database and cache the code
//     uses (a new key fails here until it is listed, or said not to be storage).
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
import { POLICY_KEYS, POLICY_UPDATED, TECH_STORAGE, policyDate } from './PrivacyPolicy';
import { MODEL_CACHES } from '../../ask-local/manifest';
import askModelManifest from '../../ask-local/model-manifest.json';
import { LAYOUTS_KEY, MAX_LAYOUTS } from '../../veilcore/import-layouts';
import { JOB_KEY } from '../../veilcore/bulk-import';
import { LEDGER_KEY } from '../../veilcore/bulk-import-ledger';
import { importing as importEn } from '../../i18n/app/en/import';
import { importing as importDe } from '../../i18n/app/de/import';
import { importing as importEs } from '../../i18n/app/es/import';
import { importing as importFr } from '../../i18n/app/fr/import';
import { importing as importJa } from '../../i18n/app/ja/import';

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
    expect(policyDate('en')).toBe('27 November 2026');
    expect(policyDate('ja')).toBe('2026年11月27日');
    expect(policyDate('de')).toBe('27. November 2026');
  });
});

describe('what the English says', () => {
  it('lists what a spreadsheet import keeps in the browser, and for how long, in every language', () => {
    // The import's own keys (import-layouts.ts, bulk-import.ts, bulk-import-ledger.ts) by the
    // names the code uses: the remembered columns, the last import's rows, and its ledger.
    const storage = (d: Record<string, string>) => TECH_STORAGE.map((n) => d[`m.pp.tech.${n}`]).join('\n');
    for (const key of [LAYOUTS_KEY, JOB_KEY, LEDGER_KEY]) {
      expect(storage(EN), key).toContain(key);
      for (const [lang, dict] of Object.entries(TRANSLATIONS)) expect(storage(dict), `${lang} ${key}`).toContain(key);
    }
    const row = EN['m.pp.device.import.p'];
    expect(row).toMatch(/until you choose your next file or press “Remove it” or “Import another file”/);
    // The cap the row states is the code's own.
    expect(MAX_LAYOUTS).toBe(20);
    expect(row).toMatch(/for up to 20 sheets \(the one used longest ago goes first\)/);
    expect(row).toMatch(
      /column is which, the row they are on and the defaults you set there \(breeder, species, ID system and date order\), until you press “Forget”/,
    );
    expect(row).toMatch(/Neither is sent to us\./);
    expect(EN['m.pp.browser.records.p']).toMatch(
      /the rows of your last spreadsheet import and any columns you chose to remember/,
    );
    // The buttons it names are the import page's own, in each language.
    const policies: Record<string, Record<string, string>> = { en: EN, ...TRANSLATIONS };
    const pages: Record<string, Record<string, string>> = {
      en: importEn,
      de: importDe,
      es: importEs,
      fr: importFr,
      ja: importJa,
    };
    for (const [lang, page] of Object.entries(pages))
      for (const button of ['app.import.last.remove', 'app.import.done.another', 'app.import.saved.forgetOne']) {
        expect(page[button], `${lang} ${button}`).toBeTruthy();
        expect(policies[lang]['m.pp.device.import.p'], `${lang} ${button}`).toContain(page[button]);
      }
  });

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

// ---- every storage name the code uses is in the technical list ----------------------------
//
// A name counts as storage when it is a `veilcore.` string anywhere in the site's code (the
// local storage naming), any `veilcore:` / `veilcore-` string in a file that touches browser
// storage (localStorage, sessionStorage, IndexedDB, Cache Storage, or the prover's file cache),
// a name built on one of those (`${KEY}.next.${id}`, KEY + '.x'), or the first argument of a
// storage call when it is a string or a constant, whatever it starts with (storageNames).
// Each must be in the policy's "Technical details" storage paragraphs, in every language, or
// below with the reason it isn't storage. A prefix (`veilcore.deal-outbox.v1.`) is listed with
// a placeholder after it (`veilcore.deal-outbox.v1.<deal>`).

const NOT_STORAGE: Readonly<Record<string, string>> = {
  'veilcore.': 'the prefix home-screen.ts counts keys by',
  'veilcore-': 'the prefix the service worker and Start over clear caches by',
  'veilcore.org': 'the site’s host name',
  'veilcore.records.v1': 'the registry’s collection name (api-store.ts kindFor); store.ts localStore is unused',
  'veilcore.licenses.v1': 'the registry’s collection name (api-store.ts kindFor); store.ts localStore is unused',
  'veilcore.vault.v1.probe': 'written and removed at once, to test that storage works',
  'veilcore.record-keys.v1.probe': 'written and removed at once, to test that storage works',
  'veilcore-records': 'the records package’s import name',
  'veilcore.ask.job-runner': 'a Web Lock name (its fallback lease is veilcore.lock.<task>)',
  'veilcore.bulk-ledger': 'a Web Lock name',
  'veilcore.vault': 'a Web Lock name',
  'veilcore.deal-send.': 'a Web Lock name',
  'veilcore-account-copy': 'a Web Lock name',
  'veilcore.e2e.tsa-pins': 'read only in the end-to-end build (VITE_E2E_FIXTURES)',
  'veilcore-active': 'a service worker message',
  'veilcore-check': 'a service worker message',
  'veilcore-release': 'a service worker message',
  'veilcore-send': 'the Background Sync tag',
  'veilcore-send-now': 'a service worker message',
  'veilcore-sw': 'a Trusted Types policy name',
  'veilcore-ask-model': 'a Trusted Types policy name',
  'veilcore-bulk-row-v1': 'a record format name',
  'veilcore-bulk-animal-row-v1': 'a record format name',
  'veilcore-record-keys': 'a backup file format name',
  'veilcore-records-': 'a download’s file name',
  'veilcore-deal-record-': 'a download’s file name',
  'veilcore-holder-key.txt': 'a download’s file name',
  'veilcore:change-role': 'a page event',
  'veilcore:lab-changed': 'a page event',
  'veilcore:license-code:v1': 'a hashing label',
  'veilcore:offer-id:v1:': 'a hashing label',
  'veilcore:party:': 'a hashing label',
  'veilcore:v1:dnapair': 'a hashing label',
  'veilcore:v1:lab-results:x25519': 'a hashing label',
  'veilcore:vault-id:v1:': 'a hashing label',
  'veilcore:vault:beneficiary:v1': 'a hashing label',
  'veilcore:vault:handle-tag:v1': 'a hashing label',
  'veilcore:vault:records:v1': 'a hashing label',
  'veilcore:onchain-sent':
    'royalties paid in NIGHT or Cardano stablecoins, off on veilcore.org (ONCHAIN_PAYMENTS = !IS_MAINNET, STABLECOIN_PAY_ON_MAINNET = false)',
  'veilcore:onchain-counted':
    'royalties paid in NIGHT or Cardano stablecoins, off on veilcore.org (ONCHAIN_PAYMENTS = !IS_MAINNET, STABLECOIN_PAY_ON_MAINNET = false)',
};

const SITE = path.resolve(HERE, '../..');
const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === 'fixtures' ? [] : sourceFiles(p);
    return /\.(ts|tsx|js|mjs)$/.test(d.name) && !/\.test\.tsx?$/.test(d.name) ? [p] : [];
  });
const TOUCHES_STORAGE = /localStorage|sessionStorage|indexedDB|caches\.|makeProviders[<(]/;
/** The first argument of a storage call: Web Storage, IndexedDB or Cache Storage. */
const STORAGE_CALL =
  /(?:[sS]torage\.(?:getItem|setItem|removeItem)|indexedDB\.(?:open|deleteDatabase)|caches\.(?:open|delete|has))\(\s*([^,)]+?)\s*[,)]/g;
/**
 * Every storage name the code uses:
 *   - a `veilcore.` string anywhere, or a `veilcore:` / `veilcore-` string in a file that touches
 *     storage (a template's text before its first `${`);
 *   - a name built on one of those in any file: `${KEY}.suffix` or KEY + '.suffix';
 *   - the first argument of any storage call, when it is a string, or a constant whose string is
 *     found in any file, whatever it starts with.
 */
const storageNames = (): Map<string, string> => {
  const found = new Map<string, string>();
  const files = [...sourceFiles(SITE), ...sourceFiles(path.resolve(SITE, '../offline'))].map(
    (f) => [path.relative(SITE, f), fs.readFileSync(f, 'utf8')] as const,
  );
  // Every string constant, by name: this file's own first, then any file's.
  const consts = new Map<string, Map<string, string>>();
  for (const [f, code] of files)
    for (const m of code.matchAll(/\bconst ([A-Za-z_$][\w$]*)(?:: string)? = (['"])([^'"\n]*)\2(?=\s*[;\n])/g)) {
      if (!consts.has(m[1])) consts.set(m[1], new Map());
      consts.get(m[1])!.set(f, m[3]);
    }
  const valueOf = (ident: string, f: string): string | undefined => {
    const byFile = consts.get(ident);
    if (!byFile) return undefined;
    if (byFile.has(f)) return byFile.get(f);
    // Another file's only for a constant's name (FOO_KEY), as an import would bring it.
    if (!/^[A-Z][A-Z0-9_]*$/.test(ident)) return undefined;
    const values = new Set(byFile.values());
    return values.size === 1 ? [...values][0] : undefined;
  };
  for (const [f, code] of files) {
    const touches = TOUCHES_STORAGE.test(code);
    for (const m of code.matchAll(/['"`](veilcore[.:-][\w.:-]*)(?=['"`]|\$\{)/g))
      if (m[1].startsWith('veilcore.') || touches) found.set(m[1], f);
  }
  const derived = new Map<string, string>();
  for (const [f, code] of files) {
    const touches = TOUCHES_STORAGE.test(code);
    for (const m of code.matchAll(
      /`\$\{([A-Za-z_$][\w$]*)\}([\w.:-]+)(?=`|\$\{)|\b([A-Z][A-Z0-9_]*) \+ ['"]([\w.:-]+)['"]/g,
    )) {
      const base = valueOf(m[1] ?? m[3], f);
      if (base !== undefined && found.has(base) && !(base in NOT_STORAGE)) derived.set(base + (m[2] ?? m[4]), f);
    }
    if (!touches) continue;
    for (const m of code.matchAll(STORAGE_CALL)) {
      const arg = m[1];
      const literal = /^(['"`])([^'"`$]*)\1$/.exec(arg)?.[2];
      const name = literal ?? (/^[A-Za-z_$][\w$]*$/.test(arg) ? valueOf(arg, f) : undefined);
      if (name) derived.set(name, f);
    }
  }
  for (const [n, f] of derived) if (!found.has(n)) found.set(n, f);
  return found;
};
/** The names a policy's storage paragraphs give, with any trailing full stop off. */
const listedNames = (dict: Record<string, string>): string[] =>
  TECH_STORAGE.flatMap((n) => [...dict[`m.pp.tech.${n}`].matchAll(/veilcore[.:-][\w.:<>-]*/g)]).map((m) =>
    m[0].replace(/\.+$/, ''),
  );
const isListed = (name: string, listed: readonly string[], text = ''): boolean =>
  name.startsWith('veilcore')
    ? listed.some((l) => l === name || (l.startsWith(name) && l[name.length] === '<'))
    : text.includes(name);
const storageText = (dict: Record<string, string>): string =>
  TECH_STORAGE.map((n) => dict[`m.pp.tech.${n}`]).join('\n');

describe('the technical list names every storage key the code uses', () => {
  const names = storageNames();

  it('finds the names (the scan itself works)', () => {
    for (const k of [
      LAYOUTS_KEY,
      JOB_KEY,
      LEDGER_KEY,
      'veilcore.holder.v1',
      'veilcore-offline',
      'veilcore-shell-',
      'veilcore.log-draft.v1.next.',
    ])
      expect(names.has(k), k).toBe(true);
  });

  for (const [lang, dict] of Object.entries({ en: EN, ...TRANSLATIONS }))
    it(`${lang}: every one is listed, or said not to be storage`, () => {
      const listed = listedNames(dict);
      const missing = [...names]
        .filter(([n]) => !(n in NOT_STORAGE) && !isListed(n, listed, storageText(dict)))
        .map(([n, f]) => `${n} (${f})`);
      expect(missing, 'add each to m.pp.tech.storage.* in every language, or to NOT_STORAGE with why').toEqual([]);
    });

  it('lists nothing the code no longer uses, and keeps no stale exemption', () => {
    const used = [...names.keys()];
    const gone = listedNames(EN).filter((l) => !used.some((n) => isListed(n, [l])));
    expect(gone, 'listed in the policy but not in the code').toEqual([]);
    expect(
      Object.keys(NOT_STORAGE).filter((n) => !names.has(n)),
      'NOT_STORAGE names the code no longer has',
    ).toEqual([]);
  });

  it('leaves out Ask’s model caches only while the model is not pinned for veilcore.org', () => {
    // WebLLM's caches (ask-local/manifest.ts MODEL_CACHES) hold the downloaded model. The model
    // is offered only once model-manifest.json is pinned and the build sets VITE_ASK_MODEL.
    if (askModelManifest.pinned) for (const c of MODEL_CACHES) expect(EN['m.pp.tech.storage.caches'], c).toContain(c);
    else expect(MODEL_CACHES.some((c) => all.includes(c))).toBe(false);
  });
});

describe('where it shows', () => {
  it('only a mainnet build shows the policy; the test site keeps its note', () => {
    const page = read('./Privacy.tsx');
    expect(page).toMatch(/if \(IS_MAINNET\)\s*return \(\s*<SiteShell>\s*<PrivacyPolicy \/>/);
    expect(read('../../App.tsx')).toMatch(/\[\/\^\\\/privacy\/, IS_MAINNET \? 'Privacy policy' : 'Demo privacy'\]/);
  });
});
