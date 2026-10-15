// Starts the indexer relay on its own, read-only: what veilcore.org's check page reads
// Midnight through (indexer-relay.ts, docs/check-on-chain.md). No wallet, no fees, no
// anchoring. Start with `node dist/relay-main.js`.
// SPDX-License-Identifier: Apache-2.0

import { createServer } from "node:http";
import { clientIp } from "./server.js";
import { createIndexerRelay, loadReadRelayConfig, readRelayHandler } from "./indexer-relay.js";
import { log, scrubOutput } from "./log.js";

const loaded = loadReadRelayConfig(process.env);
if (!loaded.ok) {
  for (const p of loaded.problems) console.error(`The relay did not start: ${p}`);
  process.exit(1);
}
const cfg = loaded.config;
scrubOutput(cfg.secrets);

const relay = createIndexerRelay({
  indexer: cfg.indexer,
  indexerWS: cfg.indexerWS,
  allowedOrigins: cfg.allowedOrigins,
});
const ip = (req: Parameters<typeof clientIp>[0]) => clientIp(req, cfg.trustProxyHops);
const server = createServer((req, res) => void readRelayHandler(relay, cfg, ip)(req, res));
relay.attach(server, ip);
server.requestTimeout = 60_000;
server.listen(cfg.port, () =>
  log("info", "read-only indexer relay listening", {
    port: cfg.port,
    network: cfg.network,
    origins: cfg.allowedOrigins,
  }),
);

const stop = () => {
  log("info", "stopping");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5_000).unref();
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
