// A document's check link as the person it is sent to sees it (DocumentDetail.tsx, DocumentParts.tsx),
// in the built site against the stand-in registry, with Midnight out of reach:
//   - before VeilCore reports the batch on Midnight, the holder is told the link isn't ready;
//   - the link carries the holder's language, so it opens in Spanish for a Spanish holder;
//   - dated by the registry's word but not confirmed on Midnight here, the check page says
//     exactly that, never "nothing dates this record".
// SPDX-License-Identifier: Apache-2.0
import { randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';
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
const PERMIT = Buffer.from(`Assembly minutes (test data) ${Date.now()}\n`);

test('a document link: not ready until dated, opens in the holder’s language, and never contradicts itself', async ({
  page,
  context,
}) => {
  const errors = watch(page);
  const held: { records: Rec[] } = { records: [] };
  // none: not in a batch; pending: in a batch with no anchor; anchored: the registry reports it on Midnight.
  let stage: 'none' | 'pending' | 'anchored' = 'none';
  await page.addInitScript((holder) => {
    localStorage.setItem('veilcore.holder.v1', holder);
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
  // The registry's proof (a path isolate can't key: it ends in the proof code): none until
  // "dated", then in a batch the registry reports on Midnight. Registered after isolate, so it wins.
  await page.route('**/proof/*', async (route) => {
    const url = new URL(route.request().url());

    const fp = decodeURIComponent(url.pathname.split('/').pop() ?? '');
    if (stage === 'none') return json(route, 404, { error: 'not in a batch yet' });
    const batch = await buildBatch([fp], 'B-20261118-INSP');
    if (stage === 'pending') return json(route, 200, batch.proofs[fp]);
    const anchor = {
      chain: 'midnight',
      network: 'preprod',
      contractAddress: '7a'.repeat(32),
      txHash: 'c3'.repeat(32),
      blockHeight: 4243,
      anchoredAt: '2026-11-18T15:00:00.000Z',
      testNetwork: true,
    };
    return json(route, 200, { ...batch.proofs[fp], anchor, anchors: [{ kind: 'ledger', ...anchor }] });
  });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await page.goto('/documents/new?lang=en');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'acta.pdf', mimeType: 'application/pdf', buffer: PERMIT });
  await page.getByLabel('Title').fill('Assembly minutes (test data)');
  await page.getByLabel('Held by').fill('E2E association (test data)');
  await page.getByRole('button', { name: 'Seal it' }).click();
  await expect(page.locator('[data-document-page]')).toBeVisible();
  const recordUrl = new URL(page.url()).pathname;

  // Not dated yet: the holder is told the link isn't ready to send. In English, no ?lang.
  await expect(page.locator('[data-share-not-dated]')).toContainText('Not dated yet');
  await page.getByRole('button', { name: 'Copy link: proves you had this file' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/check-document#d=/);

  // In a batch, but nothing reported on Midnight yet: still not ready.
  stage = 'pending';
  await page.reload();
  await expect(page.locator('[data-share-not-dated]')).toContainText('Not dated yet');

  // Dated: the warning goes, and in Spanish the link opens in Spanish.
  stage = 'anchored';
  await page.goto(`${recordUrl}?lang=es`);
  await expect(page.locator('[data-document-page]')).toBeVisible();
  await page.getByRole('button', { name: 'Copiar enlace: demuestra que tenía este archivo' }).click();
  await expect(page.locator('[data-share-not-dated]')).toHaveCount(0);
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/\/check-document\?lang=es#d=[A-Za-z0-9_-]+$/);

  // As the inspector, opening the link: Spanish, and dated by the registry's word with Midnight
  // out of reach, never "nothing dates this record".
  const inspector = page;
  await inspector.goto(link.replace(/^https?:\/\/[^/]+/, ''));
  await expect(inspector.getByRole('heading', { name: 'Comprobar un documento' })).toBeVisible();
  // This build can't check the stand-in's anchor on Midnight: the date rests on VeilCore's word, and the page says so.
  await expect(inspector.locator('[data-document-not-confirmed]')).toHaveAttribute(
    'data-document-not-confirmed',
    'registry-only',
  );
  await expect(inspector.locator('[data-document-not-confirmed]')).toContainText(
    'El registro de VeilCore da esta fecha',
  );
  await expect(inspector.locator('[data-document-not-dated]')).toHaveCount(0);
  expectNoErrors(errors);
});
