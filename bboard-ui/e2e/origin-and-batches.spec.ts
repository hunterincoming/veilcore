// Where it came from, and real batches, in the browser against the stand-in registry:
//   - a landrace logged with no breeder: "Breeder, if known" with no placeholder, the "Where it
//     came from" step, the review, and the record sealed with the origin in its notes;
//   - clones cut from it with a lot name and a plant tag each;
//   - every check page says a date is not who bred it or where it came from; the terms say not to
//     register other people's traditional varieties;
//   - a genebank passport sheet (MCPD) maps its columns by name in the import;
//   - a litter by a sire not on VeilCore, with his semen code, each calf's sex, ID and birth date
//     set before Save, then one calf's sex and ID corrected as a new record.
// NEW_SHOTS=<dir> saves the new screens at 360px, a small phone.
// SPDX-License-Identifier: Apache-2.0
import { randomBytes } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import {
  REAL_REGISTRY,
  expectNoErrors,
  holdVaultKey,
  isolate,
  json,
  newVaultKey,
  openRecordRows,
  plainRowRefusal,
  saveAndCheckBackup,
  startPlant,
  watch,
} from './helpers';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

type Rec = Record<string, unknown> & { id: string };

const shot = async (page: Page, name: string, full = false) => {
  const dir = process.env.NEW_SHOTS;
  if (!dir) return;
  const size = page.viewportSize();
  await page.setViewportSize({ width: 360, height: 740 });
  await page.screenshot({ path: `${dir}/${name}-360.png`, fullPage: full });
  if (size) await page.setViewportSize(size);
};

const standIn = async (page: Page, held: { records: Rec[] } = { records: [] }) => {
  const holder = randomBytes(32).toString('hex');
  const vault = newVaultKey();
  await page.addInitScript((h) => {
    localStorage.setItem('veilcore.holder.v1', h);
    localStorage.setItem('veilcore.role.v1', 'breeder');
  }, holder);
  await holdVaultKey(page, vault);
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
  return { held, vault };
};

const DATED_NOT_ORIGIN = 'A date shows who held this record first, not who bred it or where it came from.';

test('a landrace with no breeder and where it came from, then clones with a lot and a tag each', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watch(page);
  const { held, vault } = await standIn(page);
  const name = 'Oaxacan Bolita';

  await page.goto('/new');
  await startPlant(page);
  await page.getByLabel(/Plant or line name/).fill(name);
  // The holder's own breeding asks for a breeder, with no "your name" placeholder.
  const bredBy = page.locator('[data-bred-by]');
  await expect(bredBy).toHaveAttribute('data-bred-by', 'required');
  await expect(bredBy).not.toHaveAttribute('placeholder', /.+/);
  await expect(page.getByText('Add a name and who bred it.')).toBeVisible();
  await expect(page.getByText('A name and who bred it are all you need.')).toHaveCount(0);
  // A landrace: the breeder becomes "if known", optional.
  await page.getByRole('radio', { name: 'A landrace or heirloom kept by a community' }).check();
  await expect(bredBy).toHaveAttribute('data-bred-by', 'optional');
  await expect(page.getByLabel(/Breeder, if known/)).toHaveValue('');
  await expect(page.getByText('Leave it empty unless you know who bred it. Not you, unless you bred it.')).toBeVisible();
  await shot(page, 'origin-1-plant-landrace', true);
  await page.getByRole('button', { name: /Next: check it/ }).click();

  // "Where it came from": optional, every field.
  const step = page.locator('[data-origin-step]');
  await expect(step).toBeVisible();
  await expect(page.locator('[data-screen-heading]')).toContainText('Where it came from');
  await step.getByLabel('Where it came from').fill('Sierra Mazateca, from a community seed fair');
  await step.getByLabel('Collection or community name').fill('Banco Comunitario de Semillas');
  await step.getByLabel('Country of origin').fill('MEX');
  await step.getByLabel('Date you received it').fill('2019-03-04');
  await step.getByLabel('SMTA number').fill('SMTA-00AB12');
  await step.getByLabel('GLIS DOI or other permanent ID').fill('10.18730/E2E01');
  await shot(page, 'origin-2-where-it-came-from', true);
  await step.getByRole('button', { name: /Next: check it/ }).click();

  // The review: the breeder not stated, and the origin, each with a way back.
  await expect(page.getByText('Is this right?')).toBeVisible();
  await expect(page.getByText('Not stated')).toBeVisible();
  const review = page.locator('[data-origin-review]');
  await expect(review).toContainText('From: Sierra Mazateca, from a community seed fair');
  await expect(review).toContainText('Country of origin: MEX');
  await expect(review).toContainText('SMTA: SMTA-00AB12');
  await shot(page, 'origin-3-review', true);
  await review.getByRole('button', { name: 'Change' }).click();
  await expect(step).toBeVisible();
  await step.getByRole('button', { name: /Next: check it/ }).click();

  await page.getByRole('button', { name: /Seal it/ }).click();
  await page.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
  await page.getByRole('button', { name: /No report yet: skip/ }).click();
  await saveAndCheckBackup(page);
  await page.getByRole('button', { name: /Finish/ }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await expect(page.getByText('Breeder not stated')).toBeVisible();
  await expect.poll(() => held.records.length, { timeout: 30_000 }).toBe(1);
  const [plant] = openRecordRows(held.records, vault);
  expect(plant.bredBy).toBe('');
  expect(plant.breedingMethod).toBe('Landrace / heirloom');
  expect(plant.notes).toBe(
    [
      'Where it came from: Sierra Mazateca, from a community seed fair',
      'Collection or community: Banco Comunitario de Semillas',
      'Country of origin: MEX',
      'Received on: 2019-03-04',
      'SMTA: SMTA-00AB12',
      'DOI or PUID: 10.18730/E2E01',
    ].join('\n'),
  );

  // Clones of it: no breeder needed either, a lot named, a plant tag each, numbered on.
  await page.getByText('Cut clones from this').click();
  await expect(page.locator('[data-batch-review="clones"]')).toBeVisible();
  await page.getByLabel(/How many clones/).fill('3');
  await expect(page.getByLabel(/Breeder, if known/)).toHaveValue('');
  await page.getByLabel('Lot name').fill('Bolita cut 7 Nov');
  await expect(page.locator('[data-batch-lot-count="3"]')).toHaveText('3 clones in this lot');
  await page.getByLabel('First plant tag').fill('1A4000300012345000099');
  await expect(page.locator('[data-clone-tag="1"]')).toHaveValue('1A4000300012345000100');
  await expect(page.locator('[data-clone-tag="2"]')).toHaveValue('1A4000300012345000101');
  await page.locator('[data-clone-tag="2"]').fill('1A4000300012345000099');
  await expect(page.locator('[data-batch-dup]')).toContainText('Two clones have the same tag: 1A4000300012345000099.');
  await page.locator('[data-clone-tag="2"]').fill('1A4000300012345000200');
  await expect(page.locator('[data-batch-dup]')).toHaveCount(0);
  await page.locator('[data-batch-lot]').scrollIntoViewIfNeeded();
  await shot(page, 'batch-1-clones-lot-tags', true);
  await page.getByRole('button', { name: /Next: save your backup/ }).click();
  await saveAndCheckBackup(page);
  await page.getByRole('button', { name: 'Save 3 records' }).click();
  await expect(page.locator('[data-batch-saved="3"]')).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => held.records.length, { timeout: 30_000 }).toBe(4);
  const clones = openRecordRows(held.records, vault).filter((r) => r.id !== plant.id);
  expect(clones.map((r) => r.refId).sort()).toEqual([
    '1A4000300012345000099',
    '1A4000300012345000100',
    '1A4000300012345000200',
  ]);
  for (const r of clones) {
    expect(r.notes).toBe('Lot: Bolita cut 7 Nov\nLot size: 3');
    expect(r.bredBy).toBe('');
    expect(r.parents).toEqual([{ recordId: plant.id, name }]);
  }
  // Sealed: the registry's copy holds neither the name nor where it came from in the clear.
  for (const r of held.records) {
    expect(JSON.stringify(r)).not.toContain(name);
    expect(JSON.stringify(r)).not.toContain('Mazateca');
  }
  expectNoErrors(errors);
});

test('every check page says a date is not who bred it; the terms say not to register others’ varieties', async ({
  page,
}) => {
  await isolate(page);
  await page.goto('/verify/VEIL-00000000000000000000000000000E2E');
  await expect(page.locator('[data-dated-not-origin]')).toHaveText(DATED_NOT_ORIGIN);
  await page.goto('/verify/example');
  await expect(page.locator('[data-dated-not-origin]')).toHaveText(DATED_NOT_ORIGIN);
  await shot(page, 'origin-4-check-page-line');
  await page.goto('/check-claim');
  await expect(page.locator('[data-dated-not-origin]')).toHaveText(DATED_NOT_ORIGIN);
  // In the visitor's language.
  await page.goto('/verify/example?lang=ja');
  await expect(page.locator('[data-dated-not-origin]')).toContainText('誰が育成したかや、どこから来たかではありません');
  await page.goto('/terms');
  await expect(
    page.getByText('Don’t register other people’s traditional varieties, landraces or breeds as your own breeding.', {
      exact: false,
    }),
  ).toBeVisible();
});

test('a genebank passport sheet (MCPD) maps its columns by name', async ({ page }) => {
  await standIn(page);
  await page.goto('/records/import');
  const csv = [
    'INSTCODE,ACCENUMB,ACCENAME,GENUS,SPECIES,SAMPSTAT,COLLSRC,ORIGCTY,ACQDATE,PUID',
    'MEX001,E2E-1,Bolita,Zea,mays,300,20,MEX,20190304,10.18730/E2E01',
    'MEX001,E2E-2,Olotillo,Zea,mays,300,26,MEX,1968----,10.18730/E2E02',
  ].join('\n');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'passport.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  });
  await page.getByRole('button', { name: 'Next: which column is which' }).click();
  const passport = page.locator('[data-passport-columns]');
  await expect(passport).toHaveAttribute('data-passport-columns', 'open');
  for (const [field, header] of [
    ['strainName', 'ACCENAME'],
    ['refId', 'ACCENUMB'],
    ['taxon', 'SPECIES'],
    ['genus', 'GENUS'],
    ['sampStat', 'SAMPSTAT'],
    ['collSrc', 'COLLSRC'],
    ['origCty', 'ORIGCTY'],
    ['acqDate', 'ACQDATE'],
    ['puid', 'PUID'],
  ])
    await expect(page.locator(`[data-plant-column="${field}"]`), field).toContainText(header);
  await passport.scrollIntoViewIfNeeded();
  await shot(page, 'import-1-passport-columns', true);
});

test('a litter by a sire not on VeilCore: each calf’s sex, ID and birth date, then a correction', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const errors = watch(page);
  const { held, vault } = await standIn(page);
  await page.goto('/new#draft=kind=animal&preset=offspring&count=2');
  await expect(page.locator('[data-batch-review="offspring"]')).toBeVisible();

  // The sire: typed in, with his semen code.
  await page.getByRole('combobox', { name: 'Sire' }).click();
  await page.getByRole('option', { name: 'Not on VeilCore: type the sire' }).click();
  const typed = page.locator('[data-sire-typed]');
  await typed.getByLabel('Sire’s name').fill('Stud Bull (test data)');
  await typed.getByLabel('Sire’s ID or registration number').fill('USA840003123456789');
  await typed.getByLabel('Semen code (optional)').fill('7HO12345');
  await page.getByLabel(/Breeder or holder/).fill('North Farm (test data)');
  await page.getByLabel(/^Species/).fill('Cattle (Bos taurus)');
  await page.getByLabel(/^Name/).fill('Stud calf');

  // Each calf: an ID needs its scheme; two calves can't share one.
  const calf = (i: number) => page.locator(`[data-batch-child="${i}"]`);
  await expect(calf(0)).toContainText('Stud calf 1');
  await calf(0).getByLabel('ID: ear tag, microchip or registration').fill('UK123456700010');
  await expect(page.getByRole('button', { name: /Next: save your backup/ })).toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('combobox', { name: /ID scheme/ }).fill('Ear tag');
  await calf(1).getByLabel('ID: ear tag, microchip or registration').fill('UK123456700010');
  await expect(page.locator('[data-batch-dup]')).toContainText('Two young animals have the same ID: UK123456700010.');
  await calf(1).getByLabel('ID: ear tag, microchip or registration').fill('UK123456700011');
  await calf(0).getByRole('combobox', { name: 'Sex' }).click();
  await page.getByRole('option', { name: 'Female' }).click();
  await calf(1).getByRole('combobox', { name: 'Sex' }).click();
  await page.getByRole('option', { name: 'Male', exact: true }).click();
  await calf(1).getByLabel('Born').fill('2026-11-02');
  await page.locator('[data-sire-typed]').scrollIntoViewIfNeeded();
  await shot(page, 'batch-2-offspring-typed-sire');
  await calf(0).scrollIntoViewIfNeeded();
  await shot(page, 'batch-3-offspring-each-calf', true);

  await page.getByRole('button', { name: /Next: save your backup/ }).click();
  await saveAndCheckBackup(page);
  await page.getByRole('button', { name: 'Save 2 records' }).click();
  await expect(page.locator('[data-batch-saved="2"]')).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => held.records.length, { timeout: 30_000 }).toBe(2);
  const calves = openRecordRows(held.records, vault).sort((a, b) =>
    String(a.strainName).localeCompare(String(b.strainName)),
  );
  expect(calves.map((r) => [r.strainName, r.refId, (r.animal as { sex: string }).sex, r.dateCreated])).toEqual([
    ['Stud calf 1', 'UK123456700010', 'female', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)],
    ['Stud calf 2', 'UK123456700011', 'male', '2026-11-02'],
  ]);
  for (const r of calves) {
    expect(r.profile).toBe('veilcore/profile/animal-individual/v1');
    expect((r.animal as { idScheme: string }).idScheme).toBe('Ear tag');
    expect(r.parents).toEqual([{ role: 'sire', name: 'Stud Bull (test data)', individualId: 'USA840003123456789' }]);
    expect(r.notes).toBe('Sire semen code: 7HO12345');
  }

  // A DNA result says calf 1 is a bull calf with another tag: a correction, never an edit.
  const first = calves[0];
  await page.goto(`/record/${first.id}`);
  await page.getByText('Fix a mistake').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Sex' }).click();
  await page.getByRole('option', { name: 'Male', exact: true }).click();
  await dialog.getByLabel('Individual ID').fill('UK123456700012');
  await dialog.getByRole('button', { name: 'Check what this affects' }).click();
  await expect(dialog).toContainText('Sex');
  await expect(dialog).toContainText('Individual ID');
  await dialog.getByLabel('Why are you correcting this?').fill('DNA parentage result');
  await shot(page, 'batch-4-correct-sex-and-id');
  await dialog.getByRole('button', { name: 'Issue correction' }).click();
  await expect.poll(() => held.records.length, { timeout: 30_000 }).toBe(3);
  const after = openRecordRows(held.records, vault);
  const original = after.find((r) => r.id === first.id)!;
  const corrected = after.find((r) => r.id !== first.id && r.strainName === 'Stud calf 1')!;
  // The sealed original is as it was, and points on; the correction points back.
  expect(original.refId).toBe('UK123456700010');
  expect((original.animal as { sex: string }).sex).toBe('female');
  expect(original.recordFingerprint).toBe(first.recordFingerprint);
  expect(original.supersededBy).toBe(corrected.id);
  expect(corrected.refId).toBe('UK123456700012');
  expect((corrected.animal as { sex: string }).sex).toBe('male');
  expect((corrected.supersedes as { recordId: string }).recordId).toBe(first.id);
  expect((corrected.supersedes as { changedFields: string[] }).changedFields.sort()).toEqual([
    'profileData.individualId',
    'profileData.sex',
  ]);
  expectNoErrors(errors);
});
