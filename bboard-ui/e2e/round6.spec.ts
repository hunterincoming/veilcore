// Round 6 in a real browser (CONTRACT.md #33, #34, #36; the fifth review, sealed/report-round5.md),
// ported from the review's own proof (attack5.spec.ts):
//   - finding 3: with only the record id, a stranger got the exact SHA-256 of a lab-returned
//     report from GET /attestations/subject/:fp. Now the lab signs the report bound to the
//     record with a salt only the sender and the lab hold: the public answer has no hash a
//     file can be compared with, and the buyer with the holder's link and the file still sees
//     that the lab signed that file;
//   - finding 2: a genuine link forwarded with another name after the # showed that name as the
//     holder's. Now the check page says "This name does not match the record";
//   - finding 5: the holder's browser sent its holder key on a prove page and the check page.
//     Now no request carries it there (stand-in registry, so it runs the CI way too).
// All records and files are practice data.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { expect, test, type Request } from '@playwright/test';
import {
  API,
  REAL_REGISTRY,
  isolate,
  json,
  backupAfterLogging,
  receiveWithBackupFirst,
  expectNoErrors,
  watch,
  startPlant,
} from './helpers';

const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const b64u = (s: string) => Buffer.from(s, 'utf8').toString('base64url');

test.describe('round 6 against a real registry: the lab report hash and the name in a link', () => {
  test.skip(!REAL_REGISTRY, 'needs a real registry');

  test('finding 3: no public report hash; finding 2: a forged name is flagged; the file still checks', async ({
    browser,
  }) => {
    const tag = Date.now().toString(36);
    const NAME = `ZQXR6 ${tag}`;
    const report = Buffer.from(`%PDF-1.7\nround 6 genotype report ${tag} A12 B7 C3`);
    const seen: string[] = [];
    const watchAll = (p: import('@playwright/test').Page, who: string) =>
      p.on('request', (r) =>
        seen.push(`${who} ${r.method()} ${r.url()} ${JSON.stringify(r.headers())} ${r.postData() ?? ''}`),
      );

    // Breeder logs a plant and sends it to a lab.
    const bctx = await browser.newContext({ acceptDownloads: true });
    const breeder = await bctx.newPage();
    watchAll(breeder, 'breeder');
    await isolate(breeder);
    await breeder.goto('/records');
    await breeder.getByText('Start', { exact: true }).click();
    await startPlant(breeder);
    await breeder.getByLabel(/Plant or line name/).fill(NAME);
    await breeder.getByLabel(/Bred by/).fill('round6');
    await breeder.getByRole('button', { name: /Next: check it/ }).click();
    await breeder.getByRole('button', { name: /Seal it/ }).click();
    await breeder.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
    const recordId = await breeder.evaluate(
      () => Object.keys(JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as object)[0],
    );
    await backupAfterLogging(breeder, recordId);
    await breeder.goto(`/record/${recordId}`);
    await breeder.getByText('Send it to a lab or breeder').click();
    await breeder.getByLabel(/Who are you sending it to/).fill('lab@round6');
    await breeder.getByRole('button', { name: /Make a code for the lab/ }).click();
    const codeEl = breeder.getByText(/^TR-[0-9A-F]{8}\./);
    await expect(codeEl).toBeVisible();
    const code = (await codeEl.innerText()).trim();
    await breeder.getByRole('button', { name: /^Done$/ }).click();

    // Lab: key, receive, sign, send the report back.
    const lctx = await browser.newContext();
    const lab = await lctx.newPage();
    watchAll(lab, 'lab');
    await isolate(lab);
    await lab.goto('/records');
    await lab.getByRole('button', { name: "I'm a lab" }).click();
    await lab.getByRole('button', { name: /I run a lab/ }).click();
    await lab.getByRole('button', { name: /Set up your lab.s signature/ }).click();
    await lab.getByLabel(/^Name/).fill('Round6 Lab');
    await lab.getByRole('button', { name: /Create my key/ }).click();
    await lab.getByRole('button', { name: /^Done$/ }).click();
    await receiveWithBackupFirst(lab, code);
    await lab.getByLabel(/I physically received this material/).check();
    await lab.getByRole('button', { name: /Sign with my key/ }).click();
    await expect(lab).toHaveURL(/\/record\//);
    await lab.getByRole('button', { name: /^Send results back to the breeder/ }).click();
    const chooser = lab.waitForEvent('filechooser');
    await lab.getByRole('button', { name: /Choose the report/ }).click();
    await (await chooser).setFiles({ name: 'report.pdf', mimeType: 'application/pdf', buffer: report });
    const kind = lab.getByLabel('DNA report', { exact: true });
    if (await kind.count()) await kind.check();
    await lab.getByRole('button', { name: /Sign, lock and send/ }).click();
    await expect(lab.getByRole('heading', { name: /^Sent$/ })).toBeVisible();

    // Breeder saves it to the plant (the lab's signature matched with the delivery's salt) and
    // makes a share link with the name and "whether a DNA report is saved".
    await breeder.goto(`/record/${recordId}`);
    await breeder
      .getByRole('alert')
      .filter({ hasText: /lab report came back/ })
      .getByRole('button', { name: 'Open' })
      .click();
    await breeder.getByRole('button', { name: /Save it to this plant/ }).click();
    await breeder.getByRole('button', { name: /Save it to this plant/ }).click();
    await expect(breeder.getByText('PAIRING CODE', { exact: true })).toBeVisible();
    await expect(breeder.locator('[data-lab-match]')).toContainText('Round6 Lab');
    await breeder.getByRole('button', { name: /Back to the plant/ }).click();
    await breeder.getByRole('button', { name: /Show someone/ }).click();
    await breeder.getByLabel(/Whether a DNA report is saved/).check();
    await breeder.getByRole('button', { name: /Get the link/ }).click();
    await breeder.getByRole('switch', { name: 'Put the name in the link' }).check();
    const shareLink = await breeder.locator('input[readonly]').first().inputValue();
    const h = new URLSearchParams(new URL(shareLink).hash.slice(1));
    expect(h.get('ns')).toMatch(/^[0-9a-f]{64}$/);
    expect(h.get('ls')).toMatch(/^[0-9a-f]{64}$/);

    // Finding 3: a stranger with ONLY the record id. No hash a file can be compared with.
    const v = (await (await fetch(`${API}/verify/${recordId}`)).json()) as Record<string, unknown>;
    const fp = String(v.recordFingerprint);
    expect(v.nameCode).toMatch(/^[0-9a-f]{64}$/);
    const a = (await (await fetch(`${API}/attestations/subject/${fp}`)).json()) as {
      attestations: { type: string; attestationId: string; documentHash?: string }[];
    };
    const reports = a.attestations.filter((x) => x.type === 'laboratory-report');
    expect(reports).toHaveLength(1);
    expect(reports[0].attestationId).toMatch(/_ld1$/);
    expect(reports.map((x) => x.documentHash)).not.toContain(sha(report));
    expect(JSON.stringify(a)).not.toContain(sha(report));

    // Finding 2: the genuine link, forwarded with a different name.
    const FORGED = 'Gelato 41 (lab certified clone)';
    const forgedH = new URLSearchParams(h);
    forgedH.set('n', b64u(FORGED));
    const u = new URL(shareLink);
    const bctx2 = await browser.newContext();
    const buyer = await bctx2.newPage();
    watchAll(buyer, 'buyer');
    await isolate(buyer);
    await buyer.goto(`${u.pathname}${u.search}#${forgedH.toString()}`);
    await expect(buyer.getByText(/Lab.s receipt for a sample, signature verified in this browser/)).toBeVisible();
    await expect(buyer.locator('[data-name-check="differs"]')).toContainText(
      `This name does not match the record: ${FORGED}`,
    );
    await expect(buyer.locator('[data-holder-name]')).toHaveCount(0);
    // The holder's own link: the name matches, and with the file the lab's signature is tied to it.
    await buyer.goto(`${u.pathname}${u.search}${u.hash}`);
    await expect(buyer.locator('[data-holder-name]')).toHaveAttribute('data-name-check', 'matches');
    await expect(buyer.locator('[data-holder-name]')).toContainText(`Name matches the record: ${NAME}`);
    await expect(buyer.getByText(/Lab report, signature verified in this browser/)).toBeVisible();
    await buyer
      .locator('[data-dna-file]')
      .setInputFiles({ name: 'report.pdf', mimeType: 'application/pdf', buffer: report });
    await expect(buyer.locator('[data-dna-file-result]')).toHaveAttribute('data-dna-file-result', 'matches');
    await expect(buyer.getByText(/matches the lab report signed by/)).toBeVisible();

    // Nothing anyone typed, nor any salt, reached a server; the file's SHA-256 neither.
    const secrets = [NAME, b64u(NAME), h.get('ns') ?? '', h.get('ls') ?? '', h.get('ds') ?? '', b64u(FORGED)].filter(
      Boolean,
    );
    expect(seen.filter((x) => secrets.some((s) => x.includes(s)))).toEqual([]);
    expect(seen.filter((x) => x.includes(sha(report)))).toEqual([]);
    await bctx.close();
    await lctx.close();
    await bctx2.close();
  });
});

test.describe('round 6: no holder key on the prove and check pages (finding 5)', () => {
  test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

  test('a browser that holds records sends its holder key on the records page, and never on /prove or /verify', async ({
    page,
  }) => {
    const errors = watch(page);
    const KEY = 'ab'.repeat(32);
    const keyed: { path: string; url: string }[] = [];
    page.on('request', (r: Request) => {
      if (r.headers()['x-holder-key']) keyed.push({ path: new URL(page.url()).pathname, url: r.url() });
    });
    await page.addInitScript((k) => localStorage.setItem('veilcore.holder.v1', k), KEY);
    await isolate(page, {
      'GET /api/records': (route) => json(route, 200, []),
      'GET /api/licenses': (route) => json(route, 200, []),
      'GET /api/disclosures': (route) => json(route, 200, []),
      'GET /prove-requests/:id': (route) => json(route, 404, { error: 'no such request, or it has expired' }),
      'GET /verify/:record': (route) => json(route, 404, { found: false }),
    });
    // The app's own page: the sync asks with the holder key (a control).
    await page.goto('/records');
    await expect.poll(() => keyed.length).toBeGreaterThan(0);
    const before = keyed.length;

    // A prove request, opened fresh: nothing with the holder key, even when the tab gets focus.
    await page.goto(`/prove/PR-${'A'.repeat(32)}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.evaluate(() => dispatchEvent(new Event('focus')));
    await page.waitForTimeout(1_500);
    // The check page, reached from inside the app (the sync is already running).
    await page.goto('/records');
    await expect.poll(() => keyed.length).toBeGreaterThan(before);
    await page.evaluate(
      (path) => {
        history.pushState({}, '', path);
        dispatchEvent(new PopStateEvent('popstate'));
      },
      `/verify/VEIL-${'C'.repeat(32)}`,
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.evaluate(() => dispatchEvent(new Event('focus')));
    // Whatever code runs there, a request with the holder key is refused before it leaves.
    const refused = await page.evaluate(async () => {
      try {
        await fetch('/api/records', { headers: { 'x-holder-key': 'cd'.repeat(32) } });
        return 'sent';
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    });
    expect(refused).toBe('Not sent: this page never sends your holder key.');
    await page.waitForTimeout(1_500);
    expect(keyed.filter((k) => /^\/(prove|verify)\//.test(k.path))).toEqual([]);
    expectNoErrors(errors);
  });
});
