// Regenerate contract/vectors/document-v1.json: records sealed under the document profile,
// veilcore/profile/document/v1 (docs/document-profile.md, SPEC 11.11; a draft until marked final).
//   node contract/scripts/document-vectors.mjs
// Written with node:crypto and the published canonicaliser only, so the checkers it tests
// (bboard-ui veilcore/document-profile.ts and commitment.ts, the registry's
// lineage/document-profile.mjs and conformance.mjs) are checked against something none of them
// computed. The fingerprint rules are SPEC 3.6.1 and 4.4, unchanged: the profile only says
// which fields are sealed. Copy the output to the registry's test/fixtures/ and the SDK's
// conformance/ (both byte for byte).
//
// Every record here is test data: made-up documents, issuers, references and file fingerprints.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(
  new URL("../../bboard-ui/package.json", import.meta.url),
);
const { canonicalise } = await import(
  pathToFileURL(require.resolve("veilcore-records")).href
);
const OUT = fileURLToPath(
  new URL("../vectors/document-v1.json", import.meta.url),
);

const PROFILE = "veilcore/profile/document/v1";
const H = (tag, ...hex) => {
  const t = Buffer.alloc(32);
  t.write(tag, "utf8");
  return createHash("sha256")
    .update(Buffer.concat([t, ...hex.map((h) => Buffer.from(h, "hex"))]))
    .digest("hex");
};
const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const keyOf = (recordSecret) => {
  const identity = H("veilcore:v1:commit", recordSecret);
  const keySalt = H("veilcore:v1:keysalt", recordSecret);
  return {
    recordSecret,
    identity,
    keySalt,
    keyBinding: H("veilcore:v1:keybind", identity, keySalt),
  };
};
const keys = [keyOf("a1".repeat(32)), keyOf("0b".repeat(16) + "c4".repeat(16))];

// The sealed fields of a full record (test data).
const coa = {
  about: [
    {
      name: "Practice Plant 7",
      recordId: "VEIL-00000000000000000000000000000007",
    },
  ],
  files: [
    {
      name: "COA batch 7 (test data).pdf",
      sha256: sha("practice coa 7"),
      size: 184321,
    },
    {
      name: "chromatogram.png",
      sha256: sha("practice chromatogram 7"),
      size: 52011,
    },
  ],
  holder: "Example Grower (test data)",
  issued: "2026-10-01",
  issuer: "Example Testing Lab (test data)",
  loggedAt: 1761700000000,
  nonce: "5d".repeat(32),
  notes: "Test data, not a real certificate.",
  profile: PROFILE,
  reference: "COA-0007",
  title: "Certificate of analysis, batch 7",
  type: "certificate-of-analysis",
};

/** The site's stored shape for the same record (bboard-ui veilcore/records.ts). */
const appRecordOf = (f) => ({
  profile: f.profile,
  strainName: f.title,
  bredBy: f.holder,
  dateCreated: f.issued,
  notes: f.notes,
  loggedAt: f.loggedAt,
  nonce: f.nonce,
  ...(f.keyBinding !== undefined ? { keyBinding: f.keyBinding } : {}),
  ...(f.fieldSchema !== undefined
    ? { fieldSchema: f.fieldSchema, fieldSetRoot: f.fieldSetRoot }
    : {}),
  refId: f.reference,
  parents: [],
  photoFingerprints: [],
  document: { type: f.type, issuer: f.issuer, files: f.files, about: f.about },
});

// ---- a field set (SPEC 4.5): the numbers on a certificate, from the spec's own words ----
const potencySchema = JSON.parse(
  readFileSync(
    new URL("../../bboard-ui/public/schemas/potency-v1.json", import.meta.url),
    "utf8",
  ),
);
const count32 = (n) => {
  const b = Buffer.alloc(32);
  b.writeBigUInt64LE(BigInt(n));
  return b.toString("hex");
};
const termsOf = (schema) => {
  const t = Buffer.alloc(32);
  let comparable = 0;
  let numeric = 0;
  for (const s of schema.slots) {
    if (s.comparable) comparable |= 1 << s.slot;
    if (s.type === "uint") numeric |= 1 << s.slot;
  }
  t.writeUInt16LE(comparable, 0);
  t.writeUInt16LE(numeric, 2);
  t[4] = schema.k;
  return t.toString("hex");
};
const schemaIdOf = (schema) =>
  H("veilcore:v1:fschema", sha(canonicalise(schema)), termsOf(schema));
const uintValue = (n) => {
  const b = Buffer.alloc(32);
  b.writeBigUInt64LE(BigInt(n));
  b[8] = 1;
  return b;
};
const fieldSetRootOf = (schemaId, values, secret) => {
  const leaves = Array.from({ length: 16 }, (_, i) => {
    const v =
      values[i] === null || values[i] === undefined
        ? Buffer.alloc(32)
        : uintValue(values[i]);
    const salt = Buffer.from(
      H("veilcore:v1:fsalt", secret, count32(i)),
      "hex",
    ).subarray(0, 23);
    return createHash("sha256")
      .update(Buffer.concat([v, salt]))
      .digest();
  });
  return createHash("sha256")
    .update(
      Buffer.concat([
        Buffer.from("veilcore:v1:fset", "utf8"),
        Buffer.from(schemaId, "hex"),
        ...leaves,
      ]),
    )
    .digest("hex");
};
const potencyValues = [
  "210",
  "45",
  "180",
  "11400",
  "12650",
  "320",
  "13800",
  null,
];
const fieldSecret = "f5".repeat(32);
const potencyId = schemaIdOf(potencySchema);
const potencyRoot = fieldSetRootOf(potencyId, potencyValues, fieldSecret);

const recordOf = (name, fields, extra = {}) => {
  const canonical = canonicalise(fields);
  // A field set (SPEC 4.5): H("veilcore:v1:frecord", fieldSetRoot, SHA-256 of the canonical JSON).
  const withSet = fields.fieldSetRoot !== undefined;
  const contentHash = withSet
    ? H("veilcore:v1:frecord", fields.fieldSetRoot, sha(canonical))
    : sha(canonical);
  const bound = fields.keyBinding !== undefined;
  return {
    name,
    algorithm: bound
      ? "sha256/key-bound/v1"
      : withSet
        ? "sha256/fields/v1"
        : "sha256/canonical-json/v1",
    appRecord: appRecordOf(fields),
    fields,
    canonical,
    contentHash,
    fingerprint: bound
      ? H("veilcore:v1:keyrecord", fields.keyBinding, contentHash)
      : contentHash,
    ...extra,
  };
};

const records = [
  recordOf(
    "a certificate of analysis with two files, about a logged plant, naming key 0",
    {
      ...coa,
      keyBinding: keys[0].keyBinding,
    },
  ),
  recordOf(
    "the same certificate sealed without a key (a registry that does not bind keys)",
    coa,
  ),
  recordOf("one file and nothing optional stated, naming key 1", {
    ...coa,
    about: [],
    files: [{ name: "permit.pdf", sha256: sha("practice permit"), size: 0 }],
    issued: "",
    issuer: "",
    notes: "",
    reference: "",
    title: "Practice permit",
    type: "permit",
    keyBinding: keys[1].keyBinding,
  }),
  recordOf(
    "a transport document about two records, one typed in, Spanish and Japanese text, notes over two lines",
    {
      ...coa,
      about: [
        { name: "Planta madre 1" },
        { name: "母株 2", recordId: "VEIL-00000000000000000000000000000022" },
      ],
      files: [
        {
          name: "carta de porte 0042.pdf",
          sha256: sha("practice transport 42"),
          size: 90210,
        },
      ],
      issuer: "Asociación de práctica (datos de prueba)",
      reference: "CP-0042",
      title: "Carta de porte 0042",
      type: "transport",
      notes: "Line one.\nLine two.",
      keyBinding: keys[0].keyBinding,
    },
  ),
  recordOf(
    "a certificate of analysis with its numbers sealed as a field set (potency schema), naming key 1",
    {
      ...coa,
      fieldSchema: potencyId,
      fieldSetRoot: potencyRoot,
      keyBinding: keys[1].keyBinding,
    },
    {
      fieldSet: {
        schema: potencySchema.id,
        schemaDocument: potencySchema,
        schemaId: potencyId,
        values: potencyValues,
        fieldSecret,
        fieldSetRoot: potencyRoot,
      },
    },
  ),
];

const without = (o, k) => {
  const c = { ...o };
  delete c[k];
  return c;
};
const file = coa.files[0];
// Each must be refused: by a validator of the profile, before anything is sealed.
const refusals = [
  ["a missing type", without(coa, "type")],
  ["a type not in the list", { ...coa, type: "letter" }],
  ["no files", { ...coa, files: [] }],
  ["files that are not a list", { ...coa, files: file }],
  [
    "twenty-one files",
    {
      ...coa,
      files: Array.from({ length: 21 }, (_, i) => ({
        ...file,
        sha256: sha(`f${i}`),
      })),
    },
  ],
  [
    "the same file twice",
    { ...coa, files: [file, { ...file, name: "copy.pdf" }] },
  ],
  [
    "an upper-case file fingerprint",
    { ...coa, files: [{ ...file, sha256: file.sha256.toUpperCase() }] },
  ],
  [
    "a short file fingerprint",
    { ...coa, files: [{ ...file, sha256: file.sha256.slice(0, 62) }] },
  ],
  ["a negative size", { ...coa, files: [{ ...file, size: -1 }] }],
  [
    "a size that is not a whole number",
    { ...coa, files: [{ ...file, size: 1.5 }] },
  ],
  ["a size written as text", { ...coa, files: [{ ...file, size: "184321" }] }],
  ["a file with no name", { ...coa, files: [{ ...file, name: "" }] }],
  [
    "a line break in a file name",
    { ...coa, files: [{ ...file, name: "COA\n7.pdf" }] },
  ],
  [
    "a file with an extra field",
    { ...coa, files: [{ ...file, mediaType: "application/pdf" }] },
  ],
  ["an issued date that is not a date", { ...coa, issued: "2026-02-30" }],
  ["an issued date in another form", { ...coa, issued: "01/10/2026" }],
  ["an empty title", { ...coa, title: "" }],
  ["a title with a space at the end", { ...coa, title: "COA 7 " }],
  ["an empty holder", { ...coa, holder: "" }],
  ["an about entry with nothing to name it", { ...coa, about: [{ name: "" }] }],
  [
    "an about entry with a role",
    { ...coa, about: [{ name: "Practice Plant 7", role: "sire" }] },
  ],
  [
    "twenty-one about entries",
    {
      ...coa,
      about: Array.from({ length: 21 }, (_, i) => ({ name: `P${i}` })),
    },
  ],
  [
    "a plant field (strainName) in a document record",
    { ...coa, strainName: "COA 7" },
  ],
  ["a plant field (parents) in a document record", { ...coa, parents: [] }],
  [
    "the plant profile",
    { ...coa, profile: "veilcore/profile/plant-variety/v1" },
  ],
  [
    "an upper-case keyBinding",
    { ...coa, keyBinding: keys[0].keyBinding.toUpperCase() },
  ],
  ["a clock that is not a whole number", { ...coa, loggedAt: 1761700000000.5 }],
  ["a short nonce", { ...coa, nonce: "5d".repeat(16) }],
  ["a field-set schema without its root", { ...coa, fieldSchema: potencyId }],
  [
    "a field-set root without its schema",
    { ...coa, fieldSetRoot: potencyRoot },
  ],
  [
    "an upper-case field-set root",
    { ...coa, fieldSchema: potencyId, fieldSetRoot: potencyRoot.toUpperCase() },
  ],
].map(([name, fields]) => ({ name, fields }));

writeFileSync(
  OUT,
  JSON.stringify(
    {
      about:
        'Document records: a permit, a certificate of analysis, a contract, a protocol, a transport document, sealed by the SHA-256 of each file (profile veilcore/profile/document/v1, SPEC 11.11; a draft until marked final). The fingerprint is computed exactly as for any record (SPEC 3.6.1 and 4.4): contentHash = SHA-256 of the canonical serialisation of fields; fingerprint = H("veilcore:v1:keyrecord", keyBinding, contentHash) when fields has keyBinding, else contentHash. The profile adds validation only: a record in `refusals` must be refused before it is sealed or stored. `appRecord` is the VeilCore site\'s own stored shape for the same record (informational). A record with fieldSchema and fieldSetRoot carries a field set (SPEC 4.5): its contentHash is H("veilcore:v1:frecord", fieldSetRoot, SHA-256 of the canonical serialisation), and its `fieldSet` gives the published schema, the stored numbers and the field secret that make the root (the holder\'s private copy, never sealed). Every document, issuer, reference, number and file fingerprint is test data.',
      source:
        "contract/scripts/document-vectors.mjs (node:crypto and veilcore-records canonicalise); regenerate, never edit by hand",
      profile: PROFILE,
      keys,
      records,
      refusals,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `${keys.length} keys, ${records.length} records, ${refusals.length} refusals`,
);
