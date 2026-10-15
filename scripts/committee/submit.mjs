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
// SPDX-License-Identifier: Apache-2.0

import { Intent, Transaction } from '@midnight-ntwrk/ledger-v8';
import { submitTx } from '@midnight-ntwrk/midnight-js-contracts';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import { authorityView } from './core.mjs';

const SUCCEED_ENTIRELY = 'SucceedEntirely';

/** The contract's maintenance authority as the indexer shows it now. */
export const readAuthorityNow = async (publicDataProvider, address) => {
  const state = await publicDataProvider.queryContractState(address);
  if (state === null || state === undefined) throw new Error(`No contract found at ${address} on this network.`);
  return authorityView(state.maintenanceAuthority);
};

/**
 * Send `update` and wait until `landed(authority)` holds on chain.
 * @param providers { publicDataProvider, proofProvider, walletProvider, midnightProvider }
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
  const unprovenTx = Transaction.fromParts(
    getNetworkId(),
    undefined,
    undefined,
    Intent.new(ttlOneHour()).addMaintenanceUpdate(update),
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
