// Records: anchoring, ownership, rotation and recovery, including the attacks from the
// 30 Sep security pass (docs/security-pass-30sep.md). SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it } from "vitest";
import { acceptOwnership } from "../verify.js";
import {
  C,
  VeilcoreSimulator,
  ZERO,
  as,
  hex,
  secret,
  freshRecovery,
} from "./veilcore-simulator.js";

const A = secret("breeder-A"),
  B = secret("breeder-B"),
  Cs = secret("breeder-C"),
  D = secret("breeder-D");
const RECOVERY = secret("recovery"),
  THIEF = secret("thief");
const A_REC = C.commit(A),
  B_REC = C.commit(B),
  C_REC = C.commit(Cs),
  D_REC = C.commit(D);

let sim: VeilcoreSimulator;
const anchorA = (): Promise<void> =>
  sim.call(as(A), "anchor", C.recoveryCommit(RECOVERY));

beforeEach(async () => {
  sim = await VeilcoreSimulator.create();
});

describe("anchoring and ownership", () => {
  it("anchors the caller's own record and proves ownership of it", async () => {
    await anchorA();
    expect(hex(sim.state.lastAnchor)).toBe(hex(A_REC));
    await sim.call(as(A), "proveOwnership", new Uint8Array(32).fill(9));
    expect(hex(sim.state.lastOwnershipProof)).toBe(hex(A_REC));
  });

  it("cannot anchor twice", async () => {
    await anchorA();
    await expect(() => anchorA()).rejects.toThrow("already anchored");
  });

  it("pairs a DNA fingerprint to the caller's record, not anyone else's", async () => {
    await anchorA();
    await sim.call(as(D), "anchor", C.recoveryCommit(secret("rd")));
    await sim.call(as(D), "pairDna", secret("dna"));
    expect(hex(sim.state.lastPairedRecord)).toBe(hex(D_REC));
    expect(hex(sim.state.lastAnchor)).toBe(hex(D_REC)); // pairDna did not write the anchor cell
  });

  it("refuses empty inputs everywhere", async () => {
    await expect(() => sim.call(as(A), "anchor", ZERO)).rejects.toThrow(
      "cannot be empty",
    );
    await expect(() =>
      sim.call(as(A), "anchor", C.recoveryCommit(ZERO)),
    ).rejects.toThrow("all-zero secret");
    await anchorA();
    await expect(() => sim.call(as(A), "anchorBatch", ZERO)).rejects.toThrow(
      "cannot be empty",
    );
    await expect(() => sim.call(as(A), "pairDna", ZERO)).rejects.toThrow(
      "cannot be empty",
    );
    await expect(() =>
      sim.call(
        as(secret("n"), { recovery: RECOVERY }),
        "replaceRecoveryCommitment",
        A_REC,
        ZERO,
      ),
    ).rejects.toThrow("cannot be empty");
    await expect(() =>
      sim.call(
        as(secret("n"), { recovery: RECOVERY }),
        "replaceRecoveryCommitment",
        A_REC,
        C.recoveryCommit(ZERO),
      ),
    ).rejects.toThrow("all-zero secret");
  });

  it("keeps recovery and record commitments in different domains", () => {
    expect(hex(C.recoveryCommit(RECOVERY))).not.toBe(hex(C.commit(RECOVERY)));
  });
});

describe("rotation", () => {
  it("retires the old secret and keeps the identity", async () => {
    await anchorA();
    await sim.call(as(A, { incoming: B }), "rotateRecordSecret", B_REC);
    await expect(() =>
      sim.call(as(A), "proveOwnership", new Uint8Array(32).fill(9)),
    ).rejects.toThrow("rotated or recovered");
    await sim.call(as(B), "proveOwnership", new Uint8Array(32).fill(9));
    expect(hex(sim.state.headOf.lookup(A_REC))).toBe(hex(B_REC));
  });

  it("requires holding the new secret", async () => {
    await anchorA();
    await expect(() =>
      sim.call(
        as(A, { incoming: secret("other") }),
        "rotateRecordSecret",
        B_REC,
      ),
    ).rejects.toThrow("hold the secret");
  });

  it("an unanchored record can do nothing but anchor, so it carries no history into an identity", async () => {
    await expect(() =>
      sim.call(as(D), "proveOwnership", new Uint8Array(32).fill(9)),
    ).rejects.toThrow("only for anchored records");
    await expect(() =>
      sim.call(as(D), "pairDna", secret("dna")),
    ).rejects.toThrow("only for anchored records");
    await expect(() =>
      sim.call(as(D), "issueLicense", C.licenseCommit(secret("l"), D_REC)),
    ).rejects.toThrow("only for anchored records");
    await expect(() =>
      sim.call(as(D), "encumberOwnRecord", secret("o")),
    ).rejects.toThrow("only for anchored records");
    await expect(() =>
      sim.call(as(D, { incoming: B }), "rotateRecordSecret", B_REC),
    ).rejects.toThrow("Anchor this record before rotating it");
    await sim.call(as(D), "anchor", C.recoveryCommit(secret("r")));
    await sim.call(as(D, { incoming: B }), "rotateRecordSecret", B_REC);
  });

  it("cannot move into a commitment with history, so identities never merge", async () => {
    await anchorA();
    await sim.call(as(D), "anchor", C.recoveryCommit(secret("rd")));
    await sim.call(as(A, { incoming: B }), "rotateRecordSecret", B_REC);
    await expect(() =>
      sim.call(as(D, { incoming: B }), "rotateRecordSecret", B_REC),
    ).rejects.toThrow("already a successor");
    await expect(() =>
      sim.call(as(B, { incoming: D }), "rotateRecordSecret", D_REC),
    ).rejects.toThrow("already an anchored record");
    await expect(() =>
      sim.call(as(B, { incoming: A }), "rotateRecordSecret", A_REC),
    ).rejects.toThrow();
  });

  it("does not let a successor re-anchor", async () => {
    await anchorA();
    await sim.call(as(A, { incoming: B }), "rotateRecordSecret", B_REC);
    await expect(() =>
      sim.call(as(B), "anchor", C.recoveryCommit(secret("r"))),
    ).rejects.toThrow("successor");
  });
});

describe("ownership proofs (rule 8)", () => {
  it("bind to the verifier's challenge: a proof made for one verifier is refused by another", async () => {
    // Attack round 3, 1 Oct: without a challenge, anyone could cite the real holder's proof.
    await anchorA();
    const mine = secret("verifier-1"),
      theirs = secret("verifier-2");
    await sim.call(as(A), "proveOwnership", mine);
    expect(acceptOwnership(sim.state, A_REC, mine).accepted).toBe(true);
    expect(acceptOwnership(sim.state, A_REC, theirs).accepted).toBe(false);
    expect(acceptOwnership(sim.state, B_REC, mine).accepted).toBe(false);
    await expect(() =>
      sim.call(as(A), "proveOwnership", new Uint8Array(32)),
    ).rejects.toThrow("challenge");
  });

  it("are refused from a retired commitment, and accepted from the new head for the same identity", async () => {
    await anchorA();
    await sim.call(as(A, { incoming: B }), "rotateRecordSecret", B_REC);
    await expect(() =>
      sim.call(as(A), "proveOwnership", secret("v")),
    ).rejects.toThrow("rotated or recovered");
    const ch = secret("v2");
    await sim.call(as(B), "proveOwnership", ch);
    expect(acceptOwnership(sim.state, A_REC, ch).accepted).toBe(true); // asked about the origin
  });
});

describe("recovery", () => {
  it("uses up the recovery secret: whoever saw it during a recovery cannot recover again", async () => {
    // Attack round, 1 Oct: the recovery secret used to stay valid, so a thief who saw it
    // typed in could recover the identity back and lock the owner out.
    await anchorA();
    const NEXT = secret("next-recovery");
    await sim.call(
      as(secret("nothing"), { incoming: Cs, recovery: RECOVERY }),
      "recoverRecordSecret",
      A_REC,
      C_REC,
      C.recoveryCommit(NEXT),
    );
    await expect(() =>
      sim.call(
        as(secret("thief-2"), { incoming: THIEF, recovery: RECOVERY }),
        "recoverRecordSecret",
        A_REC,
        C.commit(THIEF),
        C.recoveryCommit(secret("thief-recovery")),
      ),
    ).rejects.toThrow("not the recovery secret");
    await expect(() =>
      sim.call(
        as(secret("n"), { incoming: D, recovery: NEXT }),
        "recoverRecordSecret",
        A_REC,
        D_REC,
        C.recoveryCommit(NEXT),
      ),
    ).rejects.toThrow("new recovery commitment");
    await sim.call(
      as(secret("n"), { incoming: D, recovery: NEXT }),
      "recoverRecordSecret",
      A_REC,
      D_REC,
      freshRecovery(),
    );
    expect(hex(sim.state.headOf.lookup(A_REC))).toBe(hex(D_REC));
  });

  it("beats a thief who rotated first", async () => {
    await anchorA();
    await sim.call(
      as(A, { incoming: THIEF }),
      "rotateRecordSecret",
      C.commit(THIEF),
    );
    await sim.call(
      as(secret("nothing"), { incoming: Cs, recovery: RECOVERY }),
      "recoverRecordSecret",
      A_REC,
      C_REC,
      freshRecovery(),
    );
    expect(hex(sim.state.headOf.lookup(A_REC))).toBe(hex(C_REC));
    await expect(() =>
      sim.call(as(THIEF), "proveOwnership", new Uint8Array(32).fill(9)),
    ).rejects.toThrow("rotated or recovered");
    await sim.call(as(Cs), "proveOwnership", new Uint8Array(32).fill(9));
  });

  it("survives rotation (the original recovery secret still works)", async () => {
    await anchorA();
    await sim.call(as(A, { incoming: B }), "rotateRecordSecret", B_REC);
    await sim.call(
      as(secret("lost"), { incoming: Cs, recovery: RECOVERY }),
      "recoverRecordSecret",
      A_REC,
      C_REC,
      freshRecovery(),
    );
    await expect(() =>
      sim.call(as(B), "proveOwnership", new Uint8Array(32).fill(9)),
    ).rejects.toThrow("rotated or recovered");
  });

  it("refuses a wrong recovery secret, the zero secret, and a successor named as the origin", async () => {
    await anchorA();
    await expect(() =>
      sim.call(
        as(secret("n"), { incoming: Cs, recovery: secret("guess") }),
        "recoverRecordSecret",
        A_REC,
        C_REC,
        freshRecovery(),
      ),
    ).rejects.toThrow("not the recovery secret");
    // v2: the zero secret is refused as such, before it is compared (v1 said "not the
    // recovery secret" here).
    await expect(() =>
      sim.call(
        as(secret("n"), { incoming: Cs, recovery: ZERO }),
        "recoverRecordSecret",
        A_REC,
        C_REC,
        freshRecovery(),
      ),
    ).rejects.toThrow("A secret cannot be all zeros");
    await sim.call(as(A, { incoming: B }), "rotateRecordSecret", B_REC);
    await expect(() =>
      sim.call(
        as(secret("n"), { incoming: Cs, recovery: RECOVERY }),
        "recoverRecordSecret",
        B_REC,
        C_REC,
        freshRecovery(),
      ),
    ).rejects.toThrow("only for an anchored origin");
  });

  it("lets the recovery holder replace a leaked recovery secret, and nobody else", async () => {
    await anchorA();
    const R2 = secret("recovery-2");
    await expect(() =>
      sim.call(
        as(A, { recovery: A }),
        "replaceRecoveryCommitment",
        A_REC,
        C.recoveryCommit(secret("evil")),
      ),
    ).rejects.toThrow("not the recovery secret");
    await sim.call(
      as(secret("n"), { recovery: RECOVERY }),
      "replaceRecoveryCommitment",
      A_REC,
      C.recoveryCommit(R2),
    );
    await expect(() =>
      sim.call(
        as(secret("n"), { incoming: Cs, recovery: RECOVERY }),
        "recoverRecordSecret",
        A_REC,
        C_REC,
        freshRecovery(),
      ),
    ).rejects.toThrow();
    await sim.call(
      as(secret("n"), { incoming: Cs, recovery: R2 }),
      "recoverRecordSecret",
      A_REC,
      C_REC,
      freshRecovery(),
    );
  });

  it("cannot be starved: a recovery proved before the thief rotates again still lands", async () => {
    await anchorA();
    const T1 = secret("t1"),
      T2 = secret("t2"),
      NEW = secret("owner-new");
    await sim.call(as(A, { incoming: T1 }), "rotateRecordSecret", C.commit(T1));
    const recovery = await sim.prove(
      as(secret("lost"), { incoming: NEW, recovery: RECOVERY }),
      "recoverRecordSecret",
      A_REC,
      C.commit(NEW),
      freshRecovery(),
    );
    await sim.call(
      as(T1, { incoming: T2 }),
      "rotateRecordSecret",
      C.commit(T2),
    );
    sim.land(recovery);
    expect(hex(sim.state.headOf.lookup(A_REC))).toBe(hex(C.commit(NEW)));
    await expect(() =>
      sim.call(as(T2), "proveOwnership", new Uint8Array(32).fill(9)),
    ).rejects.toThrow("rotated or recovered");
  });
});
