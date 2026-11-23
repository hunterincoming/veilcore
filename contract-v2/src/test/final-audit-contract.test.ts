// Final audit PoC (read-only probes of compositions not obviously covered elsewhere).
import { beforeEach, describe, expect, it } from "vitest";
import { C, VeilcoreSimulator, as, hex, secret } from "./veilcore-simulator.js";
import { acceptPresentation } from "../verify.js";

const A = secret("fa-issuer"),
  A_REC = C.commit(A);
const L1 = secret("fa-lic-1"),
  L2 = secret("fa-lic-2");
const M = secret("fa-griefer"),
  M_REC = C.commit(M);
const anyone = as(secret("fa-anyone"));
let sim: VeilcoreSimulator;

const anchor = async (s: Uint8Array): Promise<void> => {
  if (!sim.state.recoveryOf.member(C.commit(s)))
    await sim.call(
      as(s),
      "anchor",
      C.recoveryCommit(secret(`fa-rcv-${hex(s)}`)),
    );
};
const active = async (
  issuer: Uint8Array,
  l: Uint8Array,
): Promise<Uint8Array> => {
  await anchor(issuer);
  const rec = C.commit(issuer);
  const lc = C.licenseCommit(l, rec);
  await sim.call(as(issuer), "issueLicense", lc);
  await sim.withLicence({ secret: l, record: rec }, () =>
    sim.call(anyone, "countersignLicense", rec, sim.freeSlot()),
  );
  return lc;
};
const untilSealable = (): void => {
  const at = sim.state.lastSealTime + 600n;
  if (sim.now < at) sim.advance(at - sim.now);
};
const seal = (): Promise<void> =>
  sim.call(anyone, "sealRevocations", sim.now + 60n);

beforeEach(async () => {
  sim = await VeilcoreSimulator.create();
});

describe("final audit: rule 5 compositions", () => {
  it("proved while unsealed against current root; seal keeps that root; then presenter's own leaf revoked; lands => verifier refuses", async () => {
    const lc = await active(A, L1);
    await active(M, L2);
    await sim.call(as(M), "revokeLicense", C.licenseCommit(L2, M_REC), M_REC); // waiting revocation
    expect(sim.state.unsealedChanges).toBe(true);
    const ch = secret("fa-ch1");
    const p = await sim.withLicence(
      { secret: L1, record: A_REC, challenge: ch },
      () => sim.prove(anyone, "proveLicense"),
    );
    untilSealable();
    await seal(); // history = [current root], which is the root p proved against
    await sim.call(as(A), "revokeLicense", lc, A_REC); // unsealed true again, leaf gone
    sim.land(p); // on-chain: root still in history, flag read matches (true)
    expect(acceptPresentation(sim.state, A_REC, ch).accepted).toBe(false);
  });

  it("activation-only seal after a revocation never leaves a revoked leaf presentable with unsealed=false", async () => {
    const lc = await active(A, L1);
    const ch = secret("fa-ch2");
    const oldPath = sim.pathFor(L1, A_REC);
    await sim.call(as(A), "revokeLicense", lc, A_REC);
    untilSealable();
    await seal();
    await active(M, L2); // rootsSinceSeal, unsealed stays false
    expect(sim.state.unsealedChanges).toBe(false);
    await expect(() =>
      sim.withLicence(
        { secret: L1, record: A_REC, challenge: ch, path: oldPath },
        () => sim.call(anyone, "proveLicense"),
      ),
    ).rejects.toThrow();
  });
});
