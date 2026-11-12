// Royalty payments made visible, and paid in a stablecoin on Cardano (docs/royalty-pay.md), in a
// real browser at 360 px, against a stand-in registry and a stand-in Cardano relay:
//   - overdue on both sides' pages, the licensee told what not paying means, the licensor's
//     record's public check page saying "a royalty statement is overdue since <date>" and
//     nothing else (no amount, no name), sent with only a kind and a date;
//   - due soon, as a reminder;
//   - a notice of breach and its cure period on both sides, the licensee's dispute next to the
//     public line, and the cure period running out (in UTC days, the browser's clock moved);
//   - a Cardano payout this build can't pay: the bank details, reference and "I paid" stay (B1);
//   - the stablecoin pay screen: a CIP-30 wallet (a stand-in) pays the licensor's signed
//     address with the reference, and the transaction the page built, read back through the
//     relay, settles the report on both sides with no "received".
// These open the e2e fixture page around the real ledger (src/e2e-fixtures/RoyaltyPayFixture.tsx);
// revoking is tested on the real license page (royalty-revoke.spec.ts). Screenshots in en and ja go
// to E2E_SHOTS (when set) as pay-*.png. All names and figures are practice data.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { API, REAL_REGISTRY, expectNoErrors, isolate, json, watch } from './helpers';

const RECORD = `VEIL-${'E2'.repeat(16)}`;
const HOLDER = 'ab'.repeat(32);
const RELAY = 'http://cardano.e2e.invalid';
const TOKEN = { policyId: 'ab'.repeat(28), assetName: '74555344' };
const SHOTS = process.env.E2E_SHOTS;

test.use({ viewport: { width: 360, height: 780 } });

type C = typeof import('@emurgo/cardano-serialization-lib-browser');
let csl: C | undefined;
const lib = async (): Promise<C> => (csl ??= await import('@emurgo/cardano-serialization-lib-browser'));

/** A licensor's and a licensee's practice addresses on preprod, and a coin of the test token. */
const cardanoFixtures = async () => {
  const C = await lib();
  const key = (s: number) => C.PrivateKey.from_normal_bytes(new Uint8Array(32).fill(s));
  const base = (p: number, s: number) =>
    C.BaseAddress.new(
      0,
      C.Credential.from_keyhash(key(p).to_public().hash()),
      C.Credential.from_keyhash(key(s).to_public().hash()),
    ).to_address();
  const licensor = base(1, 2).to_bech32();
  const payer = base(3, 4);
  const assets = C.Assets.new();
  assets.insert(C.AssetName.new(Buffer.from(TOKEN.assetName, 'hex')), C.BigNum.from_str('5000000000'));
  const ma = C.MultiAsset.new();
  ma.insert(C.ScriptHash.from_hex(TOKEN.policyId), assets);
  const value = C.Value.new(C.BigNum.from_str('20000000'));
  value.set_multiasset(ma);
  const utxo = C.TransactionUnspentOutput.new(
    C.TransactionInput.new(C.TransactionHash.from_hex('77'.repeat(32)), 0),
    C.TransactionOutput.new(payer, value),
  ).to_hex();
  return { licensor, payerHex: payer.to_hex(), utxo };
};

/** A submitted transaction as the relay answers for it, 12 blocks deep. */
const relayAnswer = async (txHex: string) => {
  const C = await lib();
  const fixed = C.FixedTransaction.from_hex(txHex);
  const tx = C.Transaction.from_hex(txHex);
  const outs = tx.body().outputs();
  const outputs = [];
  for (let i = 0; i < outs.len(); i++) {
    const o = outs.get(i);
    const amounts = [{ unit: 'lovelace', quantity: o.amount().coin().to_str() }];
    const q = o
      .amount()
      .multiasset()
      ?.get(C.ScriptHash.from_hex(TOKEN.policyId))
      ?.get(C.AssetName.new(Buffer.from(TOKEN.assetName, 'hex')));
    if (q) amounts.push({ unit: TOKEN.policyId + TOKEN.assetName, quantity: q.to_str() });
    outputs.push({ address: o.address().to_bech32(), amounts });
  }
  const meta = tx.auxiliary_data()?.metadata()?.get(C.BigNum.from_str('674'));
  const msg = meta
    ? (JSON.parse(C.decode_metadatum_to_json_str(meta, C.MetadataJsonSchema.NoConversions)) as { msg: string[] }).msg
    : [];
  return { hash: fixed.transaction_hash().to_hex(), valid: true, confirmations: 12, outputs, msg };
};

/** The stand-in registry for the deal channel, the record's notices and its check page. */
const standIn = async (page: Page, state: Registry) => {
  await isolate(page, {});
  // Registered after isolate, so these answer first for the registry's origin.
  await page.route(`${API}/**`, async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const body = (() => {
      try {
        return JSON.parse(route.request().postData() ?? 'null') as Record<string, unknown>;
      } catch {
        return null;
      }
    })();
    if (method === 'POST' && url.pathname === '/deals') return json(route, 200, { ok: true });
    const m = /^\/deals\/([0-9a-f]{32})\/(messages|read)$/.exec(url.pathname);
    if (m && method === 'POST' && m[2] === 'messages') {
      const iv = String(body?.iv);
      const ct = String(body?.ct);
      const fingerprint = createHash('sha256').update(`${iv}.${ct}`).digest('hex');
      const seq = state.messages.length + 1;
      state.messages.push({ seq, iv, ct, receivedAt: Date.now(), fingerprint });
      return json(route, 200, { seq, fingerprint, receivedAt: Date.now() });
    }
    if (m && method === 'POST' && m[2] === 'read') {
      const after = Number(body?.after ?? 0);
      return json(route, 200, { messages: state.messages.filter((x) => x.seq > after) });
    }
    const n = /^\/api\/records\/([^/]+)\/license-notices\/([0-9a-f]{32})$/.exec(url.pathname);
    if (n && method === 'PUT') {
      state.noticeBodies.push(body);
      state.notices = [...state.notices.filter((x) => x.ref !== n[2]), { ref: n[2], ...(body ?? {}) }];
      return json(route, 200, { ok: true });
    }
    if (n && method === 'DELETE') {
      state.notices = state.notices.filter((x) => x.ref !== n[2]);
      return json(route, 200, { removed: true });
    }
    if (method === 'GET' && url.pathname === `/verify/${RECORD}`)
      return json(route, 200, {
        found: true,
        id: RECORD,
        recordFingerprint: '3f'.repeat(32),
        disclosed: ['own'],
        ...(state.notices.length ? { licenseNotices: state.notices, licenseNoticesBy: 'record-holder' } : {}),
      });
    return route.fallback();
  });
};
type Registry = {
  messages: { seq: number; iv: string; ct: string; receivedAt: number; fingerprint: string }[];
  notices: Record<string, unknown>[];
  noticeBodies: unknown[];
};
const registry = (): Registry => ({ messages: [], notices: [], noticeBodies: [] });

const asHolder = (page: Page, lang: 'en' | 'ja') =>
  page.addInitScript(
    ([h, l]) => {
      localStorage.setItem('veilcore.holder.v1', h);
      localStorage.setItem('veilcore.lang', l);
    },
    [HOLDER, lang],
  );

const shot = async (page: Page, name: string) => {
  // Nothing wider than the phone.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `pay-${name}.png`), fullPage: true });
};

test.describe('royalties: overdue, reminders, revoke for non-payment, the public page', () => {
  test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

  const BREACH = { en: 'Send a notice of breach', ja: '契約違反の通知を送る' } as const;
  const REVOKE = { en: 'Revoke for non-payment', ja: '不払いを理由に取り消す' } as const;
  const DAY = 86_400_000;
  const utc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  for (const lang of ['en', 'ja'] as const) {
    test(`overdue, a notice of breach and its cure period, the licensee's dispute, on both sides and the public page (${lang})`, async ({
      browser,
    }) => {
      test.setTimeout(300_000);
      const state = registry();
      const issuer = await browser.newPage();
      const licensee = await browser.newPage();
      const issuerErrors = watch(issuer);
      const licenseeErrors = watch(licensee);
      for (const p of [issuer, licensee]) {
        await asHolder(p, lang);
        await standIn(p, state);
      }

      // The licensor's page: overdue, the report marked, what the public page now says, and no
      // revoke yet: a notice of breach comes first.
      await issuer.goto('/e2e/royalty-pay?side=issuer&scenario=overdue');
      const alert = issuer.locator('[data-payment-alert="overdue"]');
      await expect(alert).toBeVisible({ timeout: 60_000 });
      await expect(alert).toHaveAttribute('data-cure', 'no-notice');
      if (lang === 'en') {
        await expect(alert).toContainText('Payment for report 1 from Practice Grower is overdue since');
        await expect(alert).toContainText('first send a notice of breach');
      }
      await expect(issuer.locator('[data-report-overdue]')).toBeVisible();
      await expect(issuer.locator('[data-public-notice="shown"]')).toBeVisible();
      await expect(issuer.getByRole('button', { name: REVOKE[lang] })).toHaveCount(0);
      // Sent with a kind and a date, nothing else.
      expect(state.noticeBodies).toHaveLength(1);
      expect(Object.keys(state.noticeBodies[0] as object).sort()).toEqual(['kind', 'since']);
      expect((state.noticeBodies[0] as { kind: string }).kind).toBe('overdue');
      const start = await issuer.locator('[data-e2e-start]').getAttribute('data-e2e-start');
      await shot(issuer, `overdue-licensor-${lang}`);

      // The licensee's page: overdue, and what not paying means.
      await licensee.goto('/e2e/royalty-pay?side=licensee&scenario=overdue');
      const lAlert = licensee.locator('[data-payment-alert="overdue"]');
      await expect(lAlert).toBeVisible({ timeout: 60_000 });
      await expect(lAlert.locator('[data-consequence]')).toBeVisible();
      await expect(lAlert.locator('[data-respond]')).toBeVisible();
      if (lang === 'en')
        await expect(lAlert).toContainText('you have 30 days to pay before the license can be revoked');
      await shot(licensee, `overdue-licensee-${lang}`);

      // The public check page: the line, the holder's word, no amount, no names.
      const visitor = await browser.newPage();
      const visitorErrors = watch(visitor);
      await visitor.addInitScript((l) => localStorage.setItem('veilcore.lang', l), lang);
      await standIn(visitor, state);
      await visitor.goto(`/verify/${RECORD}`);
      const notices = visitor.locator('[data-license-notices]');
      await expect(notices.locator('[data-license-notice="overdue"]')).toBeVisible();
      if (lang === 'en') await expect(notices).toContainText('A royalty statement is overdue since');
      for (const hidden of ['1,000', '1000', 'Practice Grower', 'Hana Rivera', '2.50'])
        await expect(notices).not.toContainText(hidden);
      await shot(visitor, `public-overdue-${lang}`);

      // The licensor sends a notice of breach: signed, dated, with the time to pay.
      const before = state.messages.length;
      await issuer.getByRole('button', { name: BREACH[lang] }).click();
      await expect(issuer.locator('[data-confirm-inline]')).toBeVisible();
      await shot(issuer, `breach-confirm-${lang}`);
      await issuer.locator('[data-confirm-inline] button').first().click();
      await expect.poll(() => state.messages.length, { timeout: 30_000 }).toBe(before + 1);
      const cureBy = utc(Date.now() + 30 * DAY);
      await expect(issuer.locator('[data-payment-alert="overdue"]')).toHaveAttribute('data-cure', 'running', {
        timeout: 30_000,
      });
      await expect(issuer.locator(`[data-payment-alert="overdue"] [data-cure-by="${cureBy}"]`)).toBeVisible();
      await expect(issuer.getByRole('button', { name: REVOKE[lang] })).toHaveCount(0);

      // The licensee sees it, and until when they have to pay.
      await licensee.reload();
      await expect(lAlert).toHaveAttribute('data-cure', 'running', { timeout: 60_000 });
      await expect(licensee.locator(`[data-payment-alert="overdue"] [data-cure-by="${cureBy}"]`)).toBeVisible();
      await expect(licensee.locator('[data-notice="breach"]')).toBeVisible();
      if (lang === 'en') await expect(lAlert).toContainText('Hana Rivera sent a notice of breach on');
      await shot(licensee, `breach-licensee-${lang}`);

      // The licensee answers: a short dispute note, signed. The licensor sees it, and the public
      // line says the licensee disputes it (a date, never what they wrote).
      await lAlert.locator('[data-respond-dispute]').click();
      await licensee.locator('[data-dispute-note] textarea').first().fill('Paid by bank transfer on the due date.');
      await licensee.locator('[data-dispute-send]').click();
      await expect(lAlert.locator('[data-answer]')).toBeVisible({ timeout: 30_000 });
      await issuer.reload();
      const iAnswer = issuer.locator('[data-payment-alert="overdue"] [data-answer]');
      await expect(iAnswer).toContainText('Paid by bank transfer on the due date.', { timeout: 60_000 });
      await expect(issuer.locator('[data-public-notice="shown"]')).toBeVisible();
      const last = state.noticeBodies[state.noticeBodies.length - 1] as Record<string, string>;
      expect(Object.keys(last).sort()).toEqual(['disputed', 'kind', 'since']);
      expect(last.disputed).toBe(utc(Date.now()));
      await visitor.reload();
      await expect(visitor.locator('[data-license-notice-disputed]')).toBeVisible();
      await expect(visitor.locator('[data-license-notices]')).not.toContainText('bank transfer');
      if (lang === 'en')
        await expect(visitor.locator('[data-license-notices]')).toContainText('The licensee disputes this');
      await shot(visitor, `public-disputed-${lang}`);

      // A day before the time to pay runs out: still no revoke. The day after: the cure period
      // is over on both sides (revoking itself is on the real license page, royalty-revoke.spec).
      await issuer.clock.setFixedTime(Date.parse(`${cureBy}T23:00:00Z`));
      await issuer.goto(`/e2e/royalty-pay?side=issuer&scenario=overdue&start=${start}`);
      await expect(issuer.locator('[data-payment-alert="overdue"]')).toHaveAttribute('data-cure', 'running', {
        timeout: 60_000,
      });
      await issuer.clock.setFixedTime(Date.parse(`${cureBy}T00:00:00Z`) + DAY);
      await issuer.goto(`/e2e/royalty-pay?side=issuer&scenario=overdue&start=${start}`);
      await expect(issuer.locator('[data-payment-alert="overdue"]')).toHaveAttribute('data-cure', 'over', {
        timeout: 60_000,
      });
      await shot(issuer, `cure-over-licensor-${lang}`);
      await licensee.clock.setFixedTime(Date.parse(`${cureBy}T00:00:00Z`) + DAY);
      await licensee.goto(`/e2e/royalty-pay?side=licensee&scenario=overdue&start=${start}`);
      await expect(licensee.locator('[data-payment-alert="overdue"]')).toHaveAttribute('data-cure', 'over', {
        timeout: 60_000,
      });
      await shot(licensee, `cure-over-licensee-${lang}`);
      expectNoErrors([...issuerErrors, ...licenseeErrors, ...visitorErrors]);
    });
  }

  test('a Cardano payout this build can’t pay never hides the normal way to pay (B1)', async ({ browser }) => {
    test.setTimeout(240_000);
    const state = registry();
    const issuer = await browser.newPage();
    const licensee = await browser.newPage();
    const errors = [...watch(issuer), ...watch(licensee)];
    for (const p of [issuer, licensee]) {
      await asHolder(p, 'en');
      await standIn(p, state);
    }
    const fx = await cardanoFixtures();
    // USDCx is a mainnet token: this preprod build knows only its test token, so it can't pay it.
    const q = `scenario=usd&method=cardano:USDCx&payTo=${fx.licensor}`;
    await issuer.goto(`/e2e/royalty-pay?side=issuer&${q}`);
    await expect(issuer.locator('[data-payout]')).toBeVisible({ timeout: 60_000 });
    await licensee.goto(`/e2e/royalty-pay?side=licensee&${q}`);
    // The note says why the wallet isn't offered, and the bank details, the reference and "I paid" stay.
    await expect(licensee.locator('[data-pay-on-cardano="other-way"]')).toContainText(
      'Hana Rivera asked to be paid in USDCx on Cardano, which this page can’t pay.',
      { timeout: 60_000 },
    );
    await expect(licensee.locator('[data-pay-on-cardano="off"], [data-pay-on-cardano="not-offered"]')).toHaveCount(0);
    await expect(licensee.locator('[data-pay]')).toContainText('Payment reference');
    await expect(licensee.locator('[data-i-paid]')).toBeVisible();
    await expect(licensee.locator('[data-payment-alert="overdue"]')).toBeVisible();
    await shot(licensee, 'cardano-other-way-en');
    // "I paid": no longer overdue on either side, nothing to revoke, the public line comes off.
    await licensee.locator('[data-i-paid]').click();
    await expect(licensee.locator('[data-payment-alert="overdue"]')).toHaveCount(0, { timeout: 30_000 });
    await issuer.reload();
    await expect(issuer.locator('[data-royalties]')).toBeVisible({ timeout: 60_000 });
    await expect(issuer.locator('[data-payment-alert="overdue"]')).toHaveCount(0);
    await expect.poll(() => state.notices.length, { timeout: 30_000 }).toBe(0);
    expectNoErrors(errors);
  });

  test('due soon: a reminder on both sides, nothing on the public page', async ({ browser }) => {
    test.setTimeout(180_000);
    const state = registry();
    const licensee = await browser.newPage();
    const issuer = await browser.newPage();
    const errors = [...watch(licensee)];
    for (const p of [issuer, licensee]) {
      await asHolder(p, 'en');
      await standIn(p, state);
    }
    await issuer.goto('/e2e/royalty-pay?side=issuer&scenario=soon');
    await expect(issuer.locator('[data-payment-alert="soon"]')).toContainText('from Practice Grower is due on', {
      timeout: 60_000,
    });
    await licensee.goto('/e2e/royalty-pay?side=licensee&scenario=soon');
    await expect(licensee.locator('[data-payment-alert="soon"]')).toContainText(
      'Reminder: payment for report 1 is due on',
      {
        timeout: 60_000,
      },
    );
    await expect(licensee.locator('[data-report-overdue]')).toHaveCount(0);
    expect(state.noticeBodies).toEqual([]);
    await shot(licensee, 'soon-licensee-en');
    expectNoErrors(errors);
  });
});

test.describe('paying in a stablecoin on Cardano (test network)', () => {
  test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

  for (const lang of ['en', 'ja'] as const) {
    test(`the licensee's wallet pays the signed address; the check on Cardano settles it on both sides (${lang})`, async ({
      browser,
    }) => {
      test.setTimeout(240_000);
      const fx = await cardanoFixtures();
      const state = registry();
      const relayAsked: string[] = [];
      const licensee = await browser.newPage();
      const issuer = await browser.newPage();
      const errors = [...watch(licensee), ...watch(issuer)];
      for (const p of [issuer, licensee]) {
        await asHolder(p, lang);
        await standIn(p, state);
        // The Cardano relay: answers for the transaction the stand-in wallet was given to send.
        await p.route(`${RELAY}/**`, async (route) => {
          const hash = new URL(route.request().url()).pathname.split('/').pop()!;
          relayAsked.push(hash);
          const sent = await licensee.evaluate(() => (window as unknown as { __sent?: string }).__sent);
          if (!sent) return json(route, 404, { ok: false });
          const answer = await relayAnswer(sent);
          return answer.hash === hash ? json(route, 200, answer) : json(route, 404, { ok: false });
        });
      }
      // A CIP-30 wallet, standing in: the practice coin, and it "signs" with an empty witness set.
      await licensee.addInitScript(
        ([utxo, change]) => {
          const api = {
            getNetworkId: () => Promise.resolve(0),
            getUtxos: () => Promise.resolve([utxo]),
            getChangeAddress: () => Promise.resolve(change),
            getUsedAddresses: () => Promise.resolve([change]),
            signTx: () => Promise.resolve('a0'),
            submitTx: (tx: string) => {
              (window as unknown as { __sent?: string }).__sent = tx;
              return Promise.resolve('ok');
            },
          };
          (window as unknown as { cardano: unknown }).cardano = {
            practice: { name: 'Practice Wallet', enable: () => Promise.resolve(api) },
          };
        },
        [fx.utxo, fx.payerHex],
      );

      await issuer.goto(`/e2e/royalty-pay?side=issuer&scenario=usd&payTo=${fx.licensor}`);
      await expect(issuer.locator('[data-payout]')).toContainText(fx.licensor, { timeout: 60_000 });
      await licensee.goto(`/e2e/royalty-pay?side=licensee&scenario=usd&payTo=${fx.licensor}`);
      const pay = licensee.locator('[data-pay-on-cardano=""]');
      await expect(pay).toBeVisible({ timeout: 60_000 });
      if (lang === 'en')
        await expect(licensee.locator('[data-pay-cardano]')).toHaveText('Pay 1000.00 tUSD with Practice Wallet');
      await expect(pay.locator('[data-screened]')).toBeVisible();
      await shot(licensee, `stablecoin-pay-${lang}`);

      await licensee.locator('[data-pay-cardano]').click();
      // Recorded in the signed "I paid", then found on Cardano: settled, no "received".
      await expect(licensee.locator('[data-cardano-check="ok"]')).toBeVisible({ timeout: 60_000 });
      const sent = await relayAnswer(await licensee.evaluate(() => (window as unknown as { __sent: string }).__sent));
      const toLicensor = sent.outputs.filter((o) => o.address === fx.licensor);
      expect(toLicensor).toHaveLength(1);
      expect(toLicensor[0].amounts.find((a) => a.unit === TOKEN.policyId + TOKEN.assetName)?.quantity).toBe(
        '1000000000',
      );
      expect(sent.msg).toHaveLength(1);
      expect(sent.msg[0]).toMatch(/^vc1:[0-9a-f]{32}$/);
      // Nothing goes anywhere else: the other outputs are the payer's own change.
      const C = await lib();
      const payerBech = C.Address.from_hex(fx.payerHex).to_bech32();
      expect(sent.outputs.every((o) => o.address === fx.licensor || o.address === payerBech)).toBe(true);
      await shot(licensee, `stablecoin-settled-licensee-${lang}`);

      await issuer.reload();
      await expect(issuer.locator('[data-cardano-check="ok"]')).toBeVisible({ timeout: 60_000 });
      await expect(issuer.locator('[data-confirm-received]')).toHaveCount(0);
      expect(relayAsked.length).toBeGreaterThan(0);
      await shot(issuer, `stablecoin-settled-licensor-${lang}`);
      expectNoErrors(errors);
    });
  }
});
