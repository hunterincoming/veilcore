// The Cardano lookup on the read-only relay (cardano-relay.ts): GET /cardano/tx/<hash> from
// Blockfrost's Cardano API, the project id kept here, the answer rebuilt in one fixed shape.
import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createCardanoRelay, messageLines, outputsOf } from "./cardano-relay.js";
import { createIndexerRelay, loadReadRelayConfig, readRelayHandler } from "./indexer-relay.js";

const H = "c1".repeat(32);
const UNIT = "1f3aec8bfe7ea4fe14c5f121e2a92e301afe414147860d557cac7e34" + "5553444378";
const ADDR = "addr1qyzf75t34nj2gy8ujleuthj96x003mnzhl04vev0289wnmlk5v628yzh2f7vvzv3vqy4rjm6ntte397rr3j6r7ng3jjswyst58";

/** Blockfrost as a stand-in: what each path answers, and every request it was asked. */
const blockfrost = (over: Record<string, [number, unknown]> = {}) => {
  const asked: { url: string; key?: string }[] = [];
  const answers: Record<string, [number, unknown]> = {
    [`/txs/${H}`]: [200, { hash: H, block_height: 100, block_time: 1790000000, valid_contract: true, fees: "170000", secret: "x" }],
    [`/txs/${H}/utxos`]: [
      200,
      {
        hash: H,
        inputs: [{ address: "addr1payer", amount: [] }],
        outputs: [
          { address: ADDR, amount: [{ unit: "lovelace", quantity: "1180000" }, { unit: UNIT, quantity: "900000000" }], output_index: 0 },
          { address: "addr1collateral", amount: [{ unit: "lovelace", quantity: "5000000" }], collateral: true },
        ],
      },
    ],
    [`/txs/${H}/metadata`]: [200, [{ label: "674", json_metadata: { msg: ["vc1:" + "a".repeat(32)] } }, { label: "721", json_metadata: { x: 1 } }]],
    "/blocks/latest": [200, { height: 111 }],
    ...over,
  };
  const f: typeof fetch = async (url, init) => {
    const path = String(url).replace("https://cardano-mainnet.blockfrost.io/api/v0", "");
    asked.push({ url: String(url), key: (init?.headers as Record<string, string>)?.project_id });
    const [status, body] = answers[path] ?? [404, { status_code: 404, error: "Not Found", message: "internal detail" }];
    return new Response(JSON.stringify(body), { status });
  };
  return { f, asked };
};

describe("the Cardano lookup", () => {
  it("answers in the fixed shape: outputs, the 674 message, how deep; nothing else of Blockfrost’s", async () => {
    const b = blockfrost();
    const r = await createCardanoRelay({ network: "mainnet", projectId: "mainnetCardano123", fetch: b.f }).tx(H, "1.2.3.4");
    expect(r).toEqual({
      status: 200,
      body: {
        hash: H,
        valid: true,
        confirmations: 12,
        blockTime: 1790000000,
        outputs: [{ address: ADDR, amounts: [{ unit: "lovelace", quantity: "1180000" }, { unit: UNIT, quantity: "900000000" }] }],
        msg: ["vc1:" + "a".repeat(32)],
      },
    });
    expect(b.asked.every((a) => a.key === "mainnetCardano123" && a.url.startsWith("https://cardano-mainnet.blockfrost.io/api/v0/"))).toBe(true);
  });
  it("404 for no such transaction; Blockfrost’s own error never reaches the browser", async () => {
    const b = blockfrost({ [`/txs/${H}`]: [404, { message: "internal detail" }] });
    const r = await createCardanoRelay({ network: "mainnet", projectId: "mainnetCardano123", fetch: b.f }).tx(H);
    expect(r).toEqual({ status: 404, body: { ok: false, reason: "Cardano has no such transaction." } });
    const down = blockfrost({ "/blocks/latest": [500, { message: "internal detail" }] });
    const d = await createCardanoRelay({ network: "mainnet", projectId: "mainnetCardano123", fetch: down.f }).tx(H);
    expect(d).toEqual({ status: 502, body: { ok: false, reason: "Cardano could not be read." } });
    expect(JSON.stringify(d)).not.toMatch(/internal|mainnetCardano/);
  });
  it("a failed script is not valid; not in a block yet is 0 deep", async () => {
    const b = blockfrost({ [`/txs/${H}`]: [200, { hash: H, block_height: null, valid_contract: false }] });
    const r = await createCardanoRelay({ network: "mainnet", projectId: "mainnetCardano123", fetch: b.f }).tx(H);
    expect(r.body).toMatchObject({ valid: false, confirmations: 0 });
  });
  it("refuses what isn’t a hash, and more than 30 lookups a minute from one client", async () => {
    const b = blockfrost();
    const relay = createCardanoRelay({ network: "mainnet", projectId: "mainnetCardano123", fetch: b.f, now: () => 0 });
    expect((await relay.tx("HR-7Q4K")).status).toBe(400);
    for (let i = 0; i < 30; i++) expect((await relay.tx(H, "9.9.9.9")).status).toBe(200);
    expect((await relay.tx(H, "9.9.9.9")).status).toBe(429);
    expect((await relay.tx(H, "8.8.8.8")).status).toBe(200);
  });
  it("reads only text lines of label 674, and only plain outputs", () => {
    expect(messageLines([{ label: 674, json_metadata: { msg: "one line" } }, { label: "674", json_metadata: { msg: [1, "two"] } }])).toEqual([
      "one line",
      "two",
    ]);
    expect(outputsOf({ outputs: [{ address: ADDR, amount: [{ unit: "<script>", quantity: "1" }] }] })).toBeUndefined();
    expect(outputsOf({ outputs: [{ address: ADDR, amount: [{ unit: "lovelace", quantity: "-1" }] }] })).toBeUndefined();
  });
});

describe("on the read-only relay", () => {
  const servers: Server[] = [];
  afterEach(async () => {
    for (const s of servers.splice(0)) await new Promise((r) => s.close(() => r(undefined)));
  });
  it("is off without its own project id, and refuses a Midnight id or the other network’s", () => {
    const base = { RELAY_NETWORK: "mainnet", BLOCKFROST_PROJECT_ID: "mainnetAbc123xyz" };
    const off = loadReadRelayConfig(base);
    expect(off.ok && off.config.cardano).toBeUndefined();
    const on = loadReadRelayConfig({ ...base, CARDANO_BLOCKFROST_PROJECT_ID: "mainnetCardano123" });
    expect(on.ok && on.config.cardano).toEqual({ network: "mainnet", projectId: "mainnetCardano123" });
    expect(on.ok && on.config.secrets).toEqual(["mainnetAbc123xyz", "mainnetCardano123"]);
    const problems = (extra: Record<string, string>, net = base) => {
      const r = loadReadRelayConfig({ ...net, ...extra });
      return r.ok ? [] : r.problems;
    };
    expect(problems({ CARDANO_BLOCKFROST_PROJECT_ID: "mainnetAbc123xyz" })).toEqual([expect.stringMatching(/needs its own/)]);
    expect(problems({ CARDANO_BLOCKFROST_PROJECT_ID: "preprodCardano123" })).toEqual([expect.stringMatching(/Cardano mainnet project/)]);
    const preprod = { RELAY_NETWORK: "preprod", BLOCKFROST_PROJECT_ID: "preprodAbc123xyz" };
    const p = loadReadRelayConfig({ ...preprod, CARDANO_BLOCKFROST_PROJECT_ID: "preprodCardano123" });
    expect(p.ok && p.config.cardano?.network).toBe("preprod");
  });
  it("GET /cardano/tx/<hash> is answered with the site’s CORS; nothing without the lookup", async () => {
    const b = blockfrost();
    const relay = createIndexerRelay({ indexer: "https://idx.invalid/graphql", indexerWS: "wss://idx.invalid/ws", allowedOrigins: ["https://veilcore.org"] });
    const cfg = { network: "mainnet" as const, allowedOrigins: ["https://veilcore.org"] };
    const listen = async (withCardano: boolean) => {
      const cardano = withCardano ? createCardanoRelay({ network: "mainnet", projectId: "mainnetCardano123", fetch: b.f }) : undefined;
      const s = createServer((req, res) => void readRelayHandler(relay, cfg, () => "1.2.3.4", cardano)(req, res));
      s.listen(0, "127.0.0.1");
      await new Promise((r) => s.once("listening", r));
      servers.push(s);
      return `http://127.0.0.1:${(s.address() as AddressInfo).port}`;
    };
    const on = await listen(true);
    const res = await fetch(`${on}/cardano/tx/${H}`, { headers: { origin: "https://veilcore.org" } });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://veilcore.org");
    expect(((await res.json()) as { confirmations: number }).confirmations).toBe(12);
    const off = await listen(false);
    expect((await fetch(`${off}/cardano/tx/${H}`)).status).toBe(404);
  });
});
