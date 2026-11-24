// Rule 5, issuer-scoped (verify.ts, acceptPresentationScoped): the 8 October 2026 review's
// P2. A griefer keeping a revocation of their own waiting, with cheap root changes, made
// the strict rule refuse every honest presentation indefinitely (attack-licences.test.ts,
// ATTACK 1). The issuer-scoped rule accepts those, and still refuses once the issuer
// itself revokes or transfers. SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it } from "vitest";
import { C, VeilcoreSimulator, as, secret } from "./veilcore-simulator.js";
import {
  acceptPresentation,
  acceptPresentationAt,
  acceptPresentationScoped,
} from "../verify.js";
import type { Ledger } from "../managed/veilcore/contract/index.js";

const A = secret("breeder-A"),
  A_REC = C.commit(A);
const L = secret("licensee"),
  L2 = secret("licensee-2");
const M = secret("griefer"),
  M_REC = C.commit(M);
const anyone = as(secret("anyone"));

let sim: VeilcoreSimulator;
/** The state after every call, in order: what the indexer's history gives. */
let history: Ledger[];
const call: VeilcoreSimulator["call"] = async (who, circuit, ...a) => {
  await sim.call(who, circuit, ...a);
  history.push(sim.state);
};
const anchor = (s: Uint8Array) =>
  call(as(s), "anchor", C.recoveryCommit(secret(`rec-${String(s[0])}`)));
const issue = async (
  issuer: Uint8Array,
  l: Uint8Array,
): Promise<Uint8Array> => {
  const lc = C.licenseCommit(l, C.commit(issuer));
  await call(as(issuer), "issueLicense", lc);
  return lc;
};
const countersign = (l: Uint8Array, rec: Uint8Array) =>
  sim.withLicence({ secret: l, record: rec }, () =>
    call(anyone, "countersignLicense", rec, sim.freeSlot()),
  );
const prove = (l: Uint8Array, rec: Uint8Array, challenge: Uint8Array) =>
  sim.withLicence({ secret: l, record: rec, challenge }, () =>
    sim.prove(anyone, "proveLicense"),
  );
const land = (p: Awaited<ReturnType<typeof prove>>) => {
  sim.land(p);
  history.push(sim.state);
};
const scoped = (issuer: Uint8Array, ch: Uint8Array) =>
  acceptPresentationScoped(history, issuer, ch);

let lcA: Uint8Array;
beforeEach(async () => {
  sim = await VeilcoreSimulator.create();
  history = [sim.state];
  await anchor(A);
  await anchor(M);
  lcA = await issue(A, L);
  await countersign(L, A_REC);
  // The griefer keeps one revocation of their own waiting.
  const t0 = secret("t0");
  const lt0 = await issue(M, t0);
  await countersign(t0, M_REC);
  await call(as(M), "revokeLicense", lt0, M_REC);
});

/** One round: prove, the griefer moves the root, then `between` runs, then it lands. */
const round = async (r: number, between: () => unknown = () => undefined) => {
  const ch = secret(`ch${r}`);
  const p = await prove(L, A_REC, ch);
  const s = secret(`spam${r}`);
  await issue(M, s);
  await countersign(s, M_REC);
  await between();
  land(p);
  return ch;
};

describe("the griefer alone", () => {
  it("strict rule 5 refuses every honest presentation; the issuer-scoped rule accepts every one", async () => {
    let strict = 0,
      byIssuer = 0;
    for (let r = 0; r < 5; r++) {
      const ch = await round(r);
      if (acceptPresentation(sim.state, A_REC, ch).accepted) strict++;
      const v = scoped(A_REC, ch);
      if (v.accepted) byIssuer++;
      expect(v.reason).toMatch(
        /older root; the issuer has revoked or transferred none/,
      );
    }
    expect({ strict, byIssuer }).toEqual({ strict: 0, byIssuer: 5 });
  });

  it("the griefer revoking a licence that was in the tree at the root is ignored too", async () => {
    const p0 = secret("pool-0");
    const lp0 = await issue(M, p0);
    await countersign(p0, M_REC);
    const ch = await round(0, () => call(as(M), "revokeLicense", lp0, M_REC));
    expect(acceptPresentation(sim.state, A_REC, ch).accepted).toBe(false);
    expect(scoped(A_REC, ch).accepted).toBe(true);
  });

  it("through acceptPresentationAt: the history makes it issuer-scoped; rule 'strict' keeps the old rule", async () => {
    const ch = await round(0);
    const when = { landedAt: Date.now(), now: Date.now() };
    expect(acceptPresentationAt(sim.state, A_REC, ch, when).accepted).toBe(
      false,
    );
    const v = acceptPresentationAt(sim.state, A_REC, ch, { ...when, history });
    expect(v.accepted).toBe(true);
    expect(v.reason).toMatch(
      /^the licence was live when presented .*proved against an older root/,
    );
    expect(
      acceptPresentationAt(sim.state, A_REC, ch, {
        ...when,
        history,
        rule: "strict",
      }).accepted,
    ).toBe(false);
  });
});

describe("the issuer acts", () => {
  it("REFUSED: the issuer really revokes the licence after it was proved", async () => {
    let byIssuer = 0;
    const reasons: string[] = [];
    for (let r = 0; r < 5; r++) {
      let ch: Uint8Array;
      try {
        ch = await round(r, async () => {
          if (r === 2) await call(as(A), "revokeLicense", lcA, A_REC);
        });
      } catch {
        reasons.push(`r${r}: cannot prove, the licence is gone`);
        continue;
      }
      const v = scoped(A_REC, ch);
      if (v.accepted) byIssuer++;
      else reasons.push(v.reason);
    }
    expect(byIssuer).toBe(2);
    expect(reasons[0]).toMatch(/this issuer has revoked a licence since/);
  });

  it("REFUSED: the issuer revokes ANOTHER of its licences (the verifier cannot tell which was presented)", async () => {
    const other = secret("other-licensee");
    const lcOther = await issue(A, other);
    await countersign(other, A_REC);
    const ch = await round(0, () =>
      call(as(A), "revokeLicense", lcOther, A_REC),
    );
    expect(scoped(A_REC, ch).reason).toMatch(
      /this issuer has revoked a licence since/,
    );
  });

  it("REFUSED: the issuer approves a transfer of the licence after it was proved", async () => {
    const nlc = C.licenseCommit(L2, A_REC);
    const ch = await round(0, async () => {
      await sim.withLicence({ secret: L, record: A_REC }, () =>
        call(anyone, "proposeTransfer", A_REC, nlc),
      );
      await call(as(A), "approveTransfer", lcA, A_REC, nlc);
    });
    const v = scoped(A_REC, ch);
    expect(v.accepted).toBe(false);
    expect(v.reason).toMatch(/this issuer has approved a transfer since/);
  });

  it("another issuer's transfer is ignored", async () => {
    const g = secret("griefer-licensee");
    const lg = await issue(M, g);
    await countersign(g, M_REC);
    const ng = C.licenseCommit(secret("g2"), M_REC);
    const ch = await round(0, async () => {
      await sim.withLicence({ secret: g, record: M_REC }, () =>
        call(anyone, "proposeTransfer", M_REC, ng),
      );
      await call(as(M), "approveTransfer", lg, M_REC, ng);
    });
    expect(scoped(A_REC, ch).accepted).toBe(true);
  });
});

describe("what the history must be", () => {
  it("REFUSED: a history that does not reach back to the root proved against", async () => {
    const ch = await round(0);
    const short = history.slice(-2);
    expect(acceptPresentationScoped(short, A_REC, ch).reason).toMatch(
      /does not reach/,
    );
  });

  it("REFUSED: a history that is not one state per call, where a leaf at the root was touched", async () => {
    const p0 = secret("pool-0");
    const lp0 = await issue(M, p0);
    await countersign(p0, M_REC);
    const ch = await round(0, () => call(as(M), "revokeLicense", lp0, M_REC));
    expect(scoped(A_REC, ch).accepted).toBe(true);
    // Drop the state between the spam activation and the revocation: one step now holds
    // two tree changes, and who removed the leaf cannot be told.
    const merged = [...history.slice(0, -3), ...history.slice(-2)];
    expect(acceptPresentationScoped(merged, A_REC, ch).reason).toMatch(
      /not one state per call/,
    );
  });

  it("REFUSED by acceptPresentationAt: a history that does not end with this presentation", async () => {
    const ch = await round(0);
    const v = acceptPresentationAt(sim.state, A_REC, ch, {
      landedAt: Date.now(),
      history: history.slice(0, -1),
    });
    expect(v.reason).toMatch(/does not end with this presentation/);
  });

  it("everything strict rule 5 refuses for another reason stays refused", async () => {
    const ch = await round(0);
    expect(scoped(A_REC, secret("not-this-challenge")).accepted).toBe(false);
    expect(scoped(M_REC, ch).accepted).toBe(false);
  });
});

// Verification review, 8 October 2026 (pocs/verify1/poc-scoped.test.ts): one history step
// covering a revoke and a new licence at the same slot looked like a replacement, and the
// replacement branch only asked whether it was the issuer's transfer.
describe("merged steps and gaps", () => {
  const slotOf = (lc: Uint8Array, rec: Uint8Array): bigint =>
    sim.state.licenseSlotOf.lookup(C.licenseKey(lc, rec));

  for (const reissuer of ["the same issuer", "another issuer"] as const) {
    it(`REFUSED: a revoke and ${reissuer}'s licence at the same slot, in one step`, async () => {
      const ch = secret("merge-ch");
      const p = await prove(L, A_REC, ch);
      const s = slotOf(lcA, A_REC);
      const who = reissuer === "the same issuer" ? A : M;
      const rec = C.commit(who);
      const x = secret("merge-x");
      await call(as(who), "issueLicense", C.licenseCommit(x, rec));
      await sim.call(as(A), "revokeLicense", lcA, A_REC); // no state of its own in the history
      await sim.withLicence({ secret: x, record: rec }, () =>
        call(anyone, "countersignLicense", rec, s),
      );
      land(p);
      expect(sim.state.licenseStatusOf.member(C.licenseKey(lcA, A_REC))).toBe(
        false,
      );
      const v = scoped(A_REC, ch);
      expect(v.accepted).toBe(false);
      expect(
        acceptPresentationAt(sim.state, A_REC, ch, {
          landedAt: Date.now(),
          now: Date.now(),
          history,
        }).accepted,
      ).toBe(false);
    });
  }

  it("REFUSED: two counted calls in one step (an obvious gap)", async () => {
    const ch = await round(0);
    expect(scoped(A_REC, ch).accepted).toBe(true);
    // Merge the spam licence's issue/countersign step with a counted call: a pairing.
    const ch2 = secret("gap-ch");
    const p = await prove(L, A_REC, ch2);
    const sp = secret("gap-spam");
    await issue(M, sp);
    await countersign(sp, M_REC);
    await sim.call(as(M), "pairDna", secret("gap-dna")); // not in the history
    await call(as(M), "anchorBatch", secret("gap-root"));
    land(p);
    expect(scoped(A_REC, ch2).reason).toMatch(/not one state per call/);
  });

  it("REFUSED: the issuer's active count falls, whatever else the step shows", async () => {
    const ch = secret("fall-ch");
    const p = await prove(L, A_REC, ch);
    // A licence activated AFTER the root the presentation uses, then revoked by the issuer:
    // no leaf of that root is touched, but the issuer's count falls. Refused all the same.
    const other = secret("fall-licensee");
    const lo = await issue(A, other);
    await countersign(other, A_REC);
    await call(as(A), "revokeLicense", lo, A_REC);
    land(p);
    expect(scoped(A_REC, ch).reason).toMatch(/this issuer has revoked/);
  });
});
