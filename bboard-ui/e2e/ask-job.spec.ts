// Ask's "Do it for me" (docs/ask-veilcore.md), in the browser against the stand-in registry:
//   - bring in a collection: the file picked on the result screen, "2 ready, 1 needs a fix",
//     the backup, Approve, the records saved;
//   - cut clones: got ready with no request at all, online and with the network off; the result
//     on a phone, the Approve bar, Approve off until "Can't be undone" is seen; saved, each clone
//     naming its parent inside its sealed record;
//   - a litter with its sexes; IDs pasted in a second tab: the stale first tab says so and sends
//     nothing;
//   - a mid-job failure (no connection) says what's safe and tries again; a crash mid-send
//     resumes and sends the same records, never a second set;
//   - what's due: three reports drafted, a figure typed in each; a figure changed in a second tab,
//     then Approve on the stale first tab: refused, nothing sent; then one signed report each;
//   - get a record ready to license: its stamp started by the approved job; an approved job sends
//     nothing on a check or a prove page.
// NEW_SHOTS=<dir> saves the screens at 360px as doit-*.png.
// SPDX-License-Identifier: Apache-2.0
import { createHash, randomBytes } from 'node:crypto';
import { ed25519 } from '@noble/curves/ed25519.js';
import { expect, test, type Page, type Request, type Route } from '@playwright/test';
import {
  API,
  REAL_REGISTRY,
  expectNoErrors,
  holdVaultKey,
  isolate,
  json,
  newVaultKey,
  openRecordRows,
  plainRowRefusal,
  saveAndCheckBackup,
  watch,
} from './helpers';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

const SITE_PORT = process.env.E2E_PORT ?? '4317';

type Rec = Record<string, unknown> & { id: string };
type Held = { records: Rec[]; puts: Rec[][]; mode: 'ok' | 'abort' | 'hang' };

const shot = async (page: Page, name: string, full = false) => {
  const dir = process.env.NEW_SHOTS;
  if (!dir) return;
  const size = page.viewportSize();
  await page.setViewportSize({ width: 360, height: 740 });
  await page.screenshot({ path: `${dir}/doit-${name}.png`, fullPage: full });
  if (size) await page.setViewportSize(size);
};

const standIn = async (page: Page, held: Held, setup: { holder: string; vault: string }) => {
  await page.addInitScript((h) => {
    localStorage.setItem('veilcore.holder.v1', h);
    localStorage.setItem('veilcore.role.v1', 'breeder');
    localStorage.setItem('veilcore.ask.seen.v1', 'dismissed');
  }, setup.holder);
  await holdVaultKey(page, setup.vault);
  await isolate(page, {
    'GET /api/records': (route) => json(route, 200, held.records),
    'PUT /api/records': async (route, _url, body) => {
      if (held.mode === 'abort') return route.abort('internetdisconnected');
      if (held.mode === 'hang') return new Promise<void>(() => undefined);
      const refusal = plainRowRefusal(body);
      if (refusal) return json(route, 400, { error: refusal });
      const sent = body as Rec[];
      held.puts.push(sent);
      const ids = new Set(sent.map((r) => r.id));
      held.records = [...sent, ...held.records.filter((r) => !ids.has(r.id))];
      return json(route, 200, { ok: true });
    },
    'GET /api/licenses': (route) => json(route, 200, []),
    'PUT /api/licenses': (route) => json(route, 200, { ok: true }),
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
  });
};

const newHeld = (): Held => ({ records: [], puts: [], mode: 'ok' });

const openAsk = async (page: Page) => {
  await page.locator('[data-ask-open]').click();
  await expect(page.locator('[data-ask-sheet]')).toBeVisible();
};

/** Ask, with "Do it for me" on. */
const doIt = async (page: Page, text: string) => {
  if (!(await page.locator('[data-ask-sheet]').isVisible())) await openAsk(page);
  const sw = page.locator('[data-ask-doit] input');
  if (!(await sw.isChecked())) await sw.check();
  await page.locator('[data-ask-input]').fill(text);
  await page.getByRole('button', { name: 'Go', exact: true }).click();
};

/** Scroll to "Can't be undone" so Approve turns on, then approve. */
/** The backup step on a job's page: saved, checked, and back to the job. */
const backup = async (page: Page) => {
  // Asked first, among what only the person can answer; the bar steps aside while it is saved.
  await page.locator('[data-job-backup-open]').click();
  await expect(page.locator('[data-approve-bar]')).toHaveCount(0);
  await saveAndCheckBackup(page);
  await page.getByRole('button', { name: 'Back to the job' }).click();
  await expect(page.getByText('Backup checked.')).toBeVisible();
};

const approve = async (page: Page, label: RegExp | string) => {
  // Scrolled until it is all above the bar: only then does Approve turn on.
  await page.locator('[data-job-permanent]').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const button = page.locator('[data-job-approve]');
  await expect(button).toHaveText(label);
  await expect(button).toBeEnabled();
  await button.click();
};

const CSV_PLANTS =
  'Name,Bred by,Species,Date\nBlue Dream,Harbour Farm,Cannabis sativa,2025-01-02\nGelato,Harbour Farm,Cannabis sativa,2025-02-03\n,Harbour Farm,Cannabis sativa,2025-03-04\n';

/** Bring in two plants with the import job (job 3), backup and all. */
const bringInPlants = async (page: Page, held: Held, shots = false) => {
  await page.goto('/records');
  await doIt(page, 'add my 2 mothers');
  await expect(page).toHaveURL(/\/ask\/job\/[0-9a-f]{32}$/);
  await expect(page.locator('[data-job-page="ready"]')).toBeVisible();
  await expect(page.locator('[data-approve-left]')).toHaveText('Answer 1 question to approve');
  await page.locator('[data-job-file]').setInputFiles({
    name: 'mothers.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV_PLANTS),
  });
  const made = page.locator('[data-job-block="made"]');
  await expect(made).toContainText('2 ready');
  await expect(made).toContainText('1 needs a fix (row 4)');
  // The backup is all that's left: the bar says so, and offers it.
  await expect(page.locator('[data-approve-left]')).toHaveText('Save your backup to approve');
  await expect(page.locator('[data-job-backup-bar]')).toBeVisible();
  if (shots) await shot(page, '3-import-result', true);
  await backup(page);
  await approve(page, 'Approve: save 2 records');
  await expect(page.locator('[data-job-done]')).toHaveText('2 records saved.', { timeout: 60_000 });
  await expect.poll(() => held.records.length, { timeout: 30_000 }).toBe(2);
};

const plantId = (held: Held, vault: string, name: string): string =>
  openRecordRows(held.records, vault).find((r) => r.strainName === name)!.id;

test('bring in a collection, then cut clones: got ready with no request, online or off, then saved', async ({
  page,
  context,
}) => {
  test.setTimeout(300_000);
  const errors = watch(page);
  const held = newHeld();
  const setup = { holder: randomBytes(32).toString('hex'), vault: newVaultKey() };
  await standIn(page, held, setup);
  await page.goto('/records');
  await openAsk(page);
  await page.locator('[data-ask-doit] input').check();
  await expect(page.getByText('Nothing is sent until you approve.').first()).toBeVisible();
  await shot(page, '1-sheet');

  // A refusal says why, with the three closest things.
  await doIt(page, 'cut 12 clones from Blue Dream and license them to Joe for 2 years at 10%');
  await expect(page.locator('[data-job-refused="partB"]')).toBeVisible();
  await expect(page.locator('[data-ask-card="job-refused"]').last().locator('[data-ask-chip]')).toHaveCount(3);
  await shot(page, '2-refused');
  await page.keyboard.press('Escape');

  await bringInPlants(page, held, true);
  const mother = plantId(held, setup.vault, 'Blue Dream');

  // Cut clones: every request the page makes while the job is got ready, online.
  await page.goto('/records');
  await expect(page.getByRole('link', { name: 'Open Blue Dream' })).toBeVisible();
  const requests: string[] = [];
  const count = (r: Request) => {
    // The records sync of the app's own pages (a read of the holder's set) is not the job's.
    const u = new URL(r.url());
    // The site's own files (a page's scripts, fetched once) are not requests the job makes.
    if (u.port === SITE_PORT && r.method() === 'GET') return;
    if (!/\/api\/(records|licenses)$|\/transfers\/sent$/.test(u.pathname) || r.method() !== 'GET')
      requests.push(`${r.method()} ${r.url()}`);
  };
  context.on('request', count);
  await doIt(page, 'cut 3 clones off Blue Dream, tag 1A4-0099');
  await expect(page.locator('[data-job-kind="batch"]')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check this: 3 Blue Dream clones');
  const made = page.locator('[data-job-block="made"]');
  await expect(made).toContainText('3 records, ready here and not sent yet: Blue Dream clone 1 to Blue Dream clone 3');
  await expect(made).toContainText('Plant tags 1A4-0099 to 1A4-0101');
  await page.waitForTimeout(1000);
  expect(requests, requests.join('\n')).toEqual([]);
  await shot(page, '4-clones-result');
  await shot(page, '4-clones-result-full', true);
  // No Ask bubble on a job's page; the bar is at the bottom of the screen.
  await expect(page.locator('[data-ask-open]')).toHaveCount(0);
  const bar = page.locator('[data-approve-bar]');
  await expect(bar).toBeInViewport();
  await expect(page.locator('[data-approve-left]')).toHaveText('Save your backup to approve');
  // Not sent by its deadline, it asks first: it never says it will just send whenever.
  await expect(page.locator('[data-job-offline]')).toContainText('If it hasn’t gone by ');
  await expect(page.locator('[data-job-offline]')).toContainText('I’ll ask you before sending it.');

  context.off('request', count);

  await backup(page);
  await page.locator('[data-job-permanent]').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await shot(page, '5-clones-approve-bar');
  await approve(page, 'Approve: save 3 records');
  await expect(page.locator('[data-job-done]')).toHaveText('3 records saved.', { timeout: 60_000 });
  await shot(page, '6-clones-done');
  await expect.poll(() => held.records.length, { timeout: 30_000 }).toBe(5);
  const clones = openRecordRows(held.records, setup.vault).filter((r) => String(r.strainName).includes('clone'));
  expect(clones.map((r) => r.refId).sort()).toEqual(['1A4-0099', '1A4-0100', '1A4-0101']);
  for (const r of clones) {
    expect(r.parents).toEqual([{ recordId: mother, name: 'Blue Dream' }]);
    expect(r.breedingMethod).toBe('Clone / cutting');
  }
  expectNoErrors(errors);
});

test('getting a job ready offline makes no request at all', async ({ page, context }) => {
  test.setTimeout(240_000);
  const errors = watch(page);
  const held = newHeld();
  const setup = { holder: randomBytes(32).toString('hex'), vault: newVaultKey() };
  await standIn(page, held, setup);
  await bringInPlants(page, held);
  await page.goto('/records');
  await openAsk(page);
  await page.locator('[data-ask-doit] input').check();
  const requests: string[] = [];
  const count = (r: Request) => requests.push(`${r.method()} ${r.url()}`);
  // Give the switch a moment to fetch the job's page, then lose the signal.
  await page.waitForTimeout(1500);
  await context.setOffline(true);
  context.on('request', count);
  await doIt(page, 'cut 2 clones off Gelato');
  await expect(page.locator('[data-job-kind="batch"]')).toBeVisible();
  await expect(page.locator('[data-job-block="made"]')).toContainText('Gelato clone 1 to Gelato clone 2');
  await page.waitForTimeout(1500);
  context.off('request', count);
  // Only the page's own files, never the registry or anything else.
  expect(
    requests.filter((r) => !r.includes('127.0.0.1')),
    requests.join('\n'),
  ).toEqual([]);
  expect(
    requests.filter((r) => !/\.(js|css|woff2?|json|wasm|svg|png)(\?|$)/.test(r)),
    requests.join('\n'),
  ).toEqual([]);
  await context.setOffline(false);
  // Discard: nothing was sent, and nothing will be.
  await page.locator('[data-job-discard]').click();
  await expect(page.locator('[data-job-progress="discarded"]')).toBeVisible();
  await page.waitForTimeout(2000);
  expect(held.records).toHaveLength(2);
  expectNoErrors(errors);
});

test('a litter with its sexes and IDs pasted; an edit in another tab leaves the stale tab unable to send', async ({
  page,
  context,
}) => {
  test.setTimeout(300_000);
  const errors = watch(page);
  const held = newHeld();
  const setup = { holder: randomBytes(32).toString('hex'), vault: newVaultKey() };
  await standIn(page, held, setup);
  // Bella, from a herd list (the import job, as animals).
  await page.goto('/records');
  await doIt(page, 'import my herd');
  await page.locator('[data-job-file]').setInputFiles({
    name: 'herd.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'Name,Species,Breed,Sex,Date of birth,Breeder\nBella,Dog,Border Collie,female,2023-04-05,Kennel Nord\n',
    ),
  });
  await expect(page.locator('[data-job-block="made"]')).toContainText('1 ready');
  await backup(page);
  await approve(page, 'Approve: save 1 record');
  await expect(page.locator('[data-job-done]')).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => held.records.length).toBe(1);

  await page.goto('/records');
  await doIt(page, 'Bella whelped 3 pups, 2 male 1 female');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check this: 3 young from Bella');
  const made = page.locator('[data-job-block="made"]');
  await expect(made).toContainText('Dam: Bella');
  await expect(made).toContainText('Male: 2 · Female: 1');
  await expect(made).not.toContainText('not stated');
  await expect(made).toContainText('Sire: not given (add it later)');
  await expect(made).toContainText('Bella pup 1 to Bella pup 3');
  await expect(made).toContainText('No IDs yet for 3: Home will ask for them.');
  await shot(page, '7-litter-result', true);
  const jobUrl = page.url();

  // A second tab opens the same job from Home and pastes the microchip numbers.
  const other = await context.newPage();
  await standIn(other, held, setup);
  await other.goto('/records');
  await other
    .locator('[data-home-job]')
    .filter({ hasText: /^Check: / })
    .getByRole('button')
    .click();
  await expect(other).toHaveURL(jobUrl);
  // One box per pup, as in Add IDs: the column pasted into the first, each pup shown with its ID.
  await pasteText(other, '[data-job-ids] [data-id-box] >> nth=0', '985112000000001\n985112000000002\n985112000000003');
  await expect(other.locator('[data-job-ids] [data-id-pair]')).toHaveText([
    'Bella pup 1 gets 985112000000001',
    'Bella pup 2 gets 985112000000002',
    'Bella pup 3 gets 985112000000003',
  ]);
  await other.locator('[data-job-ids-use]').click();
  await expect(other.locator('[data-job-made-id]')).toHaveText([
    'Bella pup 1 gets 985112000000001',
    'Bella pup 2 gets 985112000000002',
    'Bella pup 3 gets 985112000000003',
  ]);

  // The first tab still shows what it drew, and says the job changed.
  await expect(page.locator('[data-job-changed]')).toContainText('This job changed in another tab. Check it again.');
  await expect(made).toContainText('No IDs yet for 3');
  // Its held records were replaced by the other tab's: Approve can't be pressed, and nothing is sent.
  const before = held.puts.length;
  await page.locator('[data-job-permanent]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-job-approve]:enabled')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, '8-stale-tab');
  await page.waitForTimeout(2000);
  expect(held.puts.length).toBe(before);

  // Shown again, the IDs need their scheme: one question, then the backup, then Approve.
  await page.locator('[data-job-changed]').getByRole('button', { name: 'Check it' }).click();
  await expect(made).toContainText('Bella pup 3 gets 985112000000003');
  await page.locator('[data-job-question="scheme"] input').fill('Microchip');
  await page.locator('[data-job-question="scheme"]').getByRole('button', { name: 'Use this' }).click();
  await backup(page);
  await approve(page, 'Approve: save 3 records');
  await expect(page.locator('[data-job-done]')).toHaveText('3 records saved.', { timeout: 60_000 });
  await other.close();
  await expect.poll(() => held.records.length, { timeout: 30_000 }).toBe(4);
  const pups = openRecordRows(held.records, setup.vault).filter((r) => r.strainName !== 'Bella');
  const animal = (r: Rec) => r.animal as { sex: string; idScheme: string };
  expect(pups.map((r) => animal(r).sex).sort()).toEqual(['female', 'male', 'male']);
  expect(pups.map((r) => r.refId).sort()).toEqual(['985112000000001', '985112000000002', '985112000000003']);
  expect(pups.every((r) => animal(r).idScheme === 'Microchip')).toBe(true);
  expectNoErrors(errors);
});

/** A paste into a box, as the browser hands it to the page. */
const pasteText = (page: Page, selector: string, text: string) =>
  page.locator(selector).evaluate((el, t) => {
    const data = new DataTransfer();
    data.setData('text/plain', t);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  }, text);

/** A scanner: the ID typed fast, then Tab and Enter. */
const scan = async (page: Page, id: string, gap = 5) => {
  await page.keyboard.type(id, { delay: gap });
  await page.keyboard.press('Tab', { delay: gap });
  await page.keyboard.press('Enter', { delay: gap });
};

test('Add IDs on a phone: one box per young; a whole litter scanned with Tab+Enter, checked, saved on the right pups; two columns refused', async ({
  page,
}) => {
  test.setTimeout(300_000);
  const errors = watch(page);
  const held = newHeld();
  const setup = { holder: randomBytes(32).toString('hex'), vault: newVaultKey() };
  await standIn(page, held, setup);
  await page.goto('/records');
  await doIt(page, 'import my herd');
  await page.locator('[data-job-file]').setInputFiles({
    name: 'herd.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'Name,Species,Breed,Sex,Date of birth,Breeder\nBella,Dog,Border Collie,female,2023-04-05,Kennel Nord\n',
    ),
  });
  await expect(page.locator('[data-job-block="made"]')).toContainText('1 ready');
  await backup(page);
  await approve(page, 'Approve: save 1 record');
  await expect(page.locator('[data-job-done]')).toBeVisible({ timeout: 60_000 });
  await page.goto('/records');
  await doIt(page, 'Bella whelped 6 pups');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check this: 6 young from Bella');
  await backup(page);
  // By keyboard alone: Tab from the top of the page, through the six ID boxes (a person's Tab
  // moves on), to Approve, and Enter presses it (X7).
  await page.locator('[data-job-permanent]').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await expect(page.locator('[data-job-approve]')).toBeEnabled();
  // From the top: a click on the page's heading puts the keyboard's starting point there.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole('heading', { level: 1 }).click();
  const onApprove = () => page.evaluate(() => !!document.activeElement?.hasAttribute('data-job-approve'));
  let passedBoxes = 0;
  for (let i = 0; i < 200 && !(await onApprove()); i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => !!document.activeElement?.hasAttribute('data-id-box'))) passedBoxes++;
  }
  expect(passedBoxes).toBe(6);
  expect(await onApprove()).toBe(true);
  await expect(page.locator('[data-job-approve]')).toHaveText('Approve: save 6 records');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-job-done]')).toHaveText('6 records saved.Home will remind you to add 6 IDs.', {
    timeout: 60_000,
  });
  await expect.poll(() => held.records.length, { timeout: 30_000 }).toBe(7);

  // Home: the litter without IDs. On a phone.
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/records');
  const line = page.locator('[data-home-ids]');
  await expect(line).toContainText('Bella’s litter (6): add IDs');
  await line.getByRole('button').click();
  const box = page.locator('[data-add-ids]');
  await expect(box.getByRole('heading', { level: 2 })).toHaveText('Add IDs: Bella’s 6 young');
  await expect(box.locator('[data-id-young]')).toHaveCount(6);
  const scheme = box.locator('[data-add-ids-scheme]');
  if (!(await scheme.inputValue())) await scheme.fill('Microchip');
  const boxes = box.locator('[data-id-box]');
  const filled = () => boxes.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
  const chips = [1, 2, 3, 4, 5, 6].map((n) => `98511200000000${n}`);

  // The whole litter scanned, each scan ending Tab then Enter, with no gap and with 5 ms between
  // keys: each lands in the next empty box, never two on, and the last one stays put (never on
  // Cancel or Save).
  for (const gap of [0, 5]) {
    await boxes.nth(0).click();
    for (const id of chips) await scan(page, id, gap);
    await expect(box).toBeVisible();
    expect(await filled()).toEqual(chips);
    await expect(boxes.nth(5)).toBeFocused();
    await expect(box.locator('[data-id-pair]')).toHaveCount(6);
    // A double beep on the last pup: the second scan is taken back, with a note, never appended.
    await scan(page, '985112000000007', gap);
    expect(await filled()).toEqual(chips);
    await expect(box.locator('[data-id-paste-note="doubleScan"]')).toBeInViewport();
    // Cancel with IDs typed asks first: keep editing keeps them; discard closes.
    await box.locator('[data-add-ids-cancel]').click();
    await expect(box.locator('[data-add-ids-discard]')).toContainText('Discard the IDs you typed? They aren’t saved.');
    await box.getByRole('button', { name: 'Keep editing' }).click();
    expect(await filled()).toEqual(chips);
    await box.locator('[data-add-ids-cancel]').click();
    await box.locator('[data-add-ids-discard-yes]').click();
    await expect(box).toHaveCount(0);
    await line.getByRole('button').click();
    if (!(await scheme.inputValue())) await scheme.fill('Microchip');
  }

  // Three scanned, then two columns pasted into box 4: refused, nothing filled, the reason under
  // that box and in view.
  await boxes.nth(0).click();
  for (const id of chips.slice(0, 3)) await scan(page, id);
  expect(await filled()).toEqual([...chips.slice(0, 3), '', '', '']);
  await expect(boxes.nth(3)).toBeFocused();
  // What Save will do, young by young.
  await expect(box.locator('[data-id-pair]')).toHaveText([
    'Bella pup 1 gets 985112000000001',
    'Bella pup 2 gets 985112000000002',
    'Bella pup 3 gets 985112000000003',
  ]);
  await expect(box.locator('[data-add-ids-save]')).toHaveText('Save 3 IDs');
  await box.locator('[data-id-preview]').scrollIntoViewIfNeeded();
  await shot(page, 'ids-scan-en');
  await pasteText(page, '[data-id-box] >> nth=3', '985112000000004\tGB-44\n985112000000005\tGB-45');
  const note = box.locator('[data-id-paste-note="columns"]');
  await expect(note).toHaveText(
    'That’s more than one column. Copy just the column of IDs and paste again. Nothing was filled.',
  );
  await expect(note).toBeInViewport();
  expect(await filled()).toEqual([...chips.slice(0, 3), '', '', '']);
  await shot(page, 'ids-columns-en');
  // More lines than boxes from there down: refused too, nothing filled.
  await pasteText(page, '[data-id-box] >> nth=3', 'A1\nA2\nA3\nA4');
  await expect(box.locator('[data-id-paste-note="over"]')).toBeInViewport();
  expect(await filled()).toEqual([...chips.slice(0, 3), '', '', '']);
  await shot(page, 'ids-over-en');

  // Saved by keyboard alone: a person's Tab from the last box reaches Save, and Enter presses it.
  await boxes.nth(5).click();
  await page.waitForTimeout(100);
  const onSave = () => page.evaluate(() => !!document.activeElement?.hasAttribute('data-add-ids-save'));
  for (let i = 0; i < 20 && !(await onSave()); i++) await page.keyboard.press('Tab');
  expect(await onSave()).toBe(true);
  await page.keyboard.press('Enter');
  await expect(box).toHaveCount(0, { timeout: 60_000 });
  await expect
    .poll(() => openRecordRows(held.records, setup.vault).filter((r) => r.refId && !r.supersededBy).length, {
      timeout: 30_000,
    })
    .toBe(3);
  const tagged: Record<string, string> = Object.fromEntries(
    openRecordRows(held.records, setup.vault)
      .filter((r) => r.refId && !r.supersededBy)
      .map((r) => [String(r.strainName), String(r.refId)]),
  );
  expect(tagged).toEqual({
    'Bella pup 1': '985112000000001',
    'Bella pup 2': '985112000000002',
    'Bella pup 3': '985112000000003',
  });
  await expect(line).toContainText('Bella’s litter (3): add IDs');

  // In Japanese: the saved IDs shown read-only, the rest scanned to the end (staying on the last
  // box), then two columns refused.
  await page.evaluate(() => localStorage.setItem('veilcore.lang', 'ja'));
  await page.reload();
  await line.getByRole('button').click();
  await expect(box.locator('[data-id-saved]')).toHaveCount(3);
  await expect(boxes).toHaveCount(3);
  if (!(await scheme.inputValue())) await scheme.fill('Microchip');
  await boxes.nth(0).click();
  await scan(page, chips[3]);
  await expect(boxes.nth(1)).toBeFocused();
  await expect(box.locator('[data-id-pair]')).toHaveText(['Bella pup 4：985112000000004']);
  await box.locator('[data-id-preview]').scrollIntoViewIfNeeded();
  await shot(page, 'ids-scan-ja');
  await pasteText(page, '[data-id-box] >> nth=1', 'A\tB\nC\tD');
  await expect(box.locator('[data-id-paste-note="columns"]')).toBeInViewport();
  await shot(page, 'ids-columns-ja');
  await box.locator('[data-add-ids-cancel]').click();
  await expect(box.locator('[data-add-ids-discard]')).toBeInViewport();
  await shot(page, 'ids-discard-ja');
  await page.evaluate(() => localStorage.setItem('veilcore.lang', 'en'));
  expectNoErrors(errors);
});

test('a mid-job failure says what is safe; a crash mid-send resumes with the same records', async ({
  page,
  context,
}) => {
  test.setTimeout(300_000);
  const errors = watch(page);
  const held = newHeld();
  const setup = { holder: randomBytes(32).toString('hex'), vault: newVaultKey() };
  await standIn(page, held, setup);
  await bringInPlants(page, held);

  // No connection to the registry: the step waits and says so.
  held.mode = 'abort';
  await page.goto('/records');
  await doIt(page, 'cut 2 clones off Blue Dream');
  await backup(page);
  await approve(page, 'Approve: save 2 records');
  const retry = page.locator('[data-job-retry="records"]');
  await expect(retry).toHaveText(
    'Nothing is lost: your 2 records are kept here and go out as soon as you’re back online.',
    { timeout: 60_000 },
  );
  // The time only, never the date, while it's within the hour.
  await expect(page.locator('[data-job-step="records"]')).toContainText(
    /Tries again in \d+ min \(\d{1,2}:\d{2}\s?[AP]M\)$/,
  );
  await shot(page, '9-failure');

  // Now the registry takes the records and never answers: the tab is closed mid-send.
  held.mode = 'hang';
  await page.close();
  const again = await context.newPage();
  const errors2 = watch(again);
  await standIn(again, held, setup);
  await again.goto('/records');
  // The retry time survives the reload: nothing is sent before it.
  await again.waitForTimeout(3000);
  expect(held.puts.length).toBe(1);
  // Then it is sent, the registry hangs, and the tab is closed (a crash).
  await expect.poll(async () => again.evaluate(() => document.visibilityState), { timeout: 5_000 }).toBe('visible');
  const sendStarted = again.waitForRequest((r) => r.method() === 'PUT' && r.url().includes('/api/records'), {
    timeout: 120_000,
  });
  await sendStarted;
  await again.close();
  expectNoErrors(errors2);

  // A new tab, the registry back: the same two records go, never a second set.
  held.mode = 'ok';
  const third = await context.newPage();
  const errors3 = watch(third);
  await standIn(third, held, setup);
  await third.goto('/records');
  await expect.poll(() => held.records.length, { timeout: 120_000 }).toBe(4);
  await third.waitForTimeout(3000);
  expect(held.records.length).toBe(4);
  const sentIds = new Set(held.puts.flat().map((r) => r.id));
  const clones = openRecordRows(held.records, setup.vault).filter((r) => String(r.strainName).includes('clone'));
  expect(clones).toHaveLength(2);
  for (const c of clones) expect(sentIds.has(c.id)).toBe(true);
  expectNoErrors(errors);
  expectNoErrors(errors3);
});

// ---- what's due: a license held as the licensee, with a stand-in deal channel ----------------

const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');
const h64 = () => randomBytes(32).toString('hex');

const heldLicense = () => {
  const mine = ed25519.utils.randomSecretKey();
  const theirs = ed25519.utils.randomSecretKey();
  return {
    inviteId: `LI-${randomBytes(16).toString('hex').toUpperCase()}`,
    secret: h64(),
    commitment: h64(),
    identity: h64(),
    issuerRecord: h64(),
    licenseeNonce: hex(ed25519.getPublicKey(mine)),
    partySecret: hex(mine),
    issuerNonce: hex(ed25519.getPublicKey(theirs)),
    label: 'Harbour Mist license',
    acceptedAt: Date.UTC(2026, 0, 1),
    activatedAt: Date.UTC(2026, 0, 2),
    agreedAt: Date.UTC(2026, 0, 1),
    agreement: {
      type: 'license',
      terms: {
        licensee: 'E2E Grower',
        licensor: 'E2E Breeder',
        startDate: '2026-01-01',
        endDate: '2027-12-31',
        extraTerms: '',
        rights: 'propagate',
        territory: 'Oregon',
        royaltyType: 'percent',
        royaltyAmount: '10',
        unitBasis: 'per-plant',
        sublicensable: false,
        exclusive: false,
        currency: 'USD',
        royalty: { kind: 'percent', rate: '10', base: 'gross' },
        reporting: { every: 'quarter', reportDueDays: 30, paymentDueDays: 15 },
      },
      recordFingerprint: h64(),
      agreementSalt: h64(),
      agreementFingerprint: h64(),
    },
  };
};

const dealChannel = async (page: Page) => {
  const messages: { seq: number; iv: string; ct: string; receivedAt: number }[] = [];
  await page.route(`${API}/deals/**`, async (route: Route) => {
    const url = new URL(route.request().url());
    const body = JSON.parse(route.request().postData() ?? '{}') as { iv?: string; ct?: string; after?: number };
    if (url.pathname.endsWith('/read'))
      return json(route, 200, { messages: messages.filter((m) => m.seq > (body.after ?? 0)) });
    if (url.pathname.endsWith('/messages')) {
      const m = { seq: messages.length + 1, iv: body.iv!, ct: body.ct!, receivedAt: Date.now() };
      messages.push(m);
      return json(route, 200, {
        seq: m.seq,
        fingerprint: createHash('sha256').update(`${m.iv}.${m.ct}`).digest('hex'),
      });
    }
    return json(route, 404, { error: 'no such deal' });
  });
  return messages;
};

test('what’s due: three reports drafted, a figure typed in each, a stale tab refused, one signed report each sent', async ({
  page,
  context,
}) => {
  test.setTimeout(240_000);
  const errors = watch(page);
  const held = newHeld();
  const setup = { holder: randomBytes(32).toString('hex'), vault: newVaultKey() };
  await standIn(page, held, setup);
  const lic = heldLicense();
  await page.addInitScript((l) => localStorage.setItem('veilcore.held-licenses.v1', JSON.stringify([l])), lic);
  const messages = await dealChannel(page);
  await page.goto('/records');
  await doIt(page, 'send my reports');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check this: 3 reports to send');
  // The licensor's name for the agreement is theirs, marked so, never by the button.
  await expect(page.locator('[data-named-by]').first()).toHaveText('“Harbour Mist license”, named by them');
  await expect(page.locator('[data-approve-left]')).toHaveText('Answer 1 question to approve');
  for (const [i, v] of ['1000', '2500.50'].entries()) {
    await page.locator(`[data-job-figure="${i}"]`).fill(v);
    await page.locator(`[data-job-figure="${i}"]`).blur();
  }
  await page.locator('[data-job-nothing="2"] input').check();
  await expect(page.locator('[data-job-report="1"]')).toContainText('USD 250.05 owed');
  await shot(page, '10-reports', true);

  // A second tab changes a figure; Approve on this stale tab is refused and sends nothing.
  const jobUrl = page.url();
  const other = await context.newPage();
  await standIn(other, held, setup);
  await dealChannel(other);
  await other.goto('/records');
  await other
    .locator('[data-home-job]')
    .filter({ hasText: /^Check: / })
    .getByRole('button')
    .click();
  await expect(other).toHaveURL(jobUrl);
  await other.locator('[data-job-figure="0"]').fill('9999');
  await other.locator('[data-job-figure="0"]').blur();
  await expect(other.locator('[data-job-report="0"]')).toContainText('USD 999.90 owed');
  await expect(page.locator('[data-job-changed]')).toBeVisible();
  await approve(page, 'Approve: send 3 reports, USD 350.05 owed in total');
  // Said once, by the banner: no second copy of it as an error (V6).
  await expect(page.locator('[data-job-changed]')).toContainText('This job changed in another tab. Check it again.');
  await expect(page.locator('[data-job-error]')).toHaveCount(0);
  await expect(page.getByText('This job changed in another tab. Check it again.')).toHaveCount(1);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, '8b-stale-tab-refused');
  await page.waitForTimeout(2000);
  expect(messages).toHaveLength(0);
  // The other tab puts it back, and this one shows the latest before approving.
  await other.locator('[data-job-figure="0"]').fill('1000');
  await other.locator('[data-job-figure="0"]').blur();
  await expect(other.locator('[data-job-report="0"]')).toContainText('USD 100.00 owed');
  await other.close();
  await page.locator('[data-job-changed]').getByRole('button', { name: 'Check it' }).click();
  await approve(page, 'Approve: send 3 reports, USD 350.05 owed in total');
  await expect(page.locator('[data-job-done]')).toHaveText(
    'Reports sent. The licensor answers on each agreement’s page.',
    { timeout: 60_000 },
  );
  expect(messages).toHaveLength(3);
  // Typed figures are gone from the job once sent.
  const figures = await page.evaluate(
    () =>
      new Promise<unknown>((resolve) => {
        const r = indexedDB.open('veilcore.ask.job.v1');
        r.onsuccess = () => {
          const g = r.result.transaction('jobs').objectStore('jobs').getAll();
          g.onsuccess = () => resolve((g.result as { figures?: unknown }[]).map((j) => j.figures ?? null));
        };
      }),
  );
  expect(figures).toEqual([null]);
  expectNoErrors(errors);
});

test('get a record ready to license; an approved job sends nothing on a check or prove page', async ({
  page,
  context,
}) => {
  test.setTimeout(300_000);
  const errors = watch(page);
  const held = newHeld();
  const setup = { holder: randomBytes(32).toString('hex'), vault: newVaultKey() };
  await standIn(page, held, setup);
  await bringInPlants(page, held);
  await page.goto('/records');
  await doIt(page, 'get Blue Dream ready to license');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check this: get Blue Dream ready to license');
  await expect(page.locator('[data-job-permanent]')).toContainText(
    'Blue Dream gets a date stamp on Midnight today. It’s needed to license it. Up to 3 a day are free.',
  );
  await page.getByRole('button', { name: 'What goes public' }).click();
  await expect(page.locator('[data-receipt="anchor"]')).toBeVisible();
  await shot(page, '11-ready-result', true);

  // Approved while the registry can't be reached, so a records job is still waiting too.
  held.mode = 'abort';
  await page.goto('/records');
  await doIt(page, 'cut 2 clones off Gelato');
  await backup(page);
  await approve(page, 'Approve: save 2 records');
  await expect(page.locator('[data-job-retry="records"]')).toBeVisible({ timeout: 60_000 });
  held.mode = 'ok';

  // On a check page and a prove page: no request from the job, however long it waits.
  const puts: string[] = [];
  const count = (r: Request) => {
    if (r.method() !== 'GET' || r.url().includes('/deals')) puts.push(`${r.method()} ${r.url()}`);
  };
  context.on('request', count);
  await page.goto(`/verify/${plantId(held, setup.vault, 'Blue Dream')}`);
  await page.evaluate(() => {
    // Past the job's retry time, so only the page rule can stop it.
    const real = Date.now;
    Date.now = () => real() + 120_000;
  });
  await page.waitForTimeout(20_000);
  await page.goto(`/prove/PR-${randomBytes(16).toString('hex').toUpperCase()}`);
  await page.evaluate(() => {
    const real = Date.now;
    Date.now = () => real() + 120_000;
  });
  await page.waitForTimeout(20_000);
  // No "Do it for me" on a prove page: the switch isn't there.
  await page.locator('[data-ask-open]').click();
  await expect(page.locator('[data-ask-sheet]')).toBeVisible();
  await expect(page.locator('[data-ask-doit]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  context.off('request', count);
  expect(
    puts.filter((p) => /\/api\/records|\/deals|sponsor/.test(p)),
    puts.join('\n'),
  ).toEqual([]);

  // Back on the app's pages, the records go.
  await page.goto('/records');
  await expect.poll(() => held.records.length, { timeout: 120_000 }).toBe(4);
  expectNoErrors(errors);
});

test('with a holder key and no vault key, getting a job ready asks nothing of the registry', async ({
  page,
  context,
}) => {
  const errors = watch(page);
  await page.addInitScript((h) => {
    localStorage.setItem('veilcore.holder.v1', h);
    localStorage.setItem('veilcore.role.v1', 'breeder');
    localStorage.setItem('veilcore.ask.seen.v1', 'dismissed');
  }, randomBytes(32).toString('hex'));
  await isolate(page, {
    'GET /api/records': (route) => json(route, 200, []),
    'GET /api/licenses': (route) => json(route, 200, []),
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
  });
  await page.goto('/records');
  await openAsk(page);
  await page.locator('[data-ask-doit] input').check();
  await page.waitForTimeout(1500);
  const requests: string[] = [];
  const count = (r: Request) => {
    if (new URL(r.url()).port !== SITE_PORT) requests.push(`${r.method()} ${r.url()}`);
  };
  context.on('request', count);
  await doIt(page, 'import my herd');
  await expect(page.locator('[data-job-refused="vault"]')).toHaveText('Open VeilCore once with a connection first.');
  await page.waitForTimeout(1000);
  context.off('request', count);
  expect(requests, requests.join('\n')).toEqual([]);
  expectNoErrors(errors);
});
