// Contract v2 states and transactions, read with Midnight's Ledger 9 types (the same package
// the committee tool signs with, `ledger-v9-committee`). v2 is a Ledger 9 contract from its first
// transaction, so nothing here converts eras (v1's states go through contract/src/contract-state.ts).
//
// What a v2 check needs from the chain, as plain data:
//   - a state: each operation's verifier key (SHA-256 and slot), the maintenance authority, and
//     the ledger data;
//   - a transaction: for one contract address, its deploy (the starting state) and every
//     maintenance update (its counter and each instruction, IR changes included).
// Calls are read for nothing: a call never changes the keys or the authority, and anyone who
// pays a fee can make one, so no v2 check may depend on there being none.
// SPDX-License-Identifier: Apache-2.0
import {
  ContractDeploy,
  ContractState,
  IrInsert,
  IrRemove,
  MaintenanceUpdate,
  ReplaceAuthority,
  Transaction,
  VerifierKeyInsert,
  VerifierKeyRemove,
} from 'ledger-v9-committee';
import { sha256Hex, slotOfKey } from './fingerprints.mjs';

const hex = (b) => Buffer.from(b).toString('hex');
export const fromHex = (h) => new Uint8Array(Buffer.from(String(h).replace(/^0x/i, ''), 'hex'));
const name = (op) => (typeof op === 'string' ? op : Buffer.from(op).toString('utf8'));
/** A committee key as plain hex (Ledger 9 holds { tag, value }). Only Schnorr keys. */
const bare = (k) => {
  if (typeof k === 'string') return k.toLowerCase();
  if (k?.tag === 'schnorr' && typeof k.value === 'string') return k.value.toLowerCase();
  throw new Error('A maintenance committee key that is not a Schnorr key; refused.');
};

export const authorityFacts = (a) => ({
  committee: [...a.committee].map(bare),
  threshold: Number(a.threshold),
  counter: BigInt(a.counter),
});

/** A Ledger 9 ContractState's ledger data alone, serialized: what the constructor decides. */
export const ledgerDataHex = (state) => {
  const only = new ContractState();
  only.data = state.data;
  return hex(only.serialize());
};

/** The facts of a Ledger 9 ContractState object. */
export const stateObjectFacts = (state) => {
  const ops = {};
  for (const n of state.operations()) {
    const key = state.operation(n)?.verifierKey;
    ops[name(n)] =
      key instanceof Uint8Array && key.length > 0 ? { sha256: sha256Hex(key), slot: slotOfKey(key) } : { sha256: null, slot: undefined };
  }
  return { ops, authority: authorityFacts(state.maintenanceAuthority), dataHex: ledgerDataHex(state) };
};

/** The facts of contract-state bytes (as an indexer serves them). Throws when they are not a Ledger 9 state. */
export const stateFacts = (bytes) => stateObjectFacts(ContractState.deserialize(bytes));

/**
 * A key as its .verifier file holds it. Inside a maintenance update the ledger keeps the key
 * without its header ("midnight:verifier-key[v7]:" for V4, "[v6]" for V3) and the slot beside
 * it; the ledger refuses a key whose header is not its slot's, so the header is the slot's.
 */
const KEY_HEADER = { v3: 'midnight:verifier-key[v6]:', v4: 'midnight:verifier-key[v7]:' };
export const keyFileBytes = (version, rawVk) =>
  KEY_HEADER[version] === undefined
    ? rawVk
    : new Uint8Array([...Buffer.from(KEY_HEADER[version], 'latin1'), ...rawVk]);

/** One maintenance instruction, as plain data. */
const instructionFacts = (u) => {
  if (u instanceof VerifierKeyInsert) {
    const full = keyFileBytes(u.vk.version, u.vk.rawVk);
    return {
      kind: 'insert-key',
      circuit: name(u.operation),
      slot: u.vk.version,
      headerSlot: slotOfKey(full),
      sha256: sha256Hex(full),
    };
  }
  if (u instanceof VerifierKeyRemove) return { kind: 'remove-key', circuit: name(u.operation), slot: u.version.version };
  if (u instanceof ReplaceAuthority) return { kind: 'replace-authority', authority: authorityFacts(u.authority) };
  if (u instanceof IrInsert) return { kind: 'ir-insert', circuit: name(u.operation) };
  if (u instanceof IrRemove) return { kind: 'ir-remove', circuit: name(u.operation) };
  return { kind: 'unknown' };
};

/**
 * Everything a finalized transaction (the indexer's `raw`) does to `address`: its deploys
 * (the starting state's facts) and its maintenance updates (counter, instructions, number of
 * signatures). Calls are not listed. Throws when the bytes are not a finalized Ledger 9 transaction.
 */
export const txFacts = (rawBytes, address) => {
  const tx = Transaction.deserialize('signature', 'proof', 'binding', rawBytes);
  const want = String(address).toLowerCase();
  const out = [];
  for (const intent of tx.intents?.values() ?? [])
    for (const a of intent.actions) {
      if (a instanceof ContractDeploy && String(a.address).toLowerCase() === want)
        out.push({ kind: 'deploy', state: stateObjectFacts(a.initialState) });
      else if (a instanceof MaintenanceUpdate && String(a.address).toLowerCase() === want)
        out.push({
          kind: 'update',
          counter: BigInt(a.counter),
          signatures: a.signatures.length,
          instructions: a.updates.map(instructionFacts),
        });
    }
  return out;
};
