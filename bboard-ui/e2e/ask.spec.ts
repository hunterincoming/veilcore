// Ask VeilCore and the disclosure receipt, in the browser against the stand-in registry
// (docs/ask-veilcore.md):
//   - the receipt says what goes public on Midnight before the button that dates the key;
//   - typing into Ask and getting a draft makes no network request at all, online or off;
//   - an Ask draft opens the logging screen filled in, with the banner and the fields marked;
//   - "cut 3 clones from <plant>" in Ask opens the batch review, and the 3 records are saved,
//     each naming its parent inside its own sealed record.
// ASK_SHOTS=<dir> saves the screens for review (phone, and a computer for the sheet).
// SPDX-License-Identifier: Apache-2.0
import { randomBytes } from 'node:crypto';
import { expect, test, type Page, type Request, type WebSocket } from '@playwright/test';
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

type Rec = {
  id: string;
  strainName?: string;
  breedingMethod?: string;
  parents?: { recordId?: string; name: string }[];
};

const shot = async (page: Page, name: string, desktop = false) => {
  const dir = process.env.ASK_SHOTS;
  if (!dir) return;
  if (desktop) await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: `${dir}/ask-${name}${desktop ? '-desktop' : '-phone'}.png` });
  if (desktop) await page.setViewportSize({ width: 390, height: 844 });
};

const standIn = async (page: Page, holder: string, vault: string, held: { records: Rec[] } = { records: [] }) => {
  await page.addInitScript((h) => {
    localStorage.setItem('veilcore.holder.v1', h);
    localStorage.setItem('veilcore.role.v1', 'breeder');
  }, holder);
  await holdVaultKey(page, vault);
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
  return held;
};

const openAsk = async (page: Page) => {
  await page.locator('[data-ask-open]').click();
  await expect(page.locator('[data-ask-sheet]')).toBeVisible();
  await expect(page.locator('[data-ask-privacy]')).toHaveText(
    'Typing here sends nothing. Only Save does. Works offline.',
  );
};

const askFor = async (page: Page, text: string) => {
  await page.locator('[data-ask-input]').fill(text);
  await page.getByRole('button', { name: 'Go', exact: true }).click();
};

test('Ask makes no request while it drafts, online or offline, and fills the logging screen', async ({
  page,
  context,
}) => {
  const errors = watch(page);
  // A browser with no holder key: background sync has nothing to send and stays off.
  await isolate(page);
  await page.goto('/records');
  await expect(page.locator('[data-ask-open]')).toBeVisible();
  await openAsk(page);
  await shot(page, 'sheet');
  await shot(page, 'sheet', true);

  // Every request from the page, its workers and service workers (the context), and every
  // WebSocket the page opens.
  const requests: string[] = [];
  const count = (r: Request) => requests.push(r.url());
  const socket = (ws: WebSocket) => requests.push(`websocket ${ws.url()}`);
  context.on('request', count);
  page.on('websocket', socket);
  await askFor(page, 'new plant Harbour Mist');
  const card = page.locator('[data-ask-card="draft"]').first();
  await expect(card).toContainText('Opens: Make a record (plant)');
  await expect(card).toContainText('Name: Harbour Mist');
  await expect(card).toContainText('Nothing is saved until you tap Save on that screen.');
  // The chips, Explain and What's due are answered here too.
  await page.locator('[data-ask-chip="explain"]').first().click();
  await expect(page.locator('[data-ask-card="explain"]').last()).toContainText('Pick a word:');
  await page.locator('[data-ask-chip="due"]').first().click();
  await expect(page.locator('[data-ask-card="due"]').last()).toContainText('Nothing is due');
  await askFor(page, 'find gelato 2025');
  await expect(page.locator('[data-ask-card="search"]').last()).toBeVisible();
  await page.locator('[data-ask-card="search"]').last().getByLabel('Search your records').fill('blue dream');
  await page.waitForTimeout(1500);
  expect(requests, requests.join('\n')).toEqual([]);

  // With the network off ("Wi-Fi off"): the same.
  await context.setOffline(true);
  await askFor(page, 'cut 4 clones');
  await expect(page.locator('[data-ask-card="draft"]').last()).toContainText('How many: 4');
  await page.waitForTimeout(500);
  expect(requests, requests.join('\n')).toEqual([]);
  await context.setOffline(false);
  context.off('request', count);
  page.off('websocket', socket);

  // Open the first draft: the logging screen, filled, with the banner and the field marked.
  await card.getByRole('button', { name: 'Open it' }).click();
  await expect(page.locator('[data-ask-banner="ask"]')).toHaveText('Filled in by Ask. Check every highlighted field.');
  await expect(page.locator('[data-ask-filled="strainName"] input')).toHaveValue('Harbour Mist');
  await expect(page).toHaveURL(/\/new$/);
  await expect(page.locator('[data-ask-sheet]')).toBeHidden();
  await shot(page, 'banner');
  await shot(page, 'banner', true);
  // Read once: a reload doesn't fill it again or show the banner, and the draft is kept as typed.
  await page.reload();
  await expect(page.locator('[data-ask-banner]')).toHaveCount(0);
  expectNoErrors(errors);
});

test('a link fills only the kind and how many, and never picks a record', async ({ page }) => {
  const errors = watch(page);
  await isolate(page);
  await page.goto('/new#draft=kind=plant&preset=clones&count=9999');
  await expect(page.locator('[data-batch-review="clones"]')).toBeVisible();
  await expect(page.locator('[data-ask-banner="link"]')).toBeVisible();
  await expect(page.locator('[data-ask-filled="count"] input')).toHaveValue('500');
  await expect(page.locator('[data-ask-filled="parent"]')).toHaveCount(0);
  // Cleared from the address once read.
  await expect(page).toHaveURL(/\/new$/);
  expectNoErrors(errors);
});

test('the receipt before the key date stamp, then 3 clones from Ask saved with their parent sealed inside', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const errors = watch(page);
  const holder = randomBytes(32).toString('hex');
  const vault = newVaultKey();
  const held = await standIn(page, holder, vault);
  // A short demo name, as growers use (review round 1): each test has its own stand-in registry.
  const name = 'Blue Dream #12';

  // The receipt: on the check screen, before "Seal it", which starts the key's date stamp.
  await page.goto('/new');
  await startPlant(page);
  await page.getByLabel(/Plant or line name/).fill(name);
  await page.getByLabel(/Bred by/).fill('E2E');
  await page.getByRole('button', { name: /Next: check it/ }).click();
  const receipt = page.locator('[data-receipt="anchor"]');
  await expect(receipt).toBeVisible();
  await expect(receipt.locator('[data-receipt-public]')).toContainText(
    'A code made from your record’s key (not the record)',
  );
  await expect(receipt.locator('[data-receipt-public]')).toContainText(
    'A code made from your backup secret (not the secret)',
  );
  await expect(receipt.locator('[data-receipt-public]')).toContainText('The date and time it lands on Midnight');
  await expect(receipt.locator('[data-receipt-private]')).toContainText(
    'Genetics and DNA files never leave this device.',
  );
  const seal = page.getByRole('button', { name: /Seal it/ });
  // The receipt comes before the button that sends.
  const [rBox, sBox] = [await receipt.boundingBox(), await seal.boundingBox()];
  expect(rBox && sBox && rBox.y < sBox.y).toBe(true);
  await receipt.scrollIntoViewIfNeeded();
  await shot(page, 'receipt');
  await receipt.scrollIntoViewIfNeeded();
  await shot(page, 'receipt', true);
  await seal.click();
  await page.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
  await page.getByRole('button', { name: /No report yet: skip/ }).click();
  await saveAndCheckBackup(page);
  await page.getByRole('button', { name: /Finish/ }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await expect.poll(() => held.records.length, { timeout: 30_000 }).toBe(1);
  const motherId = held.records[0].id;

  // The record page offers a batch; Ask drafts the same from what is typed.
  await expect(page.getByText('Cut clones from this')).toBeVisible();

  // Now there is a record, the hint by the bubble names it. Dismissed, it stays gone; only the
  // flag is stored. (Cleared here to try the hint again.)
  const hint = page.locator('[data-ask-hint]');
  await expect(hint).toHaveText(`Try: cut 6 clones from ${name}`);
  // Not on the agreements, backup or import screens, where it would sit on a table or a form.
  const recordUrl = page.url();
  for (const path of ['/licenses', '/backup', '/records/import']) {
    await page.goto(path);
    await expect(page.locator('[data-ask-open]')).toBeVisible();
    await expect(hint, path).toHaveCount(0);
  }
  await page.goto(recordUrl);
  await expect(hint).toHaveText(`Try: cut 6 clones from ${name}`);
  if (process.env.ASK_SHOTS) await page.screenshot({ path: `${process.env.ASK_SHOTS}/fix-hint-phone.png` });
  await hint.getByRole('button', { name: 'Dismiss' }).click();
  await expect(hint).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('veilcore.ask.seen.v1'))).toBe('dismissed');
  await page.reload();
  await expect(page.locator('[data-ask-open]')).toBeVisible();
  await expect(hint).toHaveCount(0);
  await page.evaluate(() => localStorage.removeItem('veilcore.ask.seen.v1'));
  await page.reload();
  // Tapping the hint opens Ask with the example typed in, ready to send.
  await hint.locator('[data-ask-hint-try]').click();
  await expect(page.locator('[data-ask-sheet]')).toBeVisible();
  await expect(page.locator('[data-ask-input]')).toHaveValue(`cut 6 clones from ${name}`);
  await expect(page.locator('[data-ask-input]')).toBeFocused();
  if (process.env.ASK_SHOTS) await page.screenshot({ path: `${process.env.ASK_SHOTS}/fix-hint-prefilled-phone.png` });
  await askFor(page, `cut 3 clones from ${name}`);
  const card = page.locator('[data-ask-card="draft"]').last();
  await expect(card).toContainText('Opens: Cut clones');
  await expect(card).toContainText(`Cut from: ${name}`);
  await expect(card).toContainText('How many: 3');
  await card.getByRole('button', { name: 'Open it' }).click();

  const review = page.locator('[data-batch-review="clones"]');
  await expect(review).toBeVisible();
  await expect(page.locator('[data-ask-sheet]')).toBeHidden();
  await expect(page.locator('[data-ask-filled="count"] input')).toHaveValue('3');
  await expect(page.locator('[data-ask-filled="parent"]')).toContainText(name);
  await expect(page.locator('[data-batch-children="3"]')).toContainText(`${name} clone 3`);
  await shot(page, 'batch-review');
  await shot(page, 'batch-review', true);
  await page.getByRole('button', { name: /Next: save your backup/ }).click();
  await saveAndCheckBackup(page);
  await page.getByRole('button', { name: 'Save 3 records' }).click();
  await expect(page.locator('[data-batch-saved="3"]')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('heading', { name: '3 records saved' })).toBeVisible();
  await expect(page.locator('[data-batch-chain]')).toContainText('This part is public.');

  // What reached the registry: 3 new records, sealed, each naming its parent inside.
  await expect.poll(() => held.records.length, { timeout: 30_000 }).toBe(4);
  const opened = openRecordRows(held.records, vault).filter((r) => r.id !== motherId);
  expect(opened.map((r) => r.strainName).sort()).toEqual([1, 2, 3].map((n) => `${name} clone ${n}`));
  for (const r of opened) {
    expect(r.parents).toEqual([{ recordId: motherId, name }]);
    expect(r.breedingMethod).toBe('Clone / cutting');
  }
  // Sealed: the registry's copy has neither the parent nor the name in the clear.
  for (const r of held.records) expect(JSON.stringify(r)).not.toContain(name);
  expectNoErrors(errors);
});
