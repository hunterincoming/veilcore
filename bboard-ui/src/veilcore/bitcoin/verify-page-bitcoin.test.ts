// The evidence bundle's Bitcoin headers: gathered when the bundle is made (bundle.ts
// withBitcoinHeaders), and checked offline by verify.html, whose scripts run here exactly as the
// page runs them (verify-core.js checkBitcoinHeaders with btc-header-chain.js, each as the page
// copies it in). Real data: VeilCore's first stamped batch and blocks 971004 and 971005
// (fixtures/SOURCES.md), against the checkpoints this release pins.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { InclusionProof } from 'veilcore-records';
import { headerChainScript, pinnedCheckpoints, verifyPageHtml } from '../evidence/verify-page';
import { loadPageVerifier } from '../evidence/test-records';
import { BITCOIN_HEADERS_FILE, withBitcoinHeaders, type Gathered } from '../evidence/bundle';
import type { Linked } from '../../../evidence-page/btc-header-chain.js';
import fe71 from './fixtures/veilcore-fe71.json';

type Chain = { verifyLink: (o: unknown) => Promise<{ ok: boolean }> };
type PageVerifier = {
  readStamp: (b: Uint8Array, root: string) => Promise<{ status: string }>;
  checkBitcoinHeaders: (
    stamp: unknown,
    file: unknown,
    pins: unknown,
    chain: Chain | null,
  ) => Promise<(Partial<Linked> & { ok: boolean; reason?: string; from?: string[] }) | null>;
};

// eslint-disable-next-line @typescript-eslint/no-implied-eval
const chain = new Function(`${headerChainScript()}\nreturn BtcHeaderChain;`)() as Chain;
const page = loadPageVerifier<PageVerifier>();
const ots = Uint8Array.from(Buffer.from(fe71.otsBase64, 'base64'));
const headers = fe71.headers.map((h) => ({ height: h.height, header: h.header }));
const file = {
  format: 'veilcore/bitcoin-headers/v1',
  height: 971004,
  headers,
  from: ['mempool.space', 'blockstream.info'],
};

describe('verify.html checks the bundle’s Bitcoin headers offline', () => {
  it('block 971004 holds the stamp’s value, has proof of work, and links to the pinned 971005', async () => {
    const stamp = await page.readStamp(ots, fe71.rootHex);
    const r = await page.checkBitcoinHeaders(stamp, file, pinnedCheckpoints(), chain);
    expect(r).toMatchObject({
      ok: true,
      height: 971004,
      checkpoint: { height: 971005, hash: fe71.headers[1].hash },
      from: ['mempool.space', 'blockstream.info'],
    });
  });

  it('refuses headers changed, for a block the stamp doesn’t name, or for another batch’s stamp', async () => {
    const stamp = await page.readStamp(ots, fe71.rootHex);
    const pins = pinnedCheckpoints();
    const bad = Buffer.from(fe71.headers[0].header, 'hex');
    bad[40] ^= 1;
    expect(
      await page.checkBitcoinHeaders(
        stamp,
        { ...file, headers: [{ height: 971004, header: bad.toString('hex') }, headers[1]] },
        pins,
        chain,
      ),
    ).toMatchObject({ ok: false });
    expect(await page.checkBitcoinHeaders(stamp, { ...file, height: 971003 }, pins, chain)).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/doesn’t name/),
    });
    // Pins the page doesn't have: the bundle can't bring its own.
    expect(
      await page.checkBitcoinHeaders(stamp, file, [{ height: 971005, hash: 'ab'.repeat(32) }], chain),
    ).toMatchObject({ ok: false, reason: expect.stringMatching(/pinned checkpoint/) });
    expect(await page.checkBitcoinHeaders(stamp, null, pins, chain)).toBeNull();
    expect(await page.checkBitcoinHeaders(stamp, 'junk', pins, chain)).toBeNull();
    expect(await page.checkBitcoinHeaders(stamp, { height: 971004, headers: 'junk' }, pins, chain)).toMatchObject({
      ok: false,
    });
  });

  it('the page carries the header check, the release’s pins and the bundle’s headers, as data', () => {
    const html = verifyPageHtml({ record: {} }, ots, { ...file, from: ['</script><script>alert(1)</script>'] });
    expect(html).toContain('var BtcHeaderChain = (function () {');
    expect(html).not.toMatch(/^export /m);
    expect(html).toContain(
      `<script type="application/json" id="veilcore-btc-checkpoints">${JSON.stringify(pinnedCheckpoints())}</script>`,
    );
    expect(html).toContain('id="veilcore-btc-headers">{"format":"veilcore/bitcoin-headers/v1"');
    // A value can't close the script element.
    expect(html).not.toContain('</script><script>alert(1)');
    expect(verifyPageHtml({ record: {} }, ots)).toContain('id="veilcore-btc-headers">null</script>');
  });
});

describe('the bundle gathers the headers when it is made', () => {
  const hashOf = (hex: string) =>
    createHash('sha256')
      .update(createHash('sha256').update(Buffer.from(hex, 'hex')).digest())
      .digest()
      .reverse()
      .toString('hex');
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
  const byHeight = new Map(fe71.headers.map((h) => [h.height, h.header]));
  const explorers = (async (input: string | URL) => {
    const url = new URL(String(input));
    const m = /\/api\/(blocks|block-height)\/(\d+)$/.exec(url.pathname);
    const h = Number(m?.[2]);
    if (m?.[1] === 'block-height') return new Response(hashOf(byHeight.get(h)!));
    const page = [];
    for (let i = h; i > h - 10; i--) if (byHeight.has(i)) page.push(esplora(i, byHeight.get(i)!));
    return Response.json(page);
  }) as typeof fetch;
  const gathered = (status: string): Gathered => ({
    source: 'public-routes',
    registryFirstSeen: null,
    proof: { root: fe71.rootHex } as unknown as InclusionProof,
    proofRefused: false,
    batch: {
      batchId: 'B-20261011-FE71',
      root: fe71.rootHex,
      anchor: null,
      earlierAnchors: null,
      opentimestamps: { available: true, status },
      rfc3161: { available: false },
    },
    ots,
    tst: null,
    attestations: [],
  });

  it('a stamp whose block links goes in as proof/bitcoin-headers.json, named in the batch facts', async () => {
    const g = await withBitcoinHeaders(gathered('bitcoin'), { fetchImpl: explorers });
    expect(g.bitcoinHeaders).toMatchObject({
      format: 'veilcore/bitcoin-headers/v1',
      height: 971004,
      checkpoint: { height: 971005 },
    });
    expect(g.batch?.opentimestamps.headersFile).toBe(BITCOIN_HEADERS_FILE);
  });

  it('a pending stamp, or explorers that can’t be reached, leave the bundle as it was', async () => {
    const pending = gathered('pending');
    expect(await withBitcoinHeaders(pending, { fetchImpl: explorers })).toBe(pending);
    const down = gathered('bitcoin');
    const fail = (async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch;
    expect(await withBitcoinHeaders(down, { fetchImpl: fail })).toBe(down);
    const slow = (() => new Promise<Response>(() => undefined)) as typeof fetch;
    expect(await withBitcoinHeaders(down, { fetchImpl: slow, timeoutMs: 50 })).toBe(down);
  });
});
