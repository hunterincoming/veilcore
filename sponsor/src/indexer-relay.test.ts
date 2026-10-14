// The indexer relay: the site reads the chain through the sponsor, the key stays here,
// and nothing but reads from the site's own origin gets through.
import { afterEach, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocket, WebSocketServer } from 'ws';
import { startServer } from './server.js';
import { createIndexerRelay, hasMutation } from './indexer-relay.js';

const SITE = 'https://test.veilcore.org';
const XFF = { 'x-forwarded-for': '203.0.113.9' };
const servers: Server[] = [];
afterEach(async () => {
  for (const s of servers.splice(0)) await new Promise((r) => s.close(() => r(undefined)));
});
const portOf = (s: Server) => (s.address() as AddressInfo).port;

/** A stand-in indexer: records what it is asked over HTTP and echoes subscriptions. */
const fakeIndexer = async () => {
  const seen: { url: string; body: string }[] = [];
  const wsSeen: string[] = [];
  const up = createServer((req, res) => {
    let body = '';
    req.on('data', (c: Buffer) => (body += c.toString()));
    req.on('end', () => {
      seen.push({ url: req.url ?? '', body });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { block: { height: 7 } } }));
    });
  });
  const wss = new WebSocketServer({ server: up, handleProtocols: () => 'graphql-transport-ws' });
  wss.on('connection', (ws, req) => {
    wsSeen.push(`connect ${req.url}`);
    ws.on('message', (d) => {
      wsSeen.push(d.toString());
      const m = JSON.parse(d.toString()) as { type: string; id?: string };
      if (m.type === 'connection_init') ws.send(JSON.stringify({ type: 'connection_ack' }));
      if (m.type === 'subscribe') ws.send(JSON.stringify({ type: 'next', id: m.id, payload: { data: { blocks: { height: 8 } } } }));
    });
  });
  up.listen(0);
  await new Promise((r) => up.once('listening', r));
  servers.push(up);
  return { seen, wsSeen, port: portOf(up) };
};

const sponsorWith = async (perMinute = 240, maxSocketsPerBucket = 6) => {
  const up = await fakeIndexer();
  const relay = createIndexerRelay({
    indexer: `http://127.0.0.1:${up.port}/api/v0?project_id=SECRETKEY`,
    indexerWS: `ws://127.0.0.1:${up.port}/api/v0/ws?project_id=SECRETKEY`,
    allowedOrigins: [SITE],
    perMinute,
    maxSocketsPerBucket,
  });
  const server = startServer(
    {
      sponsor: { handle: () => Promise.resolve({ status: 200, body: {} }), status: () => ({}) },
      pow: { issue: () => ({ challenge: 'c', difficulty: 1, expiresAt: 0 }) },
      limits: { request: () => ({ ok: true }) },
      extraStatus: () => ({}),
      allowedOrigins: [SITE],
      trustProxyHops: 1,
      maxBodyBytes: 2_000,
      indexerRelay: relay,
    },
    0,
  );
  await new Promise((r) => (server.listening ? r(undefined) : server.once('listening', r)));
  servers.push(server);
  return { up, relay, url: `http://127.0.0.1:${portOf(server)}`, ws: `ws://127.0.0.1:${portOf(server)}/indexer/ws` };
};

const post = (url: string, body: unknown, origin = SITE) =>
  fetch(`${url}/indexer`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin, ...XFF },
    body: JSON.stringify(body),
  });

describe('reads over HTTP', () => {
  it('relays a query with the key added here, and the key never reaches the browser', async () => {
    const { up, url } = await sponsorWith();
    const res = await post(url, { query: 'query { block { height } }' });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe(SITE);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ data: { block: { height: 7 } } });
    expect(text).not.toContain('SECRETKEY');
    expect(up.seen).toEqual([{ url: '/api/v0?project_id=SECRETKEY', body: '{"query":"query { block { height } }"}' }]);
  });

  it('refuses other sites, mutations, junk and floods', async () => {
    const { up, url } = await sponsorWith(2); // the bad requests above count against it too
    expect((await post(url, { query: '{ block { height } }' }, 'https://elsewhere.example')).status).toBe(403);
    expect((await post(url, { query: 'mutation { connect(viewingKey: "x") }' })).status).toBe(403);
    expect((await post(url, { nope: 1 })).status).toBe(400);
    expect((await post(url, { query: '{ a }' })).status).toBe(429);
    expect(up.seen).toHaveLength(0);
  });

  it('tells a mutation from the word inside a comment, a string or a field name', () => {
    expect(hasMutation('mutation { connect }')).toBe(true);
    expect(hasMutation('{ a } mutation M{ b }')).toBe(true);
    expect(hasMutation('query Q { a }\nmutation\n{ b }')).toBe(true);
    expect(hasMutation('# mutation in a comment\nquery { a }')).toBe(false);
    expect(hasMutation('query { a(name: "mutation { x }") }')).toBe(false);
    expect(hasMutation('query { mutationCount }')).toBe(false);
  });
});

describe('subscriptions over the socket', () => {
  const open = (url: string, origin = SITE) =>
    new WebSocket(url, 'graphql-transport-ws', { headers: { origin, ...XFF } });

  it('relays both ways, to the keyed upstream', async () => {
    const { up, ws, relay } = await sponsorWith();
    const c = open(ws);
    const got: unknown[] = [];
    c.on('message', (d) => got.push(JSON.parse(d.toString())));
    await new Promise((r) => c.once('open', r));
    c.send(JSON.stringify({ type: 'connection_init' }));
    c.send(JSON.stringify({ type: 'subscribe', id: '1', payload: { query: 'subscription { blocks { height } }' } }));
    await expect.poll(() => got.length).toBe(2);
    expect(got).toEqual([
      { type: 'connection_ack' },
      { type: 'next', id: '1', payload: { data: { blocks: { height: 8 } } } },
    ]);
    expect(up.wsSeen[0]).toBe('connect /api/v0/ws?project_id=SECRETKEY');
    expect(relay.sockets()).toBe(1);
    c.close();
    await expect.poll(() => relay.sockets()).toBe(0);
  });

  it('closes on a mutation, and refuses other sites and too many sockets', async () => {
    const { ws, relay } = await sponsorWith(240, 1);
    const c = open(ws);
    await new Promise((r) => c.once('open', r));
    const closed = new Promise<number>((r) => c.once('close', (code) => r(code)));
    c.send(JSON.stringify({ type: 'subscribe', id: '1', payload: { query: 'mutation { connect }' } }));
    expect(await closed).toBe(4403);

    const other = open(ws, 'https://elsewhere.example');
    expect(await new Promise((r) => other.once('unexpected-response', (_q, res) => r(res.statusCode)))).toBe(403);

    const first = open(ws);
    await new Promise((r) => first.once('open', r));
    const second = open(ws);
    expect(await new Promise((r) => second.once('unexpected-response', (_q, res) => r(res.statusCode)))).toBe(429);
    first.close();
    await expect.poll(() => relay.sockets()).toBe(0);
  });
});
