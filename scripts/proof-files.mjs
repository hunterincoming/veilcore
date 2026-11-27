// The proof files: the proving keys and Midnight's public parameters (over 135 MB), which never
// change for a contract version. They are not in the site's build any more (each deploy used to
// store another full copy on Vercel, and the team's 10 GB filled up). They are published once on
// VeilCore's own proof file host, https://keys.veilcore.org (scripts/publish-proof-files.mjs),
// and the site fetches each one by its SHA-256 and checks it against the fingerprint pinned in
// the build (bboard-ui/src/veilcore/chain/proof-files.json, proof-files.ts).
//
// The host is a second project on VeilCore's Vercel team, `veilcore-proof-files`, with one
// production deployment that holds every file ever published, at
//
//   /sha256/<SHA-256 of the file>     the file itself (public, the same for everyone)
//   /proof-files.json                 the names each fingerprint has had ("keys/anchor.prover", …)
//
// A file's address is its fingerprint, so it never changes and a publish can never replace one.
//
// This module is shared by the publish script and both site deploys, which refuse to deploy a
// site whose pinned files are not all on the host, byte for byte (checkPublished).
// SPDX-License-Identifier: Apache-2.0

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Where the site's build reads its proof files from (VITE_PROOF_FILES_URL). */
export const PROOF_FILES_HOST = 'https://keys.veilcore.org';
/** The Vercel project that serves it: not the site's project, so a site deploy never touches it. */
export const PROOF_FILES_PROJECT = 'veilcore-proof-files';
/** The pins the site is built with. */
export const PROOF_FILES_TABLE = 'bboard-ui/src/veilcore/chain/proof-files.json';
export const PROOF_FILES_FORMAT = 'veilcore-proof-files/v1';
/** The command that publishes them (package.json). */
export const PUBLISH_COMMAND = 'npm run publish:proof-files';

const HEX64 = /^[0-9a-f]{64}$/;
/** A pinned path: a key or a parameter file, nothing that could climb out of its folder. */
const PATH = /^(keys\/[A-Za-z_][A-Za-z0-9_]*\.(prover|verifier)|params\/bls_midnight_2p[0-9]{1,2})$/;

const sha256 = (b) => createHash('sha256').update(b).digest('hex');

/**
 * The pin table, checked: { format, files: { "keys/anchor.prover": "<sha256>", … } }.
 * @returns {{ ok: true, files: Record<string, string> } | { ok: false, problem: string }}
 */
export const parseProofFiles = (text, name = PROOF_FILES_TABLE) => {
  let v;
  try {
    v = JSON.parse(text);
  } catch {
    return { ok: false, problem: `${name} is not JSON.` };
  }
  if (v?.format !== PROOF_FILES_FORMAT || typeof v.files !== 'object' || v.files === null || Array.isArray(v.files))
    return { ok: false, problem: `${name} is not a proof files list (${PROOF_FILES_FORMAT}).` };
  const entries = Object.entries(v.files);
  if (entries.length === 0) return { ok: false, problem: `${name} lists no files.` };
  for (const [p, h] of entries) {
    if (!PATH.test(p)) return { ok: false, problem: `${name}: "${p}" is not a key or parameter file name.` };
    if (typeof h !== 'string' || !HEX64.test(h)) return { ok: false, problem: `${name}: ${p} has no SHA-256.` };
  }
  return { ok: true, files: Object.fromEntries(entries.sort(([a], [b]) => (a < b ? -1 : 1))) };
};

/** The site's pin table from this checkout. */
export const readProofFiles = (repo = REPO) => {
  const file = join(repo, PROOF_FILES_TABLE);
  if (!existsSync(file)) return { ok: false, problem: `${PROOF_FILES_TABLE} is missing.` };
  return parseProofFiles(readFileSync(file, 'utf8'));
};

/** Where a pinned file is on this computer: the contracts' build (or `veilcore-keys fetch`), and fetch-params.mjs's folder. */
export const localPathOf = (path, repo = REPO) => {
  if (path.startsWith('params/')) return [join(repo, 'bboard-ui', 'public', path)];
  return ['veilcore', 'veilcore-claims'].map((c) => join(repo, 'contract', 'src', 'managed', c, path));
};

/**
 * Every pinned file from this computer, checked: for each, the first local copy whose SHA-256 is
 * the pin. A file with no matching copy is a problem; nothing is staged then.
 * @returns {{ ok: true, bytes: Map<string, Uint8Array> } | { ok: false, problems: string[] }}
 */
export const gatherLocal = (files, { repo = REPO, read = (f) => (existsSync(f) ? readFileSync(f) : undefined) } = {}) => {
  const bytes = new Map();
  const problems = [];
  for (const [path, want] of Object.entries(files)) {
    let found = false;
    let wrong = false;
    for (const f of localPathOf(path, repo)) {
      const b = read(f);
      if (b === undefined) continue;
      if (sha256(b) === want) {
        bytes.set(want, b);
        found = true;
        break;
      }
      wrong = true;
    }
    if (!found) problems.push(wrong ? `${path}: the copy on this computer is not the pinned one.` : `${path}: not on this computer.`);
  }
  return problems.length ? { ok: false, problems } : { ok: true, bytes };
};

/** The headers the host sends. Public files, the same for everyone: any site may read them, nothing runs. */
export const HOST_HEADERS = Object.freeze({
  'Access-Control-Allow-Origin': '*',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
});

/** .vercel/output/config.json for the host: the headers, the files by fingerprint, and nothing else (no page). */
export const hostConfig = () => ({
  version: 3,
  routes: [
    { src: '/.*', headers: { ...HOST_HEADERS }, continue: true },
    {
      src: '^/sha256/[0-9a-f]{64}$',
      headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable' },
      continue: true,
    },
    { src: '^/proof-files\\.json$', headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }, continue: true },
    { handle: 'filesystem' },
    { src: '/.*', status: 404 },
  ],
});

export const HOST_LIST_FORMAT = 'veilcore-proof-files-host/v1';

/**
 * The host's /proof-files.json: { format, fingerprints: { "<sha256>": ["keys/anchor.prover", …] } }.
 * Keyed by fingerprint, so two contract versions' files with the same name never collide.
 */
export const hostListText = (fingerprints) => {
  const sorted = Object.fromEntries(
    Object.entries(fingerprints)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([h, names]) => [h, [...new Set(names)].sort()]),
  );
  return `${JSON.stringify({ format: HOST_LIST_FORMAT, fingerprints: sorted }, null, 2)}\n`;
};

/**
 * The host's list, checked. @returns {{ ok: true, fingerprints: Record<string, string[]> } | { ok: false, problem: string }}
 */
export const parseHostList = (text) => {
  let v;
  try {
    v = JSON.parse(text);
  } catch {
    return { ok: false, problem: 'its /proof-files.json is not JSON.' };
  }
  if (v?.format !== HOST_LIST_FORMAT || typeof v.fingerprints !== 'object' || v.fingerprints === null || Array.isArray(v.fingerprints))
    return { ok: false, problem: `its /proof-files.json is not a ${HOST_LIST_FORMAT} list.` };
  for (const [h, names] of Object.entries(v.fingerprints))
    if (!HEX64.test(h) || !Array.isArray(names) || !names.every((n) => typeof n === 'string' && PATH.test(n)))
      return { ok: false, problem: `its /proof-files.json has an entry that is not a fingerprint and file names (${h}).` };
  return { ok: true, fingerprints: v.fingerprints };
};

/** What the host will list after a publish: what it listed before, plus the pins. Nothing is ever dropped. */
export const mergedList = (before, files) => {
  const out = Object.fromEntries(Object.entries(before ?? {}).map(([h, n]) => [h, [...n]]));
  for (const [path, h] of Object.entries(files)) out[h] = [...new Set([...(out[h] ?? []), path])].sort();
  return out;
};

/**
 * Write the host's prebuilt output into `dir` (`dir`/.vercel/output): every listed fingerprint's
 * file at /sha256/<fingerprint>, the list, and the config. `bytes` maps fingerprint to bytes, and
 * each is checked again here. Returns how many files and bytes were staged.
 */
export const stageHost = (dir, fingerprints, bytes) => {
  const out = join(dir, '.vercel', 'output');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, 'static', 'sha256'), { recursive: true });
  let total = 0;
  const shas = new Set(Object.keys(fingerprints));
  for (const sha of shas) {
    const b = bytes.get(sha);
    if (!b || sha256(b) !== sha) throw new Error(`No checked copy of ${sha} to stage.`);
    writeFileSync(join(out, 'static', 'sha256', sha), b);
    total += b.length;
  }
  writeFileSync(join(out, 'static', 'proof-files.json'), hostListText(fingerprints));
  writeFileSync(join(out, 'config.json'), `${JSON.stringify(hostConfig(), null, 2)}\n`);
  return { count: shas.size, bytes: total, out };
};

/**
 * Whether `host` serves every pinned file, byte for byte, to any site (CORS): each fingerprint
 * is downloaded and hashed. What the deploys run before building, and the publish after.
 * @returns {Promise<{ ok: boolean, checked: number, bytes: number, problems: string[] }>}
 */
export const checkPublished = async ({ host = PROOF_FILES_HOST, files, fetchImpl = fetch, concurrency = 6, timeoutMs = 120_000 }) => {
  const shas = [...new Map(Object.entries(files).map(([p, h]) => [h, p])).entries()];
  const problems = [];
  let checked = 0;
  let total = 0;
  let next = 0;
  const one = async ([sha, path]) => {
    const url = `${host}/sha256/${sha}`;
    let res;
    try {
      res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs), headers: { origin: 'https://veilcore.org' } });
    } catch (e) {
      problems.push(`${path}: ${url} could not be reached (${e?.cause?.code ?? e?.message ?? e}).`);
      return;
    }
    if (res.status === 401 || res.status === 403)
      return void problems.push(
        `${path}: ${url} answered ${res.status}: the host is behind Vercel's login. In Vercel, ${PROOF_FILES_PROJECT} → Settings → Deployment Protection, turn Vercel Authentication off.`,
      );
    if (!res.ok) return void problems.push(`${path}: ${url} answered ${res.status}.`);
    if ((res.headers.get('content-type') ?? '').includes('text/html'))
      return void problems.push(`${path}: ${url} answered with a web page, not the file.`);
    if (res.headers.get('access-control-allow-origin') !== '*')
      return void problems.push(`${path}: ${url} does not let the site read it (no Access-Control-Allow-Origin: *).`);
    const b = new Uint8Array(await res.arrayBuffer());
    if (sha256(b) !== sha) return void problems.push(`${path}: ${url} is not the pinned file.`);
    checked++;
    total += b.length;
  };
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, shas.length)) }, async () => {
      while (next < shas.length) await one(shas[next++]);
    }),
  );
  problems.sort();
  return { ok: problems.length === 0 && checked === shas.length, checked, bytes: total, problems };
};

/** What a deploy says when checkPublished found problems: the fix, then the first few problems. */
export const notPublishedProblem = (result, host = PROOF_FILES_HOST) =>
  `The proving files this site is built to use are not all on ${host} (${result.problems.length} problem${result.problems.length === 1 ? '' : 's'}). ` +
  `Publish them first: \`${PUBLISH_COMMAND}\` (docs/proof-files.md). Then run this again.\n  ` +
  result.problems.slice(0, 5).join('\n  ') +
  (result.problems.length > 5 ? `\n  …and ${result.problems.length - 5} more.` : '');

/**
 * The deploy's check: the pins read, and every one on the host.
 * @returns {Promise<{ ok: true, line: string } | { ok: false, problem: string }>}
 */
export const proofFilesReady = async ({ host = PROOF_FILES_HOST, repo = REPO, fetchImpl = fetch } = {}) => {
  const table = readProofFiles(repo);
  if (!table.ok) return { ok: false, problem: table.problem };
  const r = await checkPublished({ host, files: table.files, fetchImpl });
  if (!r.ok) return { ok: false, problem: notPublishedProblem(r, host) };
  return { ok: true, files: table.files, line: `Proof files: all ${r.checked} on ${host}, each matching its pinned SHA-256 (${(r.bytes / 1e6).toFixed(1)} MB, not in the site's build).` };
};

/** A build folder that still carries the big files (a stale public/params, a hand copy) is refused before upload. */
export const bigFilesInBuild = (staticDir, exists = existsSync) => ['keys', 'params'].filter((d) => exists(join(staticDir, d)));

// npm run check:proof-files: is every file this checkout pins on the host? Downloads and hashes each.
const main = async () => {
  const r = await proofFilesReady();
  if (!r.ok) {
    console.error(`\n${r.problem}\n`);
    process.exit(1);
  }
  console.log(r.line);
};
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
