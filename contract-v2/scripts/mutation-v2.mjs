// Mutation pass over every assert and literal contract v2 adds (docs/contract-v2.md 1.3,
// 1.4). No mutation tool reads Compact, so the mutants are listed here by hand: each one
// removes or weakens one new check. For each, a copy of the workspace is compiled
// (--skip-zk) and src/test/v2-changes.test.ts is run against it. Every mutant must make
// that file fail ("killed"); one that passes is a gap in the tests.
//
//   COMPACTC=<path to compactc 0.36.1> node scripts/mutation-v2.mjs [mutant id ...]
//
// Writes nothing in the workspace: the copy is in a new temporary folder, removed after.
// SPDX-License-Identifier: Apache-2.0
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compilerCommand } from './compile.mjs';

const ws = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(ws, '..');

/** [id, file, text to find, its replacement, which occurrence (1-based), what it breaks] */
export const MUTANTS = [
  ['Z0', 'veilcore.compact', 'assert(disclose(secret != default<Bytes<32>>), "A secret cannot be all zeros");', '', 1, 'the zero-secret assert itself'],
  ['Z1', 'veilcore.compact', 'commit(nonZeroSecret(localGeneticSecret()))', 'commit(localGeneticSecret())', 1, 'liveSelf: the record secret'],
  ['Z2', 'veilcore.compact', 'commit(nonZeroSecret(incomingGeneticSecret()))', 'commit(incomingGeneticSecret())', 1, 'rotate: the incoming secret'],
  ['Z3', 'veilcore.compact', 'commit(nonZeroSecret(incomingGeneticSecret()))', 'commit(incomingGeneticSecret())', 2, 'recover: the incoming secret'],
  ['Z4', 'veilcore.compact', 'recoveryCommit(nonZeroSecret(recoverySecret()))', 'recoveryCommit(recoverySecret())', 1, 'recover: the recovery secret'],
  ['Z5', 'veilcore.compact', 'recoveryCommit(nonZeroSecret(recoverySecret()))', 'recoveryCommit(recoverySecret())', 2, 'replaceRecoveryCommitment: the recovery secret'],
  ['Z6', 'veilcore.compact', 'licenseCommit(nonZeroSecret(licenseSecret()), rc);', 'licenseCommit(licenseSecret(), rc);', 1, 'countersign: the licence secret'],
  ['Z7', 'veilcore.compact', 'licenseCommit(nonZeroSecret(licenseSecret()), rc), rc)', 'licenseCommit(licenseSecret(), rc), rc)', 1, 'proposeTransfer: the licence secret'],
  ['Z8', 'veilcore.compact', 'licenseCommit(nonZeroSecret(licenseSecret()), rc), rc)', 'licenseCommit(licenseSecret(), rc), rc)', 2, 'withdrawTransfer: the licence secret'],
  ['Z9', 'veilcore.compact', 'licenseCommit(nonZeroSecret(licenseSecret()), record)', 'licenseCommit(licenseSecret(), record)', 1, 'proveLicense: the licence secret'],
  ['V1', 'veilcore.compact', 'contractVersion = 2;', 'contractVersion = 3;', 1, 'main: contractVersion'],
  ['V2', 'veilcore.compact', 'predecessor = Bytes[0xa0,', 'predecessor = Bytes[0xa1,', 1, 'main: predecessor'],
  ['V3', 'veilcore-claims.compact', 'contractVersion = 2;', 'contractVersion = 1;', 1, 'claims: contractVersion'],
  ['V4', 'veilcore-claims.compact', 'predecessor = Bytes[0xef,', 'predecessor = Bytes[0xee,', 1, 'claims: predecessor'],
  ['R1', 'schnorr.compact', 'assert(disclose(hi) < 14 || (disclose(hi) == 14 && disclose(lo) < R_LO),', 'assert(true,', 1, 'the response range assert, removed'],
  ['R2', 'schnorr.compact', 'disclose(hi) < 14 ||', 'disclose(hi) < 15 ||', 1, 'high part bound one too high'],
  ['R3', 'schnorr.compact', 'disclose(hi) < 14 ||', 'disclose(hi) < 13 ||', 1, 'high part bound one too low'],
  ['R4', 'schnorr.compact', 'disclose(hi) == 14 &&', 'disclose(hi) == 15 &&', 1, 'top band moved to 15'],
  ['R5', 'schnorr.compact', 'disclose(lo) < R_LO)', 'disclose(lo) <= R_LO)', 1, 'r itself let through'],
  ['R6', 'schnorr.compact', 'disclose(hi) < 14 || (', 'disclose(hi) < 14 && (', 1, 'or weakened to and'],
  ['R7', 'schnorr.compact', '222104516725044372704429320860625768980218979470098935457522536959433977015;', '222104516725044372704429320860625768980218979470098935457522536959433977016;', 1, 'R_LO one too high'],
  ['R8', 'schnorr.compact', '222104516725044372704429320860625768980218979470098935457522536959433977015;', '222104516725044372704429320860625768980218979470098935457522536959433977014;', 1, 'R_LO one too low'],
  ['R9', 'schnorr.compact', '+ (lo as Field)) as JubjubScalar', '+ (lo as Field) + (1 as Field)) as JubjubScalar', 1, 'recomposition off by one'],
  ['R10', 'schnorr.compact', '(hi as Field) * TWO_248)', '(hi as Field) * (2 as Field))', 1, 'high part not shifted'],
];

const replaceNth = (text, find, repl, n) => {
  let at = -1;
  for (let i = 0; i < n; i++) {
    at = text.indexOf(find, at + 1);
    if (at < 0) throw new Error(`mutant text not found (occurrence ${n}): ${find}`);
  }
  return text.slice(0, at) + repl + text.slice(at + find.length);
};

const main = () => {
  const only = process.argv.slice(2);
  const [cc, lead] = compilerCommand();
  const root = mkdtempSync(join(tmpdir(), 'veilcore-v2-mutants-'));
  try {
    // The tests read ../../../contract/vectors and ../../../deployments from src/test, so
    // the copy sits beside links to the real ones.
    for (const d of ['contract', 'deployments', 'node_modules']) symlinkSync(join(repo, d), join(root, d));
    const copy = join(root, 'contract-v2');
    cpSync(ws, copy, {
      recursive: true,
      filter: (p) => !p.includes(`${'/'}managed`) && !p.endsWith('/node_modules') && !p.includes('/node_modules/'),
    });
    symlinkSync(join(ws, 'node_modules'), join(copy, 'node_modules'));
    const compile = (name) =>
      execFileSync(cc, [...lead, '--skip-zk', join(copy, 'src', `${name}.compact`), join(copy, 'src', 'managed', name)], {
        stdio: 'pipe',
      });
    const contractOf = (file) => (file === 'veilcore.compact' ? 'veilcore' : 'veilcore-claims');
    const test = () =>
      spawnSync('npx', ['vitest', 'run', 'src/test/v2-changes.test.ts'], { cwd: copy, stdio: 'pipe', encoding: 'utf8' });

    compile('veilcore');
    compile('veilcore-claims');
    const base = test();
    if (base.status !== 0) {
      console.error(base.stdout.slice(-3000));
      throw new Error('The unmutated build fails v2-changes.test.ts: fix that first.');
    }
    console.log('baseline: v2-changes.test.ts passes on the unmutated build');
    const results = [];
    for (const [id, file, find, repl, n, what] of MUTANTS) {
      if (only.length && !only.includes(id)) continue;
      const src = join(copy, 'src', file);
      const original = readFileSync(src, 'utf8');
      const name = file === 'schnorr.compact' ? 'veilcore-claims' : contractOf(file);
      let outcome;
      try {
        writeFileSync(src, replaceNth(original, find, repl, n));
        try {
          compile(name);
          const r = test();
          const failed = /(\d+) failed/.exec(r.stdout)?.[1];
          outcome = r.status === 0 ? 'SURVIVED' : `killed (${failed ?? '?'} tests failed)`;
        } catch (e) {
          outcome = `killed (does not compile: ${String(e.stderr ?? e).split('\n')[0].slice(0, 100)})`;
        }
      } finally {
        writeFileSync(src, original);
        compile(name);
      }
      results.push([id, what, outcome]);
      console.log(`${id.padEnd(4)} ${what.padEnd(46)} ${outcome}`);
    }
    const survived = results.filter((r) => r[2] === 'SURVIVED');
    console.log(`\n${results.length} mutants, ${results.length - survived.length} killed, ${survived.length} survived`);
    if (survived.length) process.exitCode = 1;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
