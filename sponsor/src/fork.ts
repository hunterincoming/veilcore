// Which side of Midnight's Ledger 9 fork the network is on, three ways, and whether they agree.
//
// The wallet SDK picks the ledger it builds the fee payment for from the node's protocol
// version and its fork schedule: Ledger 9 from `forks.v9` (WalletFacade.resolveConfiguration's
// default, DefaultForkSchedule, 2,000,000; wallet SDK 2's notes call the final mainnet value an
// open question). midnight-js picks the ledger of everything else from the same protocol
// version by its own rule (protocolVersionToLedger: 1.x is Ledger 8, 2.x Ledger 9). The
// contract state the indexer serves carries the ledger that wrote it in its own tag, which is
// what the chain actually is. If these disagree, the sponsor would add a fee payment for one
// ledger to a transaction of the other, and every payment would fail: GET /sponsor/alerts
// reports `fork-mismatch`, and the log says which part disagrees.
// SPDX-License-Identifier: Apache-2.0

import { protocolVersionToLedger } from '@midnight-ntwrk/midnight-js-protocol';

export type Era = 'v8' | 'v9';

export type ForkReading = {
  /** The latest protocol version the indexer reports. */
  readonly protocolVersion: number;
  /** Where the wallet's fork schedule starts Ledger 9. */
  readonly forksV9: bigint;
  /** The ledger the wallet SDK builds for at this version. */
  readonly walletEra: Era;
  /** The ledger midnight-js builds for at this version; 'unknown' for a version it does not know. */
  readonly frameworkEra: Era | 'unknown';
  /** The ledger that wrote the contract's state, from its tag; undefined when it could not be read. */
  readonly stateEra: Era | undefined;
  /** All of them name the same ledger. */
  readonly agree: boolean;
};

export const readFork = (protocolVersion: number, forksV9: bigint, stateEra: Era | undefined): ForkReading => {
  const walletEra: Era = BigInt(protocolVersion) >= forksV9 ? 'v9' : 'v8';
  let frameworkEra: Era | 'unknown';
  try {
    frameworkEra = protocolVersionToLedger(protocolVersion);
  } catch {
    frameworkEra = 'unknown';
  }
  const agree = frameworkEra === walletEra && (stateEra === undefined || stateEra === walletEra);
  return { protocolVersion, forksV9, walletEra, frameworkEra, stateEra, agree };
};

/** For the log: plain numbers and names, nothing secret. */
export const forkLogFields = (r: ForkReading): Record<string, unknown> => ({
  protocolVersion: r.protocolVersion,
  forksV9: r.forksV9.toString(),
  walletEra: r.walletEra,
  frameworkEra: r.frameworkEra,
  stateEra: r.stateEra ?? 'unread',
  agree: r.agree,
});
