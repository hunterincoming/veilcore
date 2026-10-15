// The indexer relay: the site reads the chain through the sponsor, the key stays here,
// and nothing but reads from the site's own origin gets through.
import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { WebSocket, WebSocketServer } from "ws";
import { startServer } from "./server.js";
import {
  createIndexerRelay,
  duplicateJsonKey,
  hasMutation,
  operationCount,
  queryProblem,
  readDocument,
  MAX_QUERY_BYTES,
} from "./indexer-relay.js";

const SITE = "https://test.veilcore.org";
const XFF = { "x-forwarded-for": "203.0.113.9" };
const servers: Server[] = [];
afterEach(async () => {
  for (const s of servers.splice(0))
    await new Promise((r) => s.close(() => r(undefined)));
});
const portOf = (s: Server) => (s.address() as AddressInfo).port;

/** How the stand-in indexer answers HTTP: normally, with an error of its own, or a redirect. */
type Mode = { status: number; body: string; headers?: Record<string, string> };
const OK: Mode = {
  status: 200,
  body: JSON.stringify({ data: { block: { height: 7 } } }),
};

/** A stand-in indexer: records what it is asked over HTTP and echoes subscriptions. */
const fakeIndexer = async () => {
  const seen: { url: string; body: string }[] = [];
  const wsSeen: string[] = [];
  const mode: { now: Mode } = { now: OK };
  const up = createServer((req, res) => {
    let body = "";
    req.on("data", (c: Buffer) => (body += c.toString()));
    req.on("end", () => {
      seen.push({ url: req.url ?? "", body });
      res.writeHead(mode.now.status, {
        "content-type": "application/json",
        ...mode.now.headers,
      });
      res.end(mode.now.body);
    });
  });
  const wss = new WebSocketServer({
    server: up,
    handleProtocols: () => "graphql-transport-ws",
  });
  wss.on("connection", (ws, req) => {
    wsSeen.push(`connect ${req.url}`);
    ws.on("message", (d) => {
      wsSeen.push(d.toString());
      const m = JSON.parse(d.toString()) as { type: string; id?: string };
      if (m.type === "connection_init")
        ws.send(JSON.stringify({ type: "connection_ack" }));
      if (m.type === "subscribe")
        ws.send(
          JSON.stringify({
            type: "next",
            id: m.id,
            payload: { data: { blocks: { height: 8 } } },
          }),
        );
    });
  });
  up.listen(0);
  await new Promise((r) => up.once("listening", r));
  servers.push(up);
  return { seen, wsSeen, mode, port: portOf(up) };
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
      sponsor: {
        handle: () => Promise.resolve({ status: 200, body: {} }),
        status: () => ({}),
      },
      pow: { issue: () => ({ challenge: "c", difficulty: 1, expiresAt: 0 }) },
      limits: { request: () => ({ ok: true }) },
      extraStatus: () => ({}),
      allowedOrigins: [SITE],
      trustProxyHops: 1,
      maxBodyBytes: 2_000,
      indexerRelay: relay,
    },
    0,
  );
  await new Promise((r) =>
    server.listening ? r(undefined) : server.once("listening", r),
  );
  servers.push(server);
  return {
    up,
    relay,
    url: `http://127.0.0.1:${portOf(server)}`,
    ws: `ws://127.0.0.1:${portOf(server)}/indexer/ws`,
  };
};

const post = (url: string, body: unknown, origin = SITE) =>
  fetch(`${url}/indexer`, {
    method: "POST",
    headers: { "content-type": "application/json", origin, ...XFF },
    body: JSON.stringify(body),
  });

describe("reads over HTTP", () => {
  it("relays a query with the key added here, and the key never reaches the browser", async () => {
    const { up, url } = await sponsorWith();
    const res = await post(url, { query: "query { block { height } }" });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe(SITE);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ data: { block: { height: 7 } } });
    expect(text).not.toContain("SECRETKEY");
    expect(up.seen).toEqual([
      {
        url: "/api/v0?project_id=SECRETKEY",
        body: '{"query":"query { block { height } }"}',
      },
    ]);
  });

  it("refuses other sites, mutations, junk and floods", async () => {
    const { up, url } = await sponsorWith(2); // the bad requests above count against it too
    expect(
      (
        await post(
          url,
          { query: "{ block { height } }" },
          "https://elsewhere.example",
        )
      ).status,
    ).toBe(403);
    expect(
      (await post(url, { query: 'mutation { connect(viewingKey: "x") }' }))
        .status,
    ).toBe(403);
    expect((await post(url, { nope: 1 })).status).toBe(400);
    expect((await post(url, { query: "{ a }" })).status).toBe(429);
    expect(up.seen).toHaveLength(0);
  });

  it("refuses more than one operation, extensions and persisted queries, and long queries", async () => {
    const { up, url } = await sponsorWith();
    const refused = async (body: unknown) => {
      const res = await post(url, body);
      return {
        status: res.status,
        message: ((await res.json()) as { errors: { message: string }[] })
          .errors[0].message,
      };
    };
    expect(await refused({ query: "query A { a } query B { b }" })).toEqual({
      status: 400,
      message: "One operation per request.",
    });
    expect(await refused({ query: "{ a } { b }" })).toMatchObject({
      status: 400,
    });
    expect(
      await refused({ query: "fragment F on Block { height }" }),
    ).toMatchObject({ status: 400 });
    expect(await refused({ query: "{ a }", extensions: {} })).toMatchObject({
      status: 400,
    });
    expect(
      await refused({
        extensions: {
          persistedQuery: { version: 1, sha256Hash: "ab".repeat(32) },
        },
      }),
    ).toMatchObject({ status: 400 });
    expect(await refused({ query: "{ a }", documentId: "abc" })).toMatchObject({
      status: 400,
    });
    expect(await refused({ query: "{ a }", id: "abc" })).toMatchObject({
      status: 400,
    });
    expect(await refused({ query: "{ a }", variables: "x" })).toMatchObject({
      status: 400,
    });
    expect(
      await refused([{ query: "{ a }" }, { query: "{ b }" }]),
    ).toMatchObject({ status: 400 });
    const long = `query { a${" ".repeat(MAX_QUERY_BYTES)} }`;
    expect(await refused({ query: long })).toEqual({
      status: 400,
      message: "Query too long.",
    });
    expect(up.seen).toHaveLength(0);
    // One operation with fragments, variables and a name is fine.
    const ok = await post(url, {
      query:
        "query Q($h: Int = 1) { block(offset: { height: $h }) { ...F } } fragment F on Block { height }",
      variables: { h: 2 },
      operationName: "Q",
    });
    expect(ok.status).toBe(200);
    expect(up.seen).toHaveLength(1);
  });

  it("never passes on the upstream’s own error body, and never follows a redirect", async () => {
    const { up, url } = await sponsorWith();
    up.mode.now = {
      status: 403,
      body: JSON.stringify({
        message: "Invalid project token SECRETKEY plan=free",
      }),
    };
    let res = await post(url, { query: "{ a }" });
    expect(res.status).toBe(502);
    let text = await res.text();
    expect(JSON.parse(text)).toEqual({
      errors: [{ message: "The network indexer could not answer that." }],
    });
    expect(text).not.toContain("SECRETKEY");

    up.mode.now = {
      status: 500,
      body: "<html>Blockfrost internal error</html>",
      headers: { "content-type": "text/html" },
    };
    res = await post(url, { query: "{ a }" });
    expect(res.status).toBe(502);
    expect(res.headers.get("content-type")).toMatch(/^application\/json/);
    expect(await res.text()).not.toContain("Blockfrost");

    // A redirect is refused, not followed (to wherever it points, with the query).
    const elsewhere = await fakeIndexer();
    up.mode.now = {
      status: 302,
      body: "",
      headers: { location: `http://127.0.0.1:${elsewhere.port}/steal` },
    };
    res = await post(url, { query: "{ a }" });
    expect(res.status).toBe(502);
    text = await res.text();
    expect(text).not.toContain("steal");
    expect(elsewhere.seen).toHaveLength(0);
  });

  it("counts operations, not fragments or braces inside arguments, strings and comments", () => {
    expect(operationCount("{ a }")).toBe(1);
    expect(operationCount("query Q { a { b } }")).toBe(1);
    expect(operationCount("query Q { a } fragment F on T { b }")).toBe(1);
    expect(
      operationCount(
        "query Q($v: In = { x: 1 }) { a(f: { g: { h: 2 } }) { b } }",
      ),
    ).toBe(1);
    expect(operationCount('query { a(s: "} { evil }") }')).toBe(1);
    expect(operationCount('query { a(s: "#") { b } }')).toBe(1);
    expect(operationCount("# { x }\nquery { a }")).toBe(1);
    expect(operationCount("query { a } subscription { b }")).toBe(2);
    expect(operationCount("{ a }{ b }")).toBe(2);
    expect(operationCount("fragment F on T { b }")).toBe(0);
    expect(operationCount("")).toBe(0);
  });

  it("tells a mutation from the word inside a comment, a string or a field name", () => {
    expect(hasMutation("mutation { connect }")).toBe(true);
    expect(hasMutation("{ a } mutation M{ b }")).toBe(true);
    expect(hasMutation("query Q { a }\nmutation\n{ b }")).toBe(true);
    expect(hasMutation("# mutation in a comment\nquery { a }")).toBe(false);
    expect(hasMutation('query { a(name: "mutation { x }") }')).toBe(false);
    expect(hasMutation("query { mutationCount }")).toBe(false);
  });
});

// Round 3: ",mutation{…}" got past the old expression; commas are ignored tokens in
// GraphQL, like spaces. Documents are now read token by token (readDocument).
describe("reading a document as GraphQL does", () => {
  const verdict = (query: string, transport?: "http" | "socket") =>
    queryProblem({ query }, transport);
  const READS_ONLY = { status: 403, message: "Reads only." };

  it("a leading comma, or commas anywhere, don't hide a mutation", () => {
    for (const q of [
      ",mutation{connect}",
      ",,, mutation { connect }",
      "{ a },mutation{ b }",
      "mutation,{ connect }",
      "mutation,M,{ connect }",
    ]) {
      expect(hasMutation(q), q).toBe(true);
      expect(verdict(q), q).toEqual(READS_ONLY);
    }
  });

  it("comments are skipped to the end of the line, \\n or \\r, and hide only what is on that line", () => {
    expect(hasMutation("# a comment\nmutation { x }")).toBe(true);
    expect(hasMutation("# a comment\rmutation { x }")).toBe(true);
    expect(hasMutation("#\r\n,mutation{x}")).toBe(true);
    expect(hasMutation("query { a } # mutation { x }")).toBe(false);
    expect(verdict("query { a } # mutation { x }")).toBeUndefined();
    expect(verdict("# just a comment")).toEqual({ status: 400, message: "No operation." });
  });

  it("a byte order mark, tabs and line ends are skipped like spaces", () => {
    expect(verdict("\uFEFFmutation { x }")).toEqual(READS_ONLY);
    expect(verdict("\uFEFF{ a }")).toBeUndefined();
    expect(verdict("\tmutation\n{ x }")).toEqual(READS_ONLY);
    expect(verdict("\r\nmutation\r{ x }")).toEqual(READS_ONLY);
    expect(verdict("{\ta\r\n}\t")).toBeUndefined();
    expect(verdict("{ a }\u{FEFF}mutation{ b }")).toEqual(READS_ONLY);
    // Other white space the spec doesn't allow is refused, not guessed at.
    for (const q of ["\fmutation { x }", "\vquery { a }", "\u00A0{ a }", "\u2028mutation{x}"])
      expect(verdict(q), JSON.stringify(q)).toEqual({ status: 400, message: "Not a query this relay can read." });
  });

  it("keywords inside strings and block strings don't count, and neither do braces", () => {
    expect(verdict('{ a(s: "query") }')).toBeUndefined();
    expect(verdict('{ a(s: "mutation { x }") }')).toBeUndefined();
    expect(verdict('{ a(s: "} mutation { x } {") }')).toBeUndefined();
    expect(verdict('{ a(s: """ } mutation { x } { """) }')).toBeUndefined();
    expect(verdict('{ a(s: """ \\""" mutation { x } """) }')).toBeUndefined();
    expect(verdict('{ a(s: "\\" mutation { x }") }')).toBeUndefined();
    expect(verdict('{ a(s: "#") } mutation { x }')).toEqual(READS_ONLY);
    // A string where a definition should start is not a query.
    expect(verdict('"query" { a }')?.status).toBe(400);
    // Unterminated or multi-line strings are refused.
    for (const q of ['{ a(s: "x) }', '{ a(s: "x\n") }', '{ a(s: "x\\\n") }', '{ a(s: """x) }'])
      expect(verdict(q), q).toEqual({ status: 400, message: "Not a query this relay can read." });
  });

  it("an anonymous { } query is allowed, and `mutation` as a field, argument or name is just a name", () => {
    expect(verdict("{ a }")).toBeUndefined();
    expect(verdict("{ block { height } }")).toBeUndefined();
    expect(verdict("query { mutation { a } }")).toBeUndefined();
    expect(verdict("{ mutation }")).toBeUndefined();
    expect(verdict("{ a(mutation: 1) { mutation } }")).toBeUndefined();
    expect(verdict("query mutation { a }")).toBeUndefined();
    expect(verdict("query Q($mutation: Int = 1) @mutation { a }")).toBeUndefined();
    expect(verdict("query { ...mutation } fragment mutation on T { a }")).toBeUndefined();
    expect(hasMutation("query { mutation { a } }")).toBe(false);
  });

  it("fragments alone, schema language and unknown first tokens are refused", () => {
    expect(verdict("fragment F on T { a }")).toEqual({ status: 400, message: "No operation." });
    for (const q of [
      "extend type Query { a: Int }",
      "type Query { a: Int }",
      "schema { query: Q }",
      "@dir { a }",
      "Query { a }",
      "{ a } }",
      "{ a ",
      "query Q",
      "fragment on on T { a }",
      "1 { a }",
      ". { a }",
      "{ a ( }",
    ])
      expect(verdict(q), q).toEqual({ status: 400, message: "Not a query this relay can read." });
    expect(operationCount("type Query { a: Int }")).toBe(-1);
    expect(readDocument("query A { a } fragment F on T { b }")).toEqual({ operations: ["query"], fragments: 1 });
  });

  it("a subscription goes over the socket, never HTTP", () => {
    expect(verdict("subscription { a }")).toEqual({ status: 400, message: "Subscriptions go over the socket." });
    expect(verdict("subscription { a }", "socket")).toBeUndefined();
    expect(verdict("{ a }", "socket")).toBeUndefined();
    expect(verdict(",mutation { a }", "socket")).toEqual(READS_ONLY);
  });

  it("over HTTP, the comma form is refused before it reaches the indexer", async () => {
    const { up, url } = await sponsorWith();
    for (const query of [",mutation{connect}", "\uFEFF,\t# x\nmutation{connect}", "subscription { a }"]) {
      const res = await post(url, { query });
      expect(res.status, query).toBe(query.startsWith("subscription") ? 400 : 403);
    }
    expect(up.seen).toHaveLength(0);
  });
});

describe("subscriptions over the socket", () => {
  const open = (url: string, origin = SITE) =>
    new WebSocket(url, "graphql-transport-ws", { headers: { origin, ...XFF } });
  /** Open a socket, send one message, and return the close code (or 'open' if it stays open). */
  const closeCodeFor = async (
    ws: string,
    message: string | Buffer,
    settleMs = 300,
  ): Promise<number | "open"> => {
    const c = open(ws);
    await new Promise((r) => c.once("open", r));
    const closed = new Promise<number>((r) =>
      c.once("close", (code) => r(code)),
    );
    c.send(message, { binary: Buffer.isBuffer(message) });
    const code = await Promise.race([
      closed,
      new Promise<"open">((r) => setTimeout(() => r("open"), settleMs)),
    ]);
    if (code === "open") {
      c.close();
      await closed;
    }
    return code;
  };

  it("lets through only the messages a reader sends; anything else closes the socket", async () => {
    const { ws, up } = await sponsorWith(240, 20);
    const msg = (m: unknown) => JSON.stringify(m);
    for (const type of [
      "start",
      "stop",
      "connection_terminate",
      "next",
      "error",
      "connection_ack",
      "whatever",
    ]) {
      expect(
        await closeCodeFor(
          ws,
          msg({ type, id: "1", payload: { query: "{ a }" } }),
        ),
        type,
      ).toBe(4400);
    }
    expect(await closeCodeFor(ws, msg({ id: "1" }))).toBe(4400);
    expect(await closeCodeFor(ws, msg(["connection_init"]))).toBe(4400);
    expect(await closeCodeFor(ws, "not json")).toBe(4400);
    expect(await closeCodeFor(ws, Buffer.from(msg({ type: "ping" })))).toBe(
      4400,
    );
    expect(await closeCodeFor(ws, msg({ type: "ping", extra: 1 }))).toBe(4400);
    // connection_init: no payload, or an empty one.
    expect(
      await closeCodeFor(
        ws,
        msg({ type: "connection_init", payload: { authToken: "x" } }),
      ),
    ).toBe(4400);
    expect(
      await closeCodeFor(ws, msg({ type: "connection_init", payload: "x" })),
    ).toBe(4400);
    expect(
      await closeCodeFor(ws, msg({ type: "connection_init", payload: {} })),
    ).toBe("open");
    expect(await closeCodeFor(ws, msg({ type: "connection_init" }))).toBe(
      "open",
    );
    for (const type of ["ping", "pong"])
      expect(await closeCodeFor(ws, msg({ type }))).toBe("open");
    expect(await closeCodeFor(ws, msg({ type: "complete", id: "1" }))).toBe(
      "open",
    );
    // Subscribe: one read-only operation, short, nothing but query/variables/operationName.
    const sub = (payload: unknown, id: unknown = "1") =>
      msg({ type: "subscribe", id, payload });
    expect(
      await closeCodeFor(
        ws,
        sub({ query: "subscription A { a } subscription B { b }" }),
      ),
    ).toBe(4400);
    expect(
      await closeCodeFor(
        ws,
        sub({ query: "subscription { a }", extensions: {} }),
      ),
    ).toBe(4400);
    expect(
      await closeCodeFor(
        ws,
        sub({
          extensions: { persistedQuery: { version: 1, sha256Hash: "ab" } },
        }),
      ),
    ).toBe(4400);
    expect(
      await closeCodeFor(
        ws,
        sub({ query: `subscription { a${" ".repeat(MAX_QUERY_BYTES)} }` }),
      ),
    ).toBe(4400);
    expect(
      await closeCodeFor(ws, sub({ query: "subscription { a }" }, 7)),
    ).toBe(4400);
    expect(await closeCodeFor(ws, sub({ query: "mutation { connect }" }))).toBe(
      4403,
    );
    expect(await closeCodeFor(ws, sub({ query: "subscription { a }" }))).toBe(
      "open",
    );
    // Nothing refused reached the indexer.
    await expect
      .poll(() => up.wsSeen.filter((m) => !m.startsWith("connect ")).length)
      .toBe(6);
    expect(
      up.wsSeen.some(
        (m) =>
          m.includes("authToken") ||
          m.includes("persistedQuery") ||
          m.includes("start"),
      ),
    ).toBe(false);
  });

  it("accepts only the graphql-transport-ws protocol", async () => {
    const { ws } = await sponsorWith();
    const c = new WebSocket(ws, "graphql-ws", {
      headers: { origin: SITE, ...XFF },
    });
    const failed = await new Promise<boolean>((r) => {
      c.once("open", () => r(false));
      c.once("error", () => r(true));
    });
    expect(failed).toBe(true);
  });

  it("relays both ways, to the keyed upstream", async () => {
    const { up, ws, relay } = await sponsorWith();
    const c = open(ws);
    const got: unknown[] = [];
    c.on("message", (d) => got.push(JSON.parse(d.toString())));
    await new Promise((r) => c.once("open", r));
    c.send(JSON.stringify({ type: "connection_init" }));
    c.send(
      JSON.stringify({
        type: "subscribe",
        id: "1",
        payload: { query: "subscription { blocks { height } }" },
      }),
    );
    await expect.poll(() => got.length).toBe(2);
    expect(got).toEqual([
      { type: "connection_ack" },
      { type: "next", id: "1", payload: { data: { blocks: { height: 8 } } } },
    ]);
    expect(up.wsSeen[0]).toBe("connect /api/v0/ws?project_id=SECRETKEY");
    expect(relay.sockets()).toBe(1);
    c.close();
    await expect.poll(() => relay.sockets()).toBe(0);
  });

  it("closes on a mutation, and refuses other sites and too many sockets", async () => {
    const { ws, relay } = await sponsorWith(240, 1);
    const c = open(ws);
    await new Promise((r) => c.once("open", r));
    const closed = new Promise<number>((r) =>
      c.once("close", (code) => r(code)),
    );
    c.send(
      JSON.stringify({
        type: "subscribe",
        id: "1",
        payload: { query: "mutation { connect }" },
      }),
    );
    expect(await closed).toBe(4403);

    const other = open(ws, "https://elsewhere.example");
    expect(
      await new Promise((r) =>
        other.once("unexpected-response", (_q, res) => r(res.statusCode)),
      ),
    ).toBe(403);

    const first = open(ws);
    await new Promise((r) => first.once("open", r));
    const second = open(ws);
    expect(
      await new Promise((r) =>
        second.once("unexpected-response", (_q, res) => r(res.statusCode)),
      ),
    ).toBe(429);
    first.close();
    await expect.poll(() => relay.sockets()).toBe(0);
  });
});

// Round 2 (review): the relay checked the parsed body but forwarded the raw text. With a key
// twice, JSON.parse keeps the last one and an indexer might keep the first, so
// {"query":"mutation…","query":"{a}"} was judged as {a} and sent with the mutation first.
// Now a body or socket message with a key twice is refused, and what goes upstream is
// always the checked object serialised again.
describe("what is checked is what is forwarded", () => {
  const DUP = '{"query":"mutation{connect(viewingKey:\\"x\\")}","query":"{ a }"}';
  const rawPost = (url: string, body: string) =>
    fetch(`${url}/indexer`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: SITE, ...XFF },
      body,
    });

  it("finds a key given twice, at any depth, escaped or not; nothing else", () => {
    expect(duplicateJsonKey(DUP)).toBe("query");
    expect(duplicateJsonKey('{"query":"{a}","\\u0071uery":"{b}"}')).toBe("query");
    expect(duplicateJsonKey('{"query":"{a}","variables":{"x":1,"x":2}}')).toBe("x");
    expect(duplicateJsonKey('{"variables":{"l":[{"k":1},{"k":2,"k":3}]}}')).toBe("k");
    // The same key in two different objects, or a value equal to a key, is fine.
    expect(duplicateJsonKey('{"a":{"k":1},"b":{"k":2},"c":["a","a"],"d":"a"}')).toBeUndefined();
    expect(duplicateJsonKey('{"q":"x\\",\\"q\\":1","r":"{\\"q\\"}"}')).toBeUndefined();
    expect(duplicateJsonKey('{"query":"{ a }","variables":{},"operationName":null}')).toBeUndefined();
  });

  it("HTTP: the reviewer's duplicate-key body is refused and never reaches the indexer", async () => {
    const { up, url } = await sponsorWith();
    const res = await rawPost(url, DUP);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ errors: [{ message: "A key appears twice." }] });
    // Also when the second copy is the mutation, and with an escaped key name.
    expect((await rawPost(url, '{"query":"{ a }","query":"mutation { x }"}')).status).toBe(400);
    expect((await rawPost(url, '{"query":"mutation { x }","\\u0071uery":"{ a }"}')).status).toBe(400);
    expect(up.seen).toHaveLength(0);
  });

  it("HTTP: the indexer gets the checked object serialised again, never the raw text", async () => {
    const { up, url } = await sponsorWith();
    // Odd spacing, field order and escapes in the body; upstream gets one canonical form.
    const raw = '{ "operationName" : "Q" , "variables" : { "h" : 1 } , "\\u0071uery" : "query Q { block { height } }" }';
    expect((await rawPost(url, raw)).status).toBe(200);
    expect(up.seen.map((s) => s.body)).toEqual([
      '{"query":"query Q { block { height } }","variables":{"h":1},"operationName":"Q"}',
    ]);
  });

  it("HTTP, in process: the reviewer's repro forwards nothing", async () => {
    let forwarded: string | undefined;
    const relay = createIndexerRelay({
      indexer: "https://up.example/g?project_id=SECRET123",
      indexerWS: "wss://up.example/ws",
      allowedOrigins: [SITE],
      fetch: (async (_u: string, init: RequestInit) => {
        forwarded = String(init.body);
        return new Response('{"data":{}}');
      }) as unknown as typeof fetch,
    });
    const { Readable } = await import("node:stream");
    const req = Object.assign(Readable.from([Buffer.from(DUP)]), {
      url: "/indexer",
      method: "POST",
      headers: { origin: SITE, "content-type": "application/json" },
    });
    let status = 0;
    const res = {
      writeHead: (s: number) => void (status = s),
      end() {},
      setHeader() {},
    };
    await relay.http(req as never, res as never, "203.0.113.9", {});
    expect(status).toBe(400);
    expect(forwarded).toBeUndefined();
  });

  it("socket: a message with a key twice closes the socket; upstream gets the checked message", async () => {
    const { up, ws } = await sponsorWith(240, 20);
    const open = () =>
      new WebSocket(ws, "graphql-transport-ws", { headers: { origin: SITE, ...XFF } });
    const closeCode = async (frame: string) => {
      const c = open();
      await new Promise((r) => c.once("open", r));
      const closed = new Promise<number>((r) => c.once("close", (code) => r(code)));
      c.send(frame);
      return closed;
    };
    // The payload with "query" twice, the message with "payload" or "type" twice.
    const dupPayload =
      '{"type":"subscribe","id":"1","payload":{"query":"mutation { connect }","query":"subscription { a }"}}';
    const dupPayloadKey =
      '{"type":"subscribe","id":"1","payload":{"query":"mutation { connect }"},"payload":{"query":"subscription { a }"}}';
    const dupType = '{"type":"connection_init","type":"subscribe","id":"1","payload":{"query":"subscription { a }"}}';
    for (const f of [dupPayload, dupPayloadKey, dupType]) expect(await closeCode(f)).toBe(4400);
    await new Promise((r) => setTimeout(r, 100));
    expect(up.wsSeen.filter((m) => !m.startsWith("connect "))).toEqual([]);

    // A good subscribe, sent with odd spacing and an escaped key: forwarded in canonical form.
    const c = open();
    const got: unknown[] = [];
    c.on("message", (d) => got.push(JSON.parse(d.toString())));
    await new Promise((r) => c.once("open", r));
    c.send('{ "type" : "connection_init" , "payload" : { } }');
    c.send('{"payload":{"\\u0071uery":"subscription { blocks { height } }","variables":{"n":1}},"id":"7","type":"subscribe"}');
    await expect.poll(() => got.length).toBe(2);
    expect(up.wsSeen.filter((m) => !m.startsWith("connect "))).toEqual([
      '{"type":"connection_init","payload":{}}',
      '{"type":"subscribe","id":"7","payload":{"query":"subscription { blocks { height } }","variables":{"n":1}}}',
    ]);
    c.close();
  });
});
