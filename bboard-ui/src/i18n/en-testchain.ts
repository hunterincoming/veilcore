// The English strings that differ on the public test site (test.veilcore.org): a build
// with VITE_REAL_CHAIN=1 on a test network. There the browser sends real transactions
// (VeilCore's sponsor pays the fee), so en.ts's demo wording would be wrong: each record
// is date-stamped from the browser, batches are anchored automatically (the sponsor's
// anchoring job, docs/no-wallet-run-12oct.md), a DNA report pairing can be dated, and
// "prove it" by link works. Licenses and lab agreements are still practice only.
//
// Order in i18n/index.tsx: en, then this overlay (and its translation, where a language
// has one) when REAL_CHAIN && !IS_MAINNET; en-mainnet.ts on a mainnet build. A mainnet
// build refuses VITE_REAL_CHAIN=1 (vite.config.ts), so the two never meet.
//
// Facts: the main network launch (both contracts, 8 October 2026) is from
// docs/deployment-record-revision-4.md, "Mainnet deployment"; the test site from
// docs/test-site.md. copy-truth.test.ts keeps the stale wording out.
// SPDX-License-Identifier: Apache-2.0

import type { StringKey } from './en';

export type Overlay = Partial<Record<StringKey, string>>;

export const testchainStrings: Overlay = {
  'm.hero.status':
    "This is the test site: date stamps, lab codes and proof links work for real, on Midnight's test network. Records here are practice, not evidence.",
  'm.claims.status':
    "A second Midnight contract. It passed every end-to-end check on Midnight's preprod test network on 4 October 2026, with made-up marker data, and has been on Midnight's main network since 8 October 2026. It isn't on this website yet.",
  'm.faq.3a':
    "It's built to be evidence, and our note for lawyers says what it proves and what it doesn't. This test site dates records on Midnight's test network, and a test-network date carries no evidentiary weight. Real records go on veilcore.org, which runs on Midnight's main network.",
  'm.stat2.b': 'Test site',
  'm.stat2.s':
    "This site runs on Midnight's preprod test network, for practice. Both contracts have been on Midnight's main network since 8 October 2026.",
  'm.foot.about':
    "An open record format for plant and animal genetics. This is the test site, on a Midnight test network; veilcore.org runs on Midnight's main network.",
  'm.for.1p':
    "Seal a record and pair its DNA report. If the plant turns up under another name, a lab can compare a new test with your report. When you pair through VeilCore's contract on Midnight, the pairing is dated too: it shows that whoever controlled your record at that date had that report, or its SHA-256, by then. What goes on chain is tied to your record and hides the report, so nobody can copy your pairing to their own record. On this test site you can date the pairing from your browser. VeilCore doesn't test DNA.",
  'm.demo.lede':
    "No sign-up, no wallet. This is the test site, so use made-up details. Your browser date-stamps each record on Midnight's test network (VeilCore pays the fee), and batches are anchored automatically. You can date a DNA report pairing too. A lab's receipt is a real signature with the lab's own key, kept off the chain. Licenses and lab agreements are practice only.",
  'm.privacy.test.text':
    "This site uses Midnight's preprod test network, not the main one. Your browser sends each date stamp to that network through VeilCore's fee service; what you typed and your files are never sent to it. A test network can be reset, and test data may be deleted.",
  'm.privacy.hosts.text':
    "This website is hosted on Vercel, which logs IP addresses and requests. Our registry server, and the service that pays test-network fees and passes this page's reads of the network, run on Railway, which logs requests. That service reads the network through Blockfrost.",
};
