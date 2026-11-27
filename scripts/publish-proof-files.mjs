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
 * The stage folder's Vercel link must be the proof files project, never the site's.
 * @returns {string | undefined} the problem
 */
export const linkProblem = (stageLink, siteLink) => {
  if (!stageLink?.projectId) return 'The stage folder is not linked to a Vercel project.';
  if (stageLink.projectName && stageLink.projectName !== PROOF_FILES_PROJECT)
    return `The stage folder is linked to "${stageLink.projectName}", not ${PROOF_FILES_PROJECT}.`;
  if (siteLink?.projectId && siteLink.projectId === stageLink.projectId)
    return "The stage folder is linked to the site's own Vercel project. Nothing was deployed.";
  return undefined;
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

  const env = { ...process.env };
  delete env.VERCEL_TOKEN;
  const run = (args, opts = {}) => execFileSync(VERCEL, args, { stdio: 'inherit', env: vercelEnv(env), ...opts });
  execFileSync('npm', ['ci', '--prefix', 'tools/vercel', '--include=dev', '--ignore-scripts', '--no-audit', '--no-fund'], {
    stdio: 'inherit',
    env,
  });

  // The project, the first time: created, with keys.veilcore.org on it (veilcore.org's DNS is on
  // Vercel, so nothing else is needed). A project domain follows this project's production
  // deploys only, never the site's.
  let exists = true;
  try {
    execFileSync(VERCEL, ['project', 'inspect', PROOF_FILES_PROJECT], { stdio: 'ignore', env: vercelEnv(env) });
  } catch {
    exists = false;
  }
  if (!exists) {
    console.log(`Creating the Vercel project ${PROOF_FILES_PROJECT}…`);
    run(['project', 'create', PROOF_FILES_PROJECT]);
    run(['domains', 'add', new URL(PROOF_FILES_HOST).host, PROOF_FILES_PROJECT]);
  }
  run(['link', '--yes', '--project', PROOF_FILES_PROJECT, '--cwd', STAGE_DIR]);
  const problem = linkProblem(readJson(join(STAGE_DIR, '.vercel', 'project.json')), readJson('.vercel/project.json'));
  if (problem) fail(problem);

  const url = execFileSync(VERCEL, ['deploy', '--prebuilt', '--prod', '--cwd', STAGE_DIR], {
    env: vercelEnv(env),
    encoding: 'utf8',
  }).trim();
  console.log(`Deployed ${url}`);
  run(['alias', 'set', url, new URL(PROOF_FILES_HOST).host]);

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
