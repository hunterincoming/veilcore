// Royalties on a live license, between the two of them (docs/agreements-live.md, 4 and 5).
//
// Each period: the licensee sends a royalty report; the licensor answers once, Accept or Ask to
// fix; once accepted the licensee pays where the licensor said, and taps "I paid"; the licensor
// confirms what arrived. Either side can send a signed reminder; the licensor can send a notice of
// breach. Every step is a message on the deal's private channel (deal.ts): encrypted for the two
// of them, signed by whoever took it, dated by the registry's hourly anchor on Midnight. VeilCore
// never holds, routes or starts a payment. The same screen on both sides; only who can press what
// differs. The rules live in veilcore/royalty-ledger.ts (pure, tested).
// SPDX-License-Identifier: Apache-2.0

import { forgetKey, nameKey } from '../../veilcore/payment-partners';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  Divider,
  FormControlLabel,
  IconButton,
  Link,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import { downloadDealRecord, sayOnce, type DealEntry, type DealParty } from '../../veilcore/deal-client';
import { publicOf, type DealSide, type StatementLine } from '../../veilcore/deal';
import {
  currencyDigits,
  formatMoney,
  isZero,
  isDecimal,
  normaliseDecimal,
  owedUnder,
  sameAmount,
  toMinor,
} from '../../veilcore/money';
import { receiptsFor, type CheckedReceipt } from '../../veilcore/payments';
import { DealCredentials } from './DealCredentials';
import { subjectOf, type LicenseTerms } from '../../veilcore/licenses';
import type { AgreedTerms } from '../../veilcore/credentials';
import { evidenceOf, isEvidence, isTheReport, sizeText, type Evidence } from '../../veilcore/evidence';
import { NextUp } from './DealSteps';
import { nextRoyaltyStep, suggestedPeriod } from './steps';
import { MidnightPayoutForm, OnChainPaymentCheck, PayOnMidnight } from './OnChainPay';
import { methodWords, reusedPayments, tokenOfMethod } from '../../veilcore/onchain-pay';
import { ONCHAIN_PAYMENTS } from '../../config/copy';
import { rich, useT } from '../../i18n/app';
import { forKind, labelOr, type Translator } from '../../i18n/translate';
import type { AppKey } from '../../i18n/app/en';
import {
  balanceOwed,
  ledgerCsv,
  ledgerOf as ledgerOfEntries,
  liveReports,
  minimumProgress,
  expectedTopUp,
  expectedTotal,
  offspringRuns,
  paidMessage,
  paymentReference,
  payoutLock,
  periodRows,
  reportLines,
  stateOf,
  statementHtml,
  toPayOf,
  type Ledger,
  type NoticeEntry,
  type PeriodRow,
  type Report,
  type ReportInput,
} from '../../veilcore/royalty-ledger';
import { periodsOf, type RoyaltyPeriod } from '../../veilcore/royalty-periods';
import { licenseCalendar } from '../../ask/due';
import {
  currencyOf,
  dateWords,
  localDay,
  offspringOf,
  ruleOf,
  scheduleOf,
  unitLabel,
  withDealCurrency,
} from '../../veilcore/royalty-terms';

type Terms = LicenseTerms;

/** What a statement owes under old terms, to the cent ('0.00' when the quantity isn't a number yet). */
export const amountOwed = (terms: { royaltyType?: string; royaltyAmount?: string }, quantity: string): string =>
  owedUnder(terms, quantity) ?? '0.00';

/** The ledger, with its reports also as `lines` (newest first), as the older pages and tests read it. */
export const ledgerOf = (entries: readonly DealEntry[]) => {
  const l = ledgerOfEntries(entries);
  return { ...l, lines: l.reports };
};

/** A file the user saves: a blob in a link they tap. */
const saveFile = (name: string, text: string, type: string) => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const periodText = (from: string, to: string, tr: Translator): string => {
  const f = (d: string) => tr.date(`${d}T12:00:00`, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${f(from)} – ${f(to)}`;
};
/** The card's headline date: the same short form as every other date here, only bigger. */
const dayText = (d: string, tr: Translator): string => dateWords(d, tr);
/** A signed time as a calendar date, in the same short form as every other date here. */
const when = (ms: number, tr: Translator): string => tr.date(ms, { day: 'numeric', month: 'short', year: 'numeric' });

type Send = (b: Parameters<typeof sayOnce>[1]) => Promise<boolean>;

export const RoyaltyLedger: React.FC<{
  party: DealParty;
  side: DealSide;
  terms: Terms;
  entries: readonly DealEntry[] | undefined;
  refresh: () => void;
  /** What this page holds as agreed (its own stored license), for the W3C credentials. */
  agreed?: AgreedTerms;
  /** A breeder share: only the royalty on offspring is reported. */
  agreementType?: string;
  /** A cannabis record: the licensor's own payment link isn't offered (design v3, 10). */
  cannabis?: boolean;
}> = ({ party, side, terms: agreedTerms, entries, refresh, agreed, agreementType, cannabis }) => {
  const tr = forKind(useT(), subjectOf(agreedTerms));
  const ledger = useMemo(() => ledgerOfEntries(entries ?? []), [entries]);
  // Old terms named no currency: their reports were in the licensor's payout currency (review round 1, 5).
  const terms = useMemo(
    () => withDealCurrency(agreedTerms, ledger.reports[0]?.statement.currency, ledger.payout?.currency),
    [agreedTerms, ledger],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [form, setForm] = useState<
    { kind: 'report'; period?: RoyaltyPeriod; replaces?: Report } | { kind: 'payout' } | { kind: 'invoice' }
  >();
  const [more, setMore] = useState(false);
  const [payoutKind, setPayoutKind] = useState<'other' | 'midnight'>('other');
  const today = localDay();
  const schedule = scheduleOf(terms);
  const names = {
    licensor: terms.licensor || tr.t('app.roy.who.licensor'),
    licensee: terms.licensee || tr.t('app.roy.who.licensee'),
  };
  const rows = useMemo(() => periodRows(terms, ledger, today), [terms, ledger, today]);
  const mine = useMemo(() => publicOf(party.mySecret), [party.mySecret]);
  const live = liveReports(ledger);
  // One on-chain transaction counts for one report only (onchain-pay.ts reusedPayments).
  const reused = useMemo(
    () =>
      reusedPayments(
        ledger.reports.flatMap((l) =>
          l.paid
            ? [
                {
                  statementSig: l.statement.signature,
                  method: l.paid.method,
                  reference: l.paid.reference,
                  at: l.paid.at,
                  seq: l.paid.seq,
                },
              ]
            : [],
        ),
      ),
    [ledger],
  );

  // One send at a time from this page: a second tap before the first answers sends nothing.
  const sending = useRef(false);
  /**
   * Every royalty message is signed once and sent at most once (deal-client.ts sayOnce): after a
   * lost answer, trying again sends the same signed message, never a second report or payment.
   */
  const send: Send = async (body) => {
    if (sending.current) return false;
    sending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await sayOnce(party, body);
      setForm(undefined);
      refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };

  if (!entries) {
    return (
      <Typography variant="body2" color="text.secondary">
        {tr.t('app.lic.ledger.opening')}
      </Typography>
    );
  }

  const ctx: Ctx = { side, terms, ledger, names, tr, busy, send, today, cannabis: !!cannabis, agreementType };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }} data-royalties="">
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" component="h3">
            {tr.t('app.lic.ledger.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {side === 'licensee' ? tr.t('app.roy.howL') : tr.t('app.roy.howI')}
          </Typography>
        </Box>

        {schedule ? (
          <HomeCard
            ctx={ctx}
            rows={rows}
            onReport={(period, replaces) => setForm({ kind: 'report', period, replaces })}
          />
        ) : (
          <LegacyNext ctx={ctx} onFile={() => setForm({ kind: 'report' })} />
        )}

        {form?.kind === 'report' && (
          <ReportForm
            ctx={ctx}
            period={form.period}
            replaces={form.replaces}
            onCancel={() => setForm(undefined)}
            legacyPeriod={schedule ? undefined : suggestedPeriod(live, new Date())}
          />
        )}

        {!(side === 'licensee' && live.some((r) => stateOf(r) === 'to-pay')) && (
          <PayoutBlock
            ctx={ctx}
            editing={form?.kind === 'payout' || form?.kind === 'invoice' ? form.kind : undefined}
            onEdit={(k) => setForm(k ? { kind: k } : undefined)}
            payoutKind={payoutKind}
            setPayoutKind={setPayoutKind}
          />
        )}

        {ledger.reports.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {tr.t('app.roy.none')}
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} spacing={1.75}>
            {ledger.reports.map((r) => (
              <ReportCard
                key={r.statement.signature}
                ctx={ctx}
                report={r}
                period={rows.find((x) => x.report === r)?.period}
                onCorrect={() =>
                  setForm({ kind: 'report', period: rows.find((x) => x.report === r)?.period, replaces: r })
                }
                reusedFor={reused.get(r.statement.signature)}
              />
            ))}
          </Stack>
        )}

        <Timeline ctx={ctx} entries={entries} />

        {/* What most people never need, one tap away: the signed record, the CSV, the W3C credentials. */}
        <Box>
          <Button size="small" color="inherit" onClick={() => setMore(!more)} aria-expanded={more} sx={{ px: 0 }}>
            {more ? tr.t('app.roy.files.hide') : tr.t('app.roy.files.show')}
          </Button>
          <Collapse in={more}>
            <Stack spacing={1.25} sx={{ pt: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => downloadDealRecord(party, mine, entries)}
                sx={{ alignSelf: 'flex-start' }}
              >
                {tr.t('app.lic.ledger.download')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  saveFile(
                    `veilcore-royalties-${party.commitment.slice(0, 8)}.csv`,
                    ledgerCsv(ledger, terms.licensor),
                    'text/csv',
                  )
                }
                sx={{ alignSelf: 'flex-start' }}
                data-csv=""
              >
                {tr.t('app.roy.csv')}
              </Button>
              <Typography variant="caption" color="text.secondary">
                {tr.t('app.roy.downloadsInclude')}
              </Typography>
              <DealCredentials
                party={party}
                entries={entries}
                confirmed={ledger.reports.flatMap((l) =>
                  l.received ? [{ statement: l.statement, received: l.received }] : [],
                )}
                busy={busy}
                onSend={(b) => void send(b)}
                agreed={agreed}
              />
              {side === 'issuer' && (
                <Typography variant="caption" color="text.secondary">
                  {tr.t('app.lic.ledger.keyStarts', { key: mine.slice(0, 8) })}
                </Typography>
              )}
            </Stack>
          </Collapse>
        </Box>

        <HowToRead tr={tr} />
        {error && (
          <Alert severity="error" variant="outlined" data-send-error="">
            {error} {tr.t('app.roy.sendsSame')}
          </Alert>
        )}
      </Stack>
    </Paper>
  );
};

type Ctx = {
  side: DealSide;
  terms: Terms;
  ledger: Ledger;
  names: { licensor: string; licensee: string };
  tr: Translator;
  busy: boolean;
  send: Send;
  today: string;
  cannabis: boolean;
  agreementType?: string;
};

// ---- the home card: the next date, the balance, one button -------------------------------------

const HomeCard: React.FC<{
  ctx: Ctx;
  rows: readonly PeriodRow[];
  onReport: (p: RoyaltyPeriod, replaces?: Report) => void;
}> = ({ ctx, rows, onReport }) => {
  const { side, terms, ledger, names, tr, today, busy, send } = ctx;
  const currency = currencyOf(terms);
  const [breach, setBreach] = useState(false);
  const [reason, setReason] = useState('');
  const open = rows.filter((r) => r.step !== 'done' && r.step !== 'running');
  const row = open[0] ?? rows.find((r) => r.step === 'running');
  const next = row
    ? undefined
    : periodsOf(terms.reporting!, terms.startDate, terms.endDate, today).find((p) => p.from > today);
  const balance = balanceOwed(ledger, currency);
  const min = minimumProgress(terms, ledger.reports, today);
  const mineToAct = row && whoActs(row.step) === side;
  // A date only where the terms set one: a report's or a payment's due date, or a period's end.
  const bigDate = row ? (row.due ?? (row.step === 'running' ? row.period.reportDue : undefined)) : next?.from;
  const reminded = row && lastReminder(ledger, row);
  // Another report waiting for the licensor's answer, when the card is about something else.
  const alsoAnswer = open.find((r) => r.step === 'answer' && r !== row);

  const remind = () =>
    row &&
    void send({
      type: 'notice',
      kind: 'reminder',
      about: aboutOf(row.step),
      periodFrom: row.period.from,
      periodTo: row.period.to,
      ...(row.report ? { statementSig: row.report.statement.signature } : {}),
      ...(row.due ? { dueOn: row.due } : {}),
      asOf: today,
    });

  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }} data-royalty-home="">
      <Stack spacing={1.25}>
        {row ? (
          <>
            <Typography variant="body2" color="text.secondary">
              {tr.t(`app.roy.home.${side === 'licensee' ? 'l' : 'i'}.${homeKey(row)}` as AppKey, {
                period: periodText(row.period.from, row.period.to, tr),
                n: row.report?.number ?? '',
                licensor: names.licensor,
                licensee: names.licensee,
              })}
            </Typography>
            {bigDate && (
              <Typography variant="h4" component="p" sx={{ fontWeight: 700 }} data-next-date="">
                {dayText(bigDate, tr)}
              </Typography>
            )}
            {row.overdue > 0 && (
              <Chip
                color="error"
                label={tr.tp('app.roy.overdue', row.overdue)}
                sx={{ alignSelf: 'flex-start' }}
                data-overdue=""
              />
            )}
          </>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary">
              {next ? tr.t('app.roy.home.nextStarts') : tr.t('app.roy.home.allDone')}
            </Typography>
            {bigDate && (
              <Typography variant="h4" component="p" sx={{ fontWeight: 700 }} data-next-date="">
                {dayText(bigDate, tr)}
              </Typography>
            )}
          </>
        )}
        {side === 'issuer' && row?.step === 'confirm' && row.report?.paid && (
          <Typography variant="h5" component="p" data-awaiting="">
            {tr.t('app.roy.home.i.awaiting', {
              amount: formatMoney(row.report.paid.amount, row.report.paid.currency, tr.locale),
            })}
          </Typography>
        )}
        {side === 'issuer' && alsoAnswer && (
          <Typography variant="body2" data-also-answer="">
            {tr.t('app.roy.home.i.alsoAnswer', { n: alsoAnswer.report!.number })}
          </Typography>
        )}
        <Stack direction="row" useFlexGap spacing={3} sx={{ flexWrap: 'wrap' }}>
          {!isZero(balance) && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                {tr.t('app.roy.home.balance')}
              </Typography>
              <Typography variant="subtitle1" data-balance="">
                {formatMoney(balance, currency, tr.locale)}
              </Typography>
            </Box>
          )}
          {min && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                {tr.t('app.roy.home.minimum')}
              </Typography>
              <Typography variant="subtitle1" data-minimum="">
                {tr.t('app.roy.home.minimumOf', {
                  owed: formatMoney(min.owed, currency, tr.locale),
                  minimum: formatMoney(min.minimum, currency, tr.locale),
                })}
              </Typography>
            </Box>
          )}
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
          {row && side === 'licensee' && (row.step === 'report' || row.step === 'running') && (
            <Button variant={mineToAct ? 'contained' : 'outlined'} size="large" onClick={() => onReport(row.period)}>
              {tr.t('app.roy.home.write')}
            </Button>
          )}
          {row && side === 'licensee' && row.step === 'fix' && row.report && (
            <Button variant="contained" size="large" onClick={() => onReport(row.period, row.report)}>
              {tr.t('app.roy.home.correct')}
            </Button>
          )}
          {row && row.report && mineToAct && row.step !== 'fix' && (
            <Button
              variant="contained"
              size="large"
              onClick={() =>
                document.getElementById(`report-${row.report!.number}`)?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              {tr.t(`app.roy.home.go.${row.step}` as AppKey, { n: row.report.number })}
            </Button>
          )}
          {row && !mineToAct && row.step !== 'running' && (
            <Button variant="outlined" disabled={busy || reminded === today} onClick={remind} data-remind="">
              {reminded === today ? tr.t('app.roy.remindSent') : tr.t('app.roy.remind')}
            </Button>
          )}
          <Button
            size="small"
            color="inherit"
            onClick={() =>
              saveFile(
                'veilcore-royalty-dates.ics',
                // The same due list as Ask's "What's due" (royalty-ledger.ts dueSteps): overdue
                // items stay, done ones go, so the two calendar files agree.
                licenseCalendar(terms, ledger, today, (kind, p) =>
                  tr.t(kind === 'report' ? 'app.roy.cal.report' : 'app.roy.cal.payment', {
                    period: periodText(p.from, p.to, tr),
                  }),
                ),
                'text/calendar',
              )
            }
          >
            {tr.t('app.roy.cal.add')}
          </Button>
        </Stack>
        {side === 'issuer' && row && row.overdue > 0 && (
          <Box>
            {!breach ? (
              <Button size="small" color="error" onClick={() => setBreach(true)}>
                {tr.t('app.roy.breach.open')}
              </Button>
            ) : (
              <Stack spacing={1}>
                <Typography variant="body2">{tr.t('app.roy.breach.what')}</Typography>
                <TextField
                  size="small"
                  label={tr.t('app.roy.breach.reason')}
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 1000))}
                  multiline
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    color="error"
                    variant="contained"
                    disabled={busy || !reason.trim()}
                    onClick={() =>
                      void send({
                        type: 'notice',
                        kind: 'breach',
                        about: aboutOf(row.step),
                        periodFrom: row.period.from,
                        periodTo: row.period.to,
                        ...(row.report ? { statementSig: row.report.statement.signature } : {}),
                        ...(row.due ? { dueOn: row.due } : {}),
                        asOf: today,
                        note: reason.trim(),
                      }).then((ok) => ok && (setBreach(false), setReason('')))
                    }
                  >
                    {tr.t('app.roy.breach.send')}
                  </Button>
                  <Button color="inherit" onClick={() => setBreach(false)}>
                    {tr.t('app.lic.ledger.cancel')}
                  </Button>
                </Stack>
              </Stack>
            )}
          </Box>
        )}
      </Stack>
    </Paper>
  );
};

/** The card's words for a row: past due dates say "was due" (UX review 2). */
const homeKey = (row: PeriodRow): string =>
  row.overdue > 0 && row.step === 'report'
    ? 'reportLate'
    : row.overdue > 0 && row.step === 'pay'
      ? 'payLate'
      : row.step;

const whoActs = (step: PeriodRow['step']): DealSide | undefined =>
  step === 'report' || step === 'fix' || step === 'pay' || step === 'running'
    ? 'licensee'
    : step === 'answer' || step === 'confirm'
      ? 'issuer'
      : undefined;
const aboutOf = (step: PeriodRow['step']): 'report' | 'answer' | 'payment' | 'receipt' | 'other' =>
  step === 'report' || step === 'fix'
    ? 'report'
    : step === 'answer'
      ? 'answer'
      : step === 'pay'
        ? 'payment'
        : step === 'confirm'
          ? 'receipt'
          : 'other';
/** The day this side last sent a reminder for the row's step: one a day is enough. */
const lastReminder = (ledger: Ledger, row: PeriodRow): string | undefined =>
  [...ledger.notices]
    .reverse()
    .find(
      (n) =>
        n.kind === 'reminder' &&
        n.mine &&
        n.periodFrom === row.period.from &&
        n.periodTo === row.period.to &&
        n.about === aboutOf(row.step),
    )?.asOf;

/** Old terms (no schedule): the one next thing, as before, and the button to file. */
const LegacyNext: React.FC<{ ctx: Ctx; onFile: () => void }> = ({ ctx, onFile }) => {
  const { side, ledger, tr } = ctx;
  const next = nextRoyaltyStep(side, ledger.reports, ledger.payout, tr);
  return (
    <Stack spacing={1}>
      <NextUp text={next.text} yours={next.yours} />
      {side === 'licensee' && (
        <Button variant={next.file ? 'contained' : 'outlined'} onClick={onFile} sx={{ alignSelf: 'flex-start' }}>
          {tr.t('app.roy.home.write')}
        </Button>
      )}
    </Stack>
  );
};

// ---- the report form (licensee, phone-first) -----------------------------------------------------

const ReportForm: React.FC<{
  ctx: Ctx;
  period?: RoyaltyPeriod;
  replaces?: Report;
  onCancel: () => void;
  /** Old terms: the period is typed, starting from the one most likely. */
  legacyPeriod?: { from: string; to: string };
}> = ({ ctx, period, replaces, onCancel, legacyPeriod }) => {
  const { terms, tr, busy, send, ledger, names, agreementType } = ctx;
  const currency = currencyOf(terms);
  const digits = currencyDigits(currency);
  const share = agreementType === 'breeder-share';
  const rule = share ? undefined : ruleOf(terms);
  const off = offspringOf(terms);
  const old = replaces?.statement;
  const oldLine = (k: StatementLine['kind']) => old?.lines?.find((l) => l.kind === k);
  const [from, setFrom] = useState(period?.from ?? old?.periodFrom ?? legacyPeriod?.from ?? '');
  const [to, setTo] = useState(period?.to ?? old?.periodTo ?? legacyPeriod?.to ?? '');
  const [quantity, setQuantity] = useState(
    oldLine('royalty')?.gross ?? oldLine('royalty')?.quantity ?? (rule ? (old?.quantity ?? '') : ''),
  );
  const [ded, setDed] = useState<Record<string, string>>({});
  const [offQty, setOffQty] = useState(oldLine('offspring')?.quantity ?? '');
  const [note, setNote] = useState('');
  const [tax, setTax] = useState(old?.taxWithheld ?? '');
  const [taxNote, setTaxNote] = useState(old?.taxNote ?? '');
  const [moreOpen, setMoreOpen] = useState(false);
  const [evidence, setEvidence] = useState<Evidence>();
  const [evidenceError, setEvidenceError] = useState<string>();
  const periodWords = from && to ? periodText(from, to, tr) : '';

  const input: ReportInput = {
    quantity: rule ? quantity || '0' : '0',
    ...(rule?.kind === 'percent' && rule.base === 'net' ? { deductions: ded } : {}),
    offspring: offQty || '0',
  };
  // The royalty on offspring only while it runs; the minimum topped up on a contract year's last
  // report, from the other reports of that year (royalty-ledger.ts expectedTopUp).
  const offRuns = Boolean(off && from && offspringRuns(terms, from));
  const base = reportLines(terms, input, { type: agreementType, periodFrom: from });
  const topUp =
    base && from && to
      ? expectedTopUp(terms, ledger.reports, { periodFrom: from, periodTo: to, replaces: old?.signature }, base.total)
      : undefined;
  const result = reportLines(terms, input, { type: agreementType, minimumTopUp: topUp, periodFrom: from });
  const taxOk =
    !tax || (isDecimal(tax) && result && (toMinor(tax, digits) ?? 0n) <= (toMinor(result.total, digits) ?? 0n));
  const ok = Boolean(from && to && from <= to && result && taxOk);

  const sendReport = (nothing = false) => {
    const r = nothing
      ? reportLines(
          terms,
          { quantity: '0', offspring: '0' },
          { type: agreementType, minimumTopUp: topUp, periodFrom: from },
        )
      : result;
    if (!r) return;
    const taxN = !nothing && tax ? normaliseDecimal(tax) : undefined;
    void send({
      type: 'statement',
      statementId: crypto.randomUUID(),
      periodFrom: from,
      periodTo: to,
      basis: r.basis,
      quantity: r.quantity,
      currency,
      amountOwed: r.total,
      lines: r.lines,
      ...(taxN && toMinor(taxN, digits)! > 0n
        ? { taxWithheld: taxN, ...(taxNote.trim() ? { taxNote: taxNote.trim() } : {}) }
        : {}),
      ...(old ? { replaces: old.signature } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(!nothing && evidence ? { evidence } : {}),
    });
  };

  const question = (kind: 'royalty' | 'offspring', r: NonNullable<ReturnType<typeof ruleOf>>) =>
    r.kind === 'percent'
      ? tr.t(kind === 'royalty' ? (r.base === 'net' ? 'app.roy.r.gross' : 'app.roy.r.sales') : 'app.roy.r.offSales', {
          period: periodWords,
          currency,
        })
      : tr.t(kind === 'royalty' ? 'app.roy.r.units' : 'app.roy.r.offUnits', {
          unit: unitLabel(r.unit, tr),
          period: periodWords,
        });

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-report-form="">
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" component="h4">
            {old ? tr.t('app.roy.r.correctTitle', { n: replaces.number }) : tr.t('app.roy.r.title')}
          </Typography>
          {legacyPeriod ? null : (
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {periodWords}
            </Typography>
          )}
          {old && replaces?.reply?.note && (
            <Alert severity="warning" variant="outlined" sx={{ mt: 1 }}>
              {tr.t('app.roy.r.askedFix', { who: names.licensor, note: replaces.reply.note })}
            </Alert>
          )}
        </Box>
        {legacyPeriod && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <TextField
              type="date"
              label={tr.t('app.lic.ledger.sf.from')}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              type="date"
              label={tr.t('app.lic.ledger.sf.to')}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        )}
        {!old && (
          <Button
            variant="outlined"
            size="large"
            disabled={busy || !from || !to}
            onClick={() => sendReport(true)}
            data-nothing-sold=""
          >
            {tr.t('app.roy.r.nothing')}
          </Button>
        )}
        {rule && (
          <Box>
            <Typography
              component="label"
              htmlFor="royalty-quantity"
              variant="body1"
              sx={{ display: 'block', mb: 0.75 }}
            >
              {question('royalty', rule)}
            </Typography>
            <TextField
              id="royalty-quantity"
              helperText={rule.kind === 'per-unit' ? rule.unitDefinition : undefined}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/[^0-9.]/g, '').slice(0, 16))}
              slotProps={{ htmlInput: { inputMode: 'decimal', 'data-quantity': '' } }}
              fullWidth
            />
          </Box>
        )}
        {rule?.kind === 'percent' && rule.base === 'net' && (
          <Stack spacing={1.25}>
            {(rule.deductions ?? []).map((d) => (
              <TextField
                key={d}
                label={tr.t('app.roy.r.deduction', { what: labelOr(tr, `app.roy.ded.${d}`, d), currency })}
                value={ded[d] ?? ''}
                onChange={(e) => setDed({ ...ded, [d]: e.target.value.replace(/[^0-9.]/g, '').slice(0, 16) })}
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                size="small"
              />
            ))}
            {rule.deductionCapPct && (
              <Typography variant="caption" color="text.secondary">
                {tr.t('app.roy.r.cap', { cap: rule.deductionCapPct })}
              </Typography>
            )}
          </Stack>
        )}
        {off && offRuns && (
          <Box>
            <Typography
              component="label"
              htmlFor="offspring-quantity"
              variant="body1"
              sx={{ display: 'block', mb: 0.75 }}
            >
              {question('offspring', off.rule)}
            </Typography>
            <TextField
              id="offspring-quantity"
              value={offQty}
              onChange={(e) => setOffQty(e.target.value.replace(/[^0-9.]/g, '').slice(0, 16))}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              fullWidth
            />
          </Box>
        )}
        {result && (
          <LinesTable lines={result.lines} total={result.total} currency={currency} tr={tr} terms={terms} live />
        )}
        <Box>
          {evidence ? (
            <Typography variant="body2">
              {rich(
                tr.t('app.lic.ledger.sf.report'),
                { b: (c) => <b>{c}</b> },
                {
                  name: evidence.name,
                  size: sizeText(evidence.size),
                  code: <code>{evidence.sha256.slice(0, 12)}…</code>,
                },
              )}{' '}
              <Button size="small" color="inherit" onClick={() => setEvidence(undefined)}>
                {tr.t('app.lic.ledger.sf.remove')}
              </Button>
            </Typography>
          ) : (
            <Button component="label" size="small" variant="outlined">
              {tr.t('app.lic.ledger.sf.attach')}
              <input
                hidden
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  setEvidenceError(undefined);
                  if (f)
                    evidenceOf(f)
                      .then(setEvidence)
                      .catch((x: unknown) => setEvidenceError(x instanceof Error ? x.message : String(x)));
                }}
              />
            </Button>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {tr.t('app.roy.r.reportHelp')}
          </Typography>
          {evidenceError && (
            <Typography variant="caption" color="error">
              {evidenceError}
            </Typography>
          )}
        </Box>
        <Box>
          <Button
            size="small"
            color="inherit"
            onClick={() => setMoreOpen(!moreOpen)}
            aria-expanded={moreOpen}
            sx={{ px: 0 }}
          >
            {moreOpen ? tr.t('app.roy.less') : tr.t('app.roy.moreOptions')}
          </Button>
          <Collapse in={moreOpen}>
            <Stack spacing={1.25} sx={{ pt: 1 }}>
              <TextField
                size="small"
                label={tr.t('app.roy.tax.amount', { currency })}
                helperText={tr.t('app.roy.tax.help')}
                value={tax}
                error={!taxOk}
                onChange={(e) => setTax(e.target.value.replace(/[^0-9.]/g, '').slice(0, 16))}
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              />
              {tax && (
                <TextField
                  size="small"
                  label={tr.t('app.roy.tax.note')}
                  value={taxNote}
                  onChange={(e) => setTaxNote(e.target.value.slice(0, 300))}
                />
              )}
              <TextField
                size="small"
                label={tr.t('app.roy.r.note', { who: names.licensor })}
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                multiline
              />
            </Stack>
          </Collapse>
        </Box>
        <Typography variant="caption" color="text.secondary" data-privacy-line="">
          {tr.t('app.roy.r.privacy', { who: names.licensor })}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            size="large"
            disabled={busy || !ok}
            onClick={() => sendReport(false)}
            data-send-report=""
          >
            {old ? tr.t('app.roy.r.sendCorrected') : tr.t('app.roy.r.send')}
          </Button>
          <Button onClick={onCancel}>{tr.t('app.lic.ledger.cancel')}</Button>
        </Stack>
      </Stack>
    </Paper>
  );
};

/** A report's lines and total, as the terms worked them out (or as the report says). */
const LinesTable: React.FC<{
  lines: readonly StatementLine[];
  total: string;
  currency: string;
  tr: Translator;
  terms: Terms;
  live?: boolean;
}> = ({ lines, total, currency, tr, terms, live }) => (
  <Box
    component="table"
    sx={{ width: '100%', borderCollapse: 'collapse', '& td': { py: 0.5, verticalAlign: 'top' } }}
    data-lines=""
  >
    <tbody>
      {lines.map((l, i) => (
        <tr key={i}>
          <td>
            <Typography variant="body2">{lineWords(l, currency, tr, terms)}</Typography>
          </td>
          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <Typography variant="body2">{formatMoney(l.amount, currency, tr.locale)}</Typography>
          </td>
        </tr>
      ))}
      <tr>
        <td>
          <Typography variant="subtitle2">{live ? tr.t('app.roy.r.total') : tr.t('app.roy.c.total')}</Typography>
        </td>
        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
          <Typography variant="subtitle2" data-total="">
            {formatMoney(total, currency, tr.locale)}
          </Typography>
        </td>
      </tr>
    </tbody>
  </Box>
);

const lineWords = (l: StatementLine, currency: string, tr: Translator, terms: Terms): string => {
  if (l.kind === 'minimum') return tr.t('app.roy.line.minimum');
  const what = tr.t(l.kind === 'royalty' ? 'app.roy.line.royalty' : 'app.roy.line.offspring');
  if (l.gross !== undefined)
    return tr.t('app.roy.line.net', {
      what,
      gross: formatMoney(l.gross, currency, tr.locale),
      ded: formatMoney(l.deducted ?? '0', currency, tr.locale),
      rate: l.rate ?? '',
    });
  // Which kind of rate it is comes from the terms the line was worked out under.
  const rule = l.kind === 'royalty' ? ruleOf(terms) : offspringOf(terms)?.rule;
  return rule?.kind === 'percent'
    ? tr.t('app.roy.line.pct', {
        what,
        rate: l.rate ?? rule.rate,
        sales: formatMoney(l.quantity ?? '0', currency, tr.locale),
      })
    : tr.t('app.roy.line.units', {
        what,
        qty: l.quantity ?? '',
        rate: formatMoney(l.rate ?? '0', currency, tr.locale),
      });
};

// ---- one report: what it says, its answer, paying it, confirming it --------------------------

const ReportCard: React.FC<{
  ctx: Ctx;
  report: Report;
  period?: RoyaltyPeriod;
  onCorrect: () => void;
  reusedFor?: string;
}> = ({ ctx, report: r, period, onCorrect, reusedFor }) => {
  const { side, terms, ledger, names, tr, busy, send, today } = ctx;
  const s = r.statement;
  const st = stateOf(r);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState('');
  const [keysChanged, setKeysChanged] = useState(0);
  const receipts = useReceipts(r, ledger.payout?.account, keysChanged);
  const payToken = ledger.payout ? tokenOfMethod(ledger.payout.method) : undefined;
  const paidToken = r.paid ? tokenOfMethod(r.paid.method) : undefined;
  const lines: readonly StatementLine[] = s.lines ?? [{ kind: 'royalty', quantity: s.quantity, amount: s.amountOwed }];
  // What the terms say these figures come to, worked out here: shown to both sides if it differs.
  const expected = expectedTotal(terms, ledger.reports, s, ctx.agreementType);
  const mismatch = expected !== undefined && !sameAmount(expected, s.amountOwed, currencyDigits(s.currency));
  const currencyOff = s.currency !== currencyOf(terms) && Boolean(terms.currency);
  const label =
    st === 'replaced'
      ? tr.t('app.roy.st.replaced', {
          n: ledger.reports.find((x) => x.statement.signature === r.replacedBy!.signature)?.number ?? '',
        })
      : tr.t(`app.roy.st.${st}` as AppKey);
  const color =
    st === 'received'
      ? 'success'
      : st === 'fix' || st === 'short'
        ? 'error'
        : st === 'to-pay'
          ? 'warning'
          : st === 'paid'
            ? 'info'
            : 'default';
  const reminded = r.notices.filter((n) => n.mine && n.kind === 'reminder').pop()?.asOf;

  return (
    <Stack spacing={1} id={`report-${r.number}`} data-report={r.number} sx={{ opacity: st === 'replaced' ? 0.6 : 1 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="subtitle1" component="h4">
          {r.replaces
            ? tr.t('app.roy.c.titleCorrected', { n: r.number, old: r.replaces.number })
            : tr.t('app.roy.c.title', { n: r.number })}
        </Typography>
        <Chip size="small" label={label} color={color} variant="outlined" />
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {tr.t('app.roy.c.period', { period: periodText(s.periodFrom, s.periodTo, tr), date: when(s.at, tr) })}
      </Typography>
      {st !== 'replaced' && (
        <>
          <LinesTable lines={lines} total={s.amountOwed} currency={s.currency} tr={tr} terms={terms} />
          {s.taxWithheld && !(side === 'licensee' && st === 'to-pay') && (
            <Typography variant="body2">
              {tr.t('app.roy.tax.declared', {
                amount: formatMoney(s.taxWithheld, s.currency, tr.locale),
                net: formatMoney(toPayOf(r), s.currency, tr.locale),
              })}
              {s.taxNote ? ` · “${s.taxNote}”` : ''}
            </Typography>
          )}
          {s.note && (
            <Typography variant="body2" color="text.secondary">
              “{s.note}”
            </Typography>
          )}
          <ReportCheck statement={s} side={side} checking={!r.reply} />
          {(mismatch || currencyOff) && (
            <Alert severity="warning" variant="outlined" data-mismatch="">
              {currencyOff
                ? tr.t('app.roy.c.currencyOff', { currency: s.currency, terms: currencyOf(terms) })
                : tr.t('app.roy.c.mismatch', {
                    expected: formatMoney(expected!, s.currency, tr.locale),
                    owed: formatMoney(s.amountOwed, s.currency, tr.locale),
                  })}
            </Alert>
          )}
        </>
      )}
      {r.reply && (
        <Typography variant="body2" color="text.secondary">
          {tr.t(r.reply.decision === 'accepted' ? 'app.roy.c.acceptedOn' : 'app.roy.c.fixOn', {
            who: names.licensor,
            date: when(r.reply.at, tr),
          })}
          {r.reply.note ? `: “${r.reply.note}”` : ''}
        </Typography>
      )}
      {r.paid && (
        <Typography variant="body2" color="text.secondary">
          {tr.t('app.roy.c.paid', {
            who: names.licensee,
            amount: formatMoney(r.paid.amount, r.paid.currency, tr.locale),
            date: dateWords(r.paid.paidOn, tr),
            ref: r.paid.reference,
          })}
        </Typography>
      )}
      {r.paid && r.short !== undefined && (
        <Alert severity="warning" variant="outlined" data-short-payment="">
          {tr.t('app.roy.c.short', {
            paid: formatMoney(r.paid.amount, r.paid.currency, tr.locale),
            owed: formatMoney(toPayOf(r, s.taxWithheld ?? '0'), s.currency, tr.locale),
            left: formatMoney(r.short, s.currency, tr.locale),
          })}
        </Alert>
      )}
      {r.received && (
        <Typography variant="body2" color="success.main">
          {tr.t('app.roy.c.received', { who: names.licensor, date: when(r.received.at, tr) })}
        </Typography>
      )}
      {receipts.map((c) => (
        <Alert
          key={`${c.receipt.partner}:${c.receipt.reference}`}
          severity={c.mismatch.length || !c.keyNamed ? 'warning' : 'success'}
          variant="outlined"
          data-receipt-key={c.keyNamed ? 'named' : 'unnamed'}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                if (c.keyNamed) forgetKey(c.receipt.partner);
                else nameKey(c.receipt.partner, c.partnerName ?? '');
                setKeysChanged((n) => n + 1);
              }}
            >
              {tr.t(c.keyNamed ? 'app.lic.ledger.r.forget' : 'app.lic.ledger.r.trust')}
            </Button>
          }
        >
          {tr.t(c.keyNamed ? 'app.lic.ledger.r.checked' : 'app.lic.ledger.r.unchecked', {
            partner: c.partnerName ?? tr.t('app.lic.ledger.r.aPartner'),
            key: `${c.receipt.partner.slice(0, 8)}…${c.receipt.partner.slice(-6)}`,
            amount: c.receipt.amount,
            currency: c.receipt.currency,
            to: c.receipt.payTo,
            date: tr.date(c.receipt.paidAt, { day: 'numeric', month: 'short', year: 'numeric' }),
            ref: c.receipt.reference,
          })}
          {c.mismatch.length > 0 && ` ${tr.t('app.lic.ledger.r.mismatch', { what: c.mismatch.join('; ') })}`}
        </Alert>
      ))}
      {r.notices.map((n) => (
        <NoticeLine key={n.signature} n={n} ctx={ctx} />
      ))}

      {/* The licensor answers once: Accept, or Ask to fix with a reason. */}
      {side === 'issuer' && st === 'waiting' && (
        <Stack spacing={1}>
          {asking && (
            <TextField
              size="small"
              label={tr.t('app.roy.c.whatsWrong')}
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              autoFocus
              multiline
            />
          )}
          <Typography variant="caption" color="text.secondary">
            {tr.t('app.roy.c.answerOnce')}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {!asking ? (
              <>
                <Button
                  variant="contained"
                  size="large"
                  disabled={busy}
                  onClick={() =>
                    void send({
                      type: 'reply',
                      statementId: s.statementId,
                      statementSig: s.signature,
                      decision: 'accepted',
                    })
                  }
                  data-accept=""
                >
                  {tr.t('app.roy.c.accept')}
                </Button>
                <Button size="large" color="error" disabled={busy} onClick={() => setAsking(true)}>
                  {tr.t('app.roy.c.askFix')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  color="error"
                  variant="contained"
                  disabled={busy || !note.trim()}
                  onClick={() =>
                    void send({
                      type: 'reply',
                      statementId: s.statementId,
                      statementSig: s.signature,
                      decision: 'disputed',
                      note: note.trim(),
                    })
                  }
                >
                  {tr.t('app.roy.c.sendFix')}
                </Button>
                <Button color="inherit" disabled={busy} onClick={() => setAsking(false)}>
                  {tr.t('app.lic.ledger.l.back')}
                </Button>
              </>
            )}
          </Stack>
        </Stack>
      )}

      {side === 'licensee' && st === 'fix' && (
        <Button variant="contained" onClick={onCorrect} sx={{ alignSelf: 'flex-start' }}>
          {tr.t('app.roy.home.correct')}
        </Button>
      )}

      {side === 'licensee' && st === 'to-pay' && <PayPanel ctx={ctx} report={r} period={period} payToken={payToken} />}

      {side === 'issuer' && r.paid && paidToken && r.paid.reference && !r.received && (
        <OnChainPaymentCheck
          token={paidToken}
          txId={r.paid.reference}
          payTo={ledger.payout?.account ?? r.paid.payTo}
          amount={r.paid.amount}
          statementSig={s.signature}
          reusedFor={reusedFor}
        />
      )}
      {side === 'issuer' && r.paid && !r.received && (
        <Stack spacing={0.5}>
          <Typography variant="body2">{tr.t('app.roy.c.checkArrived', { ref: r.paid.reference })}</Typography>
          <Button
            variant="contained"
            size="large"
            disabled={busy}
            onClick={() =>
              void send({
                type: 'received',
                statementId: s.statementId,
                statementSig: s.signature,
                // Exactly what they said they sent: the checker settles a report only when the two match.
                amount: r.paid!.amount,
                currency: r.paid!.currency,
              })
            }
            sx={{ alignSelf: 'flex-start' }}
            data-confirm-received=""
          >
            {r.short !== undefined
              ? tr.t('app.roy.c.confirmShort', {
                  amount: formatMoney(r.paid.amount, r.paid.currency, tr.locale),
                  left: formatMoney(r.short, s.currency, tr.locale),
                })
              : tr.t('app.roy.c.confirm', { amount: formatMoney(r.paid.amount, r.paid.currency, tr.locale) })}
          </Button>
        </Stack>
      )}

      {/* A reminder on a report waiting for the other side. */}
      {((side === 'licensee' && (st === 'waiting' || st === 'paid')) ||
        (side === 'issuer' && (st === 'to-pay' || st === 'short'))) && (
        <Button
          size="small"
          variant="text"
          disabled={busy || reminded === today}
          sx={{ alignSelf: 'flex-start' }}
          onClick={() =>
            void send({
              type: 'notice',
              kind: 'reminder',
              about: st === 'waiting' ? 'answer' : st === 'paid' ? 'receipt' : 'payment',
              periodFrom: s.periodFrom,
              periodTo: s.periodTo,
              statementSig: s.signature,
              ...((st === 'to-pay' || st === 'short') && period ? { dueOn: period.paymentDue } : {}),
              asOf: today,
            })
          }
        >
          {reminded === today ? tr.t('app.roy.remindSent') : tr.t('app.roy.remind')}
        </Button>
      )}

      {(st === 'to-pay' || st === 'short' || st === 'paid' || st === 'received' || st === 'nothing-due') && (
        <Button
          size="small"
          variant="outlined"
          sx={{ alignSelf: 'flex-start' }}
          onClick={() => downloadStatement(ctx, r)}
          data-download-statement=""
        >
          {ledger.invoice ? tr.t('app.roy.c.invoice') : tr.t('app.roy.c.statement')}
        </Button>
      )}
    </Stack>
  );
};

const NoticeLine: React.FC<{ n: NoticeEntry; ctx: Ctx }> = ({ n, ctx }) => {
  const { tr, names } = ctx;
  const who = n.mine ? tr.t('app.roy.who.you') : n.from === 'issuer' ? names.licensor : names.licensee;
  const period = periodText(n.periodFrom, n.periodTo, tr);
  const text =
    n.kind === 'breach'
      ? tr.t('app.roy.notice.breach', { who, period, note: n.note ?? '', date: dateWords(n.asOf, tr) })
      : n.dueOn && (n.about === 'report' || n.about === 'payment')
        ? tr.t(`app.roy.notice.${n.about}Due` as AppKey, {
            who,
            period,
            due: dateWords(n.dueOn, tr),
            date: dateWords(n.asOf, tr),
          })
        : tr.t(`app.roy.notice.${n.about}` as AppKey, { who, period, date: dateWords(n.asOf, tr) });
  return (
    <Alert severity={n.kind === 'breach' ? 'error' : 'info'} variant="outlined" data-notice={n.kind}>
      {text}
    </Alert>
  );
};

/** Copy a value, with a small button. */
const CopyValue: React.FC<{ label: string; value: string; tr: Translator; mono?: boolean }> = ({
  label,
  value,
  tr,
  mono,
}) => {
  const [done, setDone] = useState(false);
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography
          variant="body1"
          sx={{
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            fontFamily: mono ? 'monospace' : undefined,
            fontWeight: mono ? 700 : 400,
          }}
        >
          {value}
        </Typography>
      </Box>
      <Tooltip title={done ? tr.t('app.roy.copied') : tr.t('app.roy.copy')}>
        <IconButton
          aria-label={tr.t('app.roy.copyWhat', { what: label })}
          onClick={() =>
            void navigator.clipboard
              ?.writeText(value)
              .then(() => setDone(true))
              .catch(() => undefined)
          }
        >
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
};

/** The licensee pays an accepted report: amount, where, reference, fees, then "I paid". */
const PayPanel: React.FC<{
  ctx: Ctx;
  report: Report;
  period?: RoyaltyPeriod;
  payToken: ReturnType<typeof tokenOfMethod>;
}> = ({ ctx, report: r, period, payToken }) => {
  const { terms, ledger, names, tr, busy, send, today } = ctx;
  const s = r.statement;
  const payout = ledger.payout;
  const lock = payoutLock(ledger);
  const [confirmed, setConfirmed] = useState(false);
  const [paidOn, setPaidOn] = useState(today);
  // Tax withheld is what the report declared, and the licensor accepted: it can't change at
  // payment (review round 1, 4).
  const amount = toPayOf(r);
  const reference = paymentReference(s.signature, terms.licensor);
  const locked = lock.locked && !confirmed;
  // payTo is left empty: the payout it used is named by its signature, and the account itself
  // never goes into a message a lender may read (review round 1, 3).
  const paid = (method: string, ref: string) =>
    send(paidMessage(r, { method, reference: ref, paidOn, payout, detailsConfirmed: lock.locked }));

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-pay="">
      <Stack spacing={1.5}>
        <Typography variant="overline">{tr.t('app.roy.pay.title')}</Typography>
        <Typography variant="h4" component="p" sx={{ fontWeight: 700 }} data-pay-amount="">
          {formatMoney(amount, s.currency, tr.locale)}
        </Typography>
        {period && (
          <Typography variant="body2" color="text.secondary">
            {tr.t('app.roy.pay.due', { date: dateWords(period.paymentDue, tr) })}
          </Typography>
        )}
        {!payout ? (
          <Alert severity="info" variant="outlined">
            {tr.t('app.roy.payout.waiting', { who: names.licensor })}
          </Alert>
        ) : (
          <>
            {lock.locked && (
              <Alert severity="warning" variant="outlined" data-payout-changed="">
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {tr.t('app.roy.pay.changed', { who: names.licensor, date: when(lock.now.at, tr) })}
                </Typography>
                <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                  <Box>
                    <Typography variant="caption">{tr.t('app.roy.pay.before')}</Typography>
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', textDecoration: 'line-through' }}
                    >
                      {payoutText(lock.before, tr)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption">{tr.t('app.roy.pay.now')}</Typography>
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontWeight: 700 }}
                    >
                      {payoutText(lock.now, tr)}
                    </Typography>
                  </Box>
                </Box>
                <FormControlLabel
                  sx={{ alignItems: 'flex-start', mt: 1, ml: 0 }}
                  control={
                    <Checkbox
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      sx={{ pt: 0, pl: 0 }}
                    />
                  }
                  label={tr.t('app.roy.pay.confirmed', { who: names.licensor })}
                />
              </Alert>
            )}
            {!payToken && (
              <Stack spacing={1}>
                {payout.account && <CopyValue label={tr.t('app.roy.payout.holder')} value={payout.account} tr={tr} />}
                {payout.details && <CopyValue label={tr.t('app.roy.payout.bank')} value={payout.details} tr={tr} />}
                {payout.link && (
                  <Link href={payout.link} target="_blank" rel="noopener noreferrer" sx={{ fontWeight: 600 }}>
                    {tr.t('app.roy.payout.openLink', { who: names.licensor })}
                  </Link>
                )}
              </Stack>
            )}
            <CopyValue label={tr.t('app.roy.pay.reference')} value={reference} tr={tr} mono />
            {terms.bankFees && (
              <Typography variant="body2" color="text.secondary">
                {labelOr(tr, `app.roy.s.fees.${terms.bankFees}`, terms.bankFees)}
              </Typography>
            )}
          </>
        )}
        {s.taxWithheld && (
          <Typography variant="body2" color="text.secondary" data-pay-tax="">
            {tr.t('app.roy.tax.declared', {
              amount: formatMoney(s.taxWithheld, s.currency, tr.locale),
              net: formatMoney(amount, s.currency, tr.locale),
            })}
          </Typography>
        )}
        {payout &&
          payToken &&
          ONCHAIN_PAYMENTS &&
          (s.currency === payToken.code ? (
            <PayOnMidnight
              token={payToken}
              amount={amount}
              payTo={payout.account}
              busy={busy || locked}
              statementSig={s.signature}
              onPaid={(txId) => void paid(payout.method, txId)}
            />
          ) : (
            <Alert severity="info" variant="outlined">
              {tr.t('app.lic.ledger.l.currencyMismatch', { token: payToken.code, currency: s.currency })}
            </Alert>
          ))}
        {!payToken && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
            <TextField
              size="small"
              type="date"
              label={tr.t('app.lic.ledger.l.paidOn')}
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button
              variant="contained"
              size="large"
              disabled={busy || !paidOn || !payout || locked}
              onClick={() => void paid(payout?.method ?? 'other', reference)}
              data-i-paid=""
            >
              {tr.t('app.roy.pay.iPaid')}
            </Button>
          </Stack>
        )}
        {locked && (
          <Typography variant="body2" color="warning.main" data-pay-locked="">
            {tr.t('app.roy.pay.locked')}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          {tr.t('app.roy.pay.never')}
        </Typography>
      </Stack>
    </Paper>
  );
};

const payoutText = (p: Extract<DealEntry, { type: 'payout' }>, tr: Translator): string =>
  [tokenOfMethod(p.method) ? methodWords(p.method, tr) : '', p.account, p.details, p.link].filter(Boolean).join('\n');

// ---- where the licensor is paid ---------------------------------------------------------------

const PayoutBlock: React.FC<{
  ctx: Ctx;
  editing?: 'payout' | 'invoice';
  onEdit: (k: 'payout' | 'invoice' | undefined) => void;
  payoutKind: 'other' | 'midnight';
  setPayoutKind: (k: 'other' | 'midnight') => void;
}> = ({ ctx, editing, onEdit, payoutKind, setPayoutKind }) => {
  const { side, ledger, names, tr, busy, send, terms, cannabis } = ctx;
  const payout = ledger.payout;
  return (
    <Stack spacing={1} data-payout="">
      <Typography variant="subtitle2">{tr.t('app.roy.payout.title')}</Typography>
      {payout ? (
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {payoutText(payout, tr)}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {side === 'issuer' ? tr.t('app.roy.payout.none') : tr.t('app.roy.payout.waiting', { who: names.licensor })}
        </Typography>
      )}
      {side === 'licensee' && payout && (
        <Typography variant="body2" color="text.secondary">
          {tr.t('app.roy.payout.sets', { who: names.licensor })}
        </Typography>
      )}
      {ledger.invoice && (
        <Typography variant="body2" color="text.secondary">
          {tr.t('app.roy.inv.set', { name: ledger.invoice.legalName })}
        </Typography>
      )}
      {side === 'issuer' && !editing && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Button variant={payout ? 'outlined' : 'contained'} onClick={() => onEdit('payout')} data-set-payout="">
            {payout ? tr.t('app.roy.payout.change') : tr.t('app.roy.payout.add')}
          </Button>
          <Button variant="text" onClick={() => onEdit('invoice')}>
            {ledger.invoice ? tr.t('app.roy.inv.change') : tr.t('app.roy.inv.add')}
          </Button>
        </Stack>
      )}
      {editing === 'payout' && ONCHAIN_PAYMENTS && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ flexWrap: 'wrap' }}
          role="radiogroup"
          aria-label={tr.t('app.lic.ledger.howPaid')}
        >
          <Button
            size="small"
            variant={payoutKind === 'other' ? 'contained' : 'outlined'}
            onClick={() => setPayoutKind('other')}
          >
            {tr.t('app.roy.payout.bankOrLink')}
          </Button>
          <Button
            size="small"
            variant={payoutKind === 'midnight' ? 'contained' : 'outlined'}
            onClick={() => setPayoutKind('midnight')}
          >
            {tr.t('app.lic.ledger.onMidnight')}
          </Button>
        </Stack>
      )}
      {editing === 'payout' && (!ONCHAIN_PAYMENTS || payoutKind === 'other') && (
        <PayoutForm
          busy={busy}
          currency={currencyOf(terms)}
          allowLink={!cannabis}
          before={payout}
          tr={tr}
          onSend={(b) => void send(b)}
          onCancel={() => onEdit(undefined)}
        />
      )}
      {editing === 'payout' && ONCHAIN_PAYMENTS && payoutKind === 'midnight' && (
        <MidnightPayoutForm busy={busy} onSend={(b) => void send(b)} onCancel={() => onEdit(undefined)} />
      )}
      {editing === 'invoice' && (
        <InvoiceForm
          busy={busy}
          before={ledger.invoice}
          tr={tr}
          onSend={(b) => void send(b)}
          onCancel={() => onEdit(undefined)}
        />
      )}
      <Typography variant="caption" color="text.secondary" data-payout-privacy="">
        {tr.t('app.roy.payout.privacy')}
      </Typography>
    </Stack>
  );
};

const PayoutForm: React.FC<{
  busy: boolean;
  currency: string;
  allowLink: boolean;
  before?: Extract<DealEntry, { type: 'payout' }>;
  tr: Translator;
  onSend: (b: Parameters<typeof sayOnce>[1]) => void;
  onCancel: () => void;
}> = ({ busy, currency, allowLink, before, tr, onSend, onCancel }) => {
  const [holder, setHolder] = useState(before && !tokenOfMethod(before.method) ? before.account : '');
  const [details, setDetails] = useState(before?.details ?? '');
  const [link, setLink] = useState(allowLink ? (before?.link ?? '') : '');
  const linkOk = !link || /^https:\/\/\S+$/.test(link.trim());
  const ok = holder.trim() && (details.trim() || (allowLink && link.trim())) && linkOk;
  return (
    <Stack spacing={1.25}>
      <TextField
        size="small"
        label={tr.t('app.roy.payout.holder')}
        value={holder}
        onChange={(e) => setHolder(e.target.value.slice(0, 200))}
      />
      <TextField
        size="small"
        label={tr.t('app.roy.payout.bank')}
        helperText={tr.t('app.roy.payout.bankHelp')}
        value={details}
        onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
        multiline
        minRows={3}
      />
      {allowLink && (
        <TextField
          size="small"
          label={tr.t('app.roy.payout.link')}
          helperText={tr.t('app.roy.payout.linkHelp')}
          value={link}
          error={!linkOk}
          onChange={(e) => setLink(e.target.value.slice(0, 300))}
          slotProps={{ htmlInput: { inputMode: 'url' } }}
        />
      )}
      <Typography variant="caption" color="text.secondary">
        {tr.t('app.roy.payout.currency', { currency })}
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          disabled={busy || !ok}
          onClick={() =>
            onSend({
              type: 'payout',
              method: details.trim() ? 'bank' : 'link',
              account: holder.trim(),
              currency,
              ...(details.trim() ? { details: details.trim() } : {}),
              ...(allowLink && link.trim() ? { link: link.trim() } : {}),
            })
          }
        >
          {tr.t('app.lic.ledger.send')}
        </Button>
        <Button onClick={onCancel}>{tr.t('app.lic.ledger.cancel')}</Button>
      </Stack>
    </Stack>
  );
};

const InvoiceForm: React.FC<{
  busy: boolean;
  before?: Extract<DealEntry, { type: 'invoice-details' }>;
  tr: Translator;
  onSend: (b: Parameters<typeof sayOnce>[1]) => void;
  onCancel: () => void;
}> = ({ busy, before, tr, onSend, onCancel }) => {
  const [name, setName] = useState(before?.legalName ?? '');
  const [address, setAddress] = useState(before?.address ?? '');
  const [taxId, setTaxId] = useState(before?.taxId ?? '');
  return (
    <Stack spacing={1.25}>
      <Typography variant="body2" color="text.secondary">
        {tr.t('app.roy.inv.why')}
      </Typography>
      <TextField
        size="small"
        label={tr.t('app.roy.inv.name')}
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 200))}
      />
      <TextField
        size="small"
        label={tr.t('app.roy.inv.address')}
        value={address}
        onChange={(e) => setAddress(e.target.value.slice(0, 500))}
        multiline
      />
      <TextField
        size="small"
        label={tr.t('app.roy.inv.taxId')}
        value={taxId}
        onChange={(e) => setTaxId(e.target.value.slice(0, 80))}
      />
      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          disabled={busy || !name.trim()}
          onClick={() =>
            onSend({
              type: 'invoice-details',
              legalName: name.trim(),
              ...(address.trim() ? { address: address.trim() } : {}),
              ...(taxId.trim() ? { taxId: taxId.trim() } : {}),
            })
          }
        >
          {tr.t('app.lic.ledger.send')}
        </Button>
        <Button onClick={onCancel}>{tr.t('app.lic.ledger.cancel')}</Button>
      </Stack>
    </Stack>
  );
};

// ---- the timeline, the statement file, the reading help ---------------------------------------

const Timeline: React.FC<{ ctx: Ctx; entries: readonly DealEntry[] }> = ({ ctx, entries }) => {
  const { tr, names, ledger } = ctx;
  const [open, setOpen] = useState(false);
  const numberOf = (sig: string) => ledger.reports.find((r) => r.statement.signature === sig)?.number ?? '';
  // Only what the ledger counts: a second answer, a payment before an accepted answer or a
  // message from the wrong side is left out, as the checker leaves it out.
  const counted = new Set<string>([
    ...ledger.reports.flatMap((r) =>
      [r.statement, r.reply, r.paid, r.received].flatMap((x) => (x ? [x.signature] : [])),
    ),
    ...ledger.payouts.map((x) => x.signature),
    ...ledger.notices.map((x) => x.signature),
    ...(ledger.invoice ? [ledger.invoice.signature] : []),
  ]);
  const shown = entries.filter(
    (e) =>
      (e.type === 'terms' && e.from === 'issuer') ||
      (e.type === 'agree' && e.from === 'licensee') ||
      (e.type === 'invoice-details' && e.from === 'issuer') ||
      counted.has(e.signature),
  );
  const items = shown
    .flatMap((e) => {
      const who = e.mine ? tr.t('app.roy.who.you') : e.from === 'issuer' ? names.licensor : names.licensee;
      const k = (key: string, vars: Record<string, string | number> = {}) =>
        tr.t(`app.roy.tl.${key}` as AppKey, { who, ...vars });
      switch (e.type) {
        case 'terms':
          return [k('terms')];
        case 'agree':
          return [k('agree')];
        case 'payout':
          return [k('payout')];
        case 'invoice-details':
          return [k('invoice')];
        case 'statement':
          return [k('statement', { n: numberOf(e.signature), period: periodText(e.periodFrom, e.periodTo, tr) })];
        case 'reply':
          return [k(e.decision === 'accepted' ? 'accepted' : 'fix', { n: numberOf(e.statementSig) })];
        case 'paid':
          return [k('paid', { n: numberOf(e.statementSig), amount: formatMoney(e.amount, e.currency, tr.locale) })];
        case 'received':
          return [k('received', { n: numberOf(e.statementSig), amount: formatMoney(e.amount, e.currency, tr.locale) })];
        case 'notice':
          return [k(e.kind === 'breach' ? 'breach' : 'reminder', { period: periodText(e.periodFrom, e.periodTo, tr) })];
        default:
          return [];
      }
    })
    .map((text, i) => ({ text, i }));
  const dated = shown;
  return (
    <Box data-timeline="">
      <Button size="small" color="inherit" onClick={() => setOpen(!open)} aria-expanded={open} sx={{ px: 0 }}>
        {open ? tr.t('app.roy.tl.hide') : tr.t('app.roy.tl.show', { n: items.length })}
      </Button>
      <Collapse in={open}>
        <Stack component="ol" spacing={0.5} sx={{ pl: 2.5, m: 0, pt: 0.5 }}>
          {items.map(({ text, i }) => (
            <Typography component="li" variant="body2" key={i}>
              <Box component="span" sx={{ color: 'text.secondary' }}>
                {when(dated[i].at, tr)}
              </Box>{' '}
              {text}
            </Typography>
          ))}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          {tr.t('app.roy.tl.dated')}
        </Typography>
      </Collapse>
    </Box>
  );
};

/** A statement for an accepted report as a printable file; called an invoice only when the licensor set invoice details. */
const downloadStatement = (ctx: Ctx, r: Report) => {
  const { tr, terms, ledger, names } = ctx;
  const s = r.statement;
  const inv = ledger.invoice;
  // The details this payment was made to, when it names them; else the current ones.
  const payout = ledger.payouts.find((x) => x.signature === r.paid?.payoutSig) ?? ledger.payout;
  const money = (a: string) => formatMoney(a, s.currency, tr.locale);
  const lines = (s.lines ?? [{ kind: 'royalty' as const, quantity: s.quantity, amount: s.amountOwed }]).map(
    (l) => [lineWords(l, s.currency, tr, terms), money(l.amount)] as const,
  );
  const title = tr.t(inv ? 'app.roy.file.invoice' : 'app.roy.file.statement', { n: r.number });
  const html = statementHtml(
    {
      title,
      rows: [
        [tr.t('app.roy.file.number'), String(r.number)],
        [tr.t('app.roy.file.period'), periodText(s.periodFrom, s.periodTo, tr)],
        [
          tr.t('app.roy.file.from'),
          [inv?.legalName ?? names.licensor, inv?.address, inv?.taxId].filter(Boolean).join('\n'),
        ],
        [tr.t('app.roy.file.to'), names.licensee],
        ...(r.reply ? [[tr.t('app.roy.file.accepted'), when(r.reply.at, tr)] as const] : []),
        [tr.t('app.roy.pay.reference'), paymentReference(s.signature, terms.licensor)],
      ],
      lines: [
        ...lines,
        ...(s.taxWithheld || r.paid?.taxWithheld
          ? [[tr.t('app.roy.file.tax'), `− ${money(r.paid?.taxWithheld ?? s.taxWithheld!)}`] as const]
          : []),
      ],
      total: [tr.t('app.roy.file.toPay'), money(toPayOf(r))],
      payTo: payout ? [[tr.t('app.roy.file.payTo'), payoutText(payout, tr)]] : undefined,
      footer: [
        ...(r.received ? [tr.t('app.roy.file.receivedOn', { date: when(r.received.at, tr) })] : []),
        ...(inv ? [tr.t('app.roy.file.issuedBy', { who: inv.legalName })] : []),
        tr.t('app.roy.disclaimer'),
      ],
    },
    tr.lang,
  );
  saveFile(`${inv ? 'invoice' : 'statement'}-${r.number}-${s.periodFrom}.html`, html, 'text/html');
};

const HowToRead: React.FC<{ tr: Translator }> = ({ tr }) => {
  const [open, setOpen] = useState(false);
  return (
    <Box>
      <Button size="small" color="inherit" onClick={() => setOpen(!open)} aria-expanded={open} sx={{ px: 0 }}>
        {tr.t('app.roy.read.title')}
      </Button>
      <Collapse in={open}>
        <Stack spacing={0.75} sx={{ pt: 0.5 }}>
          {(['1', '2', '3', '4'] as const).map((n) => (
            <Typography key={n} variant="body2">
              {tr.t(`app.roy.read.${n}` as AppKey)}
            </Typography>
          ))}
        </Stack>
      </Collapse>
      {/* Apart from the reading help, with a rule above it: it stands whatever is open. */}
      <Divider sx={{ mt: 1.5, mb: 1.25 }} />
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} data-disclaimer="">
        {tr.t('app.roy.disclaimer')}
      </Typography>
    </Box>
  );
};

/** Receipts filed by payment partners for an accepted report, checked here, read every 30 seconds until confirmed. */
const useReceipts = (r: Report, payTo: string | undefined, keysChanged = 0): CheckedReceipt[] => {
  const [list, setList] = useState<CheckedReceipt[]>([]);
  const watch = r.reply?.decision === 'accepted';
  const done = !!r.received;
  const fp = r.statement.fingerprint;
  useEffect(() => {
    if (!watch) return;
    let live = true;
    const run = () =>
      receiptsFor(r.statement, payTo)
        .then((x) => live && setList(x))
        .catch(() => undefined);
    void run();
    const t = done ? undefined : setInterval(() => void run(), 30_000);
    return () => {
      live = false;
      if (t) clearInterval(t);
    };
  }, [fp, payTo, watch, done, r.statement, keysChanged]);
  return list;
};

/** The sales report behind a statement: shown, and for the licensor, checked against the file they were sent. */
const ReportCheck: React.FC<{
  statement: Extract<DealEntry, { type: 'statement' }>;
  side: DealSide;
  /** Before they answer it: the check is offered only while it can change the answer. */
  checking: boolean;
}> = ({ statement, side, checking }) => {
  const tr = useT();
  const [result, setResult] = useState<'same' | 'different'>();
  const e = statement.evidence;
  if (!isEvidence(e)) return null;
  return (
    <Box data-sales-report="">
      <Typography variant="body2">
        {rich(
          side === 'licensee' ? tr.t('app.lic.ledger.rc.backedL') : tr.t('app.lic.ledger.rc.backedI'),
          { b: (c) => <b>{c}</b> },
          { name: e.name, size: sizeText(e.size), code: <code>{e.sha256.slice(0, 12)}…</code> },
        )}
      </Typography>
      {side === 'issuer' && checking && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Button component="label" size="small" variant="outlined">
            {tr.t('app.lic.ledger.rc.check')}
            <input
              hidden
              type="file"
              onChange={(ev) => {
                const f = ev.target.files?.[0];
                ev.target.value = '';
                if (f) void isTheReport(f, e).then((ok) => setResult(ok ? 'same' : 'different'));
              }}
            />
          </Button>
          <Box role="status">
            {result === 'same' && (
              <Typography variant="body2" color="success.main">
                {tr.t('app.lic.ledger.rc.same')}
              </Typography>
            )}
            {result === 'different' && (
              <Typography variant="body2" color="error">
                {tr.t('app.lic.ledger.rc.different')}
              </Typography>
            )}
          </Box>
        </Stack>
      )}
    </Box>
  );
};
