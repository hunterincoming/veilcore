// Indexer sockets to Blockfrost offer only the plain graphql-transport-ws protocol
// (api/src/indexer-websocket.ts): Blockfrost has closed sockets offering the compressed one
// 1011 since the Ledger 9 fork. connect()'s indexer reader is given a class that does so, and a
// seed wallet for Blockfrost wraps the global WebSocket the wallet SDK dials with. Any other
// indexer gets what it got before.
// SPDX-License-Identifier: Apache-2.0
import { type AddressInfo } from 'node:net';
import { WebSocketServer } from 'ws';
import { afterEach, describe, expect, it } from 'vitest';
import { setNetworkId } from '../../api/src/network-id.js';
import { DEFLATE_PROTOCOL } from '../../api/src/indexer-websocket.js';
import { connect } from '../src/connect';
import { endpointsFor } from '../src/network';
import { SeedWallet } from '../src/wallet';

const g = globalThis as { WebSocket?: typeof WebSocket };
const original = g.WebSocket;
const servers: WebSocketServer[] = [];
afterEach(() => {
  g.WebSocket = original;
  for (const s of servers.splice(0)) s.close();
  setNetworkId('undeployed');
});

/** Like Blockfrost since the fork; records what each socket offered and whether a subscribe got through. */
const blockfrostLike = async () => {
  const seen: { offered: string; subscribes: number }[] = [];
  const wss = new WebSocketServer({
    port: 0,
    handleProtocols: (p) => (p.has(DEFLATE_PROTOCOL) ? DEFLATE_PROTOCOL : 'graphql-transport-ws'),
  });
  servers.push(wss);
  wss.on('connection', (sock, req) => {
    const s = { offered: String(req.headers['sec-websocket-protocol']), subscribes: 0 };
    seen.push(s);
    if (sock.protocol === DEFLATE_PROTOCOL) return void setTimeout(() => sock.close(1011, 'unexpected response'), 20);
    sock.on('message', (raw) => {
      const m = JSON.parse((raw as Buffer).toString()) as { type: string };
      if (m.type === 'connection_init') sock.send(JSON.stringify({ type: 'connection_ack' }));
      if (m.type === 'subscribe') s.subscribes++;
    });
  });
  await new Promise((r) => wss.once('listening', r));
  return { port: (wss.address() as AddressInfo).port, seen };
};

describe('connect(): the indexer reader', () => {
  it('to Blockfrost offers the plain protocol only, and its subscription gets through', async () => {
    const { port, seen } = await blockfrostLike();
    const Base = original!;
    // The global WebSocket (Node's own), dialing the local server whatever host the URL names.
    g.WebSocket = class extends Base {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(String(url).replace(/^wss:\/\/[^/]+/, `ws://127.0.0.1:${port}`), protocols);
      }
    };
    const conn = connect({
      network: 'mainnet',
      blockfrostProjectId: 'mainnetTestId123',
      wallet: {} as never,
      privateState: { veilcore: {} as never, claims: {} as never },
      scrubTerminal: false,
    });
    const reader = conn.providers.veilcore.publicDataProvider as unknown as {
      contractEventsObservable: (f: { contractAddress: string }) => {
        subscribe: (o: { error: () => void }) => { unsubscribe: () => void };
      };
      dispose?: () => Promise<void>;
    };
    const sub = reader
      .contractEventsObservable({ contractAddress: 'a'.repeat(64) })
      .subscribe({ error: () => undefined });
    for (let i = 0; i < 250 && (seen[0]?.subscribes ?? 0) === 0; i++) await new Promise((r) => setTimeout(r, 20));
    sub.unsubscribe();
    await Promise.resolve(reader.dispose?.()).catch(() => undefined);
    expect(seen[0]).toEqual({ offered: 'graphql-transport-ws', subscribes: 1 });
  });
});

describe('a seed wallet: the global WebSocket the wallet SDK dials with', () => {
  it('for Blockfrost is wrapped, once', async () => {
    setNetworkId('preprod');
    const endpoints = endpointsFor('preprod', {}, { blockfrostProjectId: 'testPreprodId123' });
    await SeedWallet.create({ network: 'preprod', endpoints, seed: '5e'.repeat(32) });
    const wrapped = g.WebSocket;
    expect(wrapped).not.toBe(original);
    await SeedWallet.create({ network: 'preprod', endpoints, seed: '5e'.repeat(32) });
    expect(g.WebSocket).toBe(wrapped);
  });

  it('for any other indexer is left alone', async () => {
    await SeedWallet.create({ network: 'undeployed', endpoints: endpointsFor('undeployed'), seed: '5e'.repeat(32) });
    expect(g.WebSocket).toBe(original);
  });
});
