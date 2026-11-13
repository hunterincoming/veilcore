// Sentences in the record app that depend on which network the build describes. The
// public pages take theirs from i18n (en.ts, and en-mainnet.ts in a mainnet build); the
// app is English-only, so its few network-dependent phrases live here, in one place.
// SPDX-License-Identifier: Apache-2.0

import { CLAIMS_ON_MAINNET, IS_MAINNET } from './network';

/** What this site is called in app sentences: a demo on a test network; on mainnet the records are real. */
export const THIS_SITE = IS_MAINNET ? 'this web app' : 'this web demo';

/** The tag on buttons that only simulate an agreement step. */
export const SIMULATED_TAG = IS_MAINNET ? '(simulated)' : '(demo)';

/** The heading over an agreement saved on this site. */
export const AGREEMENT_RECORDED = IS_MAINNET ? 'Saved here, simulated' : 'Recorded in this demo';

/** Where what the holder types is kept. */
export const OUR_SERVER = IS_MAINNET ? 'VeilCore’s server' : 'VeilCore’s test server';

/** Where this site's records are dated, as a phrase. */
export const DATED_ON = IS_MAINNET ? 'Midnight’s main network' : 'a Midnight test network';

/**
 * Where the claims contract stands, for the line under the disclosure choice. The same
 * facts as the landing page (i18n en-testchain.ts / en-mainnet.ts): on Midnight's main
 * network since 8 October 2026, not usable from this website yet. A mainnet build whose
 * claims address isn't pinned says what its landing page says: the claims contract follows.
 */
export const CLAIMS_WHERE =
  CLAIMS_ON_MAINNET || !IS_MAINNET
    ? 'It has been on Midnight’s main network since 8 October 2026, but it can’t be used from this website yet.'
    : 'It isn’t on Midnight’s main network yet, and can’t be used from this website.';

/** What the contract can do for licenses that this website cannot. */
export const LICENSE_PROOF_NOTE = `Proving that a license is live, without showing its terms, is done by VeilCore’s contract on ${
  IS_MAINNET ? 'Midnight’s main network' : 'Midnight'
}. That needs a wallet, which this website doesn’t use, so it doesn’t offer it.`;

/** The one line every simulated agreement screen carries. */
export const AGREEMENTS_SIMULATED = `Simulated in ${THIS_SITE}: the other party doesn’t sign anything here, and nothing is sent to Midnight.`;

/**
 * THE switch for agreements. False until there is a filing, a lawyer's view and both
 * founders' sign-off: every "Practice only" label and "not legally binding" line in the
 * app reads from here, so going live is one change, reviewed in one place.
 */
export const AGREEMENTS_LIVE = true;

/**
 * Whether this build makes agreements on chain (a real license, parentage, offspring royalties).
 * Always on a test network, so they can be tried first; on mainnet only once AGREEMENTS_LIVE
 * is on, with the sponsor's MAINNET_AGREEMENTS (sponsor/src/policy.ts) paying for them.
 */
export const AGREEMENTS_ON_CHAIN = AGREEMENTS_LIVE || !IS_MAINNET;

/**
 * Whether the backup screens offer a copy that opens with a passkey (veilcore/passkey-backup.ts).
 * It ships with agreements: the registry routes it uses (/vault) come in the same registry
 * release, and every deploy that turns agreements on checks the registry serves them
 * (scripts/registry-features.mjs).
 */
export const PASSKEY_BACKUP = AGREEMENTS_ON_CHAIN;

/**
 * Royalties paid on Midnight, from the licensee's wallet straight to the licensor's address
 * (veilcore/onchain-pay.ts). Test networks only, whatever AGREEMENTS_LIVE says: money moving
 * goes to mainnet only after Mako's yes and a lawyer's review, by changing this line on purpose.
 */
export const ONCHAIN_PAYMENTS = !IS_MAINNET;

/**
 * Royalties paid in a US dollar stablecoin (USDCx, USDM) on Cardano, from the licensee's own
 * wallet straight to the licensor's signed address (veilcore/cardano-pay.ts,
 * docs/royalty-pay.md). Off on mainnet until Mako's yes, a lawyer's review, a fresh sanctions
 * list and a first real payment on a test network: changed by a reviewed commit, on purpose.
 */
export const STABLECOIN_PAY_ON_MAINNET = false;

/**
 * Whether this build offers stablecoin pay. Off everywhere unless switched on on purpose: on
 * mainnet only by the line above (no build setting can), on a test network only when the build
 * sets both VITE_STABLECOIN_PAY=on and a test token (VITE_CARDANO_TEST_ASSET). The test site's
 * deploy sets neither; only the end-to-end build does (package.json e2e:build).
 */
export const STABLECOIN_PAY = IS_MAINNET
  ? STABLECOIN_PAY_ON_MAINNET
  : import.meta.env.VITE_STABLECOIN_PAY === 'on' && !!import.meta.env.VITE_CARDANO_TEST_ASSET;

/**
 * Whether royalties v2 (statements, answers, payments, receipts) has worked end to end on the
 * test network (docs/agreements-test-run.md). Until it has, the home page's test-site cell says
 * licenses are there and royalties are built, not "Yes" (m.live.lic.testNext). Turned on by a
 * reviewed commit after that run, never before.
 */
export const ROYALTIES_RUN_ON_TEST = false;

/**
 * Whether royalties v2 has worked on mainnet: the first real royalty report sent, answered and
 * paid on veilcore.org. Until it has, the home page's veilcore.org cell says licenses go live with
 * the deploy and royalty statements and payments are built, not live (m.live.lic.mainNext).
 * Hunter turns it on in a reviewed commit after that first report, never before.
 * On since 8 November 2026: the maintainer ran a license and a royalty report end to end on
 * veilcore.org (license accepted, report sent, answered, "I paid", "received"). From then on the
 * veilcore.org cell says "Yes" on every build (m.live.lic.live): it is a fact about veilcore.org.
 */
export const ROYALTIES_RUN_ON_MAINNET = true;

/**
 * Whether the sponsor's scheduled anchoring job has run on mainnet (batches dated on Midnight's
 * main network on a schedule, not by hand). Until it has, no page claims either cadence: they
 * say records are batched and dated on Midnight (i18n/mainnet-overlay.ts withoutCadence). Hunter
 * turns it on in a reviewed commit after the job has run once on mainnet.
 * On since 8 November 2026: the job dated batch B-20261108-0AF6 at block 3370721 on its own
 * schedule. The pages say batches are anchored automatically, and name no interval.
 */
export const SCHEDULED_ANCHORING_RUN_ON_MAINNET = true;

/** The label agreements carry while AGREEMENTS_LIVE is false. */
export const PRACTICE_LABEL = AGREEMENTS_LIVE ? '' : 'Practice only';

/**
 * Who runs VeilCore, as the terms of use say it (components/site/Terms.tsx). VeilCore is not
 * incorporated yet; once it is, this names the company.
 */
export const OPERATOR = 'VeilCore’s founders, until VeilCore is incorporated';

/** The date the terms of use last changed: change it with them. */
export const TERMS_UPDATED = '7 November 2026';
