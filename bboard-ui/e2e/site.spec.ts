// The built site in a real browser: every page opens, and the parts that only run in a
// browser (the chain code, storage, the prove-by-link pages) load and behave. Runs in CI
// with a stand-in registry and no network at all.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { API, REAL_REGISTRY, expectNoErrors, isolate, json, watch } from './helpers';

const RECORD = `VEIL-${'1A'.repeat(16)}`;
const IDENTITY = 'e1'.repeat(32);
const ANCHOR_TX = 'a7'.repeat(32);
const ANSWER_TX = 'cd'.repeat(32);
/** An answer token as the site makes them: 16 bytes, base64url, 22 characters. */
const TOKEN = 'Abcdefghijklmnopqrstu_';
const TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;
const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
/** H(tag, ...) of SPEC 3.6.1: SHA-256 over the zero-padded tag and 32-byte pieces. */
const H = (tag: string, ...hex: string[]) => {
  const t = Buffer.alloc(32);
  t.write(tag, 'utf8');
  return createHash('sha256')
    .update(Buffer.concat([t, ...hex.map((h) => Buffer.from(h, 'hex'))]))
    .digest('hex');
};
/** A record sealed naming the key made from `secret`: what its share link carries. */
const boundRecord = (secret: string) => {
  const identity = H('veilcore:v1:commit', secret);
  const ks = H('veilcore:v1:keysalt', secret);
  const cd = 'c4'.repeat(32);
  return { identity, ks, cd, fp: H('veilcore:v1:keyrecord', H('veilcore:v1:keybind', identity, ks), cd) };
};

const PAGES: [string, RegExp][] = [
  ['/', /VEILCORE/i],
  ['/founders', /founder/i],
  ['/privacy', /privacy/i],
  ['/verify', /check/i],
  ['/verify/example', /example/i],
  ['/records', /log your first plant|your plants/i],
  ['/records/import', /date your whole collection/i],
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

test('/records/import has its own title, not "Your plants"', async ({ page }) => {
  await isolate(page);
  await page.goto('/records/import');
  await expect(page).toHaveTitle('Date your collection · VeilCore');
});

test.describe('stand-in registry', () => {
  test.skip(REAL_REGISTRY, 'these use the stand-in registry');

  test('the checker asks by link, and an answer is checked by the chain code in the browser', async ({ page }) => {
    const errors = watch(page);
    type Asked = {
      id: string;
      identity: string;
      challenge: string;
      answerTokenHash: string;
      answers: { txId: string; answeredAt: number }[];
    };
    const asked: Asked[] = [];
    await isolate(page, {
      'GET /verify/:record': (route) => json(route, 200, { found: true, id: RECORD, cultivar: 'E2E Plant' }),
      'POST /prove-requests': (route, _url, body) => {
        const b = body as { identity: string; challenge: string; asker: string; answerTokenHash?: string };
        // As the real registry: only the token's SHA-256 comes here, never the token.
        if (!/^[0-9a-f]{64}$/.test(b.answerTokenHash ?? '')) {
          return json(route, 400, { error: 'answerTokenHash must be 64 hex characters' });
        }
        const id = `PR-${'AB'.repeat(16)}`;
        asked.push({
          id,
          identity: b.identity,
          challenge: b.challenge,
          answerTokenHash: b.answerTokenHash!,
          answers: [],
        });
        return json(route, 200, { id, expiresAt: Date.now() + 1e9 });
      },
      'GET /prove-requests/:id': (route) => {
        const r = asked[0];
        if (!r) return json(route, 404, { error: 'no such request' });
        // The token's hash stays on the registry.
        const { id, identity, challenge, answers } = r;
        return json(route, 200, {
          id,
          identity,
          challenge,
          answers,
          asker: '',
          createdAt: Date.now(),
          expiresAt: Date.now() + 1e9,
        });
      },
      // As the real registry: an answer is taken only with the token from the link.
      'POST /prove-requests/:id/answers': (route, _url, body) => {
        const r = asked[0];
        const { txId, token } = (body ?? {}) as { txId?: string; token?: string };
        if (!r) return json(route, 404, { error: 'no such request' });
        if (typeof token !== 'string' || !TOKEN_RE.test(token) || sha256(token) !== r.answerTokenHash) {
          return json(route, 403, { error: 'this answer needs the whole link it was sent with' });
        }
        if (!/^[0-9a-f]{64}$/.test(txId ?? '')) return json(route, 400, { error: 'txId must be 64 hex characters' });
        r.answers.push({ txId: txId!, answeredAt: Date.now() });
        return json(route, 200, { ok: true, answers: r.answers.length });
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

    // The link carries the token in its fragment; the registry only ever saw its hash.
    const link = (await page.getByText(/\/prove\/PR-/).innerText()).trim();
    const token = /#t=([A-Za-z0-9_-]{22})$/.exec(link)?.[1];
    expect(token, 'the link carries its answer token').toBeTruthy();
    expect(asked[0].answerTokenHash).toBe(sha256(token!));
    const answer = (t: string) =>
      page.evaluate(
        async ({ url, txId, token }) =>
          (
            await fetch(url, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ txId, token }),
            })
          ).status,
        { url: `${API}/prove-requests/${asked[0].id}/answers`, txId: ANSWER_TX, token: t },
      );
    // Someone with only the id can't answer.
    expect(await answer(TOKEN)).toBe(403);
    expect(asked[0].answers).toHaveLength(0);

    // An answer arrives. The network is blocked, so the chain code (loaded and run in this
    // browser) can't find it yet and must say so and keep trying, not crash or give up.
    expect(await answer(token!)).toBe(200);
    await expect(page.getByText(/hasn.t shown it yet/)).toBeVisible({ timeout: 60_000 });
    expectNoErrors(errors);
  });

  test('a record that names its own key: the link’s key is checked against it before anything is asked', async ({
    page,
  }) => {
    const errors = watch(page);
    const rec = boundRecord('11'.repeat(32));
    const asked: unknown[] = [];
    await isolate(page, {
      'GET /verify/:record': (route) =>
        json(route, 200, { found: true, id: RECORD, cultivar: 'E2E Plant', recordFingerprint: rec.fp, keyBound: true }),
      'POST /prove-requests': (route, _url, body) => {
        asked.push(body);
        return json(route, 200, { id: `PR-${'AB'.repeat(16)}`, expiresAt: Date.now() + 1e9 });
      },
      'GET /prove-requests/:id': (route) =>
        json(route, 200, {
          id: `PR-${'AB'.repeat(16)}`,
          identity: rec.identity,
          challenge: 'ee'.repeat(32),
          answers: [],
          asker: '',
          createdAt: Date.now(),
          expiresAt: Date.now() + 1e9,
        }),
    });
    const link = (chain: string, extra = `&ks=${rec.ks}&cd=${rec.cd}`) =>
      `/verify/${RECORD}?fp=${rec.fp}&chain=${chain}&anchorTx=${ANCHOR_TX}${extra}`;

    // Someone puts a key they control next to this record: refused, nothing asked.
    const attacker = boundRecord('99'.repeat(32)).identity;
    await page.goto(link(attacker));
    await expect(page.getByText(/Can.t ask for a proof from this link/)).toBeVisible();
    await expect(page.getByText(/The key in this link isn.t the one this record names/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Make a link to send them/ })).toHaveCount(0);

    // The same record's link with the key's parts left out: refused too, not downgraded.
    await page.goto(link(rec.identity, ''));
    await expect(page.getByText(/names its own key, but this link leaves out/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Make a link to send them/ })).toHaveCount(0);
    expect(asked).toHaveLength(0);

    // The record's own key: the page says so, and asks.
    await page.goto(link(rec.identity));
    await expect(page.getByText(/This record named its own key when it was sealed/)).toBeVisible();
    await page.getByRole('button', { name: /Make a link to send them/ }).click();
    await expect(page.getByText(/\/prove\/PR-/)).toBeVisible();
    expect(asked).toHaveLength(1);
    expect((asked[0] as { identity: string }).identity).toBe(rec.identity);
    expectNoErrors(errors);
  });

  test('an older record (no key in it): the earlier wording, labelled as an older record', async ({ page }) => {
    const errors = watch(page);
    await isolate(page, {
      'GET /verify/:record': (route) =>
        json(route, 200, { found: true, id: RECORD, cultivar: 'E2E Plant', keyBound: false }),
    });
    await page.goto(`/verify/${RECORD}?chain=${IDENTITY}&anchorTx=${ANCHOR_TX}`);
    await expect(page.getByText(/Older record: key not bound to this record/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Make a link to send them/ })).toBeVisible();
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
    await page.goto(`/prove/PR-${'CD'.repeat(16)}#t=${TOKEN}`);
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
    await expect(page.getByText(/Someone sent you a code or link/).first()).toBeVisible();
    const role = page.getByRole('button', { name: /I breed/i }).first();
    if (await role.isVisible().catch(() => false)) await role.click();
    await page
      .getByLabel(/Someone sent you a code or link/)
      .fill(`https://elsewhere.example/prove/PR-${'0A'.repeat(16)}#t=${TOKEN}`);
    await page.getByRole('button', { name: /^Go$/ }).click();
    // Our own page, and the answer token kept: without it the holder couldn't answer.
    await expect(page).toHaveURL(
      new RegExp(`127\\.0\\.0\\.1:${process.env.E2E_PORT ?? 4317}/prove/PR-${'0A'.repeat(16)}#t=${TOKEN}$`),
    );
    expectNoErrors(errors);
  });
});

test('registry address the build was made for', () => {
  // A reminder in the report of which registry this run used.
  test.info().annotations.push({ type: 'registry', description: API });
});
