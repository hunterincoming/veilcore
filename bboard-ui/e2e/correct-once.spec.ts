// A record is corrected once, in the browser against the stand-in registry, at 360px:
//   - one record open in two tabs of one browser, the "Fix a mistake" form filled in both;
//   - tab A issues its correction; tab B then tries, and is refused inside the form (it checks
//     the registry right before saving), in its own language, with the way to the latest version;
//   - the registry holds one correction of the record, never two;
//   - the record's page then offers its latest version instead of "Fix a mistake".
// Run in English and in Japanese (tab B opened with ?lang=ja).
// NEW_SHOTS=<dir> saves the refusal at 360px, a small phone.
// SPDX-License-Identifier: Apache-2.0
import { randomBytes } from 'node:crypto';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
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

const PHONE = { width: 360, height: 740 };

/** Words tab B reads and clicks, in its language. */
const WORDS = {
  en: {
    fix: 'Fix a mistake',
    seeLatest: 'Corrected already: open the latest version',
    name: 'Cultivar name',
    check: 'Check what this affects',
    why: 'Why are you correcting this?',
    issue: 'Issue correction',
    refused:
      'This record was corrected already, in another tab or on another device. Open the latest version to correct it.',
    openLatest: 'Open the latest version',
    offline:
      'Correcting a record needs a connection: VeilCore first checks it wasn’t corrected in another tab or on another device. Nothing was changed. Try again when you’re online.',
  },
  ja: {
    fix: '間違いを直す',
    seeLatest: '訂正済み：最新版を開く',
    name: '品種名',
    check: '影響を確認する',
    why: 'なぜ訂正するのですか？',
    issue: '訂正を発行する',
    refused: 'この記録は、別のタブまたは別の端末ですでに訂正されています。訂正するには最新版を開いてください。',
    openLatest: '最新版を開く',
    offline:
      '記録の訂正には接続が必要です。VeilCoreはまず、別のタブや別の端末で訂正されていないかを確認します。何も変更していません。オンラインのときにもう一度お試しください。',
  },
} as const;

/** The stand-in registry can't be reached while `down` (its records can't be read). */
type Net = { down: boolean };

/** A tab in `ctx`, sending everything to the shared stand-in registry `held`. */
const tab = async (ctx: BrowserContext, held: { records: Rec[] }, vault: string, net: Net): Promise<Page> => {
  const page = await ctx.newPage();
  await page.setViewportSize(PHONE);
  await holdVaultKey(page, vault);
  await isolate(page, {
    'GET /api/records': (route) => (net.down ? route.abort('internetdisconnected') : json(route, 200, held.records)),
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
  return page;
};

/** The form on `page` filled with a new name and a reason, checked, ready to issue. */
const fillFix = async (page: Page, w: (typeof WORDS)[keyof typeof WORDS], name: string, why: string) => {
  await page.getByText(w.fix, { exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(w.name).fill(name);
  await dialog.getByRole('button', { name: w.check }).click();
  // What changed, in words: never a raw field path such as subject.name.
  await expect(dialog.locator('.MuiChip-root').first()).toBeVisible();
  await expect(dialog).not.toContainText(/subject\.|profileData\./);
  await dialog.getByLabel(w.why).fill(why);
  return dialog;
};

for (const lang of ['en', 'ja'] as const) {
  test(`two tabs correct one record: the second is refused in the form, at 360px (${lang})`, async ({ browser }) => {
    test.setTimeout(240_000);
    const w = WORDS[lang];
    const held = { records: [] as Rec[] };
    const net: Net = { down: false };
    const vault = newVaultKey();
    const ctx = await browser.newContext({ acceptDownloads: true });
    await ctx.addInitScript((h) => {
      if (!localStorage.getItem('veilcore.holder.v1')) localStorage.setItem('veilcore.holder.v1', h);
      localStorage.setItem('veilcore.role.v1', 'breeder');
    }, randomBytes(32).toString('hex'));

    // Tab A logs a plant (in English).
    const A = await tab(ctx, held, vault, net);
    const errorsA = watch(A);
    await A.goto('/new?lang=en');
    await startPlant(A);
    await A.getByLabel(/Plant or line name/).fill('Harbour Mist');
    await A.getByLabel(/Bred by/).fill('E2E breeder');
    await A.getByRole('button', { name: /Next: check it/ }).click();
    await A.getByRole('button', { name: /Seal it/ }).click();
    await A.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
    await A.getByRole('button', { name: /No report yet: skip/ }).click();
    await saveAndCheckBackup(A);
    await A.getByRole('button', { name: /Finish/ }).click();
    await expect(A.getByRole('heading', { name: 'Harbour Mist' })).toBeVisible();
    await expect.poll(() => held.records.length, { timeout: 30_000 }).toBe(1);
    const id = held.records[0].id;

    // Both tabs open the record and fill in the form.
    const B = await tab(ctx, held, vault, net);
    const errorsB = watch(B);
    await B.goto(`/record/${id}?lang=${lang}`);
    await expect(B.getByRole('heading', { name: 'Harbour Mist' })).toBeVisible();
    const formB = await fillFix(B, w, 'Harbour Mist B', 'typo (B)');

    await A.goto(`/record/${id}?lang=en`);
    const formA = await fillFix(A, WORDS.en, 'Harbour Mist A', 'typo (A)');

    // Tab A issues its correction.
    await formA.getByRole('button', { name: WORDS.en.issue }).click();
    await expect.poll(() => held.records.length, { timeout: 30_000 }).toBe(2);
    await expect(A).not.toHaveURL(new RegExp(`/record/${id}$`));
    const fromA = openRecordRows(held.records, vault).find((r) => r.id !== id)!;
    expect(fromA.strainName).toBe('Harbour Mist A');

    // Tab B, still showing the form it filled before, tries: refused inside the form.
    await formB.getByRole('button', { name: w.issue }).click();
    const refusal = formB.locator('[data-fix-corrected-already]');
    await expect(refusal).toBeVisible();
    await expect(refusal).toContainText(w.refused);
    // In view on a phone, not below the fold of the long form.
    await expect(refusal).toBeInViewport();
    // No way to send it again from here; the way on is the latest version.
    await expect(formB.getByRole('button', { name: w.issue })).toHaveCount(0);
    await expect(refusal.getByRole('button', { name: w.openLatest })).toBeVisible();
    const dir = process.env.NEW_SHOTS;
    if (dir) await B.screenshot({ path: `${dir}/correct-once-refused-${lang}-360.png` });

    // The registry holds one correction of the record, A's, and the original points to it.
    const rows = openRecordRows(held.records, vault);
    expect(rows).toHaveLength(2);
    const corrections = rows.filter((r) => (r.supersedes as { recordId?: string } | undefined)?.recordId === id);
    expect(corrections.map((r) => r.strainName)).toEqual(['Harbour Mist A']);
    expect(rows.find((r) => r.id === id)!.supersededBy).toBe(fromA.id);
    expect(rows.some((r) => r.strainName === 'Harbour Mist B')).toBe(false);

    // The way on: the latest version, A's correction.
    await refusal.getByRole('button', { name: w.openLatest }).click();
    await expect(B).toHaveURL(new RegExp(`/record/${fromA.id}`));
    await expect(B.getByRole('heading', { name: 'Harbour Mist A' })).toBeVisible();

    // The corrected record's own page offers its latest version, not "Fix a mistake".
    await B.goto(`/record/${id}?lang=${lang}`);
    await expect(B.getByText(w.seeLatest, { exact: true })).toBeVisible();
    await expect(B.getByText(w.fix, { exact: true })).toHaveCount(0);
    await B.getByText(w.seeLatest, { exact: true }).scrollIntoViewIfNeeded();
    if (dir) await B.screenshot({ path: `${dir}/correct-once-record-${lang}-360.png` });
    await B.getByText(w.seeLatest, { exact: true }).click();
    await expect(B).toHaveURL(new RegExp(`/record/${fromA.id}`));
    await expect(B.getByText(w.fix, { exact: true })).toBeVisible();

    // Offline, the latest version can't be corrected: VeilCore can't be asked whether another
    // tab or device corrected it first. Said in the form; nothing is made, kept or sent.
    net.down = true;
    const formOffline = await fillFix(B, w, 'Harbour Mist C', 'typo (offline)');
    await formOffline.getByRole('button', { name: w.issue }).click();
    const offline = formOffline.getByRole('alert');
    await expect(offline).toContainText(w.offline);
    await expect(offline).toBeInViewport();
    await expect(offline.getByRole('button', { name: w.openLatest })).toHaveCount(0);
    if (dir) await B.screenshot({ path: `${dir}/correct-once-offline-${lang}-360.png` });
    await expect(B).toHaveURL(new RegExp(`/record/${fromA.id}`));
    expect(held.records).toHaveLength(2);
    expect(await B.evaluate(() => localStorage.getItem('veilcore.outbox.v1') ?? '')).not.toContain('Harbour Mist C');
    net.down = false;

    expectNoErrors(errorsA);
    expectNoErrors(errorsB);
    await ctx.close();
  });
}
