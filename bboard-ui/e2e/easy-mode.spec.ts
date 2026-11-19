// Easy mode, step 1 (easy-mode review, 19 Nov), in the built site:
//   - a record's check page answers in one plain line first, then what a date doesn't show, with
//     the checks folded under "See the checks" (open by themselves when the link can't be
//     checked), and a way to make a record of your own at the bottom;
//   - "no record" only when the registry says so; no answer is "couldn't check", with Try again;
//   - a record that isn't found has a way forward: ask again, or check another ID or link;
//   - an iPhone Home Screen launch with nothing stored says nothing is lost, before anything else;
//   - a partner link that can't be used isn't a dead end.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { expect, test, type Page, type Route } from '@playwright/test';
import { REAL_REGISTRY, expectNoErrors, isolate, json, seeChecks, watch } from './helpers';

test.skip(REAL_REGISTRY, 'these use the stand-in registry');

const fixture = JSON.parse(
  readFileSync(new URL('../src/veilcore/chain/fixtures/anchor-indexer.json', import.meta.url), 'utf8'),
) as { fingerprint: string; proof: Record<string, unknown>; stateHex: string };

const RECORD = `VEIL-${'5D'.repeat(16)}`;
const MISSING = `VEIL-${'AB'.repeat(16)}`;
const DOWN = `VEIL-${'CD'.repeat(16)}`;
const TX = 'e13c88f5a2fb38cf4feb08d7188d1c0dc3c575a4fb4dba3dbacb2f601896bcbf';
const CONTRACT = '00'.repeat(32);
const ANCHOR = {
  chain: 'midnight',
  network: 'preview',
  contractAddress: CONTRACT,
  txHash: TX,
  anchoredAt: '2026-10-11T14:00:00.000Z',
};

const indexer = (route: Route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify({
      data: {
        byHash: [
          {
            hash: TX,
            block: { height: 2973563, timestamp: Date.UTC(2026, 9, 11, 14, 3, 7) },
            identifiers: ['ab'.repeat(32)],
            transactionResult: { status: 'SUCCESS' },
            contractActions: [{ address: CONTRACT, state: fixture.stateHex, entryPoint: 'anchorBatch' }],
          },
        ],
        byId: [],
      },
    }),
  });

const registry = async (page: Page) => {
  await isolate(page, {
    'GET /verify/:record': (route, url) =>
      url.pathname.endsWith(MISSING)
        ? json(route, 404, { found: false })
        : url.pathname.endsWith(DOWN)
          ? route.fulfill({ status: 502, contentType: 'text/html', body: '<h1>Bad gateway</h1>' })
          : json(route, 200, {
              found: true,
              id: RECORD,
              recordFingerprint: fixture.fingerprint,
              anchored: true,
              anchor: { network: 'preview', txHash: TX },
              disclosed: [],
            }),
    [`GET /proof/${fixture.fingerprint}`]: (route) => json(route, 200, { ...fixture.proof, anchor: ANCHOR }),
  });
  await page.route('https://indexer.preview.midnight.network/**', indexer);
};

test('a check page answers in one line first; the checks are one tap away', async ({ page }) => {
  const errors = watch(page);
  await registry(page);
  await page.goto(`/verify/${RECORD}?fp=${fixture.fingerprint}`);
  const verdict = page.locator('[data-verdict]');
  // The e2e build reads a test network: checked there, and said to be practice, never "Dated".
  await expect(verdict).toHaveAttribute('data-verdict', 'warn', { timeout: 30_000 });
  await expect(verdict).toContainText(/^Practice date October 11, 2026, on a test network: not a real date\./);
  await expect(verdict).toContainText('All checks passed in your browser.');
  // The answer comes before anything else in the page's main part, then what a date doesn't show.
  const main = page.locator('main');
  const first = await main.locator('[data-verdict], [data-dated-not-origin], [data-specimen-sheet]').all();
  expect(await first[0].getAttribute('data-verdict')).toBe('warn');
  expect(await first[1].getAttribute('data-dated-not-origin')).toBe('');
  // The checks are folded, and every one of them is there.
  await expect(page.locator('[data-checks="closed"]')).toHaveCount(1);
  await expect(page.locator('[data-who-vouches]')).toBeHidden();
  await seeChecks(page);
  await expect(page.locator('[data-who-vouches]')).toBeVisible();
  await expect(page.getByText(/Checked in this browser: this proof code is in batch/)).toBeVisible();
  // And a record of your own, at the bottom.
  await expect(page.locator('[data-make-your-own]')).toContainText('Want a date like this for your own plants or animals?');
  await expect(page.locator('[data-make-your-own]').getByRole('link', { name: 'Make a record, free' })).toHaveAttribute(
    'href',
    '/new',
  );
  expectNoErrors(errors);
});

test('a link without its proof code says it can’t be checked, and its checks open by themselves', async ({ page }) => {
  await registry(page);
  await page.goto(`/verify/${RECORD}`);
  await expect(page.locator('[data-verdict]')).toHaveAttribute('data-verdict', 'warn');
  await expect(page.locator('[data-verdict]')).toContainText(
    'This link doesn’t carry the record’s proof code, so your browser can’t tell whether VeilCore’s server answered about this record.',
  );
  await expect(page.locator('[data-checks="open"]')).toHaveCount(1);
  await expect(page.locator('[data-see-checks]')).toHaveAttribute('aria-expanded', 'true');
  // Closed by hand, then on to another record that can't be checked either, inside the app:
  // its checks open by themselves again (review of PR #140).
  await page.locator('[data-see-checks]').click();
  await expect(page.locator('[data-checks="closed"]')).toHaveCount(1);
  const other = `VEIL-${'7E'.repeat(16)}`;
  await page.evaluate((path) => {
    history.pushState({}, '', path);
    dispatchEvent(new PopStateEvent('popstate'));
  }, `/verify/${other}`);
  await expect(page).toHaveURL(new RegExp(`/verify/${other}$`));
  await expect(page.locator('[data-verdict]')).toHaveAttribute('data-verdict', 'warn');
  await expect(page.locator('[data-checks="open"]')).toHaveCount(1);
});

test('not found: a way forward; no answer: "couldn’t check", never "no record"', async ({ page }) => {
  await registry(page);
  await page.goto(`/verify/${MISSING}`);
  const card = page.locator('[data-verify-not-found]');
  await expect(card).toContainText(`No record found for ${MISSING}`);
  await expect(card).toContainText('Ask the person who sent it to send the link again.');
  // Something that isn't a record ID or a check link opens nothing, and isn't shown back.
  const box = card.locator('[data-another-record] input');
  await box.fill('CALL-1-800-SCAM');
  await card.getByRole('button', { name: 'Check' }).click();
  await expect(card).toContainText('That isn’t a record ID or a check link.');
  await expect(page).toHaveURL(new RegExp(`/verify/${MISSING}$`));
  // A check link opens that record's page, on this site, whatever host it was written with.
  await box.fill(`https://elsewhere.example/verify/${RECORD}?fp=${fixture.fingerprint}`);
  await card.getByRole('button', { name: 'Check' }).click();
  await expect(page).toHaveURL(new RegExp(`/verify/${RECORD}\\?fp=${fixture.fingerprint}$`));
  await expect(page.locator('[data-specimen-sheet]')).toBeVisible();
  // A document's check link opens that page here, its # part kept (nothing in it is sent).
  await page.goto(`/verify/${MISSING}`);
  await page.locator('[data-another-record] input').fill('https://elsewhere.example/check-document#d=abc');
  await page.locator('[data-another-record]').getByRole('button', { name: 'Check' }).click();
  await expect(page).toHaveURL(/\/check-document#d=abc$/);

  await page.goto(`/verify/${DOWN}`);
  await expect(page.locator('[data-verify-unreachable]')).toContainText('Couldn’t check this record right now');
  await expect(page.getByText(/No record found/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('an iPhone Home Screen launch with nothing stored: nothing is lost, and how to bring records in', async ({
  page,
}) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
  await isolate(page);
  await page.goto('/records');
  const start = page.locator('[data-home-screen-start]');
  await expect(start.getByRole('heading', { name: 'Open your records' })).toBeVisible();
  await expect(start).toContainText(
    'This is VeilCore on your Home Screen. It keeps its own storage, separate from Safari.',
  );
  await expect(start).toContainText('Nothing has been lost. Bring your records in with your backup file.');
  await expect(start.getByRole('link', { name: 'Bring in my records' })).toHaveAttribute('href', '/restore');
  // Never over the restore page it points to.
  await start.getByRole('link', { name: 'Bring in my records' }).click();
  await expect(page).toHaveURL(/\/restore$/);
  await expect(page.locator('[data-home-screen-start]')).toHaveCount(0);
  // Someone new starts without records.
  await page.goto('/records');
  await page.locator('[data-home-screen-start]').getByRole('button', { name: 'New to VeilCore? Start here' }).click();
  await expect(page.locator('[data-home-screen-start]')).toHaveCount(0);
  await expect(page.locator('main h1')).toBeVisible();
});

test('a Home Screen app that keeps a lab’s key, and no records, opens its page, not the restore screen', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { value: true });
    localStorage.setItem('veilcore.attester.v1', '{}');
  });
  await isolate(page);
  await page.goto('/lab/results');
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('[data-home-screen-start]')).toHaveCount(0);
});

test('the same page in a browser tab, or with records here, is the page itself', async ({ page }) => {
  await isolate(page);
  await page.goto('/records');
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('[data-home-screen-start]')).toHaveCount(0);
});

test('a partner link that can’t be used is not a dead end', async ({ page }) => {
  await isolate(page);
  await page.goto('/intake');
  await expect(page.locator('[data-intake-refused]')).toContainText('It doesn’t say where to send you back.');
  const ways = page.locator('[data-intake-ways]');
  await expect(ways.getByRole('link', { name: 'Paste a code or link' })).toHaveAttribute('href', '/records?paste');
  await expect(ways.getByRole('link', { name: 'Go to your records' })).toHaveAttribute('href', '/records');
  await expect(ways.getByRole('link', { name: 'I run a lab: lab results' })).toHaveAttribute('href', '/lab/results');
});
