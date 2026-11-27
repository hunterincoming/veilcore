// Copy the claims contract's circuits into the build, next to the main contract's
// (dist/zkir/<circuit>.bzkir|.zkir), for the circuits the browser proves (docs/claims-screen.md):
// proveRange, proveValue, proveAttested. Their names don't collide with the main contract's
// circuits.
//
// The proving keys are no longer copied into the build (they were about 135 MB of every deploy):
// they are published once on VeilCore's proof file host and checked against the fingerprints
// pinned in src/veilcore/chain/proof-files.json (scripts/publish-proof-files.mjs). The file keeps
// its name so the build scripts and docs that name it stay right.
// SPDX-License-Identifier: Apache-2.0
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const managed = join(here, '..', '..', 'contract', 'src', 'managed', 'veilcore-claims');
const dist = join(here, '..', 'dist');
const CIRCUITS = ['proveRange', 'proveValue', 'proveAttested'];

let copied = 0;
mkdirSync(join(dist, 'zkir'), { recursive: true });
for (const c of CIRCUITS) {
  for (const f of [`${c}.bzkir`, `${c}.zkir`]) {
    const from = join(managed, 'zkir', f);
    if (existsSync(from)) {
      cpSync(from, join(dist, 'zkir', f));
      copied++;
    }
  }
}
console.log(`copy-claims-keys: ${copied} claims circuit files copied (the proving keys come from the proof file host)`);

// midnight-js 5 (Midnight's Ledger 9 fork, 6 Nov 2026) reads which ledger a contract's artifacts
// are for from compiler/contract-info.json, served next to keys/ and zkir/. Both contracts are
// compactc 0.31 builds (runtime 0.16: Ledger 8 contracts) and share this site's one keys/ and
// zkir/, so they share one compiler/ too: the main contract's, refused if the claims contract's
// says another runtime. Without it every call stops before proving.
const infoOf = (contract) => join(here, '..', '..', 'contract', 'src', 'managed', contract, 'compiler', 'contract-info.json');
const runtimeOf = (f) => JSON.parse(readFileSync(f, 'utf8'))['runtime-version'];
const mainInfo = infoOf('veilcore');
if (!existsSync(mainInfo)) {
  console.error(`copy-claims-keys: ${mainInfo} is missing; compile the contracts first.`);
  process.exit(1);
}
if (existsSync(infoOf('veilcore-claims')) && runtimeOf(infoOf('veilcore-claims')) !== runtimeOf(mainInfo)) {
  console.error('copy-claims-keys: the two contracts were compiled for different runtimes; they cannot share compiler/.');
  process.exit(1);
}
mkdirSync(join(dist, 'compiler'), { recursive: true });
cpSync(mainInfo, join(dist, 'compiler', 'contract-info.json'));
console.log(`copy-claims-keys: compiler/contract-info.json copied (runtime ${runtimeOf(mainInfo)})`);
