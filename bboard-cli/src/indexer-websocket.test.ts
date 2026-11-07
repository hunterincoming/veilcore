// Indexer sockets to Blockfrost offer only the plain graphql-transport-ws protocol
// (api/src/indexer-websocket.ts), through both libraries that dial the indexer: midnight-js 5's
// indexerPublicDataProvider and wallet SDK 2's subscription client. A local server stands in
// for Blockfrost since the Ledger 9 fork: it closes 1011 "unexpected response" when the
// compressed protocol is offered and serves plain text otherwise.
// SPDX-License-Identifier: Apache-2.0

import { type AddressInfo } from 'node:net';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { createClient } from 'graphql-ws';
import { WebSocket, WebSocketServer } from 'ws';
import { afterEach, describe, expect, it } from 'vitest';
import { makeDeflateWebSocket } from '../../node_modules/@midnightntwrk/wallet-sdk-indexer-client/dist/effect/DeflateWebSocket.js';
import {
  DEFLATE_PROTOCOL,
  indexerWebSocket,
  isBlockfrost,
  offeredProtocols,
  plainForBlockfrost,
  usePlainForBlockfrost,
} from '../../api/src/indexer-websocket';

const BF_WS = 'wss://midnight-mainnet.blockfrost.io/api/v0/ws?project_id=mainnetSECRET';
const BF_HTTP = 'https://midnight-mainnet.blockfrost.io/api/v0?project_id=mainnetSECRET';
const ADDRESS = 'a'.repeat(64);

type Seen = { offered: string[]; subscribes: number; closed?: { code: number; reason: string } };
const servers: WebSocketServer[] = [];
afterEach(() => {
  for (const s of servers.splice(0)) s.close();
});

const blockfrostLike = async (): Promise<{ port: number; seen: Seen[] }> => {
  const seen: Seen[] = [];
  const wss = new WebSocketServer({
    port: 0,
    handleProtocols: (p) => (p.has(DEFLATE_PROTOCOL) ? DEFLATE_PROTOCOL : 'graphql-transport-ws'),
  });
  servers.push(wss);
  wss.on('connection', (sock, req) => {
    const s: Seen = {
      offered: String(req.headers['sec-websocket-protocol'] ?? '')
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean),
      subscribes: 0,
    };
    seen.push(s);
    sock.on('close', (code, reason) => (s.closed = { code, reason: String(reason) }));
    if (sock.protocol === DEFLATE_PROTOCOL) {
      setTimeout(() => sock.close(1011, 'unexpected response'), 20);
      return;
    }
    sock.on('message', (raw) => {
      const m = JSON.parse((raw as Buffer).toString()) as { type: string; id?: string };
      if (m.type === 'connection_init') sock.send(JSON.stringify({ type: 'connection_ack' }));
      if (m.type === 'subscribe') {
        s.subscribes++;
        sock.send(JSON.stringify({ type: 'next', id: m.id, payload: { data: { zswapLedgerEvents: { id: 7 } } } }));
        sock.send(JSON.stringify({ type: 'complete', id: m.id }));
      }
    });
  });
  await new Promise((r) => wss.once('listening', r));
  return { port: (wss.address() as AddressInfo).port, seen };
};

/** `Base`, dialing the local server whatever host the URL names. */
const toLocal = <B extends new (url: string | URL, protocols?: string | string[]) => object>(Base: B, port: number) =>
  class extends (Base as new (url: string | URL, protocols?: string | string[]) => object) {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(String(url).replace(/^wss:\/\/[^/]+/, `ws://127.0.0.1:${port}`), protocols);
    }
  } as unknown as B;

/** As toLocal, with the handler accessors on its own prototype (what midnight-js needs of a base). */
const toLocalWithAccessors = (port: number): typeof WebSocket => {
  const C = toLocal(WebSocket, port);
  for (const n of ['onopen', 'onmessage', 'onclose', 'onerror'])
    Object.defineProperty(C.prototype, n, Object.getOwnPropertyDescriptor(WebSocket.prototype, n)!);
  return C;
};

const until = async (f: () => boolean, ms = 5_000) => {
  const end = Date.now() + ms;
  while (!f() && Date.now() < end) await new Promise((r) => setTimeout(r, 20));
};

/** Opens midnight-js's contract-events subscription (a socket, no HTTP) with `webSocket`; returns the first error, if any. */
const midnightJsSubscribe = async (
  webSocket: unknown,
  done: (err: unknown) => boolean,
  ms = 5_000,
): Promise<unknown> => {
  const p = indexerPublicDataProvider(BF_HTTP, BF_WS, webSocket as never);
  let err: unknown;
  const sub = p.contractEventsObservable({ contractAddress: ADDRESS }).subscribe({ error: (e: unknown) => (err = e) });
  await until(() => done(err), ms);
  sub.unsubscribe();
  await Promise.resolve(p.dispose?.()).catch(() => undefined);
  return err;
};

describe('which hosts', () => {
  it('only Blockfrost, and only the compressed offer is removed', () => {
    const both = [DEFLATE_PROTOCOL, 'graphql-transport-ws'];
    expect(offeredProtocols(BF_WS, both)).toEqual(['graphql-transport-ws']);
    expect(offeredProtocols('wss://MIDNIGHT-PREPROD.Blockfrost.io/ws', both)).toEqual(['graphql-transport-ws']);
    expect(offeredProtocols('wss://indexer.preview.midnight.network/api/v4/graphql/ws', both)).toBe(both);
    expect(offeredProtocols('wss://evilblockfrost.io/ws', both)).toBe(both);
    expect(offeredProtocols('ws://127.0.0.1:8088/ws', both)).toBe(both);
    expect(offeredProtocols(BF_WS, ['graphql-transport-ws'])).toEqual(['graphql-transport-ws']);
    expect(offeredProtocols(BF_WS, DEFLATE_PROTOCOL)).toEqual(['graphql-transport-ws']);
    expect(offeredProtocols(BF_WS, undefined)).toBeUndefined();
    expect(isBlockfrost('not a url')).toBe(false);
  });

  it('midnight-js keeps its own default for any other indexer', () => {
    expect(indexerWebSocket('wss://indexer.preview.midnight.network/api/v4/graphql/ws', WebSocket)).toBeUndefined();
    expect(indexerWebSocket(BF_WS, undefined)).toBeUndefined();
    expect(indexerWebSocket(BF_WS, WebSocket)).toBe(plainForBlockfrost(WebSocket)); // wrapped once, then reused
  });

  it('wraps once, however often it is asked', () => {
    const g = globalThis as { WebSocket?: unknown };
    const before = g.WebSocket;
    try {
      g.WebSocket = WebSocket;
      usePlainForBlockfrost();
      const once = g.WebSocket;
      usePlainForBlockfrost();
      expect(g.WebSocket).toBe(once);
      expect(once).not.toBe(WebSocket);
      expect(plainForBlockfrost(once as typeof WebSocket)).toBe(once);
    } finally {
      g.WebSocket = before;
    }
  });
});

describe('midnight-js 5 (indexerPublicDataProvider)', () => {
  it('as shipped it offers compression first, and Blockfrost closes the socket before any subscribe', async () => {
    const { port, seen } = await blockfrostLike();
    await midnightJsSubscribe(toLocalWithAccessors(port), () => seen.length >= 2, 3_000);
    expect(seen.length).toBeGreaterThan(0);
    for (const s of seen) expect(s.offered).toEqual([DEFLATE_PROTOCOL, 'graphql-transport-ws']);
    expect(seen.every((s) => s.subscribes === 0)).toBe(true);
  });

  it('with the wrapper it offers the plain protocol only, and the subscription reaches the indexer', async () => {
    const { port, seen } = await blockfrostLike();
    await midnightJsSubscribe(indexerWebSocket(BF_WS, toLocal(WebSocket, port)), () => (seen[0]?.subscribes ?? 0) > 0);
    expect(seen[0]?.offered).toEqual(['graphql-transport-ws']);
    expect(seen[0]?.subscribes).toBeGreaterThan(0);
  });

  it('a subclass without its own onmessage accessor gets no messages through midnight-js (why the wrapper copies them)', async () => {
    const { port, seen } = await blockfrostLike();
    const Naive = class extends toLocal(WebSocket, port) {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, offeredProtocols(url, protocols));
      }
    };
    await midnightJsSubscribe(Naive, () => seen[0]?.closed !== undefined, 14_000);
    expect(seen[0]?.offered).toEqual(['graphql-transport-ws']);
    expect(seen[0]?.subscribes).toBe(0);
    // The server's connection_ack never reached graphql-ws, which gave up waiting for it.
    expect(seen[0]?.closed).toEqual({ code: 4504, reason: 'Connection acknowledgement timeout' });
  }, 20_000);
});

describe('wallet SDK 2 (its subscription client reads the global WebSocket)', () => {
  const subscribeOnce = (Impl: unknown): Promise<{ data?: unknown; err?: unknown }> => {
    const client = createClient({
      url: BF_WS,
      shouldRetry: () => false,
      lazy: false,
      onNonLazyError: () => undefined,
      webSocketImpl: makeDeflateWebSocket(Impl as never), // exactly as wallet SDK 2 builds it
    });
    return new Promise((resolve) => {
      let data: unknown;
      client.subscribe(
        { query: 'subscription ZswapEvents($id: Int) { zswapLedgerEvents(id: $id) { id } }', variables: { id: 0 } },
        {
          next: (d) => (data = d),
          error: (err) => void Promise.resolve(client.dispose()).then(() => resolve({ err })),
          complete: () => void Promise.resolve(client.dispose()).then(() => resolve({ data })),
        },
      );
    });
  };

  it('as shipped: closed 1011 and no fallback', async () => {
    const { port } = await blockfrostLike();
    const r = await subscribeOnce(toLocal(WebSocket, port));
    expect((r.err as { code: number }).code).toBe(1011);
  });

  it('with the global wrapped: the plain protocol only, and the subscription delivers', async () => {
    const { port, seen } = await blockfrostLike();
    const g = globalThis as { WebSocket?: unknown };
    const before = g.WebSocket;
    try {
      g.WebSocket = toLocal(WebSocket, port);
      usePlainForBlockfrost();
      expect(await subscribeOnce(g.WebSocket)).toEqual({ data: { data: { zswapLedgerEvents: { id: 7 } } } });
    } finally {
      g.WebSocket = before;
    }
    expect(seen[0]?.offered).toEqual(['graphql-transport-ws']);
  });
});
