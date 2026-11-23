// Compile contract v2 with the one compiler it is built with: Compact toolchain 0.36.1
// (language 0.28.0, runtime 0.21.0). v1 (contract/) keeps its own compiler, 0.31.1; the two
// never share one. The pin is in ../compiler-version, and the release's SHA-256s are in
// ../compiler-checksums.txt.
//
//   node scripts/compile.mjs             both contracts, with prover and verifier keys
//   node scripts/compile.mjs --skip-zk   both contracts, no keys (what the tests need)
//   node scripts/compile.mjs --check     only check the compiler, compile nothing
//
// Which compiler: $COMPACTC if set (a path to `compactc`, as CI and a checked download
// use), otherwise the Compact CLI's `compact compile +0.36.1`. Either way the version it
// reports must be exactly the pinned one, or nothing is compiled.
//
// Keys are built only on the maintainer's Mac, and rebuilt on a second machine to check
// they match (docs/runbooks/deploy-v2.md). Never build keys anywhere else for a deploy.
// SPDX-License-Identifier: Apache-2.0
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PINNED = readFileSync(join(root, 'compiler-version'), 'utf8').trim();

/** The command that runs the pinned compiler, as [file, leading args]. */
export const compilerCommand = (env = process.env) =>
  env.COMPACTC ? [env.COMPACTC, []] : ['compact', ['compile', `+${PINNED}`]];

/** The version a compiler output reports, e.g. "0.36.1 (7fa3a117c 2026-11-11)" -> "0.36.1". */
export const reportedVersion = (out) => /^(\d+\.\d+\.\d+)/.exec(String(out).trim())?.[1];

const run = (file, args) => execFileSync(file, args, { stdio: ['ignore', 'pipe', 'inherit'] }).toString();

const main = () => {
  const argv = process.argv.slice(2);
  const [file, lead] = compilerCommand();
  let out;
  try {
    out = run(file, [...lead, '--version']);
  } catch {
    console.error(
      `No Compact compiler ${PINNED} found. Set COMPACTC to the compactc from the checked ` +
        `${PINNED} release, or install it with the Compact CLI: compact update ${PINNED}. ` +
        'See docs/runbooks/deploy-v2.md.',
    );
    process.exit(1);
  }
  const v = reportedVersion(out);
  if (v !== PINNED) {
    console.error(`Compiler reports ${out.trim()}; contract v2 is built only with ${PINNED}. Nothing compiled.`);
    process.exit(1);
  }
  console.log(`compactc ${out.trim()}`);
  if (argv.includes('--check')) return;
  const skipZk = argv.includes('--skip-zk') ? ['--skip-zk'] : [];
  for (const name of ['veilcore', 'veilcore-claims']) {
    const outDir = join(root, 'src', 'managed', name);
    rmSync(outDir, { recursive: true, force: true });
    console.log(`compiling ${name}${skipZk.length ? ' (no keys)' : ' (with keys)'}`);
    execFileSync(file, [...lead, ...skipZk, join(root, 'src', `${name}.compact`), outDir], { stdio: 'inherit' });
  }
};

const invoked = () => {
  try {
    return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
};
if (invoked()) main();
