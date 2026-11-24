// Runs the v2 deploy tools exactly the way the maintainer's Mac does (Node's own loader with
// ts-node/esm, as in bboard-cli/package.json), with no arguments, so each one loads every module
// it imports and then stops at its usage message. Nothing is sent: with no network named, none of
// them gets as far as a wallet, a key or the chain.
//
// Why: the vitest tests load the same code through a bundler, which accepts things Node's loader
// refuses (a JSON import without `with { type: 'json' }` crashed `npm run deploy-v2` on 24 Nov
// 2026 with every check green). This is the check that would have caught it.
// SPDX-License-Identifier: Apache-2.0
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bboard-cli');
const LAUNCHERS = ['deploy-v2', 'smoke-v2', 'committee'];

let failed = 0;
for (const name of LAUNCHERS) {
  const r = spawnSync(
    process.execPath,
    ['--experimental-specifier-resolution=node', '--loader', 'ts-node/esm', `src/launcher/${name}.ts`],
    { cwd: CLI, encoding: 'utf8', input: '', timeout: 180_000 },
  );
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const loaded = r.status === 2 && /\bUsage: /.test(out) && !/\bERR_[A-Z_]+|SyntaxError|Cannot find (module|package)/.test(out);
  if (loaded) console.log(`${name}: loads, stops at its usage message`);
  else {
    failed++;
    console.error(`${name}: did not load cleanly (exit ${r.status}${r.signal ? `, ${r.signal}` : ''}):\n${out.slice(-2000)}`);
  }
}
if (failed) {
  console.error(`\n${failed} of ${LAUNCHERS.length} v2 tools would fail on the Mac before they start.`);
  process.exit(1);
}
console.log(`All ${LAUNCHERS.length} v2 tools load under Node's own loader.`);
