// The client stack a contract v2 deploy must run on (docs/contract-v2.md, Stage A step 6; the
// support matrix for Ledger 9): midnight-js 5.0.1, ledger-v9 1.0.2, on-chain runtime 4.0.2, and
// the proof server 9.0.2 pinned by digest. On 9.0.0 or 9.0.1, proving a claims circuit can crash.
//
// The repository moves to that stack in its own PR (chore/ledger9-client). Until it is merged,
// this check refuses the deploy and says so; this branch changes no package version, so the two
// never fight. Once it is merged the check passes with nothing else to change.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { ROOT } from './fingerprints.mjs';

export const REQUIRED = {
  '@midnight-ntwrk/midnight-js-contracts': '5.0.1',
  '@midnight-ntwrk/midnight-js-types': '5.0.1',
  '@midnight-ntwrk/midnight-js-protocol': '5.0.1',
  '@midnightntwrk/ledger-v9': '1.0.2',
  'ledger-v9-committee': '1.0.2',
  '@midnightntwrk/onchain-runtime-v4': '4.0.2',
};
export const PROOF_SERVER_TAG = '9.0.2';
/** The proof-server file every v2 send starts (committee.ts and deploy-v2.ts both use the mainnet one). */
export const PROOF_SERVER_FILE = path.join(ROOT, 'bboard-cli', 'proof-server-mainnet.yml');

/** The installed version of a package, as the root of the repository resolves it, or undefined. */
export const installedVersion = (pkg, root = ROOT) => {
  try {
    const req = createRequire(path.join(root, 'package.json'));
    const dir = path.dirname(req.resolve(`${pkg}/package.json`));
    return JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')).version;
  } catch {
    try {
      return JSON.parse(readFileSync(path.join(root, 'node_modules', pkg, 'package.json'), 'utf8')).version;
    } catch {
      return undefined;
    }
  }
};

/** The proof-server image line of a compose file: { tag, digest } or undefined. */
export const proofServerImage = (yml) => {
  const m = /image:\s*midnightntwrk\/proof-server:([0-9][0-9.]*)(?:@sha256:([0-9a-f]{64}))?\s*$/m.exec(yml);
  return m ? { tag: m[1], digest: m[2] } : undefined;
};

/** Why this checkout cannot deploy v2 yet; empty when the stack is right. */
export const stackProblems = ({ version = installedVersion, yml = () => readFileSync(PROOF_SERVER_FILE, 'utf8') } = {}) => {
  const p = [];
  for (const [pkg, want] of Object.entries(REQUIRED)) {
    const have = version(pkg);
    if (have !== want) p.push(`${pkg} is ${have ?? 'not installed'}; contract v2 needs ${want}.`);
  }
  let img;
  try {
    img = proofServerImage(yml());
  } catch {
    img = undefined;
  }
  if (img === undefined) p.push('bboard-cli/proof-server-mainnet.yml names no proof-server image.');
  else {
    if (img.tag !== PROOF_SERVER_TAG) p.push(`The proof server is ${img.tag}; contract v2 needs ${PROOF_SERVER_TAG} (claims proofs can crash on 9.0.0 and 9.0.1).`);
    if (img.digest === undefined) p.push('The proof-server image is not pinned by its digest (@sha256:...).');
  }
  if (p.length > 0)
    p.push(
      'This is the client patch (PR "Client patch: Midnight 17 Nov tools", branch chore/ledger9-client). Merge it, ' +
        'with the proof server at 9.0.2 by digest, then `git pull` and `npm ci`. Nothing was read, built or sent.',
    );
  return p;
};
