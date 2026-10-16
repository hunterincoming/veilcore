/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access -- tamper tests edit loosely typed evidence JSON on purpose */
// The evidence bundle, end to end: download it from the plant page, unzip it, open its
// verify.html from disk (file://) with the network off, and see the checks pass. Then the
// same page refuses a tampered record, a wrong proof and a wrong root. EXAMINER-SUMMARY.html
// opens from disk offline as text, and prints; DECLARATION-TEMPLATE.txt lists every file's SHA-256.
//
// Runs against the stand-in registry (CI), or a real one (E2E_API_BASE, with
// E2E_OPERATOR_TOKEN and E2E_ANCHOR_CONTRACT matching the registry's settings, see
// e2e/README.md): then the records are saved, batched and anchored on that registry first.
// All records are practice data.
// SPDX-License-Identifier: Apache-2.0
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, firefox, type Browser, type Download, type Locator, type Page } from '@playwright/test';
import { unzipSync } from 'fflate';
import { buildBatch, canonicalise, generateKeypair, signAttestation } from 'veilcore-records';
import {
  API,
  REAL_REGISTRY,
  expectNoErrors,
  isolate,
  json,
  newVaultKey,
  sealedRecordRow,
  vaultStorageValue,
  watch,
} from './helpers';

const OPERATOR = process.env.E2E_OPERATOR_TOKEN ?? '';
const ANCHOR_CONTRACT = process.env.E2E_ANCHOR_CONTRACT ?? '7a'.repeat(32);
const ANCHOR_TX = randomBytes(32).toString('hex');
const HOLDER = randomBytes(32).toString('hex');
// The holder's vault key: a real registry takes records only sealed (CONTRACT.md #4).
const VAULT = newVaultKey();

const sha256 = (b: string | Uint8Array) => createHash('sha256').update(b).digest('hex');
/** H(tag, ...) of SPEC 3.6.1: SHA-256 over the zero-padded tag and 32-byte pieces. */
const H = (tag: string, ...hex: string[]) => {
  const t = Buffer.alloc(32);
  t.write(tag, 'utf8');
  return createHash('sha256')
    .update(Buffer.concat([t, ...hex.map((h) => Buffer.from(h, 'hex'))]))
    .digest('hex');
};

type Rec = Record<string, unknown> & { id: string; recordFingerprint: string; strainName: string };
const committed = (r: Record<string, unknown>) => ({
  breedingMethod: r.breedingMethod ?? '',
  bredBy: r.bredBy,
  dateCreated: r.dateCreated,
  loggedAt: r.loggedAt,
  nonce: r.nonce,
  notes: r.notes,
  parents: r.parents ?? [],
  photoFingerprints: r.photoFingerprints ?? [],
  refId: r.refId ?? '',
  strainName: r.strainName,
  ...(r.profile ? { profile: r.profile } : {}),
  ...(r.taxon ? { taxon: r.taxon } : {}),
  ...(r.keyBinding !== undefined ? { keyBinding: r.keyBinding } : {}),
});
const seal = (r: Record<string, unknown>): Rec => {
  const content = sha256(canonicalise(committed(r)));
  return {
    ...r,
    recordFingerprint: typeof r.keyBinding === 'string' ? H('veilcore:v1:keyrecord', r.keyBinding, content) : content,
  } as Rec;
};
const recordId = () => `VEIL-${randomBytes(16).toString('hex').toUpperCase()}`;

// Practice records: one names its key and has a lab report saved; one is an older record.
const SECRET = randomBytes(32).toString('hex');
const IDENTITY = H('veilcore:v1:commit', SECRET);
const KEY_SALT = H('veilcore:v1:keysalt', SECRET);
const LAB_FILE = Buffer.from(`Practice lab report (test data) ${Date.now()}\n`);
const LAB_SHA = sha256(LAB_FILE);
const bound = seal({
  id: recordId(),
  nonce: randomBytes(32).toString('hex'),
  strainName: 'Evidence test record (practice) é 🌱',
  bredBy: 'E2E',
  dateCreated: '2026-10-01',
  notes: 'Practice data. "</script>" stays text.',
  loggedAt: Date.now() - 60_000,
  parents: [],
  photoFingerprints: [],
  profile: 'veilcore/profile/plant-variety/v1',
  keyBinding: H('veilcore:v1:keybind', IDENTITY, KEY_SALT),
  licenseIds: [],
  dnaFingerprint: H('veilcore:v1:commit', LAB_SHA),
  dnaFileName: 'Practice lab report.txt',
  dnaFileSha256: LAB_SHA,
  dnaPairedAt: Date.now() - 30_000,
});
const older = seal({
  id: recordId(),
  nonce: randomBytes(32).toString('hex'),
  strainName: 'Older evidence test record (practice)',
  bredBy: 'E2E',
  dateCreated: '2026-09-01',
  notes: '',
  loggedAt: Date.now() - 120_000,
  licenseIds: [],
});

/**
 * A Bitcoin stamp file for a batch root, in the OpenTimestamps format: SHA-256(root.bin),
 * one append and a sha256, then a Bitcoin attestation for block STAMP_BLOCK. Made up (no
 * such block holds it): the page only reads what the file says, it can't reach Bitcoin.
 */
const STAMP_BLOCK = 870001;
const stampFor = (rootHex: string): Buffer => {
  const leb = (n: number) => {
    const out: number[] = [];
    do {
      let b = n & 0x7f;
      n = Math.floor(n / 128);
      if (n) b |= 0x80;
      out.push(b);
    } while (n);
    return Buffer.from(out);
  };
  const magic = Buffer.concat([
    Buffer.from([0]),
    Buffer.from('OpenTimestamps'),
    Buffer.from([0, 0]),
    Buffer.from('Proof'),
    Buffer.from([0, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94]),
  ]);
  const digest = createHash('sha256').update(Buffer.from(rootHex, 'hex')).digest();
  const x = randomBytes(16);
  const height = leb(STAMP_BLOCK);
  return Buffer.concat([
    magic,
    Buffer.from([1, 0x08]),
    digest,
    Buffer.from([0xf0]),
    leb(x.length),
    x,
    Buffer.from([0x08, 0x00]),
    Buffer.from('0588960d73d71901', 'hex'),
    leb(height.length),
    height,
  ]);
};

/** What the registry holds for these records, from the stand-in or from a real registry. */
type Setup = {
  batchRoot: string;
  evidence: Record<string, unknown>;
  ots: boolean;
  /** GET /transfers/sent for the holder: a delivery of `bound` with sample details (stand-in only). */
  sent?: Record<string, unknown>[];
};

/** The sample details on a delivery, and the digest a lab's receipt id carries (transfers.ts custodyDigest). */
const SAMPLE = { sampleId: 'E2E-07', sealNumber: '4471', takenFrom: 'Mother M3', witness: 'Practice witness' };
const ARRIVAL = { sampleId: 'E2E-07', sealNumber: '4471', sealIntact: 'yes', arrivedOn: '2026-10-15' };
const DELIVERY = `T-E2E-${randomBytes(4).toString('hex').toUpperCase()}`;
const CUSTODY_DIGEST = sha256(
  canonicalise({ format: 'veilcore/sample-custody/v1', transferId: DELIVERY, sample: SAMPLE, arrival: ARRIVAL }),
);

const standIn = async (): Promise<Setup> => {
  const batch = await buildBatch([bound.recordFingerprint, older.recordFingerprint], 'B-20261015-E2E0');
  const kp = await generateKeypair();
  const signed = await signAttestation(
    {
      attestationId: `att_e2e_${randomBytes(4).toString('hex')}`,
      type: 'laboratory-report',
      subjectCommitment: bound.recordFingerprint,
      documentHash: LAB_SHA,
      hashAlgorithm: 'sha256',
      issuedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      attester: { publicKey: kp.publicKey, displayName: 'Practice Lab' },
    },
    kp.privateKey,
  );
  const anchor = {
    chain: 'midnight',
    network: 'preprod',
    contractAddress: ANCHOR_CONTRACT,
    txHash: ANCHOR_TX,
    blockHeight: 4242,
    anchoredAt: new Date().toISOString(),
    testNetwork: true,
  };
  // The lab's receipt for a delivery of `bound`, its id carrying the sample details' digest.
  const lab = await generateKeypair();
  const receipt = await signAttestation(
    {
      attestationId: `att_${randomBytes(8).toString('hex')}_sc1_${CUSTODY_DIGEST}`,
      type: 'chain-of-custody',
      subjectCommitment: bound.recordFingerprint,
      documentHash: randomBytes(32).toString('hex'),
      hashAlgorithm: 'sha256',
      issuedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      attester: { publicKey: lab.publicKey, displayName: 'Practice Lab' },
    },
    lab.privateKey,
  );
  const sent = [
    {
      id: DELIVERY,
      source_record: bound.id,
      to_handle: 'practice-lab',
      created_at: Date.now() - 50_000,
      claimed_at: Date.now() - 40_000,
      sample_custody: SAMPLE,
      arrival_custody: ARRIVAL,
      receipt_attestation_id: receipt.attestationId,
    },
  ];
  const evidence: Record<string, unknown> = {};
  for (const r of [bound, older]) {
    const proof = { ...batch.proofs[r.recordFingerprint], anchor, anchors: [{ kind: 'ledger', ...anchor }] };
    evidence[r.id] = {
      format: 'veilcore-record-evidence/v1',
      recordId: r.id,
      record: r,
      registryFirstSeen: new Date().toISOString(),
      proof,
      batch: {
        batchId: batch.batchId,
        root: batch.root,
        sealedAt: batch.sealedAt,
        recordCount: 2,
        anchor,
        earlierAnchors: [],
        // The registry says "pending"; the file itself names a block. The page goes by the file.
        opentimestamps: {
          available: true,
          status: 'pending',
          calendars: [],
          ots: stampFor(batch.root).toString('base64'),
        },
      },
      attestations:
        r === bound
          ? [
              { ...signed, retraction: null, registeredAs: null, strength: 'signed' },
              { ...receipt, retraction: null, registeredAs: null, strength: 'signed' },
            ]
          : [],
      attestationsTotal: r === bound ? 2 : 0,
    };
  }
  return { batchRoot: batch.root, evidence, ots: true, sent };
};

const real = async (): Promise<Setup> => {
  const call = async (method: string, p: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await fetch(`${API}${p}`, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${p}: ${res.status} ${text}`);
    return JSON.parse(text) as Record<string, unknown>;
  };
  const saved = await call(
    'PUT',
    '/api/records',
    [bound, older].map((r) => sealedRecordRow(r, VAULT)),
    {
      'x-holder-key': HOLDER,
    },
  );
  if (saved.count !== 2) throw new Error(`PUT /api/records stored ${String(saved.count)}: ${JSON.stringify(saved)}`);
  const kp = await generateKeypair();
  const signed = await signAttestation(
    {
      attestationId: `att_e2e_${randomBytes(4).toString('hex')}`,
      type: 'laboratory-report',
      subjectCommitment: bound.recordFingerprint,
      documentHash: LAB_SHA,
      hashAlgorithm: 'sha256',
      issuedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      attester: { publicKey: kp.publicKey, displayName: 'Practice Lab' },
    },
    kp.privateKey,
  );
  await call('POST', '/attestations', signed);
  const op = { 'x-operator-token': OPERATOR };
  const sealed = await call('POST', '/batches/seal', undefined, op);
  const batchId = sealed.batchId as string;
  await call(
    'POST',
    `/batches/${batchId}/anchor`,
    {
      network: 'preprod',
      contractAddress: ANCHOR_CONTRACT,
      txHash: ANCHOR_TX,
      blockHeight: 4242,
      anchoredAt: new Date().toISOString(),
    },
    op,
  );
  const ev = await call('GET', `/records/${bound.id}/evidence`, undefined, { 'x-holder-key': HOLDER });
  return { batchRoot: (ev.batch as { root: string }).root, evidence: {}, ots: false };
};

const openPlant = async (page: Page, setup: Setup, id: string) => {
  await page.addInitScript(
    ({ holder, keys, vault }) => {
      localStorage.setItem('veilcore.holder.v1', holder);
      localStorage.setItem('veilcore.vault.v1', vault);
      localStorage.setItem('veilcore.role.v1', 'breeder');
      localStorage.setItem('veilcore.record-keys.v1', JSON.stringify(keys));
    },
    {
      holder: HOLDER,
      vault: vaultStorageValue(VAULT),
      keys: {
        [bound.id]: {
          recordId: bound.id,
          recordSecret: SECRET,
          recoverySecret: '22'.repeat(32),
          createdAt: Date.now(),
        },
      },
    },
  );
  await isolate(page, {
    'GET /api/records': (route) => json(route, 200, [bound, older]),
    'GET /records/:record/evidence': (route, url) => {
      const rid = /\/records\/([^/]+)\/evidence/.exec(url.pathname)?.[1] ?? '';
      const ev = setup.evidence[rid];
      return ev ? json(route, 200, ev) : json(route, 404, { error: 'no such record for this holder key' });
    },
    'GET /transfers/sent': (route) => json(route, 200, { transfers: setup.sent ?? [] }),
  });
  await page.goto(`/record/${id}`);
  await expect(
    page.getByRole('heading', { name: id === bound.id ? bound.strainName : older.strainName }),
  ).toBeVisible();
};

/**
 * Press Download in the bundle dialog and take what the browser downloads. The page's own
 * word on it is waited for first ("Downloaded …", or why not), so a refusal fails here with
 * the page's words rather than sitting out the two-minute test timeout waiting for a
 * download that was never going to start. The download is then read only once the browser
 * has finished writing it (download.path(), in unzipTo).
 *
 * The one way left for the download event never to come is the browser's own: Chromium
 * starts no download, and Playwright reports none, when the disk its downloads go to is full
 * (seen on 15 Oct 2026; e2e/global-setup.ts refuses to start a run without room).
 */
const takeDownload = async (page: Page, dialog: Locator): Promise<Download> => {
  const download = page.waitForEvent('download');
  download.catch(() => undefined); // not left unhandled when the page refuses and the test ends
  await dialog.getByRole('button', { name: /^Download$/ }).click();
  const done = dialog.getByText(/^Downloaded .+\.zip\./);
  const refused = dialog.getByRole('alert').filter({ hasNotText: /^Downloaded / });
  await expect(done.or(refused)).toBeVisible();
  if (!(await done.isVisible())) throw new Error(`the page made no bundle: ${await refused.innerText()}`);
  return download;
};

/** Unzip a download into its own folder; the folder the bundle made. */
const unzipTo = async (download: import('@playwright/test').Download, dir: string): Promise<string> => {
  const zip = fs.readFileSync(await download.path());
  const files = unzipSync(new Uint8Array(zip));
  for (const [name, bytes] of Object.entries(files)) {
    const out = path.join(dir, name);
    expect(path.resolve(out).startsWith(path.resolve(dir))).toBe(true);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, bytes);
  }
  const [top] = fs.readdirSync(dir);
  return path.join(dir, top);
};

const listFiles = (dir: string, base = dir): string[] =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((d) =>
      d.isDirectory() ? listFiles(path.join(dir, d.name), base) : [path.relative(base, path.join(dir, d.name))],
    )
    .sort();

/** Open a page from disk with the network off; every request it makes is recorded. */
const openOffline = async (browser: Browser, file: string) => {
  // Phone width: the page must fit without sideways scrolling.
  const ctx = await browser.newContext({ offline: true, viewport: { width: 360, height: 800 } });
  const requests: string[] = [];
  await ctx.route('**/*', (route) =>
    route.request().url().startsWith('file:')
      ? route.continue()
      : (requests.push(route.request().url()), route.abort()),
  );
  const page = await ctx.newPage();
  page.on('request', (r) => requests.push(r.url()));
  const errors = watch(page);
  await page.goto(`file://${file}`);
  await expect(page.locator('body[data-checked]')).toBeVisible({ timeout: 20_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  return { ctx, page, requests, errors };
};

/** EXAMINER-SUMMARY.html from disk with the network off: it has no script, so nothing to wait for. */
const openSummary = async (browser: Browser, file: string) => {
  const ctx = await browser.newContext({ offline: true, viewport: { width: 360, height: 800 } });
  const requests: string[] = [];
  await ctx.route('**/*', (route) =>
    route.request().url().startsWith('file:')
      ? route.continue()
      : (requests.push(route.request().url()), route.abort()),
  );
  const page = await ctx.newPage();
  page.on('request', (r) => requests.push(r.url()));
  const errors = watch(page);
  await page.goto(`file://${file}`);
  await expect(page.locator('body[data-summary="veilcore-examiner-summary/v1"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  return { ctx, page, requests, errors };
};

/** verify.html with its embedded evidence changed. */
const tamperedPage = (html: string, change: (ev: Record<string, any>) => void): string => {
  const marker = 'id="veilcore-evidence">';
  const start = html.indexOf(marker) + marker.length;
  const end = html.indexOf('</script>', start);
  const ev = JSON.parse(html.slice(start, end)) as Record<string, any>;
  change(ev);
  return html.slice(0, start) + JSON.stringify(ev).replace(/</g, '\\u003c') + html.slice(end);
};

const flip = (h: string) => (h[0] === '0' ? '1' : '0') + h.slice(1);

test.describe('evidence bundle', () => {
  let setup: Setup;
  test.beforeAll(async () => {
    test.skip(REAL_REGISTRY && !OPERATOR, 'a real registry needs E2E_OPERATOR_TOKEN to batch and anchor');
    setup = REAL_REGISTRY ? await real() : await standIn();
  });

  test('download from the plant page, open verify.html from disk offline: it checks, and refuses tampering', async ({
    page,
    browser,
  }, info) => {
    const errors = watch(page);
    await openPlant(page, setup, bound.id);

    // The visible link near the record's date.
    await page.getByRole('button', { name: 'Download evidence bundle' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Download evidence bundle' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('checkbox', { name: /Include the record’s key/ }).check();
    await dialog.getByRole('checkbox', { name: /Include the DNA report file/ }).check();
    // The wrong file is refused before anything is downloaded.
    await dialog.locator('input[aria-label="DNA report file"]').setInputFiles({
      name: 'Other.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not the lab report'),
    });
    await dialog.getByRole('button', { name: /^Download$/ }).click();
    await expect(dialog.getByText(/isn’t the lab report saved to this plant/)).toBeVisible();
    await dialog.locator('input[aria-label="DNA report file"]').setInputFiles({
      name: 'Practice lab report.txt',
      mimeType: 'text/plain',
      buffer: LAB_FILE,
    });
    const download = await takeDownload(page, dialog);
    expect(download.suggestedFilename()).toBe(`${bound.id}-evidence.zip`);
    await expect(dialog.getByText(/Open verify\.html inside it/)).toBeVisible();
    expectNoErrors(errors);

    const dir = await unzipTo(download, info.outputPath('bundle'));
    expect(listFiles(dir)).toEqual(
      [
        'DECLARATION-TEMPLATE.txt',
        'EXAMINER-SUMMARY.html',
        'README.txt',
        'evidence.json',
        'key/key-binding.json',
        'lab/lab-report-pairing.json',
        'lab/report/Practice lab report.txt',
        'lab/signatures.json',
        'proof/anchors.json',
        'proof/batch-root.txt',
        'proof/inclusion-proof.json',
        'proof/root.bin',
        ...(setup.ots ? ['proof/root.bin.ots'] : []),
        'record/fingerprint.txt',
        'record/sealed-fields.canonical.json',
        'record/sealed-fields.json',
        'spec/SPEC-sections.md',
        'verify.html',
      ].sort(),
    );
    expect(fs.readFileSync(path.join(dir, 'record/fingerprint.txt'), 'utf8').trim()).toBe(bound.recordFingerprint);
    expect(sha256(fs.readFileSync(path.join(dir, 'record/sealed-fields.canonical.json')))).toBe(
      JSON.parse(fs.readFileSync(path.join(dir, 'evidence.json'), 'utf8')).record.contentHash,
    );
    expect(fs.readFileSync(path.join(dir, 'proof/root.bin')).toString('hex')).toBe(setup.batchRoot);
    const readme = fs.readFileSync(path.join(dir, 'README.txt'), 'utf8').replace(/\s+/g, ' ');
    expect(readme).toContain(`Search for transaction ${ANCHOR_TX}.`);
    expect(readme).toContain('FOR TECHNICAL READERS');
    expect(readme).toMatch(/practice data/);

    // verify.html from disk, network off.
    const verifyFile = path.join(dir, 'verify.html');
    const run = await openOffline(browser, verifyFile);
    const v = run.page;
    await expect(v.locator('body')).toHaveAttribute('data-checked', 'yes');
    await expect(v.getByText('The files agree with each other', { exact: true })).toBeVisible();
    await expect(v.locator('[data-check="lookups-withheld"]')).toHaveCount(0);
    // What was sealed, as text: the name, who bred it, the notes with their "</script>".
    const sealed = v.locator('table[data-sealed="matches"]');
    await expect(sealed).toContainText(bound.strainName);
    await expect(sealed.locator('tr', { hasText: 'Bred by' })).toContainText('E2E');
    await expect(sealed.locator('tr', { hasText: 'Notes' })).toContainText('Practice data. "</script>" stays text.');
    await expect(sealed.locator('tr', { hasText: 'Stated date' })).toContainText('2026-10-01');
    await expect(v.getByText('Fingerprint matches', { exact: true })).toBeVisible();
    await expect(v.getByText('Proof leads to the batch root', { exact: true })).toBeVisible();
    await expect(v.getByText('The record’s key matches', { exact: true })).toBeVisible();
    await expect(v.getByText('Lab report pairing matches', { exact: true })).toBeVisible();
    // The lab report's signature and, on the stand-in, the lab's sample receipt.
    await expect(v.getByText('Signature checks', { exact: true })).toHaveCount(setup.sent ? 2 : 1);
    if (setup.sent) {
      // The sample details on the delivery: the page works the digest out again and finds it
      // in the lab's signed receipt id.
      const custody = v.locator('[data-check="custody"][data-custody="covered"]');
      await expect(custody).toContainText(DELIVERY);
      await expect(custody).toContainText('veilcore/sample-custody/v1');
      await expect(custody).toContainText(CUSTODY_DIGEST);
      await expect(custody.locator('dt', { hasText: 'Sent: Seal number' })).toBeVisible();
    }
    await expect(v.locator('[data-check="lookup-midnight"]')).toContainText(ANCHOR_TX);
    await expect(v.locator('[data-check="lookup-midnight"]')).toContainText(setup.batchRoot);
    await expect(v.locator('[data-check="lookup-midnight"]')).toContainText(/test network/);
    await expect(v.locator('[data-check="lookup-midnight"]')).toContainText(
      'Open the Midnight explorer for Midnight preprod (a test network): https://preprod.midnightexplorer.com/',
    );
    if (setup.ots) {
      const btc = v.locator('[data-check="lookup-bitcoin"]');
      await expect(btc).toContainText('ots verify root.bin.ots');
      // What the file shows, not the registry's "pending".
      await expect(btc).toContainText(`names Bitcoin block ${STAMP_BLOCK}`);
      await expect(btc).toContainText('This page can’t reach Bitcoin');
    }
    // The plant's name is text, never markup.
    await expect(v.getByText(bound.strainName, { exact: false }).first()).toBeVisible();
    // The files themselves, chosen in the page: the lab report and root.bin match.
    await v
      .locator('#files')
      .setInputFiles([path.join(dir, 'lab/report/Practice lab report.txt'), path.join(dir, 'proof/root.bin')]);
    await expect(v.getByText('Practice lab report.txt is the lab report saved to this plant')).toBeVisible();
    await expect(v.getByText('root.bin is the batch root')).toBeVisible();
    // A tampered sealed-fields.json, chosen in the page: refused.
    const tamperedFields = JSON.parse(fs.readFileSync(path.join(dir, 'record/sealed-fields.json'), 'utf8')) as Record<
      string,
      unknown
    >;
    tamperedFields.strainName = 'Someone else’s name';
    await v.locator('#files').setInputFiles({
      name: 'sealed-fields.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(tamperedFields)),
    });
    await expect(v.getByText('Fingerprint does not match', { exact: true })).toBeVisible();
    if (setup.sent) {
      // evidence.json with the lab's seal number changed: the receipt no longer covers it,
      // whatever the file says.
      const ev = JSON.parse(fs.readFileSync(path.join(dir, 'evidence.json'), 'utf8')) as {
        custody: { arrival: Record<string, string>; covered: string }[];
      };
      ev.custody[0].arrival.sealNumber = '9999';
      await v.locator('#files').setInputFiles({
        name: 'evidence.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(ev)),
      });
      await expect(v.locator('[data-check="custody"][data-custody="changed"]')).toContainText(
        'the receipt doesn’t cover what the lab wrote on arrival',
      );
    }
    expect(run.requests.filter((u) => !u.startsWith('file:'))).toEqual([]);
    expectNoErrors(run.errors);
    await run.ctx.close();

    // The examiner summary, from disk, network off: text only, no script, prints.
    const summary = await openSummary(browser, path.join(dir, 'EXAMINER-SUMMARY.html'));
    const sp = summary.page;
    await expect(sp.locator('h1')).toContainText(bound.strainName);
    await expect(sp.locator('h1')).toContainText(bound.id);
    await expect(sp.locator('table.sealed tr', { hasText: 'Notes' })).toContainText(
      'Practice data. "</script>" stays text.',
    );
    await expect(sp.locator('table.sealed tr', { hasText: 'Bred by' })).toContainText('E2E');
    for (const value of [bound.recordFingerprint, setup.batchRoot, ANCHOR_TX, ANCHOR_CONTRACT])
      await expect(sp.locator('main')).toContainText(value);
    await expect(sp.getByText('How it was checked', { exact: false }).first()).toBeVisible();
    await expect(sp.locator('main')).toContainText('Not checked for you: the Midnight transaction');
    await expect(sp.locator('main')).toContainText(LAB_SHA);
    await expect(sp.locator('main')).toContainText('Practice Lab (not checked)');
    if (setup.sent) {
      // The sample details on the delivery, beside the lab's receipt that covers them.
      const custody = sp.locator('[data-custody="covered"]');
      await expect(custody).toContainText(DELIVERY);
      await expect(custody.locator('tr', { hasText: 'Sent: Seal number' })).toContainText('4471');
      await expect(custody.locator('tr', { hasText: 'Received: Seal on arrival' })).toContainText('intact');
      await expect(custody.locator('tr', { hasText: 'Sent: Witness' })).toContainText('Practice witness');
      await expect(sp.locator('main')).toContainText('Sample ID and seal number match what was sent.');
    }
    await expect(sp.locator('[data-practice="yes"]')).toContainText('Practice data');
    await expect(sp.getByRole('heading', { name: 'What this does not show' })).toBeVisible();
    await expect(sp.locator('main')).toContainText('not legal advice');
    expect(await sp.locator('script, link, img, iframe, a[href], [src]').count()).toBe(0);
    // Prints to PDF from the browser.
    const pdf = await sp.pdf({ format: 'A4' });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(summary.requests.filter((u) => !u.startsWith('file:'))).toEqual([]);
    expectNoErrors(summary.errors);
    await summary.ctx.close();
    const declaration = fs.readFileSync(path.join(dir, 'DECLARATION-TEMPLATE.txt'), 'utf8');
    expect(declaration).toMatch(/^=+\nSAMPLE TEXT\. NOT LEGAL ADVICE\./);
    expect(declaration.replace(/\s+/g, ' ')).toContain(bound.recordFingerprint);
    for (const f of listFiles(dir).filter((n) => n !== 'DECLARATION-TEMPLATE.txt' && !n.startsWith('verify-')))
      expect(declaration, f).toContain(`- ${f}\n  SHA-256 ${sha256(fs.readFileSync(path.join(dir, f)))}`);

    // Tampered copies of the page itself.
    const html = fs.readFileSync(verifyFile, 'utf8');
    const variants: {
      name: string;
      change: (ev: Record<string, any>) => void;
      expect: string[];
      withheld: string;
    }[] = [
      {
        name: 'tampered-record',
        change: (ev) => (ev.record.sealedFields.notes = 'edited later'),
        expect: ['Fingerprint does not match', 'Proof does not lead to the batch root'],
        withheld:
          'Don’t use this to date the record: the fingerprint does not match the sealed fields; the proof does not lead to the batch root',
      },
      {
        name: 'tampered-date',
        change: (ev) => (ev.record.sealedFields.dateCreated = '2019-01-01'),
        expect: ['Fingerprint does not match'],
        withheld: 'Don’t use this to date the record: the fingerprint does not match the sealed fields',
      },
      {
        name: 'wrong-proof',
        change: (ev) => {
          if (ev.proof.path.length) ev.proof.path[0].sibling = flip(ev.proof.path[0].sibling);
          else ev.proof.root = flip(ev.proof.root);
        },
        expect: ['Fingerprint matches', 'Proof does not lead to the batch root'],
        withheld: 'Don’t use this to date the record: the proof does not lead to the batch root',
      },
      {
        name: 'wrong-root',
        change: (ev) => (ev.batch.root = flip(ev.batch.root)),
        expect: ['Fingerprint matches', 'Proof does not lead to the batch root'],
        withheld: 'Don’t use this to date the record: the proof does not lead to the batch root',
      },
      {
        name: 'wrong-key',
        change: (ev) => (ev.key.identity = flip(ev.key.identity)),
        expect: ['Fingerprint matches', 'The key does not match'],
        withheld: 'Don’t use this to date the record: the key does not match the record',
      },
    ];
    for (const variant of variants) {
      const file = path.join(dir, `verify-${variant.name}.html`);
      fs.writeFileSync(file, tamperedPage(html, variant.change));
      const t = await openOffline(browser, file);
      for (const headline of variant.expect)
        await expect(t.page.getByText(headline, { exact: true }), variant.name).toBeVisible();
      // The look-up steps are withheld, and the page says which check failed.
      await expect(t.page.getByText('Don’t use this to date the record', { exact: true }), variant.name).toBeVisible();
      await expect(t.page.locator('[data-check="lookups-withheld"]'), variant.name).toContainText(variant.withheld);
      await expect(t.page.locator('[data-check="lookup-midnight"]'), variant.name).toHaveCount(0);
      await expect(t.page.locator('[data-check="lookup-bitcoin"]'), variant.name).toHaveCount(0);
      await expect(t.page.locator('body'), variant.name).not.toContainText('existed, unchanged, by');
      if (variant.name.startsWith('tampered'))
        await expect(t.page.locator('table[data-sealed="changed"]'), variant.name).toBeVisible();
      expect(t.requests.filter((u) => !u.startsWith('file:'))).toEqual([]);
      expectNoErrors(t.errors);
      await t.ctx.close();
    }

    // Firefox too, where Playwright's Firefox is installed. Looked for first: a launch that
    // fails still leaves an empty profile folder behind in the system's temporary folder,
    // one per run. Closed whatever happens, so a failed check leaves no browser running.
    if (fs.existsSync(firefox.executablePath())) {
      const ff = await firefox.launch();
      try {
        const f = await openOffline(ff, verifyFile);
        await expect(f.page.getByText('Fingerprint matches', { exact: true })).toBeVisible();
        await expect(f.page.getByText('Proof leads to the batch root', { exact: true })).toBeVisible();
        expect(f.requests.filter((u) => !u.startsWith('file:'))).toEqual([]);
      } finally {
        await ff.close();
      }
    } else {
      info.annotations.push({
        type: 'firefox',
        description: 'not installed here: verify.html checked in Chromium only',
      });
    }
  });

  test('from Technical details, nothing ticked: an older record’s bundle has no key and no lab file', async ({
    page,
    browser,
  }, info) => {
    const errors = watch(page);
    await openPlant(page, setup, older.id);
    await page.getByRole('button', { name: 'Technical details' }).click();
    await expect(page.getByText('Evidence bundle', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export record' })).toBeVisible();
    await page.getByRole('button', { name: 'Download evidence bundle' }).last().click();
    const dialog = page.getByRole('dialog', { name: 'Download evidence bundle' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('checkbox')).toHaveCount(0);
    const download = await takeDownload(page, dialog);
    expect(download.suggestedFilename()).toBe(`${older.id}-evidence.zip`);
    const dir = await unzipTo(download, info.outputPath('bundle'));
    const names = listFiles(dir);
    expect(names).not.toContain('key/key-binding.json');
    expect(names.filter((n) => n.startsWith('lab/'))).toEqual([]);
    expect(names).toContain('EXAMINER-SUMMARY.html');
    expect(names).toContain('DECLARATION-TEMPLATE.txt');
    const summary = await openSummary(browser, path.join(dir, 'EXAMINER-SUMMARY.html'));
    await expect(summary.page.locator('main')).toContainText('No lab report is saved to this plant.');
    expect(summary.requests.filter((u) => !u.startsWith('file:'))).toEqual([]);
    await summary.ctx.close();
    const run = await openOffline(browser, path.join(dir, 'verify.html'));
    await expect(run.page.getByText('Fingerprint matches', { exact: true })).toBeVisible();
    await expect(run.page.getByText('Proof leads to the batch root', { exact: true })).toBeVisible();
    await expect(run.page.locator('[data-check="key"]')).toHaveCount(0);
    expect(run.requests.filter((u) => !u.startsWith('file:'))).toEqual([]);
    expectNoErrors(run.errors);
    await run.ctx.close();
    expectNoErrors(errors);
  });
});
