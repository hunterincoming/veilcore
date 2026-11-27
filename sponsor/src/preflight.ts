// The last check before the sponsor sends a visitor's call: would the network take it?
//
// Why. Licence activation (countersignLicense) was refused by mainnet with error 138 ("pays
// less than its fee") three times in three, and nothing was logged: the fee, the DUST spends
// and the node's message were thrown away. This runs the ledger's own well-formedness check
// on the finished transaction, with the ledger parameters the fee was priced at, so a
// shortfall is caught (and logged with the exact amount) before anything is sent.
//
// Why not the wallet SDK's validateTransaction. It checks against a blank ledger state with
// contract-proof checking left on, and a blank state holds no contracts, so it refuses every
// contract call ("call to non-existant contract"): the sponsor would refuse everything. Here
// the same ledger check runs with contract-proof checking off (the node checks those against
// the real contract) and everything else on: balancing and fees, signatures, size limits,
// DUST and Zswap proofs, network and time-to-live.
//
// With no contract state, the fee is worked out with the ledger's default verifier-key size,
// which is larger than VeilCore's real keys: the check is a little stricter than the node,
// never looser. The wallet SDK prices fees the same way (with its margin on top), so a
// transaction it balanced correctly passes.
//
// Nothing here is a secret: entry point names, counts, DUST amounts and the ledger's error
// text (redacted by describeError all the same).
//
// SPDX-License-Identifier: Apache-2.0

import { LedgerParameters, LedgerState, Transaction, WellFormedStrictness } from '@midnightntwrk/ledger-v9';
import { describeError } from './error-chain.js';

/** What the log says about a transaction. Public facts only. */
export type TxFacts = {
  /** The contract entry points it calls (one, for a sponsored call). */
  readonly circuits: string[];
  /** How many DUST spends pay its fee, and what they carry in total, in SPECKs. */
  readonly dustSpends: number;
  readonly dustPaid: bigint;
  /** The fee the ledger works out for it with these parameters (no margin), if it could. */
  readonly ledgerFee?: bigint;
};

export type Preflight =
  | { readonly ok: true; readonly facts: TxFacts }
  | { readonly ok: false; readonly facts: TxFacts; readonly error: string; readonly code?: string }
  /** Not checked (no ledger 9 parameters, or bytes ledger 9 cannot read): sent as before. */
  | { readonly ok: 'skipped'; readonly facts: TxFacts; readonly why: string };

const NO_FACTS: TxFacts = { circuits: [], dustSpends: 0, dustPaid: 0n };

type IntentLike = {
  actions?: readonly { entryPoint?: unknown }[];
  dustActions?: { spends?: readonly { vFee?: unknown }[] };
};

const name = (ep: unknown): string =>
  typeof ep === 'string' ? ep : ep instanceof Uint8Array ? Buffer.from(ep).toString('utf8') : '?';

/** Entry points and DUST spends of a ledger transaction's intents. Never throws. */
export const factsOf = (tx: { intents?: Map<number, IntentLike> }): TxFacts => {
  try {
    const circuits: string[] = [];
    let dustSpends = 0;
    let dustPaid = 0n;
    for (const intent of tx.intents?.values() ?? []) {
      for (const a of intent.actions ?? []) if (a.entryPoint !== undefined) circuits.push(name(a.entryPoint));
      for (const s of intent.dustActions?.spends ?? []) {
        dustSpends++;
        if (typeof s.vFee === 'bigint') dustPaid += s.vFee;
      }
    }
    return { circuits, dustSpends, dustPaid };
  } catch {
    return NO_FACTS;
  }
};

/** The node's number for a ledger refusal text, where it is known (midnight-node ledger_9/types.rs). */
const nodeCodeOf = (error: string): string | undefined =>
  /invalid balance -?\d+ for token Dust in segment \d+/i.test(error)
    ? '138' // BalanceCheckOverspend: pays less than its fee
    : /dust is outside of its validity window/i.test(error)
      ? '171' // OutOfDustValidityWindow: the indexer is behind (or this clock is); worth a retry
      : undefined;

/**
 * Check a finished transaction (its bytes) as the node would, before it is sent.
 * `parameters`: the ledger parameters its fee was priced with (the balancing recipe's block).
 */
export const preflight = (bytes: Uint8Array, parameters: unknown, networkId: string, now: Date): Preflight => {
  let tx: Transaction<never, never, never>;
  try {
    tx = Transaction.deserialize('signature', 'proof', 'binding', bytes) as never;
  } catch {
    return { ok: 'skipped', facts: NO_FACTS, why: 'not a ledger 9 transaction' };
  }
  const base = factsOf(tx as never);
  if (!(parameters instanceof LedgerParameters)) {
    return { ok: 'skipped', facts: base, why: 'no ledger 9 parameters from balancing' };
  }
  let ledgerFee: bigint | undefined;
  try {
    ledgerFee = tx.fees(parameters);
  } catch {
    ledgerFee = undefined;
  }
  const facts: TxFacts = { ...base, ...(ledgerFee !== undefined ? { ledgerFee } : {}) };
  try {
    const state = LedgerState.blank(networkId);
    state.parameters = parameters;
    const strict = new WellFormedStrictness();
    strict.enforceBalancing = true;
    strict.verifySignatures = true;
    strict.enforceLimits = true;
    strict.verifyNativeProofs = true;
    strict.verifyContractProofs = false; // needs the contract's state; the node checks it
    tx.wellFormed(state, strict, now);
    return { ok: true, facts };
  } catch (e) {
    const error = describeError(e);
    const code = nodeCodeOf(error);
    return { ok: false, facts, error, ...(code ? { code } : {}) };
  }
};
