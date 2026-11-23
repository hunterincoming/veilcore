// The check made when the app opens (veilcore/record-watch.ts), in the browser against the
// stand-in registry, with the chain read stood in for (chain/e2e-chain.ts `watch`):
//   - nothing changed: nothing shows, on Home or on the record;
//   - a record moved to a new key that this browser didn't do: one calm line on Home, "Here's what
//     to do" opens the steps and a link to the record, whose page says what changed; "I did this
//     myself" hides it, and it stays hidden after a reload;
//   - the chain is read once for the tab's session, not on every page;
//   - the line reads in all five languages, at phone and desktop width, with no sideways scroll.
// SPDX-License-Identifier: Apache-2.0
import { createHash, randomBytes } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { canonicalise } from 'veilcore-records';
import {
  REAL_REGISTRY,
  expectNoErrors,
  holdVaultKey,
  isolate,
  json,
  newVaultKey,
  sealedRecordRow,
  watch,
} from './helpers';
import { watch as en } from '../src/i18n/app/en/watch';
import { watch as de } from '../src/i18n/app/de/watch';
import { watch as es } from '../src/i18n/app/es/watch';
import { watch as fr } from '../src/i18n/app/fr/watch';
import { watch as ja } from '../src/i18n/app/ja/watch';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

const WORDS = { en, de, es, fr, ja } as const;
const HOLDER = randomBytes(32).toString('hex');
const VAULT = newVaultKey();
const SHOTS = process.env.E2E_SHOTS;

type Plant = { id: string; name: string; identity: string; row: Record<string, unknown> };
const plant = (name: string): Plant => {
  const id = `VEIL-${randomBytes(8).toString('hex').toUpperCase()}`;
  const committed = {
    breedingMethod: '',
    bredBy: 'E2E breeder (test data)',
    dateCreated: '2026-01-01',
    loggedAt: Date.now(),
    nonce: randomBytes(16).toString('hex'),
    notes: '',
    parents: [],
    photoFingerprints: [],
    refId: '',
    strainName: name,
  };
  const recordFingerprint = createHash('sha256').update(canonicalise(committed)).digest('hex');
  return {
    id,
    name,
    identity: randomBytes(32).toString('hex'),
    row: sealedRecordRow({ id, ...committed, recordFingerprint }, VAULT),
  };
};

const MOVED = plant('Watch test plant, moved (test data)');
const QUIET = plant('Watch test plant, unchanged (test data)');

/**
 * A breeder holding both plants, each date stamped from this browser, and a stand-in for the
 * chain: `changed` lists the identities that were moved to a new key. Counts the reads.
 */
const setUp = async (page: Page, changed: string[], lang = 'en') => {
  await page.addInitScript(
    ({ holder, plants, changed, lang }) => {
      localStorage.setItem('veilcore.holder.v1', holder);
      localStorage.setItem('veilcore.role.v1', 'breeder');
      localStorage.setItem('veilcore.lang', lang);
      if (!localStorage.getItem('veilcore.record-keys.v1')) {
        const hex = (n: number) => n.toString(16).padStart(2, '0').repeat(32);
        const keys: Record<string, unknown> = {};
        plants.forEach((p, i) => {
          keys[p.id] = {
            recordId: p.id,
            recordSecret: hex(i + 1),
            recoverySecret: hex(i + 101),
            createdAt: Date.now(),
            backedUpAt: Date.now(),
            anchor: {
              identity: p.identity,
              network: 'preview',
              contractAddress: '0'.repeat(64),
              txId: `tx-${i}`,
              txHash: hex(i + 60),
              blockHeight: 1,
            },
          };
        });
        localStorage.setItem('veilcore.record-keys.v1', JSON.stringify(keys));
      }
      const w = window as unknown as { __veilcoreE2EChain: unknown; __watchReads: number };
      w.__watchReads = 0;
      w.__veilcoreE2EChain = {
        watch: (identity: string, expectedRecovery?: string) => {
          w.__watchReads++;
          return changed.includes(identity)
            ? { anchored: true, recovery: expectedRecovery, head: 'ab'.repeat(32), rotations: 1, recoveries: 0 }
            : { anchored: true, recovery: expectedRecovery, rotations: 0, recoveries: 0 };
        },
      };
    },
    { holder: HOLDER, plants: [MOVED, QUIET].map((p) => ({ id: p.id, identity: p.identity })), changed, lang },
  );
  await holdVaultKey(page, VAULT);
  // Keeps what the browser sends, as the registry does (a newer save replaces the older row).
  const held = new Map<string, unknown>([MOVED, QUIET].map((p) => [p.id, p.row]));
  await isolate(page, {
    'GET /api/records': (route) => json(route, 200, [...held.values()]),
    'PUT /api/records': (route, _url, body) => {
      for (const r of body as { id: string }[]) held.set(r.id, r);
      return json(route, 200, { ok: true });
    },
    'GET /api/licenses': (route) => json(route, 200, []),
    'PUT /api/licenses': (route) => json(route, 200, { ok: true }),
    'GET /api/disclosures': (route) => json(route, 200, []),
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
  });
};

const homeLine = (page: Page) => page.locator('[data-record-changed-home]');
const recordLine = (page: Page, id: string) => page.locator(`[data-record-changed="${id}"]`);
const reads = (page: Page) => page.evaluate(() => (window as unknown as { __watchReads: number }).__watchReads);

test('nothing changed on the network: nothing shows, on Home or on the record', async ({ page }) => {
  const errors = watch(page);
  await setUp(page, []);
  await page.goto('/records');
  await expect(page.getByRole('heading', { name: QUIET.name })).toBeVisible();
  // The check ran (both records were read) and found nothing.
  await expect.poll(() => reads(page)).toBe(2);
  await expect(homeLine(page)).toHaveCount(0);
  await page.goto(`/record/${QUIET.id}`);
  await expect(page.getByRole('heading', { level: 1, name: QUIET.name })).toBeVisible();
  await expect(recordLine(page, QUIET.id)).toHaveCount(0);
  expectNoErrors(errors);
});

test('a record moved by someone else: one calm line, the steps, the record says what, "I did this myself"', async ({
  page,
}) => {
  const errors = watch(page);
  await setUp(page, [MOVED.identity]);
  await page.goto('/records');
  const line = homeLine(page);
  await expect(line).toBeVisible();
  await expect(line).toHaveAttribute('data-record-changed-home', '1');
  await expect(line).toContainText(en['app.watch.home.one'].replace('{name}', MOVED.name));
  // Calm: the steps wait behind one button.
  await expect(line.locator('[data-record-changed-steps]')).toBeHidden();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/watch-home-phone.png`, fullPage: true });
  await line.getByRole('button', { name: en['app.watch.what'] }).click();
  const steps = line.locator('[data-record-changed-steps]');
  await expect(steps).toBeVisible();
  // The steps slide open: tap what is under them only once they have finished opening.
  await expect(line.locator('.MuiCollapse-entered')).toHaveCount(1);
  await expect(steps).toContainText(en['app.watch.step.you']);
  await expect(steps).toContainText(en['app.watch.step.copy']);
  await expect(steps).toContainText(en['app.watch.step.files']);
  await expect(steps).toContainText(en['app.watch.step.date']);
  await expect(steps.getByRole('link', { name: 'Write to VeilCore' })).toHaveAttribute(
    'href',
    'mailto:hunter@veilcore.org',
  );
  // Only the record that changed.
  await expect(line).not.toContainText(QUIET.name);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/watch-home-open-phone.png`, fullPage: true });

  await line.getByRole('link', { name: en['app.watch.open'].replace('{name}', MOVED.name) }).click();
  await expect(page.getByRole('heading', { level: 1, name: MOVED.name })).toBeVisible();
  const here = recordLine(page, MOVED.id);
  await expect(here).toContainText(en['app.watch.this']);
  await expect(here.locator('[data-record-change="moved"]')).toHaveText(en['app.watch.change.moved']);
  // Read once for the tab's session: going to the record didn't ask again.
  expect(await reads(page)).toBe(2);
  await here.getByRole('button', { name: en['app.watch.what'] }).click();
  await expect(here.locator('.MuiCollapse-entered')).toHaveCount(1);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/watch-record-phone.png`, fullPage: true });
  await here.getByRole('button', { name: en['app.watch.seen'] }).click();
  await expect(here).toHaveCount(0);

  // Seen stays seen: after a reload, on the record and on Home. The reload asked nothing: the
  // tab's session already has the answer.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: MOVED.name })).toBeVisible();
  await expect(recordLine(page, MOVED.id)).toHaveCount(0);
  expect(await reads(page)).toBe(0);
  await page.goto('/records');
  await expect(page.getByRole('heading', { name: MOVED.name })).toBeVisible();
  await expect(homeLine(page)).toHaveCount(0);
  expectNoErrors(errors);
});

for (const lang of ['en', 'de', 'es', 'fr', 'ja'] as const) {
  for (const [size, width] of [
    ['phone', 390],
    ['desktop', 1366],
  ] as const) {
    test(`the line on Home in ${lang}, ${size}`, async ({ page }) => {
      const errors = watch(page);
      await page.setViewportSize({ width, height: 900 });
      await setUp(page, [MOVED.identity, QUIET.identity], lang);
      await page.goto('/records');
      const line = homeLine(page);
      await expect(line).toHaveAttribute('data-record-changed-home', '2');
      await expect(line).toContainText(WORDS[lang]['app.watch.home.other'].replace('{count}', '2'));
      await line.getByRole('button', { name: WORDS[lang]['app.watch.what'] }).click();
      await expect(line.locator('[data-record-changed-steps]')).toContainText(WORDS[lang]['app.watch.step.files']);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(
        0,
      );
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/watch-home-${lang}-${size}.png`, fullPage: true });
      expectNoErrors(errors);
    });
  }
}
