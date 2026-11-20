// Records saved with VeilCore (easy mode step 2, docs/passkey-backup.md), in two real browsers
// against a real registry (E2E_API_BASE: the account copy needs its routes, lineage/account-copy.mjs):
//
//   1. After the first record is saved, "Keep your records safe" opens by itself; Face ID (a
//      virtual authenticator: user verification, a synced passkey, BS=1) makes the passkey and
//      opens it again through the registry; the records count as backed up, and Home says nothing.
//   2. A document kept on this device only: never marked by the copy, so its key's date stamp
//      still waits for a downloaded copy (security review B3).
//   3. A second browser on the same synced passkey gets everything back with Face ID, sees the
//      copy's date first, is welcomed with the count, and is told about the document kept on the
//      other device. It logs a record; the first browser picks up its keys by itself.
//   4. A registry that serves an older copy than the browser has seen is refused, and Home says so.
//   5. A browser with a passkey copy from before (one copy per passkey, /vault) moves it over with
//      one Face ID; the older copy is deleted at the registry.
//
// The passkey: Chromium's virtual authenticator does the real WebAuthn ceremony (credential, user
// verification, the BS flag). Its PRF secret can't be copied into another browser's authenticator
// (CDP's credential export leaves it out: checked 19 Nov 2026), so both browsers compute the PRF
// output the way a synced passkey would, with one secret: HMAC-SHA256(secret, credential id ‖
// input), in an init script that wraps navigator.credentials. That is the one stand-in here.
//
// Screens are saved at 390px and 1366px into E2E_SHOTS (default: e2e-shots/account-copy).
// SPDX-License-Identifier: Apache-2.0
import { createCipheriv, createHash, createHmac, hkdfSync, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Browser, type BrowserContext, type CDPSession, type Page } from '@playwright/test';
import { API, REAL_REGISTRY, expectNoErrors, startPlant, untilSaved, watch } from './helpers';

test.skip(!REAL_REGISTRY, 'the account copy needs a real registry (E2E_API_BASE)');

const SHOTS = process.env.E2E_SHOTS ?? path.join('e2e-shots', 'account-copy');
// WebAuthn takes no IP address as a site, so these browsers open the site as localhost.
const SITE = `http://localhost:${process.env.E2E_PORT ?? 4317}`;
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.1';
const WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

/** One synced passkey's PRF secret, the same in every browser. */
const PRF_SECRET = randomBytes(32).toString('base64');

const shots = async (page: Page, name: string) => {
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const [width, height] of [
    [390, 844],
    [1366, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(SHOTS, `${name}-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
};

type Device = { context: BrowserContext; page: Page; cdp: CDPSession; authenticatorId: string; errors: string[] };

/** A browser with a platform authenticator: Face ID, a synced passkey, PRF as a synced passkey gives it. */
const device = async (
  browser: Browser,
  userAgent: string,
  init?: (page: Page) => Promise<void>,
  opts: { synced?: boolean } = {},
): Promise<Device> => {
  const context = await browser.newContext({ userAgent, viewport: { width: 390, height: 844 }, baseURL: SITE });
  const page = await context.newPage();
  const errors = watch(page);
  await page.addInitScript(() => localStorage.setItem('veilcore.role.v1', 'breeder'));
  await page.addInitScript((secretB64: string) => {
    const secret = Uint8Array.from(atob(secretB64), (c) => c.charCodeAt(0));
    const bytes = (v: unknown) =>
      v instanceof ArrayBuffer
        ? new Uint8Array(v)
        : ArrayBuffer.isView(v)
          ? new Uint8Array(v.buffer, v.byteOffset, v.byteLength)
          : new Uint8Array(0);
    const creds = navigator.credentials;
    const wrap =
      (orig: (o?: CredentialCreationOptions & CredentialRequestOptions) => Promise<Credential | null>) =>
      async (o?: CredentialCreationOptions & CredentialRequestOptions) => {
        const cred = (await orig.call(creds, o)) as PublicKeyCredential | null;
        const ask = (o?.publicKey as { extensions?: { prf?: { eval?: { first?: unknown } } } } | undefined)?.extensions
          ?.prf?.eval?.first;
        if (!cred || !ask) return cred;
        const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const id = new Uint8Array(cred.rawId);
        const input = bytes(ask);
        const msg = new Uint8Array(id.length + input.length);
        msg.set(id);
        msg.set(input, id.length);
        const first = await crypto.subtle.sign('HMAC', key, msg);
        const results = { ...cred.getClientExtensionResults(), prf: { enabled: true, results: { first } } };
        Object.defineProperty(cred, 'getClientExtensionResults', { value: () => results });
        return cred;
      };
    creds.create = wrap(creds.create.bind(creds));
    creds.get = wrap(creds.get.bind(creds));
  }, PRF_SECRET);
  if (init) await init(page);
  // Nothing leaves but to the site and the registry (as helpers.ts isolate, for this origin).
  await page.route('**/*', (route) => {
    const origin = new URL(route.request().url()).origin;
    return origin === SITE || origin === new URL(API).origin ? route.continue() : route.abort();
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      ctap2Version: 'ctap2_1',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
      hasPrf: true,
      // BS=1 a passkey that syncs; BS=0 one that stays on this device (Windows Hello, a security key).
      defaultBackupEligibility: opts.synced ?? true,
      defaultBackupState: opts.synced ?? true,
    },
  } as never);
  return { context, page, cdp, authenticatorId, errors };
};

/** The PRF output this test's synced passkey gives for a credential and an input (as the init script). */
const prfOf = (credentialId: Buffer, input: Buffer) =>
  createHmac('sha256', Buffer.from(PRF_SECRET, 'base64'))
    .update(Buffer.concat([credentialId, input]))
    .digest();

const SEAL = /^(Seal it|Save and date it)$/;

/** Log a plant from /new; leaves the page right after it is sealed. */
const logPlant = async (page: Page, name: string) => {
  await page.goto('/new');
  await startPlant(page);
  await page.getByLabel(/Plant or line name/).fill(name);
  await page.getByLabel(/Bred by/).fill('E2E');
  await page.getByRole('button', { name: /Next: check it/ }).click();
  await page.getByRole('button', { name: SEAL }).click();
};

const recordIds = (page: Page) =>
  page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as object));

test('Face ID keeps records safe, a second browser gets them back, saving runs by itself, an older copy is refused', async ({
  browser,
}) => {
  test.setTimeout(420_000);
  const A = await device(browser, IPHONE);
  const reads: { iv: string; ct: string; slots: unknown }[] = [];
  A.page.on('response', (r) => {
    if (/\/account-copy\/[0-9a-f]{32}\/read$/.test(new URL(r.url()).pathname) && r.ok())
      r.json()
        .then((j) => reads.push(j as { iv: string; ct: string; slots: unknown }))
        .catch(() => undefined);
  });

  // 1. The first record is saved: the sheet opens by itself, once, with one button.
  const first = `Account copy plant A (practice) ${Date.now()}`;
  await logPlant(A.page, first);
  const sheet = A.page.locator('[data-keep-safe]');
  await expect(sheet).toBeVisible({ timeout: 60_000 });
  await expect(sheet.getByRole('heading', { name: 'Keep your records safe' })).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Use Face ID' })).toBeVisible();
  await expect(sheet).toContainText('Documents you keep on this device only aren’t included.');
  await shots(A.page, '01-keep-safe-sheet');
  await sheet.getByRole('button', { name: 'Other ways' }).click();
  await expect(sheet.getByRole('button', { name: 'Keep a file myself' })).toBeVisible();
  await shots(A.page, '02-keep-safe-other-ways');
  await sheet.getByRole('button', { name: 'Use Face ID' }).click();
  await expect(sheet.locator('[data-keep-safe-done="counted"]')).toBeVisible({ timeout: 60_000 });
  await expect(sheet).toContainText('Your records are saved with VeilCore. New ones save by themselves.');
  await shots(A.page, '03-keep-safe-saved');
  await sheet.getByRole('button', { name: 'Done' }).click();

  // Made once, opened again through the registry: one passkey, a copy and its one way in.
  const { credentials } = (await A.cdp.send('WebAuthn.getCredentials', {
    authenticatorId: A.authenticatorId,
  })) as unknown as { credentials: Record<string, unknown>[] };
  expect(credentials).toHaveLength(1);
  // Named for what it does, with a short tag that Settings shows too (review New-4).
  const tag = /^VeilCore: unlocks your records · ([0-9A-Z]{4})$/.exec(String(credentials[0].userName))?.[1];
  expect(tag).toBeTruthy();
  const [plantA] = await recordIds(A.page);
  // Counted: the locked copy of the record goes up (it waited for a backup before).
  await untilSaved(A.page, plantA);
  await A.page.goto('/records');
  await expect(A.page.getByRole('heading', { name: 'Your records' })).toBeVisible();
  await expect(A.page.locator('[data-account-line]')).toHaveCount(0);
  await expect(A.page.getByText(/not in your backup/i)).toHaveCount(0);
  await shots(A.page, '04-home-all-well');
  await A.page.locator('[data-settings-link]').evaluate((b: HTMLElement) => b.click());
  await expect(A.page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(A.page.locator('[data-settings-account="saved"]')).toContainText('New records save by themselves.');
  await expect(A.page.locator('[data-settings-account="saved"]')).toContainText(
    'Passkey on your devices with the same Apple or Google account',
  );
  await expect(A.page.locator('[data-settings-why]')).toContainText('A copy you download works without VeilCore.');
  await expect(A.page.locator(`[data-settings-tag="${tag}"]`)).toBeVisible();
  await shots(A.page, '05-settings-saved');

  // 2. A document kept on this device only: its key's stamp still waits for a downloaded copy.
  await A.page.goto('/documents/new');
  await A.page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'local permit.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(`permit ${Date.now()}`),
    });
  await A.page.getByLabel('Title').fill('Permit kept on the phone (practice)');
  await A.page.getByLabel('Held by').fill('E2E');
  await A.page.locator('[data-device-only-choice]').getByRole('checkbox').check();
  await A.page.getByRole('button', { name: SEAL }).click();
  await expect(A.page.locator('[data-device-only-backup-step]')).toBeVisible({ timeout: 30_000 });
  const doc = (await recordIds(A.page)).find((id) => id !== plantA)!;
  const docKeys = await A.page.evaluate(
    (id) =>
      (JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as Record<string, Record<string, unknown>>)[
        id
      ],
    doc,
  );
  expect(docKeys.backedUpAt).toBeUndefined();
  await A.page.goto(`/record/${doc}`);
  const stamp = A.page.locator('[data-key-stamp-button]');
  await expect(stamp).toBeDisabled();
  await A.page.goto('/records');
  await expect(A.page.locator('[data-account-line="device-only"]')).toContainText(
    '1 document is only on this device. Download a copy to keep it safe.',
  );
  await shots(A.page, '06-home-device-only-line');
  // Saved by itself (the end-to-end build waits seconds, not a minute): the copy now knows of it.
  await expect.poll(() => reads.length, { timeout: 30_000 }).toBeGreaterThan(2);
  const older = reads[0];

  // 3. A second browser, the same synced passkey, nothing else.
  const B = await device(browser, WINDOWS);
  await B.cdp.send('WebAuthn.addCredential', {
    authenticatorId: B.authenticatorId,
    credential: credentials[0],
  } as never);
  await B.page.goto('/records');
  await expect(B.page.locator('[data-restore-first]').getByRole('link', { name: 'Get my records back' })).toBeVisible();
  // Said with this device's own words: on Windows a passkey, never Face ID (the live test, 19 Nov).
  await expect(B.page.locator('[data-restore-first]')).toContainText('with a passkey, or the backup file you saved.');
  await B.page.locator('[data-restore-first]').getByRole('link', { name: 'Get my records back' }).click();
  await expect(B.page.locator('[data-restore-account]')).toContainText('Choose “Use a phone”');
  await shots(B.page, '07-restore-face-id-first');
  await B.page.locator('[data-passkey-restore]').click();
  const found = B.page.locator('[data-passkey-found]');
  await expect(found).toContainText('Found your records saved with VeilCore on');
  await shots(B.page, '08-restore-found-date-first');
  await found.getByRole('button', { name: 'Bring them here' }).click();
  await expect(B.page.locator('[data-restore-done="account"]')).toHaveText(
    /Welcome back\. \d+ records? (is|are) here\./,
    {
      timeout: 30_000,
    },
  );
  await expect(B.page.locator('[data-restore-elsewhere="iphone"]')).toHaveText(
    '1 document is kept only on your iPhone, so it isn’t shown here. Open it there.',
  );
  await shots(B.page, '09-restore-welcome-back');
  expect(await recordIds(B.page)).toContain(plantA);
  await B.page.goto('/records');
  await expect(B.page.getByRole('heading', { name: first })).toBeVisible({ timeout: 30_000 });
  // A record that came from the other device is listed once: not also under "Still in progress".
  await expect(B.page.locator('[data-pickup-item="dating"]')).toHaveCount(0);
  await expect(B.page.locator('[data-account-line]')).toHaveCount(0);

  // B logs a record; A picks up its keys by itself on its next check.
  const second = `Account copy plant B (practice) ${Date.now()}`;
  await logPlant(B.page, second);
  await expect(B.page.locator('[data-keep-safe]')).toHaveCount(0);
  const plantB = (await recordIds(B.page)).find((id) => id !== plantA && id !== doc)!;
  await untilSaved(B.page, plantB);
  await A.page.waitForTimeout(4000);
  await A.page.goto('/records');
  await expect.poll(async () => (await recordIds(A.page)).includes(plantB), { timeout: 30_000 }).toBe(true);
  await expect(A.page.getByRole('heading', { name: second })).toBeVisible({ timeout: 30_000 });
  await A.page.goto('/settings');
  await expect(A.page.locator('[data-settings-account="saved"]')).toContainText('Windows computer');
  await shots(A.page, '10-settings-two-devices');

  // 4. The registry serves the first copy it kept: refused, nothing changes, Home says so.
  const fingerprint = createHash('sha256').update(`${older.iv}.${older.ct}`).digest('hex');
  await A.page.route(`${API}/account-copy/*/head`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ fingerprint, updatedAt: 1, slots: older.slots }),
    }),
  );
  await A.page.route(`${API}/account-copy/*/read`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(older) }),
  );
  const before = (await recordIds(A.page)).sort();
  await A.page.goto('/records');
  await expect(A.page.locator('[data-account-line="server-older"]')).toContainText(
    'Something looks wrong on VeilCore’s server. Your records on this device are fine, and nothing was changed.',
    { timeout: 30_000 },
  );
  expect((await recordIds(A.page)).sort()).toEqual(before);
  await shots(A.page, '11-home-server-older');
  await A.page.unroute(`${API}/account-copy/*/head`);
  await A.page.unroute(`${API}/account-copy/*/read`);

  expectNoErrors(A.errors);
  expectNoErrors(B.errors);
  await A.context.close();
  await B.context.close();
});

test('a passkey copy from before moves over with one Face ID, and the older copy is deleted', async ({ browser }) => {
  test.setTimeout(240_000);
  // The sheet doesn't open by itself here: this browser kept a passkey copy before.
  const C = await device(browser, IPHONE, (page) =>
    page.addInitScript(() => localStorage.setItem('veilcore.account.keep-safe-shown.v1', 'before')),
  );
  const name = `Older passkey copy plant (practice) ${Date.now()}`;
  await logPlant(C.page, name);
  // Saved: the vault key that seals it is made with the first save.
  await expect
    .poll(() => C.page.evaluate(() => localStorage.getItem('veilcore.vault.v1')), { timeout: 60_000 })
    .not.toBeNull();
  // A passkey made as the older code made it, and its copy at /vault, sealed as that code sealed it.
  const credentialId = Buffer.from(
    await C.page.evaluate(async () => {
      const c = (await navigator.credentials.create({
        publicKey: {
          rp: { name: 'VeilCore' },
          user: {
            id: new Uint8Array(16),
            name: 'VeilCore backup 2026-10-21',
            displayName: 'VeilCore backup 2026-10-21',
          },
          challenge: new Uint8Array(32),
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
        },
      })) as PublicKeyCredential;
      return Array.from(new Uint8Array(c.rawId));
    }),
  );
  const store: Record<string, string> = await C.page.evaluate(() => ({ ...localStorage }));
  const keys = JSON.parse(store['veilcore.record-keys.v1'] ?? '{}') as Record<string, Record<string, unknown>>;
  const vaultRaw = store['veilcore.vault.v1'];
  const vault = (vaultRaw.startsWith('{') ? JSON.parse(vaultRaw) : { key: vaultRaw }) as { key: string };
  const contents = {
    format: 'veilcore-backup',
    version: 3,
    warning: 'SECRET.',
    savedAt: new Date().toISOString(),
    holderKey: store['veilcore.holder.v1'].toLowerCase(),
    vaultKey: vault.key,
    records: Object.values(keys).map((k) => ({
      recordId: k.recordId,
      recordSecret: k.recordSecret,
      recoverySecret: k.recoverySecret,
      createdAt: new Date(k.createdAt as number).toISOString(),
    })),
  };
  const DOMAIN = 'veilcore/passkey-backup/v1';
  const prf = prfOf(credentialId, createHash('sha256').update(`${DOMAIN}/prf-input`).digest());
  const salt = createHash('sha256')
    .update(Buffer.concat([Buffer.from(DOMAIN), credentialId]))
    .digest();
  const okm = Buffer.from(hkdfSync('sha256', prf, salt, Buffer.from(DOMAIN), 80));
  const id = okm.subarray(32, 48).toString('hex');
  const token = okm.subarray(48, 80).toString('base64url');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', okm.subarray(0, 32), iv);
  cipher.setAAD(Buffer.from(`${DOMAIN}:${id}`));
  const body = JSON.stringify({ v: 'veilcore/passkey-copy/v1', savedAt: contents.savedAt, seq: 1, backup: contents });
  const ct = Buffer.concat([cipher.update(body), cipher.final(), cipher.getAuthTag()]);
  const put = await fetch(`${API}/vault/${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, prev: 'none', iv: iv.toString('base64url'), ct: ct.toString('base64url') }),
  });
  expect(put.status).toBe(200);
  await C.page.evaluate((r) => localStorage.setItem('veilcore:passkey-copy', JSON.stringify(r)), {
    id,
    credentialId: credentialId.toString('base64url'),
    sameAs: '',
    savedAt: contents.savedAt,
    prev: 'none',
    seq: 1,
  });

  // Home asks for one Face ID; the sheet does it.
  await C.page.goto('/records');
  const line = C.page.locator('[data-account-line="older"]');
  await expect(line).toContainText('Unlock your saved records once to keep saving.');
  await shots(C.page, '12-home-older-copy');
  await line.getByRole('button', { name: 'Continue' }).click();
  await C.page.locator('[data-keep-safe-go]').click();
  await expect(C.page.locator('[data-keep-safe-done="counted"]')).toBeVisible({ timeout: 60_000 });
  await C.page.locator('[data-keep-safe]').getByRole('button', { name: 'Done' }).click();
  // The older copy is gone from the registry, and from this browser's memory; no new passkey.
  const gone = await fetch(`${API}/vault/${id}/read`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  expect(gone.status).toBe(404);
  expect(await C.page.evaluate(() => localStorage.getItem('veilcore:passkey-copy'))).toBeNull();
  const { credentials } = (await C.cdp.send('WebAuthn.getCredentials', {
    authenticatorId: C.authenticatorId,
  })) as unknown as { credentials: unknown[] };
  expect(credentials).toHaveLength(1);
  await expect(C.page.locator('[data-account-line]')).toHaveCount(0);
  expectNoErrors(C.errors);
  await C.context.close();
});

// ---- the recovery sheet (easy mode step 3) ----------------------------------------------------

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
/** A well-formed recovery code that opens nothing (Luhn mod 32 check symbol, as recovery-code.ts). */
const strangerCode = (): string => {
  const v = Array.from(randomBytes(27), (b) => b & 31);
  let factor = 2;
  let sum = 0;
  for (let i = v.length - 1; i >= 0; i--) {
    let a = factor * v[i];
    factor = factor === 2 ? 1 : 2;
    a = Math.floor(a / 32) + (a % 32);
    sum += a;
  }
  return [...v, (32 - (sum % 32)) % 32].map((x) => CROCKFORD[x]).join('');
};

/** The sheet's dialog: made with one Face ID, shown, printed (a PDF and a print-media screenshot), then its whole code typed back. */
const makeAndCheckSheet = async (page: Page, prefix: string, opts: { canSkip: boolean }) => {
  const dialog = page.locator('[data-recovery-dialog]');
  await expect(dialog).toHaveAttribute('data-recovery-dialog', 'intro');
  await shots(page, `${prefix}-recovery-intro`);
  await dialog.locator('[data-recovery-go]').click();
  await expect(dialog).toHaveAttribute('data-recovery-dialog', 'show', { timeout: 60_000 });
  const code = (await dialog.locator('[data-recovery-code]').innerText()).replace(/\s+/g, '');
  expect(code).toMatch(/^([0-9A-Z]{4}-){6}[0-9A-Z]{4}$/);
  await expect(dialog).toContainText('Keep this with your herd book or other important papers.');
  await expect(dialog.locator('[data-recovery-phishing]')).toContainText(
    'VeilCore asks for this code only at localhost: to check this sheet, or to get your records back.',
  );
  await shots(page, `${prefix}-recovery-sheet-on-screen`);
  // As printed: the sheet alone.
  await page.emulateMedia({ media: 'print' });
  const print = page.locator('[data-recovery-print]');
  await expect(print).toBeVisible();
  await expect(print).toContainText(code);
  await expect(page.locator('[data-recovery-dialog]')).toBeHidden();
  await shots(page, `${prefix}-recovery-sheet-printed`);
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.pdf({ path: path.join(SHOTS, `${prefix}-recovery-sheet.pdf`), format: 'A4' });
  await page.emulateMedia({ media: 'screen' });
  // Nothing about the code is kept in the page's storage.
  const kept = await page.evaluate(() => JSON.stringify({ ...localStorage }) + location.href);
  expect(kept).not.toContain(code);
  expect(kept).not.toContain(code.replace(/-/g, ''));

  await dialog.locator('[data-recovery-next]').click();
  await expect(dialog).toHaveAttribute('data-recovery-dialog', 'confirm');
  await expect(dialog.locator('[data-recovery-skip]')).toHaveCount(opts.canSkip ? 1 : 0);
  const input = dialog.locator('[data-recovery-input]');
  const typo = `${code.slice(0, 2)}${code[2] === 'A' ? 'B' : 'A'}${code.slice(3)}`;
  await input.fill(typo);
  await dialog.locator('[data-recovery-check]').click();
  await expect(dialog.locator('[data-recovery-problem]')).toContainText('That code has a mistake in it.');
  await input.fill(strangerCode());
  await dialog.locator('[data-recovery-check]').click();
  await expect(dialog.locator('[data-recovery-problem]')).toContainText(
    'That doesn’t match your sheet. Check each character, then try again.',
  );
  await shots(page, `${prefix}-recovery-wrong-code`);
  await input.fill(code.toLowerCase().replace(/-/g, ' '));
  await dialog.locator('[data-recovery-check]').click();
  await expect(dialog).toHaveAttribute('data-recovery-dialog', 'done', { timeout: 30_000 });
  await expect(dialog).toContainText('Your recovery sheet works.');
  await shots(page, `${prefix}-recovery-works`);
  await dialog.getByRole('button', { name: 'Done' }).click();
  return code;
};

test('the recovery sheet: offered after Face ID, printed, checked, and it brings the records back on a fresh browser', async ({
  browser,
}) => {
  test.setTimeout(420_000);
  const A = await device(browser, IPHONE);
  const name = `Recovery sheet plant (practice) ${Date.now()}`;
  await logPlant(A.page, name);
  const sheet = A.page.locator('[data-keep-safe]');
  await expect(sheet).toBeVisible({ timeout: 60_000 });
  await sheet.getByRole('button', { name: 'Use Face ID' }).click();
  await expect(sheet.locator('[data-keep-safe-done="counted"]')).toBeVisible({ timeout: 60_000 });
  // Offered at once, before "Done": recommended where the passkey syncs.
  const prompt = sheet.locator('[data-recovery-prompt="synced"]');
  await expect(prompt).toContainText('One more thing: your recovery sheet');
  await expect(prompt).toContainText('If you ever lose your Apple or Google account, this sheet is the only way back.');
  await shots(A.page, '15-saved-recovery-offered');
  await prompt.locator('[data-recovery-make]').click();
  const code = await makeAndCheckSheet(A.page, '16', { canSkip: true });
  const [plant] = await recordIds(A.page);
  await untilSaved(A.page, plant);
  await A.page.goto('/settings');
  await expect(A.page.locator('[data-settings-sheet="checked"]')).toBeVisible();
  await expect(A.page.locator('[data-settings-way="recovery"]')).toContainText('Recovery sheet · made');
  await expect(A.page.locator('[data-settings-way="recovery"]')).toContainText('Checked');
  await shots(A.page, '17-settings-recovery-sheet');

  // A fresh browser: no passkey, nothing here but the sheet.
  const D = await device(browser, WINDOWS);
  await D.page.goto('/restore');
  await D.page.locator('[data-restore-sheet-open]').click();
  const input = D.page.locator('[data-restore-sheet-input]');
  await input.fill(strangerCode());
  await D.page.locator('[data-restore-sheet-go]').click();
  await expect(D.page.getByText('That code doesn’t open any saved records.')).toBeVisible({ timeout: 30_000 });
  await input.fill(code.slice(0, 20));
  await D.page.locator('[data-restore-sheet-go]').click();
  await expect(D.page.getByText('A recovery code has 28 characters.')).toBeVisible();
  await shots(D.page, '18-restore-sheet-wrong-code');
  await input.fill(code);
  await D.page.locator('[data-restore-sheet-go]').click();
  const found = D.page.locator('[data-passkey-found]');
  await expect(found).toContainText('Found your records saved with VeilCore on', { timeout: 30_000 });
  await shots(D.page, '19-restore-sheet-found');
  await found.getByRole('button', { name: 'Bring them here' }).click();
  await expect(D.page.locator('[data-restore-done="account"]')).toHaveText(
    /Welcome back\. \d+ records? (is|are) here\./,
    {
      timeout: 30_000,
    },
  );
  expect(await recordIds(D.page)).toContain(plant);
  // Then a passkey of its own, added to the same records.
  const offer = D.page.locator('[data-restore-add-face-id="offer"]');
  await expect(offer).toContainText('Open them by yourself next time');
  await shots(D.page, '20-restore-sheet-welcome');
  await offer.locator('[data-restore-add-face-id-go]').click();
  await expect(D.page.locator('[data-restore-add-face-id="done"]')).toBeVisible({ timeout: 60_000 });
  await D.page.goto('/settings');
  await expect(D.page.locator('[data-settings-account="saved"]')).toContainText('New records save by themselves.');
  await expect(D.page.locator('[data-settings-make-sheet]')).toBeVisible();
  await shots(D.page, '21-settings-after-sheet-restore');
  await D.page.goto('/records');
  await expect(D.page.getByRole('heading', { name })).toBeVisible({ timeout: 30_000 });
  await expect(D.page.locator('[data-account-line]')).toHaveCount(0);
  expectNoErrors(A.errors);
  expectNoErrors(D.errors);
  await A.context.close();
  await D.context.close();
});

test('a passkey that stays on one device counts only once a recovery sheet is checked', async ({ browser }) => {
  test.setTimeout(300_000);
  const E = await device(browser, WINDOWS, undefined, { synced: false });
  const name = `Device-bound plant (practice) ${Date.now()}`;
  await logPlant(E.page, name);
  const sheet = E.page.locator('[data-keep-safe]');
  await expect(sheet).toBeVisible({ timeout: 60_000 });
  await sheet.locator('[data-keep-safe-go]').click();
  await expect(sheet.locator('[data-keep-safe-done="bound"]')).toBeVisible({ timeout: 60_000 });
  await expect(sheet.locator('[data-recovery-prompt="bound"]')).toContainText('Make it now: it is the only way back.');
  await shots(E.page, '22-saved-bound-recovery-offered');
  await sheet.getByRole('button', { name: 'I’ll do it later' }).click();
  const [plant] = await recordIds(E.page);
  const backedUp = () =>
    E.page.evaluate(
      (id) =>
        (
          JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as Record<string, { backedUpAt?: number }>
        )[id]?.backedUpAt,
      plant,
    );
  // The gate stays closed: not counted as backed up.
  expect(await backedUp()).toBeUndefined();
  await E.page.goto('/records');
  const line = E.page.locator('[data-account-line="bound"]');
  await expect(line).toContainText('Only this device can open your saved records.');
  await shots(E.page, '23-home-bound-make-sheet');
  await line.getByRole('button', { name: 'Make a recovery sheet' }).click();
  await makeAndCheckSheet(E.page, '24', { canSkip: false });
  await expect.poll(backedUp, { timeout: 30_000 }).toBeTruthy();
  await E.page.goto('/records');
  await expect(E.page.getByRole('heading', { name: 'Your records' })).toBeVisible();
  await expect(E.page.locator('[data-account-line]')).toHaveCount(0);
  await shots(E.page, '25-home-bound-counted');
  expectNoErrors(E.errors);
  await E.context.close();
});

test('stop saving on one device: the other says saving is off, stops trying, and saves again on one tap', async ({
  browser,
}) => {
  test.setTimeout(300_000);
  const A = await device(browser, IPHONE);
  const name = `Stop saving plant (practice) ${Date.now()}`;
  await logPlant(A.page, name);
  const sheet = A.page.locator('[data-keep-safe]');
  await expect(sheet).toBeVisible({ timeout: 60_000 });
  await sheet.getByRole('button', { name: 'Use Face ID' }).click();
  await expect(sheet.locator('[data-keep-safe-done="counted"]')).toBeVisible({ timeout: 60_000 });
  await sheet.getByRole('button', { name: 'Done' }).click();
  const { credentials } = (await A.cdp.send('WebAuthn.getCredentials', {
    authenticatorId: A.authenticatorId,
  })) as unknown as { credentials: Record<string, unknown>[] };

  // B gets the records back with the same passkey.
  const B = await device(browser, WINDOWS);
  await B.cdp.send('WebAuthn.addCredential', {
    authenticatorId: B.authenticatorId,
    credential: credentials[0],
  } as never);
  await B.page.goto('/restore');
  await B.page.locator('[data-passkey-restore]').click();
  await B.page.locator('[data-passkey-found]').getByRole('button', { name: 'Bring them here' }).click();
  await expect(B.page.locator('[data-restore-done="account"]')).toBeVisible({ timeout: 30_000 });
  await B.page.goto('/settings');
  await expect(B.page.locator('[data-settings-account="saved"]')).toContainText('New records save by themselves.');

  // A stops saving: the copy and its ways in are deleted at the registry.
  A.page.on('dialog', (d) => void d.accept());
  await A.page.goto('/settings');
  await A.page.getByRole('button', { name: 'Stop saving with VeilCore' }).click();
  await expect(A.page.getByText('Deleted. Your records stay on this device.')).toBeVisible({ timeout: 30_000 });

  // B, next time it opens: never "saved", one line on Home, Settings says it plainly.
  const writes: string[] = [];
  B.page.on('request', (r) => {
    const p = new URL(r.url()).pathname;
    if (/^\/account-copy\//.test(p) && !/\/head$/.test(p)) writes.push(`${r.method()} ${p}`);
  });
  await B.page.goto('/records');
  const line = B.page.locator('[data-account-line="missing"], [data-account-line="off"]');
  await expect(line).toBeVisible({ timeout: 30_000 });
  await expect(B.page.locator('[data-account-line]')).toHaveCount(1);
  await shots(B.page, '13-home-saving-off');
  await B.page.goto('/settings');
  const missing = B.page.locator('[data-settings-missing]');
  await expect(missing).toContainText('Saving with VeilCore is off.');
  await expect(B.page.locator('[data-settings-account]')).not.toContainText('only this device can open it');
  await shots(B.page, '14-settings-saving-off');
  // Nothing tried again by itself (the end-to-end build ticks every half second).
  await B.page.waitForTimeout(6000);
  expect(writes).toEqual([]);

  // One tap saves again, with the same passkey: a new copy, and B counts again.
  await B.page.locator('[data-settings-save-again]').click();
  await B.page.locator('[data-keep-safe-go]').click();
  await expect(B.page.locator('[data-keep-safe-done="counted"]')).toBeVisible({ timeout: 60_000 });
  await B.page.locator('[data-keep-safe]').getByRole('button', { name: 'Done' }).click();
  await expect(B.page.locator('[data-settings-account="saved"]')).toContainText('New records save by themselves.');
  await B.page.goto('/records');
  await expect(B.page.locator('[data-account-line]')).toHaveCount(0);
  expectNoErrors(A.errors);
  expectNoErrors(B.errors);
  await A.context.close();
  await B.context.close();
});
