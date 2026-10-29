// Copy the claims contract's proving files into the build, next to the main contract's
// (dist/keys/<circuit>.prover|.verifier, dist/zkir/<circuit>.bzkir|.zkir), for the circuits the
// browser proves (docs/claims-screen.md): proveRange, proveValue, proveAttested. Their names
// don't collide with the main contract's circuits.
//
// The keys are made where the contracts are compiled with keys (the release zk-r4, or
// `veilcore-keys fetch`) and are not in git. A build without them still builds: the site then
// has no claims files, and a claim stops before proving with "the proving files for … are not
// on this site yet". This says so instead of failing the build.
// SPDX-License-Identifier: Apache-2.0
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const managed = join(here, '..', '..', 'contract', 'src', 'managed', 'veilcore-claims');
const dist = join(here, '..', 'dist');
const CIRCUITS = ['proveRange', 'proveValue', 'proveAttested'];

let copied = 0;
const missing = [];
for (const c of CIRCUITS) {
  for (const [dir, files] of [
    ['keys', [`${c}.prover`, `${c}.verifier`]],
    ['zkir', [`${c}.bzkir`, `${c}.zkir`]],
  ]) {
    mkdirSync(join(dist, dir), { recursive: true });
    for (const f of files) {
      const from = join(managed, dir, f);
      if (existsSync(from)) {
        cpSync(from, join(dist, dir, f));
        copied++;
      } else if (dir === 'keys') missing.push(f);
    }
  }
}
if (missing.length)
  console.warn(
    `copy-claims-keys: no claims proving keys here (${missing.join(', ')}); this build makes no claims. ` +
      'Get them with `veilcore-keys fetch` (release zk-r4) to offer claims.',
  );
else console.log(`copy-claims-keys: ${copied} claims proving files copied`);
