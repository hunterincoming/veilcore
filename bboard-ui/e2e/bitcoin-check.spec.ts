// The check page's Bitcoin row (components/verify/useBitcoinCheck.ts, docs/bitcoin-header-check.md),
// in the built site, against the stand-in registry and stand-in block explorers.
//
// No record's proof can fold to a real stamped batch's root, so the e2e build pins real block 438
// (src/e2e-fixtures/btc-e2e-chain.json) and the stand-in explorers serve real blocks 0 to 438 and a
// practice block 439 mined on top of 438 at Bitcoin's minimum difficulty, carrying this test
// batch's stamp. Every check the page makes on it is the real one: the stamp file read, the header
// rebuilt from the explorer's JSON and hashed, the link up from block 438 with the difficulty rule,
// the proof of work, the second explorer's agreement.
//
//   - nothing is asked of any explorer until the visitor presses the button;
//   - linked: "Checked in this browser", in English and Japanese;
//   - the two explorers disagree: nothing rests on Bitcoin;
//   - the explorers can't be reached: the registry's word, and "Try again".
// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test, type Page, type Route } from '@playwright/test';
import { REAL_REGISTRY, expectNoErrors, isolate, json, seeChecks, watch } from './helpers';

test.skip(REAL_REGISTRY, 'these use the stand-in registry');

const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const fixture = read('../src/veilcore/chain/fixtures/anchor-indexer.json') as {
  fingerprint: string;
  proof: Record<string, unknown> & { root: string; batchId: string };
};
const genesisEra = read('../src/veilcore/bitcoin/fixtures/mainnet-0-438.json') as { headers: string[] };
const e2eChain = read('../src/e2e-fixtures/btc-e2e-chain.json') as {
  checkpoints: { height: number; hash: string }[];
  practice: { height: number; header: string };
};

const RECORD = `VEIL-${'B7'.repeat(16)}`;
const HEIGHT = e2eChain.practice.height;
const CHAIN = new Map<number, string>(genesisEra.headers.map((h, i) => [i, h]));
CHAIN.set(HEIGHT, e2eChain.practice.header);

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

/** The batch's stamp file: no steps, one Bitcoin attestation (block HEIGHT), so its value is SHA-256 of the root. */
const stamp = (): Buffer => {
  const digest = createHash('sha256').update(Buffer.from(fixture.proof.root, 'hex')).digest();
  return Buffer.concat([
    Buffer.from('004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294', 'hex'),
    Buffer.from([0x01, 0x08]),
    digest,
    Buffer.from([0x00]),
    Buffer.from('0588960d73d71901', 'hex'),
    Buffer.from([0x02, 0xb7, 0x03]), // the payload's length (2), then 439 as a varuint
  ]);
};

/** A stand-in Esplora explorer serving `chain`; every request is counted. */
const explorer = (chain: Map<number, string>, asked: string[]) => (route: Route) => {
  const url = new URL(route.request().url());
  asked.push(url.href);
  const cors = { 'access-control-allow-origin': '*' };
  const m = /\/api\/(blocks|block-height)\/(\d+)$/.exec(url.pathname);
  if (!m) return route.fulfill({ status: 404, headers: cors, body: 'not found' });
  const h = Number(m[2]);
  if (m[1] === 'block-height') {
    const hex = chain.get(h);
    return hex
      ? route.fulfill({ status: 200, headers: cors, contentType: 'text/plain', body: hashOf(hex) })
      : route.fulfill({ status: 404, headers: cors, body: 'Block not found' });
  }
  const page = [];
  for (let i = h; i > h - 10 && i >= 0; i--) if (chain.get(i)) page.push(esplora(i, chain.get(i)!));
  return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(page) });
};

const openCheck = async (
  page: Page,
  explorers: { mempool?: Map<number, string>; blockstream?: Map<number, string> },
  lang = 'en',
) => {
  const asked: string[] = [];
  await page.addInitScript((l) => localStorage.setItem('veilcore.lang', l), lang);
  await isolate(page, {
    'GET /verify/:record': (route) =>
      json(route, 200, {
        found: true,
        id: RECORD,
        recordFingerprint: fixture.fingerprint,
        anchored: false,
        disclosed: [],
      }),
    [`GET /proof/${fixture.fingerprint}`]: (route) =>
      json(route, 200, {
        ...fixture.proof,
        anchors: [{ kind: 'opentimestamps', status: 'bitcoin', bitcoinBlockHeight: HEIGHT }],
      }),
    [`GET /batches/${fixture.proof.batchId}/root.bin.ots`]: (route) =>
      route.fulfill({ status: 200, contentType: 'application/octet-stream', body: stamp() }),
  });
  if (explorers.mempool) await page.route('https://mempool.space/**', explorer(explorers.mempool, asked));
  if (explorers.blockstream) await page.route('https://blockstream.info/**', explorer(explorers.blockstream, asked));
  await page.goto(`/verify/${RECORD}?fp=${fixture.fingerprint}`);
  await seeChecks(page);
  return asked;
};

const bitcoinRow = (page: Page) => page.locator('[data-who-vouches] [data-who-id="bitcoin"]');

test('linked: block 439’s proof of work and its link to checkpoint 438, checked in this browser', async ({ page }) => {
  const errors = watch(page);
  const asked = await openCheck(page, { mempool: CHAIN, blockstream: CHAIN });
  const row = bitcoinRow(page);
  await expect(row).toHaveAttribute('data-who-row', 'registry');
  await expect(row).toContainText(
    `VeilCore’s registry says it is in Bitcoin block ${HEIGHT}. This page hasn’t checked it on Bitcoin.`,
  );
  await expect(row).toContainText('They see this browser’s internet address and the block number, not the record.');
  // Nothing goes to an explorer before the button.
  expect(asked).toEqual([]);
  await row.getByRole('button', { name: 'Check on Bitcoin' }).click();
  await expect(row).toHaveAttribute('data-who-row', 'checked');
  await expect(row).toContainText(
    `Checked in this browser: block ${HEIGHT}’s proof of work and its link to checkpoint 438, a block this website pins. The block holds this batch’s stamp.`,
  );
  await expect(row.getByRole('button')).toHaveCount(0);
  // One explorer gave the run, the other the hash of block 439.
  expect(asked.some((u) => u.startsWith('https://mempool.space/api/blocks/'))).toBe(true);
  expect(asked).toContain(`https://blockstream.info/api/block-height/${HEIGHT}`);
  await page.locator('[data-who-vouches]').screenshot({ path: test.info().outputPath('bitcoin-linked-en.png') });
  expectNoErrors(errors);
});

test('linked, in Japanese', async ({ page }) => {
  const errors = watch(page);
  await openCheck(page, { mempool: CHAIN, blockstream: CHAIN }, 'ja');
  const row = bitcoinRow(page);
  await row.getByRole('button', { name: 'Bitcoinで確認' }).click();
  await expect(row).toHaveAttribute('data-who-row', 'checked');
  await expect(row).toContainText(`このブラウザで確認しました：ブロック${HEIGHT}のプルーフ・オブ・ワーク`);
  await page.locator('[data-who-vouches]').screenshot({ path: test.info().outputPath('bitcoin-linked-ja.png') });
  expectNoErrors(errors);
});

test('the two explorers give different blocks: nothing rests on Bitcoin', async ({ page }) => {
  const errors = watch(page);
  const other = new Map(CHAIN);
  other.set(HEIGHT, genesisEra.headers[1]);
  await openCheck(page, { mempool: CHAIN, blockstream: other });
  const row = bitcoinRow(page);
  await row.getByRole('button', { name: 'Check on Bitcoin' }).click();
  await expect(row).toHaveAttribute('data-who-row', 'none');
  await expect(row).toContainText(
    'Nothing: the block headers the explorers gave don’t check out, or the two explorers don’t agree.',
  );
  await page.locator('[data-who-vouches]').screenshot({ path: test.info().outputPath('bitcoin-disagree-en.png') });
  expectNoErrors(errors);
});

test('the explorers can’t be reached: the registry’s word, and try again', async ({ page }) => {
  const errors = watch(page);
  await openCheck(page, {});
  const row = bitcoinRow(page);
  await row.getByRole('button', { name: 'Check on Bitcoin' }).click();
  await expect(row).toContainText('This browser couldn’t reach the block explorers to check it.');
  await expect(row).toHaveAttribute('data-who-row', 'registry');
  await expect(row.getByRole('button', { name: 'Try again' })).toBeVisible();
  await page.locator('[data-who-vouches]').screenshot({ path: test.info().outputPath('bitcoin-unreachable-en.png') });
  expectNoErrors(errors);
});
