#!/usr/bin/env node
// Checks a batch's Bitcoin stamp in one command, with no keys and no Python:
//
//   npm run check:bitcoin-stamp -- B-20261011-FE71
//
// 1. Downloads the batch's root.bin (its 32-byte root) and root.bin.ots (its OpenTimestamps
//    stamp file) from VeilCore's production registry.
// 2. Checks the stamp file is about root.bin: SHA-256(root.bin) is the digest it starts from.
// 3. Follows the stamp file's steps (append, prepend, sha256, …) from that digest to its
//    Bitcoin attestation: the block height, and the value that block's merkle root must be.
// 4. Asks two block explorers that don't share a backend (mempool.space, blockstream.info)
//    for that block: its hash, its merkle root, and its raw 80-byte header. The header must
//    hash to the block's hash, and carry the merkle root from step 3.
// 5. The header must carry Bitcoin's proof of work: its hash at or under the target its own
//    nBits field sets, that target no easier than Bitcoin's minimum, and, from block 800000
//    on, at most 2^200 (see MIN_WORK below). Its previous-block hash must be the hash of the
//    block one lower, asked of the OTHER explorer. So a made-up header, with the stamp's
//    merkle root in it and no mining behind it, fails. Each explorer is asked on its own (no
//    shared cache, nothing reused from one for the other).
// Prints every value, then PASS, FAIL or NOT DONE (something couldn't be reached, or the
// stamp hasn't reached Bitcoin yet). Exit code 0, 1 or 2.
//
// Byte order: the stamp file's steps end on the merkle root as it sits inside the block
// header (bytes 36 to 68). Explorers print it reversed, the way Bitcoin Core does. Both
// are compared: the header bytes as they are, and the explorer's "merkle_root" reversed.
//
// Options: --registry <url> (another registry), --files <root.bin> <root.bin.ots> (files
// you already have; nothing is downloaded from a registry).
//
// The same check with the official OpenTimestamps tool is printed at the end.
// Steps and what counts as a pass: docs/bitcoin-stamp-check-11oct.md.
// Tests: node --test scripts/check-bitcoin-stamp.test.mjs
// SPDX-License-Identifier: Apache-2.0

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const PRODUCTION_REGISTRY = 'https://veilcore-api-production.up.railway.app';
export const EXPLORERS = [
  { name: 'mempool.space', base: 'https://mempool.space/api' },
  { name: 'blockstream.info', base: 'https://blockstream.info/api' },
];

// ── The OpenTimestamps format (python-opentimestamps, opentimestamps/core) ──────────────

/** DetachedTimestampFile.HEADER_MAGIC */
export const HEADER_MAGIC = Buffer.concat([
  Buffer.from([0x00]),
  Buffer.from('OpenTimestamps'),
  Buffer.from([0x00, 0x00]),
  Buffer.from('Proof'),
  Buffer.from([0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94]),
]);
const MAJOR_VERSION = 1;
const MAX_MSG = 4096; // Op.MAX_MSG_LENGTH and MAX_RESULT_LENGTH
const MAX_PAYLOAD = 8192; // TimeAttestation.MAX_PAYLOAD_SIZE
const MAX_URI = 1000; // PendingAttestation.MAX_URI_LENGTH
const RECURSION_LIMIT = 256; // Timestamp.deserialize

export const ATTESTATION_TAGS = {
  bitcoin: '0588960d73d71901',
  pending: '83dfe30d2ef90c8e',
  litecoin: '06869a0d73d71b45',
  ethereum: '30fe8087b5c7ead7',
};

const hashOf = (alg) => (m) => createHash(alg).update(m).digest();

// Keccak-256 (the original padding, 0x01, as Ethereum uses; not SHA3-256's 0x06). Node has
// no keccak, and the OpenTimestamps format has an op for it. Round constants and rotation
// offsets are generated as FIPS 202 defines them, not typed in. `domain` 0x06 gives
// SHA3-256, which the tests compare with Node's own.
const MASK64 = (1n << 64n) - 1n;
const rotl = (v, n) => (n === 0n ? v : ((v << n) | (v >> (64n - n))) & MASK64);
const KECCAK = (() => {
  const rc = [];
  let r = 1;
  const bit = () => {
    const out = r & 1;
    r = r & 0x80 ? ((r << 1) ^ 0x71) & 0xff : (r << 1) & 0xff;
    return out;
  };
  for (let i = 0; i < 24; i++) {
    let c = 0n;
    for (let j = 0; j < 7; j++) if (bit()) c |= 1n << BigInt(2 ** j - 1);
    rc.push(c);
  }
  const rot = new Array(25).fill(0n);
  let x = 1;
  let y = 0;
  for (let t = 0; t < 24; t++) {
    rot[x + 5 * y] = BigInt((((t + 1) * (t + 2)) / 2) % 64);
    [x, y] = [y, (2 * x + 3 * y) % 5];
  }
  return { rc, rot };
})();
const keccakF = (A) => {
  for (let round = 0; round < 24; round++) {
    const C = [0, 1, 2, 3, 4].map((x) => A[x] ^ A[x + 5] ^ A[x + 10] ^ A[x + 15] ^ A[x + 20]);
    for (let x = 0; x < 5; x++) {
      const D = C[(x + 4) % 5] ^ rotl(C[(x + 1) % 5], 1n);
      for (let y = 0; y < 5; y++) A[x + 5 * y] ^= D;
    }
    const B = new Array(25);
    for (let x = 0; x < 5; x++)
      for (let y = 0; y < 5; y++) B[y + 5 * ((2 * x + 3 * y) % 5)] = rotl(A[x + 5 * y], KECCAK.rot[x + 5 * y]);
    for (let x = 0; x < 5; x++)
      for (let y = 0; y < 5; y++)
        A[x + 5 * y] = B[x + 5 * y] ^ (~B[((x + 1) % 5) + 5 * y] & MASK64 & B[((x + 2) % 5) + 5 * y]);
    A[0] ^= KECCAK.rc[round];
  }
};
export const keccak256 = (msg, domain = 0x01) => {
  const rate = 136;
  const padded = Buffer.alloc((Math.floor(msg.length / rate) + 1) * rate);
  Buffer.from(msg).copy(padded);
  padded[msg.length] ^= domain;
  padded[padded.length - 1] ^= 0x80;
  const A = new Array(25).fill(0n);
  for (let off = 0; off < padded.length; off += rate) {
    for (let i = 0; i < rate / 8; i++) A[i] ^= padded.readBigUInt64LE(off + 8 * i);
    keccakF(A);
  }
  const out = Buffer.alloc(32);
  for (let i = 0; i < 4; i++) out.writeBigUInt64LE(A[i], 8 * i);
  return out;
};
/** The file hash ops a stamp file may start with (CryptOp): tag → name, digest length. */
const FILE_HASH_OPS = {
  0x02: { name: 'sha1', len: 20 },
  0x03: { name: 'ripemd160', len: 20 },
  0x08: { name: 'sha256', len: 32 },
};
/** Every op: tag → name, whether it takes an argument, what it does. */
const OPS = {
  0xf0: { name: 'append', arg: true, run: (m, a) => Buffer.concat([m, a]) },
  0xf1: { name: 'prepend', arg: true, run: (m, a) => Buffer.concat([a, m]) },
  0xf2: { name: 'reverse', run: (m) => Buffer.from(m).reverse() },
  0xf3: {
    name: 'hexlify',
    maxMsg: MAX_MSG / 2,
    run: (m) => Buffer.from(m.toString('hex'), 'ascii'),
  },
  0x02: { name: 'sha1', run: hashOf('sha1') },
  0x03: { name: 'ripemd160', run: hashOf('ripemd160') },
  0x08: { name: 'sha256', run: hashOf('sha256') },
  0x67: { name: 'keccak256', run: (m) => keccak256(m) },
};

class Reader {
  constructor(buf) {
    this.buf = buf;
    this.pos = 0;
  }
  bytes(n) {
    if (this.pos + n > this.buf.length) throw new Error('the file ends too early');
    const b = this.buf.subarray(this.pos, this.pos + n);
    this.pos += n;
    return b;
  }
  byte() {
    return this.bytes(1)[0];
  }
  /** Unsigned LEB128, as python-opentimestamps reads it. */
  varuint() {
    let value = 0;
    let mul = 1;
    for (;;) {
      const b = this.byte();
      value += (b & 0x7f) * mul;
      if (!(b & 0x80)) break;
      mul *= 128;
      if (mul > 2 ** 49) throw new Error('a number in the file is too large');
    }
    return value;
  }
  varbytes(max, min = 0) {
    const n = this.varuint();
    if (n > max) throw new Error(`a field is too long (${n} > ${max} bytes)`);
    if (n < min) throw new Error(`a field is too short (${n} < ${min} bytes)`);
    return this.bytes(n);
  }
  eof() {
    if (this.pos !== this.buf.length) throw new Error(`${this.buf.length - this.pos} unexpected bytes at the end`);
  }
}

const readAttestation = (r) => {
  const tag = r.bytes(8).toString('hex');
  const payload = new Reader(r.varbytes(MAX_PAYLOAD));
  let att;
  if (tag === ATTESTATION_TAGS.bitcoin) att = { kind: 'bitcoin', height: payload.varuint() };
  else if (tag === ATTESTATION_TAGS.litecoin) att = { kind: 'litecoin', height: payload.varuint() };
  else if (tag === ATTESTATION_TAGS.pending) att = { kind: 'pending', uri: payload.varbytes(MAX_URI).toString('utf8') };
  else return { kind: 'unknown', tagHex: tag };
  payload.eof();
  return att;
};

/** Timestamp.deserialize: a tree of ops and attestations, run from `msg` as it is read. */
const readTimestamp = (r, msg, path, out, limit) => {
  if (limit === 0) throw new Error('the stamp is nested too deeply');
  const doTag = (tag) => {
    if (tag === 0x00) {
      out.push({ ...readAttestation(r), msg, path });
      return;
    }
    const op = OPS[tag];
    if (!op) throw new Error(`unknown operation 0x${tag.toString(16).padStart(2, '0')}`);
    const arg = op.arg ? r.varbytes(MAX_MSG, 1) : undefined;
    if (msg.length > (op.maxMsg ?? MAX_MSG)) throw new Error(`${op.name}: message too long`);
    if (msg.length === 0 && (op.name === 'reverse' || op.name === 'hexlify'))
      throw new Error(`${op.name} of an empty message`);
    const result = op.run(msg, arg);
    if (result.length > MAX_MSG) throw new Error(`${op.name}: result too long`);
    const step = arg ? `${op.name} ${arg.toString('hex')}` : op.name;
    readTimestamp(r, result, [...path, step], out, limit - 1);
  };
  let tag = r.byte();
  while (tag === 0xff) {
    doTag(r.byte());
    tag = r.byte();
  }
  doTag(tag);
};

/**
 * Reads a detached .ots file: the hash op and digest it starts from, and every attestation
 * with the message its path ends on. Throws on anything the official library would refuse.
 */
export const parseOts = (buf) => {
  const r = new Reader(Buffer.from(buf));
  if (!r.bytes(HEADER_MAGIC.length).equals(HEADER_MAGIC)) throw new Error('not an OpenTimestamps file (wrong header)');
  const major = r.varuint();
  if (major !== MAJOR_VERSION) throw new Error(`unsupported OpenTimestamps file version ${major}`);
  const hashOp = FILE_HASH_OPS[r.byte()];
  if (!hashOp) throw new Error('unknown file hash');
  const digest = Buffer.from(r.bytes(hashOp.len));
  const attestations = [];
  readTimestamp(r, digest, [], attestations, RECURSION_LIMIT);
  r.eof();
  return { fileHashOp: hashOp.name, digest, attestations };
};

// ── Bitcoin block headers ───────────────────────────────────────────────────────────

const sha256d = (b) => hashOf('sha256')(hashOf('sha256')(b));
/** Internal byte order ↔ the hex explorers and Bitcoin Core print. */
export const toExplorerHex = (internal) => Buffer.from(internal).reverse().toString('hex');

/**
 * What an 80-byte header says: its hash, previous block and merkle root as explorers print
 * them, its time, and its nBits (the compact target).
 */
export const readHeader = (hex) => {
  if (!/^[0-9a-f]{160}$/i.test(hex)) throw new Error('a block header is 80 bytes (160 hex characters)');
  const h = Buffer.from(hex, 'hex');
  return {
    hash: toExplorerHex(sha256d(h)),
    prevHash: toExplorerHex(h.subarray(4, 36)),
    merkleRootInternal: h.subarray(36, 68),
    merkleRoot: toExplorerHex(h.subarray(36, 68)),
    time: h.readUInt32LE(68),
    bits: h.readUInt32LE(72),
  };
};

/**
 * The target a compact nBits value sets (Bitcoin Core's arith_uint256::SetCompact), or
 * undefined if it is negative, zero or overflows 256 bits (Core refuses those too).
 */
export const compactTarget = (bits) => {
  const size = bits >>> 24;
  const word = bits & 0x007fffff;
  if (word === 0 || bits & 0x00800000) return undefined;
  const target = size <= 3 ? BigInt(word >>> (8 * (3 - size))) : BigInt(word) << BigInt(8 * (size - 3));
  if (target === 0n || target >= 1n << 256n) return undefined;
  return target;
};

/** Bitcoin mainnet's easiest allowed target (powLimit, nBits 0x1d00ffff, difficulty 1). */
export const POW_LIMIT = 0xffffn << 208n;

/**
 * A floor on the work of a recent block. From height 800000 (mid-2023) on, every real
 * mainnet target has been about 2^176 to 2^179 (difficulty of 5×10^13 and up). 2^200 is
 * millions of times easier than any of them, so no real block fails it, while a header
 * made up with an easy target (the reviewer's used nBits 0x207fffff, about 2^254) does.
 * Older blocks are only held to POW_LIMIT.
 */
export const MIN_WORK = { fromHeight: 800_000, maxTarget: 1n << 200n };

const log2 = (n) => n.toString(2).length - 1;

/**
 * Why a header doesn't carry the proof of work a real block at `height` would, or
 * undefined when it does: hash ≤ its own target, target ≤ powLimit, and from
 * MIN_WORK.fromHeight on, target ≤ MIN_WORK.maxTarget.
 */
export const proofOfWorkProblem = (headerHex, height) => {
  const h = readHeader(headerHex);
  const target = compactTarget(h.bits);
  const bitsHex = `0x${h.bits.toString(16).padStart(8, '0')}`;
  if (target === undefined) return `its nBits ${bitsHex} is not a valid target`;
  if (target > POW_LIMIT) return `its target (nBits ${bitsHex}, about 2^${log2(target)}) is easier than Bitcoin allows`;
  if (height >= MIN_WORK.fromHeight && target > MIN_WORK.maxTarget)
    return `its target (nBits ${bitsHex}, about 2^${log2(target)}) is far easier than any real block at height ${height} (at most 2^200 from height ${MIN_WORK.fromHeight})`;
  if (BigInt(`0x${h.hash}`) > target) return `it has no proof of work: its hash is above its own target (nBits ${bitsHex})`;
  return undefined;
};

// ── The check ────────────────────────────────────────────────────────────────────────

const utc = (s) =>
  Number.isSafeInteger(s) && s >= 0
    ? new Date(s * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC')
    : 'not a time';

class Unreachable extends Error {}

const getter = (fetchImpl, timeoutMs) => async (url, as) => {
  try {
    const res = await fetchImpl(url, {
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (as === 'bytes') return Buffer.from(await res.arrayBuffer());
    if (as === 'json') return await res.json();
    return (await res.text()).trim();
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    const cause = e instanceof Error && e.cause instanceof Error ? ` (${e.cause.message})` : '';
    throw new Unreachable(`${url}: ${why}${cause}`);
  }
};

/** The block at `height`, from one explorer: its hash, JSON and raw header. */
const explorerBlock = async (get, explorer, height) => {
  const hash = await get(`${explorer.base}/block-height/${height}`, 'text');
  if (!/^[0-9a-f]{64}$/.test(hash)) throw new Unreachable(`${explorer.name}: not a block hash: ${hash.slice(0, 80)}`);
  const json = await get(`${explorer.base}/block/${hash}`, 'json');
  const header = await get(`${explorer.base}/block/${hash}/header`, 'text');
  return { hash, json, header };
};

/** A result being built: lines said, failures, things not done. */
const report = () => {
  const lines = [];
  const say = (s = '') => lines.push(s);
  const fails = [];
  const notDone = [];
  const fail = (s) => {
    fails.push(s);
    say(`  FAIL: ${s}`);
  };
  const finish = () => {
    const result = fails.length ? 'FAIL' : notDone.length ? 'NOT DONE' : 'PASS';
    say();
    say(`Result: ${result}`);
    for (const f of fails) say(`  - ${f}`);
    if (!fails.length) for (const n of notDone) say(`  - not done: ${n}`);
    return { result, lines };
  };
  return { lines, say, fail, notDone, finish };
};

/** Two explorers on different hosts, or why not. */
const explorersProblem = (explorers) => {
  const hosts = explorers.map((ex) => {
    try {
      return new URL(ex.base).host;
    } catch {
      return ex.base;
    }
  });
  if (explorers.length < 2 || new Set(hosts).size !== explorers.length)
    return 'the check needs two block explorers on different hosts';
  return undefined;
};

/**
 * Step 4 and 5 for one Bitcoin attestation: block `height` must have merkle root `msg`
 * (header byte order), on each explorer, with a mined header that points to block
 * height−1 as the OTHER explorer gives it. Each explorer is asked on its own.
 */
const checkAttestation = async ({ height, msg }, { get, explorers, say, fail, notDone }) => {
  const a = { height, msg };
  const hashes = [];
  const expected = toExplorerHex(a.msg);
  say(`  the stamp's steps end on (header byte order):   ${a.msg.toString('hex')}`);
  say(`  so block ${a.height}'s merkle root must be (explorer order): ${expected}`);
  for (const [i, ex] of explorers.entries()) {
    const other = explorers[(i + 1) % explorers.length];
    let block;
    try {
      block = await explorerBlock(get, ex, a.height);
    } catch (e) {
      if (!(e instanceof Unreachable)) throw e;
      say(`  ${ex.name}: couldn't reach it (${e.message})`);
      notDone.push(`${ex.name} couldn't be reached for block ${a.height}`);
      continue;
    }
    say(`  ${ex.name}:`);
    say(`    block hash:            ${block.hash}`);
    say(`    merkle_root:           ${block.json?.merkle_root}`);
    say(`    height:                ${block.json?.height}`);
    say(`    timestamp:             ${block.json?.timestamp} (${utc(Number(block.json?.timestamp))})`);
    say(`    header:                ${block.header}`);
    let header;
    try {
      header = readHeader(block.header);
    } catch (e) {
      fail(`${ex.name}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    say(`    header hashes to:      ${header.hash}`);
    say(`    header's merkle root:  ${header.merkleRoot}`);
    say(`    header's time:         ${header.time} (${utc(header.time)})`);
    say(`    header's previous block: ${header.prevHash}`);
    const target = compactTarget(header.bits);
    say(
      `    header's target:       nBits 0x${header.bits.toString(16).padStart(8, '0')}${target === undefined ? ' (not valid)' : `, about 2^${log2(target)}`}`,
    );
    hashes.push(block.hash);
    const pow = proofOfWorkProblem(block.header, a.height);
    if (pow) fail(`${ex.name}: the header for block ${a.height} is not a mined block: ${pow}`);
    else say('    proof of work:         the header hash is at or under its target');
    // The block one lower, from the other explorer: this header must point to it.
    let prevOk = false;
    if (!Number.isSafeInteger(a.height) || a.height < 1) fail(`block ${a.height} has no block before it to check`);
    else {
      try {
        const prev = await get(`${other.base}/block-height/${a.height - 1}`, 'text');
        if (!/^[0-9a-f]{64}$/.test(prev)) throw new Unreachable(`${other.name}: not a block hash: ${prev.slice(0, 80)}`);
        say(`    block ${a.height - 1} (from ${other.name}): ${prev}`);
        if (prev !== header.prevHash)
          fail(`${ex.name}: the header's previous block is not block ${a.height - 1} as ${other.name} gives it`);
        else prevOk = true;
      } catch (e) {
        if (!(e instanceof Unreachable)) throw e;
        say(`    block ${a.height - 1}: couldn't ask ${other.name} (${e.message})`);
        notDone.push(`${other.name} couldn't be reached for block ${a.height - 1}`);
      }
    }
    if (block.json?.height !== a.height) fail(`${ex.name}: the block it returned is at height ${block.json?.height}`);
    if (block.json?.id !== undefined && block.json.id !== block.hash) fail(`${ex.name}: block id and hash differ`);
    if (header.hash !== block.hash) fail(`${ex.name}: the header does not hash to the block hash`);
    if (block.json?.merkle_root !== expected) fail(`${ex.name}: merkle_root is not the stamp's value`);
    if (!header.merkleRootInternal.equals(a.msg))
      fail(`${ex.name}: the header's merkle root is not the stamp's value`);
    if (block.json?.timestamp !== header.time) fail(`${ex.name}: the timestamp and the header's time differ`);
    if (
      block.json?.merkle_root === expected &&
      header.merkleRootInternal.equals(a.msg) &&
      header.hash === block.hash &&
      !pow &&
      prevOk
    )
      say('    matches the stamp');
  }
  if (new Set(hashes).size > 1) fail(`the explorers give different blocks at height ${a.height}`);
};

/**
 * Steps 4 and 5 on their own, for a block height and the merkle root a stamp ends on
 * (header byte order): { result, lines } as runCheck gives them.
 */
export const checkBlock = async ({ height, msg, fetchImpl = globalThis.fetch, explorers = EXPLORERS, timeoutMs = 30_000 }) => {
  const r = report();
  const problem = explorersProblem(explorers);
  if (problem) r.fail(problem);
  else {
    r.say(`Bitcoin block ${height}`);
    await checkAttestation({ height, msg }, { ...r, get: getter(fetchImpl, timeoutMs), explorers });
  }
  return r.finish();
};

/**
 * Runs the check and returns { result: 'PASS' | 'FAIL' | 'NOT DONE', lines }. Every value
 * it read or worked out is in `lines`, in order.
 */
export const runCheck = async ({
  batchId,
  registry = PRODUCTION_REGISTRY,
  files,
  fetchImpl = globalThis.fetch,
  explorers = EXPLORERS,
  timeoutMs = 30_000,
}) => {
  const r = report();
  const { say, fail, notDone, finish } = r;
  const get = getter(fetchImpl, timeoutMs);

  // 1. The two files.
  let root;
  let ots;
  say('1. The batch files');
  if (files) {
    say(`  root.bin:      ${files.root}`);
    say(`  root.bin.ots:  ${files.ots}`);
    root = readFileSync(files.root);
    ots = readFileSync(files.ots);
  } else {
    const base = `${registry.replace(/\/$/, '')}/batches/${encodeURIComponent(batchId)}`;
    say(`  ${base}/root.bin`);
    say(`  ${base}/root.bin.ots`);
    try {
      root = await get(`${base}/root.bin`, 'bytes');
      ots = await get(`${base}/root.bin.ots`, 'bytes');
    } catch (e) {
      if (!(e instanceof Unreachable)) throw e;
      notDone.push(`couldn't download the batch files (${e.message})`);
      return finish();
    }
  }
  say(`  root.bin:      ${root.length} bytes, contents ${root.toString('hex')}`);
  say(`  root.bin.ots:  ${ots.length} bytes, SHA-256 ${hashOf('sha256')(ots).toString('hex')}`);
  if (root.length !== 32) fail(`root.bin is ${root.length} bytes, not 32 (the batch root as raw bytes)`);

  // 2. The stamp file is about root.bin.
  say();
  say('2. The stamp file is about root.bin');
  let parsed;
  try {
    parsed = parseOts(ots);
  } catch (e) {
    fail(`root.bin.ots can't be read: ${e instanceof Error ? e.message : String(e)}`);
    return finish();
  }
  const fileHash = hashOf(parsed.fileHashOp)(root);
  say(`  the stamp starts from (${parsed.fileHashOp}):  ${parsed.digest.toString('hex')}`);
  say(`  ${parsed.fileHashOp}(root.bin):                ${fileHash.toString('hex')}`);
  if (parsed.fileHashOp !== 'sha256') fail(`the stamp starts from ${parsed.fileHashOp}, not SHA-256`);
  if (!fileHash.equals(parsed.digest)) fail('the stamp file is not about this root.bin');
  else say('  match');

  // 3. Its attestations.
  say();
  say('3. What the stamp file attests');
  for (const a of parsed.attestations) {
    const where =
      a.kind === 'bitcoin' || a.kind === 'litecoin'
        ? `${a.kind} block ${a.height}`
        : a.kind === 'pending'
          ? `pending at ${a.uri}`
          : `unknown attestation ${a.tagHex}`;
    say(`  ${where}, after ${a.path.length} steps`);
  }
  const btc = parsed.attestations.filter((a) => a.kind === 'bitcoin');
  if (btc.length === 0) {
    if (parsed.attestations.some((a) => a.kind === 'pending'))
      notDone.push('the stamp is still pending: not in a Bitcoin block yet (run `ots upgrade root.bin.ots`)');
    else fail('the stamp file has no Bitcoin attestation');
    return finish();
  }

  const explorersBad = explorersProblem(explorers);
  if (explorersBad) {
    fail(explorersBad);
    return finish();
  }

  // 4 and 5. Each Bitcoin attestation, against two explorers.
  for (const a of btc) {
    say();
    say(`4. Bitcoin block ${a.height}`);
    if (a.msg.length !== 32) {
      fail(`the path to block ${a.height} ends on ${a.msg.length} bytes, not a 32-byte merkle root`);
      continue;
    }
    await checkAttestation(a, { get, explorers, say, fail, notDone });
  }
  return finish();
};

/** The same check with the official OpenTimestamps tool. */
export const officialCommands = (batchId, registry = PRODUCTION_REGISTRY) => {
  const base = `${registry.replace(/\/$/, '')}/batches/${batchId}`;
  return [
    'The same check with the official OpenTimestamps tool:',
    `  curl -fsS -o root.bin     ${base}/root.bin`,
    `  curl -fsS -o root.bin.ots ${base}/root.bin.ots`,
    '  pip install opentimestamps-client     # on Linux add --break-system-packages if pip refuses',
    '  shasum -a 256 root.bin                # must equal "File sha256 hash" below (Linux: sha256sum)',
    '  ots info root.bin.ots                 # ends in "verify BitcoinBlockHeaderAttestation(<height>)"',
    '  ots --no-bitcoin verify -f root.bin root.bin.ots',
    '                                        # prints "check that Bitcoin block <height> has merkleroot <hex>"',
    '  ots verify -f root.bin root.bin.ots   # with a local Bitcoin Core node: "Success! Bitcoin block …"',
  ];
};

const USAGE = `Usage: npm run check:bitcoin-stamp -- <batchId> [--registry <url>] [--files <root.bin> <root.bin.ots>]
   e.g. npm run check:bitcoin-stamp -- B-20261011-FE71`;

export const parseArgs = (argv) => {
  const out = { registry: PRODUCTION_REGISTRY };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--registry') out.registry = argv[++i];
    else if (a === '--files') out.files = { root: argv[++i], ots: argv[++i] };
    else if (a === '-h' || a === '--help') out.help = true;
    else if (!out.batchId && !a.startsWith('-')) out.batchId = a;
    else throw new Error(`unexpected argument: ${a}`);
  }
  if (out.help) return out;
  if (!out.batchId || !/^[A-Za-z0-9._-]{1,80}$/.test(out.batchId))
    throw new Error('give the batch id, e.g. B-20261011-FE71');
  if (!/^https?:\/\/[^\s/?#]+\/?$/.test(out.registry ?? ''))
    throw new Error('--registry must be a plain https address');
  if (out.files && (!out.files.root || !out.files.ots))
    throw new Error('--files needs two paths: root.bin and root.bin.ots');
  return out;
};

const main = async () => {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`${e instanceof Error ? e.message : String(e)}\n${USAGE}`);
    process.exit(64);
  }
  if (args.help) {
    console.log(USAGE);
    return;
  }
  console.log(`Bitcoin stamp check: batch ${args.batchId} (${new Date().toISOString()})`);
  console.log();
  const { result, lines } = await runCheck(args);
  for (const l of lines) console.log(l);
  console.log();
  for (const l of officialCommands(args.batchId, args.registry)) console.log(l);
  process.exit(result === 'PASS' ? 0 : result === 'FAIL' ? 1 : 2);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
