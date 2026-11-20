// The checkpoint updater (btc-checkpoints.mjs), offline: stand-in explorers serve real mainnet
// blocks 0 to 438 (bboard-ui/src/veilcore/bitcoin/fixtures/SOURCES.md), or lie.
//
//   node --test scripts/btc-checkpoints.test.mjs
// SPDX-License-Identifier: Apache-2.0

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { check, FILE, politeFetch, update } from './btc-checkpoints.mjs';

const genesisEra = JSON.parse(
  readFileSync(new URL('../bboard-ui/src/veilcore/bitcoin/fixtures/mainnet-0-438.json', import.meta.url), 'utf8'),
);
const G = genesisEra.headers;
const hashOf = (hex) =>
  createHash('sha256').update(createHash('sha256').update(Buffer.from(hex, 'hex')).digest()).digest().reverse().toString('hex');
const esplora = (height, hex) => {
  const b = Buffer.from(hex, 'hex');
  return {
    id: hashOf(hex),
    height,
    version: b.readInt32LE(0),
    previousblockhash: Buffer.from(b.subarray(4, 36)).reverse().toString('hex'),
    merkle_root: Buffer.from(b.subarray(36, 68)).reverse().toString('hex'),
    timestamp: b.readUInt32LE(68),
    bits: b.readUInt32LE(72),
    nonce: b.readUInt32LE(76),
  };
};
/** Stand-ins: host → headers by height (an array). */
const standIn = (per) => async (input) => {
  const url = new URL(String(input));
  const chain = per[url.host];
  if (!chain) throw new TypeError('Failed to fetch');
  if (url.pathname.endsWith('/blocks/tip/height')) return new Response(String(chain.length - 1));
  const m = /\/api\/(blocks|block-height)\/(\d+)$/.exec(url.pathname);
  const h = Number(m[2]);
  if (m[1] === 'block-height') return chain[h] ? new Response(hashOf(chain[h])) : new Response('', { status: 404 });
  const page = [];
  for (let i = h; i > h - 10 && i >= 0; i--) if (chain[i]) page.push(esplora(i, chain[i]));
  return Response.json(page);
};
const both = (c) => standIn({ 'mempool.space': c, 'blockstream.info': c });
const seedFile = () => ({
  about: 'test',
  network: 'bitcoin-mainnet',
  spacing: 144,
  start: 0,
  minConfirmations: 100,
  updated: '2026-01-01',
  checkpoints: [{ height: 150, hash: hashOf(G[150]) }],
});

test('adds the pins below the seed (hash chain down) and above it (up, with the difficulty rule)', async () => {
  const lines = [];
  const out = await update(seedFile(), { fetchImpl: both(G), today: '2026-11-20', log: (s) => lines.push(s) });
  assert.deepEqual(
    out.checkpoints.map((c) => c.height),
    [0, 144, 150, 288],
  );
  for (const c of out.checkpoints) assert.equal(c.hash, hashOf(G[c.height]));
  assert.equal(out.checkpoints[0].hash, '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f');
  assert.equal(out.updated, '2026-11-20');
  assert.match(lines.join('\n'), /pinning up to 338/);
  // Run again: nothing new.
  const again = await update(out, { fetchImpl: both(G), today: '2027-01-01' });
  assert.deepEqual(again, out);
});

test('refuses when the second explorer gives a different block at a new pin', async () => {
  const other = [...G];
  other[288] = G[287];
  await assert.rejects(
    update(seedFile(), { fetchImpl: standIn({ 'mempool.space': G, 'blockstream.info': other }) }),
    /different blocks at 288/,
  );
});

test('refuses a chain that doesn’t link to the seed', async () => {
  const forked = [...G];
  const b = Buffer.from(G[200], 'hex');
  b.writeUInt32LE(9, 76); // a block 200 that no real block 201 points to
  forked[200] = b.toString('hex');
  await assert.rejects(update(seedFile(), { fetchImpl: both(forked) }), /above 150: block 201’s previous-block hash/);
});

test('refuses a seed that isn’t in the explorers’ chain', async () => {
  const f = seedFile();
  f.checkpoints = [{ height: 150, hash: hashOf(G[151]) }];
  await assert.rejects(update(f, { fetchImpl: both(G) }), /pinned checkpoint/);
});

test('--check lists every pin an explorer disagrees with', async () => {
  const f = { ...seedFile(), checkpoints: [{ height: 0, hash: hashOf(G[0]) }, { height: 144, hash: hashOf(G[143]) }] };
  const problems = await check(f, { fetchImpl: both(G) });
  assert.equal(problems.length, 2);
  assert.match(problems[0], /at 144/);
});

test('the committed file follows its own rule', () => {
  const f = JSON.parse(readFileSync(FILE, 'utf8'));
  assert.equal(f.network, 'bitcoin-mainnet');
  assert.equal(f.start % 2016, 0);
  assert.ok(f.minConfirmations >= 100);
  for (let i = 1; i < f.checkpoints.length; i++) assert.ok(f.checkpoints[i].height > f.checkpoints[i - 1].height);
});

test('politeFetch waits and tries again when an explorer is busy', async () => {
  let n = 0;
  const f = politeFetch(
    async () => new Response('', { status: ++n < 3 ? 429 : 200 }),
    async () => undefined,
  );
  assert.equal((await f('https://x')).status, 200);
  assert.equal(n, 3);
});
