// A strain or line record, in the browser against the stand-in registry (docs/strain-profile.md):
// choose "A strain or line" on the first screen, log a yeast strain with its designation,
// deposit numbers, method, generation and a parent strain, save a DNA report to it, see its
// page (no licensing yet, no next stage), the certificate and the check page, and download the
// evidence bundle and open its verify.html from disk with the network off. All records are test
// data; VeilCore tests no DNA.
// SPDX-License-Identifier: Apache-2.0
import { randomBytes } from 'node:crypto';
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
  openRecordRows,
  plainRowRefusal,
  watch,
} from './helpers';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

type Rec = Record<string, unknown> & { id: string; recordFingerprint: string; strainName: string; profile?: string };

const HOLDER = randomBytes(32).toString('hex');
/** The holder's vault key: the stand-in keeps records sealed, as the registry does; the test opens them with it. */
const VAULT = newVaultKey();
const DNA_FILE = Buffer.from(`Practice DNA report for a strain (test data, not a real genome) ${Date.now()}\n`);
const STRAIN = 'veilcore/profile/strain/v1';

/** What the holder published for a record (PUT /api/records/:id/disclosure), as the registry keeps it. */
type GrantValues = {
  forFingerprint: string | null;
  values: {
    parents?: { name: string; role?: string; individualId?: string }[];
    individualId?: string;
    idScheme?: string;
  };
};
type Held = { records: Rec[]; grants: Record<string, string[]>; grantValues: Record<string, GrantValues> };

const idOf = (url: URL) => /\/(VEIL-[0-9A-F]+)/.exec(url.pathname)?.[1] ?? '';

/**
 * The check page: what the registry answers a stranger under the holder's grant (the
 * registry's /verify; its own tests check the answer itself). The registry can't read a
 * sealed record, so a shared value comes only from what the holder's browser sent with the
 * grant, and only while that was sent for the record's current fingerprint (CONTRACT.md #7).
 */
const verifyAnswer = (held: Held, id: string) => {
  const r = held.records.find((x) => x.id === id);
  if (!r) return { status: 404, body: { found: false } };
  const g = new Set(held.grants[r.id] ?? []);
  const sent = held.grantValues[r.id];
  const current = !!sent && sent.forFingerprint === r.recordFingerprint;
  const values = current ? sent.values : {};
  const shared = g.has('parent-names') ? ['parents'] : [];
  const parents = values.parents ?? [];
  return {
    status: 200,
    body: {
      found: true,
      id: r.id,
      subjectKind: 'strain',
      recordFingerprint: r.recordFingerprint,
      // The name's salted code (round 6, CONTRACT.md #33), as the registry serves it.
      ...(typeof r.nameCode === 'string' ? { nameCode: r.nameCode } : {}),
      registryFirstSeen: new Date().toISOString(),
      supersededBy: null,
      supersedes: null,
      keyBound: true,
      signedAttestation: false,
      attestedByVettedLab: false,
      attested: false,
      anchored: false,
      disclosed: shared,
      ...(current && g.has('parent-names')
        ? {
            parents: parents.map((p) => p.name).filter(Boolean),
            // A strain's parent strains by name and deposit number (the registry's parentStrains).
            parentStrains: parents.slice(0, 2).map((p) => ({ name: p.name, deposit: p.individualId ?? '' })),
          }
        : {}),
      ...(!current && shared.length ? { staleGrant: shared } : {}),
    },
  };
};

/** The registry, as far as these screens need it: the holder's set (sealed), grants, and an evidence answer. */
const standIn = async (page: Page) => {
  const held: Held = { records: [], grants: {}, grantValues: {} };
  await page.addInitScript((holder) => {
    localStorage.setItem('veilcore.holder.v1', holder);
    localStorage.setItem('veilcore.role.v1', 'breeder');
  }, HOLDER);
  await holdVaultKey(page, VAULT);
  const grantOf = (id: string) => ({
    recordId: id,
    show: held.grants[id] ?? [],
    forFingerprint: held.grantValues[id]?.forFingerprint ?? null,
    values: held.grantValues[id]?.values ?? null,
    updatedAt: held.grants[id] ? new Date().toISOString() : null,
  });
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
    'GET /api/records/:record/disclosure': (route, url) => json(route, 200, grantOf(idOf(url))),
    'PUT /api/records/:record/disclosure': (route, url, body) => {
      const b = body as { show: string[]; forFingerprint?: string | null; values?: GrantValues['values'] };
      held.grants[idOf(url)] = b.show;
      held.grantValues[idOf(url)] = { forFingerprint: b.forFingerprint ?? null, values: b.values ?? {} };
      return json(route, 200, grantOf(idOf(url)));
    },
    'GET /verify/:record': (route, url) => {
      const a = verifyAnswer(held, idOf(url));
      return json(route, a.status, a.body);
    },
    'GET /records/:record/evidence': async (route, url) => {
      const r = held.records.find((x) => x.id === idOf(url));
      if (!r) return json(route, 404, { error: 'no such record for this holder key' });
      const batch = await buildBatch([r.recordFingerprint], 'B-20261022-STRN');
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

test('log a strain with its designation, deposits and parent; tie a DNA report; check it offline', async ({
  page,
  browser,
}, info) => {
  const errors = watch(page);
  const held = await standIn(page);
  const name = `Practice Yeast ${Date.now()}`;

  // 1. The first screen: a plant by default, a strain or line one press away.
  await page.goto('/new');
  const choice = page.locator('[data-log-kind]');
  await expect(choice).toHaveAttribute('data-log-kind', 'plant');
  await page.getByRole('button', { name: 'A strain or line', exact: true }).click();
  await expect(choice).toHaveAttribute('data-log-kind', 'strain');
  await expect(page.getByRole('heading', { name: /Your strain or line/ })).toBeVisible();
  // Not ready until it has a name or designation, the species and who made it.
  await expect(page.getByText(/A name or a designation, the species, and who made or isolated it/)).toBeVisible();
  await page.getByLabel('Strain name').fill(name);
  await page.getByLabel('Your designation').fill('PY-E2E-1');
  await page.getByLabel('What kind').click();
  await page.getByRole('option', { name: 'Yeast', exact: true }).click();
  await page.getByLabel(/^Species/).fill('Saccharomyces cerevisiae');
  await page.getByLabel(/^Made or isolated by/).fill('E2E lab (test data)');
  await page.getByLabel('Deposit numbers (optional)').fill('TEST 0002\nTEST 0003');
  await page.getByRole('button', { name: /Add how it was made, parents/ }).click();
  await page.getByLabel('How it was made').fill('Neutron beam irradiation');
  await page.getByLabel('Generation or passage (optional)').fill('M2');
  await page.getByLabel(/Made or isolated on/).fill('2026-03-01');
  await page.getByLabel('Parent strain', { exact: true }).fill('Practice parent');
  await page.getByLabel('Its deposit number').first().fill('TEST 0001');
  await page.getByRole('button', { name: /Next: check it/ }).click();

  // 2. Is this right? What will be sealed, line by line.
  const review = page.locator('[data-strain-review]');
  await expect(review).toContainText('Yeast · Saccharomyces cerevisiae');
  await expect(review).toContainText('TEST 0002 · TEST 0003');
  await expect(review).toContainText(
    'Made by: Neutron beam irradiation · Generation: M2 · Parents: Practice parent (TEST 0001)',
  );
  await page.getByRole('button', { name: /Seal it/ }).click();
  // The network is blocked on purpose: the key's date stamp fails safely and waits.
  await page.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });

  // 3. The DNA report, in a strain's words; saved on the device, never uploaded.
  await expect(page.getByRole('heading', { name: /Save your DNA report to this strain/ })).toBeVisible();
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: 'Practice DNA report.txt', mimeType: 'text/plain', buffer: DNA_FILE });
  await page.getByRole('button', { name: /^Save it to this strain$/ }).click();
  await expect(page.getByRole('heading', { name: /DNA report saved to this strain/ })).toBeVisible();

  const opened = () => openRecordRows(held.records, VAULT);
  await expect.poll(() => opened().find((r) => r.strainName === name)?.dnaFingerprint).toMatch(/^[0-9a-f]{64}$/);
  const rec = opened().find((r) => r.strainName === name)!;
  expect(rec.profile).toBe(STRAIN);
  expect(rec).toMatchObject({
    refId: 'PY-E2E-1',
    taxon: 'Saccharomyces cerevisiae',
    bredBy: 'E2E lab (test data)',
    dateCreated: '2026-03-01',
    breedingMethod: 'Neutron beam irradiation',
    strain: { group: 'yeast', deposits: ['TEST 0002', 'TEST 0003'], generation: 'M2' },
    parents: [{ name: 'Practice parent', individualId: 'TEST 0001' }],
  });
  expect(JSON.stringify(held.records)).not.toContain('Practice DNA report for a strain');

  // The backup and the key's date stamp are the steps before; here they are taken as done.
  await page.evaluate((id) => {
    const all = JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as Record<string, object>;
    all[id] = {
      ...all[id],
      backedUpAt: Date.now(),
      anchor: {
        identity: '11'.repeat(32),
        network: 'preview',
        contractAddress: '0'.repeat(64),
        txId: 'tx-practice',
        txHash: '22'.repeat(32),
        blockHeight: 1,
      },
    };
    localStorage.setItem('veilcore.record-keys.v1', JSON.stringify(all));
    localStorage.removeItem('veilcore.log-draft.v1');
  }, rec.id);

  // 4. The strain's page: tied to the strain, its own fields; no licensing yet, no next stage.
  await page.goto(`/record/${rec.id}`);
  await expect(page.getByRole('heading', { name })).toBeVisible();
  const row = page.locator('[data-status-row="DNA report"]');
  await expect(row).toHaveAttribute('data-mark', 'done');
  await expect(row).toContainText('Tied to the strain');
  await expect(page.getByText('License it')).toHaveCount(0);
  await expect(page.locator('[data-no-licensing]')).toContainText(
    'Agreements and royalties aren’t available for strain records yet',
  );
  await expect(page.getByText('Add the next generation or selection')).toHaveCount(0);
  await page.getByRole('button', { name: 'Technical details' }).click();
  const details = page.locator('#record-technical-details');
  await expect(details).toContainText('Yeast · Saccharomyces cerevisiae');
  await expect(details).toContainText('TEST 0002 · TEST 0003');
  await expect(details).toContainText('PY-E2E-1');
  await expect(details).toContainText('Practice parent (TEST 0001)');
  await expect(details).toContainText('M2');

  // 5. The certificate (in English): the strain's own fields, no agreements line.
  await page.getByText('Certificate', { exact: true }).click();
  const cert = page.locator('[data-certificate]');
  await expect(cert).toContainText('Strain or line');
  await expect(cert).toContainText('TEST 0002 · TEST 0003');
  await expect(cert).toContainText('Practice parent (TEST 0001)');
  await expect(cert).not.toContainText('Cultivar');
  await expect(cert).not.toContainText('Agreements marked active');
  await expect(cert.locator('[data-dna-tie="self"]')).toContainText('Tied to the strain: DNA report you saved');
  await page.getByRole('button', { name: /Back/ }).first().click();

  // 6. Show someone: the parent strains with their deposit numbers, saved as the grant; then
  // the check page a stranger opens, in a strain's words.
  await page.getByRole('button', { name: /Show someone/ }).click();
  await expect(page.getByText('Breeding method', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Individual ID and its scheme')).toHaveCount(0);
  await page.getByLabel('Parent strains (names and deposit numbers)').check();
  await expect(
    page.getByText('Parent strains, as the holder states them: Practice parent (TEST 0001)').first(),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Get the link' }).click();
  const shareLink = await page.getByLabel('The link', { exact: true }).inputValue();
  await expect.poll(() => held.grants[rec.id]).toEqual(expect.arrayContaining(['parent-names']));
  await expect.poll(() => held.grantValues[rec.id]?.forFingerprint).toBe(rec.recordFingerprint);
  expect(JSON.stringify(held.grantValues[rec.id].values)).not.toContain('recordId');
  await page.getByRole('button', { name: 'Back to the strain' }).first().click();

  const strangerCtx = await browser.newContext({ baseURL: new URL(page.url()).origin });
  const check = await strangerCtx.newPage();
  const checkErrors = watch(check);
  await standInFor(check, held);
  await check.goto(new URL(shareLink).pathname + new URL(shareLink).search + new URL(shareLink).hash);
  await expect(check.getByText('Parent strains, as the holder states them: Practice parent (TEST 0001)')).toBeVisible();
  // What wasn't shared is named in a strain's words: no cultivar, no breeding, no "bred by".
  const body = await check.locator('body').innerText();
  expect(body).toContain('How it was made');
  expect(body).toContain('Made or isolated by');
  expect(body).not.toMatch(/cultivar|Breeding method|Bred by|\bplant\b/i);
  expectNoErrors(checkErrors);
  await strangerCtx.close();

  // 7. The evidence bundle: download it, open verify.html from disk with the network off.
  await page.goto(`/record/${rec.id}`);
  await page.getByRole('button', { name: 'Download evidence bundle' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Download evidence bundle' });
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: /^Download$/ }).click();
  await expect(dialog.getByText(/^Downloaded .+\.zip\./)).toBeVisible();
  const zip = fs.readFileSync(await (await download).path());
  const dir = info.outputPath('strain-bundle');
  for (const [file, bytes] of Object.entries(unzipSync(new Uint8Array(zip)))) {
    const out = path.join(dir, file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, bytes);
  }
  const top = path.join(dir, fs.readdirSync(dir)[0]);
  const readme = fs.readFileSync(path.join(top, 'README.txt'), 'utf8').replace(/\s+/g, ' ');
  expect(readme).toContain('TIED TO THE STRAIN');
  const sealed = JSON.parse(fs.readFileSync(path.join(top, 'record/sealed-fields.json'), 'utf8')) as Record<
    string,
    unknown
  >;
  expect(sealed).toMatchObject({ profile: STRAIN, designation: 'PY-E2E-1', group: 'yeast', name });

  const ctx = await browser.newContext({ offline: true, viewport: { width: 360, height: 800 } });
  const requests: string[] = [];
  await ctx.route('**/*', (route) =>
    route.request().url().startsWith('file:')
      ? route.continue()
      : (requests.push(route.request().url()), route.abort()),
  );
  const v = await ctx.newPage();
  const vErrors = watch(v);
  await v.goto(`file://${path.join(top, 'verify.html')}`);
  await expect(v.locator('body')).toHaveAttribute('data-checked', 'yes', { timeout: 20_000 });
  await expect(v.getByText('Proof code matches', { exact: true })).toBeVisible();
  const table = v.locator('table[data-sealed="matches"]');
  await expect(table.locator('tr', { hasText: 'Deposit numbers' })).toContainText('TEST 0002; TEST 0003');
  await expect(table.locator('tr', { hasText: 'Generation or passage' })).toContainText('M2');
  await expect(table.locator('tr', { hasText: 'Parents' })).toContainText('Practice parent (deposit TEST 0001)');
  await expect(v.getByText('Who holds the strain or the record now.')).toBeVisible();
  expect(requests.filter((u) => !u.startsWith('file:'))).toEqual([]);
  expectNoErrors(vErrors);
  await ctx.close();

  // The choice is remembered: the next new record starts as a strain.
  await page.goto('/new');
  await expect(page.locator('[data-log-kind]')).toHaveAttribute('data-log-kind', 'strain');
  expectNoErrors(errors);
});

/** A second page (the stranger's) on the same stand-in registry: only /verify answers. */
const standInFor = async (page: Page, held: Held) => {
  await isolate(page, {
    'GET /verify/:record': (route, url) => {
      const a = verifyAnswer(held, idOf(url));
      return json(route, a.status, a.body);
    },
  });
};
