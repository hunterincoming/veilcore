// Dating first (CONTRACT.md #38), in the browser: a new holder logs a plant and does NOT save a
// backup, and the record still gets into the next batch and is dated. Then they come back (a
// reload, as after closing the laptop) and Home says "Pick up where you left off", with what is
// still open, one button each. Once the backup is saved and checked, it asks for nothing again.
//
// Against the stand-in registry in CI (it keeps the dating row and serves a real inclusion proof
// made with veilcore-records, as the registry's batch would); against a real registry with
// E2E_API_BASE, E2E_OPERATOR_TOKEN and E2E_ANCHOR_CONTRACT (the batch is sealed and its anchor
// recorded through the operator routes, as the anchoring job does). The network and the fee
// service are blocked, so the key date stamp fails and is tried again by itself.
// Screenshots go to E2E_SHOTS when it is set.
// SPDX-License-Identifier: Apache-2.0
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page, type Route } from '@playwright/test';
import { buildBatch } from 'veilcore-records';
import { API, REAL_REGISTRY, expectNoErrors, isolate, json, saveAndCheckBackup, watch, type Handler } from './helpers';

const OPERATOR = process.env.E2E_OPERATOR_TOKEN ?? '';
const ANCHOR_CONTRACT = process.env.E2E_ANCHOR_CONTRACT ?? '';
test.skip(
  REAL_REGISTRY && (!OPERATOR || !ANCHOR_CONTRACT),
  'a real registry needs E2E_OPERATOR_TOKEN and E2E_ANCHOR_CONTRACT',
);

const SHOTS = process.env.E2E_SHOTS ?? '';
const shot = async (page: Page, name: string) => {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
};

type Row = Record<string, unknown> & { id: string };

/** The stand-in registry: what this flow needs, kept in memory, with the real one's rules for dating rows. */
const standIn = async (page: Page) => {
  const held = { rows: [] as (Row & { holder: string })[], proofs: new Map<string, unknown>() };
  const holderOf = (route: Route) => route.request().headers()['x-holder-key'] ?? '';
  const handlers: Record<string, Handler> = {
    'GET /api/records': (route) =>
      json(
        route,
        200,
        held.rows.filter((r) => r.holder === holderOf(route)).map(({ holder: _h, ...r }) => r),
      ),
    'PUT /api/records/dating': (route, _url, body) => {
      const dated: string[] = [];
      for (const r of body as Row[]) {
        expect(Object.keys(r).every((k) => ['id', 'recordFingerprint', 'keyBinding'].includes(k))).toBe(true);
        const have = held.rows.find((x) => x.id === r.id);
        if (!have) held.rows.push({ ...r, bodyPending: true, holder: holderOf(route) });
        dated.push(r.id);
      }
      return json(route, 200, { ok: true, dated });
    },
    'PUT /api/records': (route, _url, body) => {
      for (const r of body as Row[]) {
        const have = held.rows.find((x) => x.id === r.id);
        if (have?.bodyPending && have.recordFingerprint !== r.recordFingerprint)
          return json(route, 200, { ok: false, rejected: [{ id: r.id, reason: 'dated with a different proof code' }] });
        held.rows = [...held.rows.filter((x) => x.id !== r.id), { ...r, holder: holderOf(route) }];
      }
      return json(route, 200, { ok: true, count: (body as Row[]).length, integrityCheckedBy: 'holder' });
    },
    'GET /api/licenses': (route) => json(route, 200, []),
    'PUT /api/licenses': (route) => json(route, 200, { ok: true }),
    'GET /api/disclosures': (route) => json(route, 200, []),
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
  };
  await isolate(page, handlers);
  return {
    held,
    /** The anchoring job's run: seal everything pending into a batch and record its anchor. */
    sealAndAnchor: async () => {
      const pending = held.rows.filter((r) => typeof r.recordFingerprint === 'string');
      const batch = await buildBatch(
        pending.map((r) => r.recordFingerprint as string),
        'B-20261017-E2E1',
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

/** The real registry's operator routes, as the anchoring job calls them. */
const operatorSealAndAnchor = async () => {
  const headers = { 'content-type': 'application/json', 'x-operator-token': OPERATOR };
  const sealed = (await (await fetch(`${API}/batches/seal`, { method: 'POST', headers, body: '{}' })).json()) as {
    batchId?: string;
  };
  expect(sealed.batchId).toMatch(/^B-/);
  const res = await fetch(`${API}/batches/${sealed.batchId}/anchor`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      chain: 'midnight',
      network: 'preprod',
      contractAddress: ANCHOR_CONTRACT,
      txHash: 'cd'.repeat(32),
      blockHeight: 4242,
      anchoredAt: new Date().toISOString(),
    }),
  });
  expect(res.ok).toBe(true);
};

test('a plant logged with no backup is still dated in the next batch, and Home picks up where they left off', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const errors = watch(page);
  // A first visit: no holder key, no vault key, nothing backed up. The role question is answered.
  await page.addInitScript(() => localStorage.setItem('veilcore.role.v1', 'breeder'));
  const reg = REAL_REGISTRY ? undefined : await standIn(page);
  if (REAL_REGISTRY) await isolate(page);

  // A new device: Home offers the backup first, before anything is logged.
  await page.goto('/records');
  await expect(page.locator('[data-restore-first]')).toContainText('Used VeilCore on another device?');
  await expect(page.locator('[data-restore-first]').getByRole('link', { name: 'Restore your backup' })).toBeVisible();
  await shot(page, '1-new-device-home');

  const name = `Dating first (practice) ${Date.now()}`;
  await page.goto('/new');
  await page.getByLabel(/Plant or line name/).fill(name);
  await page.getByLabel(/Bred by/).fill('E2E');
  await page.getByRole('button', { name: /Next: check it/ }).click();
  await page.getByRole('button', { name: /Seal it/ }).click();
  // The record's own date doesn't wait for the key's stamp, or for the backup.
  await expect(page.locator('[data-record-dated-next]').first()).toContainText('Record dated: in the next batch');
  // The network is blocked on purpose: the key's stamp fails, says so, and is tried again by itself.
  await expect(page.locator('[data-error]')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole('button', { name: /Copy details for support/ })).toBeVisible();
  await expect(page.locator('[data-stamp-retry-in]')).toContainText(/Trying again by itself/);
  await shot(page, '2-stamp-failed-retrying');
  await page.getByRole('button', { name: /Do the date stamp later/ }).click();
  await page.getByRole('button', { name: /No report yet: skip/ }).click();
  // The backup screen: they leave without saving it.
  await expect(page.getByRole('button', { name: /Save backup file/ })).toBeVisible();
  const holder = await page.evaluate(() => localStorage.getItem('veilcore.holder.v1') ?? '');
  const [recordId] = await page.evaluate(() =>
    Object.keys(JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as object),
  );
  expect(recordId).toMatch(/^VEIL-/);

  // VeilCore has the record's proof code, and nothing else: no locked copy, nothing typed.
  const rows = async (): Promise<Row[]> =>
    REAL_REGISTRY
      ? ((await (await fetch(`${API}/api/records`, { headers: { 'x-holder-key': holder } })).json()) as Row[])
      : reg!.held.rows.filter((r) => r.holder === holder);
  await expect
    .poll(async () => (await rows()).find((r) => r.id === recordId)?.bodyPending, { timeout: 30_000 })
    .toBe(true);
  const row = (await rows()).find((r) => r.id === recordId)!;
  expect(row.sealed).toBeUndefined();
  expect(JSON.stringify(row)).not.toContain(name);

  // They close the laptop. Next time: Home says what is open, one button each.
  await page.goto('/records');
  await page.reload();
  const pickup = page.locator('[data-pickup]');
  await expect(pickup).toContainText('Pick up where you left off');
  await expect(pickup.locator('[data-pickup-item="dating"]')).toContainText(`${name}: in the next batch to be dated`);
  await expect(pickup.locator('[data-pickup-item="locked-copies"]')).toContainText(
    'locked copy not uploaded yet — save and check your backup. Your record’s date isn’t waiting on this.',
  );
  await expect(pickup.locator('[data-pickup-item="stamp"]')).toContainText(`Key date stamp for ${name}`);
  await expect(page.locator(`[data-home-unsaved="${recordId}"]`)).toHaveText(
    'Locked copy not uploaded yet — save and check your backup',
  );
  await shot(page, '3-home-pick-up-where-you-left-off');

  // The anchoring job's next run: the batch with this proof code is sealed and dated.
  if (REAL_REGISTRY) await operatorSealAndAnchor();
  else await reg!.sealAndAnchor();
  await page.goto(`/record/${recordId}`);
  await expect(page.getByText('(VeilCore’s registry’s report)').first()).toBeVisible({ timeout: 30_000 });
  await shot(page, '4-record-dated-without-backup');

  // Home again: the record is dated, so it is no longer listed; the backup and the stamp still are.
  await page.goto('/records');
  await expect(pickup.locator('[data-pickup-item="locked-copies"]')).toBeVisible();
  await expect(pickup.locator('[data-pickup-item="dating"]')).toHaveCount(0);

  // They save the backup and check it: the locked copy goes up with the same proof code, and
  // after a reload nothing asks for the backup again.
  await pickup.getByRole('button', { name: 'Save my backup' }).click();
  await saveAndCheckBackup(page);
  await expect
    .poll(async () => !!(await rows()).find((r) => r.id === recordId)?.sealed, { timeout: 30_000 })
    .toBe(true);
  expect((await rows()).find((r) => r.id === recordId)?.recordFingerprint).toBe(row.recordFingerprint);
  await page.goto('/records');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your plants' })).toBeVisible();
  await expect(page.locator(`[data-home-unsaved="${recordId}"]`)).toHaveCount(0);
  await expect(page.locator('[data-pickup-item="locked-copies"]')).toHaveCount(0);
  await expect(page.locator('[data-pickup-item="fresh-backup"]')).toHaveCount(0);
  await expect(page.locator('[data-vault-backup]')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await shot(page, '5-home-after-backup');
  expectNoErrors(errors);
});
