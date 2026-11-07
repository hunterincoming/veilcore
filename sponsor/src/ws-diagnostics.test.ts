// The indexer-socket close log (ws-diagnostics.ts): against a real WebSocket server that closes
// as Blockfrost does, through the wallet SDK's own graphql-ws client and compression wrapper.
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocketServer } from 'ws';
import { createClient } from 'graphql-ws';
import { makeDeflateWebSocket } from '../../node_modules/@midnightntwrk/wallet-sdk-indexer-client/dist/effect/DeflateWebSocket.js';
import {
  DEFLATE_PROTOCOL,
  diagnosingWebSocket,
  offeredProtocols,
  safeUrl,
  subscribedOperations,
  walletOf,
} from './ws-diagnostics.js';

const servers: WebSocketServer[] = [];
afterEach(() => {
  for (const s of servers.splice(0)) s.close();
});

/** A graphql-transport-ws server that acks, then closes on the first subscribe with `code`. */
const closingServer = async (code: number, reason: string): Promise<number> => {
  const wss = new WebSocketServer({ port: 0, handleProtocols: (p) => (p.has('graphql-transport-ws') ? 'graphql-transport-ws' : false) });
  servers.push(wss);
  wss.on('connection', (sock) => {
    sock.on('message', (raw) => {
      const m = JSON.parse(String(raw)) as { type: string };
      if (m.type === 'connection_init') sock.send(JSON.stringify({ type: 'connection_ack' }));
      if (m.type === 'subscribe') sock.close(code, reason);
    });
  });
  await new Promise((r) => wss.once('listening', r));
  return (wss.address() as { port: number }).port;
};

describe('indexer socket close log', () => {
  it('names the code, the reason and the wallet, never the query string, and changes nothing', async () => {
    const port = await closingServer(4429, 'Too many subscribe messages');
    const lines: Record<string, unknown>[] = [];
    const Diag = diagnosingWebSocket(WebSocket as never, (_l, _m, f) => void lines.push(f ?? {}));
    const client = createClient({
      url: `ws://127.0.0.1:${port}/api/v0/ws?project_id=mainnetSECRETPROJECTID`,
      shouldRetry: () => false,
      lazy: false,
      onNonLazyError: () => undefined,
      webSocketImpl: makeDeflateWebSocket(Diag as never),
    });
    const err = await new Promise<unknown>((resolve) => {
      client.subscribe(
        { query: 'subscription ZswapEvents($id: Int) { zswapLedgerEvents(id: $id) { id } }', variables: { id: 0 } },
        { next: () => undefined, error: resolve, complete: () => resolve(undefined) },
      );
    });
    await client.dispose();
    // What the wallet SDK logs today: the close event itself, as "[object CloseEvent]".
    expect(String(err)).toBe('[object CloseEvent]');
    expect((err as { code: number }).code).toBe(4429); // graphql-ws hands the real event over
    await new Promise((r) => setTimeout(r, 50));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      code: 4429,
      reason: 'Too many subscribe messages',
      wallets: ['shielded'],
      operations: ['ZswapEvents'],
      subscribes: 1,
      url: `ws://127.0.0.1:${port}/api/v0/ws`,
    });
    expect(JSON.stringify(lines)).not.toContain('SECRETPROJECTID');
  });

  it('says nothing about a normal close', async () => {
    const port = await closingServer(1000, 'done');
    const lines: unknown[] = [];
    const Diag = diagnosingWebSocket(WebSocket as never, () => void lines.push(1));
    const s = new (Diag as unknown as typeof WebSocket)(`ws://127.0.0.1:${port}/`, ['graphql-transport-ws']);
    await new Promise((r) => s.addEventListener('open', r));
    s.send(JSON.stringify({ type: 'connection_init' }));
    s.send(JSON.stringify({ type: 'subscribe', id: '1', payload: { query: 'subscription X { a }' } }));
    await new Promise((r) => s.addEventListener('close', r));
    expect(lines).toHaveLength(0);
  });

  it('reads operations and wallets from what the SDK sends', () => {
    expect(
      subscribedOperations(
        JSON.stringify({ type: 'subscribe', id: '1', payload: { query: 'subscription DustLedgerEvents($id: Int) { x }' } }),
      ),
    ).toEqual(['DustLedgerEvents']);
    expect(subscribedOperations(JSON.stringify({ type: 'ping' }))).toBeUndefined();
    expect(subscribedOperations('not json')).toBeUndefined();
    expect(['DustNullifierTransactions', 'ZswapEvents', 'ShieldedTransactions', 'UnshieldedTransactions', 'Blocks'].map(walletOf)).toEqual(
      ['dust', 'shielded', 'shielded', 'unshielded', 'other'],
    );
    expect(safeUrl('wss://midnight-mainnet.blockfrost.io/api/v0/ws?project_id=abc')).toBe(
      'wss://midnight-mainnet.blockfrost.io/api/v0/ws',
    );
  });
});

describe('Blockfrost: the plain protocol only', () => {
  /** Like Blockfrost since the fork: closes 1011 when compression is offered, serves plain text otherwise. */
  const blockfrostLike = async (): Promise<number> => {
    const wss = new WebSocketServer({
      port: 0,
      handleProtocols: (p) =>
        p.has('graphql-transport-ws+deflate') ? 'graphql-transport-ws+deflate' : 'graphql-transport-ws',
    });
    servers.push(wss);
    wss.on('connection', (sock) => {
      if (sock.protocol === 'graphql-transport-ws+deflate') {
        setTimeout(() => sock.close(1011, 'unexpected response'), 20);
        return;
      }
      sock.on('message', (raw) => {
        const m = JSON.parse(String(raw)) as { type: string; id?: string };
        if (m.type === 'connection_init') sock.send(JSON.stringify({ type: 'connection_ack' }));
        if (m.type === 'subscribe') {
          sock.send(JSON.stringify({ type: 'next', id: m.id, payload: { data: { zswapLedgerEvents: { id: 7 } } } }));
          sock.send(JSON.stringify({ type: 'complete', id: m.id }));
        }
      });
    });
    await new Promise((r) => wss.once('listening', r));
    return (wss.address() as { port: number }).port;
  };
  /** The global WebSocket, dialing the local server whatever host the URL names. */
  const toLocal = (port: number) =>
    class extends WebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(String(url).replace(/^wss:\/\/[^/]+/, `ws://127.0.0.1:${port}`), protocols);
      }
    };
  const subscribeOnce = (Impl: unknown, host = 'midnight-mainnet.blockfrost.io'): Promise<{ data?: unknown; err?: unknown }> => {
    const client = createClient({
      url: `wss://${host}/api/v0/ws?project_id=mainnetSECRETPROJECTID`,
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

  it('the SDK offer (compression first) is closed 1011 before any subscribe, and graphql-ws does not fall back', async () => {
    const port = await blockfrostLike();
    const lines: Record<string, unknown>[] = [];
    const Diag = diagnosingWebSocket(toLocal(port) as never, (_l, _m, f) => void lines.push(f ?? {}));
    // A host that is not Blockfrost's keeps the SDK's offer; the local server answers as Blockfrost does.
    const r = await subscribeOnce(Diag, 'indexer.example');
    expect(String(r.err)).toBe('[object CloseEvent]');
    expect((r.err as { code: number }).code).toBe(1011);
    expect(lines.at(-1)).toMatchObject({ code: 1011, reason: 'unexpected response', subscribes: 0 });
  });

  it('to Blockfrost only the plain protocol is offered, the subscription works, and it is said once', async () => {
    const port = await blockfrostLike();
    const lines: { msg: string; f: Record<string, unknown> }[] = [];
    const Diag = diagnosingWebSocket(toLocal(port) as never, (_l, msg, f) => void lines.push({ msg, f: f ?? {} }));
    expect(await subscribeOnce(Diag)).toEqual({ data: { data: { zswapLedgerEvents: { id: 7 } } } });
    expect(await subscribeOnce(Diag)).toEqual({ data: { data: { zswapLedgerEvents: { id: 7 } } } });
    const told = lines.filter((l) => /compression off for Blockfrost/.test(l.msg));
    expect(told).toHaveLength(1);
    expect(told[0].f).toEqual({ url: 'wss://midnight-mainnet.blockfrost.io/api/v0/ws' });
    expect(lines.filter((l) => l.msg === 'indexer websocket closed')).toEqual([]);
    expect(JSON.stringify(lines)).not.toContain('SECRETPROJECTID');
  });

  it('only Blockfrost, and only the compressed offer is removed', () => {
    const both = [DEFLATE_PROTOCOL, 'graphql-transport-ws'];
    expect(offeredProtocols('wss://midnight-mainnet.blockfrost.io/api/v0/ws?x=1', both)).toEqual(['graphql-transport-ws']);
    expect(offeredProtocols('wss://MIDNIGHT-PREPROD.Blockfrost.io/ws', both)).toEqual(['graphql-transport-ws']);
    expect(offeredProtocols('wss://indexer.preview.midnight.network/api/v4/graphql/ws', both)).toBe(both);
    expect(offeredProtocols('wss://evilblockfrost.io/ws', both)).toBe(both);
    expect(offeredProtocols('ws://127.0.0.1:8088/ws', both)).toBe(both);
    const plain = ['graphql-transport-ws'];
    expect(offeredProtocols('wss://midnight-mainnet.blockfrost.io/ws', plain)).toBe(plain);
    expect(offeredProtocols('wss://midnight-mainnet.blockfrost.io/ws', DEFLATE_PROTOCOL)).toEqual(['graphql-transport-ws']);
  });
});
