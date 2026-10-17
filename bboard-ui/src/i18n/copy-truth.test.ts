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
//     that only our server has, lab reports on veilcore.org too (16 Oct), no ownership words in
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
//   - (round 7) one file to keep: the evidence bundle the plant page really offers, never
//     "coming"; the check page reading Midnight itself is said per build: the test site
//     does, veilcore.org will once its read-only relay is live (and says so until then),
//     and nothing says checking a date "needs" an explorer any more.
// Run: npx vitest run src/i18n/copy-truth.test.ts
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { en, type StringKey } from './en';
import { mainnetStrings, DATED_POSTS } from './en-mainnet';
import { testchainStrings } from './en-testchain';
import { appEn } from './app/en';
import { appJa } from './app/ja';
import { appEs } from './app/es';
import { appDe } from './app/de';
import { appFr } from './app/fr';

/** The record app's words in each translation, for copy that names its buttons. */
const APP = { ja: appJa, es: appEs, de: appDe, fr: appFr };

/** The English app keys a source file uses ('app.plant.open' and the like), and their text. */
const appKeysIn = (src: string): string[] => [...src.matchAll(/'(app\.[\w.-]+)'/g)].map((m) => m[1]);
/** A component's words: its own literals, and the English of the app keys it uses. */
const appText = (src: string): string =>
  [src, ...appKeysIn(src).map((k) => (appEn as Record<string, string>)[k] ?? '')].join('\n');
/** Whether a component shows these words, as a literal or through an app key. */
const says = (src: string, words: string): boolean => appText(src).includes(words);
import { type Lang } from './index';
import { networkOverlay, LANGUAGES } from './catalogs';
import { ja, jaMainnet, jaTestchain } from './ja';
import { animalRecordsEnabledFor, labResultsEnabledFor } from '../config/network';
import { readIndexersFor } from '../veilcore/chain/config';

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
  [true, false].flatMap((policyApproved) =>
    [true, false].map((chainReads) => merged(mainnetStrings({ claimsOnMainnet, policyApproved, chainReads }))),
  ),
);
/** veilcore.org before and after its read-only relay (VITE_INDEXER_RELAY_URL). */
const mainnetNoRelay = merged(mainnetStrings({ ...BUILD, chainReads: false }));
const mainnetRelay = merged(mainnetStrings({ ...BUILD, chainReads: true }));
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
      /Your genetic data stays on your computer\. Only a proof code goes on Midnight, which dates it\.$/,
    );
    expect(lede.split(/(?<=\.)\s+/).length).toBeLessThanOrEqual(3);
    // No lab-report sentence next to "stays on your computer" (it read as a contradiction):
    // that is said in the FAQ and the privacy note, below.
    expect(lede).not.toMatch(/lab report/i);
    expect(lede).not.toMatch(/nothing (is )?(sent|leaves)|never leaves your computer\. ?$/i);
  });
  it('what the server keeps is said on the page, right under the hero (How it works)', () => {
    // Sealed records (round 2): the details are stored locked. Round 5: the name too; it
    // travels in the holder's check links, after the #, which no server receives.
    expect(en['m.step1.text']).toMatch(
      /VeilCore's server stores the details locked, the name included, and we don't have the key/,
    );
    // Persona review (17 Oct): a link carries the name only when the holder switches it on.
    expect(en['m.step1.text']).toMatch(
      /A check link carries the name only if you switch that on, for the people you send it to\./,
    );
    expect(en['m.step1.text']).not.toMatch(/isn't locked|anyone with the record's link/);
    expect(en['m.step1.text']).not.toMatch(/breeder/);
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
  const stampButton = says(plantPage(), 'Download Bitcoin stamp file');
  it('names the files, says the backup holds keys only, and makes no promise for a copy you lack', () => {
    const k = 'm.open.2p';
    expect(en[k], k).toMatch(/inclusion proof/);
    expect(en[k], k).toMatch(/backup file holds your keys, not (these|them)/);
    expect(en[k], k).not.toMatch(/Records you've kept a copy of still check/);
    expect(en['m.open.2t']).not.toMatch(/Your record doesn't need us/);
    expect(en[k]).toMatch(/Bitcoin stamp file/);
  });
  it('one file: the evidence bundle the plant page really offers, never "coming" (round 7)', () => {
    const label = /DOWNLOAD_EVIDENCE_LABEL = '([^']+)'/.exec(source('components/EvidenceBundle.tsx'))?.[1];
    expect(label).toBe('Download evidence bundle');
    // The plant page shows it: once right under the record's date, once in its own panel.
    expect(source('components/RecordDetail.tsx').match(/<EvidenceBundle\b/g)?.length).toBe(2);
    expect(en['m.open.2t']).toBe('Keep one file.');
    expect(en['m.open.2p']).toMatch(new RegExp(`^From your plant's page: ${label}\\. One \\.zip with `));
    // What the bundle really holds (veilcore/evidence/bundle.ts) and its offline page.
    const bundle = source('veilcore/evidence/bundle.ts');
    for (const f of ['record/sealed-fields.json', 'proof/inclusion-proof.json', 'proof/anchors.json', 'verify.html'])
      expect(bundle, f).toContain(f);
    expect(bundle).toMatch(/root\.bin\.ots/);
    expect(en['m.open.2p']).toMatch(
      /the record as sealed, its inclusion proof, the batch root, where the batch was recorded, the Bitcoin stamp file when there is one, and a page that checks it offline/,
    );
    expect(en['m.open.2p']).toMatch(
      /The single files are still under Technical details: Export record, Download inclusion proof, Download Bitcoin stamp file\.$/,
    );
    expect(en['m.open.6p']).toMatch(
      /^With that bundle, anyone can check a record offline: open its verify\.html, then look up the one transaction it names on a Midnight explorer\./,
    );
    // No English says the bundle is still to come, and no translation either.
    for (const s of ALL_ENGLISH) expect(offenders(s, /bundle[^.]*(is coming|coming soon)|one-click/i)).toEqual([]);
    const COMING: Record<string, RegExp> = {
      de: /in Vorbereitung|drei Dateien/,
      fr: /en préparation|trois fichiers/,
      es: /Pronto habrá|tres archivos/,
      ja: /準備中|3つのファイル/,
    };
    for (const lang of ['de', 'fr', 'es', 'ja'] as Lang[])
      for (const k of ['m.open.2t', 'm.open.2p'] as const) {
        expect(LANGUAGES[lang].strings[k], `${lang} ${k}`).not.toMatch(COMING[lang]);
        // The page names the plant page's buttons as they read in that language (i18n/app).
        expect(LANGUAGES[lang].strings[k], `${lang} ${k}`).toContain(
          k === 'm.open.2p' ? APP[lang as Exclude<Lang, 'en'>]['app.plant.bundle.download'] : '',
        );
      }
  });
  it('describes the Bitcoin stamp file the way the plant page really offers it', () => {
    if (stampButton) {
      // The button exists: no page may still say the file is only on our server.
      expect(en['m.open.2p']).toContain('Download Bitcoin stamp file');
      expect(en['m.tech.btc.p']).toContain('Download Bitcoin stamp file');
      // Each translation names it, and the other plant-page buttons, as the app does in that language.
      for (const lang of ['de', 'fr', 'es', 'ja'] as const) {
        const app = APP[lang];
        expect(LANGUAGES[lang].strings['m.tech.btc.p'], lang).toContain(app['app.plant.date.downloadStamp']);
        for (const k of [
          'app.plant.date.downloadStamp',
          'app.plant.technicalDetails',
          'app.plant.exportRecord',
          'app.plant.date.downloadProof',
        ] as const)
          expect(LANGUAGES[lang].strings['m.open.2p'], `${lang} ${k}`).toContain(app[k]);
      }
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
    expect(says(detail, 'Technical details')).toBe(true);
    expect(says(detail, 'Export record')).toBe(true);
    expect(detail).toMatch(/<SettlementStatus /);
    expect(says(source('components/SettlementStatus.tsx'), 'Download inclusion proof')).toBe(true);
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
      'chain',
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
    // The check page reads Midnight itself on the test site; on veilcore.org only with the
    // read-only relay (round 7, docs/check-on-chain.md).
    expect(rows.find((r) => r.row === 'chain')?.has).toEqual([true, true, false]);
    expect(e['m.live.chain.t']).toBe('The check page reads Midnight itself');
    expect(e['m.live.chain.main']).toBe('Not yet: needs our read-only relay.');
    expect(e['m.live.chain.test']).toBe('Yes.');
    expect(testSite['m.live.chain.main']).toBe('Not yet: needs our read-only relay.');
    expect(mainnetNoRelay['m.live.chain.main']).toBe('Not yet: needs our read-only relay.');
    expect(mainnetRelay['m.live.chain.main']).toBe('Yes.');
    expect(e['m.live.lic.test']).toBe('Practice only.');
    expect(e['m.live.dna.main']).toMatch(/not dated/);
    // Lab reports are on on veilcore.org and the test site alike (LAB_RESULTS_ENABLED, 16 Oct).
    expect(rows.find((r) => r.row === 'results')?.has).toEqual([labResultsEnabledFor('mainnet'), true, false]);
    expect(e['m.live.results.main']).toBe('Yes. New, and still being tested.');
    for (const s of [testSite, ...mainnetVariants]) expect(s['m.live.results.main']).toBe(e['m.live.results.main']);
    expect(Object.values(LANGUAGES).map((l) => (l.strings as Record<string, string>)['m.live.results.not'])).toEqual(
      Object.keys(LANGUAGES).map(() => undefined),
    );
    // Prove-by-link checks a key, not the record.
    // The record names its own key (SPEC 3.6.1, docs/identity-in-record.md).
    expect(e['m.live.prove.test']).toBe(
      "Yes. Their page checks on the network that you control the record's own key. The record named that key when it was sealed, so it can't be swapped.",
    );
    // Bitcoin: the live registry stamps every sealed batch; the test site's registry runs
    // with OpenTimestamps off (docs/no-wallet-run-12oct.md), so there is no test cell.
    // The "Not yet" cell (getting the stamp file from the website) goes once the plant page
    // offers it.
    const stampButton = says(
      fs.readFileSync(path.join(SRC, 'components/RecordDetail.tsx'), 'utf8') +
        fs.readFileSync(path.join(SRC, 'components/SettlementStatus.tsx'), 'utf8'),
      'Download Bitcoin stamp file',
    );
    expect(rows.find((r) => r.row === 'btc')?.has).toEqual([true, false, !stampButton]);
    expect(e['m.live.btc.main']).toMatch(/block 971004 on 11 October/);
    // Checked on 15 October with VeilCore's own script against two block explorers
    // (docs/bitcoin-stamp-check-11oct.md); the official client with a full node is not done,
    // and the copy keeps saying so until it is.
    expect(e['m.live.btc.main']).toMatch(/checked against two block explorers on 15 October/);
    expect(e['m.live.btc.main']).toMatch(/A check with the official tool and a full node is still to do\.$/);
    // The tool is named for technical readers.
    expect(e['m.tech.btc.p']).toMatch(
      /block 971004 on 11 October\. Checked on 15 October against two block explorers: the stamp leads to Bitcoin blocks 971004 and 971005\. A check with the official OpenTimestamps tool and a full Bitcoin node is still to do\./,
    );
    // The official-tool caveat stays wherever the explorer check is mentioned, in every
    // language, until docs/bitcoin-stamp-check-11oct.md records an official-client pass.
    const stampDoc = fs.readFileSync(path.resolve(SRC, '../../docs/bitcoin-stamp-check-11oct.md'), 'utf8');
    expect(stampDoc).toMatch(/^## Result \(15 Oct 2026\)/m);
    expect(stampDoc).toMatch(/Not yet checked with the\s+official OpenTimestamps client and a full Bitcoin node\./);
    const CAVEAT: Record<Lang, RegExp> = {
      en: /official (OpenTimestamps )?tool and a full (Bitcoin )?node is still to do/,
      de: /offiziellen (OpenTimestamps-)?Werkzeug und einem vollständigen (Bitcoin-)?Knoten steht noch aus/,
      fr: /outil officiel (OpenTimestamps )?et un nœud (Bitcoin )?complet reste à faire/,
      es: /Aún falta comprobarlo con la herramienta oficial (de OpenTimestamps )?y un nodo completo( de Bitcoin)?\./,
      ja: /公式ツールと(Bitcoinの)?フルノード(による|での)確認はまだです/,
    };
    const BTC_KEYS = ['m.postB.text', 'm.tech.btc.p', 'm.live.btc.main'] as const;
    for (const l of Object.keys(CAVEAT) as Lang[]) {
      for (const k of BTC_KEYS) {
        const v = LANGUAGES[l].strings[k];
        expect(v, `${l} ${k}`).toMatch(/971004/);
        expect(v, `${l} ${k}`).toMatch(CAVEAT[l]);
      }
    }
    const docs = path.resolve(SRC, '../../docs');
    expect(fs.readFileSync(path.join(docs, 'no-wallet-run-12oct.md'), 'utf8')).toMatch(
      /veilcore-api-preprod.*OpenTimestamps off/s,
    );
  });
  it('names and links the test site (round 5)', () => {
    expect(home).toContain("const TEST_SITE_URL = 'https://test.veilcore.org';");
    expect(home).toMatch(/<a href=\{TEST_SITE_URL\}/);
    expect(en['m.live.colTest']).toBe('test.veilcore.org');
    // No "(going live this week)": a date like that goes stale (persona review, 17 Oct).
    expect(Object.keys(en)).not.toContain('m.live.colTestNote');
    expect(home).not.toMatch(/colTestNote|going live/);
  });
  it('on the test site itself, the column is "This test site", with no link to itself (round 6)', () => {
    expect(en['m.live.colTestHere']).toBe('This test site (test.veilcore.org)');
    // The test site shows colTestHere; every other build the link.
    const th = home.match(/\{IS_TEST_SITE \? \(([\s\S]*?)\) : \(([\s\S]*?)\)\}\s*<\/th>/);
    expect(th, 'the test column heading branches on IS_TEST_SITE').toBeTruthy();
    expect(th?.[1]).toContain("t('m.live.colTestHere')");
    expect(th?.[1]).not.toMatch(/TEST_SITE_URL|colTestNote/);
    expect(th?.[2]).toMatch(/<a href=\{TEST_SITE_URL\}[\s\S]*m\.live\.colTest'/);
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

describe('the check page reading Midnight itself, per build (round 7)', () => {
  // The app footer is plain since the persona review (17 Oct); the technical paragraph lives in
  // the home page's technical section only.
  const CHECK_KEYS = ['m.tech.check.p'] as const;
  /** The text around the check page's sentence (and the date sentence it hangs off). */
  const around = (v: string): string => {
    const i = v.search(/ Its date comes from one transaction on Midnight| The check page /);
    const j = v.search(/ (Looking a record up by its identifier|Records sealed since 14 October)/);
    expect(i, v).toBeGreaterThan(0);
    expect(j, v).toBeGreaterThan(i);
    return v.slice(0, i) + v.slice(j);
  };
  it('nothing says checking a date needs an explorer look-up any more', () => {
    for (const s of ALL_ENGLISH) {
      expect(
        offenders(s, /also needs a look-up on a Midnight explorer|a look-up on a Midnight explorer gives/i),
      ).toEqual([]);
    }
  });
  it('en.ts (every build without an overlay) says it reads Midnight only when it can', () => {
    expect(en['m.tech.check.p']).toMatch(
      /The check page looks that transaction up on Midnight itself when it can reach Midnight; otherwise it says the date is our registry's report, and you can look it up on a Midnight explorer\./,
    );
    expect(en['m.tech.check.p']).toMatch(
      /The evidence bundle's verify\.html does the recomputing offline and names the transaction and root to look up\./,
    );
  });
  it('the test site says it reads Midnight itself through the sponsor relay, when it can reach Midnight', () => {
    for (const k of CHECK_KEYS) {
      expect(testSite[k], k).toMatch(/looks that transaction up on Midnight itself when it can reach Midnight\./);
      expect(testSite[k], k).not.toMatch(/once our read-only relay/);
    }
    // Every language's test-site overlay says the same.
    const WHEN: Record<string, RegExp> = {
      de: /selbst auf Midnight nach, wenn sie Midnight erreicht\./,
      fr: /consulte elle-même cette transaction sur Midnight quand elle peut joindre Midnight\./,
      es: /consulta esa transacción en Midnight por sí misma cuando puede llegar a Midnight\./,
      ja: /Midnightに接続できればそのトランザクションをMidnight上で自ら照会します。/,
    };
    for (const [lang, re] of Object.entries(WHEN)) {
      const o = networkOverlay(TEST_SITE, lang as Lang) as Record<string, string>;
      for (const k of CHECK_KEYS) expect(o[k], `${lang} ${k}`).toMatch(re);
    }
    // A test build reads through the indexer its chain features use (the sponsor's relay).
    expect(readIndexersFor('preprod', { indexer: 'https://sponsor.example/indexer' })).toEqual([
      'https://sponsor.example/indexer',
    ]);
  });
  it('veilcore.org says it will, until a build has the read-only relay; then that it does', () => {
    for (const k of CHECK_KEYS) {
      expect(mainnetNoRelay[k], k).toMatch(
        /The check page will read Midnight itself once our read-only relay is live; until then it says the date is our registry's report, and you can look the transaction up yourself( on a Midnight explorer)?\./,
      );
      expect(mainnetNoRelay[k], k).not.toMatch(/looks that transaction up on Midnight itself/);
      expect(mainnetRelay[k], k).toMatch(/looks that transaction up on Midnight itself\./);
      expect(mainnetRelay[k], k).not.toMatch(/once our read-only relay/);
    }
    // On mainnet only the relay counts: a leftover test indexer never makes it "read".
    expect(readIndexersFor('mainnet', { indexer: 'https://sponsor.example/indexer' })).toEqual([]);
    expect(readIndexersFor('mainnet', { relay: 'https://relay.example/indexer' })).toEqual([
      'https://relay.example/indexer',
    ]);
    // The flag the build uses is that same list being non-empty.
    const config = fs.readFileSync(path.join(SRC, 'veilcore/chain/config.ts'), 'utf8');
    expect(config).toMatch(/export const CHAIN_READS: boolean = READ_INDEXERS\.length > 0;/);
    expect(fs.readFileSync(path.join(HERE, 'index.tsx'), 'utf8')).toMatch(/chainReads: CHAIN_READS,/);
  });
  it('the app footer is plain in every build and language; the look-up sentence is in the technical section', () => {
    for (const lang of ['en', 'de', 'es', 'fr', 'ja'] as Lang[]) {
      for (const build of [TEST_SITE, MAINNET, { ...MAINNET, chainReads: true }]) {
        const o = networkOverlay(build, lang) as Record<string, string>;
        expect(o['footer.about'], `${lang} overlay`).toBeUndefined();
      }
    }
    expect(en['footer.about']).toBe('An open record format for plant and animal genetics.');
    expect(en['footer.howCheck']).toBe('How checking works →');
    for (const s of [en, testSite, mainnetNoRelay, mainnetRelay])
      expect(s['m.tech.check.p']).toMatch(/Looking a record up by its identifier on this site uses our server\.$/);
    const footer = fs.readFileSync(path.join(SRC, 'components/AppFooter.tsx'), 'utf8');
    expect(footer).toMatch(/to="\/#technical"[\s\S]*footer\.howCheck/);
  });
  it('the overlays change only the check page sentence', () => {
    for (const s of [testSite, mainnetNoRelay, mainnetRelay])
      for (const k of CHECK_KEYS) expect(around(s[k]), k).toBe(around(en[k]));
  });
  it('the Japanese mainnet overlay follows the relay flag too', () => {
    for (const chainReads of [true, false]) {
      const o = jaMainnet({ ...BUILD, chainReads });
      expect(o['m.tech.check.p']).toMatch(chainReads ? /Midnight上で自ら照会します/ : /読み取り専用リレーが稼働すれば/);
      expect(o['footer.about']).toBeUndefined();
      expect(o['m.live.chain.main']).toBe(chainReads ? 'あり。' : undefined);
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
  it('every site, veilcore.org included, says a locked lab report is kept 180 days (16 Oct)', () => {
    for (const s of [en, testSite, ...mainnetVariants]) {
      expect(s['m.privacy.stored.text']).toMatch(
        /Locked lab reports a lab sends you: stored locked, without the key, and deleted after 180 days/,
      );
      expect(s['m.privacy.local.text']).toMatch(/A lab report reaches our server only when a lab sends it back to you/);
      expect(s['m.faq.4a']).toMatch(/deleted after 180 days/);
      expect(s['m.privacy.who.text']).toMatch(/deleted 180 days after they arrive/);
      expect(s['m.for.4p']).toMatch(/New, and still being tested\.$/);
      expect(
        offenders(s, /test site first|turned off for now|Not on this website yet: it's on the test site/i),
      ).toEqual([]);
    }
    // Japanese on veilcore.org says the same (its mainnet overlay no longer replaces these).
    const jaMain = { ...ja, ...networkOverlay(MAINNET, 'ja') } as Record<string, string>;
    expect(jaMain['m.privacy.stored.text']).toMatch(/180日後に削除します/);
    expect(jaMain['m.faq.4a']).toMatch(/180日後に削除されます/);
    expect(jaMain['m.for.4p']).not.toMatch(/まずテストサイト/);
  });
  it('a locked lab report waits on our server unread; nothing says VeilCore "holds" it', () => {
    // Read as "VeilCore keeps people's files". Only a lab report coming back is ever on our
    // server, locked in the lab's browser, and VeilCore can't open it.
    const holds = /holds only the locked file|only ever holds the locked file|holds the locked file/i;
    for (const [site, s] of Object.entries(SITES)) {
      expect(offenders(s, holds), site).toEqual([]);
      // Never more than "stored locked, and we don't have the key": VeilCore also serves the
      // app's code, so "can't read it" would claim more than the design shows (round 2).
      expect(s['m.for.4p'], site).toMatch(
        /The locked file waits on VeilCore's server for you to open, and we don't have its key\. VeilCore records who signed; it doesn't vouch for the result\./,
      );
      expect(offenders(s, /VeilCore can't read|VeilCore can’t read|unreadable to us/i), site).toEqual([]);
    }
    const old: Record<Exclude<Lang, 'en'>, RegExp> = {
      de: /VeilCore hält nur die verschlossene Datei/,
      fr: /VeilCore ne garde que le fichier verrouillé/,
      es: /VeilCore solo guarda el archivo cerrado/,
      ja: /VeilCoreが保持するのは鍵のかかったファイル/,
    };
    const cantRead: Record<Exclude<Lang, 'en'>, RegExp> = {
      de: /wir haben ihren Schlüssel nicht/,
      fr: /nous n'avons pas sa clé/,
      es: /nosotros no tenemos su clave/,
      ja: /私たちはその鍵を持っていません/,
    };
    for (const lang of ['de', 'fr', 'es', 'ja'] as const) {
      const { strings, testchain } = LANGUAGES[lang];
      const shown = { ...strings, ...testchain } as Record<string, string>;
      expect(offenders(shown, old[lang]), lang).toEqual([]);
      expect(strings['m.for.4p'], lang).toMatch(cantRead[lang]);
    }
    // On veilcore.org in Japanese, m.for.4p is ja.ts's own (the mainnet overlay no longer replaces it).
    const jaMain = { ...ja, ...networkOverlay(MAINNET, 'ja') } as Record<string, string>;
    expect(jaMain['m.for.4p']).toMatch(cantRead.ja);
    expect(offenders(jaMain, old.ja)).toEqual([]);
    const lab = fs.readFileSync(path.join(SRC, 'components/flow/LabResults.tsx'), 'utf8');
    expect(lab).not.toMatch(holds);
    expect(appText(lab)).not.toMatch(holds);
    expect(appText(lab)).toContain(
      'The locked file waits on VeilCore’s server for the breeder to open, and VeilCore doesn’t have its key.',
    );
    const video = fs.readFileSync(path.join(SRC, '..', 'media-src/explainer/explainer.html'), 'utf8');
    expect(video).not.toMatch(holds);
    expect(video).toContain('>VeilCore doesn’t have its key</div>');
    expect(video).not.toMatch(/VeilCore can’t read/);
  });
  it('the wording above holds only while lab reports are on everywhere, mainnet included', () => {
    // If one network is switched off again (labResultsEnabledFor in config/network.ts),
    // m.for.4p, m.faq.4a, m.privacy.* and m.live.results.* must say so for that site.
    for (const n of ['mainnet', 'preprod', 'preview', 'undeployed']) expect(labResultsEnabledFor(n), n).toBe(true);
  });
});

describe('animal records (16 Oct 2026): where they can be logged', () => {
  const OLD = {
    en: /aren't published yet|set up for plants|only on the test site|on the test site:|a draft/,
    de: /noch nicht veröffentlicht|für Pflanzen eingerichtet|Testseite|Entwurf/,
    es: /aún no están publicados|pensada para plantas|sitio de prueba|borrador/,
    fr: /pas encore publiés|prévue pour les plantes|site de test|brouillon/,
    ja: /まだ公開されていません|植物向け|テストサイト|草案/,
  };
  const NOW = /You can log an animal on this site: its individual ID, sire and dam, and a DNA report\.$/;
  it('every site, veilcore.org included, says animals can be logged there; the fields are no draft', () => {
    for (const site of [en as Record<string, string>, testSite, ...mainnetVariants]) {
      expect(site['m.for.5p']).toMatch(NOW);
      expect(site['m.for.5p']).not.toMatch(OLD.en);
    }
    // The mainnet overlays don't replace it any more: veilcore.org says what the test site says.
    for (const f of [true, false]) {
      const flags = { claimsOnMainnet: f, policyApproved: f };
      expect(mainnetStrings(flags)['m.for.5p']).toBeUndefined();
      expect(jaMainnet(flags)['m.for.5p']).toBeUndefined();
    }
  });
  it('only the last sentence changed: the paragraph still opens as before', () => {
    for (const site of [en as Record<string, string>, ...mainnetVariants])
      expect(site['m.for.5p']).toMatch(
        /^Herd books keep the pedigree\. A record can give each entry a date nobody can backdate, without publishing the genotype\. /,
      );
  });
  it('every translation drops the old sentences', () => {
    for (const l of ['de', 'es', 'fr', 'ja'] as const) {
      expect(LANGUAGES[l].strings['m.for.5p'], l).not.toMatch(OLD[l]);
      expect(LANGUAGES[l].strings['m.for.5p'], l).not.toBe(en['m.for.5p']);
    }
    expect(ja['m.for.5p']).toContain('このサイトでは、動物の個体識別番号');
  });
  it('the words follow the switch: animal logging is on for every network, mainnet included', () => {
    // If one network is switched off again, m.for.5p must say so for that site.
    for (const n of ['mainnet', 'preprod', 'preview', 'undeployed']) expect(animalRecordsEnabledFor(n), n).toBe(true);
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
    [true, false].flatMap((policyApproved) =>
      [true, false].map((chainReads) => ({ claimsOnMainnet, policyApproved, chainReads })),
    ),
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
      // Lab reports are on veilcore.org too (16 Oct): ja.ts's own sentences apply there.
      for (const k of ['m.for.4p', 'm.faq.4a', 'm.privacy.local.text', 'm.privacy.who.text'] as const)
        expect(o[k], k).toBeUndefined();
      expect(o['m.privacy.stored.text']).toMatch(
        /180日後に削除します。サーバーはRailway上でホストされているVeilCoreのレジストリです。$/,
      );
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
    expect(en['m.postB.text']).toMatch(
      /Checked on 15 October against two block explorers: the stamp leads to Bitcoin blocks 971004 and 971005\. A check with the official OpenTimestamps tool and a full Bitcoin node is still to do\.$/,
    );
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
  // Round 7: the check page reading Midnight itself.
  CHANGED.push('footer.about');
  CHANGED.push(
    'm.step2.text',
    'm.for.6p',
    'm.open.3p',
    'm.faq.4a',
    'm.privacy.stored.text',
    'm.privacy.local.text',
    'm.privacy.who.text',
  );
  // Sealed records round 2 (16 Oct): what the server can read.
  CHANGED.push('m.verify.what', 'm.privacy.browser.text');
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
