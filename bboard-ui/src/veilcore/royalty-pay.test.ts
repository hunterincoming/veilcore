// Royalty payments made visible and paid in a stablecoin on Cardano (docs/royalty-pay.md):
//   - overdue and due soon, from the terms' dates and the signed messages, on both sides;
//   - the public notice: only a kind, a date and an opaque reference, kept in step by the
//     licensor's page, never touching another license's notices;
//   - a payment checked on Cardano settles its report without "received", only when it carries
//     this report's reference and pays at least what the report leaves to pay (amountOwed less
//     declared tax) to the licensor's signed address;
//   - the transfer the page builds is the one the check accepts (the same library, real CBOR);
//   - the sanctions screen stops a listed address, and an unreadable one;
//   - the NIGHT check compares with the report's amount net of declared tax, never the payer's.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { DealEntry } from './deal-client';
import { wellFormed } from './deal';
import { balanceOwed, ledgerOf, paymentAlerts, periodRows, stateOf, toPayOf, type Ledger } from './royalty-ledger';
import type { LicenseTerms } from './licenses';
import {
  CARDANO_TOKENS,
  cardanoAddressProblem,
  cardanoOffer,
  cardanoTokenOf,
  cardanoUnits,
  cardanoVerdict,
  checkCardanoPayment,
  parseCardanoTx,
  payRef,
  testTokenFrom,
  tokensFor,
  unitOf,
  type CardanoToken,
  type CardanoTx,
} from './cardano-pay';
import { buildPayment, findCardanoWallets, payOnCardano, SanctionsStop, withWitnesses } from './cardano-tx';
import { credentialsOf, OFAC_CARDANO, screenAddresses, type SanctionsList } from './sanctions';
import { noticeRef, noticesOf, parseNotice, syncNotices, type LicenseNotice } from './license-notices';
import { STABLECOIN_PAY, STABLECOIN_PAY_ON_MAINNET } from '../config/copy';

const C = await import('@emurgo/cardano-serialization-lib-browser');

// The holder key the notices are sent under lives in localStorage: a plain one for Node.
{
  const g = globalThis as unknown as { localStorage?: Storage };
  if (!g.localStorage) {
    const m = new Map<string, string>();
    g.localStorage = {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
      clear: () => m.clear(),
      key: (i: number) => [...m.keys()][i] ?? null,
      get length() {
        return m.size;
      },
    };
  }
}

const at = (day: string) => Date.parse(`${day}T12:00:00Z`);
let n = 0;
const msg = (seq: number, m: Record<string, unknown>): DealEntry =>
  ({
    seq,
    fingerprint: `f${seq}`.padEnd(64, '0'),
    receivedAt: at('2026-01-01') + seq,
    mine: false,
    signature: `${(++n).toString(16)}`.padStart(128, 'a'),
    ...m,
  }) as unknown as DealEntry;

// Q1 2026: report due 30 Apr, payment due 14 May.
const terms = {
  startDate: '2026-01-01',
  endDate: '2027-12-31',
  currency: 'USD',
  reporting: { every: 'quarter', reportDueDays: 30, paymentDueDays: 14 },
} as unknown as LicenseTerms;

const accepted = (over: Record<string, unknown> = {}) => {
  const statement = msg(1, {
    type: 'statement',
    statementId: 'S-1',
    periodFrom: '2026-01-01',
    periodTo: '2026-03-31',
    basis: 'units',
    quantity: '400',
    currency: 'USD',
    amountOwed: '1000.00',
    from: 'licensee',
    at: at('2026-04-02'),
    ...over,
  });
  const reply = msg(2, {
    type: 'reply',
    statementSig: statement.signature,
    decision: 'accepted',
    from: 'issuer',
    at: at('2026-04-03'),
  });
  return { statement, reply, sig: statement.signature };
};

// ---- addresses and tokens, made with the real library --------------------------------------

const key = (seed: number) => C.PrivateKey.from_normal_bytes(new Uint8Array(32).fill(seed));
const baseAddress = (network: 0 | 1, pay: number, stake: number) =>
  C.BaseAddress.new(
    network,
    C.Credential.from_keyhash(key(pay).to_public().hash()),
    C.Credential.from_keyhash(key(stake).to_public().hash()),
  ).to_address();
const enterpriseAddress = (network: 0 | 1, pay: number) =>
  C.EnterpriseAddress.new(network, C.Credential.from_keyhash(key(pay).to_public().hash())).to_address();

const LICENSOR_TEST = baseAddress(0, 1, 2).to_bech32();
const PAYER_TEST = baseAddress(0, 3, 4);
const LICENSOR_MAIN = baseAddress(1, 1, 2).to_bech32();
const TEST_TOKEN: CardanoToken = {
  code: 'tUSD',
  pays: 'USD',
  network: 'preprod',
  policyId: 'ab'.repeat(28),
  assetName: '74555344',
  decimals: 6,
};

const cardanoPayout = (seq: number, over: Record<string, unknown> = {}) =>
  msg(seq, {
    type: 'payout',
    method: 'cardano:tUSD',
    account: LICENSOR_TEST,
    currency: 'USD',
    rate: '1',
    from: 'issuer',
    at: at('2026-04-01'),
    ...over,
  });

describe('due soon and overdue, on both sides', () => {
  const { statement, reply, sig } = accepted();
  const l = ledgerOf([statement, reply]);
  it('due soon within a week of the due date, with the days left', () => {
    expect(paymentAlerts(terms, l, '2026-05-06')).toEqual([]);
    const [a] = paymentAlerts(terms, l, '2026-05-10');
    expect(a).toMatchObject({ kind: 'soon', due: '2026-05-14', days: 4 });
    expect(paymentAlerts(terms, l, '2026-05-14')[0]).toMatchObject({ kind: 'soon', days: 0 });
  });
  it('overdue from the day after, since that day, for as long as it is unpaid', () => {
    const [a] = paymentAlerts(terms, l, '2026-05-20');
    expect(a).toMatchObject({ kind: 'overdue', due: '2026-05-14', since: '2026-05-15', days: 6 });
    expect(a.report.statement.signature).toBe(sig);
  });
  it('a short payment stays overdue; "I paid" in full, received or nothing due does not', () => {
    const short = ledgerOf([statement, reply, msg(3, paidBody(sig, '400.00'))]);
    expect(paymentAlerts(terms, short, '2026-05-20')[0]).toMatchObject({ kind: 'overdue' });
    const paid = ledgerOf([statement, reply, msg(3, paidBody(sig, '1000.00'))]);
    expect(paymentAlerts(terms, paid, '2026-05-20')).toEqual([]);
    const nothing = accepted({ amountOwed: '0.00', statementId: 'S-0' });
    expect(paymentAlerts(terms, ledgerOf([nothing.statement, nothing.reply]), '2026-05-20')).toEqual([]);
  });
  it('a report not yet accepted is never "overdue for payment"', () => {
    expect(paymentAlerts(terms, ledgerOf([statement]), '2026-06-30')).toEqual([]);
  });
});

const paidBody = (sig: string, amount: string, over: Record<string, unknown> = {}) => ({
  type: 'paid',
  statementSig: sig,
  statementId: 'S-1',
  amount,
  currency: 'USD',
  method: 'bank',
  payTo: '',
  reference: 'HR-7Q4K',
  paidOn: '2026-05-01',
  from: 'licensee',
  at: at('2026-05-01'),
  ...over,
});

describe('settled on chain, without "received"', () => {
  const { statement, reply, sig } = accepted({ taxWithheld: '100.00' });
  const payout = cardanoPayout(3);
  const tx = 'c1'.repeat(32);
  const paid = msg(4, paidBody(sig, '900.00', { method: 'cardano:tUSD', reference: tx, payoutSig: payout.signature }));
  it('a checked transaction settles the report; the next date and the balance move on', () => {
    const plain = ledgerOf([statement, reply, payout, paid]);
    expect(stateOf(plain.reports[0])).toBe('paid');
    const l = ledgerOf([statement, reply, payout, paid], new Map([[sig, { tx }]]));
    expect(stateOf(l.reports[0])).toBe('settled');
    expect(l.reports[0].chainSettled).toEqual({ tx });
    expect(periodRows(terms, l, '2026-06-01')[0].step).toBe('done');
    expect(balanceOwed(l, 'USD')).toBe('0.00');
  });
  it('only for the transaction the payment names', () => {
    const l = ledgerOf([statement, reply, payout, paid], new Map([[sig, { tx: 'd2'.repeat(32) }]]));
    expect(stateOf(l.reports[0])).toBe('paid');
  });
  it('the amount checked is what the report leaves to pay: owed less its declared tax', () => {
    expect(toPayOf(ledgerOf([statement, reply]).reports[0], '100.00')).toBe('900.00');
  });
});

describe('the payment reference', () => {
  it('is vc1: and 32 hex of SHA-256 over the statement signature and the address', () => {
    const sig = 'ab'.repeat(64);
    const want =
      'vc1:' + createHash('sha256').update(`veilcore/pay-ref/v1\n${sig}\n${LICENSOR_TEST}`).digest('hex').slice(0, 32);
    expect(payRef(sig, LICENSOR_TEST)).toBe(want);
    expect(payRef(sig, LICENSOR_TEST)).toHaveLength(36);
    expect(payRef(sig, LICENSOR_MAIN)).not.toBe(want);
  });
  it('matches the conformance vectors the published checker uses (SPEC 11.10)', () => {
    const v = JSON.parse(readFileSync(new URL('./fixtures/onchain-settle-v1.json', import.meta.url), 'utf8')) as {
      payRef: { statementSig: string; payTo: string; ref: string }[];
      verdicts: { name: string; tx: CardanoTx; expect: Parameters<typeof cardanoVerdict>[1]; result: unknown }[];
    };
    for (const r of v.payRef) expect(payRef(r.statementSig, r.payTo)).toBe(r.ref);
    for (const c of v.verdicts) {
      const tx = parseCardanoTx(c.tx)!;
      const got = cardanoVerdict(tx, { ...c.expect, want: BigInt(c.expect.want) });
      const plain = JSON.parse(
        JSON.stringify(got, (_k, x: unknown) => (typeof x === 'bigint' ? String(x) : x)),
      ) as unknown;
      expect(plain, c.name).toEqual(c.result);
    }
  });
});

const txFor = (over: Partial<CardanoTx> & { ref?: string; units?: bigint; to?: string } = {}): CardanoTx => ({
  hash: 'c1'.repeat(32),
  valid: true,
  confirmations: 12,
  outputs: [
    {
      address: over.to ?? LICENSOR_TEST,
      amounts: [
        { unit: 'lovelace', quantity: '1200000' },
        { unit: unitOf(TEST_TOKEN), quantity: String(over.units ?? 900_000_000n) },
      ],
    },
  ],
  msg: [over.ref ?? payRef('ab'.repeat(64), LICENSOR_TEST)],
  ...over,
});

describe('a transaction pays a report only in full, with its reference, to the signed address', () => {
  const expectation = {
    payTo: LICENSOR_TEST,
    unit: unitOf(TEST_TOKEN),
    want: 900_000_000n,
    ref: payRef('ab'.repeat(64), LICENSOR_TEST),
  };
  it('ok in full or more', () => {
    expect(cardanoVerdict(txFor(), expectation)).toEqual({ ok: true, paid: 900_000_000n });
    expect(cardanoVerdict(txFor({ units: 950_000_000n }), expectation)).toMatchObject({ ok: true });
  });
  it('short, none, wrong address, wrong reference, two references, failed, too shallow', () => {
    expect(cardanoVerdict(txFor({ units: 899_999_999n }), expectation)).toEqual({
      ok: false,
      why: 'short',
      paid: 899_999_999n,
    });
    expect(cardanoVerdict(txFor({ to: LICENSOR_MAIN }), expectation)).toMatchObject({ why: 'none' });
    expect(cardanoVerdict(txFor({ ref: payRef('cd'.repeat(64), LICENSOR_TEST) }), expectation)).toMatchObject({
      why: 'wrong-ref',
    });
    expect(
      cardanoVerdict(txFor({ msg: [expectation.ref, payRef('cd'.repeat(64), LICENSOR_TEST)] }), expectation),
    ).toMatchObject({
      why: 'many-refs',
    });
    expect(cardanoVerdict(txFor({ msg: ['hello'] }), expectation)).toMatchObject({ why: 'no-ref' });
    expect(cardanoVerdict(txFor({ valid: false }), expectation)).toMatchObject({ why: 'failed' });
    expect(cardanoVerdict(txFor({ confirmations: 9 }), expectation)).toMatchObject({ why: 'unconfirmed' });
  });
  it('another token in the same output doesn’t count', () => {
    const other = txFor();
    const tx = {
      ...other,
      outputs: [{ address: LICENSOR_TEST, amounts: [{ unit: 'ff'.repeat(28) + '74555344', quantity: '900000000' }] }],
    };
    expect(cardanoVerdict(tx, expectation)).toMatchObject({ why: 'none' });
  });
});

describe('when stablecoin pay is offered', () => {
  const tokens = [TEST_TOKEN];
  it('USD statement, USD payout, 1:1, a payment address on the build’s Cardano network', () => {
    const p = { method: 'cardano:tUSD', account: LICENSOR_TEST, currency: 'USD', rate: '1' };
    expect(cardanoOffer('USD', p, tokens, 'preprod').token).toBe(TEST_TOKEN);
    expect(cardanoOffer('EUR', p, tokens, 'preprod')).toEqual({ why: 'currency' });
    expect(cardanoOffer('USD', { ...p, rate: undefined }, tokens, 'preprod')).toEqual({ why: 'rate' });
    expect(cardanoOffer('USD', { ...p, rate: '1.01' }, tokens, 'preprod')).toEqual({ why: 'rate' });
    expect(cardanoOffer('USD', { ...p, account: LICENSOR_MAIN }, tokens, 'preprod')).toEqual({ why: 'address' });
    expect(cardanoOffer('USD', { ...p, method: 'cardano:XYZ' }, tokens, 'preprod')).toEqual({ why: 'not-cardano' });
    expect(cardanoOffer('USD', { ...p, method: 'bank' }, tokens, 'preprod')).toEqual({ why: 'not-cardano' });
  });
  it('mainnet knows USDCx and USDM, pinned in source; a test token never on mainnet', () => {
    expect(tokensFor('mainnet', 'tUSD:' + 'ab'.repeat(28) + ':74555344:6').map((t) => t.code)).toEqual([
      'USDCx',
      'USDM',
    ]);
    expect(tokensFor('preprod', 'tUSD:' + 'ab'.repeat(28) + ':74555344:6').map((t) => t.code)).toEqual(['tUSD']);
    expect(testTokenFrom('tUSD:short:00:6', 'preprod')).toBeUndefined();
    expect(cardanoTokenOf('cardano:USDCx', CARDANO_TOKENS)?.policyId).toBe(
      '1f3aec8bfe7ea4fe14c5f121e2a92e301afe414147860d557cac7e34',
    );
    expect(cardanoUnits('123.45', CARDANO_TOKENS[0])).toBe(123_450_000n);
  });
  it('off everywhere unless switched on: mainnet by code only, a test build by VITE_STABLECOIN_PAY=on and a test token', () => {
    expect(STABLECOIN_PAY_ON_MAINNET).toBe(false);
    // This unit-test build sets neither, so it is off (the test site's deploy sets neither too).
    expect(STABLECOIN_PAY).toBe(false);
    const src = readFileSync(new URL('../config/copy.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/export const STABLECOIN_PAY_ON_MAINNET = false;/);
    expect(src).toMatch(
      /export const STABLECOIN_PAY = IS_MAINNET\s*\?\s*STABLECOIN_PAY_ON_MAINNET\s*:\s*import\.meta\.env\.VITE_STABLECOIN_PAY === 'on' && !!import\.meta\.env\.VITE_CARDANO_TEST_ASSET;/,
    );
    // Only the end-to-end build switches it on; no deploy script names the setting.
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(
      Object.entries(pkg.scripts)
        .filter(([, v]) => v.includes('VITE_STABLECOIN_PAY'))
        .map(([k]) => k),
    ).toEqual(['e2e:build']);
    for (const f of ['../../../scripts/deploy-mainnet.mjs', '../../../scripts/deploy-test-site.mjs'])
      expect(readFileSync(new URL(f, import.meta.url), 'utf8')).not.toMatch(/VITE_STABLECOIN_PAY/);
  });
  it('addresses: checksum, a payment address, and the network in prefix and header', () => {
    expect(cardanoAddressProblem(LICENSOR_TEST, 'preprod')).toBeUndefined();
    expect(cardanoAddressProblem(LICENSOR_MAIN, 'mainnet')).toBeUndefined();
    expect(cardanoAddressProblem(LICENSOR_MAIN, 'preprod')).toMatch(/another Cardano network/);
    expect(cardanoAddressProblem(LICENSOR_TEST.slice(0, -1) + 'q', 'preprod')).toMatch(/isn’t a Cardano address/);
    const stake = C.RewardAddress.new(0, C.Credential.from_keyhash(key(2).to_public().hash()))
      .to_address()
      .to_bech32();
    expect(cardanoAddressProblem(stake, 'preprod')).toMatch(/payment address/);
  });
  it('a payout says 1:1 in a field the published checker reads as a decimal', () => {
    const base = {
      type: 'payout',
      method: 'cardano:USDCx',
      account: LICENSOR_MAIN,
      currency: 'USD',
      from: 'issuer',
      at: at('2026-04-01'),
    };
    expect(wellFormed({ ...base, rate: '1' }, at('2026-06-01'))).toBe(true);
    expect(wellFormed({ ...base }, at('2026-06-01'))).toBe(true);
    expect(wellFormed({ ...base, rate: 'one' }, at('2026-06-01'))).toBe(false);
  });
});

describe('checking a payment through the Cardano relay', () => {
  const sig = 'ab'.repeat(64);
  const p = { tx: 'c1'.repeat(32), payTo: LICENSOR_TEST, token: TEST_TOKEN, amount: '900.00', statementSig: sig };
  const relay = 'https://relay.test/cardano';
  const answering =
    (status: number, body?: unknown, seen: string[] = []): typeof fetch =>
    (url) => {
      seen.push(url instanceof Request ? url.url : url.toString());
      return Promise.resolve(new Response(body === undefined ? '' : JSON.stringify(body), { status }));
    };
  it('reads <relay>/tx/<hash> and settles a full payment', async () => {
    const seen: string[] = [];
    const r = await checkCardanoPayment(p, { relay, fetch: answering(200, txFor(), seen) });
    expect(r).toEqual({ ok: true, tx: p.tx, paid: 900_000_000n, confirmations: 12 });
    expect(seen).toEqual([`${relay}/tx/${p.tx}`]);
  });
  it('the amount is the report’s, never what the payer wrote', async () => {
    const r = await checkCardanoPayment({ ...p, amount: '1000.00' }, { relay, fetch: answering(200, txFor()) });
    expect(r).toMatchObject({ ok: false, why: 'short' });
  });
  it('not found, unreachable, an answer about another transaction, no relay, not a hash', async () => {
    expect(await checkCardanoPayment(p, { relay, fetch: answering(404) })).toMatchObject({ why: 'not-found' });
    expect(await checkCardanoPayment(p, { relay, fetch: answering(502) })).toMatchObject({ why: 'unreachable' });
    expect(
      await checkCardanoPayment(p, { relay, fetch: answering(200, { ...txFor(), hash: 'd2'.repeat(32) }) }),
    ).toMatchObject({ why: 'unreachable' });
    expect(await checkCardanoPayment(p, { relay: undefined })).toMatchObject({ why: 'no-relay' });
    expect(await checkCardanoPayment({ ...p, tx: 'HR-7Q4K' }, { relay })).toMatchObject({ why: 'not-tx' });
  });
});

// ---- the transfer the page builds is the one the check accepts --------------------------------

const utxoHex = (
  address: ReturnType<typeof C.Address.from_bech32>,
  lovelace: string,
  tokenUnits?: bigint,
  index = 0,
) => {
  const value = C.Value.new(C.BigNum.from_str(lovelace));
  if (tokenUnits) {
    const assets = C.Assets.new();
    assets.insert(C.AssetName.new(Buffer.from(TEST_TOKEN.assetName, 'hex')), C.BigNum.from_str(String(tokenUnits)));
    const ma = C.MultiAsset.new();
    ma.insert(C.ScriptHash.from_hex(TEST_TOKEN.policyId), assets);
    value.set_multiasset(ma);
  }
  return C.TransactionUnspentOutput.new(
    C.TransactionInput.new(C.TransactionHash.from_hex('77'.repeat(32)), index),
    C.TransactionOutput.new(address, value),
  ).to_hex();
};

/** The built transaction as the relay would answer for it once 12 blocks deep. */
const asRelayTx = (hex: string, hash: string): CardanoTx => {
  const tx = C.Transaction.from_hex(hex);
  const outs = tx.body().outputs();
  const outputs: CardanoTx['outputs'][number][] = [];
  for (let i = 0; i < outs.len(); i++) {
    const o = outs.get(i);
    const amounts = [{ unit: 'lovelace', quantity: o.amount().coin().to_str() }];
    const ma = o.amount().multiasset();
    const assets = ma?.get(C.ScriptHash.from_hex(TEST_TOKEN.policyId));
    const q = assets?.get(C.AssetName.new(Buffer.from(TEST_TOKEN.assetName, 'hex')));
    if (q) amounts.push({ unit: unitOf(TEST_TOKEN), quantity: q.to_str() });
    outputs.push({ address: o.address().to_bech32(), amounts });
  }
  const meta = tx.auxiliary_data()?.metadata()?.get(C.BigNum.from_str('674'));
  const json = meta
    ? (JSON.parse(C.decode_metadatum_to_json_str(meta, C.MetadataJsonSchema.NoConversions)) as { msg: string[] })
    : { msg: [] };
  return { hash, valid: true, confirmations: 12, outputs, msg: json.msg };
};

describe('building the transfer with the wallet’s own coins', () => {
  const sig = 'ab'.repeat(64);
  const ref = payRef(sig, LICENSOR_TEST);
  const coins = [utxoHex(PAYER_TEST, '20000000', 2_000_000_000n), utxoHex(PAYER_TEST, '5000000', undefined, 1)];
  it('one output to the licensor with the token and the minimum ada, change back, and the reference', () => {
    const built = buildPayment(C, {
      utxos: coins,
      change: PAYER_TEST.to_hex(),
      recipient: LICENSOR_TEST,
      token: TEST_TOKEN,
      units: 900_000_000n,
      ref,
    });
    expect(built.hash).toMatch(/^[0-9a-f]{64}$/);
    const tx = asRelayTx(built.tx, built.hash);
    const toLicensor = tx.outputs.filter((o) => o.address === LICENSOR_TEST);
    expect(toLicensor).toHaveLength(1);
    expect(toLicensor[0].amounts.find((a) => a.unit === unitOf(TEST_TOKEN))?.quantity).toBe('900000000');
    expect(BigInt(toLicensor[0].amounts[0].quantity)).toBeGreaterThan(900_000n); // the minimum ada
    expect(tx.msg).toEqual([ref]);
    // Nothing goes anywhere else: every other output is the payer's own change.
    expect(tx.outputs.every((o) => o.address === LICENSOR_TEST || o.address === PAYER_TEST.to_bech32())).toBe(true);
    // And the check accepts exactly this transfer.
    expect(cardanoVerdict(tx, { payTo: LICENSOR_TEST, unit: unitOf(TEST_TOKEN), want: 900_000_000n, ref })).toEqual({
      ok: true,
      paid: 900_000_000n,
    });
  });
  it('the wallet’s witnesses go on the exact body built: the hash doesn’t change', () => {
    const built = buildPayment(C, {
      utxos: coins,
      change: PAYER_TEST.to_hex(),
      recipient: LICENSOR_TEST,
      token: TEST_TOKEN,
      units: 900_000_000n,
      ref,
    });
    const hash = C.TransactionHash.from_hex(built.hash);
    const ws = C.TransactionWitnessSet.new();
    const vk = C.Vkeywitnesses.new();
    vk.add(C.make_vkey_witness(hash, key(3)));
    ws.set_vkeys(vk);
    const signed = withWitnesses(C, built.tx, ws.to_hex());
    expect(signed.hash).toBe(built.hash);
    expect(C.Transaction.from_hex(signed.tx).witness_set().vkeys()?.len()).toBe(1);
  });
  it('too few tokens in the wallet: it refuses to build', () => {
    expect(() =>
      buildPayment(C, {
        utxos: [utxoHex(PAYER_TEST, '20000000', 1_000n)],
        change: PAYER_TEST.to_hex(),
        recipient: LICENSOR_TEST,
        token: TEST_TOKEN,
        units: 900_000_000n,
        ref,
      }),
    ).toThrow();
  });
});

/** A CIP-30 wallet over the real library: it signs with key 3 and remembers what it was asked. */
const fakeWallet = (opts: { networkId?: number; addresses?: string[] } = {}) => {
  const calls: string[] = [];
  const api = {
    getNetworkId: () => Promise.resolve(opts.networkId ?? 0),
    getUtxos: () => Promise.resolve([utxoHex(PAYER_TEST, '20000000', 2_000_000_000n)]),
    getChangeAddress: () => Promise.resolve(PAYER_TEST.to_hex()),
    getUsedAddresses: () => Promise.resolve(opts.addresses ?? [PAYER_TEST.to_hex()]),
    signTx: (tx: string) => {
      calls.push('sign');
      const body = C.FixedTransaction.from_hex(tx);
      const ws = C.TransactionWitnessSet.new();
      const vk = C.Vkeywitnesses.new();
      vk.add(C.make_vkey_witness(body.transaction_hash(), key(3)));
      ws.set_vkeys(vk);
      return Promise.resolve(ws.to_hex());
    },
    submitTx: (tx: string) => {
      calls.push('submit');
      return Promise.resolve(C.FixedTransaction.from_hex(tx).transaction_hash().to_hex());
    },
  };
  return { entry: { id: 'fake', name: 'Fake', enable: () => Promise.resolve(api) }, calls };
};

describe('paying from a CIP-30 wallet', () => {
  const p = {
    token: TEST_TOKEN,
    units: 900_000_000n,
    recipient: LICENSOR_TEST,
    ref: payRef('ab'.repeat(64), LICENSOR_TEST),
  };
  it('builds, the wallet signs, the hash is kept before it is sent, then sent', async () => {
    const w = fakeWallet();
    const order: string[] = [];
    const hash = await payOnCardano(w.entry, p, {
      csl: C,
      network: 'preprod',
      onSigned: (h) => {
        order.push(`kept ${h}`);
        w.calls.push('kept');
      },
    });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(w.calls).toEqual(['sign', 'kept', 'submit']);
    expect(order).toEqual([`kept ${hash}`]);
  });
  it('a wallet on another network: nothing is built', async () => {
    const w = fakeWallet({ networkId: 1 });
    await expect(payOnCardano(w.entry, p, { csl: C, network: 'preprod', onSigned: () => {} })).rejects.toThrow(
      /another Cardano network/,
    );
    expect(w.calls).toEqual([]);
  });
  it('a listed address on either side stops it before anything is built or signed', async () => {
    const listed: SanctionsList = { ...OFAC_CARDANO, addresses: [enterpriseAddress(0, 3).to_bech32()] };
    const w = fakeWallet();
    await expect(
      payOnCardano(w.entry, p, {
        csl: C,
        network: 'preprod',
        onSigned: () => {},
        screen: (a) => screenAddresses(a, listed),
      }),
    ).rejects.toBeInstanceOf(SanctionsStop);
    expect(w.calls).toEqual([]);
  });
  it('finds wallets that have enable(), each once', () => {
    const lace = { name: 'Lace', enable: () => Promise.resolve({}) };
    expect(findCardanoWallets({ lace, alias: lace, junk: { name: 'x' }, n: 3 }).map((w) => w.name)).toEqual(['Lace']);
    expect(findCardanoWallets(undefined)).toEqual([]);
  });
});

describe('the sanctions screen', () => {
  const listed: SanctionsList = { ...OFAC_CARDANO, addresses: [enterpriseAddress(0, 9).to_bech32()] };
  it('a listed address, or one sharing its payment or stake key, is stopped; others pass', () => {
    expect(screenAddresses([LICENSOR_TEST], listed)).toEqual({ clear: true });
    const sameKey = baseAddress(0, 9, 5).to_bech32();
    expect(screenAddresses([LICENSOR_TEST, sameKey], listed)).toEqual({ clear: false, address: sameKey });
    const stakeListed: SanctionsList = { ...OFAC_CARDANO, addresses: [baseAddress(0, 8, 2).to_bech32()] };
    expect(screenAddresses([LICENSOR_TEST], stakeListed)).toMatchObject({ clear: false });
  });
  it('reads Bech32 and a wallet’s raw hex alike, and stops what it can’t read', () => {
    expect(credentialsOf(PAYER_TEST.to_hex())).toEqual(credentialsOf(PAYER_TEST.to_bech32()));
    expect(screenAddresses(['not an address'], listed)).toEqual({ clear: false, unreadable: 'not an address' });
  });
  it('the bundled list says where it came from and when', () => {
    expect(OFAC_CARDANO.source).toMatch(/^https:\/\/www\.treasury\.gov\/ofac\//);
    expect(OFAC_CARDANO.extracted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Array.isArray(OFAC_CARDANO.addresses)).toBe(true);
  });
});

describe('the public notice: a kind, a date and an opaque reference, nothing else', () => {
  it('references are 32 hex, per kind and subject, and say nothing without the signature', () => {
    const a = noticeRef('overdue', 'ab'.repeat(64));
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(noticeRef('overdue', 'cd'.repeat(64))).not.toBe(a);
    expect(noticeRef('revoked', 'ab'.repeat(64))).not.toBe(a);
  });
  it('reads only the two shapes; any amount, name or free text is dropped', () => {
    const ref = 'a'.repeat(32);
    expect(parseNotice({ ref, kind: 'overdue', since: '2026-05-15' })).toEqual({
      ref,
      kind: 'overdue',
      since: '2026-05-15',
    });
    expect(parseNotice({ ref, kind: 'revoked', reason: 'non-payment', on: '2026-06-01' })).toBeTruthy();
    expect(parseNotice({ ref, kind: 'revoked', reason: 'they were rude', on: '2026-06-01' })).toBeUndefined();
    expect(parseNotice({ ref, kind: 'overdue', since: '15 May' })).toBeUndefined();
    expect(parseNotice({ ref: 'x', kind: 'overdue', since: '2026-05-15' })).toBeUndefined();
    const out = noticesOf({
      licenseNotices: [{ ref, kind: 'overdue', since: '2026-05-15', amount: '1000', licensee: 'Bo' }],
    });
    expect(out).toEqual([{ ref, kind: 'overdue', since: '2026-05-15' }]);
  });
  it('the licensor’s page puts up what is overdue, takes off its own stale ones, leaves other licenses’ alone', async () => {
    const mineOld = noticeRef('overdue', 'ab'.repeat(64));
    const mineNew = noticeRef('overdue', 'cd'.repeat(64));
    const othersLicense = noticeRef('overdue', 'ef'.repeat(64));
    let published = [
      { ref: mineOld, kind: 'overdue', since: '2026-02-15' },
      { ref: othersLicense, kind: 'overdue', since: '2026-03-01' },
    ];
    const calls: string[] = [];
    localStorage.setItem('veilcore.holder.v1', 'ab'.repeat(32));
    const f: typeof fetch = (url, init) => {
      const u = url instanceof Request ? url.url : url.toString();
      const method = init?.method ?? 'GET';
      calls.push(`${method} ${u.replace(/^.*?(\/(api|verify)\/)/, '$1')}`);
      if (method === 'GET')
        return Promise.resolve(
          new Response(JSON.stringify({ found: true, licenseNotices: published }), { status: 200 }),
        );
      const ref = u.split('/').pop()!;
      if (method === 'PUT')
        published = [
          ...published.filter((x) => x.ref !== ref),
          { ref, ...(JSON.parse(init!.body as string) as { kind: string; since: string }) },
        ];
      if (method === 'DELETE') published = published.filter((x) => x.ref !== ref);
      return Promise.resolve(new Response('{}', { status: 200 }));
    };
    const want = new Map<string, LicenseNotice>([[mineNew, { kind: 'overdue', since: '2026-05-15' }]]);
    const r = await syncNotices('rec-1', want, new Set([mineOld, mineNew]), f);
    expect(r.outcome).toBe('ok');
    expect(calls).toEqual([
      'GET /verify/rec-1',
      `PUT /api/records/rec-1/license-notices/${mineNew}`,
      `DELETE /api/records/rec-1/license-notices/${mineOld}`,
    ]);
    expect(published.map((x) => x.ref).sort()).toEqual([mineNew, othersLicense].sort());
    // Nothing changed: nothing is sent again.
    calls.length = 0;
    await syncNotices('rec-1', want, new Set([mineOld, mineNew]), f);
    expect(calls).toEqual(['GET /verify/rec-1']);
  });
  it('a registry from before notices: said, not hidden', async () => {
    localStorage.setItem('veilcore.holder.v1', 'ab'.repeat(32));
    const f: typeof fetch = (_url, init) =>
      Promise.resolve(
        new Response(init?.method === 'PUT' ? '{"error":"not found"}' : '{"found":true}', {
          status: init?.method === 'PUT' ? 404 : 200,
        }),
      );
    const r = await syncNotices(
      'rec-1',
      new Map([['a'.repeat(32), { kind: 'overdue', since: '2026-05-15' }]]),
      new Set(),
      f,
    );
    expect(r.outcome).toBe('unsupported');
  });
});

describe('the NIGHT check compares with what the report leaves to pay', () => {
  it('the licensor’s check is given toPayOf (amountOwed less declared tax), never the payer’s amount', () => {
    const src = readFileSync(new URL('../components/licensing/RoyaltyLedger.tsx', import.meta.url), 'utf8');
    const check = src.slice(
      src.indexOf('<OnChainPaymentCheck'),
      src.indexOf('/>', src.indexOf('<OnChainPaymentCheck')),
    );
    expect(check).toMatch(/amount=\{toPayOf\(r, s\.taxWithheld \?\? '0'\)\}/);
    expect(check).not.toMatch(/r\.paid\.amount/);
  });
});

describe('Ledger type stays what the pages read', () => {
  it('ledgerOf without chain results is unchanged', () => {
    const { statement, reply } = accepted();
    const l: Ledger = ledgerOf([statement, reply]);
    expect(l.reports[0].chainSettled).toBeUndefined();
    expect(stateOf(l.reports[0])).toBe('to-pay');
  });
});

describe('the e2e fixture page is only in the e2e build', () => {
  it('App adds the route only under VITE_E2E_FIXTURES=1, and only e2e:build sets it', () => {
    const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
    expect(app).toMatch(/const E2E_FIXTURES = import\.meta\.env\.VITE_E2E_FIXTURES === '1';/);
    expect(app).toMatch(/const RoyaltyPayFixture = E2E_FIXTURES\s*\?/);
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
      scripts: Record<string, string>;
    };
    const setting = Object.entries(pkg.scripts)
      .filter(([, v]) => v.includes('VITE_E2E_FIXTURES'))
      .map(([k]) => k);
    expect(setting).toEqual(['e2e:build']);
    for (const f of ['../../../scripts/deploy-mainnet.mjs', '../../../scripts/deploy-test-site.mjs'])
      expect(readFileSync(new URL(f, import.meta.url), 'utf8')).not.toMatch(/VITE_E2E_FIXTURES/);
  });
});
