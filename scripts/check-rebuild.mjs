// npm run check:rebuild -- <manifest> [--reuse-node-modules] [--keep]
//
// Rebuild a release from its published code and compare it with its manifest, file by file
// (CONTRACT.md #32, the fifth review's finding 1: "the list is VeilCore's own word; nothing
// rebuilds it from the code"). The manifest (releases/<network>/<commit>.json) names the
// commit and records the build: its mode, every VITE_* setting, and the Node and npm versions
// (scripts/release-manifest.mjs). This:
//   1. takes that commit's files from this checkout (git archive: nothing in this checkout
//      changes) into a new folder;
//   2. installs the packages the commit's package-lock.json names (npm ci), or with
//      --reuse-node-modules copies the ones already installed in this checkout, as hard links
//      (quicker; then the packages are this checkout's, not a fresh install);
//   3. builds the site with exactly the recorded mode and settings, and no other VITE_*
//      setting (vite build, as the deploy's npm run build does after its type check);
//   4. writes release.json as the deploy did, and compares every file with the manifest.
//
// Some served files are not made from the site's code, and are said apart: the contract's
// compiled files (contract/src/managed, made by `npm run compact` in contract/) and its proving
// keys (/keys, /zkir), and Midnight's proving parameters (/params, fetched by
// bboard-ui/scripts/fetch-params.mjs). They are copied from this computer when it has them,
// and the printout says so; files under /keys, /zkir and /params are compared only when copied.
//
// Use the Node version the manifest names: another one can build different files.
//
// Exit 0: every file built from the code matches. 1: something differs, is missing or extra.
// 2: nothing could be rebuilt (no such commit here, a manifest without build settings, or the
// build failed).
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isManifest } from './release-check.mjs';
import { hashTree, releaseJsonText } from './release-manifest.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
/** Served paths that are not built from the site's code. */
const OUTSIDE = /^\/(keys|zkir|params)\//;
const WORKSPACES = ['bboard-cli', 'bboard-ui', 'api', 'contract', 'partner-kit', 'sponsor'];

/**
 * node_modules for the rebuilt tree from this checkout's installed packages (--reuse-node-modules):
 * copied as hard links (a plain copy where hard links can't be made), so every package sits
 * inside the rebuilt tree as it would after npm ci there. Linking the folder instead put this
 * checkout's paths into the build, and the bundler's chunk names with them. This repository's
 * own workspaces (@veilcore/*) are relative links, kept as such, so they point at the commit's
 * code in the rebuilt tree.
 */
const copyModules = (from, to) => {
  if (!existsSync(from)) return;
  try {
    execFileSync('cp', ['-al', from, to], { stdio: 'ignore' });
  } catch {
    rmSync(to, { recursive: true, force: true });
    cpSync(from, to, { recursive: true, verbatimSymlinks: true });
  }
};

/**
 * The whole rebuild, for the command and for tests.
 * @returns {{ code: 0 | 1 | 2, lines: string[] }}
 */
export const checkRebuild = (manifestFile, { reuseNodeModules = false, keep = false, repoRoot = REPO, log = () => {} } = {}) => {
  const lines = [];
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  } catch {
    manifest = null;
  }
  if (!isManifest(manifest)) return { code: 2, lines: [`${manifestFile} is not a release manifest.`] };
  if (!manifest.build)
    return {
      code: 2,
      lines: [`This release’s list has no build settings (it was made before they were recorded), so it can’t be rebuilt exactly.`],
    };
  const { commit, network, date } = manifest;
  const { mode, settings, node, npm } = manifest.build;
  lines.push(`Release ${commit} on ${network}, made ${date}: mode ${mode}, ${Object.keys(settings).length} build settings, Node ${node}, npm ${npm}.`);
  if (manifest.uncommittedChanges)
    lines.push('Note: that release was built from a checkout with uncommitted changes, so a rebuild of the commit may differ.');
  if (process.version !== node)
    lines.push(`Note: you are using Node ${process.version}; the release was built with Node ${node}. Another Node version can build different files.`);
  try {
    execFileSync('git', ['cat-file', '-e', `${commit}^{commit}`], { cwd: repoRoot, stdio: 'ignore' });
  } catch {
    return { code: 2, lines: [...lines, `Commit ${commit} isn’t in this copy of the code. Run git fetch and try again.`] };
  }

  const work = mkdtempSync(join(tmpdir(), 'veilcore-rebuild-'));
  const src = join(work, 'src');
  const out = join(work, 'out');
  try {
    mkdirSync(src);
    log(`Taking the code of ${commit} into ${src}…`);
    execFileSync('git', ['archive', '--format=tar', '-o', join(work, 'code.tar'), commit], { cwd: repoRoot });
    execFileSync('tar', ['-xf', join(work, 'code.tar'), '-C', src]);

    // What the site's build needs that isn't in the code.
    const managed = join(repoRoot, 'contract', 'src', 'managed');
    if (existsSync(managed)) {
      cpSync(managed, join(src, 'contract', 'src', 'managed'), { recursive: true });
      lines.push('The contract’s compiled files (contract/src/managed) aren’t in the code: copied from this computer’s contract build (npm run compact).');
    } else lines.push('The contract’s compiled files (contract/src/managed) aren’t in the code or on this computer: compile the contract first (cd contract && npm run compact).');
    const params = join(repoRoot, 'bboard-ui', 'public', 'params');
    const hasParams = existsSync(params);
    if (hasParams) cpSync(params, join(src, 'bboard-ui', 'public', 'params'), { recursive: true });

    if (reuseNodeModules) {
      log('Copying the packages installed in this checkout (hard links)…');
      copyModules(join(repoRoot, 'node_modules'), join(src, 'node_modules'));
      for (const w of WORKSPACES) copyModules(join(repoRoot, w, 'node_modules'), join(src, w, 'node_modules'));
      lines.push('Packages: copied from this checkout (--reuse-node-modules), not installed fresh from the commit’s package-lock.json.');
    } else {
      log('Installing the packages the commit names (npm ci)…');
      execFileSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: src, stdio: 'inherit' });
      lines.push('Packages: installed fresh from the commit’s package-lock.json (npm ci).');
    }

    // Only the recorded settings: none from this shell, none from a .env.local here.
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('VITE_')));
    for (const [k, v] of Object.entries(settings)) env[k] = v;
    log(`Building with mode ${mode}…`);
    try {
      execFileSync(process.execPath, [join(src, 'node_modules', 'vite', 'bin', 'vite.js'), 'build', '--mode', mode, '--outDir', out, '--emptyOutDir'], {
        cwd: join(src, 'bboard-ui'),
        env,
        stdio: ['ignore', 'ignore', 'pipe'],
      });
    } catch (e) {
      const err = e && typeof e === 'object' && 'stderr' in e ? String(e.stderr).slice(-2000) : String(e);
      return { code: 2, lines: [...lines, `The build failed:\n${err}`] };
    }
    // The deploy's npm run build copies the contract's proving keys in after the build.
    for (const d of ['keys', 'zkir']) {
      const from = join(managed, 'veilcore', d);
      if (Object.keys(manifest.files).some((p) => p.startsWith(`/${d}/`)) && existsSync(from)) cpSync(from, join(out, d), { recursive: true });
    }
    writeFileSync(join(out, 'release.json'), releaseJsonText({ network, commit, date }));

    const built = hashTree(out);
    const listed = manifest.files;
    const code = { matched: [], differ: [], missing: [], extra: [] };
    const outside = { matched: [], differ: [], notHere: [] };
    for (const [p, want] of Object.entries(listed)) {
      const got = built[p];
      if (OUTSIDE.test(p)) {
        if (got === undefined) outside.notHere.push(p);
        else (got === want ? outside.matched : outside.differ).push(p);
      } else if (got === undefined) code.missing.push(p);
      else (got === want ? code.matched : code.differ).push(p);
    }
    for (const p of Object.keys(built)) if (!(p in listed)) code.extra.push(p);
    const codeTotal = Object.keys(listed).filter((p) => !OUTSIDE.test(p)).length;
    const ok = code.differ.length === 0 && code.missing.length === 0 && code.extra.length === 0 && code.matched.length === codeTotal;
    lines.push(
      ok
        ? `All ${codeTotal} files built from the code match the release’s list.`
        : `${code.matched.length} of ${codeTotal} files built from the code match the release’s list.`,
    );
    for (const p of code.differ) lines.push(`  differs: ${p}`);
    for (const p of code.missing) lines.push(`  not built: ${p}`);
    for (const p of code.extra) lines.push(`  built but not listed: ${p}`);
    const outsideTotal = outside.matched.length + outside.differ.length + outside.notHere.length;
    if (outsideTotal)
      lines.push(
        `${outsideTotal} listed files are the contract’s proving keys and Midnight’s parameters, not built from the site’s code: ${outside.matched.length} match this computer’s copies, ${outside.differ.length} differ, ${outside.notHere.length} weren’t on this computer to compare.`,
      );
    for (const p of outside.differ) lines.push(`  differs (copied from this computer): ${p}`);
    if (keep) lines.push(`Kept the rebuild in ${work}.`);
    return { code: ok ? 0 : 1, lines };
  } finally {
    if (!keep) rmSync(work, { recursive: true, force: true });
  }
};

const main = () => {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) {
    console.error('usage: npm run check:rebuild -- <releases/<network>/<commit>.json> [--reuse-node-modules] [--keep]');
    process.exit(2);
  }
  const { code, lines } = checkRebuild(resolve(process.env.INIT_CWD ?? process.cwd(), file), {
    reuseNodeModules: args.includes('--reuse-node-modules'),
    keep: args.includes('--keep'),
    log: (l) => console.error(l),
  });
  for (const l of lines) console.log(l);
  process.exit(code);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
