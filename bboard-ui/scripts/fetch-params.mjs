// Download the public proving parameters the browser prover needs (k=13 to k=16: the main
// contract's circuits, and the claims contract's proveValue and proveRange) into public/params, so the site serves
// them itself: the page's security policy allows only its own origin for these, and the
// site does not depend on a third-party host at proving time.
//
// The files are public and the same for everyone. They come from srs.midnight.network,
// the host Midnight's own proof server uses by default, and each one is checked against
// the SHA-256 pinned in params.sha256.json before it is used: a file that does not match
// is deleted and the script stops. The pins are copied from Midnight's proof server source
// (midnight-ledger, base-crypto/src/data_provider.rs, EXPECTED_DATA), which checks every
// file the same way. Midnight's browser prover (wallet-sdk-prover-client) fetches the same
// files from a development bucket and checks nothing, which is why the site serves its own.
//
// Usage:
//   node scripts/fetch-params.mjs           download what is missing, check every file
//   node scripts/fetch-params.mjs --pin     record the SHA-256 of a file with no pin yet
//                                           (only for a new k; k=13 to k=16 are pinned)
//
// Not kept in git (public/params is ignored): run this before `npm run build` for a build
// with VITE_REAL_CHAIN=1.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Tried in order. The pin decides whether a file is good, not the host it came from, so a
// second host is only a fallback for availability (the development bucket is the one
// Midnight's browser prover uses).
const SOURCES = ['https://srs.midnight.network', 'https://midnight-s3-fileshare-dev-eu-west-1.s3.eu-west-1.amazonaws.com'];
// 15 and 16: the claims contract's proveValue and proveRange (docs/claims-screen.md).
const K = [13, 14, 15, 16];
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'public', 'params');
const pinsFile = join(here, 'params.sha256.json');
const pinning = process.argv.includes('--pin');

const pins = existsSync(pinsFile) ? JSON.parse(readFileSync(pinsFile, 'utf8')) : {};
mkdirSync(out, { recursive: true });
const sha = (b) => createHash('sha256').update(b).digest('hex');

let changed = false;
for (const k of K) {
  const name = `bls_midnight_2p${k}`;
  const file = join(out, name);
  let bytes;
  if (existsSync(file)) bytes = readFileSync(file);
  else {
    const tried = [];
    for (const source of SOURCES) {
      try {
        const res = await fetch(`${source}/${name}`);
        if (!res.ok) { tried.push(`${source} answered ${res.status}`); continue; }
        bytes = new Uint8Array(await res.arrayBuffer());
        console.log(`k=${k}: downloaded from ${source}`);
        break;
      } catch (e) {
        tried.push(`${source}: ${e?.cause?.code ?? e?.message ?? e}`);
      }
    }
    if (!bytes) throw new Error(`k=${k}: could not download ${name} (${tried.join('; ')})`);
    writeFileSync(file, bytes);
  }
  const got = sha(bytes);
  const want = pins[name];
  if (want === undefined) {
    if (!pinning) {
      rmSync(file, { force: true });
      throw new Error(
        `k=${k}: no pinned SHA-256 for ${name} in scripts/params.sha256.json. Copy it from Midnight's ` +
          'base-crypto/src/data_provider.rs (EXPECTED_DATA), or run once with --pin and compare with that file.',
      );
    }
    pins[name] = got;
    changed = true;
    console.log(`k=${k}: pinned ${got} (${bytes.length} bytes)`);
  } else if (got !== want) {
    rmSync(file, { force: true });
    throw new Error(`k=${k}: ${name} has SHA-256 ${got}, not the pinned ${want}. Deleted; nothing was built.`);
  } else console.log(`k=${k}: ${bytes.length} bytes, SHA-256 matches the pin`);
}
if (changed) writeFileSync(pinsFile, JSON.stringify(pins, null, 2) + '\n');
console.log(`Saved in ${out}. They are copied into dist/params by the build.`);
