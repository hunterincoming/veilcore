// Royalties on a live license, between the two of them (docs/agreements-live.md, 4 and 5).
//
// The licensee files a statement for a period; the licensor accepts or disputes it; the
// licensee says how it was paid; the licensor confirms it arrived. The licensor says once how
// they want to be paid. Every step is a message on the deal's private channel (deal.ts):
// encrypted for the two of them, signed by whoever took it, and dated by the registry's
// hourly anchor on Midnight. VeilCore never holds or moves the money.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Collapse, Divider, Paper, Stack, TextField, Typography } from '@mui/material';
import { downloadDealRecord, say, type DealEntry, type DealParty } from '../../veilcore/deal-client';
import { publicOf, type DealSide } from '../../veilcore/deal';
import { isDecimal, owedUnder, sameAmount } from '../../veilcore/money';
import {
  REGISTRY_BASE,
  downloadPaymentRequest,
  paymentRequest,
  receiptsFor,
  type CheckedReceipt,
} from '../../veilcore/payments';
import { DealCredentials } from './DealCredentials';
import { basisLabel } from '../../veilcore/licenses';
import type { AgreedTerms } from '../../veilcore/credentials';
import { evidenceOf, isEvidence, isTheReport, sizeText, type Evidence } from '../../veilcore/evidence';
import { NextUp } from './DealSteps';
import { nextRoyaltyStep, suggestedPeriod } from './steps';
import { MidnightPayoutForm, OnChainPaymentCheck, PayOnMidnight } from './OnChainPay';
import { methodWords, reusedPayments, tokenOfMethod } from '../../veilcore/onchain-pay';
import { ONCHAIN_PAYMENTS } from '../../config/copy';
import { rich, useT } from '../../i18n/app';
import type { Translator } from '../../i18n/translate';

type Terms = { royaltyType?: string; royaltyAmount?: string; unitBasis?: string };

type Statement = Extract<DealEntry, { type: 'statement' }>;
type Line = {
  statement: Statement;
  reply?: Extract<DealEntry, { type: 'reply' }>;
  paid?: Extract<DealEntry, { type: 'paid' }>;
  received?: Extract<DealEntry, { type: 'received' }>;
};

const today = () => new Date().toISOString().slice(0, 10);

/** What a statement owes under the terms, to the cent ('0.00' when the quantity isn't a number yet). */
export const amountOwed = (terms: Terms, quantity: string): string => owedUnder(terms, quantity) ?? '0.00';

/**
 * The ledger as the signed messages make it (they come sorted by their signed time). Each
 * reply, payment and confirmation names its statement by the statement's own signature, so
 * it can only ever count for that one statement. On each statement, each side's latest word
 * counts. The payout account is the issuer's latest by its signed time; an earlier one is
 * kept so a change shows.
 */
export const ledgerOf = (entries: readonly DealEntry[]) => {
  const payouts = entries.filter((e) => e.type === 'payout' && e.from === 'issuer') as Extract<
    DealEntry,
    { type: 'payout' }
  >[];
  const payout = payouts[payouts.length - 1];
  const lines = new Map<string, Line>();
  for (const e of entries) {
    if (e.type === 'statement' && e.from === 'licensee') lines.set(e.signature, { statement: e });
  }
  for (const e of entries) {
    if (!('statementSig' in e)) continue;
    const l = lines.get(e.statementSig);
    if (!l) continue;
    if (e.type === 'reply' && e.from === 'issuer') l.reply = e;
    if (e.type === 'paid' && e.from === 'licensee') l.paid = e;
    if (e.type === 'received' && e.from === 'issuer') l.received = e;
  }
  const agreed = entries.find((e) => e.type === 'agree' && e.from === 'licensee') as
    | Extract<DealEntry, { type: 'agree' }>
    | undefined;
  return { payout, previousPayout: payouts[payouts.length - 2], lines: [...lines.values()].reverse(), agreed };
};

const statusOf = (
  l: Line,
  tr: Translator,
): { label: string; color: 'default' | 'warning' | 'success' | 'error' | 'info' } =>
  l.received
    ? { label: tr.t('app.lic.ledger.s.confirmed'), color: 'success' }
    : l.paid
      ? { label: tr.t('app.lic.ledger.s.paid'), color: 'info' }
      : l.reply?.decision === 'disputed'
        ? { label: tr.t('app.lic.ledger.s.disputed'), color: 'error' }
        : l.reply?.decision === 'accepted'
          ? { label: tr.t('app.lic.ledger.s.accepted'), color: 'warning' }
          : { label: tr.t('app.lic.ledger.s.filed'), color: 'default' };

export const RoyaltyLedger: React.FC<{
  party: DealParty;
  side: DealSide;
  terms: Terms;
  entries: readonly DealEntry[] | undefined;
  refresh: () => void;
  /** What this page holds as agreed (its own stored license), for the W3C credentials. */
  agreed?: AgreedTerms;
}> = ({ party, side, terms, entries, refresh, agreed }) => {
  const tr = useT();
  const { payout, previousPayout, lines } = useMemo(() => ledgerOf(entries ?? []), [entries]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [form, setForm] = useState<'statement' | 'payout' | undefined>();
  const [more, setMore] = useState(false);
  const [payoutKind, setPayoutKind] = useState<'other' | 'midnight'>('other');
  // One on-chain transaction counts for one statement only (onchain-pay.ts reusedPayments).
  const reused = useMemo(
    () =>
      reusedPayments(
        lines.flatMap((l) =>
          l.paid
            ? [
                {
                  statementSig: l.statement.signature,
                  method: l.paid.method,
                  reference: l.paid.reference,
                  at: l.paid.at,
                },
              ]
            : [],
        ),
      ),
    [lines],
  );
  const next = nextRoyaltyStep(side, lines, payout, tr);
  const percent = terms.royaltyType === 'percent';
  const mine = useMemo(() => publicOf(party.mySecret), [party.mySecret]);
  const keys =
    side === 'licensee' ? { licensee: mine, issuer: party.theirPublic } : { licensee: party.theirPublic, issuer: mine };

  const send = async (body: Parameters<typeof say>[1]) => {
    setBusy(true);
    setError(undefined);
    try {
      await say(party, body);
      setForm(undefined);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
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

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
      <Stack spacing={1.75}>
        <Box>
          <Typography variant="h6" component="h3">
            {tr.t('app.lic.ledger.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {side === 'licensee' ? tr.t('app.lic.ledger.howL') : tr.t('app.lic.ledger.howI')}{' '}
            {tr.t('app.lic.ledger.private')}
          </Typography>
        </Box>
        <NextUp text={next.text} yours={next.yours} />

        {/* How the licensor gets paid. */}
        {payout ? (
          <Typography variant="body2">
            <b>{tr.t('app.lic.ledger.paidTo')}</b> {methodWords(payout.method, tr)} · {payout.account} ·{' '}
            {payout.currency}
            {previousPayout && previousPayout.account !== payout.account && (
              <Typography component="span" variant="body2" color="warning.main">
                {' '}
                {side === 'licensee'
                  ? tr.t('app.lic.ledger.changedCheck', { date: tr.date(payout.at), old: previousPayout.account })
                  : tr.t('app.lic.ledger.changed', { date: tr.date(payout.at), old: previousPayout.account })}
              </Typography>
            )}
            {side === 'issuer' && (
              <Button size="small" onClick={() => setForm('payout')} sx={{ ml: 1 }}>
                {tr.t('app.lic.ledger.change')}
              </Button>
            )}
          </Typography>
        ) : side === 'issuer' ? (
          <Alert
            severity="info"
            variant="outlined"
            action={<Button onClick={() => setForm('payout')}>{tr.t('app.lic.ledger.setIt')}</Button>}
          >
            {tr.t('app.lic.next.i.payout')}
          </Alert>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {tr.t('app.lic.ledger.noPayout')}
          </Typography>
        )}
        {form === 'payout' && ONCHAIN_PAYMENTS && (
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
              {tr.t('app.lic.ledger.bank')}
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
        {form === 'payout' && (!ONCHAIN_PAYMENTS || payoutKind === 'other') && (
          <PayoutForm busy={busy} onSend={(b) => void send(b)} onCancel={() => setForm(undefined)} />
        )}
        {form === 'payout' && ONCHAIN_PAYMENTS && payoutKind === 'midnight' && (
          <MidnightPayoutForm busy={busy} onSend={(b) => void send(b)} onCancel={() => setForm(undefined)} />
        )}

        {side === 'licensee' && form !== 'statement' && (
          <Button
            variant={next.file ? 'contained' : 'outlined'}
            onClick={() => setForm('statement')}
            sx={{ alignSelf: 'flex-start' }}
          >
            {tr.t('app.lic.ledger.file')}
          </Button>
        )}
        {form === 'statement' && (
          <StatementForm
            terms={terms}
            percent={percent}
            currency={payout?.currency ?? 'USD'}
            busy={busy}
            onSend={(b) => void send(b)}
            onCancel={() => setForm(undefined)}
            period={suggestedPeriod(lines)}
          />
        )}

        {lines.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {tr.t('app.lic.ledger.none')}
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} spacing={1.5}>
            {lines.map((l) => (
              <StatementLine
                key={l.statement.signature}
                line={l}
                side={side}
                percent={percent}
                payout={payout}
                keys={keys}
                terms={terms}
                busy={busy}
                onSend={(b) => void send(b)}
                reusedFor={reused.get(l.statement.signature)}
              />
            ))}
          </Stack>
        )}
        {/* What most people never need, one tap away: the signed record, the W3C credentials. */}
        <Box>
          <Button size="small" color="inherit" onClick={() => setMore(!more)} aria-expanded={more} sx={{ px: 0 }}>
            {more ? tr.t('app.lic.ledger.fewer') : tr.t('app.lic.ledger.more')}
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
              <DealCredentials
                party={party}
                entries={entries}
                confirmed={lines.flatMap((l) => (l.received ? [{ statement: l.statement, received: l.received }] : []))}
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
        {error && (
          <Alert severity="error" variant="outlined">
            {error}
          </Alert>
        )}
      </Stack>
    </Paper>
  );
};

type Send = (b: Parameters<typeof say>[1]) => void;

const PayoutForm: React.FC<{ busy: boolean; onSend: Send; onCancel: () => void }> = ({ busy, onSend, onCancel }) => {
  const tr = useT();
  const [method, setMethod] = useState('');
  const [account, setAccount] = useState('');
  const [currency, setCurrency] = useState('USD');
  return (
    <Stack spacing={1.25}>
      <TextField
        size="small"
        label={tr.t('app.lic.ledger.pf.how')}
        value={method}
        onChange={(e) => setMethod(e.target.value.slice(0, 80))}
      />
      <TextField
        size="small"
        label={tr.t('app.lic.ledger.pf.where')}
        value={account}
        onChange={(e) => setAccount(e.target.value.slice(0, 200))}
      />
      <TextField
        size="small"
        label={tr.t('app.lic.ledger.pf.currency')}
        value={currency}
        onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 10))}
      />
      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          disabled={busy || !method.trim() || !account.trim() || !currency.trim()}
          onClick={() =>
            onSend({ type: 'payout', method: method.trim(), account: account.trim(), currency: currency.trim() })
          }
        >
          {tr.t('app.lic.ledger.send')}
        </Button>
        <Button onClick={onCancel}>{tr.t('app.lic.ledger.cancel')}</Button>
      </Stack>
    </Stack>
  );
};

const StatementForm: React.FC<{
  terms: Terms;
  percent: boolean;
  currency: string;
  busy: boolean;
  onSend: Send;
  onCancel: () => void;
  /** The period it most likely covers (steps.ts suggestedPeriod): filled in, and changeable. */
  period: { from: string; to: string };
}> = ({ terms, percent, currency, busy, onSend, onCancel, period }) => {
  const tr = useT();
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [evidence, setEvidence] = useState<Evidence>();
  const [evidenceError, setEvidenceError] = useState<string>();
  // A rate the page can't read as a number (typed as words, say): the amount is typed instead.
  const rateReadable = owedUnder(terms, '1') !== undefined;
  const [typed, setTyped] = useState('');
  const owed = rateReadable ? amountOwed(terms, quantity) : typed.trim();
  const ok = from && to && from <= to && isDecimal(quantity) && isDecimal(owed);
  return (
    <Stack spacing={1.25}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
        <TextField
          size="small"
          type="date"
          label={tr.t('app.lic.ledger.sf.from')}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          type="date"
          label={tr.t('app.lic.ledger.sf.to')}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>
      <TextField
        size="small"
        label={
          percent
            ? tr.t('app.lic.ledger.sf.sales', { currency })
            : tr.t('app.lic.ledger.sf.units', {
                basis: basisLabel(terms.unitBasis, tr) || tr.t('app.lic.ledger.unitsWord'),
              })
        }
        value={quantity}
        onChange={(e) => setQuantity(e.target.value.replace(/[^0-9.]/g, '').slice(0, 16))}
        inputMode="decimal"
      />
      {rateReadable ? (
        <Typography variant="body2">
          {rich(
            percent ? tr.t('app.lic.ledger.sf.owedPct') : tr.t('app.lic.ledger.sf.owedUnit'),
            { b: (c) => <b>{c}</b> },
            { rate: terms.royaltyAmount ?? '', owed, currency },
          )}
        </Typography>
      ) : (
        <TextField
          size="small"
          label={tr.t('app.lic.ledger.sf.typed', { currency, rate: terms.royaltyAmount ?? '' })}
          value={typed}
          onChange={(e) => setTyped(e.target.value.replace(/[^0-9.]/g, '').slice(0, 18))}
          inputMode="decimal"
        />
      )}
      <TextField
        size="small"
        label={tr.t('app.lic.detail.note')}
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 500))}
        multiline
      />
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
          {tr.t('app.lic.ledger.sf.reportHelp')}
        </Typography>
        {evidenceError && (
          <Typography variant="caption" color="error">
            {evidenceError}
          </Typography>
        )}
      </Box>
      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          disabled={busy || !ok}
          onClick={() =>
            onSend({
              type: 'statement',
              statementId: crypto.randomUUID(),
              periodFrom: from,
              periodTo: to,
              basis: percent ? 'sales' : 'units',
              quantity,
              currency,
              amountOwed: owed,
              ...(note.trim() ? { note: note.trim() } : {}),
              ...(evidence ? { evidence } : {}),
            })
          }
        >
          {tr.t('app.lic.ledger.sf.fileIt')}
        </Button>
        <Button onClick={onCancel}>{tr.t('app.lic.ledger.cancel')}</Button>
      </Stack>
    </Stack>
  );
};

const StatementLine: React.FC<{
  line: Line;
  side: DealSide;
  percent: boolean;
  payout?: Extract<DealEntry, { type: 'payout' }>;
  keys: { licensee: string; issuer: string };
  terms: Terms;
  busy: boolean;
  onSend: Send;
  /** Another statement this one's on-chain payment was already counted for. */
  reusedFor?: string;
}> = ({ line, side, percent, payout, keys, terms, busy, onSend, reusedFor }) => {
  const tr = useT();
  const payToken = payout ? tokenOfMethod(payout.method) : undefined;
  const paidToken = line.paid ? tokenOfMethod(line.paid.method) : undefined;
  const s = line.statement;
  const status = statusOf(line, tr);
  const receipts = useReceipts(line, payout?.account);
  const [note, setNote] = useState('');
  const [disputing, setDisputing] = useState(false);
  const [ref, setRef] = useState('');
  const [paidOn, setPaidOn] = useState(today());
  return (
    <Stack spacing={0.75}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="subtitle2">
          {s.periodFrom} → {s.periodTo}
        </Typography>
        <Chip size="small" label={status.label} color={status.color} variant="outlined" />
      </Stack>
      <Typography variant="body2">
        {rich(
          percent ? tr.t('app.lic.ledger.l.sales') : tr.t('app.lic.ledger.l.units'),
          { b: (c) => <b>{c}</b> },
          { qty: s.quantity, currency: s.currency, owed: s.amountOwed, date: tr.date(s.at) },
        )}
        {s.note ? ` · “${s.note}”` : ''}
      </Typography>
      <ReportCheck statement={s} side={side} checking={!line.reply} />
      {side === 'issuer' && !sameAmount(s.amountOwed, owedUnder(terms, s.quantity) ?? '') && (
        <Alert severity="warning" variant="outlined">
          {tr.t('app.lic.ledger.l.mismatch', {
            expected: owedUnder(terms, s.quantity) ?? tr.t('app.lic.ledger.l.unknownAmount'),
            owed: s.amountOwed,
          })}
        </Alert>
      )}
      {line.reply && (
        <Typography variant="body2" color="text.secondary">
          {tr.t(line.reply.decision === 'accepted' ? 'app.lic.ledger.l.acceptedOn' : 'app.lic.ledger.l.disputedOn', {
            date: tr.date(line.reply.at),
          })}
          {line.reply.note ? `: “${line.reply.note}”` : ''}
        </Typography>
      )}
      {line.paid && (
        <Typography variant="body2" color="text.secondary">
          {tr.t('app.lic.ledger.l.paid', {
            amount: line.paid.amount,
            currency: line.paid.currency,
            date: line.paid.paidOn,
            method: line.paid.method,
          })}
          {line.paid.reference ? tr.t('app.lic.ledger.l.reference', { ref: line.paid.reference }) : ''}
        </Typography>
      )}
      {receipts.map((c) => (
        <Alert
          key={`${c.receipt.partner}:${c.receipt.reference}`}
          severity={c.mismatch.length || !c.nameChecked ? 'warning' : 'success'}
          variant="outlined"
        >
          {tr.t(c.nameChecked ? 'app.lic.ledger.r.checked' : 'app.lic.ledger.r.unchecked', {
            partner: c.partnerName ?? tr.t('app.lic.ledger.r.aPartner'),
            amount: c.receipt.amount,
            currency: c.receipt.currency,
            to: c.receipt.payTo,
            date: tr.date(c.receipt.paidAt),
            ref: c.receipt.reference,
          })}
          {c.mismatch.length > 0 && ` ${tr.t('app.lic.ledger.r.mismatch', { what: c.mismatch.join('; ') })}`}
        </Alert>
      ))}
      {side === 'issuer' && line.paid && paidToken && line.paid.reference && !line.received && (
        <OnChainPaymentCheck
          token={paidToken}
          txId={line.paid.reference}
          payTo={payout?.account ?? line.paid.payTo}
          amount={s.amountOwed}
          statementSig={s.signature}
          reusedFor={reusedFor}
        />
      )}
      {line.received && (
        <Typography variant="body2" color="text.secondary">
          {tr.t('app.lic.ledger.l.received', {
            amount: line.received.amount,
            currency: line.received.currency,
            date: tr.date(line.received.at),
          })}
        </Typography>
      )}

      {/* The licensor's turn: review, then confirm the money arrived. */}
      {side === 'issuer' && !line.reply && (
        <Stack spacing={1}>
          {disputing && (
            <TextField
              size="small"
              label={tr.t('app.lic.ledger.l.whatsWrong')}
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              autoFocus
            />
          )}
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {!disputing ? (
              <>
                <Button
                  variant="contained"
                  disabled={busy}
                  onClick={() =>
                    onSend({
                      type: 'reply',
                      statementId: s.statementId,
                      statementSig: s.signature,
                      decision: 'accepted',
                    })
                  }
                >
                  {tr.t('app.lic.ledger.l.accept')}
                </Button>
                <Button color="error" disabled={busy} onClick={() => setDisputing(true)}>
                  {tr.t('app.lic.ledger.l.dispute')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  color="error"
                  variant="contained"
                  disabled={busy || !note.trim()}
                  onClick={() =>
                    onSend({
                      type: 'reply',
                      statementId: s.statementId,
                      statementSig: s.signature,
                      decision: 'disputed',
                      note: note.trim(),
                    })
                  }
                >
                  {tr.t('app.lic.ledger.l.sendDispute')}
                </Button>
                <Button color="inherit" disabled={busy} onClick={() => setDisputing(false)}>
                  {tr.t('app.lic.ledger.l.back')}
                </Button>
              </>
            )}
          </Stack>
        </Stack>
      )}
      {side === 'issuer' && line.paid && !line.received && (
        <Button
          variant="contained"
          disabled={busy}
          onClick={() =>
            onSend({
              type: 'received',
              statementId: s.statementId,
              statementSig: s.signature,
              amount: line.paid!.amount,
              currency: line.paid!.currency,
            })
          }
          sx={{ alignSelf: 'flex-start' }}
        >
          {tr.t('app.lic.ledger.l.confirm', { amount: line.paid.amount, currency: line.paid.currency })}
        </Button>
      )}

      {/* The licensee's turn: pay, then say how. */}
      {side === 'licensee' &&
        line.reply?.decision === 'accepted' &&
        !line.paid &&
        payout &&
        payToken &&
        ONCHAIN_PAYMENTS &&
        (s.currency === payToken.code ? (
          <PayOnMidnight
            token={payToken}
            amount={s.amountOwed}
            payTo={payout.account}
            busy={busy}
            statementSig={s.signature}
            onPaid={(txId) =>
              onSend({
                type: 'paid',
                statementId: s.statementId,
                statementSig: s.signature,
                amount: s.amountOwed,
                currency: s.currency,
                method: payout.method,
                payTo: payout.account,
                reference: txId,
                paidOn: today(),
              })
            }
          />
        ) : (
          <Alert severity="info" variant="outlined">
            {tr.t('app.lic.ledger.l.currencyMismatch', { token: payToken.code, currency: s.currency })}
          </Alert>
        ))}
      {side === 'licensee' && line.reply?.decision === 'accepted' && !line.paid && (
        <Stack spacing={1}>
          {payout && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
              <Typography variant="body2">
                {tr.t('app.lic.ledger.l.payThen', {
                  amount: s.amountOwed,
                  currency: s.currency,
                  method: payout.method,
                  account: payout.account,
                })}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => downloadPaymentRequest(paymentRequest(s, payout, keys, REGISTRY_BASE))}
              >
                {tr.t('app.lic.ledger.l.request')}
              </Button>
            </Stack>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              size="small"
              type="date"
              label={tr.t('app.lic.ledger.l.paidOn')}
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              label={tr.t('app.lic.ledger.l.ref')}
              value={ref}
              onChange={(e) => setRef(e.target.value.slice(0, 120))}
            />
            <Button
              variant="contained"
              disabled={busy || !paidOn}
              onClick={() =>
                onSend({
                  type: 'paid',
                  statementId: s.statementId,
                  statementSig: s.signature,
                  amount: s.amountOwed,
                  currency: s.currency,
                  method: payout?.method ?? 'other',
                  payTo: payout?.account ?? '',
                  reference: ref.trim(),
                  paidOn,
                })
              }
            >
              {tr.t('app.lic.ledger.l.iPaid')}
            </Button>
          </Stack>
        </Stack>
      )}
    </Stack>
  );
};

/** Receipts filed by payment partners for an accepted statement, checked here, read every 30 seconds until confirmed. */
const useReceipts = (line: Line, payTo: string | undefined): CheckedReceipt[] => {
  const [list, setList] = useState<CheckedReceipt[]>([]);
  const watch = line.reply?.decision === 'accepted';
  const done = !!line.received;
  const fp = line.statement.fingerprint;
  useEffect(() => {
    if (!watch) return;
    let live = true;
    const run = () =>
      receiptsFor(line.statement, payTo)
        .then((r) => live && setList(r))
        .catch(() => undefined);
    void run();
    const t = done ? undefined : setInterval(() => void run(), 30_000);
    return () => {
      live = false;
      if (t) clearInterval(t);
    };
  }, [fp, payTo, watch, done, line.statement]);
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
  if (!isEvidence(e)) {
    return side === 'issuer' ? (
      <Typography variant="body2" color="text.secondary">
        {tr.t('app.lic.ledger.rc.none')}
      </Typography>
    ) : null;
  }
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
