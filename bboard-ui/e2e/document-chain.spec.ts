// A production chain as document records (docs/document-chain.md), in the browser against the
// stand-in registry: a source record, a grow batch about it (kept on this device only, with a
// sheet made in the browser as its file), a harvest lot about the batch, and a lab report about
// the lot. Then the lab report's link with its chain, opened as a stranger would: each record's
// page is reached from the one before, and each shows its own date. The batch's page offers
// "Prove one number" only after its holder turns it on. The registry is sent nothing typed for
// the batch. All files and records are test data.
// SPDX-License-Identifier: Apache-2.0
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { expect, test, type Page, type Route } from '@playwright/test';
import { buildBatch, canonicalise } from 'veilcore-records';
import {
  API,
  REAL_REGISTRY,
  expectNoErrors,
  holdVaultKey,
  isolate,
  json,
  newVaultKey,
  saveAndCheckBackup,
  sealedRecordRow,
  watch,
  type Handler,
} from './helpers';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

type Row = Record<string, unknown> & { id: string };
const HOLDER = randomBytes(32).toString('hex');
const VAULT = newVaultKey();
const SOURCE_ID = `VEIL-${randomBytes(8).toString('hex').toUpperCase()}`;
const SOURCE_NAME = 'Clone line 7 (chain test)';
const HELD_BY = 'E2E grower (chain test)';
const SITE_LABEL = 'Room 2 (chain test)';
const VARIETY = 'Line 7 selection (chain test)';
const LOT_FILE = Buffer.from(`Harvest lot sheet (test data) ${Date.now()}\n`);
const COA_FILE = Buffer.from(`Certificate of analysis (test data) ${Date.now()}\n`);
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const BATCH = 'B-20261116-CHAIN';

/** The source record: a plant record this holder already has, as the registry keeps it (locked). */
const sourceRow = (): Row & { holder: string } => {
  const committed = {
    breedingMethod: '',
    bredBy: HELD_BY,
    dateCreated: '2026-01-01',
    loggedAt: Date.now() - 86_400_000,
    nonce: randomBytes(16).toString('hex'),
    notes: '',
    parents: [],
    photoFingerprints: [],
    refId: '',
    strainName: SOURCE_NAME,
  };
  const recordFingerprint = createHash('sha256').update(canonicalise(committed)).digest('hex');
  return {
    ...(sealedRecordRow({ id: SOURCE_ID, ...committed, recordFingerprint }, VAULT) as Row),
    holder: HOLDER,
  };
};

type Seen = { method: string; path: string; text: string };

/** The stand-in registry: it keeps the rows it is sent and every request, to be read back at the end. */
const standIn = async (
  page: Page,
  shared?: { rows: (Row & { holder: string })[]; handlers: Record<string, Handler> },
) => {
  const rows = shared?.rows ?? [sourceRow()];
  const seen: Seen[] = [];
  const dating: Row[] = [];
  const holderOf = (route: Route) => route.request().headers()['x-holder-key'] ?? '';
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (url.origin !== new URL(API).origin) return;
    seen.push({ method: r.method(), path: url.pathname, text: `${r.url()}\n${r.postData() ?? ''}` });
  });
  const handlers: Record<string, Handler> = { ...(shared?.handlers ?? {}) };
  Object.assign(handlers, {
    'GET /api/records': (route: Route) =>
      json(
        route,
        200,
        rows.filter((r) => r.holder === holderOf(route)).map(({ holder: _h, ...r }) => r),
      ),
    'PUT /api/records/dating': (route: Route, _url: URL, body: unknown) => {
      const dated: string[] = [];
      for (const r of body as Row[]) {
        dating.push(r);
        if (!rows.find((x) => x.id === r.id)) rows.push({ ...r, bodyPending: true, holder: holderOf(route) });
        dated.push(r.id);
      }
      return json(route, 200, { ok: true, dated });
    },
    // The locked copy of an ordinary record takes the place of its dating row.
    'PUT /api/records': (route: Route, _url: URL, body: unknown) => {
      for (const r of body as Row[]) {
        const at = rows.findIndex((x) => x.id === r.id);
        const row = { ...r, holder: holderOf(route) };
        if (at >= 0) rows[at] = { recordFingerprint: rows[at].recordFingerprint, ...row };
        else rows.push(row);
      }
      return json(route, 200, { ok: true });
    },
    'GET /api/licenses': (route: Route) => json(route, 200, []),
    'PUT /api/licenses': (route: Route) => json(route, 200, { ok: true }),
    'GET /api/disclosures': (route: Route) => json(route, 200, []),
    'GET /transfers/sent': (route: Route) => json(route, 200, { transfers: [] }),
    // The public check page for a record ID: the registry says which proof code it holds for it.
    'GET /verify/:record': (route: Route, url: URL) => {
      const id = decodeURIComponent(url.pathname.split('/')[2] ?? '');
      const r = rows.find((x) => x.id === id);
      if (!r) return json(route, 404, { found: false });
      return json(route, 200, {
        found: true,
        id,
        recordFingerprint: r.recordFingerprint,
        keyBound: false,
        disclosed: [],
      });
    },
  } satisfies Record<string, Handler>);
  await isolate(page, handlers);
  return {
    rows,
    seen,
    dating,
    handlers,
    /** The anchoring job's run: every proof code held goes into one batch, and its anchor is recorded. */
    sealAndAnchor: async () => {
      const batch = await buildBatch(
        rows.map((r) => r.recordFingerprint as string),
        BATCH,
      );
      for (const [commitment, proof] of Object.entries(batch.proofs)) {
        const anchored = {
          ...(proof as object),
          anchor: {
            chain: 'midnight',
            network: 'preview',
            contractAddress: '7a'.repeat(32),
            txHash: 'ab'.repeat(32),
            blockHeight: 4242,
            anchoredAt: new Date().toISOString(),
          },
        };
        handlers[`GET /proof/${commitment}`] = (route) => json(route, 200, anchored);
      }
    },
  };
};

/** Pick one record in "What it’s about" on the sealing screen. */
const pickAbout = async (page: Page, name: RegExp) => {
  await page.getByLabel('What it’s about (optional)').click();
  await page.getByRole('option', { name }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
};

test('a chain of records: source, grow batch, harvest lot, lab report, followed from the lab report’s link', async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(300_000);
  const errors = watch(page);
  await page.addInitScript((holder) => {
    localStorage.setItem('veilcore.holder.v1', holder);
    localStorage.setItem('veilcore.role.v1', 'breeder');
  }, HOLDER);
  await holdVaultKey(page, VAULT);
  const reg = await standIn(page);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  // 0. The source record is this holder's already.
  await page.goto('/records');
  await expect(page.getByText(SOURCE_NAME).first()).toBeVisible({ timeout: 30_000 });

  // 1. A grow batch about it, kept on this device only, with a sheet made here as its file.
  await page.goto('/documents/new');
  await expect(page.getByRole('heading', { name: 'Seal a document' })).toBeVisible();
  await expect(page.locator('[data-chain-start]')).toHaveAttribute('data-chain-start', 'plain');
  await page.locator('[data-chain-start-kind="grow-batch"]').click();
  await expect(page.locator('[data-chain-start]')).toHaveAttribute('data-chain-start', 'grow-batch');
  // Its numbers: the form is chosen, and says counts go here and nowhere else.
  const numbers = page.locator('[data-chain-numbers]');
  await expect(numbers).toContainText('Counts and weights go here and nowhere else');
  await numbers.locator('input[data-slot="0"]').fill('120');
  await numbers.locator('input[data-slot="1"]').fill('80');
  await numbers.locator('input[data-slot="2"]').fill('12.50');
  await page.getByLabel('Batch ID').fill('B-0042');
  await page.locator('input[type=date]').fill('2026-11-10');
  await page.locator('input[data-chain-site]').fill(SITE_LABEL);
  await page.locator('input[data-chain-variety]').fill(VARIETY);
  await pickAbout(page, /Clone line 7/);
  await page.getByLabel('Held by').fill(HELD_BY);
  // A file is still needed: nothing is sealed without one.
  await page.getByRole('button', { name: 'Seal it' }).click();
  await expect(page.locator('[data-document-missing]')).toHaveText('Add the file first.');
  // No batch sheet of their own: one is made from what was typed, saved, and added as the file.
  const sheetDownload = page.waitForEvent('download');
  await page.locator('[data-chain-sheet-make]').click();
  const sheetPath = await (await sheetDownload).path();
  const SHEET = fs.readFileSync(sheetPath);
  expect(SHEET.toString('utf8')).toBe(
    [
      'VeilCore batch sheet, version 1',
      'Made in the browser from what the holder typed. It holds no counts and no weights.',
      'Kind: grow-batch',
      'ID: B-0042',
      'Date: 2026-11-10',
      `Site: ${SITE_LABEL}`,
      `Variety: ${VARIETY}`,
      `Held by: ${HELD_BY}`,
      `About: ${SOURCE_NAME}`,
      '',
    ].join('\n'),
  );
  await expect(page.locator('[data-chain-sheet-made]')).toContainText('Keep that file');
  await expect(page.locator('[data-picked-file]')).toHaveCount(1);
  await page.getByLabel('Keep this record on this device and in my backup only').check();
  await page.getByRole('button', { name: 'Seal it' }).click();
  await expect(page.locator('[data-device-only-backup-step]')).toBeVisible();
  const batchId = await page.evaluate((holder) => {
    const kept = JSON.parse(localStorage.getItem('veilcore.device-only.v1') ?? '{}') as Record<string, object>;
    return Object.keys(kept[holder] ?? {})[0] ?? '';
  }, HOLDER);
  expect(batchId).toMatch(/^VEIL-[0-9A-F]+$/);
  await page.goto(`/record/${batchId}`);
  await expect(page.getByRole('heading', { name: 'Grow batch B-0042' })).toBeVisible();
  await page.locator('[data-device-only]').getByRole('link', { name: 'Save a backup' }).click();
  await expect(page).toHaveURL(/\/backup$/);
  await saveAndCheckBackup(page);

  // Its page: what kind it is comes from the sealed form, and "About" links to the source's check page.
  await page.goto(`/record/${batchId}`);
  await expect(page.locator('[data-document-chip]')).toHaveText('Document · Grow batch');
  await expect(page.locator('[data-document-kind="grow-batch"]')).toHaveText('Grow batch');
  await expect(page.locator('[data-document-facts]')).toContainText(`Site: ${SITE_LABEL}`);
  await expect(page.locator('[data-document-about] [data-about-link="record"]')).toHaveText(SOURCE_NAME);
  await expect(page.locator('[data-about-note]')).toContainText(
    'Neither VeilCore nor Midnight checks it against the record it names.',
  );
  // "Prove one number" is the holder's choice here: nothing proves until it is turned on.
  const choice = page.locator('[data-device-only-prove]');
  await expect(choice).toHaveAttribute('data-device-only-prove', 'off');
  await expect(choice).toContainText('Off unless you turn it on here.');
  await expect(page.locator('[data-prove-number]')).toHaveCount(0);
  await choice.getByLabel('Show “Prove one number” for this record').check();
  await expect(choice).toHaveAttribute('data-device-only-prove', 'on');
  await expect(page.locator('[data-prove-number]')).toBeVisible();

  // 2. A harvest lot about the batch, with the holder's own file.
  await page.goto('/documents/new');
  await page.locator('[data-chain-start-kind="harvest-lot"]').click();
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name: 'lot L-0007.txt', mimeType: 'text/plain', buffer: LOT_FILE });
  const lotNumbers = page.locator('[data-chain-numbers]');
  await lotNumbers.locator('input[data-slot="0"]').fill('118');
  await lotNumbers.locator('input[data-slot="1"]').fill('51200');
  await lotNumbers.locator('input[data-slot="2"]').fill('10400');
  await page.getByLabel('Lot ID').fill('L-0007');
  await pickAbout(page, /Grow batch B-0042/);
  await page.getByLabel('Held by').fill(HELD_BY);
  await page.getByRole('button', { name: 'Seal it' }).click();
  await expect(page).toHaveURL(/\/record\/VEIL-[0-9A-F]+$/);
  const lotId = page.url().split('/record/')[1];
  await expect(page.getByRole('heading', { name: 'Harvest lot L-0007' })).toBeVisible();
  await expect(page.locator('[data-document-kind="harvest-lot"]')).toHaveText('Harvest lot');

  // 3. The lab report about the lot: an ordinary document, as before.
  await page.goto('/documents/new');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name: 'coa lot L-0007.pdf', mimeType: 'application/pdf', buffer: COA_FILE });
  await page.getByLabel('Title').fill('COA for lot L-0007');
  await page.getByLabel('Type').click();
  await page.getByRole('option', { name: 'Lab report' }).click();
  await pickAbout(page, /Harvest lot L-0007/);
  await page.getByLabel('Held by').fill(HELD_BY);
  await page.getByRole('button', { name: 'Seal it' }).click();
  await expect(page).toHaveURL(/\/record\/VEIL-[0-9A-F]+$/);
  const reportId = page.url().split('/record/')[1];
  expect(reportId).not.toBe(lotId);
  await expect(page.getByRole('heading', { name: 'COA for lot L-0007' })).toBeVisible();

  // 4. The chain view, on this device: up from the lab report to the source, the batch included.
  const view = page.locator('[data-chain-view]');
  await expect(view).toContainText('Its chain, on this device');
  await expect(view.locator('[data-chain-up] [data-chain-step]')).toHaveCount(3);
  await expect(view.locator(`[data-chain-step="${lotId}"]`)).toContainText('Harvest lot L-0007');
  await expect(view.locator(`[data-chain-step="${batchId}"]`)).toContainText('On this device only');
  await expect(view.locator(`[data-chain-step="${SOURCE_ID}"]`)).toContainText(SOURCE_NAME);
  await page.goto(`/record/${batchId}`);
  await expect(page.locator('[data-chain-view] [data-chain-down] [data-chain-step]')).toHaveCount(2);
  await expect(page.locator('[data-chain-view] [data-chain-up] [data-chain-step]')).toHaveCount(1);

  // 5. All four proof codes are with the registry; the batch is sealed and dated.
  await expect.poll(() => reg.dating.length, { timeout: 60_000 }).toBeGreaterThanOrEqual(3);
  await expect
    .poll(() => reg.rows.filter((r) => typeof r.recordFingerprint === 'string').length, { timeout: 60_000 })
    .toBe(4);
  await reg.sealAndAnchor();

  // 6. The lab report's link with its chain: the holder's own button, with what it shows said first.
  await page.goto(`/record/${reportId}`);
  const share = page.locator('[data-document-chain-share]');
  await expect(share).toContainText('Whoever has this link sees everything in each of those document records too');
  await share.getByRole('button', { name: 'Copy link with its chain' }).click();
  await expect(share.getByText('Copied.')).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/\/check-document#d=[A-Za-z0-9_-]+$/);

  // 7. A stranger's browser: no holder key, nothing kept. Each page is reached from the one before.
  const other = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const stranger = await other.newPage();
  const strangerErrors = watch(stranger);
  const theirs = await standIn(stranger, { rows: reg.rows, handlers: reg.handlers });
  const check = stranger.locator('[data-document-check]');
  const dated = stranger.locator('[data-document-date="reported"]');

  // The lab report.
  await stranger.goto(link.replace(/^https?:\/\/[^/]+/, ''));
  await expect(stranger.getByRole('heading', { name: 'Check a document' })).toBeVisible();
  await expect(stranger.getByRole('heading', { name: 'COA for lot L-0007' })).toBeVisible();
  await expect(dated).toBeVisible({ timeout: 30_000 });
  await expect(dated).toContainText('(VeilCore’s registry’s report)');
  await expect(stranger.locator('[data-document-named-as]')).toHaveCount(0);
  await expect(stranger.locator('[data-about-note]')).toContainText(
    'A chain of records is only as strong as each record’s own date and proof code.',
  );
  await check
    .locator('input[type=file]')
    .setInputFiles({ name: 'sent.pdf', mimeType: 'application/pdf', buffer: COA_FILE });
  await expect(stranger.locator('[data-compare="match"]')).toContainText('is byte for byte coa lot L-0007.pdf');

  // Up one: the harvest lot, opened from the link alone.
  await stranger.locator(`[data-about-link="document"][data-about-id="${lotId}"]`).click();
  await expect(stranger.locator('[data-document-named-as]')).toHaveAttribute('data-document-named-as', lotId);
  await expect(stranger.getByRole('heading', { name: 'Harvest lot L-0007' })).toBeVisible();
  await expect(stranger.locator('[data-document-kind="harvest-lot"]')).toHaveText('Harvest lot');
  await expect(check).toContainText(`SHA-256 ${sha(LOT_FILE)}`);
  await expect(dated).toBeVisible({ timeout: 30_000 });

  // Up two: the grow batch, which the registry never held. Its sheet matches byte for byte.
  await stranger.locator(`[data-about-link="document"][data-about-id="${batchId}"]`).click();
  await expect(stranger.locator('[data-document-named-as]')).toHaveAttribute('data-document-named-as', batchId);
  await expect(stranger.getByRole('heading', { name: 'Grow batch B-0042' })).toBeVisible();
  await expect(stranger.locator('[data-document-kind="grow-batch"]')).toHaveText('Grow batch');
  await expect(check).toContainText(`SHA-256 ${sha(SHEET)}`);
  await expect(dated).toBeVisible({ timeout: 30_000 });
  await check.locator('input[type=file]').setInputFiles({ name: 'sheet.txt', mimeType: 'text/plain', buffer: SHEET });
  await expect(stranger.locator('[data-compare="match"]')).toContainText('is byte for byte grow-batch-B-0042.txt');

  // Until here the stranger's browser only read from the registry: the dates, by proof code.
  expect(theirs.seen.filter((r) => r.method !== 'GET')).toEqual([]);
  expect(theirs.seen.filter((r) => r.path.startsWith('/verify/'))).toEqual([]);
  expect(theirs.seen.filter((r) => r.path.startsWith('/proof/')).length).toBeGreaterThanOrEqual(3);
  expectNoErrors(strangerErrors);

  // The top: the source record's public check page, by its ID, checked against the proof code in the link.
  await stranger.locator(`[data-about-link="record"][data-about-id="${SOURCE_ID}"]`).click();
  await expect(stranger).toHaveURL(new RegExp(`/verify/${SOURCE_ID}\\?fp=[0-9a-f]{64}`));
  await expect(stranger.getByText(new RegExp(`is in batch ${BATCH}`)).first()).toBeVisible({ timeout: 30_000 });
  // Nothing the holder typed was in any request the stranger's browser made.
  for (const r of theirs.seen)
    for (const t of [SOURCE_NAME, HELD_BY, SITE_LABEL, VARIETY, 'B-0042', 'L-0007', 'COA for lot'])
      expect(decodeURIComponent(r.text), `${r.method} ${r.path}`).not.toContain(t);
  await other.close();

  // 8. Everything the holder's browser sent the registry about the batch: its dating row, and
  //    nothing typed, no file fingerprint and no mark in any address or body.
  for (const r of reg.seen) {
    for (const t of [SITE_LABEL, VARIETY, sha(SHEET), 'grow-batch-B-0042'])
      expect(r.text, `${r.method} ${r.path}`).not.toContain(t);
    expect(r.text, `${r.method} ${r.path}`).not.toContain('deviceOnly');
  }
  for (const r of reg.seen.filter((x) => x.method !== 'GET' && x.text.includes(batchId)))
    expect(r.path).toBe('/api/records/dating');
  const batchRow = reg.rows.find((r) => r.id === batchId);
  expect(batchRow?.bodyPending).toBe(true);
  expect(batchRow?.sealed).toBeUndefined();
  // The lot and the lab report are ordinary records: their locked copies were saved.
  for (const id of [lotId, reportId]) expect(reg.rows.find((r) => r.id === id)?.sealed).toBeTruthy();
  expectNoErrors(errors);
});
