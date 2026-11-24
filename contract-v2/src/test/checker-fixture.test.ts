// The contract state the two-contract checkers are tested on (docs/contract-v2.md 3.1 and 3.2):
// bboard-ui/src/veilcore/chain/fixtures/v2-anchor-fixture.json. The partner kit
// (partner-kit/test/two-contracts.test.ts) and the site (bboard-ui chain/anchor-check.test.ts,
// v2-decoder.test.ts) read it as a v2 date stamp on a made-up v2 address.
//
// What it is: the ledger data v2's own compiled contract leaves after one anchorBatch call (this
// workspace's build, Compact 0.36.1), inside a real ledger 9 contract state from mainnet (v1's
// last batch in v1-mainnet-anchors.json), so it carries real verifier keys and a real
// maintenance authority (one key, counter 16). v2 has no keys until they are built on the
// maintainer's Mac, so these are v1's keys standing in; the tests pin them as the fake v2
// entry's key table. Nothing here is on any chain.
//
// This test rebuilds it from v2's compiled contract and fails if the file differs, so a change to
// v2's ledger layout can't leave the checkers tested against an old one. To rewrite it:
// VEILCORE_WRITE_V2_FIXTURE=1 npx vitest run src/test/checker-fixture.test.ts
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { ChargedState, ContractState } from "@midnight-ntwrk/compact-runtime";
import { VeilcoreSimulator, as, secret } from "./veilcore-simulator.js";

const FIXTURE = new URL(
  "../../../bboard-ui/src/veilcore/chain/fixtures/v2-anchor-fixture.json",
  import.meta.url,
);
const V1_ANCHORS = new URL(
  "../../../bboard-ui/src/veilcore/chain/fixtures/v1-mainnet-anchors.json",
  import.meta.url,
);
/** Made up: no contract is deployed at it. Tests pin it as version 2. */
const FAKE_V2_ADDRESS = "f2".repeat(32);

type V1Anchors = {
  transactions: {
    stateLedger: string;
    indexerAnswer: { byHash: { contractActions: { state: string }[] }[] };
  }[];
};

const build = async () => {
  const root = createHash("sha256")
    .update("veilcore two-contract checker fixture")
    .digest();
  const sim = await VeilcoreSimulator.create();
  await sim.call(as(secret("fixture")), "anchorBatch", root);
  expect(Buffer.from(sim.state.lastBatchRoot).toString("hex")).toBe(
    root.toString("hex"),
  );
  expect(sim.state.contractVersion).toBe(2n);
  const chain = (sim as unknown as { chain: ChargedState }).chain;

  const v1 = JSON.parse(readFileSync(V1_ANCHORS, "utf8")) as V1Anchors;
  const base = v1.transactions.find((t) => t.stateLedger === "ledger9");
  if (base === undefined)
    throw new Error("no ledger 9 state in the v1 fixture");
  const state = ContractState.deserialize(
    Buffer.from(base.indexerAnswer.byHash[0].contractActions[0].state, "hex"),
  );
  state.data = new ChargedState(chain.state);
  const stateHex = Buffer.from(state.serialize()).toString("hex");
  return {
    note:
      "Made by contract-v2/src/test/checker-fixture.test.ts: the ledger data contract v2's compiled " +
      "contract leaves after one anchorBatch call, inside a real ledger 9 state of v1 (its verifier " +
      "keys and its one-key authority at counter 16 stand in for v2's). The address is made up; tests " +
      "pin it as version 2. Not on any chain.",
    contract: FAKE_V2_ADDRESS,
    root: root.toString("hex"),
    stateLedger: "ledger9",
    stateHex,
  };
};

it("the two-contract checker fixture is v2's compiled layout after anchorBatch", async () => {
  const made = await build();
  expect(
    made.stateHex.startsWith(
      Buffer.from("midnight:contract-state[v8]:").toString("hex"),
    ),
  ).toBe(true);
  if (process.env.VEILCORE_WRITE_V2_FIXTURE === "1")
    writeFileSync(FIXTURE, `${JSON.stringify(made, null, 2)}\n`);
  expect(JSON.parse(readFileSync(FIXTURE, "utf8"))).toEqual(made);
});
