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
import {
  API,
  REAL_REGISTRY,
  expectNoErrors,
  isolate,
  json,
  saveAndCheckBackup,
  watch,
  type Handler,
  startPlant,
} from './helpers';

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

// Twice: with passkeys, so saving with VeilCore is offered and Home's one line is the account
// line (easy mode step 2); and without, where Home's one line is the backup line (step 1).
const datingFirst = async (page: Page, passkeys: boolean) => {
  test.setTimeout(240_000);
  const errors = watch(page);
  if (!passkeys)
    await page.addInitScript(() =>
      Object.defineProperty(window, 'PublicKeyCredential', { value: undefined, configurable: true }),
    );
  const v = passkeys ? '' : 'no-passkeys-';
  // A first visit: no holder key, no vault key, nothing backed up. The role question is answered.
  await page.addInitScript(() => localStorage.setItem('veilcore.role.v1', 'breeder'));
  const reg = REAL_REGISTRY ? undefined : await standIn(page);
  if (REAL_REGISTRY) await isolate(page);

  // A new device: Home offers the backup first, before anything is logged.
  await page.goto('/records');
  await expect(page.locator('[data-restore-first]')).toContainText('Used VeilCore on another device?');
  await expect(page.locator('[data-restore-first]').getByRole('link', { name: 'Get my records back' })).toBeVisible();
  await shot(page, v + '1-new-device-home');

  const name = `Dating first (practice) ${Date.now()}`;
  await page.goto('/new');
  await startPlant(page);
  await page.getByLabel(/Plant or line name/).fill(name);
  await page.getByLabel(/Bred by/).fill('E2E');
  await page.getByRole('button', { name: /Next: check it/ }).click();
  await page.getByRole('button', { name: /Seal it/ }).click();
  // The record's own date doesn't wait for the key's stamp, or for the backup.
  await expect(page.locator('[data-record-dated-next]').first()).toContainText(
    'Your record gets its date with the next group of records',
  );
  // The network is blocked on purpose: the key's stamp fails, says so, and is tried again by itself.
  await expect(page.locator('[data-error]')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole('button', { name: /Copy details for support/ })).toBeVisible();
  await expect(page.locator('[data-stamp-retry-in]')).toContainText(/Trying again by itself/);
  await shot(page, v + '2-stamp-failed-retrying');
  await page.getByRole('button', { name: /Go on without waiting/ }).click();
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
  await expect(pickup).toContainText('Still in progress');
  await expect(pickup.locator('[data-pickup-item="dating"]')).toContainText(
    `${name} will get its date with the next group of records`,
  );
  await expect(pickup.locator('[data-pickup-item="stamp"]')).toContainText(`Key date stamp for ${name}`);
  // Whether records are kept safe is said once, for the whole account: never on the record's
  // card, not again in "Still in progress", not in a line under it. With saving with VeilCore
  // (easy mode step 2) that is the account line; without passkeys it is the backup line (easy
  // mode step 1). Never both.
  const accountLine = page.locator('[data-account-line="none"]');
  const backupLine = page.locator('[data-backup-needed="line"]');
  if (passkeys) {
    await expect(accountLine).toContainText('Not saved to your account yet.');
    await expect(accountLine.getByRole('button', { name: 'Fix it' })).toBeVisible();
    await expect(page.locator('[data-backup-needed]')).toHaveCount(0);
    await expect(page.getByText(/Not in your backup yet/)).toHaveCount(0);
  } else {
    await expect(backupLine).toHaveCount(1);
    await expect(backupLine).toContainText(
      'Not in your backup yet. Until you save it, what you’ve recorded is kept only in this browser.',
    );
    await expect(page.locator('[data-account-line]')).toHaveCount(0);
  }
  await expect(pickup).not.toContainText(/backup/i);
  await expect(page.getByText(/Not in your backup yet · next/)).toHaveCount(0);
  await expect(page.locator(`[data-home-unsaved="${recordId}"]`)).toHaveCount(0);
  await shot(page, v + '3-home-pick-up-where-you-left-off');

  // The anchoring job's next run: the batch with this proof code is sealed and dated.
  if (REAL_REGISTRY) await operatorSealAndAnchor();
  else await reg!.sealAndAnchor();
  await page.goto(`/record/${recordId}`);
  await expect(page.getByText('(VeilCore’s registry’s report)').first()).toBeVisible({ timeout: 30_000 });
  await shot(page, v + '4-record-dated-without-backup');

  // Home again: the record is dated, so it is no longer listed; Home's one line and the stamp still are.
  await page.goto('/records');
  await expect(passkeys ? accountLine : backupLine).toBeVisible();
  await expect(pickup.locator('[data-pickup-item="dating"]')).toHaveCount(0);

  if (passkeys) {
    // They keep a file themselves ("Other ways" on the sheet; Settings, "Download a copy"): the
    // locked copy goes up with the same proof code, and after a reload nothing asks again.
    await page.goto('/settings');
    await page.locator('[data-settings-file]').getByRole('button', { name: 'Download a copy' }).click();
  } else {
    // They save the backup from the backup line and check it: the locked copy goes up with the
    // same proof code, and after a reload nothing asks for the backup again.
    await backupLine.getByRole('button', { name: 'Save my backup' }).click();
  }
  await saveAndCheckBackup(page);
  await expect
    .poll(async () => !!(await rows()).find((r) => r.id === recordId)?.sealed, { timeout: 30_000 })
    .toBe(true);
  expect((await rows()).find((r) => r.id === recordId)?.recordFingerprint).toBe(row.recordFingerprint);
  await page.goto('/records');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your records' })).toBeVisible();
  await expect(page.locator(`[data-home-unsaved="${recordId}"]`)).toHaveCount(0);
  await expect(page.locator('[data-backup-needed]')).toHaveCount(0);
  await expect(page.locator('[data-account-line]')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await shot(page, v + '5-home-after-backup');
  expectNoErrors(errors);
};

test('a plant logged with no backup is still dated in the next batch, and Home picks up where they left off', async ({
  page,
}) => datingFirst(page, true));

test('the same, without passkeys: Home’s one line is the backup line (easy mode step 1)', async ({ page }) =>
  datingFirst(page, false));

// One prompt after a seal (the simplify-unlock plan, phase 1): on a device that unlocks a passkey
// itself and has no way back yet, "Keep your records safe" no longer pops up over the flow. The
// backup step is the one prompt, and it offers this device's lock beside the file; Finish waits
// for one of them, so nobody ends the flow with no way back.
test('no way back yet: nothing pops up after the seal, and the backup step is the one prompt, with this device’s lock beside the file', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const errors = watch(page);
  await page.addInitScript(() => localStorage.setItem('veilcore.role.v1', 'breeder'));
  if (REAL_REGISTRY) await isolate(page);
  else await standIn(page);
  // A device that unlocks a passkey itself (a platform authenticator), as a phone does.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      ctap2Version: 'ctap2_1',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  } as never);
  const popups: string[] = [];
  await page.goto('/new');
  await startPlant(page);
  await page.getByLabel(/Plant or line name/).fill(`One prompt (practice) ${Date.now()}`);
  await page.getByLabel(/Bred by/).fill('E2E');
  await page.getByRole('button', { name: /Next: check it/ }).click();
  await page.getByRole('button', { name: /Seal it/ }).click();
  const watchSheet = setInterval(() => {
    void page
      .locator('[data-keep-safe]')
      .count()
      .then((c) => c > 0 && popups.push('keep-safe'))
      .catch(() => undefined);
  }, 250);
  await page.getByRole('button', { name: /Go on without waiting/ }).click({ timeout: 90_000 });
  await page.getByRole('button', { name: /No report yet: skip/ }).click();
  await expect(page.getByRole('button', { name: /Save backup file/ })).toBeVisible();
  const lock = page.locator('[data-backup-device-lock]');
  await expect(lock.getByRole('button', { name: 'This device’s lock' })).toBeVisible();
  await expect(lock).toContainText(/face or finger you unlock your (phone|computer) with/);
  // One yellow button: this device's lock; the file's is outlined beside it.
  await expect(page.getByRole('button', { name: /Save backup file/ })).toHaveClass(/MuiButton-outlined/);
  await expect(page.getByText('One of the ways to get your records back')).toBeVisible();
  await expect(page.getByText(/only way to prove/)).toHaveCount(0);
  // Never zero ways back: Finish waits for the lock or a checked file.
  await expect(page.getByRole('button', { name: 'Finish' })).toHaveAttribute('aria-disabled', 'true');
  await shot(page, 'one-prompt-backup-step');
  clearInterval(watchSheet);
  expect(popups).toEqual([]);
  await expect(page.locator('[data-keep-safe]')).toHaveCount(0);
  expectNoErrors(errors);
});

// "Get my records back": the recovery sheet isn't offered beside this device's lock to people who
// may never have made one. It is under "Other ways", with one line saying what it is.
test('Get my records back: the recovery sheet is under “Other ways”, with one line saying what it is', async ({
  page,
}) => {
  const errors = watch(page);
  await page.addInitScript(() => localStorage.setItem('veilcore.role.v1', 'breeder'));
  if (REAL_REGISTRY) await isolate(page);
  else await standIn(page);
  await page.goto('/restore');
  await expect(page.locator('[data-passkey-restore]')).toBeVisible();
  await expect(page.locator('[data-restore-sheet-open]')).toBeHidden();
  await page.locator('[data-restore-other-ways]').click();
  await expect(page.locator('[data-restore-sheet-what]')).toContainText(
    'A recovery sheet is a printed page with a 28-character code.',
  );
  await expect(page.locator('[data-restore-sheet-open]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Open my backup file|backup file/i }).first()).toBeVisible();
  // The file and the passkey are equal choices, the file first, and nobody is told to trust a
  // file someone else sends (22 Nov).
  await expect(page.locator('[data-restore-file-open]')).toHaveClass(/MuiButton-outlined/);
  await expect(page.locator('[data-passkey-restore]')).toHaveClass(/MuiButton-outlined/);
  await expect(page.locator('[data-restore-own-only]')).toContainText(
    'Only open a file or code you saved yourself. VeilCore will never ask for or send you one.',
  );
  await shot(page, 'restore-other-ways');
  expectNoErrors(errors);
});
