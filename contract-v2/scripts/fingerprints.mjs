// The SHA-256 of every compiled artefact of contract v2: each circuit's verifier and prover
// key, its ZKIR (.bzkir), and the contract code. Run after a full build with keys
// (`npm run compact`, never --skip-zk, which makes no keys), on the maintainer's Mac and then
// on a second machine from the same commit; the two outputs must be identical, byte for byte
// (docs/runbooks/deploy-v2.md).
//
//   npm run fingerprints -w contract-v2                      print the table (markdown)
//   npm run fingerprints -w contract-v2 -- --out FILE        write it to FILE (never over one)
//   npm run fingerprints -w contract-v2 -- --compare FILE    compare this build with FILE
//                                                            (from the other machine)
//
// Exit 0: done, or the two match. Exit 1: they differ, or the build has no keys.
// It reads only local files and prints only hashes: no key or secret is shown.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ws = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTRACTS = ['veilcore', 'veilcore-claims'];
/** Keyed circuits: 24 in the main contract, 5 in the claims contract. */
export const EXPECTED_CIRCUITS = { veilcore: 24, 'veilcore-claims': 5 };
const ROW = /^\| `([^`]+)` \| `([0-9a-f]{64})` \|$/;

const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const git = (args) => {
  try {
    return execFileSync('git', args, { cwd: ws, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'unknown';
  }
};

/** [path relative to src/managed, sha256] for every artefact, sorted. Throws when keys are missing. */
export const artefacts = (managed = join(ws, 'src', 'managed')) => {
  const rows = [];
  for (const c of CONTRACTS) {
    const keys = join(managed, c, 'keys');
    if (!existsSync(keys))
      throw new Error(`${c} has no keys: build with \`npm run compact\` (with keys), not --skip-zk.`);
    const verifiers = readdirSync(keys).filter((f) => f.endsWith('.verifier'));
    if (verifiers.length !== EXPECTED_CIRCUITS[c])
      throw new Error(`${c} has ${verifiers.length} verifier keys; it should have ${EXPECTED_CIRCUITS[c]}.`);
    for (const f of readdirSync(keys).sort()) rows.push([`${c}/keys/${f}`, sha(join(keys, f))]);
    for (const f of readdirSync(join(managed, c, 'zkir')).sort())
      if (f.endsWith('.bzkir')) rows.push([`${c}/zkir/${f}`, sha(join(managed, c, 'zkir', f))]);
    rows.push([`${c}/contract/index.js`, sha(join(managed, c, 'contract', 'index.js'))]);
  }
  return rows.sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

export const table = (rows, meta) =>
  [
    '# Contract v2 build fingerprints',
    '',
    `Commit ${meta.commit}, compiler ${meta.compiler}. SHA-256 of each file under contract-v2/src/managed.`,
    '',
    '| File | SHA-256 |',
    '|---|---|',
    ...rows.map(([p, h]) => `| \`${p}\` | \`${h}\` |`),
    '',
  ].join('\n');

export const parse = (text) => {
  const m = new Map();
  for (const l of text.split('\n')) {
    const r = ROW.exec(l.trim());
    if (r) m.set(r[1], r[2]);
  }
  return m;
};

/** Lines naming every difference between two tables; empty when they match. */
export const differences = (mine, theirs) => {
  const out = [];
  for (const [p, h] of mine) if (!theirs.has(p)) out.push(`only here: ${p}`);
  else if (theirs.get(p) !== h) out.push(`DIFFERENT: ${p}`);
  for (const p of theirs.keys()) if (!mine.has(p)) out.push(`only there: ${p}`);
  return out;
};

const main = () => {
  const argv = process.argv.slice(2);
  const opt = (n) => {
    const i = argv.indexOf(n);
    return i < 0 ? undefined : argv[i + 1];
  };
  let rows;
  try {
    rows = artefacts();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const compiler = readFileSync(join(ws, 'compiler-version'), 'utf8').trim();
  const text = table(rows, { commit: git(['rev-parse', 'HEAD']), compiler });
  const compare = opt('--compare');
  if (compare) {
    const diff = differences(parse(text), parse(readFileSync(compare, 'utf8')));
    if (diff.length) {
      console.error(`The two builds DIFFER (${diff.length}):\n${diff.join('\n')}`);
      process.exit(1);
    }
    console.log(`The two builds match: ${rows.length} files, byte for byte.`);
    return;
  }
  const out = opt('--out');
  if (out) {
    if (existsSync(out)) {
      console.error(`${out} exists; not written over.`);
      process.exit(1);
    }
    writeFileSync(out, text);
    console.log(`Wrote ${rows.length} fingerprints to ${out}.`);
  } else process.stdout.write(text);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
