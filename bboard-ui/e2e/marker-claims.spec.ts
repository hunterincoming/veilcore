// Claims on a lab's signed genotype comparison (veilcore/marker-claims.ts; "Route A"):
//
//   1. With a real registry: a lab signs a comparison bound to the breeder's record, the breeder
//      adds it, and its "Prove a fact" panel offers the comparison's own claims, fills a
//      rounded bound, warns before an exact count, counts what is public about the sample, and
//      states the limits. The two claims are proved through the e2e build's stand-in for Midnight
//      (chain/e2e-chain.ts `prove`), and one link carries both.
//   2. With the stand-in registry: the check page for such a link in each state of the lab's
//      signature. "Markers differing: at least 6 of at least 40 compared" only when both claims
//      checked and a lab stands behind them; the holder's words otherwise; the limits always.
//
// E2E_SHOTS=<dir> saves the panel and the check page at 390 px, in English and Spanish.
// SPDX-License-Identifier: Apache-2.0
import { expect, test, type Page } from '@playwright/test';
import {
  API,
  REAL_REGISTRY,
  backupAfterLogging,
  expectNoErrors,
  isolate,
  receiveWithBackupFirst,
  startPlant,
  watch,
} from './helpers';

const SHOTS = process.env.E2E_SHOTS;
const PHONE = { width: 390, height: 844 };
const shot = async (page: Page, name: string, el?: string) => {
  if (!SHOTS) return;
  if (el) await page.locator(el).screenshot({ path: `${SHOTS}/${name}.png` });
  else await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
};
/** The same page in Spanish (a ?lang= link), then back to English. */
const shotEs = async (page: Page, name: string, ready: () => Promise<void>, el?: string) => {
  if (!SHOTS) return;
  const back = page.url();
  const u = new URL(back);
  u.searchParams.set('lang', 'es');
  await page.goto(u.toString());
  await ready();
  await shot(page, name, el);
  u.searchParams.set('lang', 'en');
  await page.goto(u.toString());
};

const choose = async (page: Page, label: string, option: string | RegExp) => {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole('option', { name: option }).click();
};

const OTHER = 'b2'.repeat(32);

/** Midnight stood in for (chain/e2e-chain.ts `prove`): each claim answers with a new transaction. */
const standInChain = (page: Page) =>
  page.addInitScript(() => {
    let n = Number(sessionStorage.getItem('e2e.tx') ?? '0');
    (window as unknown as { __veilcoreE2EChain: unknown }).__veilcoreE2EChain = {
      prove: () => {
        n += 1;
        sessionStorage.setItem('e2e.tx', String(n));
        return { contract: 'c1'.repeat(32), txId: String(n).padStart(2, '0').repeat(32), blockHeight: 3600000 + n };
      },
    };
  });

test.describe('the prove panel on a lab’s comparison', () => {
  test.skip(!REAL_REGISTRY, 'needs a real registry: set E2E_API_BASE and build with it');

  test('offers the comparison’s claims, proves two, and one link carries both', async ({ browser }) => {
    test.setTimeout(240_000);
    const breederCtx = await browser.newContext({ viewport: PHONE });
    await breederCtx.grantPermissions(['clipboard-read', 'clipboard-write']);
    const breeder = await breederCtx.newPage();
    const breederErrors = watch(breeder);
    await standInChain(breeder);
    await isolate(breeder);
    await breeder.goto('/records');
    await breeder.getByText('Start', { exact: true }).click();
    await startPlant(breeder);
    await breeder.getByLabel(/Plant or line name/).fill(`E2E Marker ${Date.now()}`);
    await breeder.getByLabel(/Bred by/).fill('E2E breeder');
    await breeder.getByRole('button', { name: /Next: check it/ }).click();
    await breeder.getByRole('button', { name: /Seal it/ }).click();
    await breeder.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
    const recordId = await breeder.evaluate(
      () => Object.keys(JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as object)[0],
    );
    await backupAfterLogging(breeder, recordId);
    const proofCode = await breeder.evaluate(
      async ({ api, id }) => {
        const res = await fetch(`${api}/api/records`, {
          headers: { 'x-holder-key': localStorage.getItem('veilcore.holder.v1') ?? '' },
        });
        const rows = (await res.json()) as { id: string; recordFingerprint: string }[];
        return rows.find((r) => r.id === id)?.recordFingerprint ?? '';
      },
      { api: API, id: recordId },
    );
    expect(proofCode).toMatch(/^[0-9a-f]{64}$/);
    await breeder.goto(`/record/${recordId}`);
    await breeder.getByText('Send it to a lab or breeder').click();
    await breeder.getByLabel(/Who are you sending it to/).fill('lab@e2e');
    await breeder.getByRole('button', { name: /Make a code for the lab/ }).click();
    const code = (await breeder.getByText(/^TR-[0-9A-F]{8}\./).innerText()).trim();
    await breeder.getByRole('button', { name: /^Done$/ }).click();

    // The lab: its key, the delivery, then one signed comparison: no match, 31 of 90 differ.
    const labCtx = await browser.newContext({ acceptDownloads: true, viewport: PHONE });
    await labCtx.grantPermissions(['clipboard-read', 'clipboard-write']);
    const lab = await labCtx.newPage();
    await standInChain(lab);
    const labErrors = watch(lab);
    await isolate(lab);
    await lab.goto('/records');
    await lab.getByRole('button', { name: "I'm a lab" }).click();
    await lab.getByRole('button', { name: /I run a lab/ }).click();
    await lab.getByRole('button', { name: /Set up your lab.s signature/ }).click();
    await lab.getByLabel(/^Name/).fill('E2E Lab');
    await lab.getByRole('button', { name: /Create my key/ }).click();
    await lab.getByRole('button', { name: /^(Continue|Done)$/ }).click();
    await receiveWithBackupFirst(lab, code);
    await lab.getByLabel(/I physically received this material/).check();
    await lab.getByRole('button', { name: /Sign with my key/ }).click();
    await expect(lab).toHaveURL(/\/record\//);
    await lab.goto('/records');
    await lab.locator('[data-lab-results-link]').click();
    const form = lab.locator('[data-result-form]');
    await choose(lab, 'What kind of result', 'Genotype comparison with another record');
    await form.getByLabel(/Proof code the sender gave for this sample/).fill(proofCode);
    await form.getByLabel(/Sample ID/).fill('S-0501');
    await form.getByLabel('Your accession number').fill('LAB-M-0501');
    await form.getByLabel('Method or SOP').fill('SNP genotyping');
    await form.getByLabel('Method version').fill('4');
    await form.getByLabel(/Marker panel/).fill('CannSNP90');
    await form.getByLabel('Panel version').fill('2.1');
    await form.getByLabel(/Proof code the other sample was sent under/).fill(OTHER);
    await choose(lab, 'Result', 'Different genotype at the markers compared');
    await form.getByLabel(/Markers compared/).fill('90');
    await form.getByLabel(/Markers that differ/).fill('31');
    await lab.getByRole('button', { name: 'Sign this result' }).click();
    await expect(lab.getByRole('heading', { name: 'Signed and kept' })).toBeVisible({ timeout: 60_000 });
    const d = lab.waitForEvent('download');
    await lab.locator('[data-result-download]').click();
    const file = await (await d).path();
    expectNoErrors(labErrors);

    // The breeder adds it and opens it.
    await breeder.goto('/check-lab-result');
    await breeder.locator('[data-result-input]').setInputFiles(file);
    const checked = breeder.locator('[data-lab-result-checked]');
    await checked.locator('[data-lab-result-find]').click();
    await checked.locator('[data-lab-result-add]').click();
    await checked.getByRole('link', { name: 'Open the record' }).click();
    const panel = breeder.locator('[data-prove-number]');
    await expect(panel).toBeVisible({ timeout: 20_000 });

    // Offered: the comparison's own claims, nothing else; a rounded bound, said so.
    await expect(panel.locator('[data-marker-offer="differing"]')).toHaveCount(1);
    await panel.getByLabel('What to prove').click();
    await expect(breeder.getByRole('option')).toHaveText([
      'Markers differing: at least …',
      'Markers compared: at least …',
      'The lab’s call: Different genotype at the markers compared',
    ]);
    await breeder.keyboard.press('Escape');
    await expect(panel.getByLabel('The limit')).toHaveValue('30');
    await expect(panel.locator('[data-marker-rounded]')).toContainText('rounded down from the lab’s count of 31');
    await expect(panel.locator('[data-marker-limits]')).toContainText('This doesn’t replace that examination.');
    await expect(panel.getByText('It is at most…')).toHaveCount(0);
    // The exact count is warned about.
    await panel.getByLabel('The limit').fill('31');
    await expect(panel.locator('[data-marker-exact]')).toContainText('This is the lowest bound that still holds');
    await panel.getByLabel('The limit').fill('30');
    await expect(panel.locator('[data-marker-exact]')).toHaveCount(0);
    await shot(breeder, 'marker-panel-en', '[data-prove-number]');
    await shotEs(
      breeder,
      'marker-panel-es',
      () => expect(breeder.locator('[data-prove-number] [data-marker-limits]')).toBeVisible({ timeout: 20_000 }),
      '[data-prove-number]',
    );

    // The breeder proves two claims on its own copy; after a reload, VeilCore's copy has both.
    const holder = await breeder.evaluate(() => localStorage.getItem('veilcore.holder.v1') ?? '');
    const copyId = new URL(breeder.url()).pathname.split('/').pop()!;
    const revNow = async () => {
      const res = await fetch(`${API}/api/records`, { headers: { 'x-holder-key': holder } });
      if (!res.ok) return -1;
      const row = ((await res.json()) as { id: string; rev?: number }[]).find((r) => r.id === copyId);
      return row ? (row.rev ?? 0) : -1;
    };
    await expect.poll(revNow, { timeout: 30_000, intervals: [1000] }).toBeGreaterThanOrEqual(0);
    const revBefore = await revNow();
    await provePart(breeder, panel);
    await expect.poll(revNow, { timeout: 30_000, intervals: [1000] }).toBeGreaterThan(revBefore);
    await expect
      .poll(() => breeder.evaluate((id) => (localStorage.getItem('veilcore.outbox.v1') ?? '').includes(id), copyId), {
        intervals: [1000],
      })
      .toBe(false);
    await breeder.reload();
    const again = breeder.locator('[data-prove-number]');
    await expect(again.locator('[data-marker-panel="2"]')).toContainText(
      'Markers compared is at least 90 (this result)',
      { timeout: 20_000 },
    );
    expectNoErrors(breederErrors);
    await breederCtx.close();
    await labCtx.close();
  });
});

/** Prove "differing at least 30", then "compared at least 90", and copy one link with both. */
const provePart = async (breeder: Page, panel: ReturnType<Page['locator']>) => {
  const breederErrors = watch(breeder);
  {
    // Prove "differing at least 30", then "compared at least 90" (the lab's exact count, warned).
    await panel.locator('[data-prove-go]').click();
    await expect(panel.locator('[data-claim-made]')).toContainText('Markers that differ is at least 30');
    await panel.getByLabel('What to prove').click();
    await breeder.getByRole('option', { name: 'Markers compared: at least …' }).click();
    // 90 is a multiple of the step: filled as 85, never as the count itself.
    await expect(panel.getByLabel('The limit')).toHaveValue('85');
    await expect(panel.locator('[data-marker-exact]')).toHaveCount(0);
    await panel.getByLabel('The limit').fill('90');
    await expect(panel.locator('[data-marker-exact]')).toContainText('This is the lowest bound that still holds');
    // What is already public on this panel, before the second claim.
    await expect(panel.locator('[data-marker-panel="1"]')).toContainText(
      'Markers that differ is at least 30 (this result)',
    );
    await panel.locator('[data-prove-go]').click();
    await expect(panel.locator('[data-claim-made]')).toContainText('Markers compared is at least 90');
    // Both claims now count on this panel; the exact one is named beside the exact-count warning,
    // which still shows for "compared at least 90".
    await expect(panel.locator('[data-marker-panel="2"]')).toContainText(
      'Markers compared is at least 90 (this result)',
    );
    await expect(panel.locator('[data-marker-exact]')).toContainText(
      'Exact counts about these samples already public: 1.',
    );

    // One link with both claims on the record.
    await panel.locator('[data-marker-copy-all="2"]').click();
    const link = await breeder.evaluate(() => navigator.clipboard.readText());
    const c = JSON.parse(Buffer.from(new URL(link).hash.slice(3), 'base64url').toString()) as {
      slot: number;
      bound: string;
      more: { slot: number; bound: string }[];
    };
    expect([c.slot, c.bound, c.more.map((m) => [m.slot, m.bound])]).toEqual([1, '90', [[2, '30']]]);
    await shot(breeder, 'marker-panel-proved-en', '[data-prove-number]');
  }
  expectNoErrors(breederErrors);
};

test.describe('the check page for a link with two claims on a lab’s comparison', () => {
  test.skip(REAL_REGISTRY, 'this uses the stand-in registry');
  test.use({ viewport: PHONE });

  const KEY = '6f'.repeat(64);
  const DIFFERING = 'ab'.repeat(32);
  const COMPARED = 'ac'.repeat(32);
  const link = Buffer.from(
    JSON.stringify({
      v: 1,
      kind: 'range',
      contract: 'c1'.repeat(32),
      txId: DIFFERING,
      record: 'cd'.repeat(32),
      schema: 'veilcore/schema/genetic-match/v1',
      slot: 2,
      op: 'at-least',
      bound: '6',
      attested: { txId: 'ef'.repeat(32), attester: KEY, about: '7e'.repeat(32) },
      more: [{ kind: 'range', txId: COMPARED, slot: 1, op: 'at-least', bound: '40' }],
    }),
  ).toString('base64url');
  const BOUND = {
    kind: 'bound',
    attestation: { signatureValid: true, retraction: null, attester: { displayName: 'TEST Lab (Hunter)' } },
  };
  const ok = (signer?: unknown) => ({
    ok: true,
    blockHeight: 3514956,
    lab: { ok: true, attester: KEY, blockHeight: 3514926, ...(signer ? { signer } : {}) },
  });

  /** Open the check page: `first` answers the first claim, `second` the one in `more`. */
  const open = async (page: Page, first: unknown, second: unknown) => {
    await page.addInitScript(
      ({ first, second, compared }) => {
        (window as unknown as { __veilcoreE2EChain: unknown }).__veilcoreE2EChain = {
          claim: (l: { txId: string }) => (l.txId === compared ? second : first),
        };
      },
      { first, second, compared: COMPARED },
    );
    await isolate(page);
    await page.goto(`/check-claim#c=${link}`);
  };

  test('both checked, a lab standing behind them: one line, the lab’s count, the limits', async ({ page }) => {
    const errors = watch(page);
    await open(page, ok(BOUND), { ok: true, blockHeight: 3514960 });
    const statement = page.locator('[data-claim-statement]');
    await expect(statement).toHaveText('Markers differing: at least 6 of at least 40 compared');
    await expect(statement).toHaveAttribute('data-marker-joined', '');
    await expect(page.locator('[data-claim-raw]')).toHaveText(
      'As proved on Midnight: Markers that differ is at least 6.',
    );
    await expect(page.locator('[data-marker-source="lab"]')).toContainText('The laboratory’s count');
    await expect(page.locator('[data-marker-more-claim="ok"]')).toContainText('Markers compared: at least 40');
    await expect(page.locator('[data-marker-more-claim="ok"]')).toContainText('Proved on Midnight in block 3514960');
    await expect(page.locator('[data-marker-limits]')).toContainText('This doesn’t replace that examination.');
    // Which records were compared is in the lab's file, which can be added beside the claim.
    await expect(page.locator('[data-claim-result-file]')).toBeVisible();
    await expect(page.locator('[data-claim-signer="bound"]')).toContainText('TEST Lab (Hunter)');
    await shot(page, 'marker-claim-en');
    await shotEs(page, 'marker-claim-es', () =>
      expect(page.locator('[data-marker-joined]')).toHaveText(
        'Marcadores que difieren: al menos 6 de al menos 40 comparados',
      ),
    );
    expectNoErrors(errors);
  });

  test('the lab’s call first: the call stays the headline, the joined line goes under it', async ({ page }) => {
    const errors = watch(page);
    const callFirst = Buffer.from(
      JSON.stringify({
        v: 1,
        kind: 'value',
        contract: 'c1'.repeat(32),
        txId: 'ad'.repeat(32),
        record: 'cd'.repeat(32),
        schema: 'veilcore/schema/genetic-match/v1',
        slot: 0,
        value: '0',
        attested: { txId: 'ef'.repeat(32), attester: KEY, about: '7e'.repeat(32) },
        more: [
          { kind: 'range', txId: DIFFERING, slot: 2, op: 'at-least', bound: '6' },
          { kind: 'range', txId: COMPARED, slot: 1, op: 'at-least', bound: '40' },
        ],
      }),
    ).toString('base64url');
    await page.addInitScript(
      ({ first, other }) => {
        (window as unknown as { __veilcoreE2EChain: unknown }).__veilcoreE2EChain = {
          claim: (l: { txId: string }) => (l.txId === 'ad'.repeat(32) ? first : other),
        };
      },
      { first: ok(BOUND), other: { ok: true, blockHeight: 3514960 } },
    );
    await isolate(page);
    await page.goto(`/check-claim#c=${callFirst}`);
    await expect(page.locator('[data-claim-statement]')).toHaveText('Different genotype at the markers compared');
    await expect(page.locator('[data-claim-statement]')).not.toHaveAttribute('data-marker-joined');
    await expect(page.locator('[data-claim-raw]')).toHaveText('As proved on Midnight: Match (1 yes, 0 no) is 0.');
    // Under the call: the lab's call, never "the laboratory's count".
    await expect(page.locator('[data-marker-source="labCall"]')).toHaveText(
      'The laboratory’s call, from the result it signed. It is not a decision about the variety.',
    );
    await expect(page.locator('[data-marker-joined="more"]')).toHaveText(
      'Markers differing: at least 6 of at least 40 compared',
    );
    await expect(page.locator('[data-marker-more-claim="ok"]')).toHaveCount(2);
    expectNoErrors(errors);
  });

  test('the second claim fails: no joined line; the first in the lab’s words, the second struck out', async ({
    page,
  }) => {
    await open(page, ok(BOUND), { ok: false, reason: 'That claim proved a different bound.' });
    await expect(page.locator('[data-claim-statement]')).toHaveText('Markers differing: at least 6');
    await expect(page.locator('[data-marker-joined]')).toHaveCount(0);
    await expect(page.locator('[data-marker-more-claim="failed"]')).toContainText('Markers compared is at least 40');
    await expect(page.locator('[data-marker-more-claim="failed"]')).toContainText('Don’t rely on it');
  });

  for (const [state, first, source, says] of [
    ['while it is being checked', 'checking', 'checking', 'Checking whether a laboratory signed these numbers'],
    [
      'when the check fails',
      { ok: false, reason: 'That transaction is not a claim.' },
      'holder',
      'No laboratory signature on these numbers checks here',
    ],
    ['with no lab signature', { ok: true, blockHeight: 1 }, 'holder', 'No laboratory signature on these numbers'],
    ['with a key no lab is tied to', ok({ kind: 'none' }), 'unnamed', 'A key signed these numbers, but no single'],
    [
      'when the lab withdrew the result',
      ok({ kind: 'retracted', attestation: { retraction: { reason: 'retraction' } } }),
      'withdrawn',
      'has since withdrawn the result',
    ],
  ] as const)
    test(`the holder’s words, never the lab’s count or one line, ${state}`, async ({ page }) => {
      const errors = watch(page);
      await open(page, first, { ok: true, blockHeight: 3514960 });
      await expect(page.locator('[data-claim-statement]')).toHaveText('Markers that differ is at least 6');
      await expect(page.locator('[data-marker-joined]')).toHaveCount(0);
      await expect(page.locator(`[data-marker-source="${source}"]`)).toContainText(says);
      await expect(page.getByText(/Markers differing: at least/)).toHaveCount(0);
      await expect(page.locator('[data-marker-limits]')).toBeVisible();
      expectNoErrors(errors);
    });
});
