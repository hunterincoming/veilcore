// The pack for the authority (veilcore/authority-pack.ts), in the built site against the stand-in
// registry with Midnight out of reach: a source plant record with a variety registration number,
// a grow batch about it, two harvest lots about the batch and a lab report about one of them, all
// sealed on screen. The pack is made in Spanish for a chosen period:
//   - the lot with no chromatography report is the gap at the top, and the other isn't;
//   - the plant counts are the ones the officer typed, the batch's sums shown only as a hint;
//   - the header says it is not an official form, every printed page has a running footer;
//   - each record has its check link, and the lab report's opens, in Spanish, as a stranger sees it;
//   - the dates are VeilCore's registry's report, said so, never "checked";
//   - the number of linked patients is in no request made after it was typed.
// Set E2E_SHOTS to a folder to keep a screenshot of the pack and an A4 PDF of it.
// All files and records are test data.
// SPDX-License-Identifier: Apache-2.0
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import { expect, test, type Page, type Route } from '@playwright/test';
import { buildBatch, canonicalise } from 'veilcore-records';
import {
  REAL_REGISTRY,
  expectNoErrors,
  holdVaultKey,
  isolate,
  json,
  newVaultKey,
  plainRowRefusal,
  sealedRecordRow,
  watch,
  type Handler,
} from './helpers';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

type Row = Record<string, unknown> & { id: string };
const HOLDER = randomBytes(32).toString('hex');
const VAULT = newVaultKey();
const SOURCE_ID = `VEIL-${randomBytes(8).toString('hex').toUpperCase()}`;
const SOURCE_NAME = 'Clone line 7 (pack test)';
const REGISTRATION = 'INASE RNC 12345 (test data)';
const HELD_BY = 'E2E association (test data)';
const PATIENTS = '1379';
const file = (what: string) => Buffer.from(`${what} (test data) ${Date.now()} ${randomBytes(4).toString('hex')}\n`);

/** The source record: a plant record this holder already has, its registration number sealed in its notes. */
const sourceRow = (): Row => {
  const committed = {
    breedingMethod: '',
    bredBy: HELD_BY,
    dateCreated: '2026-01-01',
    // Sealed after the plant form started writing registration lines (authority-pack.ts).
    loggedAt: Date.now(),
    nonce: randomBytes(16).toString('hex'),
    notes: `Variety registration: ${REGISTRATION}\n\nMother room.`,
    parents: [],
    photoFingerprints: [],
    refId: '',
    strainName: SOURCE_NAME,
  };
  const recordFingerprint = createHash('sha256').update(canonicalise(committed)).digest('hex');
  return sealedRecordRow({ id: SOURCE_ID, ...committed, recordFingerprint }, VAULT) as Row;
};

/** Pick one record in "What it’s about" on the sealing screen. */
const pickAbout = async (page: Page, name: RegExp) => {
  await page.getByLabel('What it’s about (optional)').click();
  await page.getByRole('option', { name }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
};

/** Seal what is on the form, and give the new record's ID from its page's address. */
const seal = async (page: Page): Promise<string> => {
  await page.getByRole('button', { name: 'Seal it' }).click();
  await expect(page.locator('[data-document-page]')).toBeVisible({ timeout: 30_000 });
  const id = decodeURIComponent(new URL(page.url()).pathname.split('/').pop() ?? '');
  expect(id).toMatch(/^VEIL-[0-9A-F]+$/);
  return id;
};

const chainRecord = async (
  page: Page,
  kind: 'grow-batch' | 'harvest-lot',
  o: { ref: string; date: string; numbers: string[]; about: RegExp },
): Promise<string> => {
  await page.goto('/documents/new?lang=en');
  await page.locator(`[data-chain-start-kind="${kind}"]`).click();
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name: `${o.ref}.txt`, mimeType: 'text/plain', buffer: file(`${kind} ${o.ref}`) });
  const numbers = page.locator('[data-chain-numbers]');
  for (const [i, v] of o.numbers.entries()) await numbers.locator(`input[data-slot="${i}"]`).fill(v);
  await page.getByLabel(kind === 'grow-batch' ? 'Batch ID' : 'Lot ID').fill(o.ref);
  await page.locator('input[type=date]').fill(o.date);
  await pickAbout(page, o.about);
  await page.getByLabel('Held by').fill(HELD_BY);
  return seal(page);
};

test('a pack for the authority in Spanish: the missing chromatography first, and each record’s check link', async ({
  page,
}) => {
  test.setTimeout(300_000);
  const errors = watch(page);
  await page.addInitScript((holder) => {
    localStorage.setItem('veilcore.holder.v1', holder);
    localStorage.setItem('veilcore.role.v1', 'breeder');
  }, HOLDER);
  await holdVaultKey(page, VAULT);
  const rows: Row[] = [sourceRow()];
  const handlers: Record<string, Handler> = {
    'GET /api/records': (route) => json(route, 200, rows),
    'PUT /api/records': (route, _url, body) => {
      const refusal = plainRowRefusal(body);
      if (refusal) return json(route, 400, { error: refusal });
      for (const r of body as Row[]) {
        const at = rows.findIndex((x) => x.id === r.id);
        if (at >= 0) rows[at] = r;
        else rows.push(r);
      }
      return json(route, 200, { ok: true });
    },
    'PUT /api/records/dating': (route, _url, body) =>
      json(route, 200, { ok: true, dated: (body as Row[]).map((r) => r.id) }),
    'GET /api/licenses': (route) => json(route, 200, []),
    'PUT /api/licenses': (route) => json(route, 200, { ok: true }),
    'GET /api/disclosures': (route) => json(route, 200, []),
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
    // The public check page for a record ID: the registry says which proof code it holds for it.
    'GET /verify/:record': (route: Route, url: URL) => {
      const id = decodeURIComponent(url.pathname.split('/')[2] ?? '');
      const r = rows.find((x) => x.id === id);
      if (!r) return json(route, 404, { found: false });
      return json(route, 200, {
        found: true,
        id,
        recordFingerprint: r.recordFingerprint,
        keyBound: false,
        disclosed: [],
      });
    },
  };
  await isolate(page, handlers);
  // Every proof code is in a batch the registry reports on Midnight (a test network). The site
  // does try to look each anchor up on Midnight, but this test refuses every request outside the
  // site and the stand-in registry, so no date is checked: the pack must say it is the registry's word.
  await page.route('**/proof/*', async (route) => {
    const fp = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop() ?? '');
    const batch = await buildBatch([fp], 'B-20261118-PACK');
    const anchor = {
      chain: 'midnight',
      network: 'preview',
      contractAddress: '7a'.repeat(32),
      txHash: 'c3'.repeat(32),
      blockHeight: 4243,
      anchoredAt: '2026-11-18T15:00:00.000Z',
    };
    return json(route, 200, { ...batch.proofs[fp], anchor, anchors: [{ kind: 'ledger', ...anchor }] });
  });

  // The production chain, sealed on screen: a batch about the source, two lots about the batch,
  // and a lab report about the first lot only.
  await page.goto('/records?lang=en');
  await expect(page.getByText(SOURCE_NAME).first()).toBeVisible({ timeout: 30_000 });
  const batchId = await chainRecord(page, 'grow-batch', {
    ref: 'B-0042',
    date: '2026-06-02',
    numbers: ['120', '80', '12.50'],
    about: /Clone line 7/,
  });
  const lotWithReport = await chainRecord(page, 'harvest-lot', {
    ref: 'L-0007',
    date: '2026-09-10',
    numbers: ['118', '51200', '10400'],
    about: /Grow batch B-0042/,
  });
  const lotWithout = await chainRecord(page, 'harvest-lot', {
    ref: 'L-0008',
    date: '2026-10-01',
    numbers: ['40', '17000', '3500'],
    about: /Grow batch B-0042/,
  });
  await page.goto('/documents/new?lang=en');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name: 'coa L-0007.pdf', mimeType: 'application/pdf', buffer: file('COA for lot L-0007') });
  await page.getByLabel('Title').fill('COA for lot L-0007');
  await page.getByLabel('Type').click();
  await page.getByRole('option', { name: 'Lab report' }).click();
  await pickAbout(page, /Harvest lot L-0007/);
  await page.getByLabel('Held by').fill(HELD_BY);
  const reportId = await seal(page);

  // Home offers the pack once there is a chain to make it from.
  await page.goto('/records?lang=es');
  await expect(page.locator('[data-pack-link]')).toHaveText('Paquete para REPROCANN / SEDRONAR');
  await page.locator('[data-pack-link]').click();
  await expect(page.getByRole('heading', { name: 'Paquete para REPROCANN / SEDRONAR' })).toBeVisible();

  // The form, in Spanish, for May to November.
  await page.getByLabel('Otras fechas').check();
  await page.locator('[data-period-from]').fill('2026-05-19');
  await page.locator('[data-period-to]').fill('2026-11-18');
  // The batch's sums are a hint beside the boxes, never put in them.
  await expect(page.locator('[data-pack-sum="plants"]')).toHaveText(
    'Sus lotes de cultivo fechados en este período suman 120 plantas (lotes con este recuento: 1 de 1).',
  );
  await expect(page.locator('[data-pack-sum="inFlower"]')).toContainText('Suman 80 plantas en floración');
  await expect(page.locator('[data-pack-plants]')).toHaveValue('');
  await page.locator('[data-pack-plants]').fill('118');
  await page.locator('[data-pack-in-flower]').fill('76');
  await expect(page.locator('[data-pack-links-warn]')).toContainText('COA for lot L-0007');

  if (process.env.E2E_SHOTS)
    await page.screenshot({ path: path.join(process.env.E2E_SHOTS, 'pack-form-390.png'), fullPage: true });

  // From the moment the patient count is typed, every request is recorded.
  const sent: string[] = [];
  page.on('request', (r) => sent.push(`${r.method()} ${r.url()}\n${r.postData() ?? ''}`));
  await page.locator('[data-pack-patients]').fill(PATIENTS);
  await page.locator('[data-pack-make]').click();
  const pack = page.locator('[data-authority-pack]');
  await expect(pack).toBeVisible({ timeout: 60_000 });
  await expect(pack).toHaveAttribute('data-pack-lang', 'es');
  await expect(pack.locator('h1')).toHaveText(
    'Material de respaldo para el informe semestral y el registro de producción',
  );
  await expect(pack.locator('[data-pack-not-form]')).toHaveText('No es un formulario oficial.');
  // A running footer on every printed page: the period and "página X de Y".
  const pageCss = (await pack.locator('style[data-pack-page]').textContent()) ?? '';
  expect(pageCss).toContain('@bottom-left');
  expect(pageCss).toContain('"Período: del 2026-05-19 al 2026-11-18"');
  expect(pageCss).toMatch(/"página " counter\(page\) " de " counter\(pages\)/);
  await expect(pack.locator('[data-pack-doc-period]')).toHaveText('Período: del 2026-05-19 al 2026-11-18');

  // The gaps, first: the lot with no report is named, the one with a report isn't.
  const gaps = pack.locator('[data-pack-gaps]');
  await expect(gaps).toHaveAttribute('data-pack-gaps', 'some');
  await expect(gaps.locator('[data-gap="chromatography"]')).toHaveText([
    'Lote L-0008: falta el informe cromatográfico.',
  ]);
  await expect(gaps).not.toContainText('L-0007');
  await expect(gaps.locator('[data-gap="registration"]')).toHaveCount(0);
  await expect(gaps.locator('[data-gap="patients"]')).toHaveCount(0);
  // Dated only by the registry's word here (no indexer): counted as not checked, and said so.
  await expect(gaps.locator('[data-gap="unchecked"]')).toContainText(
    'no comprobadas en la red principal de Midnight por este navegador',
  );
  expect(await gaps.locator('li').first().getAttribute('data-gap')).toBe('chromatography');

  // The parts.
  await expect(pack.locator(`[data-variety="${SOURCE_ID}"] [data-registration]`)).toHaveText(REGISTRATION);
  await expect(pack.locator('[data-pack-plants-total]')).toHaveText('118');
  await expect(pack.locator('[data-pack-plants-flower]')).toHaveText('76');
  await expect(pack.locator('[data-pack-sums]')).toContainText(
    'suman 120 plantas y 80 en floración. La suma de lotes sellados no es un inventario.',
  );
  await expect(pack.locator('[data-pack-patients]')).toHaveText(PATIENTS);
  await expect(pack.locator(`[data-production="${batchId}"]`)).toContainText('120 plantas, 80 en floración');
  await expect(pack.locator(`[data-lot="${lotWithReport}"]`)).toHaveAttribute('data-chromatography', 'document');
  await expect(pack.locator(`[data-lot="${lotWithReport}"]`)).toContainText('Documento sellado: «COA for lot L-0007»');
  await expect(pack.locator(`[data-lot="${lotWithout}"]`)).toHaveAttribute('data-chromatography', 'missing');
  await expect(pack.locator('[data-pack-footer]')).toContainText(
    'No conocemos un formulario oficial publicado para esta declaración.',
  );
  await expect(pack.locator('[data-pack-sign] > div')).toHaveText([
    'Firma',
    'Aclaración',
    'Carácter (representante legal / Responsable Técnico)',
    'Fecha',
  ]);
  // "Registro" never alone for one of ours.
  await expect(pack).not.toContainText('No figura en el registro');

  // Each record: its proof code, its check link, and its date as the registry's report.
  for (const id of [SOURCE_ID, batchId, lotWithReport, lotWithout, reportId])
    await expect(pack.locator(`[data-pack-item="${id}"] a[data-check-link]`)).toHaveCount(1);
  const reportItem = pack.locator(`[data-pack-item="${reportId}"]`);
  // On paper a link can't be clicked: where to type the ID instead.
  await expect(reportItem.locator('[data-on-paper]')).toHaveText(
    `En papel: abra 127.0.0.1:${process.env.E2E_PORT ?? 4317}/verify e introduzca el ID VeilCore ${reportId}.`,
  );
  await expect(reportItem.locator('[data-date-lines]')).toContainText(
    'según informa el servidor de registros de VeilCore. No comprobado por este navegador',
  );
  await expect(reportItem.locator('[data-date-lines]')).toContainText('Una red de pruebas');
  await expect(pack).not.toContainText('comprobado por este navegador al armar el paquete');
  const sourceLink = await pack.locator(`[data-pack-item="${SOURCE_ID}"] a[data-check-link]`).getAttribute('href');
  expect(sourceLink).toMatch(new RegExp(`/verify/${SOURCE_ID}\\?(.+&)?fp=[0-9a-f]{64}`));
  expect(sourceLink).toContain('lang=es');
  const reportLink = (await reportItem.locator('a[data-check-link]').getAttribute('href')) ?? '';
  expect(reportLink).toMatch(/\/check-document\?lang=es#d=[A-Za-z0-9_-]+$/);

  // Nothing sent after the patient count was typed carries it (proof codes aside, which are hex).
  expect(sent.length).toBeGreaterThan(0);
  for (const s of sent) expect(s.replace(/[0-9a-f]{64}/g, ''), s).not.toContain(PATIENTS);

  const shots = process.env.E2E_SHOTS;
  if (shots) {
    await page.setViewportSize({ width: 900, height: 1200 });
    await pack.screenshot({ path: path.join(shots, 'pack-screen-900.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await pack.screenshot({ path: path.join(shots, 'pack-screen-390.png') });
    await page.emulateMedia({ media: 'print' });
    await page.setViewportSize({ width: 794, height: 1123 });
    await page.screenshot({ path: path.join(shots, 'pack-print-794.png'), fullPage: true });
    await page.pdf({
      path: path.join(shots, 'pack.pdf'),
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });
    await page.emulateMedia({ media: 'screen' });
  }

  // The lab report's link, opened as the person it is sent to: Spanish, and the date the
  // registry's word, never "nothing dates this record".
  await page.goto(reportLink.replace(/^https?:\/\/[^/]+/, ''));
  await expect(page.getByRole('heading', { name: 'Comprobar un documento' })).toBeVisible();
  // The page tried Midnight and every request out was refused: unreachable, and it says so.
  const notConfirmed = page.locator('[data-document-not-confirmed]');
  await expect(notConfirmed).toHaveAttribute('data-document-not-confirmed', 'unreachable');
  await expect(notConfirmed).toHaveText(
    'El registro de VeilCore da esta fecha, pero esta página no pudo confirmarla en Midnight en este momento. Vuelva a intentarlo en unos minutos antes de confiar en ella.',
  );
  await expect(page.locator('[data-document-not-dated]')).toHaveCount(0);
  expectNoErrors(errors);
});
