// "Breeding history (draft)", end to end against the stand-in registry: three generations
// sealed (the oldest naming a parent someone else holds, the newest a parent with no record),
// the newest's plant page makes the zip, and breeding-history.html, COVER-NOTE.html and one
// record's verify.html open from disk (file://) with the network off. All records are
// practice data.
// SPDX-License-Identifier: Apache-2.0
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { unzipSync } from 'fflate';
import { buildBatch, canonicalise } from 'veilcore-records';
import { REAL_REGISTRY, expectNoErrors, isolate, json, watch } from './helpers';

const HOLDER = randomBytes(32).toString('hex');
const sha256 = (b: string | Uint8Array) => createHash('sha256').update(b).digest('hex');

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
});
const seal = (r: Record<string, unknown>): Rec =>
  ({ ...r, recordFingerprint: sha256(canonicalise(committed(r))) }) as Rec;
const recordId = () => `VEIL-${randomBytes(16).toString('hex').toUpperCase()}`;
const THEIRS = recordId();

const base = (n: number) => ({
  id: recordId(),
  nonce: randomBytes(32).toString('hex'),
  bredBy: 'E2E breeder',
  loggedAt: Date.now() - (4 - n) * 60_000,
  photoFingerprints: [],
  profile: 'veilcore/profile/plant-variety/v1',
  taxon: 'Cannabis sativa',
  licenseIds: [],
});
const g1 = seal({
  ...base(1),
  strainName: 'History mother (practice)',
  dateCreated: '2024-04-01',
  notes: 'Stage: starting mother\nSelected for: vigour',
  breedingMethod: 'Clone / cutting',
  parents: [{ recordId: THEIRS, name: 'Their stock' }],
});
const g2 = seal({
  ...base(2),
  strainName: 'History F2 (practice)',
  dateCreated: '2025-04-01',
  notes: 'Stage: F2\nSelected for: short internodes\n\nKept 6 of 60.',
  breedingMethod: 'Seed — F2',
  parents: [{ recordId: g1.id, name: g1.strainName }],
});
const g3 = seal({
  ...base(3),
  strainName: 'History F3 <b>(practice)</b>',
  dateCreated: '2026-04-01',
  notes: 'Stage: F3\nSelected for: early finish',
  breedingMethod: 'Seed — F1',
  parents: [{ recordId: g2.id, name: g2.strainName }, { name: 'Pollen donor' }],
});
const RECORDS = [g3, g2, g1];

/** g1 and g2 in a batch dated on preprod; g3 not in a batch yet. */
const evidenceFor = async (): Promise<Record<string, unknown>> => {
  const batch = await buildBatch([g1.recordFingerprint, g2.recordFingerprint], 'B-20261015-HIST');
  const anchor = {
    chain: 'midnight',
    network: 'preprod',
    contractAddress: '7a'.repeat(32),
    txHash: randomBytes(32).toString('hex'),
    blockHeight: 4242,
    anchoredAt: '2026-10-15T11:00:00.000Z',
    testNetwork: true,
  };
  const out: Record<string, unknown> = {};
  for (const r of RECORDS) {
    const p = batch.proofs[r.recordFingerprint];
    out[r.id] = {
      format: 'veilcore-record-evidence/v1',
      recordId: r.id,
      record: r,
      registryFirstSeen: new Date().toISOString(),
      proof: p ? { ...p, anchor, anchors: [{ kind: 'ledger', ...anchor }] } : null,
      batch: p
        ? {
            batchId: batch.batchId,
            root: batch.root,
            sealedAt: batch.sealedAt,
            recordCount: 2,
            anchor,
            earlierAnchors: [],
            opentimestamps: { available: false, status: 'none' },
          }
        : null,
      attestations: [],
      attestationsTotal: 0,
    };
  }
  return out;
};

const openOffline = async (browser: Browser, file: string, ready: string) => {
  const ctx = await browser.newContext({ offline: true, viewport: { width: 360, height: 800 } });
  const requests: string[] = [];
  await ctx.route('**/*', (route) =>
    route.request().url().startsWith('file:')
      ? route.continue()
      : (requests.push(route.request().url()), route.abort()),
  );
  const page = await ctx.newPage();
  page.on('request', (r) => {
    if (!r.url().startsWith('file:')) requests.push(r.url());
  });
  const errors = watch(page);
  await page.goto(`file://${file}`);
  await expect(page.locator(ready)).toBeVisible({ timeout: 20_000 });
  // Phone width: no sideways scrolling.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  return { ctx, page, requests, errors };
};

const openPlant = async (page: Page, evidence: Record<string, unknown>) => {
  await page.addInitScript((holder) => {
    localStorage.setItem('veilcore.holder.v1', holder);
    localStorage.setItem('veilcore.role.v1', 'breeder');
  }, HOLDER);
  await isolate(page, {
    'GET /api/records': (route) => json(route, 200, RECORDS),
    'GET /records/:record/evidence': (route, url) => {
      const rid = /\/records\/([^/]+)\/evidence/.exec(url.pathname)?.[1] ?? '';
      return evidence[rid] ? json(route, 200, evidence[rid]) : json(route, 404, { error: 'no such record' });
    },
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
  });
  await page.goto(`/record/${g3.id}`);
  await expect(page.getByRole('heading', { name: g3.strainName })).toBeVisible();
};

test.describe('breeding history (draft)', () => {
  test.skip(REAL_REGISTRY, 'stand-in registry only');

  test('three generations: export from the newest, open the pages from disk offline', async ({
    page,
    browser,
  }, info) => {
    const errors = watch(page);
    await openPlant(page, await evidenceFor());

    await page.getByRole('button', { name: 'Technical details' }).click();
    await page.getByRole('button', { name: 'Breeding history (draft)' }).click();
    const dialog = page.getByRole('dialog', { name: 'Breeding history (draft)' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('A record dates nothing earlier than the day it was sealed.');
    await expect(dialog).toContainText(
      '3 records you hold here, 1 linked parent held by someone else (listed as theirs), 1 parent named with no record.',
    );
    const download = page.waitForEvent('download');
    download.catch(() => undefined);
    await dialog.getByRole('button', { name: /^Download$/ }).click();
    const done = dialog.getByText(/^Downloaded .+\.zip\./);
    const refused = dialog.getByRole('alert').filter({ hasNotText: /^Downloaded / });
    await expect(done.or(refused)).toBeVisible();
    if (!(await done.isVisible())) throw new Error(`no history made: ${await refused.innerText()}`);
    const d = await download;
    expect(d.suggestedFilename()).toBe(`breeding-history-${g3.id}.zip`);
    expectNoErrors(errors);

    // Unzip into a folder of its own.
    const out = info.outputPath('history');
    const files = unzipSync(new Uint8Array(fs.readFileSync(await d.path())));
    for (const [name, bytes] of Object.entries(files)) {
      const at = path.join(out, name);
      expect(path.resolve(at).startsWith(path.resolve(out))).toBe(true);
      fs.mkdirSync(path.dirname(at), { recursive: true });
      fs.writeFileSync(at, bytes);
    }
    const top = path.join(out, `breeding-history-${g3.id}`);
    expect(fs.readdirSync(top).sort()).toEqual(['COVER-NOTE.html', 'breeding-history.html', 'evidence']);
    expect(fs.readdirSync(path.join(top, 'evidence')).sort()).toEqual(
      [g1, g2, g3].map((r) => `${r.id}-evidence`).sort(),
    );
    // No key and no lab report went in.
    expect(Object.keys(files).some((n) => /\/key\/|\/lab\/report\//.test(n))).toBe(false);

    // breeding-history.html from disk, network off.
    const h = await openOffline(
      browser,
      path.join(top, 'breeding-history.html'),
      'body[data-history="veilcore-breeding-history/v1"]',
    );
    const hp = h.page;
    await expect(hp.locator('h2')).toHaveText([
      'For a US PVP application (Exhibit A)',
      'For a UPOV-style technical questionnaire (section 4.1)',
      'For a Japanese application (説明書 §4)',
    ]);
    // The name is text, never markup.
    await expect(hp.locator('h1')).toHaveText(`Breeding history (draft): ${g3.strainName}`);
    await expect(hp.locator('b')).toHaveCount(0);
    const us = hp.locator('section[data-office="us-pvp"]');
    await expect(us.locator('.draft')).toHaveText('Draft. Not legal advice.');
    await expect(us.locator('[data-genealogy]')).toHaveText(
      `${g3.strainName} (#3) from [${g2.strainName} (#2) from [${g1.strainName} (#1) from Their stock (linked record ${THEIRS}, held by someone else: their record, not in this history)]] × Pollen donor (named by the breeder, no record)`,
    );
    const row = (id: string) => us.locator(`tr[data-record="${id}"]`);
    await expect(row(g1.id)).toHaveAttribute('data-dated', 'yes');
    await expect(row(g1.id)).toContainText('2026-10-15 11:00 UTC, on Midnight preprod (a test network)');
    await expect(row(g1.id)).toContainText('A test network: practice data, not a real date.');
    await expect(row(g1.id)).toContainText(`verify.html in evidence/${g1.id}-evidence/`);
    await expect(row(g1.id)).toContainText('2024-04-01 (the breeder’s statement)');
    await expect(row(g2.id)).toContainText('F2');
    await expect(row(g2.id)).toContainText('short internodes');
    await expect(row(g3.id)).toHaveAttribute('data-dated', 'no');
    await expect(row(g3.id)).toContainText('Not dated on any network yet.');
    await expect(us.locator('tr[data-outside="theirs"]')).toContainText(THEIRS);
    await expect(us.locator('tr[data-outside="named"]')).toContainText('Pollen donor');
    await expect(us.locator('[data-blank="yes"]')).toHaveCount(5);
    await expect(hp.locator('[data-blank="yes"]', { hasText: 'How you tested for uniformity' })).toHaveCount(3);
    // Printable: the print layout keeps the draft line in the repeating page header.
    await hp.emulateMedia({ media: 'print' });
    await expect(hp.locator('table.page > thead')).toContainText('Draft. Not legal advice.');
    expect((await hp.pdf()).length).toBeGreaterThan(1000);
    expect(h.requests).toEqual([]);
    expectNoErrors(h.errors);
    await h.ctx.close();

    // The cover note, offline.
    const c = await openOffline(
      browser,
      path.join(top, 'COVER-NOTE.html'),
      'body[data-history="veilcore-breeding-history-cover/v1"]',
    );
    await expect(c.page.locator('body')).toContainText('Draft. Not legal advice.');
    await expect(c.page.locator('body')).toContainText('covers hemp only: 0.3% or less delta-9 THC');
    await expect(c.page.locator('body')).toContainText('USPTO plant patent');
    await expect(c.page.locator('body')).toContainText('1 of the 3 records is not dated on any network yet.');
    expect(c.requests).toEqual([]);
    expectNoErrors(c.errors);
    await c.ctx.close();

    // One record's own evidence bundle, unchanged: its verify.html checks it offline.
    const v = await openOffline(
      browser,
      path.join(top, 'evidence', `${g1.id}-evidence`, 'verify.html'),
      'body[data-checked]',
    );
    await expect(v.page.locator('body')).toHaveAttribute('data-checked', 'yes');
    await expect(v.page.getByText('Fingerprint matches', { exact: true })).toBeVisible();
    await expect(v.page.getByText('Proof leads to the batch root', { exact: true })).toBeVisible();
    expect(v.requests).toEqual([]);
    expectNoErrors(v.errors);
    await v.ctx.close();
  });
});
