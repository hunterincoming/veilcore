// A partner's intake page sends the breeder to VeilCore and gets back only the record's ID,
// proof code and check link, and only when the breeder says so (veilcore/intake.ts).
// The partner here is a stand-in page at https://lab.example; the registry is the stand-in too.
// SPDX-License-Identifier: Apache-2.0
import { expect, test, type Page } from '@playwright/test';
import { expectNoErrors, isolate, json, saveAndCheckBackup, watch, type Handler } from './helpers';

const LAB = 'https://lab.example/intake/done';

const registry = async (page: Page) => {
  const rows: Record<string, unknown>[] = [];
  const handlers: Record<string, Handler> = {
    'GET /api/records': (route) => json(route, 200, rows),
    'PUT /api/records/dating': (route, _u, body) => {
      for (const r of body as { id: string }[])
        if (!rows.some((x) => x.id === r.id)) rows.push({ ...r, bodyPending: true });
      return json(route, 200, { ok: true, dated: (body as { id: string }[]).map((r) => r.id) });
    },
    'PUT /api/records': (route, _u, body) => json(route, 200, { ok: true, count: (body as unknown[]).length }),
    'GET /api/licenses': (route) => json(route, 200, []),
    'PUT /api/licenses': (route) => json(route, 200, { ok: true }),
    'GET /api/disclosures': (route) => json(route, 200, []),
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
  };
  await isolate(page, handlers);
  // The partner's page: registered after isolate(), so it answers first.
  await page.route('https://lab.example/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Lab</title><h1>Lab intake</h1>',
    }),
  );
};

test('a lab’s link: the breeder records the sample, then chooses to send only its ID, proof code and check link', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const errors = watch(page);
  await page.addInitScript(() => localStorage.setItem('veilcore.role.v1', 'breeder'));
  await registry(page);

  const q = new URLSearchParams({ return: LAB, state: 'lab-state-0001', ref: 'S-42', name: 'Lab sample 42' });
  await page.goto(`/intake?${q.toString()}`);
  await expect(page.getByRole('heading', { name: 'Record a sample for lab.example' })).toBeVisible();
  await expect(page.getByText('Their reference: S-42')).toBeVisible();
  await page.getByRole('button', { name: 'Record a new one' }).click();

  // The log flow says whom it's for, with their name and reference already in.
  await expect(page.locator('[data-intake-banner]')).toContainText('Recording for lab.example');
  await expect(page.getByLabel(/Plant or line name/)).toHaveValue('Lab sample 42');
  await page.getByLabel(/Bred by/).fill('E2E');
  await page.getByRole('button', { name: /Next: check it/ }).click();
  await page.getByRole('button', { name: /Seal it/ }).click();
  await page.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
  await page.getByRole('button', { name: /No report yet: skip/ }).click();
  await saveAndCheckBackup(page);
  await page.getByRole('button', { name: 'Finish' }).click();

  // What goes back, and to whom, before anything does.
  await expect(page.getByRole('heading', { name: 'Send this record to lab.example?' })).toBeVisible();
  await expect(page.getByText(/They don’t get your details/)).toBeVisible();
  const recordId = new URL(page.url()).searchParams.get('record') ?? '';
  expect(recordId).toMatch(/^VEIL-/);
  await page.getByRole('button', { name: 'Send to lab.example' }).click();

  await page.waitForURL(/^https:\/\/lab\.example\/intake\/done#/);
  const back = new URLSearchParams(new URL(page.url()).hash.slice(1));
  expect(back.get('veilcore')).toBe('veilcore/intake/v1');
  expect(back.get('state')).toBe('lab-state-0001');
  expect(back.get('record')).toBe(recordId);
  expect(back.get('proof')).toMatch(/^[0-9a-f]{64}$/);
  expect(back.get('check')).toContain(`/verify/${recordId}?fp=${back.get('proof')}`);
  // Nothing else went back: no name, no reference, no keys.
  expect([...back.keys()].sort()).toEqual(['check', 'proof', 'record', 'state', 'veilcore']);
  expectNoErrors(errors);
});

test('a link that would send the answer somewhere unsafe is refused, and nothing is recorded', async ({ page }) => {
  const errors = watch(page);
  await registry(page);
  for (const [ret, says] of [
    ['http://lab.example/done', 'isn’t secure (https)'],
    ['https://user:pw@lab.example/done', 'user name or password'],
    ['https://lab.example/done#x', 'already has a # part'],
  ] as const) {
    await page.goto(`/intake?${new URLSearchParams({ return: ret, state: 'lab-state-0001' }).toString()}`);
    await expect(page.locator('[data-intake-refused]')).toContainText(says);
    await expect(page.getByRole('button', { name: 'Record a new one' })).toHaveCount(0);
  }
  await page.goto(`/intake?${new URLSearchParams({ return: LAB, state: 'x' }).toString()}`);
  await expect(page.locator('[data-intake-refused]')).toContainText('security value');
  expectNoErrors(errors);
});

test('the breeder can go back without sending anything', async ({ page }) => {
  await registry(page);
  await page.goto(`/intake?${new URLSearchParams({ return: LAB, state: 'lab-state-0002' }).toString()}`);
  await page.getByRole('button', { name: 'Go back to lab.example without sending' }).click();
  await page.waitForURL(/^https:\/\/lab\.example\/intake\/done#/);
  const back = new URLSearchParams(new URL(page.url()).hash.slice(1));
  expect(back.get('declined')).toBe('1');
  expect(back.get('state')).toBe('lab-state-0002');
  expect(back.get('record')).toBeNull();
});
