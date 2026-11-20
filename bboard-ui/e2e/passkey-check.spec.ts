// The passkey check page (public/tools/passkey-check.html; docs/passkey-support.md) in the built
// site, with Chromium's virtual authenticator (DevTools WebAuthn domain) standing in for Face ID:
// a synced passkey with PRF, made by the page, then asked again as "my passkey for this site".
// Both tests must give the same check code, and the line to share holds no secret.
// SPDX-License-Identifier: Apache-2.0
import { expect, test, type Page } from '@playwright/test';
import { expectNoErrors, watch } from './helpers';

// WebAuthn takes no IP address as a site ("This is an invalid domain"), so the page is opened as
// localhost, as account-copy.spec.ts does. Nothing else may be reached: the page sends nothing.
const SITE = `http://localhost:${process.env.E2E_PORT ?? 4317}`;
const onlyTheSite = async (page: Page) => {
  const asked: string[] = [];
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(`${SITE}/`)) return route.continue();
    asked.push(url);
    return route.abort();
  });
  return asked;
};

const authenticator = async (page: Page, opts: { prf: boolean; synced: boolean }) => {
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
      hasPrf: opts.prf,
      defaultBackupEligibility: opts.synced,
      defaultBackupState: opts.synced,
    },
  });
};

test('a synced passkey with PRF: same secret twice, the same check code from both tests, nothing secret to share', async ({
  page,
}) => {
  const errors = watch(page);
  const asked = await onlyTheSite(page);
  await authenticator(page, { prf: true, synced: true });
  await page.goto(`${SITE}/tools/passkey-check.html?lang=en`);
  await expect(page.getByRole('heading', { name: 'Passkey check' })).toBeVisible();
  await expect(page.locator('[data-pk-caps]')).toContainText('Passkeys (WebAuthn)Yes');
  await expect(page.locator('[data-pk-line]')).toContainText('webauthn=yes');

  await page.getByRole('button', { name: 'Make a test passkey and test it' }).click();
  const result = page.locator('[data-pk-result]');
  await expect(result).toContainText('Passkey encryption (PRF)Yes');
  await expect(result).toContainText('Same secret both timesYes');
  await expect(result).toContainText('Synced to your other devicesYes: backed up');
  await expect(page.locator('#pk-verdict')).toHaveText('This passkey can lock and open data in this browser.');
  const line = (await page.locator('[data-pk-line]').textContent()) ?? '';
  expect(line).toMatch(/test=new · prf=yes · stable=yes · be=1 bs=1 · attach=platform · code=[0-9a-f]{8}$/);
  expect(line).not.toMatch(/[0-9a-f]{9,}/);
  const code = /code=([0-9a-f]{8})/.exec(line)?.[1];
  await page.screenshot({ path: test.info().outputPath('passkey-check-en.png'), fullPage: true });

  // The same passkey, found as "my passkey for this site": the same check code.
  await page.getByRole('button', { name: 'Test my passkey for this site' }).click();
  await expect(page.locator('[data-pk-line]')).toContainText('test=existing');
  await expect(page.locator('[data-pk-line]')).toContainText(`code=${code}`);
  expect(asked).toEqual([]);
  expectNoErrors(errors);
});

test('a device-bound passkey without PRF: says so, and what to use instead, in German', async ({ page }) => {
  const errors = watch(page);
  const asked = await onlyTheSite(page);
  await authenticator(page, { prf: false, synced: false });
  await page.goto(`${SITE}/tools/passkey-check.html?lang=de`);
  await expect(page.getByRole('heading', { name: 'Passkey-Prüfung' })).toBeVisible();
  await page.getByRole('button', { name: 'Einen Test-Passkey erstellen und prüfen' }).click();
  await expect(page.locator('#pk-verdict')).toContainText('liefert kein Geheimnis (kein PRF)');
  await expect(page.locator('[data-pk-result]')).toContainText('Nein: nur auf diesem Gerät');
  await expect(page.locator('[data-pk-line]')).toContainText('prf=no · be=0 bs=0');
  await page.screenshot({ path: test.info().outputPath('passkey-check-de-noprf.png'), fullPage: true });
  expect(asked).toEqual([]);
  expectNoErrors(errors);
});
