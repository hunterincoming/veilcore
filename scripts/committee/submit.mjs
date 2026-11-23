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
// LEDGER 9. The update is a Ledger 9 one (core.mjs), so it is sent only on a network that has
// moved to Ledger 9, as a Ledger 9 transaction; on a network still on Ledger 8 it is refused
// before anything is built. midnight-js 5 refuses to maintain a pre-upgrade contract through
// its own helpers; that is a rule of the library, not of the chain, and this path does not use
// those helpers. No recompile is involved: replacing the authority uses the address, the
// counter and the signatures.
//
// MAINNET IS OFF BY DEFAULT. On mainnet nothing is built or sent unless the caller passes
// `allowMainnet: true`, which the operator tool (bboard-cli/src/launcher/committee.ts) does only
// after --send-on-mainnet and a matching dry-run record.
//
// TWO COPIES OF LEDGER 9, ONE VERSION. The update is built with `ledger-v9-committee` (core.mjs),
// while midnight-js 5.0.1, the proof provider and the wallet read it with @midnightntwrk/ledger-v9.
// Both are ledger-v9 1.0.2 (package.json), installed under two names. No ledger object crosses
// between them: LedgerTransaction.seal keeps only the serialised bytes, and each side decodes those
// bytes with its own copy. It is checked for the real transaction, every time, before anything is
// handed to the wallet (assertReadableByWalletLedger): if the two names ever point at versions
// that write different bytes, the tool stops there with nothing sent.
//
// NOT YET SHOWN ON A NODE: this Ledger 9 path has been run against the ledger's own code
// (committee.test.mjs) but not against a real node, indexer and wallet. The rehearsal in
// docs/committee-rehearsal.md does that on a local network, and comes before any mainnet use.
// SPDX-License-Identifier: Apache-2.0

import { Intent, Transaction } from 'ledger-v9-committee';
import { ContractState as Ledger8ContractState } from '@midnightntwrk/ledger-v8';
import {
  ContractState as Ledger9ContractState,
  Transaction as WalletLedgerTransaction,
} from '@midnight-ntwrk/midnight-js-protocol/v9';
import { protocolVersionToLedger } from '@midnight-ntwrk/midnight-js-protocol';
import { submitTx } from '@midnight-ntwrk/midnight-js-contracts';
import { LedgerTransaction } from '@midnight-ntwrk/midnight-js-types';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import { authorityView } from './core.mjs';

const SUCCEED_ENTIRELY = 'SucceedEntirely';

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
  return authorityView(a);
};

/** Refuse on a network that is not on Ledger 9 (see the top of this file). Nothing is built or sent. */
export const assertLedger9Network = async (publicDataProvider) => {
  const era = protocolVersionToLedger(await publicDataProvider.queryLatestProtocolVersion());
  if (era !== 'v9')
    throw new Error(
      'This network is not on Midnight Ledger 9. This tool builds Ledger 9 maintenance updates, which only a ' +
        'Ledger 9 network accepts. Nothing was built or sent.',
    );
};

const sameBytes = (a, b) => Buffer.from(a).equals(Buffer.from(b));

/**
 * Refuse unless the ledger copy the wallet and midnight-js use (@midnightntwrk/ledger-v9) reads
 * this transaction, built with `ledger-v9-committee`, as exactly the same thing: the same bytes when it
 * writes it back, holding the same maintenance update. Nothing is sent before this passes.
 * `decoder` is the wallet side's Transaction class (replaced in tests).
 */
export const assertReadableByWalletLedger = (tx, update, decoder = WalletLedgerTransaction) => {
  const stop = (why) => {
    throw new Error(
      `The wallet's copy of Midnight Ledger 9 does not read this transaction as it was built (${why}). ` +
        'The two ledger versions in this tool no longer agree. Nothing was sent. Do not retry: report it.',
    );
  };
  const bytes = tx.serialize();
  let read;
  try {
    read = decoder.deserialize('signature', 'pre-proof', 'pre-binding', bytes);
  } catch (e) {
    return stop(`it could not be read: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!sameBytes(read.serialize(), bytes)) stop('it reads back as different bytes');
  const updates = [...(read.intents?.values() ?? [])]
    .flatMap((intent) => [...intent.actions])
    .filter((a) => a?.dataToSign !== undefined);
  if (updates.length !== 1 || !sameBytes(updates[0].dataToSign, update.dataToSign))
    stop('it does not hold this one maintenance update');
};

export const MAINNET_REFUSAL =
  'Refused: sending a maintenance change to MAINNET is off by default. Nothing was built or sent.';

/**
 * Send `update` and wait until `landed(authority)` holds on chain.
 * @param providers midnight-js 5 providers: { publicDataProvider, proofProvider, walletProvider,
 *   midnightProvider, config: { networkId } }. Refused on a network not on Ledger 9, and on
 *   mainnet unless `allowMainnet` is true (top of file).
 * @returns {Promise<{ sent: boolean, txId?: string, blockHeight?: number, authority: object }>}
 */
export const sendMaintenanceUpdate = async (
  providers,
  address,
  update,
  landed,
  { log = () => {}, waitMs = 2_000, tries = 60, allowMainnet = false, walletLedgerTransaction } = {},
) => {
  if (String(providers.config.networkId).toLowerCase() === 'mainnet' && allowMainnet !== true)
    throw new Error(MAINNET_REFUSAL);
  const before = await readAuthorityNow(providers.publicDataProvider, address);
  if (landed(before)) {
    log('The chain already shows this change: nothing was sent.');
    return { sent: false, authority: before };
  }
  if (before.counter !== update.counter)
    throw new Error(
      `The chain's counter is ${before.counter}, but this update is for ${update.counter}. Nothing was sent.`,
    );
  await assertLedger9Network(providers.publicDataProvider);
  const built = Transaction.fromParts(
    providers.config.networkId,
    undefined,
    undefined,
    Intent.new(ttlOneHour()).addMaintenanceUpdate(update),
  );
  // Before the proof server or the wallet sees it (top of file, TWO COPIES OF LEDGER 9).
  assertReadableByWalletLedger(built, update, walletLedgerTransaction);
  const unprovenTx = LedgerTransaction.seal('v9', 'Unproven', built);
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
