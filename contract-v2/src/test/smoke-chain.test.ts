// The smoke run's network chain (../smoke-chain.ts) with midnight-js's findDeployedContract and
// the indexer stood in for: each call gets its own private state, set just before it, for the
// right contract; the state is read back as Ledger 9. Nothing is sent anywhere.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { createConstructorContext } from "@midnight-ntwrk/compact-runtime";
import { Contract as MainContract } from "../managed/veilcore/contract/index.js";
import { createVeilcorePrivateState, veilcoreWitnesses } from "../witnesses.js";
import { midnightSmokeChain } from "../smoke-chain.js";

const MAIN = "11".repeat(32);
const CLAIMS = "22".repeat(32);

describe("the smoke run's network chain", () => {
  it("joins both contracts and sets each call's private state just before it", async () => {
    const joined: Record<
      string,
      { options: Record<string, unknown>; providers: Record<string, unknown> }
    > = {};
    const seen: {
      address: string;
      circuit: string;
      args: unknown[];
      ps: unknown;
    }[] = [];
    const chain = await midnightSmokeChain({
      providers: {
        publicDataProvider: {
          queryContractState: () =>
            Promise.resolve({
              contractState: {
                deserialize: () => initial,
              },
            }),
        },
        walletProvider: {},
        midnightProvider: {},
        config: { networkId: "preprod", ttlSeconds: 3600 },
      },
      proofServer: "http://127.0.0.1:6300",
      addresses: { veilcore: MAIN, "veilcore-claims": CLAIMS },
      find: (providers, options) => {
        const p = providers as Record<string, unknown> & {
          privateStateProvider: {
            forContract(a: string): { get(id: string): Promise<unknown> };
          };
        };
        const o = options as {
          contractAddress: string;
          privateStateId: string;
        };
        joined[o.contractAddress] = { options: o, providers: p };
        return Promise.resolve({
          callTx: new Proxy(
            {},
            {
              get:
                (_t, circuit: string) =>
                async (...args: unknown[]) => {
                  seen.push({
                    address: o.contractAddress,
                    circuit,
                    args,
                    ps: await p.privateStateProvider
                      .forContract(o.contractAddress)
                      .get(o.privateStateId),
                  });
                  return { public: { txId: `tx-${seen.length}` } };
                },
            },
          ),
        });
      },
    });
    const initial = (
      await new MainContract(veilcoreWitnesses).initialState(
        createConstructorContext(
          createVeilcorePrivateState(new Uint8Array(32)),
          "0".repeat(64),
        ),
      )
    ).currentContractState;

    expect(Object.keys(joined).sort()).toEqual([MAIN, CLAIMS].sort());
    for (const j of Object.values(joined)) {
      expect(j.providers.proofProvider).toBeDefined();
      expect(j.providers.zkConfigProvider).toBeDefined();
      expect(j.providers.privateStateProvider).toBeDefined();
    }
    expect(joined[MAIN].options.privateStateId).not.toBe(
      joined[CLAIMS].options.privateStateId,
    );

    const psA = createVeilcorePrivateState(new Uint8Array(32).fill(5));
    const r = await chain.call({
      contract: "veilcore",
      circuit: "anchorBatch",
      args: [new Uint8Array(32).fill(9)],
      privateState: psA,
    });
    expect(r.txId).toBe("tx-1");
    await chain.call({
      contract: "veilcore-claims",
      circuit: "proveAttested",
      args: [new Uint8Array(32)],
      privateState: { input: { number: 7n } },
    });
    expect(seen.map((s) => [s.address, s.circuit])).toEqual([
      [MAIN, "anchorBatch"],
      [CLAIMS, "proveAttested"],
    ]);
    expect(seen[0].ps).toEqual(psA);
    expect(seen[0].args).toEqual([new Uint8Array(32).fill(9)]);
    expect(seen[1].ps).toEqual({ input: { number: 7n } });

    // The state is read from the indexer as Ledger 9.
    expect((await chain.mainLedger()).contractVersion).toBe(2n);
  });
});
