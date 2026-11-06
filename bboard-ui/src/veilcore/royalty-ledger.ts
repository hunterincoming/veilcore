// The royalty side of a live license, worked out from the signed messages (docs/agreements-live.md,
// 4 and 5). Pure: the pages (RoyaltyLedger.tsx) show what this returns, and the tests check it.
//
// The rules match the published checker (veilcore-records checkDealRecord), so what a page shows
// and what a lender's copy says never differ:
//   - a report is the licensee's signed statement; reports are numbered by their signed time;
//   - the licensor's FIRST answer to a report stands (Accept or Ask to fix); a later one is ignored;
//   - one "I paid" per report, and one "received" (the first of each);
//   - a report the licensor asked to fix is replaced by a corrected one naming it (`replaces`).
// "I paid" opens only once the licensor has accepted (design v3, 3): there is no deemed acceptance,
// because signed times are the sender's own clock.
// SPDX-License-Identifier: Apache-2.0

import type { DealEntry } from './deal-client';
import type { StatementLine } from './deal';
import type { LicenseTerms } from './licenses';
import {
  currencyDigits,
  isDecimal,
  minorText,
  normaliseDecimal,
  owedAt,
  subtractAmount,
  sumAmounts,
  toMinor,
} from './money';
import { currencyOf, offspringOf, ruleOf, type RoyaltyRule } from './royalty-terms';
import { contractYearOf, daysBetween, periodsOf, type RoyaltyPeriod } from './royalty-periods';

export type StatementEntry = Extract<DealEntry, { type: 'statement' }>;
export type ReplyEntry = Extract<DealEntry, { type: 'reply' }>;
export type PaidEntry = Extract<DealEntry, { type: 'paid' }>;
export type ReceivedEntry = Extract<DealEntry, { type: 'received' }>;
export type PayoutEntry = Extract<DealEntry, { type: 'payout' }>;
export type InvoiceEntry = Extract<DealEntry, { type: 'invoice-details' }>;
export type NoticeEntry = Extract<DealEntry, { type: 'notice' }>;

export type Report = {
  readonly statement: StatementEntry;
  /** 1 for the first report signed, by signed time. */
  readonly number: number;
  reply?: ReplyEntry;
  paid?: PaidEntry;
  received?: ReceivedEntry;
  /** The corrected report that took this one's place. */
  replacedBy?: StatementEntry;
  /** The report this one corrects. */
  replaces?: Report;
  notices: NoticeEntry[];
};

export type Ledger = {
  readonly payout?: PayoutEntry;
  readonly previousPayout?: PayoutEntry;
  readonly payouts: readonly PayoutEntry[];
  readonly invoice?: InvoiceEntry;
  /** Newest first. */
  readonly reports: readonly Report[];
  readonly notices: readonly NoticeEntry[];
  readonly agreed?: Extract<DealEntry, { type: 'agree' }>;
};

/** The ledger as the signed messages make it (they come sorted by signed time, deal-client readAll). */
export const ledgerOf = (entries: readonly DealEntry[]): Ledger => {
  const sorted = [...entries].sort((a, b) => a.at - b.at || (a.signature < b.signature ? -1 : 1));
  const payouts = sorted.filter((e): e is PayoutEntry => e.type === 'payout' && e.from === 'issuer');
  const invoices = sorted.filter((e): e is InvoiceEntry => e.type === 'invoice-details' && e.from === 'issuer');
  const bySig = new Map<string, Report>();
  const ordered: Report[] = [];
  for (const e of sorted) {
    if (e.type !== 'statement' || e.from !== 'licensee') continue;
    const r: Report = { statement: e, number: ordered.length + 1, notices: [] };
    bySig.set(e.signature, r);
    ordered.push(r);
  }
  const notices: NoticeEntry[] = [];
  for (const e of sorted) {
    if (e.type === 'notice') {
      notices.push(e);
      if (e.statementSig) bySig.get(e.statementSig)?.notices.push(e);
      continue;
    }
    if (!('statementSig' in e)) continue;
    const r = bySig.get(e.statementSig);
    if (!r) continue;
    // The first of each stands (veilcore-records keeps the first reply, the first paid, the first received).
    if (e.type === 'reply' && e.from === 'issuer' && !r.reply) r.reply = e;
    if (e.type === 'paid' && e.from === 'licensee' && !r.paid && r.reply?.decision === 'accepted') r.paid = e;
    if (e.type === 'received' && e.from === 'issuer' && !r.received && r.paid) r.received = e;
  }
  // A corrected report replaces one the licensor asked to fix, or one not answered when it was sent.
  for (const r of ordered) {
    const target = r.statement.replaces ? bySig.get(r.statement.replaces) : undefined;
    if (!target || target === r || target.replacedBy) continue;
    const answeredBefore = target.reply && target.reply.at <= r.statement.at;
    if (answeredBefore && target.reply!.decision !== 'disputed') continue;
    target.replacedBy = r.statement;
    r.replaces = target;
  }
  const agreed = sorted.find((e) => e.type === 'agree' && e.from === 'licensee') as
    | Extract<DealEntry, { type: 'agree' }>
    | undefined;
  return {
    payout: payouts[payouts.length - 1],
    previousPayout: payouts[payouts.length - 2],
    payouts,
    invoice: invoices[invoices.length - 1],
    reports: [...ordered].reverse(),
    notices,
    agreed,
  };
};

/** Reports still in play: not replaced by a corrected one. Newest first. */
export const liveReports = (l: Ledger): Report[] => l.reports.filter((r) => !r.replacedBy);

export type ReportState = 'waiting' | 'fix' | 'to-pay' | 'paid' | 'received' | 'replaced' | 'nothing-due';

export const stateOf = (r: Report): ReportState =>
  r.replacedBy
    ? 'replaced'
    : r.received
      ? 'received'
      : r.paid
        ? 'paid'
        : r.reply?.decision === 'disputed'
          ? 'fix'
          : r.reply?.decision === 'accepted'
            ? toPayOf(r) === '0' || /^0(\.0+)?$/.test(toPayOf(r))
              ? 'nothing-due'
              : 'to-pay'
            : 'waiting';

/** What the payer sends for a report: the amount owed less any tax withheld (as the report or payment says). */
export const toPayOf = (r: Report, taxWithheld?: string): string => {
  const s = r.statement;
  const digits = currencyDigits(s.currency);
  const tax = taxWithheld ?? r.paid?.taxWithheld ?? s.taxWithheld;
  if (!tax || !isDecimal(tax)) return minorText(toMinor(s.amountOwed, digits) ?? 0n, digits);
  return subtractAmount(s.amountOwed, tax, digits) ?? minorText(0n, digits);
};

// ---- payout details: a change locks "I paid" until confirmed another way (design v3, 7) ------

export type PayoutLock =
  | { readonly locked: false }
  | { readonly locked: true; readonly before: PayoutEntry; readonly now: PayoutEntry };

/**
 * Whether the payout details changed since the payer last used (or, before any payment, first
 * saw) them. A payment that names the newest details by their signature unlocks it.
 */
export const payoutLock = (l: Pick<Ledger, 'payouts' | 'reports'>): PayoutLock => {
  const now = l.payouts[l.payouts.length - 1];
  if (!now) return { locked: false };
  const paids = l.reports
    .map((r) => r.paid)
    .filter((p): p is PaidEntry => !!p)
    .sort((a, b) => a.at - b.at);
  const lastUsed = [...paids].reverse().find((p) => p.payoutSig)?.payoutSig;
  const seenSig = lastUsed ?? (l.payouts.length > 1 ? l.payouts[0].signature : undefined);
  if (!seenSig || seenSig === now.signature) return { locked: false };
  const before = l.payouts.find((p) => p.signature === seenSig) ?? l.payouts[l.payouts.length - 2];
  return before ? { locked: true, before, now } : { locked: false };
};

// ---- payment reference -------------------------------------------------------------------------

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** The licensor's initials from their name (Latin letters only, accents dropped); '' if none. */
export const initialsOf = (name: string | undefined): string =>
  (name ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[\s\-_.]+/)
    .map((w) => w.match(/[A-Za-z]/)?.[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 3);

/**
 * The reference to put on the payment: the licensor's initials and four characters from the
 * report's signature ("HR-7Q4K"). Both sides work it out the same way from the same signature;
 * never "VC" or anything of VeilCore's.
 */
export const paymentReference = (statementSig: string, licensorName?: string): string => {
  const bits = parseInt(statementSig.slice(0, 5), 16); // 20 bits
  let code = '';
  for (let i = 3; i >= 0; i--) code += CROCKFORD[(bits >> (i * 5)) & 31];
  const ini = initialsOf(licensorName);
  return ini ? `${ini}-${code}` : code;
};

// ---- a report's lines --------------------------------------------------------------------------

export type ReportInput = {
  /** Sales in the period (percent rule: gross sales when the rule is on net), or units. */
  readonly quantity: string;
  /** For a percent of net sales: each deduction claimed. */
  readonly deductions?: Partial<Record<'returns' | 'excise' | 'freight', string>>;
  /** Offspring: their sales (percent) or their count (per registered offspring). */
  readonly offspring?: string;
};

/** "1000.50000000" -> "1000.5": exact decimals without trailing zeros. */
const trimZeros = (s: string): string => (s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s);

const lineFor = (
  kind: 'royalty' | 'offspring',
  rule: RoyaltyRule,
  quantity: string,
  digits: number,
  deductions?: ReportInput['deductions'],
): StatementLine | undefined => {
  const q = normaliseDecimal(quantity || '0');
  if (q === undefined) return undefined;
  if (rule.kind === 'per-unit') {
    const amount = owedAt('per-unit', rule.amount, q, digits);
    return amount === undefined ? undefined : { kind, quantity: q, rate: rule.amount, amount };
  }
  if (rule.base === 'net' && deductions) {
    const claimed = sumAmounts(
      Object.values(deductions).map((d) => normaliseDecimal(d || '0') ?? 'x'),
      8,
    );
    if (claimed === undefined) return undefined;
    // Deductions count up to the cap the terms set (a percent of gross sales).
    const cap = rule.deductionCapPct ? owedAt('percent', rule.deductionCapPct, q, 8) : undefined;
    const ded = cap !== undefined && (toMinor(claimed, 8) ?? 0n) > (toMinor(cap, 8) ?? 0n) ? cap : claimed;
    const net = subtractAmount(q, ded, 8) ?? '0';
    const amount = owedAt('percent', rule.rate, net, digits);
    if (amount === undefined) return undefined;
    return {
      kind,
      quantity: trimZeros(net),
      rate: rule.rate,
      gross: q,
      deducted: trimZeros(ded),
      amount,
    };
  }
  const amount = owedAt('percent', rule.rate, q, digits);
  return amount === undefined ? undefined : { kind, quantity: q, rate: rule.rate, amount };
};

/**
 * The lines a report is made of, each rounded to the currency on its own, and their total: the
 * royalty, the royalty on offspring, and at the end of a contract year the top-up to the yearly
 * minimum. Undefined while a number isn't a plain decimal.
 */
export const reportLines = (
  terms: LicenseTerms,
  input: ReportInput,
  opts: { minimumTopUp?: string; type?: string } = {},
): { lines: StatementLine[]; total: string; basis: 'sales' | 'units'; quantity: string } | undefined => {
  const digits = currencyDigits(currencyOf(terms));
  const rule = opts.type === 'breeder-share' ? undefined : ruleOf(terms);
  const off = offspringOf(terms);
  const lines: StatementLine[] = [];
  if (rule) {
    const l = lineFor('royalty', rule, input.quantity, digits, input.deductions);
    if (!l) return undefined;
    lines.push(l);
  }
  if (off) {
    const l = lineFor('offspring', off.rule, input.offspring ?? '0', digits);
    if (!l) return undefined;
    lines.push(l);
  }
  if (opts.minimumTopUp && (toMinor(opts.minimumTopUp, digits) ?? 0n) > 0n)
    lines.push({ kind: 'minimum', amount: minorText(toMinor(opts.minimumTopUp, digits)!, digits) });
  if (lines.length === 0) return undefined;
  const total = sumAmounts(
    lines.map((l) => l.amount),
    digits,
  )!;
  const main = lines[0];
  const mainRule = rule ?? off!.rule;
  return {
    lines,
    total,
    basis: mainRule.kind === 'percent' ? 'sales' : 'units',
    quantity: main.gross ?? main.quantity ?? '0',
  };
};

// ---- the yearly minimum ------------------------------------------------------------------------

/**
 * Where the contract year a day falls in stands against the yearly minimum: what the reports for
 * periods in that year owe so far (without minimum top-ups), and the top-up the year's last report
 * adds. Undefined when the terms set no minimum.
 */
export const minimumProgress = (
  terms: LicenseTerms,
  reports: readonly Report[],
  day: string,
  excluding?: string,
): { from: string; to: string; owed: string; minimum: string; topUp: string } | undefined => {
  if (!terms.yearlyMinimum || !terms.startDate) return undefined;
  const digits = currencyDigits(currencyOf(terms));
  const year = contractYearOf(terms.startDate, day);
  const counted = reports.filter(
    (r) =>
      !r.replacedBy &&
      r.statement.signature !== excluding &&
      r.reply?.decision !== 'disputed' &&
      r.statement.periodFrom >= year.from &&
      r.statement.periodTo <= year.to,
  );
  const owed =
    sumAmounts(
      counted.flatMap((r) =>
        r.statement.lines
          ? r.statement.lines.filter((l) => l.kind !== 'minimum').map((l) => l.amount)
          : [r.statement.amountOwed],
      ),
      digits,
    ) ?? minorText(0n, digits);
  const minimum = minorText(toMinor(terms.yearlyMinimum, digits) ?? 0n, digits);
  const topUp = subtractAmount(minimum, owed, digits) ?? minorText(0n, digits);
  return { ...year, owed, minimum, topUp };
};

// ---- where each period stands, and the one next date -----------------------------------------

export type PeriodRow = {
  readonly period: RoyaltyPeriod;
  readonly report?: Report;
  /** What is waiting, and on whom. */
  readonly step: 'running' | 'report' | 'answer' | 'fix' | 'pay' | 'confirm' | 'done';
  /** The date the step is due, when the terms set one. */
  readonly due?: string;
  /** Days past that date, today (calendar days): 0 when not past. */
  readonly overdue: number;
};

/** Each period of the license up to today, with its report and what it waits for. Oldest first. */
export const periodRows = (terms: LicenseTerms, ledger: Ledger, today: string): PeriodRow[] => {
  if (!terms.reporting) return [];
  const periods = periodsOf(terms.reporting, terms.startDate, terms.endDate, today).filter((p) => p.from <= today);
  const live = liveReports(ledger);
  return periods.map((period) => {
    const report = live.find((r) => r.statement.periodFrom === period.from && r.statement.periodTo === period.to);
    const at = (due?: string) => (due && today > due ? daysBetween(due, today) : 0);
    if (!report)
      return period.to >= today
        ? { period, step: 'running', overdue: 0 }
        : { period, step: 'report', due: period.reportDue, overdue: at(period.reportDue) };
    const st = stateOf(report);
    if (st === 'waiting') return { period, report, step: 'answer', overdue: 0 };
    if (st === 'fix') return { period, report, step: 'fix', due: period.reportDue, overdue: at(period.reportDue) };
    if (st === 'to-pay') return { period, report, step: 'pay', due: period.paymentDue, overdue: at(period.paymentDue) };
    if (st === 'paid') return { period, report, step: 'confirm', overdue: 0 };
    return { period, report, step: 'done', overdue: 0 };
  });
};

/** The balance accepted and not yet paid, in the deal's currency. */
export const balanceOwed = (ledger: Ledger, currency: string): string => {
  const digits = currencyDigits(currency);
  return (
    sumAmounts(
      liveReports(ledger)
        .filter((r) => stateOf(r) === 'to-pay' && r.statement.currency === currency)
        .map((r) => toPayOf(r)),
      digits,
    ) ?? minorText(0n, digits)
  );
};

// ---- exports: CSV of reports and payments, a printable statement ------------------------------

const csvCell = (v: string | number | undefined): string => {
  const s = v === undefined ? '' : String(v);
  // A cell a spreadsheet would run as a formula is written as text.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** Every report and what happened to it, one row each, oldest first: the same file on both sides. */
export const ledgerCsv = (ledger: Ledger, licensorName?: string): string => {
  const head = [
    'report',
    'period_from',
    'period_to',
    'currency',
    'amount_owed',
    'tax_withheld',
    'answer',
    'answered_on',
    'paid_amount',
    'paid_on',
    'reference',
    'received_amount',
    'received_on',
    'replaced_by_report',
  ];
  const day = (t?: number) => (t ? new Date(t).toISOString().slice(0, 10) : '');
  const rows = [...ledger.reports].reverse().map((r) => {
    const s = r.statement;
    const by = r.replacedBy ? ledger.reports.find((x) => x.statement.signature === r.replacedBy!.signature) : undefined;
    return [
      r.number,
      s.periodFrom,
      s.periodTo,
      s.currency,
      s.amountOwed,
      r.paid?.taxWithheld ?? s.taxWithheld,
      r.reply?.decision === 'accepted' ? 'accepted' : r.reply ? 'asked to fix' : '',
      day(r.reply?.at),
      r.paid?.amount,
      r.paid?.paidOn,
      r.paid?.reference ?? paymentReference(s.signature, licensorName),
      r.received?.amount,
      day(r.received?.at),
      by?.number,
    ]
      .map(csvCell)
      .join(',');
  });
  return [head.join(','), ...rows].join('\r\n') + '\r\n';
};

const html = (s: string | number | undefined): string =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

export type StatementWords = {
  readonly title: string;
  readonly rows: readonly (readonly [string, string])[];
  readonly lines: readonly (readonly [string, string])[];
  readonly total: readonly [string, string];
  readonly payTo?: readonly (readonly [string, string])[];
  readonly footer: readonly string[];
};

/** A printable statement (or invoice) as one HTML file: the words come from the page, in the reader's language. */
export const statementHtml = (w: StatementWords, lang = 'en'): string => {
  const table = (rows: readonly (readonly [string, string])[]) =>
    `<table>${rows.map(([k, v]) => `<tr><th>${html(k)}</th><td>${html(v)}</td></tr>`).join('')}</table>`;
  return `<!doctype html>
<html lang="${html(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${html(w.title)}</title>
<style>
body{font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1e2227;background:#fff;margin:0;padding:24px;max-width:720px}
h1{font-size:22px;margin:0 0 16px}table{border-collapse:collapse;width:100%;margin:0 0 18px}
th,td{text-align:left;vertical-align:top;padding:6px 8px;border-bottom:1px solid #e3e5e8}th{width:40%;font-weight:600;color:#4a5058}
td.n{text-align:right;font-variant-numeric:tabular-nums}.total th,.total td{font-weight:700;border-bottom:2px solid #1e2227}
p.f{font-size:12px;color:#4a5058;margin:6px 0}@media print{body{padding:0}}
</style></head><body>
<h1>${html(w.title)}</h1>
${table(w.rows)}
<table>${w.lines.map(([k, v]) => `<tr><th>${html(k)}</th><td class="n">${html(v)}</td></tr>`).join('')}<tr class="total"><th>${html(w.total[0])}</th><td class="n">${html(w.total[1])}</td></tr></table>
${w.payTo ? table(w.payTo) : ''}
${w.footer.map((f) => `<p class="f">${html(f)}</p>`).join('\n')}
</body></html>
`;
};

/** The periods (with due dates) still to come or to report, for a calendar file. */
export const upcomingPeriods = (terms: LicenseTerms, today: string): RoyaltyPeriod[] =>
  terms.reporting
    ? periodsOf(terms.reporting, terms.startDate, terms.endDate, today).filter((p) => p.paymentDue >= today)
    : [];
