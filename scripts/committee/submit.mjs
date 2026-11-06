// Sending a signed maintenance update, and confirming it from the chain.
//
// The same path as the provable retirement in api/src/maintenance.ts, which is how the
// claims contract's authority was replaced on mainnet on 8 October 2026: the update goes in
// an Intent, the Intent in a Transaction, and midnight-js's own submitTx proves, balances
// (the wallet pays the fee in DUST) and submits it. Nothing in a maintenance update is
// proved; it is authorised by its signatures alone.
//
// The chain decides whether it worked: if sending throws, the authority is read again, and
// an update that landed with only the confirmation lost is reported as landed. Running it
// again after it landed sends nothing.
//
// AFTER MIDNIGHT'S LEDGER 9 FORK (mainnet, 6 November 2026) SENDING IS NOT AVAILABLE. VeilCore's
// contracts are Ledger 8 contracts; midnight-js 5 calls them on either side of the fork but
// refuses to maintain them on a forked network (that needs the contract recompiled, which would
// change every circuit key; see api/src/maintenance.ts). So on a forked network sending is
// refused before anything is built; reading the authority (show) and preparing and signing
// requests still work. On a network not yet forked it sends a Ledger 8 transaction, as before.
// SPDX-License-Identifier: Apache-2.0

import { ContractState as Ledger8ContractState, Intent, Transaction } from '@midnightntwrk/ledger-v8';
import { ContractState as Ledger9ContractState } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { protocolVersionToLedger } from '@midnight-ntwrk/midnight-js-protocol';
import { submitTx } from '@midnight-ntwrk/midnight-js-contracts';
import { LedgerTransaction } from '@midnight-ntwrk/midnight-js-types';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import { authorityView } from './core.mjs';

const SUCCEED_ENTIRELY = 'SucceedEntirely';

/** Ledger 9 keeps committee keys as { tag, value }; Ledger 8 as bare hex. Both hold Schnorr keys only. */
const bareKey = (k) => {
  if (typeof k === 'string') return k;
  if (k?.tag === 'schnorr' && typeof k.value === 'string') return k.value;
  throw new Error("The contract's maintenance committee holds a key that is not a Schnorr key; refused.");
};

/**
 * The maintenance authority from an indexer read: midnight-js 5's `{ contractState }` (bytes
 * of either ledger, decoded by the ledger that wrote them), or a state that has it already.
 */
const authorityOf = (read) => {
  const s = read.contractState ?? read;
  if (typeof s.deserialize === 'function' && 'era' in s)
    return s.deserialize({ v8: Ledger8ContractState, v9: Ledger9ContractState }).maintenanceAuthority;
  return s.maintenanceAuthority;
};

/** The contract's maintenance authority as the indexer shows it now. */
export const readAuthorityNow = async (publicDataProvider, address) => {
  const state = await publicDataProvider.queryContractState(address);
  if (state === null || state === undefined) throw new Error(`No contract found at ${address} on this network.`);
  const a = authorityOf(state);
  return authorityView({ committee: [...a.committee].map(bareKey), threshold: a.threshold, counter: a.counter });
};

/** Refuse on a network past the Ledger 9 fork (see the top of this file). Nothing is built or sent. */
export const assertMaintenanceAvailable = async (publicDataProvider) => {
  const era = protocolVersionToLedger(await publicDataProvider.queryLatestProtocolVersion());
  if (era !== 'v8')
    throw new Error(
      "Contract maintenance is not available on this network: it has moved to Midnight Ledger 9, and VeilCore's " +
        'contracts are Ledger 8 contracts, which midnight-js can call but no longer maintain (that needs the contract ' +
        'recompiled, which would change every circuit key). Nothing was built or sent.',
    );
};

/**
 * Send `update` and wait until `landed(authority)` holds on chain.
 * @param providers midnight-js 5 providers: { publicDataProvider, proofProvider, walletProvider,
 *   midnightProvider, config: { networkId } }. Refused past the Ledger 9 fork (top of file).
 * @returns {Promise<{ sent: boolean, txId?: string, blockHeight?: number, authority: object }>}
 */
export const sendMaintenanceUpdate = async (
  providers,
  address,
  update,
  landed,
  { log = () => {}, waitMs = 2_000, tries = 60 } = {},
) => {
  const before = await readAuthorityNow(providers.publicDataProvider, address);
  if (landed(before)) {
    log('The chain already shows this change: nothing was sent.');
    return { sent: false, authority: before };
  }
  if (before.counter !== update.counter)
    throw new Error(
      `The chain's counter is ${before.counter}, but this update is for ${update.counter}. Nothing was sent.`,
    );
  await assertMaintenanceAvailable(providers.publicDataProvider);
  const unprovenTx = LedgerTransaction.seal(
    'v8',
    'Unproven',
    Transaction.fromParts(
      providers.config.networkId,
      undefined,
      undefined,
      Intent.new(ttlOneHour()).addMaintenanceUpdate(update),
    ),
  );
  let finalized;
  try {
    finalized = await submitTx(providers, { unprovenTx });
    if (finalized.status !== SUCCEED_ENTIRELY)
      throw new Error(`The network did not apply the change (status ${String(finalized.status)}).`);
    log(`Sent: transaction ${finalized.txId ?? finalized.txHash}, block ${finalized.blockHeight}.`);
  } catch (e) {
    // It may have landed with only the confirmation failing: the chain decides.
    const now = await readAuthorityNow(providers.publicDataProvider, address);
    if (!landed(now)) throw e;
    log('Confirming the transaction failed, but the chain shows the change: it landed.');
  }
  for (let i = 0; ; i++) {
    const now = await readAuthorityNow(providers.publicDataProvider, address);
    if (landed(now)) return { sent: true, txId: finalized?.txId, blockHeight: finalized?.blockHeight, authority: now };
    if (i >= tries)
      throw new Error(
        'The change was sent but the indexer does not show it yet. Read the authority again later (the "show" ' +
          'command). If the counter has gone up by one, it landed. If not, run the same command again.',
      );
    await new Promise((r) => setTimeout(r, waitMs));
  }
};
