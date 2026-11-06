// contract-state.ts: a contract state reads the same whichever ledger wrote it.
//
// After Midnight's ledger 9 fork the indexer serves VeilCore's (ledger 8) contracts' states in
// ledger 9's encoding. These build a real state with the compiled contract (constructor plus an
// anchor), express it in both encodings, and check that both read back to the same ledger data,
// operations, verifier keys and maintenance authority.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ChargedState,
  ContractMaintenanceAuthority,
  ContractState,
  createCircuitContext,
  createConstructorContext,
  sampleSigningKey,
  signatureVerifyingKey,
} from "@midnight-ntwrk/compact-runtime";
import * as Runtime9 from "@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime";
import { SerializedContractState } from "@midnight-ntwrk/midnight-js-types";
import { Contract, ledger } from "../managed/veilcore/contract/index.js";
import { createVeilcorePrivateState, veilcoreWitnesses } from "../witnesses";
import { ledgerDataHex } from "../veilcore";
import {
  fromSerialized,
  readContractState,
  readContractStateHex,
  stateEraOf,
} from "../contract-state";

const COIN = "0".repeat(64);
const ADDRESS = "c0".repeat(32);
/** A real pre-fork verifier key (midnight-js 5's own hard-fork fixture, compactc 0.31.1). */
const VK = new Uint8Array(
  readFileSync(
    resolve(
      import.meta.dirname,
      "../../../node_modules/@midnight-ntwrk/testkit-js/dist/fixtures/hf/counter-016/compiled/keys/increment.verifier",
    ),
  ),
);

/** A deployed-looking state: constructor, one anchor, every operation keyed, a 2-of-3 authority. */
const ledger8State = (): ContractState => {
  const initial = new Contract(veilcoreWitnesses).initialState(
    createConstructorContext(
      createVeilcorePrivateState(new Uint8Array(32).fill(9)),
      COIN,
    ),
  ).currentContractState;
  const ctx = createCircuitContext(
    ADDRESS,
    COIN,
    Object.assign(new ContractState(), { data: initial.data }),
    createVeilcorePrivateState(new Uint8Array(32).fill(5)),
  );
  const out = new Contract(veilcoreWitnesses).impureCircuits.anchor(
    ctx,
    new Uint8Array(32).fill(7),
  );
  const cs = new ContractState();
  cs.data = new ChargedState(out.context.currentQueryContext.state.state);
  for (const op of initial.operations()) {
    const o = initial.operation(op)!;
    o.verifierKey = VK;
    cs.setOperation(op, o);
  }
  cs.maintenanceAuthority = new ContractMaintenanceAuthority(
    [0, 1, 2].map(() => signatureVerifyingKey(sampleSigningKey())),
    2,
    3n,
  );
  return cs;
};

/** The same state as the network serves it after the fork: ledger 9's encoding. */
const asLedger9 = (s: ContractState): Uint8Array => {
  const cs = new Runtime9.ContractState();
  cs.data = new Runtime9.ChargedState(
    Runtime9.StateValue.decode(s.data.state.encode()),
  );
  for (const op of s.operations()) {
    const o = new Runtime9.ContractOperation();
    o.verifierKey = s.operation(op)!.verifierKey;
    cs.setOperation(op, o);
  }
  cs.maintenanceAuthority = new Runtime9.ContractMaintenanceAuthority(
    s.maintenanceAuthority.committee.map((value) => ({
      tag: "schnorr" as const,
      value,
    })),
    s.maintenanceAuthority.threshold,
    s.maintenanceAuthority.counter,
  );
  return cs.serialize();
};

const opNames = (s: ContractState) =>
  s
    .operations()
    .map((o) => (typeof o === "string" ? o : new TextDecoder().decode(o)))
    .sort();

describe("contract states of both ledgers", () => {
  const original = ledger8State();
  const v8 = original.serialize();
  const v9 = asLedger9(original);

  it("tells the two encodings apart by their own tags", () => {
    expect(stateEraOf(v8)).toBe("v8");
    expect(stateEraOf(v9)).toBe("v9");
    expect(() =>
      stateEraOf(new TextEncoder().encode("midnight:contract-state[v5]:")),
    ).toThrow();
    expect(() => readContractState(new Uint8Array([1, 2, 3]))).toThrow();
  });

  it("reads the same ledger data, operations, keys and authority from either", () => {
    for (const read of [
      readContractState(v8),
      readContractState(v9),
      fromSerialized(SerializedContractState.fromBytes("v9", v9)),
    ]) {
      expect(ledgerDataHex(read)).toBe(ledgerDataHex(original));
      expect(Buffer.from(ledger(read.data).lastAnchor).toString("hex")).toBe(
        Buffer.from(ledger(original.data).lastAnchor).toString("hex"),
      );
      expect(opNames(read)).toEqual(opNames(original));
      for (const op of opNames(original))
        expect(
          Buffer.from(read.operation(op)!.verifierKey).equals(Buffer.from(VK)),
        ).toBe(true);
      expect(read.maintenanceAuthority.committee).toEqual(
        original.maintenanceAuthority.committee,
      );
      expect(read.maintenanceAuthority.threshold).toBe(2);
      expect(read.maintenanceAuthority.counter).toBe(3n);
    }
    expect(
      ledgerDataHex(
        readContractStateHex(`0x${Buffer.from(v9).toString("hex")}`),
      ),
    ).toBe(ledgerDataHex(original));
  });

  it("refuses a state whose era label does not match its bytes", () => {
    expect(() =>
      fromSerialized(SerializedContractState.fromBytes("v8", v9)),
    ).toThrow();
  });

  it("the sponsor's copy (sponsor/src/contract-state.ts) is this file below its header", () => {
    const body = (f: string) => {
      const s = readFileSync(resolve(import.meta.dirname, f), "utf8");
      return s.slice(s.indexOf("import {"));
    };
    expect(body("../../../sponsor/src/contract-state.ts")).toBe(
      body("../contract-state.ts"),
    );
  });
});
