// The proof server contract v2 needs: 9.0.2, pinned by digest in ONE place,
// bboard-cli/proof-server-v2.yml. On 9.0.0 and 9.0.1, proving a claims circuit (the Jubjub one,
// proveAttested) can crash the proof server. The proof server sees every private witness of
// every call (record, recovery and licence secrets), so the image is pinned only when two
// sources agree, as the 9.0.1 and 8.1.3 pins were:
//
//   1. the digest Docker pulled on the maintainer's Mac:
//        docker pull midnightntwrk/proof-server:9.0.2
//        docker inspect --format '{{index .RepoDigests 0}}' midnightntwrk/proof-server:9.0.2
//   2. the digest Midnight published in its GitHub release, midnightntwrk/midnight-ledger, tag
//      proof-server-9.0.2 (https://github.com/midnightntwrk/midnight-ledger/releases/tag/proof-server-9.0.2).
//
//   node scripts/v2/proof-server.mjs pin "<the docker inspect line>" [--release-json FILE]
//        reads the release (from api.github.com, or from FILE: the same JSON saved with curl),
//        and writes the digest into the file ONLY if the release is the published, non-pre-release
//        proof-server-9.0.2 and names exactly that digest. Otherwise it writes nothing.
//   node scripts/v2/proof-server.mjs show
//        print what the file pins, or what is wrong
//   node scripts/v2/proof-server.mjs verify
//        CI's independent re-check: fetch the release itself and fail unless it backs the pin
//
// A digest is public (it names an image, it unlocks nothing). Docs: docs/runbooks/deploy-v2.md, step 8.
//
// Two checks follow from the pin, before any v2 tool asks for a wallet:
//   - the tool starts the proof server from that file, so Docker runs exactly the pinned image;
//   - the running server is asked its version (GET /version) and must say exactly 9.0.2.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const V2_PROOF_SERVER_TAG = '9.0.2';
export const V2_PROOF_SERVER_FILE_NAME = 'proof-server-v2.yml';
export const V2_PROOF_SERVER_FILE = path.join(ROOT, 'bboard-cli', V2_PROOF_SERVER_FILE_NAME);
export const V2_RELEASE_TAG = `proof-server-${V2_PROOF_SERVER_TAG}`;
export const V2_RELEASE_API = `https://api.github.com/repos/midnightntwrk/midnight-ledger/releases/tags/${V2_RELEASE_TAG}`;
export const V2_RELEASE_PAGE = `https://github.com/midnightntwrk/midnight-ledger/releases/tag/${V2_RELEASE_TAG}`;
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

/** The digest in a `docker inspect` line, `sha256:<64 hex>` or the whole line; undefined if it is not one. */
export const digestOf = (line) => /^(?:midnightntwrk\/proof-server@)?(sha256:[0-9a-f]{64})$/.exec(String(line).trim())?.[1];

const IMAGE = String.raw`(?<![A-Za-z0-9._/-])(?:docker\.io/)?midnightntwrk/proof-server`;
/** `midnightntwrk/proof-server:9.0.2@sha256:<hex>`: the tag and the digest in one reference. */
const TAGGED_DIGEST = new RegExp(String.raw`${IMAGE}:9\.0\.2@(sha256:[0-9a-f]{64})(?![0-9a-f])`, 'g');
/**
 * Midnight's own release format (proof-server-9.0.1 and -9.0.2):
 *
 *   Image: `ghcr.io/midnight-ntwrk/proof-server:9.0.2` (also `docker.io/midnightntwrk/proof-server:9.0.2`)
 *   Digest: `sha256:<64 hex>`
 *
 * The WHOLE "Image:" line must be one of these exact forms (H is the Docker Hub image,
 * `midnightntwrk/proof-server:9.0.2` with or without `docker.io/`; G is Midnight's ghcr.io mirror,
 * `ghcr.io/midnight-ntwrk/proof-server:9.0.2`):
 *
 *   Image: H        Image: `H`        Image: `G` (also `H`)
 *
 * Anything else on the line (another image, a lookalike character, a reference with no tag, more
 * words) makes it not an Image line. The IMMEDIATELY following line must be exactly
 * "Digest: sha256:<64 hex>", with or without backticks around the digest.
 */
const HUB = String.raw`(?:docker\.io/)?midnightntwrk/proof-server:9\.0\.2`;
const GHCR = String.raw`ghcr\.io/midnight-ntwrk/proof-server:9\.0\.2`;
const IMAGE_LINE_9_0_2 = new RegExp(String.raw`^Image: (?:${HUB}|\x60${HUB}\x60|\x60${GHCR}\x60 \(also \x60${HUB}\x60\))$`);
const DIGEST_LINE = /^Digest: (?:(sha256:[0-9a-f]{64})|`(sha256:[0-9a-f]{64})`)$/;

/** Whether `line` is, as a whole, Midnight's "Image:" line for exactly 9.0.2 of the Docker Hub image. */
const isImageLine9_0_2 = (line) => IMAGE_LINE_9_0_2.test(line.replace(/\s+$/, ''));

/**
 * The digests a release text ties to `midnightntwrk/proof-server:9.0.2`, and only those:
 *   - Midnight's "Image:" line, then a "Digest:" line straight after it (above);
 *   - one reference with the tag and the digest (`midnightntwrk/proof-server:9.0.2@sha256:...`).
 * A bare `sha256:` anywhere else in the text is not one. More than one distinct digest is
 * returned as found, and refused by releaseProblems.
 */
export const releaseDigests = (body) => {
  const found = new Set();
  const lines = String(body ?? '').split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of line.matchAll(TAGGED_DIGEST)) found.add(m[1]);
    if (isImageLine9_0_2(line) && i + 1 < lines.length) {
      const d = DIGEST_LINE.exec(lines[i + 1].replace(/\s+$/, ''));
      if (d !== null) found.add(d[1] ?? d[2]);
    }
  });
  return [...found];
};

/**
 * Why `release` (the GitHub API's JSON for midnight-ledger's proof-server-9.0.2 release) does not
 * back `digest`; empty when it does. It must be that repository's release with that tag (by its
 * own URLs), say outright that it is neither a draft nor a pre-release, and tie exactly this
 * digest to midnightntwrk/proof-server:9.0.2. Anything missing is a refusal.
 */
export const releaseProblems = (release, digest) => {
  const stop = 'Nothing was written. Do not pin this image.';
  if (digestOf(digest) === undefined) return [`That is not a docker inspect digest line (sha256: and 64 characters 0-9 a-f). ${stop}`];
  if (release === null || typeof release !== 'object' || typeof release.tag_name !== 'string')
    return [`That is not a GitHub release (${V2_RELEASE_PAGE}). ${stop}`];
  if (release.tag_name !== V2_RELEASE_TAG) return [`The release is ${release.tag_name}, not ${V2_RELEASE_TAG}. ${stop}`];
  if (release.html_url !== V2_RELEASE_PAGE)
    return [`The release's page is ${String(release.html_url)}, not ${V2_RELEASE_PAGE}. ${stop}`];
  if (typeof release.url !== 'string' || !/^https:\/\/api\.github\.com\/repos\/midnightntwrk\/midnight-ledger\/releases\/\d+$/.test(release.url))
    return [`The release is not one of midnightntwrk/midnight-ledger's (${String(release.url)}). ${stop}`];
  if (release.draft !== false || release.prerelease !== false)
    return [`${V2_RELEASE_TAG} does not say it is a published, final release (draft: ${String(release.draft)}, pre-release: ${String(release.prerelease)}). ${stop}`];
  const listed = releaseDigests(release.body);
  if (listed.length === 0)
    return [
      `Midnight's ${V2_RELEASE_TAG} release names no digest for midnightntwrk/proof-server:9.0.2 (${V2_RELEASE_PAGE}). ` +
        `${stop} Ask Midnight for it first.`,
    ];
  if (listed.length > 1)
    return [
      `Midnight's ${V2_RELEASE_TAG} release names more than one digest for midnightntwrk/proof-server:9.0.2 ` +
        `(${listed.join(', ')}). ${stop} Send it to the team.`,
    ];
  if (!listed.includes(digestOf(digest)))
    return [
      `The digest Docker pulled (${digestOf(digest)}) is not the one Midnight published for midnightntwrk/proof-server:9.0.2 ` +
        `(${listed.join(', ')}). ${stop} Send both lines to the team.`,
    ];
  return [];
};

/**
 * The independent re-check CI runs whenever the pin changes: the digest in `yml` against the
 * release fetched by CI itself. Empty when it matches, or when the file still holds the
 * placeholder (then every v2 tool refuses to start, so there is nothing to vouch for).
 */
export const verifyPin = (yml, release) => {
  const pin = readPin(yml);
  if (pin === undefined) return [`bboard-cli/${V2_PROOF_SERVER_FILE_NAME} names no proof-server image.`];
  if (pin.pinned && !pin.filled && pin.tag === V2_PROOF_SERVER_TAG) return [];
  const p = pinProblems(yml);
  if (p.length > 0) return p;
  return releaseProblems(release, `sha256:${pin.digest}`);
};

/**
 * Why the answer to GET /version is not 9.0.2; empty when it is. The proof server answers with
 * its version as plain text; anything that names another version, a pre-release or build of it
 * (9.0.2-rc1, 9.0.2+abc), or no version, is refused.
 */
export const versionProblems = (text) => {
  const versions = String(text).match(/\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?/g) ?? [];
  if (versions.length === 0) return [`The proof server did not say its version (it answered "${String(text).slice(0, 60)}").`];
  if (versions.some((v) => v !== V2_PROOF_SERVER_TAG))
    return [`The proof server says it is ${versions.join(', ')}; contract v2 needs exactly ${V2_PROOF_SERVER_TAG}. Nothing was sent.`];
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

/** The release JSON: from a file saved with curl, or fetched from api.github.com. */
export const readRelease = async (file, fetchImpl = fetch) => {
  if (file !== undefined) return JSON.parse(readFileSync(file, 'utf8'));
  let res;
  // In CI the job's read-only GITHUB_TOKEN lifts GitHub's limit for unsigned requests (60 an
  // hour, shared by every job on the runner's address), which otherwise fails this check at random.
  const token = process.env.GITHUB_TOKEN?.trim();
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'veilcore-proof-server-pin' };
  if (token) headers.authorization = `Bearer ${token}`;
  for (let attempt = 1; ; attempt++) {
    res = await fetchImpl(V2_RELEASE_API, {
      headers,
      signal: AbortSignal.timeout(20_000),
    });
    if (res.ok || attempt === 3 || res.status === 404 || res.status === 401) break;
    await new Promise((r) => setTimeout(r, 5_000 * attempt));
  }
  if (!res.ok)
    throw new Error(
      `GitHub answered HTTP ${res.status} for ${V2_RELEASE_API}. Nothing was written. A 401 means a GITHUB_TOKEN in this shell is stale: unset it and run this again. If it is a rate limit, save it with ` +
        `curl -s ${V2_RELEASE_API} -o ~/veilcore-v2/proof-server-9.0.2-release.json and add --release-json with that file.`,
    );
  return res.json();
};

/** Pin `line` in the file if the release backs it. Returns the lines to print; throws on any refusal. */
export const pin = async ({ line, release, file = V2_PROOF_SERVER_FILE }) => {
  const p = releaseProblems(release, line);
  if (p.length > 0) throw new Error(p.join(' '));
  const next = withDigest(readFileSync(file, 'utf8'), digestOf(line));
  const left = pinProblems(next);
  if (left.length > 0) throw new Error(left.join(' '));
  writeFileSync(file, next);
  return [
    `The digest Docker pulled is the one Midnight published in ${V2_RELEASE_TAG} (${V2_RELEASE_PAGE}).`,
    `Pinned: midnightntwrk/proof-server:${V2_PROOF_SERVER_TAG}@${digestOf(line)}`,
    `in bboard-cli/${V2_PROOF_SERVER_FILE_NAME}. Commit that one file (docs/runbooks/deploy-v2.md, step 8).`,
  ];
};

const main = async (argv) => {
  const [cmd, value, ...rest] = argv;
  if (cmd === 'pin') {
    let releaseFile;
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === '--release-json' && rest[i + 1] !== undefined) releaseFile = rest[++i];
      else throw new Error(`Unknown option ${rest[i]}. Nothing was written.`);
    }
    for (const l of await pin({ line: value ?? '', release: await readRelease(releaseFile) })) console.log(l);
    return 0;
  }
  if (cmd === 'verify') {
    // CI's independent re-check (.github/workflows/proof-server-pin.yaml).
    const yml = readFileSync(V2_PROOF_SERVER_FILE, 'utf8');
    const pinned = readPin(yml);
    if (pinned !== undefined && pinned.pinned && !pinned.filled) {
      console.log('Not pinned yet (the placeholder): every v2 tool refuses to start. Nothing to check.');
      return verifyPin(yml, undefined).length === 0 ? 0 : 1;
    }
    const p = verifyPin(yml, await readRelease(undefined));
    for (const l of p) console.log(l);
    if (p.length > 0) return 1;
    console.log(`OK: the pinned digest sha256:${pinned.digest} is the one Midnight published in ${V2_RELEASE_TAG}.`);
    return 0;
  }
  if (cmd === 'show') {
    const p = filePinProblems();
    if (p.length > 0) {
      for (const l of p) console.log(l);
      return 1;
    }
    const pinned = readPin(readFileSync(V2_PROOF_SERVER_FILE, 'utf8'));
    console.log(`proof server OK: midnightntwrk/proof-server:${pinned.tag}@sha256:${pinned.digest}`);
    return 0;
  }
  console.log('Usage: node scripts/v2/proof-server.mjs pin "<docker inspect line>" [--release-json FILE] | show | verify');
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
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e) => {
      console.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    },
  );
}
