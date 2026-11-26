// "Compare two of your records" (components/document/TwoRecordClaims.tsx), in the browser against
// the stand-in registry: two certificates with their numbers sealed, folded under "More ways to
// prove" on a record's page, "Show these two records are different" and "Show a
// correction only changed what it says" with what each proves and what it doesn't show, a
// correction refused while a changed number isn't ticked, and the check page for each link.
// Midnight is stood in for (veilcore/chain/e2e-chain.ts `proveTwo` and `twoClaim`, e2e build
// only); in a real build the button stays off while VeilCore's fee sponsor doesn't pay for these
// two calls. All records are test data.
// SPDX-License-Identifier: Apache-2.0
import { randomBytes } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
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

// E2E_SHOTS=<dir> saves the folded panel, each claim and each check page at 390 px.
const SHOTS = process.env.E2E_SHOTS;
const shot = async (page: Page, name: string, el?: string) => {
  if (!SHOTS) return;
  if (el) await page.locator(el).screenshot({ path: `${SHOTS}/${name}.png` });
  else await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
};

type Rec = Record<string, unknown> & { id: string; recordFingerprint: string };
const HOLDER = randomBytes(32).toString('hex');
const VAULT = newVaultKey();

const standIn = async (page: Page) => {
  const held: { records: Rec[] } = { records: [] };
  await page.addInitScript((holder) => {
    localStorage.setItem('veilcore.holder.v1', holder);
    localStorage.setItem('veilcore.role.v1', 'breeder');
    let n = 0;
    (window as unknown as { __veilcoreE2EChain: unknown }).__veilcoreE2EChain = {
      proveTwo: () => {
        n += 1;
        return { contract: 'c1'.repeat(32), txId: String(n).padStart(2, '0').repeat(32), blockHeight: 3700000 + n };
      },
      twoClaim: () => ({ ok: true, blockHeight: 3700001, blockTime: Date.UTC(2026, 10, 26, 12) }),
    };
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
    'GET /records/:record/evidence': async (route, url) => {
      const id = decodeURIComponent(url.pathname.split('/')[2] ?? '');
      const r = held.records.find((x) => x.id === id);
      if (!r) return json(route, 404, { error: 'no such record for this holder key' });
      const batch = await buildBatch([r.recordFingerprint], 'B-20261126-PAIR');
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

/** Seal a certificate of analysis with its total THC and total CBD; returns its record id. */
const sealCoa = async (page: Page, file: string, thc: string, cbd: string): Promise<string> => {
  await page.goto('/documents/new');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: file,
      mimeType: 'application/pdf',
      buffer: Buffer.from(`${file} (test data) ${Date.now()}\n`),
    });
  await page.getByLabel('Type').click();
  await page.getByRole('option', { name: 'Certificate of analysis (COA)' }).click();
  await page.getByLabel('Which numbers').click();
  await page.getByRole('option', { name: 'Cannabinoid potency' }).click();
  await page.getByLabel('Total THC').fill(thc);
  await page.getByLabel('Total CBD').fill(cbd);
  await page.getByLabel('Held by').fill('E2E grower (test data)');
  await page.getByRole('button', { name: 'Seal it' }).click();
  await expect(page.locator('[data-document-page]')).toBeVisible();
  return decodeURIComponent(new URL(page.url()).pathname.split('/')[2] ?? '');
};

test('two certificates: shown different, a correction shown to change only what it says, each link checked', async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const errors = watch(page);
  await standIn(page);
  await sealCoa(page, 'coa-1.pdf', '0.21', '11.4');
  await sealCoa(page, 'coa-2.pdf', '0.30', '11.4');

  // The way in: folded under "More ways to prove", not on the record's default view.
  const way = page.locator('[data-two-way-in]');
  await expect(way).toBeVisible();
  await expect(way.locator('[data-two-link="distinct"]')).toHaveCount(0);
  await shot(page, 'two-way-in-folded', '[data-two-way-in]');
  await way.getByText('More ways to prove').click();
  await shot(page, 'two-way-in-open', '[data-two-way-in]');
  await way.locator('[data-two-link="distinct"]').click();

  // "Different": what it proves, the status, what it doesn't show, then proved.
  await expect(page.locator('[data-two-status="notYet"]')).toHaveText('Built, not yet run on Midnight’s main network.');
  await expect(page.locator('[data-two-preview]')).toHaveText(
    'This proves: these two records differ in at least 1 of the numbers their form compares.',
  );
  await expect(page.locator('[data-two-limits="distinct"]')).toContainText(
    'It is a count, not a decision. Whether two varieties or lots are distinct is for whoever examines them',
  );
  await shot(page, 'two-distinct', '[data-two-way-in]');
  await page.locator('[data-two-go]').click();
  await expect(page.locator('[data-two-made]')).toHaveText(
    'Proved on Midnight: coa-2 and coa-1 differ in at least 1 of the numbers their form compares.',
  );
  await page.locator('[data-two-copy="distinct"]').click();
  const distinctLink = await page.evaluate(() => navigator.clipboard.readText());
  expect(distinctLink).toContain('/check-claim#p=');
  // The link carries no record id.
  expect(Buffer.from(distinctLink.split('#p=')[1], 'base64url').toString()).not.toContain('VEIL-');

  // "Correction": the changed number is ticked; unticking it is refused before anything is sent.
  await page.getByLabel('What to prove').click();
  await page.getByRole('option', { name: 'Show a correction only changed what it says' }).click();
  await expect(page.locator('[data-two-mask="0"]')).toBeVisible();
  await expect(page.locator('[data-two-preview]')).toHaveText(
    'This proves: apart from Total THC, every number in this record is the same as in the earlier one.',
  );
  await page.locator('[data-two-slot="0"]').uncheck();
  await expect(page.locator('[data-two-refusal="undeclared"]')).toHaveText(
    'Total THC changed but isn’t ticked. Tick it, or this can’t be proved. Nothing was sent.',
  );
  await expect(page.locator('[data-two-go]')).toBeDisabled();
  await shot(page, 'two-unchanged-refused', '[data-two-way-in]');
  await page.locator('[data-two-slot="0"]').check();
  await expect(page.locator('[data-two-limits="unchanged"]')).toContainText(
    'It doesn’t show which record is the correction, or that one replaced the other.',
  );
  await page.locator('[data-two-go]').click();
  // The earlier record first, the correction second, as the claim names them.
  await expect(page.locator('[data-two-made]')).toHaveText(
    'Proved on Midnight: coa-2 has the same numbers as coa-1, apart from Total THC.',
  );
  await page.locator('[data-two-copy="unchanged"]').click();
  const unchangedLink = await page.evaluate(() => navigator.clipboard.readText());

  // Each link on its check page: the claim in plain words, both records, what it doesn't show.
  await page.goto(new URL(distinctLink).pathname + new URL(distinctLink).hash);
  await expect(page.locator('[data-two-check="distinct"]')).toBeVisible();
  // Proved, but neither record is dated on Midnight here: a warning on top, never green.
  await expect(page.locator('[data-verdict]')).toHaveAttribute('data-verdict', 'warn');
  await expect(page.locator('[data-verdict]')).toContainText('no date on Midnight was confirmed for a record it names');
  await expect(page.locator('[data-claim-verdict="ok"]')).toBeVisible();
  await expect(page.locator('[data-claim-statement]')).toHaveText(
    'These two records, as sealed, differ in at least 1 of the numbers their form compares.',
  );
  await expect(page.locator('[data-two-record]')).toHaveCount(2);
  await shot(page, 'two-check-distinct');
  await expect(page.locator('[data-two-limits="distinct"]')).toContainText(
    'This doesn’t show that a laboratory measured or signed the numbers.',
  );
  await page.goto(new URL(unchangedLink).pathname + new URL(unchangedLink).hash);
  await expect(page.locator('[data-claim-statement]')).toHaveText(
    'Apart from Total THC, the second record holds the same numbers as the first.',
  );
  await expect(page.getByText('The correction (as the holder says)')).toBeVisible();
  await shot(page, 'two-check-unchanged');
  expectNoErrors(errors);
});

test('in each language it says it hasn’t run on mainnet yet', async ({ page }) => {
  const errors = watch(page);
  await standIn(page);
  const id = await sealCoa(page, 'coa-3.pdf', '0.21', '11.4');
  const NOT_YET: Record<string, string> = {
    en: 'Built, not yet run on Midnight’s main network.',
    de: 'Gebaut, im Hauptnetz von Midnight noch nicht ausgeführt.',
    es: 'Construido, aún no usado en la red principal de Midnight.',
    fr: 'Construit, pas encore utilisé sur le réseau principal de Midnight.',
    ja: '作成済みですが、Midnightのメインネットワークではまだ実行していません。',
  };
  for (const [lang, words] of Object.entries(NOT_YET)) {
    await page.goto(`/record/${id}?lang=${lang}`);
    await page.locator('[data-two-way-in] .MuiAccordionSummary-root').click();
    await expect(page.locator('[data-two-status="notYet"]')).toHaveText(words);
    await page.locator('[data-two-link="distinct"]').click();
    // Only one certificate: nothing to compare it with, said in the language.
    await expect(page.locator('[data-two-none]')).toBeVisible();
  }
  expectNoErrors(errors);
});
