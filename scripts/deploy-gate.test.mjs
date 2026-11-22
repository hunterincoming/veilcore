// node --test scripts/deploy-gate.test.mjs
// SPDX-License-Identifier: Apache-2.0
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ACTIONS_APP_ID,
  CI_CHECK,
  OVERRIDE_FLAG,
  ciNpmVersion,
  ciProblem,
  deployGate,
  gitProblems,
  nvmrcVersion,
  readCheckRuns,
  versionProblems,
} from './deploy-gate.mjs';

const SHA = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);
const run = (over = {}) => ({
  id: 1,
  name: CI_CHECK,
  status: 'completed',
  conclusion: 'success',
  started_at: '2026-11-22T10:00:00Z',
  app: { id: ACTIONS_APP_ID },
  ...over,
});

test('the Node and npm versions come from .nvmrc and the CI setup, and must match', () => {
  assert.equal(nvmrcVersion('24.11.1\n'), '24.11.1');
  assert.equal(nvmrcVersion('v24.11.1'), '24.11.1');
  assert.equal(nvmrcVersion('lts/*'), undefined);
  assert.equal(ciNpmVersion('  test "$(npm --version)" = "11.6.2"\n'), '11.6.2');
  assert.equal(ciNpmVersion('npm --version'), undefined);
  const ok = { node: 'v24.11.1', nvmrc: '24.11.1', npm: '11.6.2', ciNpm: '11.6.2' };
  assert.deepEqual(versionProblems(ok), []);
  assert.match(versionProblems({ ...ok, node: 'v22.1.0' })[0], /Node 22\.1\.0; deploys use Node 24\.11\.1/);
  assert.match(versionProblems({ ...ok, npm: '11.7.0' })[0], /npm 11\.7\.0; CI uses npm 11\.6\.2/);
  assert.match(versionProblems({ ...ok, nvmrc: '' })[0], /\.nvmrc does not name/);
  assert.match(versionProblems({ ...ok, ciNpm: undefined })[0], /Could not find the npm version/);
});

test('the real CI setup states the npm version, and .nvmrc a Node version', () => {
  assert.ok(ciNpmVersion(readFileSync('.github/actions/setup/action.yml', 'utf8')));
  assert.ok(nvmrcVersion(readFileSync('.nvmrc', 'utf8')));
});

test('mainnet needs HEAD to be origin/main; every deploy needs a clean checkout', () => {
  assert.deepEqual(gitProblems({ head: SHA, originMain: SHA, porcelain: '', requireMain: true }), []);
  assert.match(gitProblems({ head: SHA, originMain: OTHER, porcelain: '', requireMain: true })[0], /not origin\/main/);
  assert.deepEqual(gitProblems({ head: SHA, originMain: OTHER, porcelain: '', requireMain: false }), []);
  assert.match(gitProblems({ head: SHA, originMain: SHA, porcelain: '?? notes.txt\n', requireMain: false })[0], /uncommitted or untracked/);
  for (const p of gitProblems({ head: SHA, originMain: OTHER, porcelain: ' M a', requireMain: true })) assert.ok(!p.includes('\n'));
});

test('CI must have passed, by GitHub Actions itself, on its newest run', () => {
  assert.equal(ciProblem({ check_runs: [run()] }, SHA), undefined);
  assert.match(ciProblem({ check_runs: [] }, SHA), /no install-and-test result/);
  assert.match(ciProblem(undefined, SHA), /no install-and-test result/);
  assert.match(ciProblem({ check_runs: [run({ status: 'in_progress', conclusion: null })] }, SHA), /still running/);
  assert.match(ciProblem({ check_runs: [run({ conclusion: 'failure' })] }, SHA), /did not pass .*"failure"/);
  assert.match(ciProblem({ check_runs: [run({ conclusion: 'skipped' })] }, SHA), /did not pass/);
  // Another app can post a check run with the same name: it does not count.
  assert.match(ciProblem({ check_runs: [run({ app: { id: 999 } })] }, SHA), /no install-and-test result/);
  // A re-run replaces the run before it, both ways.
  const old = run({ id: 1, conclusion: 'failure', started_at: '2026-11-22T10:00:00Z' });
  const rerun = run({ id: 2, started_at: '2026-11-22T11:00:00Z' });
  assert.equal(ciProblem({ check_runs: [old, rerun] }, SHA), undefined);
  assert.match(ciProblem({ check_runs: [rerun, { ...old, id: 3, started_at: '2026-11-22T12:00:00Z' }] }, SHA), /did not pass/);
});

test('GitHub is asked with no token first, then through gh', async () => {
  const seen = [];
  const fetchOk = async (url, init) => {
    seen.push([url, init.headers]);
    return new Response(JSON.stringify({ check_runs: [run()] }), { status: 200 });
  };
  const r = await readCheckRuns(SHA, { fetchImpl: fetchOk, gh: () => assert.fail('gh not needed') });
  assert.equal(r.ok, true);
  assert.match(seen[0][0], new RegExp(`^https://api\\.github\\.com/repos/hunterincoming/veilcore/commits/${SHA}/check-runs\\?check_name=install-and-test`));
  assert.ok(!('authorization' in seen[0][1]));
  const limited = async () => new Response('{}', { status: 403 });
  const viaGh = await readCheckRuns(SHA, { fetchImpl: limited, gh: () => JSON.stringify({ check_runs: [run()] }) });
  assert.deepEqual(viaGh, { ok: true, json: { check_runs: [run()] } });
  const down = async () => {
    throw new Error('offline');
  };
  assert.deepEqual(
    await readCheckRuns(SHA, {
      fetchImpl: down,
      gh: () => {
        throw new Error('no gh');
      },
    }),
    { ok: false },
  );
});

const deps = (over = {}) => ({
  git: (args) =>
    ({ fetch: '', 'rev-parse HEAD': SHA, 'rev-parse origin/main': SHA, status: '' })[
      args[0] === 'fetch' ? 'fetch' : args[0] === 'status' ? 'status' : args.join(' ')
    ],
  npmVersion: () => '11.6.2',
  node: 'v24.11.1',
  read: (f) => (f === '.nvmrc' ? '24.11.1\n' : 'test "$(npm --version)" = "11.6.2"'),
  fetchImpl: async () => new Response(JSON.stringify({ check_runs: [run()] }), { status: 200 }),
  gh: () => {
    throw new Error('no gh');
  },
  ...over,
});
const unreachable = { fetchImpl: async () => new Response('', { status: 500 }) };

test('the whole gate: passes only when everything holds', async () => {
  const ok = await deployGate({ requireMain: true, command: 'npm run deploy:mainnet', deps: deps() });
  assert.deepEqual(ok, { problems: [], notes: [`CI passed for ${SHA.slice(0, 7)}.`] });

  const behind = await deployGate({
    requireMain: true,
    command: 'npm run deploy:mainnet',
    deps: deps({ git: (a) => (a[0] === 'rev-parse' && a[1] === 'origin/main' ? OTHER : deps().git(a)) }),
  });
  assert.equal(behind.problems.length, 1);
  assert.match(behind.problems[0], /not origin\/main/);

  const noGit = await deployGate({
    requireMain: true,
    command: 'x',
    deps: deps({
      git: () => {
        throw new Error('no git');
      },
    }),
  });
  assert.match(noGit.problems[0], /Could not run git/);
});

test('GitHub unreachable: refused, with the exact override; the override skips only the CI question', async () => {
  const refused = await deployGate({ requireMain: true, command: 'npm run deploy:mainnet', deps: deps(unreachable) });
  assert.equal(refused.problems.length, 1);
  assert.ok(refused.problems[0].includes(`npm run deploy:mainnet -- ${OVERRIDE_FLAG}`));
  assert.ok(!refused.problems[0].includes('\n'));

  const overridden = await deployGate({ requireMain: true, argv: [OVERRIDE_FLAG], command: 'npm run deploy:mainnet', deps: deps(unreachable) });
  assert.deepEqual(overridden.problems, []);
  assert.match(overridden.notes[0], /going on because of --i-checked-ci/);

  // The override never covers a failed CI, a dirty checkout, the wrong branch or the wrong Node.
  const failed = deps({ fetchImpl: async () => new Response(JSON.stringify({ check_runs: [run({ conclusion: 'failure' })] })) });
  assert.match((await deployGate({ requireMain: true, argv: [OVERRIDE_FLAG], command: 'x', deps: failed })).problems[0], /did not pass/);
  const dirty = deps({ ...unreachable, git: (a) => (a[0] === 'status' ? ' M x' : deps().git(a)) });
  assert.match((await deployGate({ requireMain: true, argv: [OVERRIDE_FLAG], command: 'x', deps: dirty })).problems[0], /uncommitted/);
  const oldNode = deps({ ...unreachable, node: 'v22.0.0' });
  assert.match((await deployGate({ requireMain: true, argv: [OVERRIDE_FLAG], command: 'x', deps: oldNode })).problems[0], /Node 22/);
});

test('both deploy scripts run the gate before anything else', () => {
  for (const [file, main] of [
    ['scripts/deploy-mainnet.mjs', 'requireMain: true'],
    ['scripts/deploy-test-site.mjs', 'requireMain: false'],
  ]) {
    const src = readFileSync(file, 'utf8');
    const body = src.slice(src.indexOf('const main = async () => {'));
    const first = body.split('\n')[1];
    assert.match(first, /await deployGate\(/, file);
    assert.ok(first.includes(main), file);
    assert.match(body.split('\n')[2], /if \(gate\.problems\.length\) fail\(/, file);
  }
});
