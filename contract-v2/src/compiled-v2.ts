// The two v2 contracts as midnight-js 5 takes a Ledger 9 contract: a `CompiledContract` with the
// client's witnesses and the folder of its compiled files (keys and ZK IR). v1 is a Ledger 8
// contract and is passed to midnight-js as a bare instance (../../contract/src/veilcore.ts); v2 is
// a Ledger 9 contract from its first transaction and is passed this way.
//
// Used by the smoke run's client (bboard-cli/src/launcher/smoke-v2.ts) and its tests.
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";
import { fileURLToPath } from "node:url";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import * as Main from "./managed/veilcore/contract/index.js";
import * as Claims from "./managed/veilcore-claims/contract/index.js";
import { type VeilcorePrivateState, veilcoreWitnesses } from "./witnesses.js";
import { type ClaimsPrivateState, claimsWitnesses } from "./claims.js";

/** contract-v2/src/managed: the compiled contracts, with keys after `npm run compact -w contract-v2`. */
export const MANAGED_V2 = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "managed",
);

export const assetsDirV2 = (
  name: "veilcore" | "veilcore-claims",
  managed: string = MANAGED_V2,
): string => path.join(managed, name);

/** The private-state id each contract's calls use (as v1's clients do). */
export const MAIN_PRIVATE_STATE_ID = "veilcorePrivateState";
export const CLAIMS_PRIVATE_STATE_ID = "claimsPrivateState";

export type MainContractV2 = Main.Contract<VeilcorePrivateState>;
export type ClaimsContractV2 = Claims.Contract<ClaimsPrivateState>;

/** The v2 main contract for midnight-js. */
export const compiledMainV2 = (managed: string = MANAGED_V2) =>
  CompiledContract.make<MainContractV2>("veilcore", Main.Contract).pipe(
    CompiledContract.withWitnesses(veilcoreWitnesses as never),
    CompiledContract.withCompiledFileAssets(assetsDirV2("veilcore", managed)),
  );

/** The v2 claims contract for midnight-js. */
export const compiledClaimsV2 = (managed: string = MANAGED_V2) =>
  CompiledContract.make<ClaimsContractV2>(
    "veilcore-claims",
    Claims.Contract,
  ).pipe(
    CompiledContract.withWitnesses(claimsWitnesses as never),
    CompiledContract.withCompiledFileAssets(
      assetsDirV2("veilcore-claims", managed),
    ),
  );
