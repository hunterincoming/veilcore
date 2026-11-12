// Is the Compact compiler on this computer the one VeilCore's deployed contracts were built
// with? The version is pinned in compiler-version at the repository root (CI pins the same
// release by checksum, .github/workflows/ci.yaml). A different compiler builds different
// circuits and keys, so a build made with it can never match deployments/<network>.json.
//
//   npm run check:compiler             warns on a mismatch (exit 0), errors if none is found
//   npm run check:compiler -- --strict exits 1 on a mismatch too
//
// It only reads `compact compile --version` (or `compactc --version`); it compiles nothing.
// SPDX-License-Identifier: Apache-2.0
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pinnedCompiler } from './deployments.mjs';

const tryRun = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 30_000 }).toString().trim();
  } catch {
    return undefined;
  }
};

/** The version string the installed compiler reports, or undefined if there is none. */
export const installedCompiler = (run = tryRun) => {
  const out = run('compact', ['compile', '--version']) ?? run('compactc', ['--version']);
  return out === undefined ? undefined : (/(\d+\.\d+\.\d+)/.exec(out)?.[1] ?? out);
};

/** { ok, level, message } for an installed version against the pinned one. */
export const compareCompiler = (installed, pinned) => {
  const how = `Install it with: compact update ${pinned}  (docs/reproduce-build.md)`;
  if (installed === undefined)
    return { ok: false, level: 'error', message: `No Compact compiler found (tried \`compact compile --version\` and \`compactc --version\`). The deployed contracts need ${pinned}. ${how}` };
  if (installed !== pinned)
    return {
      ok: false,
      level: 'warn',
      message: `Compact compiler ${installed} is installed, but VeilCore's deployed contracts were built with ${pinned} (compiler-version). A build with ${installed} will not match deployments/*.json. ${how}`,
    };
  return { ok: true, level: 'ok', message: `Compact compiler ${installed}: matches compiler-version.` };
};

const main = () => {
  const strict = process.argv.includes('--strict');
  const r = compareCompiler(installedCompiler(), pinnedCompiler());
  if (r.ok) console.log(r.message);
  else console.error(`${r.level === 'warn' ? 'WARNING' : 'ERROR'}: ${r.message}`);
  process.exit(r.ok || (r.level === 'warn' && !strict) ? 0 : 1);
};

const invoked = () => {
  try {
    return process.argv[1] !== undefined && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
};
if (invoked()) main();
