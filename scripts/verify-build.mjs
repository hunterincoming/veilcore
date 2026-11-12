// Compares a local build of the contracts (contract/src/managed/, from `npm run compact`) with
// the hashes in deployments/<network>.json, file by file. docs/reproduce-build.md says how to
// make the build.
//
//   npm run verify:build -- --network mainnet            every artefact must be built and match
//   npm run verify:build -- --network mainnet --partial  a `--skip-zk` build: compares what is
//                                                        there (ZKIR and contract code); keys
//                                                        and .bzkir files are reported as not built
//
// Exit 0: everything compared matches (and, without --partial, everything was there).
// Exit 1: a file differs, or is missing without --partial. Exit 2: bad arguments or no build.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, artefactRows, loadDeployments, pinnedCompiler } from './deployments.mjs';
import { compareCompiler, installedCompiler } from './check-compiler.mjs';

const usage = 'Usage: npm run verify:build -- [--network mainnet|preprod] [--partial] [--managed <folder>]';

const args = process.argv.slice(2);
let network = 'mainnet';
let partial = false;
let managed = path.join(ROOT, 'contract', 'src', 'managed');
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--network') network = args[++i];
  else if (a === '--partial') partial = true;
  else if (a === '--managed') managed = path.resolve(args[++i] ?? '');
  else if (a === '--help' || a === '-h') {
    console.log(usage);
    process.exit(0);
  } else {
    console.error(`Unknown argument ${a}.\n${usage}`);
    process.exit(2);
  }
}

let d;
try {
  d = loadDeployments(network);
} catch (e) {
  console.error(e.message);
  process.exit(2);
}

const compiler = compareCompiler(installedCompiler(), pinnedCompiler());
console.log(compiler.ok ? compiler.message : `${compiler.level === 'warn' ? 'WARNING' : 'NOTE'}: ${compiler.message}`);

const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
let differ = 0;
let missing = 0;
let matched = 0;
let total = 0;
for (const c of d.contracts) {
  const dir = path.join(managed, c.name);
  if (!existsSync(dir)) {
    console.error(`No build at ${path.relative(ROOT, dir) || dir}. Run \`cd contract && npm run compact\` first (docs/reproduce-build.md).`);
    process.exit(2);
  }
  console.log(`\n${c.name} (${c.address}, built from ${c.commit ?? 'an unrecorded commit'} with compactc ${c.compiler})`);
  const notBuilt = [];
  for (const [file, want] of artefactRows(c)) {
    total++;
    const full = path.join(dir, file);
    if (!existsSync(full)) {
      missing++;
      notBuilt.push(file);
      continue;
    }
    const have = sha(full);
    if (have === want) matched++;
    else {
      differ++;
      console.log(`  DIFFERS  ${file}\n           built     ${have}\n           published ${want}`);
    }
  }
  const rows = artefactRows(c).size;
  console.log(`  ${rows - notBuilt.length} of ${rows} artefacts built and compared.`);
  if (notBuilt.length > 0) {
    const keys = notBuilt.filter((f) => f.startsWith('keys/')).length;
    const bz = notBuilt.filter((f) => f.endsWith('.bzkir')).length;
    const other = notBuilt.length - keys - bz;
    console.log(`  not built: ${keys} key file(s), ${bz} .bzkir file(s)${other > 0 ? `, ${other} other: ${notBuilt.filter((f) => !f.startsWith('keys/') && !f.endsWith('.bzkir')).join(', ')}` : ''}`);
  }
}

console.log('');
if (differ > 0) {
  console.log(`FAIL: ${differ} built file(s) differ from deployments/${network}.json.${compiler.ok ? '' : ' Check the compiler version first (above).'}`);
  process.exit(1);
}
if (missing > 0 && !partial) {
  console.log(`FAIL: ${missing} of ${total} artefacts were not built. Run a full \`npm run compact\` (it needs Midnight's proving parameters), or pass --partial for a --skip-zk build.`);
  process.exit(1);
}
console.log(
  missing > 0
    ? `PASS (partial): all ${matched} built artefacts match deployments/${network}.json; ${missing} were not built and not compared.`
    : `PASS: all ${matched} artefacts match deployments/${network}.json.`,
);
