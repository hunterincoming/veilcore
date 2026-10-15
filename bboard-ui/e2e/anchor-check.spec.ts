// The check page looks the batch root's date stamp up on Midnight itself
// (src/veilcore/chain/anchor-check.ts), in the built site, against a stand-in indexer:
// confirmed, a transaction that wrote another root, and no indexer reachable.
//
// The stand-in answers in the indexer v4 shape; the contract states in it are the real
// bytes VeilCore's compiled contract leaves after anchorBatch (fixtures/anchor-indexer.json,
// checked in src/veilcore/chain/anchor-check.test.ts). The e2e build is a Preview build
// with the all-zero demo contract (package.json e2e:build), so that is the contract the
// stand-in names and Preview's public indexer is the address it answers at.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { expect, test, type Page, type Route } from '@playwright/test';
import { REAL_REGISTRY, expectNoErrors, isolate, json, watch } from './helpers';

const fixture = JSON.parse(
  readFileSync(new URL('../src/veilcore/chain/fixtures/anchor-indexer.json', import.meta.url), 'utf8'),
) as { fingerprint: string; proof: Record<string, unknown>; root: string; stateHex: string; otherStateHex: string };

const RECORD = `VEIL-${'3C'.repeat(16)}`;
const TX = 'e13c88f5a2fb38cf4feb08d7188d1c0dc3c575a4fb4dba3dbacb2f601896bcbf';
const CONTRACT = '00'.repeat(32);
const INDEXER = 'https://indexer.preview.midnight.network/**';
const ANCHOR = { chain: 'midnight', network: 'preview', contractAddress: CONTRACT, txHash: TX };

const tx = (stateHex: string) => ({
  hash: TX,
  block: { height: 2973563, timestamp: Date.UTC(2026, 9, 11, 14, 3, 7) },
  identifiers: ['ab'.repeat(32)],
  transactionResult: { status: 'SUCCESS' },
  contractActions: [{ address: CONTRACT, state: stateHex, entryPoint: 'anchorBatch' }],
});

const open = async (page: Page, indexer: (route: Route) => Promise<void>) => {
  await isolate(page, {
    'GET /verify/:record': (route) =>
      json(route, 200, {
        found: true,
        id: RECORD,
        cultivar: 'E2E Dated Plant',
        recordFingerprint: fixture.fingerprint,
        anchored: true,
        anchor: { network: 'preview', txHash: TX },
        disclosed: [],
      }),
    [`GET /proof/${fixture.fingerprint}`]: (route) => json(route, 200, { ...fixture.proof, anchor: ANCHOR }),
  });
  // Registered after isolate, so it is asked first (Playwright runs the latest route first).
  await page.route(INDEXER, indexer);
  await page.goto(`/verify/${RECORD}?fp=${fixture.fingerprint}`);
};

const answer = (stateHex: string) => (route: Route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify({ data: { byHash: [tx(stateHex)], byId: [] } }),
  });

test.describe('the date stamp, looked up on Midnight', () => {
  test.skip(REAL_REGISTRY, 'these use the stand-in registry');

  test('confirmed: the transaction, block and time, and the mark turns teal', async ({ page }) => {
    const errors = watch(page);
    await open(page, answer(fixture.stateHex));
    await expect(page.locator('[data-anchor-check="checked"]')).toContainText(
      `Checked on Midnight: this batch root was written by transaction ${TX} in block 2973563 at 2026-10-11 14:03 UTC.`,
    );
    await expect(page.locator('[data-anchor-check="checked"] [data-fact="checked"]')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('In a dated batch: the date is checked on Midnight');
    await expect(page.locator('[data-checked]')).toHaveAttribute('data-checked', 'yes');
    await expect(page.locator('[data-anchor-checked]')).toHaveAttribute('data-anchor-checked', 'yes');
    await expect(page.locator('body')).not.toContainText('This page has not looked it up');
    expectNoErrors(errors);
  });

  test('a transaction that wrote another root: a plain failure, the mark stays grey', async ({ page }) => {
    const errors = watch(page);
    await open(page, answer(fixture.otherStateHex));
    await expect(page.locator('[data-anchor-check="failed"]')).toContainText(
      'Not confirmed on Midnight: that transaction wrote a different batch root',
    );
    await expect(page.locator('[data-anchor-check="failed"] [data-fact="failed"]')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('In a batch: its date stamp could not be confirmed on Midnight');
    await expect(page.locator('[data-checked]')).toHaveAttribute('data-checked', 'no');
    expectNoErrors(errors);
  });

  test('no indexer reachable: the date is the registry’s report, and the page says so', async ({ page }) => {
    const errors = watch(page);
    await open(page, (route) => route.abort());
    await expect(page.locator('[data-anchor-check="unreachable"]')).toContainText(
      'Couldn’t reach a Midnight indexer; the date shown is VeilCore’s registry’s report.',
    );
    await expect(page.locator('[data-anchor-check="unreachable"] [data-fact="reported"]')).toHaveCount(1);
    await expect(page.locator('body')).toContainText(`The registry reports that root was recorded on`);
    await expect(page.locator('h1')).toHaveText(
      'In a dated batch: the date is the registry’s report, not checked here',
    );
    await expect(page.locator('[data-checked]')).toHaveAttribute('data-checked', 'no');
    expectNoErrors(errors);
  });
});
