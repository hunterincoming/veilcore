// Contract states of both ledgers, as the compiled contract's `ledger()` reads them.
//
// A copy of contract/src/contract-state.ts (read that file for why and how): the sponsor is
// built and deployed on its own (only sponsor/src is compiled, and the contract is loaded at run
// time from VEILCORE_ARTIFACTS_DIR), so it cannot import it. contract-state.test.ts checks the
// two files stay the same below this header.
//
// `@midnight-ntwrk/compact-runtime` is runtime 0.16, the one the compiled contract imports: the
// repo root and the staged deploy (sponsor/package.json) both install that version at the top,
// and midnight-js keeps its own 0.21 inside its packages.
// SPDX-License-Identifier: Apache-2.0

import {
  ChargedState,
  ContractMaintenanceAuthority,
  ContractOperation,
  ContractState,
  StateValue,
} from "@midnight-ntwrk/compact-runtime";
import { ContractState as Ledger9ContractState } from "@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime";
import { SerializedContractState } from "@midnight-ntwrk/midnight-js-types";
import { ledgerVersionOfContractState } from "@midnight-ntwrk/midnight-js-utils";

/** Ledger 9's authority keys are `{ tag, value }`; ledger 8 knows Schnorr keys only, as bare hex. */
const ledger8Key = (k: unknown): string => {
  if (typeof k === "string") return k;
  const key = k as { tag?: unknown; value?: unknown } | null;
  if (key?.tag === "schnorr" && typeof key.value === "string") return key.value;
  throw new Error(
    "The contract's maintenance committee holds a key that is not a Schnorr key; refused.",
  );
};

/** The decoders midnight-js's `deserialize` takes: one per ledger era, each this repo's own runtime. */
const decoders = {
  v8: {
    deserialize: (bytes: Uint8Array): ContractState =>
      ContractState.deserialize(bytes),
  },
  v9: {
    deserialize: (bytes: Uint8Array): ContractState => {
      const v9 = Ledger9ContractState.deserialize(bytes);
      const out = new ContractState();
      // The migration guide's step: decode with 0.21, pass the value across as its encoding.
      out.data = new ChargedState(StateValue.decode(v9.data.state.encode()));
      for (const name of v9.operations()) {
        const op = v9.operation(name);
        if (op === undefined) continue;
        const carried = new ContractOperation();
        carried.verifierKey = op.verifierKey;
        out.setOperation(name, carried);
      }
      const a = v9.maintenanceAuthority;
      out.maintenanceAuthority = new ContractMaintenanceAuthority(
        a.committee.map(ledger8Key),
        a.threshold,
        a.counter,
      );
      return out;
    },
  },
};

/**
 * A midnight-js 5 state read (`read.contractState`, bytes tagged with the ledger that wrote
 * them), as a runtime-0.16 ContractState that this repo's `ledger()` and checks read.
 */
export const fromSerialized = (s: SerializedContractState): ContractState =>
  s.deserialize(decoders);

/** Which ledger wrote these contract-state bytes, from their own tag. Throws on anything else. */
export const stateEraOf = (bytes: Uint8Array): "v8" | "v9" =>
  ledgerVersionOfContractState(bytes);

/**
 * Raw contract-state bytes of either ledger (as an indexer's GraphQL hands them over), as a
 * runtime-0.16 ContractState. The era comes from the bytes' own tag (midnight-js's
 * `ledgerVersionOfContractState`); bytes of neither era are refused.
 */
export const readContractState = (bytes: Uint8Array): ContractState =>
  fromSerialized(SerializedContractState.fromBytes(stateEraOf(bytes), bytes));

/** readContractState for hex, with or without 0x. */
export const readContractStateHex = (hex: string): ContractState => {
  const h = hex.replace(/^0x/i, "");
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(h))
    throw new Error("A contract state is hex.");
  return readContractState(
    Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16)),
  );
};
