// Deleting a record (records.ts deleteRecord), in the built site against the stand-in registry,
// which keeps a deleted id as deleted, as the registry does (tombstones):
//   - the delete panel sits under "Technical details" and says whether the record is dated;
//   - the confirm names the record, says it can't be undone and what happens to its date;
//   - the record leaves the list, and the registry no longer holds it;
//   - its old check link says it was deleted by its holder, not "not found".
// SPDX-License-Identifier: Apache-2.0
import { randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';
import {
  REAL_REGISTRY,
  expectNoErrors,
  holdVaultKey,
  isolate,
  json,
  newVaultKey,
  plainRowRefusal,
  saveAndCheckBackup,
  startPlant,
  watch,
} from './helpers';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

type Rec = Record<string, unknown> & { id: string; recordFingerprint?: string };

test('delete a record from its page: gone from the list and the registry, its check link says so', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watch(page);
  const held: { records: Rec[] } = { records: [] };
  const deleted = new Map<string, string | undefined>();
  await page.addInitScript((h) => {
    if (!localStorage.getItem('veilcore.holder.v1')) localStorage.setItem('veilcore.holder.v1', h);
    localStorage.setItem('veilcore.role.v1', 'breeder');
  }, randomBytes(32).toString('hex'));
  await holdVaultKey(page, newVaultKey());
  await isolate(page, {
    'GET /api/records': (route) => json(route, 200, held.records),
    'PUT /api/records': (route, _url, body) => {
      const refusal = plainRowRefusal(body);
      if (refusal) return json(route, 400, { error: refusal });
      const sent = (body as Rec[]).filter((r) => !deleted.has(r.id));
      const ids = new Set(sent.map((r) => r.id));
      held.records = [...sent, ...held.records.filter((r) => !ids.has(r.id))];
      return json(route, 200, { ok: true });
    },
    'DELETE /api/records': (route, _url, body) => {
      const ids = ((body as { ids?: string[] })?.ids ?? []).filter((id) => held.records.some((r) => r.id === id));
      for (const id of ids) deleted.set(id, held.records.find((r) => r.id === id)?.recordFingerprint);
      held.records = held.records.filter((r) => !ids.includes(r.id));
      return json(route, 200, { removed: ids });
    },
    'GET /verify/:record': (route, url) => {
      const id = decodeURIComponent(url.pathname.split('/').pop() ?? '');
      if (!deleted.has(id)) return json(route, 404, { found: false });
      const fp = deleted.get(id);
      return json(route, 404, {
        found: false,
        deleted: true,
        deletedBy: 'record-holder',
        deletedAt: '2026-11-17T20:00:00.000Z',
        ...(fp ? { recordFingerprint: fp } : {}),
        anchored: false,
      });
    },
    'GET /api/licenses': (route) => json(route, 200, []),
    'PUT /api/licenses': (route) => json(route, 200, { ok: true }),
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
  });

  // A plant, sealed and saved.
  await page.goto('/new?lang=en');
  await startPlant(page);
  await page.getByLabel(/Plant or line name/).fill('Delete Me (test data)');
  await page.getByLabel(/Bred by/).fill('E2E breeder');
  await page.getByRole('button', { name: /Next: check it/ }).click();
  await page.getByRole('button', { name: /Seal it/ }).click();
  await page.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
  await page.getByRole('button', { name: /No report yet: skip/ }).click();
  await saveAndCheckBackup(page);
  await page.getByRole('button', { name: /Finish/ }).click();
  await expect(page.getByRole('heading', { name: 'Delete Me (test data)' })).toBeVisible();
  await expect.poll(() => held.records.length, { timeout: 30_000 }).toBe(1);
  const id = held.records[0].id;

  // The panel is under "Technical details", and says what happens to its date.
  await page.goto(`/record/${id}?lang=en`);
  await page.getByRole('button', { name: 'Technical details' }).click();
  const panel = page.locator('[data-delete-record]');
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.locator('[data-delete-date]')).toContainText('It isn’t in a batch yet');

  // The confirm names it and says it can't be undone; accepted, the record goes.
  let asked = '';
  page.once('dialog', (d) => {
    asked = d.message();
    void d.accept();
  });
  await panel.locator('[data-delete-record-button]').click();
  await expect(page).toHaveURL(/\/records$/);
  expect(asked).toContain('Delete “Delete Me (test data)”? This can’t be undone.');
  expect(asked).toContain('It isn’t in a batch yet');
  await expect.poll(() => held.records.length).toBe(0);
  await expect(page.getByText('Delete Me (test data)')).toHaveCount(0);

  // Its old check link: deleted by its holder, never "doesn't match any record".
  await page.goto(`/verify/${id}`);
  const gone = page.locator('[data-deleted-record]');
  await expect(gone).toContainText('was deleted by its holder');
  await expect(gone).toContainText('Its details are no longer shown.');
  await expect(gone).toContainText('VeilCore’s registry has no date on Midnight for it.');
  await expect(page.locator('body')).not.toContainText('doesn’t match any record');
  expectNoErrors(errors);
});
