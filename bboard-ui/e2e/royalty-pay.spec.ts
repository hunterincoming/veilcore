// Royalty payments made visible, and paid in a stablecoin on Cardano (docs/royalty-pay.md), in a
// real browser at 360 px, against a stand-in registry and a stand-in Cardano relay:
//   - overdue on both sides' pages, the licensee told what not paying means, the licensor's
//     record's public check page saying "a royalty statement is overdue since <date>" and
//     nothing else (no amount, no name), sent with only a kind and a date;
//   - due soon, as a reminder;
//   - "Revoke for non-payment": a signed notice to the licensee, then the public page says a
//     license from the record was revoked for non-payment and the overdue line comes off;
//   - the stablecoin pay screen: a CIP-30 wallet (a stand-in) pays the licensor's signed
//     address with the reference, and the transaction the page built, read back through the
//     relay, settles the report on both sides with no "received".
// The license page itself needs a license on Midnight, so these open the e2e fixture page
// around the real ledger (src/e2e-fixtures/RoyaltyPayFixture.tsx). Screenshots in en and ja go
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
    C.BaseAddress.new(0, C.Credential.from_keyhash(key(p).to_public().hash()), C.Credential.from_keyhash(key(s).to_public().hash())).to_address();
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
    const q = o.amount().multiasset()?.get(C.ScriptHash.from_hex(TOKEN.policyId))?.get(C.AssetName.new(Buffer.from(TOKEN.assetName, 'hex')));
    if (q) amounts.push({ unit: TOKEN.policyId + TOKEN.assetName, quantity: q.to_str() });
    outputs.push({ address: o.address().to_bech32(), amounts });
  }
  const meta = tx.auxiliary_data()?.metadata()?.get(C.BigNum.from_str('674'));
  const msg = meta ? (JSON.parse(C.decode_metadatum_to_json_str(meta, C.MetadataJsonSchema.NoConversions)) as { msg: string[] }).msg : [];
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

  for (const lang of ['en', 'ja'] as const) {
    test(`overdue on both sides and on the public check page, then revoked for non-payment (${lang})`, async ({ browser }) => {
      test.setTimeout(240_000);
      const state = registry();
      const issuer = await browser.newPage();
      const licensee = await browser.newPage();
      const issuerErrors = watch(issuer);
      const licenseeErrors = watch(licensee);
      for (const p of [issuer, licensee]) {
        await asHolder(p, lang);
        await standIn(p, state);
      }

      // The licensor's page: overdue, the report marked, and what the public page now says.
      await issuer.goto('/e2e/royalty-pay?side=issuer&scenario=overdue');
      const alert = issuer.locator('[data-payment-alert="overdue"]');
      await expect(alert).toBeVisible({ timeout: 60_000 });
      if (lang === 'en') await expect(alert).toContainText('Payment for report 1 from Practice Grower is overdue since');
      await expect(issuer.locator('[data-report-overdue]')).toBeVisible();
      await expect(issuer.locator('[data-public-notice="shown"]')).toBeVisible();
      // Sent with a kind and a date, nothing else.
      expect(state.noticeBodies).toHaveLength(1);
      expect(Object.keys(state.noticeBodies[0] as object).sort()).toEqual(['kind', 'since']);
      expect((state.noticeBodies[0] as { kind: string }).kind).toBe('overdue');
      await shot(issuer, `overdue-licensor-${lang}`);

      // The licensee's page: overdue, and what not paying means.
      await licensee.goto('/e2e/royalty-pay?side=licensee&scenario=overdue');
      await expect(licensee.locator('[data-payment-alert="overdue"]')).toBeVisible({ timeout: 60_000 });
      await expect(licensee.locator('[data-payment-alert="overdue"] [data-consequence]')).toBeVisible();
      if (lang === 'en')
        await expect(licensee.locator('[data-payment-alert="overdue"]')).toContainText(
          'Not paying shows on the public check page, and the license can be revoked.',
        );
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
      for (const hidden of ['1,000', '1000', 'Practice Grower', 'Hana Rivera', '2.50']) await expect(notices).not.toContainText(hidden);
      await shot(visitor, `public-overdue-${lang}`);

      // Revoke for non-payment: confirm, a signed notice goes to the licensee, the public page changes.
      const before = state.messages.length;
      await issuer.getByRole('button', { name: lang === 'en' ? 'Revoke for non-payment' : '不払いを理由に取り消す' }).click();
      await expect(issuer.locator('[data-confirm-inline]')).toBeVisible();
      await shot(issuer, `revoke-confirm-${lang}`);
      await issuer.locator('[data-confirm-inline] button').first().click();
      await expect(issuer.locator('[data-license-gone="non-payment"]')).toBeVisible({ timeout: 30_000 });
      expect(state.messages.length).toBe(before + 1);
      await shot(issuer, `revoked-licensor-${lang}`);
      await expect(licensee.locator('[data-notice="breach"]')).toBeVisible({ timeout: 30_000 });
      await visitor.reload();
      await expect(visitor.locator('[data-license-notice="revoked"]')).toBeVisible();
      await expect(visitor.locator('[data-license-notice="overdue"]')).toHaveCount(0);
      if (lang === 'en') await expect(visitor.locator('[data-license-notices]')).toContainText('for non-payment');
      await shot(visitor, `public-revoked-${lang}`);
      expectNoErrors([...issuerErrors, ...licenseeErrors, ...visitorErrors]);
    });
  }

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
    await expect(issuer.locator('[data-payment-alert="soon"]')).toContainText('from Practice Grower is due on', { timeout: 60_000 });
    await licensee.goto('/e2e/royalty-pay?side=licensee&scenario=soon');
    await expect(licensee.locator('[data-payment-alert="soon"]')).toContainText('Reminder: payment for report 1 is due on', {
      timeout: 60_000,
    });
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
            getNetworkId: async () => 0,
            getUtxos: async () => [utxo],
            getChangeAddress: async () => change,
            getUsedAddresses: async () => [change],
            signTx: async () => 'a0',
            submitTx: async (tx: string) => {
              (window as unknown as { __sent?: string }).__sent = tx;
              return 'ok';
            },
          };
          (window as unknown as { cardano: unknown }).cardano = { practice: { name: 'Practice Wallet', enable: async () => api } };
        },
        [fx.utxo, fx.payerHex],
      );

      await issuer.goto(`/e2e/royalty-pay?side=issuer&scenario=usd&payTo=${fx.licensor}`);
      await expect(issuer.locator('[data-payout]')).toContainText(fx.licensor, { timeout: 60_000 });
      await licensee.goto(`/e2e/royalty-pay?side=licensee&scenario=usd&payTo=${fx.licensor}`);
      const pay = licensee.locator('[data-pay-on-cardano=""]');
      await expect(pay).toBeVisible({ timeout: 60_000 });
      if (lang === 'en') await expect(licensee.locator('[data-pay-cardano]')).toHaveText('Pay 1000.00 tUSD with Practice Wallet');
      await expect(pay.locator('[data-screened]')).toBeVisible();
      await shot(licensee, `stablecoin-pay-${lang}`);

      await licensee.locator('[data-pay-cardano]').click();
      // Recorded in the signed "I paid", then found on Cardano: settled, no "received".
      await expect(licensee.locator('[data-cardano-check="ok"]')).toBeVisible({ timeout: 60_000 });
      const sent = await relayAnswer((await licensee.evaluate(() => (window as unknown as { __sent: string }).__sent))!);
      const toLicensor = sent.outputs.filter((o) => o.address === fx.licensor);
      expect(toLicensor).toHaveLength(1);
      expect(toLicensor[0].amounts.find((a) => a.unit === TOKEN.policyId + TOKEN.assetName)?.quantity).toBe('1000000000');
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
