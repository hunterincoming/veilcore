// Which indexer sockets offer only the plain graphql-transport-ws protocol
// (src/indexer-websocket.ts). The sockets themselves, through midnight-js and the wallet SDK,
// are tested in bboard-cli/src/indexer-websocket.test.ts.
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {
  DEFLATE_PROTOCOL,
  indexerWebSocket,
  isBlockfrost,
  offeredProtocols,
  plainForBlockfrost,
  usePlainForBlockfrost,
} from './src/indexer-websocket.ts';

const both = [DEFLATE_PROTOCOL, 'graphql-transport-ws'];
const BF = 'wss://midnight-mainnet.blockfrost.io/api/v0/ws?project_id=x';

// Only Blockfrost's hosts.
assert.equal(isBlockfrost(BF), true);
assert.equal(isBlockfrost('wss://MIDNIGHT-PREPROD.Blockfrost.io/ws'), true);
assert.equal(isBlockfrost('wss://evilblockfrost.io/ws'), false);
assert.equal(isBlockfrost('wss://blockfrost.io.example/ws'), false);
assert.equal(isBlockfrost('not a url'), false);

// Only the compressed offer is removed.
assert.deepEqual(offeredProtocols(BF, both), ['graphql-transport-ws']);
assert.deepEqual(offeredProtocols(BF, DEFLATE_PROTOCOL), ['graphql-transport-ws']);
const plain = ['graphql-transport-ws'];
assert.equal(offeredProtocols(BF, plain), plain);
assert.equal(offeredProtocols(BF, undefined), undefined);
assert.equal(offeredProtocols('wss://indexer.preview.midnight.network/api/v4/graphql/ws', both), both);

// The class passes the cut offer to its base, keeps the handler accessors, and is made once.
const offers = [];
class Base {
  constructor(url, protocols) {
    offers.push([url, protocols]);
  }
  get onmessage() {
    return this.h ?? null;
  }
  set onmessage(f) {
    this.h = f;
  }
}
const Plain = plainForBlockfrost(Base);
new Plain(BF, both);
new Plain('ws://127.0.0.1:8088/ws', both);
assert.deepEqual(offers, [
  [BF, ['graphql-transport-ws']],
  ['ws://127.0.0.1:8088/ws', both],
]);
assert.ok(Object.getOwnPropertyDescriptor(Plain.prototype, 'onmessage')?.set);
assert.equal(plainForBlockfrost(Base), Plain);
assert.equal(plainForBlockfrost(Plain), Plain);

// midnight-js: a class only for Blockfrost; otherwise its own default.
assert.equal(indexerWebSocket(BF, Base), Plain);
assert.equal(indexerWebSocket('wss://indexer.preview.midnight.network/api/v4/graphql/ws', Base), undefined);
assert.equal(indexerWebSocket(BF, undefined), undefined);

// The global, for the wallet SDK: wrapped once; nothing without one.
const before = globalThis.WebSocket;
try {
  globalThis.WebSocket = Base;
  usePlainForBlockfrost();
  usePlainForBlockfrost();
  assert.equal(globalThis.WebSocket, Plain);
  delete globalThis.WebSocket;
  usePlainForBlockfrost();
  assert.equal(globalThis.WebSocket, undefined);
} finally {
  globalThis.WebSocket = before;
}
console.log('indexer-websocket: all checks passed');
