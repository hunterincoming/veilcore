// Licences: issue, countersign, present, transfer, revoke, seal, and the attacks on each.
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
import { LicenseState } from "../managed/veilcore/contract/index.js";
import { acceptPresentation } from "../verify.js";

const A = secret("breeder-A"),
  B = secret("breeder-B"),
  Cs = secret("breeder-C"),
  D = secret("breeder-D");
const RECOVERY = secret("recovery"),
  THIEF = secret("thief");
const A_REC = C.commit(A),
  B_REC = C.commit(B),
  C_REC = C.commit(Cs);
const L1 = secret("licensee-1"),
  L2 = secret("licensee-2");
const anyone = as(secret("anyone"));
const INTERVAL = 600n;

let sim: VeilcoreSimulator;
const anchor = async (
  s: Uint8Array,
  recovery = secret(`recovery-${hex(s)}`),
): Promise<void> => {
  if (!sim.state.recoveryOf.member(C.commit(s)))
    await sim.call(as(s), "anchor", C.recoveryCommit(recovery));
};
const anchorA = (): Promise<void> => anchor(A, RECOVERY);
/** The issuer anchors if needed, then issues a licence to the holder of `licSecret`. */
const issue = async (
  issuer: Uint8Array,
  licSecret: Uint8Array,
): Promise<Uint8Array> => {
  await anchor(issuer);
  const lc = C.licenseCommit(licSecret, C.commit(issuer));
  await sim.call(as(issuer), "issueLicense", lc);
  return lc;
};
const countersign = (
  licSecret: Uint8Array,
  record: Uint8Array,
  slot = sim.freeSlot(),
): Promise<void> =>
  sim.withLicence({ secret: licSecret, record }, () =>
    sim.call(anyone, "countersignLicense", record, slot),
  );
type Path = ReturnType<VeilcoreSimulator["pathFor"]>;
const present = (
  licSecret: Uint8Array,
  record: Uint8Array,
  challenge = secret("challenge"),
  path?: Path,
): Promise<void> =>
  sim.withLicence({ secret: licSecret, record, challenge, path }, () =>
    sim.call(anyone, "proveLicense"),
  );
const propose = (
  licSecret: Uint8Array,
  record: Uint8Array,
  next: Uint8Array,
): Promise<void> =>
  sim.withLicence({ secret: licSecret, record }, () =>
    sim.call(anyone, "proposeTransfer", record, next),
  );
/** A seal whose bound is 60 s ahead of the block time, as the client makes it. */
const seal = (): Promise<void> =>
  sim.call(anyone, "sealRevocations", sim.now + 60n);
/** Move to the first block time at which the next seal is allowed. */
const untilSealable = (): void => {
  const at = sim.state.lastSealTime + INTERVAL;
  if (sim.now < at) sim.advance(at - sim.now);
};

beforeEach(async () => {
  sim = await VeilcoreSimulator.create();
});

describe("the licence lifecycle", () => {
  it("issues, activates and presents", async () => {
    const lc = await issue(A, L1);
    expect(sim.state.licenseStatusOf.lookup(C.licenseKey(lc, A_REC))).toBe(
      LicenseState.PENDING,
    );
    await countersign(L1, A_REC);
    expect(sim.state.licenseStatusOf.lookup(C.licenseKey(lc, A_REC))).toBe(
      LicenseState.ACTIVE,
    );
    expect(hex(sim.state.lastActivatedLicense)).toBe(hex(lc));
    const ch = secret("verifier-nonce");
    await present(L1, A_REC, ch);
    expect(hex(sim.state.lastPresentation)).toBe(
      hex(C.presentationTag(A_REC, ch)),
    );
    expect(acceptPresentation(sim.state, A_REC, ch).accepted).toBe(true);
    expect(acceptPresentation(sim.state, B_REC, ch).accepted).toBe(false);
  });

  it("a presentation names neither the licence nor the record, and two do not link", async () => {
    const lc = await issue(A, L1);
    await countersign(L1, A_REC);
    await present(L1, A_REC, secret("n1"));
    const t1 = sim.state.lastPresentation;
    await present(L1, A_REC, secret("n2"));
    expect(hex(sim.state.lastPresentation)).not.toBe(hex(t1));
    expect([hex(A_REC), hex(lc)]).not.toContain(hex(t1));
  });

  it("refuses a presentation without a challenge, or for a licence not held", async () => {
    await issue(A, L1);
    await countersign(L1, A_REC);
    await expect(() => present(L1, A_REC, ZERO)).rejects.toThrow(
      "verifier's challenge",
    );
    await expect(() => present(L1, B_REC)).rejects.toThrow("No live licence");
    await expect(() => present(L2, A_REC)).rejects.toThrow("No live licence");
  });

  it("refuses the empty licence, a duplicate, and an unanchored issuer", async () => {
    await anchorA();
    await expect(() => sim.call(as(A), "issueLicense", ZERO)).rejects.toThrow(
      "cannot be empty",
    );
    await issue(A, L1);
    await expect(() => issue(A, L1)).rejects.toThrow("already exists");
    await expect(() =>
      sim.call(as(D), "issueLicense", C.licenseCommit(L1, C.commit(D))),
    ).rejects.toThrow("only for anchored records");
  });
});

describe("who controls a licence", () => {
  it("a squatter cannot block an issue: entries are keyed by the issuer", async () => {
    await anchorA();
    const lc = C.licenseCommit(L1, A_REC);
    await anchor(THIEF);
    await sim.call(as(THIEF), "issueLicense", lc);
    await sim.call(as(A), "issueLicense", lc);
    await countersign(L1, A_REC);
    await present(L1, A_REC);
  });

  it("an issue by D does not create a licence under A", async () => {
    await anchorA();
    await anchor(D);
    await sim.call(as(D), "issueLicense", C.licenseCommit(L1, A_REC));
    await expect(() => countersign(L1, A_REC)).rejects.toThrow(
      "No such license",
    );
  });

  it("control follows the identity through two rotations; retired records lose it", async () => {
    await anchorA();
    const lc = await issue(A, L1);
    await countersign(L1, A_REC);
    await sim.call(as(A, { incoming: B }), "rotateRecordSecret", B_REC);
    const nlc = C.licenseCommit(L2, A_REC);
    await propose(L1, A_REC, nlc);
    await sim.call(as(B), "approveTransfer", lc, A_REC, nlc);
    await sim.call(as(B, { incoming: Cs }), "rotateRecordSecret", C_REC);
    await expect(() =>
      sim.call(as(B), "revokeLicense", nlc, A_REC),
    ).rejects.toThrow("rotated or recovered");
    await sim.call(as(Cs), "revokeLicense", nlc, A_REC);
    expect(sim.state.licenseStatusOf.member(C.licenseKey(nlc, A_REC))).toBe(
      false,
    );
  });

  it("a licence issued after a rotation is found by the verifier through the identity", async () => {
    await anchorA();
    await sim.call(as(A, { incoming: B }), "rotateRecordSecret", B_REC);
    const lc = C.licenseCommit(L1, B_REC);
    await sim.call(as(B), "issueLicense", lc);
    await countersign(L1, B_REC);
    const ch = secret("ask-about-A");
    await present(L1, B_REC, ch);
    expect(acceptPresentation(sim.state, A_REC, ch).accepted).toBe(true);
  });

  it("a stranger, or a stranger's successor, cannot revoke", async () => {
    const lc = await issue(A, L1);
    await countersign(L1, A_REC);
    await anchor(D);
    await expect(() =>
      sim.call(as(D), "revokeLicense", lc, A_REC),
    ).rejects.toThrow("Only the issuing record");
    await sim.call(
      as(D, { incoming: secret("D2") }),
      "rotateRecordSecret",
      C.commit(secret("D2")),
    );
    await expect(() =>
      sim.call(as(secret("D2")), "revokeLicense", lc, A_REC),
    ).rejects.toThrow("Only the issuing record");
  });

  it("after recovery from a thief, the owner controls the old licences and the thief controls nothing", async () => {
    await anchorA();
    const lc = await issue(A, L1);
    await countersign(L1, A_REC);
    await sim.call(
      as(A, { incoming: THIEF }),
      "rotateRecordSecret",
      C.commit(THIEF),
    );
    await sim.call(
      as(secret("x"), { incoming: Cs, recovery: RECOVERY }),
      "recoverRecordSecret",
      A_REC,
      C_REC,
      freshRecovery(),
    );
    await expect(() =>
      sim.call(as(THIEF), "revokeLicense", lc, A_REC),
    ).rejects.toThrow("rotated or recovered");
    await expect(() =>
      sim.call(as(THIEF), "issueLicense", C.licenseCommit(secret("t"), A_REC)),
    ).rejects.toThrow("rotated or recovered");
    await sim.call(as(Cs), "revokeLicense", lc, A_REC);
  });
});

describe("transfers", () => {
  it("moves the licence; the outgoing holder's old path works only until the next seal", async () => {
    const lc = await issue(A, L1);
    await countersign(L1, A_REC);
    const outgoing = sim.pathFor(L1, A_REC);
    const nlc = C.licenseCommit(L2, A_REC);
    await propose(L1, A_REC, nlc);
    await expect(() =>
      sim.call(
        as(A),
        "approveTransfer",
        lc,
        A_REC,
        C.licenseCommit(secret("other"), A_REC),
      ),
    ).rejects.toThrow("not the one you approved");
    await sim.call(as(A), "approveTransfer", lc, A_REC, nlc);
    await present(L2, A_REC);
    expect(sim.pathFor(L1, A_REC)).toBeUndefined();
    await present(L1, A_REC, secret("c"), outgoing); // the stated window
    await seal();
    await expect(() =>
      present(L1, A_REC, secret("c2"), outgoing),
    ).rejects.toThrow("stale");
  });

  it("cannot forge a licence from another issuer (independent review, critical)", async () => {
    const Bf = secret("famous-breeder"),
      Bf_REC = C.commit(Bf);
    await anchor(Bf);
    const M = secret("mallory"),
      M_REC = C.commit(M);
    const X1 = secret("x1"),
      X2 = secret("x2");
    const lcM = await issue(M, X1);
    await countersign(X1, M_REC);
    const forged = C.licenseCommit(X2, Bf_REC);
    await propose(X1, M_REC, forged);
    await sim.call(as(M), "approveTransfer", lcM, M_REC, forged);
    await expect(() => present(X2, Bf_REC)).rejects.toThrow("No live licence");
    expect(sim.state.licenseStatusOf.member(C.licenseKey(forged, Bf_REC))).toBe(
      false,
    );
  });

  it("one commitment under two issuers: revoking one leaves no presentable copy under it", async () => {
    const Aa = secret("A"),
      Aa_REC = C.commit(Aa),
      Bb = secret("B"),
      Bb_REC = C.commit(Bb);
    const G1 = secret("g1"),
      G2 = secret("g2");
    const lcB = await issue(Bb, G2);
    await countersign(G2, Bb_REC);
    const lcA = await issue(Aa, G1);
    await countersign(G1, Aa_REC);
    await propose(G1, Aa_REC, lcB);
    await sim.call(as(Aa), "approveTransfer", lcA, Aa_REC, lcB);
    const oldB = sim.pathFor(G2, Bb_REC);
    await sim.call(as(Bb), "revokeLicense", lcB, Bb_REC);
    await seal();
    await expect(() => present(G2, Bb_REC, secret("v"), oldB)).rejects.toThrow(
      "stale",
    );
    expect(sim.state.licenseStatusOf.member(C.licenseKey(lcB, Aa_REC))).toBe(
      true,
    );
  });

  it("refuses a transfer to the empty leaf, and the holder can withdraw a proposal", async () => {
    await issue(A, L1);
    await countersign(L1, A_REC);
    await expect(() => propose(L1, A_REC, ZERO)).rejects.toThrow(
      "cannot be empty",
    );
    await propose(L1, A_REC, C.licenseCommit(L2, A_REC));
    await expect(() =>
      propose(L1, A_REC, C.licenseCommit(L2, A_REC)),
    ).rejects.toThrow("already proposed");
    await sim.withLicence({ secret: L1, record: A_REC }, () =>
      sim.call(anyone, "withdrawTransfer", A_REC),
    );
  });
});

describe("revocation and sealing", () => {
  const activeA = async (): Promise<Uint8Array> => {
    const lc = await issue(A, L1);
    await countersign(L1, A_REC);
    return lc;
  };

  it("revocation clears the licence at once; the old path works until the seal and fails after it", async () => {
    const lc = await activeA();
    const oldPath = sim.pathFor(L1, A_REC);
    await sim.call(as(A), "revokeLicense", lc, A_REC);
    expect(sim.state.licenseStatusOf.member(C.licenseKey(lc, A_REC))).toBe(
      false,
    );
    expect(sim.pathFor(L1, A_REC)).toBeUndefined();
    const ch = secret("c");
    await present(L1, A_REC, ch, oldPath);
    // The verifier's rule 5 rejects it: a revocation was waiting for a seal.
    expect(acceptPresentation(sim.state, A_REC, ch)).toMatchObject({
      accepted: false,
    });
    await seal();
    await expect(() =>
      present(L1, A_REC, secret("c2"), oldPath),
    ).rejects.toThrow("stale");
  });

  it("cannot be starved: a revoke proved before the licensee proposes still lands", async () => {
    const lc = await activeA();
    const revoke = await sim.prove(as(A), "revokeLicense", lc, A_REC);
    await propose(L1, A_REC, C.licenseCommit(secret("friend"), A_REC));
    sim.land(revoke);
    expect(sim.state.licenseStatusOf.member(C.licenseKey(lc, A_REC))).toBe(
      false,
    );
    expect(sim.state.pendingTransferOf.member(C.licenseKey(lc, A_REC))).toBe(
      false,
    );
  });

  it("control: the replay rejects what the chain would (a revoke of an already revoked licence)", async () => {
    const lc = await activeA();
    const revoke = await sim.prove(as(A), "revokeLicense", lc, A_REC);
    await sim.call(as(A), "revokeLicense", lc, A_REC);
    expect(() => sim.land(revoke)).toThrow();
  });

  it("a presentation in flight survives activations elsewhere and is accepted", async () => {
    await activeA();
    const M = secret("spam"),
      M_REC = C.commit(M);
    await issue(M, secret("spam-lic"));
    const ch = secret("c");
    const presentation = await sim.withLicence(
      { secret: L1, record: A_REC, challenge: ch },
      () => sim.prove(anyone, "proveLicense"),
    );
    await countersign(secret("spam-lic"), M_REC); // the root moves on
    sim.land(presentation);
    expect(acceptPresentation(sim.state, A_REC, ch).accepted).toBe(true);
  });

  it("a revocation anywhere sends presentations in flight back to be re-proved", async () => {
    // The presentation records whether a revocation was waiting when it was proved, so
    // a revocation landing first changes what it read. A verifier would refuse it anyway
    // (older root, revocation waiting), so this costs a re-proof, not a wrong answer.
    await activeA();
    const M = secret("spam"),
      M_REC = C.commit(M);
    const spam = await issue(M, secret("spam-lic"));
    await countersign(secret("spam-lic"), M_REC);
    const presentation = await sim.withLicence(
      { secret: L1, record: A_REC, challenge: secret("c") },
      () => sim.prove(anyone, "proveLicense"),
    );
    await sim.call(as(M), "revokeLicense", spam, M_REC);
    expect(() => sim.land(presentation)).toThrow();
    const ch = secret("c2");
    await sim.withLicence({ secret: L1, record: A_REC, challenge: ch }, () =>
      sim.call(anyone, "proveLicense"),
    );
    expect(acceptPresentation(sim.state, A_REC, ch).accepted).toBe(true); // current root
  });

  it("a revoked licensee gains nothing by landing a seal after a stale presentation", async () => {
    // Attack round, 1 Oct: proveLicense against the pre-revocation root, then a seal in
    // the same transaction, used to leave unsealedChanges false for the verifier to read.
    const lc = await activeA();
    const oldPath = sim.pathFor(L1, A_REC); // fetched while the licence was live
    await sim.call(as(A), "revokeLicense", lc, A_REC);
    untilSealable();
    const ch = secret("bundle");
    // The old root is still in history until the seal, so the stale path still proves.
    await sim.withLicence(
      { secret: L1, record: A_REC, challenge: ch, path: oldPath },
      () => sim.call(anyone, "proveLicense"),
    );
    await sim.call(anyone, "sealRevocations", sim.now + 1n); // same transaction, or right after
    expect(sim.state.unsealedChanges).toBe(false);
    expect(acceptPresentation(sim.state, A_REC, ch)).toMatchObject({
      accepted: false,
    });
  });

  it("anyone may seal, only when something is waiting, and never twice within the interval of block time", async () => {
    await expect(() => seal()).rejects.toThrow(
      "Nothing has changed the licence tree",
    );
    const lc = await activeA();
    await sim.call(as(A), "revokeLicense", lc, A_REC);
    await sim.call(anyone, "sealRevocations", sim.now + 1n); // the tightest bound
    const lc2 = await issue(A, L2);
    await countersign(L2, A_REC);
    await sim.call(as(A), "revokeLicense", lc2, A_REC);
    sim.advance(INTERVAL);
    await expect(() =>
      sim.call(anyone, "sealRevocations", sim.now + 1n),
    ).rejects.toThrow("Too soon");
    await expect(() =>
      sim.call(anyone, "sealRevocations", sim.now + 300n),
    ).rejects.toThrow("Too soon");
    sim.advance(1n);
    await sim.call(anyone, "sealRevocations", sim.now + 1n);
    expect(sim.state.sealSeq).toBe(2n);
  });

  it("the seal's bound must be ahead of the block time, by at most 300 s", async () => {
    const lc = await activeA();
    await sim.call(as(A), "revokeLicense", lc, A_REC);
    await expect(() =>
      sim.call(anyone, "sealRevocations", sim.now),
    ).rejects.toThrow("not ahead of the block time");
    await expect(() =>
      sim.call(anyone, "sealRevocations", sim.now - 100n),
    ).rejects.toThrow("not ahead of the block time");
    await expect(() =>
      sim.call(anyone, "sealRevocations", sim.now + 301n),
    ).rejects.toThrow("too far ahead");
    await sim.call(anyone, "sealRevocations", sim.now + 300n);
  });

  it("griefing costs honest licensees re-proofs, never a wrong answer (known limit)", async () => {
    await activeA();
    const M = secret("griefer"),
      M_REC = C.commit(M);
    const grief = async (): Promise<void> => {
      const x = secret(`g-${sim.now}-${Math.random()}`);
      const lc = await issue(M, x);
      await countersign(x, M_REC);
      await sim.call(as(M), "revokeLicense", lc, M_REC);
    };
    const inFlight = (
      ch: Uint8Array,
    ): Promise<ReturnType<VeilcoreSimulator["prove"]>> =>
      sim.withLicence({ secret: L1, record: A_REC, challenge: ch }, () =>
        sim.prove(anyone, "proveLicense"),
      );

    const p = await inFlight(secret("p"));
    await grief(); // nothing was waiting: the revocation changes what p read
    expect(() => sim.land(p)).toThrow();

    const ch = secret("q");
    const q = await inFlight(ch);
    const y = secret("g-activation");
    await issue(M, y);
    await countersign(y, M_REC); // a revocation is already waiting: q lands, on a root that is no longer current
    sim.land(q);
    expect(acceptPresentation(sim.state, A_REC, ch)).toMatchObject({
      accepted: false,
    });

    untilSealable();
    await seal();
    const ch2 = secret("r");
    sim.land(await inFlight(ch2)); // nothing changed in between
    expect(acceptPresentation(sim.state, A_REC, ch2).accepted).toBe(true);
  });
});

describe("slots", () => {
  it("two activations on the same state both land if they picked different slots", async () => {
    await issue(A, L1);
    await issue(A, L2);
    const second = await sim.withLicence({ secret: L2, record: A_REC }, () =>
      sim.prove(anyone, "countersignLicense", A_REC, 6n),
    );
    await countersign(L1, A_REC, 5n);
    sim.land(second);
    expect(hex(sim.state.licenseAtSlot.lookup(6n))).toBe(
      hex(C.licenseKey(C.licenseCommit(L2, A_REC), A_REC)),
    );
  });

  it("the same slot is refused, as is one outside the tree", async () => {
    await issue(A, L1);
    await issue(A, L2);
    await countersign(L1, A_REC, 5n);
    await expect(() => countersign(L2, A_REC, 5n)).rejects.toThrow(
      "slot is taken",
    );
    await expect(() => countersign(L2, A_REC, 16777216n)).rejects.toThrow(
      "outside the licence tree",
    );
  });

  it("a freed slot is reused, and the revoked licence does not come back with it", async () => {
    const lc1 = await issue(A, L1);
    await issue(A, L2);
    await countersign(L1, A_REC, 5n);
    const oldPath = sim.pathFor(L1, A_REC);
    await sim.call(as(A), "revokeLicense", lc1, A_REC);
    await seal();
    await countersign(L2, A_REC, 5n);
    await present(L2, A_REC);
    await expect(() =>
      present(L1, A_REC, secret("c"), oldPath),
    ).rejects.toThrow("stale");
    await expect(() => present(L1, A_REC)).rejects.toThrow("No live licence");
  });
});

describe("the verifier's presentation check (rule 5)", () => {
  const activeA = async (): Promise<Uint8Array> => {
    const lc = await issue(A, L1);
    await countersign(L1, A_REC);
    return lc;
  };

  it("reads the tag from chain state, so a licensee cannot hand over one of their own making", async () => {
    await anchorA();
    const ch = secret("verifier-challenge");
    expect(acceptPresentation(sim.state, A_REC, ch)).toMatchObject({
      accepted: false,
    }); // nothing presented yet
    await activeA();
    await present(L1, A_REC, secret("some-other-challenge"));
    expect(acceptPresentation(sim.state, A_REC, ch)).toMatchObject({
      accepted: false,
    });
    await present(L1, A_REC, ch);
    expect(acceptPresentation(sim.state, A_REC, ch)).toMatchObject({
      accepted: true,
    });
  });

  it("a revoked licence presented before the seal is rejected on the state right after it, even if a seal follows", async () => {
    const lc = await activeA();
    const oldPath = sim.pathFor(L1, A_REC);
    await sim.call(as(A), "revokeLicense", lc, A_REC);
    const ch = secret("c");
    await present(L1, A_REC, ch, oldPath);
    const afterTx = sim.state;
    await seal(); // the licensee, or anyone, seals straight after
    expect(acceptPresentation(afterTx, A_REC, ch)).toMatchObject({
      accepted: false,
    });
  });

  it("a live licence is accepted even while someone keeps a revocation waiting", async () => {
    await activeA();
    const M = secret("griefer"),
      M_REC = C.commit(M);
    const x = secret("throwaway");
    const lc = await issue(M, x);
    await countersign(x, M_REC);
    await sim.call(as(M), "revokeLicense", lc, M_REC);
    expect(sim.state.unsealedChanges).toBe(true);
    const ch = secret("c");
    await present(L1, A_REC, ch); // a fresh path, against the current root
    expect(acceptPresentation(sim.state, A_REC, ch)).toMatchObject({
      accepted: true,
    });
  });
});
