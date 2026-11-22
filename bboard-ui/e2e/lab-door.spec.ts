// A lab's way in (21 Nov): the co-founder couldn't find how a lab sets up its signing key. The
// site had no way for labs, and in the app the lab view hid behind a small footer link. Against
// the stand-in registry, at 390 and 1366px:
//   - a new visitor on veilcore.org's home page reaches the signing key screen in 3 taps or
//     fewer through "Use it as a lab" (the header, the home page's lab slide, How it works), in
//     all five languages: a page for a lab owner first, which changes nothing by being opened,
//     then its "Set up your lab", and lands on the lab's home whose solid button is "Set up your
//     lab's signing key";
//   - from /records anyone switches to the lab view in 2 taps from the header's view menu, and
//     back;
//   - a browser with records, or used before, that opens /for-labs is asked once, plainly, and
//     the records stay; "Not now" or Escape leaves the view as it was;
//   - the website step (the file, the DNS TXT record and the domain) is on the key screen
//     without opening anything.
// SPDX-License-Identifier: Apache-2.0
import { createHash, randomBytes } from 'node:crypto';
import { expect, test, type Locator, type Page } from '@playwright/test';
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
  type Handler,
} from './helpers';
import { home as homeEn } from '../src/i18n/app/en/home';
import { home as homeDe } from '../src/i18n/app/de/home';
import { home as homeEs } from '../src/i18n/app/es/home';
import { home as homeFr } from '../src/i18n/app/fr/home';
import { home as homeJa } from '../src/i18n/app/ja/home';
import { lab as labEn } from '../src/i18n/app/en/lab';
import { lab as labDe } from '../src/i18n/app/de/lab';
import { lab as labEs } from '../src/i18n/app/es/lab';
import { lab as labFr } from '../src/i18n/app/fr/lab';
import { lab as labJa } from '../src/i18n/app/ja/lab';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1366, height: 900 };

// The site's words (src/i18n/<lang>.ts, which can't be loaded outside the build), as they are there.
const FOR_LABS = {
  en: 'Use it as a lab',
  de: 'Als Labor nutzen',
  es: 'Usar como laboratorio',
  fr: 'Utiliser comme laboratoire',
  ja: 'ラボとして使う',
};
const SLIDE_LINK_EN = 'Run a lab? What VeilCore does for labs →';

const LANGS = [
  { lang: 'en', home: homeEn, lab: labEn },
  { lang: 'de', home: homeDe, lab: labDe },
  { lang: 'es', home: homeEs, lab: labEs },
  { lang: 'fr', home: homeFr, lab: labFr },
  { lang: 'ja', home: homeJa, lab: labJa },
] as const;

type Row = Record<string, unknown> & { id: string };

/** The stand-in registry: the rows given, and an empty set of everything else. */
const standIn = (page: Page, rows: Row[] = []) => {
  const handlers: Record<string, Handler> = {
    'GET /api/records': (route) => json(route, 200, rows),
    'GET /api/licenses': (route) => json(route, 200, []),
    'GET /api/disclosures': (route) => json(route, 200, []),
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
  };
  return isolate(page, handlers);
};

/** Counts every tap a person makes. */
const tapper = () => {
  let taps = 0;
  return {
    tap: async (l: Locator) => {
      await l.click();
      taps++;
    },
    get taps() {
      return taps;
    },
  };
};

const keyScreen = (page: Page, title = labEn['app.lab.key.setUp']) =>
  page.getByRole('dialog').getByRole('heading', { name: title });
const role = (page: Page) => page.evaluate(() => localStorage.getItem('veilcore.role.v1'));
/** The lab page's one button (lab/LabDoor.tsx): only it sets anything up. */
const setUp = (page: Page) => page.locator('[data-lab-set-up]').first();

test.describe('a new visitor, from the home page', () => {
  for (const { lang, home, lab } of LANGS) {
    test(`at 390px in ${lang}: Menu, For labs, the key screen`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.setViewportSize(PHONE);
      const errors = watch(page);
      await page.addInitScript((l) => localStorage.setItem('veilcore.lang', l), lang);
      await standIn(page);
      await page.goto('/');
      const t = tapper();
      await t.tap(page.locator('[data-site-menu-button]'));
      const forLabs = page.locator('[data-for-labs="menu"]');
      await expect(forLabs).toHaveText(FOR_LABS[lang]);
      await t.tap(forLabs);
      // The page for a lab owner: opening it changes nothing.
      await expect(page.getByRole('heading', { level: 1, name: home['app.labpage.title'] })).toBeVisible();
      await expect(page).toHaveTitle(/·/);
      expect(await role(page)).toBeNull();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await t.tap(setUp(page));
      await expect(keyScreen(page, lab['app.lab.key.setUp'])).toBeVisible();
      expect(t.taps).toBeLessThanOrEqual(3);
      expect(page.url()).toMatch(/\/records$/);
      expect(await role(page)).toBe('lab');

      // Closed without a key: the lab's home says to set it up, with its one solid button.
      await page.getByRole('dialog').getByRole('button', { name: /./ }).last().waitFor();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 1, name: home['app.home.labJobs'] })).toBeVisible();
      // (The paste box's "Go" is solid too, but off until something is pasted.)
      const solid = page.locator('main .MuiButton-contained:not(.Mui-disabled)');
      await expect(solid).toHaveCount(1);
      await expect(solid).toHaveText(home['app.home.setUpLabSignature']);
      // The header says which view this is, in this language.
      await expect(page.locator('[data-view-switch]')).toHaveText(home['app.home.roleView.lab']);
      // Going back to the page or reloading doesn't open the key screen again.
      await page.reload();
      await expect(page.getByRole('heading', { level: 1, name: home['app.home.labJobs'] })).toBeVisible();
      await page.waitForTimeout(500);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expectNoErrors(errors);
    });
  }

  test('at 1366px: the lab page is one tap from the header, the key screen two', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const errors = watch(page);
    await standIn(page);
    await page.goto('/');
    const t = tapper();
    const forLabs = page.locator('[data-for-labs="nav"]');
    await expect(forLabs).toBeVisible();
    await t.tap(forLabs);
    await expect(page).toHaveTitle('For labs · VeilCore');
    await t.tap(setUp(page));
    await expect(keyScreen(page)).toBeVisible();
    expect(t.taps).toBe(2);
    expectNoErrors(errors);
  });

  test('the home page, the lab slide and How it works lead there too', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const errors = watch(page);
    await standIn(page);
    await page.goto('/');
    // The short home page's "Who it is for" (22 Nov); the lab slide is on How it works now.
    const home = page.locator('[data-for-labs="home"]');
    await expect(home).toHaveAttribute('href', '/for-labs');
    await expect(home).toHaveText('For labs →');
    await page.goto('/how-it-works');
    const slide = page.locator('[data-for-labs="slide"]');
    await expect(slide).toHaveAttribute('href', '/for-labs');
    await expect(slide).toHaveText(SLIDE_LINK_EN);
    const how = page.locator('[data-for-labs="how"]');
    await how.scrollIntoViewIfNeeded();
    await how.click();
    await setUp(page).click();
    await expect(keyScreen(page)).toBeVisible();
    expectNoErrors(errors);
  });

  test('a lab that already has a key lands on its home, no key screen', async ({ page }) => {
    const errors = watch(page);
    await page.addInitScript(() => localStorage.setItem('veilcore.role.v1', 'lab'));
    await standIn(page);
    // A key, as AttesterSetup saves one.
    await page.goto('/');
    await page.evaluate(() =>
      localStorage.setItem(
        'veilcore.attester.v1',
        JSON.stringify({
          displayName: 'E2E lab (test data)',
          role: 'laboratory',
          keypair: { publicKey: 'ab'.repeat(32), privateKey: 'cd'.repeat(32) },
          registeredAt: Date.now(),
        }),
      ),
    );
    await page.goto('/for-labs');
    await setUp(page).click();
    await expect(page.getByRole('heading', { level: 1, name: homeEn['app.home.labJobs'] })).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('main .MuiButton-contained:not(.Mui-disabled)')).toHaveText(
      homeEn['app.home.confirmDelivery'],
    );
    expectNoErrors(errors);
  });
});

test.describe("the header's view menu", () => {
  for (const [name, size] of [
    ['390', PHONE],
    ['1366', DESKTOP],
  ] as const) {
    test(`at ${name}px: lab view in 2 taps from /records, and back`, async ({ page }) => {
      await page.setViewportSize(size);
      const errors = watch(page);
      await standIn(page);
      await page.goto('/records');
      const view = page.locator('[data-view-switch]');
      await expect(view).toBeVisible();
      await expect(view).toHaveText(homeEn['app.home.roleView.breeder']);
      // On the header's first line on a phone too: no wider than the screen, no sideways scroll.
      const box = await view.boundingBox();
      expect(box && box.x + box.width).toBeLessThanOrEqual(size.width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);

      const t = tapper();
      await t.tap(view);
      await t.tap(page.getByRole('menuitemradio', { name: homeEn['app.home.roleView.lab'], exact: true }));
      expect(t.taps).toBe(2);
      await expect(page.getByRole('heading', { level: 1, name: homeEn['app.home.labJobs'] })).toBeVisible();
      await expect(view).toHaveText(homeEn['app.home.roleView.lab']);
      expect(await role(page)).toBe('lab');

      await view.click();
      await expect(
        page.getByRole('menuitemradio', { name: homeEn['app.home.roleView.lab'], exact: true }),
      ).toHaveAttribute('aria-checked', 'true');
      await page.getByRole('menuitemradio', { name: homeEn['app.home.roleView.breeder'], exact: true }).click();
      await expect(view).toHaveText(homeEn['app.home.roleView.breeder']);
      expect(await role(page)).toBe('breeder');
      // The footer's "change" is still there.
      await expect(page.getByRole('button', { name: /Breeder view · change/ })).toBeVisible();
      expectNoErrors(errors);
    });
  }

  test('the public pages have "Use it as a lab", not the view menu', async ({ page }) => {
    await standIn(page);
    await page.goto('/');
    await expect(page.locator('[data-view-switch]')).toHaveCount(0);
    await page.goto('/records');
    await expect(page.locator('[data-view-switch]')).toHaveCount(1);
    await expect(page.locator('[data-for-labs]')).toHaveCount(0);
  });
});

test.describe('a breeder with records of their own', () => {
  const HOLDER = randomBytes(32).toString('hex');
  const VAULT = newVaultKey();
  const ID = `VEIL-${randomBytes(8).toString('hex').toUpperCase()}`;
  const NAME = 'Door test plant (test data)';
  const row = (): Row => {
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
      strainName: NAME,
    };
    const recordFingerprint = createHash('sha256').update(canonicalise(committed)).digest('hex');
    return sealedRecordRow({ id: ID, ...committed, recordFingerprint }, VAULT) as Row;
  };
  const asBreeder = async (page: Page) => {
    await page.addInitScript((holder) => {
      localStorage.setItem('veilcore.holder.v1', holder);
      localStorage.setItem('veilcore.role.v1', 'breeder');
    }, HOLDER);
    await holdVaultKey(page, VAULT);
    await standIn(page, [row()]);
  };

  test('is asked once; "Add lab tools" keeps the records and opens the key screen', async ({ page }) => {
    const errors = watch(page);
    await asBreeder(page);
    await page.goto('/for-labs');
    await setUp(page).click();
    const ask = page.getByRole('dialog', { name: homeEn['app.home.labDoor.title'] });
    await expect(ask).toBeVisible();
    await expect(ask).toContainText(homeEn['app.home.labDoor.text']);
    await expect(ask).toContainText(homeEn['app.home.labDoor.what']);
    await ask.getByRole('button', { name: homeEn['app.home.labDoor.add'] }).click();
    await expect(keyScreen(page)).toBeVisible();
    expect(await role(page)).toBe('both');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { level: 1, name: homeEn['app.home.yourRecords'] })).toBeVisible();
    await expect(page.getByRole('heading', { name: NAME })).toBeVisible();
    await expect(page.locator('[data-view-switch]')).toHaveText(homeEn['app.home.roleView.both']);
    expectNoErrors(errors);
  });

  test('"Not now" leaves the breeder view', async ({ page }) => {
    const errors = watch(page);
    await asBreeder(page);
    await page.goto('/for-labs');
    await setUp(page).click();
    const ask = page.getByRole('dialog', { name: homeEn['app.home.labDoor.title'] });
    await ask.getByRole('button', { name: homeEn['app.home.labDoor.notNow'] }).click();
    // Back on the lab page, nothing changed.
    await expect(page.getByRole('heading', { level: 1, name: homeEn['app.labpage.title'] })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await role(page)).toBe('breeder');
    expectNoErrors(errors);
  });

  test('Escape is "Not now" too', async ({ page }) => {
    const errors = watch(page);
    await asBreeder(page);
    await page.goto('/for-labs');
    await setUp(page).click();
    await expect(page.getByRole('dialog', { name: homeEn['app.home.labDoor.title'] })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { level: 1, name: homeEn['app.labpage.title'] })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await role(page)).toBe('breeder');
    expectNoErrors(errors);
  });
});

test('a browser used before, with no records showing (the registry failed), is asked, not switched', async ({
  page,
}) => {
  const errors = watch(page);
  await page.addInitScript(() => localStorage.setItem('veilcore.holder.v1', 'ab'.repeat(32)));
  await isolate(page, {
    'GET /api/records': (route) => json(route, 503, { error: 'down for the test' }),
    'GET /api/licenses': (route) => json(route, 200, []),
    'GET /api/disclosures': (route) => json(route, 200, []),
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
  });
  await page.goto('/for-labs');
  await setUp(page).click();
  await expect(page.getByRole('dialog', { name: homeEn['app.home.labDoor.title'] })).toBeVisible();
  expect(await role(page)).toBeNull();
  expect(errors.filter((e) => !/503|down for the test/.test(e))).toEqual([]);
});

test("switching to Breeder on the lab's results tools goes to Home", async ({ page }) => {
  const errors = watch(page);
  await page.addInitScript(() => localStorage.setItem('veilcore.role.v1', 'lab'));
  await standIn(page);
  await page.goto('/lab/results');
  await page.locator('[data-view-switch]').click();
  await page.getByRole('menuitemradio', { name: homeEn['app.home.roleView.breeder'], exact: true }).click();
  await expect(page).toHaveURL(/\/records$/);
  expect(await role(page)).toBe('breeder');
  expectNoErrors(errors);
});

test('the key screen shows the website step, the file and the DNS record, without opening anything', async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors = watch(page);
  await isolate(page, {
    'GET /api/records': (route) => json(route, 200, []),
    'GET /api/licenses': (route) => json(route, 200, []),
    'GET /api/disclosures': (route) => json(route, 200, []),
    'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
    'POST /attesters': (route) => json(route, 200, { attesterId: `ATT-${randomBytes(8).toString('hex')}` }),
  });
  await page.goto('/for-labs');
  await setUp(page).click();
  const dialog = page.getByRole('dialog');
  await expect(keyScreen(page)).toBeVisible();
  await dialog.getByLabel(labEn['app.lab.key.name']).fill('E2E lab (test data)');
  await dialog.getByRole('button', { name: labEn['app.lab.key.create'] }).click();
  await expect(dialog.locator('[data-lab-key-ready]')).toBeVisible();
  // No fold stands in front of it: the heading, the file, the TXT record and the domain field.
  await expect(dialog.getByRole('heading', { name: labEn['app.lab.key.optional.title'] })).toBeVisible();
  await expect(dialog.getByRole('button', { name: labEn['app.lab.key.domain.saveFile'] })).toBeVisible();
  await expect(dialog.locator('[data-lab-domain-txt]')).toBeVisible();
  await expect(dialog.getByText(/_veilcore-lab\./)).toBeVisible();
  await expect(dialog.getByLabel(labEn['app.lab.key.domain.field'])).toBeVisible();
  await expect(dialog.getByRole('button', { name: labEn['app.lab.key.domain.look'] })).toBeVisible();
  expectNoErrors(errors);
});
