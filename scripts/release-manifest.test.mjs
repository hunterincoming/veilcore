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
import { hashTree, writeRelease } from './release-manifest.mjs';
import { checkSite } from './check-site.mjs';
import { allMatch, checkFiles, isManifest, readRelease } from './release-check.mjs';

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

test('both deploy scripts write and print the manifest, and neither pushes anything', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts;
  assert.match(pkg['deploy:mainnet'], /node scripts\/vercel-config\.mjs && node scripts\/release-manifest\.mjs mainnet \.vercel\/output\/static && npm ci --prefix tools\/vercel/);
  assert.equal(pkg['check:site'], 'node scripts/check-site.mjs');
  const test = readFileSync(join(ROOT, 'scripts/deploy-test-site.mjs'), 'utf8');
  assert.match(test, /run\('node', \['scripts\/release-manifest\.mjs', 'preprod', '\.vercel\/output\/static'\]\);/);
  // The manifest is written after the site is in .vercel/output/static and before the upload.
  const at = test.indexOf("run('node', ['scripts/release-manifest.mjs'");
  assert.ok(test.indexOf("cpSync('bboard-ui/dist', '.vercel/output/static'") < at);
  assert.ok(at < test.indexOf("['deploy', '--prebuilt']"));
  for (const s of [pkg['deploy:mainnet'], pkg['deploy:test'], test, readFileSync(join(ROOT, 'scripts/release-manifest.mjs'), 'utf8')]) {
    assert.doesNotMatch(s, /git\s+push|['"]push['"]/);
  }
});
