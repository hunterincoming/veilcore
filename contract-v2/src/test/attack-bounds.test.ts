// Adversarial review of the per-identity state bounds (rotationsOf, recoveriesOf,
// pendingObligationsBy, pendingLicensesBy, obligation and parent caps, rootsSinceSeal).
// "BREAKS" tests demonstrate a finding; "HOLDS" tests pin a property that survived.
//
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it } from "vitest";
import { openObligations } from "../verify.js";
import { C, VeilcoreSimulator, as, hex, secret } from "./veilcore-simulator.js";

const A = secret("ab-A"),
  A_REC = C.commit(A);
const B = secret("ab-B"),
  B_REC = C.commit(B);
const T = secret("ab-thief-own"), // a record the thief anchors for himself
  T_REC = C.commit(T);
const anyone = as(secret("ab-anyone"));
const rcv = (s: Uint8Array): Uint8Array => secret(`ab-rcv-${hex(s)}`);

let sim: VeilcoreSimulator;
const anchor = async (s: Uint8Array): Promise<void> => {
  if (!sim.state.recoveryOf.member(C.commit(s)))
    await sim.call(as(s), "anchor", C.recoveryCommit(rcv(s)));
};
const issueAs = async (
  head: Uint8Array,
  l: Uint8Array,
): Promise<Uint8Array> => {
  const lc = C.licenseCommit(l, C.commit(head));
  await sim.call(as(head), "issueLicense", lc);
  return lc;
};
const countersign = (l: Uint8Array, rec: Uint8Array): Promise<void> =>
  sim.withLicence({ secret: l, record: rec }, () =>
    sim.call(anyone, "countersignLicense", rec, sim.freeSlot()),
  );
/** The owner of A takes the identity back with the recovery secret. Returns the new head secret. */
const ownerRecovers = async (): Promise<Uint8Array> => {
  const back = secret("ab-owner-back");
  await sim.call(
    as(secret("ab-whoever"), { incoming: back, recovery: rcv(A) }),
    "recoverRecordSecret",
    A_REC,
    C.commit(back),
    C.recoveryCommit(secret("ab-rcv-next")),
  );
  return back;
};
/** Whether `needle` appears anywhere in a transcript / effects object. */
const appears = (
  hay: unknown,
  needle: Uint8Array,
  seen = new Set<unknown>(),
): boolean => {
  if (hay === null || typeof hay !== "object" || seen.has(hay)) return false;
  seen.add(hay);
  if (hay instanceof Uint8Array) return hex(hay).includes(hex(needle));
  return Object.values(hay as Record<string, unknown>).some((v) =>
    appears(v, needle, seen),
  );
};
const historyLen = (): number => {
  let n = 0;
  const it = sim.state.activeLicenses.history();
  while (!it.next().done) n++;
  return n;
};

beforeEach(async () => {
  sim = await VeilcoreSimulator.create();
  for (const x_ of [A, B, T]) await anchor(x_);
});

// ───────────────────────────────────────────── findings

describe("FIXED: a thief with the head key can no longer use up the owner's caps for good", () => {
  it("F1 pending licences: issue publishes each commitment, so the recovered owner revokes the junk and issues again", async () => {
    const junk = Array.from({ length: 32 }, (_, i) => secret(`ab-junk-l-${i}`));
    const lc0 = C.licenseCommit(junk[0], A_REC);
    const p = await sim.prove(as(A), "issueLicense", lc0);
    expect(appears(p.transcript, lc0)).toBe(true); // now published
    const published: Uint8Array[] = [];
    for (const l of junk) {
      await issueAs(A, l); // thief, holding A's head secret
      published.push(sim.state.lastIssuedLicense); // what the indexer shows per tx
    }
    const back = await ownerRecovers();
    await expect(() =>
      issueAs(back, secret("ab-real-licence")),
    ).rejects.toThrow("Too many licences waiting");
    for (const x_ of published)
      await ((lc) => sim.call(as(back), "revokeLicense", lc, A_REC))(x_);
    expect(sim.state.pendingLicensesBy.lookup(A_REC).read()).toBe(0n);
    await issueAs(back, secret("ab-real-licence"));
  });

  it("F2 pending obligation proposals: each publishes what, against whom and by whom, so the recovered owner withdraws them", async () => {
    const junk = Array.from({ length: 8 }, (_, i) => secret(`ab-junk-o-${i}`));
    const seen: Array<[Uint8Array, Uint8Array]> = [];
    for (const o of junk) {
      await sim.call(as(A), "proposeObligation", T_REC, o);
      expect(sim.state.lastProposedBy).toEqual(A_REC);
      seen.push([
        sim.state.lastProposedAgainst,
        sim.state.lastProposedObligation,
      ]);
    }
    const back = await ownerRecovers();
    await expect(() =>
      sim.call(as(back), "proposeObligation", B_REC, secret("ab-real-claim")),
    ).rejects.toThrow("too many proposals waiting");
    for (const x_ of seen)
      await (([r, o]) => sim.call(as(back), "withdrawObligation", r, o))(x_);
    expect(sim.state.pendingObligationsBy.lookup(A_REC).read()).toBe(0n);
    await sim.call(
      as(back),
      "proposeObligation",
      B_REC,
      secret("ab-real-claim"),
    );
  });

  it("F3 rotations: a thief spends all 16; recovery gives the owner a fresh 16", async () => {
    let cur = A;
    for (let i = 0; i < 16; i++) {
      const next = secret(`ab-thief-rot-${i}`);
      await sim.call(
        as(cur, { incoming: next }),
        "rotateRecordSecret",
        C.commit(next),
      );
      cur = next;
    }
    const back = await ownerRecovers();
    expect(sim.state.rotationsOf.lookup(A_REC).read()).toBe(0n);
    const n = secret("ab-owner-rot");
    await sim.call(
      as(back, { incoming: n }),
      "rotateRecordSecret",
      C.commit(n),
    );
  });

  it("F4 (documented limit, not fixed) parents: a thief fills both parent slots with his own records; the true parent can never be recorded", async () => {
    const J1 = secret("ab-junk-parent-1"),
      J2 = secret("ab-junk-parent-2");
    for (const x_ of [J1, J2]) await anchor(x_);
    for (const J of [J1, J2]) {
      await sim.call(as(A), "proposeParent", C.commit(J));
      await sim.call(as(J), "confirmParent", A_REC);
    }
    const back = await ownerRecovers();
    await expect(() =>
      sim.call(as(back), "proposeParent", B_REC),
    ).rejects.toThrow("already has two parents");
  });
});

describe("Per-identity growth: active licences capped; root history and Sybils are documented limits", () => {
  it("F5 ACTIVE licences are counted per issuer: countersign adds one, revoking an active one removes it, transfer keeps it", async () => {
    const l1 = secret("ab-cnt-1"),
      l2 = secret("ab-cnt-2");
    const lc1 = await issueAs(A, l1);
    await countersign(l1, A_REC);
    await issueAs(A, l2);
    await countersign(l2, A_REC);
    expect(sim.state.activeLicensesBy.lookup(A_REC).read()).toBe(2n);
    const nlc = C.licenseCommit(secret("ab-cnt-new"), A_REC);
    await sim.withLicence({ secret: l2, record: A_REC }, () =>
      sim.call(anyone, "proposeTransfer", A_REC, nlc),
    );
    await sim.call(
      as(A),
      "approveTransfer",
      C.licenseCommit(l2, A_REC),
      A_REC,
      nlc,
    );
    expect(sim.state.activeLicensesBy.lookup(A_REC).read()).toBe(2n);
    await sim.call(as(A), "revokeLicense", lc1, A_REC);
    expect(sim.state.activeLicensesBy.lookup(A_REC).read()).toBe(1n);
  });

  // About 2,000 circuit calls; run with SLOW_TESTS=1.
  it.skipIf(process.env.SLOW_TESTS !== "1")(
    "F5 ACTIVE licences: at most 1024 per issuer; revoking one frees a place",
    async () => {
      const N = 1024;
      const lcs: Uint8Array[] = [];
      for (let i = 0; i < N; i++) {
        const l = secret(`ab-act-${i}`);
        lcs.push(await issueAs(A, l));
        await countersign(l, A_REC);
      }
      expect(sim.state.activeLicensesBy.lookup(A_REC).read()).toBe(BigInt(N));
      const extra = secret("ab-act-extra");
      await issueAs(A, extra);
      await expect(() => countersign(extra, A_REC)).rejects.toThrow(
        "most active licences",
      );
      await sim.call(as(A), "revokeLicense", lcs[0], A_REC);
      await countersign(extra, A_REC);
    },
    600_000,
  );

  it("F6 (documented limit) root history grows with every tree change until someone pays to seal, and a seal can push the next one to 900 s", async () => {
    const h0 = historyLen();
    for (let i = 0; i < 20; i++)
      await countersign(
        secret(`ab-h-${i}`),
        (await issueAs(A, secret(`ab-h-${i}`)), A_REC),
      );
    expect(historyLen()).toBe(h0 + 20); // nothing in the contract seals on its own
    // A seal with the furthest bound allowed (now + 300) sets the next earliest seal 900 s out.
    await sim.call(anyone, "sealRevocations", sim.now + 300n);
    expect(historyLen()).toBe(1);
    await countersign(
      secret("ab-h-x"),
      (await issueAs(A, secret("ab-h-x")), A_REC),
    );
    sim.advance(600n);
    await expect(() =>
      sim.call(anyone, "sealRevocations", sim.now + 1n),
    ).rejects.toThrow("Too soon");
    sim.advance(300n);
    await sim.call(anyone, "sealRevocations", sim.now + 1n);
  }, 60_000);

  it("F7 (documented limit) Sybil: every anchor brings fresh caps, so pending proposals against one victim grow 8 per anchor and the victim must reject each one (the published lastProposed* cells give it what it needs)", async () => {
    const sybils = Array.from({ length: 3 }, (_, i) => secret(`ab-sybil-${i}`));
    for (const x_ of sybils) await anchor(x_);
    for (const [j, s] of sybils.entries())
      for (const o of Array.from({ length: 8 }, (_, i) =>
        secret(`ab-syb-o-${j}-${i}`),
      ))
        await sim.call(as(s), "proposeObligation", B_REC, o);
    expect(sim.state.pendingObligations.size()).toBe(24n);
    // B cannot clear them without the commitments.
    await expect(() =>
      sim.call(
        as(B),
        "rejectObligation",
        secret("ab-guess"),
        C.commit(sybils[0]),
      ),
    ).rejects.toThrow("No such obligation proposed");
  });
});

// ───────────────────────────────────────────── what held

describe("HOLDS: what a thief leaves behind that the owner CAN clean", () => {
  it("self-encumbrances: each one publishes its commitment (lastObligation), so the recovered owner discharges all 16", async () => {
    const os = Array.from({ length: 16 }, (_, i) => secret(`ab-enc-${i}`));
    const published: Uint8Array[] = [];
    for (const o of os) {
      await sim.call(as(A), "encumberOwnRecord", o);
      published.push(sim.state.lastObligation); // what the indexer shows per tx
    }
    const back = await ownerRecovers();
    for (const x_ of published)
      await ((o) => sim.call(as(back), "discharge", A_REC, o))(x_);
    expect(openObligations(sim.state, A_REC)).toBe(0n);
    await sim.call(as(back), "encumberOwnRecord", secret("ab-real-enc"));
  });

  it("thief-activated licences: lastActivatedLicense publishes the commitment, so the owner revokes them", async () => {
    const l = secret("ab-thief-act");
    await issueAs(A, l);
    await countersign(l, A_REC);
    const lc = sim.state.lastActivatedLicense;
    const back = await ownerRecovers();
    await sim.call(as(back), "revokeLicense", lc, A_REC);
    expect(sim.state.licenseStatusOf.size()).toBe(0n);
  });

  it("a thief cannot spend recoveries, so recovery always works after a theft", async () => {
    let cur = A;
    for (let i = 0; i < 16; i++) {
      const next = secret(`ab-r-${i}`);
      await sim.call(
        as(cur, { incoming: next }),
        "rotateRecordSecret",
        C.commit(next),
      );
      cur = next;
    }
    await ownerRecovers();
    expect(sim.state.recoveriesOf.lookup(A_REC).read()).toBe(1n);
  });
});

describe("HOLDS: counters stay in step", () => {
  it("issue under the origin, rotate, revoke-pending and countersign under the successor: count returns to 0", async () => {
    const l1 = secret("ab-c1"),
      l2 = secret("ab-c2");
    const lc1 = await issueAs(A, l1);
    await issueAs(A, l2);
    const A2 = secret("ab-A2");
    await sim.call(as(A, { incoming: A2 }), "rotateRecordSecret", C.commit(A2));
    await sim.call(as(A2), "revokeLicense", lc1, A_REC);
    await countersign(l2, A_REC);
    expect(sim.state.pendingLicensesBy.lookup(A_REC).read()).toBe(0n);
    expect(sim.state.pendingLicensesBy.member(C.commit(A2))).toBe(false);
  });

  it("proposal under a successor, rejected naming the successor and accepted naming the origin: count returns to 0", async () => {
    const B2 = secret("ab-B2");
    await sim.call(as(B, { incoming: B2 }), "rotateRecordSecret", C.commit(B2));
    const o1 = secret("ab-o1"),
      o2 = secret("ab-o2");
    await sim.call(as(B2), "proposeObligation", A_REC, o1);
    await sim.call(as(B2), "proposeObligation", A_REC, o2);
    await sim.call(as(A), "rejectObligation", o1, C.commit(B2));
    await sim.call(as(A), "acceptObligation", o2, B_REC);
    expect(sim.state.pendingObligationsBy.lookup(B_REC).read()).toBe(0n);
  });

  it("countersign and revoke of the same pending licence race: the second is rejected, no double decrement", async () => {
    const l = secret("ab-race");
    const lc = await issueAs(A, l);
    const rev = await sim.prove(as(A), "revokeLicense", lc, A_REC);
    await countersign(l, A_REC);
    expect(() => sim.land(rev)).toThrow();
    expect(sim.state.pendingLicensesBy.lookup(A_REC).read()).toBe(0n);
  });
});

describe("HOLDS: lessThan pins only the comparison result, not the count", () => {
  it("an accept proved at 14 in force lands after a concurrent discharge (still commutes)", async () => {
    const os = Array.from({ length: 14 }, (_, i) => secret(`ab-cc-${i}`));
    for (const x_ of os)
      await ((o) => sim.call(as(A), "encumberOwnRecord", o))(x_);
    const o = secret("ab-cc-B");
    await sim.call(as(B), "proposeObligation", A_REC, o);
    const acc = await sim.prove(as(A), "acceptObligation", o, B_REC);
    await sim.call(as(A), "discharge", A_REC, os[0]);
    sim.land(acc);
    expect(openObligations(sim.state, A_REC)).toBe(14n);
  });

  it("only a crossing of the threshold conflicts: two proposals proved at 7 waiting, the second fails to land", async () => {
    for (const x_ of Array.from({ length: 7 }, (_, i) => secret(`ab-th-${i}`)))
      await ((o) => sim.call(as(B), "proposeObligation", A_REC, o))(x_);
    const p1 = await sim.prove(
      as(B),
      "proposeObligation",
      A_REC,
      secret("ab-th-x"),
    );
    const p2 = await sim.prove(
      as(B),
      "proposeObligation",
      A_REC,
      secret("ab-th-y"),
    );
    sim.land(p1);
    expect(() => sim.land(p2)).toThrow();
    expect(sim.state.pendingObligationsBy.lookup(B_REC).read()).toBe(8n);
  });
});
