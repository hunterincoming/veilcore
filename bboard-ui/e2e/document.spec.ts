// A document record, in the browser against the stand-in registry (docs/document-profile.md):
// from the first screen to "Seal a document", pick two files (hashed in the browser, never
// sent), seal it, see its page, compare the same file and a different one, copy the check link,
// and open it as a stranger would: the proof code is recomputed from the link, the file is
// compared byte for byte, and with nothing dating it the page says not to rely on it. A changed
// link recomputes to another proof code. The evidence bundle, with a copy of one of its files,
// checks offline in verify.html. All files and records are test data.
// SPDX-License-Identifier: Apache-2.0
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { unzipSync } from 'fflate';
import { buildBatch } from 'veilcore-records';
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

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

type Rec = Record<string, unknown> & { id: string; recordFingerprint: string };
const HOLDER = randomBytes(32).toString('hex');
const VAULT = newVaultKey();
const PERMIT = Buffer.from(`Practice permit (test data) ${Date.now()}\n`);
const ANNEX = Buffer.from(`Practice annex (test data) ${Date.now()}\n`);
const OTHER = Buffer.from(`Not the permit (test data) ${Date.now()}\n`);
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');

const standIn = async (page: Page) => {
  const held: { records: Rec[] } = { records: [] };
  await page.addInitScript((holder) => {
    localStorage.setItem('veilcore.holder.v1', holder);
    localStorage.setItem('veilcore.role.v1', 'breeder');
  }, HOLDER);
  await holdVaultKey(page, VAULT);
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
    // The evidence route, as if the record were in a batch dated on the test network.
    'GET /records/:record/evidence': async (route, url) => {
      const id = decodeURIComponent(url.pathname.split('/')[2] ?? '');
      const r = held.records.find((x) => x.id === id);
      if (!r) return json(route, 404, { error: 'no such record for this holder key' });
      const batch = await buildBatch([r.recordFingerprint], 'B-20261031-DOCS');
      const anchor = {
        chain: 'midnight',
        network: 'preprod',
        contractAddress: '7a'.repeat(32),
        txHash: 'c3'.repeat(32),
        blockHeight: 4243,
        anchoredAt: new Date().toISOString(),
        testNetwork: true,
      };
      return json(route, 200, {
        format: 'veilcore-record-evidence/v1',
        recordId: r.id,
        record: r,
        registryFirstSeen: new Date().toISOString(),
        proof: { ...batch.proofs[r.recordFingerprint], anchor, anchors: [{ kind: 'ledger', ...anchor }] },
        batch: {
          batchId: batch.batchId,
          root: batch.root,
          sealedAt: batch.sealedAt,
          recordCount: 1,
          anchor,
          earlierAnchors: [],
          opentimestamps: { available: false, status: 'none', calendars: [] },
        },
        attestations: [],
        attestationsTotal: 0,
      });
    },
  });
  return held;
};

test('seal a document from its files, compare a file, and check it from the link as a stranger', async ({
  page,
  context,
  browser,
}, info) => {
  const errors = watch(page);
  await standIn(page);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  // 1. From the first screen: a document is one of the choices, on a page of its own.
  await page.goto('/new');
  await page.getByRole('link', { name: /^A document/ }).click();
  await expect(page).toHaveURL(/\/documents\/new$/);
  await expect(page.getByRole('heading', { name: 'Seal a document' })).toBeVisible();

  // 2. Nothing is sealed without a file; two files are hashed here.
  await page.getByRole('button', { name: 'Seal it' }).click();
  await expect(page.locator('[data-document-missing]')).toHaveText('Add the file first.');
  await page.locator('input[type=file]').setInputFiles([
    { name: 'permit 0042.pdf', mimeType: 'application/pdf', buffer: PERMIT },
    { name: 'annex.pdf', mimeType: 'application/pdf', buffer: ANNEX },
  ]);
  await expect(page.locator('[data-picked-file]')).toHaveCount(2);
  // The title starts as the first file's name.
  await expect(page.getByLabel('Title')).toHaveValue('permit 0042');
  await page.getByLabel('Title').fill('Practice permit 0042');
  await page.getByLabel('Type').click();
  await page.getByRole('option', { name: 'Permit or licence' }).click();
  await page.getByLabel('Issued by (optional)').fill('Practice Authority (test data)');
  await page.getByLabel('Reference number (optional)').fill('P-0042');
  await page.getByLabel('Held by').fill('E2E association (test data)');
  await page.getByRole('button', { name: 'Seal it' }).click();

  // 3. Its own page: a document, its files by fingerprint, no plant rows.
  await expect(page).toHaveURL(/\/record\/VEIL-[0-9A-F]+$/);
  await expect(page.locator('[data-document-page]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Practice permit 0042' })).toBeVisible();
  const facts = page.locator('[data-document-facts]');
  await expect(facts).toContainText('Permit or licence');
  await expect(facts).toContainText('Practice Authority (test data)');
  await expect(facts).toContainText(`SHA-256 ${sha(PERMIT)}`);
  await expect(facts).toContainText(`SHA-256 ${sha(ANNEX)}`);
  await expect(page.getByText('License it')).toHaveCount(0);
  await expect(page.getByText(/DNA report/)).toHaveCount(0);

  // 4. Is this the same file? The annex is; another file is not.
  const compare = page.locator('[data-file-compare]');
  await compare
    .locator('input[type=file]')
    .setInputFiles({ name: 'from-them.pdf', mimeType: 'application/pdf', buffer: ANNEX });
  await expect(page.locator('[data-compare="match"]')).toContainText('is byte for byte annex.pdf');
  await compare
    .locator('input[type=file]')
    .setInputFiles({ name: 'other.pdf', mimeType: 'application/pdf', buffer: OTHER });
  await expect(page.locator('[data-compare="no-match"]')).toBeVisible();

  // 4b. The evidence bundle with a copy of the annex: a file the record doesn't seal is refused,
  //     the annex goes in, and verify.html checks it all from disk with the network off.
  await page.getByRole('button', { name: 'Download evidence bundle' }).click();
  const dialog = page.getByRole('dialog', { name: 'Download evidence bundle' });
  await dialog.getByText(/^Include a copy of the document\./).click();
  const picker = dialog.locator('input[type=file]');
  await picker.setInputFiles({ name: 'other.pdf', mimeType: 'application/pdf', buffer: OTHER });
  await dialog.getByRole('button', { name: /^Download$/ }).click();
  await expect(dialog.getByText(/isn’t byte for byte any file sealed in this record/)).toBeVisible();
  await picker.setInputFiles({ name: 'my copy.pdf', mimeType: 'application/pdf', buffer: ANNEX });
  await expect(dialog.getByText('my copy.pdf')).toBeVisible();
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: /^Download$/ }).click();
  await expect(dialog.getByText(/^Downloaded .+\.zip\./)).toBeVisible();
  const zip = fs.readFileSync(await (await download).path());
  const dir = info.outputPath('document-bundle');
  for (const [file, bytes] of Object.entries(unzipSync(new Uint8Array(zip)))) {
    const out = path.join(dir, file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, bytes);
  }
  const top = path.join(dir, fs.readdirSync(dir)[0]);
  expect(fs.readFileSync(path.join(top, 'document/files/annex.pdf'))).toEqual(ANNEX);
  const readme = fs.readFileSync(path.join(top, 'README.txt'), 'utf8').replace(/\s+/g, ' ');
  expect(readme).toContain("THE DOCUMENT'S FILES");
  expect(readme).toContain(`SHA-256 ${sha(PERMIT)}`);
  await dialog.getByRole('button', { name: 'Close' }).click();

  const offline = await browser.newContext({ offline: true, viewport: { width: 360, height: 800 } });
  const requests: string[] = [];
  await offline.route('**/*', (route) =>
    route.request().url().startsWith('file:')
      ? route.continue()
      : (requests.push(route.request().url()), route.abort()),
  );
  const v = await offline.newPage();
  const vErrors = watch(v);
  await v.goto(`file://${path.join(top, 'verify.html')}`);
  await expect(v.locator('body')).toHaveAttribute('data-checked', 'yes', { timeout: 20_000 });
  await expect(v.getByText('Proof code matches', { exact: true })).toBeVisible();
  const table = v.locator('table[data-sealed="matches"]');
  await expect(table.locator('tr', { hasText: 'Title' })).toContainText('Practice permit 0042');
  await expect(table.locator('tr', { hasText: 'Files' })).toContainText(sha(ANNEX));
  await expect(table.locator('tr', { hasText: 'Plant name' })).toHaveCount(0);
  expect(requests).toEqual([]);
  expectNoErrors(vErrors);
  await offline.close();

  // 5. The check link: everything after the #, and the record's own proof code.
  const proofCode = (
    await page
      .locator('[data-document-page]')
      .getByText(/^[0-9a-f]{64}$/)
      .first()
      .textContent()
  )?.trim();
  await page.getByRole('button', { name: 'Copy link: proves you had this file' }).click();
  await expect(page.getByText('Copied.')).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/\/check-document#d=[A-Za-z0-9_-]+$/);

  // 6. As a stranger: the proof code recomputed from the link matches the record's; the file is
  //    compared here; nothing dates it on the stand-in, so the page says not to rely on it.
  await page.goto(link.replace(/^https?:\/\/[^/]+/, ''));
  await expect(page.getByRole('heading', { name: 'Check a document' })).toBeVisible();
  const check = page.locator('[data-document-check]');
  await expect(check).toContainText(proofCode ?? 'missing');
  await expect(check).toContainText('Practice permit 0042');
  await expect(check).toContainText('Issued by (the holder’s statement)');
  await expect(page.locator('[data-document-not-dated]')).toBeVisible();
  await check
    .locator('input[type=file]')
    .setInputFiles({ name: 'sent.pdf', mimeType: 'application/pdf', buffer: PERMIT });
  await expect(page.locator('[data-compare="match"]')).toContainText('is byte for byte permit 0042.pdf');

  // 7. A link someone changed (one character of a file fingerprint) recomputes to another proof code.
  const json1 = JSON.parse(Buffer.from(link.split('#d=')[1], 'base64url').toString('utf8')) as {
    fields: { files: { sha256: string }[] };
  };
  const s0 = json1.fields.files[0].sha256;
  json1.fields.files[0].sha256 = `${s0.slice(0, 63)}${s0.endsWith('0') ? '1' : '0'}`;
  await page.goto(`/check-document#d=${Buffer.from(JSON.stringify(json1)).toString('base64url')}`);
  await expect(page.getByRole('heading', { name: 'Check a document' })).toBeVisible();
  await expect(page.locator('[data-document-check]')).not.toContainText(proofCode ?? 'missing');

  // 8. A link with nothing in it says so.
  await page.goto('/check-document');
  await expect(page.locator('[data-document-link="missing"]')).toBeVisible();
  expectNoErrors(errors);
});

test('seal a certificate with its numbers: refused until each one fits, then kept only in the holder’s copy', async ({
  page,
}) => {
  const errors = watch(page);
  const held = await standIn(page);
  await page.goto('/documents/new');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name: 'coa-7.pdf', mimeType: 'application/pdf', buffer: PERMIT });
  await page.getByLabel('Type').click();
  await page.getByRole('option', { name: 'Certificate of analysis (COA)' }).click();
  await page.getByLabel('Which numbers').click();
  await page.getByRole('option', { name: 'Cannabinoid potency' }).click();
  // Four decimals where the form holds three: refused, never rounded.
  await page.getByLabel('Total THC').fill('0.2105');
  await page.getByLabel('Total CBD').fill('11.4');
  await page.getByLabel('Held by').fill('E2E grower (test data)');
  await page.getByRole('button', { name: 'Seal it' }).click();
  await expect(page.locator('[data-document-missing]')).toContainText('isn’t one this form can hold');
  await expect(page.getByText('A number with at most 3 decimals, like 0.21.')).toBeVisible();
  await page.getByLabel('Total THC').fill('0.21');
  await page.getByRole('button', { name: 'Seal it' }).click();

  await expect(page.locator('[data-document-page]')).toBeVisible();
  const nums = page.locator('[data-held-numbers]');
  await expect(nums).toContainText('Total THC: 0.210 %');
  await expect(nums).toContainText('Total CBD: 11.400 %');
  await expect(nums).toContainText('Sealed with this document as Cannabinoid potency');
  // Proving a number: offered on the page, and said plainly when this build can't make claims.
  await expect(page.locator('[data-prove-number]')).toContainText('Prove one number');
  await expect(page.locator('[data-claims-not-ready]')).toBeVisible();
  // What reached the registry is sealed: neither the numbers nor the field secret are readable.
  const sent = JSON.stringify(held.records);
  expect(sent).not.toContain('11400');
  expect(sent).not.toContain('fieldSecret');
  expectNoErrors(errors);
});

test('a claim link: a damaged one says so; a whole one is not believed when nothing can confirm it', async ({
  page,
}) => {
  const errors = watch(page);
  await standIn(page);
  await page.goto('/check-claim#c=%%%');
  await expect(page.getByRole('heading', { name: 'Check a claim' })).toBeVisible();
  await expect(page.locator('[data-claim-link="bad"]')).toBeVisible();
  const claim = {
    v: 1,
    kind: 'range',
    contract: 'c1'.repeat(32),
    txId: 'ab'.repeat(32),
    record: 'cd'.repeat(32),
    schema: 'veilcore/schema/potency/v1',
    slot: 0,
    op: 'at-most',
    bound: '300',
  };
  await page.goto(`/check-claim#c=${Buffer.from(JSON.stringify(claim)).toString('base64url')}`);
  await expect(page.locator('[data-claim-statement]')).toHaveText('Total THC is at most 0.300 %');
  // This build names no claims contract: the claim is not confirmed, and the page says not to rely on it.
  await expect(page.locator('[data-claim-verdict="failed"]')).toContainText('Don’t rely on it');
  await expect(page.locator('[data-document-not-dated]')).toBeVisible();
  expectNoErrors(errors);
});

test('a laboratory signs a similarity certificate on /lab, and the holder adds the signature to the record', async ({
  page,
  context,
}) => {
  const errors = watch(page);
  await standIn(page);
  await page.goto('/documents/new');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name: 'similarity-7.pdf', mimeType: 'application/pdf', buffer: PERMIT });
  await page.getByLabel('Type').click();
  await page.getByRole('option', { name: 'Certificate of analysis (COA)' }).click();
  await page.getByLabel('Which numbers').click();
  await page.getByRole('option', { name: 'Soybean genetic similarity (SNP, BARCSoySNP6K)' }).click();
  await page.getByLabel('Similarity to the closest variety').fill('94.37');
  // A count of markers is a whole number: refused, never rounded.
  await page.getByLabel('Markers compared').fill('5103.5');
  await page.getByLabel('Held by').fill('E2E breeder (test data)');
  await page.getByRole('button', { name: 'Seal it' }).click();
  await expect(page.getByText('A whole number, like 5103.')).toBeVisible();
  await page.getByLabel('Markers compared').fill('5103');
  await page.getByRole('button', { name: 'Seal it' }).click();
  await expect(page.locator('[data-held-numbers]')).toContainText('Similarity to the closest variety: 94.37 %');

  // The holder's request for the laboratory.
  const panel = page.locator('[data-lab-signature]');
  await expect(panel).toContainText('Laboratory signature');
  const reqDownload = page.waitForEvent('download');
  await panel.locator('[data-lab-request]').click();
  const reqText = fs.readFileSync(await (await reqDownload).path(), 'utf8');
  const req = JSON.parse(reqText) as { kind: string; record: { fieldSet: { values: (string | null)[] } } };
  expect(req.kind).toBe('veilcore-lab-request');

  // The laboratory, in its own browser tab: a key, then the request, read, then signed.
  const lab = await context.newPage();
  const labErrors = watch(lab);
  await lab.goto('/lab');
  await expect(lab.getByRole('heading', { name: 'Sign numbers as a laboratory' })).toBeVisible();
  await expect(lab.locator('[data-lab-request-panel]')).toContainText('Make or open your key first.');
  await lab.getByLabel('Laboratory name (a label for your own files)').fill('E2E Seed Lab (test data)');
  const keyDownload = lab.waitForEvent('download');
  await lab.locator('[data-lab-make-key]').click();
  const keyFile = JSON.parse(fs.readFileSync(await (await keyDownload).path(), 'utf8')) as { key: string };
  await expect(lab.locator('[data-lab-key-made]')).toBeVisible();
  await expect(lab.locator('[data-lab-public-key]')).toHaveText(keyFile.key);

  // A request whose numbers were changed after it was made is refused before anything is shown.
  const changed = JSON.parse(reqText) as typeof req;
  changed.record.fieldSet.values[0] = '9300';
  await lab
    .locator('[data-lab-request-file]')
    .setInputFiles({ name: 'req.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(changed)) });
  await expect(lab.locator('[data-lab-error]')).toContainText('don’t make the root');
  await expect(lab.locator('[data-lab-request-view]')).toHaveCount(0);

  await lab
    .locator('[data-lab-request-file]')
    .setInputFiles({ name: 'req.json', mimeType: 'application/json', buffer: Buffer.from(reqText) });
  const view = lab.locator('[data-lab-request-view]');
  await expect(view).toContainText('Similarity to the closest variety: 94.37 %');
  await expect(view).toContainText('Markers compared: 5103');
  await expect(view).toContainText('E2E breeder (test data)');
  await expect(lab.locator('[data-lab-sign-button]')).toBeDisabled();
  await lab.getByLabel('I checked every number against our report, and they are ours.').check();
  const sigDownload = lab.waitForEvent('download');
  await lab.locator('[data-lab-sign-button]').click();
  const sigText = fs.readFileSync(await (await sigDownload).path(), 'utf8');
  await expect(lab.locator('[data-lab-signed-done]')).toBeVisible();
  const sig = JSON.parse(sigText) as Record<string, string>;
  expect(sig.kind).toBe('veilcore-lab-signature');
  expect(sigText).not.toContain('9437');
  expectNoErrors(labErrors);

  // Back with the holder: an altered signature is refused, the real one is checked and kept.
  await page.locator('[data-lab-signature-file]').setInputFiles({
    name: 'sig.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ ...sig, s: '12345' })),
  });
  await expect(panel.locator('[data-lab-error]')).toContainText('doesn’t check');
  await page
    .locator('[data-lab-signature-file]')
    .setInputFiles({ name: 'sig.json', mimeType: 'application/json', buffer: Buffer.from(sigText) });
  await expect(panel.locator('[data-lab-signed]')).toContainText(keyFile.key);
  await expect(panel).toContainText(`Signed by laboratory key ${keyFile.key.slice(0, 8)}…${keyFile.key.slice(-8)}.`);
  await expect(panel).toContainText('“E2E Seed Lab (test data)”. That’s only a label');
  // This build names no claims contract: publishing is offered, and said plainly to be off.
  await expect(panel).toContainText('Proving isn’t switched on for this site yet.');
  expectNoErrors(errors);
});
