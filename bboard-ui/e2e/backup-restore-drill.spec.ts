// The backup restore drill in a real browser (docs/runbooks/backup-restore-drill.md): a holder gets
// everything back from the backup file alone, through the real backup and restore pages.
//
// Browser A (a breeder, the licensor) logs a plant through the real pages and saves its first
// backup with a password; the rest of the set is made with the app's own code on the drill's
// fixture page (src/e2e-fixtures/RestoreDrillFixture.tsx): an animal, a child plant naming the
// plant, a document with numbers a lab signed and a claim was made on, a document kept on this
// device only, a DNA pairing and the plant's date stamp, and a license whose royalty report is
// settled with browser B (the licensee). Both save a backup with a password on the real page.
// Then, in browsers with nothing in them:
//   - a wrong password and a cut-off file are refused, and nothing is written;
//   - the right file and password bring back everything, byte for byte (the fixture's snapshot),
//     and it works: the record page opens its locked details, the check page finds the record and
//     its name, a prove link finds the key to answer with, the license deal can be read and
//     written with the restored keys;
//   - restoring the same file again changes nothing;
//   - the licensee's file brings back the license and its deal;
//   - with the registry gone, the file alone brings back every record, key, lab signature and
//     claim; the license itself is the one gap, as the runbook says;
//   - and the two dates that don't depend on Midnight: the evidence bundle downloaded then, from
//     the real record page, still carries the batch's Bitcoin stamp file and RFC 3161 token, kept
//     from the file; openssl checks the token and verify.html, opened from disk offline, reads
//     the Bitcoin file;
//   - the file opens with veilcore-records, without the website.
// The stand-in registry is in this file. All names, keys and figures are practice data.
// SPDX-License-Identifier: Apache-2.0
import { createHash, randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { expect, test, type Browser, type Page, type Route } from '@playwright/test';
import { unzipSync } from 'fflate';
import { buildBatch } from 'veilcore-records';
import { API, REAL_REGISTRY, expectNoErrors, json, plainRowRefusal, startPlant, watch } from './helpers';
import { otsFile, testTsa } from '../src/veilcore/fixtures/test-stamps';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');
test.setTimeout(600_000);

const PASSWORD = 'practice drill password';
const BATCH_ID = 'B-20261126-E2E-DRILL';
const STAMP_BLOCK = 870321;
const SITE = `http://127.0.0.1:${process.env.E2E_PORT ?? 4317}`;
const run = promisify(execFile);

type Row = Record<string, unknown> & { id: string; holder: string };

/** The stand-in registry, shared by every browser in the drill, as the real one would be. */
const registry = () => {
  const records = new Map<string, Row>();
  const licenses = new Map<string, Row>();
  const deals = new Map<string, { seq: number; iv: string; ct: string; receivedAt: number }[]>();
  const proofs = new Map<string, unknown>();
  const asks = new Map<string, Record<string, unknown>>();
  // The batch's Bitcoin stamp file and TSA token, and each proof code's own token (a local TSA).
  const tsa = testTsa('E2E drill TSA');
  const ots = new Map<string, Buffer>();
  const instant = new Map<string, string>();
  const rowsOf = (table: Map<string, Row>, holder: string) =>
    [...table.values()]
      .filter((r) => r.holder === holder)
      .map((r) => {
        const out: Record<string, unknown> = { ...r };
        delete out.holder;
        return out;
      });

  const handle = async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const holder = req.headers()['x-holder-key'] ?? '';
    const raw = req.postData();
    const body = (raw ? JSON.parse(raw) : undefined) as Record<string, unknown> | Row[] | undefined;
    const p = url.pathname;
    if (p === '/api/records' || p === '/api/licenses') {
      const table = p === '/api/records' ? records : licenses;
      if (method === 'GET') return json(route, 200, rowsOf(table, holder));
      if (method === 'PUT') {
        if (p === '/api/records') {
          const refusal = plainRowRefusal(body);
          if (refusal) return json(route, 400, { error: refusal });
        }
        for (const r of body as Row[]) table.set(r.id, { ...r, holder });
        return json(route, 200, { ok: true });
      }
    }
    if (p === '/api/records/dating' && method === 'PUT') {
      const dated: string[] = [];
      for (const r of body as Row[]) {
        if (!records.has(r.id)) records.set(r.id, { ...r, bodyPending: true, holder });
        dated.push(r.id);
      }
      return json(route, 200, { ok: true, dated });
    }
    if (method === 'GET' && (p === '/api/disclosures' || p === '/api/grants')) return json(route, 200, []);
    if (method === 'GET' && p === '/transfers/sent') return json(route, 200, { transfers: [] });
    const proof = /^\/proof\/([0-9a-f]{64})$/.exec(p);
    if (proof && method === 'GET')
      return proofs.has(proof[1]) ? json(route, 200, proofs.get(proof[1])) : json(route, 404, { error: 'none' });
    const own = /^\/proof\/([0-9a-f]{64})\/instant$/.exec(p);
    if (own && method === 'GET')
      return instant.has(own[1])
        ? json(route, 200, {
            status: 'stamped',
            tokens: [{ kind: 'rfc3161', token: instant.get(own[1]), tsa: 'https://tsa.e2e.invalid/' }],
          })
        : json(route, 404, { status: 'none' });
    const stamp = /^\/batches\/([^/]+)\/root\.bin\.ots$/.exec(p);
    if (stamp && method === 'GET' && ots.has(stamp[1]))
      return route.fulfill({ status: 200, contentType: 'application/vnd.opentimestamps.v1', body: ots.get(stamp[1]) });
    if (p === '/deals' && method === 'POST') {
      const id = String((body as Record<string, unknown>).dealId);
      if (!deals.has(id)) deals.set(id, []);
      return json(route, 200, { ok: true });
    }
    const deal = /^\/deals\/([^/]+)\/(messages|read)$/.exec(p);
    if (deal && method === 'POST') {
      const list = deals.get(deal[1]);
      if (!list) return json(route, 404, { error: 'no such deal' });
      const b = body as Record<string, unknown>;
      if (deal[2] === 'read') return json(route, 200, { messages: list.filter((m) => m.seq > Number(b.after ?? 0)) });
      const seq = list.length + 1;
      list.push({ seq, iv: String(b.iv), ct: String(b.ct), receivedAt: Date.now() });
      const fingerprint = createHash('sha256')
        .update(`${String(b.iv)}.${String(b.ct)}`)
        .digest('hex');
      return json(route, 200, { seq, fingerprint });
    }
    const verify = /^\/verify\/(VEIL-[0-9A-F]+)$/.exec(p);
    if (verify && method === 'GET') {
      const r = records.get(verify[1]);
      if (!r) return json(route, 404, { found: false });
      return json(route, 200, {
        found: true,
        id: r.id,
        recordFingerprint: r.recordFingerprint,
        ...(typeof r.nameCode === 'string' ? { nameCode: r.nameCode } : {}),
        registryFirstSeen: new Date().toISOString(),
        supersededBy: null,
        supersedes: null,
        keyBound: true,
        signedAttestation: false,
        attestedByVettedLab: false,
        attested: false,
        anchored: false,
        disclosed: [],
      });
    }
    const ask = /^\/prove-requests\/(PR-[0-9A-F]{32})$/.exec(p);
    if (ask && method === 'GET')
      return asks.has(ask[1]) ? json(route, 200, asks.get(ask[1])) : json(route, 404, { error: 'no such request' });
    return json(route, 404, { error: 'not in the test registry' });
  };

  return {
    records,
    licenses,
    asks,
    /** This page reaches the site and the stand-in only; `down` makes the registry unreachable. */
    attach: (page: Page, down = false) =>
      page.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === SITE) return route.continue();
        if (url.origin === new URL(API).origin && !down) return handle(route);
        return route.abort();
      }),
    tsa,
    /**
     * The anchoring job: every proof code the registry holds, in one batch, each with its proof;
     * the root stamped on Bitcoin (a file naming a block) and by the TSA, each proof code by the TSA.
     */
    batch: async () => {
      const fps = [...records.values()].map((r) => r.recordFingerprint as string);
      const b = await buildBatch(fps, BATCH_ID);
      ots.set(BATCH_ID, otsFile(b.root, { bitcoin: STAMP_BLOCK }));
      const token = tsa.tokenFor(b.root);
      for (const fp of fps) instant.set(fp, tsa.tokenFor(fp));
      for (const [fp, pr] of Object.entries(b.proofs))
        proofs.set(fp, {
          ...(pr as object),
          anchors: [
            {
              kind: 'opentimestamps',
              status: 'bitcoin',
              bitcoinBlockHeight: STAMP_BLOCK,
              root: `/batches/${BATCH_ID}/root.bin`,
              ots: `/batches/${BATCH_ID}/root.bin.ots`,
            },
            { kind: 'rfc3161', token, tsa: 'https://tsa.e2e.invalid/', tst: `/batches/${BATCH_ID}/root.tst` },
          ],
          anchor: {
            chain: 'midnight',
            network: 'preview',
            contractAddress: '7a'.repeat(32),
            txHash: 'ab'.repeat(32),
            blockHeight: 4242,
            anchoredAt: new Date().toISOString(),
          },
        });
    },
  };
};

type Reg = ReturnType<typeof registry>;

/** A browser with nothing in it but the answer to "who are you". */
const fresh = async (browser: Browser, reg: Reg, down = false) => {
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = watch(page);
  // The drill's TSA, pinned as the site pins the real ones (only the end-to-end build reads this).
  await page.addInitScript((pin) => {
    localStorage.setItem('veilcore.role.v1', 'breeder');
    localStorage.setItem('veilcore.e2e.tsa-pins', JSON.stringify({ format: 'veilcore-tsa-pins/v1', pins: [pin] }));
  }, reg.tsa.pin);
  await reg.attach(page, down);
  return { ctx, page, errors };
};

/** What this browser keeps, by storage name (the role aside). */
const stored = (page: Page) =>
  page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k !== 'veilcore.role.v1' && k !== 'veilcore.e2e.tsa-pins'),
  );

/** On a page showing the backup step: save the file locked with the password, open it again, see it pass. */
const saveLocked = async (page: Page): Promise<string> => {
  await page
    .getByRole('button', { name: /Save backup file/ })
    .first()
    .waitFor({ timeout: 90_000 });
  // On by default: a password for the file, typed twice.
  await page.getByLabel('Password for the backup file').fill(PASSWORD);
  await page.getByLabel('Type it again').fill(PASSWORD);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Save backup file/ }).click();
  const file = await (await download).path();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Open my saved copy/ }).click();
  await (await chooser).setFiles(file);
  await page.getByLabel("The backup's password").fill(PASSWORD);
  await page.getByRole('button', { name: 'Open it' }).click();
  await expect(page.getByText('It works.')).toBeVisible();
  const text = fs.readFileSync(file, 'utf8');
  expect(JSON.parse(text)).toMatchObject({ format: 'veilcore-backup', version: 4 });
  return text;
};

/** Run a step of the drill's fixture page and return what it says. */
const step = async <T>(page: Page, query: string): Promise<T> => {
  await page.goto(`/e2e/restore-drill?${query}`);
  const out = page.locator('[data-drill-out]');
  const failed = page.locator('[data-drill-error]');
  await expect(out.or(failed)).toBeVisible({ timeout: 60_000 });
  if (await failed.count()) throw new Error(`fixture ${query}: ${await failed.innerText()}`);
  return JSON.parse(await out.innerText()) as T;
};

type Snapshot = { records: number; keys: number; snapshot: Record<string, string> };

/** The items that differ between two snapshots (as restore-drill-snapshot.ts differ). */
const differ = (a: Record<string, string>, b: Record<string, string>) =>
  [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]).sort();

const writeTemp = (dir: string, name: string, text: string) => {
  const f = path.join(dir, name);
  fs.writeFileSync(f, text);
  return f;
};

/** A locked backup's contents (backup.ts lockBackup: PBKDF2-SHA256, then AES-256-GCM). */
const unlock = async (text: string): Promise<Record<string, unknown>> => {
  const { locked } = JSON.parse(text) as { locked: { iterations: number; salt: string; iv: string; ct: string } };
  const b = (x: string) => new Uint8Array(Buffer.from(x, 'base64url'));
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(PASSWORD), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: b(locked.salt), iterations: locked.iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b(locked.iv), additionalData: new TextEncoder().encode('veilcore:backup:v4') },
    key,
    b(locked.ct),
  );
  return JSON.parse(new TextDecoder().decode(plain)) as Record<string, unknown>;
};

/** Open a backup file on the restore page, with its password when asked. */
const restoreFile = async (page: Page, file: string, password?: string) => {
  await page.goto('/restore?lang=en');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Open my backup file/ }).click();
  await (await chooser).setFiles(file);
  if (password !== undefined) {
    await page.getByLabel("The backup's password").fill(password);
    await page.getByRole('button', { name: 'Open it' }).click();
  }
};

test('the backup restore drill: everything comes back from the file alone, and still works', async ({ browser }) => {
  const reg = registry();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'veilcore-e2e-drill-'));

  // ---- browser A: the set ----------------------------------------------------------------
  const A = await fresh(browser, reg);
  await A.page.goto('/new?lang=en');
  await startPlant(A.page);
  await A.page.getByLabel(/Plant or line name/).fill('Drill Pippin (test data)');
  await A.page.getByLabel(/Bred by/).fill('Practice Breeder');
  await A.page.getByRole('button', { name: /Next: check it/ }).click();
  await A.page.getByRole('button', { name: /Seal it/ }).click();
  await A.page.getByRole('button', { name: /Go on without waiting/ }).click({ timeout: 90_000 });
  await A.page.getByRole('button', { name: /No report yet: skip/ }).click();
  await saveLocked(A.page);
  await A.page.getByRole('button', { name: /Finish/ }).click();
  await expect.poll(() => reg.records.size, { timeout: 60_000 }).toBe(1);
  const plant = [...reg.records.keys()][0];
  const holderA = [...reg.records.values()][0].holder;

  const made = await step<{
    child: string;
    animal: string;
    doc: string;
    local: string;
    licenseId: string;
    identity: string;
  }>(A.page, `step=make&plant=${plant}`);
  // Browser B, the licensee: the license, a royalty report and "I paid".
  const B = await fresh(browser, reg);
  await step(B.page, 'step=licensee');
  expect((await step<{ types: string[] }>(A.page, 'step=settle')).types).toEqual([
    'terms',
    'statement',
    'paid',
    'received',
  ]);
  // Every record saved (the one kept on this device only as its dating row), and the license.
  await expect
    .poll(() => [...reg.records.values()].filter((r) => r.holder === holderA).length, { timeout: 60_000 })
    .toBe(5);
  await expect.poll(() => reg.licenses.size, { timeout: 60_000 }).toBe(1);
  await reg.batch();

  await A.page.goto('/backup?lang=en');
  const fileA = writeTemp(dir, 'VeilCore backup A.json', await saveLocked(A.page));
  const wantA = await step<Snapshot>(A.page, 'step=snapshot');
  expect(wantA.records).toBe(5);
  await B.page.goto('/backup?lang=en');
  const fileB = writeTemp(dir, 'VeilCore backup B.json', await saveLocked(B.page));
  const wantB = await step<Snapshot>(B.page, 'step=snapshot');
  expect(Object.keys(wantB.snapshot)).toContain('held license LI-DRILL-E2E-0001');
  // A prove request for the plant, as a checker's link opens it.
  const askId = `PR-${randomBytes(16).toString('hex').toUpperCase()}`;
  reg.asks.set(askId, {
    id: askId,
    identity: made.identity,
    challenge: 'ee'.repeat(32),
    answers: [],
    asker: '',
    createdAt: Date.now(),
    expiresAt: Date.now() + 86_400_000,
  });
  const proveLink = `/prove/${askId}?lang=en#t=${randomBytes(16).toString('base64url')}`;

  // ---- A2: a new device, the registry still there -----------------------------------------
  const A2 = await fresh(browser, reg);
  // Before: this browser has no key to answer with.
  await A2.page.goto(proveLink);
  await expect(A2.page.getByRole('heading', { name: /Someone wants you to prove/ })).toBeVisible();
  await expect(A2.page.getByRole('button', { name: 'Prove it' })).toHaveCount(0);

  // A wrong password: refused, plainly, and nothing is written.
  await restoreFile(A2.page, fileA, 'not the password');
  await expect(A2.page.getByText("That password doesn't open this backup. Nothing was changed.")).toBeVisible();
  expect(await stored(A2.page)).toEqual([]);
  // A cut-off file: refused, and nothing is written.
  const text = fs.readFileSync(fileA, 'utf8');
  await restoreFile(A2.page, writeTemp(dir, 'cut off.json', text.slice(0, Math.floor(text.length / 2))));
  await expect(A2.page.getByText(/That file isn't a VeilCore backup/)).toBeVisible();
  expect(await stored(A2.page)).toEqual([]);

  // The right file and password.
  await restoreFile(A2.page, fileA, PASSWORD);
  await expect(A2.page.locator('[data-restore-preview]')).toContainText(/holds 5 records/);
  await A2.page.locator('[data-restore-preview-bring]').click();
  await expect(A2.page.getByRole('heading', { name: /Your records are back/ })).toBeVisible();
  await expect(A2.page.locator('[data-still-locked]')).toHaveCount(0);
  const gotA = await step<Snapshot>(A2.page, 'step=snapshot');
  expect(differ(wantA.snapshot, gotA.snapshot), 'came back different').toEqual([]);

  // It works: the locked details open, the check page finds the record, the key answers a prove link.
  await A2.page.goto(`/record/${made.doc}?lang=en`);
  await expect(A2.page.getByRole('heading', { name: 'Drill similarity certificate (test data)' })).toBeVisible();
  await expect(A2.page.getByText('a document with numbers, signed by a lab').first()).toBeVisible();
  await expect(A2.page.getByText(/This record is locked/)).toHaveCount(0);
  await A2.page.goto(`/record/${plant}?lang=en`);
  await expect(A2.page.getByRole('heading', { name: 'Drill Pippin (test data)' })).toBeVisible();
  await A2.page.getByRole('link', { name: 'Open check page' }).click();
  await expect(A2.page.locator('[data-holder-name]')).toContainText(
    'Name matches the record: Drill Pippin (test data)',
  );
  // The prove page never sends the holder key, so it names the record only when it knows it; the
  // key that answers is what matters here.
  await A2.page.goto(proveLink);
  await expect(A2.page.getByRole('heading', { name: /^Prove you hold / })).toBeVisible();
  await expect(A2.page.getByRole('button', { name: 'Prove it' })).toBeVisible();
  // The license: the whole deal read with the restored keys, and a new message sent.
  const dealA = await step<{ before: string[]; after: string[] }>(A2.page, 'step=deal');
  expect(dealA.before).toEqual(['terms', 'statement', 'paid', 'received']);
  expect(dealA.after).toEqual([...dealA.before, 'payout']);

  // The same file again: nothing changes.
  await restoreFile(A2.page, fileA, PASSWORD);
  await expect(A2.page.getByRole('heading', { name: /Your records are back/ })).toBeVisible();
  const again = await step<Snapshot>(A2.page, 'step=snapshot');
  expect(again.records).toBe(5);
  expect(differ(gotA.snapshot, again.snapshot)).toEqual([]);

  // ---- B2: the licensee on a new device ---------------------------------------------------
  const B2 = await fresh(browser, reg);
  await restoreFile(B2.page, fileB, PASSWORD);
  // Into an empty browser: what the file says about itself first (no records: a license only).
  await expect(B2.page.locator('[data-restore-preview]')).toContainText(/holds 0 records/);
  await B2.page.locator('[data-restore-preview-bring]').click();
  // The license came back, and the page says so (it used to say "Nothing new in that file.").
  await expect(B2.page.locator('[data-restore-done="file"]')).toHaveText('Restored.');
  expect(differ(wantB.snapshot, (await step<Snapshot>(B2.page, 'step=snapshot')).snapshot)).toEqual([]);
  const dealB = await step<{ before: string[]; after: string[] }>(B2.page, 'step=deal&side=licensee');
  expect(dealB.before).toEqual(['terms', 'statement', 'paid', 'received', 'payout']);
  expect(dealB.after).toEqual([...dealB.before, 'statement']);

  // ---- A3: the registry gone ---------------------------------------------------------------
  const A3 = await fresh(browser, reg, true);
  await restoreFile(A3.page, fileA, PASSWORD);
  await A3.page.locator('[data-restore-preview-bring]').click();
  await expect(A3.page.getByRole('heading', { name: /Your records are back/ })).toBeVisible();
  await expect(A3.page.getByText('Records put back from the file itself: 5.')).toBeVisible();
  const gotA3 = await step<Snapshot>(A3.page, 'step=snapshot');
  // The one gap, as the runbook says: the license itself lives on the registry only.
  expect(differ(wantA.snapshot, gotA3.snapshot), 'came back different (beyond the known gap)').toEqual([
    `license ${made.licenseId}`,
  ]);
  await A3.page.goto(`/record/${made.doc}?lang=en`);
  await expect(A3.page.getByText('a document with numbers, signed by a lab').first()).toBeVisible();
  // The file carried the Bitcoin and RFC 3161 files, one each for the batch and one per record.
  const inner = (await unlock(fs.readFileSync(fileA, 'utf8'))) as {
    stamps: { batches: Record<string, unknown>; records: Record<string, unknown> };
  };
  expect(Object.keys(inner.stamps.batches)).toEqual([BATCH_ID]);
  expect(Object.keys(inner.stamps.records)).toHaveLength(5);
  // The evidence bundle, from the real record page, with the registry gone: the stamps kept
  // from the file are in it.
  await A3.page.goto(`/record/${plant}?lang=en`);
  await A3.page.getByRole('button', { name: 'Technical details' }).click();
  await A3.page.getByRole('button', { name: 'Download evidence bundle' }).first().click();
  const dialog = A3.page.getByRole('dialog', { name: 'Download evidence bundle' });
  const zipped = A3.page.waitForEvent('download');
  await dialog.getByRole('button', { name: /^Download$/ }).click();
  await expect(dialog.getByText(/^Downloaded .+\.zip\./)).toBeVisible({ timeout: 60_000 });
  const bundleDir = path.join(dir, 'bundle');
  for (const [name, bytes] of Object.entries(unzipSync(new Uint8Array(fs.readFileSync(await (await zipped).path()))))) {
    const out = path.join(bundleDir, name);
    expect(path.resolve(out).startsWith(path.resolve(bundleDir))).toBe(true);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, bytes);
  }
  const top = path.join(bundleDir, fs.readdirSync(bundleDir)[0]);
  const ev = JSON.parse(fs.readFileSync(path.join(top, 'evidence.json'), 'utf8')) as {
    registry: { source: string };
    batch: { opentimestamps: { available: boolean }; rfc3161: { available: boolean } };
  };
  expect(ev.registry.source).toBe('this-device');
  expect(ev.batch.opentimestamps.available).toBe(true);
  expect(ev.batch.rfc3161.available).toBe(true);
  // The README's own step for the token, with no network.
  const ssl = await run('openssl', [
    'ts',
    '-verify',
    '-data',
    path.join(top, 'proof/root.bin'),
    '-in',
    path.join(top, 'proof/root.tst'),
    '-token_in',
    '-CAfile',
    reg.tsa.caFile,
  ]);
  expect(ssl.stdout).toContain('Verification: OK');
  // verify.html from disk, offline: it reads the Bitcoin file against the batch root.
  const offline = await browser.newContext({ offline: true });
  const v = await offline.newPage();
  await v.goto(`file://${path.join(top, 'verify.html')}`);
  await expect(v.locator('body')).toHaveAttribute('data-checked', 'yes');
  await expect(v.locator('[data-check="lookup-bitcoin"]')).toContainText(`names Bitcoin block ${STAMP_BLOCK}`);
  await offline.close();

  // ---- the file without the website ---------------------------------------------------------
  const cli = new URL('../../node_modules/veilcore-records/bin/veilcore.mjs', import.meta.url).pathname;
  const env = { ...process.env, VEILCORE_BACKUP_PASSWORD: PASSWORD };
  const deal = await run(process.execPath, [cli, 'deal', fileA], { env });
  expect(deal.stdout).toContain('4 of 4 signed by the side they name');
  expect(deal.stdout).toContain('50.00 USD  settled: paid 2026-12-05 by bank transfer');
  // KNOWN GAP (veilcore-records 0.18.1): a document with sealed numbers is reported as not
  // matching (its fingerprint leaves out the field-set step); the other four check out.
  const records = await run(process.execPath, [cli, 'backup', fileA], { env }).catch((e: { stdout: string }) => e);
  expect(records.stdout).toContain('FAILED: 1 of 5 records did not check out.');
  expect(records.stdout).toMatch(new RegExp(`${made.doc} .*\\n\\s+fingerprint\\s+DOES NOT MATCH`));

  for (const b of [A, B, A2, B2, A3]) expectNoErrors(b.errors);
  for (const b of [A, B, A2, B2, A3]) await b.ctx.close();
  fs.rmSync(dir, { recursive: true, force: true });
  reg.tsa.done();
});
