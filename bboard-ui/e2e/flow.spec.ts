// The whole journey against a REAL registry (E2E_API_BASE, see e2e/README.md): log a plant,
// share it, a checker asks by link, the holder opens it, an answer comes back. Skipped when
// no registry is given (CI uses the stand-in tests in site.spec.ts). The Midnight network
// and the sponsor are still blocked: the date stamp is put in place by the test, as the
// network would, and the answer is checked only as far as "not on the network yet".
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { API, REAL_REGISTRY, expectNoErrors, isolate, watch } from './helpers';

/** Screenshots for people to look at, when E2E_SHOTS names a folder. */
const shot = async (page: Page, name: string) => {
  if (process.env.E2E_SHOTS) await page.screenshot({ path: `${process.env.E2E_SHOTS}/${name}.png`, fullPage: true });
};

test.skip(!REAL_REGISTRY, 'needs a real registry: set E2E_API_BASE and build with it');

const IDENTITY = 'e2'.repeat(32);
const ANCHOR_TX = 'a8'.repeat(32);

test('log, share, ask by link, open as the holder, answer arrives', async ({ browser }) => {
  // The holder.
  const holderCtx = await browser.newContext();
  const holder = await holderCtx.newPage();
  const holderErrors = watch(holder);
  await isolate(holder);
  await holder.goto('/records');
  const role = holder.getByRole('button', { name: /I breed/i }).first();
  if (await role.isVisible().catch(() => false)) await role.click();
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

  const recordId = await holder.evaluate(
    () => Object.keys(JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as object)[0],
  );
  expect(recordId).toMatch(/^VEIL-/);
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
  await expect(holder.getByLabel(/Let them check the date stamp/)).toBeChecked();
  const link = await holder.locator('input[readonly]').first().inputValue();
  expect(link).toContain(`chain=${IDENTITY}`);
  expect(link).toContain(`anchorTx=${ANCHOR_TX}`);
  const path = new URL(link).pathname + new URL(link).search;

  // The checker, in another browser.
  const checkerCtx = await browser.newContext();
  const checker = await checkerCtx.newPage();
  const checkerErrors = watch(checker);
  await isolate(checker);
  await checker.goto(path);
  await expect(checker.getByText(name)).toBeVisible();
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
  await breeder.goto(`/record/${recordId}`);
  await breeder.getByText('Send it to a lab or breeder').click();
  await breeder.getByLabel(/Who are you sending it to/).fill('lab@e2e');
  await breeder.getByRole('button', { name: /Make a code for the lab/ }).click();
  const codeEl = breeder.getByText(/^TR-[0-9A-F]{8}\./);
  await expect(codeEl).toBeVisible();
  const code = /^TR-[0-9A-F]{8}\.[0-9a-z]+\.age1[02-9ac-hj-np-z]{58}$/.exec((await codeEl.innerText()).trim())?.[0];
  expect(code, 'the delivery code carries the plant’s lock').toBeTruthy();
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
  await lab.getByLabel(/Someone sent you a code or link/).fill(code!);
  await lab.getByRole('button', { name: /^Go$/ }).click();
  await lab.getByRole('button', { name: /Receive it/ }).click();
  await lab.getByLabel(/I physically received this material/).check();
  await lab.getByRole('button', { name: /Sign with my key/ }).click();
  await expect(lab).toHaveURL(/\/record\//);

  // The lab sends the result back.
  await lab.getByText('Send results back to the breeder').click();
  const chooser = lab.waitForEvent('filechooser');
  await lab.getByRole('button', { name: /Choose the report/ }).click();
  await (await chooser).setFiles({ name: 'report.pdf', mimeType: 'application/pdf', buffer: report });
  await shot(lab, 'lab-1-send');
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

  // The breeder opens it.
  await breeder.goto(`/record/${recordId}`);
  await breeder
    .getByRole('alert')
    .filter({ hasText: /lab report came back/ })
    .getByRole('button', { name: 'Open' })
    .click();
  await expect(breeder.getByText(/Signed by E2E Lab/)).toBeVisible();
  await expect(breeder.getByText(/The same key signed that it received this (sample|plant)/)).toBeVisible();
  await shot(breeder, 'breeder-2-opened');
  const [dl] = await Promise.all([
    breeder.waitForEvent('download'),
    breeder.getByRole('button', { name: /Save the report/ }).click(),
  ]);
  const saved = await dl.createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of saved) chunks.push(c as Buffer);
  expect(Buffer.concat(chunks)).toEqual(report);
  expect(dl.suggestedFilename()).toMatch(/\.pdf$/);
  await breeder.getByRole('button', { name: /Save it to this plant/ }).click();
  // Its own screen, with the file already chosen: one press saves it.
  await expect(breeder.getByRole('heading', { name: /Save your lab report to this plant/ })).toBeVisible();
  await expect(breeder.getByRole('button', { name: /Save it to this plant/ })).toBeEnabled();

  expectNoErrors(breederErrors);
  expectNoErrors(labErrors);
  await breederCtx.close();
  await labCtx.close();
});
