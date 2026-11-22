// The proof code as a QR code, scanned into a lab's result form (docs/scan-and-labels.md "Proof
// code QR"), in the built site with the stand-in registry:
//   - the record page shows the proof code as a QR code under Technical details, and that QR code
//     reads back (with zxing-wasm, the site's own reader) as VCP + the code + its check;
//   - on /lab/results the proof code box has a Scan button; the camera (Chromium's fake one,
//     playing the record page's QR code: fake-camera.ts) opens only when it is tapped, and the
//     box ends up with the plain code;
//   - a USB barcode scanner typing the QR text and Enter lands the plain code, and Enter signs
//     nothing; a garbled reading and a code that isn't a proof code say so at once;
//   - paste keeps working: the bare code, and a label's check link with the name's salt in it;
//     a whole code shows its last 6 characters large, to check against the code the sender gave;
//   - the spreadsheet's help says a USB scanner can fill the subject column.
// E2E_SHOTS saves screenshots at 390 and 1366 px.
// SPDX-License-Identifier: Apache-2.0
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';
import { generateKeypair } from 'veilcore-records';
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import {
  REAL_REGISTRY,
  expectNoErrors,
  holdVaultKey,
  isolate,
  json,
  newVaultKey,
  plainRowRefusal,
  saveAndCheckBackup,
  startPlant,
  watch,
} from './helpers';
import { fakeCameraArgs, qrVideo } from './fake-camera';
import { proofCodeQrText } from '../src/veilcore/proof-code-qr';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

const FP = randomBytes(32).toString('hex');
const QR = proofCodeQrText(FP);
const SHOTS = process.env.E2E_SHOTS;
const SCAN = 'Scan a QR code or barcode into this box';
const BOX = 'Proof code the sender gave for this sample';

// The camera sees the record page's QR code for this proof code.
test.use({ launchOptions: { args: fakeCameraArgs(qrVideo(QR, 'proof-code')) } });

const shoot = async (page: Page, name: string, at?: () => Promise<void>) => {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const width of [390, 1366]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await at?.();
    await page.screenshot({ path: path.join(SHOTS, `${name}-${width}.png`) });
  }
  await page.setViewportSize({ width: 390, height: 844 });
};

/** A lab's page, with a signing key in this browser (made here, never published). */
const openLabPage = async (page: Page) => {
  const keypair = await generateKeypair();
  await page.addInitScript(
    (k) => localStorage.setItem('veilcore.attester.v1', JSON.stringify({ keypair: k, role: 'laboratory' })),
    keypair,
  );
  await isolate(page, {
    'GET /api/records': (route) => json(route, 200, []),
    'GET /api/licenses': (route) => json(route, 200, []),
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
  });
  await page.goto('/lab/results?lang=en');
  await expect(page.getByRole('heading', { name: 'Sign lab results', level: 1 })).toBeVisible();
  return page.getByLabel(BOX, { exact: true });
};

test('the lab form: Scan is beside the proof code box, the camera opens only on a tap, and reads the code', async ({
  page,
}) => {
  const errors = watch(page);
  // Count every time the page asks for the camera.
  await page.addInitScript(() => {
    const md = navigator.mediaDevices;
    const real = md.getUserMedia.bind(md);
    (window as unknown as { asked: number }).asked = 0;
    md.getUserMedia = (c) => {
      (window as unknown as { asked: number }).asked++;
      return real(c);
    };
  });
  const box = await openLabPage(page);
  const field = page.locator('.MuiFormControl-root', { has: box });
  await expect(field.getByRole('button', { name: SCAN })).toBeVisible();
  await expect(field).toContainText('A USB barcode scanner works too');
  expect(await page.evaluate(() => (window as unknown as { asked: number }).asked)).toBe(0);
  await shoot(page, 'lab-proof-code-box', () => box.scrollIntoViewIfNeeded());

  await field.getByRole('button', { name: SCAN }).click();
  await expect(box).toHaveValue(FP, { timeout: 30_000 });
  expect(await page.evaluate(() => (window as unknown as { asked: number }).asked)).toBe(1);
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(box).toHaveAttribute('data-proof-code-problem', '');
  await shoot(page, 'lab-proof-code-scanned', () => box.scrollIntoViewIfNeeded());
  expectNoErrors(errors);
});

test('a USB barcode scanner types the QR code in: the plain code lands, Enter signs nothing; bad readings say so', async ({
  page,
}) => {
  const errors = watch(page);
  const box = await openLabPage(page);
  const field = page.locator('.MuiFormControl-root', { has: box });
  const signed: string[] = [];
  page.on('request', (r) => r.method() !== 'GET' && signed.push(r.url()));

  // The scanner: the QR text as a fast burst of keys, then Enter.
  await box.click();
  await page.keyboard.type(QR, { delay: 2 });
  await page.keyboard.press('Enter');
  await expect(box).toHaveValue(FP);
  await expect(box).toBeFocused();
  await expect(page.locator('[data-result-form]')).toBeVisible();
  expect(signed).toEqual([]);

  // One with Caps Lock on, and no Enter: still read.
  await box.fill('');
  await page.keyboard.type(QR.toLowerCase(), { delay: 2 });
  await expect(box).toHaveValue(FP);

  // A garbled reading (one character wrong, as a scanner set for another keyboard layout types
  // it): refused at once, with what to do.
  await box.fill('');
  const garbled = `${QR.slice(0, 20)}${QR[20] === '0' ? '1' : '0'}${QR.slice(21)}`;
  await page.keyboard.type(garbled, { delay: 2 });
  await expect(box).toHaveAttribute('data-proof-code-problem', 'check');
  await expect(field.getByRole('alert')).toContainText('That code didn’t read correctly');
  await expect(field.getByRole('alert')).toContainText('keyboard layout');
  await shoot(page, 'lab-proof-code-bad-scan', () => box.scrollIntoViewIfNeeded());

  // Something that isn't a proof code (an ear tag), then Enter: said, and nothing is guessed.
  await box.fill('');
  await page.keyboard.type('982000123456789', { delay: 2 });
  await page.keyboard.press('Enter');
  await expect(box).toHaveValue('982000123456789');
  await expect(box).toHaveAttribute('data-proof-code-problem', 'notCode');
  await expect(field.getByRole('alert')).toContainText('That isn’t a proof code');

  // Fixing it clears the message.
  await box.fill(FP);
  await expect(box).toHaveAttribute('data-proof-code-problem', '');
  await expect(field.getByRole('alert')).toHaveCount(0);
  expect(signed).toEqual([]);
  expectNoErrors(errors);
});

test('paste keeps working: the bare code, and a label’s check link with the name in it', async ({ page }) => {
  const errors = watch(page);
  const box = await openLabPage(page);
  await box.fill(FP.toUpperCase());
  await expect(box).toHaveValue(FP);
  // The code's last 6 characters, large, to check against the code the sender gave (security
  // review: a scan of the wrong tube would otherwise go unnoticed).
  const end = page.locator('[data-proof-code-end]');
  await expect(end).toHaveAttribute('data-proof-code-end', FP.slice(-6));
  await expect(end).toContainText(FP.slice(-6));
  await expect(end).toContainText('Check they match the end of the proof code the sender gave for this sample');
  await shoot(page, 'lab-proof-code-end', () => end.scrollIntoViewIfNeeded());
  // Not a whole code: nothing to check yet.
  await box.fill(FP.slice(0, 40));
  await expect(end).toHaveCount(0);
  await box.fill(FP);
  await expect(end).toBeVisible();
  const salt = randomBytes(32).toString('hex');
  await box.fill(`https://veilcore.org/verify/VEIL-3F9A0000C21B?fp=${FP}#n=Blue+Dream&ns=${salt}`);
  await expect(box).toHaveValue(FP);
  await expect(box).toHaveAttribute('data-proof-code-problem', '');

  // The spreadsheet says the subject column can be scanned.
  await page.getByRole('tab', { name: 'From a spreadsheet (CSV)' }).click();
  await expect(page.locator('[data-lab-csv]')).toContainText('A USB barcode scanner can fill the subject column');
  expectNoErrors(errors);
});

type Rec = Record<string, unknown> & { id: string; recordFingerprint?: string };

test('the record page shows the proof code as a QR code that reads back as VCP, the code and its check', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const errors = watch(page);
  const held: { records: Rec[] } = { records: [] };
  await page.addInitScript((h) => {
    if (!localStorage.getItem('veilcore.holder.v1')) localStorage.setItem('veilcore.holder.v1', h);
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
  await page.goto('/new?lang=en');
  await startPlant(page);
  await page.getByLabel(/Plant or line name/).fill('QR Proof Code (test data)');
  await page.getByLabel(/Bred by/).fill('E2E breeder');
  await page.getByRole('button', { name: /Next: check it/ }).click();
  await page.getByRole('button', { name: /Seal it/ }).click();
  await page.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
  await page.getByRole('button', { name: /No report yet: skip/ }).click();
  await saveAndCheckBackup(page);
  await page.getByRole('button', { name: /Finish/ }).click();
  await expect.poll(() => held.records.length, { timeout: 60_000 }).toBe(1);
  const { id } = held.records[0];

  await page.goto(`/record/${id}?lang=en`);
  await page.getByRole('button', { name: 'Technical details' }).click();
  const code = (await page.locator('[data-proof-code]').innerText()).trim();
  expect(code).toMatch(/^[0-9a-f]{64}$/);
  const qr = page.locator('[data-proof-code-qr]');
  await expect(qr).toHaveAttribute('data-proof-code-qr', proofCodeQrText(code));
  await expect(qr.getByRole('img', { name: 'QR code of this proof code, for a lab to scan' })).toBeVisible();
  await expect(qr).toContainText('A lab can scan this into its result form');

  // What a camera sees: the drawn QR code, read with the site's own reader.
  const png = await qr.locator('svg').screenshot({ scale: 'device' });
  const wasm = fs.readFileSync(createRequire(import.meta.url).resolve('zxing-wasm/reader/zxing_reader.wasm'));
  await prepareZXingModule({ overrides: { wasmBinary: wasm.buffer as ArrayBuffer }, fireImmediately: true });
  const [read] = await readBarcodes(new Blob([new Uint8Array(png)]), { formats: ['QRCode'] });
  expect(read?.text).toBe(proofCodeQrText(code));

  await shoot(page, 'record-proof-code-qr', () => qr.scrollIntoViewIfNeeded());
  expectNoErrors(errors);
});
