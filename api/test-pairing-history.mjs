// The contract's pairDna history (src/pairing-history.ts): a pairing is named by one of its
// transaction's identifiers (evidence files made before 26 Nov 2026) or by its hash (the site's
// files since then carry the 64-hex hash). Both must be found; anything else must not be.
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { createConstructorContext } from '@midnight-ntwrk/compact-runtime';
import { Contract } from '../contract/src/managed/veilcore/contract/index.js';
import { indexerHistory, isTx, rawPairingsBefore } from './src/pairing-history.ts';

const IDENTIFIER = `00${'f1'.repeat(32)}`; // 66 hex, as the wallet names a transaction
const HASH = '44ddd2f262d019b146cc3e6ff98c0d3d8e1ca46be6e707dfaea82ca88f3d3f5e'; // 64 hex
const OTHER = 'ab'.repeat(32);
const noop = (c) => [c.privateState, new Uint8Array(32)];
const witnesses = new Proxy({}, { get: () => noop });
const STATE = Buffer.from(
  new Contract(witnesses).initialState(createConstructorContext({}, '0'.repeat(64))).currentContractState.serialize(),
).toString('hex');
const REPORT = new Uint8Array(32).fill(7);

// isTx: by identifier, by hash, neither.
const tx = { identifiers: [IDENTIFIER], hash: HASH };
assert.equal(isTx(tx, IDENTIFIER), true);
assert.equal(isTx(tx, `0x${HASH.toUpperCase()}`), true);
assert.equal(isTx(tx, OTHER), false);
assert.equal(isTx({ identifiers: [IDENTIFIER] }, HASH), false); // no hash given: only identifiers count
console.log('isTx: found by identifier and by hash, not by anything else');

// rawPairingsBefore over a history that carries both names.
const history = (records) => ({
  async *[Symbol.asyncIterator]() {
    yield* records;
  },
});
const pairing = { identifiers: [IDENTIFIER], hash: HASH, blockHeight: 5, entryPoint: 'pairDna', stateHex: STATE };
assert.deepEqual(await rawPairingsBefore(history([pairing]), REPORT, IDENTIFIER), []);
assert.deepEqual(await rawPairingsBefore(history([pairing]), REPORT, HASH), []);
await assert.rejects(() => rawPairingsBefore(history([pairing]), REPORT, OTHER), /did not reach that pairing/);
console.log('rawPairingsBefore: reaches a pairing named by identifier or by hash; refuses one it never saw');

// indexerHistory asks the indexer for the hash and carries it on each record.
let asked = '';
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({ data: { contractAction: { transaction: { block: { height: 5 } } } } }),
});
globalThis.WebSocket = class {
  constructor() {
    setTimeout(() => this.onopen?.({}), 0);
  }
  send(data) {
    const m = JSON.parse(data);
    const reply = (x) => setTimeout(() => this.onmessage?.({ data: JSON.stringify(x) }), 0);
    if (m.type === 'connection_init') reply({ type: 'connection_ack' });
    if (m.type === 'subscribe') {
      asked = m.payload.query;
      reply({
        id: '1',
        type: 'next',
        payload: {
          data: {
            contractActions: {
              state: STATE,
              entryPoint: 'pairDna',
              transaction: {
                hash: HASH,
                block: { height: 5, timestamp: 1_790_000_000_000 },
                identifiers: [IDENTIFIER],
                transactionResult: { status: 'SUCCESS' },
              },
            },
          },
        },
      });
      reply({ id: '1', type: 'complete' });
    }
  }
  close() {}
};
const seen = [];
for await (const a of indexerHistory('http://indexer', 'ws://indexer', { idleMs: 10 })('cc'.repeat(32))) seen.push(a);
assert.match(asked, /transaction \{\s*hash/);
assert.equal(seen.length, 1);
assert.equal(seen[0].hash, HASH);
assert.deepEqual(await rawPairingsBefore(history(seen), REPORT, HASH), []);
console.log('indexerHistory: asks for the hash and carries it\n\nall pairing history checks pass');
