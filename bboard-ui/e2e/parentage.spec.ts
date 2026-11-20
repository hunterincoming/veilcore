// A laboratory's signed parentage result (animal-parentage/v1; veilcore/parentage.ts, docs/parentage.md),
// against the stand-in registry and the e2e build's stand-in for Midnight (chain/e2e-chain.ts):
//
//   1. A lab sets up its key, signs an ICAR 2023 parentage result for a calf (practice numbers: 1
//      conflict with the sire, 0 with the dam, 2 across the trio, 190 and 188 SNPs compared), and
//      downloads the result file. The holder adds it to their records and opens it. "Prove one
//      number" offers ICAR's five class bounds only, fixed (no box to type a bound, nothing
//      rounded into "doubtful"), says the bands in plain words, and the limits of a parentage
//      result. The holder proves all five and copies one link with them.
//   2. That link, opened by a stranger: with a laboratory standing behind the numbers and every
//      claim checked, the page says it meets ICAR 2023 acceptance in the fixed words; with one
//      claim failing, or no laboratory, it doesn't.
//   3. A lab's result with a doubtful sire: no claim about the sire is offered, and the page says why.
//
// E2E_SHOTS=<dir> saves the panel and the check page at 390 and 1366 px.
// All records, numbers and files are practice data.
// SPDX-License-Identifier: Apache-2.0
import { createHash, randomBytes } from 'node:crypto';
import { expect, test, type Browser, type Page, type Route } from '@playwright/test';
import { canonicalise } from 'veilcore-records';
import {
  REAL_REGISTRY,
  expectNoErrors,
  holdVaultKey,
  isolate,
  json,
  newVaultKey,
  sealedRecordRow,
  watch,
  type Handler,
} from './helpers';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

const SHOTS = process.env.E2E_SHOTS;
const PHONE = { width: 390, height: 844 };
const DESK = { width: 1366, height: 900 };
const shot = async (page: Page, name: string, el?: string) => {
  if (!SHOTS) return;
  for (const [w, size] of [
    ['390', PHONE],
    ['1366', DESK],
  ] as const) {
    await page.setViewportSize(size);
    if (el) await page.locator(el).screenshot({ path: `${SHOTS}/${name}-${w}.png` });
    else await page.screenshot({ path: `${SHOTS}/${name}-${w}.png`, fullPage: true });
  }
  await page.setViewportSize(PHONE);
};

type Row = Record<string, unknown> & { id: string; holder: string };

/** One stand-in registry both browsers talk to: rows by holder key, and what a lab key published. */
const registry = () => {
  const rows: Row[] = [];
  const holderOf = (route: Route) => route.request().headers()['x-holder-key'] ?? '';
  let n = 0;
  const handlers: Record<string, Handler> = {
    'GET /api/records': (route) =>
      json(
        route,
        200,
        rows.filter((r) => r.holder === holderOf(route)).map(({ holder: _h, ...r }) => r),
      ),
    'PUT /api/records': (route, _u, body) => {
      for (const r of body as Row[]) {
        const at = rows.findIndex((x) => x.id === r.id);
        const row = { ...r, holder: holderOf(route) };
        if (at >= 0) rows[at] = { recordFingerprint: rows[at].recordFingerprint, ...row };
        else rows.push(row);
      }
      return json(route, 200, { ok: true });
    },
    'PUT /api/records/dating': (route, _u, body) => {
      const dated: string[] = [];
      for (const r of body as Row[]) {
        if (!rows.find((x) => x.id === r.id)) rows.push({ ...r, bodyPending: true, holder: holderOf(route) });
        dated.push(r.id);
      }
      return json(route, 200, { ok: true, dated });
    },
    'GET /api/licenses': (route) => json(route, 200, []),
    'GET /api/disclosures': (route) => json(route, 200, []),
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
    'GET /transfers/received': (route) => json(route, 200, { transfers: [] }),
    'POST /attesters': (route) => json(route, 200, { attesterId: 'att-lab-e2e' }),
    'POST /attestations': (route) => {
      n += 1;
      return json(route, 200, { attestationId: `att_e2e_${n}`, strength: 'self-asserted' });
    },
  };
  return { rows, handlers };
};

/** Midnight stood in for: each claim answers with a new transaction. */
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

const choose = async (page: Page, label: string | RegExp, option: string | RegExp) => {
  await page.getByLabel(label, { exact: typeof label === 'string' }).click();
  await page.getByRole('option', { name: option }).click();
};

/** The lab's numbers, by the form's slot words (animal-parentage-v1.json). */
type Numbers = Record<string, string>;
const ACCEPTED: Numbers = {
  'Species (code)': '1',
  'SNPs in the panel': '195',
  'SNPs compared with the sire': '190',
  'Conflicts with the sire': '1',
  'Sire outcome (0 accepted, 1 doubtful, 2 excluded)': '0',
  'SNPs compared with the dam': '188',
  'Conflicts with the dam': '0',
  'Dam outcome (0 accepted, 1 doubtful, 2 excluded)': '0',
  'Conflicts across the trio': '2',
  'Trio outcome (0 accepted, 1 doubtful, 2 excluded)': '0',
  'Registration no. of the sire': '3101234567',
  'Registration no. of the dam': '3107654321',
};

/**
 * A lab with a key signs one parentage result for a calf and downloads its file; the holder adds
 * it and opens its record. Returns the holder's page, on that record.
 */
const signAndAdd = async (browser: Browser, numbers: Numbers) => {
  const reg = registry();
  // The holder already holds the calf's record (as the registry keeps it, locked): the lab's result
  // names it by its proof code, and only its holder can add the result to their records.
  const HOLDER = randomBytes(32).toString('hex');
  const VAULT = newVaultKey();
  const id = `VEIL-${randomBytes(8).toString('hex').toUpperCase()}`;
  const committed = {
    breedingMethod: '',
    bredBy: 'E2E breeder (practice)',
    dateCreated: '2026-03-01',
    loggedAt: Date.now() - 86_400_000,
    nonce: randomBytes(16).toString('hex'),
    notes: '',
    parents: [],
    photoFingerprints: [],
    refId: '',
    strainName: 'Calf 0417 (practice)',
  };
  const calf = createHash('sha256').update(canonicalise(committed)).digest('hex');
  reg.rows.push({ ...(sealedRecordRow({ id, ...committed, recordFingerprint: calf }, VAULT) as Row), holder: HOLDER });
  const labCtx = await browser.newContext({ acceptDownloads: true, viewport: PHONE });
  const lab = await labCtx.newPage();
  const labErrors = watch(lab);
  await holdVaultKey(lab, newVaultKey());
  await isolate(lab, reg.handlers);
  await lab.goto('/records');
  await lab.getByRole('button', { name: "I'm a lab" }).click();
  await lab.getByRole('button', { name: /I run a lab/ }).click();
  await lab.getByRole('button', { name: /Set up your lab.s signature/ }).click();
  await lab.getByLabel(/^Name/).fill('E2E Parentage Lab');
  await lab.getByRole('button', { name: /Create my key/ }).click();
  await lab.getByRole('button', { name: /^(Continue|Done)$/ }).click();
  await lab.goto('/lab/results');
  const form = lab.locator('[data-result-form]');
  await expect(form).toBeVisible({ timeout: 20_000 });
  await choose(lab, 'What kind of result', 'Numbers under a published form');
  await form.getByLabel(/Proof code the sender gave for this sample/).fill(calf);
  await form.getByLabel(/Sample ID/).fill('CALF-0417');
  await form.getByLabel('Your accession number').fill('PAR-2026-0417');
  await form.getByLabel('Method or SOP').fill('ICAR SNP parentage verification');
  await form.getByLabel('Method version').fill('2023');
  await form.getByLabel(/Marker panel/).fill('ISAG bovine');
  await form.getByLabel('Panel version').fill('195');
  await choose(lab, 'Which numbers', 'Animal parentage (SNP, ICAR)');
  for (const [label, v] of Object.entries(numbers)) await form.getByLabel(label, { exact: true }).fill(v);
  await lab.getByRole('button', { name: 'Sign this result' }).click();
  await expect(lab.getByRole('heading', { name: 'Signed and kept' })).toBeVisible({ timeout: 60_000 });
  const d = lab.waitForEvent('download');
  await lab.locator('[data-result-download]').click();
  const file = await (await d).path();
  expectNoErrors(labErrors);

  // The holder adds the lab's file to their records and opens it.
  const ctx = await browser.newContext({ viewport: PHONE });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await ctx.newPage();
  const errors = watch(page);
  await standInChain(page);
  await page.addInitScript((holder) => {
    localStorage.setItem('veilcore.holder.v1', holder);
    localStorage.setItem('veilcore.role.v1', 'breeder');
  }, HOLDER);
  await holdVaultKey(page, VAULT);
  await isolate(page, reg.handlers);
  await page.goto('/check-lab-result');
  await page.locator('[data-result-input]').setInputFiles(file);
  const checked = page.locator('[data-lab-result-checked]');
  await checked.locator('[data-lab-result-find]').click();
  await checked.locator('[data-lab-result-add]').click();
  await checked.getByRole('link', { name: 'Open the record' }).click();
  await expect(page.locator('[data-prove-number]')).toBeVisible({ timeout: 20_000 });
  // The download lives as long as the lab's browser.
  await labCtx.close();
  return { page, ctx, errors };
};

const OFFERS = [
  'Conflicts with the sire: at most 2 (ICAR accepted)',
  'Conflicts with the dam: at most 2 (ICAR accepted)',
  'Conflicts across the trio: at most 3 (ICAR accepted)',
  'SNPs compared with the sire: at least 175 (ICAR minimum)',
  'SNPs compared with the dam: at least 175 (ICAR minimum)',
];

test.describe('a laboratory’s signed parentage result', () => {
  test.use({ viewport: PHONE });

  test('the lab signs it; the holder proves ICAR 2023 acceptance; a stranger checks the link', async ({ browser }) => {
    test.setTimeout(300_000);
    const { page, ctx, errors } = await signAndAdd(browser, ACCEPTED);
    const panel = page.locator('[data-prove-number]');

    // Offered: ICAR's five class bounds, in order, and nothing else. No bound to type, nothing rounded.
    await panel.getByLabel('What to prove').click();
    await expect(page.getByRole('option')).toHaveText(OFFERS);
    await page.keyboard.press('Escape');
    await expect(panel.locator('[data-parentage-fixed="2"]')).toBeVisible();
    await expect(panel.getByLabel('The limit')).toHaveCount(0);
    await expect(panel.locator('[data-marker-rounded]')).toHaveCount(0);
    await expect(panel.locator('[data-marker-exact]')).toHaveCount(0);
    await expect(panel.locator('[data-parentage-bands]')).toContainText(
      'With one parent: 0 to 2 conflicts is accepted, 3 to 5 is doubtful, more than 5 is excluded.',
    );
    await expect(panel.locator('[data-parentage-unmet]')).toHaveCount(0);
    await expect(panel.locator('[data-marker-limits="parentage"]')).toContainText(
      'Consistent with descent is not proof of descent.',
    );
    await expect(panel.locator('[data-claim-preview]')).toContainText('Conflicts with the sire is at most 2');
    await shot(page, 'parentage-panel', '[data-prove-number]');

    // Prove all five, one after another, each with ICAR's own bound.
    for (const [i, offer] of OFFERS.entries()) {
      if (i > 0) await choose(page, 'What to prove', offer);
      await panel.locator('[data-prove-go]').click();
      await expect(panel.locator('[data-claim-made]')).toBeVisible();
      await expect(panel.locator(`[data-marker-panel="${i + 1}"]`)).toBeVisible();
    }
    await expect(panel.locator('[data-claims-made]')).toContainText('SNPs compared with the dam is at least 175');
    // No exact count was published: a class bound shows the band only.
    await expect(panel.locator('[data-marker-exact]')).toHaveCount(0);
    await expect(panel.locator('[data-marker-panel]')).not.toContainText('Exact counts');

    // One link with all five.
    await panel.locator('[data-marker-copy-all="5"]').click();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    const c = JSON.parse(Buffer.from(new URL(link).hash.slice(3), 'base64url').toString()) as {
      schema: string;
      slot: number;
      op: string;
      bound: string;
      more: { slot: number; op: string; bound: string }[];
    };
    expect(c.schema).toBe('veilcore/schema/animal-parentage/v1');
    const all = [c, ...c.more].map((x) => [x.slot, x.op, x.bound]).sort((a, b) => Number(a[0]) - Number(b[0]));
    expect(all).toEqual([
      [2, 'at-least', '175'],
      [3, 'at-most', '2'],
      [5, 'at-least', '175'],
      [6, 'at-most', '2'],
      [8, 'at-most', '3'],
    ]);
    // Not one count, genotype or registration number in the link.
    for (const n of ['190', '188', '3101234567', '3107654321']) expect(link).not.toContain(n);
    await shot(page, 'parentage-panel-proved', '[data-prove-number]');
    expectNoErrors(errors);
    await ctx.close();

    // A stranger opens the link: a lab standing behind it, every claim checked.
    const hash = new URL(link).hash;
    const KEY = '6f'.repeat(64);
    const withLab = (o: Record<string, unknown>) =>
      `#c=${Buffer.from(
        JSON.stringify({ ...o, attested: { txId: 'ef'.repeat(32), attester: KEY, about: '7e'.repeat(32) } }),
      ).toString('base64url')}`;
    const first = JSON.parse(Buffer.from(hash.slice(3), 'base64url').toString()) as Record<string, unknown>;
    const BOUND = {
      kind: 'bound',
      attestation: { signatureValid: true, retraction: null, attester: { displayName: 'TEST Lab (practice)' } },
    };
    const open = async (answers: { first: unknown; rest: unknown; failTx?: string }) => {
      const s = await browser.newContext({ viewport: PHONE });
      const p = await s.newPage();
      const errs = watch(p);
      await p.addInitScript(
        ({ first, rest, failTx, firstTx }) => {
          (window as unknown as { __veilcoreE2EChain: unknown }).__veilcoreE2EChain = {
            claim: (l: { txId: string }) =>
              l.txId === firstTx
                ? first
                : l.txId === failTx
                  ? { ok: false, reason: 'That claim proved a different bound.' }
                  : rest,
          };
        },
        { ...answers, failTx: answers.failTx ?? '', firstTx: first.txId as string },
      );
      await isolate(p);
      await p.goto(`/check-claim${withLab(first)}`);
      return { p, s, errs };
    };
    const ok = {
      ok: true,
      blockHeight: 3514956,
      lab: { ok: true, attester: KEY, blockHeight: 3514926, signer: BOUND },
    };

    {
      const { p, s, errs } = await open({ first: ok, rest: { ok: true, blockHeight: 3514960 } });
      const cert = p.locator('[data-parentage-cert]');
      await expect(cert).toContainText('Meets ICAR 2023 parentage acceptance');
      await expect(cert).toContainText(
        'A laboratory’s signed parentage result, dated on Midnight. The holder proved it meets ICAR 2023 acceptance without showing the genotypes or the counts. The laboratory saw the genotypes. Consistent with descent is not proof of descent. VeilCore tested nothing.',
      );
      await expect(p.locator('[data-marker-more-claim="ok"]')).toHaveCount(4);
      await expect(p.locator('[data-marker-source="lab"]')).toHaveText(
        'The laboratory’s counts, from the result it signed. They are counts, not a breed society’s decision.',
      );
      await expect(p.locator('[data-parentage-bands]')).toContainText('more than 7 is excluded');
      await expect(p.locator('[data-marker-limits="parentage"]')).toContainText(
        'It is not a breed society’s certificate.',
      );
      await shot(p, 'parentage-check');
      // The same page in each language: the certificate is there, in that language.
      for (const [lang, words] of [
        ['de', 'VeilCore hat nichts untersucht.'],
        ['es', 'VeilCore no analizó nada.'],
        ['fr', 'VeilCore n’a rien analysé.'],
        ['ja', 'VeilCoreは何も検査していません。'],
      ] as const) {
        await p.goto(`/check-claim?lang=${lang}${withLab(first)}`);
        await expect(p.locator('[data-parentage-cert]')).toContainText(words);
        if (lang === 'ja' || lang === 'de') await shot(p, `parentage-check-${lang}`);
      }
      expectNoErrors(errs);
      await s.close();
    }
    // One claim failed: no certificate, and that claim struck out.
    {
      const failTx = (first.more as { txId: string }[])[2].txId;
      const { p, s } = await open({ first: ok, rest: { ok: true, blockHeight: 3514960 }, failTx });
      await expect(p.locator('[data-marker-more-claim="failed"]')).toHaveCount(1);
      await expect(p.locator('[data-parentage-cert]')).toHaveCount(0);
      await s.close();
    }
    // No laboratory stands behind the numbers: no certificate, the holder's words.
    {
      const { p, s } = await open({
        first: { ok: true, blockHeight: 3514956 },
        rest: { ok: true, blockHeight: 3514960 },
      });
      await expect(p.locator('[data-marker-source="holder"]')).toBeVisible();
      await expect(p.locator('[data-parentage-cert]')).toHaveCount(0);
      await s.close();
    }
  });

  test('a doubtful sire: no claim about the sire or the trio is offered, and the page says why', async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const { page, ctx, errors } = await signAndAdd(browser, {
      ...ACCEPTED,
      'Conflicts with the sire': '4',
      'Sire outcome (0 accepted, 1 doubtful, 2 excluded)': '1',
      'Trio outcome (0 accepted, 1 doubtful, 2 excluded)': '1',
    });
    const panel = page.locator('[data-prove-number]');
    await expect(panel.locator('[data-parentage-unmet="sireConflicts"]')).toContainText(
      'not in the accepted band, so no claim about the sire is offered',
    );
    await panel.getByLabel('What to prove').click();
    // Not the sire, and not the trio: ICAR grades the trio only once both parents are accepted.
    await expect(page.getByRole('option')).toHaveText([OFFERS[1], OFFERS[3], OFFERS[4]]);
    await expect(panel.locator('[data-parentage-unmet="trioConflicts"]')).toContainText(
      'ICAR grades the trio only once both parents are accepted',
    );
    await page.keyboard.press('Escape');
    // Never "at most 5", the top of the doubtful band, anywhere on the panel.
    // (The bands line names it, in quotes, to say why it isn't offered.)
    await expect(panel).not.toContainText(/at most 5(?!”)/);
    await shot(page, 'parentage-panel-doubtful', '[data-prove-number]');
    expectNoErrors(errors);
    await ctx.close();
  });
});
