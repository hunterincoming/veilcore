// The release manifest and npm run check:site (CONTRACT.md #31), against a site served
// locally from a folder, as Vercel serves the built site: files as they are, and the app's
// page for any path that isn't a file.
// Run: node --test scripts/release-manifest.test.mjs
// SPDX-License-Identifier: Apache-2.0

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFacts, hashTree, headersFromConfig, secretSettingProblem, writeRelease } from './release-manifest.mjs';
import { checkSite } from './check-site.mjs';
import { checkRebuild } from './check-rebuild.mjs';
import { APP_ROUTES, allMatch, checkFiles, isManifest, readRelease, routesToCheck } from './release-check.mjs';
import { createHash } from 'node:crypto';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const COMMIT = 'c0ffee'.padEnd(40, '0');

/** A folder served like the site: a file if there is one, else index.html (the app). */
const serve = (dir) =>
  new Promise((ok) => {
    const server = createServer((req, res) => {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const file = normalize(join(dir, path === '/' ? 'index.html' : path));
      const body = file.startsWith(dir) && existsSync(file) && !file.endsWith('/') ? readFileSync(file) : readFileSync(join(dir, 'index.html'));
      res.writeHead(200).end(body);
    });
    server.listen(0, '127.0.0.1', () => ok({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });

const site = () => {
  const dir = mkdtempSync(join(tmpdir(), 'vc-site-'));
  const repo = mkdtempSync(join(tmpdir(), 'vc-repo-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><script src="/assets/app-1a2b.js"></script>');
  writeFileSync(join(dir, 'assets', 'app-1a2b.js'), 'console.log("the app")');
  writeFileSync(join(dir, 'assets', 'team photo.png'), Buffer.from([1, 2, 3]));
  return { dir, repo };
};

test('a deploy writes release.json, the manifest in releases/<network>/<commit>.json, and a copy the site serves', () => {
  const { dir, repo } = site();
  try {
    const { manifest, rel } = writeRelease({ network: 'mainnet', staticDir: dir, repoRoot: repo, commit: COMMIT, date: '2026-10-17T00:00:00.000Z', uncommittedChanges: false });
    assert.equal(rel, `releases/mainnet/${COMMIT}.json`);
    assert.ok(isManifest(manifest));
    assert.deepEqual(Object.keys(manifest.files), ['/assets/app-1a2b.js', '/assets/team%20photo.png', '/index.html', '/release.json']);
    assert.deepEqual(JSON.parse(readFileSync(join(dir, 'release.json'), 'utf8')), {
      format: 'veilcore-release/v1', network: 'mainnet', commit: COMMIT, date: '2026-10-17T00:00:00.000Z',
    });
    assert.equal(readFileSync(join(repo, rel), 'utf8'), readFileSync(join(dir, rel), 'utf8'));
    // The SHA-256 of every file served, as served.
    assert.equal(manifest.files['/index.html'], hashTree(dir)['/index.html']);
    assert.throws(() => writeRelease({ network: 'Main Net', staticDir: dir, repoRoot: repo, commit: COMMIT }), /network/);
    assert.throws(() => writeRelease({ network: 'mainnet', staticDir: dir, repoRoot: repo, commit: 'abc' }), /not a git commit/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
  }
});

test('check:site against a locally served build: every file matches; a changed file, a missing one and no release list are said', async () => {
  const { dir, repo } = site();
  const { server, url } = await serve(dir);
  try {
    writeRelease({ network: 'preprod', staticDir: dir, repoRoot: repo, commit: COMMIT, uncommittedChanges: false });
    let r = await checkSite(url, { repoRoot: repo });
    assert.equal(r.code, 0, r.lines.join('\n'));
    assert.match(r.lines.join('\n'), /All 5 files match the release’s published list\./);

    // The site serves other code than it was released with.
    writeFileSync(join(dir, 'assets', 'app-1a2b.js'), 'console.log("something else")');
    r = await checkSite(url, { repoRoot: repo });
    assert.equal(r.code, 1);
    assert.match(r.lines.join('\n'), /differs: \/assets\/app-1a2b\.js/);
    // A file gone: the app's page comes back in its place, which is not the file.
    unlinkSync(join(dir, 'assets', 'team photo.png'));
    r = await checkSite(url, { repoRoot: repo });
    assert.match(r.lines.join('\n'), /differs: \/assets\/team%20photo\.png/);

    // No manifest for the release in this checkout: nothing checked, and how to get it.
    r = await checkSite(url, { repoRoot: mkdtempSync(join(tmpdir(), 'vc-empty-')) });
    assert.equal(r.code, 2);
    assert.match(r.lines.join('\n'), /Run git pull and try again, or give one with --manifest <file>/);
    // A manifest for another release is never taken for this one.
    const other = join(repo, 'other.json');
    writeFileSync(other, JSON.stringify({ ...JSON.parse(readFileSync(join(repo, `releases/preprod/${COMMIT}.json`), 'utf8')), commit: 'f'.repeat(40) }));
    assert.equal((await checkSite(url, { manifestFile: other })).code, 1);

    // A site with no release list: its app page answers /release.json.
    unlinkSync(join(dir, 'release.json'));
    const none = await readRelease(url);
    assert.equal(none.ok, false);
    assert.match(none.problem, /has no release list: it was not published by a release deploy/);
    assert.equal((await checkSite(url, { repoRoot: repo })).code, 2);
    assert.equal((await checkSite('not a site')).code, 2);
  } finally {
    server.close();
    rmSync(dir, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
  }
});

test('checkFiles also fetches "/" and holds it to the listed index.html', async () => {
  const { dir, repo } = site();
  const { server, url } = await serve(dir);
  try {
    const { manifest } = writeRelease({ network: 'preprod', staticDir: dir, repoRoot: repo, commit: COMMIT, uncommittedChanges: false });
    const seen = [];
    const out = await checkFiles(url, manifest, { fetchImpl: (u, o) => { seen.push(new URL(u).pathname); return fetch(u, o); } });
    assert.ok(allMatch(out));
    assert.ok(seen.includes('/'));
    assert.equal(out.total, Object.keys(manifest.files).length + 1);
  } finally {
    server.close();
    rmSync(dir, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
  }
});

test('all three deploy scripts write and print the manifest, and none pushes anything', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts;
  assert.equal(pkg['deploy:mainnet'], 'node scripts/deploy-mainnet.mjs');
  const main = readFileSync(join(ROOT, 'scripts/deploy-mainnet.mjs'), 'utf8');
  const m = main.indexOf("run('node', ['scripts/release-manifest.mjs', 'mainnet', '.vercel/output/static']);");
  assert.ok(main.indexOf("run('node', ['scripts/vercel-config.mjs']);") < m && m > 0);
  assert.ok(m < main.indexOf("['deploy', '--prebuilt', '--prod']"));
  // Round 6 (finding 1): deploy:prod, how veilcore.org ships until mainnet, writes one too.
  assert.match(pkg['deploy:prod'], /node scripts\/vercel-config\.mjs && node scripts\/release-manifest\.mjs prod \.vercel\/output\/static && npm ci --prefix tools\/vercel/);
  assert.equal(pkg['check:rebuild'], 'node scripts/check-rebuild.mjs');
  assert.equal(pkg['check:site'], 'node scripts/check-site.mjs');
  const test = readFileSync(join(ROOT, 'scripts/deploy-test-site.mjs'), 'utf8');
  assert.match(test, /run\('node', \['scripts\/release-manifest\.mjs', 'preprod', '\.vercel\/output\/static'\]\);/);
  // The manifest is written after the site is in .vercel/output/static and before the upload.
  const at = test.indexOf("run('node', ['scripts/release-manifest.mjs'");
  assert.ok(test.indexOf("cpSync('bboard-ui/dist', '.vercel/output/static'") < at);
  assert.ok(at < test.indexOf("['deploy', '--prebuilt']"));
  for (const s of [pkg['deploy:mainnet'], main, pkg['deploy:prod'], pkg['deploy:test'], test, readFileSync(join(ROOT, 'scripts/release-manifest.mjs'), 'utf8'), readFileSync(join(ROOT, 'scripts/check-rebuild.mjs'), 'utf8')]) {
    assert.doesNotMatch(s, /git\s+push|['"]push['"]/);
  }
});

// ---- round 6 (CONTRACT.md #32, the fifth review's finding 1) -----------------------------

/** The security headers vercel-config.mjs sets on every response, as a deploy's config.json has them. */
const HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/**
 * The review's evil host (attack5/pocs/evil-host.mjs), ported: every listed file exactly as
 * listed, and `/` and `/index.html` as listed to a fetch; a changed index.html on every address
 * the list doesn't name (the app's pages) and on `/` when a browser opens it as a page, and
 * no security headers. `honest` serves the folder as Vercel does, with the headers.
 */
const host = (dir, { honest }) =>
  new Promise((ok) => {
    const good = readFileSync(join(dir, 'index.html'));
    const evil = Buffer.from(good.toString().replace('<!doctype html>', '<!doctype html><script>fetch("/x",{method:"POST",body:location.href})</script>'));
    const server = createServer((req, res) => {
      const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const file = normalize(join(dir, p));
      const isFile = p !== '/' && file.startsWith(dir) && existsSync(file) && !file.endsWith('/');
      const navigating = req.headers['sec-fetch-dest'] === 'document';
      let body;
      if (honest) body = isFile ? readFileSync(file) : good;
      else if ((p === '/' || p === '/index.html') && navigating) body = evil;
      else if (p === '/') body = good;
      else body = isFile ? readFileSync(file) : evil;
      res.writeHead(200, honest ? HEADERS : {}).end(body);
    });
    server.listen(0, '127.0.0.1', () => ok({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });

const releaseWithFacts = (dir, repo) => {
  const cfg = join(repo, 'config.json');
  writeFileSync(cfg, JSON.stringify({ version: 3, routes: [{ src: '/(.*)', headers: HEADERS, continue: true }, { handle: 'filesystem' }] }));
  const build = { mode: 'preprod', settings: { VITE_API_BASE: 'https://registry.example', VITE_NETWORK_ID: 'preprod', VITE_REAL_CHAIN: '' }, node: process.version, npm: '10.9.7' };
  return writeRelease({ network: 'preprod', staticDir: dir, repoRoot: repo, commit: COMMIT, uncommittedChanges: false, headers: headersFromConfig(cfg), build });
};

test('finding 1 (evil-host.mjs, run-check-site.mjs): check:site catches a host that serves the listed files to a checker and other code on the pages', async () => {
  const { dir, repo } = site();
  const { manifest } = releaseWithFacts(dir, repo);
  const evil = await host(dir, { honest: false });
  const honest = await host(dir, { honest: true });
  try {
    // Before round 6 the check fetched only the listed files, and exited 0: "All 5 files match".
    const plain = await checkFiles(evil.url, manifest);
    assert.ok(allMatch(plain), 'the listed files alone still match: that is how the host passed');
    const r = await checkSite(evil.url, { repoRoot: repo });
    assert.equal(r.code, 1, r.lines.join('\n'));
    const text = r.lines.join('\n');
    assert.match(text, /page differs: \/verify\/VEIL-[0-9A-F]{32}\?fp=[0-9a-f]{64}/);
    assert.match(text, /page differs: \/record\/VEIL-/);
    assert.match(text, /page differs: \/\n/, 'the page a browser opens at / is not the listed one');
    assert.match(text, /header differs: content-security-policy, on \d+ page addresses/);
    // The same files, served as Vercel serves them with the listed headers: everything matches.
    const ok = await checkSite(honest.url, { repoRoot: repo });
    assert.equal(ok.code, 0, ok.lines.join('\n'));
    assert.match(ok.lines.join('\n'), /All \d+ page addresses \(the app’s pages, with random ids, and a random address\)[^\n]*with the listed security headers/);
    assert.match(ok.lines.join('\n'), /It can’t prove the host sends everyone the same files\./);
  } finally {
    evil.server.close();
    honest.server.close();
    rmSync(dir, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
  }
});

test('the page addresses checked are the app’s routes with fresh random ids, plus a random address', () => {
  const a = routesToCheck();
  const b = routesToCheck();
  assert.equal(a.length, APP_ROUTES.length + 1);
  assert.notDeepEqual(a, b, 'fresh ids each time');
  for (const p of a) assert.doesNotMatch(p, /:/, 'every id filled in');
  assert.ok(a.some((p) => /^\/verify\/VEIL-[0-9A-F]{32}\?fp=[0-9a-f]{64}$/.test(p)));
  assert.ok(a.some((p) => /^\/prove\/PR-[0-9A-F]{16}$/.test(p)));
});

test('the manifest records the headers and the build: mode, every VITE_* setting, Node and npm; never one that looks like a key', () => {
  const { dir, repo } = site();
  try {
    const { manifest } = releaseWithFacts(dir, repo);
    assert.ok(isManifest(manifest));
    assert.equal(manifest.headers['content-security-policy'], HEADERS['Content-Security-Policy']);
    assert.deepEqual(Object.keys(manifest.headers).sort(), Object.keys(HEADERS).map((k) => k.toLowerCase()).sort());
    assert.equal(manifest.build.mode, 'preprod');
    assert.equal(manifest.build.settings.VITE_REAL_CHAIN, '');
    assert.equal(manifest.build.node, process.version);

    for (const [k, v] of [
      ['VITE_SECRET', 'x'],
      ['VITE_API_KEY', 'x'],
      ['VITE_SPONSOR_TOKEN', 'x'],
      ['VITE_INDEXER_URL', 'https://indexer.example/api?project_id=abc'],
      ['VITE_INDEXER_URL', 'https://indexer.example/api?project%5Fid=abc'],
      ['VITE_SPONSOR_URL', 'https://user:pass@sponsor.example'],
    ])
      assert.ok(secretSettingProblem(k, v), `${k}=${v}`);
    for (const [k, v] of [
      ['VITE_API_BASE', 'https://veilcore-api-production.up.railway.app'],
      ['VITE_REAL_CHAIN_CONTRACT_ADDRESS', 'ab'.repeat(32)],
      ['VITE_NETWORK_ID', 'preprod'],
    ])
      assert.equal(secretSettingProblem(k, v), null, k);
    assert.throws(
      () => writeRelease({ network: 'preprod', staticDir: dir, repoRoot: repo, commit: COMMIT, build: { mode: 'preprod', settings: { VITE_PRIVATE_KEY: 'x' }, node: 'v1', npm: '1' } }),
      /Not writing the release manifest: VITE_PRIVATE_KEY is named like a key or a secret/,
    );

    // The build's own record of its settings, checked to be this build's.
    const settingsFile = join(repo, 'settings.json');
    const index = createHash('sha256').update(readFileSync(join(dir, 'index.html'))).digest('hex');
    writeFileSync(settingsFile, JSON.stringify({ format: 'veilcore-build-settings/v1', mode: 'mainnet', indexHtmlSha256: index, settings: { VITE_NETWORK_ID: 'mainnet', VITE_API_BASE: 'https://r.example', OTHER: 'not vite' } }));
    assert.deepEqual(buildFacts({ staticDir: dir, settingsFile }).settings, { VITE_API_BASE: 'https://r.example', VITE_NETWORK_ID: 'mainnet' });
    writeFileSync(settingsFile, JSON.stringify({ format: 'veilcore-build-settings/v1', mode: 'mainnet', indexHtmlSha256: 'ab'.repeat(32), settings: {} }));
    assert.throws(() => buildFacts({ staticDir: dir, settingsFile }), /from another build than the site/);
    writeFileSync(settingsFile, JSON.stringify({ format: 'veilcore-build-settings/v1', mode: 'mainnet', indexHtmlSha256: index, settings: { VITE_TOKEN: 'abc' } }));
    assert.throws(() => buildFacts({ staticDir: dir, settingsFile }), /VITE_TOKEN is named like a key or a secret/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
  }
});

test('check:rebuild says plainly when it can’t rebuild: no build settings, or a commit this copy doesn’t have', () => {
  const { dir, repo } = site();
  try {
    const { file } = writeRelease({ network: 'preprod', staticDir: dir, repoRoot: repo, commit: COMMIT, uncommittedChanges: false });
    const old = checkRebuild(file);
    assert.equal(old.code, 2);
    assert.match(old.lines.join('\n'), /has no build settings \(it was made before they were recorded\)/);
    const { file: withFacts } = releaseWithFacts(dir, repo);
    const missing = checkRebuild(withFacts);
    assert.equal(missing.code, 2);
    assert.match(missing.lines.join('\n'), /Commit c0ffee0+ isn’t in this copy of the code\. Run git fetch and try again\./);
    assert.equal(checkRebuild(join(repo, 'nope.json')).code, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
  }
});
