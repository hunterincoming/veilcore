// Attacker pass: records, identity, rotation, recovery. SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it } from "vitest";
import {
  C,
  VeilcoreSimulator,
  as,
  hex,
  secret,
  freshRecovery,
} from "./veilcore-simulator.js";
import { isLive, identityOf, commitmentsOf } from "../verify.js";

const A = secret("atk-A"),
  B = secret("atk-B"),
  RCV = secret("atk-recovery"),
  RCV_B = secret("atk-recovery-B"),
  THIEF = secret("atk-thief"),
  THIEF2 = secret("atk-thief-2"),
  OWNER_NEW = secret("atk-owner-new"),
  THIEF_RCV = secret("atk-thief-rcv");
const A_REC = C.commit(A),
  B_REC = C.commit(B);

let sim: VeilcoreSimulator;
beforeEach(async () => {
  sim = await VeilcoreSimulator.create();
  await sim.call(as(A), "anchor", C.recoveryCommit(RCV));
});

describe("recovery secret is multi-use and stays valid after a recovery", () => {
  it.fails(
    "anyone who saw the recovery secret during a recovery can take the identity back and lock the owner out",
    async () => {
      // Thief steals A's record secret and rotates.
      await sim.call(
        as(A, { incoming: THIEF }),
        "rotateRecordSecret",
        C.commit(THIEF),
      );
      // Owner recovers. The recovery secret is typed into an online client to do it.
      await sim.call(
        as(secret("x"), { recovery: RCV, incoming: OWNER_NEW }),
        "recoverRecordSecret",
        A_REC,
        C.commit(OWNER_NEW),
        freshRecovery(),
      );
      expect(isLive(sim.state, C.commit(OWNER_NEW))).toBe(true);
      // The same recovery secret still works: recovery did not consume or replace it.
      await sim.call(
        as(secret("y"), { recovery: RCV, incoming: THIEF2 }),
        "recoverRecordSecret",
        A_REC,
        C.commit(THIEF2),
        freshRecovery(),
      );
      await sim.call(
        as(secret("y"), { recovery: RCV }),
        "replaceRecoveryCommitment",
        A_REC,
        C.recoveryCommit(THIEF_RCV),
      );
      expect(isLive(sim.state, C.commit(THIEF2))).toBe(true);
      // Owner is now locked out permanently.
      await expect(() =>
        sim.call(
          as(secret("z"), { recovery: RCV, incoming: secret("owner-3") }),
          "recoverRecordSecret",
          A_REC,
          C.commit(secret("owner-3")),
          freshRecovery(),
        ),
      ).rejects.toThrow("not the recovery secret");
    },
  );
});

describe("forking an identity", () => {
  it("a thief's rotation proved before a recovery cannot land after it", async () => {
    await sim.call(
      as(A, { incoming: THIEF }),
      "rotateRecordSecret",
      C.commit(THIEF),
    );
    const pending = await sim.prove(
      as(THIEF, { incoming: THIEF2 }),
      "rotateRecordSecret",
      C.commit(THIEF2),
    );
    await sim.call(
      as(secret("x"), { recovery: RCV, incoming: OWNER_NEW }),
      "recoverRecordSecret",
      A_REC,
      C.commit(OWNER_NEW),
      freshRecovery(),
    );
    expect(() => sim.land(pending)).toThrow();
    expect(hex(sim.state.headOf.lookup(A_REC))).toBe(hex(C.commit(OWNER_NEW)));
  });

  it("a recovery proved before a thief's rotation still lands, with one head", async () => {
    const rec = await sim.prove(
      as(secret("x"), { recovery: RCV, incoming: OWNER_NEW }),
      "recoverRecordSecret",
      A_REC,
      C.commit(OWNER_NEW),
      freshRecovery(),
    );
    await sim.call(
      as(A, { incoming: THIEF }),
      "rotateRecordSecret",
      C.commit(THIEF),
    );
    sim.land(rec);
    expect(isLive(sim.state, C.commit(OWNER_NEW))).toBe(true);
    expect(isLive(sim.state, C.commit(THIEF))).toBe(false);
    expect(isLive(sim.state, A_REC)).toBe(false);
  });

  it("two rotations from one head: the second cannot land", async () => {
    const p1 = await sim.prove(
      as(A, { incoming: THIEF }),
      "rotateRecordSecret",
      C.commit(THIEF),
    );
    const p2 = await sim.prove(
      as(A, { incoming: THIEF2 }),
      "rotateRecordSecret",
      C.commit(THIEF2),
    );
    sim.land(p1);
    expect(() => sim.land(p2)).toThrow();
  });
});

describe("merging and squatting", () => {
  beforeEach(async () => {
    await sim.call(as(B), "anchor", C.recoveryCommit(RCV_B));
  });
  it("cannot recover or rotate into another identity's origin or successor", async () => {
    await expect(() =>
      sim.call(
        as(secret("x"), { recovery: RCV, incoming: B }),
        "recoverRecordSecret",
        A_REC,
        B_REC,
        freshRecovery(),
      ),
    ).rejects.toThrow();
    await sim.call(
      as(B, { incoming: THIEF }),
      "rotateRecordSecret",
      C.commit(THIEF),
    );
    await expect(() =>
      sim.call(
        as(secret("x"), { recovery: RCV, incoming: THIEF }),
        "recoverRecordSecret",
        A_REC,
        C.commit(THIEF),
        freshRecovery(),
      ),
    ).rejects.toThrow("already a successor");
    await expect(() =>
      sim.call(as(A, { incoming: B }), "rotateRecordSecret", B_REC),
    ).rejects.toThrow();
  });
  it("cannot recover back into a retired commitment of the same identity", async () => {
    await sim.call(
      as(A, { incoming: THIEF }),
      "rotateRecordSecret",
      C.commit(THIEF),
    );
    await expect(() =>
      sim.call(
        as(secret("x"), { recovery: RCV, incoming: A }),
        "recoverRecordSecret",
        A_REC,
        A_REC,
        freshRecovery(),
      ),
    ).rejects.toThrow();
  });
  it("recovery only takes an origin, not a successor", async () => {
    await sim.call(
      as(A, { incoming: THIEF }),
      "rotateRecordSecret",
      C.commit(THIEF),
    );
    await expect(() =>
      sim.call(
        as(secret("x"), { recovery: RCV, incoming: OWNER_NEW }),
        "recoverRecordSecret",
        C.commit(THIEF),
        C.commit(OWNER_NEW),
        freshRecovery(),
      ),
    ).rejects.toThrow("only for an anchored origin");
  });
});

describe("retired commitments", () => {
  it("a retired origin or successor can do nothing, including re-anchoring", async () => {
    await sim.call(
      as(A, { incoming: THIEF }),
      "rotateRecordSecret",
      C.commit(THIEF),
    );
    await sim.call(
      as(THIEF, { incoming: THIEF2 }),
      "rotateRecordSecret",
      C.commit(THIEF2),
    );
    for (const old of [A, THIEF]) {
      await expect(() =>
        sim.call(as(old), "anchor", C.recoveryCommit(secret("r"))),
      ).rejects.toThrow();
      await expect(() =>
        sim.call(as(old), "proveOwnership", new Uint8Array(32).fill(9)),
      ).rejects.toThrow();
      await expect(() =>
        sim.call(as(old), "pairDna", secret("d")),
      ).rejects.toThrow();
      await expect(() =>
        sim.call(
          as(old, { incoming: secret("n") }),
          "rotateRecordSecret",
          C.commit(secret("n")),
        ),
      ).rejects.toThrow();
      await expect(() =>
        sim.call(as(old), "issueLicense", secret("lc")),
      ).rejects.toThrow();
      await expect(() =>
        sim.call(as(old), "encumberOwnRecord", secret("o")),
      ).rejects.toThrow();
    }
    expect(hex(identityOf(sim.state, C.commit(THIEF2)))).toBe(hex(A_REC));
    expect(commitmentsOf(sim.state, A_REC).length).toBe(3);
  });

  it("an unanchored commitment cannot rotate", async () => {
    await expect(() =>
      sim.call(
        as(B, { incoming: THIEF }),
        "rotateRecordSecret",
        C.commit(THIEF),
      ),
    ).rejects.toThrow("Anchor this record");
  });
});

describe("recovery commitment copying", () => {
  it("anyone can anchor with another identity's public recovery commitment (harmless to the copied party)", async () => {
    await sim.call(as(B), "anchor", sim.state.recoveryOf.lookup(A_REC));
    // A's recovery secret now also controls B's identity: only B is exposed.
    await sim.call(
      as(secret("x"), { recovery: RCV, incoming: OWNER_NEW }),
      "recoverRecordSecret",
      B_REC,
      C.commit(OWNER_NEW),
      freshRecovery(),
    );
    expect(isLive(sim.state, B_REC)).toBe(false);
  });
});
