// Regenerate contract/vectors/animal-individual-v1.json: records sealed under the animal
// profile, veilcore/profile/animal-individual/v1 (docs/animal-profile.md, SPEC 11.8, draft).
//   node contract/scripts/animal-individual-vectors.mjs
// Written with node:crypto and the published canonicaliser only, so the checkers it tests
// (bboard-ui veilcore/animal-profile.ts and commitment.ts, the registry's
// lineage/animal-profile.mjs and conformance.mjs, the SDK in TypeScript and Python, and the
// Rust implementation's record fingerprint) are checked against something none of them
// computed. The fingerprint rules are SPEC 3.6.1 and 4.4, unchanged: the profile only says
// which fields are sealed. Copy the output to the registry's test/fixtures/ and the SDK's
// conformance/ (both byte for byte).
//
// Every record here is test data: made-up animals, names, IDs and farms.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../bboard-ui/package.json', import.meta.url));
const { canonicalise } = await import(pathToFileURL(require.resolve('veilcore-records')).href);
const OUT = fileURLToPath(new URL('../vectors/animal-individual-v1.json', import.meta.url));

const PROFILE = 'veilcore/profile/animal-individual/v1';
const H = (tag, ...hex) => {
  const t = Buffer.alloc(32);
  t.write(tag, 'utf8');
  return createHash('sha256').update(Buffer.concat([t, ...hex.map((h) => Buffer.from(h, 'hex'))])).digest('hex');
};
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const keyOf = (recordSecret) => {
  const identity = H('veilcore:v1:commit', recordSecret);
  const keySalt = H('veilcore:v1:keysalt', recordSecret);
  return { recordSecret, identity, keySalt, keyBinding: H('veilcore:v1:keybind', identity, keySalt) };
};
const keys = [keyOf('a1'.repeat(32)), keyOf('0b'.repeat(16) + 'c4'.repeat(16))];

// The sealed fields of a full record (test data).
const cow = {
  breed: 'Japanese Black',
  breeder: 'Example Farm (test data)',
  dateOfBirth: '2024-03-15',
  herd: 'Test herd 7',
  idScheme: 'Japan cattle ID (10 digits)',
  individualId: '0000000017',
  loggedAt: 1760600000000,
  name: 'Practice Cow One',
  nonce: '6d'.repeat(32),
  notes: 'Test data, not a real animal.',
  parents: [
    { individualId: '0000000025', name: 'Practice Sire', role: 'sire' },
    { individualId: '0000000033', name: 'Practice Dam', role: 'dam' },
  ],
  photoFingerprints: ['cd'.repeat(32)],
  profile: PROFILE,
  sex: 'female',
  species: 'Cattle (Bos taurus)',
};

/** The site's stored shape for the same record (bboard-ui veilcore/records.ts). */
const appRecordOf = (f) => ({
  profile: f.profile,
  strainName: f.name,
  bredBy: f.breeder,
  dateCreated: f.dateOfBirth,
  notes: f.notes,
  loggedAt: f.loggedAt,
  nonce: f.nonce,
  ...(f.keyBinding !== undefined ? { keyBinding: f.keyBinding } : {}),
  taxon: f.species,
  refId: f.individualId,
  parents: f.parents.map((p) => ({
    ...(p.recordId !== undefined ? { recordId: p.recordId } : {}),
    name: p.name,
    role: p.role,
    individualId: p.individualId,
  })),
  photoFingerprints: f.photoFingerprints,
  animal: { breed: f.breed, idScheme: f.idScheme, sex: f.sex, herd: f.herd },
});

const recordOf = (name, fields) => {
  const canonical = canonicalise(fields);
  const contentHash = sha(canonical);
  const bound = fields.keyBinding !== undefined;
  return {
    name,
    algorithm: bound ? 'sha256/key-bound/v1' : 'sha256/canonical-json/v1',
    appRecord: appRecordOf(fields),
    fields,
    canonical,
    contentHash,
    fingerprint: bound ? H('veilcore:v1:keyrecord', fields.keyBinding, contentHash) : contentHash,
  };
};

const records = [
  recordOf('a cow with sire and dam typed in, naming key 0', { ...cow, keyBinding: keys[0].keyBinding }),
  recordOf('the same cow sealed without a key (a registry that does not bind keys)', cow),
  recordOf('an ID and no name, no parents, sex and date of birth not stated, naming key 1', {
    ...cow,
    name: '',
    breed: '黒毛和種',
    dateOfBirth: '',
    herd: '',
    sex: 'unknown',
    notes: '',
    parents: [],
    photoFingerprints: [],
    keyBinding: keys[1].keyBinding,
  }),
  recordOf('a name and no ID; the dam only, linked to a logged record', {
    ...cow,
    name: 'Practice Bull',
    individualId: '',
    idScheme: '',
    sex: 'male',
    parents: [{ individualId: '', name: 'Practice Cow One', recordId: 'VEIL-00000000000000000000000000000017', role: 'dam' }],
    keyBinding: keys[0].keyBinding,
  }),
  recordOf('a name with a decomposed accent (NFC before hashing) and notes over two lines', {
    ...cow,
    name: 'Practice Café',
    notes: 'Line one.\nLine two.',
    keyBinding: keys[1].keyBinding,
  }),
];

const without = (o, k) => {
  const c = { ...o };
  delete c[k];
  return c;
};
const sire = cow.parents[0];
const dam = cow.parents[1];
// Each must be refused: by a validator of the profile, before anything is sealed.
const refusals = [
  ['a missing sex', without(cow, 'sex')],
  ['sex not one of female, male, unknown', { ...cow, sex: 'cow' }],
  ['a date of birth that is not a date', { ...cow, dateOfBirth: '2025-02-30' }],
  ['a date of birth in another form', { ...cow, dateOfBirth: '15/03/2024' }],
  ['neither a name nor an individual ID', { ...cow, name: '', individualId: '', idScheme: '' }],
  ['an individual ID with no scheme', { ...cow, idScheme: '' }],
  ['a scheme with no individual ID', { ...cow, individualId: '' }],
  ['a line break in the name', { ...cow, name: 'Practice\nCow' }],
  ['a space at the end of the individual ID', { ...cow, individualId: '0000000017 ' }],
  ['an empty species', { ...cow, species: '' }],
  ['an empty breeder', { ...cow, breeder: '' }],
  ['a plant field (strainName) in an animal record', { ...cow, strainName: 'Practice Cow One' }],
  ['the plant profile', { ...cow, profile: 'veilcore/profile/plant-variety/v1' }],
  ['three parents', { ...cow, parents: [sire, dam, { ...dam, name: 'Another' }] }],
  ['two sires', { ...cow, parents: [sire, { ...sire, name: 'Another Sire' }] }],
  ['the dam before the sire', { ...cow, parents: [dam, sire] }],
  ['a parent role a plant uses', { ...cow, parents: [{ ...sire, role: 'seed-parent' }] }],
  ['a parent with nothing to name it', { ...cow, parents: [{ individualId: '', name: '', role: 'sire' }] }],
  ['a parent with an extra field', { ...cow, parents: [{ ...sire, verified: true }] }],
  ['a parent with no individualId field', { ...cow, parents: [{ name: 'Practice Sire', role: 'sire' }] }],
  ['an upper-case photo fingerprint', { ...cow, photoFingerprints: ['CD'.repeat(32)] }],
  ['an upper-case keyBinding', { ...cow, keyBinding: keys[0].keyBinding.toUpperCase() }],
  ['a clock that is not a whole number', { ...cow, loggedAt: 1760600000000.5 }],
  ['a short nonce', { ...cow, nonce: '6d'.repeat(16) }],
  ['notes that are not text', { ...cow, notes: 5 }],
].map(([name, fields]) => ({ name, fields }));

writeFileSync(
  OUT,
  JSON.stringify(
    {
      about:
        'Animal records (profile veilcore/profile/animal-individual/v1, SPEC 11.8, draft). The fingerprint is computed exactly as for any record (SPEC 3.6.1 and 4.4): contentHash = SHA-256 of the canonical serialisation of fields; fingerprint = H("veilcore:v1:keyrecord", keyBinding, contentHash) when fields has keyBinding, else contentHash. The profile adds validation only: a record in `refusals` must be refused before it is sealed or stored. `appRecord` is the VeilCore site\'s own stored shape for the same record (informational: an implementation that reads only `fields` can ignore it). All animals, names, IDs and farms are test data.',
      source: 'contract/scripts/animal-individual-vectors.mjs (node:crypto and veilcore-records canonicalise); regenerate, never edit by hand',
      profile: PROFILE,
      keys,
      records,
      refusals,
    },
    null,
    2,
  ) + '\n',
);
console.log(`${keys.length} keys, ${records.length} records, ${refusals.length} refusals`);
