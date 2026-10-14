// The whole journey against a REAL registry (E2E_API_BASE, see e2e/README.md): log a plant,
// share it, a checker asks by link, the holder opens it, an answer comes back. Skipped when
// no registry is given (CI uses the stand-in tests in site.spec.ts). The Midnight network
// and the sponsor are still blocked: the date stamp is put in place by the test, as the
// network would, and the answer is checked only as far as "not on the network yet".
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';
import { API, REAL_REGISTRY, expectNoErrors, isolate, watch } from './helpers';

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
  await expect(holder.getByText(/That didn.t go through/)).toBeVisible({ timeout: 90_000 });
  await expect(holder.getByText(/Nothing is lost/)).toBeVisible();
  // ...and never leave them stuck: they can carry on and save the backup.
  await holder.getByRole('button', { name: /Do the date stamp later/ }).click();
  await holder.getByRole('button', { name: /No report yet: skip/ }).click();
  await expect(holder.getByRole('button', { name: /Save backup file/ })).toBeVisible();

  const recordId = await holder.evaluate(
    () => Object.keys(JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}'))[0],
  );
  expect(recordId).toMatch(/^VEIL-/);
  // What the network would have done: the record's identity anchored.
  await holder.evaluate(
    ({ recordId, identity, tx }) => {
      const all = JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}');
      all[recordId].anchor = {
        identity,
        network: 'preview',
        contractAddress: '0'.repeat(64),
        txId: tx,
        txHash: tx,
        blockHeight: 1,
      };
      localStorage.setItem('veilcore.record-keys.v1', JSON.stringify(all));
    },
    { recordId, identity: IDENTITY, tx: ANCHOR_TX },
  );

  // Share it, with the date stamp in the link.
  await holder.goto(`/record/${recordId}`);
  await holder.getByRole('button', { name: /Show someone/ }).click();
  await holder.getByRole('button', { name: /Save this choice/ }).click();
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
  const id = proveLink.split('/prove/')[1];
  expect(id).toMatch(/^PR-[0-9A-F]{32}$/);

  // The holder opens it.
  await holder.goto(`/prove/${id}`);
  await expect(holder.getByRole('heading', { name: new RegExp(`Prove you hold ${name}`) })).toBeVisible();
  await expect(holder.getByText(/E2E Lab/)).toBeVisible();

  // An answer arrives at the registry (the real one would come from Prove it).
  const posted = await fetch(`${API}/prove-requests/${id}/answers`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ txId: 'cd'.repeat(32) }),
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
