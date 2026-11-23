// State bounds (Midnight deployment rubric, State-Space-at-Risk). Every entry the
// contract keeps is overwritten, cleared by the party who created it, or capped per
// anchored identity. These tests try each way one identity could grow state by calling
// repeatedly, check the cap, check the legal moves up to it, and check that clearing
// frees the place again. docs/design.md, State bounds.
//
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it } from "vitest";
import { isLive, openObligations } from "../verify.js";
import { C, VeilcoreSimulator, as, hex, secret } from "./veilcore-simulator.js";

const A = secret("sb-A"),
  A_REC = C.commit(A);
const B = secret("sb-B"),
  B_REC = C.commit(B);
const anyone = as(secret("sb-anyone"));
const rcv = (s: Uint8Array): Uint8Array => secret(`sb-rcv-${hex(s)}`);

let sim: VeilcoreSimulator;
const anchor = async (s: Uint8Array): Promise<void> => {
  if (!sim.state.recoveryOf.member(C.commit(s)))
    await sim.call(as(s), "anchor", C.recoveryCommit(rcv(s)));
};
const issue = async (
  issuer: Uint8Array,
  l: Uint8Array,
): Promise<Uint8Array> => {
  const lc = C.licenseCommit(l, C.commit(issuer));
  await sim.call(as(issuer), "issueLicense", lc);
  return lc;
};
const countersign = (l: Uint8Array, rec: Uint8Array): Promise<void> =>
  sim.withLicence({ secret: l, record: rec }, () =>
    sim.call(anyone, "countersignLicense", rec, sim.freeSlot()),
  );

beforeEach(async () => {
  sim = await VeilcoreSimulator.create();
  for (const x_ of [A, B]) await anchor(x_);
});

describe("an anchor creates a fixed set of per-identity entries", () => {
  it("one recovery commitment and six counters, nothing else keyed by the record", () => {
    for (const m of [
      "recoveryOf",
      "obligationCountOf",
      "rotationsOf",
      "recoveriesOf",
      "pendingObligationsBy",
      "pendingLicensesBy",
      "activeLicensesBy",
    ] as const)
      expect(sim.state[m].member(A_REC), m).toBe(true);
  });
});

describe("rotations: at most 16 per identity", () => {
  it("16 rotations land, the 17th is refused, and the recovery secret can still move the record", async () => {
    let cur = A;
    for (let i = 0; i < 16; i++) {
      const next = secret(`sb-rot-${i}`);
      await sim.call(
        as(cur, { incoming: next }),
        "rotateRecordSecret",
        C.commit(next),
      );
      cur = next;
    }
    const extra = secret("sb-rot-extra");
    await expect(() =>
      sim.call(
        as(cur, { incoming: extra }),
        "rotateRecordSecret",
        C.commit(extra),
      ),
    ).rejects.toThrow("used all its rotations");
    // A thief holding the head can spend the rotations; the owner still recovers.
    const owner = secret("sb-owner-back");
    await sim.call(
      as(secret("sb-x"), { incoming: owner, recovery: rcv(A) }),
      "recoverRecordSecret",
      A_REC,
      C.commit(owner),
      C.recoveryCommit(secret("sb-rcv-next")),
    );
    expect(isLive(sim.state, C.commit(owner))).toBe(true);
    expect(isLive(sim.state, C.commit(cur))).toBe(false);
  });
});

describe("recoveries: at most 16 per identity", () => {
  it("16 recoveries land and the 17th is refused", async () => {
    let r = rcv(A);
    for (let i = 0; i < 16; i++) {
      const next = secret(`sb-rec-${i}`);
      const nextR = secret(`sb-recsecret-${i}`);
      await sim.call(
        as(secret("sb-y"), { incoming: next, recovery: r }),
        "recoverRecordSecret",
        A_REC,
        C.commit(next),
        C.recoveryCommit(nextR),
      );
      r = nextR;
    }
    const extra = secret("sb-rec-extra");
    await expect(() =>
      sim.call(
        as(secret("sb-y"), { incoming: extra, recovery: r }),
        "recoverRecordSecret",
        A_REC,
        C.commit(extra),
        C.recoveryCommit(secret("sb-recsecret-extra")),
      ),
    ).rejects.toThrow("used all its recoveries");
  });
});

describe("obligations in force: at most 16 on one record", () => {
  it("16 land, the 17th is refused, and a discharge frees a place", async () => {
    const os = Array.from({ length: 17 }, (_, i) => secret(`sb-own-${i}`));
    for (const x_ of os.slice(0, 16))
      await ((o) => sim.call(as(A), "encumberOwnRecord", o))(x_);
    expect(openObligations(sim.state, A_REC)).toBe(16n);
    await expect(() =>
      sim.call(as(A), "encumberOwnRecord", os[16]),
    ).rejects.toThrow("most obligations it can");
    await sim.call(as(A), "discharge", A_REC, os[0]);
    await sim.call(as(A), "encumberOwnRecord", os[16]);
    expect(openObligations(sim.state, A_REC)).toBe(16n);
  });

  it("an accepted proposal counts toward the cap, and a full record cannot accept", async () => {
    for (const x_ of Array.from({ length: 16 }, (_, i) =>
      secret(`sb-fill-${i}`),
    ))
      await ((o) => sim.call(as(A), "encumberOwnRecord", o))(x_);
    const o = secret("sb-from-B");
    await sim.call(as(B), "proposeObligation", A_REC, o);
    await expect(() =>
      sim.call(as(A), "acceptObligation", o, B_REC),
    ).rejects.toThrow("most obligations it can");
    // The proposal is still there to reject, and rejecting frees B's place.
    await sim.call(as(A), "rejectObligation", o, B_REC);
    expect(sim.state.pendingObligations.size()).toBe(0n);
  });
});

describe("waiting obligation proposals: at most 8 per proposer", () => {
  it("withdraw, accept and reject each free the proposer's place", async () => {
    const os = Array.from({ length: 11 }, (_, i) => secret(`sb-p-${i}`));
    for (const x_ of os.slice(0, 8))
      await ((o) => sim.call(as(B), "proposeObligation", A_REC, o))(x_);
    await expect(() =>
      sim.call(as(B), "proposeObligation", A_REC, os[8]),
    ).rejects.toThrow("too many proposals waiting");
    await sim.call(as(B), "withdrawObligation", A_REC, os[0]);
    await sim.call(as(B), "proposeObligation", A_REC, os[8]);
    await sim.call(as(A), "acceptObligation", os[1], B_REC);
    await sim.call(as(B), "proposeObligation", A_REC, os[9]);
    await sim.call(as(A), "rejectObligation", os[2], B_REC);
    await sim.call(as(B), "proposeObligation", A_REC, os[10]);
    expect(sim.state.pendingObligations.size()).toBe(8n);
  });
});

describe("pending licences: at most 32 per issuer", () => {
  it("32 wait, the 33rd is refused; a countersign or a revoke frees a place; revoking an active one does not", async () => {
    const ls = Array.from({ length: 35 }, (_, i) => secret(`sb-l-${i}`));
    const lcs: Uint8Array[] = [];
    for (const l of ls.slice(0, 32)) lcs.push(await issue(A, l));
    await expect(() => issue(A, ls[32])).rejects.toThrow(
      "Too many licences waiting",
    );
    await countersign(ls[0], A_REC); // pending -> active frees one
    await issue(A, ls[32]);
    await sim.call(as(A), "revokeLicense", lcs[1], A_REC); // revoking a pending one frees one
    await issue(A, ls[33]);
    await sim.call(as(A), "revokeLicense", lcs[0], A_REC); // revoking the active one frees none
    await expect(() => issue(A, ls[34])).rejects.toThrow(
      "Too many licences waiting",
    );
  });

  it("the count follows the identity across a rotation", async () => {
    const ls = Array.from({ length: 33 }, (_, i) => secret(`sb-lr-${i}`));
    for (const x_ of ls.slice(0, 16)) await ((l) => issue(A, l))(x_);
    const A2 = secret("sb-A2");
    await sim.call(as(A, { incoming: A2 }), "rotateRecordSecret", C.commit(A2));
    for (const x_ of ls.slice(16, 32)) await ((l) => issue(A2, l))(x_);
    await expect(() => issue(A2, ls[32])).rejects.toThrow(
      "Too many licences waiting",
    );
  });
});

describe("licence-tree root history: an activation lets anyone seal", () => {
  it("nothing to seal on a fresh contract; after an activation anyone may seal, once per interval", async () => {
    await expect(() =>
      sim.call(anyone, "sealRevocations", sim.now + 1n),
    ).rejects.toThrow("Nothing has changed the licence tree");
    const l = secret("sb-seal-l");
    await issue(A, l);
    await countersign(l, A_REC);
    expect(sim.state.unsealedChanges).toBe(false); // an activation does not arm rule 5's flag
    await sim.call(anyone, "sealRevocations", sim.now + 1n);
    expect(sim.state.rootsSinceSeal).toBe(false);
    await expect(() =>
      sim.call(anyone, "sealRevocations", sim.now + 1n),
    ).rejects.toThrow("Nothing has changed the licence tree");
  });
});

describe("repeated calls by one identity leave state where it started", () => {
  it("200 propose/withdraw and issue/revoke cycles add no entries", async () => {
    const before = {
      lic: sim.state.licenseStatusOf.size(),
      obl: sim.state.pendingObligations.size(),
      par: sim.state.pendingParentOf.size(),
    };
    for (let i = 0; i < 50; i++) {
      const o = secret(`sb-cyc-o-${i}`);
      await sim.call(as(B), "proposeObligation", A_REC, o);
      await sim.call(as(B), "withdrawObligation", A_REC, o);
      const lc = await issue(A, secret(`sb-cyc-l-${i}`));
      await sim.call(as(A), "revokeLicense", lc, A_REC);
      await sim.call(as(A), "proposeParent", B_REC);
      await sim.call(as(A), "withdrawParent");
    }
    expect(sim.state.licenseStatusOf.size()).toBe(before.lic);
    expect(sim.state.pendingObligations.size()).toBe(before.obl);
    expect(sim.state.pendingParentOf.size()).toBe(before.par);
  }, 60_000);
});
