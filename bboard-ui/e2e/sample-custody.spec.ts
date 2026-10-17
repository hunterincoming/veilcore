// The sample's chain of custody against a REAL registry (E2E_API_BASE, see e2e/README.md):
// the breeder writes the sample's label and seal with the lab code, the lab confirms or
// corrects them and signs its receipt over both, and a difference shows plainly on the
// breeder's plant page, certificate and check page, and on the lab's own plant page.
//
// Since round 3 of sealed records (CONTRACT.md #27) both sides are sealed with the delivery's
// offer key before they leave the browser: the registry stores two locked boxes, the lab's
// receipt carries the salted v2 digest (`_sc2_`), and only the two apps can open and compare
// them. With E2E_REGISTRY_DB, the registry's database file is read byte for byte: nothing the
// breeder or the lab typed about the sample is in it, or in any request the app made.
// Skipped without a real registry.
// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import {
  API,
  REAL_REGISTRY,
  backupAfterLogging,
  expectNoErrors,
  isolate,
  receiveWithBackupFirst,
  untilSaved,
  watch,
} from './helpers';

test.skip(!REAL_REGISTRY, 'needs a real registry: set E2E_API_BASE and build with it');

const DB = process.env.E2E_REGISTRY_DB ?? '';

const shot = async (page: Page, name: string) => {
  if (process.env.E2E_SHOTS) await page.screenshot({ path: `${process.env.E2E_SHOTS}/${name}.png`, fullPage: true });
};

/** What the breeder and the lab type about the sample: unique per run, so a scan finds only these. */
const typedFor = (tag: string) => {
  const u = `${tag}${Date.now().toString(36)}`.toUpperCase();
  return {
    sampleId: `BLU-${u}`,
    seal: `4471${u}`,
    takenFrom: `Mother M3 bench ${u}`,
    takenOn: '2024-02-29',
    witness: `J. Doe ${u}`,
    arrivedOn: '2024-03-01',
    condition: `Cold bag dry ${u}`,
    labRef: `ACC-${u}`,
  };
};
type Typed = ReturnType<typeof typedFor>;

/** Every request the app makes to the registry, as sent: URL, headers and body. */
const record = (ctx: BrowserContext, into: string[]) =>
  ctx.on('request', (req) => {
    if (!req.url().startsWith(API)) return;
    into.push(`${req.method()} ${req.url()}\n${JSON.stringify(req.headers())}\n${req.postData() ?? ''}`);
  });

/** The registry's database file, with any journal beside it. */
const dbBytes = (): Buffer =>
  Buffer.concat([DB, `${DB}-wal`, `${DB}-journal`].filter((f) => fs.existsSync(f)).map((f) => fs.readFileSync(f)));

/** A side sealed as the site seals it (vault.ts sealCustody), with the offer key from the lab code. */
const sealSide = (code: string, transferId: string, side: 'sample' | 'arrival', value: Record<string, string>) => {
  const part = code.split('.').find((p) => /^o1[A-Za-z0-9_-]{43}$/.test(p)) ?? '';
  const key = Buffer.from(part.slice(2), 'base64url');
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  c.setAAD(Buffer.from(`veilcore:sealed:v1\0custody\0${transferId}\0${side}`, 'utf8'));
  const ct = Buffer.concat([c.update(JSON.stringify(value), 'utf8'), c.final(), c.getAuthTag()]);
  const kid = createHash('sha256')
    .update(Buffer.concat([Buffer.from('veilcore:offer-id:v1:', 'utf8'), key]))
    .digest('hex')
    .slice(0, 16);
  return { v: 1, alg: 'A256GCM', kid, iv: iv.toString('base64url'), ct: ct.toString('base64url') };
};

const BOX_KEYS = ['alg', 'ct', 'iv', 'kid', 'v'];

/** A breeder logs a plant and makes a lab code with the sample's details; the lab receives it and signs. */
const sendAndReceive = async (browser: Browser, t: Typed, arrivedSeal: string, tag: string) => {
  const requests: string[] = [];
  const breederCtx = await browser.newContext();
  record(breederCtx, requests);
  const breeder = await breederCtx.newPage();
  const breederErrors = watch(breeder);
  await isolate(breeder);
  await breeder.goto('/records');
  await breeder.getByRole('button', { name: /I breed or hold genetics/ }).click();
  await breeder.getByText('Start', { exact: true }).click();
  await breeder.getByLabel(/Plant or line name/).fill(`E2E Custody ${tag} ${Date.now()}`);
  await breeder.getByLabel(/Bred by/).fill('E2E');
  await breeder.getByRole('button', { name: /Next: check it/ }).click();
  await breeder.getByRole('button', { name: /Seal it/ }).click();
  await breeder.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
  const recordId = await breeder.evaluate(
    () => Object.keys(JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as object)[0],
  );
  await backupAfterLogging(breeder, recordId);
  await breeder.goto(`/record/${recordId}`);
  await breeder.getByText('Send it to a lab or breeder').click();
  await breeder.getByLabel(/Who are you sending it to/).fill('lab@e2e');
  await breeder.getByRole('button', { name: /Add the sample.s label and seal/ }).click();
  await breeder.getByLabel(/Sample ID \/ label on the tube or bag/).fill(t.sampleId);
  await breeder.getByLabel(/Seal or bag number/).fill(t.seal);
  await breeder.getByLabel(/^Taken from/).fill(t.takenFrom);
  await breeder.getByLabel(/^Taken on/).fill(t.takenOn);
  await breeder.getByLabel(/^Witness/).fill(t.witness);
  await shot(breeder, `custody-${tag}-1-send`);
  await breeder.getByRole('button', { name: /Make a code for the lab/ }).click();
  const codeEl = breeder.getByText(/^TR-[0-9A-F]{8}\./);
  await expect(codeEl).toBeVisible();
  const code = (await codeEl.innerText()).trim();
  await expect(breeder.locator('[data-sample-sent]')).toContainText(`Sample ${t.sampleId} · seal ${t.seal}`);
  await expect(breeder.locator('[data-sample-not-saved]')).toHaveCount(0);
  await breeder.getByRole('button', { name: /^Done$/ }).click();

  const labCtx = await browser.newContext();
  record(labCtx, requests);
  const lab = await labCtx.newPage();
  const labErrors = watch(lab);
  await isolate(lab);
  await lab.goto('/records');
  await lab.getByRole('button', { name: /I run a lab/ }).click();
  await lab.getByRole('button', { name: /Set up your lab.s signature/ }).click();
  await lab.getByLabel(/^Name/).fill('E2E Lab');
  await lab.getByRole('button', { name: /Create my key/ }).click();
  await lab.getByRole('button', { name: /^Done$/ }).click();
  await receiveWithBackupFirst(lab, code);

  // The form starts from what the breeder wrote, opened in the lab's browser with the code's
  // key; the lab confirms or corrects it.
  await expect(lab.getByLabel('Sample ID on arrival')).toHaveValue(t.sampleId);
  await expect(lab.getByLabel('Seal number on arrival')).toHaveValue(t.seal);
  await expect(lab.locator('[data-receipt-statement]')).toContainText(
    `The breeder wrote: Sample ${t.sampleId} · seal ${t.seal} · taken from ${t.takenFrom} on ${t.takenOn} · witness ${t.witness} (VeilCore doesn’t check this)`,
  );
  await lab.getByLabel('Seal number on arrival').fill(arrivedSeal);
  await lab.getByLabel('Yes', { exact: true }).check();
  await lab.getByLabel('Arrived on').fill(t.arrivedOn);
  await lab.getByLabel('Condition').fill(t.condition);
  await lab.getByLabel('Your accession no.').fill(t.labRef);
  if (arrivedSeal !== t.seal) {
    await expect(lab.locator('[data-arrival-differs]')).toContainText(
      `Seal number differs: sent ${t.seal}, received ${arrivedSeal}.`,
    );
  } else {
    await expect(lab.locator('[data-arrival-differs]')).toHaveCount(0);
  }
  await expect(lab.locator('[data-receipt-statement]')).toContainText(
    `On arrival: Sample ${t.sampleId} · seal ${arrivedSeal}, seal intact · arrived ${t.arrivedOn} · condition: ${t.condition} · lab no. ${t.labRef}`,
  );
  await shot(lab, `custody-${tag}-2-sign`);
  await lab.getByLabel(/I physically received this material/).check();
  await lab.getByRole('button', { name: /Sign with my key/ }).click();
  await expect(lab).toHaveURL(/\/record\//);

  return {
    breeder,
    lab,
    breederCtx,
    labCtx,
    breederErrors,
    labErrors,
    recordId,
    code,
    transferId: code.split('.')[0],
    requests,
  };
};

/** Nothing typed about the sample in any request the app made, or in the registry's database file. */
const expectNothingTypedOnTheServer = (t: Typed, requests: string[], extra: string[] = []) => {
  const values = [t.sampleId, t.seal, t.takenFrom, t.witness, t.condition, t.labRef, t.takenOn, t.arrivedOn, ...extra];
  expect(requests.length).toBeGreaterThan(0);
  for (const r of requests) for (const v of values) expect(r.includes(v), `${v} in ${r.split('\n')[0]}`).toBe(false);
  if (!DB) return;
  const bytes = dbBytes();
  expect(bytes.length).toBeGreaterThan(0);
  for (const v of values)
    expect(bytes.includes(Buffer.from(v, 'utf8')), `${v} in the registry’s database file`).toBe(false);
};

test('a matching seal: sealed on the way, the receipt covers the sample details and the breeder sees "covered"', async ({
  browser,
}) => {
  const t = typedFor('match');
  const r = await sendAndReceive(browser, t, t.seal, 'match');

  // What the registry holds: two locked boxes under the delivery's offer key, and a receipt
  // whose id carries the salted v2 digest.
  const holder = await r.breeder.evaluate(() => localStorage.getItem('veilcore.holder.v1') ?? '');
  const custody = (await (
    await fetch(`${API}/transfers/${r.transferId}/custody`, { headers: { 'x-holder-key': holder } })
  ).json()) as { sample: Record<string, unknown>; arrival: Record<string, unknown>; receiptAttestationId: string };
  expect(Object.keys(custody.sample).sort()).toEqual(BOX_KEYS);
  expect(Object.keys(custody.arrival).sort()).toEqual(BOX_KEYS);
  expect(custody.arrival.kid).toBe(custody.sample.kid);
  expect(custody.receiptAttestationId).toMatch(/^att_[0-9a-f]{16}_sc2_[0-9a-f]{64}$/);

  // The lab's plant page, opened with the key its record keeps.
  await expect(r.lab.locator('[data-sample-details]')).toContainText(
    `The breeder wrote: Sample ${t.sampleId} · seal ${t.seal}`,
  );
  await expect(r.lab.locator('[data-arrival-details]')).toContainText(
    `On arrival (your receipt): Sample ${t.sampleId} · seal ${t.seal}, seal intact`,
  );
  await expect(r.lab.locator('[data-custody-line]')).toHaveCount(0);

  // The breeder's plant page: worked out in the breeder's browser from the opened boxes.
  await r.breeder.goto(`/record/${r.recordId}`);
  const row = r.breeder.locator('[data-status-row="Receipt signed"]');
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute('data-custody', 'covered');
  await expect(row).toContainText('Sample ID and seal number match what was sent.');
  await shot(r.breeder, 'custody-match-3-plant');

  // None of it reached the registry readable: not in a request, not in its database file.
  expectNothingTypedOnTheServer(t, r.requests);

  expectNoErrors(r.breederErrors);
  expectNoErrors(r.labErrors);
  await r.breederCtx.close();
  await r.labCtx.close();
});

test('a different seal number: said plainly on the breeder’s plant page, certificate and check page, and the lab’s', async ({
  browser,
}) => {
  const t = typedFor('differs');
  const arrived = `4417${t.seal.slice(4)}`;
  const r = await sendAndReceive(browser, t, arrived, 'differs');
  const line = `Seal number differs: sent ${t.seal}, received ${arrived}.`;

  // The lab's plant page.
  await expect(r.lab.locator('[data-custody-line]')).toHaveText(line);
  await shot(r.lab, 'custody-differs-3-lab');

  // The breeder's plant page.
  await r.breeder.goto(`/record/${r.recordId}`);
  const row = r.breeder.locator('[data-status-row="Receipt signed"]');
  await expect(row).toContainText(line);
  await expect(row).toHaveAttribute('data-custody', 'covered');
  await expect(row).not.toContainText(/match what was sent/);
  await shot(r.breeder, 'custody-differs-4-plant');

  // The certificate.
  await r.breeder.getByText('Certificate', { exact: true }).click();
  const cert = r.breeder.locator('[data-custody-line]');
  await expect(cert.first()).toHaveText(line);
  await expect(cert.nth(1)).toContainText(`Sent: Sample ${t.sampleId} · seal ${t.seal}`);
  await expect(cert.nth(2)).toContainText(
    `Received: Sample ${t.sampleId} · seal ${arrived}, seal intact · arrived ${t.arrivedOn}`,
  );
  await shot(r.breeder, 'custody-differs-5-certificate');

  // The check page, in the breeder's own browser, reached from inside the app: the public
  // check page loads no records of its own (App.tsx), so a fresh load of it can't know the
  // plant is this browser's.
  await r.breeder.goto(`/record/${r.recordId}`);
  await expect(r.breeder.locator('[data-status-row="Receipt signed"]')).toBeVisible();
  await r.breeder.evaluate((path) => {
    history.pushState({}, '', path);
    dispatchEvent(new PopStateEvent('popstate'));
  }, `/verify/${r.recordId}`);
  await expect(r.breeder.getByText(/linked to your delivery TR-/)).toBeVisible();
  await expect(r.breeder.locator('[data-custody-line]').first()).toHaveText(line);
  await shot(r.breeder, 'custody-differs-6-check');

  // A stranger's check page: with the holder sharing the lab status, the registry says only
  // that the lab's receipt names sample details, which it can't open or check; what the holder's app
  // worked out comes as the sender's word, by field name, never a value.
  const breederKey = await r.breeder.evaluate(() => localStorage.getItem('veilcore.holder.v1') ?? '');
  const publicView = async () =>
    (await (await fetch(`${API}/verify/${r.recordId}`)).json()) as {
      custody?: { receiptAttestationId: string }[];
      recordFingerprint?: string;
      staleGrant?: string[];
    };
  const before = await publicView();
  expect(before.custody).toBeUndefined();
  const share = (values: Record<string, unknown>) =>
    fetch(`${API}/api/records/${r.recordId}/disclosure`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'x-holder-key': breederKey },
      body: JSON.stringify({
        show: ['existence', 'attestation-status'],
        forFingerprint: before.recordFingerprint,
        values,
      }),
    });
  expect((await share({})).status).toBe(200);
  const shared = await publicView();
  const receiptId = shared.custody?.[0]?.receiptAttestationId ?? '';
  expect(receiptId).toMatch(/^att_[0-9a-f]{16}_sc2_[0-9a-f]{64}$/);
  expect(shared.custody).toEqual([
    {
      receiptAttestationId: receiptId,
      custody: 'sealed',
      receiptNamesSampleDetails: true,
      sampleDetailsCheckedBy: 'holder',
    },
  ]);
  expect(shared.staleGrant).toBeUndefined();
  const strangerCtx = await browser.newContext();
  const stranger = await strangerCtx.newPage();
  const strangerErrors = watch(stranger);
  await stranger.goto(`/verify/${r.recordId}`);
  const signedOver =
    'The lab’s receipt names sample details. They are stored locked, and VeilCore doesn’t have the key, so this page can’t check them; the holder’s app can.';
  await expect(stranger.locator('[data-public-custody]')).toContainText(signedOver);
  // The summary the holder's app publishes with the grant (disclosure.ts grantValuesNow).
  expect(
    (
      await share({
        custodySummary: [{ receiptAttestationId: receiptId, covered: 'covered', differingFields: ['sealNumber'] }],
      })
    ).status,
  ).toBe(200);
  await stranger.reload();
  await expect(stranger.locator('[data-public-custody]')).toContainText(
    'The sender’s app compared them and found differences in: Seal number. That is the sender’s word.',
  );
  const publicText = JSON.stringify(await publicView()) + (await stranger.locator('body').innerText());
  for (const secret of [t.seal, arrived, t.takenFrom, t.witness, t.condition, t.labRef, r.transferId])
    expect(publicText).not.toContain(secret);
  await shot(stranger, 'custody-differs-7-public-check');

  // The lab changes its side after signing (sealed with the code's key, as its app would):
  // the breeder's browser sees the receipt no longer covers it. The registry can't tell.
  const labKey = await r.lab.evaluate(() => localStorage.getItem('veilcore.holder.v1') ?? '');
  const changed = await fetch(`${API}/transfers/${r.transferId}/custody`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-holder-key': labKey },
    body: JSON.stringify({
      arrival: sealSide(r.code, r.transferId, 'arrival', {
        sampleId: t.sampleId,
        sealNumber: t.seal,
        sealIntact: 'yes',
      }),
    }),
  });
  expect(changed.status).toBe(200);
  // Plain fields are refused on this delivery.
  const plain = await fetch(`${API}/transfers/${r.transferId}/custody`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-holder-key': labKey },
    body: JSON.stringify({ arrival: { sampleId: t.sampleId, sealNumber: t.seal, sealIntact: 'yes' } }),
  });
  expect(plain.status).toBe(400);
  await r.breeder.goto(`/record/${r.recordId}`);
  const after = r.breeder.locator('[data-status-row="Receipt signed"]');
  await expect(after).toHaveAttribute('data-custody', 'changed');
  await expect(after).toContainText(
    'The lab changed its arrival details after signing, so its receipt doesn’t cover them.',
  );
  // The registry never says covered or changed for sealed details.
  expect((await publicView()).custody?.[0]).not.toHaveProperty('covered');
  expectNoErrors(strangerErrors);
  await strangerCtx.close();

  expectNothingTypedOnTheServer(t, r.requests, [arrived]);
  expectNoErrors(r.breederErrors);
  expectNoErrors(r.labErrors);
  await r.breederCtx.close();
  await r.labCtx.close();
});

test('the whole way round: logged, backed up, sent with sample details; received, signed, a report locked back; "covered", and the report opens', async ({
  browser,
}) => {
  // Everything typed below is unique to this run, so a scan of the database finds only these.
  const t = typedFor('round');
  const u = Date.now().toString(36).toUpperCase();
  const typed = {
    bredBy: `Breeder name ${u}`,
    notes: `Private notes ${u}`,
    recipient: `Dr Recipient ${u} at Leaf Lab`,
    quantity: `Quantity ${u}`,
    labNote: `Note for the lab ${u}`,
  };
  const report = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.from(`Report body ${u} THC 21% markers A12 B7`)]);
  const requests: string[] = [];

  // The sender logs a plant, saves its backup and checks it (nothing is sealed and sent before).
  const breederCtx = await browser.newContext({ acceptDownloads: true });
  record(breederCtx, requests);
  const breeder = await breederCtx.newPage();
  const breederErrors = watch(breeder);
  await isolate(breeder);
  await breeder.goto('/records');
  await breeder.getByRole('button', { name: /I breed or hold genetics/ }).click();
  await breeder.getByText('Start', { exact: true }).click();
  const name = `E2E Round ${u}`;
  await breeder.getByLabel(/Plant or line name/).fill(name);
  await breeder.getByLabel(/Bred by/).fill(typed.bredBy);
  await breeder.getByRole('button', { name: /Add parents, species, photos or notes/ }).click();
  await breeder.getByLabel(/^Notes/).fill(typed.notes);
  await breeder.getByRole('button', { name: /Next: check it/ }).click();
  await breeder.getByRole('button', { name: /Seal it/ }).click();
  await breeder.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
  const recordId = await breeder.evaluate(
    () => Object.keys(JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as object)[0],
  );
  await backupAfterLogging(breeder, recordId);

  // It goes to a lab, with the sample's details.
  await breeder.goto(`/record/${recordId}`);
  await breeder.getByText('Send it to a lab or breeder').click();
  await breeder.getByLabel(/Who are you sending it to/).fill(typed.recipient);
  await breeder.getByLabel(/Quantity/).fill(typed.quantity);
  await breeder.getByLabel(/Note for the lab/).fill(typed.labNote);
  await breeder.getByRole('button', { name: /Add the sample.s label and seal/ }).click();
  await breeder.getByLabel(/Sample ID \/ label on the tube or bag/).fill(t.sampleId);
  await breeder.getByLabel(/Seal or bag number/).fill(t.seal);
  await breeder.getByLabel(/^Taken from/).fill(t.takenFrom);
  await breeder.getByLabel(/^Taken on/).fill(t.takenOn);
  await breeder.getByLabel(/^Witness/).fill(t.witness);
  await breeder.getByRole('button', { name: /Make a code for the lab/ }).click();
  const codeEl = breeder.getByText(/^TR-[0-9A-F]{8}\./);
  await expect(codeEl).toBeVisible();
  const code = (await codeEl.innerText()).trim();
  await expect(breeder.locator('[data-sample-not-saved]')).toHaveCount(0);
  await breeder.getByRole('button', { name: /^Done$/ }).click();
  const transferId = code.split('.')[0];

  // The lab: its signature, a checked backup, then the delivery. Receiving finishes in its
  // browser: the offer opens with the code's key and the received record is sealed and saved.
  const labCtx = await browser.newContext({ acceptDownloads: true });
  record(labCtx, requests);
  const lab = await labCtx.newPage();
  const labErrors = watch(lab);
  await isolate(lab);
  await lab.goto('/records');
  await lab.getByRole('button', { name: /I run a lab/ }).click();
  await lab.getByRole('button', { name: /Set up your lab.s signature/ }).click();
  await lab.getByLabel(/^Name/).fill('E2E Lab');
  await lab.getByRole('button', { name: /Create my key/ }).click();
  await lab.getByRole('button', { name: /^Done$/ }).click();
  await receiveWithBackupFirst(lab, code);
  await expect(lab.getByLabel('Sample ID on arrival')).toHaveValue(t.sampleId);
  await lab.getByLabel('Yes', { exact: true }).check();
  await lab.getByLabel('Arrived on').fill(t.arrivedOn);
  await lab.getByLabel('Condition').fill(t.condition);
  await lab.getByLabel('Your accession no.').fill(t.labRef);
  await lab.getByLabel(/I physically received this material/).check();
  await lab.getByRole('button', { name: /Sign with my key/ }).click();
  await expect(lab).toHaveURL(/\/record\//);
  const labRecordId = new URL(lab.url()).pathname.split('/').pop() ?? '';
  await expect(lab.getByText(typed.bredBy).first()).toBeVisible();
  await untilSaved(lab, labRecordId);

  // The lab locks a report back to the breeder.
  await lab.getByRole('button', { name: /^Send results back to the breeder/ }).click();
  const chooser = lab.waitForEvent('filechooser');
  await lab.getByRole('button', { name: /Choose the report/ }).click();
  await (await chooser).setFiles({ name: 'report.pdf', mimeType: 'application/pdf', buffer: report });
  await lab.getByRole('button', { name: /Sign, lock and send/ }).click();
  await expect(lab.getByRole('heading', { name: /^Sent$/ })).toBeVisible();

  // The sender: the receipt covers the sample details (worked out in this browser from the
  // opened boxes), and the locked report opens here, byte for byte.
  await breeder.goto(`/record/${recordId}`);
  const row = breeder.locator('[data-status-row="Receipt signed"]');
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute('data-custody', 'covered');
  await expect(row).toContainText('Sample ID and seal number match what was sent.');
  await breeder
    .getByRole('alert')
    .filter({ hasText: /lab report came back/ })
    .getByRole('button', { name: 'Open' })
    .click();
  await expect(breeder.getByText(/Signed by a key named “E2E Lab” \(name not checked\)/)).toBeVisible();
  const [dl] = await Promise.all([
    breeder.waitForEvent('download'),
    breeder.getByRole('button', { name: /Download the file/ }).click(),
  ]);
  const chunks: Buffer[] = [];
  for await (const c of await dl.createReadStream()) chunks.push(c as Buffer);
  expect(Buffer.concat(chunks)).toEqual(report);
  await shot(breeder, 'custody-round-opened');

  // Nothing typed, no name given, no note, and not the report, readable anywhere on the
  // server: in no request the two browsers made, and not in the registry's database file.
  expectNothingTypedOnTheServer(t, requests, [...Object.values(typed), `Report body ${u}`]);
  expect(requests.some((r) => r.includes(`/transfers/${transferId}/results`))).toBe(true);

  expectNoErrors(breederErrors);
  expectNoErrors(labErrors);
  await breederCtx.close();
  await labCtx.close();
});
