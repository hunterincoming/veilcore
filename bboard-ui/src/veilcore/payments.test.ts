// Paying through a partner (payments.ts): the request a partner can check, and receipts
// this page checks itself.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ed25519 } from '@noble/curves/ed25519.js';
import { canonicalise } from 'veilcore-records';
import { dealKeys, newPartyKey, openMessage, sealMessage, verifyDisclosed, type DealMessage } from './deal';
import { paymentRequest, receiptsFor, receiptVerifies, RECEIPT_VERSION, type Receipt } from './payments';
import type { DealEntry } from './deal-client';

const C = '11'.repeat(32);
const H = '22'.repeat(32);
const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');

const entry = async (m: DealMessage, from: { secret: string }, other: { public: string }, seq: number) => {
  const k = await dealKeys(from.secret, other.public, C, H);
  const o = await openMessage(await sealMessage(m, from.secret, k), k, m.from);
  return {
    ...o!.message,
    seq,
    fingerprint: String(seq).repeat(64).slice(0, 64),
    receivedAt: 1,
    signature: o!.signature,
    mine: true,
  } as DealEntry;
};

describe('a payment request', () => {
  it('carries the statement and the payout details, each checkable against its signer', async () => {
    const issuer = newPartyKey();
    const licensee = newPartyKey();
    const statement = await entry(
      {
        type: 'statement',
        statementId: 's1',
        periodFrom: '2026-07-01',
        periodTo: '2026-09-30',
        basis: 'sales',
        quantity: '10000',
        currency: 'USD',
        amountOwed: '500.00',
        from: 'licensee',
        at: 5,
      },
      licensee,
      issuer,
      1,
    );
    const payout = await entry(
      { type: 'payout', method: 'Example Pay', account: 'acct-123', currency: 'USD', from: 'issuer', at: 2 },
      issuer,
      licensee,
      2,
    );
    const r = paymentRequest(
      statement,
      payout,
      { licensee: licensee.public, issuer: issuer.public },
      'https://api.example',
    );
    expect(r.pay).toEqual({ amount: '500.00', currency: 'USD', to: 'acct-123', method: 'Example Pay' });
    expect(verifyDisclosed(r.statement.message as DealMessage, r.statement.signature, r.statement.signer)).toBe(true);
    expect(verifyDisclosed(r.payout.message as DealMessage, r.payout.signature, r.payout.signer)).toBe(true);
    // Someone who changes where the money goes breaks the licensor's signature.
    expect(
      verifyDisclosed(
        { ...(r.payout.message as DealMessage), account: 'thief' } as DealMessage,
        r.payout.signature,
        r.payout.signer,
      ),
    ).toBe(false);
  });
});

describe('receipts', () => {
  afterEach(() => vi.unstubAllGlobals());
  const partner = ed25519.utils.randomSecretKey();
  const receipt = (over: Partial<Receipt> = {}): Receipt => ({
    v: RECEIPT_VERSION,
    statementFingerprint: 'ab'.repeat(32),
    statementId: 's1',
    amount: '500.00',
    currency: 'USD',
    payTo: 'acct-123',
    reference: 'PAY-1',
    paidAt: '2026-10-21T12:00:00.000Z',
    partner: hex(ed25519.getPublicKey(partner)),
    ...over,
  });
  const sign = (r: Receipt) =>
    hex(ed25519.sign(new TextEncoder().encode(`${RECEIPT_VERSION}\n${canonicalise(r)}`), partner));

  it('a receipt verifies only as signed', () => {
    const r = receipt();
    expect(receiptVerifies(r, sign(r))).toBe(true);
    expect(receiptVerifies({ ...r, amount: '5.00' }, sign(r))).toBe(false);
  });

  it('the page keeps only receipts that verify, and says where one differs from what was owed', async () => {
    const good = receipt();
    const short = receipt({ reference: 'PAY-2', amount: '50.00' });
    const forged = receipt({ reference: 'PAY-3' });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              receipts: [
                { receipt: good, signature: sign(good), partner: { displayName: 'Example Pay', nameChecked: true } },
                { receipt: short, signature: sign(short), partner: { displayName: 'Example Pay', nameChecked: true } },
                { receipt: forged, signature: sign(good), partner: null },
              ],
            }),
          ),
      ),
    );
    const statement = {
      type: 'statement',
      statementId: 's1',
      currency: 'USD',
      amountOwed: '500.00',
      fingerprint: 'ab'.repeat(32),
    } as DealEntry;
    const got = await receiptsFor(statement, 'acct-123');
    expect(got.map((c) => c.receipt.reference)).toEqual(['PAY-1', 'PAY-2']);
    expect(got[0].mismatch).toEqual([]);
    expect(got[0].nameChecked).toBe(true);
    expect(got[1].mismatch).toEqual(['paid 50.00, owed 500.00']);
    expect((await receiptsFor(statement, 'other-acct'))[0].mismatch).toEqual([
      'paid to acct-123, not the account they gave',
    ]);
  });
});
