// Send one Ledger 9 transaction built with `ledger-v9-committee` (a v2 deploy, or a key insert
// signed by the temporary key) through midnight-js and the wallet, the way the committee tool
// sends a maintenance update (scripts/committee/submit.mjs). Fees come from DUST the wallet
// already has: nothing registers for DUST and no DUST setting is touched.
// SPDX-License-Identifier: Apache-2.0
import { Transaction as WalletLedgerTransaction } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { submitTx } from '@midnight-ntwrk/midnight-js-contracts';
import { LedgerTransaction } from '@midnight-ntwrk/midnight-js-types';
import { assertLedger9Network } from '../committee/submit.mjs';

const SUCCEED_ENTIRELY = 'SucceedEntirely';
export const MAINNET_REFUSAL_V2 = 'Refused: sending to MAINNET needs --send-on-mainnet. Nothing was built or sent.';

/**
 * Refuse unless the wallet's copy of Ledger 9 reads `tx` back as exactly the same bytes. Nothing
 * is sent before this passes (the committee tool's rule, submit.mjs assertReadableByWalletLedger).
 */
export const assertWalletReads = (tx, decoder = WalletLedgerTransaction) => {
  const bytes = tx.serialize();
  let back;
  try {
    back = decoder.deserialize('signature', 'pre-proof', 'pre-binding', bytes).serialize();
  } catch (e) {
    throw new Error(`The wallet's copy of Ledger 9 cannot read this transaction (${e instanceof Error ? e.message : String(e)}). Nothing was sent.`);
  }
  if (!Buffer.from(back).equals(Buffer.from(bytes)))
    throw new Error("The wallet's copy of Ledger 9 reads this transaction as different bytes. Nothing was sent. Report it.");
};

/** Send `tx`; resolves { txId, txHash, blockHeight } once it is in a block with SucceedEntirely. */
export const sendLedger9Tx = async (providers, tx, { allowMainnet = false } = {}) => {
  if (String(providers.config.networkId).toLowerCase() === 'mainnet' && allowMainnet !== true) throw new Error(MAINNET_REFUSAL_V2);
  await assertLedger9Network(providers.publicDataProvider);
  assertWalletReads(tx);
  const finalized = await submitTx(providers, { unprovenTx: LedgerTransaction.seal('v9', 'Unproven', tx) });
  if (finalized.status !== SUCCEED_ENTIRELY)
    throw new Error(`The network did not apply the transaction (status ${String(finalized.status)}).`);
  return { txId: finalized.txId, txHash: finalized.txHash, blockHeight: finalized.blockHeight };
};
