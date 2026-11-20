// The Bitcoin header check (evidence-page/btc-header-chain.js), on real mainnet headers.
//
// Every fixture is real Bitcoin data from a public source, named in fixtures/SOURCES.md with
// the SHA-256 of the file it came from: blocks 0 to 438 (bitcoinj), one header at every
// difficulty adjustment from 2016 to 878976 (bitcoinj's checkpoints), nine adjustments with
// the period's first and last block and the next block (summa-tx/bitcoin-spv; the eight of its nine that link), Bitcoin Core's
// own difficulty tests (pow_tests.cpp), and VeilCore's first stamped batch with blocks 971004
// and 971005. Made-up headers appear only as attacks, and are mined here at an easy target.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BtcHeaderChain as C } from '../../../evidence-page/btc-header-chain.js';
import { VeilcoreVerify } from '../../../evidence-page/verify-core.js';
import pinnedFile from '../../../evidence-page/btc-checkpoints.json';
import genesisEra from './fixtures/mainnet-0-438.json';
import retargetHeaders from './fixtures/mainnet-retarget-headers.json';
import summa from './fixtures/summa-spv.json';
import fe71 from './fixtures/veilcore-fe71.json';

const GENESIS = '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f';
const g = genesisEra.headers;
const at = (from: number, to: number) => {
  const out = [];
  for (let h = from; h <= to; h++) out.push({ height: h, header: g[h] });
  return out;
};
const sha256d = (b: Buffer) =>
  createHash('sha256').update(createHash('sha256').update(b).digest()).digest().reverse().toString('hex');
const hashOf = (hex: string) => sha256d(Buffer.from(hex, 'hex'));

/** A header with some fields replaced. Hashes in explorer order. */
const edit = (hex: string, f: { prev?: string; merkle?: string; time?: number; bits?: number; nonce?: number }) => {
  const b = Buffer.from(hex, 'hex');
  if (f.prev) Buffer.from(f.prev, 'hex').reverse().copy(b, 4);
  if (f.merkle) Buffer.from(f.merkle, 'hex').reverse().copy(b, 36);
  if (f.time !== undefined) b.writeUInt32LE(f.time, 68);
  if (f.bits !== undefined) b.writeUInt32LE(f.bits, 72);
  if (f.nonce !== undefined) b.writeUInt32LE(f.nonce, 76);
  return b.toString('hex');
};
/** Mine a header at an easy target (regtest's 0x207fffff): an attacker's block, made in milliseconds. */
const mineEasy = (hex: string) => {
  for (let n = 0; ; n++) {
    const h = edit(hex, { bits: 0x207fffff, nonce: n });
    if (BigInt(`0x${hashOf(h)}`) <= 0x7fffffn << 232n) return h;
  }
};

describe('real headers', () => {
  it('block 0 is the genesis block, and blocks 0 to 438 form one chain with proof of work', async () => {
    expect((await C.readHeader(g[0])).hash).toBe(GENESIS);
    for (let h = 1; h < g.length; h++) {
      const r = await C.readHeader(g[h]);
      expect(r.prevHash).toBe(hashOf(g[h - 1]));
      expect(C.powProblem(r)).toBeNull();
    }
    // Block 1 as python-opentimestamps' tests have it (scripts/fixtures/ots/expected.json).
    expect(g[1]).toBe(
      '010000006fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000982051fd1e4ba744bbbe680e1fee14677ba1a3c3540bf7b1cdb606e857233e0e61bc6649ffff001d01e36299',
    );
  });

  it('436 headers across 2009–2025, one per difficulty period: each has proof of work and round-trips its nBits', async () => {
    for (const { height, header } of retargetHeaders.headers) {
      expect(height % 2016).toBe(0);
      const r = await C.readHeader(header);
      expect(C.powProblem(r), `block ${height}`).toBeNull();
      expect(C.targetToCompact(C.compactToTarget(r.bits)!)).toBe(r.bits);
    }
  });

  it('two sources agree: bitcoinj and summa-tx give the same headers for the same blocks', () => {
    const byHeight = new Map(retargetHeaders.headers.map((x) => [x.height, x.header]));
    let compared = 0;
    for (const t of summa.retargets)
      for (const x of t)
        if (byHeight.has(x.height)) {
          expect(byHeight.get(x.height)).toBe(x.header);
          compared++;
        }
    expect(compared).toBeGreaterThanOrEqual(8);
  });

  it('eight consecutive 2018 headers link and carry proof of work', async () => {
    const chain = summa.chain2018;
    for (let i = 0; i < chain.length; i++) {
      const r = await C.readHeader(chain[i]);
      expect(C.powProblem(r)).toBeNull();
      if (i) expect(r.prevHash).toBe(hashOf(chain[i - 1]));
    }
  });
});

describe('the difficulty rule (CalculateNextWorkRequired)', () => {
  it('matches Bitcoin Core’s pow_tests.cpp', () => {
    // [last bits, period's first block time, last block time, expected], from pow_tests.cpp.
    const core: [number, number, number, number][] = [
      [0x1d00ffff, 1261130161, 1262152739, 0x1d00d86a], // get_next_work, blocks 30240..32255
      [0x1d00ffff, 1231006505, 1233061996, 0x1d00ffff], // get_next_work_pow_limit, blocks 0..2015
      [0x1c05a3f4, 1279008237, 1279297671, 0x1c0168fd], // get_next_work_lower_limit_actual
      [0x1c387f6f, 1263163443, 1269211443, 0x1d00e1fd], // get_next_work_upper_limit_actual
      [0x1c05a3f4, 1279297671, 1279008237, 0x1c0168fd], // get_next_work_negative_actual
    ];
    for (const [bits, first, last, want] of core) expect(C.nextBits(bits, first, last)).toBe(want);
  });

  it('gives the real next nBits at nine real adjustments', async () => {
    for (const [first, last, next] of summa.retargets) {
      expect(last.height - first.height).toBe(2015);
      expect(next.height).toBe(last.height + 1);
      const [f, l, n] = await Promise.all([first, last, next].map((x) => C.readHeader(x.header)));
      expect(C.nextBits(l.bits, f.time, l.time), `adjustment at ${next.height}`).toBe(n.bits);
    }
  });

  it('compact encoding follows GetCompact, sign bit included', () => {
    expect(C.targetToCompact(0x80n)).toBe(0x02008000);
    expect(C.compactToTarget(0x02008000)).toBe(0x80n);
    expect(C.compactToTarget(0x01800000)).toBeNull(); // negative
    // Difficulty 1 (0x1d00ffff) is a little under powLimit, which isn't a compact value itself.
    expect(C.compactToTarget(0x1d00ffff)).toBe(0xffffn << 208n);
    expect(C.targetToCompact(C.POW_LIMIT)).toBe(0x1d00ffff);
  });
});

describe('linking a block to a pinned checkpoint', () => {
  const pin = (h: number) => ({ height: h, hash: hashOf(g[h]) });

  it('down: block 300 links to a checkpoint at 438 by the hash chain', async () => {
    const r = await C.verifyLink({ height: 300, headers: at(300, 438), checkpoints: [pin(438)] });
    expect(r).toMatchObject({
      ok: true,
      direction: 'down',
      hash: hashOf(g[300]),
      checkpoint: pin(438),
      headersChecked: 139,
    });
  });

  it('up: block 300 links to a checkpoint at 100 with the difficulty rule', async () => {
    const r = await C.verifyLink({ height: 300, headers: at(100, 300), checkpoints: [pin(100)] });
    expect(r).toMatchObject({ ok: true, direction: 'up', hash: hashOf(g[300]) });
  });

  it('goes down to a checkpoint whenever one is within reach (it can’t be faked), up only otherwise', () => {
    expect(C.plan(300, [pin(0), pin(310)])).toMatchObject({ ok: true, direction: 'down', from: 300, to: 310 });
    // Up is shorter here, but down rests on the hash chain alone, so down it is.
    expect(C.plan(300, [pin(295), pin(438)])).toMatchObject({ ok: true, direction: 'down', from: 300, to: 438 });
    expect(C.plan(300, [pin(295), pin(438)], 100)).toMatchObject({ ok: true, direction: 'up', from: 295, to: 300 });
    expect(C.plan(300, [pin(295)])).toMatchObject({ ok: true, direction: 'up', from: 295, to: 300 });
    expect(C.plan(300, [pin(0)], 100)).toMatchObject({ ok: false, code: 'too-far' });
    expect(C.plan(300, [])).toMatchObject({ ok: false, code: 'bad-checkpoints' });
    expect(C.plan(300, [pin(438), pin(100)])).toMatchObject({ ok: false, code: 'bad-checkpoints' });
  });

  it('a block that is itself a checkpoint needs only its own header', async () => {
    const r = await C.verifyLink({ height: 438, headers: at(438, 438), checkpoints: [pin(438)] });
    expect(r).toMatchObject({ ok: true, headersChecked: 1 });
  });

  it('up across a real difficulty adjustment, with the period’s first block pinned', async () => {
    for (const [first, last, next] of summa.retargets) {
      const checkpoints = [first, last].map((x) => ({ height: x.height, hash: x.hash }));
      const headers = [first, last, next].map((x) => ({ height: x.height, header: x.header }));
      expect(C.plan(next.height, checkpoints)).toMatchObject({ direction: 'up', anchors: [checkpoints[0]] });
      const r = await C.verifyLink({ height: next.height, headers, checkpoints });
      expect(r, `adjustment at ${next.height}`).toMatchObject({ ok: true, direction: 'up', hash: next.hash });
    }
  });

  it('up across an adjustment refuses when the period’s first block isn’t pinned', () => {
    const [, last, next] = summa.retargets[0];
    expect(C.plan(next.height, [{ height: last.height, hash: last.hash }])).toMatchObject({
      ok: false,
      code: 'no-anchor',
    });
  });
});

describe('tampered headers and forks fail', () => {
  const pin = (h: number) => ({ height: h, hash: hashOf(g[h]) });

  it('a changed merkle root in the stamped block breaks the link above it', async () => {
    const headers = at(300, 438);
    headers[0] = { height: 300, header: edit(g[300], { merkle: '11'.repeat(32) }) };
    expect(await C.verifyLink({ height: 300, headers, checkpoints: [pin(438)] })).toMatchObject({
      ok: false,
      code: 'link',
    });
  });

  it('a changed checkpoint header is refused', async () => {
    const headers = at(300, 438);
    headers[138] = { height: 438, header: edit(g[438], { time: 1 }) };
    expect(await C.verifyLink({ height: 300, headers, checkpoints: [pin(438)] })).toMatchObject({
      ok: false,
      code: 'checkpoint',
    });
  });

  it('a wrong pinned hash is refused', async () => {
    const r = await C.verifyLink({
      height: 300,
      headers: at(300, 438),
      checkpoints: [{ height: 438, hash: hashOf(g[437]) }],
    });
    expect(r).toMatchObject({ ok: false, code: 'checkpoint' });
  });

  it('a header whose nonce was changed has no proof of work', async () => {
    const headers = at(300, 300);
    const bad = edit(g[300], { nonce: 1 });
    headers[0] = { height: 300, header: bad };
    const r = await C.verifyLink({ height: 300, headers, checkpoints: [{ height: 300, hash: hashOf(bad) }] });
    expect(r).toMatchObject({ ok: false, code: 'pow' });
  });

  it('fork, going up: blocks mined at an easy target on a real checkpoint break the difficulty rule', async () => {
    // The attacker's block 301 points at the real block 300 and carries the merkle root they want.
    const fork = mineEasy(edit(g[301], { prev: hashOf(g[300]), merkle: '22'.repeat(32) }));
    const r = await C.verifyLink({
      height: 301,
      headers: [...at(100, 300), { height: 301, header: fork }],
      checkpoints: [pin(100)],
    });
    expect(r).toMatchObject({ ok: false, code: 'difficulty' });
    // And on its own, its target is easier than Bitcoin allows.
    expect(C.powProblem(await C.readHeader(fork))).toMatch(/easier than Bitcoin allows/);
  });

  it('fork, going down: a replacement block can’t reach the checkpoint', async () => {
    const fork = mineEasy(edit(g[300], { merkle: '33'.repeat(32) }));
    const headers = at(300, 438);
    headers[0] = { height: 300, header: fork };
    expect(await C.verifyLink({ height: 300, headers, checkpoints: [pin(438)] })).toMatchObject({
      ok: false,
      code: 'link',
    });
  });

  it('fork across a real adjustment: the real next block’s nBits with a lie about the period’s start fails', async () => {
    const [first, last, next] = summa.retargets[0];
    const checkpoints = [first, last].map((x) => ({ height: x.height, hash: x.hash }));
    const fakeFirst = edit(first.header, { time: 1 });
    const r = await C.verifyLink({
      height: next.height,
      headers: [
        { height: first.height, header: fakeFirst },
        { height: last.height, header: last.header },
        { height: next.height, header: next.header },
      ],
      checkpoints,
    });
    expect(r).toMatchObject({ ok: false, code: 'checkpoint' });
  });

  it('fork, going up: a mined block can’t take a date from well before the checkpoint', async () => {
    // The real time rule can't be met by an easy target, so this checks the floor directly: a
    // header whose time is four hours before the checkpoint's fails on time, before proof of work.
    const early = edit(g[301], { prev: hashOf(g[300]), time: Buffer.from(g[100], 'hex').readUInt32LE(68) - 4 * 3600 });
    const r = await C.verifyLink({
      height: 301,
      headers: [...at(100, 300), { height: 301, header: early }],
      checkpoints: [pin(100)],
    });
    expect(r).toMatchObject({ ok: false, code: 'time' });
  });

  it('missing, malformed and conflicting headers are failures, not errors', async () => {
    expect(await C.verifyLink({ height: 300, headers: at(301, 438), checkpoints: [pin(438)] })).toMatchObject({
      ok: false,
      code: 'missing',
    });
    expect(
      await C.verifyLink({
        height: 300,
        headers: [...at(300, 438), { height: 300, header: g[1] }],
        checkpoints: [pin(438)],
      }),
    ).toMatchObject({ ok: false, code: 'conflict' });
    const short = at(300, 438);
    short[5] = { height: 305, header: 'zz' };
    expect(await C.verifyLink({ height: 300, headers: short, checkpoints: [pin(438)] })).toMatchObject({
      ok: false,
      code: 'error',
    });
    expect(await C.verifyLink({ height: -1, headers: [], checkpoints: [pin(438)] })).toMatchObject({
      ok: false,
      code: 'bad-height',
    });
  });
});

describe('VeilCore’s first stamped batch, end to end', () => {
  const ots = Uint8Array.from(Buffer.from(fe71.otsBase64, 'base64'));
  const headers = fe71.headers.map((x) => ({ height: x.height, header: x.header }));

  it('the stamp names block 971004; its header carries the stamp’s value and links to the pinned checkpoint', async () => {
    expect(createHash('sha256').update(ots).digest('hex')).toBe(fe71.otsSha256);
    const read = await VeilcoreVerify.readStamp(ots, fe71.rootHex);
    expect(read.status).toBe('bitcoin');
    if (read.status !== 'bitcoin') return;
    const b = read.bitcoin.find((x) => x.height === 971004)!;
    const r = await C.verifyLink({ height: 971004, headers, checkpoints: pinnedFile.checkpoints });
    expect(r).toMatchObject({ ok: true, direction: 'down', checkpoint: { height: 971005 } });
    if (!r.ok) return;
    expect(r.merkleRoot).toBe(b.merkleRoot);
    expect(new Date(r.time * 1000).toISOString()).toBe('2026-10-11T23:55:44.000Z');
  });

  it('the pinned seed checkpoint is block 971005 exactly as both explorers gave it', () => {
    expect(pinnedFile.checkpoints[0]).toEqual({ height: 971005, hash: fe71.headers[1].hash });
    expect(hashOf(fe71.headers[1].header)).toBe(fe71.headers[1].hash);
  });

  it('the pinned checkpoints are well formed: increasing, and every one after the seed on the spacing', () => {
    const cps = pinnedFile.checkpoints;
    for (let i = 0; i < cps.length; i++) {
      expect(cps[i].hash).toMatch(/^0{8}[0-9a-f]{56}$/);
      if (i) expect(cps[i].height).toBeGreaterThan(cps[i - 1].height);
      if (cps[i].height !== 971005) expect(cps[i].height % pinnedFile.spacing).toBe(0);
      expect(cps[i].height).toBeGreaterThanOrEqual(pinnedFile.start);
    }
  });
});
