// Royalties v2, review round 1: the page and the published checker agree (findings 1-6, and 8).
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { strFromU8 } from 'fflate';
import { checkDealRecord } from 'veilcore-records';
import * as deal from './deal';
import { dealRecordOf, type DealEntry } from './deal-client';
import { lenderPackFiles } from './lender-pack';
import type { LicenseTerms } from './licenses';
import { applyPreset, currencyOf, termsToSeal, withDealCurrency } from './royalty-terms';
import {
  balanceOwed,
  expectedTopUp,
  expectedTotal,
  ledgerOf,
  offspringRuns,
  paidMessage,
  reportLines,
  stateOf,
} from './royalty-ledger';
import { emptyTermsFor } from '../components/licensing/LicenseTermsFields';

const H = (c: string) => c.repeat(64);
const at = (d: string) => Date.parse(`${d}T12:00:00Z`);

const clone = (): LicenseTerms =>
  termsToSeal({
    ...applyPreset(
      'clone',
      {
        ...emptyTermsFor('license'),
        licensee: 'Practice Grower',
        licensor: 'Hana Rivera',
        territory: 'New Jersey',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
      { kind: 'plant', currency: 'USD', governingLaw: 'New Jersey' },
    ),
    royalty: { kind: 'per-unit', amount: '2.50', unit: 'cutting', unitDefinition: 'Each cutting counts once.' },
  });

const ISS = 'a1'.repeat(32);
const LIC = 'b2'.repeat(32);
type Body = deal.DealMessage | ((sigs: string[]) => deal.DealMessage);
const build = async (bodies: Body[]) => {
  const I = { secret: ISS, public: deal.publicOf(ISS) };
  const L = { secret: LIC, public: deal.publicOf(LIC) };
  const kI = await deal.dealKeys(I.secret, L.public, H('c'), H('d'));
  const kL = await deal.dealKeys(L.secret, I.public, H('c'), H('d'));
  const entries: DealEntry[] = [];
  const sigs: string[] = [];
  for (const b of bodies) {
    const m = typeof b === 'function' ? b(sigs) : b;
    const mine = m.from === 'issuer';
    const sealed = await deal.sealMessage(m, mine ? I.secret : L.secret, mine ? kI : kL);
    const o = await deal.openMessage(sealed, kI, 'issuer');
    if (!o) throw new Error(`did not open: ${JSON.stringify(m)}`);
    sigs.push(o.signature);
    entries.push({
      ...o.message,
      seq: entries.length + 1,
      fingerprint: 'f'.repeat(64),
      receivedAt: m.at,
      signature: o.signature,
      mine: o.mine,
    });
  }
  const party = {
    side: 'issuer' as const,
    mySecret: I.secret,
    theirPublic: L.public,
    commitment: H('c'),
    issuerRecord: H('d'),
  };
  return { entries, sigs, record: dealRecordOf(party, I.public, entries) as Record<string, unknown> };
};

const lines = reportLines(clone(), { quantity: '40' })!; // 40 cuttings at 2.50: 100.00
const statement = (over: Record<string, unknown> = {}): deal.DealMessage => ({
  type: 'statement',
  statementId: 'S-1',
  periodFrom: '2026-01-01',
  periodTo: '2026-03-31',
  basis: lines.basis,
  quantity: lines.quantity,
  currency: 'USD',
  amountOwed: lines.total,
  lines: lines.lines,
  from: 'licensee',
  at: at('2026-04-02'),
  ...over,
});
const accept =
  (i: number, id = 'S-1', day = '2026-04-10') =>
  (s: string[]) =>
    ({
      type: 'reply',
      statementId: id,
      statementSig: s[i],
      decision: 'accepted',
      from: 'issuer',
      at: at(day),
    }) as deal.DealMessage;
const payout = (account: string, day: string): deal.DealMessage => ({
  type: 'payout',
  method: 'bank',
  account,
  currency: 'USD',
  details: `Practice Bank\nAccount ${account}`,
  from: 'issuer',
  at: at(day),
});

describe('review round 1: the page and the published checker agree', () => {
  it('1. an “I paid” signed on a clock behind the licensor’s still counts, and so does its receipt', async () => {
    const { entries, record } = await build([
      statement(),
      accept(0, 'S-1', '2026-04-10'),
      // The grower's clock is a week behind: the payment carries an earlier time than the answer.
      (s) => ({
        type: 'paid',
        statementId: 'S-1',
        statementSig: s[0],
        amount: '100.00',
        currency: 'USD',
        method: 'bank',
        payTo: '',
        reference: 'R',
        paidOn: '2026-04-11',
        from: 'licensee',
        at: at('2026-04-04'),
      }),
      (s) => ({
        type: 'received',
        statementId: 'S-1',
        statementSig: s[0],
        amount: '100.00',
        currency: 'USD',
        from: 'issuer',
        at: at('2026-04-03'),
      }),
    ]);
    const l = ledgerOf(entries);
    expect(l.reports[0].paid).toBeDefined();
    expect(l.reports[0].received).toBeDefined();
    expect(stateOf(l.reports[0])).toBe('received');
    expect((await checkDealRecord(record)).statements[0].settled).toBe(true);
  });

  it('2. a correction never replaces a report the licensor accepts: both count, as in the checker', async () => {
    const { entries, record } = await build([
      statement(),
      // Sent as a correction while report 1 was still unanswered, then both are accepted.
      (s) => statement({ statementId: 'S-2', replaces: s[0], at: at('2026-04-03') }),
      accept(0, 'S-1', '2026-04-04'),
      accept(1, 'S-2', '2026-04-05'),
    ]);
    const l = ledgerOf(entries);
    expect(l.reports.every((r) => !r.replacedBy)).toBe(true);
    expect(balanceOwed(l, 'USD')).toBe('200.00');
    expect((await checkDealRecord(record)).open).toEqual({ USD: '200' });
  });

  it('3 and 4. “I paid” carries no account, and its tax is the one the report declared', async () => {
    const bodies: Body[] = [
      payout('0001', '2026-01-02'),
      statement({ taxWithheld: '10.00', taxNote: 'withholding' }),
      accept(1, 'S-1', '2026-04-03'),
    ];
    const l = ledgerOf((await build(bodies)).entries);
    const m = paidMessage(l.reports[0], { method: 'bank', reference: 'HR-1', paidOn: '2026-04-20', payout: l.payout });
    expect(m.payTo).toBe('');
    expect(m.amount).toBe('90.00');
    expect(m.taxWithheld).toBe('10.00');
    expect(m.payoutSig).toBe(l.payout!.signature);
    expect(JSON.stringify(m)).not.toContain('0001');
    // Sent, then put in a lender pack: neither the account nor the payout message is in it.
    const { record } = await build([...bodies, () => ({ ...m, from: 'licensee', at: at('2026-04-20') })]);
    const files = await lenderPackFiles({ recordId: 'VEIL-1', agreementFingerprint: H('a') }, [{ label: 'G', record }]);
    expect(strFromU8(files['deal-records/1-G.json'])).not.toContain('0001');
    expect((await checkDealRecord(record)).statements[0].paid?.amount).toBe('90.00');
  });

  it('5. old terms read in the currency the deal was paid in, not dollars', async () => {
    const old: LicenseTerms = { ...emptyTermsFor('license'), royaltyAmount: '5' };
    expect(currencyOf(withDealCurrency(old, undefined, 'EUR'))).toBe('EUR');
    // A report's own currency comes before the payout's.
    expect(currencyOf(withDealCurrency(old, 'JPY', 'EUR'))).toBe('JPY');
    expect(currencyOf(withDealCurrency(old))).toBe('USD');
    expect(currencyOf(withDealCurrency(clone(), 'EUR', 'EUR'))).toBe('USD');
    expect('currency' in old).toBe(false);
    const { entries } = await build([
      statement({ currency: 'EUR', lines: undefined, amountOwed: '500.00', quantity: '10000' }),
      accept(0),
    ]);
    expect(balanceOwed(ledgerOf(entries), currencyOf(withDealCurrency(old, 'EUR')))).toBe('500.00');
  });

  it('6. the top-up to the minimum is worked out from the other reports, never taken from the report', async () => {
    const t: LicenseTerms = { ...clone(), yearlyMinimum: '1000' };
    const st = (id: string, from: string, to: string, topUp: string | undefined, day: string) => {
      const r = reportLines(t, { quantity: '40' }, { minimumTopUp: topUp })!;
      return statement({
        statementId: id,
        periodFrom: from,
        periodTo: to,
        quantity: r.quantity,
        amountOwed: r.total,
        lines: r.lines,
        at: at(day),
      });
    };
    // Three quarters at 100.00 each; the last one should top up 1000 - 400 = 600, and claims 100.
    const { entries } = await build([
      st('Q1', '2026-01-01', '2026-03-31', undefined, '2026-04-02'),
      st('Q2', '2026-04-01', '2026-06-30', undefined, '2026-07-02'),
      st('Q3', '2026-07-01', '2026-09-30', undefined, '2026-10-02'),
      st('Q4', '2026-10-01', '2026-12-31', '100', '2026-11-01'),
    ]);
    const l = ledgerOf(entries);
    const q4 = l.reports[0].statement;
    expect(
      expectedTopUp(
        t,
        l.reports,
        { periodFrom: q4.periodFrom, periodTo: q4.periodTo, signature: q4.signature },
        '100.00',
      ),
    ).toBe('600.00');
    expect(expectedTotal(t, l.reports, q4)).toBe('700.00');
    expect(q4.amountOwed).toBe('200.00'); // the page warns: 700.00 under the terms, not 200.00
    // A report that doesn't end the contract year gets none.
    expect(expectedTotal(t, l.reports, l.reports[3].statement)).toBe('100.00');
  });

  it('8. line amounts as the checker reads them; the royalty on offspring only while it runs', () => {
    const ok = (m: unknown) => deal.wellFormed(m, at('2026-12-01'));
    expect(ok(statement())).toBe(true);
    expect(ok(statement({ lines: [{ ...lines.lines[0], amount: '0100.00' }], amountOwed: '100.00' }))).toBe(false);
    expect(ok(statement({ lines: [{ ...lines.lines[0], amount: '100.001' }], amountOwed: '100.001' }))).toBe(false);
    expect(
      ok(statement({ currency: 'JPY', lines: [{ ...lines.lines[0], amount: '100.5' }], amountOwed: '100.5' })),
    ).toBe(false);
    const t: LicenseTerms = {
      ...clone(),
      offspring: { rule: { kind: 'percent', rate: '2', base: 'gross' }, years: 1 },
    };
    expect(offspringRuns(t, '2026-10-01')).toBe(true);
    expect(offspringRuns(t, '2027-01-01')).toBe(false);
    expect(
      reportLines(t, { quantity: '1', offspring: '100' }, { periodFrom: '2027-01-01' })!.lines.map((x) => x.kind),
    ).toEqual(['royalty']);
  });
});
