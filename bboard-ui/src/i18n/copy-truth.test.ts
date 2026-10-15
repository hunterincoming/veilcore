// The public copy says only what is true, on each kind of site.
//
//   - which strings a build uses: en; en + en-testchain on the public test site
//     (VITE_REAL_CHAIN=1 on a test network); en + en-mainnet on veilcore.org;
//   - no stale launch wording ("Launching on Midnight's main network", "by hand for now"
//     on the test site, a lab receipt called "simulated");
//   - never "own"/"ownership" as a claim, never "track and trace", never "audit" for our
//     own (AI) reviews, "prior possession" only of a record;
//   - the hero doesn't say the plant is hidden: its name is on every public check page;
//   - what the FAQ tells people to keep matches buttons the app really has;
//   - every changed or added key is translated, and the test overlay too;
//   - (round 3) no "lab files never leave" (a lab's locked report is uploaded), no
//     "that you hold the record" for prove-by-link (it checks a key), no lab called
//     "confirmed" or "checked" by VeilCore, the Bitcoin stamp file named as a third file
//     that only our server has, lab reports off on veilcore.org, no ownership words in
//     de/fr/es/ja, and no landing key missing from de/fr/es/ja.
//   - (round 5) the hero is three short sentences with the one privacy line, and what the
//     server keeps is said in "How it works"; "checking without us" names spec 3.6.1 and
//     says the SDK gets it in its next release; the accreditation shown is the holder's
//     own declaration; the Bitcoin stamp file is described the way the plant page really
//     offers it (or doesn't); the test site is named and linked; the privacy note's
//     "everything we hold" download matches what the site really has.
//   - (round 6) the test site's own column reads "This test site (test.veilcore.org)";
//     US spelling only ("license"); Japanese: headings join without a stray space and
//     break between phrases, one term per idea, and a Japanese mainnet overlay so the
//     mainnet site in Japanese is not half English.
// Run: npx vitest run src/i18n/copy-truth.test.ts
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { en, type StringKey } from './en';
import { mainnetStrings, DATED_POSTS } from './en-mainnet';
import { testchainStrings } from './en-testchain';
import { networkOverlay, LANGUAGES, type Lang } from './index';
import { ja, jaMainnet, jaTestchain } from './ja';
import { labResultsEnabledFor } from '../config/network';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '..');

const BUILD = { claimsOnMainnet: true, policyApproved: true };
const TEST_SITE = { ...BUILD, isMainnet: false, realChain: true };
const MAINNET = { ...BUILD, isMainnet: true, realChain: false };
const DEMO = { ...BUILD, isMainnet: false, realChain: false };

/** English as each site shows it. */
const merged = (overlay: Partial<Record<StringKey, string>>): Record<string, string> => ({ ...en, ...overlay });
const testSite = merged(networkOverlay(TEST_SITE, 'en'));
const mainnetVariants = [true, false].flatMap((claimsOnMainnet) =>
  [true, false].map((policyApproved) => merged(mainnetStrings({ claimsOnMainnet, policyApproved }))),
);
const ALL_ENGLISH: Record<string, string>[] = [en, testSite, ...mainnetVariants];

const offenders = (strings: Record<string, string>, re: RegExp) =>
  Object.entries(strings)
    .filter(([, v]) => re.test(v))
    .map(([k, v]) => `${k}: ${v}`);

describe('which strings a build uses', () => {
  it('the test site gets en-testchain, veilcore.org en-mainnet, any other build nothing', () => {
    expect(networkOverlay(TEST_SITE, 'en')).toEqual(testchainStrings);
    expect(networkOverlay(MAINNET, 'en')).toEqual(mainnetStrings(BUILD));
    expect(networkOverlay(DEMO, 'en')).toEqual({});
    // A mainnet build never takes the test overlay, whatever the flag says.
    expect(networkOverlay({ ...MAINNET, realChain: true }, 'en')).toEqual(mainnetStrings(BUILD));
  });
  it("in another language the test site uses that language's test strings, else the English ones", () => {
    for (const lang of ['de', 'fr', 'es', 'ja'] as Lang[]) {
      const o = networkOverlay(TEST_SITE, lang);
      for (const k of Object.keys(testchainStrings) as StringKey[]) {
        expect(o[k], `${lang} ${k}`).toBe(LANGUAGES[lang].testchain[k] ?? testchainStrings[k]);
      }
    }
  });
  it('every overlay key exists in en.ts', () => {
    for (const o of [testchainStrings, mainnetStrings(BUILD), ...Object.values(LANGUAGES).map((l) => l.testchain)])
      for (const k of Object.keys(o)) expect(Object.prototype.hasOwnProperty.call(en, k), k).toBe(true);
  });
});

describe('the test site', () => {
  it('says plainly it is the test site, and that its records are practice', () => {
    expect(testSite['m.hero.status']).toMatch(/^This is the test site: .* on Midnight's test network\./);
    expect(testSite['m.hero.status']).toMatch(/Records here are practice, not evidence\./);
  });
  it('carries none of the stale launch wording', () => {
    expect(offenders(testSite, /Launching on Midnight's main network|main network launch is close/i)).toEqual([]);
    // m.addr.* is shown only on a mainnet build (the contract addresses).
    expect(
      offenders(testSite, /not on the main network yet|isn't (in this web demo or )?on the main network/i).filter(
        (o) => !o.startsWith('m.addr.'),
      ),
    ).toEqual([]);
    // Batches on the test site are anchored by the sponsor's job, not by hand.
    expect(offenders(testchainStrings as Record<string, string>, /by hand/i)).toEqual([]);
    expect(offenders(testSite, /by hand for now/i).filter((o) => !o.startsWith('m.live.'))).toEqual([]);
    // DNA report pairings can be dated there.
    expect(offenders(testSite, /pairings? (aren't|isn't|is not|are not) (yet )?dated|not yet dated/i)).toEqual([]);
  });
  it('never calls the lab receipt simulated', () => {
    expect(offenders(testchainStrings as Record<string, string>, /simulat/i)).toEqual([]);
    expect(offenders(testSite, /(receipt|confirms? receipt)[^.]*simulated|simulated[^.]*receipt/i)).toEqual([]);
    expect(testSite['m.for.3p']).toMatch(/real signature/);
    expect(testSite['m.demo.lede']).toMatch(/real signature/);
  });
});

describe('veilcore.org (mainnet)', () => {
  it('carries no launch-pending wording and calls the lab receipt real', () => {
    for (const s of mainnetVariants) {
      expect(offenders(s, /Launching on Midnight's main network|main network launch is close/i)).toEqual([]);
      expect(offenders(s, /(receipt|confirms? receipt)[^.]*simulated|simulated[^.]*receipt/i)).toEqual([]);
      expect(s['m.for.3p']).toMatch(/real signature/);
    }
  });
});

describe('words we never use', () => {
  /** "own" as a claim. "its own key", "their own record", "the lab's own key" are fine. */
  const ownClaims = (v: string): string[] => {
    const found: string[] = [];
    for (const m of v.matchAll(/\b(own(s|ed|er|ers|ership)?)\b/gi)) {
      const word = m[1].toLowerCase();
      const before = v.slice(0, m.index).trimEnd().split(/\s+/).pop() ?? '';
      const possessive = /^(its|their|your|our|his|her|my|own)$/i.test(before) || /['’]s$/i.test(before);
      if (word !== 'own' || !possessive) found.push(`${before} ${m[1]}`);
    }
    return found;
  };
  it('no "own" or "ownership" as a claim, in any English the site shows', () => {
    for (const s of ALL_ENGLISH) for (const [k, v] of Object.entries(s)) expect(ownClaims(v), `${k}: ${v}`).toEqual([]);
    // The checker itself catches what it should.
    expect(ownClaims('Prove you own it.')).toEqual(['you own']);
    expect(ownClaims('Proof of prior possession, not ownership.')).toEqual(['not ownership']);
    expect(ownClaims("signs with the lab's own key and its own record")).toEqual([]);
  });
  it('no "track and trace"', () => {
    for (const s of ALL_ENGLISH) expect(offenders(s, /track[- ]and[- ]trace|track & trace/i)).toEqual([]);
  });
  it('"audit" only to say there has been no audit, never for our own reviews', () => {
    for (const s of ALL_ENGLISH) {
      expect(offenders(s, /self-audit|AI audit|audited|our audit|own audit/i)).toEqual([]);
      for (const [k, v] of Object.entries(s)) {
        const stripped = v.replace(/\bno (independent )?(security )?audit\b/gi, '');
        expect(/audit/i.test(stripped), `${k}: ${v}`).toBe(false);
      }
    }
  });
  it('"prior possession" only of a record', () => {
    for (const s of ALL_ENGLISH)
      for (const [k, v] of Object.entries(s)) if (/prior possession/i.test(v)) expect(v, k).toMatch(/record/i);
  });
});

describe('privacy, said plainly', () => {
  const HIDDEN_WHAT = /without showing (anyone )?what it is/i;
  it('the hero does not claim what the plant is stays hidden', () => {
    for (const s of ALL_ENGLISH) expect(offenders(s, HIDDEN_WHAT)).toEqual([]);
    expect(en['m.hero.title2']).toMatch(/genetics/);
  });
  it('the hero title is the one the CTO chose, and never "had it first"', () => {
    for (const s of ALL_ENGLISH) {
      expect(s['m.hero.title1']).toBe('Date your record.');
      expect(s['m.hero.title2']).toBe('Keep your genetics.');
      expect(offenders(s, /had it first/i)).toEqual([]);
    }
    const OLD_TITLE1: Record<string, string> = {
      de: 'Beweisen Sie, dass Sie es zuerst hatten.',
      fr: "Prouvez que vous l'aviez en premier.",
      es: 'Demuestre que lo tuvo primero.',
      ja: '先に持っていたことを証明する。',
    };
    for (const lang of ['de', 'fr', 'es', 'ja'] as Lang[]) {
      const t1 = LANGUAGES[lang].strings['m.hero.title1'];
      expect(t1, lang).toBeTruthy();
      expect(t1, lang).not.toBe(OLD_TITLE1[lang]);
      expect(t1, lang).not.toMatch(/zuerst|en premier|primero|先に/);
    }
  });
  it('the hero is short and makes the one privacy claim precisely (round 5)', () => {
    const lede = en['m.hero.lede'];
    // Who it's for and what it does, then the privacy line: genetic data, not "everything".
    expect(lede).toMatch(
      /Your genetic data stays on your computer\. Only a fingerprint goes on Midnight, which dates it\.$/,
    );
    expect(lede.split(/(?<=\.)\s+/).length).toBeLessThanOrEqual(3);
    // No lab-report sentence next to "stays on your computer" (it read as a contradiction):
    // that is said in the FAQ and the privacy note, below.
    expect(lede).not.toMatch(/lab report/i);
    expect(lede).not.toMatch(/nothing (is )?(sent|leaves)|never leaves your computer\. ?$/i);
  });
  it('what the server keeps is said on the page, right under the hero (How it works)', () => {
    expect(en['m.step1.text']).toMatch(/plant name and breeder you type are kept on VeilCore's server/);
    expect(en['m.step1.text']).toMatch(/anyone with the record's link sees the name/);
    expect(en['m.faq.4a']).toMatch(/A lab report reaches our server only when a lab sends it back to you/);
  });
  it('lineage on the website is the registry’s record, not the chain’s', () => {
    expect(en['m.get.3b']).toMatch(/VeilCore's registry records it, not the chain/);
  });
});

describe('what to keep if VeilCore is gone', () => {
  const source = (f: string) => fs.readFileSync(path.join(SRC, f), 'utf8');
  /** Builder P's plant page offers the batch's .ots file once this label is there. */
  const plantPage = () => source('components/RecordDetail.tsx') + source('components/SettlementStatus.tsx');
  const stampButton = /Download Bitcoin stamp file/.test(plantPage());
  it('names the files, says the backup holds keys only, and makes no promise for a copy you lack', () => {
    const k = 'm.open.2p';
    expect(en[k], k).toMatch(/inclusion proof/);
    expect(en[k], k).toMatch(/backup file holds your keys, not (these|them)/);
    expect(en[k], k).not.toMatch(/Records you've kept a copy of still check/);
    expect(en['m.open.2t']).not.toMatch(/Your record doesn't need us/);
    expect(en[k]).toMatch(/one-click evidence bundle .*is coming/);
    expect(en[k]).toMatch(/Bitcoin stamp file/);
  });
  it('describes the Bitcoin stamp file the way the plant page really offers it', () => {
    if (stampButton) {
      // The button exists: no page may still say the file is only on our server.
      expect(en['m.open.2p']).toContain('Download Bitcoin stamp file');
      expect(en['m.tech.btc.p']).toContain('Download Bitcoin stamp file');
      for (const s of ALL_ENGLISH) expect(offenders(s, /only on our server/i)).toEqual([]);
    } else {
      // Not yet: say so, and don't name a button that isn't there.
      for (const k of ['m.open.2p', 'm.tech.btc.p', 'm.live.btc.not'] as const) {
        expect((en as Record<string, string>)[k], k).toMatch(/only on our server/);
        expect((en as Record<string, string>)[k], k).not.toContain('Download Bitcoin stamp file');
      }
    }
  });
  it('the buttons the page names are the ones on the plant page', () => {
    // If these move or are renamed, the copy must follow.
    const detail = source('components/RecordDetail.tsx');
    expect(detail).toMatch(/Technical details/);
    expect(detail).toMatch(/Export record/);
    expect(detail).toMatch(/<SettlementStatus /);
    expect(source('components/SettlementStatus.tsx')).toMatch(/Download inclusion proof/);
    for (const label of ['Export record', 'Download inclusion proof', 'Technical details'])
      expect(en['m.open.2p']).toContain(label);
  });
  it('"checking without us" says what is published where (spec 3.6.1, round 5)', () => {
    for (const s of ALL_ENGLISH) expect(offenders(s, /doesn't need us|does not need us/i)).toEqual([]);
    for (const k of ['m.open.6p', 'm.tech.check.p'] as const) {
      expect(en[k], k).toMatch(/Records sealed since 14 October/);
      expect(en[k], k).toMatch(/section 3\.6\.1, published in the spec on this site/);
      expect(en[k], k).toMatch(/the SDK and its three implementations get it in their next release/);
    }
    // The section really is in the spec this site serves.
    expect(source('docs/SPEC.md')).toMatch(/#### 3\.6\.1 A record that names its own key/);
    // The 100 vectors are never offered as the whole check on their own.
    expect(en['m.tech.impl.p']).toMatch(/100 record-format test vectors/);
    for (const s of ALL_ENGLISH)
      for (const [k, v] of Object.entries(s))
        if (/100 (record-format )?(test )?vectors/.test(v)) expect(k).toBe('m.tech.impl.p');
  });
});

describe('the privacy note on downloading everything', () => {
  /** A call to the registry's full export from the site's own code (not a comment). */
  const files = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
      const f = path.join(dir, d.name);
      if (d.isDirectory()) return d.name === 'i18n' ? [] : files(f);
      return /\.tsx?$/.test(d.name) && !/\.test\.tsx?$/.test(d.name) ? [f] : [];
    });
  const callsExport = files(SRC).some((f) =>
    fs
      .readFileSync(f, 'utf8')
      .split('\n')
      .some((l) => !/^\s*(\/\/|\*)/.test(l) && /['"`][^'"`]*\/api\/export/.test(l)),
  );
  it('says there is a button only when the site has one', () => {
    const text = en['m.privacy.export.text'];
    if (callsExport) {
      expect(text).not.toMatch(/no button yet|not available yet|is coming/);
      // It names the button by its real label, and where it is.
      const label = /REGISTRY_EXPORT_LABEL = '([^']+)'/.exec(
        fs.readFileSync(path.join(SRC, 'components/RegistryExportButton.tsx'), 'utf8'),
      )?.[1];
      expect(label).toBeTruthy();
      expect(text).toContain(label as string);
      expect(fs.readFileSync(path.join(SRC, 'components/flow/AppHome.tsx'), 'utf8')).toMatch(/<RegistryExportButton/);
      expect(text).toMatch(/^On your records page/);
    } else {
      expect(text).toMatch(
        /Our server can produce one download of everything it holds for you; the site has no button yet/,
      );
      expect(text).toMatch(/hunter@veilcore\.org/);
    }
  });
});

describe("what's live where", () => {
  const home = fs.readFileSync(path.join(SRC, 'components/site/Home.tsx'), 'utf8');
  const rows = [
    ...(home.match(/const LIVE_ROWS = \[([\s\S]*?)\] as const;/)?.[1] ?? '').matchAll(
      /\['(\w+)', (true|false), (true|false), (true|false)\]/g,
    ),
  ].map((m) => ({ row: m[1], has: [m[2], m[3], m[4]].map((x) => x === 'true') }));
  const COLS = ['main', 'test', 'not'] as const;

  it('every cell the page shows has text, and no text sits in a hidden cell', () => {
    expect(rows.map((r) => r.row)).toEqual([
      'stamp',
      'btc',
      'share',
      'lab',
      'results',
      'dna',
      'prove',
      'claims',
      'lic',
    ]);
    for (const { row, has } of rows) {
      expect(Object.prototype.hasOwnProperty.call(en, `m.live.${row}.t`), row).toBe(true);
      COLS.forEach((c, i) =>
        expect(Object.prototype.hasOwnProperty.call(en, `m.live.${row}.${c}`), `${row}.${c}`).toBe(has[i]),
      );
    }
  });
  it('says what the code does', () => {
    const e = en as Record<string, string>;
    expect(e['m.live.stamp.main']).toMatch(/by hand for now.*Your browser sends nothing to the chain/);
    // The record is dated by its batch; the browser's date stamp dates only the plant's key
    // (docs/identity-in-record.md, "Dates").
    expect(e['m.live.stamp.test']).toMatch(/Batches are dated automatically, and that dates your record/);
    expect(e['m.live.stamp.test']).toMatch(/date stamps your plant's own key, which dates only the key/);
    expect(e['m.live.claims.main']).toMatch(/no maintenance key.*can’t use it yet/);
    expect(e['m.live.lic.main']).toBe('Practice only.');
    expect(e['m.live.lic.test']).toBe('Practice only.');
    expect(e['m.live.dna.main']).toMatch(/not dated/);
    // Lab reports are off on veilcore.org (LAB_RESULTS_ENABLED), on on the test site.
    expect(rows.find((r) => r.row === 'results')?.has).toEqual([false, true, true]);
    expect(e['m.live.results.not']).toMatch(/^On veilcore\.org: turned off for now, on the test site first\.$/);
    // Prove-by-link checks a key, not the record.
    // The record names its own key (SPEC 3.6.1, docs/identity-in-record.md).
    expect(e['m.live.prove.test']).toBe(
      "Yes. Their page checks on the network that you control the record's own key. The record named that key when it was sealed, so it can't be swapped.",
    );
    // Bitcoin: the live registry stamps every sealed batch; the test site's registry runs
    // with OpenTimestamps off (docs/no-wallet-run-12oct.md), so there is no test cell.
    // The "Not yet" cell (getting the stamp file from the website) goes once the plant page
    // offers it.
    const stampButton = /Download Bitcoin stamp file/.test(
      fs.readFileSync(path.join(SRC, 'components/RecordDetail.tsx'), 'utf8') +
        fs.readFileSync(path.join(SRC, 'components/SettlementStatus.tsx'), 'utf8'),
    );
    expect(rows.find((r) => r.row === 'btc')?.has).toEqual([true, false, !stampButton]);
    expect(e['m.live.btc.main']).toMatch(/block 971004 on 11 October/);
    expect(e['m.live.btc.main']).toMatch(/official tool is still to do/);
    // The tool is named for technical readers.
    expect(e['m.tech.btc.p']).toMatch(
      /block 971004 on 11 October; a check with the official OpenTimestamps tool is still to do/,
    );
    const docs = path.resolve(SRC, '../../docs');
    expect(fs.readFileSync(path.join(docs, 'no-wallet-run-12oct.md'), 'utf8')).toMatch(
      /veilcore-api-preprod.*OpenTimestamps off/s,
    );
  });
  it('names and links the test site (round 5)', () => {
    expect(home).toContain("const TEST_SITE_URL = 'https://test.veilcore.org';");
    expect(home).toMatch(/<a href=\{TEST_SITE_URL\}/);
    expect(en['m.live.colTest']).toBe('test.veilcore.org');
    // Until it is actually live.
    expect(en['m.live.colTestNote']).toBe('(going live this week)');
  });
  it('on the test site itself, the column is "This test site", with no link to itself (round 6)', () => {
    expect(en['m.live.colTestHere']).toBe('This test site (test.veilcore.org)');
    // The test site shows colTestHere; every other build the link and "(going live this week)".
    const th = home.match(/\{IS_TEST_SITE \? \(([\s\S]*?)\) : \(([\s\S]*?)\)\}\s*<\/th>/);
    expect(th, 'the test column heading branches on IS_TEST_SITE').toBeTruthy();
    expect(th?.[1]).toContain("t('m.live.colTestHere')");
    expect(th?.[1]).not.toMatch(/TEST_SITE_URL|colTestNote/);
    expect(th?.[2]).toMatch(/<a href=\{TEST_SITE_URL\}[\s\S]*m\.live\.colTest'[\s\S]*m\.live\.colTestNote/);
    // IS_TEST_SITE is the same test as the one that picks en-testchain.ts.
    expect(fs.readFileSync(path.join(HERE, 'index.tsx'), 'utf8')).toMatch(
      /export const IS_TEST_SITE = THIS_BUILD\.realChain;/,
    );
    expect(ja['m.live.colTestHere']).toBe('このテストサイト（test.veilcore.org）');
  });
  it('shows on the mainnet site too, so it carries no test-network or demo wording', () => {
    const shown = Object.entries(en).filter(([k]) => /^m\.(live|postA|postB)\./.test(k));
    for (const [k, v] of shown) {
      expect(v, k).not.toMatch(/test[ -]network|preprod|\bpreview\b|test server|test registry|test version/i);
      expect(v, k).not.toMatch(/\bdemos?\b/i);
    }
  });
});

describe('round 3: what a page may claim', () => {
  const SITES = { en, testSite, ...Object.fromEntries(mainnetVariants.map((m, i) => [`mainnet${i}`, m])) };
  it('never says lab files never leave your computer (a lab report is uploaded, locked)', () => {
    for (const [site, s] of Object.entries(SITES)) {
      expect(offenders(s, /lab files never leave|lab files (and genetic data )?(stay|remain) on/i), site).toEqual([]);
      expect(offenders(s, /Lab files and genetic data files never leave/i), site).toEqual([]);
    }
  });
  it('prove-by-link says it checks a key, never that you hold the record', () => {
    for (const [site, s] of Object.entries(SITES)) {
      expect(offenders(s, /that you hold the record|shows you hold it/i), site).toEqual([]);
      expect(s['m.for.6p'], site).toMatch(
        /you control your plant's own key\. Your record named that key when it was sealed, so it can't be swapped\./,
      );
      expect(s['m.for.6p'], site).toMatch(/It says nothing about who you are or who bred the plant\./);
      // The old "your statement" wording predates the record naming its key.
      expect(offenders(s, /key you registered for this record|your statement for now/i), site).toEqual([]);
    }
  });
  it('no lab is called confirmed or checked by VeilCore', () => {
    for (const [site, s] of Object.entries(SITES)) {
      expect(offenders(s, /confirmed by a lab|lab[- ]confirmed|receiver confirms it/i), site).toEqual([]);
      expect(offenders(s, /we've checked that the key|VeilCore (has )?checked/i), site).toEqual([]);
      expect(s['m.open.3p'], site).toMatch(/VeilCore doesn't vouch for any lab/);
      // A mark says exactly what was checked (docs/lab-name-checks.md).
      expect(s['m.open.3p'], site).toMatch(
        /matched that name to a public license or accreditation listing, and on what day/,
      );
      // The accreditation shown is whatever the key's holder declared; nobody checks it.
      expect(s['m.open.3p'], site).toMatch(/any accreditation its holder declared \(we don't check that\)/);
      expect(offenders(s, /name and accreditor registered/i), site).toEqual([]);
      expect(
        offenders(s, /operator has marked that name|verified lab|approved lab|certified by VeilCore/i),
        site,
      ).toEqual([]);
    }
  });
  it("a key's own date stamp is never said to date the record", () => {
    for (const [site, s] of Object.entries(SITES)) {
      expect(
        offenders(
          s,
          /browser (date[- ])?stamps each record|browser date-stamps each record|stamps? (each|your) record from the browser/i,
        ),
        site,
      ).toEqual([]);
    }
  });
  it('the demo and test site say a locked lab report is kept 180 days; veilcore.org has none yet', () => {
    for (const s of [en, testSite]) {
      expect(s['m.privacy.stored.text']).toMatch(
        /Locked lab reports a lab sends you: stored unreadable to us, and deleted after 180 days/,
      );
      expect(s['m.privacy.local.text']).toMatch(/A lab report reaches our server only when a lab sends it back to you/);
      expect(s['m.faq.4a']).toMatch(/deleted after 180 days/);
      expect(s['m.privacy.who.text']).toMatch(/deleted 180 days after they arrive/);
    }
    for (const s of mainnetVariants) {
      expect(s['m.for.4p']).toMatch(/Not on this website yet: it's on the test site first\.$/);
      for (const k of ['m.faq.4a', 'm.privacy.local.text', 'm.privacy.who.text', 'm.privacy.stored.text'] as const)
        expect(s[k], k).not.toMatch(/180 days|sends it back/);
    }
  });
  it('the mainnet wording above holds only while lab reports are off on mainnet', () => {
    // If this flips, the mainnet overlay (m.for.4p, m.faq.4a, m.privacy.*) and
    // m.live.results.* must change with it.
    // (labResultsEnabledFor in config/network.ts, builder F's flag.)
    expect(labResultsEnabledFor('mainnet')).toBe(false);
    expect(labResultsEnabledFor('preprod')).toBe(true);
  });
});

describe('US spelling (round 6)', () => {
  it('"license", never "licence", in every English the site shows', () => {
    const files = ['en.ts', 'en-mainnet.ts', 'en-testchain.ts'].map((f) => fs.readFileSync(path.join(HERE, f), 'utf8'));
    for (const f of files) expect(f).not.toMatch(/licenc/i);
    for (const s of ALL_ENGLISH) expect(offenders(s, /licenc/i)).toEqual([]);
  });
});

describe('Japanese (round 6)', () => {
  const FLAGS = [true, false].flatMap((claimsOnMainnet) =>
    [true, false].map((policyApproved) => ({ claimsOnMainnet, policyApproved })),
  );
  /** The Japanese page as each build shows it. */
  const jaOn = (build: typeof MAINNET) => ({ ...ja, ...networkOverlay(build, 'ja') }) as Record<string, string>;
  const jaMainnetSites = FLAGS.map((f) => jaOn({ ...MAINNET, ...f }));
  const jaSites = [ja as Record<string, string>, jaOn(TEST_SITE), ...jaMainnetSites];

  it('headings in two halves join with a space only in languages that use spaces', () => {
    expect(LANGUAGES.ja.spaces).toBe(false);
    for (const l of ['en', 'de', 'fr', 'es'] as Lang[]) expect(LANGUAGES[l].spaces, l).toBe(true);
    // No language without spaces other than Japanese (Chinese would need the same).
    expect(Object.keys(LANGUAGES).sort()).toEqual(['de', 'en', 'es', 'fr', 'ja']);
    for (const f of ['Home.tsx', 'Founders.tsx', 'Fold.tsx']) {
      const src = fs.readFileSync(path.join(SRC, 'components/site', f), 'utf8');
      // `{t('…')} <em>` or `</strong> {children}` would put an ASCII space into Japanese.
      expect(src, f).not.toMatch(/\)\} <em>|<\/em> \{t\(|<\/strong> \{children\}/);
    }
    // No Japanese string carries a space between two Japanese characters.
    for (const s of jaSites)
      expect(offenders(s, /[\u3040-\u30ff\u3400-\u9fff] [\u3040-\u30ff\u3400-\u9fff]/)).toEqual([]);
  });
  it('headings and short lines break between phrases in Japanese, with a fallback', () => {
    const css = fs.readFileSync(path.join(SRC, 'components/site/site.css'), 'utf8');
    const block = css.slice(css.indexOf('.vcm:lang(ja)'));
    expect(block).toMatch(
      /:is\(\s*h1,\s*h2,\s*h3,\s*h4,\s*summary,\s*dt,\s*th,[\s\S]*?\)\s*\{\s*line-break: strict;\s*word-break: auto-phrase;/,
    );
    expect(block).toMatch(
      /@supports not \(word-break: auto-phrase\) \{[\s\S]*?word-break: keep-all;\s*overflow-wrap: anywhere;/,
    );
    // The lang the CSS keys on is on the page's own root, not only on <html>.
    expect(fs.readFileSync(path.join(SRC, 'components/site/SiteShell.tsx'), 'utf8')).toMatch(
      /<div className="vcm" lang=\{lang\}>/,
    );
  });
  it('uses one term per idea', () => {
    const all = [ja, jaTestchain, ...FLAGS.map((f) => jaMainnet(f))] as Record<string, string>[];
    const OTHER_TERMS =
      /育種家|育種者|ブラウザー|受領確認|ラボ報告書|DNA検査報告書|テストネット(?!ワーク)|ラボ契約|固定|所有|植物を登録/;
    for (const s of all) expect(offenders(s, OTHER_TERMS)).toEqual([]);
    expect(ja['m.hero.bredBy']).toBe('育成者');
    expect(ja['m.contact.1t']).toBe('育成者とラボの方');
    expect(ja['m.hero.lede']).toMatch(/育成者、種苗会社、ラボのために/);
  });
  it('the mainnet site in Japanese is in Japanese, and says what the English says', () => {
    for (const f of FLAGS) {
      const o = jaMainnet(f);
      // Every sentence the English mainnet overlay changes has its Japanese.
      expect(Object.keys(o).sort()).toEqual(
        [...new Set([...Object.keys(mainnetStrings(f)), 'm.status.keyTitle'])].sort(),
      );
      expect(networkOverlay({ ...MAINNET, ...f }, 'ja')).toEqual({ ...mainnetStrings(f), ...o });
      for (const k of ['m.hero.status', 'm.demo.lede', 'm.stat2.s', 'm.privacy.test.text'] as const)
        expect(o[k], k).toMatch(/手作業/);
      expect(o['m.status.keyText']).toMatch(
        f.policyApproved ? /書面のメンテナンスポリシーに基づき公表します/ : /提案段階/,
      );
      expect(`${o['m.status.keyText']}${o['m.status.keyLink']}`).not.toMatch(f.policyApproved ? /提案/ : /基づき公表/);
      expect(o['m.status.keyText']?.includes('クレーム用コントラクトにはメンテナンス鍵がなく')).toBe(f.claimsOnMainnet);
      expect(o['m.claims.status']).toMatch(
        f.claimsOnMainnet ? /メインネットワーク上にあります/ : /メインネットワークにはまだなく/,
      );
      expect(o['m.for.4p']).toMatch(/まずテストサイトで提供しています。$/);
      for (const k of ['m.faq.4a', 'm.privacy.local.text', 'm.privacy.who.text', 'm.privacy.stored.text'] as const)
        expect(o[k], k).not.toMatch(/180日|返送/);
    }
    // Outside the dated posts, nothing on the Japanese mainnet page says test network or demo.
    for (const s of jaMainnetSites) {
      const shown = Object.entries(s).filter(([k]) => !(DATED_POSTS as readonly string[]).includes(k));
      expect(
        shown.filter(([, v]) => /テストネットワーク|preprod|テストサーバー|テスト用レジストリ|テスト版|デモ/.test(v)),
      ).toEqual([]);
    }
    // Other languages keep the English overlay until someone translates it.
    for (const l of ['de', 'fr', 'es'] as Lang[]) expect(networkOverlay(MAINNET, l)).toEqual(mainnetStrings(BUILD));
  });
});

describe('the updates', () => {
  it('have the mainnet launch and the first Bitcoin stamp, with the facts from the docs', () => {
    expect(en['m.postA.date']).toBe('8 Oct 2026');
    expect(en['m.postA.text']).toMatch(/Both contracts are deployed on Midnight's main network/);
    expect(en['m.postA.text']).toMatch(/The claims contract has no maintenance key/);
    expect(en['m.postB.date']).toBe('11 Oct 2026');
    expect(en['m.postB.text']).toMatch(/block 971004/);
    const docs = path.resolve(SRC, '../../docs');
    expect(fs.readFileSync(path.join(docs, 'mainnet-completeness.md'), 'utf8')).toMatch(/Bitcoin block 971004/);
    expect(fs.readFileSync(path.join(docs, 'deployment-record-revision-4.md'), 'utf8')).toMatch(
      /\*\*Deployed:\*\* 8 October 2026/,
    );
  });
  it('the dated test-network posts stay history', () => {
    for (const k of DATED_POSTS) expect(en[k], k).not.toMatch(/not on the main network yet/);
  });
});

describe('translations', () => {
  /** Keys this pass changed or added: each language must have its own text for them. */
  const CHANGED: StringKey[] = [
    'm.hero.title1',
    'm.hero.title2',
    'm.hero.lede',
    'm.for.3p',
    'm.get.1b',
    'm.get.3b',
    'm.open.2t',
    'm.open.2p',
    'm.faq.1a',
    'm.post0.text',
    'm.foot.fine',
    'm.founders.lede',
    ...(Object.keys(en).filter((k) => /^m\.(live|postA|postB)\./.test(k)) as StringKey[]),
  ];
  CHANGED.push(
    'm.step2.text',
    'm.for.6p',
    'm.open.3p',
    'm.faq.4a',
    'm.privacy.stored.text',
    'm.privacy.local.text',
    'm.privacy.who.text',
  );
  // Round 5: the landing page rework.
  CHANGED.push(
    ...(Object.keys(en).filter((k) => /^m\.(tech|open)\./.test(k)) as StringKey[]),
    'm.hero.lede',
    'm.for.lede',
    'm.for.1p',
    'm.for.2p',
    'm.for.4p',
    'm.for.5p',
    'm.step1.text',
    'm.claims.title1',
    'm.claims.title2',
    'm.claims.statusTitle',
    'm.get.2a',
    'm.get.2b',
    'm.demo.title1',
    'm.demo.title2',
    'm.status.title1',
    'm.status.title2',
    'm.stat2.s',
    'm.updates.older',
    'm.privacy.export.text',
  );
  /** Allowed to read the same as the English (names, a tag that is the same word). */
  const SAME_OK = new Set([
    'de:m.postA.tag',
    'de:m.post0.tag',
    // A domain name.
    ...['de', 'fr', 'es', 'ja'].map((l) => `${l}:m.live.colTest`),
  ]);

  for (const lang of ['de', 'fr', 'es', 'ja'] as Lang[]) {
    it(`${lang} translates every changed key and the test-site overlay`, () => {
      const { strings, testchain } = LANGUAGES[lang];
      for (const k of CHANGED) {
        expect(strings[k], `${lang} ${k}`).toBeTruthy();
        if (!SAME_OK.has(`${lang}:${k}`)) expect(strings[k], `${lang} ${k}`).not.toBe(en[k]);
        expect(strings[k], `${lang} ${k}`).not.toMatch(/^m\.[\w.]+$/);
      }
      for (const k of Object.keys(testchainStrings) as StringKey[]) {
        expect(testchain[k], `${lang} testchain ${k}`).toBeTruthy();
        expect(testchain[k], `${lang} testchain ${k}`).not.toBe(testchainStrings[k]);
      }
      // Every key the landing pages use, so no English shows through a draft.
      expect(Object.keys(en).filter((k) => !strings[k as StringKey])).toEqual([]);
      // No ownership words: a record shows what you held, not what you own.
      const OWN: Record<string, RegExp> = {
        de: /besitz|eigentum|eigentümer/i,
        fr: /posséd|possed|propriét/i,
        es: /\bposee|\bposeer|\bposeí|propiedad|propietari|dueñ/i,
        ja: /所有/,
      };
      for (const [k, v] of [...Object.entries(strings), ...Object.entries(testchain)])
        expect(OWN[lang].test(v ?? ''), `${lang} ${k}: ${v}`).toBe(false);
      // The old "what it is" title is gone in this language too.
      expect(strings['m.hero.title2']).not.toBe(
        {
          de: 'Ohne jemandem zu zeigen, was es ist.',
          fr: "Sans montrer à personne ce que c'est.",
          es: 'Sin mostrarle a nadie qué es.',
          ja: 'それが何かは誰にも見せずに。',
        }[lang as 'de'],
      );
    });
  }
});
