// Scan, don't type, and QR labels (docs/scan-and-labels.md), in the built site:
//   - a camera (Chromium's fake one, playing a QR code: fake-camera.ts) read by the bundled code
//     reader on this device: on /verify and in the app's paste box a scanned check link opens its
//     check page on this site, whatever host the code names;
//   - with no camera, the window says so and typing still works;
//   - a Bluetooth stick reader's burst (the number, then Enter or Tab) lands trimmed in the
//     animal's ID box, and Enter submits nothing;
//   - a saved record's "Print a QR label": by default the label shows the short ID and "Scan to
//     check", never the name; the name only when chosen; the print is the chosen paper, one page
//     per sheet (E2E_SHOTS saves the PDF and screenshots).
// SPDX-License-Identifier: Apache-2.0
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
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

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

const ID = `VEIL-${randomBytes(16).toString('hex').toUpperCase()}`;
const FP = randomBytes(32).toString('hex');
// A label printed elsewhere: the host is not this site, and only the path may be opened.
const SCANNED = `https://labels.example/verify/${ID}?fp=${FP}`;
const SHOTS = process.env.E2E_SHOTS;

// Every test here runs in a browser whose camera sees the label (the "no camera" test takes the
// camera away inside its page).
test.use({ launchOptions: { args: fakeCameraArgs(qrVideo(SCANNED, 'label')) } });

test.describe('a camera that sees a VeilCore label', () => {
  test('/verify: Scan reads the QR code on this device and opens its check page here', async ({ page }) => {
    const errors = watch(page);
    const asked: string[] = [];
    page.on('request', (r) => asked.push(r.url()));
    await isolate(page, { 'GET /verify/:record': (route) => json(route, 404, { found: false }) });
    await page.goto('/verify?lang=en');
    await page.getByRole('button', { name: 'Scan a label’s QR code' }).click();
    // Read on the device (the window can open and close faster than a check can see it): the
    // code's own host is never asked for anything.
    await expect(page).toHaveURL(new RegExp(`/verify/${ID}\\?fp=${FP}$`), { timeout: 30_000 });
    await expect(page.getByRole('dialog', { name: 'Scan a code' })).toBeHidden();
    expect(asked.filter((u) => u.includes('labels.example'))).toEqual([]);
    // The bundled reader's WebAssembly came from this site, and nothing from a CDN.
    expect(asked.some((u) => /\/assets\/zxing_reader-[\w-]+\.wasm$/.test(u))).toBe(true);
    expect(asked.filter((u) => /jsdelivr|unpkg|cdn/i.test(u))).toEqual([]);
    expectNoErrors(errors);
  });

  test('the paste box: Scan opens a scanned check link, as Go would', async ({ page }) => {
    const errors = watch(page);
    await page.addInitScript(() => localStorage.setItem('veilcore.role.v1', 'breeder'));
    await isolate(page, {
      'GET /api/records': (route) => json(route, 200, []),
      'GET /api/licenses': (route) => json(route, 200, []),
      'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
      'GET /verify/:record': (route) => json(route, 404, { found: false }),
    });
    await page.goto('/records?paste&lang=en');
    const box = page.locator('[data-paste-box]');
    await box.getByRole('button', { name: 'Scan a QR code or barcode into this box' }).click();
    await expect(page).toHaveURL(new RegExp(`/verify/${ID}\\?fp=${FP}$`), { timeout: 30_000 });
    expectNoErrors(errors);
  });
});

test('while it looks: the camera view, what to do, and the way out; closing lets the camera go', async ({ page }) => {
  const errors = watch(page);
  await page.addInitScript(() => {
    localStorage.setItem('veilcore.role.v1', 'breeder');
    // A camera that sees no code: a grey picture.
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: () => {
        const c = document.createElement('canvas');
        c.width = 640;
        c.height = 480;
        const g = c.getContext('2d')!;
        g.fillStyle = '#888';
        g.fillRect(0, 0, 640, 480);
        const stream = c.captureStream(5);
        (window as unknown as { cam: MediaStream }).cam = stream;
        return Promise.resolve(stream);
      },
    });
  });
  await isolate(page, {
    'GET /api/records': (route) => json(route, 200, []),
    'GET /api/licenses': (route) => json(route, 200, []),
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
  });
  await page.goto('/records?paste&lang=en');
  await page
    .locator('[data-paste-box]')
    .getByRole('button', { name: 'Scan a QR code or barcode into this box' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Scan a code' });
  await expect(dialog.getByText(/Point the camera at the QR code or barcode/)).toBeVisible({ timeout: 30_000 });
  await expect(dialog.getByLabel('Camera view')).toBeVisible();
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS, 'scan-dialog-390.png') });
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { cam: MediaStream }).cam.getTracks().map((t) => t.readyState)),
    )
    .toEqual(['ended']);
  expectNoErrors(errors);
});

test('no camera: the window says so, and typing still works', async ({ page }) => {
  const errors = watch(page);
  await isolate(page);
  // A browser with no camera at all.
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: () => Promise.reject(new DOMException('no camera', 'NotFoundError')),
    });
  });
  await page.goto('/verify?lang=en');
  await page.getByRole('button', { name: 'Scan a label’s QR code' }).click();
  await expect(page.locator('[data-scan-problem="noCamera"]')).toContainText('No camera was found');
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS, 'verify-no-camera-390.png') });
  }
  // The way out has the focus, and closes the window.
  await expect(page.getByRole('button', { name: 'Type it instead' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByLabel('Record identifier').fill('VEIL-0001');
  await expect(page.getByLabel('Record identifier')).toHaveValue('VEIL-0001');
  expectNoErrors(errors);
});

test('a Bluetooth stick reader types an ear tag in: trimmed, and Enter submits nothing', async ({ page }) => {
  const errors = watch(page);
  await page.addInitScript(() => localStorage.setItem('veilcore.role.v1', 'breeder'));
  await isolate(page);
  await page.goto('/new?lang=en');
  await page.locator('[data-screen-heading]').first().waitFor();
  await page.locator('[data-start="animal"]').click();
  const id = page.getByLabel('Individual ID', { exact: true });
  await expect(page.locator('[data-reader-help]')).toContainText('Bluetooth stick reader');
  await expect(page.getByRole('button', { name: 'Scan a QR code or barcode into this box' }).first()).toBeVisible();

  // A reader set to send a space before the number and Enter after it, typing fast.
  await id.click();
  await page.keyboard.type(' 982 000123456789 ', { delay: 3 });
  await page.keyboard.press('Enter');
  await expect(id).toHaveValue('982 000123456789');
  await expect(id).toBeFocused();
  await expect(page.locator('[data-animal-form]')).toBeVisible();

  // One set to send Tab: trimmed, and the focus moves on.
  await id.fill('');
  await page.keyboard.type('840003123456789 ', { delay: 3 });
  await page.keyboard.press('Tab');
  await expect(id).toHaveValue('840003123456789');
  await expect(id).not.toBeFocused();
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    await id.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(SHOTS, 'animal-id-390.png') });
    await page.setViewportSize({ width: 1366, height: 900 });
    await id.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(SHOTS, 'animal-id-1366.png') });
  }
  expectNoErrors(errors);
});

type Rec = Record<string, unknown> & { id: string; recordFingerprint?: string };

test('a saved record prints QR labels: the short ID by default, the name only when chosen', async ({ page }) => {
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

  const NAME = 'Label Me (test data)';
  await page.goto('/new?lang=en');
  await startPlant(page);
  await page.getByLabel(/Plant or line name/).fill(NAME);
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
  await page.getByRole('button', { name: 'Print a QR label' }).click();
  await expect(page.getByRole('heading', { name: 'Print QR labels', level: 1 })).toBeVisible();
  // The record the page was opened from is ticked; nothing went into the address.
  await expect(page.getByRole('checkbox', { name: new RegExp(NAME.replace(/[()]/g, '\\$&')) })).toBeChecked();
  expect(new URL(page.url()).search).toBe('');

  // By default: the short ID and "Scan to check", no name, on a US Letter sheet of 30.
  const sheet = page.locator('[data-label-print]');
  const short = `${id.slice(0, 9)}…${id.slice(-4)}`;
  await expect(sheet.locator('[data-label]')).toHaveCount(1);
  await expect(sheet).toContainText(short);
  await expect(sheet).toContainText('Scan to check');
  await expect(sheet).not.toContainText(NAME);
  await expect(page.locator('[data-labels-note="id"]')).toContainText('only the record ID and its proof code');
  const svg = sheet.locator('svg.label-page').first();
  await expect(svg).toHaveAttribute('width', `${8.5 * 25.4}mm`);
  await expect(svg).toHaveAttribute('height', `${11 * 25.4}mm`);
  expect(await svg.locator('.label-outline').count()).toBe(30);

  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS, 'labels-390-default.png'), fullPage: true });
    await page.emulateMedia({ media: 'print' });
    fs.writeFileSync(path.join(SHOTS, 'labels-letter-default.pdf'), await page.pdf({ preferCSSPageSize: true }));
    await page.emulateMedia({ media: 'screen' });
  }

  // The name, only when chosen; three copies, after five labels already used.
  await page.getByLabel('The record’s name too').check();
  await expect(page.locator('[data-labels-note="name"]')).toContainText('anyone who scans it sees the name');
  await expect(sheet).toContainText(NAME.slice(0, 10));
  await page.getByLabel('Labels for each record').fill('3');
  await page.getByLabel('Labels already used on the first sheet').fill('5');
  await expect(sheet.locator('[data-label]')).toHaveCount(3);
  await expect(page.locator('[data-labels-print]')).toContainText('3 labels');

  // Thermal: one 2 × 1 inch label a page, three pages.
  await page.getByRole('combobox', { name: 'Label size' }).click();
  await page.getByRole('option', { name: /2 × 1 inch/ }).click();
  await expect(sheet.locator('svg.label-page')).toHaveCount(3);
  await expect(sheet.locator('svg.label-page').first()).toHaveAttribute('width', `${2 * 25.4}mm`);

  // What prints: only the labels, each page its own sheet of that size.
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('[data-no-print]').first()).toBeHidden();
  await expect(sheet).toBeVisible();
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const pages = pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? [];
  expect(pages).toHaveLength(3);
  // 2 × 1 in is 144 × 72 points.
  expect(pdf.toString('latin1')).toMatch(/\/MediaBox \[0 0 144 72\]/);
  if (SHOTS) fs.writeFileSync(path.join(SHOTS, 'labels-thermal.pdf'), pdf);
  await page.emulateMedia({ media: 'screen' });

  if (SHOTS) {
    await page.getByRole('combobox', { name: 'Label size' }).click();
    await page.getByRole('option', { name: /A4 sheet/ }).click();
    await page.emulateMedia({ media: 'print' });
    fs.writeFileSync(path.join(SHOTS, 'labels-a4.pdf'), await page.pdf({ preferCSSPageSize: true }));
    await page.emulateMedia({ media: 'screen' });
    await page.getByRole('combobox', { name: 'Label size' }).click();
    await page.getByRole('option', { name: /US Letter/ }).click();
    await page.emulateMedia({ media: 'print' });
    fs.writeFileSync(path.join(SHOTS, 'labels-letter.pdf'), await page.pdf({ preferCSSPageSize: true }));
    await page.emulateMedia({ media: 'screen' });
    await page.screenshot({ path: path.join(SHOTS, 'labels-390-name.png'), fullPage: true });
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.screenshot({ path: path.join(SHOTS, 'labels-1366.png'), fullPage: true });
    await page.goto(`/record/${id}?lang=en`);
    await page.getByRole('button', { name: 'Print a QR label' }).waitFor();
    await page.screenshot({ path: path.join(SHOTS, 'record-1366.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(SHOTS, 'record-390.png') });
  }
  expectNoErrors(errors);
});
