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
// fields, read token by token as GraphQL reads it (readDocument), and refused if it can't
// be read. Over HTTP only a query; a subscription only over the socket, where only the
// graphql-transport-ws messages a reader needs pass (connection_init with no payload,
// subscribe, complete, ping, pong).
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

// ---- reading a GraphQL document -------------------------------------------------------
//
// Round 3: hasMutation was a regular expression, and a leading comma got past it:
// ",mutation{…}" is a mutation (commas are ignored tokens in GraphQL, like spaces), but the
// expression wanted a space or a brace before the word. What is relayed is now decided by
// reading the document the way the GraphQL spec does (October 2021, section 2.1): split it
// into tokens, skipping ignored ones, then read the keyword that starts each top-level
// definition. A document this can't read is refused, never guessed at. graphql-js is not a
// dependency of the sponsor, so this is a small reader of its own rather than its parser.

type Token = { readonly kind: "name" | "punct" | "string" | "number"; readonly value: string };

const NAME_START = /[_A-Za-z]/;
const NAME_CHAR = /[_0-9A-Za-z]/;
const DIGIT = /[0-9]/;
const PUNCT = new Set(["!", "$", "&", "(", ")", ":", "=", "@", "[", "]", "{", "|", "}"]);

/**
 * The tokens of a GraphQL document, or why it isn't one. Skipped, as the spec says: the
 * byte order mark, spaces, tabs, line ends, commas, and comments (# to the end of the
 * line). Strings ("…" and block strings """…""") are one token each, so no word, brace or
 * # inside one counts. Anything the spec doesn't allow outside a string or a comment (a
 * form feed, a non-ASCII letter, a lone dot) is an error.
 */
export const graphqlTokens = (src: string): Token[] | { error: string } => {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "\uFEFF" || c === " " || c === "\t" || c === "\n" || c === "\r" || c === ",") {
      i++;
      continue;
    }
    if (c === "#") {
      while (i < src.length && src[i] !== "\n" && src[i] !== "\r") i++;
      continue;
    }
    if (c === '"') {
      if (src.startsWith('"""', i)) {
        // Block string: ends at the next """ that isn't escaped as \""".
        let j = i + 3;
        for (;;) {
          if (j >= src.length) return { error: "unterminated block string" };
          if (src.startsWith('\\"""', j)) j += 4;
          else if (src.startsWith('"""', j)) break;
          else j++;
        }
        out.push({ kind: "string", value: src.slice(i, j + 3) });
        i = j + 3;
        continue;
      }
      // String: one line, backslash escapes the next character.
      let j = i + 1;
      for (;;) {
        if (j >= src.length || src[j] === "\n" || src[j] === "\r") return { error: "unterminated string" };
        if (src[j] === "\\") {
          // An escape never covers a line end (the spec refuses one there too).
          if (j + 1 >= src.length || src[j + 1] === "\n" || src[j + 1] === "\r") return { error: "unterminated string" };
          j += 2;
        } else if (src[j] === '"') break;
        else j++;
      }
      out.push({ kind: "string", value: src.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    if (src.startsWith("...", i)) {
      out.push({ kind: "punct", value: "..." });
      i += 3;
      continue;
    }
    if (PUNCT.has(c)) {
      out.push({ kind: "punct", value: c });
      i++;
      continue;
    }
    if (NAME_START.test(c)) {
      let j = i + 1;
      while (j < src.length && NAME_CHAR.test(src[j])) j++;
      out.push({ kind: "name", value: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === "-" || DIGIT.test(c)) {
      const m = /^-?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(src.slice(i, i + 400));
      if (!m) return { error: "bad number" };
      const after = src[i + m[0].length];
      // The spec forbids a name start or a dot right after a number (a digit can't follow: the match took them all).
      if (after !== undefined && (NAME_START.test(after) || after === ".")) return { error: "bad number" };
      out.push({ kind: "number", value: m[0] });
      i += m[0].length;
      continue;
    }
    return { error: "character not allowed here" };
  }
  return out;
};

const OPEN_CLOSE: Record<string, string> = { "{": "}", "(": ")", "[": "]" };
const CLOSERS = new Set(["}", ")", "]"]);

/** The index after the group opened at tokens[i] ({, ( or [), or -1 if it never closes properly. */
const skipGroup = (tokens: readonly Token[], i: number): number => {
  const stack: string[] = [];
  for (let j = i; j < tokens.length; j++) {
    const t = tokens[j];
    if (t.kind !== "punct") continue;
    const close = OPEN_CLOSE[t.value];
    if (close) stack.push(close);
    else if (CLOSERS.has(t.value)) {
      if (stack.pop() !== t.value) return -1;
      if (stack.length === 0) return j + 1;
    }
  }
  return -1;
};

export type OperationKind = "query" | "mutation" | "subscription";

/**
 * The operations a document defines, in order, and how many fragments, or why it can't
 * be read. Each top-level definition must start with `{` (a query with no keyword),
 * `query`, `mutation`, `subscription` or `fragment`; anything else (a schema definition,
 * `extend`, a stray token) is refused. A `mutation` anywhere else (a field, an argument,
 * an operation's name) is just a name and doesn't count.
 */
export const readDocument = (
  query: string,
): { operations: OperationKind[]; fragments: number } | { error: string } => {
  const tokens = graphqlTokens(query);
  if (!Array.isArray(tokens)) return tokens;
  const operations: OperationKind[] = [];
  let fragments = 0;
  const is = (i: number, kind: Token["kind"], value?: string) =>
    tokens[i]?.kind === kind && (value === undefined || tokens[i].value === value);
  /** Directives (@name, @name(args)) from i; the index after them. */
  const directives = (i: number): number => {
    while (is(i, "punct", "@")) {
      if (!is(i + 1, "name")) return -1;
      i += 2;
      if (is(i, "punct", "(")) {
        i = skipGroup(tokens, i);
        if (i < 0) return -1;
      }
    }
    return i;
  };
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.kind === "punct" && t.value === "{") {
      i = skipGroup(tokens, i);
      if (i < 0) return { error: "unbalanced braces" };
      operations.push("query");
      continue;
    }
    if (t.kind === "name" && (t.value === "query" || t.value === "mutation" || t.value === "subscription")) {
      i++;
      if (is(i, "name")) i++;
      if (is(i, "punct", "(")) {
        i = skipGroup(tokens, i);
        if (i < 0) return { error: "unbalanced variable definitions" };
      }
      i = directives(i);
      if (i < 0 || !is(i, "punct", "{")) return { error: `${t.value} without a selection` };
      i = skipGroup(tokens, i);
      if (i < 0) return { error: "unbalanced braces" };
      operations.push(t.value);
      continue;
    }
    if (t.kind === "name" && t.value === "fragment") {
      if (!is(i + 1, "name") || tokens[i + 1].value === "on" || !is(i + 2, "name", "on") || !is(i + 3, "name")) {
        return { error: "malformed fragment" };
      }
      i = directives(i + 4);
      if (i < 0 || !is(i, "punct", "{")) return { error: "fragment without a selection" };
      i = skipGroup(tokens, i);
      if (i < 0) return { error: "unbalanced braces" };
      fragments++;
      continue;
    }
    return { error: "not a query, a subscription or a fragment" };
  }
  return { operations, fragments };
};

/** True when a document defines a mutation (comments, strings and field names aside). */
export const hasMutation = (query: string): boolean => {
  const doc = readDocument(query);
  return !("error" in doc) && doc.operations.includes("mutation");
};

/** How many operations a document defines (fragments not counted); -1 if it can't be read. */
export const operationCount = (query: string): number => {
  const doc = readDocument(query);
  return "error" in doc ? -1 : doc.operations.length;
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Why a query can't be relayed, or undefined when it can: one read-only operation of at
 * most 16 KB, carrying only query, variables and operationName. Over HTTP only a query; a
 * subscription only over the socket (`transport: "socket"`), where it can be answered.
 */
export const queryProblem = (
  payload: unknown,
  transport: "http" | "socket" = "http",
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
  const doc = readDocument(query);
  if ("error" in doc)
    return { status: 400, message: "Not a query this relay can read." };
  if (doc.operations.includes("mutation"))
    return { status: 403, message: "Reads only." };
  if (doc.operations.length === 0)
    return { status: 400, message: "No operation." };
  if (doc.operations.length !== 1)
    return { status: 400, message: "One operation per request." };
  if (doc.operations[0] === "subscription" && transport !== "socket")
    return { status: 400, message: "Subscriptions go over the socket." };
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
                const problem = queryProblem(m.payload, "socket");
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

// ---- the relay on its own, for veilcore.org's check page (relay-main.ts) ---------------
//
// The public check page looks up a batch root's date stamp on Midnight itself
// (bboard-ui/src/veilcore/chain/anchor-check.ts). On mainnet the only indexer is
// Blockfrost's, which needs a project id, so the page reads through this relay. The sponsor
// service can't be pointed at mainnet (config.ts refuses it: it pays fees, and needs a
// wallet), so the same relay also runs alone: no wallet, no seed, no proof server, no
// registry token. It holds one secret, the Blockfrost project id, and only relays reads.
// docs/check-on-chain.md says how to deploy it.

export type ReadRelayNetwork = "mainnet" | "preprod" | "preview";

export type ReadRelayConfig = {
  readonly network: ReadRelayNetwork;
  readonly port: number;
  readonly indexer: string;
  readonly indexerWS: string;
  readonly allowedOrigins: readonly string[];
  readonly trustProxyHops: number;
  /** Values kept out of the logs (the project id). */
  readonly secrets: readonly string[];
};

/** Blockfrost's Midnight indexer for a network. The id rides in the URLs, so they are secrets. */
export const blockfrostIndexer = (
  network: "mainnet" | "preprod",
  projectId: string,
): { indexer: string; indexerWS: string } => {
  const q = `?project_id=${encodeURIComponent(projectId)}`;
  return {
    indexer: `https://midnight-${network}.blockfrost.io/api/v0${q}`,
    indexerWS: `wss://midnight-${network}.blockfrost.io/api/v0/ws${q}`,
  };
};

/** Settings that mean someone pointed a wallet or an operator token at the read-only relay. */
const NOT_HERE = [
  /SEED/i,
  /MNEMONIC/i,
  /^REGISTRY_OPERATOR_TOKEN$/,
  /^SPONSOR_STATUS_TOKEN$/,
  /MAINTENANCE/i,
  /PRIVATE_KEY/i,
];

/** The read-only relay's settings, from the environment, or every problem with them. */
export const loadReadRelayConfig = (
  env: Record<string, string | undefined>,
): { ok: true; config: ReadRelayConfig } | { ok: false; problems: string[] } => {
  const problems: string[] = [];
  const held = Object.keys(env).filter(
    (k) => (env[k] ?? "").trim() !== "" && NOT_HERE.some((r) => r.test(k)),
  );
  if (held.length > 0)
    problems.push(
      `Remove ${held.join(", ")}: this is the read-only relay. It must hold no wallet, seed or operator token.`,
    );

  const raw = (env.RELAY_NETWORK ?? "").trim().toLowerCase();
  const network = (["mainnet", "preprod", "preview"] as const).find(
    (n) => n === raw,
  );
  if (!network)
    problems.push(
      `RELAY_NETWORK must be mainnet, preprod or preview (got "${raw}").`,
    );

  const id = (env.BLOCKFROST_PROJECT_ID ?? "").trim();
  const ownUrl = (env.INDEXER_URL ?? "").trim();
  const ownWs = (env.INDEXER_WS_URL ?? "").trim();
  let ep: { indexer: string; indexerWS: string } = { indexer: "", indexerWS: "" };
  if (ownUrl || ownWs) {
    if (!/^https:\/\//.test(ownUrl) || !/^wss:\/\//.test(ownWs))
      problems.push(
        "INDEXER_URL (https://…) and INDEXER_WS_URL (wss://…) must be given together.",
      );
    else ep = { indexer: ownUrl, indexerWS: ownWs };
  } else if (network === "preview") {
    ep = {
      indexer: "https://indexer.preview.midnight.network/api/v4/graphql",
      indexerWS: "wss://indexer.preview.midnight.network/api/v4/graphql/ws",
    };
  } else if (network) {
    if (!/^[A-Za-z0-9_-]{8,}$/.test(id))
      problems.push(
        `BLOCKFROST_PROJECT_ID is required: a Blockfrost "Midnight ${network === "mainnet" ? "Mainnet" : "Preprod"}" project id (blockfrost.io). Midnight runs no keyless ${network} indexer.`,
      );
    else {
      // A mainnet id has the network in it (Blockfrost ids start "mainnet…", "preprod…").
      const other = network === "mainnet" ? "preprod" : "mainnet";
      if (id.toLowerCase().startsWith(other))
        problems.push(
          `BLOCKFROST_PROJECT_ID looks like a ${other} project; ${network} needs its own (they are not interchangeable).`,
        );
      else ep = blockfrostIndexer(network, id);
    }
  }

  const origins = (env.ALLOWED_ORIGINS ?? "https://veilcore.org,https://www.veilcore.org")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (origins.length === 0) problems.push("ALLOWED_ORIGINS is empty.");
  for (const o of origins)
    if (!/^https:\/\/[^/]+$/.test(o))
      problems.push(`ALLOWED_ORIGINS: "${o}" is not an https origin.`);

  const int = (v: string | undefined, d: number, lo: number, hi: number, name: string) => {
    if (v === undefined || v.trim() === "") return d;
    const n = Number(v);
    if (!Number.isInteger(n) || n < lo || n > hi) {
      problems.push(`${name} must be a whole number from ${lo} to ${hi}.`);
      return d;
    }
    return n;
  };
  const port = int(env.PORT, 8080, 1, 65535, "PORT");
  const trustProxyHops = int(env.TRUST_PROXY_HOPS, 1, 0, 5, "TRUST_PROXY_HOPS");

  if (problems.length > 0 || !network) return { ok: false, problems };
  return {
    ok: true,
    config: {
      network,
      port,
      ...ep,
      allowedOrigins: origins,
      trustProxyHops,
      secrets: id ? [id] : [],
    },
  };
};

/**
 * The read-only relay's routes: GET /health (and the network it reads), the CORS
 * preflight, and POST /indexer. Everything else is 404. The socket (/indexer/ws) is
 * attached to the server by relay.attach.
 */
export const readRelayHandler =
  (
    relay: IndexerRelay,
    cfg: Pick<ReadRelayConfig, "network" | "allowedOrigins">,
    clientIp: (req: IncomingMessage) => string | undefined,
  ) =>
  async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
    const cors: Record<string, string> =
      origin !== undefined && cfg.allowedOrigins.includes(origin)
        ? { "access-control-allow-origin": origin, vary: "Origin" }
        : { vary: "Origin" };
    const path = (req.url ?? "/").split("?")[0];
    const send = (status: number, body: unknown, extra: Record<string, string> = {}) => {
      res.writeHead(status, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        ...extra,
      });
      res.end(JSON.stringify(body));
    };
    try {
      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          ...cors,
          "access-control-allow-methods": "POST",
          "access-control-allow-headers": "content-type, accept",
          "access-control-max-age": "600",
        });
        res.end();
        return;
      }
      if (req.method === "GET" && path === "/health")
        return send(200, { ok: true, readsOnly: true, network: cfg.network }, cors);
      if (path === "/indexer") {
        await relay.http(req, res, clientIp(req), cors);
        return;
      }
      send(404, { ok: false, reason: "Not found." }, cors);
    } catch {
      if (!res.headersSent) send(500, { ok: false, reason: "Something went wrong on the relay." }, cors);
    }
  };
