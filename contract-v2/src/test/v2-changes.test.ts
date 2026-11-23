// Every change contract v2 makes to v1 (docs/contract-v2.md 1.3, 1.4), tested, and attacked:
//
//   1. the version fields (contractVersion, predecessor), as literals, never written again;
//   2. the all-zero secret refused at every witness read, one test per circuit;
//   3. a laboratory signature's response taken as hi * 2^248 + lo and refused unless it is
//      below the Jubjub order r, at both edges of the boundary;
//   4. replayed, swapped and double-used calls.
//
// scripts/mutation-v2.mjs removes or weakens each new assert in turn and checks this file
// fails for every one (docs/runbooks/deploy-v2.md, "Mutation pass").
// SPDX-License-Identifier: Apache-2.0

import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { ecMulGenerator } from "@midnight-ntwrk/compact-runtime";
import {
  C,
  VeilcoreSimulator,
  ZERO,
  as,
  freshRecovery,
  hex,
  secret,
} from "./veilcore-simulator.js";
import { CC, ClaimsSimulator } from "./claims-simulator.js";
import {
  ABSENT,
  SLOTS,
  commitmentOf,
  digestValue,
  numberValue,
  schemaIdOf,
  sealFields,
} from "../fields.js";
import {
  JUBJUB_ORDER as R,
  type AttestationSignature,
  type AttestationSignatureWitness,
  type JubjubPoint,
  newAttesterKey,
  signRecord,
  signatureWitness,
  verifyRecordSignature,
} from "../attest.js";
import { ClaimKind } from "../managed/veilcore-claims/contract/index.js";

const V1_MAIN =
  "a04de0a2684f3713276325649540c7278ffd07cba8b014e7489844f319a02347";
const V1_CLAIMS =
  "ef763eb4ad1846b716dbfa90c00560a9a943ffb4d1fc638b0707df5adefd070d";
const ZERO_REFUSED = "A secret cannot be all zeros";
const OUT_OF_RANGE = "The laboratory signature's response is out of range";
const TWO_248 = 1n << 248n;
/** r - 14 * 2^248: the low part of the order, the edge of the range check. */
const R_LO = R - 14n * TWO_248;

const here = (p: string): string => new URL(p, import.meta.url).pathname;

// ───────────────────────────────────────────────────────────── 1. version fields

describe("version fields", () => {
  it("the main contract says version 2, follows v1 on mainnet, and keeps hash protocol 1", async () => {
    const s = (await VeilcoreSimulator.create()).state;
    expect(s.contractVersion).toBe(2n);
    expect(hex(s.predecessor)).toBe(V1_MAIN);
    expect(s.protocolVersion).toBe(1n);
  });

  it("the claims contract says version 2, follows v1 claims on mainnet, and keeps hash protocol 1", async () => {
    const s = (await ClaimsSimulator.create()).state;
    expect(s.contractVersion).toBe(2n);
    expect(hex(s.predecessor)).toBe(V1_CLAIMS);
    expect(s.protocolVersion).toBe(1n);
  });

  it("the predecessor addresses are the ones in deployments/mainnet.json", () => {
    const d = JSON.parse(
      readFileSync(here("../../../deployments/mainnet.json"), "utf8"),
    ) as { contracts: { name: string; address: string }[] };
    const addr = (n: string) => d.contracts.find((c) => c.name === n)?.address;
    expect(addr("veilcore")).toBe(V1_MAIN);
    expect(addr("veilcore-claims")).toBe(V1_CLAIMS);
  });

  it("the constructor takes no arguments, so there is one genuine starting state", () => {
    for (const name of ["veilcore", "veilcore-claims"]) {
      const info = JSON.parse(
        readFileSync(
          here(`../managed/${name}/compiler/contract-info.json`),
          "utf8",
        ),
      ) as {
        ["constructor-arguments"]?: unknown[];
        constructorArguments?: unknown[];
      };
      const args =
        info["constructor-arguments"] ?? info.constructorArguments ?? [];
      expect(args).toEqual([]);
    }
  });
});

describe("sealed fields: no circuit writes one", () => {
  // The compiler refuses a write to a sealed field from an exported circuit, but missed
  // writes inside tuple and vector literals and map/fold until 0.36.106 (#932, not in
  // 0.36.1). So the compiled contract is read. Every ledger access is a list of VM ops
  // (queryLedgerState in index.js; the ZKIR's impact ops are the same list, encoded). The
  // sealed fields are entries 0, 1 and 2 of ledger chunk 0 in both contracts
  // (protocolVersion, contractVersion, predecessor). A write reaches one only as
  //   idx (pushPath) [0, k] ...            k <= 2, then written back, or
  //   idx (pushPath) [0]; push key k; ...; ins     k <= 2.
  // Only the constructor (initialState) may do either; it is left out.
  type Hit = { at: number; how: string };
  type Path = bigint[];
  const startsWith = (a: Path, b: Path) => b.every((x, i) => a[i] === x);
  const sealedWrites = (
    js: string,
    sealed: Path[],
  ): { hits: Hit[]; writes: number } => {
    const hits: Hit[] = [];
    let writes = 0;
    /** Whether a write at `at` (with `key` under it, undefined when not a literal) can reach a sealed field. */
    const reaches = (at: Path, key: bigint | null | undefined): boolean =>
      sealed.some(
        (p) =>
          startsWith(at, p) ||
          (key !== null &&
            at.length === p.length - 1 &&
            startsWith(p, at) &&
            (key === undefined || key === p[p.length - 1])),
      );
    const calls =
      /queryLedgerState\(context,\s*partialProofData,\s*\[([\s\S]*?)\]\);/g;
    for (let m = calls.exec(js); m; m = calls.exec(js)) {
      const ops = m[1];
      const tok =
        /\{\s*(idx|push|ins):\s*\{([\s\S]*?)(?=\{\s*(?:idx|push|ins|addi|subi|dup|swap|popeq|member|size|rem|remc|concat|concatc|cog|lt|eq|type|new|noop|pop|log|root|branch|jmp|and|or|neg):|$)/g;
      let stack: Path = [];
      let key: bigint | undefined;
      for (let t = tok.exec(ops); t; t = tok.exec(ops)) {
        const [, op, body] = t;
        if (op === "idx") {
          if (!/pushPath:\s*true/.test(body)) continue;
          const path = [...body.matchAll(/toValue\((\d+)n\)/g)].map((x) =>
            BigInt(x[1]),
          );
          stack = [...stack, ...path];
          writes++;
          if (reaches(stack, null))
            hits.push({ at: m.index, how: `idx [${stack.join(", ")}]` });
        } else if (op === "push") {
          if (/storage:\s*false/.test(body)) {
            const k =
              /value:\s*__compactRuntime\.StateValue\.newCell\(\{\s*value:\s*_descriptor_\d+\.toValue\((\d+)n\)/.exec(
                body,
              );
            key = k ? BigInt(k[1]) : undefined;
          }
        } else {
          const cached = /cached:\s*true/.test(body);
          const n = Number(/n:\s*(\d+)/.exec(body)?.[1] ?? "0");
          if (!cached) {
            writes++;
            if (reaches(stack, key))
              hits.push({
                at: m.index,
                how: `ins at [${stack.join(", ")}] key ${String(key)}`,
              });
          } else stack = stack.slice(0, Math.max(0, stack.length - n));
        }
      }
    }
    return { hits, writes };
  };
  /** The compiled contract without its constructor: everything after initialState's body. */
  const circuitsOnly = (js: string): string => {
    const start = js.indexOf("async initialState(");
    const end = js.indexOf("\n  _", start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    return js.slice(0, start) + js.slice(end);
  };

  // Where the three sealed fields live: the main contract's ledger is in chunks (chunk 0,
  // entries 0 to 2); the claims contract's is one flat list (entries 0 to 2).
  for (const [name, sealed] of [
    [
      "veilcore",
      [
        [0n, 0n],
        [0n, 1n],
        [0n, 2n],
      ],
    ],
    ["veilcore-claims", [[0n], [1n], [2n]]],
  ] as [string, Path[]][]) {
    it(`${name}: no circuit's ledger ops reach a sealed field`, () => {
      const js = readFileSync(
        here(`../managed/${name}/contract/index.js`),
        "utf8",
      );
      // The sealed fields are where the reader expects them: each getter reads its path.
      for (const [field, p] of [
        ["protocolVersion", sealed[0]],
        ["contractVersion", sealed[1]],
        ["predecessor", sealed[2]],
      ] as const) {
        const body =
          new RegExp(`get ${field}\\(\\)[\\s\\S]*?popeq`).exec(js)?.[0] ?? "";
        const got = [...body.matchAll(/toValue\((\d+)n\)/g)].map((x) =>
          BigInt(x[1]),
        );
        expect(got, field).toEqual(p);
      }
      // The reader works: it sees the constructor write all three.
      expect(sealedWrites(js, sealed).hits.length).toBeGreaterThanOrEqual(3);
      const circuits = sealedWrites(circuitsOnly(js), sealed);
      expect(circuits.writes).toBeGreaterThan(5);
      expect(circuits.hits).toEqual([]);
    });
  }

  it("after a run of calls, the sealed fields still hold the constructor's values", async () => {
    const sim = await VeilcoreSimulator.create();
    const X = secret("v2-sealed-X");
    await sim.call(as(X), "anchor", freshRecovery());
    await sim.call(as(X), "anchorBatch", secret("root"));
    await sim.call(as(X), "pairDna", secret("dna"));
    const N = secret("v2-sealed-N");
    await sim.call(as(X, { incoming: N }), "rotateRecordSecret", C.commit(N));
    expect(sim.state.contractVersion).toBe(2n);
    expect(hex(sim.state.predecessor)).toBe(V1_MAIN);
    expect(sim.state.protocolVersion).toBe(1n);
  });
});

// ───────────────────────────────────────────────────────────── 2. the zero secret

describe("the all-zero secret is refused at every witness read", () => {
  const A = secret("v2-A"),
    B = secret("v2-B");
  const A_REC = C.commit(A);
  const RA = secret("v2-recovery-A");
  const L = secret("v2-licensee");
  const TERMS = secret("v2-terms");
  let sim: VeilcoreSimulator;

  beforeEach(async () => {
    sim = await VeilcoreSimulator.create();
    await sim.call(as(A), "anchor", C.recoveryCommit(RA));
    await sim.call(as(B), "anchor", C.recoveryCommit(secret("v2-recovery-B")));
  });

  // localGeneticSecret, read by liveSelf: every circuit that acts as a record.
  const asZero: [string, () => unknown[]][] = [
    ["anchor", () => [freshRecovery()]],
    ["proveOwnership", () => [secret("challenge")]],
    ["pairDna", () => [secret("dna")]],
    ["rotateRecordSecret", () => [C.commit(secret("next"))]],
    ["issueLicense", () => [C.licenseCommit(L, A_REC)]],
    [
      "approveTransfer",
      () => [
        C.licenseCommit(L, A_REC),
        A_REC,
        C.licenseCommit(secret("l2"), A_REC),
      ],
    ],
    ["revokeLicense", () => [C.licenseCommit(L, A_REC), A_REC]],
    ["proposeParent", () => [A_REC]],
    ["confirmParent", () => [A_REC]],
    ["withdrawParent", () => []],
    ["proposeObligation", () => [A_REC, TERMS]],
    ["encumberOwnRecord", () => [TERMS]],
    ["withdrawObligation", () => [A_REC, TERMS]],
    ["acceptObligation", () => [TERMS, A_REC]],
    ["rejectObligation", () => [TERMS, A_REC]],
    ["discharge", () => [A_REC, TERMS]],
  ];
  for (const [circuit, args] of asZero) {
    it(`${circuit}: the record secret 0 is refused`, async () => {
      await expect(() =>
        sim.call(as(ZERO), circuit as "anchor", ...(args() as [Uint8Array])),
      ).rejects.toThrow(ZERO_REFUSED);
    });
  }

  it("anchor: commit(0) can never become a record (the v1 finding)", async () => {
    await expect(() =>
      sim.call(as(ZERO), "anchor", freshRecovery()),
    ).rejects.toThrow(ZERO_REFUSED);
    expect(sim.state.recoveryOf.member(C.commit(ZERO))).toBe(false);
  });

  it("a secret with one non-zero byte, at either end, is accepted", async () => {
    for (const at of [0, 31]) {
      const s = new Uint8Array(32);
      s[at] = 1;
      await sim.call(as(s), "anchor", freshRecovery());
      expect(sim.state.recoveryOf.member(C.commit(s))).toBe(true);
    }
  });

  it("rotateRecordSecret: the incoming secret 0 is refused (v1 rotated into commit(0))", async () => {
    await expect(() =>
      sim.call(as(A, { incoming: ZERO }), "rotateRecordSecret", C.commit(ZERO)),
    ).rejects.toThrow(ZERO_REFUSED);
    expect(sim.state.headOf.member(A_REC)).toBe(false);
  });

  it("recoverRecordSecret: the incoming secret 0 is refused", async () => {
    await expect(() =>
      sim.call(
        as(secret("anyone"), { recovery: RA, incoming: ZERO }),
        "recoverRecordSecret",
        A_REC,
        C.commit(ZERO),
        freshRecovery(),
      ),
    ).rejects.toThrow(ZERO_REFUSED);
    expect(sim.state.headOf.member(A_REC)).toBe(false);
  });

  it("recoverRecordSecret: the recovery secret 0 is refused as such", async () => {
    await expect(() =>
      sim.call(
        as(secret("anyone"), { recovery: ZERO, incoming: secret("n") }),
        "recoverRecordSecret",
        A_REC,
        C.commit(secret("n")),
        freshRecovery(),
      ),
    ).rejects.toThrow(ZERO_REFUSED);
  });

  it("replaceRecoveryCommitment: the recovery secret 0 is refused as such", async () => {
    await expect(() =>
      sim.call(
        as(secret("anyone"), { recovery: ZERO }),
        "replaceRecoveryCommitment",
        A_REC,
        freshRecovery(),
      ),
    ).rejects.toThrow(ZERO_REFUSED);
  });

  it("countersignLicense: a licence made for the secret 0 cannot be activated (v1 activated it)", async () => {
    await sim.call(as(A), "issueLicense", C.licenseCommit(ZERO, A_REC));
    await expect(() =>
      sim.withLicence({ secret: ZERO, record: A_REC }, () =>
        sim.call(as(secret("anyone")), "countersignLicense", A_REC, 7n),
      ),
    ).rejects.toThrow(ZERO_REFUSED);
    expect(sim.state.licenseAtSlot.member(7n)).toBe(false);
  });

  for (const [circuit, call] of [
    [
      "proposeTransfer",
      (s: VeilcoreSimulator) =>
        s.call(
          as(secret("anyone")),
          "proposeTransfer",
          A_REC,
          C.licenseCommit(L, A_REC),
        ),
    ],
    [
      "withdrawTransfer",
      (s: VeilcoreSimulator) =>
        s.call(as(secret("anyone")), "withdrawTransfer", A_REC),
    ],
    [
      "proveLicense",
      (s: VeilcoreSimulator) => s.call(as(secret("anyone")), "proveLicense"),
    ],
  ] as const) {
    it(`${circuit}: the licence secret 0 is refused as such`, async () => {
      await expect(() =>
        sim.withLicence(
          { secret: ZERO, record: A_REC, challenge: secret("ch") },
          () => call(sim),
        ),
      ).rejects.toThrow(ZERO_REFUSED);
    });
  }
});

// ───────────────────────────────────────────────────────────── 3. the response range

describe("the laboratory signature's response must be below the Jubjub order", () => {
  const sha = (s: string): Uint8Array =>
    new Uint8Array(createHash("sha256").update(s).digest());
  const TERMS = {
    documentDigest: sha("v2 range schema"),
    comparable: Array.from({ length: SLOTS }, (_, i) => i < 2),
    k: 1n,
    numeric: Array.from({ length: SLOTS }, (_, i) => i === 12),
  };
  const SCHEMA = schemaIdOf(TERMS);
  const values: Uint8Array[] = Array.from({ length: SLOTS }, () => ABSENT);
  values[0] = digestValue("180/184");
  values[12] = numberValue(9650n);
  const fs = sealFields(values, sha("secret v2"), sha("json v2"));
  const REC = commitmentOf(SCHEMA, fs);
  const lab = newAttesterKey();

  const attest = async (
    sig: AttestationSignatureWitness,
    key: JubjubPoint = lab.key,
  ): Promise<void> => {
    const sim = await ClaimsSimulator.create({ terms: TERMS });
    await sim.call({ attester: key, rawSignature: sig }, "proveAttested", REC);
    expect(sim.state.lastClaimKind).toBe(ClaimKind.ATTESTED);
  };
  /** An honest signature whose response satisfies `want` (signing is random). */
  const signedWith = (want: (s: bigint) => boolean): AttestationSignature => {
    for (let i = 0; i < 5000; i++) {
      const sig = signRecord(lab.secret, REC);
      if (want(sig.response)) return sig;
    }
    throw new Error("test error: no such signature in 5000 tries");
  };
  const raw = (hi: bigint, lo: bigint): AttestationSignatureWitness => ({
    announcement: ecMulGenerator(5n),
    responseHi: hi,
    responseLo: lo,
  });

  it("the split is exact: hi * 2^248 + lo is the response, and hi is 0 to 14 below r", () => {
    for (const s of [0n, 1n, TWO_248 - 1n, TWO_248, 14n * TWO_248, R - 1n]) {
      const w = signatureWitness({
        announcement: ecMulGenerator(1n),
        response: s,
      });
      expect(w.responseHi * TWO_248 + w.responseLo).toBe(s);
      expect(w.responseHi <= 14n).toBe(true);
      expect(w.responseLo < TWO_248).toBe(true);
    }
    for (let i = 0; i < 200; i++) {
      const s = BigInt("0x" + randomBytes(32).toString("hex")) % R;
      const w = signatureWitness({
        announcement: ecMulGenerator(1n),
        response: s,
      });
      expect(w.responseHi * TWO_248 + w.responseLo).toBe(s);
    }
  });

  it("an honest signature with a high part below 14 verifies", async () => {
    const sig = signedWith((s) => s >> 248n < 14n);
    expect(verifyRecordSignature(lab.key, REC, sig)).toBe(true);
    await attest(signatureWitness(sig));
  });

  it("an honest signature with a high part of exactly 14 verifies (the top band, below r)", async () => {
    const sig = signedWith((s) => s >> 248n === 14n);
    expect(sig.response < R).toBe(true);
    await attest(signatureWitness(sig));
  });

  it("edge below: r - 1 passes the range check (it is then refused only by the signature equation)", async () => {
    expect(R_LO - 1n).toBe(R - 1n - 14n * TWO_248);
    await expect(() => attest(raw(14n, R_LO - 1n))).rejects.toThrow(
      /signature does not verify/,
    );
  });

  it("the largest high part below 14, with the largest low part, passes the range check", async () => {
    await expect(() => attest(raw(13n, TWO_248 - 1n))).rejects.toThrow(
      /signature does not verify/,
    );
  });

  it("edge above: r itself is refused by the range check", async () => {
    await expect(() => attest(raw(14n, R_LO))).rejects.toThrow(OUT_OF_RANGE);
  });

  it("r + 1, and every low part above the edge with a high part of 14, are refused", async () => {
    await expect(() => attest(raw(14n, R_LO + 1n))).rejects.toThrow(
      OUT_OF_RANGE,
    );
    await expect(() => attest(raw(14n, TWO_248 - 1n))).rejects.toThrow(
      OUT_OF_RANGE,
    );
  });

  it("a high part of 15 is refused by the range check, whatever the low part", async () => {
    await expect(() => attest(raw(15n, 0n))).rejects.toThrow(OUT_OF_RANGE);
    await expect(() => attest(raw(15n, TWO_248 - 1n))).rejects.toThrow(
      OUT_OF_RANGE,
    );
  });

  it("A4 closed: s + r for an honest s is refused by the contract (v1 accepted it in-circuit)", async () => {
    // Pick s small enough that s + r < 2^252, so the parts fit their types and only the
    // range check stands between s + r and a valid proof.
    const sig = signedWith((s) => s + R < 1n << 252n);
    expect(verifyRecordSignature(lab.key, REC, sig)).toBe(true);
    const mauled = signatureWitness({ ...sig, response: sig.response + R });
    expect(mauled.responseHi === 14n || mauled.responseHi === 15n).toBe(true);
    await expect(() => attest(mauled)).rejects.toThrow(OUT_OF_RANGE);
    await attest(signatureWitness(sig)); // the honest one still verifies
  });

  it("parts wider than their types never reach the circuit (Uint<4> and Uint<248>, bit-constrained in the ZKIR)", async () => {
    await expect(() => attest(raw(16n, 0n))).rejects.toThrow(
      /expected value of type struct SchnorrSignature/,
    );
    await expect(() => attest(raw(0n, TWO_248))).rejects.toThrow(
      /expected value of type struct SchnorrSignature/,
    );
    await expect(() => attest(raw(-1n, 0n))).rejects.toThrow(
      /expected value of type struct SchnorrSignature/,
    );
  });

  it("the off-chain check agrees: it refuses r and above, and accepts the honest signature", () => {
    const sig = signedWith(() => true);
    expect(verifyRecordSignature(lab.key, REC, sig)).toBe(true);
    expect(
      verifyRecordSignature(lab.key, REC, {
        ...sig,
        response: sig.response + R,
      }),
    ).toBe(false);
    expect(verifyRecordSignature(lab.key, REC, { ...sig, response: R })).toBe(
      false,
    );
  });

  it("the challenge is v1's: the same announcement, key and record give the same challenge", () => {
    // attestationChallenge is a pure circuit; the vectors file pins it across versions
    // (v1-pure-circuits.test.ts). Here: a signature made from it verifies end to end.
    const k = 12345n;
    const Rp = ecMulGenerator(k);
    const c =
      CC.attestationChallenge(Rp.x, Rp.y, lab.key.x, lab.key.y, REC) % TWO_248;
    const sig = { announcement: Rp, response: (k + c * lab.secret) % R };
    expect(verifyRecordSignature(lab.key, REC, sig)).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────── 4. replay, swap, double use

describe("replayed, swapped and double-used calls", () => {
  const A = secret("v2-rp-A"),
    B = secret("v2-rp-B");
  const A_REC = C.commit(A),
    B_REC = C.commit(B);
  const RA = secret("v2-rp-rec-A");
  const RB = secret("v2-rp-rec-B");
  let sim: VeilcoreSimulator;

  beforeEach(async () => {
    sim = await VeilcoreSimulator.create();
    await sim.call(as(A), "anchor", C.recoveryCommit(RA));
    await sim.call(as(B), "anchor", C.recoveryCommit(RB));
  });

  it("an anchor proved once lands once", async () => {
    const X = secret("v2-rp-X");
    const p = await sim.prove(as(X), "anchor", freshRecovery());
    sim.land(p);
    expect(() => sim.land(p)).toThrow();
    expect(sim.state.anchorSeq).toBe(3n);
  });

  it("a rotation proved once lands once", async () => {
    const N = secret("v2-rp-N");
    const p = await sim.prove(
      as(A, { incoming: N }),
      "rotateRecordSecret",
      C.commit(N),
    );
    sim.land(p);
    expect(() => sim.land(p)).toThrow();
    expect(sim.state.rotationsOf.lookup(A_REC).read()).toBe(1n);
  });

  it("a recovery proved once lands once: the recovery secret is used up", async () => {
    const N = secret("v2-rp-N2");
    const p = await sim.prove(
      as(secret("whoever"), { recovery: RA, incoming: N }),
      "recoverRecordSecret",
      A_REC,
      C.commit(N),
      freshRecovery(),
    );
    sim.land(p);
    expect(() => sim.land(p)).toThrow();
    expect(sim.state.recoveriesOf.lookup(A_REC).read()).toBe(1n);
  });

  it("a recovery with its two new commitments swapped is refused", async () => {
    const N = secret("v2-rp-N3");
    const nextRecovery = C.recoveryCommit(secret("v2-rp-next"));
    await expect(() =>
      sim.call(
        as(secret("whoever"), { recovery: RA, incoming: N }),
        "recoverRecordSecret",
        A_REC,
        nextRecovery,
        C.commit(N),
      ),
    ).rejects.toThrow(/hold the secret behind the new commitment/);
  });

  it("a countersign proved once lands once", async () => {
    const L = secret("v2-rp-L");
    await sim.call(as(A), "issueLicense", C.licenseCommit(L, A_REC));
    const p = await sim.withLicence({ secret: L, record: A_REC }, () =>
      sim.prove(as(secret("anyone")), "countersignLicense", A_REC, 3n),
    );
    sim.land(p);
    expect(() => sim.land(p)).toThrow();
    expect(sim.state.activeLicensesBy.lookup(A_REC).read()).toBe(1n);
  });

  it("a transfer approval with the licence and the new licence swapped is refused", async () => {
    const L = secret("v2-rp-L2"),
      L2 = secret("v2-rp-L3");
    const lc = C.licenseCommit(L, A_REC),
      nlc = C.licenseCommit(L2, A_REC);
    await sim.call(as(A), "issueLicense", lc);
    await sim.withLicence({ secret: L, record: A_REC }, () =>
      sim.call(as(secret("anyone")), "countersignLicense", A_REC, 4n),
    );
    await sim.withLicence({ secret: L, record: A_REC }, () =>
      sim.call(as(secret("anyone")), "proposeTransfer", A_REC, nlc),
    );
    await expect(() =>
      sim.call(as(A), "approveTransfer", nlc, A_REC, lc),
    ).rejects.toThrow(/No transfer proposed/);
    await sim.call(as(A), "approveTransfer", lc, A_REC, nlc);
  });

  it("an obligation accepted with record and beneficiary swapped is refused; a discharge lands once", async () => {
    const O = secret("v2-rp-O");
    await sim.call(as(B), "proposeObligation", A_REC, O);
    // B (the beneficiary) cannot accept its own proposal against A by naming A.
    await expect(() =>
      sim.call(as(B), "acceptObligation", O, A_REC),
    ).rejects.toThrow(/No such obligation proposed/);
    await sim.call(as(A), "acceptObligation", O, B_REC);
    const p = await sim.prove(as(B), "discharge", A_REC, O);
    sim.land(p);
    expect(() => sim.land(p)).toThrow();
    expect(sim.state.obligationCountOf.lookup(A_REC).read()).toBe(0n);
  });

  it("a claims proof over two records, with the records swapped against their field sets, is refused", async () => {
    const sha = (s: string): Uint8Array =>
      new Uint8Array(createHash("sha256").update(s).digest());
    const TERMS = {
      documentDigest: sha("v2 swap schema"),
      comparable: Array.from({ length: SLOTS }, (_, i) => i < 2),
      k: 1n,
      numeric: Array.from({ length: SLOTS }, () => false),
    };
    const S = schemaIdOf(TERMS);
    const make = (a: string, label: string) => {
      const v: Uint8Array[] = Array.from({ length: SLOTS }, () => ABSENT);
      v[0] = digestValue(a);
      v[1] = digestValue("200/204");
      const f = sealFields(v, sha(`s ${label}`), sha(`j ${label}`));
      return { f, c: commitmentOf(S, f) };
    };
    const X = make("180/184", "X"),
      Y = make("182/184", "Y");
    const sim2 = await ClaimsSimulator.create({ terms: TERMS });
    await expect(() =>
      sim2.call({ first: X.f, second: Y.f }, "proveDistinct", Y.c, X.c),
    ).rejects.toThrow(/does not belong to the first record/);
    await expect(() =>
      sim2.call(
        { first: X.f, second: Y.f },
        "proveUnchanged",
        Y.c,
        X.c,
        S,
        Array(SLOTS).fill(true) as boolean[],
      ),
    ).rejects.toThrow(/does not belong to the original/);
    await sim2.call({ first: X.f, second: Y.f }, "proveDistinct", X.c, Y.c);
  });
});
