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
const ANCHOR = {
  chain: 'midnight',
  network: 'preview',
  contractAddress: CONTRACT,
  txHash: TX,
  anchoredAt: '2026-10-11T14:00:00.000Z',
};

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

  test('confirmed on a test network: the transaction, block and time, and a test-network mark, not teal', async ({
    page,
  }) => {
    const errors = watch(page);
    await open(page, answer(fixture.stateHex));
    await expect(page.locator('[data-anchor-check="checked"]')).toContainText(
      `Checked on Midnight: this batch root was written by transaction ${TX} in block 2973563 at 2026-10-11 14:03 UTC.`,
    );
    await expect(page.locator('[data-anchor-check="checked"] [data-fact="checked"]')).toHaveCount(1);
    // The e2e build reads Preview: a test network, so the heading and mark say so.
    await expect(page.locator('h1')).toHaveText('Date stamp checked on a test network: practice data, not a real date');
    await expect(page.locator('[data-checked]')).toHaveAttribute('data-checked', 'yes');
    await expect(page.locator('[data-checked]')).toHaveAttribute('data-test-network', 'yes');
    // Not mainnet's stamp red (#B3173B): a practice date has its own amber mark.
    expect(await page.locator('h1').evaluate((h) => getComputedStyle(h).color)).not.toBe('rgb(179, 23, 59)');
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
    await expect(page.locator('h1')).toHaveText('Date stamp not confirmed on Midnight');
    await expect(page.locator('[data-checked]')).toHaveAttribute('data-checked', 'no');
    expectNoErrors(errors);
  });

  test('no indexer reachable: the date is the registry’s report, and the page says so', async ({ page }) => {
    const errors = watch(page);
    await open(page, (route) => route.abort());
    await expect(page.locator('[data-anchor-check="unreachable"]')).toContainText(
      'Couldn’t reach a Midnight indexer. The date is 2026-10-11 14:00 UTC, as VeilCore’s registry reports it; not checked here.',
    );
    await expect(page.locator('[data-anchor-check="unreachable"] [data-fact="reported"]')).toHaveCount(1);
    await expect(page.locator('body')).toContainText(`The registry reports that root was recorded on`);
    await expect(page.locator('body')).toContainText(
      'Its date: 2026-10-11 14:00 UTC, as VeilCore’s registry reports it.',
    );
    await expect(page.locator('h1')).toHaveText('Date stamp reported by the registry, not checked here');
    await expect(page.locator('[data-checked]')).toHaveAttribute('data-checked', 'no');
    expectNoErrors(errors);
  });
});

// The plant page: its status card, "Date on Midnight" section and History read one look-up.
const PLANT = {
  id: RECORD,
  strainName: 'E2E Dated Plant',
  bredBy: 'E2E',
  dateCreated: '2026-10-01',
  notes: 'Practice data.',
  loggedAt: Date.UTC(2026, 9, 10),
  licenseIds: [],
  nonce: '11'.repeat(32),
  recordFingerprint: fixture.fingerprint,
};

const openPlant = async (page: Page, indexer: (route: Route) => Promise<void>) => {
  await page.addInitScript(() => {
    localStorage.setItem('veilcore.holder.v1', 'ab'.repeat(32));
    localStorage.setItem('veilcore.role.v1', 'breeder');
  });
  await isolate(page, {
    'GET /api/records': (route) => json(route, 200, [PLANT]),
    [`GET /proof/${fixture.fingerprint}`]: (route) => json(route, 200, { ...fixture.proof, anchor: ANCHOR }),
  });
  await page.route(INDEXER, indexer);
  await page.goto(`/record/${RECORD}`);
  await expect(page.getByRole('heading', { name: PLANT.strainName })).toBeVisible();
};

test.describe('the plant page’s date, looked up on Midnight', () => {
  test.skip(REAL_REGISTRY, 'these use the stand-in registry');

  test('checked: ✓ on the status card, the same answer in Date on Midnight and History, one look-up', async ({
    page,
  }) => {
    const errors = watch(page);
    let asked = 0;
    await openPlant(page, (route) => {
      if ((route.request().postData() ?? '').includes('VEILCORE_ANCHOR_CHECK')) asked++;
      return answer(fixture.stateHex)(route);
    });
    const row = page.locator('[data-status-row="Record dated"]');
    await expect(row).toHaveAttribute('data-mark', 'done');
    await expect(row).toContainText('2026-10-11 UTC — checked on Midnight');
    await expect(row).toContainText('On a test network: practice data');
    await page.getByRole('button', { name: 'Technical details' }).click();
    await expect(page.locator('[data-anchor-check="checked"]')).toContainText('Checked on Midnight');
    await expect(page.getByText('Date stamp checked on a test network', { exact: true })).toBeVisible();
    await expect(page.locator('body')).toContainText('Midnight Preview (test network)');
    await expect(page.locator('body')).not.toContainText('midnight preview');
    expect(asked).toBe(1);
    expectNoErrors(errors);
  });

  test('another root on Midnight: ⊗, never a green date', async ({ page }) => {
    const errors = watch(page);
    await openPlant(page, answer(fixture.otherStateHex));
    const row = page.locator('[data-status-row="Record dated"]');
    await expect(row).toHaveAttribute('data-mark', 'failed');
    await expect(row).toContainText('date stamp not confirmed on Midnight');
    await expect(row).toContainText('That transaction wrote a different batch root');
    expectNoErrors(errors);
  });

  test('Midnight unreachable: ○ and the registry’s date, labelled as its report', async ({ page }) => {
    const errors = watch(page);
    await openPlant(page, (route) => route.abort());
    const row = page.locator('[data-status-row="Record dated"]');
    await expect(row).toHaveAttribute('data-mark', 'reported');
    await expect(row).toContainText('2026-10-11 UTC (VeilCore’s registry’s report)');
    await expect(row).toContainText('Couldn’t reach Midnight to check it.');
    await page.getByRole('button', { name: 'Technical details' }).click();
    await expect(page.getByText('Date stamp reported by the registry', { exact: true })).toBeVisible();
    expectNoErrors(errors);
  });
});
