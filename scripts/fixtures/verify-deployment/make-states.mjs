// Writes states.json: the contract states verify-deployment.test.mjs serves from a stand-in
// indexer. They are NOT recorded from mainnet (this was written where no indexer could be
// reached): they are built in Ledger 9's format, as mainnet's indexer serves states since the
// fork, from the verifier key files published as the zk-r4 release of this repository, with a
// maintenance authority like each mainnet contract's (one key, threshold 1, counter 16; the
// claims contract an empty committee). The test derives every tampered case from these.
//
//   node scripts/fixtures/verify-deployment/make-states.mjs <folder with the zk-r4 *.verifier files>
//
// Every key is checked against deployments/mainnet.json before anything is written.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as v9 from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import { loadDeployments, verifierPins } from '../../deployments.mjs';

const dir = process.argv[2];
if (!dir) {
  console.error('Give the folder holding the zk-r4 release\'s *.verifier files.');
  process.exit(2);
}
const d = loadDeployments('mainnet');
const out = { note: 'Built by make-states.mjs from the zk-r4 verifier keys; not recorded from a live indexer.', states: {} };
for (const c of d.contracts) {
  const s = new v9.ContractState();
  for (const [name, want] of Object.entries(verifierPins(c))) {
    const vk = new Uint8Array(readFileSync(path.join(dir, `${c.name}.${name}.verifier`)));
    const got = createHash('sha256').update(vk).digest('hex');
    if (got !== want) throw new Error(`${c.name}.${name}.verifier is not the published key (${got})`);
    const op = new v9.ContractOperation();
    op.verifierKey = vk;
    s.setOperation(name, op);
  }
  s.maintenanceAuthority = c.maintenanceAuthority.retired
    ? new v9.ContractMaintenanceAuthority([], 1, 1n)
    : new v9.ContractMaintenanceAuthority([v9.signatureVerifyingKey(v9.sampleSigningKey())], 1, 16n);
  out.states[c.address] = Buffer.from(s.serialize()).toString('hex');
}
writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'states.json'), JSON.stringify(out, null, 1) + '\n');
console.log('Wrote states.json');
