// A counterparty with a modified client (panel review, M2): it can sign any time it likes and
// any amount it likes. The ledger orders a deal by the registry's seq, never the signed times, and
// counts a payment as made only when it is exactly the accepted amount.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import type { DealEntry } from './deal-client';
import { dealRecordOf } from './deal-client';
import { dealOrder } from './deal-order';
import { handOnOffered } from './hand-on';
import { balanceOwed, ledgerOf, periodRows, stateOf, type Ledger } from './royalty-ledger';
import type { LicenseTerms } from './licenses';

const at = (day: string) => Date.parse(`${day}T12:00:00Z`);
let n = 0;
const msg = (seq: number, m: Record<string, unknown>): DealEntry =>
  ({
    seq,
    fingerprint: `f${seq}`.padEnd(64, '0'),
    receivedAt: at('2026-01-01') + seq,
    mine: false,
    signature: `sig-${++n}-${seq}`,
    ...m,
  }) as unknown as DealEntry;

const terms = {
  startDate: '2026-01-01',
  endDate: '2027-12-31',
  currency: 'USD',
  reporting: { every: 'quarter', reportDueDays: 30, paymentDueDays: 14 },
} as unknown as LicenseTerms;

/** Q1 report of 1000.00 (seq 1), accepted on 3 Apr (seq 2). */
const accepted = (over: Record<string, unknown> = {}) => {
  const statement = msg(1, {
    type: 'statement',
    statementId: 'S-1',
    periodFrom: '2026-01-01',
    periodTo: '2026-03-31',
    basis: 'per-unit',
    quantity: '400',
    currency: 'USD',
    amountOwed: '1000.00',
    from: 'licensee',
    at: at('2026-04-02'),
    ...over,
  });
  const sig = statement.signature;
  const reply = msg(2, {
    type: 'reply',
    statementSig: sig,
    decision: 'accepted',
    from: 'issuer',
    at: at('2026-04-03'),
  });
  return { statement, reply, sig };
};
const paid = (seq: number, sig: string, amount: string, over: Record<string, unknown> = {}) =>
  msg(seq, {
    type: 'paid',
    statementSig: sig,
    amount,
    currency: 'USD',
    method: 'bank',
    payTo: '',
    reference: `REF-${seq}`,
    paidOn: '2026-05-01',
    from: 'licensee',
    at: at('2026-05-01'),
    ...over,
  });
const report = (l: Ledger) => l.reports[0];

describe('the registry’s order, never the sender’s clock', () => {
  it('a dispute signed with a time before the acceptance doesn’t undo it, or the payment', () => {
    const { statement, reply, sig } = accepted();
    const pay = paid(3, sig, '1000.00');
    const backdated = msg(4, {
      type: 'reply',
      statementSig: sig,
      decision: 'disputed',
      note: 'Wrong figures.',
      from: 'issuer',
      at: at('2026-04-02') + 5, // before the acceptance's signed time
    });
    const l = ledgerOf([statement, reply, pay, backdated]);
    expect(report(l).reply?.decision).toBe('accepted');
    expect(report(l).paid?.reference).toBe('REF-3');
    expect(stateOf(report(l))).toBe('paid');
    // And in whatever order the messages arrive here.
    expect(stateOf(report(ledgerOf([backdated, pay, reply, statement])))).toBe('paid');
    // The period isn't "fix" and overdue on the license page.
    const rows = periodRows(terms, l, '2026-06-01');
    expect(rows[0].step).toBe('confirm');
    expect(rows[0].overdue).toBe(0);
  });

  it('a second “paid” signed with an earlier time doesn’t replace the first', () => {
    const { statement, reply, sig } = accepted();
    const first = paid(3, sig, '1000.00');
    const second = paid(4, sig, '1000.00', { reference: 'OTHER', at: at('2026-04-04') });
    expect(report(ledgerOf([statement, reply, second, first])).paid?.reference).toBe('REF-3');
  });

  it('the hand-on offer is the latest by seq, not by signed time', () => {
    const offer = msg(5, { type: 'handon', newLicense: 'L2', to: 'k', from: 'issuer', at: at('2026-05-01') });
    const off = msg(6, { type: 'handon-off', newLicense: 'L2', from: 'issuer', at: at('2026-04-01') });
    expect(handOnOffered([offer, off])).toBeUndefined();
  });

  it('a copy with no registry order (an old downloaded record) falls back to signed times', () => {
    const a = { at: 2, signature: 'a' };
    const b = { at: 1, signature: 'b' };
    expect(dealOrder([a, b]).map((x) => x.signature)).toEqual(['b', 'a']);
    expect(
      dealOrder([
        { ...a, seq: 1 },
        { ...b, seq: 2 },
      ]).map((x) => x.signature),
    ).toEqual(['a', 'b']);
    expect(dealOrder([{ ...a, seq: 1 }, b]).map((x) => x.signature)).toEqual(['b', 'a']);
  });

  it('the downloaded record keeps the registry’s seq and time beside each message', () => {
    const { statement } = accepted();
    const rec = dealRecordOf(
      { side: 'issuer', mySecret: 'a'.repeat(64), theirPublic: 'b'.repeat(64), commitment: 'c', issuerRecord: 'd' },
      'e'.repeat(64),
      [statement],
    );
    expect(rec.messages[0]).toMatchObject({ seq: 1, receivedAt: statement.receivedAt });
    expect(rec.messages[0].message).not.toHaveProperty('seq');
  });
});

describe('a payment counts only when it is exactly the accepted amount', () => {
  it('a short payment leaves the rest owed, still to pay and overdue', () => {
    const { statement, reply, sig } = accepted();
    const l = ledgerOf([statement, reply, paid(3, sig, '1.00')]);
    expect(stateOf(report(l))).toBe('short');
    expect(report(l).short).toBe('999.00');
    expect(balanceOwed(l, 'USD')).toBe('999.00');
    const rows = periodRows(terms, l, '2026-05-20');
    expect(rows[0]).toMatchObject({ step: 'pay', due: '2026-05-14', overdue: 6 });
    // A "received" for the short amount doesn't settle it either.
    const got = msg(4, {
      type: 'received',
      statementSig: sig,
      amount: '1.00',
      currency: 'USD',
      from: 'issuer',
      at: at('2026-05-02'),
    });
    expect(stateOf(report(ledgerOf([statement, reply, paid(3, sig, '1.00'), got])))).toBe('short');
  });

  it('the right amount in another currency is not a payment of this one', () => {
    const { statement, reply, sig } = accepted();
    const l = ledgerOf([statement, reply, paid(3, sig, '1000.00', { currency: 'EUR' })]);
    expect(stateOf(report(l))).toBe('short');
    expect(report(l).short).toBe('1000.00');
  });

  it('compares to the currency’s own digits: yen has none', () => {
    const { statement, reply, sig } = accepted({ currency: 'JPY', amountOwed: '1000' });
    const yen = (amount: string) => paid(3, sig, amount, { currency: 'JPY' });
    expect(stateOf(report(ledgerOf([statement, reply, yen('1000')])))).toBe('paid');
    expect(stateOf(report(ledgerOf([statement, reply, yen('1000.0')])))).toBe('paid');
    const short = ledgerOf([statement, reply, yen('999')]);
    expect(report(short).short).toBe('1');
  });

  it('the exact amount settles it; tax is the accepted report’s, never the payment’s', () => {
    const { statement, reply, sig } = accepted({ taxWithheld: '100.00' });
    expect(stateOf(report(ledgerOf([statement, reply, paid(3, sig, '900.00')])))).toBe('paid');
    // A payment that declares more tax withheld than the report did is still short.
    const l = ledgerOf([statement, reply, paid(3, sig, '500.00', { taxWithheld: '500.00' })]);
    expect(stateOf(report(l))).toBe('short');
    expect(report(l).short).toBe('400.00');
  });

  it('a payment of more than owed is not short', () => {
    const { statement, reply, sig } = accepted();
    expect(stateOf(report(ledgerOf([statement, reply, paid(3, sig, '1000.01')])))).toBe('paid');
  });
});
