// Royalties v2 (docs/agreements-live.md, 4): terms from presets, calendar periods, statement
// lines, the payout lock, the lender pack, and the published checker still settling it all.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { strFromU8 } from 'fflate';
import { checkDealRecord } from 'veilcore-records';
import * as deal from './deal';
import { dealRecordOf, type DealEntry } from './deal-client';
import { lenderPackFiles } from './lender-pack';
import { agreementRows, sealAgreement, type License, type LicenseTerms } from './licenses';
import { currencyDigits, formatMoney, normaliseDecimal, owedAt, sameAmount, sumAmounts, toMinor } from './money';
import {
  applyPreset,
  currencyOf,
  currencyForLocale,
  isNewTerms,
  localDay,
  ruleOf,
  termsProblems,
  termsSentence,
  termsToSeal,
} from './royalty-terms';
import { addMonths, calendarFile, contractYearOf, endsContractYear, periodsOf } from './royalty-periods';
import {
  balanceOwed,
  initialsOf,
  ledgerCsv,
  ledgerOf,
  minimumProgress,
  paymentReference,
  payoutLock,
  periodRows,
  reportLines,
  stateOf,
  toPayOf,
} from './royalty-ledger';
import { emptyTermsFor } from '../components/licensing/LicenseTermsFields';
import { enT } from '../i18n/translate';

const H = (c: string) => c.repeat(64);
const at = (d: string) => Date.parse(`${d}T12:00:00Z`);

const base = (): LicenseTerms => ({
  ...emptyTermsFor('license'),
  licensee: 'Practice Grower',
  licensor: 'Hana Rivera',
  territory: 'New Jersey',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
});
const clone = (amount = '2.50', currency = 'USD'): LicenseTerms =>
  termsToSeal({
    ...applyPreset('clone', base(), { kind: 'plant', currency, governingLaw: 'New Jersey' }),
    royalty: {
      kind: 'per-unit',
      amount,
      unit: 'cutting',
      unitDefinition: 'A cutting sold or given away counts once.',
    },
  });

describe('money in the currency’s own digits', () => {
  it('JPY has none, USD and EUR two; each rounds half up', () => {
    expect(currencyDigits('JPY')).toBe(0);
    expect(currencyDigits('USD')).toBe(2);
    expect(currencyDigits('EUR')).toBe(2);
    expect(currencyDigits('KWD')).toBe(3);
    expect(currencyDigits('XX')).toBe(2);
    expect(owedAt('percent', '7.5', '12345', 0)).toBe('926'); // 925.875 yen
    expect(owedAt('percent', '7.5', '12345', 2)).toBe('925.88');
    expect(owedAt('per-unit', '1.005', '1', 2)).toBe('1.01');
    expect(owedAt('per-unit', '150', '3', 0)).toBe('450');
    expect(toMinor('0.5', 0)).toBe(1n);
    expect(sameAmount('500', '500.00')).toBe(true);
    expect(sameAmount('500', '500.4', 0)).toBe(true);
  });
  it('leading zeros are taken off before anything is sent (the checker refuses "05")', () => {
    expect(normaliseDecimal('05')).toBe('5');
    expect(normaliseDecimal('007.50')).toBe('7.50');
    expect(normaliseDecimal('0.5')).toBe('0.5');
    expect(normaliseDecimal('0')).toBe('0');
    expect(normaliseDecimal('1e3')).toBeUndefined();
  });
  it('shows the currency’s own symbol and digits', () => {
    expect(formatMoney('1234.5', 'USD', 'en-US')).toBe('$1,234.50');
    expect(formatMoney('1235', 'JPY', 'en-US')).toBe('¥1,235');
    expect(formatMoney('1234.5', 'EUR', 'de')).toBe('1.234,50 €');
    expect(formatMoney('12', 'XYZW')).toBe('12 XYZW');
  });
});

describe('terms from presets', () => {
  it('a preset becomes explicit values before sealing, with no preset id, and seals the same twice', async () => {
    const t = clone();
    expect(JSON.stringify(t)).not.toMatch(/preset|"clone"/);
    expect(t.royalty).toEqual({
      kind: 'per-unit',
      amount: '2.50',
      unit: 'cutting',
      unitDefinition: 'A cutting sold or given away counts once.',
    });
    expect(t.reporting).toEqual({ every: 'quarter', reportDueDays: 30, paymentDueDays: 14 });
    expect(t).toMatchObject({
      exclusive: false,
      sublicensable: false,
      bankFees: 'each-own',
      recordsYears: 3,
      checkNoticeDays: 30,
      currency: 'USD',
      governingLaw: 'New Jersey',
      rights: 'cultivate+propagate',
    });
    // The old fields match, so an older copy of the app shows the same deal.
    expect(t).toMatchObject({ royaltyType: 'flat', royaltyAmount: '2.50', unitBasis: 'per-plant' });
    const a = await sealAgreement('license', t, H('f'), H('0'));
    const b = await sealAgreement('license', JSON.parse(JSON.stringify(t)) as LicenseTerms, H('f'), H('0'));
    expect(a.agreementFingerprint).toBe(b.agreementFingerprint);
    expect((await sealAgreement('license', clone('2.51'), H('f'), H('0'))).agreementFingerprint).not.toBe(
      a.agreementFingerprint,
    );
  });
  it('numbers are normalised and empty extras left out', () => {
    const t = termsToSeal({
      ...applyPreset('custom', base(), { kind: 'plant', currency: 'EUR', governingLaw: 'Spain' }),
      royalty: { kind: 'percent', rate: '08', base: 'gross' },
      yearlyMinimum: '',
      fxSource: ' ',
    });
    expect(t.royalty).toEqual({ kind: 'percent', rate: '8', base: 'gross' });
    expect('yearlyMinimum' in t).toBe(false);
    expect('fxSource' in t).toBe(false);
  });
  it('only sensible combinations, and the territory on cannabis', () => {
    const t = applyPreset('clone', { ...base(), territory: '' }, { kind: 'plant', currency: 'USD', governingLaw: '' });
    expect(termsProblems(t, { territoryRequired: true })).toEqual(['amount', 'law', 'territory']);
    expect(termsProblems(clone(), { territoryRequired: true })).toEqual([]);
    expect(ruleOf(clone())?.kind).toBe('per-unit');
  });
  it('the one paragraph says every value', () => {
    const s = termsSentence(clone(), enT, 'cultivate + propagate');
    for (const w of ['Practice Grower', 'New Jersey', '$2.50 per cutting or clone', 'quarter', '30 days', '14 days'])
      expect(s).toContain(w);
    expect(s).toContain('own bank fees');
    expect(s).toContain('3 years');
    expect(s).toContain('more than 5%');
  });
  it('guesses the currency from the browser, changeable', () => {
    expect(currencyForLocale('ja-JP')).toBe('JPY');
    expect(currencyForLocale('de-DE')).toBe('EUR');
    expect(currencyForLocale('en-US')).toBe('USD');
    expect(currencyForLocale('es-AR')).toBe('ARS');
  });
});

describe('terms made before', () => {
  it('seal exactly as they did and read as they always did', async () => {
    const old: LicenseTerms = {
      ...emptyTermsFor('license'),
      royaltyAmount: '5',
      startDate: '2026-01-01',
      endDate: '2027-01-01',
    };
    expect(termsToSeal(old)).toBe(old);
    expect(isNewTerms(old)).toBe(false);
    const a = await sealAgreement('license', old, H('f'), H('0'));
    const b = await sealAgreement('license', termsToSeal(old), H('f'), H('0'));
    expect(a.agreementFingerprint).toBe(b.agreementFingerprint);
    const rows = Object.fromEntries(
      agreementRows({ type: 'license', terms: { ...old, offspringRoyaltyPct: '2' } } as License, enT).map((r) => [
        r.k,
        r.v,
      ]),
    );
    expect(rows.Royalty).toBe('5% per unit sold');
    expect(rows['Royalty on offspring']).toMatch(/^2%/);
    expect(rows.Currency).toBeUndefined();
    expect(rows['Governing law']).toBeUndefined();
    // Read as dollars (the old form said "$"), without writing it into them.
    expect(currencyOf(old)).toBe('USD');
    expect('currency' in old).toBe(false);
  });
  it('new terms show their money rows', () => {
    const rows = Object.fromEntries(
      agreementRows({ type: 'license', terms: clone() } as License, enT).map((r) => [r.k, r.v]),
    );
    expect(rows.Royalty).toBe('$2.50 per cutting or clone');
    expect(rows.Currency).toBe('USD');
    expect(rows.Reports).toBe('Every quarter (3 months), due 30 days after it ends');
    expect(rows['Governing law']).toBe('New Jersey');
  });
});

describe('periods and due dates, as calendar dates', () => {
  it('quarterly from the start date, with due dates from the period end', () => {
    const p = periodsOf({ every: 'quarter', reportDueDays: 30, paymentDueDays: 14 }, '2026-01-15', '2027-01-14');
    expect(p.map((x) => [x.from, x.to])).toEqual([
      ['2026-01-15', '2026-04-14'],
      ['2026-04-15', '2026-07-14'],
      ['2026-07-15', '2026-10-14'],
      ['2026-10-15', '2027-01-14'],
    ]);
    expect(p[0].reportDue).toBe('2026-05-14');
    expect(p[0].paymentDue).toBe('2026-05-28');
  });
  it('month ends: a start on the 31st falls back to a shorter month’s last day, then returns', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-01-31', 2)).toBe('2026-03-31');
    const p = periodsOf({ every: 'month', reportDueDays: 30, paymentDueDays: 14 }, '2026-01-31', '2026-05-30');
    expect(p.map((x) => [x.from, x.to])).toEqual([
      ['2026-01-31', '2026-02-27'],
      ['2026-02-28', '2026-03-30'],
      ['2026-03-31', '2026-04-29'],
      ['2026-04-30', '2026-05-30'],
    ]);
  });
  it('the last period stops at the end date; contract years run from the start', () => {
    const p = periodsOf({ every: 'half', reportDueDays: 10, paymentDueDays: 5 }, '2026-03-01', '2026-10-15');
    expect(p.map((x) => x.to)).toEqual(['2026-08-31', '2026-10-15']);
    expect(contractYearOf('2026-03-01', '2027-02-28')).toEqual({ from: '2026-03-01', to: '2027-02-28' });
    expect(endsContractYear('2026-03-01', p[1], '2026-10-15')).toBe(true);
  });
  it('today is the user’s own calendar day, not UTC’s', () => {
    // Half past midnight on 1 April where the user is: April, whatever UTC says.
    expect(localDay(new Date(2026, 3, 1, 0, 30))).toBe('2026-04-01');
    expect(localDay(new Date(2026, 2, 31, 23, 59))).toBe('2026-03-31');
  });
  it('a calendar file with each due date as an all-day event', () => {
    const p = periodsOf({ every: 'quarter', reportDueDays: 30, paymentDueDays: 14 }, '2026-01-01', '2026-06-30');
    const ics = calendarFile(p, { report: () => 'Report, due', payment: () => 'Pay' }, 'x', new Date(0));
    expect(ics).toContain('DTSTART;VALUE=DATE:20260430');
    expect(ics).toContain('SUMMARY:Report\\, due');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(4);
  });
});

describe('a report’s lines', () => {
  it('each line rounded on its own, then added', () => {
    const t: LicenseTerms = {
      ...clone('0.333', 'USD'),
      offspring: { rule: { kind: 'percent', rate: '2.5', base: 'gross' } },
    };
    const r = reportLines(t, { quantity: '10', offspring: '101' })!;
    expect(r.lines).toEqual([
      { kind: 'royalty', quantity: '10', rate: '0.333', amount: '3.33' },
      { kind: 'offspring', quantity: '101', rate: '2.5', amount: '2.53' },
    ]);
    expect(r.total).toBe('5.86');
    expect(sumAmounts(r.lines.map((l) => l.amount))).toBe(r.total);
    expect(r.basis).toBe('units');
  });
  it('yen: whole yen per line', () => {
    const t = { ...clone('150.4', 'JPY') };
    expect(reportLines(t, { quantity: '3' })!.total).toBe('451');
  });
  it('net sales: deductions capped as the terms say', () => {
    const t: LicenseTerms = {
      ...clone(),
      royalty: { kind: 'percent', rate: '10', base: 'net', deductions: ['returns', 'excise'], deductionCapPct: '15' },
    };
    const r = reportLines(t, { quantity: '1000', deductions: { returns: '100', excise: '100' } })!;
    expect(r.lines[0]).toEqual({
      kind: 'royalty',
      quantity: '850',
      rate: '10',
      gross: '1000',
      deducted: '150',
      amount: '85.00',
    });
    expect(r.quantity).toBe('1000');
    expect(r.basis).toBe('sales');
  });
  it('the year’s last report tops up to the minimum', () => {
    const r = reportLines(clone(), { quantity: '4' }, { minimumTopUp: '90' })!;
    expect(r.lines.map((l) => l.kind)).toEqual(['royalty', 'minimum']);
    expect(r.total).toBe('100.00');
  });
});

// ---- signed messages, as the app makes them -----------------------------------------------------

const ISS = 'a1'.repeat(32);
const LIC = 'b2'.repeat(32);
const build = async (bodies: (deal.DealMessage | ((sigs: string[]) => deal.DealMessage))[]) => {
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
const statement = (over: Partial<deal.DealMessage> = {}): deal.DealMessage =>
  ({
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

describe('the new messages', () => {
  it('wellFormed takes the new shapes and drops bad ones', () => {
    const ok = (m: unknown) => deal.wellFormed(m, at('2026-12-01'));
    expect(ok(statement())).toBe(true);
    expect(ok(statement({ taxWithheld: '10', taxNote: 'withholding', replaces: 'e'.repeat(128) }))).toBe(true);
    // Lines that don't add up to the amount owed, an unknown field in a line, a line with no amount.
    expect(ok(statement({ amountOwed: '100.01' }))).toBe(false);
    expect(ok(statement({ lines: [{ ...lines.lines[0], extra: 1 }] } as never))).toBe(false);
    expect(ok(statement({ lines: [{ kind: 'royalty' }] } as never))).toBe(false);
    expect(ok(statement({ lines: [] }))).toBe(false);
    expect(ok(statement({ replaces: 'nope' }))).toBe(false);
    expect(ok(payout('0001', '2026-01-02'))).toBe(true);
    expect(ok({ ...payout('0001', '2026-01-02'), link: 'http://pay.example' })).toBe(false);
    expect(ok({ ...payout('0001', '2026-01-02'), link: 'https://pay.example/hr' })).toBe(true);
    expect(
      ok({
        type: 'invoice-details',
        legalName: 'Hana Rivera LLC',
        taxId: 'T1234',
        from: 'issuer',
        at: at('2026-01-02'),
      }),
    ).toBe(true);
    expect(ok({ type: 'invoice-details', legalName: '', from: 'issuer', at: at('2026-01-02') })).toBe(false);
    const notice = {
      type: 'notice',
      kind: 'reminder',
      about: 'report',
      periodFrom: '2026-01-01',
      periodTo: '2026-03-31',
      dueOn: '2026-04-30',
      asOf: '2026-05-03',
      from: 'issuer',
      at: at('2026-05-03'),
    };
    expect(ok(notice)).toBe(true);
    expect(ok({ ...notice, from: 'licensee', about: 'answer' })).toBe(true);
    // Breach: the licensor only, and with a reason.
    expect(ok({ ...notice, kind: 'breach', note: 'No report for Q1.' })).toBe(true);
    expect(ok({ ...notice, kind: 'breach' })).toBe(false);
    expect(ok({ ...notice, kind: 'breach', note: 'x', from: 'licensee' })).toBe(false);
    expect(ok({ ...notice, about: 'anything' })).toBe(false);
    expect(ok({ ...notice, asOf: 'today' })).toBe(false);
  });

  it('the published checker settles a full cycle made of them', async () => {
    const { record, sigs } = await build([
      payout('0001', '2026-01-02'),
      { type: 'invoice-details', legalName: 'Hana Rivera LLC', from: 'issuer', at: at('2026-01-02') + 1 },
      statement({ taxWithheld: '10.00', taxNote: 'withholding' }),
      (s) => ({
        type: 'reply',
        statementId: 'S-1',
        statementSig: s[2],
        decision: 'accepted',
        from: 'issuer',
        at: at('2026-04-03'),
      }),
      (s) => ({
        type: 'notice',
        kind: 'reminder',
        about: 'payment',
        periodFrom: '2026-01-01',
        periodTo: '2026-03-31',
        statementSig: s[2],
        asOf: '2026-05-20',
        from: 'issuer',
        at: at('2026-05-20'),
      }),
      (s) => ({
        type: 'paid',
        statementId: 'S-1',
        statementSig: s[2],
        amount: '90.00',
        currency: 'USD',
        method: 'bank',
        payTo: '0001',
        reference: paymentReference(s[2], 'Hana Rivera'),
        paidOn: '2026-05-21',
        payoutSig: s[0],
        taxWithheld: '10.00',
        from: 'licensee',
        at: at('2026-05-21'),
      }),
      (s) => ({
        type: 'received',
        statementId: 'S-1',
        statementSig: s[2],
        amount: '90.00',
        currency: 'USD',
        from: 'issuer',
        at: at('2026-05-22'),
      }),
    ]);
    const c = await checkDealRecord(record);
    expect(c.problems).toEqual([]);
    expect(c.rejected).toEqual([]);
    expect(c.unread.map((u) => u.type).sort()).toEqual(['invoice-details', 'notice']);
    expect(c.statements).toHaveLength(1);
    expect(c.statements[0].settled).toBe(true);
    expect(c.statements[0].reply).toBe('accepted');
    expect(c.settled).toEqual({ USD: '90' });
    expect(c.open).toEqual({});
    expect(sigs).toHaveLength(7);
  });

  it('a corrected report replaces the one asked to fix, in the page and the checker alike', async () => {
    const { entries, record } = await build([
      statement(),
      (s) => ({
        type: 'reply',
        statementId: 'S-1',
        statementSig: s[0],
        decision: 'disputed',
        note: 'We counted 44.',
        from: 'issuer',
        at: at('2026-04-03'),
      }),
      (s) => {
        const l = reportLines(clone(), { quantity: '44' })!;
        return statement({
          statementId: 'S-2',
          quantity: l.quantity,
          amountOwed: l.total,
          lines: l.lines,
          replaces: s[0],
          at: at('2026-04-04'),
        });
      },
      (s) => ({
        type: 'reply',
        statementId: 'S-2',
        statementSig: s[2],
        decision: 'accepted',
        from: 'issuer',
        at: at('2026-04-05'),
      }),
      // A second answer never counts: the first one stands.
      (s) => ({
        type: 'reply',
        statementId: 'S-2',
        statementSig: s[2],
        decision: 'disputed',
        note: 'changed my mind',
        from: 'issuer',
        at: at('2026-04-06'),
      }),
    ]);
    const l = ledgerOf(entries);
    expect(l.reports.map((r) => r.number)).toEqual([2, 1]);
    expect(l.reports[1].replacedBy?.signature).toBe(l.reports[0].statement.signature);
    expect(stateOf(l.reports[1])).toBe('replaced');
    expect(stateOf(l.reports[0])).toBe('to-pay');
    expect(l.reports[0].reply?.decision).toBe('accepted');
    expect(balanceOwed(l, 'USD')).toBe('110.00');
    const c = await checkDealRecord(record);
    expect(c.statements.map((s) => s.reply)).toEqual(['disputed', 'accepted']);
    expect(c.statements[1].notes).toEqual(['a later reply (disputed) is ignored: the first one stands']);
    expect(c.open).toEqual({ USD: '110' });
  });
});

describe('the lender pack leaves out where the licensor is paid', () => {
  it('no payout or invoice-details message, and the summary is unchanged by it', async () => {
    const { record } = await build([
      payout('0001', '2026-01-02'),
      {
        type: 'invoice-details',
        legalName: 'Hana Rivera LLC',
        address: '1 Practice Road',
        from: 'issuer',
        at: at('2026-01-02') + 1,
      },
      statement(),
      (s) => ({
        type: 'reply',
        statementId: 'S-1',
        statementSig: s[2],
        decision: 'accepted',
        from: 'issuer',
        at: at('2026-04-03'),
      }),
    ]);
    const files = await lenderPackFiles({ recordId: 'VEIL-1', agreementFingerprint: H('a') }, [
      { label: 'Grower', record },
    ]);
    const json = strFromU8(files['deal-records/1-Grower.json']);
    expect(json).not.toContain('"payout"');
    expect(json).not.toContain('invoice-details');
    expect(json).not.toContain('Practice Bank');
    expect(json).not.toContain('Hana Rivera LLC');
    expect(json).toContain('"statement"');
    expect(strFromU8(files['summary.txt'])).toContain('100.00 USD, accepted, not paid');
    expect(strFromU8(files['README.txt'])).toContain('left out');
  });
});

describe('payout details changed', () => {
  const p = (sig: string, n: number) =>
    ({ type: 'payout', signature: sig, at: n, account: sig }) as unknown as DealEntry;
  const paidWith = (sig?: string) =>
    ({ statement: {}, number: 1, notices: [], paid: { at: 5, ...(sig ? { payoutSig: sig } : {}) } }) as never;
  it('locks “I paid” until the new details are confirmed another way', () => {
    const one = p('A', 1);
    const two = p('B', 6);
    expect(payoutLock({ payouts: [one] as never, reports: [] }).locked).toBe(false);
    // Changed before the first payment: old and new side by side.
    const before = payoutLock({ payouts: [one, two] as never, reports: [] });
    expect(before.locked).toBe(true);
    expect(before.locked && [before.before.signature, before.now.signature]).toEqual(['A', 'B']);
    // Paid to A, then changed to B: locked. A payment naming B unlocks it.
    expect(payoutLock({ payouts: [one, two] as never, reports: [paidWith('A')] }).locked).toBe(true);
    expect(payoutLock({ payouts: [one, two] as never, reports: [paidWith('B')] }).locked).toBe(false);
    expect(payoutLock({ payouts: [one] as never, reports: [paidWith('A')] }).locked).toBe(false);
  });
});

describe('references, numbering, periods on the page', () => {
  it('a reference from the report’s signature, with the licensor’s initials, never VeilCore’s', () => {
    const sig = 'f3a9c'.padEnd(128, '0');
    expect(paymentReference(sig, 'Hana Rivera')).toMatch(/^HR-[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(paymentReference(sig, 'Hana Rivera')).toBe(paymentReference(sig, 'Hana Rivera'));
    expect(paymentReference(sig)).toMatch(/^[0-9A-Z]{4}$/);
    expect(initialsOf('José Ñúñez')).toBe('JN');
    expect(initialsOf('山田 太郎')).toBe('');
  });
  it('rows say what each period waits for, with overdue days from the calendar dates', async () => {
    const t = clone();
    const { entries } = await build([
      statement(),
      (s) => ({
        type: 'reply',
        statementId: 'S-1',
        statementSig: s[0],
        decision: 'accepted',
        from: 'issuer',
        at: at('2026-04-03'),
      }),
    ]);
    const rows = periodRows(t, ledgerOf(entries), '2026-08-20');
    expect(rows.map((r) => [r.period.from, r.step, r.overdue])).toEqual([
      ['2026-01-01', 'pay', 98], // payment due 2026-05-14 (30 + 14 days after 31 March)
      ['2026-04-01', 'report', 21], // report due 2026-07-30
      ['2026-07-01', 'running', 0],
    ]);
    expect(rows[0].due).toBe('2026-05-14');
    expect(toPayOf(rows[0].report!)).toBe('100.00');
    const min = minimumProgress({ ...t, yearlyMinimum: '1000' }, ledgerOf(entries).reports, '2026-08-20')!;
    expect(min).toMatchObject({ owed: '100.00', minimum: '1000.00', topUp: '900.00' });
    const csv = ledgerCsv(ledgerOf(entries), 'Hana Rivera');
    expect(csv.split('\r\n')[1]).toMatch(/^1,2026-01-01,2026-03-31,USD,100.00,,accepted,2026-04-03,,,HR-/);
  });
  it('a CSV cell a spreadsheet would run is written as text', async () => {
    const { entries } = await build([statement({ periodFrom: '2026-01-01' })]);
    const l = ledgerOf(entries);
    (l.reports[0].statement as { amountOwed: string }).amountOwed = '=HYPERLINK("x")';
    expect(ledgerCsv(l)).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
