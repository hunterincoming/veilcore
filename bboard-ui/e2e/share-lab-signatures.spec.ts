// A lab's signatures on the holder's check link, against a REAL registry (E2E_API_BASE).
//
// Since 8 Nov 2026 the registry keeps a lab's receipts and reports about a record private:
// only the holder, the delivery's parties and the lab can read them. The holder chooses which
// to show on the check link (Show someone → "Lab signatures"), and the check page verifies
// those in the browser. Two cases: the holder shows nothing, and the page says so honestly
// (never "no lab signed"); the holder shows the one lab report, and the page shows it and no
// other. Then (12 Nov 2026) the shown report is read by the record's proof code too, as the claim
// check page reads it, and turning it off takes it away at once. Against a registry from before
// 8 Nov 2026 (every lab signature public) the same steps still work, and the page shows the
// signatures as it always did.
//
// E2E_SHOTS=<dir> saves the share control and both check pages at 360px, in English and Japanese.
// Skipped without a real registry.
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import {
  API,
  REAL_REGISTRY,
  backupAfterLogging,
  expectNoErrors,
  isolate,
  receiveWithBackupFirst,
  startPlant,
  untilSaved,
  watch,
} from './helpers';

test.skip(!REAL_REGISTRY, 'needs a real registry: set E2E_API_BASE and build with it');

const PHONE = { width: 360, height: 800 };
const shot = async (page: Page, name: string) => {
  if (process.env.E2E_SHOTS) await page.screenshot({ path: `${process.env.E2E_SHOTS}/${name}.png`, fullPage: true });
};
/** The screenshot in Japanese too: the page reloaded in that language, then back. */
const shotJa = async (page: Page, name: string, ready: () => Promise<void>) => {
  if (!process.env.E2E_SHOTS) return;
  await page.evaluate(() => localStorage.setItem('veilcore.lang', 'ja'));
  await page.reload();
  await ready();
  await shot(page, name);
  await page.evaluate(() => localStorage.setItem('veilcore.lang', 'en'));
  await page.reload();
};

type VerifyBody = {
  recordFingerprint?: string;
  sharedAttestations?: { attestationId: string; type: string }[];
  custody?: { receiptAttestationId?: string }[];
};

/** A stranger opens the holder's check link in a fresh phone-sized browser. */
const stranger = async (browser: Browser, link: string) => {
  const ctx = await browser.newContext({ viewport: PHONE });
  const page = await ctx.newPage();
  const errors = watch(page);
  await isolate(page);
  const asked: string[] = [];
  page.on('request', (q) => {
    if (q.headers()['x-holder-key']) asked.push(q.url());
  });
  const u = new URL(link);
  await page.goto(u.pathname + u.search + u.hash);
  await expect(page.getByText('Shared by the holder · reported by the registry')).toBeVisible();
  return { ctx, page, errors, asked };
};

test('the holder shows no lab signature, then one lab report: the check page says exactly that', async ({
  browser,
}) => {
  const u = Date.now().toString(36).toUpperCase();
  const report = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.from(`Share report ${u} markers A12 B7`)]);

  // The breeder logs a plant and sends it to a lab, with the sample's label and seal.
  const breederCtx = await browser.newContext({ acceptDownloads: true, viewport: PHONE });
  const breeder = await breederCtx.newPage();
  const breederErrors = watch(breeder);
  await isolate(breeder);
  await breeder.goto('/records');
  await breeder.getByText('Start', { exact: true }).click();
  await startPlant(breeder);
  await breeder.getByLabel(/Plant or line name/).fill(`E2E Share ${u}`);
  await breeder.getByLabel(/Bred by/).fill('E2E');
  await breeder.getByRole('button', { name: /Next: check it/ }).click();
  await breeder.getByRole('button', { name: /Seal it/ }).click();
  await breeder.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
  const recordId = await breeder.evaluate(
    () => Object.keys(JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as object)[0],
  );
  await backupAfterLogging(breeder, recordId);
  await breeder.goto(`/record/${recordId}`);
  await breeder.getByText('Send it to a lab or breeder').click();
  await breeder.getByLabel(/Who are you sending it to/).fill('lab@e2e');
  await breeder.getByRole('button', { name: /Add the sample.s label and seal/ }).click();
  await breeder.getByLabel(/Sample ID \/ label on the tube or bag/).fill(`S-${u}`);
  await breeder.getByLabel(/Seal or bag number/).fill(`4471${u}`);
  await breeder.getByRole('button', { name: /Make a code for the lab/ }).click();
  const codeEl = breeder.getByText(/^TR-[0-9A-F]{8}\./);
  await expect(codeEl).toBeVisible();
  const code = (await codeEl.innerText()).trim();
  await breeder.getByRole('button', { name: /^Done$/ }).click();

  // The lab signs its receipt and locks a DNA report back.
  const labCtx = await browser.newContext();
  const lab = await labCtx.newPage();
  const labErrors = watch(lab);
  await isolate(lab);
  await lab.goto('/records');
  await lab.getByRole('button', { name: "I'm a lab" }).click();
  await lab.getByRole('button', { name: /I run a lab/ }).click();
  await lab.getByRole('button', { name: /Set up your lab.s signature/ }).click();
  await lab.getByLabel(/^Name/).fill('E2E Lab');
  await lab.getByRole('button', { name: /Create my key/ }).click();
  await lab.getByRole('button', { name: /^Done$/ }).click();
  await receiveWithBackupFirst(lab, code);
  await lab.getByLabel('Yes', { exact: true }).check();
  await lab.getByLabel(/I physically received this material/).check();
  await lab.getByRole('button', { name: /Sign with my key/ }).click();
  await expect(lab).toHaveURL(/\/record\//);
  await untilSaved(lab, new URL(lab.url()).pathname.split('/').pop() ?? '');
  await lab.getByRole('button', { name: /^Send results back to the breeder/ }).click();
  const chooser = lab.waitForEvent('filechooser');
  await lab.getByRole('button', { name: /Choose the report/ }).click();
  await (await chooser).setFiles({ name: 'report.pdf', mimeType: 'application/pdf', buffer: report });
  await lab.getByLabel('DNA report', { exact: true }).check();
  await lab.getByRole('button', { name: /Sign, lock and send/ }).click();
  await expect(lab.getByRole('heading', { name: /^Sent$/ })).toBeVisible();

  // The breeder saves the report to the plant.
  await breeder.goto(`/record/${recordId}`);
  await breeder
    .getByRole('alert')
    .filter({ hasText: /lab report came back/ })
    .getByRole('button', { name: 'Open' })
    .click();
  await breeder.getByRole('button', { name: /Save it to this plant/ }).click();
  await expect(breeder.getByRole('heading', { name: /Save your DNA report to this plant/ })).toBeVisible();
  await breeder.getByRole('button', { name: /Save it to this plant/ }).click();
  await expect(breeder.locator('[data-lab-match]')).toContainText('signed by a key named “E2E Lab”');
  await breeder.getByRole('button', { name: /Back to the plant/ }).click();
  await expect(breeder.locator('[data-status-row="DNA report"]')).toContainText('Tied to the plant');

  // Which registry this is: one that keeps lab signatures private, or one from before.
  const fp = ((await (await fetch(`${API}/verify/${recordId}`)).json()) as VerifyBody).recordFingerprint ?? '';
  expect(fp).toMatch(/^[0-9a-f]{64}$/);
  const open = (await (await fetch(`${API}/attestations/subject/${fp}`)).json()) as {
    attestations: { type: string }[];
  };
  const labPrivate = !open.attestations.some((a) => a.type === 'chain-of-custody' || a.type === 'laboratory-report');
  test
    .info()
    .annotations.push({ type: 'registry', description: labPrivate ? 'lab signatures private' : 'before 8 Nov' });

  // 1. Show someone, with "Whether a DNA report is saved" on and no lab signature shown.
  await breeder.getByRole('button', { name: /Show someone/ }).click();
  const section = breeder.locator('[data-lab-share-section]');
  await expect(section.locator('[data-lab-share-needs-status]')).toBeVisible();
  await breeder.getByLabel(/Whether a DNA report is saved/).check();
  // What that switch shows even with no signature turned on, said next to it (12 Nov 2026).
  await expect(breeder.locator('[data-custody-note]')).toHaveText(
    'If on, the check page also shows, for each receipt a lab signed for a sample from this record, that a lab received a sample (not which lab) and whether what arrived matches what was sent.',
  );
  await expect(section).toContainText('only you, the lab and whoever sent it the sample can see them');
  await expect(section).toContainText('without the lab’s name');
  // The lab's receipt and its report, each off until the holder turns it on.
  await expect(section.locator('[data-lab-share]')).toHaveCount(2);
  for (const s of await section.getByRole('switch').all()) await expect(s).not.toBeChecked();
  await expect(section).toContainText(
    'Show that a key named “E2E Lab” (name not checked) signed this on your check link',
  );
  await expect(section).toContainText(/Receipt for a sample, signed /);
  await expect(section).toContainText(/Lab report, signed /);
  // The report matching the saved DNA report is suggested (the link carries its lab salt).
  const suggest = section.locator('[data-lab-share-suggest]');
  await expect(suggest).toContainText('Your saved DNA report matches a lab report signed by');
  await section.scrollIntoViewIfNeeded();
  await shot(breeder, 'share-control-en');
  await shotJa(breeder, 'share-control-ja', async () => {
    await breeder.getByRole('button', { name: /誰かに見せる/ }).click();
    await breeder.getByLabel(/DNA報告書が保存されているか/).check();
    await expect(breeder.locator('[data-lab-share-section] [data-lab-share]')).toHaveCount(2);
  });
  if (process.env.E2E_SHOTS) {
    await breeder.getByRole('button', { name: /Show someone/ }).click();
    await breeder.getByLabel(/Whether a DNA report is saved/).check();
    await expect(section.locator('[data-lab-share]')).toHaveCount(2);
  }
  await breeder.getByRole('button', { name: /Get the link/ }).click();
  const linkNone = await breeder.locator('input[readonly]').first().inputValue();
  {
    const v = (await (await fetch(`${API}/verify/${recordId}`)).json()) as VerifyBody;
    expect(v.sharedAttestations).toBeUndefined();
    if (labPrivate) expect(v.custody?.every((c) => c.receiptAttestationId === undefined)).toBe(true);
  }
  {
    const s = await stranger(browser, linkNone);
    await s.page
      .locator('[data-dna-file]')
      .setInputFiles({ name: 'sent.pdf', mimeType: 'application/pdf', buffer: report });
    await expect(s.page.locator('[data-dna-file-result]')).toHaveAttribute('data-dna-file-result', 'matches');
    const text = () => s.page.locator('main').innerText();
    if (labPrivate) {
      // Honest: nothing shown, and why; never "no lab signed".
      await expect(s.page.locator('[data-none-shown]')).toHaveText(
        'The holder hasn’t shown any lab signatures here. A lab’s receipts and reports are private unless the holder chooses to show them.',
      );
      await expect(s.page.getByText(/signature verified in this browser/)).toHaveCount(0);
      // The custody line is still said, without the lab.
      await expect(s.page.locator('[data-unnamed-custody]')).toHaveText(
        'A lab’s receipt for a sample from this record, as the registry reports it. The holder hasn’t shown which lab signed it.',
      );
      await expect(s.page.locator('[data-public-custody]')).toContainText('The lab’s receipt names sample details.');
      expect(await text()).toContain(
        'No lab signature shown here matches it, so as shown it is the holder’s own statement.',
      );
      expect(await text()).not.toContain('E2E Lab');
    } else {
      await expect(s.page.getByText(/Lab.s receipt for a sample, signature verified in this browser/)).toBeVisible();
    }
    expect(await text()).not.toMatch(/has been signed about this record|No lab has signed/);
    expect(s.asked).toEqual([]);
    await shot(s.page, 'share-check-none-en');
    await shotJa(s.page, 'share-check-none-ja', async () => {
      await expect(s.page.getByText('保有者が共有 · レジストリの報告')).toBeVisible();
      if (labPrivate) await expect(s.page.locator('[data-none-shown]')).toBeVisible();
      await s.page.waitForTimeout(1_500);
    });
    expectNoErrors(s.errors);
    await s.ctx.close();
  }

  // 2. The holder shows the lab report only, from the suggestion.
  await breeder.goto(`/record/${recordId}`);
  await breeder.getByRole('button', { name: /Show someone/ }).click();
  await expect(breeder.getByLabel(/Whether a DNA report is saved/)).toBeChecked();
  await expect(section.locator('[data-lab-share]')).toHaveCount(2);
  const reportId = (await suggest.getAttribute('data-lab-share-suggest')) ?? '';
  expect(reportId).toMatch(/^att_[0-9a-f]{16}_ld1/);
  await suggest.getByRole('button', { name: 'Show it' }).click();
  await expect(suggest).toHaveCount(0);
  await expect(section.locator(`[data-lab-share="${reportId}"]`).getByRole('switch')).toBeChecked();
  await shot(breeder, 'share-control-on-en');
  await breeder.getByRole('button', { name: /Get the link/ }).click();
  const linkOne = await breeder.locator('input[readonly]').first().inputValue();
  {
    const v = (await (await fetch(`${API}/verify/${recordId}`)).json()) as VerifyBody;
    if (labPrivate) {
      expect(v.sharedAttestations?.map((a) => [a.attestationId, a.type])).toEqual([[reportId, 'laboratory-report']]);
      // The receipt isn't shown, so its custody line still names none.
      expect(v.custody?.every((c) => c.receiptAttestationId === undefined)).toBe(true);
    }
  }
  {
    const s = await stranger(browser, linkOne);
    await expect(s.page.getByText(/Lab report, signature verified in this browser/)).toBeVisible();
    await s.page
      .locator('[data-dna-file]')
      .setInputFiles({ name: 'sent.pdf', mimeType: 'application/pdf', buffer: report });
    await expect(
      s.page.getByText(/Its file \(SHA-256 [0-9a-f]{8}…[0-9a-f]{6}\) matches the lab report signed by/),
    ).toBeVisible();
    if (labPrivate) {
      // That one and no other: not the receipt, which the holder didn't show.
      await expect(s.page.getByText(/signature verified in this browser/)).toHaveCount(1);
      await expect(s.page.getByText(/Lab.s receipt for a sample, signature verified/)).toHaveCount(0);
      await expect(s.page.locator('[data-none-shown]')).toHaveCount(0);
      await expect(s.page.locator('[data-unnamed-custody]')).toHaveCount(1);
    }
    expect(s.asked).toEqual([]);
    await shot(s.page, 'share-check-one-en');
    await shotJa(s.page, 'share-check-one-ja', async () => {
      await expect(s.page.getByText('保有者が共有 · レジストリの報告')).toBeVisible();
      await s.page.waitForTimeout(1_500);
    });
    expectNoErrors(s.errors);
    await s.ctx.close();
  }

  // 3. By proof code (12 Nov 2026, the claim check page names a plant only by it): the report the
  // holder shows is read there too, the receipt not; turned off, it is gone at once.
  const labOnCode = async () =>
    (
      (await (await fetch(`${API}/attestations/subject/${fp}`)).json()) as {
        attestations: { attestationId: string; type: string }[];
      }
    ).attestations
      .filter((a) => a.type === 'chain-of-custody' || a.type === 'laboratory-report')
      .map((a) => a.attestationId);
  const health = (await (await fetch(`${API}/health`)).json()) as { features?: string[] };
  if (labPrivate && health.features?.includes('shared-by-proof-code-v1')) {
    expect(await labOnCode()).toEqual([reportId]);
    await breeder.goto(`/record/${recordId}`);
    await breeder.getByRole('button', { name: /Show someone/ }).click();
    const sw = section.locator(`[data-lab-share="${reportId}"]`).getByRole('switch');
    await expect(sw).toBeChecked();
    await sw.uncheck();
    await breeder.getByRole('button', { name: /Get the link/ }).click();
    await expect(breeder.locator('input[readonly]').first()).toBeVisible();
    await expect.poll(labOnCode).toEqual([]);
    const v = (await (await fetch(`${API}/verify/${recordId}`)).json()) as VerifyBody;
    expect(v.sharedAttestations).toBeUndefined();
  } else if (!labPrivate) {
    // Before 8 Nov 2026 every lab signature was public by proof code.
    expect((await labOnCode()).length).toBeGreaterThanOrEqual(2);
  }

  expectNoErrors(breederErrors);
  expectNoErrors(labErrors);
  await breederCtx.close();
  await labCtx.close();
});
