// node --test scripts/proof-files.test.mjs
// The proof file host (scripts/proof-files.mjs, publish-proof-files.mjs): a site deploy refuses
// unless every pinned file is on the host byte for byte; a publish checks every local file, never
// drops a file the host already holds, and never deploys through the site's own Vercel link.
// Nothing here deploys or reaches the network.
// SPDX-License-Identifier: Apache-2.0
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  PROOF_FILES_HOST,
  PUBLISH_COMMAND,
  bigFilesInBuild,
  checkPublished,
  gatherLocal,
  hostConfig,
  hostListText,
  mergedList,
  parseHostList,
  parseProofFiles,
  proofFilesReady,
  readProofFiles,
  stageHost,
} from './proof-files.mjs';
import { collect, hostHolds, linkProblem } from './publish-proof-files.mjs';

const sha = (b) => createHash('sha256').update(b).digest('hex');
const A = Buffer.from('anchor prover');
const B = Buffer.from('k=13 parameters');
const FILES = { 'keys/anchor.prover': sha(A), 'params/bls_midnight_2p13': sha(B) };
const HOST = 'https://keys.example';

/** A host serving `serve` (URL → bytes), with CORS unless told otherwise. */
const hostFetch = (serve, { cors = true, status } = {}) => {
  const asked = [];
  const f = async (url) => {
    asked.push(url);
    if (status) return new Response('no', { status });
    const b = serve[url];
    if (b === undefined) return new Response('not found', { status: 404 });
    return new Response(b, { headers: cors ? { 'access-control-allow-origin': '*' } : {} });
  };
  f.asked = asked;
  return f;
};
const good = () => hostFetch({ [`${HOST}/sha256/${sha(A)}`]: A, [`${HOST}/sha256/${sha(B)}`]: B });

test('the site’s pin table is well formed: 54 keys and the k=13 to k=16 parameters', () => {
  const t = readProofFiles();
  assert.equal(t.ok, true, t.problem);
  assert.equal(Object.keys(t.files).filter((p) => p.startsWith('keys/')).length, 54);
  assert.deepEqual(
    Object.keys(t.files).filter((p) => p.startsWith('params/')),
    [13, 14, 15, 16].map((k) => `params/bls_midnight_2p${k}`),
  );
});

test('a pin table with a path that could climb out of its folder, or no SHA-256, is refused', () => {
  const t = (files) => JSON.stringify({ format: 'veilcore-proof-files/v1', files });
  assert.equal(parseProofFiles(t({ '../x.prover': sha(A) })).ok, false);
  assert.equal(parseProofFiles(t({ 'keys/a.prover': 'abc' })).ok, false);
  assert.equal(parseProofFiles(t({ 'zkir/a.bzkir': sha(A) })).ok, false);
  assert.equal(parseProofFiles(t({})).ok, false);
  assert.equal(parseProofFiles('{').ok, false);
  assert.equal(parseProofFiles(t(FILES)).ok, true);
});

test('published and matching: the deploy goes ahead', async () => {
  const r = await checkPublished({ host: HOST, files: FILES, fetchImpl: good() });
  assert.deepEqual([r.ok, r.checked, r.problems], [true, 2, []]);
});

test('a missing file: the deploy refuses, and says to publish first', async () => {
  const f = hostFetch({ [`${HOST}/sha256/${sha(A)}`]: A });
  const r = await checkPublished({ host: HOST, files: FILES, fetchImpl: f });
  assert.equal(r.ok, false);
  assert.match(r.problems.join(' '), /params\/bls_midnight_2p13: .* answered 404/);
});

test('a swapped file: the deploy refuses', async () => {
  const f = hostFetch({ [`${HOST}/sha256/${sha(A)}`]: A, [`${HOST}/sha256/${sha(B)}`]: Buffer.from('not the parameters') });
  const r = await checkPublished({ host: HOST, files: FILES, fetchImpl: f });
  assert.equal(r.ok, false);
  assert.match(r.problems.join(' '), /bls_midnight_2p13: .* is not the pinned file/);
});

test('a host the site may not read (no CORS), behind a login, or unreachable: refused, and each says why', async () => {
  assert.match((await checkPublished({ host: HOST, files: FILES, fetchImpl: hostFetch({ [`${HOST}/sha256/${sha(A)}`]: A, [`${HOST}/sha256/${sha(B)}`]: B }, { cors: false }) })).problems[0], /Access-Control-Allow-Origin/);
  assert.match((await checkPublished({ host: HOST, files: FILES, fetchImpl: hostFetch({}, { status: 401 }) })).problems[0], /Deployment Protection/);
  const down = async () => {
    throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } });
  };
  assert.match((await checkPublished({ host: HOST, files: FILES, fetchImpl: down })).problems[0], /could not be reached \(ENOTFOUND\)/);
});

test('the deploys’ refusal names the publish command', async () => {
  const r = await proofFilesReady({ host: HOST, fetchImpl: hostFetch({}) });
  assert.equal(r.ok, false);
  assert.ok(r.problem.includes(PUBLISH_COMMAND), r.problem);
  assert.match(r.problem, /not all on https:\/\/keys\.example/);
});

test('the deploys refuse a build folder that still has keys/ or params/ in it', () => {
  assert.deepEqual(bigFilesInBuild('/x', (p) => p.endsWith('params')), ['params']);
  assert.deepEqual(bigFilesInBuild('/x', () => false), []);
});

test('publishing takes each file from this computer only when it is the pinned one', () => {
  const disk = { [join('/r', 'contract/src/managed/veilcore-claims/keys/anchor.prover')]: A, [join('/r', 'bboard-ui/public/params/bls_midnight_2p13')]: B };
  const ok = gatherLocal(FILES, { repo: '/r', read: (f) => disk[f] });
  assert.equal(ok.ok, true);
  assert.equal(ok.bytes.get(sha(A)), A);
  const wrong = gatherLocal(FILES, { repo: '/r', read: (f) => (f.endsWith('2p13') ? Buffer.from('other') : disk[f]) });
  assert.deepEqual(wrong.problems, ['params/bls_midnight_2p13: the copy on this computer is not the pinned one.']);
  const none = gatherLocal(FILES, { repo: '/r', read: () => undefined });
  assert.equal(none.problems.length, 2);
});

test('a publish never drops what the host already holds, and stages it all by fingerprint', async () => {
  const OLD = Buffer.from('a v1 key an older release still uses');
  const held = { [sha(OLD)]: ['keys/anchor.prover'] };
  const merged = mergedList(held, FILES);
  assert.deepEqual(Object.keys(merged).sort(), [sha(A), sha(B), sha(OLD)].sort());
  assert.deepEqual(merged[sha(OLD)], ['keys/anchor.prover']);

  const local = new Map([
    [sha(A), A],
    [sha(B), B],
  ]);
  const got = await collect({ host: HOST, files: FILES, held, local, fetchImpl: hostFetch({ [`${HOST}/sha256/${sha(OLD)}`]: OLD }) });
  assert.equal(got.ok, true);
  const bad = await collect({ host: HOST, files: FILES, held, local, fetchImpl: hostFetch({ [`${HOST}/sha256/${sha(OLD)}`]: Buffer.from('changed') }) });
  assert.equal(bad.ok, false);
  assert.match(bad.problem, /did not serve it intact/);

  const dir = mkdtempSync(join(tmpdir(), 'proof-files-'));
  const staged = stageHost(dir, merged, got.bytes);
  assert.equal(staged.count, 3);
  for (const b of [A, B, OLD]) assert.deepEqual(readFileSync(join(dir, '.vercel/output/static/sha256', sha(b))), b);
  const list = parseHostList(readFileSync(join(dir, '.vercel/output/static/proof-files.json'), 'utf8'));
  assert.deepEqual(list, { ok: true, fingerprints: parseHostList(hostListText(merged)).fingerprints });
  assert.ok(existsSync(join(dir, '.vercel/output/config.json')));
  assert.throws(() => stageHost(dir, { [sha(Buffer.from('nothing'))]: ['keys/x.prover'] }, got.bytes), /No checked copy/);
});

test('the host: public files any page may read, no page of its own, nothing that runs', () => {
  const cfg = hostConfig();
  const all = cfg.routes[0].headers;
  assert.equal(all['Access-Control-Allow-Origin'], '*');
  assert.equal(all['Cross-Origin-Resource-Policy'], 'cross-origin');
  assert.match(all['Content-Security-Policy'], /default-src 'none'/);
  assert.equal(cfg.routes.at(-1).status, 404);
  assert.match(JSON.stringify(cfg), /immutable/);
});

test('what the host holds: nothing yet when it does not answer, refused when it answers something else', async () => {
  assert.deepEqual(await hostHolds(HOST, hostFetch({})), { ok: true, fingerprints: {}, first: true });
  const down = async () => {
    throw new TypeError('fetch failed');
  };
  assert.equal((await hostHolds(HOST, down)).first, true);
  const odd = await hostHolds(HOST, hostFetch({ [`${HOST}/proof-files.json`]: Buffer.from('{"hello":1}') }));
  assert.equal(odd.ok, false);
  const listed = await hostHolds(HOST, hostFetch({ [`${HOST}/proof-files.json`]: Buffer.from(hostListText({ [sha(A)]: ['keys/anchor.prover'] })) }));
  assert.deepEqual(listed.fingerprints, { [sha(A)]: ['keys/anchor.prover'] });
});

test('the publish refuses to deploy through anything but the proof files project', () => {
  assert.match(linkProblem(undefined, undefined), /not linked/);
  assert.match(linkProblem({ projectId: 'p1', projectName: 'veilcore' }, undefined), /not veilcore-proof-files/);
  assert.match(linkProblem({ projectId: 'site' }, { projectId: 'site' }), /site's own Vercel project/);
  assert.equal(linkProblem({ projectId: 'p2', projectName: 'veilcore-proof-files' }, { projectId: 'site' }), undefined);
});

test('the host is VeilCore’s own domain', () => {
  assert.equal(PROOF_FILES_HOST, 'https://keys.veilcore.org');
});

test('both site deploys check the host before building, and refuse a build that still carries the files', () => {
  for (const [file, build] of [
    ['deploy-mainnet.mjs', "run('npm', ['run', 'build:mainnet']"],
    ['deploy-test-site.mjs', "run('npm', ['run', 'build']"],
  ]) {
    const src = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');
    const check = src.indexOf('await proofFilesReady()');
    assert.ok(check > 0, `${file} checks the proof files`);
    assert.match(src, /if \(!proof\.ok\) fail\(proof\.problem\);/, file);
    assert.ok(check < src.indexOf(build), `${file}: checked before the build`);
    assert.match(src, /VITE_PROOF_FILES_URL: PROOF_FILES_HOST,/, file);
    const big = src.indexOf("bigFilesInBuild('.vercel/output/static')");
    assert.ok(big > src.indexOf(build) && big < src.indexOf("'deploy', '--prebuilt'"), `${file}: refused before upload`);
  }
  // And the site build itself leaves them out.
  const ui = JSON.parse(readFileSync(new URL('../bboard-ui/package.json', import.meta.url), 'utf8')).scripts;
  for (const s of ['build', 'build:preview', 'build:mainnet']) {
    assert.doesNotMatch(ui[s], /managed\/veilcore\/keys/, s);
    assert.match(ui[s], /rm -rf \.\/dist\/params \.\/dist\/keys"?$/, s);
  }
});
