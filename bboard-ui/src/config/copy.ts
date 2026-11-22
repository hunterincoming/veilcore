// Sentences in the record app that depend on which network the build describes. The
// public pages take theirs from i18n (en.ts, and en-mainnet.ts in a mainnet build); the
// app is English-only, so its few network-dependent phrases live here, in one place.
// SPDX-License-Identifier: Apache-2.0

import { CLAIMS_ON_MAINNET, IS_MAINNET } from './network';
import { CHAIN_READY, CLAIMS_READY } from '../veilcore/chain/config';
import { claimsWhere } from '../i18n/app/claims-where';

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
 * Where the claims contract stands, for the line under the disclosure choice ("Show someone").
 * The same facts as the landing page (i18n en-testchain.ts / en-mainnet.ts): on Midnight's main
 * network since 8 October 2026. veilcore.org, which proves one number (CLAIMS_ON_THIS_SITE, below),
 * says so; one that can't says it can't
 * be used here yet; a mainnet build whose claims address isn't pinned says it follows. Every
 * language's sentences are in i18n/app/claims-where.ts.
 */
/**
 * veilcore.org offers "prove a fact": a mainnet build that sends transactions, with VeilCore's
 * pinned claims contract. The home page (i18n/index.tsx THIS_BUILD.claimsOnSite) and "Show
 * someone" (CLAIMS_WHERE) read this one switch, so they can't disagree.
 */
export const CLAIMS_ON_THIS_SITE = IS_MAINNET && CHAIN_READY && CLAIMS_READY;

export const CLAIMS_WHERE = claimsWhere('en', { onSite: CLAIMS_ON_THIS_SITE, live: CLAIMS_ON_MAINNET || !IS_MAINNET });

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
 * Whether lab signing (config/network.ts LAB_SIGNING_ENABLED) has worked on veilcore.org: a lab
 * key made there, one result signed on a record, checked on /check-lab-result, and its signature
 * hidden from a check link until the holder shared it. Until it has, the home page's veilcore.org
 * cell says it is built and not yet tried on the main network (m.live.signed.main), never "Yes".
 * Hunter turns it on in a reviewed commit after that first run, never before: then the
 * veilcore.org cell says "Yes" on every build (m.live.signed.live), a fact about veilcore.org.
 * On since 18 November 2026: all 18 steps of docs/lab-mainnet-test.md passed on veilcore.org
 * (step 13 on a second run that day, after a wording fix); the signature from step 12 of the
 * first run was published at block 3514926. "Live" covers only what ran there: a lab signed a
 * result, the holder checked it, shared it and proved a number from it, and the lab withdrew it.
 * In that run the lab and the holder were the same window, so adding a lab's result file to
 * another breeder's records (check page, "Add it as a record you hold") did not run then. It ran
 * on 21 November 2026 (docs/lab-mainnet-test.md, third run: a second browser added the result,
 * published its signature at block 3553271, proved a number at block 3553306 and reloaded), and
 * the cell says so with that date (m.live.signed.live).
 */
export const LAB_SIGNING_RUN_ON_MAINNET = true;

/**
 * Whether the sponsor's scheduled anchoring job has run on mainnet (batches dated on Midnight's
 * main network on a schedule, not by hand). Until it has, no page claims either cadence: they
 * say records are batched and dated on Midnight (i18n/mainnet-overlay.ts withoutCadence). Hunter
 * turns it on in a reviewed commit after the job has run once on mainnet.
 * On since 8 November 2026: the job dated batch B-20261108-0AF6 at block 3370721 on its own
 * schedule. The pages say batches are anchored automatically, and name no interval.
 */
export const SCHEDULED_ANCHORING_RUN_ON_MAINNET = true;

/**
 * Whether "keep on this device only" (config/network.ts DEVICE_ONLY_RECORDS_ENABLED) has worked on
 * veilcore.org: a document sealed that way there, only its proof code sent, dated in a batch, and
 * checked from its check link. Until it has, the home page's veilcore.org cell says it is built
 * and not yet tried on the main network (m.live.local.main), never "Yes". Hunter turns it on in a
 * reviewed commit after that first run, never before: then the cell says "Yes" on every build
 * (m.live.local.live), a fact about veilcore.org.
 *
 * First run: 16 November 2026, on veilcore.org. A document was sealed with the choice ticked, its
 * page said it was kept on this device, its check page read the date from Midnight (2026-11-16
 * UTC) and found the picked file byte for byte the sealed one (proof code 81a559de…c8104f1).
 */
export const DEVICE_ONLY_RUN_ON_MAINNET = true;

/**
 * Whether a production chain as document records (config/network.ts DOCUMENT_CHAIN_ENABLED) has
 * worked on veilcore.org: a source record, a grow batch, a harvest lot and a lab report sealed
 * there, each about the one before, and the chain followed from the lab report's check link to
 * the top with a date on every page. Until it has, the home page's veilcore.org cell says it is
 * built and not yet tried on the main network (m.live.docchain.main), never "Yes". Hunter turns
 * it on in a reviewed commit after that first run, never before.
 *
 * First run: 16 November 2026, on veilcore.org. A grow batch was sealed about a source record and
 * a harvest lot about the batch, each dated on Midnight; the lot's "Copy link with its chain"
 * was opened in a private window and followed to the top, with a date on every page. A lab report
 * on top is the same link one level further, and was not part of that run.
 */
export const DOCUMENT_CHAIN_RUN_ON_MAINNET = true;

/**
 * Whether "Prove a fact" for a document kept on this device only (config/network.ts
 * DEVICE_ONLY_CLAIMS_ENABLED) has worked on veilcore.org: one proved there from such a record,
 * its claim link checked, and the registry seen to hold nothing more than before. Until it has,
 * the home page's veilcore.org cell says it is built and not yet tried on the main network
 * (m.live.localclaims.main), never "Yes". Hunter turns it on in a reviewed commit after that
 * first run, never before.
 *
 * First run: on veilcore.org by 17 November 2026. A number was proved from a device-only grow
 * batch and its claim link checked in a private window. The registry's rows weren't inspected by
 * hand; the browser tests hold that nothing is sent to it.
 */
export const DEVICE_ONLY_CLAIMS_RUN_ON_MAINNET = true;

/** The label agreements carry while AGREEMENTS_LIVE is false. */
export const PRACTICE_LABEL = AGREEMENTS_LIVE ? '' : 'Practice only';

/**
 * Who runs VeilCore, as the terms of use say it (components/site/Terms.tsx). VeilCore is not
 * incorporated yet; once it is, this names the company.
 */
export const OPERATOR = 'VeilCore’s founders, until VeilCore is incorporated';

/** The date the terms of use last changed: change it with them. */
export const TERMS_UPDATED = '7 November 2026';
