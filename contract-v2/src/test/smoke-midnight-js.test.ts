// The smoke run through midnight-js 5's own Ledger 9 call pipeline, offline: every call is built
// by `createUnprovenCallTxFromInitialStates` from the CompiledContract the smoke client uses
// (../compiled-v2.ts), with its witnesses and the run's private state and arguments, and the
// contract's next state is what midnight-js computed. What this does not cover is proving and
// sending (the proof server and the wallet), which only the preprod run does.
//
// A build without keys (--skip-zk) has no verifier keys, and midnight-js refuses to build a call
// to an entry point with a blank key slot. Each operation is given one stand-in key here (a
// Ledger 9 verifier key from scripts/committee/fixtures); it is only hashed into the call's key
// location, never checked against a proof.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import {
  ChargedState,
  type ContractState,
  createConstructorContext,
} from "@midnight-ntwrk/compact-runtime";
import { createUnprovenCallTxFromInitialStates } from "@midnight-ntwrk/midnight-js-contracts";
import {
  SerializedContractState,
  SerializedLedgerParameters,
  SerializedZswapChainState,
} from "@midnight-ntwrk/midnight-js-types";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import {
  LedgerParameters,
  ZswapChainState,
  sampleCoinPublicKey,
  sampleContractAddress,
  sampleEncryptionPublicKey,
} from "@midnightntwrk/ledger-v9";
import {
  Contract as MainContract,
  ledger as mainLedgerOf,
} from "../managed/veilcore/contract/index.js";
import {
  Contract as ClaimsContract,
  ledger as claimsLedgerOf,
} from "../managed/veilcore-claims/contract/index.js";
import { createVeilcorePrivateState, veilcoreWitnesses } from "../witnesses.js";
import { claimsWitnesses, emptyClaimsPrivateState } from "../claims.js";
import {
  assetsDirV2,
  compiledClaimsV2,
  compiledMainV2,
} from "../compiled-v2.js";
import { type SmokeChain, formatTable, runSmoke } from "../smoke.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const STAND_IN_KEY = new Uint8Array(
  readFileSync(
    path.join(
      here,
      "../../../scripts/committee/fixtures/zkir-v3-example.verifier",
    ),
  ),
);

const withKeys = (st: ContractState): ContractState => {
  for (const n of st.operations()) {
    const op = st.operation(n)!;
    op.verifierKey = STAND_IN_KEY;
    st.setOperation(n, op);
  }
  return st;
};

type One = {
  state: ContractState;
  readonly address: string;
  readonly compiled: unknown;
  readonly zk: NodeZkConfigProvider<string>;
};

const offlineChain = async (): Promise<SmokeChain & { built: number }> => {
  const main: One = {
    state: withKeys(
      (
        await new MainContract(veilcoreWitnesses).initialState(
          createConstructorContext(
            createVeilcorePrivateState(new Uint8Array(32)),
            "0".repeat(64),
          ),
        )
      ).currentContractState,
    ),
    address: sampleContractAddress(),
    compiled: compiledMainV2(),
    zk: new NodeZkConfigProvider(assetsDirV2("veilcore")),
  };
  const claims: One = {
    state: withKeys(
      (
        await new ClaimsContract(claimsWitnesses).initialState(
          createConstructorContext(emptyClaimsPrivateState(), "0".repeat(64)),
        )
      ).currentContractState,
    ),
    address: sampleContractAddress(),
    compiled: compiledClaimsV2(),
    zk: new NodeZkConfigProvider(assetsDirV2("veilcore-claims")),
  };
  const chain = {
    built: 0,
    async call(c: Parameters<SmokeChain["call"]>[0]) {
      const one = c.contract === "veilcore" ? main : claims;
      const r = await createUnprovenCallTxFromInitialStates(
        one.zk,
        {
          compiledContract: one.compiled,
          circuitId: c.circuit,
          contractAddress: one.address,
          args: c.args,
          coinPublicKey: sampleCoinPublicKey(),
          initialContractState: SerializedContractState.fromBytes(
            "v9",
            one.state.serialize(),
          ),
          initialZswapChainState: SerializedZswapChainState.fromBytes(
            "v9",
            new ZswapChainState().serialize(),
          ),
          ledgerParameters: SerializedLedgerParameters.fromBytes(
            "v9",
            LedgerParameters.initialParameters().serialize(),
          ),
          config: { networkId: "undeployed", ttlSeconds: 3600 },
          initialPrivateState: c.privateState,
        } as never,
        sampleEncryptionPublicKey(),
      );
      expect(r.private.unprovenTx).toBeDefined();
      one.state.data = new ChargedState(r.public.nextContractState);
      chain.built++;
      return {};
    },
    mainLedger: () => Promise.resolve(mainLedgerOf(main.state.data)),
    claimsLedger: () => Promise.resolve(claimsLedgerOf(claims.state.data)),
    now: () => Promise.resolve(BigInt(Math.floor(Date.now() / 1000))),
    wait: (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
  };
  return chain;
};

describe("contract v2 smoke run, through midnight-js (offline)", () => {
  it("midnight-js builds every call from the smoke client's CompiledContracts, and every check passes", async () => {
    const chain = await offlineChain();
    let n = 0;
    const rows = await runSmoke(chain, {
      random: () => createHash("sha256").update(`mjs-${n++}`).digest(),
      checkTries: 1,
    });
    expect(
      rows.filter((r) => r.result !== "PASS"),
      formatTable(rows),
    ).toEqual([]);
    expect(chain.built).toBe(rows.length);
  }, 600_000);
});
