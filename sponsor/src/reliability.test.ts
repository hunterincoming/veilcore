// Reliability audit (19 Nov 2026), Tier 1 items 3a and 3c: the relay's GET /alerts checks
// that Blockfrost answers with a recent block, and the sponsor's fuel-low says how many days
// of DUST are left at the rate it has been falling.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { clientIp } from "./server.js";
import { createIndexerRelay, readRelayHandler } from "./indexer-relay.js";
import { blockTimeMs, createUpstreamCheck, LATEST_BLOCK_QUERY } from "./upstream-check.js";
import { FuelGauge } from "./fuel.js";
import { alertReport, alertsOf, SYNC_GRACE_MS, type AlertInput } from "./alerts.js";
import { loadConfig } from "./config.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const DUST = 1_000_000_000_000_000n;

describe("FuelGauge", () => {
  it("no runway until six hours of readings; none while DUST is not falling", () => {
    let t = 0;
    const g = new FuelGauge(() => t);
    expect(g.runwayDays()).toBeUndefined();
    g.note(100n * DUST);
    t = 5 * HOUR;
    g.note(99n * DUST);
    expect(g.runwayDays()).toBeUndefined(); // five hours: not judged
    t = 6 * HOUR;
    g.note(100n * DUST);
    expect(g.runwayDays()).toBeUndefined(); // made as fast as spent
    t = 7 * HOUR;
    g.note(undefined); // not synced: not a reading
    expect(g.runwayDays()).toBeUndefined();
  });

  it("the balance over the rate it fell: 100 DUST falling 10 a day is about 9 days left after a day", () => {
    let t = 0;
    const g = new FuelGauge(() => t);
    for (let h = 0; h <= 24; h++) {
      t = h * HOUR;
      g.note(100n * DUST - (10n * DUST * BigInt(h)) / 24n);
    }
    expect(g.runwayDays()).toBe(9);
  });

  it("keeps a week: an old fall drops out, so a wallet that recovered is not judged on it", () => {
    let t = 0;
    const g = new FuelGauge(() => t);
    g.note(200n * DUST);
    t = DAY;
    g.note(100n * DUST);
    expect(g.runwayDays()).toBe(1);
    for (let d = 2; d <= 10; d++) {
      t = d * DAY;
      g.note(100n * DUST);
    }
    expect(g.runwayDays()).toBeUndefined();
  });

  it("readings closer than ten minutes replace the last one, so the list stays small", () => {
    let t = 0;
    const g = new FuelGauge(() => t);
    for (let i = 0; i < 10_000; i++) {
      t = i * 1000;
      g.note(100n * DUST);
    }
    expect((g as unknown as { readings: unknown[] }).readings.length).toBeLessThan(20);
  });
});

describe("fuel-low with the runway", () => {
  const ok: AlertInput = {
    anchoringFailing: false,
    syncStalled: false,
    synced: true,
    startedAt: 0,
    now: 60_000,
    syncGraceMs: SYNC_GRACE_MS,
    dustSpecks: 500n * DUST,
    dustLowSpecks: 50n * DUST,
    fuelLowRunwayDays: 7,
  };

  it("fuel-low under seven days left even with plenty now; not when the runway is unknown or the check is off", () => {
    expect(alertsOf({ ...ok, fuelRunwayDays: 6.9 })).toEqual(["fuel-low"]);
    expect(alertsOf({ ...ok, fuelRunwayDays: 7 })).toEqual([]);
    expect(alertsOf({ ...ok, fuelRunwayDays: undefined })).toEqual([]);
    expect(alertsOf({ ...ok, fuelRunwayDays: 1, fuelLowRunwayDays: 0 })).toEqual([]);
    expect(alertsOf({ ...ok, fuelRunwayDays: 1, synced: false })).toEqual([]);
  });

  it("the answer carries fuelRunwayDays (whole days, rounded down) only beside fuel-low", () => {
    expect(alertReport({ ...ok, fuelRunwayDays: 30.5 })).toEqual({ problems: [] });
    expect(alertReport({ ...ok, fuelRunwayDays: 3.9 })).toEqual({ problems: ["fuel-low"], fuelRunwayDays: 3 });
    expect(alertReport({ ...ok, dustSpecks: 10n * DUST })).toEqual({ problems: ["fuel-low"] });
    expect(alertReport({ ...ok, dustSpecks: 10n * DUST, fuelRunwayDays: 40 })).toEqual({ problems: ["fuel-low"], fuelRunwayDays: 40 });
  });

  it("ALERT_FUEL_RUNWAY_DAYS: 7 by default, 0 to 365", () => {
    const base = {
      SPONSOR_SEED: "11".repeat(32),
      SPONSOR_FORBIDDEN_ADDRESSES: "mn_addr_preprod1deployer",
      VEILCORE_CONTRACT_ADDRESS: "9c7b69275e53acc38fcbebff93c53febe46a3898580c11fd2c4b923fc5efb7a3",
      PROOF_SERVER_URL: "http://proof-server.railway.internal:6300",
      BLOCKFROST_PROJECT_ID: "preprodTestProjectId123",
    };
    const read = (v?: string) => {
      try {
        return loadConfig({ ...base, ...(v === undefined ? {} : { ALERT_FUEL_RUNWAY_DAYS: v }) }).alertFuelRunwayDays;
      } catch (e) {
        return [...((e as { problems?: string[] }).problems ?? [(e as Error).message])].join(" ");
      }
    };
    expect(read()).toBe(7);
    expect(read("0")).toBe(0);
    expect(read("14")).toBe(14);
    expect(String(read("-1"))).toMatch(/ALERT_FUEL_RUNWAY_DAYS must be a whole number from 0 to 365/);
  });
});

describe("relay GET /alerts: the upstream indexer answers with a recent block", () => {
  const servers: Server[] = [];
  afterEach(async () => {
    for (const s of servers.splice(0)) await new Promise((r) => s.close(() => r(undefined)));
  });
  const listen = async (s: Server) => {
    s.listen(0, "127.0.0.1");
    await new Promise((r) => s.once("listening", r));
    servers.push(s);
    return `http://127.0.0.1:${(s.address() as AddressInfo).port}`;
  };

  it("reads the time in milliseconds or seconds", () => {
    expect(blockTimeMs(1_790_000_000)).toBe(1_790_000_000_000);
    expect(blockTimeMs(1_790_000_000_000)).toBe(1_790_000_000_000);
    expect(blockTimeMs("1")).toBeUndefined();
    expect(blockTimeMs(0)).toBeUndefined();
  });

  it("fresh, stale, an error, garbage, unreachable: each its code, cached for a minute, one lookup at a time", async () => {
    let t = 1_800_000_000_000;
    let answer: () => Response | Promise<Response> = () =>
      new Response(JSON.stringify({ data: { block: { height: 3_531_920, timestamp: t - 30_000 } } }));
    const asked: { url: string; body: string }[] = [];
    const check = createUpstreamCheck({
      indexer: "https://midnight-mainnet.blockfrost.io/api/v0?project_id=SECRET",
      now: () => t,
      fetch: (async (url: string, init: RequestInit) => {
        asked.push({ url, body: String(init.body) });
        return answer();
      }) as typeof fetch,
    });
    expect(await check()).toEqual([]);
    expect(JSON.parse(asked[0].body)).toEqual({ query: LATEST_BLOCK_QUERY });
    // Cached: a monitor asking often costs one upstream call a minute.
    await Promise.all([check(), check(), check()]);
    expect(asked).toHaveLength(1);

    const ask = async (a: typeof answer) => {
      answer = a;
      t += 61_000;
      return check();
    };
    expect(await ask(() => new Response(JSON.stringify({ data: { block: { height: 1, timestamp: t - 11 * 60_000 } } })))).toEqual(["upstream-stale"]);
    expect(await ask(() => new Response(JSON.stringify({ data: { block: { height: 1, timestamp: Math.floor((t - 60_000) / 1000) } } })))).toEqual([]);
    expect(await ask(() => new Response("quota exceeded", { status: 402 }))).toEqual(["upstream-unreachable"]);
    expect(await ask(() => new Response("<html>"))).toEqual(["upstream-unreachable"]);
    expect(await ask(() => new Response(JSON.stringify({ data: { block: null } })))).toEqual(["upstream-unreachable"]);
    expect(await ask(() => { throw new TypeError("fetch failed"); })).toEqual(["upstream-unreachable"]);

    // Several at once while a lookup is under way: one upstream call.
    const before = asked.length;
    let release!: () => void;
    t += 61_000;
    answer = () => new Promise((r) => (release = () => r(new Response(JSON.stringify({ data: { block: { height: 2, timestamp: t } } })))));
    const many = [check(), check(), check()];
    await new Promise((r) => setTimeout(r, 10));
    release();
    expect(await Promise.all(many)).toEqual([[], [], []]);
    expect(asked.length - before).toBe(1);
  });

  it("served by the relay: 200 or 503 with codes only, never the key, the host or the upstream's words", async () => {
    let block: unknown = { height: 3_531_920, timestamp: Date.now() };
    let status = 200;
    const upstream = createServer((req, res) => {
      req.resume();
      req.on("end", () => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(status === 200 ? JSON.stringify({ data: { block } }) : "Project SECRETKEY over limit at upstream.example");
      });
    });
    const up = await listen(upstream);
    const indexer = `${up}/api/v0?project_id=SECRETKEY`;
    const relay = createIndexerRelay({ indexer, indexerWS: indexer.replace("http", "ws"), allowedOrigins: ["https://veilcore.org"] });
    const ip = (req: Parameters<typeof clientIp>[0]) => clientIp(req, 1);
    const check = createUpstreamCheck({ indexer, cacheMs: 0 });
    const server = createServer((req, res) => void readRelayHandler(relay, { network: "mainnet", allowedOrigins: ["https://veilcore.org"] }, ip, undefined, check)(req, res));
    const url = await listen(server);

    const fine = await fetch(`${url}/alerts`);
    expect(fine.status).toBe(200);
    expect(await fine.json()).toEqual({ ok: true, problems: [] });

    block = { height: 3_531_920, timestamp: Date.now() - 20 * 60_000 };
    const stale = await fetch(`${url}/alerts`);
    expect(stale.status).toBe(503);
    expect(await stale.json()).toEqual({ ok: false, problems: ["upstream-stale"] });

    status = 429;
    const down = await fetch(`${url}/alerts`);
    expect(down.status).toBe(503);
    const text = await down.text();
    expect(JSON.parse(text)).toEqual({ ok: false, problems: ["upstream-unreachable"] });
    expect(text).not.toMatch(/SECRETKEY|127\.0\.0\.1|upstream\.example|limit/);

    // /health stays what it was: the relay itself answers.
    expect(await (await fetch(`${url}/health`)).json()).toEqual({ ok: true, readsOnly: true, network: "mainnet" });
  });

  it("a relay built without the check has no /alerts (404), as before", async () => {
    const relay = createIndexerRelay({ indexer: "https://x.invalid/", indexerWS: "wss://x.invalid/", allowedOrigins: [] });
    const server = createServer((req, res) => void readRelayHandler(relay, { network: "mainnet", allowedOrigins: [] }, () => "1.2.3.4")(req, res));
    const url = await listen(server);
    expect((await fetch(`${url}/alerts`)).status).toBe(404);
  });
});
