// `veilcore-mcp`: the server on stdin and stdout, one JSON-RPC message per line. Anything for a
// person goes to stderr; stdout carries only protocol messages.
//
//   VEILCORE_REGISTRY  the registry check_record asks (default: VeilCore's public registry)
//   VEILCORE_ORIGIN    the site draft_link points at (default: https://veilcore.org)
//   VEILCORE_MCP_ROOT  the only folder check_document reads files from (default: the folder the
//                      server was started in)
//   VEILCORE_INDEXER, VEILCORE_SECOND_INDEXER, VEILCORE_BLOCKFROST_PROJECT_ID
//                      how check_record looks the date stamp up on Midnight (record-check's
//                      chain options; default: the network's public indexer)
// SPDX-License-Identifier: Apache-2.0

import { createInterface } from 'node:readline';
import { handleLine } from './server.js';

const ctx = {
  ...(process.env.VEILCORE_REGISTRY ? { registry: process.env.VEILCORE_REGISTRY } : {}),
  ...(process.env.VEILCORE_ORIGIN ? { origin: process.env.VEILCORE_ORIGIN } : {}),
  ...(process.env.VEILCORE_MCP_ROOT ? { root: process.env.VEILCORE_MCP_ROOT } : {}),
  chain: {
    ...(process.env.VEILCORE_INDEXER ? { indexer: process.env.VEILCORE_INDEXER } : {}),
    ...(process.env.VEILCORE_SECOND_INDEXER ? { secondIndexer: process.env.VEILCORE_SECOND_INDEXER } : {}),
    ...(process.env.VEILCORE_BLOCKFROST_PROJECT_ID
      ? { blockfrostProjectId: process.env.VEILCORE_BLOCKFROST_PROJECT_ID }
      : {}),
  },
};

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
// Answers go out in the order requests came in.
let queue: Promise<void> = Promise.resolve();
lines.on('line', (line) => {
  queue = queue.then(async () => {
    const out = await handleLine(line, ctx);
    if (out) process.stdout.write(`${out}\n`);
  });
});
lines.on('close', () => {
  void queue.then(() => process.exit(0));
});
process.stderr.write('veilcore-mcp: ready on stdio\n');
