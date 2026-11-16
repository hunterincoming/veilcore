// A document kept on this device only (docs/device-only-records.md), in the browser against the
// stand-in registry: the choice on "Seal a document" is off until ticked and says its trade-offs
// first; a document sealed that way sends the registry its dating row (id, proof code, key
// binding) and nothing else, through a reload, Home and the sync, in a browser whose vault key
// is already in a checked backup (where an ordinary record's locked copy goes up at once). Its
// page says it is kept here only, and that it is not in a backup until one is saved and checked.
// Its check link, opened as a stranger would, recomputes the
// proof code, compares the file, and finds the date by proof code alone once a batch holds it.
// All files and records are test data.
// SPDX-License-Identifier: Apache-2.0
import { createHash, randomBytes } from 'node:crypto';
import { expect, test, type Page, type Route } from '@playwright/test';
import { buildBatch } from 'veilcore-records';
import {
  API,
  REAL_REGISTRY,
  expectNoErrors,
  holdVaultKey,
  isolate,
  json,
  newVaultKey,
  saveAndCheckBackup,
  watch,
  type Handler,
} from './helpers';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

type Row = Record<string, unknown> & { id: string };
const HOLDER = randomBytes(32).toString('hex');
const VAULT = newVaultKey();
const PERMIT = Buffer.from(`Practice permit kept on the device (test data) ${Date.now()}\n`);
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
/** What is typed, the file's name and its fingerprint: none of it may be in any request. */
const TITLE = 'Device-only permit 0042';
const TYPED = [
  TITLE,
  'Practice Authority (device-only test)',
  'P-0042-LOCAL',
  'E2E association (device-only test)',
  'A note that stays on this device (test data)',
  'permit local 0042',
  sha(PERMIT),
];

type Seen = { method: string; path: string; text: string };

/** The stand-in registry: it keeps every request it was sent, to be read back at the end. */
const standIn = async (
  page: Page,
  shared?: { rows: (Row & { holder: string })[]; handlers: Record<string, Handler> },
) => {
  const rows = shared?.rows ?? [];
  const seen: Seen[] = [];
  const uploads: Row[] = [];
  const dating: Row[] = [];
  const holderOf = (route: Route) => route.request().headers()['x-holder-key'] ?? '';
  // Every request to the registry's origin, handled or not: its address and its body.
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (url.origin !== new URL(API).origin) return;
    seen.push({ method: r.method(), path: url.pathname, text: `${r.url()}\n${r.postData() ?? ''}` });
  });
  // A second browser shares the registry's rows and its proofs, never the first one's bookkeeping.
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
    'PUT /api/records': (route: Route, _url: URL, body: unknown) => {
      uploads.push(...(body as Row[]));
      return json(route, 200, { ok: true });
    },
    'GET /api/licenses': (route: Route) => json(route, 200, []),
    'PUT /api/licenses': (route: Route) => json(route, 200, { ok: true }),
    'GET /api/disclosures': (route: Route) => json(route, 200, []),
    'GET /transfers/sent': (route: Route) => json(route, 200, { transfers: [] }),
  } satisfies Record<string, Handler>);
  await isolate(page, handlers);
  return {
    rows,
    seen,
    uploads,
    dating,
    handlers,
    /** The anchoring job's run: every proof code held goes into a batch, and its anchor is recorded. */
    sealAndAnchor: async () => {
      const batch = await buildBatch(
        rows.map((r) => r.recordFingerprint as string),
        'B-20261115-LOCAL',
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

test('a document kept on this device only: the registry gets its dating row and nothing else, and its check link works', async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(240_000);
  const errors = watch(page);
  await page.addInitScript((holder) => {
    localStorage.setItem('veilcore.holder.v1', holder);
    localStorage.setItem('veilcore.role.v1', 'breeder');
  }, HOLDER);
  // The vault key is already in a checked backup: nothing holds a locked copy back but the choice.
  await holdVaultKey(page, VAULT);
  const reg = await standIn(page);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  // 1. The choice is on the sealing screen, off, with its trade-offs said before it is made.
  await page.goto('/documents/new');
  await expect(page.getByRole('heading', { name: 'Seal a document' })).toBeVisible();
  const choice = page.locator('[data-device-only-choice]');
  const box = choice.getByLabel('Keep this record on this device and in my backup only');
  await expect(box).not.toBeChecked();
  await expect(choice).toContainText('Nothing you type here is sent to VeilCore, locked or not.');
  await expect(choice).toContainText('VeilCore’s server can’t give this record back');
  await expect(choice).toContainText('its ID, its proof code and its key binding');
  await expect(choice).toContainText('The only copies are this browser’s and a backup file saved after sealing.');
  await expect(choice).toContainText('A backup saved earlier doesn’t hold this record, and a passkey copy never does.');
  await expect(choice).toContainText('Anyone with its check link and the file can still check it.');

  // 2. Seal a document that way.
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name: 'permit local 0042.pdf', mimeType: 'application/pdf', buffer: PERMIT });
  await page.getByLabel('Title').fill(TITLE);
  await page.getByLabel('Issued by (optional)').fill(TYPED[1]);
  await page.getByLabel('Reference number (optional)').fill(TYPED[2]);
  await page.getByLabel('Held by').fill(TYPED[3]);
  await page.getByLabel('Notes (optional)').fill(TYPED[4]);
  await box.check();
  await page.getByRole('button', { name: 'Seal it' }).click();

  // 3. The backup step comes next, before the record's page: until a backup that holds it is
  //    saved and checked, this browser has the only copy, and every screen says so.
  await expect(page.locator('[data-device-only-backup-step]')).toContainText(
    'Sealed. Now save a backup and check it: until you do, this browser holds the only copy of this record.',
  );
  const recordId = await page.evaluate((holder) => {
    const kept = JSON.parse(localStorage.getItem('veilcore.device-only.v1') ?? '{}') as Record<string, object>;
    return Object.keys(kept[holder] ?? {})[0] ?? '';
  }, HOLDER);
  expect(recordId).toMatch(/^VEIL-[0-9A-F]+$/);
  // They leave without saving it. Home and the record's page say it is not in a backup yet.
  await page.goto('/records');
  await expect(page.locator(`[data-home-device-only="${recordId}"]`)).toHaveText(
    'On this device only · not in a backup yet',
  );
  await page.goto(`/record/${recordId}`);
  await expect(page.getByRole('heading', { name: TITLE })).toBeVisible();
  const notice = page.locator('[data-device-only]');
  await expect(notice).toHaveAttribute('data-device-only', 'not-in-backup');
  await expect(notice).toContainText('Not in a backup yet. This browser holds the only copy of this record');
  // What has left the device, said exactly.
  await expect(page.locator('[data-device-only-sent]')).toContainText(
    'the record’s ID, its proof code and its key binding, sent to VeilCore to date it',
  );
  await expect(page.locator('[data-device-only-conflict]')).toHaveCount(0);
  // The key's date stamp is not started by anything but its button.
  await expect(page.locator('[data-device-only-stamp]')).toContainText('nothing starts it but the button below');
  const proofCode = (
    await page
      .locator('[data-document-page]')
      .getByText(/^[0-9a-f]{64}$/)
      .first()
      .textContent()
  )?.trim();
  expect(proofCode).toMatch(/^[0-9a-f]{64}$/);
  // Save the backup and check it: now the page says where the two copies are.
  await notice.getByRole('link', { name: 'Save a backup' }).click();
  await expect(page).toHaveURL(/\/backup$/);
  await saveAndCheckBackup(page);
  await page.goto(`/record/${recordId}`);
  await expect(notice).toHaveAttribute('data-device-only', 'in-backup');
  await expect(notice).toContainText('Kept on this device only');
  await expect(notice).toContainText('Nothing typed into this record was sent to VeilCore, locked or not');
  await expect(notice).toContainText('VeilCore can’t give it back');

  // 4. The registry was sent the dating row: the id, the proof code and the key binding.
  await expect.poll(() => reg.dating.length, { timeout: 30_000 }).toBe(1);
  expect(Object.keys(reg.dating[0]).sort()).toEqual(['id', 'keyBinding', 'recordFingerprint']);
  expect(reg.dating[0].id).toBe(recordId);
  expect(reg.dating[0].recordFingerprint).toBe(proofCode);

  // 5. Home, a reload, the record's page again: every one of these reads the registry and may
  //    save. The record is listed as kept here, never as "not uploaded yet".
  await page.goto('/records');
  await expect(page.locator(`[data-home-device-only="${recordId}"]`)).toHaveText('On this device only');
  await expect(page.locator(`[data-home-unsaved="${recordId}"]`)).toHaveCount(0);
  await page.reload();
  await expect(page.locator(`[data-home-device-only="${recordId}"]`)).toBeVisible();
  await expect(page.locator(`[data-home-unsaved="${recordId}"]`)).toHaveCount(0);
  await page.goto(`/record/${recordId}`);
  await expect(page.getByRole('heading', { name: TITLE })).toBeVisible();
  await expect(page.locator('[data-device-only]')).toBeVisible();

  // 6. The batch with its proof code is sealed and dated: the page finds the date by proof code.
  await reg.sealAndAnchor();
  await page.reload();
  await expect(page.getByText('(VeilCore’s registry’s report)').first()).toBeVisible({ timeout: 30_000 });

  // 7. The check link, and what a stranger's browser does with it (no holder key, nothing kept).
  await page.getByRole('button', { name: 'Copy link: proves you had this file' }).click();
  await expect(page.getByText('Copied.')).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/\/check-document#d=[A-Za-z0-9_-]+$/);

  const other = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const stranger = await other.newPage();
  const strangerErrors = watch(stranger);
  const theirs = await standIn(stranger, { rows: reg.rows, handlers: reg.handlers });
  await stranger.goto(link.replace(/^https?:\/\/[^/]+/, ''));
  await expect(stranger.getByRole('heading', { name: 'Check a document' })).toBeVisible();
  const check = stranger.locator('[data-document-check]');
  await expect(check).toContainText(proofCode ?? 'missing');
  await expect(check).toContainText(TITLE);
  await expect(stranger.getByText('(VeilCore’s registry’s report)').first()).toBeVisible({ timeout: 30_000 });
  await check
    .locator('input[type=file]')
    .setInputFiles({ name: 'sent.pdf', mimeType: 'application/pdf', buffer: PERMIT });
  await expect(stranger.locator('[data-compare="match"]')).toContainText('is byte for byte permit local 0042.pdf');
  // The stranger's browser asked the registry for the date by proof code, and sent nothing typed.
  expect(theirs.seen.some((r) => r.method === 'GET' && r.path === `/proof/${proofCode}`)).toBe(true);
  for (const r of theirs.seen) for (const t of TYPED) expect(r.text, `${r.method} ${r.path}`).not.toContain(t);
  expectNoErrors(strangerErrors);
  await other.close();

  // 8. Everything the holder's browser sent the registry, from the first screen to here:
  //    - no save of the record set at all (this browser has nothing else to save);
  //    - nothing typed, no file name, no file fingerprint and no mark, in any address or body;
  //    - the only request with a body that names the record is its dating row.
  expect(reg.uploads).toEqual([]);
  expect(reg.seen.filter((r) => r.method === 'PUT' && r.path === '/api/records')).toEqual([]);
  for (const r of reg.seen) {
    for (const t of TYPED) expect(r.text, `${r.method} ${r.path}`).not.toContain(t);
    expect(r.text, `${r.method} ${r.path}`).not.toContain('deviceOnly');
  }
  for (const r of reg.seen.filter((x) => x.method !== 'GET' && x.text.includes(recordId)))
    expect(r.path).toBe('/api/records/dating');
  expect(reg.dating).toHaveLength(1);
  // The registry holds the proof code only.
  const row = reg.rows.find((r) => r.id === recordId);
  expect(row?.bodyPending).toBe(true);
  expect(row?.sealed).toBeUndefined();
  // The record is in this browser, under its own key, and not in the queue of what waits to be sent.
  const kept = await page.evaluate(() => ({
    here: localStorage.getItem('veilcore.device-only.v1') ?? '',
    queue: localStorage.getItem('veilcore.outbox.v1') ?? '',
  }));
  expect(kept.here).toContain(recordId);
  expect(kept.queue).not.toContain(recordId);

  // 9. The holder can delete it from this device, after a warning. Nothing is sent: the registry
  //    keeps the proof code it was given, and the record is gone from this browser.
  const sentBefore = reg.seen.length;
  await page.goto(`/record/${recordId}`);
  page.once('dialog', (d) => {
    expect(d.message()).toContain(
      'VeilCore keeps what it was already sent: the record’s ID, proof code and key binding.',
    );
    void d.accept();
  });
  await page.locator('[data-device-only-delete]').click();
  await expect(page).toHaveURL(/\/records$/);
  await expect(page.locator(`[data-home-device-only="${recordId}"]`)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('veilcore.device-only.v1') ?? '')).not.toContain(recordId);
  expect(reg.seen.slice(sentBefore).filter((r) => r.method !== 'GET')).toEqual([]);
  expect(reg.rows.find((r) => r.id === recordId)?.bodyPending).toBe(true);
  expectNoErrors(errors);
});

test('an ordinary document, sealed without the choice, still has its locked copy saved', async ({ page }) => {
  const errors = watch(page);
  await page.addInitScript((holder) => {
    localStorage.setItem('veilcore.holder.v1', holder);
    localStorage.setItem('veilcore.role.v1', 'breeder');
  }, HOLDER);
  await holdVaultKey(page, VAULT);
  const reg = await standIn(page);
  await page.goto('/documents/new');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name: 'ordinary.pdf', mimeType: 'application/pdf', buffer: PERMIT });
  await page.getByLabel('Title').fill('Ordinary permit (test data)');
  await page.getByLabel('Held by').fill('E2E association (test data)');
  await page.getByRole('button', { name: 'Seal it' }).click();
  await expect(page).toHaveURL(/\/record\/VEIL-[0-9A-F]+$/);
  const recordId = page.url().split('/record/')[1];
  await expect(page.locator('[data-device-only]')).toHaveCount(0);
  await expect.poll(() => reg.uploads.some((r) => r.id === recordId), { timeout: 30_000 }).toBe(true);
  const sent = reg.uploads.find((r) => r.id === recordId)!;
  expect(sent.sealed).toBeTruthy();
  expect(JSON.stringify(sent)).not.toContain('Ordinary permit');
  expect(JSON.stringify(sent)).not.toContain('deviceOnly');
  expectNoErrors(errors);
});
