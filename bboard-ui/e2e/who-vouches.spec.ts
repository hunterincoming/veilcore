// "What each fact rests on" (components/verify/who-vouches.ts), in the built site, against the
// stand-in registry and a stand-in indexer:
//   - a check link that carries its proof code, dated and checked on Midnight here: the date and
//     the proof code rest on this page's own checks, the name on the holder's word, no lab;
//   - the same record's link without its proof code: the proof code is the registry's word;
//   - a document's check page: the file row is the checker's own device, and says the file is
//     the one sealed only once a picked file matched (and that it isn't, for another file).
// SPDX-License-Identifier: Apache-2.0
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test, type Page, type Route } from '@playwright/test';
import {
  REAL_REGISTRY,
  expectNoErrors,
  holdVaultKey,
  isolate,
  json,
  newVaultKey,
  plainRowRefusal,
  watch,
} from './helpers';

test.skip(REAL_REGISTRY, 'these use the stand-in registry');

// The batch root and the indexer's answer: the same real bytes anchor-check.spec.ts uses.
const fixture = JSON.parse(
  readFileSync(new URL('../src/veilcore/chain/fixtures/anchor-indexer.json', import.meta.url), 'utf8'),
) as { fingerprint: string; proof: Record<string, unknown>; stateHex: string };

const RECORD = `VEIL-${'5D'.repeat(16)}`;
const TX = 'e13c88f5a2fb38cf4feb08d7188d1c0dc3c575a4fb4dba3dbacb2f601896bcbf';
const CONTRACT = '00'.repeat(32);
const ANCHOR = {
  chain: 'midnight',
  network: 'preview',
  contractAddress: CONTRACT,
  txHash: TX,
  anchoredAt: '2026-10-11T14:00:00.000Z',
};

/** The indexer confirms the batch root was written by that transaction. */
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

const openCheck = async (page: Page, query: string) => {
  await isolate(page, {
    'GET /verify/:record': (route) =>
      json(route, 200, {
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
  await page.goto(`/verify/${RECORD}${query}`);
};

/** One row of the box, by the fact it is about. */
const row = (page: Page, fact: string) => page.locator('[data-who-vouches] [data-who-row]').filter({ hasText: fact });

test('a link with its proof code: the date and the code rest on this page’s own checks', async ({ page }) => {
  const errors = watch(page);
  await openCheck(page, `?fp=${fixture.fingerprint}`);
  const box = page.locator('[data-who-vouches]');
  await expect(box.getByRole('heading', { name: 'What each fact rests on' })).toBeVisible();
  await expect(row(page, 'The date')).toHaveAttribute('data-who-row', 'checked');
  // The e2e build reads a test network: checked there, and said to be practice.
  await expect(row(page, 'The date')).toContainText('A Midnight test network. This page checked it there itself');
  await expect(row(page, 'The proof code')).toHaveAttribute('data-who-row', 'checked');
  await expect(row(page, 'The proof code')).toContainText('it matches the one in the link you were sent');
  await expect(row(page, 'The name and details')).toHaveAttribute('data-who-row', 'holder');
  await expect(row(page, 'A laboratory')).toContainText('This page hasn’t checked any laboratory’s signature.');
  // Never VeilCore's word for a lab, a name or a plant.
  await expect(box).not.toContainText(/VeilCore (vouches|confirms|certifies)/);
  expectNoErrors(errors);
});

test('a link without its proof code: the code is the registry’s word, never this page’s match', async ({ page }) => {
  const errors = watch(page);
  await openCheck(page, '');
  await expect(page.locator('[data-who-vouches]')).toBeVisible();
  await expect(row(page, 'The proof code')).toHaveAttribute('data-who-row', 'registry');
  await expect(row(page, 'The proof code')).toContainText('The link you were sent carries no proof code');
  // Whatever Midnight says of the batch, only the registry puts this record in it.
  await expect(row(page, 'The date')).toHaveAttribute('data-who-row', 'registry');
  await expect(page.locator('[data-who-vouches] [data-who-row="checked"]')).toHaveCount(0);
  expectNoErrors(errors);
});

// ---- a document's check page ---------------------------------------------------------------

type Rec = Record<string, unknown> & { id: string };
const PERMIT = Buffer.from(`Practice permit (test data) ${Date.now()}\n`);
const OTHER = Buffer.from(`Not the permit (test data) ${Date.now()}\n`);

test('a document: the file row waits for a file, then says whether the picked one is the one sealed', async ({
  page,
  context,
}) => {
  const errors = watch(page);
  const held: { records: Rec[] } = { records: [] };
  await page.addInitScript((holder) => {
    localStorage.setItem('veilcore.holder.v1', holder);
    localStorage.setItem('veilcore.role.v1', 'breeder');
  }, randomBytes(32).toString('hex'));
  await holdVaultKey(page, newVaultKey());
  await isolate(page, {
    'GET /api/records': (route) => json(route, 200, held.records),
    'PUT /api/records': (route, _url, body) => {
      const refusal = plainRowRefusal(body);
      if (refusal) return json(route, 400, { error: refusal });
      const sent = body as Rec[];
      const ids = new Set(sent.map((r) => r.id));
      held.records = [...sent, ...held.records.filter((r) => !ids.has(r.id))];
      return json(route, 200, { ok: true });
    },
    'GET /api/licenses': (route) => json(route, 200, []),
    'PUT /api/licenses': (route) => json(route, 200, { ok: true }),
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
  });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  // Seal a one-file document and copy its check link.
  await page.goto('/documents/new');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'permit.pdf', mimeType: 'application/pdf', buffer: PERMIT });
  await page.getByLabel('Title').fill('Practice permit (who vouches)');
  await page.getByLabel('Held by').fill('E2E association (test data)');
  await page.getByRole('button', { name: 'Seal it' }).click();
  await expect(page.locator('[data-document-page]')).toBeVisible();
  await page.getByRole('button', { name: 'Copy link: proves you had this file' }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());

  // As a stranger: nothing dates it on the stand-in, and no file picked yet.
  await page.goto(link.replace(/^https?:\/\/[^/]+/, ''));
  const box = page.locator('[data-who-vouches]');
  await expect(box).toBeVisible();
  await expect(row(page, 'The proof code')).toContainText('worked out here from what the link carries');
  await expect(row(page, 'The file')).toHaveAttribute('data-who-row', 'none');
  await expect(row(page, 'The file')).toContainText('once you pick the file below');
  await expect(row(page, 'A laboratory')).toHaveCount(0);

  const picker = page.locator('[data-document-check] input[type=file]');
  await picker.setInputFiles({ name: 'other.pdf', mimeType: 'application/pdf', buffer: OTHER });
  await expect(row(page, 'The file')).toContainText('is not the one sealed');
  await expect(row(page, 'The file')).toHaveAttribute('data-who-row', 'none');

  await picker.setInputFiles({ name: 'sent.pdf', mimeType: 'application/pdf', buffer: PERMIT });
  await expect(row(page, 'The file')).toContainText('the file you picked is the one sealed');
  await expect(row(page, 'The file')).toHaveAttribute('data-who-row', 'checked');
  expectNoErrors(errors);
});
