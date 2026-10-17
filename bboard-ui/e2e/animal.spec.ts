// An animal record, in the browser against the stand-in registry (docs/animal-profile.md):
// choose "An animal" on the first screen, log one with its individual ID, sire and dam, save a
// DNA report to it, date that report, show someone (sire, dam and ID under the holder's
// switches), see the certificate and the check page, and download the evidence bundle and
// open its verify.html from disk with the network off. All records are test data; VeilCore
// tests no DNA.
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
const DNA_FILE = Buffer.from(`Practice DNA report for an animal (test data, not a real genotype) ${Date.now()}\n`);
const ANIMAL = 'veilcore/profile/animal-individual/v1';

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
  const shared = [...(g.has('parent-names') ? ['parents'] : []), ...(g.has('individual-id') ? ['individualId'] : [])];
  const parents = values.parents ?? [];
  return {
    status: 200,
    body: {
      found: true,
      id: r.id,
      subjectKind: 'animal',
      recordFingerprint: r.recordFingerprint,
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
            ...Object.fromEntries(
              parents
                .filter((p) => p.role === 'sire' || p.role === 'dam')
                .map((p) => [String(p.role), { name: p.name, individualId: p.individualId ?? '' }] as const),
            ),
          }
        : {}),
      ...(current && g.has('individual-id')
        ? { individualId: values.individualId ?? '', idScheme: values.idScheme ?? '' }
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
      const batch = await buildBatch([r.recordFingerprint], 'B-20261016-ANML');
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

test('log an animal with its ID, sire and dam; tie a DNA report; date it; show someone; check it offline', async ({
  page,
  browser,
}, info) => {
  const errors = watch(page);
  const held = await standIn(page);
  const name = `Practice Cow ${Date.now()}`;

  // 1. The first screen: a plant by default, an animal one press away.
  await page.goto('/new');
  const choice = page.locator('[data-log-kind]');
  await expect(choice).toHaveAttribute('data-log-kind', 'plant');
  await page.getByRole('button', { name: 'An animal', exact: true }).click();
  await expect(choice).toHaveAttribute('data-log-kind', 'animal');
  await expect(page.getByRole('heading', { name: /Log your animal/ })).toBeVisible();
  await page.getByLabel('Animal’s name').fill(name);
  await page.getByLabel('Individual ID', { exact: true }).fill('0000000017');
  await page.getByLabel(/^ID scheme/).fill('Japan cattle ID (10 digits)');
  await page.getByLabel(/^Species/).fill('Cattle (Bos taurus)');
  await page.getByLabel('Breed', { exact: true }).fill('Japanese Black');
  await page.getByLabel('Sex').click();
  await page.getByRole('option', { name: 'Female' }).click();
  await page.getByLabel(/Date of birth/).fill('2024-03-15');
  await page.getByLabel(/^Breeder or holder/).fill('E2E farm (test data)');
  await page.getByRole('button', { name: /Add sire, dam, herd/ }).click();
  await page.getByLabel('Sire', { exact: true }).fill('Practice Sire');
  await page.getByLabel('Sire’s individual ID').fill('0000000025');
  await page.getByLabel('Dam', { exact: true }).fill('Practice Dam');
  await page.getByLabel('Dam’s individual ID').fill('0000000033');
  await page.getByRole('button', { name: /Next: check it/ }).click();

  // 2. Is this right? What will be sealed, line by line.
  const review = page.locator('[data-animal-review]');
  await expect(review).toContainText('0000000017 (Japan cattle ID (10 digits))');
  await expect(review).toContainText('Cattle (Bos taurus) · Japanese Black');
  await expect(review).toContainText('Sire: Practice Sire (ID 0000000025) · Dam: Practice Dam (ID 0000000033)');
  await page.getByRole('button', { name: /Seal it/ }).click();
  // The network is blocked on purpose: the key's date stamp fails safely and waits.
  await page.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });

  // 3. The DNA report, in an animal's words; saved on the device, never uploaded.
  await expect(page.getByRole('heading', { name: /Save your DNA report to this animal/ })).toBeVisible();
  await expect(page.getByText(/This is what ties your record to the actual animal\./).first()).toBeVisible();
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: 'Practice DNA report.txt', mimeType: 'text/plain', buffer: DNA_FILE });
  await page.getByRole('button', { name: /^Save it to this animal$/ }).click();
  await expect(page.getByRole('heading', { name: /DNA report saved to this animal/ })).toBeVisible();

  // What was saved: the animal profile's record, with the report paired beside it, opened
  // as the holder's browser opens it (the registry has it only sealed).
  const opened = () => openRecordRows(held.records, VAULT);
  await expect.poll(() => opened().find((r) => r.strainName === name)?.dnaFingerprint).toMatch(/^[0-9a-f]{64}$/);
  const rec = opened().find((r) => r.strainName === name)!;
  expect(rec.profile).toBe(ANIMAL);
  expect(rec).toMatchObject({
    refId: '0000000017',
    taxon: 'Cattle (Bos taurus)',
    dateCreated: '2024-03-15',
    animal: { breed: 'Japanese Black', idScheme: 'Japan cattle ID (10 digits)', sex: 'female', herd: '' },
    parents: [
      { role: 'sire', name: 'Practice Sire', individualId: '0000000025' },
      { role: 'dam', name: 'Practice Dam', individualId: '0000000033' },
    ],
  });
  expect(rec.keyBinding).toMatch(/^[0-9a-f]{64}$/);
  expect(rec.dnaFingerprint).toMatch(/^[0-9a-f]{64}$/);
  // The report itself never left the device: not in the clear, not inside the seal.
  expect(JSON.stringify(held.records)).not.toContain('Practice DNA report for an animal');
  expect(JSON.stringify(opened())).not.toContain('Practice DNA report for an animal');

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

  // 4. The animal's page: tied to the animal, its fields labelled as an animal's.
  await page.goto(`/record/${rec.id}`);
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await expect(page.getByText('Breeder or holder: E2E farm (test data)')).toBeVisible();
  const row = page.locator('[data-status-row="DNA report"]');
  await expect(row).toHaveAttribute('data-mark', 'done');
  await expect(row).toContainText('Tied to the animal');
  await expect(row).toContainText('A lab can compare a new test of the animal with it.');
  // No agreements for an animal yet, said so; no next generation.
  await expect(page.getByText('License it')).toHaveCount(0);
  await expect(page.locator('[data-no-licensing]')).toHaveText(
    'Agreements and royalties aren’t available for animal records yet.',
  );
  await expect(page.getByText('Add the next generation or selection')).toHaveCount(0);
  await page.getByRole('button', { name: 'Technical details' }).click();
  const details = page.locator('#record-technical-details');
  await expect(details).toContainText('Individual ID');
  await expect(details).toContainText('0000000017 (Japan cattle ID (10 digits))');
  await expect(details).toContainText('Practice Sire (ID 0000000025)');
  await expect(details).toContainText('Practice Dam (ID 0000000033)');
  await expect(details).toContainText('Female');

  // 5. Date the DNA report: one record of its own, holding only the report's SHA-256.
  const next = page.locator('[data-next-step]');
  await next.getByRole('button', { name: 'Date this DNA report' }).click();
  await expect.poll(() => opened().filter((r) => r.breedingMethod === 'Lab report').length).toBe(1);
  await expect(row).toContainText('Report being dated (waiting for a batch).');

  // 6. The family tree: sire and dam by role.
  await page.getByText('Family tree', { exact: true }).click();
  const pedigree = page.locator('[data-pedigree]');
  await expect(pedigree.locator('[data-parent-role="sire"]')).toContainText('Practice Sire (ID 0000000025)');
  await expect(pedigree.locator('[data-parent-role="dam"]')).toContainText('Practice Dam (ID 0000000033)');
  await page.getByRole('button', { name: 'Back to the animal' }).last().click();

  // 7. Show someone: an animal's choices (its ID, not a breeding method), saved as the grant.
  await page.getByRole('button', { name: /Show someone/ }).click();
  await expect(page.getByText('Breeding method', { exact: true })).toHaveCount(0);
  await page.getByLabel('Sire and dam (names and IDs)').check();
  await page.getByLabel('Individual ID and its scheme').check();
  // The DNA report is off until the holder switches it on (round 3, P7).
  const dnaSwitch = page.getByRole('switch', { name: 'Whether a DNA report is saved' });
  await expect(dnaSwitch).not.toBeChecked();
  await expect(page.locator('[data-dna-tie="self"]')).toHaveCount(0);
  await dnaSwitch.check();
  await expect(page.getByText('Sire, as the holder states it: Practice Sire (ID 0000000025)').first()).toBeVisible();
  await expect(
    page.getByText('Individual ID, as the holder states it: 0000000017 (Japan cattle ID (10 digits))').first(),
  ).toBeVisible();
  await expect(page.locator('[data-dna-tie="self"]').first()).toContainText(
    'Tied to the animal: DNA report the holder saved (no lab signature matches it).',
  );
  await page.getByRole('button', { name: 'Get the link' }).click();
  // The name goes in the link, after the # (round 5), only when the holder switches it on
  // for this link (persona review, 17 Oct): off to start with.
  await expect(page.locator('[data-name-in-link]')).toHaveAttribute('data-name-in-link', 'no');
  expect(await page.getByLabel('The link', { exact: true }).inputValue()).not.toMatch(/[#&]n=/);
  await page.getByRole('switch', { name: 'Put the name in the link' }).check();
  await expect(page.locator('[data-name-in-link]')).toHaveAttribute('data-name-in-link', 'yes');
  const shareLink = await page.getByLabel('The link', { exact: true }).inputValue();
  expect(shareLink).toMatch(/#(.*&)?n=[A-Za-z0-9_-]+/);
  expect(shareLink.split('#')[0]).not.toContain(Buffer.from(name, 'utf8').toString('base64url'));
  await expect.poll(() => held.grants[rec.id]).toEqual(expect.arrayContaining(['parent-names', 'individual-id']));
  // Published with the grant, for this version of the record: the values the check page
  // shows, and nothing that links to another record.
  await expect.poll(() => held.grantValues[rec.id]?.forFingerprint).toBe(rec.recordFingerprint);
  expect(JSON.stringify(held.grantValues[rec.id].values)).not.toContain('recordId');
  await page.getByRole('button', { name: 'Back to the animal' }).first().click();

  // 8. The certificate (in English, like every certificate): the animal's own fields.
  await page.getByText('Certificate', { exact: true }).click();
  const cert = page.locator('[data-certificate]');
  await expect(cert).toContainText('Individual ID');
  await expect(cert).toContainText('0000000017 (Japan cattle ID (10 digits))');
  await expect(cert).toContainText('Sire');
  await expect(cert).not.toContainText('Active licenses');
  await expect(cert.locator('[data-dna-tie="self"]')).toContainText('Tied to the animal: DNA report you saved');
  await page.getByRole('button', { name: /Back/ }).first().click();

  // 9. The check page a stranger opens: labelled as an animal, with what the holder shared.
  // In a browser of its own: a stranger has none of the holder's records or settings.
  const strangerCtx = await browser.newContext({ baseURL: new URL(page.url()).origin });
  const check = await strangerCtx.newPage();
  const checkErrors = watch(check);
  await standInFor(check, held);
  // The holder's link: the name comes from it, after the #; the registry doesn't have it.
  await check.goto(new URL(shareLink).pathname + new URL(shareLink).search + new URL(shareLink).hash);
  await expect(check.locator('[data-holder-name]')).toContainText(`Animal’s name, as the holder typed it: ${name}`);
  await expect(check.locator('[data-holder-name]')).toHaveAttribute('data-name-from', 'link');
  await expect(check.getByText('Sire, as the holder states it: Practice Sire (ID 0000000025)')).toBeVisible();
  await expect(check.getByText('Dam, as the holder states it: Practice Dam (ID 0000000033)')).toBeVisible();
  await expect(
    check.getByText('Individual ID, as the holder states it: 0000000017 (Japan cattle ID (10 digits))'),
  ).toBeVisible();
  expectNoErrors(checkErrors);
  await strangerCtx.close();

  // 10. The evidence bundle: download it, open verify.html from disk with the network off.
  await page.goto(`/record/${rec.id}`);
  await page.getByRole('button', { name: 'Download evidence bundle' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Download evidence bundle' });
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: /^Download$/ }).click();
  await expect(dialog.getByText(/^Downloaded .+\.zip\./)).toBeVisible();
  const zip = fs.readFileSync(await (await download).path());
  const dir = info.outputPath('animal-bundle');
  for (const [file, bytes] of Object.entries(unzipSync(new Uint8Array(zip)))) {
    const out = path.join(dir, file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, bytes);
  }
  const top = path.join(dir, fs.readdirSync(dir)[0]);
  const readme = fs.readFileSync(path.join(top, 'README.txt'), 'utf8').replace(/\s+/g, ' ');
  expect(readme).toContain('TIED TO THE ANIMAL');
  const sealed = JSON.parse(fs.readFileSync(path.join(top, 'record/sealed-fields.json'), 'utf8')) as Record<
    string,
    unknown
  >;
  expect(sealed).toMatchObject({ profile: ANIMAL, individualId: '0000000017', name });

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
  await expect(v.getByText('The files agree with each other', { exact: true })).toBeVisible();
  await expect(v.getByText('Proof code matches', { exact: true })).toBeVisible();
  const table = v.locator('table[data-sealed="matches"]');
  await expect(table.locator('tr', { hasText: 'Individual ID' })).toContainText('0000000017');
  await expect(table.locator('tr', { hasText: 'Parents' })).toContainText(
    'Sire: Practice Sire (ID 0000000025); Dam: Practice Dam (ID 0000000033)',
  );
  await expect(v.getByText('Who holds the animal or the record now.')).toBeVisible();
  expect(requests.filter((u) => !u.startsWith('file:'))).toEqual([]);
  expectNoErrors(vErrors);
  await ctx.close();

  // The choice is remembered: the next new record starts as an animal.
  await page.goto('/new');
  await expect(page.locator('[data-log-kind]')).toHaveAttribute('data-log-kind', 'animal');
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
