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
// (viewing keys), which a website never needs and the sponsor must never relay. Each
// request carries one query of at most 16 KB, with no `extensions` or persisted-query
// fields; over the socket only the graphql-transport-ws messages a reader needs pass
// (connection_init with no payload, subscribe, complete, ping, pong).
//
// What limits use of the key: each address gets its own allowance per minute, and sockets
// are capped per address and in total. The Origin check only stops other websites'
// pages from using it through a visitor's browser; anything that isn't a browser can send
// any Origin it likes, so it is not a limit on who can use the relay.
//
// Upstream answers that aren't a success come back as one fixed error, never Blockfrost's
// own body, and an upstream redirect is refused rather than followed.
// Nothing here is believed by the site any more than the indexer itself was: the same
// checks run on what comes back (ownership-check.ts, presentation-lookup.ts).
// SPDX-License-Identifier: Apache-2.0

import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import { clientBucket } from "./limits.js";
import { log } from "./log.js";

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

const DEFAULTS = {
  perMinute: 240,
  maxSocketsPerBucket: 6,
  maxSockets: 300,
  maxBodyBytes: 64 * 1024,
  idleMs: 10 * 60_000,
};

/** The longest query text relayed, in bytes. The site's own queries are well under 4 KB. */
export const MAX_QUERY_BYTES = 16 * 1024;

/** The socket messages a reader sends (graphql-transport-ws). Anything else closes it. */
const CLIENT_MESSAGES = new Set([
  "connection_init",
  "subscribe",
  "complete",
  "ping",
  "pong",
]);
/** The fields a query may carry. No `extensions` (persisted queries live there), no `id`/`documentId`. */
const QUERY_FIELDS = new Set(["query", "variables", "operationName"]);

/**
 * Comments and string contents removed, so words and braces inside them don't count. One
 * pass, left to right, so a # inside a string is not taken for a comment, nor a quote
 * inside a comment for a string.
 */
const bareDocument = (query: string): string =>
  query.replace(/"""[\s\S]*?"""|"(?:\\.|[^"\\\n])*"|#[^\n\r]*/g, (m) =>
    m.startsWith("#") ? " " : '""',
  );

/** True when a GraphQL document contains a mutation (comments and strings aside). */
export const hasMutation = (query: string): boolean =>
  /(^|[\s{}])mutation(?=[\s({]|$)/.test(bareDocument(query));

/**
 * How many operations a document defines: each top-level `{ … }` block that is not a
 * fragment. Braces inside (…) (an argument's or a variable default's object value) are
 * not blocks. Comments and strings are removed first.
 */
export const operationCount = (query: string): number => {
  const bare = bareDocument(query);
  let depth = 0;
  let parens = 0;
  let header = "";
  let n = 0;
  for (const ch of bare) {
    if (ch === "(") parens++;
    else if (ch === ")") parens = Math.max(0, parens - 1);
    if (depth === 0 && parens === 0 && ch !== "{") {
      header += ch;
      continue;
    }
    if (ch === "{" && parens === 0) {
      if (depth === 0 && !/^\s*fragment\b/.test(header)) n++;
      depth++;
    } else if (ch === "}" && parens === 0) {
      depth = Math.max(0, depth - 1);
      if (depth === 0) header = "";
    }
  }
  return n;
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Why a query can't be relayed, or undefined when it can: one read-only operation of at
 * most 16 KB, carrying only query, variables and operationName.
 */
export const queryProblem = (
  payload: unknown,
): { status: 400 | 403; message: string } | undefined => {
  if (!isPlainObject(payload)) return { status: 400, message: "No query." };
  if (Object.keys(payload).some((k) => !QUERY_FIELDS.has(k)))
    return {
      status: 400,
      message: "Only query, variables and operationName are relayed.",
    };
  const { query, variables, operationName } = payload;
  if (typeof query !== "string") return { status: 400, message: "No query." };
  if (Buffer.byteLength(query, "utf8") > MAX_QUERY_BYTES)
    return { status: 400, message: "Query too long." };
  if (
    variables !== undefined &&
    variables !== null &&
    !isPlainObject(variables)
  )
    return { status: 400, message: "Variables must be an object." };
  if (
    operationName !== undefined &&
    operationName !== null &&
    typeof operationName !== "string"
  )
    return { status: 400, message: "operationName must be text." };
  if (hasMutation(query)) return { status: 403, message: "Reads only." };
  if (operationCount(query) !== 1)
    return { status: 400, message: "One operation per request." };
  return undefined;
};

const UPSTREAM_FAILED = {
  errors: [{ message: "The network indexer could not answer that." }],
};

export type IndexerRelay = {
  /** Handles POST /indexer; false for any other path. */
  http(
    req: IncomingMessage,
    res: ServerResponse,
    ip: string | undefined,
    cors: Record<string, string>,
  ): Promise<boolean>;
  /** Relays upgrades to /indexer/ws on this server. */
  attach(
    server: Server,
    clientIp: (req: IncomingMessage) => string | undefined,
  ): void;
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
    typeof req.headers.origin === "string" &&
    o.allowedOrigins.includes(req.headers.origin);
  const take = (bucket: string): boolean => {
    const t = Math.floor(now() / 60_000);
    const cur = minute.get(bucket);
    const n = cur && cur.at === t ? cur.n + 1 : 1;
    minute.set(bucket, { at: t, n });
    if (minute.size > 50_000)
      for (const [k, v] of minute) if (v.at !== t) minute.delete(k);
    return n <= o.perMinute;
  };
  const reply = (
    res: ServerResponse,
    status: number,
    body: unknown,
    cors: Record<string, string>,
  ) => {
    res.writeHead(status, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...cors,
    });
    res.end(JSON.stringify(body));
  };

  const readBody = (req: IncomingMessage): Promise<string | undefined> =>
    new Promise((resolve, reject) => {
      let size = 0;
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => {
        size += c.length;
        if (size > o.maxBodyBytes) {
          resolve(undefined);
          req.destroy();
        } else chunks.push(c);
      });
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      req.on("error", reject);
    });

  return {
    async http(req, res, ip, cors) {
      if ((req.url ?? "").split("?")[0] !== "/indexer") return false;
      if (req.method !== "POST")
        return (
          reply(res, 405, { errors: [{ message: "POST only." }] }, cors),
          true
        );
      if (!allowedOrigin(req))
        return (
          reply(
            res,
            403,
            { errors: [{ message: "Not from the VeilCore site." }] },
            cors,
          ),
          true
        );
      if (ip === undefined)
        return (
          reply(
            res,
            400,
            { errors: [{ message: "Not through the expected proxy." }] },
            cors,
          ),
          true
        );
      if (!take(clientBucket(ip))) {
        res.setHeader("retry-after", "60");
        return (
          reply(
            res,
            429,
            {
              errors: [
                {
                  message:
                    "Too many network reads from this address; wait a minute.",
                },
              ],
            },
            cors,
          ),
          true
        );
      }
      if (!(req.headers["content-type"] ?? "").startsWith("application/json"))
        return (
          reply(res, 415, { errors: [{ message: "Send JSON." }] }, cors),
          true
        );
      const text = await readBody(req);
      if (text === undefined)
        return (
          reply(res, 413, { errors: [{ message: "Too large." }] }, cors),
          true
        );
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        return (
          reply(res, 400, { errors: [{ message: "Not JSON." }] }, cors),
          true
        );
      }
      const problem = queryProblem(body);
      if (problem)
        return (
          reply(
            res,
            problem.status,
            { errors: [{ message: problem.message }] },
            cors,
          ),
          true
        );
      try {
        const up = await doFetch(o.indexer, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: text,
          redirect: "error",
          signal: AbortSignal.timeout(20_000),
        });
        if (!up.ok) {
          // Blockfrost's own error body can name the project or the plan: never passed on.
          void up.body?.cancel().catch(() => undefined);
          log("warn", `indexer relay: upstream answered ${up.status}`);
          reply(res, 502, UPSTREAM_FAILED, cors);
          return true;
        }
        const out = await up.text();
        res.writeHead(200, {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
          ...cors,
        });
        res.end(out);
      } catch {
        reply(
          res,
          502,
          { errors: [{ message: "The network indexer did not answer." }] },
          cors,
        );
      }
      return true;
    },

    attach(server, clientIp) {
      const wss = new WebSocketServer({
        noServer: true,
        maxPayload: o.maxBodyBytes,
        // Only the current protocol: its message set is the one checked below.
        handleProtocols: (protocols) =>
          protocols.has("graphql-transport-ws")
            ? "graphql-transport-ws"
            : false,
      });
      const refuse = (socket: Duplex, code: number, text: string) => {
        socket.write(
          `HTTP/1.1 ${code} ${text}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
        );
        socket.destroy();
      };
      server.on(
        "upgrade",
        (req: IncomingMessage, socket: Duplex, head: Buffer) => {
          if ((req.url ?? "").split("?")[0] !== "/indexer/ws")
            return refuse(socket, 404, "Not Found");
          if (!allowedOrigin(req)) return refuse(socket, 403, "Forbidden");
          const ip = clientIp(req);
          if (ip === undefined) return refuse(socket, 400, "Bad Request");
          const bucket = clientBucket(ip);
          if (
            open >= o.maxSockets ||
            (perBucket.get(bucket) ?? 0) >= o.maxSocketsPerBucket
          )
            return refuse(socket, 429, "Too Many Requests");
          wss.handleUpgrade(req, socket, head, (client) => {
            open++;
            perBucket.set(bucket, (perBucket.get(bucket) ?? 0) + 1);
            const upstream = new WebSocket(
              o.indexerWS,
              client.protocol || "graphql-transport-ws",
            );
            const queued: { data: RawData; binary: boolean }[] = [];
            let idle: NodeJS.Timeout | undefined;
            let done = false;
            const finish = (code = 1000, reason = "") => {
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
              idle = setTimeout(() => finish(1000, "idle"), o.idleMs);
            };
            touch();
            client.on("message", (data: RawData, binary: boolean) => {
              touch();
              if (binary) return finish(4400, "Text messages only.");
              let m: unknown;
              try {
                m = JSON.parse(data.toString());
              } catch {
                return finish(4400, "Not JSON.");
              }
              if (
                !isPlainObject(m) ||
                typeof m.type !== "string" ||
                !CLIENT_MESSAGES.has(m.type)
              )
                return finish(4400, "Message not allowed.");
              if (
                Object.keys(m).some(
                  (k) => k !== "type" && k !== "id" && k !== "payload",
                )
              )
                return finish(4400, "Message not allowed.");
              if (m.type === "connection_init" && m.payload !== undefined) {
                if (
                  !isPlainObject(m.payload) ||
                  Object.keys(m.payload).length > 0
                )
                  return finish(4400, "No connection payload.");
              }
              if (m.type === "subscribe") {
                if (typeof m.id !== "string")
                  return finish(4400, "Message not allowed.");
                const problem = queryProblem(m.payload);
                if (problem)
                  return finish(
                    problem.status === 403 ? 4403 : 4400,
                    problem.message,
                  );
              }
              if (upstream.readyState === WebSocket.OPEN)
                upstream.send(data, { binary });
              else if (queued.length < 32) queued.push({ data, binary });
              else finish(4429, "Too fast.");
            });
            upstream.on("open", () => {
              for (const q of queued.splice(0))
                upstream.send(q.data, { binary: q.binary });
            });
            upstream.on("message", (data: RawData, binary: boolean) => {
              touch();
              if (client.readyState === WebSocket.OPEN)
                client.send(data, { binary });
            });
            upstream.on("close", (code) =>
              finish(code === 1005 || code === 1006 ? 1011 : code),
            );
            upstream.on("error", () => {
              log("warn", "indexer relay: the upstream socket failed");
              finish(1011, "The network indexer did not answer.");
            });
            client.on("close", () => finish());
            client.on("error", () => finish());
          });
        },
      );
    },

    sockets: () => open,
  };
};
