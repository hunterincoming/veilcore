// The smoke run (../smoke.ts) against the compiled v2 contracts in this process: the real
// witnesses, the real circuits, an in-memory ledger per contract. No network, no wallet.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  type ChargedState,
  type CircuitContext,
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
} from "@midnight-ntwrk/compact-runtime";
import { ledger as mainLedgerOf } from "../managed/veilcore/contract/index.js";
import { CompiledVeilcore, PROVABLE_CIRCUITS } from "../veilcore.js";
import {
  CLAIMS_PROVABLE_CIRCUITS,
  CompiledVeilcoreClaims,
  claimsLedger as claimsLedgerOf,
  emptyClaimsPrivateState,
} from "../claims.js";
import { createVeilcorePrivateState } from "../witnesses.js";
import {
  SMOKE_CALLS,
  SMOKE_CIRCUITS,
  type SmokeCall,
  type SmokeChain,
  circuitSummary,
  formatTable,
  runSmoke,
} from "../smoke.js";

const COIN = "0".repeat(64);

type AnyContract = {
  initialState(
    c: unknown,
  ): Promise<{ currentContractState: { data: ChargedState } }>;
  impureCircuits: Record<
    string,
    (
      c: unknown,
      ...a: unknown[]
    ) => Promise<{ context: CircuitContext<unknown> }>
  >;
};

/** One contract in memory: its state between calls, and a clock the test moves. */
class Local {
  state!: ChargedState;
  readonly address = sampleContractAddress();
  constructor(readonly contract: AnyContract) {}
  async deploy(ps: unknown): Promise<this> {
    this.state = (
      await this.contract.initialState(createConstructorContext(ps, COIN))
    ).currentContractState.data;
    return this;
  }
  async call(
    circuit: string,
    privateState: unknown,
    args: readonly unknown[],
    time: bigint,
  ): Promise<void> {
    const fn = this.contract.impureCircuits[circuit];
    if (fn === undefined) throw new Error(`no circuit ${circuit}`);
    const out = await fn(
      createCircuitContext({
        circuitId: circuit,
        contractAddress: this.address,
        coinPublicKeyOrZswapState: COIN,
        contractState: this.state,
        privateState,
        time: Number(time),
      }),
      ...args,
    );
    this.state = out.context.callContext.currentQueryContext.state;
  }
}

/** A chain in this process. `fail` makes one call (by its position) refuse; `lie` makes a check read stale state. */
const localChain = async (
  opts: { failAt?: number; staleAt?: number } = {},
): Promise<SmokeChain & { calls: SmokeCall[]; clock: { now: bigint } }> => {
  const main = await new Local(
    CompiledVeilcore as unknown as AnyContract,
  ).deploy(createVeilcorePrivateState(new Uint8Array(32)));
  const claims = await new Local(
    CompiledVeilcoreClaims as unknown as AnyContract,
  ).deploy(emptyClaimsPrivateState());
  const clock = { now: 1_800_000_000n };
  const calls: SmokeCall[] = [];
  let stale: ChargedState | undefined;
  return {
    calls,
    clock,
    async call(c) {
      calls.push(c);
      if (opts.failAt === calls.length)
        throw new Error("the network did not apply the transaction (test)");
      const target = c.contract === "veilcore" ? main : claims;
      if (opts.staleAt === calls.length) stale = main.state;
      await target.call(c.circuit, c.privateState, c.args, clock.now);
      clock.now += 20n;
      return { txId: `tx${calls.length}` };
    },
    mainLedger: () => Promise.resolve(mainLedgerOf(stale ?? main.state)),
    claimsLedger: () => Promise.resolve(claimsLedgerOf(claims.state)),
    now: () => Promise.resolve(clock.now),
    wait: (ms) => {
      clock.now += BigInt(Math.ceil(ms / 1000));
      return Promise.resolve();
    },
  };
};

/** Deterministic "random" bytes, so a failure can be replayed. */
const seeded = (seed: string): (() => Buffer) => {
  let n = 0;
  return () => createHash("sha256").update(`${seed}-${n++}`).digest();
};

describe("contract v2 smoke run", () => {
  it("names every provable circuit of both contracts, and nothing else", () => {
    expect(SMOKE_CIRCUITS.veilcore).toEqual([...PROVABLE_CIRCUITS].sort());
    expect(SMOKE_CIRCUITS["veilcore-claims"]).toEqual(
      [...CLAIMS_PROVABLE_CIRCUITS].sort(),
    );
    expect(
      SMOKE_CIRCUITS.veilcore.length + SMOKE_CIRCUITS["veilcore-claims"].length,
    ).toBe(29);
    expect(SMOKE_CIRCUITS["veilcore-claims"]).toContain("proveAttested");
  });

  it("every call lands and every check passes, with the real witnesses", async () => {
    const chain = await localChain();
    const rows = await runSmoke(chain, { random: seeded("one") });
    const failed = rows.filter((r) => r.result !== "PASS");
    expect(failed, formatTable(rows)).toEqual([]);
    expect(chain.calls.length).toBe(SMOKE_CALLS);
    expect(circuitSummary(rows).notPassed).toEqual([]);
    expect(formatTable(rows)).toMatch(/PASS: all 29 circuits landed/);
  }, 600_000);

  it("can run twice on the same contracts (fresh test records; the second seal waits its turn)", async () => {
    const chain = await localChain();
    expect(
      (await runSmoke(chain, { random: seeded("a") })).every(
        (r) => r.result === "PASS",
      ),
    ).toBe(true);
    const before = chain.clock.now;
    const rows = await runSmoke(chain, { random: seeded("b") });
    expect(
      rows.filter((r) => r.result !== "PASS"),
      formatTable(rows),
    ).toEqual([]);
    expect(chain.clock.now - before).toBeGreaterThanOrEqual(600n);
  }, 600_000);

  it("stops at the first refused call, and marks the rest NOT RUN", async () => {
    const chain = await localChain({ failAt: 3 });
    const rows = await runSmoke(chain, { random: seeded("fail") });
    expect(rows.slice(0, 2).map((r) => r.result)).toEqual(["PASS", "PASS"]);
    expect(rows[2].result).toBe("FAIL");
    expect(rows[2].detail).toMatch(/did not apply/);
    expect(rows.slice(3).every((r) => r.result === "NOT RUN")).toBe(true);
    const table = formatTable(rows);
    expect(table).toMatch(
      /^FAIL: \d+ of 29 circuits passed\. Not passed: .*anchorBatch/m,
    );
  }, 600_000);

  it("a call that lands but leaves the wrong state is a FAIL", async () => {
    const chain = await localChain({ staleAt: 1 });
    const rows = await runSmoke(chain, {
      random: seeded("stale"),
      checkTries: 2,
    });
    expect(rows[0].result).toBe("FAIL");
    expect(rows[0].detail).toMatch(/^landed, but record A is not anchored/);
  }, 600_000);

  it("a circuit the contract refuses is reported with the contract's reason", async () => {
    const chain = await localChain();
    // Break the run: anchor record A twice by replaying the first call before the run starts.
    const rows = await runSmoke(
      {
        ...chain,
        call: async (c) => {
          if (c.circuit === "anchorBatch")
            await chain.call({
              ...c,
              circuit: "anchor",
              args: [new Uint8Array(32)],
            });
          return chain.call(c);
        },
      },
      { random: seeded("refused") },
    );
    const bad = rows.find((r) => r.result === "FAIL");
    expect(bad?.circuit).toBe("anchorBatch");
    expect(bad?.detail).toMatch(
      /recovery commitment cannot be empty|already anchored/,
    );
  }, 600_000);
  it("a failure's detail carries no long hex and stays short (the table can be saved publicly)", async () => {
    const chain = await localChain();
    const rows = await runSmoke(
      {
        ...chain,
        call: () =>
          Promise.reject(
            new Error(`refused: ${"ab".repeat(40)} ${"x".repeat(1000)}`),
          ),
      },
      { random: seeded("hex") },
    );
    expect(rows[0].result).toBe("FAIL");
    expect(rows[0].detail).toMatch(/^refused: <hex> x+\.\.\.$/);
    expect(rows[0].detail.length).toBeLessThanOrEqual(403);
  });
});
