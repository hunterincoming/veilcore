// Tests written for checks that mutation testing showed nothing exercised (3 October
// 2026): each assert in veilcore.compact was disabled in turn, and the whole suite run.
// An assert whose removal no test noticed is a rule the suite did not actually check.
// docs/log/self-audit-3oct.md lists every mutant and its result.
//
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it } from "vitest";
import { isLive } from "../verify.js";
import { C, VeilcoreSimulator, as, secret } from "./veilcore-simulator.js";

const A = secret("mg-A"),
  A_REC = C.commit(A);
const RCV = secret("mg-rcv");

let sim: VeilcoreSimulator;
beforeEach(async () => {
  sim = await VeilcoreSimulator.create();
  await sim.call(as(A), "anchor", C.recoveryCommit(RCV));
});

describe("recovery moves the record only to a commitment the recoverer holds", () => {
  it("a new commitment whose secret was not supplied is refused, and nothing changes", async () => {
    const held = secret("mg-held");
    const notHeld = secret("mg-not-held");
    await expect(() =>
      sim.call(
        as(secret("mg-anyone"), { incoming: held, recovery: RCV }),
        "recoverRecordSecret",
        A_REC,
        C.commit(notHeld),
        C.recoveryCommit(secret("mg-rcv-next")),
      ),
    ).rejects.toThrow("You must hold the secret behind the new commitment");
    // The refusal rolled everything back: the record and its recovery secret stand.
    expect(isLive(sim.state, A_REC)).toBe(true);
    await sim.call(
      as(secret("mg-anyone"), { incoming: held, recovery: RCV }),
      "recoverRecordSecret",
      A_REC,
      C.commit(held),
      C.recoveryCommit(secret("mg-rcv-next")),
    );
    expect(isLive(sim.state, C.commit(held))).toBe(true);
  });
});

describe("a parent cannot be confirmed once the child has offspring of its own", () => {
  it("two records proposing each other as parent: the second confirmation is refused, so no cycle", async () => {
    const B = secret("mg-B"),
      B_REC = C.commit(B);
    await sim.call(as(B), "anchor", C.recoveryCommit(secret("mg-rcv-B")));
    // A names B as its parent, and B names A as its parent. Both proposals wait.
    await sim.call(as(A), "proposeParent", B_REC);
    await sim.call(as(B), "proposeParent", A_REC);
    // A confirms being B's parent: A now has offspring, so A's own parents are fixed.
    await sim.call(as(A), "confirmParent", B_REC);
    expect(sim.state.hasOffspring.member(A_REC)).toBe(true);
    // B confirming A's waiting proposal would make B a parent of its own parent.
    await expect(() => sim.call(as(B), "confirmParent", A_REC)).rejects.toThrow(
      "That record already has confirmed offspring; its parents are fixed",
    );
    expect(sim.state.parentsOf.member(A_REC)).toBe(false);
  });
});
