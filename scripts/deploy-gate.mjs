// The checks every site deploy runs first (deploy-mainnet.mjs, deploy-test-site.mjs), before
// anything is read, built or uploaded. A deploy goes out only from exactly what CI tested:
//
//   1. this computer has the commit on origin/main (mainnet only; the test site may try a
//      pushed branch), fetched just now,
//   2. nothing uncommitted or untracked in the checkout,
//   3. Node is the version in .nvmrc and npm the one CI checks (.github/actions/setup/action.yml),
//   4. GitHub says the commit's `install-and-test` check passed, from GitHub Actions itself.
//
// 4 asks GitHub's public API (no token), or `gh` if that fails. If neither answers, it refuses
// and says so: only after looking at the commit's checks on GitHub yourself, run it again with
// --i-checked-ci. That flag skips 4 only, never 1 to 3.
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const REPO = 'hunterincoming/veilcore';
export const CI_CHECK = 'install-and-test';
/** GitHub Actions' app id: a check run with this name from any other app does not count. */
export const ACTIONS_APP_ID = 15368;
export const OVERRIDE_FLAG = '--i-checked-ci';
const SETUP_ACTION = '.github/actions/setup/action.yml';

const short = (sha) => String(sha).slice(0, 7);

/** The Node version .nvmrc names, without a leading v, or undefined. */
export const nvmrcVersion = (text) => {
  const v = String(text ?? '').trim().replace(/^v/, '');
  return /^\d+\.\d+\.\d+$/.test(v) ? v : undefined;
};

/** The npm version CI insists on: the `test "$(npm --version)" = "x.y.z"` line. */
export const ciNpmVersion = (text) => String(text ?? '').match(/test "\$\(npm --version\)" = "(\d+\.\d+\.\d+)"/)?.[1];

/** @returns {string[]} one plain line per problem */
export const versionProblems = ({ node, nvmrc, npm, ciNpm }) => {
  const out = [];
  const want = nvmrcVersion(nvmrc);
  const have = String(node ?? '').replace(/^v/, '');
  if (!want) out.push('.nvmrc does not name a Node version (like 24.11.1).');
  else if (have !== want) out.push(`This is Node ${have}; deploys use Node ${want} (.nvmrc). Switch with \`nvm use\`, then run this again.`);
  if (!ciNpm) out.push(`Could not find the npm version CI checks (${SETUP_ACTION}).`);
  else if (String(npm ?? '').trim() !== ciNpm)
    out.push(`This is npm ${String(npm ?? '').trim() || '(none)'}; CI uses npm ${ciNpm}, the one that comes with Node ${want ?? '(see .nvmrc)'}.`);
  return out;
};

/** @returns {string[]} one plain line per problem */
export const gitProblems = ({ head, originMain, porcelain, requireMain }) => {
  const out = [];
  if (requireMain && head !== originMain)
    out.push(
      `This checkout is at ${short(head)}, not origin/main (${short(originMain)}). Run \`git checkout --detach origin/main\` (or pull main), then run this again.`,
    );
  if (String(porcelain ?? '').trim())
    out.push('The checkout has uncommitted or untracked files (`git status` lists them). Commit, stash or remove them, then run this again.');
  return out;
};

/**
 * Whether GitHub's check runs for a commit show `install-and-test` passed. Only GitHub
 * Actions' own runs count, and the newest one decides (a re-run replaces the one before).
 * @returns {string | undefined} the problem, or undefined when it passed
 */
export const ciProblem = (json, sha) => {
  const runs = (Array.isArray(json?.check_runs) ? json.check_runs : []).filter(
    (r) => r?.name === CI_CHECK && r?.app?.id === ACTIONS_APP_ID,
  );
  if (!runs.length)
    return `GitHub has no ${CI_CHECK} result for ${short(sha)} yet. Push it, wait for CI, then run this again.`;
  const newest = runs.reduce((a, b) => (String(b.started_at ?? '') > String(a.started_at ?? '') || (b.started_at === a.started_at && b.id > a.id) ? b : a));
  if (newest.status !== 'completed')
    return `CI (${CI_CHECK}) is still running for ${short(sha)}. Wait until it finishes, then run this again.`;
  if (newest.conclusion !== 'success')
    return `CI (${CI_CHECK}) did not pass for ${short(sha)} (it says "${newest.conclusion}"). Fix that first.`;
  return undefined;
};

const checkRunsPath = (sha) => `repos/${REPO}/commits/${sha}/check-runs?check_name=${CI_CHECK}&per_page=100`;

/**
 * The commit's check runs: the public API first, then `gh`.
 * @returns {Promise<{ ok: true, json: unknown } | { ok: false }>}
 */
export const readCheckRuns = async (sha, { fetchImpl = fetch, gh } = {}) => {
  try {
    const r = await fetchImpl(`https://api.github.com/${checkRunsPath(sha)}`, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'veilcore-deploy' },
      signal: AbortSignal.timeout(20_000),
    });
    if (r.ok) return { ok: true, json: await r.json() };
  } catch {
    /* try gh */
  }
  try {
    const out = (gh ?? ((args) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })))([
      'api',
      checkRunsPath(sha),
    ]);
    return { ok: true, json: JSON.parse(out) };
  } catch {
    return { ok: false };
  }
};

const realDeps = () => ({
  git: (args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(),
  npmVersion: () => execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(),
  node: process.version,
  read: (f) => readFileSync(f, 'utf8'),
  fetchImpl: fetch,
  gh: undefined,
});

/**
 * Run every check. `command` is how the founder ran it (for the override line).
 * @returns {Promise<{ problems: string[], notes: string[] }>}
 */
export const deployGate = async ({ requireMain, argv = [], command, deps: given = {} }) => {
  const deps = { ...realDeps(), ...given };
  const problems = [];
  const notes = [];
  const override = argv.includes(OVERRIDE_FLAG);

  let head = '';
  try {
    deps.git(['fetch', '--quiet', 'origin', 'main']);
    head = deps.git(['rev-parse', 'HEAD']);
    const originMain = deps.git(['rev-parse', 'origin/main']);
    const porcelain = deps.git(['status', '--porcelain']);
    problems.push(...gitProblems({ head, originMain, porcelain, requireMain }));
  } catch {
    problems.push('Could not run git (fetch origin main, rev-parse, status). Check the internet connection and that this is the repository folder.');
  }

  let nvmrc;
  let setup;
  try {
    nvmrc = deps.read('.nvmrc');
  } catch {
    /* reported as missing */
  }
  try {
    setup = deps.read(SETUP_ACTION);
  } catch {
    /* reported as missing */
  }
  let npm = '';
  try {
    npm = deps.npmVersion();
  } catch {
    /* reported as wrong */
  }
  problems.push(...versionProblems({ node: deps.node, nvmrc, npm, ciNpm: ciNpmVersion(setup) }));

  if (/^[0-9a-f]{40}$/.test(head)) {
    const runs = await readCheckRuns(head, deps);
    if (runs.ok) {
      const p = ciProblem(runs.json, head);
      if (p) problems.push(p);
      else notes.push(`CI passed for ${short(head)}.`);
    } else if (override) {
      notes.push(`Could not reach GitHub; going on because of ${OVERRIDE_FLAG} (you looked at CI for ${short(head)} yourself).`);
    } else {
      problems.push(
        `Could not ask GitHub whether CI passed for ${short(head)}. Look at https://github.com/${REPO}/commit/${head} yourself; only if ${CI_CHECK} has a green tick there, run the same command again with \`${command} -- ${OVERRIDE_FLAG}\` in place of \`${command}\`.`,
      );
    }
  }
  return { problems, notes };
};
