// The one-command Bitcoin stamp check (check-bitcoin-stamp.mjs), offline. The .ots files in
// fixtures/ots were made with the official OpenTimestamps Python library
// (fixtures/ots/make-fixtures.py), and expected.json is what that library read back from
// them, so the parser here is checked against the official code. Two are built on real
// Bitcoin blocks from that library's own test data (blocks 1 and 586), which fixes the
// byte order: the merkle roots in expected.json are the ones its tests assert.
//
//   node --test scripts/check-bitcoin-stamp.test.mjs
//
// Set OTS_EXAMPLES_DIR to the opentimestamps-client repository's examples/ folder to also
// read its real hello-world.txt.ots (Bitcoin block 358391) and compare with `ots info`.
// SPDX-License-Identifier: Apache-2.0

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  EXPLORERS,
  HEADER_MAGIC,
  keccak256,
  officialCommands,
  parseArgs,
  parseOts,
  readHeader,
  runCheck,
  toExplorerHex,
} from './check-bitcoin-stamp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, 'fixtures/ots');
const expected = JSON.parse(readFileSync(path.join(FIX, 'expected.json'), 'utf8'));
const file = (n) => readFileSync(path.join(FIX, n));
const sha256 = (b) => createHash('sha256').update(b).digest();
const sha256d = (b) => sha256(sha256(b));

/** What the parser found, in the same shape as the library's expected.json. */
const shape = (p) => ({
  fileDigestHex: p.digest.toString('hex'),
  fileHashOp: p.fileHashOp,
  attestations: p.attestations
    .map((a) =>
      a.kind === 'bitcoin'
        ? {
            kind: 'bitcoin',
            height: a.height,
            msgHex: a.msg.toString('hex'),
            merkleRootExplorer: toExplorerHex(a.msg),
          }
        : a.kind === 'pending'
          ? { kind: 'pending', uri: a.uri, msgHex: a.msg.toString('hex') }
          : { kind: a.kind, tagHex: a.tagHex, msgHex: a.msg.toString('hex') },
    )
    .sort((x, y) => x.kind.localeCompare(y.kind)),
});
const sorted = (e) => ({
  ...e,
  attestations: [...e.attestations].sort((x, y) => x.kind.localeCompare(y.kind)),
});

test('the header magic is the library’s', () => {
  assert.equal(
    HEADER_MAGIC.toString('hex'),
    Buffer.from('\x00OpenTimestamps\x00\x00Proof\x00', 'latin1').toString('hex') + 'bf89e2e884e89294',
  );
});

test('reads the synthetic stamp exactly as the official library does', () => {
  const p = parseOts(file('synthetic.root.bin.ots'));
  assert.deepEqual(shape(p), sorted(expected.synthetic));
  // The digest it starts from is SHA-256 of root.bin.
  assert.deepEqual(p.digest, sha256(file('synthetic.root.bin')));
  // The fake Bitcoin attestation: the height and the 32 bytes its path ends on.
  const btc = p.attestations.find((a) => a.kind === 'bitcoin');
  assert.equal(btc.height, 971004);
  assert.equal(btc.path.length, 4);
  assert.match(btc.path[0], /^append 6e6f6e6365$/);
});

test('reads a pending-only stamp', () => {
  const p = parseOts(file('pending.root.bin.ots'));
  assert.deepEqual(shape(p), sorted(expected.pending));
});

test('byte order, on real blocks from the library’s test data', () => {
  // Block 586: the stamp the library built from the real block. Its steps end on the
  // merkle root in header order; reversed, it is the value the library's test asserts.
  const p = parseOts(file('block586.root.bin.ots'));
  const [a] = p.attestations;
  assert.equal(a.kind, 'bitcoin');
  assert.equal(a.height, 586);
  assert.equal(toExplorerHex(a.msg), expected.block586.merkleRootFromLibraryTest);
  assert.equal(toExplorerHex(a.msg), '197b3d968ce463aa5da7d8eeba8af35eba80ded4e4fe6808e6cc0dd1c069594d');
  const { headerHex: _hh, merkleRootFromLibraryTest: _mm, ...lib586 } = expected.block586;
  assert.deepEqual(shape(p), sorted(lib586));
  // In the real header the same 32 bytes sit, unreversed, at bytes 36 to 68.
  const h586 = readHeader(expected.block586.headerHex);
  assert.deepEqual(h586.merkleRootInternal, a.msg);
  assert.equal(h586.merkleRoot, expected.block586.merkleRootFromLibraryTest);
  // A real header's hash has Bitcoin's leading zeros only in explorer order.
  assert.match(h586.hash, /^00000000/);
  assert.doesNotMatch(sha256d(Buffer.from(expected.block586.headerHex, 'hex')).toString('hex'), /^00000000/);
  // Block 1, the same way, from its header alone.
  const h1 = readHeader(expected.block1.headerHex);
  assert.equal(h1.merkleRoot, expected.block1.merkleRootFromLibraryTest);
  assert.equal(h1.merkleRoot, '0e3e2357e806b6cdb1f70b54c3a3a17b6714ee1f0e68bebb44a74b1efd512098');
  assert.match(h1.hash, /^00000000/);
  // Its previous block, in the header, is the genesis block.
  assert.equal(
    toExplorerHex(Buffer.from(expected.block1.headerHex, 'hex').subarray(4, 36)),
    '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
  );
});

test('keccak256: the permutation checked against Node’s SHA3-256, the padding against pycryptodome', () => {
  for (const n of [0, 3, 135, 136, 137, 300]) {
    const m = Buffer.alloc(n, 0x61);
    assert.equal(keccak256(m, 0x06).toString('hex'), createHash('sha3-256').update(m).digest('hex'), `${n} bytes`);
  }
  // Cryptodome.Hash.keccak (what python-opentimestamps uses), digest_bits=256.
  assert.equal(
    keccak256(Buffer.alloc(0)).toString('hex'),
    'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
  );
  assert.equal(
    keccak256(Buffer.from('abc')).toString('hex'),
    '4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45',
  );
  assert.equal(
    keccak256(Buffer.alloc(200, 0x61)).toString('hex'),
    '96ea54061def936c4be90b518992fdc6f12f535068a256229aca54267b4d084d',
  );
});

test('refuses what the library refuses', () => {
  const good = file('synthetic.root.bin.ots');
  assert.throws(() => parseOts(Buffer.concat([Buffer.from([1]), good.subarray(1)])), /wrong header/);
  const v2 = Buffer.from(good);
  v2[HEADER_MAGIC.length] = 2;
  assert.throws(() => parseOts(v2), /version 2/);
  assert.throws(() => parseOts(Buffer.concat([good, Buffer.from([0])])), /unexpected bytes at the end/);
  assert.throws(() => parseOts(good.subarray(0, good.length - 3)), /ends too early/);
  const badOp = Buffer.from(good);
  badOp[HEADER_MAGIC.length + 1 + 1 + 32] = 0x99; // the first op's tag
  assert.throws(() => parseOts(badOp));
});

// ── The whole check, with stand-in registry and explorers ───────────────────────────

/** An 80-byte header carrying `merkle` (header order) and a time. */
const fakeHeader = (merkle, time) => {
  const h = Buffer.alloc(80);
  h.writeUInt32LE(0x20000000, 0);
  merkle.copy(h, 36);
  h.writeUInt32LE(time, 68);
  return h.toString('hex');
};

const REG = 'https://registry.example';
const ID = 'B-20261011-FE71';
const btcOf = (ots) => parseOts(ots).attestations.find((a) => a.kind === 'bitcoin');

/** Stand-in fetch: the registry's two files and each explorer's view of one block. */
const standIn = ({ root, ots, blocks = {}, down = [] }) => {
  const urls = new Map();
  urls.set(`${REG}/batches/${ID}/root.bin`, root);
  urls.set(`${REG}/batches/${ID}/root.bin.ots`, ots);
  for (const ex of EXPLORERS) {
    const b = blocks[ex.name];
    if (!b) continue;
    urls.set(`${ex.base}/block-height/${b.height}`, b.hash);
    urls.set(`${ex.base}/block/${b.hash}`, JSON.stringify(b.json));
    urls.set(`${ex.base}/block/${b.hash}/header`, b.header);
  }
  return async (url) => {
    if (down.some((d) => url.startsWith(d))) throw new TypeError('fetch failed');
    const body = urls.get(url);
    if (body === undefined) return new Response('not found', { status: 404 });
    return new Response(body, { status: 200 });
  };
};

const blockFor = (msg, height, { merkle } = {}) => {
  const time = Date.UTC(2026, 9, 11, 23, 55, 44) / 1000;
  const header = fakeHeader(msg, time);
  const hash = readHeader(header).hash;
  return {
    height,
    hash,
    header,
    json: {
      id: hash,
      height,
      timestamp: time,
      merkle_root: merkle ?? toExplorerHex(msg),
    },
  };
};

const synthetic = () => {
  const root = file('synthetic.root.bin');
  const ots = file('synthetic.root.bin.ots');
  const block = blockFor(btcOf(ots).msg, 971004);
  return {
    root,
    ots,
    blocks: { 'mempool.space': block, 'blockstream.info': block },
  };
};

test('PASS when the files match and both explorers carry the stamp’s merkle root', async () => {
  const { result, lines } = await runCheck({
    batchId: ID,
    registry: REG,
    fetchImpl: standIn(synthetic()),
  });
  const out = lines.join('\n');
  assert.equal(result, 'PASS', out);
  // Every value is printed.
  assert.match(out, /root\.bin: {6}32 bytes, contents [0-9a-f]{64}/);
  assert.match(out, new RegExp(`the stamp starts from \\(sha256\\): +${expected.synthetic.fileDigestHex}`));
  const merkle = expected.synthetic.attestations.find((a) => a.kind === 'bitcoin').merkleRootExplorer;
  assert.match(out, new RegExp(`merkle root must be \\(explorer order\\): ${merkle}`));
  assert.match(out, /mempool\.space:[\s\S]*blockstream\.info:/);
  assert.match(out, /2026-10-11 23:55:44 UTC/);
  assert.match(out, /pending at https:\/\/alice\.btc\.calendar\.opentimestamps\.org/);
  assert.equal((out.match(/matches the stamp/g) ?? []).length, 2);
});

test('FAIL when root.bin is not the file the stamp is about', async () => {
  const s = synthetic();
  const { result, lines } = await runCheck({
    batchId: ID,
    registry: REG,
    fetchImpl: standIn({ ...s, root: Buffer.alloc(32, 7) }),
  });
  assert.equal(result, 'FAIL');
  assert.match(lines.join('\n'), /the stamp file is not about this root\.bin/);
});

test('FAIL when an explorer’s merkle root differs, or the explorers disagree', async () => {
  const s = synthetic();
  const msg = btcOf(s.ots).msg;
  const wrong = blockFor(msg, 971004, { merkle: 'ab'.repeat(32) });
  let r = await runCheck({
    batchId: ID,
    registry: REG,
    fetchImpl: standIn({
      ...s,
      blocks: { ...s.blocks, 'blockstream.info': wrong },
    }),
  });
  assert.equal(r.result, 'FAIL');
  assert.match(r.lines.join('\n'), /blockstream\.info: merkle_root is not the stamp's value/);
  // The JSON right but the header another block's: caught by the header check.
  const other = blockFor(Buffer.alloc(32, 1), 971004, {
    merkle: toExplorerHex(msg),
  });
  r = await runCheck({
    batchId: ID,
    registry: REG,
    fetchImpl: standIn({
      ...s,
      blocks: { ...s.blocks, 'mempool.space': other },
    }),
  });
  assert.equal(r.result, 'FAIL');
  assert.match(r.lines.join('\n'), /the header's merkle root is not the stamp's value/);
  assert.match(r.lines.join('\n'), /the explorers give different blocks/);
  // An explorer answer missing fields fails, and doesn't crash the check.
  const bare = { ...blockFor(msg, 971004), json: {} };
  r = await runCheck({
    batchId: ID,
    registry: REG,
    fetchImpl: standIn({ ...s, blocks: { ...s.blocks, 'mempool.space': bare } }),
  });
  assert.equal(r.result, 'FAIL');
  assert.match(r.lines.join('\n'), /mempool\.space: the block it returned is at height undefined/);
  // Reversed the wrong way round (header order where explorer order belongs): FAIL.
  const flipped = blockFor(msg, 971004, { merkle: msg.toString('hex') });
  r = await runCheck({
    batchId: ID,
    registry: REG,
    fetchImpl: standIn({
      ...s,
      blocks: { 'mempool.space': flipped, 'blockstream.info': flipped },
    }),
  });
  assert.equal(r.result, 'FAIL');
});

test('NOT DONE when the registry or an explorer can’t be reached, or the stamp is pending', async () => {
  const s = synthetic();
  let r = await runCheck({
    batchId: ID,
    registry: REG,
    fetchImpl: standIn({ ...s, down: [REG] }),
  });
  assert.equal(r.result, 'NOT DONE');
  assert.match(r.lines.join('\n'), /couldn't download the batch files/);
  r = await runCheck({
    batchId: ID,
    registry: REG,
    fetchImpl: standIn({ ...s, down: ['https://blockstream.info'] }),
  });
  assert.equal(r.result, 'NOT DONE');
  assert.match(r.lines.join('\n'), /blockstream\.info couldn't be reached/);
  r = await runCheck({
    batchId: ID,
    registry: REG,
    fetchImpl: standIn({
      root: file('pending.root.bin'),
      ots: file('pending.root.bin.ots'),
    }),
  });
  assert.equal(r.result, 'NOT DONE');
  assert.match(r.lines.join('\n'), /still pending.*ots upgrade/);
});

test('--files reads local files and downloads nothing from a registry', async () => {
  const s = synthetic();
  const r = await runCheck({
    batchId: ID,
    registry: REG,
    files: {
      root: path.join(FIX, 'synthetic.root.bin'),
      ots: path.join(FIX, 'synthetic.root.bin.ots'),
    },
    fetchImpl: standIn({ ...s, down: [REG] }),
  });
  assert.equal(r.result, 'PASS', r.lines.join('\n'));
});

test('arguments and the official commands', () => {
  assert.equal(parseArgs(['B-20261011-FE71']).batchId, 'B-20261011-FE71');
  assert.equal(parseArgs(['B-1']).registry, 'https://veilcore-api-production.up.railway.app');
  assert.throws(() => parseArgs([]), /batch id/);
  assert.throws(() => parseArgs(['../../etc']), /batch id/);
  assert.throws(() => parseArgs(['B-1', '--registry', 'https://x.example/path?q']), /plain https/);
  const cmds = officialCommands('B-20261011-FE71').join('\n');
  assert.match(cmds, /pip install opentimestamps-client/);
  assert.match(cmds, /ots info root\.bin\.ots/);
  assert.match(cmds, /ots --no-bitcoin verify -f root\.bin root\.bin\.ots/);
  assert.match(cmds, /veilcore-api-production\.up\.railway\.app\/batches\/B-20261011-FE71\/root\.bin\.ots/);
});

const EXAMPLES = process.env.OTS_EXAMPLES_DIR;
test(
  'the client’s real example stamps, as `ots info` (opentimestamps-client 0.7.2) reads them',
  {
    skip: !EXAMPLES || !existsSync(path.join(EXAMPLES ?? '', 'hello-world.txt.ots')),
  },
  () => {
    const p = parseOts(readFileSync(path.join(EXAMPLES, 'hello-world.txt.ots')));
    assert.deepEqual(p.digest, sha256(readFileSync(path.join(EXAMPLES, 'hello-world.txt'))));
    const btc = p.attestations.filter((a) => a.kind === 'bitcoin');
    assert.equal(btc.length, 1);
    assert.equal(btc[0].height, 358391);
    // `ots info examples/hello-world.txt.ots`, opentimestamps-client 0.7.2:
    // "# Bitcoin block merkle root 8a1b66ec…5e47e00"
    assert.equal(toExplorerHex(btc[0].msg), '8a1b66ecb7cbd07d8139a7e7d7f2c41aab1f5009b8364aaf61d03ad245e47e00');
    // A stamp with a keccak256 (Ethereum) branch as well: `ots info` gives block 455605.
    const d = parseOts(readFileSync(path.join(EXAMPLES, 'different-blockchains.txt.ots')));
    const dBtc = d.attestations.filter((a) => a.kind === 'bitcoin');
    assert.deepEqual(
      dBtc.map((a) => [a.height, toExplorerHex(a.msg)]),
      [[455605, '2a19192cf00fb1baeea516b69b3a62195849589b4caafeb6ad6ebba58b9ae69a']],
    );
  },
);
