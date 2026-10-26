// Whether agreements made on this site are real (on Midnight, between two browsers) or
// practice (saved here only, the other party signs nothing). One answer for every screen,
// so none of them says "simulated" where the agreement is real, or the other way round.
//
// Real: this build makes agreements on chain (AGREEMENTS_ON_CHAIN: every test network, and
// mainnet once AGREEMENTS_LIVE is on) and can send transactions (CHAIN_READY).
//
// An agreement made while agreements here were practice only stays practice after the
// switch: it was never on Midnight and the other party never signed it. On a real build it
// is marked as such wherever it appears (LicenseStateChip, LicenseDetail), because the
// "Practice only" headings go away with the switch.
// SPDX-License-Identifier: Apache-2.0

import { AGREEMENTS_ON_CHAIN } from '../config/copy';
import { CHAIN_READY } from './chain/config';
import type { License } from './licenses';

/** Agreements made on this site go on Midnight. */
export const AGREEMENTS_REAL: boolean = AGREEMENTS_ON_CHAIN && CHAIN_READY;

/**
 * A practice agreement on a site where agreements are real: issued in the practice flow
 * (it has the issuer's practice signature time) and never put on chain.
 */
export const isPracticeAgreement = (l: License, real: boolean = AGREEMENTS_REAL): boolean =>
  real && !l.onChain && l.breederSignedAt !== undefined;
