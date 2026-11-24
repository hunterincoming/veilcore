// Attack round C on the claims contract (4 Oct 2026), after the field-set layout change
// (one-block leaves, one set root, terms packed into one element) and the move of the
// laboratory signature into its own claim (proveAttested).
//
// Labels:
//   FIXED-...    a break this round found, now fixed. The test asserts the fixed
//                behaviour and fails on the code before the fix.
//   DEFENCE-...  an attack that does not work. Passes while the defence holds.
//   INFO-...     behaviour worth knowing that is not a break; a change to it is noticed.
//
// Witnesses are fully attacker-controlled throughout (ClaimsSimulator passes whatever the
// prover supplies straight to the compiled circuits).
// SPDX-License-Identifier: Apache-2.0

import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ClaimKind,
  RangeOp,
} from "../managed/veilcore-claims/contract/index.js";
import { CC, ClaimsSimulator } from "./claims-simulator.js";
import {
  ABSENT,
  SLOTS,
  type FieldSet,
  type SchemaTerms,
  commitmentOf,
  digestValue,
  leafOf,
  leavesOf,
  numberValue,
  openSlot,
  recordOf,
  schemaIdOf,
  sealFields,
  setRootOf,
  termsValue,
} from "../fields.js";
import {
  type FieldSchema,
  type TypedSlotValue,
  canonicalise,
  committedJsonDigest,
  fieldSchemaId,
  sealFieldSetFile,
  typedSlotValues,
} from "../field-schema.js";
import { newAttesterKey, signRecord } from "../attest.js";
import { type Claim, claimFromCells, verifyClaim } from "../verify-claims.js";

const sha = (s: string | Uint8Array): Uint8Array =>
  new Uint8Array(createHash("sha256").update(s).digest());
const hex = (b: Uint8Array): string => Buffer.from(b).toString("hex");
const rnd = (n: number): Uint8Array => new Uint8Array(randomBytes(n));
const ZERO32 = new Uint8Array(32);
const none = (): boolean[] => Array.from({ length: SLOTS }, () => false);

// ───────────────────────────────────────────── a contract-level fixture (raw terms)

const TERMS: SchemaTerms = {
  documentDigest: sha("round C schema document"),
  comparable: Array.from({ length: SLOTS }, (_, i) => i < 12),
  k: 3n,
  numeric: Array.from({ length: SLOTS }, (_, i) => i === 12 || i === 13),
};
const SCHEMA = schemaIdOf(TERMS);
const LOCI = [
  "233/233",
  "180/184",
  "201/201",
  "155/159",
  "312/318",
  "140/140",
  "222/226",
  "199/199",
  "260/264",
  "175/175",
  "290/290",
  "133/137",
];
const make = (
  loci: (string | null)[],
  germ: bigint | null,
  label: string,
  opts: { schema?: Uint8Array; slot13?: Uint8Array } = {},
): { fs: FieldSet; c: Uint8Array } => {
  const values = [
    ...loci.map((c) => (c === null ? ABSENT : digestValue(c))),
    germ === null ? ABSENT : numberValue(germ),
    opts.slot13 ?? ABSENT, // a numeric slot left empty unless given
    digestValue(`name:${label}`),
    ABSENT,
  ];
  const fs = sealFields(values, sha(`fs ${label}`), sha(`json ${label}`));
  return { fs, c: commitmentOf(opts.schema ?? SCHEMA, fs) };
};
const A = make(LOCI, 9650n, "A");
const sim = (terms: SchemaTerms = TERMS): Promise<ClaimsSimulator> =>
  ClaimsSimulator.create({ terms });

// ───────────────────────────────────────────── value and range: forging an opening

describe("value and range claims without the field set", () => {
  it("DEFENCE: an opening of slot 3 cannot be presented as slot 4 (wrong slot)", async () => {
    const o = openSlot(A.fs, 3);
    await expect(async () =>
      (await sim()).call(
        { opening: o },
        "proveValue",
        A.c,
        SCHEMA,
        4n,
        o.value,
      ),
    ).rejects.toThrow(/different slot/);
  });

  it("DEFENCE: putting slot 3's leaf in slot 4's place to match moves the root (leaf reuse)", async () => {
    const o = openSlot(A.fs, 3);
    const leaves = [...o.leaves];
    leaves[4] = leaves[3];
    await expect(async () =>
      (await sim()).call(
        { opening: { ...o, leaves } },
        "proveValue",
        A.c,
        SCHEMA,
        4n,
        o.value,
      ),
    ).rejects.toThrow(/does not belong to that record/);
    // Swapping two leaves (and claiming the swapped position) fails the same way.
    const swapped = [...o.leaves];
    [swapped[3], swapped[4]] = [swapped[4], swapped[3]];
    await expect(async () =>
      (await sim()).call(
        { opening: { ...o, leaves: swapped } },
        "proveValue",
        A.c,
        SCHEMA,
        4n,
        o.value,
      ),
    ).rejects.toThrow(/does not belong to that record/);
  });

  it("DEFENCE: slots 16 and 255 are refused before anything else", async () => {
    const o = openSlot(A.fs, 3);
    for (const slot of [16n, 255n])
      await expect(async () =>
        (await sim()).call(
          { opening: o },
          "proveValue",
          A.c,
          SCHEMA,
          slot,
          o.value,
        ),
      ).rejects.toThrow(/16 slots/);
  });

  it("DEFENCE: a claim naming another schema id than the record was sealed under is refused", async () => {
    const S2 = schemaIdOf({ ...TERMS, k: 4n });
    const o = openSlot(A.fs, 12);
    await expect(async () =>
      (await sim()).call({ opening: o }, "proveValue", A.c, S2, 12n, o.value),
    ).rejects.toThrow(/does not belong/);
    // Nor can the record be re-labelled by computing it under S2: that is another record.
    expect(hex(commitmentOf(S2, A.fs))).not.toBe(hex(A.c));
  });

  it("DEFENCE: an opening of a correction (same value, fresh salt) does not open the original", async () => {
    const C = sealFields(
      A.fs.values,
      sha("fs A corrected"),
      sha("json A corr"),
    );
    const o = openSlot(C, 12);
    expect(hex(o.value)).toBe(hex(A.fs.values[12]));
    await expect(async () =>
      (await sim()).call(
        { opening: o },
        "proveValue",
        A.c,
        SCHEMA,
        12n,
        o.value,
      ),
    ).rejects.toThrow(/different slot|does not belong/);
    // With the original's leaves but the correction's salt: the slot leaf no longer matches.
    await expect(async () =>
      (await sim()).call(
        { opening: { ...openSlot(A.fs, 12), salt: o.salt } },
        "proveValue",
        A.c,
        SCHEMA,
        12n,
        o.value,
      ),
    ).rejects.toThrow(/different slot/);
  });

  it("DEFENCE: no encoding ambiguity: every in-circuit hash equals the plain SHA-256 layout (200 random inputs)", () => {
    for (let t = 0; t < 200; t++) {
      const v = rnd(32);
      const s = rnd(23);
      expect(hex(CC.fieldLeaf(v, s))).toBe(hex(leafOf(v, s)));
      // the 55-byte preimage, byte for byte
      expect(hex(CC.fieldLeaf(v, s))).toBe(
        hex(sha(new Uint8Array([...v, ...s]))),
      );
      const id = rnd(32);
      const leaves = Array.from({ length: SLOTS }, () => rnd(32));
      expect(hex(CC.fieldSetRoot(id, leaves))).toBe(hex(setRootOf(id, leaves)));
      const root = rnd(32);
      const j = rnd(32);
      expect(hex(CC.fieldRecord(root, j))).toBe(hex(recordOf(root, j)));
      // record and schema id take the same 96-byte shape; only the tag separates them
      expect(hex(CC.fieldRecord(root, j))).not.toBe(hex(CC.schemaId(root, j)));
      const terms: SchemaTerms = {
        documentDigest: rnd(32),
        comparable: Array.from({ length: SLOTS }, () => Math.random() < 0.5),
        numeric: Array.from({ length: SLOTS }, () => Math.random() < 0.5),
        k: BigInt(Math.floor(Math.random() * 256)),
      };
      expect(hex(CC.termsBytes(terms))).toBe(hex(termsValue(terms)));
      expect(hex(CC.schemaId(terms.documentDigest, CC.termsBytes(terms)))).toBe(
        hex(schemaIdOf(terms)),
      );
    }
  });

  it("DEFENCE: a range claim on an absent number slot fails for every number and both directions", async () => {
    // Slot 13 is numeric in the schema and absent (32 zero bytes) in A.
    for (const n of [0n, 1n, (1n << 64n) - 1n])
      for (const op of [RangeOp.AT_MOST, RangeOp.AT_LEAST])
        await expect(async () =>
          (await sim()).call(
            { opening: openSlot(A.fs, 13), number: n },
            "proveRange",
            A.c,
            SCHEMA,
            13n,
            op,
            0n,
          ),
        ).rejects.toThrow(/does not hold that number/);
    // Control: a present 0 does prove "at most 0".
    const Z = make(LOCI, 9650n, "Z", { slot13: numberValue(0n) });
    const s = await sim();
    await s.call(
      { opening: openSlot(Z.fs, 13), number: 0n },
      "proveRange",
      Z.c,
      SCHEMA,
      13n,
      RangeOp.AT_MOST,
      0n,
    );
    expect(s.state.lastClaimKind).toBe(ClaimKind.RANGE);
  });

  it("DEFENCE: the range direction is constrained to {0, 1} in the circuit, so a hand-built prover cannot publish op = 2", async () => {
    // claimFromCells reads anything other than AT_MOST as "at least"; the circuit checks
    // n <= t for anything other than AT_LEAST. A third value would split the two. It
    // cannot reach the chain: the ZKIR constrains the op input to a boolean.
    const z = JSON.parse(
      readFileSync(
        new URL(
          "../managed/veilcore-claims/zkir/proveRange.zkir",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as {
      inputs: { name: string }[];
      instructions: { op: string; val?: string }[];
    };
    // ZKIR v3 names its inputs: record(2) schema(2) slot op bound
    expect(z.inputs.map((i) => i.name)).toEqual([
      "%record.0",
      "%record.1",
      "%schema.2",
      "%schema.3",
      "%slot.4",
      "%op.5",
      "%bound.6",
    ]);
    expect(
      z.instructions.some(
        (i) => i.op === "constrain_to_boolean" && i.val === "%op.5",
      ),
    ).toBe(true);
    await expect(async () =>
      (await sim()).call(
        { opening: openSlot(A.fs, 12), number: 9650n },
        "proveRange",
        A.c,
        SCHEMA,
        12n,
        2 as RangeOp,
        9700n,
      ),
    ).rejects.toThrow(/expected value of type Enum<RangeOp/);
  });
});

// ───────────────────────────────────────────── distinct

describe("distinct", () => {
  it("DEFENCE: absent slots never count, on either side", async () => {
    // Two real differences (slots 0, 1) and slot 2 absent in B: k = 3 is not met.
    const B = make(
      LOCI.map((v, i) =>
        i === 0 ? "231/233" : i === 1 ? "180/186" : i === 2 ? null : v,
      ),
      9650n,
      "B-absent",
    );
    await expect(async () =>
      (await sim()).call(
        { first: A.fs, second: B.fs },
        "proveDistinct",
        A.c,
        B.c,
      ),
    ).rejects.toThrow(/enough comparable/);
    // Same with the absent slot on the first record's side.
    await expect(async () =>
      (await sim()).call(
        { first: B.fs, second: A.fs },
        "proveDistinct",
        B.c,
        A.c,
      ),
    ).rejects.toThrow(/enough comparable/);
    // Eleven absent comparable slots against eleven present ones: still nothing.
    const E = make([LOCI[0], ...LOCI.slice(1).map(() => null)], 9650n, "E");
    await expect(async () =>
      (await sim()).call(
        { first: A.fs, second: E.fs },
        "proveDistinct",
        A.c,
        E.c,
      ),
    ).rejects.toThrow(/enough comparable/);
  });

  it("DEFENCE: identical values under fresh salts and other JSON are not distinct", async () => {
    const R = sealFields(A.fs.values, sha("fs A-r"), sha("json A-r"));
    const rc = commitmentOf(SCHEMA, R);
    expect(hex(rc)).not.toBe(hex(A.c));
    await expect(async () =>
      (await sim()).call({ first: A.fs, second: R }, "proveDistinct", A.c, rc),
    ).rejects.toThrow(/enough comparable/);
  });

  it("DEFENCE: differences outside the comparable mask do not count", async () => {
    // Only slots 12-15 differ (none comparable).
    const values = A.fs.values.map((v, i) =>
      i === 12
        ? numberValue(1n)
        : i === 13
          ? numberValue(2n)
          : i === 14
            ? digestValue("x")
            : i === 15
              ? digestValue("y")
              : v,
    );
    const N = sealFields(values, sha("fs N"), sha("json N"));
    const nc = commitmentOf(SCHEMA, N);
    await expect(async () =>
      (await sim()).call({ first: A.fs, second: N }, "proveDistinct", A.c, nc),
    ).rejects.toThrow(/enough comparable/);
  });

  it("DEFENCE: k = 0 is refused, and k above the comparable count can never be met", async () => {
    const T0 = { ...TERMS, k: 0n };
    const S0 = schemaIdOf(T0);
    const X = make(LOCI, 1n, "X0", { schema: S0 });
    const Y = make(
      LOCI.map((v) => v + "9"),
      1n,
      "Y0",
      { schema: S0 },
    );
    await expect(async () =>
      (await sim(T0)).call(
        { first: X.fs, second: Y.fs },
        "proveDistinct",
        X.c,
        Y.c,
      ),
    ).rejects.toThrow(/at least 1/);
    // k = 13 with 12 comparable slots, all twelve different.
    const T13 = { ...TERMS, k: 13n };
    const S13 = schemaIdOf(T13);
    const X2 = make(LOCI, 1n, "X13", { schema: S13 });
    const Y2 = make(
      LOCI.map((v) => v + "9"),
      1n,
      "Y13",
      { schema: S13 },
    );
    await expect(async () =>
      (await sim(T13)).call(
        { first: X2.fs, second: Y2.fs },
        "proveDistinct",
        X2.c,
        Y2.c,
      ),
    ).rejects.toThrow(/enough comparable/);
    // ... and k = 12 is met by the same pair.
    const T12 = { ...TERMS, k: 12n };
    const S12 = schemaIdOf(T12);
    const X3 = make(LOCI, 1n, "X12", { schema: S12 });
    const Y3 = make(
      LOCI.map((v) => v + "9"),
      1n,
      "Y12",
      { schema: S12 },
    );
    const s = await sim(T12);
    await s.call({ first: X3.fs, second: Y3.fs }, "proveDistinct", X3.c, Y3.c);
    expect(hex(s.state.lastClaimSchema)).toBe(hex(S12));
  });

  it("DEFENCE: terms with a widened comparable mask or a lower k are not the record's schema", async () => {
    const B = make(
      LOCI.map((v, i) => (i === 0 ? "231/233" : v)),
      9100n,
      "B-one",
    );
    // One locus and the germination slot differ: try making slot 12 comparable, or k = 1.
    for (const t of [
      {
        ...TERMS,
        comparable: TERMS.comparable.map((b, i) => b || i === 12),
        k: 2n,
      },
      { ...TERMS, k: 1n },
    ])
      await expect(async () =>
        (await sim(t)).call(
          { first: A.fs, second: B.fs },
          "proveDistinct",
          A.c,
          B.c,
        ),
      ).rejects.toThrow(/does not belong to the first record/);
  });
});

// ───────────────────────────────────────────── unchanged

describe("unchanged", () => {
  const C = (() => {
    const values = A.fs.values.map((v, i) =>
      i === 12 ? numberValue(9700n) : v,
    );
    const fs = sealFields(values, sha("fs C"), sha("json C"));
    return { fs, c: commitmentOf(SCHEMA, fs) };
  })();

  it("DEFENCE: a change outside the mask is refused, whatever the mask says elsewhere", async () => {
    const allBut12 = Array.from({ length: SLOTS }, (_, i) => i !== 12);
    await expect(async () =>
      (await sim()).call(
        { first: A.fs, second: C.fs },
        "proveUnchanged",
        A.c,
        C.c,
        SCHEMA,
        allBut12,
      ),
    ).rejects.toThrow(/outside the mask/);
    const only12 = Array.from({ length: SLOTS }, (_, i) => i === 12);
    const s = await sim();
    await s.call(
      { first: A.fs, second: C.fs },
      "proveUnchanged",
      A.c,
      C.c,
      SCHEMA,
      only12,
    );
    const claim = claimFromCells(s.state);
    expect(claim.mayChange).toEqual(only12); // the mask published is exactly the one checked
  });

  it("DEFENCE: two records under different schemas cannot be called unchanged", async () => {
    const S2 = schemaIdOf({ ...TERMS, k: 4n });
    const c2 = commitmentOf(S2, C.fs);
    for (const schema of [SCHEMA, S2])
      await expect(async () =>
        (await sim()).call(
          { first: A.fs, second: C.fs },
          "proveUnchanged",
          A.c,
          c2,
          schema,
          Array.from({ length: SLOTS }, () => true),
        ),
      ).rejects.toThrow(/does not belong/);
  });

  it("DEFENCE: a record is not its own correction", async () => {
    await expect(async () =>
      (await sim()).call(
        { first: A.fs, second: A.fs },
        "proveUnchanged",
        A.c,
        A.c,
        SCHEMA,
        none(),
      ),
    ).rejects.toThrow(/different record/);
  });
});

// ───────────────────────────────────────────── attested

describe("attested", () => {
  const lab = newAttesterKey();

  it("DEFENCE: the lab's signature does not verify under any other published key (key substitution)", async () => {
    const sig = signRecord(lab.secret, A.c);
    const other = newAttesterKey().key;
    await expect(async () =>
      (await sim()).call(
        { attester: other, signature: sig },
        "proveAttested",
        A.c,
      ),
    ).rejects.toThrow(/does not verify/);
  });

  it("DEFENCE: a signature over a record's field-set root, JSON digest or schema id is not one over the record", async () => {
    const root = setRootOf(SCHEMA, leavesOf(A.fs));
    for (const signed of [root, A.fs.jsonDigest, SCHEMA])
      await expect(async () =>
        (await sim()).call(
          { attester: lab.key, signature: signRecord(lab.secret, signed) },
          "proveAttested",
          A.c,
        ),
      ).rejects.toThrow(/does not verify/);
  });

  it("INFO: an attested claim can be made on any 32 bytes a laboratory signed, including a sha256/canonical-json/v1 commitment that is not a field-set record", async () => {
    const notFields = sha('{"commitmentAlgorithm":"sha256/canonical-json/v1"}');
    const s = await sim();
    await s.call(
      { attester: lab.key, signature: signRecord(lab.secret, notFields) },
      "proveAttested",
      notFields,
    );
    const v = verifyClaim({ claim: s.state, trustedAttesters: [lab.key] });
    expect(v.passed).toBe(true);
    // The statement describes it as a commitment "which binds every value it seals",
    // though this one seals no field set; only passing the record JSON shows that.
    expect(v.statement).toMatch(/binds every value it seals/);
  });

  // v1 INFO: the announcement and response were unconstrained private inputs in the ZKIR.
  // v2 (ZKIR v3): the key and the announcement are typed Point<Jubjub>, and the response's
  // two parts are bit-constrained (4 and 248 bits) before the range assert.
  it("INFO (v2): the key and announcement are Jubjub points, and the response parts are range-constrained", () => {
    const z = JSON.parse(
      readFileSync(
        new URL(
          "../managed/veilcore-claims/zkir/proveAttested.zkir",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as {
      instructions: {
        op: string;
        val?: string;
        type?: string;
        output?: string;
        bits?: number;
      }[];
    };
    const privates = z.instructions.filter((i) => i.op === "private_input");
    // key, announcement, response hi, response lo: the first four private inputs
    expect(privates.slice(0, 4).map((i) => [i.output, i.type])).toEqual([
      ["%key.2", "Point<Jubjub>"],
      ["%sig.3", "Point<Jubjub>"],
      ["%sig.4", "Scalar<BLS12-381>"],
      ["%sig.5", "Scalar<BLS12-381>"],
    ]);
    const bits = (v: string) =>
      z.instructions.find((i) => i.op === "constrain_bits" && i.val === v)
        ?.bits;
    expect(bits("%sig.4")).toBe(4);
    expect(bits("%sig.5")).toBe(248);
  });
});

// ───────────────────────────────────────────── the reference verifier (verify-claims.ts)

type Vectors = {
  fieldSets: { input: { schema: FieldSchema; values: TypedSlotValue[] } }[];
};
const V = JSON.parse(
  readFileSync(
    new URL("../../../contract/vectors/fields-v1.json", import.meta.url),
    "utf8",
  ),
) as Vectors;
const DOC = V.fieldSets[0].input.schema;
const VALUES = V.fieldSets[0].input.values;

/** The committed fields exactly as the SDK (veilcore-sdk src/commit.ts) and SPEC 4.2 list them. */
const SPEC_COMMITTED = [
  "attestations",
  "commitmentAlgorithm",
  "extensions",
  "fieldSchema",
  "fieldSetRoot",
  "formatVersion",
  "holder",
  "identification",
  "jurisdictionBindings",
  "ledgerIdentity",
  "parents",
  "profile",
  "profileData",
  "recordId",
  "registrations",
  "sealedAt",
  "subject",
  "subjectType",
  "supersedes",
];
const specJsonDigest = (env: Record<string, unknown>): Uint8Array => {
  const c: Record<string, unknown> = {};
  for (const k of SPEC_COMMITTED) c[k] = env[k];
  c.attestations ??= [];
  c.parents ??= [];
  return sha(new TextEncoder().encode(canonicalise(c)));
};

/** Seal a sha256/fields/v1 record as the SDK does (SPEC 4.2 committed fields). */
const sealRecord = (
  doc: FieldSchema,
  values: TypedSlotValue[],
  fieldSecret: string,
  extra: Record<string, unknown> = {},
) => {
  const schemaId = fieldSchemaId(doc);
  const root = setRootOf(
    schemaId,
    leavesOf(
      sealFields(
        typedSlotValues(doc, values),
        Buffer.from(fieldSecret, "hex"),
        ZERO32,
      ),
    ),
  );
  const env: Record<string, unknown> = {
    formatVersion: "0.1",
    recordId: `vc_rec_${fieldSecret.slice(0, 8)}`,
    subjectType: "plant-genetic-material",
    profile: "veilcore/profile/cannabis/v0.1",
    commitmentAlgorithm: "sha256/fields/v1",
    sealedAt: "2026-10-04T00:00:00Z",
    holder: { id: "vc_hld_test" },
    profileData: { cultivarName: "Harbour Mist", nonce: fieldSecret },
    fieldSchema: hex(schemaId),
    fieldSetRoot: hex(root),
    ...extra,
  };
  const sealed = sealFieldSetFile({
    schema: doc,
    values,
    fieldSecret,
    jsonDigest: hex(specJsonDigest(env)),
  });
  return { env, sealed };
};

const rangeClaim = async (
  r: ReturnType<typeof sealRecord>,
  slot: number,
  n: bigint,
  op: RangeOp,
  bound: bigint,
) => {
  const s = await ClaimsSimulator.create({ terms: r.sealed.terms });
  await s.call(
    { opening: openSlot(r.sealed.fieldSet, slot), number: n },
    "proveRange",
    r.sealed.commitment,
    r.sealed.schemaId,
    BigInt(slot),
    op,
    bound,
  );
  return s.state;
};

describe("verify-claims: the reference verifier", () => {
  it("FIXED-C1 (MEDIUM): ledgerIdentity is committed, so record JSON with a forged ledgerIdentity is not the claimed record", async () => {
    const A1 = sealRecord(DOC, VALUES, "11".repeat(32));
    const claim = await rangeClaim(A1, 12, 9650n, RangeOp.AT_LEAST, 9500n);
    // Mallory shows the verifier Alice's record JSON with Mallory's ledger identity added,
    // so that the claim (and everything that identity does on the ledger) reads as hers.
    const forged = {
      ...A1.env,
      ledgerIdentity: { chain: "midnight:preprod", identity: "ee".repeat(32) },
    };
    expect(
      hex(
        recordOf(
          Buffer.from(A1.env.fieldSetRoot as string, "hex"),
          specJsonDigest(forged),
        ),
      ),
    ).not.toBe(hex(A1.sealed.commitment));
    const v = verifyClaim({ claim, schema: DOC, records: [forged] });
    expect(v.passed).toBe(false);
    expect(v.checks.find((c) => !c.ok)?.detail).toMatch(
      /which the claim does not name/,
    );
    // The genuine JSON (no ledgerIdentity) still passes.
    expect(verifyClaim({ claim, schema: DOC, records: [A1.env] }).passed).toBe(
      true,
    );
  });

  it("FIXED-C1 (MEDIUM, other side): a genuine SDK-sealed record that carries ledgerIdentity is accepted", async () => {
    const L = sealRecord(DOC, VALUES, "12".repeat(32), {
      ledgerIdentity: { chain: "midnight:preprod", identity: "cd".repeat(32) },
    });
    expect(hex(committedJsonDigest(L.env))).toBe(hex(specJsonDigest(L.env)));
    const claim = await rangeClaim(L, 12, 9650n, RangeOp.AT_LEAST, 9500n);
    const v = verifyClaim({ claim, schema: DOC, records: [L.env] });
    expect(v.passed).toBe(true);
    expect(v.checks.find((c) => c.spec === 4)?.detail).toMatch(/recomputes to/);
  });

  it("FIXED-C2 (MEDIUM): a scale that is not a power of ten is printed exactly", async () => {
    // A schema stating total THC in quarter-percent units (scale 4), and a yield in
    // twentieths (scale 20). Both are valid per SPEC 4.5 ("scale: a positive integer").
    const doc: FieldSchema = {
      ...DOC,
      id: "round-c/scale-test/v1",
      slots: DOC.slots.map((s) =>
        s.slot === 13
          ? {
              slot: 13,
              path: "fields.totalThcPercent",
              type: "uint",
              scale: 4,
              unit: "percent",
            }
          : s.slot === 15
            ? {
                slot: 15,
                path: "fields.yieldTonnesPerHa",
                type: "uint",
                scale: 20,
                unit: "t/ha",
              }
            : s,
      ),
    };
    const values = [...VALUES];
    values[13] = { uint: "3" }; // 0.75 percent
    values[15] = { uint: "6" }; // 0.3 t/ha
    const R = sealRecord(doc, values, "13".repeat(32));
    const thc = verifyClaim({
      claim: await rangeClaim(R, 13, 3n, RangeOp.AT_MOST, 3n),
      schema: doc,
      records: [R.env],
    });
    expect(thc.passed).toBe(true);
    expect(thc.statement).toContain("is at most 0.75 percent");
    const yld = verifyClaim({
      claim: await rangeClaim(R, 15, 6n, RangeOp.AT_LEAST, 6n),
      schema: doc,
      records: [R.env],
    });
    expect(yld.passed).toBe(true);
    expect(yld.statement).toContain("is at least 0.3 t/ha");
  });

  it("FIXED-C3 (MEDIUM): with no trusted-key list, a key the holder made up is named as a key, never as a laboratory", async () => {
    const A1 = sealRecord(DOC, VALUES, "14".repeat(32));
    const mallory = newAttesterKey(); // the holder's own key; no laboratory involved
    const s = await ClaimsSimulator.create({ terms: A1.sealed.terms });
    await s.call(
      {
        attester: mallory.key,
        signature: signRecord(mallory.secret, A1.sealed.commitment),
      },
      "proveAttested",
      A1.sealed.commitment,
    );
    const att = claimFromCells(s.state);
    const v = verifyClaim({
      claim: await rangeClaim(A1, 12, 9650n, RangeOp.AT_LEAST, 9500n),
      schema: DOC,
      records: [A1.env],
      attestations: [att],
    });
    expect(v.passed).toBe(true);
    expect(v.statement).not.toContain("laboratory signed");
    expect(v.statement).toContain(
      "not checked against a laboratory's published key",
    );
    expect(v.toCheck.join("\n")).toMatch(/belongs to a laboratory you trust/);
  });

  it("FIXED-C4 (LOW): the verifier is told the attested claims must be read from the same contract", async () => {
    const A1 = sealRecord(DOC, VALUES, "15".repeat(32));
    const lab = newAttesterKey();
    const fake: Claim = {
      kind: "attested",
      record: A1.sealed.commitment,
      schema: ZERO32,
      attester: lab.key,
    };
    const v = verifyClaim({
      claim: await rangeClaim(A1, 12, 9650n, RangeOp.AT_LEAST, 9500n),
      schema: DOC,
      attestations: [fake],
      trustedAttesters: [lab.key],
    });
    // A Claim object carries no contract address, so this stays a "to check", now one
    // that names the attested claims.
    const reminders = v.toCheck.filter((t) => /claims contract/.test(t));
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatch(
      /every attested claim read with it is on that same contract/,
    );
  });

  it("INFO-C5: disclosure accounting is per record, so bounds proved on an original and on its unchanged correction are not combined", async () => {
    const A1 = sealRecord(DOC, VALUES, "16".repeat(32));
    const corrected = [...VALUES];
    corrected[15] = { uint: "4100" };
    const C1 = sealRecord(DOC, corrected, "17".repeat(32), {
      supersedes: { recordId: A1.env.recordId },
    });
    const lo = claimFromCells(
      await rangeClaim(A1, 12, 9650n, RangeOp.AT_LEAST, 9600n),
    );
    const s = await ClaimsSimulator.create();
    await s.call(
      { first: A1.sealed.fieldSet, second: C1.sealed.fieldSet },
      "proveUnchanged",
      A1.sealed.commitment,
      C1.sealed.commitment,
      A1.sealed.schemaId,
      Array.from({ length: SLOTS }, (_, i) => i === 15),
    );
    const unchanged = claimFromCells(s.state);
    const v = verifyClaim({
      claim: await rangeClaim(C1, 12, 9650n, RangeOp.AT_MOST, 9700n),
      schema: DOC,
      earlierClaims: [lo, unchanged],
    });
    const line = v.toCheck.find((t) => t.startsWith("disclosed so far"))!;
    // Together the three claims pin germination to 96.00-97.00 percent; the account says less.
    expect(line).toContain("at most 97.00 percent");
    expect(line).not.toContain("between");
  });
});
