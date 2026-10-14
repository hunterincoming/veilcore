// The network's indexer, reached through the sponsor, so a hosted test site needs no key.
//
// Since 9 October 2026 the preprod indexer is only reachable through Blockfrost, with a
// project id. A site that called Blockfrost itself would carry that id in its page, so it
// could only run on Hunter's own computer. Here the browser asks the sponsor, and the
// sponsor asks Blockfrost with the id it already holds (config.ts):
//   POST /indexer      a GraphQL query over HTTP
//   GET  /indexer/ws   a GraphQL subscription socket (graphql-transport-ws), relayed both ways
//
// It only reads. Mutations are refused: the indexer's mutations open wallet sessions
// (viewing keys), which a website never needs and the sponsor must never relay. Only the
// site's own origins may use it, each address gets its own allowance, and sockets are
// capped per address and in total, so the key's quota can't be drained through it.
// Nothing here is believed by the site any more than the indexer itself was: the same
// checks run on what comes back (ownership-check.ts, presentation-lookup.ts).
// SPDX-License-Identifier: Apache-2.0

import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import { clientBucket } from './limits.js';
import { log } from './log.js';

export type RelayConfig = {
  /** Upstream GraphQL over HTTP, key included (never sent to a browser). */
  readonly indexer: string;
  /** Upstream GraphQL subscriptions, key included. */
  readonly indexerWS: string;
  readonly allowedOrigins: readonly string[];
  /** HTTP queries per address bucket per minute. */
  readonly perMinute?: number;
  readonly maxSocketsPerBucket?: number;
  readonly maxSockets?: number;
  readonly maxBodyBytes?: number;
  readonly idleMs?: number;
  readonly fetch?: typeof fetch;
  readonly now?: () => number;
};

const DEFAULTS = { perMinute: 240, maxSocketsPerBucket: 6, maxSockets: 300, maxBodyBytes: 64 * 1024, idleMs: 10 * 60_000 };

/** True when a GraphQL document contains a mutation (comments and strings aside). */
export const hasMutation = (query: string): boolean => {
  const bare = query.replace(/#[^\n]*/g, ' ').replace(/"""[\s\S]*?"""|"(?:\\.|[^"\\])*"/g, '""');
  return /(^|[\s{}])mutation(?=[\s({]|$)/.test(bare);
};

export type IndexerRelay = {
  /** Handles POST /indexer; false for any other path. */
  http(req: IncomingMessage, res: ServerResponse, ip: string | undefined, cors: Record<string, string>): Promise<boolean>;
  /** Relays upgrades to /indexer/ws on this server. */
  attach(server: Server, clientIp: (req: IncomingMessage) => string | undefined): void;
  /** Open sockets, for status and tests. */
  sockets(): number;
};

export const createIndexerRelay = (cfg: RelayConfig): IndexerRelay => {
  const o = { ...DEFAULTS, ...cfg };
  const doFetch = cfg.fetch ?? fetch;
  const now = cfg.now ?? Date.now;
  const minute = new Map<string, { at: number; n: number }>();
  const perBucket = new Map<string, number>();
  let open = 0;

  const allowedOrigin = (req: IncomingMessage) =>
    typeof req.headers.origin === 'string' && o.allowedOrigins.includes(req.headers.origin);
  const take = (bucket: string): boolean => {
    const t = Math.floor(now() / 60_000);
    const cur = minute.get(bucket);
    const n = cur && cur.at === t ? cur.n + 1 : 1;
    minute.set(bucket, { at: t, n });
    if (minute.size > 50_000) for (const [k, v] of minute) if (v.at !== t) minute.delete(k);
    return n <= o.perMinute;
  };
  const reply = (res: ServerResponse, status: number, body: unknown, cors: Record<string, string>) => {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cors });
    res.end(JSON.stringify(body));
  };

  const readBody = (req: IncomingMessage): Promise<string | undefined> =>
    new Promise((resolve, reject) => {
      let size = 0;
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => {
        size += c.length;
        if (size > o.maxBodyBytes) {
          resolve(undefined);
          req.destroy();
        } else chunks.push(c);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });

  return {
    async http(req, res, ip, cors) {
      if ((req.url ?? '').split('?')[0] !== '/indexer') return false;
      if (req.method !== 'POST') return (reply(res, 405, { errors: [{ message: 'POST only.' }] }, cors), true);
      if (!allowedOrigin(req)) return (reply(res, 403, { errors: [{ message: 'Not from the VeilCore site.' }] }, cors), true);
      if (ip === undefined) return (reply(res, 400, { errors: [{ message: 'Not through the expected proxy.' }] }, cors), true);
      if (!take(clientBucket(ip))) {
        res.setHeader('retry-after', '60');
        return (reply(res, 429, { errors: [{ message: 'Too many network reads from this address; wait a minute.' }] }, cors), true);
      }
      if (!(req.headers['content-type'] ?? '').startsWith('application/json'))
        return (reply(res, 415, { errors: [{ message: 'Send JSON.' }] }, cors), true);
      const text = await readBody(req);
      if (text === undefined) return (reply(res, 413, { errors: [{ message: 'Too large.' }] }, cors), true);
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        return (reply(res, 400, { errors: [{ message: 'Not JSON.' }] }, cors), true);
      }
      const query = typeof body === 'object' && body !== null ? (body as { query?: unknown }).query : undefined;
      if (typeof query !== 'string') return (reply(res, 400, { errors: [{ message: 'No query.' }] }, cors), true);
      if (hasMutation(query)) return (reply(res, 403, { errors: [{ message: 'Reads only.' }] }, cors), true);
      try {
        const up = await doFetch(o.indexer, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: text,
          signal: AbortSignal.timeout(20_000),
        });
        const out = await up.text();
        res.writeHead(up.status, {
          'content-type': up.headers.get('content-type') ?? 'application/json',
          'cache-control': 'no-store',
          ...cors,
        });
        res.end(out);
      } catch {
        reply(res, 502, { errors: [{ message: 'The network indexer did not answer.' }] }, cors);
      }
      return true;
    },

    attach(server, clientIp) {
      const wss = new WebSocketServer({
        noServer: true,
        maxPayload: o.maxBodyBytes,
        handleProtocols: (protocols) =>
          protocols.has('graphql-transport-ws') ? 'graphql-transport-ws' : protocols.has('graphql-ws') ? 'graphql-ws' : false,
      });
      const refuse = (socket: Duplex, code: number, text: string) => {
        socket.write(`HTTP/1.1 ${code} ${text}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
        socket.destroy();
      };
      server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
        if ((req.url ?? '').split('?')[0] !== '/indexer/ws') return refuse(socket, 404, 'Not Found');
        if (!allowedOrigin(req)) return refuse(socket, 403, 'Forbidden');
        const ip = clientIp(req);
        if (ip === undefined) return refuse(socket, 400, 'Bad Request');
        const bucket = clientBucket(ip);
        if (open >= o.maxSockets || (perBucket.get(bucket) ?? 0) >= o.maxSocketsPerBucket)
          return refuse(socket, 429, 'Too Many Requests');
        wss.handleUpgrade(req, socket, head, (client) => {
          open++;
          perBucket.set(bucket, (perBucket.get(bucket) ?? 0) + 1);
          const upstream = new WebSocket(o.indexerWS, client.protocol || 'graphql-transport-ws');
          const queued: { data: RawData; binary: boolean }[] = [];
          let idle: NodeJS.Timeout | undefined;
          let done = false;
          const finish = (code = 1000, reason = '') => {
            if (done) return;
            done = true;
            open--;
            const left = (perBucket.get(bucket) ?? 1) - 1;
            if (left > 0) perBucket.set(bucket, left);
            else perBucket.delete(bucket);
            if (idle) clearTimeout(idle);
            try {
              client.close(code, reason);
            } catch {
              client.terminate();
            }
            try {
              upstream.close();
            } catch {
              upstream.terminate();
            }
          };
          const touch = () => {
            if (idle) clearTimeout(idle);
            idle = setTimeout(() => finish(1000, 'idle'), o.idleMs);
          };
          touch();
          client.on('message', (data: RawData, binary: boolean) => {
            touch();
            if (!binary) {
              try {
                const m = JSON.parse(data.toString()) as { type?: string; payload?: { query?: unknown } };
                if (m.type === 'subscribe' || m.type === 'start') {
                  const q = m.payload?.query;
                  if (typeof q !== 'string' || hasMutation(q)) return finish(4403, 'Reads only.');
                }
              } catch {
                return finish(4400, 'Not JSON.');
              }
            }
            if (upstream.readyState === WebSocket.OPEN) upstream.send(data, { binary });
            else if (queued.length < 32) queued.push({ data, binary });
            else finish(4429, 'Too fast.');
          });
          upstream.on('open', () => {
            for (const q of queued.splice(0)) upstream.send(q.data, { binary: q.binary });
          });
          upstream.on('message', (data: RawData, binary: boolean) => {
            touch();
            if (client.readyState === WebSocket.OPEN) client.send(data, { binary });
          });
          upstream.on('close', (code) => finish(code === 1005 || code === 1006 ? 1011 : code));
          upstream.on('error', () => {
            log('warn', 'indexer relay: the upstream socket failed');
            finish(1011, 'The network indexer did not answer.');
          });
          client.on('close', () => finish());
          client.on('error', () => finish());
        });
      });
    },

    sockets: () => open,
  };
};
