// The built site in a real browser: every page opens, and the parts that only run in a
// browser (the chain code, storage, the prove-by-link pages) load and behave. Runs in CI
// with a stand-in registry and no network at all.
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';
import { API, REAL_REGISTRY, expectNoErrors, isolate, json, watch } from './helpers';

const RECORD = `VEIL-${'1A'.repeat(16)}`;
const IDENTITY = 'e1'.repeat(32);
const ANCHOR_TX = 'a7'.repeat(32);
const ANSWER_TX = 'cd'.repeat(32);

const PAGES: [string, RegExp][] = [
  ['/', /VEILCORE/i],
  ['/founders', /founder/i],
  ['/privacy', /privacy/i],
  ['/verify', /check/i],
  ['/verify/example', /example/i],
  ['/records', /log your first plant|your plants/i],
  ['/new', /plant or line name/i],
  ['/restore', /backup/i],
  ['/backup', /backup/i],
  ['/docs/spec', /specification|spec/i],
  [`/prove/PR-${'0'.repeat(32)}`, /request has ended|can.t open/i],
];

for (const [path, text] of PAGES) {
  test(`${path} opens with no script errors`, async ({ page }) => {
    const errors = watch(page);
    await isolate(page);
    await page.goto(path);
    await expect(page.locator('body')).toContainText(text);
    await page.waitForTimeout(500);
    expectNoErrors(errors);
  });
}

test.describe('stand-in registry', () => {
  test.skip(REAL_REGISTRY, 'these use the stand-in registry');

  test('the checker asks by link, and an answer is checked by the chain code in the browser', async ({ page }) => {
    const errors = watch(page);
    const asked: { id: string; identity: string; challenge: string; answers: string[] }[] = [];
    await isolate(page, {
      'GET /verify/:record': (route) => json(route, 200, { found: true, id: RECORD, cultivar: 'E2E Plant' }),
      'POST /prove-requests': (route, _url, body) => {
        const b = body as { identity: string; challenge: string; asker: string };
        const id = `PR-${'AB'.repeat(16)}`;
        asked.push({ id, identity: b.identity, challenge: b.challenge, answers: [] });
        return json(route, 200, { id, expiresAt: Date.now() + 1e9 });
      },
      'GET /prove-requests/:id': (route) => {
        const r = asked[0];
        return r
          ? json(route, 200, { ...r, asker: '', createdAt: Date.now(), expiresAt: Date.now() + 1e9 })
          : json(route, 404, { error: 'no such request' });
      },
    });

    await page.goto(`/verify/${RECORD}?chain=${IDENTITY}&anchorTx=${ANCHOR_TX}`);
    await page.getByLabel(/Your name or business/).fill('E2E Lab');
    await page.getByRole('button', { name: /Make a link to send them/ }).click();
    await expect(page.getByText(/\/prove\/PR-/)).toBeVisible();
    await expect(page.getByText(/Waiting for them to prove it/)).toBeVisible();
    // The request carries this browser's own challenge, and no holder key.
    expect(asked[0].identity).toBe(IDENTITY);
    expect(asked[0].challenge).toMatch(/^[0-9a-f]{64}$/);

    // An answer arrives. The network is blocked, so the chain code (loaded and run in this
    // browser) can't find it yet and must say so and keep trying, not crash or give up.
    asked[0].answers.push(ANSWER_TX);
    await expect(page.getByText(/hasn.t shown it yet/)).toBeVisible({ timeout: 60_000 });
    expectNoErrors(errors);
  });

  test('the holder opens a prove link: their plant, who asked, one button', async ({ page }) => {
    const errors = watch(page);
    await page.addInitScript(
      ({ record, identity, tx }) => {
        const keys = {
          [record]: {
            recordId: record,
            recordSecret: '11'.repeat(32),
            recoverySecret: '22'.repeat(32),
            createdAt: Date.now(),
            anchor: {
              identity,
              network: 'preview',
              contractAddress: '0'.repeat(64),
              txId: tx,
              txHash: tx,
              blockHeight: 1,
            },
          },
        };
        if (!localStorage.getItem('veilcore.record-keys.v1')) {
          localStorage.setItem('veilcore.record-keys.v1', JSON.stringify(keys));
        }
      },
      { record: RECORD, identity: IDENTITY, tx: ANCHOR_TX },
    );
    await isolate(page, {
      'GET /prove-requests/:id': (route) =>
        json(route, 200, {
          id: `PR-${'CD'.repeat(16)}`,
          identity: IDENTITY,
          challenge: 'ee'.repeat(32),
          asker: 'E2E Lab',
          createdAt: Date.now(),
          expiresAt: Date.now() + 1e9,
          answers: [],
        }),
    });
    await page.goto(`/prove/PR-${'CD'.repeat(16)}`);
    await expect(page.getByRole('heading', { name: /Prove you hold/ })).toBeVisible();
    await expect(page.getByText(/E2E Lab/)).toBeVisible();
    await expect(page.getByText(/VeilCore hasn.t checked that/)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Prove it$/ })).toBeEnabled();
    expectNoErrors(errors);
  });

  test('someone without the plant is told how to get it back, not shown a button', async ({ page }) => {
    const errors = watch(page);
    await isolate(page, {
      'GET /prove-requests/:id': (route) =>
        json(route, 200, {
          id: `PR-${'CD'.repeat(16)}`,
          identity: IDENTITY,
          challenge: 'ee'.repeat(32),
          asker: '',
          createdAt: Date.now(),
          expiresAt: Date.now() + 1e9,
          answers: [],
        }),
    });
    await page.goto(`/prove/PR-${'CD'.repeat(16)}`);
    await expect(page.getByRole('link', { name: /Get my plants back from a backup/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Prove it$/ })).toHaveCount(0);
    expectNoErrors(errors);
  });

  test('the paste box opens a prove link on this site, whatever host it names', async ({ page }) => {
    const errors = watch(page);
    await isolate(page);
    await page.goto('/records');
    const role = page.getByRole('button', { name: /I breed/i }).first();
    if (await role.isVisible().catch(() => false)) await role.click();
    await page
      .getByLabel(/Someone sent you a code or link/)
      .fill(`https://elsewhere.example/prove/PR-${'0A'.repeat(16)}`);
    await page.getByRole('button', { name: /^Go$/ }).click();
    await expect(page).toHaveURL(new RegExp(`127\\.0\\.0\\.1:4317/prove/PR-${'0A'.repeat(16)}$`));
    expectNoErrors(errors);
  });
});

test('registry address the build was made for', () => {
  // A reminder in the report of which registry this run used.
  test.info().annotations.push({ type: 'registry', description: API });
});
