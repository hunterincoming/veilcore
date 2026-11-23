// Record what v1's compiled pure circuits return for a fixed set of inputs, so v2's can be
// compared with them byte for byte (src/test/v1-pure-circuits.test.ts). Run from the
// repository root, after v1 is compiled (contract/: npm run compact, compiler 0.31.1):
//
//   node contract-v2/scripts/v1-pure-vectors.mjs > contract-v2/src/test/fixtures/v1-pure-circuits.json
//
// V1_MANAGED overrides where v1's compiled contracts are (default contract/src/managed).
// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { cases, enc } from './pure-cases.mjs';

const managed = resolve(process.env.V1_MANAGED ?? 'contract/src/managed');
const load = async (name) => import(pathToFileURL(join(managed, name, 'contract', 'index.js')).href);
const info = (name) => JSON.parse(readFileSync(join(managed, name, 'compiler', 'contract-info.json'), 'utf8'));
const main = await load('veilcore');
const claims = await load('veilcore-claims');

const out = {
  source: 'v1 compiled pure circuits (contract/src/managed, compiler ' + info('veilcore')['compiler-version'] + ')',
  sha256: {
    veilcore: createHash('sha256').update(readFileSync(join(managed, 'veilcore', 'contract', 'index.js'))).digest('hex'),
    'veilcore-claims': createHash('sha256').update(readFileSync(join(managed, 'veilcore-claims', 'contract', 'index.js'))).digest('hex'),
  },
  cases: cases().map((c) => ({
    contract: c.contract,
    circuit: c.circuit,
    args: c.args.map(enc),
    out: enc((c.contract === 'veilcore' ? main : claims).pureCircuits[c.circuit](...c.args)),
  })),
};
console.log(JSON.stringify(out, null, 2));
