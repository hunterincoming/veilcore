// The smoke run's chain on a real network: each call goes through midnight-js 5 (Ledger 9) to
// the proof server and the wallet, and the state is read back from the indexer. The launcher
// (bboard-cli/src/launcher/smoke-v2.ts) opens the wallet and passes its providers in.
//
// Private state lives in memory only, for this run: the test secrets are made fresh, set for
// each call just before it, and gone when the process ends. Nothing is written to disk.
// SPDX-License-Identifier: Apache-2.0

import { ContractState } from "@midnight-ntwrk/compact-runtime";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { inMemoryPrivateStateProvider } from "@midnight-ntwrk/testkit-js";
import { ledger as mainLedgerOf } from "./managed/veilcore/contract/index.js";
import { ledger as claimsLedgerOf } from "./managed/veilcore-claims/contract/index.js";
import { createVeilcorePrivateState } from "./witnesses.js";
import { emptyClaimsPrivateState } from "./claims.js";
import {
  CLAIMS_PRIVATE_STATE_ID,
  MAIN_PRIVATE_STATE_ID,
  MANAGED_V2,
  assetsDirV2,
  compiledClaimsV2,
  compiledMainV2,
} from "./compiled-v2.js";
import type { SmokeChain } from "./smoke.js";

/** What the launcher's wallet session gives (bboard-cli/src/launcher/committee.ts, openWallet). */
export type WalletProviders = {
  readonly publicDataProvider: unknown;
  readonly walletProvider: unknown;
  readonly midnightProvider: unknown;
  readonly config: { readonly networkId: string; readonly ttlSeconds: number };
};

type Read = {
  readonly contractState: {
    deserialize(d: { v9: typeof ContractState }): ContractState;
  };
} | null;
type Reader = { queryContractState(address: string): Promise<Read> };

type Found = {
  readonly callTx: Record<
    string,
    (
      ...args: unknown[]
    ) => Promise<{ readonly public: { readonly txId?: string } }>
  >;
};

export type MidnightChainDeps = {
  readonly providers: WalletProviders;
  /** The URL of the proof server this session started (9.0.2, checked before the wallet opened). */
  readonly proofServer: string;
  readonly addresses: {
    readonly veilcore: string;
    readonly "veilcore-claims": string;
  };
  readonly managed?: string;
  /** Tests stand in for the proof server here (the zk config is the contract's own). */
  readonly proofProviderFor?: (zk: NodeZkConfigProvider<string>) => unknown;
  /** Tests stand in for midnight-js here. */
  readonly find?: (providers: unknown, options: unknown) => Promise<Found>;
};

const stateOf = async (
  reader: Reader,
  address: string,
): Promise<ContractState> => {
  const read = await reader.queryContractState(address);
  if (read === null)
    throw new Error(`The indexer shows no contract at ${address}.`);
  return read.contractState.deserialize({ v9: ContractState });
};

/** A SmokeChain on the wallet's network, for the two v2 contracts at `addresses`. */
export const midnightSmokeChain = async (
  d: MidnightChainDeps,
): Promise<SmokeChain> => {
  const managed = d.managed ?? MANAGED_V2;
  const find =
    d.find ??
    ((p: unknown, o: unknown) =>
      findDeployedContract(
        p as never,
        o as never,
      ) as unknown as Promise<Found>);
  const privateStates = inMemoryPrivateStateProvider<string, unknown>();
  const reader = d.providers.publicDataProvider as Reader;

  const join = async (
    name: "veilcore" | "veilcore-claims",
    compiledContract: unknown,
    privateStateId: string,
    initialPrivateState: unknown,
  ): Promise<Found> => {
    const zk = new NodeZkConfigProvider<string>(assetsDirV2(name, managed));
    return find(
      {
        ...d.providers,
        privateStateProvider: privateStates,
        zkConfigProvider: zk,
        proofProvider:
          d.proofProviderFor?.(zk) ??
          httpClientProofProvider(d.proofServer, zk),
      },
      {
        contractAddress: d.addresses[name],
        compiledContract,
        privateStateId,
        initialPrivateState,
      },
    );
  };

  const main = await join(
    "veilcore",
    compiledMainV2(managed),
    MAIN_PRIVATE_STATE_ID,
    // A placeholder until the first call sets the call's own private state.
    createVeilcorePrivateState(new Uint8Array(32).fill(1)),
  );
  const claims = await join(
    "veilcore-claims",
    compiledClaimsV2(managed),
    CLAIMS_PRIVATE_STATE_ID,
    emptyClaimsPrivateState(),
  );

  return {
    async call(c) {
      const [found, id] =
        c.contract === "veilcore"
          ? [main, MAIN_PRIVATE_STATE_ID]
          : [claims, CLAIMS_PRIVATE_STATE_ID];
      await privateStates
        .forContract(d.addresses[c.contract])
        .set(id, c.privateState);
      const fn = found.callTx[c.circuit];
      if (fn === undefined)
        throw new Error(`midnight-js has no call for ${c.circuit}.`);
      const r = await fn(...c.args);
      return { txId: r.public.txId };
    },
    mainLedger: async () =>
      mainLedgerOf((await stateOf(reader, d.addresses.veilcore)).data),
    claimsLedger: async () =>
      claimsLedgerOf(
        (await stateOf(reader, d.addresses["veilcore-claims"])).data,
      ),
    now: () => Promise.resolve(BigInt(Math.floor(Date.now() / 1000))),
    wait: (ms) => new Promise<void>((r) => setTimeout(r, ms)),
  };
};
