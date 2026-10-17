// The whole journey against a REAL registry (E2E_API_BASE, see e2e/README.md): log a plant,
// share it, a checker asks by link, the holder opens it, an answer comes back. Skipped when
// no registry is given (CI uses the stand-in tests in site.spec.ts). The Midnight network
// and the sponsor are still blocked: the date stamp is put in place by the test, as the
// network would, and the answer is checked only as far as "not on the network yet".
// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  API,
  REAL_REGISTRY,
  expectNoErrors,
  isolate,
  watch,
  backupAfterLogging,
  receiveWithBackupFirst,
  saveAndCheckBackup,
  untilSaved,
} from './helpers';

/** Screenshots for people to look at, when E2E_SHOTS names a folder. */
const shot = async (page: Page, name: string) => {
  if (process.env.E2E_SHOTS) await page.screenshot({ path: `${process.env.E2E_SHOTS}/${name}.png`, fullPage: true });
};

test.skip(!REAL_REGISTRY, 'needs a real registry: set E2E_API_BASE and build with it');

/** A key the holder controls that this plant's record never named. */
const OTHER_KEY = 'e2'.repeat(32);
const ANCHOR_TX = 'a8'.repeat(32);
/** The plant's key, commit(record secret): SHA-256 over the padded tag and the secret. */
const identityOf = (secret: string) => {
  const t = Buffer.alloc(32);
  t.write('veilcore:v1:commit', 'utf8');
  return createHash('sha256')
    .update(Buffer.concat([t, Buffer.from(secret, 'hex')]))
    .digest('hex');
};

test('log, share, ask by link, open as the holder, answer arrives', async ({ browser }) => {
  // The holder.
  const holderCtx = await browser.newContext();
  const holder = await holderCtx.newPage();
  const holderErrors = watch(holder);
  await isolate(holder);
  await holder.goto('/records');
  // A fresh browser is asked who it is; the question can open a moment after the page, so
  // wait for it rather than checking once (that raced and the dialog then blocked "Start").
  await holder.getByRole('button', { name: /I breed or hold genetics/ }).click();
  await holder.getByText('Start', { exact: true }).click();
  const name = `E2E ${Date.now()}`;
  await holder.getByLabel(/Plant or line name/).fill(name);
  await holder.getByLabel(/Bred by/).fill('E2E');
  await holder.getByRole('button', { name: /Next: check it/ }).click();
  await holder.getByRole('button', { name: /Seal it/ }).click();
  // The network is blocked, so the date stamp can't go out: it must say so plainly.
  await expect(holder.getByText(/Couldn.t reach the network/)).toBeVisible({ timeout: 90_000 });
  await expect(holder.getByText(/Your plant is saved/)).toBeVisible();
  // ...and never leave them stuck: they can carry on and save the backup.
  await holder.getByRole('button', { name: /Do the date stamp later/ }).click();
  await holder.getByRole('button', { name: /No report yet: skip/ }).click();
  await expect(holder.getByRole('button', { name: /Save backup file/ })).toBeVisible();

  const [recordId, secret] = await holder.evaluate(() => {
    const all = JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as Record<
      string,
      { recordSecret: string }
    >;
    const id = Object.keys(all)[0];
    return [id, all[id]?.recordSecret ?? ''];
  });
  expect(recordId).toMatch(/^VEIL-/);
  // Saved on the registry only once the backup holding its key is checked (round 3, L1).
  await saveAndCheckBackup(holder);
  await untilSaved(holder, recordId);
  // The key was made before sealing, and the sealed record names it.
  const IDENTITY = identityOf(secret);
  // What the network would have done: the record's identity anchored.
  await holder.evaluate(
    ({ recordId, identity, tx }) => {
      const all = JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as Record<string, object>;
      all[recordId] = {
        ...all[recordId],
        anchor: {
          identity,
          network: 'preview',
          contractAddress: '0'.repeat(64),
          txId: tx,
          txHash: tx,
          blockHeight: 1,
        },
      };
      localStorage.setItem('veilcore.record-keys.v1', JSON.stringify(all));
    },
    { recordId, identity: IDENTITY, tx: ANCHOR_TX },
  );

  // Share it, with the date stamp in the link.
  await holder.goto(`/record/${recordId}`);
  await holder.getByRole('button', { name: /Show someone/ }).click();
  await holder.getByRole('button', { name: /Get the link/ }).click();
  // The name is in a link only when the holder switches it on (persona review, 17 Oct).
  await holder.getByRole('switch', { name: 'Put the name in the link' }).check();
  await expect(holder.getByLabel(/Let them check the date stamp/)).toBeChecked();
  const link = await holder.locator('input[readonly]').first().inputValue();
  expect(link).toContain(`chain=${IDENTITY}`);
  expect(link).toContain(`anchorTx=${ANCHOR_TX}`);
  // What ties the key to the record: its salt and the hash of the sealed details.
  expect(link).toMatch(/[#&]ks=[0-9a-f]{64}/);
  expect(link).toMatch(/[#&]cd=[0-9a-f]{64}/);
  // Round 4 (F7): what joins the record to its key is in the fragment, which no server gets.
  expect(new URL(link).search).not.toMatch(/chain=|anchorTx=|ks=|cd=|rs=/);
  expect(new URL(link).hash).toContain(`chain=${IDENTITY}`);
  const path = new URL(link).pathname + new URL(link).search + new URL(link).hash;

  // The checker, in another browser.
  const checkerCtx = await browser.newContext();
  const checker = await checkerCtx.newPage();
  const checkerErrors = watch(checker);
  await isolate(checker);
  // A link with another key put in: refused by the check page, nothing asked.
  await checker.goto(path.replace(`chain=${IDENTITY}`, `chain=${OTHER_KEY}`));
  await expect(checker.getByText(name)).toBeVisible();
  await expect(checker.getByText(/The key in this link isn.t the one this record names/)).toBeVisible();
  await expect(checker.getByRole('button', { name: /Make a link to send them/ })).toHaveCount(0);
  // The registry says the record names its key, so a link with the parts cut off is refused too.
  await checker.goto(path.replace(/&ks=[0-9a-f]{64}/, '').replace(/&cd=[0-9a-f]{64}/, ''));
  await expect(checker.getByText(/names its own key, but this link leaves out/)).toBeVisible();

  await checker.goto(path);
  await expect(checker.getByText(name)).toBeVisible();
  await expect(checker.getByText(/This record named its own key when it was sealed/)).toBeVisible();
  await checker.getByLabel(/Your name or business/).fill('E2E Lab');
  await checker.getByRole('button', { name: /Make a link to send them/ }).click();
  const proveLink = (await checker.getByText(/\/prove\/PR-/).innerText()).trim();
  // The id, and the answer token in the fragment (16 bytes, base64url: 22 characters).
  const parts = /\/prove\/(PR-[0-9A-F]{32})#t=([A-Za-z0-9_-]{22})/.exec(proveLink);
  expect(parts, 'the link carries its id and answer token').toBeTruthy();
  const [, id, token] = parts!;

  // The holder opens it, the whole link.
  await holder.goto(`/prove/${id}#t=${token}`);
  await expect(holder.getByRole('heading', { name: new RegExp(`Prove you hold ${name}`) })).toBeVisible();
  await expect(holder.getByText(/E2E Lab/)).toBeVisible();

  // An answer arrives at the registry (the real one would come from Prove it).
  const posted = await fetch(`${API}/prove-requests/${id}/answers`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ txId: 'cd'.repeat(32), token }),
  });
  expect(posted.status).toBe(200);
  await expect(checker.getByText(/hasn.t shown it yet/)).toBeVisible({ timeout: 60_000 });

  // The checker comes back later in a new tab: the same link shows their request.
  const again = await checkerCtx.newPage();
  await isolate(again);
  await again.goto(`/prove/${id}`);
  await expect(again.getByRole('heading', { name: /Your request/ })).toBeVisible();

  expectNoErrors(holderErrors);
  expectNoErrors(checkerErrors);
  await holderCtx.close();
  await checkerCtx.close();
});

test('a lab sends results back: signed by the lab, locked for the breeder, opened only by them', async ({
  browser,
}) => {
  /**
   * Round 6: what a stranger's check page says about the saved lab report, opened from a
   * link in a fresh browser. The page describes the file saved NOW (the registry's answer),
   * whatever the link was made with.
   */
  const buyerLine = async (path: string, name: string, file?: Buffer) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const errors = watch(page);
    await isolate(page);
    await page.goto(path);
    await expect(page.getByText('Shared by the holder · reported by the registry')).toBeVisible();
    // Wait for the signatures to be checked: the lab's receipt always has a line.
    await expect(page.getByText(/Lab.s receipt for a sample, signature verified in this browser/)).toBeVisible();
    // Round 6 (CONTRACT.md #34): a lab signs the report bound to the record, so which report it
    // signed is told only with the file the holder sent and the salt in the holder's link.
    if (file) {
      await page
        .locator('[data-dna-file]')
        .setInputFiles({ name: 'sent.pdf', mimeType: 'application/pdf', buffer: file });
      await expect(page.locator('[data-dna-file-result]')).toBeVisible();
    }
    const text = await page.locator('main').innerText();
    await shot(page, name);
    expectNoErrors(errors);
    await ctx.close();
    return text;
  };
  const report = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.from(`E2E report ${Date.now()} markers A12 B7`)]);

  // The breeder logs a plant and sends it to a lab.
  const breederCtx = await browser.newContext({ acceptDownloads: true });
  const breeder = await breederCtx.newPage();
  const breederErrors = watch(breeder);
  await isolate(breeder);
  await breeder.goto('/records');
  await breeder.getByRole('button', { name: /I breed or hold genetics/ }).click();
  await breeder.getByText('Start', { exact: true }).click();
  const name = `E2E Lab Run ${Date.now()}`;
  await breeder.getByLabel(/Plant or line name/).fill(name);
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
  await breeder.getByRole('button', { name: /Make a code for the lab/ }).click();
  const codeEl = breeder.getByText(/^TR-[0-9A-F]{8}\./);
  await expect(codeEl).toBeVisible();
  // TR-id . claim code . the plant's lock . o1 + the offer key (sealed records, CONTRACT.md #8).
  const code = /^TR-[0-9A-F]{8}\.[0-9a-f]{32}\.age1[02-9ac-hj-np-z]{58}\.o1[A-Za-z0-9_-]{43}$/.exec(
    (await codeEl.innerText()).trim(),
  )?.[0];
  expect(code, 'the lab code carries the plant’s lock and the offer key').toBeTruthy();
  await breeder.getByRole('button', { name: /^Done$/ }).click();

  // The lab: its signature, then the delivery.
  const labCtx = await browser.newContext();
  const lab = await labCtx.newPage();
  const labErrors = watch(lab);
  await isolate(lab);
  await lab.goto('/records');
  await lab.getByRole('button', { name: /I run a lab/ }).click();
  await lab.getByRole('button', { name: /Set up your lab.s signature/ }).click();
  await lab.getByLabel(/^Name/).fill('E2E Lab');
  await lab.getByRole('button', { name: /Create my key/ }).click();
  await lab.getByRole('button', { name: /^Done$/ }).click();
  await receiveWithBackupFirst(lab, code!);
  await lab.getByLabel(/I physically received this material/).check();
  await lab.getByRole('button', { name: /Sign with my key/ }).click();
  await expect(lab).toHaveURL(/\/record\//);
  const labPlantUrl = new URL(lab.url()).pathname;

  // The lab sends the result back.
  await lab.getByRole('button', { name: /^Send results back to the breeder/ }).click();
  const chooser = lab.waitForEvent('filechooser');
  await lab.getByRole('button', { name: /Choose the report/ }).click();
  await (await chooser).setFiles({ name: 'report.pdf', mimeType: 'application/pdf', buffer: report });
  await shot(lab, 'lab-1-send');
  // The lab says what kind of report it is (persona review, 17 Oct).
  await lab.getByLabel('DNA report', { exact: true }).check();
  await lab.getByRole('button', { name: /Sign, lock and send/ }).click();
  await expect(lab.getByRole('heading', { name: /^Sent$/ })).toBeVisible();
  await shot(lab, 'lab-2-sent');

  // What the registry holds can't be read.
  const transferId = code!.split('.')[0];
  const listed = await fetch(`${API}/transfers/${transferId}/results`, {
    headers: {
      'x-holder-key': await breeder.evaluate(() => localStorage.getItem('veilcore.holder.v1') ?? ''),
    },
  });
  expect(listed.status).toBe(200);
  {
    const { results } = (await listed.json()) as { results: { id: string }[] };
    const stored = await fetch(`${API}/transfers/${transferId}/results/${results[0].id}`, {
      headers: {
        'x-holder-key': await breeder.evaluate(() => localStorage.getItem('veilcore.holder.v1') ?? ''),
      },
    });
    const bytes = Buffer.from(await stored.arrayBuffer());
    expect(bytes.subarray(0, 21).toString()).toBe('age-encryption.org/v1');
    expect(bytes.includes(Buffer.from('markers'))).toBe(false);
  }

  // The breeder's plant: the lab's receipt, linked to this delivery, named as unchecked.
  await breeder.goto(`/record/${recordId}`);
  await expect(breeder.getByText('Receipt signed', { exact: true })).toBeVisible();
  await expect(breeder.getByText('by a key named “E2E Lab” (name not checked)', { exact: true })).toBeVisible();
  await expect(breeder.getByText(/Confirmed by a lab/)).toHaveCount(0);

  // The breeder opens it.
  await breeder
    .getByRole('alert')
    .filter({ hasText: /lab report came back/ })
    .getByRole('button', { name: 'Open' })
    .click();
  await expect(breeder.getByText(/Signed by a key named “E2E Lab” \(name not checked\)/)).toBeVisible();
  await expect(breeder.getByText(/The same key signed the receipt for this delivery/)).toBeVisible();
  await shot(breeder, 'breeder-2-opened');
  const [dl] = await Promise.all([
    breeder.waitForEvent('download'),
    breeder.getByRole('button', { name: /Download the file/ }).click(),
  ]);
  const saved = await dl.createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of saved) chunks.push(c as Buffer);
  expect(Buffer.concat(chunks)).toEqual(report);
  // Round 5: the download names its local time and the report's short id, shown on the list too.
  expect(dl.suggestedFilename()).toMatch(/^Lab report \d{4}-\d{2}-\d{2} \d{2}-\d{2} LR-[0-9A-F]{4}\.pdf$/);
  const shortId = /LR-[0-9A-F]{4}/.exec(dl.suggestedFilename())![0];
  // Round 6: the list says what type the file is, worked out from its bytes.
  await expect(breeder.getByText(/^PDF · file SHA-256 /)).toBeVisible();
  await expect(breeder.getByText(new RegExp(`From lab@e2e · ${shortId}`))).toBeVisible();
  await breeder.getByRole('button', { name: /Save it to this plant/ }).click();
  // Its own screen, with the file already chosen: one press saves it.
  await expect(breeder.getByRole('heading', { name: /Save your DNA report to this plant/ })).toBeVisible();
  await expect(breeder.getByRole('button', { name: /Save it to this plant/ })).toBeEnabled();
  await breeder.getByRole('button', { name: /Save it to this plant/ }).click();
  // Two codes, each named; the saved file is matched to the lab's signature by SHA-256.
  await expect(breeder.getByText('PAIRING CODE', { exact: true })).toBeVisible();
  const reportSha = createHash('sha256').update(report).digest('hex');
  await expect(breeder.getByText(new RegExp(`File SHA-256: ${reportSha.slice(0, 12)}`))).toBeVisible();
  await expect(breeder.locator('[data-lab-match]')).toContainText('signed by a key named “E2E Lab”');
  await breeder.getByRole('button', { name: /Back to the plant/ }).click();
  await expect(breeder.locator('[data-status-row="DNA report"]')).toContainText('Tied to the plant');
  await expect(breeder.locator('[data-status-row="DNA report"]')).toContainText(
    'DNA report signed by a key named “E2E Lab”',
  );

  // The buyer's page: the saved report matches a report the lab signed; no "Not confirmed by a lab".
  await breeder.getByRole('button', { name: /Show someone/ }).click();
  // Off until the holder turns it on (round 3, P7): it publishes the DNA report, bound (round 5).
  const dnaSwitch = breeder.getByLabel(/Whether a DNA report is saved/);
  await expect(dnaSwitch).not.toBeChecked();
  await dnaSwitch.check();
  await breeder.getByRole('button', { name: /Get the link/ }).click();
  await breeder.getByRole('switch', { name: 'Put the name in the link' }).check();
  const shareLink = await breeder.locator('input[readonly]').first().inputValue();
  // Round 5 (CONTRACT.md #29): the link carries the record's pairing salt after the #, never
  // the report's SHA-256; the registry has the report only bound with that salt.
  expect(new URL(shareLink).hash).toMatch(/(^#|&)ds=[0-9a-f]{64}(&|$)/);
  // Round 6: the name's salt (#33) and the lab report's salt (#34) go after the # too.
  expect(new URL(shareLink).hash).toMatch(/(^#|&)ns=[0-9a-f]{64}(&|$)/);
  expect(new URL(shareLink).hash).toMatch(/(^#|&)ls=[0-9a-f]{64}(&|$)/);
  expect(shareLink).not.toContain(reportSha);
  expect(new URL(shareLink).search).not.toMatch(/ds=|rs=/);
  // The link made now, kept for later (an "older link"), and the certificate's (fingerprint only).
  const oldLink = new URL(shareLink).pathname + new URL(shareLink).search + new URL(shareLink).hash;
  const certLink = `${new URL(shareLink).pathname}?fp=${new URL(shareLink).searchParams.get('fp')}`;
  const correctedSha = createHash('sha256')
    .update(Buffer.concat([report, Buffer.from(' corrected')]))
    .digest('hex');
  const shortOf = (h: string) => `${h.slice(0, 8)}…${h.slice(-6)}`;
  {
    const buyerCtx = await browser.newContext();
    const buyer = await buyerCtx.newPage();
    const buyerErrors = watch(buyer);
    await isolate(buyer);
    await buyer.goto(new URL(shareLink).pathname + new URL(shareLink).search + new URL(shareLink).hash);
    await expect(buyer.getByText(/Lab.s receipt for a sample, signature verified in this browser/)).toBeVisible();
    // The lab's signature names no file (round 6): nothing about the report is printed for it.
    await expect(buyer.getByText(/Lab report, signature verified in this browser/)).toBeVisible();
    await expect(buyer.getByText(/file SHA-256/)).toHaveCount(0);
    // With the file the holder sent: it is the saved report, and the one the lab signed.
    await buyer
      .locator('[data-dna-file]')
      .setInputFiles({ name: 'sent.pdf', mimeType: 'application/pdf', buffer: report });
    await expect(
      buyer.getByText(/Its file \(SHA-256 [0-9a-f]{8}…[0-9a-f]{6}\) matches the lab report signed by/),
    ).toBeVisible();
    await expect(buyer.getByText(/Not confirmed by a lab/)).toHaveCount(0);
    await shot(buyer, 'buyer-1-saved-report-matches');
    await expect(
      buyer.getByText(/2 signatures about it \((a lab’s receipt, a lab report|a lab report, a lab’s receipt)\)/),
    ).toBeVisible();
    expectNoErrors(buyerErrors);
    await buyerCtx.close();
  }

  // The lab corrects it, then withdraws the correction (round 3): the old report stays
  // replaced, its file withdrawn at the registry, and nothing is live.
  await lab.reload();
  await lab.getByRole('button', { name: /^Send results back to the breeder/ }).click();
  await lab.getByRole('button', { name: /Send a corrected file/ }).click();
  const chooser2 = lab.waitForEvent('filechooser');
  await lab.getByRole('button', { name: /Choose the corrected file/ }).click();
  await (
    await chooser2
  ).setFiles({
    name: 'report-v2.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.concat([report, Buffer.from(' corrected')]),
  });
  // The lab says what kind of report it is (persona review, 17 Oct).
  await lab.getByLabel('DNA report', { exact: true }).check();
  await lab.getByRole('button', { name: /Sign, lock and send/ }).click();
  await expect(lab.getByRole('heading', { name: /^Sent$/ })).toBeVisible();
  await expect(lab.getByRole('button', { name: /Back to the plant/ })).toHaveCount(1);

  // Round 5: the breeder's saved report is now replaced: no tick, and the corrected one can be saved.
  await breeder.goto(`/record/${recordId}`);
  await expect(breeder.locator('[data-status-row="DNA report"]')).toContainText('Not tied to the plant now');
  await expect(breeder.locator('[data-status-row="DNA report"]')).toContainText(
    'the lab replaced the DNA report saved here',
  );
  await shot(breeder, 'breeder-3-saved-replaced');
  // Round 6: the older link, before the breeder has done anything: what the lab did, no intent.
  {
    const t = await buyerLine(oldLink, 'buyer-2-oldlink-replaced', report);
    expect(t).toContain(
      `The DNA report saved to this record (SHA-256 ${shortOf(reportSha)}) was replaced by its lab on`,
    );
    expect(t).toContain('The holder hasn’t saved the corrected one yet.');
    expect(t).not.toMatch(/kept|as of when this link was made/);
  }
  // The backup comes first on this plant's next step, so the page also says it here.
  await expect(breeder.getByText(/The DNA report saved to this plant was replaced by the lab/)).toBeVisible();
  await breeder
    .getByRole('button', { name: /Open the corrected one/ })
    .first()
    .click();
  await breeder.getByRole('button', { name: /Save it to this plant/ }).click();
  await expect(breeder.locator('[data-replaces]')).toContainText('Saving this one replaces it');
  await breeder.getByRole('button', { name: /Replace the saved DNA report/ }).click();
  await expect(breeder.locator('[data-lab-match]')).toBeVisible();
  await breeder.getByRole('button', { name: /Back to the plant/ }).click();
  await expect(breeder.locator('[data-status-row="DNA report"]')).toContainText('Tied to the plant');
  await expect(breeder.locator('[data-status-row="DNA report"]')).toContainText(
    'DNA report signed by a key named “E2E Lab”',
  );
  // Round 6: the older link (it names the first file) now describes the corrected one, saved now.
  {
    const t = await buyerLine(
      oldLink,
      'buyer-3-oldlink-after-save',
      Buffer.concat([report, Buffer.from(' corrected')]),
    );
    expect(t).toContain(`Its file (SHA-256 ${shortOf(correctedSha)}) matches the lab report signed by`);
    // The link names no file, only the record's salt: it describes the file saved now.
    expect(t).not.toContain('This link was made when a different file was saved');
    expect(t).not.toMatch(/was replaced by its lab|kept|hasn’t saved/);
    expect(t).toContain('One signature was withdrawn by its signer, so it is not counted: a lab report.');
  }

  // Round 5: someone sent the holder's link and a file checks the file here, against the
  // registry's bound value, with the salt after the #. Nothing about the file is sent.
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const errors = watch(page);
    const asked: string[] = [];
    page.on('request', (r) => asked.push(`${r.url()} ${r.postData() ?? ''}`));
    await isolate(page);
    await page.goto(oldLink);
    await expect(page.locator('[data-dna-check]')).toHaveAttribute('data-dna-check', 'ready');
    await page.locator('[data-dna-file]').setInputFiles({
      name: 'report-v2.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.concat([report, Buffer.from(' corrected')]),
    });
    await expect(page.locator('[data-dna-file-result]')).toHaveAttribute('data-dna-file-result', 'matches');
    await page
      .locator('[data-dna-file]')
      .setInputFiles({ name: 'report.pdf', mimeType: 'application/pdf', buffer: report });
    await expect(page.locator('[data-dna-file-result]')).toHaveAttribute('data-dna-file-result', 'differs');
    for (const a of asked) {
      expect(a).not.toContain(correctedSha);
      expect(a).not.toContain(new URLSearchParams(new URL(shareLink).hash.slice(1)).get('ds') ?? 'no salt');
    }
    // The certificate's link has no salt: the file can't be checked from it, and it says so.
    await page.goto(certLink);
    await expect(page.locator('[data-dna-check]')).toHaveAttribute('data-dna-check', 'no-salt');
    expectNoErrors(errors);
    await ctx.close();
  }

  await lab.reload();
  await lab.getByRole('button', { name: /^Send results back to the breeder/ }).click();
  await expect(lab.getByText('Replaced by your corrected file.')).toBeVisible();
  await expect(lab.getByRole('button', { name: /^Withdraw$/ })).toHaveCount(1);
  await lab.getByRole('button', { name: /^Withdraw$/ }).click();
  // Withdrawing a correction leaves the breeder with nothing from this lab: said before it happens.
  await expect(
    lab.getByText('The original stays replaced. The breeder will have no live report from you until you send one.'),
  ).toBeVisible();
  await shot(lab, 'lab-3-withdraw-correction');
  await lab.getByRole('button', { name: /Yes, withdraw it/ }).click();
  await expect(lab.getByText(/^Withdrawn on /)).toBeVisible();
  await expect(lab.getByText('Replaced by your corrected file.')).toBeVisible();
  await expect(lab.getByText(/Not signed by the key in this browser/)).toHaveCount(0);
  await expect(lab.getByRole('button', { name: /^Withdraw$/ })).toHaveCount(0);
  // Round 6: the lab's plant page says it was withdrawn, not "not yet", and still shows what was sent.
  await lab.goto(labPlantUrl);
  await expect(lab.locator('[data-status-row="Lab report"]')).toContainText('withdrawn (you can send a new one)');
  await expect(lab.getByRole('button', { name: /See what you sent/ })).toBeVisible();
  await shot(lab, 'lab-4-plant-after-withdraw');
  {
    const after = await fetch(`${API}/transfers/${transferId}/results`, {
      headers: { 'x-holder-key': await breeder.evaluate(() => localStorage.getItem('veilcore.holder.v1') ?? '') },
    });
    const { results } = (await after.json()) as { results: { id: string; withdrawnAt?: number | null }[] };
    expect(results).toHaveLength(2);
    // Both files withdrawn: the old one when the correction was sent, the correction by hand.
    expect(results.every((r) => typeof r.withdrawnAt === 'number')).toBe(true);
  }
  await breeder.goto(`/record/${recordId}`);
  await expect(breeder.getByRole('button', { name: /^Lab reports/ })).toBeVisible();
  await breeder.getByRole('button', { name: /^Lab reports/ }).click();
  await expect(breeder.getByText('Replaced by a newer lab report')).toBeVisible();
  await expect(breeder.getByText(/Withdrawn by the lab on/)).toBeVisible();
  await expect(breeder.getByRole('button', { name: /^Open$/ })).toHaveCount(0);
  await expect(
    breeder.getByText('No current report from lab@e2e: the original was replaced and the correction withdrawn.'),
  ).toBeVisible();
  await shot(breeder, 'breeder-4-no-current-report');
  // The breeder kept the correction, which the lab then withdrew: said plainly, on the plant and the certificate.
  await breeder.goto(`/record/${recordId}`);
  await expect(breeder.locator('[data-status-row="DNA report"]')).toContainText(
    'the lab withdrew the DNA report saved here',
  );
  await breeder.getByText('Certificate', { exact: true }).click();
  await expect(breeder.locator('[data-saved-report="withdrawn"]')).toContainText(
    'Not tied to the plant now: the lab withdrew the DNA report saved here.',
  );
  await shot(breeder, 'breeder-5-certificate-withdrawn');
  // Round 6: the certificate's link (fingerprint only): its withdrawn-signatures line agrees
  // with the certificate.
  {
    const t = await buyerLine(certLink, 'buyer-4-certlink-withdrawn');
    // Round 5: without the salt (the certificate's link has none), which file is saved can't
    // be told here; the withdrawn signatures are still said.
    expect(t).toContain(
      'The holder saved a DNA report to this record. Which file it is can be checked only with the holder’s own check link and the file.',
    );
    expect(t).not.toContain(shortOf(correctedSha));
    expect(t).not.toMatch(/No lab has signed a lab report|kept/);
    expect(t).toContain('2 signatures were withdrawn by their signers, so they are not counted: 2 lab reports.');
  }
  // The older link: the withdrawn correction, saved now, never the replaced first file.
  {
    const t = await buyerLine(oldLink, 'buyer-5-oldlink-withdrawn', Buffer.concat([report, Buffer.from(' corrected')]));
    expect(t).toContain(`(SHA-256 ${shortOf(correctedSha)}) was withdrawn by its lab on`);
    expect(t).not.toContain(shortOf(reportSha) + ') was replaced');
    expect(t).not.toMatch(/kept/);
  }

  expectNoErrors(breederErrors);
  expectNoErrors(labErrors);
  await breederCtx.close();
  await labCtx.close();
});
