// What contract v2's constructor starts a contract with: its ledger data, and the whole state as
// Ledger 9 bytes. Needs the compiled contract (`npm run compact -w contract-v2`, keys or not);
// v2's constructor takes no argument and reads no witness, so there is exactly one genuine
// starting state (contract-v2/src/veilcore.ts).
//
// The compiled code and Compact runtime 0.21 are loaded from contract-v2's own folder, the copy
// the compiled code is built for; nothing else in the repository uses that runtime.
// SPDX-License-Identifier: Apache-2.0
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ContractState } from 'ledger-v9-committee';
import { ROOT } from './fingerprints.mjs';
import { ledgerDataHex } from './ledger.mjs';

export const MANAGED = path.join(ROOT, 'contract-v2', 'src', 'managed');
const compiledFile = (name, managed) => path.join(managed, name, 'contract', 'index.js');

/** Is the compiled contract here? */
export const haveCompiled = (name, managed = MANAGED) => existsSync(compiledFile(name, managed));

// A witness the constructor reads would be a different contract: refuse loudly.
const noWitnesses = new Proxy(
  {},
  {
    get: () => () => {
      throw new Error("contract v2's constructor read a witness; it must not");
    },
  },
);

/** The constructor's starting state, as Ledger 9 ContractState bytes (no operations, no authority). */
export const constructorStateBytes = async (name, managed = MANAGED) => {
  const req = createRequire(path.join(ROOT, 'contract-v2', 'package.json'));
  const rt = await import(pathToFileURL(req.resolve('@midnight-ntwrk/compact-runtime')).href);
  const m = await import(pathToFileURL(compiledFile(name, managed)).href);
  const r = await new m.Contract(noWitnesses).initialState(rt.createConstructorContext({}, '0'.repeat(64)));
  return r.currentContractState.serialize();
};

/** The constructor's ledger data (ledger.mjs ledgerDataHex), or undefined when the contract is not compiled here. */
export const constructorDataHex = async (name, managed = MANAGED) =>
  haveCompiled(name, managed) ? ledgerDataHex(ContractState.deserialize(await constructorStateBytes(name, managed))) : undefined;
