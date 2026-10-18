// The indexer relay on its own (relay-main.ts): what veilcore.org's check page reads
// Midnight through on mainnet. Read-only, no wallet, the Blockfrost id kept on the server.
import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { clientIp } from "./server.js";
import {
  blockfrostIndexer,
  createIndexerRelay,
  loadReadRelayConfig,
  READ_RELAY_SETTINGS,
  readRelayHandler,
  settingsNotForReadRelay,
} from "./indexer-relay.js";

const SITE = "https://veilcore.org";
const XFF = { "x-forwarded-for": "203.0.113.9" };
const servers: Server[] = [];
afterEach(async () => {
  for (const s of servers.splice(0)) await new Promise((r) => s.close(() => r(undefined)));
});
const portOf = (s: Server) => (s.address() as AddressInfo).port;
const listen = async (s: Server) => {
  s.listen(0, "127.0.0.1");
  await new Promise((r) => s.once("listening", r));
  servers.push(s);
  return `http://127.0.0.1:${portOf(s)}`;
};

describe("read-only relay settings", () => {
  it("mainnet: Blockfrost’s mainnet indexer with the id, veilcore.org allowed, Railway’s one proxy", () => {
    const r = loadReadRelayConfig({ RELAY_NETWORK: "mainnet", BLOCKFROST_PROJECT_ID: "mainnetAbc123xyz" });
    expect(r).toEqual({
      ok: true,
      config: {
        network: "mainnet",
        port: 8080,
        indexer: "https://midnight-mainnet.blockfrost.io/api/v0?project_id=mainnetAbc123xyz",
        indexerWS: "wss://midnight-mainnet.blockfrost.io/api/v0/ws?project_id=mainnetAbc123xyz",
        allowedOrigins: ["https://veilcore.org", "https://www.veilcore.org"],
        trustProxyHops: 1,
        secrets: ["mainnetAbc123xyz"],
      },
    });
    expect(blockfrostIndexer("preprod", "p r").indexer).toBe("https://midnight-preprod.blockfrost.io/api/v0?project_id=p%20r");
  });

  it("refuses to start without a network or an id, with the other network’s id, or with a wallet in reach", () => {
    const problems = (env: Record<string, string>) => {
      const r = loadReadRelayConfig(env);
      return r.ok ? [] : r.problems;
    };
    expect(problems({})).toEqual([expect.stringMatching(/RELAY_NETWORK must be/)]);
    expect(problems({ RELAY_NETWORK: "mainnet" })).toEqual([expect.stringMatching(/BLOCKFROST_PROJECT_ID is required/)]);
    expect(problems({ RELAY_NETWORK: "mainnet", BLOCKFROST_PROJECT_ID: "preprodAbc123xyz" })).toEqual([
      expect.stringMatching(/looks like a preprod project/),
    ]);
    expect(
      problems({ RELAY_NETWORK: "mainnet", BLOCKFROST_PROJECT_ID: "mainnetAbc123xyz", SPONSOR_SEED: "x", REGISTRY_OPERATOR_TOKEN: "y" }),
    ).toEqual([expect.stringMatching(/^Remove SPONSOR_SEED, REGISTRY_OPERATOR_TOKEN: this is the read-only relay/)]);
    expect(
      problems({ RELAY_NETWORK: "mainnet", BLOCKFROST_PROJECT_ID: "mainnetAbc123xyz", ALLOWED_ORIGINS: "http://veilcore.org" }),
    ).toEqual([expect.stringMatching(/not an https origin/)]);
    // Preview has a keyless indexer of Midnight's own.
    expect(loadReadRelayConfig({ RELAY_NETWORK: "preview" })).toMatchObject({
      ok: true,
      config: { indexer: "https://indexer.preview.midnight.network/api/v4/graphql", secrets: [] },
    });
  });
});

// Round 2 (review): the relay refused only a few named secrets, so it started with a sponsor's
// POW_SECRET (and any other sponsor setting) in reach. Now it reads a fixed list of
// settings; anything else that is a sponsor setting or looks like a secret stops it, named
// but never printed.
describe("read-only relay: only its own settings", () => {
  const MAIN = { RELAY_NETWORK: "mainnet", BLOCKFROST_PROJECT_ID: "mainnetAbc123xyz" };
  const problems = (env: Record<string, string>) => {
    const r = loadReadRelayConfig(env);
    return r.ok ? [] : r.problems;
  };

  it("lists exactly the settings loadReadRelayConfig reads", () => {
    expect([...READ_RELAY_SETTINGS].sort()).toEqual(
      ["ALLOWED_ORIGINS", "BLOCKFROST_PROJECT_ID", "INDEXER_URL", "INDEXER_WS_URL", "PORT", "RELAY_NETWORK", "TRUST_PROXY_HOPS"],
    );
    // All of them set, nothing else: it starts.
    expect(
      loadReadRelayConfig({
        ...MAIN,
        ALLOWED_ORIGINS: "https://veilcore.org",
        PORT: "8081",
        TRUST_PROXY_HOPS: "1",
      }).ok,
    ).toBe(true);
  });

  it("refuses to start with the reviewer's POW_SECRET, naming it and never printing its value", () => {
    const env = { ...MAIN, POW_SECRET: "sponsor-secret-value", VEILCORE_CONTRACT_ADDRESS: "aa" };
    const r = loadReadRelayConfig(env);
    expect(r.ok).toBe(false);
    const text = r.ok ? "" : r.problems.join("\n");
    expect(text).toMatch(/^Remove POW_SECRET, VEILCORE_CONTRACT_ADDRESS: this is the read-only relay/);
    expect(text).not.toContain("sponsor-secret-value");
    expect(text).not.toContain("mainnetAbc123xyz");
  });

  it("refuses every sponsor setting and anything that looks like a secret", () => {
    for (const k of [
      "POW_SECRET",
      "POW_DIFFICULTY",
      "SPONSOR_STATUS_TOKEN",
      "SPONSOR_NETWORK",
      "REGISTRY_URL",
      "PROOF_SERVER_URL",
      "NODE_WS_URL",
      "STATE_DIR",
      "DAILY_BUDGET_DUST",
      "ANCHORER_ENABLED",
      "WALLET_MNEMONIC",
      "MY_PRIVATE_KEY",
      "GITHUB_TOKEN",
      "DB_PASSWORD",
      "SOME_API_KEY",
      "STRIPE_KEY",
      "AWS_SECRET_ACCESS_KEY",
      "VEILCORE_MAINTENANCE_SEED_SHARE",
    ])
      expect(problems({ ...MAIN, [k]: "value-" + k }), k).toEqual([
        expect.stringMatching(new RegExp(`^Remove ${k}: `)),
      ]);
    // Empty values don't count (an unset variable on some platforms).
    expect(problems({ ...MAIN, POW_SECRET: "  " })).toEqual([]);
  });

  it("leaves a platform's own settings alone", () => {
    const platform = {
      PATH: "/usr/bin",
      HOME: "/root",
      HOSTNAME: "abc",
      NODE_ENV: "production",
      NODE_VERSION: "22.11.0",
      YARN_VERSION: "1.22.22",
      RAILWAY_PUBLIC_DOMAIN: "x.up.railway.app",
      RAILWAY_PROJECT_ID: "p",
      RAILWAY_SERVICE_NAME: "relay",
      RAILWAY_GIT_COMMIT_SHA: "e226a73",
      // Railway sets this on every service; it matched "PRIVATE" and stopped the first live start (18 Oct).
      RAILWAY_PRIVATE_DOMAIN: "veilcore-indexer-relay.railway.internal",
      npm_config_cache: "/tmp",
    };
    expect(settingsNotForReadRelay(platform)).toEqual([]);
    expect(loadReadRelayConfig({ ...MAIN, ...platform }).ok).toBe(true);
    // A RAILWAY_ name that holds a secret is still refused.
    expect(settingsNotForReadRelay({ RAILWAY_TOKEN: "t", RAILWAY_API_KEY: "k" })).toEqual(["RAILWAY_TOKEN", "RAILWAY_API_KEY"]);
  });
});

describe("read-only relay routes", () => {
  const start = async () => {
    const seen: { url: string; body: string }[] = [];
    const upstream = createServer((req, res) => {
      let body = "";
      req.on("data", (c: Buffer) => (body += c.toString()));
      req.on("end", () => {
        seen.push({ url: req.url ?? "", body });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: { byHash: [], byId: [] } }));
      });
    });
    const up = await listen(upstream);
    const relay = createIndexerRelay({
      indexer: `${up}/api/v0?project_id=SECRETKEY`,
      indexerWS: `${up.replace("http", "ws")}/api/v0/ws?project_id=SECRETKEY`,
      allowedOrigins: [SITE],
    });
    const cfg = { network: "mainnet" as const, allowedOrigins: [SITE] };
    const ip = (req: Parameters<typeof clientIp>[0]) => clientIp(req, 1);
    const server = createServer((req, res) => void readRelayHandler(relay, cfg, ip)(req, res));
    relay.attach(server, ip);
    return { seen, url: await listen(server) };
  };

  it("answers the check page’s query from veilcore.org, with the key added on the server only", async () => {
    const { seen, url } = await start();
    const pre = await fetch(`${url}/indexer`, {
      method: "OPTIONS",
      headers: { origin: SITE, "access-control-request-method": "POST" },
    });
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-allow-origin")).toBe(SITE);
    const query = "query Q($byHash: TransactionOffset!) { byHash: transactions(offset: $byHash) { hash } }";
    const res = await fetch(`${url}/indexer`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: SITE, ...XFF },
      body: JSON.stringify({ query, variables: { byHash: { hash: "ab".repeat(32) } } }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe(SITE);
    const text = await res.text();
    expect(text).not.toContain("SECRETKEY");
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe("/api/v0?project_id=SECRETKEY");
  });

  it("reads only, from the site only; says which network on /health; nothing else is served", async () => {
    const { seen, url } = await start();
    const h = await fetch(`${url}/health`);
    expect(await h.json()).toEqual({ ok: true, readsOnly: true, network: "mainnet" });
    const other = await fetch(`${url}/indexer`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://evil.example", ...XFF },
      body: JSON.stringify({ query: "{ block { height } }" }),
    });
    expect(other.status).toBe(403);
    const mutation = await fetch(`${url}/indexer`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: SITE, ...XFF },
      body: JSON.stringify({ query: "mutation { connect(viewingKey: \"x\") }" }),
    });
    expect(mutation.status).toBe(403);
    for (const path of ["/sponsor", "/sponsor/challenge", "/sponsor/status", "/"]) {
      expect((await fetch(`${url}${path}`, { headers: { origin: SITE, ...XFF } })).status).toBe(404);
    }
    expect(seen).toHaveLength(0);
  });
});
