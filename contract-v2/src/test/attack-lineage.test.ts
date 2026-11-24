// Attack pass on LINEAGE (parentage, obligations, checkLineage). Each `it` either
// demonstrates a finding (named FINDING) or records an attack that held (HELD).
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it } from "vitest";
import {
  C,
  VeilcoreSimulator,
  as,
  hex,
  secret,
  freshRecovery,
} from "./veilcore-simulator.js";
import { checkLineage, openObligations } from "../verify.js";

let sim: VeilcoreSimulator;
const rec = (s: Uint8Array): Uint8Array => secret(`recovery-${hex(s)}`);
const anchor = (s: Uint8Array): Promise<void> =>
  sim.call(as(s), "anchor", C.recoveryCommit(rec(s)));
const edge = async (child: Uint8Array, parent: Uint8Array): Promise<void> => {
  await sim.call(as(child), "proposeParent", C.commit(parent));
  await sim.call(as(parent), "confirmParent", C.commit(child));
};

const ROOT = secret("gene-bank"), // recognised root
  P = secret("breeder-P"), // honest-looking parent, child of ROOT
  V = secret("victim-grower"), // buys from P, child of P
  Q = secret("attacker-Q"),
  M = secret("mallory");
const TERMS = secret("terms");

beforeEach(async () => {
  sim = await VeilcoreSimulator.create();
  for (const x_ of [ROOT, P, V, Q, M]) await anchor(x_);
  await edge(P, ROOT);
  await edge(V, P);
});

describe("FINDING: an ancestor can rewrite a descendant's verdict after the fact, permanently", () => {
  it("baseline: V is accepted against the recognised root", () => {
    expect(
      checkLineage(sim.state, C.commit(V), [C.commit(ROOT)]).accepted,
    ).toBe(true);
  });

  it.fails(
    "P (or anyone holding P's secret) builds a loop above P: V becomes cyclic and unacceptable",
    async () => {
      await edge(P, Q); // P now also claims Q as a parent
      await edge(Q, P); // and Q claims P: a loop P -> Q -> P above V
      const r = checkLineage(sim.state, C.commit(V), [C.commit(ROOT)]);
      expect(r.cyclic).toBe(true);
      expect(r.accepted).toBe(false);
      // V took no action; V cannot remove the edges; nobody can.
    },
  );

  it.fails(
    "a THIEF of P's secret does it, P recovers, and V stays poisoned forever",
    async () => {
      const T = secret("thief-holds-P"); // the thief simply has P's record secret
      void T;
      await edge(P, Q); // thief acting as P
      await edge(Q, P);
      const NEW = secret("P-new");
      await sim.call(
        as(secret("anyone"), { recovery: rec(P), incoming: NEW }),
        "recoverRecordSecret",
        C.commit(P),
        C.commit(NEW),
        freshRecovery(),
      );
      await expect(() =>
        sim.call(as(P), "proveOwnership", new Uint8Array(32).fill(9)),
      ).rejects.toThrow("rotated or recovered");
      const r = checkLineage(sim.state, C.commit(V), [C.commit(ROOT)]);
      expect(r.cyclic).toBe(true);
      expect(r.accepted).toBe(false);
    },
  );

  it.fails(
    "P adds a junk, unrecognised root above itself: V's roots grow and V is no longer accepted",
    async () => {
      await edge(P, M);
      const r = checkLineage(sim.state, C.commit(V), [C.commit(ROOT)]);
      expect(r.roots.map(hex).sort()).toEqual(
        [hex(C.commit(ROOT)), hex(C.commit(M))].sort(),
      );
      expect(r.accepted).toBe(false);
    },
  );

  it.fails("there is no bound on parents per record (fan-out)", async () => {
    const many = Array.from({ length: 40 }, (_, i) => secret(`fan-${i}`));
    for (const x_ of many) await anchor(x_);
    for (const x_ of many) await ((p) => edge(P, p))(x_);
    expect([...sim.state.parentsOf.lookup(C.commit(P))].length).toBe(41);
    expect(checkLineage(sim.state, C.commit(V)).roots.length).toBe(41);
  });
});

describe("FINDING: checkLineage reports clean for commitments the chain knows nothing about", () => {
  it.fails(
    "random bytes, never anchored, come back clean with themselves as root",
    () => {
      const ghost = C.commit(secret("never-anchored"));
      const r = checkLineage(sim.state, ghost, [ghost]);
      expect(r.clean).toBe(true);
      expect(r.accepted).toBe(true); // only if the verifier lists it, but nothing says "not anchored"
      expect(sim.state.recoveryOf.member(ghost)).toBe(false);
    },
  );
});

describe("FIXED (state bounds): proposals can no longer be piled onto a record", () => {
  it("one proposer may have at most 8 waiting; withdrawing or an answer frees a place", async () => {
    const os = Array.from({ length: 9 }, (_, i) => secret(`spam-${i}`));
    for (const x_ of os.slice(0, 8))
      await ((o) => sim.call(as(M), "proposeObligation", C.commit(V), o))(x_);
    await expect(() =>
      sim.call(as(M), "proposeObligation", C.commit(V), os[8]),
    ).rejects.toThrow("too many proposals waiting");
    expect(openObligations(sim.state, C.commit(V))).toBe(0n); // binds nothing
    await sim.call(as(V), "rejectObligation", os[0], C.commit(M));
    await sim.call(as(M), "proposeObligation", C.commit(V), os[8]);
    expect(sim.state.pendingObligations.size()).toBe(8n);
  });
});

describe("HELD", () => {
  it("cannot claim someone else's record as a parent without their confirmation", async () => {
    await sim.call(as(M), "proposeParent", C.commit(ROOT));
    expect(sim.state.parentsOf.member(C.commit(M))).toBe(false);
    await expect(() =>
      sim.call(as(Q), "confirmParent", C.commit(M)),
    ).rejects.toThrow("not the parent proposed");
  });

  it("a discharge proved twice on one state lands once; the counter never goes below zero", async () => {
    await sim.call(as(M), "proposeObligation", C.commit(V), TERMS);
    await sim.call(as(V), "acceptObligation", TERMS, C.commit(M));
    const a = await sim.prove(as(M), "discharge", C.commit(V), TERMS);
    const b = await sim.prove(as(M), "discharge", C.commit(V), TERMS);
    sim.land(a);
    expect(() => sim.land(b)).toThrow();
    expect(openObligations(sim.state, C.commit(V))).toBe(0n);
  });

  it("an accept proved twice lands once (no double count for one key)", async () => {
    await sim.call(as(M), "proposeObligation", C.commit(V), TERMS);
    const a = await sim.prove(as(V), "acceptObligation", TERMS, C.commit(M));
    const b = await sim.prove(as(V), "acceptObligation", TERMS, C.commit(M));
    sim.land(a);
    expect(() => sim.land(b)).toThrow();
    expect(openObligations(sim.state, C.commit(V))).toBe(1n);
  });

  it("a re-proposal proved before acceptance cannot land after it (would re-arm the key)", async () => {
    const early = await sim.prove(
      as(M),
      "proposeObligation",
      C.commit(V),
      TERMS,
    );
    await sim.call(as(M), "proposeObligation", C.commit(V), TERMS);
    await sim.call(as(V), "acceptObligation", TERMS, C.commit(M));
    expect(() => sim.land(early)).toThrow();
  });

  it("a thief's accept or confirm proved before recovery fails when it lands after", async () => {
    await sim.call(as(M), "proposeObligation", C.commit(V), TERMS);
    const acc = await sim.prove(as(V), "acceptObligation", TERMS, C.commit(M));
    await sim.call(as(M), "proposeParent", C.commit(V));
    const conf = await sim.prove(as(V), "confirmParent", C.commit(M));
    const NEW = secret("V-new");
    await sim.call(
      as(secret("x"), { recovery: rec(V), incoming: NEW }),
      "recoverRecordSecret",
      C.commit(V),
      C.commit(NEW),
      freshRecovery(),
    );
    expect(() => sim.land(acc)).toThrow();
    expect(() => sim.land(conf)).toThrow();
  });

  it("an encumbered identity cannot be merged by racing a rotation against an anchor", async () => {
    await sim.call(as(V), "encumberOwnRecord", TERMS);
    const fresh = secret("fresh");
    const rot = await sim.prove(
      as(V, { incoming: fresh }),
      "rotateRecordSecret",
      C.commit(fresh),
    );
    await anchor(fresh);
    expect(() => sim.land(rot)).toThrow();
  });

  it("a stale confirm cannot land after the child withdrew and named someone else", async () => {
    await sim.call(as(M), "proposeParent", C.commit(Q));
    const stale = await sim.prove(as(Q), "confirmParent", C.commit(M));
    await sim.call(as(M), "withdrawParent");
    await sim.call(as(M), "proposeParent", C.commit(ROOT));
    expect(() => sim.land(stale)).toThrow();
  });
});
