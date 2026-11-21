// The stamp check with two explorers (stamp-check.ts, evidence-page/btc-header-fetch.js).
// The explorers are stand-ins that serve real headers (fixtures/SOURCES.md) in the Esplora
// JSON both mempool.space and blockstream.info use, or lie in the ways an explorer could.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkBlock, EXPLORERS, fetchHeaders } from '../../../evidence-page/btc-header-fetch.js';
import { bundleHeaders, checkStamp, PINNED } from './stamp-check';
import pinnedFile from '../../../evidence-page/btc-checkpoints.json';
import genesisEra from './fixtures/mainnet-0-438.json';
import fe71 from './fixtures/veilcore-fe71.json';

const hashOf = (hex: string) =>
  createHash('sha256')
    .update(createHash('sha256').update(Buffer.from(hex, 'hex')).digest())
    .digest()
    .reverse()
    .toString('hex');

/** A header as an Esplora explorer's block JSON. */
const esplora = (height: number, hex: string) => {
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

type Chain = Map<number, string>;
const chainOf = (pairs: { height: number; header: string }[]): Chain => new Map(pairs.map((p) => [p.height, p.header]));
const REAL = chainOf(fe71.headers);
const GENESIS = chainOf(genesisEra.headers.map((header, height) => ({ height, header })));

/** Stand-in explorers: each host serves its own chain, or is down, or edits its answers. */
const explorers = (
  per: Record<string, Chain | 'down'>,
  edit?: (host: string, block: ReturnType<typeof esplora>) => ReturnType<typeof esplora>,
) => {
  const calls: string[] = [];
  // eslint-disable-next-line @typescript-eslint/require-await -- a stand-in for an API that returns a promise
  const fetchImpl = (async (input: string | URL) => {
    const url = new URL(String(input));
    calls.push(url.href);
    const chain = per[url.host];
    if (chain === undefined || chain === 'down') throw new TypeError('Failed to fetch');
    const m = /\/api\/(blocks|block-height)\/(\d+)$/.exec(url.pathname);
    if (!m) return new Response('not found', { status: 404 });
    const h = Number(m[2]);
    if (m[1] === 'block-height') {
      const hex = chain.get(h);
      return hex ? new Response(hashOf(hex)) : new Response('Block not found', { status: 404 });
    }
    const page = [];
    for (let i = h; i > h - 10 && i >= 0; i--) {
      const hex = chain.get(i);
      if (hex) page.push(edit ? edit(url.host, esplora(i, hex)) : esplora(i, hex));
    }
    return Response.json(page);
  }) as typeof fetch;
  return { fetchImpl, calls };
};
const both = (c: Chain) => ({ 'mempool.space': c, 'blockstream.info': c });

/** A stamp file with no steps: its one Bitcoin attestation says block `height`'s merkle root is SHA-256(root). */
const bareStamp = (rootHex: string, attestation: 'bitcoin' | 'pending', height = 0) => {
  const magic = Buffer.concat([
    Buffer.from([0x00]),
    Buffer.from('OpenTimestamps'),
    Buffer.from([0x00, 0x00]),
    Buffer.from('Proof'),
    Buffer.from([0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94]),
  ]);
  const digest = createHash('sha256').update(Buffer.from(rootHex, 'hex')).digest();
  const varuint = (n: number) => {
    const out = [];
    do {
      out.push((n & 0x7f) | (n > 0x7f ? 0x80 : 0));
      n = Math.floor(n / 128);
    } while (n > 0);
    return Buffer.from(out);
  };
  const payload = attestation === 'bitcoin' ? varuint(height) : Buffer.concat([varuint(9), Buffer.from('https://x')]);
  const tag = Buffer.from(attestation === 'bitcoin' ? '0588960d73d71901' : '83dfe30d2ef90c8e', 'hex');
  return new Uint8Array(
    Buffer.concat([
      magic,
      Buffer.from([0x01, 0x08]),
      digest,
      Buffer.from([0x00]),
      tag,
      varuint(payload.length),
      payload,
    ]),
  );
};

const ots = Uint8Array.from(Buffer.from(fe71.otsBase64, 'base64'));

describe('checkStamp, VeilCore’s first stamped batch', () => {
  it('links block 971004 to the pinned checkpoint, with headers from one explorer and the hash from the other', async () => {
    const { fetchImpl, calls } = explorers(both(REAL));
    const r = await checkStamp(fe71.rootHex, ots, { fetchImpl });
    expect(r).toMatchObject({
      status: 'linked',
      height: 971004,
      hash: fe71.headers[0].hash,
      checkpoint: { height: 971005 },
      direction: 'down',
      explorers: ['mempool.space', 'blockstream.info'],
    });
    expect(calls.some((u) => u.startsWith('https://mempool.space/api/blocks/'))).toBe(true);
    expect(calls).toContain('https://blockstream.info/api/block-height/971004');
    const b = bundleHeaders(r, new Date('2026-11-20T00:00:00Z'));
    expect(b).toMatchObject({
      format: 'veilcore/bitcoin-headers/v1',
      height: 971004,
      from: ['mempool.space', 'blockstream.info'],
    });
    expect(b?.headers.map((h) => h.height)).toEqual([971004, 971005]);
  });

  it('when the first explorer is down, the second supplies the headers and the first must still answer', async () => {
    const r = await checkStamp(fe71.rootHex, ots, {
      fetchImpl: explorers({ 'mempool.space': 'down', 'blockstream.info': REAL }).fetchImpl,
    });
    expect(r).toMatchObject({ status: 'unreachable' });
  });

  it('an explorer whose fields don’t hash to the id it gives is caught', async () => {
    const lie = (only?: number) =>
      explorers(both(REAL), (host, b) =>
        host === 'mempool.space' && (only === undefined || b.height === only)
          ? { ...b, merkle_root: '44'.repeat(32) }
          : b,
      ).fetchImpl;
    expect(await checkStamp(fe71.rootHex, ots, { fetchImpl: lie() })).toMatchObject({
      status: 'failed',
      kind: 'headers',
    });
    // The stamp names two blocks; one that checks is enough, and the result names that one.
    expect(await checkStamp(fe71.rootHex, ots, { fetchImpl: lie(971004) })).toMatchObject({
      status: 'linked',
      height: 971005,
    });
  });

  it('two explorers that give different blocks fail the check', async () => {
    const other = new Map(REAL);
    other.set(971004, genesisEra.headers[300]);
    other.set(971005, genesisEra.headers[301]);
    const r = await checkStamp(fe71.rootHex, ots, {
      fetchImpl: explorers({ 'mempool.space': REAL, 'blockstream.info': other }).fetchImpl,
    });
    expect(r).toMatchObject({ status: 'failed', kind: 'headers' });
    if (r.status === 'failed') expect(r.reason).toMatch(/different blocks at height 971004/);
  });

  it('a self-consistent fake block 971004 from both explorers can’t reach the checkpoint', async () => {
    const fake = new Map(REAL);
    for (const h of [971004, 971005]) {
      const b = Buffer.from(REAL.get(h)!, 'hex');
      b.writeUInt32LE(7, 76);
      fake.set(h, b.toString('hex'));
    }
    const r = await checkStamp(fe71.rootHex, ots, { fetchImpl: explorers(both(fake)).fetchImpl });
    expect(r).toMatchObject({ status: 'failed', kind: 'headers' });
    if (r.status === 'failed') expect(r.reason).toMatch(/pinned checkpoint/);
  });

  it('too far from every checkpoint: the explorers’ word, never “linked”', async () => {
    const { fetchImpl } = explorers(both(REAL));
    const r = await checkStamp(fe71.rootHex, ots, {
      fetchImpl,
      checkpoints: [{ height: 990000, hash: 'ab'.repeat(32) }],
    });
    expect(r).toMatchObject({ status: 'explorers', height: 971004, explorers: ['mempool.space', 'blockstream.info'] });
    expect(bundleHeaders(r)).toBeNull();
  });

  it('needs two explorers on different hosts', async () => {
    const r = await checkBlock(971004, [{ height: 971005, hash: fe71.headers[1].hash }], {
      explorers: [EXPLORERS[0], { name: 'again', base: 'https://mempool.space/api/' }],
    });
    expect(r).toMatchObject({ status: 'failed' });
  });
});

describe('checkStamp, other stamps', () => {
  const root = '5a'.repeat(32);

  it('a stamp whose block doesn’t carry its value is a mismatch, even when the block links', async () => {
    const r = await checkStamp(root, bareStamp(root, 'bitcoin', 300), {
      fetchImpl: explorers(both(GENESIS)).fetchImpl,
      checkpoints: [{ height: 438, hash: hashOf(genesisEra.headers[438]) }],
    });
    expect(r).toMatchObject({ status: 'failed', kind: 'mismatch' });
  });

  it('a promise from a stamping server is pending, and asks no explorer', async () => {
    const { fetchImpl, calls } = explorers(both(GENESIS));
    expect(await checkStamp(root, bareStamp(root, 'pending'), { fetchImpl })).toEqual({ status: 'pending' });
    expect(calls).toEqual([]);
  });

  it('a stamp about another root fails without asking anyone', async () => {
    const { fetchImpl, calls } = explorers(both(GENESIS));
    expect(await checkStamp('6b'.repeat(32), bareStamp(root, 'bitcoin', 300), { fetchImpl })).toMatchObject({
      status: 'failed',
      kind: 'stamp',
    });
    expect(calls).toEqual([]);
  });
});

describe('the pins', () => {
  it('every build but the e2e one pins btc-checkpoints.json', () => {
    expect(PINNED).toEqual(pinnedFile.checkpoints);
  });
});

describe('the browser tests’ pins stay in the browser tests', () => {
  const cfg = readFileSync(new URL('../../../../scripts/vercel-config.mjs', import.meta.url), 'utf8');
  it('the deploy refuses a build carrying them', () => {
    const e2e = JSON.parse(readFileSync(new URL('../../e2e-fixtures/btc-e2e-chain.json', import.meta.url), 'utf8')) as {
      checkpoints: { hash: string }[];
    };
    expect(cfg).toContain(`export const E2E_BITCOIN_PIN = '${e2e.checkpoints[0].hash}';`);
  });
  // CI builds the site (`npm run build`) before these tests: its files must not hold them.
  const dist = new URL('../../../dist/assets/', import.meta.url);
  it.skipIf(!existsSync(dist))('the built site (bboard-ui/dist) has no e2e pin in it', () => {
    const pin = /E2E_BITCOIN_PIN = '([0-9a-f]{64})'/.exec(cfg)![1];
    for (const f of readdirSync(dist).filter((n) => n.endsWith('.js')))
      expect(readFileSync(new URL(f, dist), 'utf8').includes(pin), f).toBe(false);
  });
});

describe('the site lets the page reach exactly these explorers', () => {
  it('connect-src (scripts/vercel-config.mjs) names the same two origins as EXPLORERS', () => {
    const cfg = readFileSync(new URL('../../../../scripts/vercel-config.mjs', import.meta.url), 'utf8');
    const m = /export const BITCOIN_EXPLORERS = \[([^\]]*)\]/.exec(cfg);
    expect(m?.[1].split(',').map((x) => x.trim().replace(/'/g, ''))).toEqual(
      EXPLORERS.map((e) => new URL(e.base).origin),
    );
  });
});

describe('fetchHeaders', () => {
  it('fetches a run in pages of ten and checks every block hashes to its id', async () => {
    const { fetchImpl, calls } = explorers(both(GENESIS));
    const hs = [];
    for (let h = 100; h <= 160; h++) hs.push(h);
    const got = await fetchHeaders(EXPLORERS[0], hs, { fetchImpl });
    expect(got.map((x) => x.height)).toEqual(hs);
    expect(got[0].header).toBe(genesisEra.headers[100]);
    expect(calls.length).toBe(7);
  });

  it('an explorer that leaves blocks out is unreachable, not trusted', async () => {
    const holey = new Map(GENESIS);
    holey.delete(105);
    await expect(
      fetchHeaders(EXPLORERS[0], [104, 105, 106], { fetchImpl: explorers(both(holey)).fetchImpl }),
    ).rejects.toThrow(/left some blocks out/);
  });
});
