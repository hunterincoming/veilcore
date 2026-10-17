// The release manifest (CONTRACT.md #31, #32): what a release deploy writes so anyone can check
// the site serves the code it was built from, and rebuild it to compare.
//
//   node scripts/release-manifest.mjs <network> <folder the site is served from>
//
// Run by npm run deploy:test (network "preprod"), npm run deploy:mainnet ("mainnet") and,
// since round 6, npm run deploy:prod ("prod": the test-network site on veilcore.org), after
// the site is built into .vercel/output/static and scripts/vercel-config.mjs has written
// .vercel/output/config.json, and before it is uploaded. It:
//   1. writes <folder>/release.json: { format, network, commit, date }, so a copy of the site
//      says which release it is;
//   2. hashes every file in <folder> (release.json included): SHA-256, by the path it is
//      served at;
//   3. records the response headers that matter (release-check.mjs SECURITY_HEADERS), as
//      config.json beside <folder> sets them on every response (round 6, finding 1);
//   4. records the build: its mode, every VITE_* setting it saw (names and values), and the
//      Node and npm versions (round 6). The build writes what it saw to
//      bboard-ui/.vite/veilcore-build-settings.json (vite.config.ts recordBuildSettings),
//      with the SHA-256 of the index.html it made; this refuses a settings file from another
//      build, and refuses to write a setting that looks like a key or a secret: the manifest
//      is published. None of the site's settings is one (they are addresses, a network name,
//      a contract address and switches, all inside the published page anyway);
//   5. writes the manifest, { format, network, commit, date, uncommittedChanges, files,
//      headers, build }, to releases/<network>/<commit>.json in this checkout, and a copy
//      into <folder> at the same path, so /check-this-site can read it; the copy is not in
//      its own list;
//   6. prints where it wrote it, and the manifest itself.
// The manifest in releases/ is committed and pushed with the release, so the public code
// lists each release's files. Nothing here commits or pushes anything. With the manifest,
// anyone can rebuild the release from that commit and compare: npm run check:rebuild --
// releases/<network>/<commit>.json (scripts/check-rebuild.mjs).
//
// `commit` is this checkout's HEAD. A deploy from a checkout with uncommitted changes is
// still written (the deploy goes ahead as before), with `uncommittedChanges: true`, and the
// printout says the files then can't be matched to published code.
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MANIFEST_FORMAT, RELEASE_FORMAT, SECURITY_HEADERS, isBuildFacts, manifestPath } from './release-check.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
/** Where the site's build writes the settings it saw (bboard-ui/vite.config.ts recordBuildSettings). */
export const BUILD_SETTINGS_FILE = join(REPO, 'bboard-ui', '.vite', 'veilcore-build-settings.json');
export const BUILD_SETTINGS_FORMAT = 'veilcore-build-settings/v1';

/** release.json, exactly as a deploy writes it (check-rebuild.mjs writes the same bytes). */
export const releaseJsonText = ({ network, commit, date }) =>
  `${JSON.stringify({ format: RELEASE_FORMAT, network, commit, date }, null, 2)}\n`;

/**
 * Why a build setting must not be published, or null. A name that says key, secret, token or
 * password, a value with a key in its address (as vercel-config.mjs carriesKey), or a private
 * key block. Names only in the reason: the value is never printed.
 */
const KEY_NAME = /(^|_)(KEY|SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|AUTH|CREDENTIALS?|API_?KEY)(_|$)/;
const KEY_PARAM = /[?&#;](project[_-]?id|api[_-]?key|apikey|key|token|access[_-]?token|auth|authorization|secret|password)=/i;
export const secretSettingProblem = (name, value) => {
  if (KEY_NAME.test(name)) return `${name} is named like a key or a secret`;
  const v = String(value);
  let decoded = v;
  try {
    decoded = decodeURIComponent(v);
  } catch {
    /* as written */
  }
  if (KEY_PARAM.test(v) || KEY_PARAM.test(decoded)) return `${name} carries a key in its address`;
  try {
    const u = new URL(v);
    if (u.username || u.password) return `${name} carries a user name or password in its address`;
  } catch {
    /* not an address */
  }
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(v)) return `${name} holds a private key`;
  return null;
};

/** The security headers config.json sets on every response, by lower-case name. */
export const headersFromConfig = (configFile) => {
  const config = JSON.parse(readFileSync(configFile, 'utf8'));
  const route = (config.routes ?? []).find((r) => r && r.headers && r.continue === true);
  if (!route) throw new Error(`${configFile} sets no headers on every response`);
  const out = {};
  for (const [k, v] of Object.entries(route.headers)) {
    const name = k.toLowerCase();
    if (SECURITY_HEADERS.includes(name)) out[name] = String(v);
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1)));
};

const npmVersion = () => {
  const ua = process.env.npm_config_user_agent ?? '';
  const m = /\bnpm\/(\S+)/.exec(ua);
  if (m) return m[1];
  try {
    return execFileSync('npm', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'unknown';
  }
};

/**
 * The build facts for a site in `staticDir`: the settings file the build wrote, checked to
 * be this build's (its index.html), every VITE_* setting checked not to look like a secret,
 * and this Node and npm.
 */
export const buildFacts = ({ staticDir, settingsFile = BUILD_SETTINGS_FILE }) => {
  if (!existsSync(settingsFile))
    throw new Error(`The build's settings were not recorded (${settingsFile} is missing). Build the site from this checkout first.`);
  const s = JSON.parse(readFileSync(settingsFile, 'utf8'));
  if (s?.format !== BUILD_SETTINGS_FORMAT || typeof s.mode !== 'string' || typeof s.settings !== 'object')
    throw new Error(`${settingsFile} is not a build settings file.`);
  const index = createHash('sha256').update(readFileSync(join(staticDir, 'index.html'))).digest('hex');
  if (s.indexHtmlSha256 !== index)
    throw new Error(`${settingsFile} is from another build than the site in ${staticDir}. Build again, then run this.`);
  const settings = {};
  for (const [k, v] of Object.entries(s.settings).sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (!/^VITE_[A-Z0-9_]{1,64}$/.test(k)) continue;
    const problem = secretSettingProblem(k, v);
    if (problem) throw new Error(`Not writing the release manifest: ${problem}. The manifest is published; build without it.`);
    settings[k] = String(v);
  }
  const facts = { mode: s.mode, settings, node: process.version, npm: npmVersion() };
  if (!isBuildFacts(facts)) throw new Error('The build facts are not well formed.');
  return facts;
};

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
export const writeRelease = ({ network, staticDir, repoRoot = process.cwd(), commit, date, uncommittedChanges, headers, build }) => {
  if (build) for (const [k, v] of Object.entries(build.settings ?? {})) {
    const problem = secretSettingProblem(k, v);
    if (problem) throw new Error(`Not writing the release manifest: ${problem}. The manifest is published; build without it.`);
  }
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(network ?? '')) throw new Error('network must be a short lower-case name, such as mainnet or preprod');
  const head = commit ?? git(['rev-parse', 'HEAD'], repoRoot);
  if (!/^[0-9a-f]{40}$/.test(head)) throw new Error(`not a git commit: ${head}`);
  const dirty = uncommittedChanges ?? git(['status', '--porcelain'], repoRoot).length > 0;
  const when = date ?? new Date().toISOString();
  writeFileSync(join(staticDir, 'release.json'), releaseJsonText({ network, commit: head, date: when }));
  const manifest = {
    format: MANIFEST_FORMAT,
    network,
    commit: head,
    date: when,
    uncommittedChanges: dirty,
    files: hashTree(staticDir),
    ...(headers ? { headers } : {}),
    ...(build ? { build } : {}),
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
  let headers;
  let build;
  try {
    headers = headersFromConfig(join(staticDir, '..', 'config.json'));
    build = buildFacts({ staticDir });
  } catch (e) {
    console.error(`\nNOT DEPLOYED. ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  }
  const { manifest, rel, text } = writeRelease({ network, staticDir, headers, build });
  console.log(`\nRelease manifest: ${Object.keys(manifest.files).length} files, commit ${manifest.commit}, ${manifest.date}.`);
  console.log(`Written to ${rel}. Commit it and push it with this release, so anyone can check the site:`);
  console.log(`  npm run check:site -- <the site's address>, or open /check-this-site on the site;`);
  console.log(`  and rebuild it from the code to compare: npm run check:rebuild -- ${rel}`);
  if (manifest.uncommittedChanges)
    console.log('This checkout has uncommitted changes, so these files are not exactly the published code at that commit.');
  console.log(text);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
