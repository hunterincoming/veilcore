// Royalty payments made visible, and paid in a stablecoin on Cardano (docs/royalty-pay.md):
//   - PaymentAlerts: the in-app reminders on both sides (due soon, overdue), and on the
//     licensor's side the line saying what their record's public check page says;
//   - usePublicNotices: the licensor's page keeps that public notice in step with the deal;
//   - useRegistryView: the licensee's page reads what the registry has on file and files the
//     licensee's own answers there; RevokedForNonPayment: their side after a revocation;
//   - CardanoPayoutForm, PayOnCardano, useCardanoChecks, CardanoCheckLine: paying in USDCx or
//     USDM from the licensee's own wallet, and both pages checking it on Cardano.
// VeilCore never holds, routes, pauses or starts a payment: the wallet is the licensee's, the
// address the licensor's own signed one.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Collapse, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { Translator } from '../../i18n/translate';
import type { AppKey } from '../../i18n/app/en';
import { useT } from '../../i18n/app';
import { dateWords, utcDay } from '../../veilcore/royalty-terms';
import { formatMoney } from '../../veilcore/money';
import {
  CURE_DAYS,
  answerOf,
  ledgerOf,
  liveReports,
  noticeDayOf,
  paymentDueOf,
  revokedNoticeOf,
  toPayOf,
  type Ledger,
  type PaymentAlert,
  type PayoutEntry,
  type Report,
} from '../../veilcore/royalty-ledger';
import {
  cardanoAddressProblem,
  cardanoAmountText,
  cardanoMethod,
  cardanoNetworkOf,
  cardanoOffer,
  cardanoTokenOf,
  cardanoUnits,
  checkCardanoPayment,
  payRef,
  tokensFor,
  type CardanoCheck,
  type CardanoToken,
} from '../../veilcore/cardano-pay';
import { findCardanoWallets, payOnCardano, type Cip30Entry } from '../../veilcore/cardano-tx';
import { OFAC_CARDANO, screenAddresses } from '../../veilcore/sanctions';
import { forgetSent, keepSent, sentFor } from '../../veilcore/onchain-pay';
import {
  cureEndsOn,
  dealNotices,
  fileAnswer,
  noticeRef,
  registerStatement,
  reportRef,
  statementNotices,
  syncNotices,
  type BreachHeld,
  type LicenseeAnswer,
  type NoticeOutcome,
  type PublishedNotice,
  type RegistryView,
} from '../../veilcore/license-notices';
import type { DealBody } from '../../veilcore/deal';
import type { LicenseTerms } from '../../veilcore/licenses';
import { STABLECOIN_PAY } from '../../config/copy';
import { NETWORK } from '../../config/network';
import { sayOnce, type DealEntry, type DealParty } from '../../veilcore/deal-client';

const short = (s: string) => (s.length > 24 ? `${s.slice(0, 14)}…${s.slice(-6)}` : s);

// ---- reminders, overdue, notice of breach, the licensee's answer ------------------------------

type PublicState = {
  outcome: NoticeOutcome | 'idle';
  /** The record's lines for this deal as the registry has them now, by reference. */
  lines: ReadonlyMap<string, PublishedNotice>;
  /** Notices of breach the registry wouldn't file yet, by reference (the plain overdue line stands). */
  held?: ReadonlyMap<string, BreachHeld>;
};

/** The licensee's answers as the public page shows them beside a line: "says it was paid (date)", "disputes this (since date)". */
const answerWords = (answers: readonly LicenseeAnswer[] | undefined, tr: Translator): string =>
  (answers ?? [])
    .map((x) =>
      tr.t(x.type === 'paid' ? 'app.rpay.pub.answerPaid' : 'app.rpay.pub.disputed', { date: dateWords(x.on, tr) }),
    )
    .join(' ');

/**
 * Due soon and overdue, at the top of the royalties on both sides. On an overdue payment, both
 * sides see where it stands: no notice of breach yet; a notice, and the last day to pay (the cure
 * period, royalty-ledger.ts CURE_DAYS, counted from the registry's date for it); or the cure period
 * over by the registry's clock. The licensee answers here: "I paid" (the report's own pay form),
 * or a short dispute note, signed. Either one is also filed at the registry in their own name
 * (useRegistryView), where the public page shows it beside the licensor's line.
 */
export const PaymentAlerts: React.FC<{
  side: 'issuer' | 'licensee';
  alerts: readonly PaymentAlert[];
  licensee: string;
  licensor: string;
  tr: Translator;
  busy: boolean;
  /** Sends a signed message on the deal (RoyaltyLedger send). */
  send: (b: DealBody) => Promise<boolean>;
  /** The licensor's side: what the record's public check page says now, and whether it could. */
  publicState?: PublicState;
  /** The licensee's side: what the registry has on file in their name. */
  view?: RegistryView;
}> = ({ side, alerts, licensee, licensor, tr, busy, send, publicState, view }) => {
  if (alerts.length === 0) return null;
  return (
    <Stack spacing={1} data-payment-alerts="">
      {alerts.map((a) => (
        <OneAlert
          key={a.report.statement.signature}
          a={a}
          side={side}
          licensee={licensee}
          licensor={licensor}
          tr={tr}
          busy={busy}
          send={send}
          publicState={publicState}
          view={view}
        />
      ))}
    </Stack>
  );
};

const OneAlert: React.FC<{
  a: PaymentAlert;
  side: 'issuer' | 'licensee';
  licensee: string;
  licensor: string;
  tr: Translator;
  busy: boolean;
  send: (b: DealBody) => Promise<boolean>;
  publicState?: PublicState;
  view?: RegistryView;
}> = ({ a, side, licensee, licensor, tr, busy, send, publicState, view }) => {
  const [disputing, setDisputing] = useState(false);
  const [note, setNote] = useState('');
  const n = a.report.number;
  const late = a.kind === 'overdue';
  const date = dateWords(late ? a.since! : a.due, tr);
  const ref = reportRef(a.report);
  const s = a.report.statement;
  const answerDay = a.answer ? dateWords(noticeDayOf(a.answer), tr) : '';
  // The dispute as filed at the registry in the licensee's name: the first one stands there.
  const filed = (view?.answers.get(ref) ?? a.registry?.answers ?? []).find((x) => x.type === 'disputed');
  const line = publicState?.lines.get(ref);
  const held = publicState?.held?.get(ref);
  return (
    <Alert
      severity={late ? 'error' : 'info'}
      variant="outlined"
      data-payment-alert={a.kind}
      {...(late ? { 'data-cure': a.revocable ? 'over' : a.breach ? 'running' : 'no-notice' } : {})}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {side === 'licensee'
          ? tr.t(late ? 'app.rpay.l.overdue' : 'app.rpay.l.soon', { n, date })
          : tr.t(late ? 'app.rpay.i.overdue' : 'app.rpay.i.soon', { n, date, licensee })}
      </Typography>
      {late && a.breach && (
        <Typography variant="body2" data-cure-by={a.breach.cureBy}>
          {side === 'licensee'
            ? tr.t(a.revocable ? 'app.rpay.l.cureOver' : 'app.rpay.l.breach', {
                licensor,
                date: dateWords(a.breach.from, tr),
                cureBy: dateWords(a.breach.cureBy, tr),
              })
            : tr.t(a.revocable ? 'app.rpay.i.cureOver' : 'app.rpay.i.breach', {
                licensee,
                date: dateWords(a.breach.from, tr),
                cureBy: dateWords(a.breach.cureBy, tr),
              })}
        </Typography>
      )}
      {late && !a.breach && (
        <Typography variant="body2" data-consequence="">
          {side === 'licensee'
            ? tr.t('app.rpay.l.consequence', { licensor, days: CURE_DAYS })
            : tr.t('app.rpay.i.noNotice', { licensee, days: CURE_DAYS })}
        </Typography>
      )}
      {!late && side === 'licensee' && (
        <Typography variant="body2" data-consequence="">
          {tr.t('app.rpay.l.consequence', { licensor, days: CURE_DAYS })}
        </Typography>
      )}
      {late && a.answer && (
        <Typography variant="body2" data-answer={filed ? 'filed' : 'not-filed'} sx={{ mt: 0.5 }}>
          {side === 'licensee'
            ? filed
              ? tr.t('app.rpay.l.answered', {
                  date: answerDay,
                  note: a.answer.note ?? '',
                  licensor,
                  filed: dateWords(filed.on, tr),
                })
              : view?.predates
                ? tr.t('app.rpay.l.answerPredates', { date: answerDay, note: a.answer.note ?? '', licensor })
                : tr.t('app.rpay.l.answerPending', { date: answerDay, note: a.answer.note ?? '', licensor })
            : tr.t('app.rpay.i.answered', { licensee, date: answerDay, note: a.answer.note ?? '' })}
        </Typography>
      )}
      {side === 'issuer' && late && publicState && publicState.outcome !== 'idle' && (
        <Typography
          variant="body2"
          sx={{ mt: 0.5 }}
          data-public-notice={line ? 'shown' : publicState.outcome}
          {...(line?.breachNoticeOn ? { 'data-public-breach': line.breachNoticeOn } : {})}
        >
          {line
            ? [
                line.breachNoticeOn
                  ? tr.t('app.rpay.i.publicBreach', { date, breach: dateWords(line.breachNoticeOn, tr) })
                  : tr.t('app.rpay.i.public', { date }),
                line.answers?.length
                  ? tr.t('app.rpay.i.publicAnswers', { answers: answerWords(line.answers, tr) })
                  : '',
              ]
                .filter(Boolean)
                .join(' ')
            : publicState.outcome === 'predates'
              ? tr.t('app.rpay.predates')
              : publicState.outcome === 'unsupported'
                ? tr.t('app.rpay.i.publicUnsupported')
                : publicState.outcome === 'no-record'
                  ? tr.t('app.rpay.i.publicNoRecord')
                  : tr.t('app.rpay.i.publicFailed')}
        </Typography>
      )}
      {side === 'issuer' && late && a.breach && held && (
        <Typography variant="body2" sx={{ mt: 0.5 }} data-breach-held={held.code}>
          {held.code === 'not-due'
            ? tr.t('app.rpay.i.breachNotDue', { licensee, due: dateWords(held.dueOn, tr) })
            : tr.t('app.rpay.i.breachNotRegistered', { licensee })}
        </Typography>
      )}
      {/* The licensee's answer: they paid (the report's own form), or a short dispute note. */}
      {side === 'licensee' && late && (
        <Box sx={{ mt: 1 }} data-respond="">
          {!disputing ? (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                data-respond-paid=""
                onClick={() => document.getElementById(`report-${n}`)?.scrollIntoView({ behavior: 'smooth' })}
              >
                {tr.t('app.rpay.l.iPaid')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                data-respond-dispute=""
                disabled={busy}
                onClick={() => setDisputing(true)}
              >
                {a.answer ? tr.t('app.rpay.l.disputeAgain') : tr.t('app.rpay.l.dispute')}
              </Button>
            </Stack>
          ) : (
            <DisputeForm
              tr={tr}
              licensor={licensor}
              busy={busy}
              note={note}
              setNote={setNote}
              onCancel={() => setDisputing(false)}
              onSend={() =>
                void send({
                  type: 'notice',
                  kind: 'answer',
                  about: 'payment',
                  periodFrom: s.periodFrom,
                  periodTo: s.periodTo,
                  statementSig: s.signature,
                  dueOn: a.due,
                  asOf: utcDay(),
                  note: note.trim(),
                }).then((ok) => ok && (setDisputing(false), setNote('')))
              }
            />
          )}
        </Box>
      )}
    </Alert>
  );
};

/** The licensee's short dispute note, signed and sent on the deal; what it means, before it goes. */
const DisputeForm: React.FC<{
  tr: Translator;
  licensor: string;
  busy: boolean;
  note: string;
  setNote: (s: string) => void;
  onSend: () => void;
  onCancel: () => void;
}> = ({ tr, licensor, busy, note, setNote, onSend, onCancel }) => (
  <Stack spacing={1}>
    <TextField
      size="small"
      multiline
      label={tr.t('app.rpay.l.disputeNote')}
      helperText={tr.t('app.rpay.l.disputeShows', { licensor })}
      value={note}
      onChange={(e) => setNote(e.target.value.slice(0, 500))}
      data-dispute-note=""
    />
    <Stack direction="row" spacing={1}>
      <Button size="small" variant="contained" disabled={busy || !note.trim()} data-dispute-send="" onClick={onSend}>
        {tr.t('app.rpay.l.disputeSend')}
      </Button>
      <Button size="small" color="inherit" onClick={onCancel}>
        {tr.t('app.lic.ledger.cancel')}
      </Button>
    </Stack>
  </Stack>
);

/**
 * The licensor's page keeps their record's public lines for this deal in step with its messages
 * (license-notices.ts dealNotices): a line per report overdue now, with the registry's date for
 * their notice of breach, none for the rest. Once when the page opens and whenever what is overdue
 * changes. What the registry has on file afterwards goes to `onView`, for the alerts (the cure
 * period by the registry's clock).
 */
export const usePublicNotices = (
  recordId: string | undefined,
  alerts: readonly PaymentAlert[],
  ledger: Ledger,
  /** The licensor's deal secret: every line is signed with it. */
  signer: string,
  onView: (v: RegistryView) => void,
): PublicState => {
  const { want, mine } = useMemo(() => dealNotices(ledger, alerts, false), [ledger, alerts]);
  const key =
    [...want].map(([r, n]) => `${r}:${n.kind}:${n.kind === 'revoked' ? n.on : n.since}`).join(',') +
    `|${[...mine].sort().join(',')}`;
  const [state, setState] = useState<PublicState>({ outcome: 'idle', lines: new Map() });
  useEffect(() => {
    if (!recordId || (want.size === 0 && mine.size === 0)) return;
    let live = true;
    void syncNotices(recordId, want, mine, signer).then((r) => {
      if (!live) return;
      setState({ outcome: r.outcome, lines: new Map(r.shown.map((n) => [n.ref, n])), held: r.held });
      if (r.view) onView(r.view);
    });
    return () => {
      live = false;
    };
    // `key` stands for want and mine: the same lines are not sent again on every render.
  }, [recordId, key]);
  return state;
};

/**
 * The licensee's side: what the registry has on file about every message in their deal (the
 * licensor's lines and its date for a notice of breach, their own registrations and answers), and
 * what they file there in their own name, signed with their deal key:
 *   - each of their reports, registered as theirs with its payment's due date from the signed
 *     terms (license-notices.ts registerStatement), so the licensor can file a notice of breach
 *     about it only from the day after that date (review round 3, B2);
 *   - "paid" for every report they marked paid, "disputed" for every one they disputed.
 * Anything that didn't land is tried again whenever the deal's messages change or the page
 * opens. The licensor can't remove or change what is filed. A deal from before the registry kept
 * the deal keys (`predates`) files nothing, and the page says why.
 */
export const useRegistryView = (
  party: { readonly mySecret: string } | undefined,
  ledger: Ledger,
  opts: {
    /** The signed terms: the due dates registered with each report. Without them nothing is registered. */
    readonly terms?: LicenseTerms;
    /** Every message's fingerprint in the deal, so a line about any of them shows here. */
    readonly fingerprints?: readonly string[];
  } = {},
): readonly [RegistryView | undefined, (v: RegistryView) => void, () => void] => {
  const [view, setView] = useState<RegistryView>();
  /** Read again (after something was filed from outside this hook). */
  const [again, setAgain] = useState(0);
  const reports = useMemo(() => (party ? liveReports(ledger) : []), [party, ledger]);
  const due = useMemo(
    () => new Map(opts.terms ? reports.map((r) => [r.statement.fingerprint, paymentDueOf(opts.terms!, r)]) : []),
    [opts.terms, reports],
  );
  const fps = useMemo(
    () => [...new Set([...(opts.fingerprints ?? []), ...ledger.reports.map((r) => r.statement.fingerprint)])].sort(),
    [opts.fingerprints, ledger],
  );
  const key =
    `${again}|` +
    fps.join(',') +
    '|' +
    reports
      .map(
        (r) =>
          `${r.statement.fingerprint}:${due.get(r.statement.fingerprint) ?? ''}:${r.paid ? 'p' : ''}${answerOf(r) ? 'd' : ''}`,
      )
      .join(',');
  useEffect(() => {
    if (!party || fps.length === 0) return;
    let live = true;
    void (async () => {
      let v = await statementNotices(fps);
      let filedNow = false;
      if (v && !v.predates) {
        for (const r of reports) {
          const ref = reportRef(r);
          const dueOn = due.get(r.statement.fingerprint);
          if (dueOn && !v.registered?.has(ref)) {
            filedNow =
              typeof (await registerStatement(party.mySecret, r.statement.fingerprint, dueOn)) === 'object' || filedNow;
          }
          const has = (t: 'paid' | 'disputed') => !!v?.answers.get(ref)?.some((x) => x.type === t);
          if (r.paid && r.paid.from === 'licensee' && !has('paid')) {
            filedNow =
              !!(await fileAnswer(party.mySecret, r.statement.fingerprint, 'paid', r.paid.reference)) || filedNow;
          }
          if (answerOf(r) && !has('disputed')) {
            filedNow = !!(await fileAnswer(party.mySecret, r.statement.fingerprint, 'disputed')) || filedNow;
          }
        }
      }
      if (filedNow) v = (await statementNotices(fps)) ?? v;
      if (live && v) setView(v);
    })();
    return () => {
      live = false;
    };
    // `key` stands for the messages, the reports and what the licensee said about each.
  }, [party?.mySecret, key]);
  return [view, setView, () => setAgain((n) => n + 1)] as const;
};

/**
 * The licensee's side: every line the licensor's record's public check page carries about this
 * deal, whatever this page's own reckoning says (review round 3, B2): what it says, the day the
 * licensor told VeilCore's registry they sent a notice of breach, and the licensee's answers beside
 * it. "I paid" or "Dispute" for each, unless the overdue alert above already offers them.
 */
export const LicenseePublicLines: React.FC<{
  view: RegistryView | undefined;
  ledger: Ledger;
  alerts: readonly PaymentAlert[];
  licensor: string;
  mySecret: string;
  /** Every message's fingerprint in the deal (what the lines are about). */
  fingerprints: readonly string[];
  tr: Translator;
  busy: boolean;
  send: (b: DealBody) => Promise<boolean>;
  onFiled: () => void;
}> = ({ view, ledger, alerts, licensor, mySecret, fingerprints, tr, busy, send, onFiled }) => {
  if (!view || view.lines.size === 0) return null;
  const byRef = new Map(ledger.reports.map((r) => [reportRef(r), r]));
  const fpOf = new Map(fingerprints.map((fp) => [noticeRef(fp), fp]));
  const inAlert = new Set(alerts.filter((a) => a.kind === 'overdue').map((a) => reportRef(a.report)));
  return (
    <Stack spacing={1} data-licensee-public="">
      {[...view.lines.values()].map((line) => (
        <OnePublicLine
          key={line.ref}
          line={line}
          report={byRef.get(line.ref)}
          answers={view.answers.get(line.ref) ?? line.answers ?? []}
          offer={!inAlert.has(line.ref)}
          licensor={licensor}
          mySecret={mySecret}
          tr={tr}
          busy={busy}
          send={send}
          onFiled={onFiled}
          fingerprint={fpOf.get(line.ref)}
        />
      ))}
    </Stack>
  );
};

const OnePublicLine: React.FC<{
  line: PublishedNotice;
  report: Report | undefined;
  answers: readonly LicenseeAnswer[];
  offer: boolean;
  licensor: string;
  mySecret: string;
  tr: Translator;
  busy: boolean;
  send: (b: DealBody) => Promise<boolean>;
  onFiled: () => void;
  /** The message the line is about, when it is not one of the reports. */
  fingerprint: string | undefined;
}> = ({ line, report, answers, offer, licensor, mySecret, tr, busy, send, onFiled, fingerprint }) => {
  const [disputing, setDisputing] = useState(false);
  const [note, setNote] = useState('');
  const [failed, setFailed] = useState(false);
  const disputed = answers.some((x) => x.type === 'disputed');
  const canPay = !!report && report.reply?.decision === 'accepted' && !report.paid;
  const what =
    line.kind === 'revoked'
      ? tr.t('app.rpay.l.pubRevoked', { licensor, date: dateWords(line.on, tr) })
      : report
        ? tr.t('app.rpay.l.pubOverdue', { licensor, n: report.number, date: dateWords(line.since, tr) })
        : tr.t('app.rpay.l.pubOverdueOther', { licensor, date: dateWords(line.since, tr) });
  return (
    <Alert severity="warning" variant="outlined" data-licensee-line={line.kind} data-line-ref={line.ref}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {what}
      </Typography>
      {line.breachNoticeOn && (
        <Typography variant="body2" data-line-breach={line.breachNoticeOn}>
          {tr.t('app.rpay.l.pubBreach', {
            licensor,
            date: dateWords(line.breachNoticeOn, tr),
            cureBy: dateWords(cureEndsOn(line.breachNoticeOn), tr),
          })}
        </Typography>
      )}
      {answers.length > 0 && (
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {tr.t('app.rpay.l.pubAnswers', { answers: answerWords(answers, tr) })}
        </Typography>
      )}
      {failed && (
        <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
          {tr.t('app.rpay.l.pubDisputeFailed')}
        </Typography>
      )}
      {offer && (
        <Box sx={{ mt: 1 }} data-respond="">
          {!disputing ? (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {canPay && (
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  data-respond-paid=""
                  onClick={() =>
                    document.getElementById(`report-${report.number}`)?.scrollIntoView({ behavior: 'smooth' })
                  }
                >
                  {tr.t('app.rpay.l.iPaid')}
                </Button>
              )}
              {!disputed && (report || fingerprint) && (
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  data-respond-dispute=""
                  disabled={busy}
                  onClick={() => setDisputing(true)}
                >
                  {tr.t('app.rpay.l.dispute')}
                </Button>
              )}
            </Stack>
          ) : (
            <DisputeForm
              tr={tr}
              licensor={licensor}
              busy={busy}
              note={note}
              setNote={setNote}
              onCancel={() => setDisputing(false)}
              onSend={() => {
                setFailed(false);
                const done = (ok: boolean) => {
                  if (!ok) return setFailed(true);
                  setDisputing(false);
                  setNote('');
                  onFiled();
                };
                if (report) {
                  // Signed on the deal; the page files it at the registry in the licensee's name.
                  const s = report.statement;
                  void send({
                    type: 'notice',
                    kind: 'answer',
                    about: 'payment',
                    periodFrom: s.periodFrom,
                    periodTo: s.periodTo,
                    statementSig: s.signature,
                    asOf: utcDay(),
                    note: note.trim(),
                  }).then(done);
                } else if (fingerprint) {
                  // A line about a message that isn't a report: filed at the registry only.
                  void fileAnswer(mySecret, fingerprint, 'disputed').then((on) => done(!!on));
                }
              }}
            />
          )}
        </Box>
      )}
    </Alert>
  );
};

/**
 * The licensee's side once the license is gone and the deal holds the licensor's signed notice
 * that it was revoked for non-payment: what it says, whether the licensor's record's public check
 * page says so (the registry decides that, by its own clock), and the licensee's answer, which
 * they can still give: a dispute, signed on the deal and filed at the registry in their own name.
 */
export const RevokedForNonPayment: React.FC<{
  party: { readonly mySecret: string };
  ledger: Ledger;
  licensor: string;
  send: (b: DealBody) => Promise<boolean>;
  busy: boolean;
}> = ({ party, ledger, licensor, send, busy }) => {
  const tr = useT();
  const [view] = useRegistryView(party, ledger);
  const [disputing, setDisputing] = useState(false);
  const [note, setNote] = useState('');
  const revoked = revokedNoticeOf(ledger);
  const report = revoked ? ledger.reports.find((r) => r.statement.signature === revoked.statementSig) : undefined;
  if (!revoked || !report) return null;
  const ref = reportRef(report);
  const line = view?.lines.get(ref);
  const answers = view?.answers.get(ref) ?? line?.answers ?? [];
  const disputed = answers.find((x) => x.type === 'disputed');
  const mine = answerOf(report);
  const s = report.statement;
  return (
    <Alert severity="error" variant="outlined" data-revoked-for-non-payment="">
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {tr.t('app.rpay.l.revoked', { licensor, n: report.number, date: dateWords(noticeDayOf(revoked), tr) })}
      </Typography>
      {revoked.note && (
        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
          “{revoked.note}”
        </Typography>
      )}
      <Typography
        variant="body2"
        sx={{ mt: 0.5 }}
        data-revoked-public={line?.kind === 'revoked' ? 'shown' : 'not-shown'}
      >
        {line?.kind === 'revoked'
          ? tr.t('app.rpay.l.revokedPublic', { licensor, date: dateWords(line.on, tr) })
          : view?.predates
            ? tr.t('app.rpay.predates')
            : tr.t('app.rpay.l.revokedNotPublic', { licensor })}
      </Typography>
      {disputed ? (
        <Typography variant="body2" sx={{ mt: 0.5 }} data-answer="filed">
          {tr.t('app.rpay.l.revokedDisputed', { date: dateWords(disputed.on, tr), licensor })}
        </Typography>
      ) : mine ? (
        <Typography variant="body2" sx={{ mt: 0.5 }} data-answer="not-filed">
          {tr.t(view?.predates ? 'app.rpay.l.answerPredates' : 'app.rpay.l.answerPending', {
            date: dateWords(noticeDayOf(mine), tr),
            note: mine.note ?? '',
            licensor,
          })}
        </Typography>
      ) : (
        <Box sx={{ mt: 1 }} data-respond="">
          {!disputing ? (
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              data-respond-dispute=""
              disabled={busy}
              onClick={() => setDisputing(true)}
            >
              {tr.t('app.rpay.l.dispute')}
            </Button>
          ) : (
            <DisputeForm
              tr={tr}
              licensor={licensor}
              busy={busy}
              note={note}
              setNote={setNote}
              onCancel={() => setDisputing(false)}
              onSend={() =>
                void send({
                  type: 'notice',
                  kind: 'answer',
                  about: 'payment',
                  periodFrom: s.periodFrom,
                  periodTo: s.periodTo,
                  statementSig: s.signature,
                  asOf: utcDay(),
                  note: note.trim(),
                }).then((ok) => ok && (setDisputing(false), setNote('')))
              }
            />
          )}
        </Box>
      )}
    </Alert>
  );
};

/** RevokedForNonPayment for a page that holds the deal's messages and its party (the licensee's license page). */
export const LicenseeAfterRevoke: React.FC<{
  party: DealParty;
  entries: readonly DealEntry[];
  refresh: () => void;
  licensor: string;
}> = ({ party, entries, refresh, licensor }) => {
  const ledger = useMemo(() => ledgerOf(entries), [entries]);
  const [busy, setBusy] = useState(false);
  const send = async (b: DealBody) => {
    setBusy(true);
    try {
      await sayOnce(party, b);
      refresh();
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  };
  return <RevokedForNonPayment party={party} ledger={ledger} licensor={licensor} send={send} busy={busy} />;
};

// ---- the licensor's payout on Cardano ------------------------------------------------------------

/** "on Cardano, in USDCx (1 USDCx = 1 USD)", or undefined for a method that isn't one. */
export const cardanoMethodWords = (method: string, tr: Translator): string | undefined => {
  const t = cardanoTokenOf(method);
  return t ? tr.t('app.rpay.method', { code: t.code }) : undefined;
};

/** The licensor's payout in a stablecoin on Cardano: their address, checked, and what it means. */
export const CardanoPayoutForm: React.FC<{
  busy: boolean;
  onSend: (b: { type: 'payout'; method: string; account: string; currency: string; rate: string }) => void;
  onCancel: () => void;
}> = ({ busy, onSend, onCancel }) => {
  const tr = useT();
  const tokens = tokensFor();
  const [code, setCode] = useState(tokens[0]?.code ?? '');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string>();
  const wallets = findCardanoWallets();
  const token = tokens.find((t) => t.code === code);
  const net = cardanoNetworkOf();
  const problem = address.trim() ? cardanoAddressProblem(address, NETWORK, tr) : undefined;
  const listed = address.trim() && !problem ? !screenAddresses([address]).clear : false;
  const fromWallet = async (w: Cip30Entry) => {
    setError(undefined);
    try {
      const api = await w.enable();
      const hex = await api.getChangeAddress();
      const { bech32Of } = await import('../../veilcore/cardano-tx');
      const C = await import('@emurgo/cardano-serialization-lib-browser');
      setAddress(bech32Of(C, hex));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  if (!token) return null;
  return (
    <Stack spacing={1.25} data-cardano-payout="">
      <Alert severity="info" variant="outlined">
        {tr.t('app.rpay.payout.info', { code: token.code })}
      </Alert>
      {tokens.length > 1 && (
        <TextField
          select
          size="small"
          label={tr.t('app.rpay.payout.token')}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        >
          {tokens.map((t) => (
            <MenuItem key={t.code} value={t.code}>
              {t.code}
            </MenuItem>
          ))}
        </TextField>
      )}
      <TextField
        size="small"
        label={tr.t('app.rpay.payout.address', { prefix: net === 'mainnet' ? 'addr1' : 'addr_test1' })}
        value={address}
        onChange={(e) => setAddress(e.target.value.trim().slice(0, 200))}
        error={!!problem || listed}
        helperText={problem ?? (listed ? tr.t('app.rpay.payout.sanctioned') : undefined)}
        slotProps={{ htmlInput: { 'data-cardano-address': '' } }}
      />
      {wallets.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          {wallets.map((w) => (
            <Button key={w.id} size="small" variant="outlined" onClick={() => void fromWallet(w)}>
              {tr.t('app.rpay.payout.useMine', { name: w.name })}
            </Button>
          ))}
        </Stack>
      )}
      {error && (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      )}
      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          disabled={busy || !address || !!problem || listed}
          onClick={() =>
            onSend({
              type: 'payout',
              method: cardanoMethod(token.code),
              account: address.trim(),
              currency: token.pays,
              rate: '1',
            })
          }
          data-send-cardano-payout=""
        >
          {tr.t('app.lic.ledger.send')}
        </Button>
        <Button onClick={onCancel}>{tr.t('app.lic.ledger.cancel')}</Button>
      </Stack>
    </Stack>
  );
};

// ---- the licensee pays -------------------------------------------------------------------------

/**
 * The licensee's "Pay with my wallet" in a stablecoin, or why it isn't offered. `paid` records
 * the transaction in the signed "I paid" message.
 */
export const PayOnCardano: React.FC<{
  report: Report;
  payout: PayoutEntry;
  licensor: string;
  busy: boolean;
  paid: (method: string, reference: string) => void;
}> = ({ report: r, payout, licensor, busy, paid }) => {
  const tr = useT();
  const s = r.statement;
  const named = cardanoTokenOf(payout.method);
  const offer = cardanoOffer(s.currency, payout);
  const wallets = findCardanoWallets();
  const [sent, setSent] = useState(() => sentFor(s.signature));
  const [pick, setPick] = useState(wallets[0]?.id ?? '');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string>();
  const [how, setHow] = useState(false);
  // What the report leaves to pay: what it owes less the tax it declared (SPEC 11.10, "Settled").
  const amount = toPayOf(r, s.taxWithheld ?? '0');
  const code = named?.code ?? payout.method.replace(/^cardano:/, '');
  if (!STABLECOIN_PAY)
    return (
      <Alert severity="info" variant="outlined" data-pay-on-cardano="off">
        {tr.t('app.rpay.pay.off', { licensor, code })}
      </Alert>
    );
  if (!offer.token)
    return (
      <Alert severity="info" variant="outlined" data-pay-on-cardano="not-offered">
        {offer.why === 'currency'
          ? tr.t('app.rpay.pay.notUsd', { currency: s.currency })
          : offer.why === 'rate'
            ? tr.t('app.rpay.pay.notPar', { licensor, code })
            : (cardanoAddressProblem(payout.account, NETWORK, tr) ?? tr.t('app.rpay.pay.off', { licensor, code }))}
      </Alert>
    );
  const token = offer.token;
  // Already paid from this browser, not recorded yet: record it, never pay twice.
  if (sent)
    return (
      <Alert severity="warning" variant="outlined" data-pay-on-cardano="sent">
        <Typography variant="body2" sx={{ mb: 1 }}>
          {tr.t('app.rpay.pay.sent', { tx: short(sent), licensor })}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Button color="inherit" variant="outlined" disabled={busy} onClick={() => paid(payout.method, sent)}>
            {tr.t('app.lic.pay.recordIt')}
          </Button>
          <Button
            color="inherit"
            disabled={busy}
            onClick={() => {
              forgetSent(s.signature);
              setSent(undefined);
            }}
          >
            {tr.t('app.rpay.pay.forget')}
          </Button>
        </Stack>
      </Alert>
    );
  const ref = payRef(s.signature, payout.account);
  const wallet = wallets.find((w) => w.id === pick) ?? wallets[0];
  const pay = async () => {
    if (!wallet) return;
    setPaying(true);
    setError(undefined);
    try {
      const units = cardanoUnits(amount, token, tr);
      const hash = await payOnCardano(
        wallet,
        { token, units, recipient: payout.account, ref },
        { tr, onSigned: (h) => keepSent(s.signature, h) },
      );
      setSent(hash);
      paid(payout.method, hash);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      // A transfer signed but not sent is kept too: the page offers to record it, never to pay again.
      setSent(sentFor(s.signature));
    } finally {
      setPaying(false);
    }
  };
  return (
    <Stack spacing={1.25} data-pay-on-cardano="">
      <Typography variant="subtitle2">{tr.t('app.rpay.pay.title')}</Typography>
      {!wallet ? (
        <Alert severity="info" variant="outlined" data-pay-on-cardano="no-wallet">
          {tr.t('app.rpay.pay.noWallet')}
        </Alert>
      ) : (
        <>
          {wallets.length > 1 && (
            <TextField
              select
              size="small"
              label={tr.t('app.rpay.pay.wallet')}
              value={wallet.id}
              onChange={(e) => setPick(e.target.value)}
            >
              {wallets.map((w) => (
                <MenuItem key={w.id} value={w.id}>
                  {w.name}
                </MenuItem>
              ))}
            </TextField>
          )}
          <Button
            variant="contained"
            size="large"
            disabled={busy || paying}
            onClick={() => void pay()}
            data-pay-cardano=""
            sx={{ alignSelf: 'flex-start' }}
          >
            {paying
              ? tr.t('app.rpay.pay.waiting')
              : tr.t('app.rpay.pay.button', { amount, code: token.code, name: wallet.name })}
          </Button>
        </>
      )}
      <Typography variant="caption" color="text.secondary">
        {tr.t('app.rpay.pay.shows', { amount, code: token.code, to: short(payout.account), ref })}
      </Typography>
      <Typography variant="caption" color="text.secondary" data-screened="">
        {tr.t('app.rpay.pay.screened', { date: OFAC_CARDANO.listIssued ?? OFAC_CARDANO.extracted })}
      </Typography>
      <Box>
        <Button size="small" color="inherit" onClick={() => setHow(!how)} aria-expanded={how} sx={{ px: 0 }}>
          {tr.t('app.rpay.pay.howTitle')}
        </Button>
        <Collapse in={how}>
          <Typography variant="body2" color="text.secondary">
            {tr.t('app.rpay.pay.how', { licensor, amount: `${amount} ${token.code}` })}
          </Typography>
        </Collapse>
      </Box>
      {error && (
        <Alert severity="error" variant="outlined" data-pay-cardano-error="">
          {error}
        </Alert>
      )}
    </Stack>
  );
};

// ---- the check, both sides ----------------------------------------------------------------------

type Pending = { report: Report; payout: PayoutEntry; token: CardanoToken };

/** Reports paid on Cardano, not yet confirmed by hand: what the check runs for. */
const pendingOf = (ledger: Ledger): Pending[] =>
  ledger.reports.flatMap((r): Pending[] => {
    if (!r.paid || r.received || r.replacedBy || r.short !== undefined) return [];
    const payout = ledger.payouts.find((p) => p.signature === r.paid!.payoutSig);
    if (!payout || payout.method !== r.paid.method) return [];
    const offer = cardanoOffer(r.statement.currency, payout);
    return offer.token ? [{ report: r, payout, token: offer.token }] : [];
  });

/**
 * Each report paid on Cardano, checked there every 30 seconds until it holds, and the ledger
 * with the ones that pay in full settled (royalty-ledger.ts ledgerOf, `onChain`). The amount is
 * what the report leaves to pay, the address the payout the payment names, the reference worked
 * out here: nothing from the payer but the transaction's hash.
 */
export const useCardanoChecks = (
  entries: readonly DealEntry[],
): { ledger: Ledger; checks: ReadonlyMap<string, CardanoCheck> } => {
  const base = useMemo(() => ledgerOf(entries), [entries]);
  const pending = useMemo(() => (STABLECOIN_PAY ? pendingOf(base) : []), [base]);
  const [checks, setChecks] = useState<ReadonlyMap<string, CardanoCheck>>(new Map());
  const key = pending.map((p) => `${p.report.statement.signature}:${p.report.paid!.reference}`).join(',');
  useEffect(() => {
    if (pending.length === 0) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      const out = new Map<string, CardanoCheck>();
      for (const p of pending) {
        const s = p.report.statement;
        out.set(
          s.signature,
          await checkCardanoPayment({
            tx: p.report.paid!.reference,
            payTo: p.payout.account,
            token: p.token,
            amount: toPayOf(p.report, s.taxWithheld ?? '0'),
            statementSig: s.signature,
          }),
        );
      }
      if (!live) return;
      setChecks(out);
      const again = [...out.values()].some(
        (c) => !c.ok && (c.why === 'unconfirmed' || c.why === 'not-found' || c.why === 'unreachable'),
      );
      if (again) timer = setTimeout(() => void run(), 30_000);
    };
    void run();
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [key]);
  const settled = useMemo(() => {
    const m = new Map<string, { tx: string }>();
    for (const [sig, c] of checks) if (c.ok) m.set(sig, { tx: c.tx });
    return m;
  }, [checks]);
  const ledger = useMemo(() => (settled.size ? ledgerOf(entries, settled) : base), [entries, settled, base]);
  return { ledger, checks };
};

/** One report's check on Cardano, in words. */
export const CardanoCheckLine: React.FC<{
  check: CardanoCheck | undefined;
  report: Report;
  token: CardanoToken | undefined;
  licensor: string;
  tr: Translator;
}> = ({ check, report: r, token, licensor, tr }) => {
  if (!token) return null;
  const amount = toPayOf(r, r.statement.taxWithheld ?? '0');
  if (!check)
    return (
      <Typography variant="body2" color="text.secondary" data-cardano-check="checking">
        {tr.t('app.rpay.c.checking')}
      </Typography>
    );
  if (check.ok)
    return (
      <Alert severity="success" variant="outlined" data-cardano-check="ok">
        {tr.t('app.rpay.c.ok', {
          amount: formatMoney(amount, r.statement.currency, tr.locale),
          code: token.code,
          tx: short(check.tx),
          n: check.confirmations,
        })}
      </Alert>
    );
  const soft = check.why === 'unconfirmed' || check.why === 'not-found' || check.why === 'unreachable';
  return (
    <Alert
      severity={soft || check.why === 'no-relay' ? 'info' : 'warning'}
      variant="outlined"
      data-cardano-check={check.why}
    >
      {tr.t(`app.rpay.c.${check.why}` as AppKey, {
        code: token.code,
        licensor,
        amount,
        paid: check.paid !== undefined ? cardanoAmountText(check.paid, token) : '',
      })}
    </Alert>
  );
};

/** The token a report's payment was made in on Cardano, if it was. */
export const paidToken = (r: Report): CardanoToken | undefined =>
  STABLECOIN_PAY && r.paid ? cardanoTokenOf(r.paid.method) : undefined;
