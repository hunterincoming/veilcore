// The release manifest (CONTRACT.md #31): what a release deploy writes so anyone can check the
// site serves the code it was built from.
//
//   node scripts/release-manifest.mjs <network> <folder the site is served from>
//
// Run by npm run deploy:test (network "preprod") and npm run deploy:mainnet (network
// "mainnet") after the site is built into .vercel/output/static and before it is uploaded. It:
//   1. writes <folder>/release.json: { format, network, commit, date }, so a copy of the site
//      says which release it is;
//   2. hashes every file in <folder> (release.json included): SHA-256, by the path it is
//      served at;
//   3. writes the manifest, { format, network, commit, date, uncommittedChanges, files }, to
//      releases/<network>/<commit>.json in this checkout, and a copy into <folder> at the same
//      path, so /check-this-site can read it; the copy is not in its own list;
//   4. prints where it wrote it, and the manifest itself.
// The manifest in releases/ is committed and pushed with the release, so the public code
// lists each release's files. Nothing here commits or pushes anything.
//
// `commit` is this checkout's HEAD. A deploy from a checkout with uncommitted changes is
// still written (the deploy goes ahead as before), with `uncommittedChanges: true`, and the
// printout says the files then can't be matched to published code.
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { MANIFEST_FORMAT, RELEASE_FORMAT, manifestPath } from './release-check.mjs';

/** Every file under `dir`, by the path it is served at: "/" and its segments, URL-encoded. */
export const hashTree = (dir) => {
  const out = {};
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const full = join(d, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (st.isFile()) {
        const served = `/${relative(dir, full).split(sep).map(encodeURIComponent).join('/')}`;
        out[served] = createHash('sha256').update(readFileSync(full)).digest('hex');
      }
    }
  };
  walk(dir);
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1)));
};

const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

/**
 * Write release.json into `staticDir`, then the manifest into `repoRoot`/releases and a copy
 * into `staticDir`. `commit`, `date` and `uncommittedChanges` default to the checkout's.
 * @returns {{ manifest: object, file: string }}
 */
export const writeRelease = ({ network, staticDir, repoRoot = process.cwd(), commit, date, uncommittedChanges }) => {
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(network ?? '')) throw new Error('network must be a short lower-case name, such as mainnet or preprod');
  const head = commit ?? git(['rev-parse', 'HEAD'], repoRoot);
  if (!/^[0-9a-f]{40}$/.test(head)) throw new Error(`not a git commit: ${head}`);
  const dirty = uncommittedChanges ?? git(['status', '--porcelain'], repoRoot).length > 0;
  const when = date ?? new Date().toISOString();
  writeFileSync(
    join(staticDir, 'release.json'),
    `${JSON.stringify({ format: RELEASE_FORMAT, network, commit: head, date: when }, null, 2)}\n`,
  );
  const manifest = {
    format: MANIFEST_FORMAT,
    network,
    commit: head,
    date: when,
    uncommittedChanges: dirty,
    files: hashTree(staticDir),
  };
  const text = `${JSON.stringify(manifest, null, 2)}\n`;
  const rel = manifestPath(network, head);
  const file = join(repoRoot, rel);
  mkdirSync(join(repoRoot, 'releases', network), { recursive: true });
  writeFileSync(file, text);
  // The site's own copy, for /check-this-site. Not in the list: it can't list itself.
  mkdirSync(join(staticDir, 'releases', network), { recursive: true });
  writeFileSync(join(staticDir, rel), text);
  return { manifest, file, rel, text };
};

const main = () => {
  const [network, staticDir] = process.argv.slice(2);
  if (!network || !staticDir) {
    console.error('usage: node scripts/release-manifest.mjs <network> <folder the site is served from>');
    process.exit(2);
  }
  const { manifest, rel, text } = writeRelease({ network, staticDir });
  console.log(`\nRelease manifest: ${Object.keys(manifest.files).length} files, commit ${manifest.commit}, ${manifest.date}.`);
  console.log(`Written to ${rel}. Commit it and push it with this release, so anyone can check the site:`);
  console.log(`  npm run check:site -- <the site's address>, or open /check-this-site on the site.`);
  if (manifest.uncommittedChanges)
    console.log('This checkout has uncommitted changes, so these files are not exactly the published code at that commit.');
  console.log(text);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
