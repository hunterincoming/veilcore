// Contract states of both ledgers, read the one way the rest of this repo reads them.
//
// VeilCore's two contracts were compiled with compactc 0.31 (Compact runtime 0.16) and
// deployed before Midnight's ledger 9 hard fork (mainnet, 6 Nov 2026). They are LEDGER 8
// contracts and stay so: recompiling would change every verifier key, and the chain would
// refuse the calls. Their generated code (managed/<contract>/contract/index.js) checks that
// it runs on runtime 0.16.0 exactly, and its `ledger()` reads only objects made by that copy
// of the runtime (it checks with `instanceof`).
//
// After the fork the network re-expresses every contract's state in ledger 9's format, and
// the indexer serves it that way. Runtime 0.16 cannot read those bytes; runtime 0.21 (ledger
// 9) can. So every state this repo reads goes through here, exactly as midnight-js 5's
// migration guide reads a ledger 8 contract's state after the fork ("Reading the state of a
// ledger 8 contract"; its own fork test does the same):
//
//   - ledger 8 bytes (networks not yet forked, older records): read by runtime 0.16;
//   - ledger 9 bytes: read by runtime 0.21, and the ledger data carried across as its plain
//     encoding into a runtime-0.16 StateValue.
//
// This repo's checks read more than the ledger data (the operations and their verifier keys,
// verify.ts and the browser's key check; the maintenance authority, api/src/state-check.ts),
// so a ledger 9 state's operations and authority are carried across too: each verifier key
// as its bytes (the same bytes in both formats: midnight-js compares a ledger 8 artifact's
// key with a forked contract's byte for byte), the authority's Schnorr keys as hex. The
// result is a runtime-0.16 ContractState whatever the era, so `ledger()`, verify.ts and every
// check built on them are unchanged.
//
// Not carried across: the contract's token balances (VeilCore holds and reads none). An
// authority key that is not a Schnorr key (ledger 8 has no other kind) is refused, not guessed at.
//
// `@midnight-ntwrk/compact-runtime` here is 0.16, the copy the compiled contracts import: the
// repo root installs it at the top, and midnight-js keeps its own 0.21 inside its packages
// (reached only through `@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime`).
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
  throw new Error("The contract's maintenance committee holds a key that is not a Schnorr key; refused.");
};

/** The decoders midnight-js's `deserialize` takes: one per ledger era, each this repo's own runtime. */
const decoders = {
  v8: { deserialize: (bytes: Uint8Array): ContractState => ContractState.deserialize(bytes) },
  v9: {
    deserialize: (bytes: Uint8Array): ContractState => {
      const v9 = Ledger9ContractState.deserialize(bytes);
      const out = new ContractState();
      // The migration guide's step: decode with 0.21, pass the value across as its encoding.
      out.data = new ChargedState(StateValue.decode(v9.data.state.encode() as never));
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
  s.deserialize(decoders) as ContractState;

/** Which ledger wrote these contract-state bytes, from their own tag. Throws on anything else. */
export const stateEraOf = (bytes: Uint8Array): "v8" | "v9" => ledgerVersionOfContractState(bytes);

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
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(h)) throw new Error("A contract state is hex.");
  return readContractState(Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16)));
};
