// The proof server contract v2 needs: 9.0.2, pinned by digest in ONE place,
// bboard-cli/proof-server-v2.yml. On 9.0.0 and 9.0.1, proving a claims circuit (the Jubjub one,
// proveAttested) can crash the proof server.
//
//   node scripts/v2/proof-server.mjs pin sha256:<64 hex>   write the digest into the file
//   node scripts/v2/proof-server.mjs show                  print what the file pins, or what is wrong
//
// The digest comes from the maintainer's Mac (docs/runbooks/deploy-v2.md, step 8):
//   docker pull midnightntwrk/proof-server:9.0.2
//   docker inspect --format '{{index .RepoDigests 0}}' midnightntwrk/proof-server:9.0.2
// A digest is public (it names an image, it unlocks nothing).
//
// Two checks follow from it, before any v2 tool asks for a wallet:
//   - the tool starts the proof server from that file, so Docker runs exactly the pinned image;
//   - the running server is asked its version (GET /version) and must say 9.0.2.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const V2_PROOF_SERVER_TAG = '9.0.2';
export const V2_PROOF_SERVER_FILE_NAME = 'proof-server-v2.yml';
export const V2_PROOF_SERVER_FILE = path.join(ROOT, 'bboard-cli', V2_PROOF_SERVER_FILE_NAME);
const PLACEHOLDER = 'FILL-IN-THE-9.0.2-DIGEST';
const IMAGE_LINE = /^(\s*image:\s*)midnightntwrk\/proof-server:([0-9][0-9.]*)(?:@sha256:(\S+))?\s*$/m;

/** What the file pins: { tag, digest } (digest undefined until it is filled in), or undefined. */
export const readPin = (yml) => {
  const m = IMAGE_LINE.exec(yml);
  if (m === null) return undefined;
  const d = m[3];
  return { tag: m[2], digest: d !== undefined && /^[0-9a-f]{64}$/.test(d) ? d : undefined, pinned: d !== undefined, filled: d !== undefined && d !== PLACEHOLDER };
};

/** Why the v2 proof server cannot be used; empty when the file pins 9.0.2 by a digest. */
export const pinProblems = (yml) => {
  const pin = readPin(yml);
  if (pin === undefined) return [`bboard-cli/${V2_PROOF_SERVER_FILE_NAME} names no proof-server image.`];
  const p = [];
  if (pin.tag !== V2_PROOF_SERVER_TAG)
    p.push(`The v2 proof server is ${pin.tag}; contract v2 needs ${V2_PROOF_SERVER_TAG} (claims proofs can crash on 9.0.0 and 9.0.1).`);
  if (!pin.pinned) p.push('The proof-server image is not pinned by its digest (@sha256:...).');
  else if (!pin.filled)
    p.push(
      `The proof server ${V2_PROOF_SERVER_TAG} digest is not filled in yet (bboard-cli/${V2_PROOF_SERVER_FILE_NAME}). ` +
        'Get it with docker on the Mac and pin it: docs/runbooks/deploy-v2.md, step 8.',
    );
  else if (pin.digest === undefined) p.push(`The digest in bboard-cli/${V2_PROOF_SERVER_FILE_NAME} is not 64 hex characters.`);
  return p;
};

/** The file's problems, read from disk. */
export const filePinProblems = (file = V2_PROOF_SERVER_FILE) => {
  let yml;
  try {
    yml = readFileSync(file, 'utf8');
  } catch {
    return [`${file} is missing.`];
  }
  return pinProblems(yml);
};

/** The file with `digest` pinned in it. Throws on anything but `sha256:` and 64 lowercase hex. */
export const withDigest = (yml, digest) => {
  const d = String(digest).trim().replace(/^midnightntwrk\/proof-server@/, '');
  const m = /^sha256:([0-9a-f]{64})$/.exec(d);
  if (m === null)
    throw new Error(
      'That is not a digest. It looks like sha256: and 64 characters 0-9 a-f, as the docker inspect line prints it ' +
        '(the part after the @). Nothing was written.',
    );
  if (!IMAGE_LINE.test(yml)) throw new Error('The file has no proof-server image line. Nothing was written.');
  return yml.replace(IMAGE_LINE, `$1midnightntwrk/proof-server:${V2_PROOF_SERVER_TAG}@sha256:${m[1]}`);
};

/**
 * Why the answer to GET /version is not 9.0.2; empty when it is. The proof server answers with
 * its version as plain text; anything that names another version, or none, is refused.
 */
export const versionProblems = (text) => {
  const versions = String(text).match(/\d+\.\d+\.\d+/g) ?? [];
  if (versions.length === 0) return [`The proof server did not say its version (it answered "${String(text).slice(0, 60)}").`];
  if (versions.some((v) => v !== V2_PROOF_SERVER_TAG))
    return [`The proof server says it is ${versions.join(', ')}; contract v2 needs ${V2_PROOF_SERVER_TAG}. Nothing was sent.`];
  return [];
};

/** Ask a running proof server its version; problems in plain words, empty when it is 9.0.2. */
export const checkRunningProofServer = async (url, fetchImpl = fetch) => {
  let res;
  try {
    res = await fetchImpl(new URL('/version', url), { signal: AbortSignal.timeout(15_000) });
  } catch (e) {
    return [`Could not ask the proof server its version (${e instanceof Error ? e.message : String(e)}). Nothing was sent.`];
  }
  if (!res.ok) return [`The proof server answered HTTP ${res.status} when asked its version. Nothing was sent.`];
  return versionProblems(await res.text());
};

const main = (argv) => {
  const [cmd, value] = argv;
  if (cmd === 'pin') {
    const next = withDigest(readFileSync(V2_PROOF_SERVER_FILE, 'utf8'), value ?? '');
    writeFileSync(V2_PROOF_SERVER_FILE, next);
    const p = pinProblems(next);
    if (p.length > 0) throw new Error(p.join(' '));
    console.log(`Pinned: midnightntwrk/proof-server:${V2_PROOF_SERVER_TAG}@${value.trim().replace(/^.*@/, '')}`);
    console.log(`in bboard-cli/${V2_PROOF_SERVER_FILE_NAME}. Commit that one file (docs/runbooks/deploy-v2.md, step 8).`);
    return 0;
  }
  if (cmd === 'show') {
    const p = filePinProblems();
    if (p.length > 0) {
      for (const l of p) console.log(l);
      return 1;
    }
    const pin = readPin(readFileSync(V2_PROOF_SERVER_FILE, 'utf8'));
    console.log(`proof server OK: midnightntwrk/proof-server:${pin.tag}@sha256:${pin.digest}`);
    return 0;
  }
  console.log('Usage: node scripts/v2/proof-server.mjs pin sha256:<64 hex> | show');
  return 2;
};

const invoked = () => {
  try {
    return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
  } catch {
    return false;
  }
};
if (invoked()) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
