// npm run publish:proof-files — put the proving keys and public parameters the site pins on
// https://keys.veilcore.org, once per contract version (docs/proof-files.md).
//
// Run on the maintainer's Mac, from origin/main, like the site deploys (scripts/deploy-gate.mjs).
// It:
//   1. reads the pins (bboard-ui/src/veilcore/chain/proof-files.json) and, if the host is already
//      up, what it holds now (its /proof-files.json);
//   2. stops with "nothing to do" when every pinned file is already there, byte for byte;
//   3. takes each pinned file from this computer (the contracts' build or `veilcore-keys fetch`,
//      and bboard-ui/public/params from fetch-params.mjs) and checks it against its pin; and
//      every file the host already holds that this checkout doesn't pin is downloaded from the
//      host and checked against its own fingerprint, so a publish never removes anything an older
//      release of the site still uses;
//   4. stages them outside the repository (~/.veilcore/proof-files-stage), so this can never
//      be confused with the site's own Vercel link;
//   5. creates the Vercel project `veilcore-proof-files` the first time (with keys.veilcore.org
//      on it), links the stage folder to it and refuses if that link is the site's project;
//   6. makes one production deployment of the files (prebuilt: nothing is built on Vercel) and
//      points keys.veilcore.org at it;
//   7. downloads every pinned file back from keys.veilcore.org and checks it.
//
// The host keeps one production deployment, replaced only when a new contract version adds
// files: so the files take their space on Vercel once, not once per site deploy.
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { deployGate } from './deploy-gate.mjs';
import { vercelEnv } from './vercel-token.mjs';
import {
  PROOF_FILES_HOST,
  PROOF_FILES_PROJECT,
  checkPublished,
  gatherLocal,
  mergedList,
  parseHostList,
  readProofFiles,
  stageHost,
} from './proof-files.mjs';

export const STAGE_DIR = join(homedir(), '.veilcore', 'proof-files-stage');
const FETCH_KEYS = 'npm exec --package=@veilcore/contracts@0.3.0 -- veilcore-keys fetch --to contract/src/managed';
const FETCH_PARAMS = 'cd bboard-ui && node scripts/fetch-params.mjs && cd ..';
const VERCEL = './tools/vercel/node_modules/.bin/vercel';

const fail = (msg) => {
  console.error(`\nNOT PUBLISHED. keys.veilcore.org is unchanged. ${msg}\n`);
  process.exit(1);
};

const sha256 = (b) => createHash('sha256').update(b).digest('hex');

/**
 * What the host holds now, from its /proof-files.json. A host that doesn't exist yet (no
 * answer, or 404) holds nothing; one that answers something else is refused.
 * @returns {Promise<{ ok: true, fingerprints: Record<string, string[]>, first: boolean } | { ok: false, problem: string }>}
 */
export const hostHolds = async (host, fetchImpl = fetch) => {
  let res;
  try {
    res = await fetchImpl(`${host}/proof-files.json`, { signal: AbortSignal.timeout(20_000), cache: 'no-store' });
  } catch {
    return { ok: true, fingerprints: {}, first: true };
  }
  if (res.status === 404) return { ok: true, fingerprints: {}, first: true };
  if (!res.ok) return { ok: false, problem: `${host}/proof-files.json answered ${res.status}. Look at it before publishing over it.` };
  const list = parseHostList(await res.text());
  if (!list.ok) return { ok: false, problem: `${host} answers, but ${list.problem}` };
  return { ok: true, fingerprints: list.fingerprints, first: false };
};

/**
 * The files to stage, by fingerprint: the pins from `local`, and every other fingerprint the
 * host lists, downloaded from it and checked.
 * @returns {Promise<{ ok: true, bytes: Map<string, Uint8Array> } | { ok: false, problem: string }>}
 */
export const collect = async ({ host, files, held, local, fetchImpl = fetch }) => {
  const bytes = new Map(local);
  for (const sha of Object.keys(held)) {
    if (bytes.has(sha)) continue;
    let b;
    try {
      const res = await fetchImpl(`${host}/sha256/${sha}`, { signal: AbortSignal.timeout(120_000) });
      if (res.ok) b = new Uint8Array(await res.arrayBuffer());
    } catch {
      /* said below */
    }
    if (!b || sha256(b) !== sha)
      return {
        ok: false,
        problem: `${host} lists ${held[sha].join(', ')} (${sha}) but did not serve it intact, so it can't be kept. Nothing was changed.`,
      };
    bytes.set(sha, b);
  }
  for (const sha of Object.values(files)) if (!bytes.has(sha)) return { ok: false, problem: `No checked copy of ${sha}.` };
  return { ok: true, bytes };
};

/**
 * The stage folder's Vercel link must be the proof files project, in the site's own team, and
 * never the site's project.
 * @returns {string | undefined} the problem
 */
export const linkProblem = (stageLink, siteLink) => {
  if (!stageLink?.projectId) return 'The stage folder is not linked to a Vercel project.';
  if (stageLink.projectName && stageLink.projectName !== PROOF_FILES_PROJECT)
    return `The stage folder is linked to "${stageLink.projectName}", not ${PROOF_FILES_PROJECT}.`;
  if (siteLink?.projectId && siteLink.projectId === stageLink.projectId)
    return "The stage folder is linked to the site's own Vercel project. Nothing was deployed.";
  if (siteLink?.orgId && stageLink.orgId && stageLink.orgId !== siteLink.orgId)
    return "The stage folder is linked to a project in another Vercel team than the site's. Nothing was deployed.";
  return undefined;
};

/**
 * The Vercel team every call here names (`--scope`): the one the site's own project is in, from
 * its link (.vercel/project.json, `orgId`). Without it the CLI would use whichever team it was
 * last switched to, and could make the project in the wrong one.
 * @returns {string | undefined}
 */
export const scopeOf = (siteLink) => {
  const id = siteLink?.orgId;
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(id) ? id : undefined;
};

/**
 * The environment for every Vercel call. VERCEL_ORG_ID and VERCEL_PROJECT_ID are removed: the
 * CLI prefers them to the folder's link, so if they named the site's project, a `--prod` deploy
 * of the stage folder would replace veilcore.org.
 */
export const cliEnv = (env) => {
  const e = { ...env };
  delete e.VERCEL_ORG_ID;
  delete e.VERCEL_PROJECT_ID;
  return e;
};

/** Vercel's own words from a failed call, on one short line (never anything from the environment). */
const said = (e) =>
  String(e?.stderr || e?.stdout || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);

/**
 * Does the proof files project exist? Only Vercel saying there is no such project means "no":
 * any other failure (an expired login, no network) is a problem, never a reason to create it.
 * @param {() => unknown} inspect runs `vercel project inspect`, throwing when it fails
 * @returns {{ state: 'exists' | 'missing' } | { state: 'unknown', problem: string }}
 */
export const projectState = (inspect) => {
  try {
    inspect();
    return { state: 'exists' };
  } catch (e) {
    const words = `${e?.stderr ?? ''} ${e?.stdout ?? ''}`;
    if (/There is no project for|PROJECT_NOT_FOUND/.test(words)) return { state: 'missing' };
    const v = said(e);
    return {
      state: 'unknown',
      problem:
        `Vercel could not say whether the project ${PROOF_FILES_PROJECT} exists${v ? ` ("${v}")` : ''}. ` +
        'An expired login is the usual reason: run `./tools/vercel/node_modules/.bin/vercel login`, then this again.',
    };
  }
};

/**
 * The Vercel part of a publish, in order: the project and its domain the first time, the stage
 * folder's link (checked), one production deployment, and keys.veilcore.org pointed at it. Every
 * call names the site's team (`--scope`) and gets `env` without VERCEL_ORG_ID or
 * VERCEL_PROJECT_ID. Stops at the first failure with what to do, never with a stack trace.
 * `exec` runs the pinned CLI and returns what it printed; `capture` means its output is read here
 * (the inspect, for Vercel's words, and the deploy, for its address), else it goes to the terminal.
 * @param {{ exec: (args: string[], opts: { env: Record<string, string | undefined>, capture: boolean }) => string | undefined,
 *   env: Record<string, string | undefined>, siteLink: unknown, stageDir: string, readStageLink: () => unknown,
 *   log?: (line: string) => void }} o
 * @returns {{ ok: true, url: string, created: boolean } | { ok: false, problem: string }}
 */
export const vercelSteps = ({ exec, env, siteLink, stageDir, readStageLink, log = console.log }) => {
  const scope = scopeOf(siteLink);
  if (!scope)
    return {
      ok: false,
      problem:
        "This folder's .vercel/project.json doesn't name the site's Vercel team (orgId), so the proof files project " +
        "can't be put beside it. Run this from the Mac's veilcore folder, which deploys the site.",
    };
  const e = cliEnv(env);
  const domain = new URL(PROOF_FILES_HOST).host;
  const call = (args, capture = false) => exec([...args, '--scope', scope], { env: e, capture });
  const step = (what, args, after = '') => {
    try {
      call(args);
      return undefined;
    } catch (err) {
      const v = said(err);
      return `${what} failed${v ? ` ("${v}")` : ' (Vercel says why just above)'}.${after}`;
    }
  };

  const st = projectState(() => call(['project', 'inspect', PROOF_FILES_PROJECT], true));
  if (st.state === 'unknown') return { ok: false, problem: st.problem };
  const created = st.state === 'missing';
  if (created) {
    log(`Creating the Vercel project ${PROOF_FILES_PROJECT}…`);
    const p1 = step(`Creating the Vercel project ${PROOF_FILES_PROJECT}`, ['project', 'create', PROOF_FILES_PROJECT]);
    if (p1) return { ok: false, problem: p1 };
    const p2 = step(
      `Adding ${domain} to ${PROOF_FILES_PROJECT}`,
      ['domains', 'add', domain, PROOF_FILES_PROJECT],
      ` The project exists now. In Vercel, open ${PROOF_FILES_PROJECT} → Settings → Domains, add ${domain}, then run this again.`,
    );
    if (p2) return { ok: false, problem: p2 };
  }
  const p3 = step(`Linking the stage folder to ${PROOF_FILES_PROJECT}`, [
    'link',
    '--yes',
    '--project',
    PROOF_FILES_PROJECT,
    '--cwd',
    stageDir,
  ]);
  if (p3) return { ok: false, problem: p3 };
  const problem = linkProblem(readStageLink(), siteLink);
  if (problem) return { ok: false, problem };

  log('Uploading the proof files to Vercel (a few minutes the first time)…');
  let url;
  try {
    url = String(call(['deploy', '--prebuilt', '--prod', '--cwd', stageDir], true) ?? '').trim();
  } catch (err) {
    const v = said(err);
    return { ok: false, problem: `The deployment of the proof files failed${v ? ` ("${v}")` : ''}.` };
  }
  if (!/^https:\/\/\S+$/.test(url)) return { ok: false, problem: 'The deployment did not print its address.' };
  log(`Deployed ${url}`);
  const p4 = step(
    `Pointing ${domain} at ${url}`,
    ['alias', 'set', url, domain],
    ` Run \`./tools/vercel/node_modules/.bin/vercel alias set ${url} ${domain} --scope ${scope}\`, then \`npm run check:proof-files\`.`,
  );
  if (p4) return { ok: false, problem: p4 };
  return { ok: true, url, created };
};

const readJson = (f) => {
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return undefined;
  }
};

const main = async () => {
  if (process.platform !== 'darwin') fail("Run this on the maintainer's Mac (CLAUDE.md: deploys only from there).");
  const gate = await deployGate({ requireMain: true, argv: process.argv.slice(2), command: 'npm run publish:proof-files' });
  if (gate.problems.length) fail(gate.problems.join('\n'));
  for (const n of gate.notes) console.log(n);

  const table = readProofFiles();
  if (!table.ok) fail(table.problem);
  const pinned = Object.keys(table.files).length;

  const now = await checkPublished({ files: table.files });
  if (now.ok) {
    console.log(`\nAll ${now.checked} pinned files are already on ${PROOF_FILES_HOST}, each matching. Nothing to do.\n`);
    return;
  }

  const held = await hostHolds(PROOF_FILES_HOST);
  if (!held.ok) fail(held.problem);
  const local = gatherLocal(table.files);
  if (!local.ok)
    fail(
      `Not every pinned file is on this computer as pinned:\n  ${local.problems.slice(0, 8).join('\n  ')}\n` +
        `Get the keys with \`${FETCH_KEYS}\` and the parameters with \`${FETCH_PARAMS}\` (both check every file), then run this again.`,
    );
  const fingerprints = mergedList(held.fingerprints, table.files);
  const all = await collect({ host: PROOF_FILES_HOST, files: table.files, held: held.fingerprints, local: local.bytes });
  if (!all.ok) fail(all.problem);

  mkdirSync(STAGE_DIR, { recursive: true });
  const staged = stageHost(STAGE_DIR, fingerprints, all.bytes);
  console.log(
    `Staged ${staged.count} files (${(staged.bytes / 1e6).toFixed(1)} MB) in ${STAGE_DIR}: the ${pinned} this checkout pins` +
      (staged.count > new Set(Object.values(table.files)).size ? ', and the ones the host already held' : '') +
      '.',
  );

  const env = cliEnv(process.env);
  delete env.VERCEL_TOKEN;
  execFileSync('npm', ['ci', '--prefix', 'tools/vercel', '--include=dev', '--ignore-scripts', '--no-audit', '--no-fund'], {
    stdio: 'inherit',
    env,
  });

  // The project, the first time: created, with keys.veilcore.org on it (veilcore.org's DNS is on
  // Vercel, so nothing else is needed). A project domain follows this project's production
  // deploys only, never the site's.
  const done = vercelSteps({
    exec: (args, { env: e, capture }) =>
      execFileSync(VERCEL, args, {
        env: cliEnv(vercelEnv(e)),
        encoding: 'utf8',
        // The inspect is read here whole (is the project missing, or did something else fail?);
        // the deploy's address is read from its output, and its progress shown; the rest is shown.
        stdio: capture ? ['ignore', 'pipe', args[0] === 'project' ? 'pipe' : 'inherit'] : ['ignore', 'inherit', 'inherit'],
      }),
    env,
    siteLink: readJson('.vercel/project.json'),
    stageDir: STAGE_DIR,
    readStageLink: () => readJson(join(STAGE_DIR, '.vercel', 'project.json')),
  });
  if (!done.ok) fail(done.problem);

  console.log(`Checking every pinned file on ${PROOF_FILES_HOST}…`);
  const after = await checkPublished({ files: table.files });
  if (!after.ok)
    fail(
      `Deployed, but ${PROOF_FILES_HOST} does not serve every pinned file yet:\n  ${after.problems.slice(0, 8).join('\n  ')}\n` +
        'If it is only new, wait a minute and run `npm run check:proof-files`.',
    );
  console.log(`\nPublished: all ${after.checked} pinned files are on ${PROOF_FILES_HOST}, each matching (${(after.bytes / 1e6).toFixed(1)} MB).\n`);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
