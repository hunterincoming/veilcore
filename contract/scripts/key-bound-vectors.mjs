// Regenerate contract/vectors/key-bound-v1.json: records that name their own key
// (SPEC 3.6.1, docs/identity-in-record.md).
//   node contract/scripts/key-bound-vectors.mjs
// Written with node:crypto and the published canonicaliser only, so the three checkers it
// tests (bboard-ui veilcore/key-binding.ts, the registry's lineage/key-binding.mjs and
// conformance.mjs, and the registry's Python reference test/fixtures/key_binding_reference.py)
// are checked against something none of them computed. Copy the output to the registry's
// test/fixtures/key-bound-v1.json.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../bboard-ui/package.json', import.meta.url));
const { canonicalise } = await import(pathToFileURL(require.resolve('veilcore-records')).href);
const OUT = fileURLToPath(new URL('../vectors/key-bound-v1.json', import.meta.url));

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
const keys = [keyOf('11'.repeat(32)), keyOf('7a'.repeat(16) + '03'.repeat(16))];

const base = {
  breedingMethod: '',
  bredBy: 'Example Farm',
  dateCreated: '2026-10-14',
  loggedAt: 1760400000000,
  nonce: '5e'.repeat(32),
  notes: '',
  parents: [],
  photoFingerprints: [],
  refId: '',
  strainName: 'Harbour Mist',
  profile: 'veilcore/profile/plant-variety/v1',
};
const recordOf = (name, fields, bound) => {
  const contentHash = sha(canonicalise(fields));
  return {
    name,
    algorithm: bound ? 'sha256/key-bound/v1' : 'sha256/canonical-json/v1',
    fields,
    canonical: canonicalise(fields),
    contentHash,
    fingerprint: bound ? H('veilcore:v1:keyrecord', fields.keyBinding, contentHash) : contentHash,
  };
};
const records = [
  recordOf('an older record: no keyBinding, the fingerprint is the content hash', base, false),
  recordOf('a record naming key 0', { ...base, keyBinding: keys[0].keyBinding }, true),
  recordOf('the same details naming key 1', { ...base, keyBinding: keys[1].keyBinding }, true),
  recordOf(
    'parents, photos, taxon and key 1',
    {
      ...base,
      parents: [{ name: 'Seed parent' }],
      photoFingerprints: ['ab'.repeat(32)],
      taxon: 'Solanum lycopersicum',
      keyBinding: keys[1].keyBinding,
    },
    true,
  ),
];

const bound0 = records[1];
const bound1 = records[2];
const check = (name, identity, rec, keySalt, contentHash, matches) => ({
  name,
  identity,
  fingerprint: rec.fingerprint,
  keySalt,
  contentHash,
  matches,
});
const checks = [
  check('the record’s own key', keys[0].identity, bound0, keys[0].keySalt, bound0.contentHash, true),
  check('another record’s own key', keys[1].identity, bound1, keys[1].keySalt, bound1.contentHash, true),
  check('a key the holder controls, put next to someone else’s record (chain= swapped)', keys[1].identity, bound0, keys[0].keySalt, bound0.contentHash, false),
  check('swapped key and its own salt', keys[1].identity, bound0, keys[1].keySalt, bound0.contentHash, false),
  check('the wrong salt', keys[0].identity, bound0, keys[1].keySalt, bound0.contentHash, false),
  check('another record’s content hash', keys[0].identity, bound0, keys[0].keySalt, bound1.contentHash, false),
  check('an older record (nothing to match)', keys[0].identity, records[0], keys[0].keySalt, records[0].contentHash, false),
  check('an upper-case key', keys[0].identity.toUpperCase(), bound0, keys[0].keySalt, bound0.contentHash, false),
  check('a short salt', keys[0].identity, bound0, keys[0].keySalt.slice(2), bound0.contentHash, false),
];

const refusals = [
  ['an upper-case keyBinding', keys[0].keyBinding.toUpperCase()],
  ['a short keyBinding', keys[0].keyBinding.slice(2)],
  ['a 0x keyBinding', '0x' + keys[0].keyBinding.slice(2)],
  ['a null keyBinding', null],
  ['a numeric keyBinding', 5],
].map(([name, keyBinding]) => ({ name, fields: { ...base, keyBinding } }));

writeFileSync(
  OUT,
  JSON.stringify(
    {
      about:
        'Records that name their own key (SPEC 3.6.1). H(tag, a, b, ...) is SHA-256 over the tag in UTF-8 right-padded with zero bytes to 32, then each 32-byte piece. identity = H("veilcore:v1:commit", recordSecret); keySalt = H("veilcore:v1:keysalt", recordSecret); keyBinding = H("veilcore:v1:keybind", identity, keySalt); contentHash = SHA-256 of the canonical serialisation of fields (keyBinding included); fingerprint = H("veilcore:v1:keyrecord", keyBinding, contentHash), or contentHash when fields has no keyBinding. A check matches when the fingerprint recomputed from identity, keySalt and contentHash equals the fingerprint; inputs are 64 lowercase hex characters, anything else does not match. A record whose keyBinding is present but not 64 lowercase hex is refused.',
      source: 'contract/scripts/key-bound-vectors.mjs (node:crypto and veilcore-records canonicalise); regenerate, never edit by hand',
      keys,
      records,
      checks,
      refusals,
    },
    null,
    2,
  ) + '\n',
);
console.log(`${keys.length} keys, ${records.length} records, ${checks.length} checks, ${refusals.length} refusals`);
