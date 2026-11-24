// The v2 main contract, compiled by Compact 0.36.1 (runtime 0.21). Mirrors ../../contract/src/
// veilcore.ts for v1, without v1's ledger-8 pieces: v2 is a ledger-9 contract from its first
// transaction, so midnight-js reads its state natively and no era conversion is needed.
// SPDX-License-Identifier: Apache-2.0

import {
  ContractState,
  createConstructorContext,
} from "@midnight-ntwrk/compact-runtime";

import * as CompiledVeilcoreContract from "./managed/veilcore/contract/index.js";
import {
  createVeilcorePrivateState,
  veilcoreWitnesses,
  type VeilcorePrivateState,
} from "./witnesses.js";

/** The v2 contract with the client's witnesses. */
export const CompiledVeilcore =
  new CompiledVeilcoreContract.Contract<VeilcorePrivateState>(
    veilcoreWitnesses,
  );

/** Every circuit that needs a verifier key on chain, sorted by code unit. */
export const PROVABLE_CIRCUITS: readonly string[] = Object.keys(
  CompiledVeilcore.provableCircuits,
).sort();

/* **********************************************************************
 * What a genuine deploy starts from (round D, D-1), as for v1.
 *
 * Midnight does not run the constructor on chain: a deploy carries whatever contract
 * state its deployer built. A copy of this build with every verifier key identical can
 * therefore start from a forged ledger. Joining compares the ledger DATA of the deploy
 * transaction's state with what this build's constructor produces. v2's constructor
 * writes only literals (protocolVersion, contractVersion, predecessor) and takes no
 * arguments, so there is exactly one genuine starting state.
 */

const hexOf = (b: Uint8Array): string =>
  Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

/** A contract state's ledger data alone, serialized (operations, authority and balance left out). */
export const ledgerDataHex = (state: ContractState): string => {
  const dataOnly = new ContractState();
  dataOnly.data = state.data;
  return hexOf(dataOnly.serialize());
};

/** The ledger data this build's constructor produces; it takes no arguments and reads no witness. */
export const constructorLedgerDataHex = async (): Promise<string> =>
  ledgerDataHex(
    (
      await CompiledVeilcore.initialState(
        createConstructorContext(
          createVeilcorePrivateState(new Uint8Array(32)),
          "0".repeat(64),
        ),
      )
    ).currentContractState,
  );

/** Whether a deploy state starts from exactly the constructor's ledger data. */
export const startsFromConstructor = async (
  deployState: ContractState,
): Promise<boolean> =>
  ledgerDataHex(deployState) === (await constructorLedgerDataHex());
