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
export const AGREEMENTS_LIVE = false;

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

/** The label agreements carry while AGREEMENTS_LIVE is false. */
export const PRACTICE_LABEL = AGREEMENTS_LIVE ? '' : 'Practice only';

/**
 * Who runs VeilCore, as the terms of use say it (components/site/Terms.tsx). VeilCore is not
 * incorporated yet; once it is, this names the company.
 */
export const OPERATOR = 'VeilCore’s founders, until VeilCore is incorporated';

/** The date the terms of use last changed: change it with them. */
export const TERMS_UPDATED = '21 October 2026';
