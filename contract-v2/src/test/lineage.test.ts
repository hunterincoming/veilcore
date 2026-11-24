// Lineage: consent-based descent and obligations, keyed by identity so they survive
// rotation and recovery, and the verifier walk over chain state.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it } from "vitest";
import {
  C,
  VeilcoreSimulator,
  ZERO,
  as,
  hex,
  secret,
  freshRecovery,
} from "./veilcore-simulator.js";
import {
  checkLineage,
  identityOf,
  isLive,
  openObligations,
} from "../verify.js";

const GROWER = secret("grower"),
  BREEDER = secret("breeder"),
  COMPETITOR = secret("competitor"),
  SECOND = secret("second");
const G = C.commit(GROWER),
  Br = C.commit(BREEDER),
  Co = C.commit(COMPETITOR),
  S2 = C.commit(SECOND);
const ROYALTY = secret("royalty-terms"),
  FAKE = secret("fake-claim");

let sim: VeilcoreSimulator;
const anchor = (s: Uint8Array): Promise<void> =>
  sim.call(as(s), "anchor", C.recoveryCommit(secret(`recovery-${hex(s)}`)));
const recoveryOf = (s: Uint8Array): Uint8Array => secret(`recovery-${hex(s)}`);
const owes = (record: Uint8Array): bigint => openObligations(sim.state, record);
const rotate = (from: Uint8Array, to: Uint8Array): Promise<void> =>
  sim.call(as(from, { incoming: to }), "rotateRecordSecret", C.commit(to));

beforeEach(async () => {
  sim = await VeilcoreSimulator.create();
  for (const x_ of [GROWER, BREEDER, COMPETITOR, SECOND]) await anchor(x_);
});

describe("obligations need the holder's consent", () => {
  it("a stranger's claim binds nobody, and the stranger cannot accept it for the holder", async () => {
    await sim.call(as(COMPETITOR), "proposeObligation", G, FAKE);
    expect(owes(G)).toBe(0n);
    await expect(() =>
      sim.call(as(COMPETITOR), "acceptObligation", FAKE, Co),
    ).rejects.toThrow("No such obligation proposed");
  });

  it("the holder accepts the real claim despite a squatter's proposal", async () => {
    await sim.call(as(COMPETITOR), "proposeObligation", G, FAKE);
    await sim.call(as(BREEDER), "proposeObligation", G, ROYALTY);
    await sim.call(as(GROWER), "acceptObligation", ROYALTY, Br);
    expect(owes(G)).toBe(1n);
    expect(
      sim.state.openObligations.member(C.obligationKey(G, ROYALTY, Br)),
    ).toBe(true);
    expect(hex(sim.state.lastBeneficiary)).toBe(hex(Br));
  });

  it("only the beneficiary releases; releasing one leaves the other", async () => {
    await sim.call(as(BREEDER), "proposeObligation", G, ROYALTY);
    await sim.call(as(GROWER), "acceptObligation", ROYALTY, Br);
    await sim.call(as(SECOND), "proposeObligation", G, ROYALTY);
    await sim.call(as(GROWER), "acceptObligation", ROYALTY, S2);
    expect(owes(G)).toBe(2n);
    await expect(() =>
      sim.call(as(GROWER), "discharge", G, ROYALTY),
    ).rejects.toThrow("in your favour");
    await expect(() =>
      sim.call(as(COMPETITOR), "discharge", G, ROYALTY),
    ).rejects.toThrow("in your favour");
    await expect(() =>
      sim.call(as(GROWER), "withdrawObligation", G, ROYALTY),
    ).rejects.toThrow("No such proposal");
    await sim.call(as(BREEDER), "discharge", G, ROYALTY);
    expect(owes(G)).toBe(1n);
    await sim.call(as(SECOND), "discharge", G, ROYALTY);
    expect(owes(G)).toBe(0n);
    await expect(() =>
      sim.call(as(SECOND), "discharge", G, ROYALTY),
    ).rejects.toThrow("in your favour");
  });

  it("proposals: no duplicates, only the proposer withdraws, a withdrawn one cannot be accepted", async () => {
    await sim.call(as(BREEDER), "proposeObligation", G, ROYALTY);
    await expect(() =>
      sim.call(as(BREEDER), "proposeObligation", G, ROYALTY),
    ).rejects.toThrow("already proposed");
    await expect(() =>
      sim.call(as(COMPETITOR), "withdrawObligation", G, ROYALTY),
    ).rejects.toThrow("No such proposal");
    await sim.call(as(BREEDER), "withdrawObligation", G, ROYALTY);
    await expect(() =>
      sim.call(as(GROWER), "acceptObligation", ROYALTY, Br),
    ).rejects.toThrow("No such obligation proposed");
    await expect(() =>
      sim.call(as(GROWER), "proposeObligation", G, ROYALTY),
    ).rejects.toThrow("use encumberOwnRecord");
  });

  it("a holder encumbers their own record in one step, and only for themselves", async () => {
    await sim.call(as(BREEDER), "encumberOwnRecord", ROYALTY);
    expect(owes(Br)).toBe(1n);
    await expect(() =>
      sim.call(as(BREEDER), "encumberOwnRecord", ROYALTY),
    ).rejects.toThrow("already in force");
    await expect(() =>
      sim.call(as(COMPETITOR), "discharge", Br, ROYALTY),
    ).rejects.toThrow("in your favour");
    await sim.call(as(BREEDER), "discharge", Br, ROYALTY);
    expect(owes(Br)).toBe(0n);
  });

  it("refuses empty and unanchored records", async () => {
    await expect(() =>
      sim.call(as(BREEDER), "proposeObligation", ZERO, ROYALTY),
    ).rejects.toThrow("only for anchored records");
    await expect(() =>
      sim.call(as(BREEDER), "proposeObligation", G, ZERO),
    ).rejects.toThrow("cannot be empty");
    await expect(() =>
      sim.call(as(BREEDER), "encumberOwnRecord", ZERO),
    ).rejects.toThrow("cannot be empty");
    const loose = secret("unanchored");
    await expect(() =>
      sim.call(as(loose), "encumberOwnRecord", ROYALTY),
    ).rejects.toThrow("only for anchored records");
    await expect(() =>
      sim.call(as(BREEDER), "proposeObligation", C.commit(loose), ROYALTY),
    ).rejects.toThrow("only for anchored records");
  });
});

describe("obligations survive rotation and recovery (independent review, must-fix)", () => {
  it("a beneficiary who rotates can still release what they are owed; the retired secret cannot", async () => {
    await sim.call(as(BREEDER), "proposeObligation", G, ROYALTY);
    await sim.call(as(GROWER), "acceptObligation", ROYALTY, Br);
    const B2 = secret("breeder-2");
    await rotate(BREEDER, B2);
    await expect(() =>
      sim.call(as(BREEDER), "discharge", G, ROYALTY),
    ).rejects.toThrow("rotated or recovered");
    await sim.call(as(B2), "discharge", G, ROYALTY);
    expect(owes(G)).toBe(0n);
  });

  it("a beneficiary who lost their secret recovers and can still release", async () => {
    await sim.call(as(BREEDER), "encumberOwnRecord", ROYALTY);
    const NEW = secret("breeder-recovered");
    await sim.call(
      as(secret("lost"), { incoming: NEW, recovery: recoveryOf(BREEDER) }),
      "recoverRecordSecret",
      Br,
      C.commit(NEW),
      freshRecovery(),
    );
    await sim.call(as(NEW), "discharge", Br, ROYALTY);
    expect(owes(Br)).toBe(0n);
  });

  it("a holder who rotates does not shed the obligation", async () => {
    await sim.call(as(BREEDER), "proposeObligation", G, ROYALTY);
    await sim.call(as(GROWER), "acceptObligation", ROYALTY, Br);
    const G2 = secret("grower-2");
    await rotate(GROWER, G2);
    expect(owes(C.commit(G2))).toBe(1n);
    expect(hex(identityOf(sim.state, C.commit(G2)))).toBe(hex(G));
  });

  it("a thief who stole a beneficiary's secret loses the power to release at recovery", async () => {
    await sim.call(as(BREEDER), "encumberOwnRecord", ROYALTY);
    const T = secret("thief");
    await rotate(BREEDER, T);
    await sim.call(
      as(secret("x"), {
        incoming: secret("b3"),
        recovery: recoveryOf(BREEDER),
      }),
      "recoverRecordSecret",
      Br,
      C.commit(secret("b3")),
      freshRecovery(),
    );
    await expect(() =>
      sim.call(as(T), "discharge", Br, ROYALTY),
    ).rejects.toThrow("rotated or recovered");
    expect(owes(Br)).toBe(1n);
  });

  it("an encumbered identity cannot be merged into another to shed it", async () => {
    // Only anchored records take part in lineage, and an anchored record can never be a
    // rotation target, so an identity's obligations cannot be moved out from under it.
    await sim.call(as(BREEDER), "proposeObligation", G, ROYALTY);
    await sim.call(as(GROWER), "acceptObligation", ROYALTY, Br);
    await expect(() => rotate(COMPETITOR, GROWER)).rejects.toThrow(
      "already an anchored record",
    );
    expect(owes(G)).toBe(1n);
  });
});

describe("descent", () => {
  it("takes both holders; strangers can neither confirm nor withdraw", async () => {
    await sim.call(as(GROWER), "proposeParent", Br);
    await expect(() =>
      sim.call(as(COMPETITOR), "confirmParent", G),
    ).rejects.toThrow("not the parent proposed");
    await expect(() =>
      sim.call(as(GROWER), "proposeParent", Co),
    ).rejects.toThrow("already has a parentage proposal");
    await expect(() =>
      sim.call(as(COMPETITOR), "withdrawParent"),
    ).rejects.toThrow("No parentage proposed");
    await sim.call(as(BREEDER), "confirmParent", G);
    expect(sim.state.parentsOf.lookup(G).member(Br)).toBe(true);
    expect(hex(sim.state.lastDescentParent)).toBe(hex(Br));
    await expect(() =>
      sim.call(as(BREEDER), "confirmParent", G),
    ).rejects.toThrow("No parentage proposed");
    await expect(() =>
      sim.call(as(GROWER), "proposeParent", Br),
    ).rejects.toThrow("already confirmed");
  });

  it("a parent cannot confirm a proposal that now names someone else", async () => {
    await sim.call(as(GROWER), "proposeParent", Co);
    await expect(() =>
      sim.call(as(BREEDER), "confirmParent", G),
    ).rejects.toThrow("not the parent proposed");
    await sim.call(as(GROWER), "withdrawParent");
    await expect(() =>
      sim.call(as(GROWER), "proposeParent", G),
    ).rejects.toThrow("not its own parent");
  });

  it("edges are between identities, so they survive either side rotating", async () => {
    const G2 = secret("grower-2"),
      B2 = secret("breeder-2");
    await rotate(GROWER, G2);
    await sim.call(as(G2), "proposeParent", Br); // names the parent by an old commitment
    await rotate(BREEDER, B2);
    await sim.call(as(B2), "confirmParent", C.commit(G2));
    expect(sim.state.parentsOf.lookup(G).member(Br)).toBe(true);
    expect(isLive(sim.state, C.commit(G2))).toBe(true);
  });

  it("parents must be anchored", async () => {
    await expect(() =>
      sim.call(as(GROWER), "proposeParent", ZERO),
    ).rejects.toThrow("only for anchored records");
    await expect(() =>
      sim.call(as(GROWER), "proposeParent", C.commit(secret("nobody"))),
    ).rejects.toThrow("only for anchored records");
  });
});

describe("the verifier's walk (verify.ts)", () => {
  const link = async (child: Uint8Array, parent: Uint8Array): Promise<void> => {
    await sim.call(as(child), "proposeParent", C.commit(parent));
    await sim.call(as(parent), "confirmParent", C.commit(child));
  };

  it("finds an encumbered grandparent the seller did not mention (omission)", async () => {
    const GP = secret("grandparent");
    await anchor(GP);
    await link(BREEDER, GP); // oldest first: a record's parents are fixed once it has offspring
    await link(GROWER, BREEDER);
    await sim.call(as(GP), "encumberOwnRecord", ROYALTY);
    const report = checkLineage(sim.state, G);
    expect(report.clean).toBe(false);
    expect(report.encumbered.map(hex)).toEqual([hex(C.commit(GP))]);
    expect(report.roots.map(hex)).toEqual([hex(C.commit(GP))]);
  });

  it("is clean when nothing upstream owes anything, and reports the roots", async () => {
    await link(GROWER, BREEDER);
    const report = checkLineage(sim.state, G);
    expect(report.clean).toBe(true);
    expect(report.ancestors.map(hex)).toEqual([hex(Br)]);
    expect(report.roots.map(hex)).toEqual([hex(Br)]);
  });

  it("walks from any commitment of the identity", async () => {
    await link(GROWER, BREEDER);
    const G2 = secret("grower-2");
    await rotate(GROWER, G2);
    const report = checkLineage(sim.state, C.commit(G2));
    expect(hex(report.identity)).toBe(hex(G));
    expect(report.ancestors.map(hex)).toEqual([hex(Br)]);
  });

  it("clears when the beneficiary releases", async () => {
    await link(GROWER, BREEDER);
    await sim.call(as(BREEDER), "encumberOwnRecord", ROYALTY);
    expect(checkLineage(sim.state, G).clean).toBe(false);
    await sim.call(as(BREEDER), "discharge", Br, ROYALTY);
    expect(checkLineage(sim.state, G).clean).toBe(true);
  });
});

describe("contention and clean-up (second independent review)", () => {
  it("a discharge proved before the holder adds another obligation still lands (counts commute)", async () => {
    await sim.call(as(BREEDER), "proposeObligation", G, ROYALTY);
    await sim.call(as(GROWER), "acceptObligation", ROYALTY, Br);
    const release = await sim.prove(as(BREEDER), "discharge", G, ROYALTY);
    await sim.call(as(GROWER), "encumberOwnRecord", secret("growers-own"));
    sim.land(release);
    expect(owes(G)).toBe(1n);
  });

  it("an accept proved before another beneficiary's discharge still lands", async () => {
    await sim.call(as(BREEDER), "proposeObligation", G, ROYALTY);
    await sim.call(as(GROWER), "acceptObligation", ROYALTY, Br);
    await sim.call(as(SECOND), "proposeObligation", G, ROYALTY);
    const accept = await sim.prove(as(GROWER), "acceptObligation", ROYALTY, S2);
    await sim.call(as(BREEDER), "discharge", G, ROYALTY);
    sim.land(accept);
    expect(owes(G)).toBe(1n);
  });

  it("the holder can reject proposals, so they cannot pile up; nobody else can", async () => {
    await sim.call(as(COMPETITOR), "proposeObligation", G, FAKE);
    await expect(() =>
      sim.call(as(BREEDER), "rejectObligation", FAKE, Co),
    ).rejects.toThrow("No such obligation proposed");
    await sim.call(as(GROWER), "rejectObligation", FAKE, Co);
    expect(
      sim.state.pendingObligations.member(C.obligationKey(G, FAKE, Co)),
    ).toBe(false);
    await expect(() =>
      sim.call(as(GROWER), "acceptObligation", FAKE, Co),
    ).rejects.toThrow("No such obligation proposed");
  });
});

describe("known limit: what a thief does with a stolen secret before recovery stays", () => {
  // docs/design.md, "Known limits". Recovery stops a thief from acting again; it does
  // not undo what they did while they held the current secret. This test pins that
  // down so the documentation cannot drift from the behaviour.
  it("an obligation the thief accepted on the victim's record outlives recovery", async () => {
    const T = secret("thief"),
      Tr = C.commit(T);
    await anchor(T);
    await sim.call(as(T), "proposeObligation", Br, FAKE);
    await sim.call(as(BREEDER), "acceptObligation", FAKE, Tr); // the thief, holding BREEDER's secret
    const NEW = secret("breeder-new");
    await sim.call(
      as(secret("x"), { incoming: NEW, recovery: recoveryOf(BREEDER) }),
      "recoverRecordSecret",
      Br,
      C.commit(NEW),
      freshRecovery(),
    );
    expect(owes(Br)).toBe(1n);
    await expect(() =>
      sim.call(as(NEW), "discharge", Br, FAKE),
    ).rejects.toThrow("in your favour");
  });
});

describe("the verifier's walk: cycles, the record itself, and recognised roots", () => {
  const link = async (child: Uint8Array, parent: Uint8Array): Promise<void> => {
    await sim.call(as(child), "proposeParent", C.commit(parent));
    await sim.call(as(parent), "confirmParent", C.commit(child));
  };

  it("no loop can form: the edge that would close one gives a parent a new parent", async () => {
    await link(BREEDER, COMPETITOR);
    await link(GROWER, BREEDER);
    // COMPETITOR is now a parent, so its own parents are fixed.
    await expect(() =>
      sim.call(as(COMPETITOR), "proposeParent", G),
    ).rejects.toThrow("parents are fixed");
    await expect(() =>
      sim.call(as(BREEDER), "proposeParent", G),
    ).rejects.toThrow("parents are fixed");
    const r = checkLineage(sim.state, G, [Co]);
    expect(r.cyclic).toBe(false);
    expect(r.accepted).toBe(true);
  });

  it("an ancestor cannot change the pedigree of material already descended from it", async () => {
    await link(GROWER, BREEDER);
    const junk = secret("junk-root");
    await anchor(junk);
    await expect(() =>
      sim.call(as(BREEDER), "proposeParent", C.commit(junk)),
    ).rejects.toThrow("parents are fixed");
    expect(checkLineage(sim.state, G, [Br]).accepted).toBe(true);
  });

  it("a parent's proposal made before it had offspring cannot be confirmed after", async () => {
    const GP = secret("late-grandparent");
    await anchor(GP);
    await sim.call(as(BREEDER), "proposeParent", C.commit(GP));
    await link(GROWER, BREEDER);
    await expect(() => sim.call(as(GP), "confirmParent", Br)).rejects.toThrow(
      "parents are fixed",
    );
  });

  it("the walk itself still refuses a loop if one is ever handed to it", () => {
    // A stub ledger with a two-node loop, as a buggy or hostile indexer might report.
    const a = secret("loop-a"),
      b = secret("loop-b");
    const sets: Record<string, Uint8Array[]> = { [hex(a)]: [b], [hex(b)]: [a] };
    const none = {
      member: () => false,
      lookup: () => {
        throw new Error("absent");
      },
    };
    const stub = {
      originOf: none,
      headOf: none,
      recoveryOf: { member: () => true },
      obligationCountOf: none,
      parentsOf: {
        member: (k: Uint8Array) => hex(k) in sets,
        lookup: (k: Uint8Array) => sets[hex(k)],
      },
    } as unknown as Parameters<typeof checkLineage>[0];
    const r = checkLineage(stub, a, [a, b]);
    expect(r.cyclic).toBe(true);
    expect(r.accepted).toBe(false);
  });

  it("counts an obligation on the record itself, not only on ancestors", async () => {
    await link(GROWER, BREEDER);
    await sim.call(as(GROWER), "encumberOwnRecord", ROYALTY);
    const r = checkLineage(sim.state, G, [Br]);
    expect(r.encumbered.map(hex)).toEqual([hex(G)]);
    expect(r.clean).toBe(false);
  });

  it("accepts only when every root is one the verifier recognises", async () => {
    await link(GROWER, BREEDER);
    expect(checkLineage(sim.state, G).accepted).toBe(false);
    expect(checkLineage(sim.state, G, [Co]).accepted).toBe(false);
    expect(checkLineage(sim.state, G, [Br]).accepted).toBe(true);
    const B2 = secret("breeder-2");
    await rotate(BREEDER, B2);
    expect(checkLineage(sim.state, G, [C.commit(B2)]).accepted).toBe(true); // any commitment of the identity
  });
});

describe("the verifier's walk: shared ancestors and founding records (third review)", () => {
  const link = async (child: Uint8Array, parent: Uint8Array): Promise<void> => {
    await sim.call(as(child), "proposeParent", C.commit(parent));
    await sim.call(as(parent), "confirmParent", C.commit(child));
  };

  it("a backcross (two lines sharing an ancestor) is not a cycle", async () => {
    const R = secret("root-mother");
    await anchor(R);
    await link(BREEDER, R);
    await link(COMPETITOR, R); // both descend from R
    await link(GROWER, BREEDER);
    await link(GROWER, COMPETITOR); // a cross: two parents
    const r = checkLineage(sim.state, G, [C.commit(R)]);
    expect(r.cyclic).toBe(false);
    expect(r.roots.map(hex)).toEqual([hex(C.commit(R))]);
    expect(r.accepted).toBe(true);
  });

  it("a founding record with no parents is its own root", () => {
    const r = checkLineage(sim.state, Br, [Br]);
    expect(r.roots.map(hex)).toEqual([hex(Br)]);
    expect(r.accepted).toBe(true);
    expect(checkLineage(sim.state, Br).accepted).toBe(false);
  });

  it("the first two obligations on a record, accepted concurrently, both land", async () => {
    await sim.call(as(BREEDER), "proposeObligation", G, ROYALTY);
    await sim.call(as(SECOND), "proposeObligation", G, ROYALTY);
    const first = await sim.prove(as(GROWER), "acceptObligation", ROYALTY, Br);
    await sim.call(as(GROWER), "acceptObligation", ROYALTY, S2);
    sim.land(first);
    expect(owes(G)).toBe(2n);
  });
});
