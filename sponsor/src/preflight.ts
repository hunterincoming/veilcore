// The last check before the sponsor sends a visitor's call: would the network take it?
//
// Why. Licence activation (countersignLicense) was refused by mainnet with error 138 ("pays
// less than its fee") three times in three, and nothing was logged: the fee, the DUST spends
// and the node's message were thrown away. This runs the ledger's own well-formedness check
// on the finished transaction, with the ledger parameters from when its fee was worked out
// (the balancing recipe's block), so a shortfall is caught, and logged with the exact amount,
// before anything is sent.
//
// Why not the wallet SDK's validateTransaction. It checks against a blank ledger state with
// contract-proof checking left on, and a blank state holds no contracts, so it refuses every
// contract call ("call to non-existant contract"): the sponsor would refuse everything. Here
// the same ledger check runs with balancing and fees, signatures, size limits, network and
// time-to-live on, and two things off:
// - contract proofs: they need the contract's state; the node checks them against it;
// - DUST proofs: a blank state has no DUST tree roots to check them against, and this ledger
//   build (ledger-v9, built without proof verification) does not check them anyway.
// A visitor's call has no Zswap part, so there are no Zswap proofs to check.
//
// The fee. With no contract state the ledger prices the verifier-key read with its default
// key size. Reads are priced per 4 KiB block, and both that default and VeilCore's real keys
// fit in one, so the fee this check works out equals the node's. It is worked out at the
// parameters from when the fee was priced: if prices rise before the call is included, the
// node asks for more than this check did. The wallet SDK's margin covers that, and the log
// line after sending catches it if not.
//
// What it decides. Only a balance refusal (the node's 138) is shown to match the node
// exactly, so only that stops a call (wallet.ts). Any other refusal is logged and the call is
// sent: the node is the judge. If the check itself cannot be set up, it is "skipped".
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
  /** The fee the ledger works out for it with these parameters, before any margin, if it could. */
  readonly ledgerFeeNoMargin?: bigint;
};

export type Preflight =
  | { readonly ok: true; readonly facts: TxFacts }
  | { readonly ok: false; readonly facts: TxFacts; readonly error: string; readonly code?: string }
  /** Not checked (no ledger 9 parameters, bytes ledger 9 cannot read, or the check could not be set up): sent as before. */
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
      ? '171' // OutOfDustValidityWindow: judged here by this machine's clock, by the node by the block's
      : undefined;

/**
 * Check a finished transaction (its bytes) as the node would, before it is sent.
 * `parameters`: the ledger parameters from when its fee was worked out (the balancing recipe's block).
 * `opts.enforceBalancing: false` (tests only) checks everything but the fee: an unpaid call
 * as the browser builds it, before the sponsor adds DUST, passes then.
 */
export const preflight = (
  bytes: Uint8Array,
  parameters: unknown,
  networkId: string,
  now: Date,
  opts: { readonly enforceBalancing?: boolean } = {},
): Preflight => {
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
  let ledgerFeeNoMargin: bigint | undefined;
  try {
    ledgerFeeNoMargin = tx.fees(parameters);
  } catch {
    ledgerFeeNoMargin = undefined;
  }
  const facts: TxFacts = { ...base, ...(ledgerFeeNoMargin !== undefined ? { ledgerFeeNoMargin } : {}) };
  // Setting up the check is not the check: if this breaks, nothing is known about the call.
  let state: LedgerState;
  let strict: WellFormedStrictness;
  try {
    state = LedgerState.blank(networkId);
    state.parameters = parameters;
    strict = new WellFormedStrictness();
    strict.enforceBalancing = opts.enforceBalancing ?? true;
    strict.verifySignatures = true;
    strict.enforceLimits = true;
    strict.verifyNativeProofs = false; // DUST proofs: no DUST roots in a blank state (see above)
    strict.verifyContractProofs = false; // needs the contract's state; the node checks it
  } catch (e) {
    return { ok: 'skipped', facts, why: `check failed: ${describeError(e)}` };
  }
  try {
    tx.wellFormed(state, strict, now);
    return { ok: true, facts };
  } catch (e) {
    const error = describeError(e);
    const code = nodeCodeOf(error);
    return { ok: false, facts, error, ...(code ? { code } : {}) };
  }
};
