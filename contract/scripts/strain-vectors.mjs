// Regenerate contract/vectors/strain-v1.json: records sealed under the strain profile,
// veilcore/profile/strain/v1 (docs/strain-profile.md, SPEC 11.9; a draft until marked final).
//   node contract/scripts/strain-vectors.mjs
// Written with node:crypto and the published canonicaliser only, so the checkers it tests
// (bboard-ui veilcore/strain-profile.ts and commitment.ts, the registry's
// lineage/strain-profile.mjs and conformance.mjs) are checked against something none of them
// computed. The fingerprint rules are SPEC 3.6.1 and 4.4, unchanged: the profile only says
// which fields are sealed. Copy the output to the registry's test/fixtures/ and the SDK's
// conformance/ (both byte for byte).
//
// Every record here is test data: made-up strains, names, designations and deposit numbers.
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
  new URL("../vectors/strain-v1.json", import.meta.url),
);

const PROFILE = "veilcore/profile/strain/v1";
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
const yeast = {
  deposits: ["NBRC 99999 (test data)"],
  designation: "QY-0012",
  generation: "M2",
  group: "yeast",
  loggedAt: 1761100000000,
  madeOn: "2026-09-30",
  maker: "Example Lab (test data)",
  method: "neutron irradiation",
  name: "Practice Yeast One",
  nonce: "7e".repeat(32),
  notes: "Test data, not a real strain.",
  parents: [{ deposit: "NBRC 99998 (test data)", name: "Practice Wild Type" }],
  photoFingerprints: ["cd".repeat(32)],
  profile: PROFILE,
  species: "Saccharomyces cerevisiae",
};

/** The site's stored shape for the same record (bboard-ui veilcore/records.ts). */
const appRecordOf = (f) => ({
  profile: f.profile,
  strainName: f.name,
  bredBy: f.maker,
  dateCreated: f.madeOn,
  notes: f.notes,
  loggedAt: f.loggedAt,
  nonce: f.nonce,
  ...(f.keyBinding !== undefined ? { keyBinding: f.keyBinding } : {}),
  taxon: f.species,
  refId: f.designation,
  breedingMethod: f.method,
  parents: f.parents.map((p) => ({
    ...(p.recordId !== undefined ? { recordId: p.recordId } : {}),
    name: p.name,
    individualId: p.deposit,
  })),
  photoFingerprints: f.photoFingerprints,
  strain: { group: f.group, deposits: f.deposits, generation: f.generation },
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
    "a neutron-irradiated yeast mutant with its wild-type parent typed in, naming key 0",
    {
      ...yeast,
      keyBinding: keys[0].keyBinding,
    },
  ),
  recordOf(
    "the same yeast sealed without a key (a registry that does not bind keys)",
    yeast,
  ),
  recordOf(
    "a designation and no name, no deposits, no parents, nothing optional stated, naming key 1",
    {
      ...yeast,
      name: "",
      deposits: [],
      generation: "",
      madeOn: "",
      method: "",
      notes: "",
      parents: [],
      photoFingerprints: [],
      group: "bacterium",
      species: "Lactobacillus plantarum",
      keyBinding: keys[1].keyBinding,
    },
  ),
  recordOf(
    "a cell line with two deposits and a parent linked to a logged record",
    {
      ...yeast,
      group: "cell-line",
      species: "Bos taurus",
      name: "Practice Cell Line",
      deposits: ["RCB 99999 (test data)", "CVCL_TEST (test data)"],
      method: "subculture",
      generation: "P12",
      parents: [
        {
          deposit: "",
          name: "Practice Parent Line",
          recordId: "VEIL-00000000000000000000000000000021",
        },
      ],
      keyBinding: keys[0].keyBinding,
    },
  ),
  recordOf(
    "an insect line from a cross (two parents), Japanese text, notes over two lines",
    {
      ...yeast,
      group: "insect",
      species: "Gryllus bimaculatus",
      name: "フタホシコオロギ 練習系統",
      deposits: [],
      method: "crossing",
      generation: "F3",
      parents: [
        { deposit: "", name: "Practice Line A" },
        { deposit: "", name: "Practice Line B" },
      ],
      notes: "Line one.\nLine two.",
      keyBinding: keys[1].keyBinding,
    },
  ),
];

const without = (o, k) => {
  const c = { ...o };
  delete c[k];
  return c;
};
const parent = yeast.parents[0];
// Each must be refused: by a validator of the profile, before anything is sealed.
const refusals = [
  ["a missing group", without(yeast, "group")],
  ["a group not in the list", { ...yeast, group: "plant" }],
  ["a missing deposits list", without(yeast, "deposits")],
  ["deposits that are not a list", { ...yeast, deposits: "NBRC 99999" }],
  [
    "nine deposits",
    { ...yeast, deposits: Array.from({ length: 9 }, (_, i) => `TEST ${i}`) },
  ],
  ["an empty deposit", { ...yeast, deposits: [""] }],
  ["the same deposit twice", { ...yeast, deposits: ["NBRC 1", "NBRC 1"] }],
  [
    "a deposit with a space at the end",
    { ...yeast, deposits: ["NBRC 99999 "] },
  ],
  ["a made-on date that is not a date", { ...yeast, madeOn: "2026-02-30" }],
  ["a made-on date in another form", { ...yeast, madeOn: "30/09/2026" }],
  ["neither a name nor a designation", { ...yeast, name: "", designation: "" }],
  ["a line break in the name", { ...yeast, name: "Practice\nYeast" }],
  ["an empty species", { ...yeast, species: "" }],
  ["an empty maker", { ...yeast, maker: "" }],
  [
    "a plant field (strainName) in a strain record",
    { ...yeast, strainName: "Practice Yeast One" },
  ],
  ["an animal field (sex) in a strain record", { ...yeast, sex: "unknown" }],
  [
    "the plant profile",
    { ...yeast, profile: "veilcore/profile/plant-variety/v1" },
  ],
  ["three parents", { ...yeast, parents: [parent, parent, parent] }],
  [
    "a parent with a role",
    { ...yeast, parents: [{ ...parent, role: "sire" }] },
  ],
  [
    "a parent with nothing to name it",
    { ...yeast, parents: [{ deposit: "", name: "" }] },
  ],
  [
    "a parent with no deposit field",
    { ...yeast, parents: [{ name: "Practice Wild Type" }] },
  ],
  [
    "an upper-case photo fingerprint",
    { ...yeast, photoFingerprints: ["CD".repeat(32)] },
  ],
  [
    "an upper-case keyBinding",
    { ...yeast, keyBinding: keys[0].keyBinding.toUpperCase() },
  ],
  [
    "a clock that is not a whole number",
    { ...yeast, loggedAt: 1761100000000.5 },
  ],
  ["a short nonce", { ...yeast, nonce: "7e".repeat(16) }],
].map(([name, fields]) => ({ name, fields }));

writeFileSync(
  OUT,
  JSON.stringify(
    {
      about:
        'Strain and line records: microbial strains, cell lines, insect lines (profile veilcore/profile/strain/v1, SPEC 11.9; a draft until marked final). The fingerprint is computed exactly as for any record (SPEC 3.6.1 and 4.4): contentHash = SHA-256 of the canonical serialisation of fields; fingerprint = H("veilcore:v1:keyrecord", keyBinding, contentHash) when fields has keyBinding, else contentHash. The profile adds validation only: a record in `refusals` must be refused before it is sealed or stored. `appRecord` is the VeilCore site\'s own stored shape for the same record (informational). All strains, names, designations and deposit numbers are test data.',
      source:
        "contract/scripts/strain-vectors.mjs (node:crypto and veilcore-records canonicalise); regenerate, never edit by hand",
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
