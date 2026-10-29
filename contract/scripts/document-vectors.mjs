// Regenerate contract/vectors/document-v1.json: records sealed under the document profile,
// veilcore/profile/document/v1 (docs/document-profile.md, SPEC 11.10; a draft until marked final).
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
import { writeFileSync } from "node:fs";
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
  refId: f.reference,
  parents: [],
  photoFingerprints: [],
  document: { type: f.type, issuer: f.issuer, files: f.files, about: f.about },
});

const recordOf = (name, fields) => {
  const canonical = canonicalise(fields);
  const contentHash = sha(canonical);
  const bound = fields.keyBinding !== undefined;
  return {
    name,
    algorithm: bound ? "sha256/key-bound/v1" : "sha256/canonical-json/v1",
    appRecord: appRecordOf(fields),
    fields,
    canonical,
    contentHash,
    fingerprint: bound
      ? H("veilcore:v1:keyrecord", fields.keyBinding, contentHash)
      : contentHash,
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
].map(([name, fields]) => ({ name, fields }));

writeFileSync(
  OUT,
  JSON.stringify(
    {
      about:
        'Document records: a permit, a certificate of analysis, a contract, a protocol, a transport document, sealed by the SHA-256 of each file (profile veilcore/profile/document/v1, SPEC 11.10; a draft until marked final). The fingerprint is computed exactly as for any record (SPEC 3.6.1 and 4.4): contentHash = SHA-256 of the canonical serialisation of fields; fingerprint = H("veilcore:v1:keyrecord", keyBinding, contentHash) when fields has keyBinding, else contentHash. The profile adds validation only: a record in `refusals` must be refused before it is sealed or stored. `appRecord` is the VeilCore site\'s own stored shape for the same record (informational). Every document, issuer, reference and file fingerprint is test data.',
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
