// The client stack a contract v2 deploy must run on (docs/contract-v2.md, Stage A step 6; the
// support matrix for Ledger 9): midnight-js 5.0.1, ledger-v9 1.0.2, on-chain runtime 4.0.2, and
// the proof server 9.0.2 pinned by digest. On 9.0.0 or 9.0.1, proving a claims circuit can crash.
//
// The packages came with the client patch (PR #188, merged). The proof server 9.0.2 is pinned by
// digest in one place, bboard-cli/proof-server-v2.yml (scripts/v2/proof-server.mjs); v1's tools
// keep proof-server-mainnet.yml.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { ROOT } from './fingerprints.mjs';
import { V2_PROOF_SERVER_FILE, V2_PROOF_SERVER_TAG, pinProblems } from './proof-server.mjs';

export const REQUIRED = {
  '@midnight-ntwrk/midnight-js-contracts': '5.0.1',
  '@midnight-ntwrk/midnight-js-types': '5.0.1',
  '@midnight-ntwrk/midnight-js-protocol': '5.0.1',
  '@midnightntwrk/ledger-v9': '1.0.2',
  'ledger-v9-committee': '1.0.2',
  '@midnightntwrk/onchain-runtime-v4': '4.0.2',
};
export const PROOF_SERVER_TAG = V2_PROOF_SERVER_TAG;
/** The proof-server file every v2 send starts (deploy-v2.ts, committee.ts with --v2-record, smoke-v2.ts). */
export const PROOF_SERVER_FILE = V2_PROOF_SERVER_FILE;

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
  let text;
  try {
    text = yml();
  } catch {
    text = '';
  }
  p.push(...pinProblems(text));
  if (p.length > 0)
    p.push(
      'Run `git pull` and `npm ci` on main; pin the proof server 9.0.2 digest as in docs/runbooks/deploy-v2.md, ' +
        'step 8. Nothing was read, built or sent.',
    );
  return p;
};
