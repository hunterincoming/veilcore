// The English strings that differ in a mainnet build (`--mode mainnet`). en.ts holds the
// test-network wording; in a mainnet build every key here replaces it, in every language,
// because a draft translation of the test-network sentence would be wrong on mainnet. A
// language that has translated this overlay shows its own (Japanese: ja.ts, jaMainnet);
// change both together.
//
// Written to be true whether or not the first mainnet batch has been anchored yet: the
// main contract is on Midnight's main network, and records sealed here go into batches
// that VeilCore anchors there (by hand for now: the operator seals a batch and anchors
// its root, see the registry README, so a new record can wait a while). Nothing here may
// say a batch has already been anchored on mainnet. The site still sends no transactions itself
// (licenses and lab agreements are simulated; a DNA report pairing is saved but not
// dated). Records sealed here are real records, so the mainnet site doesn't call itself
// a demo; only the simulated parts are named as simulated. The claims contract deploys right after the main one; until its address is
// pinned, the strings say it is not on the main network yet. A mainnet build cannot
// happen before the main contract's address is pinned (vite.config.ts), so none of this
// can be published early.
//
// The maintenance key: the site says the policy is decided only when
// docs/maintenance-policy.md's own status line says APPROVED (read at build time,
// scripts/maintenance-policy.mjs). The claims contract's lack of a maintenance key is
// mentioned only once its address is pinned: the operator tool deploys it on mainnet
// only with the authority retired (assertClaimsDeployAllowed, api/src/claims-api.ts).
//
// The dated update posts keep the network they ran on (Midnight's preprod test
// network): they are history, and the tests exempt them by key (DATED_POSTS).
//
// The check page reading Midnight itself (docs/check-on-chain.md): on mainnet it needs the
// read-only indexer relay, given at build time as VITE_INDEXER_RELAY_URL. `chainReads` is
// true when this build has one (CHAIN_READS, veilcore/chain/config.ts); until then the
// strings say the page will read Midnight once the relay is live, and that the date it
// shows is the registry's report.
//
// Every user-visible string here is listed for fact-checking in
// scratchpad/site-mainnet/new-copy.md.
// SPDX-License-Identifier: Apache-2.0

import type { StringKey } from './en';

type Overlay = Partial<Record<StringKey, string>>;

const common: Overlay = {
  'm.hero.status':
    "VeilCore's contract is on Midnight's main network. Records sealed on this site are real records: they go into batches that we anchor there by hand for now. Licenses and lab agreements here are still simulated.",
  'm.faq.3a':
    "It's built to be evidence, and our note for lawyers says what a record proves and what it doesn't. Records sealed here go into batches that we anchor on Midnight's main network by hand. Once a record's batch is anchored, the date shows the record existed by then; what that's worth in a dispute is for the court to weigh.",
  'm.stat2.b': 'Main network',
  'm.foot.about':
    "An open record format for plant and animal genetics. Records are dated by anchoring on Midnight's main network.",
  'm.get.2b':
    "They attach to the record. A licensee can prove they hold a live license without showing which one. A royalty or other obligation on a parent shows on every offspring both holders confirmed; VeilCore records it and doesn't collect it. Built into the contract on Midnight's main network; simulated on this website.",
  'm.demo.lede':
    "No sign-up, no wallet. Records you seal here are real records: each goes into a batch that we anchor on Midnight's main network, by hand for now, so a new record can wait a while; its check page shows when its batch is anchored. Checking is free. Licenses and lab agreements are simulated, and DNA report pairings aren't dated. Don't type anything you need to keep secret.",
  // Dated posts: history, so they name the network the run was on (see DATED_POSTS).
  'm.post0.text':
    "Both contracts passed all 37 end-to-end checks on Midnight's preprod test network, including the new claims: a value, a range, a difference, an unchanged correction and a signature from a test lab key. Made-up marker data.",
  'm.post2.title': "A full run on Midnight's preprod test network",
  'm.post2.text':
    "The contract deployed to Midnight's preprod test network and passed all 26 end-to-end checks, using 16 of its 24 operations with real proofs.",
  'm.contact.1p': 'Make a record, then tell us what is missing for your work.',

  // Records made here are real on mainnet: no "demo" labels.
  'm.nav.demo': 'Make a record',
  'm.foot.demo': 'Make a record',
  'm.hero.demoLabel': 'Live fingerprint',
  'm.demo.label': 'Use it',
  'm.demo.title1': 'Make a record',
  'm.demo.title2': 'or check one.',
  'm.demo.create.text': "Log a plant, save your backup, then see your plant's page.",
  'm.demo.privacy': 'What this site keeps →',
  'm.faq.4link1': 'What this site keeps →',
  'm.faq.2a':
    'No. Making a record on this site and checking any record need no wallet, no sign-up and nothing to buy. Your browser keeps a random key that finds your records on our server. The fingerprint goes on Midnight, a blockchain built for privacy. You never deal with it directly.',
  'm.for.1p':
    "Seal a record and pair its DNA report. If the plant turns up under another name, a lab can compare a new test with your report. On this website the pairing is saved with your record but not yet dated. VeilCore doesn't test DNA.",
  'm.for.3p':
    "Send material with a lab code. The lab signs a receipt with its own key, so the record shows a second party. The receipt is a real signature, kept by VeilCore's registry, not on the chain. Terms such as no propagation are practice only on this website.",
  'm.for.5p':
    "Herd books keep the pedigree. A record can give each entry a date nobody can backdate, without publishing the genotype. This website is set up for plants; the animal record fields aren't published yet.",
  // "Prove it" by link needs the browser to send a transaction, which this site doesn't.
  'm.for.6p':
    "They send you a link. You tap once, and their page checks on the network that you control your plant's own key. Your record named that key when it was sealed, so it can't be swapped. It says nothing about who you are or who bred the plant. This website can't do it yet.",
  // Lab reports sent back through the registry are off on mainnet for now
  // (LAB_RESULTS_ENABLED in config/network.ts). When that flips, m.for.4p, m.faq.4a,
  // m.privacy.local.text and m.privacy.who.text here, and m.live.results.* in en.ts,
  // change with it; copy-truth.test.ts fails until they do.
  'm.for.4p':
    "The lab signs your report and locks it so only you can open it. No PDF sits in anyone's inbox. The locked file waits on VeilCore's server for you to open; VeilCore can't read it, and records who signed; it doesn't vouch for the result. Not on this website yet: it's on the test site first.",
  'm.faq.4a':
    "Your genetic data: nothing. It's fingerprinted on your computer, as are the files you add, and they aren't uploaded. This website keeps what you type (names, dates, notes, agreement terms) and your lab files' names, so you can come back to them, and a record's public check page shows its cultivar name. Labs and developers can seal records inside their own systems, so only the fingerprint goes out.",
  'm.privacy.local.text':
    'Genetic data, and the lab reports, DNA reports and photos you add. Your browser reads them to compute their fingerprints; the files themselves are never uploaded.',
  'footer.privacy': 'Site privacy',
  'title.privacy': 'Site privacy',
  'm.foot.privacy': 'Site privacy',
  'm.privacy.label': 'Site privacy',
  'm.privacy.title': 'What this site keeps.',

  'm.privacy.lede':
    "This note covers this website. Records you seal here are real records: they go into batches that we anchor on Midnight's main network by hand.",
  'm.privacy.stored.title': 'Stored on our server',
  'm.privacy.stored.text':
    "What you type and what your browser computes from it: cultivar and breeder names, species if you enter one, dates, notes, reference numbers, parents, fingerprints of records, fingerprints of photos and lab reports (only the fingerprints, never the files), lab report file names, agreement terms and counterparties, material you send to a lab (who it is addressed to, and the quantity), and, for labs, the public signing key and the attestations they publish. Also your holder key, which your browser sends with every save so the server can find your records. The server is VeilCore's registry, hosted on Railway.",
  'm.privacy.test.title': "Dated on Midnight's main network",
  'm.privacy.test.text':
    "Your record's fingerprint goes into a batch, and we anchor the batch on Midnight's main network, by hand for now, so it can take a while. Only the batch's fingerprint goes on the network, never what you typed. Once anchored, it is permanent: nobody, including us, can delete it.",
  'm.privacy.madeup.title': 'Type only what you are happy for us to keep',
  'm.privacy.madeup.text':
    "Everything you type is kept on our server, and a record's cultivar name is shown on its public check page. Don't type anything you need to keep secret. Genetic data never leaves your computer.",
  'm.privacy.who.text':
    "VeilCore isn't incorporated yet, so VeilCore's founders run this site and the registry. There is no set retention period: what the registry holds stays there until you ask us to delete it. Contact: hunter@veilcore.org.",
  'm.privacy.delete.text':
    "We can delete what our server holds for your records: email hunter@veilcore.org with the records' identifiers. A batch fingerprint already anchored on Midnight stays there.",
};

/** The claims contract's address is pinned: it is on the main network. */
const claimsLive: Overlay = {
  'm.claims.status':
    "A second Midnight contract, on Midnight's main network. Before launch it passed every end-to-end check, with made-up marker data. It isn't on this website yet.",
  'm.stat2.s':
    "Both contracts are on Midnight's main network. Records sealed on this site go into batches that we anchor there by hand for now.",
};

/** Not pinned yet: the main contract is live, the claims contract is still to follow. */
const claimsPending: Overlay = {
  'm.claims.status':
    "A second Midnight contract. It passed every end-to-end check in pre-launch testing, with made-up marker data. It isn't on Midnight's main network yet, and isn't on this website.",
  'm.stat2.s':
    "The main contract is on Midnight's main network. Records sealed on this site go into batches that we anchor there by hand for now. The claims contract follows.",
};

/**
 * The update posts that are dated history. They say "preprod test network" on the mainnet
 * site too, because that is where those runs happened.
 */
export const DATED_POSTS: readonly StringKey[] = ['m.post0.text', 'm.post2.title', 'm.post2.text'];

const KEY_HOLDERS =
  "One maintenance key can change how VeilCore's main contract on Midnight works. Whoever holds it can add or replace the contract's operations, which could take over any record's identity, add licenses for any issuer, add or remove obligations and parent links, or switch operations off. It cannot backdate the network's block times, and every change shows on chain. Today the key is on paper, one copy with each founder, and either copy alone can use it. Moving it to a group of keys that must agree is planned, not done.";
const CLAIMS_NO_KEY = ' The claims contract has no maintenance key: nobody, including us, can change it.';

/** Who can change the contracts. "Decided" only when the policy's status line says APPROVED. */
const keyStrings = (claimsOnMainnet: boolean, policyApproved: boolean): Overlay => ({
  // Both contracts are shown once the claims address is pinned; otherwise the title stays singular.
  ...(claimsOnMainnet ? { 'm.status.keyTitle': 'Who can change the contracts.' } : {}),
  'm.status.keyText':
    KEY_HOLDERS +
    (policyApproved
      ? ' Every use is announced publicly, under a written maintenance policy.'
      : ' A policy for using it is proposed, not decided.') +
    (claimsOnMainnet ? CLAIMS_NO_KEY : ''),
  'm.status.keyLink': policyApproved ? 'Read the maintenance policy →' : 'Read the proposed policy →',
});

const ABOUT_HEAD =
  "An open record format for plant and animal genetics. Recomputing a record's fingerprint needs only SHA-256 and the open specification.";
const ABOUT_TAIL = ' Looking a record up by its identifier on this site uses our server.';
const TECH_HEAD =
  "Recomputing a record's fingerprint needs only SHA-256 and the open spec. Its inclusion proof ties that fingerprint to a batch fingerprint anchored on Midnight, and the transaction that anchored it gives the batch's date. The evidence bundle's verify.html does the recomputing offline and names the transaction and root to look up.";
const TECH_TAIL =
  ' Records sealed since 14 October name their own key, so checking them also needs spec section 3.6.1, published in the spec on this site; the SDK and its three implementations get it in their next release.';
/** Before the relay: what the check page does today, and that you can look it up yourself. */
const RELAY_PENDING =
  " The check page will read Midnight itself once our read-only relay is live; until then it says the date is our registry's report, and you can look the transaction up yourself.";

/** Whether the check page reads Midnight itself in this build. */
const chainStrings = (chainReads: boolean): Overlay =>
  chainReads
    ? {
        'footer.about': `${ABOUT_HEAD} Its date comes from one transaction on Midnight, and the check page looks that transaction up on Midnight itself.${ABOUT_TAIL}`,
        'm.tech.check.p': `${TECH_HEAD} The check page looks that transaction up on Midnight itself.${TECH_TAIL}`,
        'm.live.chain.main': 'Yes.',
      }
    : {
        'footer.about': `${ABOUT_HEAD} Its date comes from one transaction on Midnight.${RELAY_PENDING}${ABOUT_TAIL}`,
        'm.tech.check.p': `${TECH_HEAD}${RELAY_PENDING.replace(/\.$/, ' on a Midnight explorer.')}${TECH_TAIL}`,
      };

/** The overlay for a mainnet build. */
export const mainnetStrings = ({
  claimsOnMainnet,
  policyApproved,
  chainReads = false,
}: {
  claimsOnMainnet: boolean;
  policyApproved: boolean;
  /** The check page reads Midnight itself (a read-only relay is configured). */
  chainReads?: boolean;
}): Overlay => ({
  ...common,
  ...(claimsOnMainnet ? claimsLive : claimsPending),
  ...keyStrings(claimsOnMainnet, policyApproved),
  ...chainStrings(chainReads),
});
