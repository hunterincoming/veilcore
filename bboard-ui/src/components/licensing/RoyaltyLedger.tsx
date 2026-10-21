// Royalties on a live license, between the two of them (docs/agreements-live.md, 4 and 5).
//
// The licensee files a statement for a period; the licensor accepts or disputes it; the
// licensee says how it was paid; the licensor confirms it arrived. The licensor says once how
// they want to be paid. Every step is a message on the deal's private channel (deal.ts):
// encrypted for the two of them, signed by whoever took it, and dated by the registry's
// hourly anchor on Midnight. VeilCore never holds or moves the money.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Divider, Paper, Stack, TextField, Typography } from '@mui/material';
import { say, type DealEntry, type DealParty } from '../../veilcore/deal-client';
import { publicOf, type DealSide } from '../../veilcore/deal';
import {
  REGISTRY_BASE,
  downloadPaymentRequest,
  paymentRequest,
  receiptsFor,
  type CheckedReceipt,
} from '../../veilcore/payments';

type Terms = { royaltyType?: string; royaltyAmount?: string; unitBasis?: string };

type Statement = Extract<DealEntry, { type: 'statement' }>;
type Line = {
  statement: Statement;
  reply?: Extract<DealEntry, { type: 'reply' }>;
  paid?: Extract<DealEntry, { type: 'paid' }>;
  received?: Extract<DealEntry, { type: 'received' }>;
};

/** Two decimal places, as text: amounts never travel as floats. */
const money = (n: number): string => (Number.isFinite(n) ? n.toFixed(2) : '0.00');
const today = () => new Date().toISOString().slice(0, 10);
const dateOf = (t: number) => new Date(t).toLocaleDateString();

/** What a statement owes under the terms: a percent of reported sales, or a fee per unit. */
export const amountOwed = (terms: Terms, quantity: string): string => {
  const q = Number(quantity);
  const rate = Number(terms.royaltyAmount);
  if (!(q >= 0) || !(rate >= 0)) return '0.00';
  return money(terms.royaltyType === 'percent' ? (q * rate) / 100 : q * rate);
};

/** The ledger as the messages make it: each side's latest word on each statement counts. */
export const ledgerOf = (entries: readonly DealEntry[]) => {
  const payout = [...entries].reverse().find((e) => e.type === 'payout' && e.from === 'issuer') as
    | Extract<DealEntry, { type: 'payout' }>
    | undefined;
  const lines = new Map<string, Line>();
  for (const e of entries) {
    if (e.type === 'statement' && e.from === 'licensee' && !lines.has(e.statementId))
      lines.set(e.statementId, { statement: e });
  }
  for (const e of entries) {
    if (!('statementId' in e)) continue;
    const l = lines.get(e.statementId);
    if (!l) continue;
    if (e.type === 'reply' && e.from === 'issuer') l.reply = e;
    if (e.type === 'paid' && e.from === 'licensee') l.paid = e;
    if (e.type === 'received' && e.from === 'issuer') l.received = e;
  }
  const agreed = entries.find((e) => e.type === 'agree' && e.from === 'licensee') as
    | Extract<DealEntry, { type: 'agree' }>
    | undefined;
  return { payout, lines: [...lines.values()].reverse(), agreed };
};

const statusOf = (l: Line): { label: string; color: 'default' | 'warning' | 'success' | 'error' | 'info' } =>
  l.received
    ? { label: 'Paid and confirmed', color: 'success' }
    : l.paid
      ? { label: 'Paid, waiting for confirmation', color: 'info' }
      : l.reply?.decision === 'disputed'
        ? { label: 'Disputed', color: 'error' }
        : l.reply?.decision === 'accepted'
          ? { label: 'Accepted, to be paid', color: 'warning' }
          : { label: 'Filed, waiting for review', color: 'default' };

export const RoyaltyLedger: React.FC<{
  party: DealParty;
  side: DealSide;
  terms: Terms;
  entries: readonly DealEntry[] | undefined;
  refresh: () => void;
}> = ({ party, side, terms, entries, refresh }) => {
  const { payout, lines } = useMemo(() => ledgerOf(entries ?? []), [entries]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [form, setForm] = useState<'statement' | 'payout' | undefined>();
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
        Opening your private channel…
      </Typography>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }} lang="en">
      <Stack spacing={1.75}>
        <Box>
          <Typography variant="h6" component="h3">
            Royalties
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {side === 'licensee'
              ? 'File what you owe for each period. They review it, you pay them the way they ask, and they confirm it arrived.'
              : 'They file what they owe for each period. You accept or dispute it, they pay you, and you confirm it arrived.'}{' '}
            Every step is signed, private to the two of you, and dated on Midnight. VeilCore never holds the money.
          </Typography>
        </Box>

        {/* How the licensor gets paid. */}
        {payout ? (
          <Typography variant="body2">
            <b>Paid to:</b> {payout.method} · {payout.account} · {payout.currency}
            {side === 'issuer' && (
              <Button size="small" onClick={() => setForm('payout')} sx={{ ml: 1 }}>
                Change
              </Button>
            )}
          </Typography>
        ) : side === 'issuer' ? (
          <Alert severity="info" variant="outlined" action={<Button onClick={() => setForm('payout')}>Set it</Button>}>
            Tell them how you want to be paid.
          </Alert>
        ) : (
          <Typography variant="body2" color="text.secondary">
            They haven&apos;t said how they want to be paid yet.
          </Typography>
        )}
        {form === 'payout' && (
          <PayoutForm busy={busy} onSend={(b) => void send(b)} onCancel={() => setForm(undefined)} />
        )}

        {side === 'licensee' && form !== 'statement' && (
          <Button variant="contained" onClick={() => setForm('statement')} sx={{ alignSelf: 'flex-start' }}>
            File a statement
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
          />
        )}

        {lines.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No statements yet.
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} spacing={1.5}>
            {lines.map((l) => (
              <StatementLine
                key={l.statement.statementId}
                line={l}
                side={side}
                percent={percent}
                payout={payout}
                keys={keys}
                busy={busy}
                onSend={(b) => void send(b)}
              />
            ))}
          </Stack>
        )}
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
  const [method, setMethod] = useState('');
  const [account, setAccount] = useState('');
  const [currency, setCurrency] = useState('USD');
  return (
    <Stack spacing={1.25}>
      <TextField
        size="small"
        label="Paid how (a payment partner, bank transfer, …)"
        value={method}
        onChange={(e) => setMethod(e.target.value.slice(0, 80))}
      />
      <TextField
        size="small"
        label="Where (the account or wallet they pay to)"
        value={account}
        onChange={(e) => setAccount(e.target.value.slice(0, 200))}
      />
      <TextField
        size="small"
        label="Currency"
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
          Send
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
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
}> = ({ terms, percent, currency, busy, onSend, onCancel }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(today());
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const owed = amountOwed(terms, quantity);
  const ok = from && to && from <= to && Number(quantity) >= 0 && quantity.trim() !== '';
  return (
    <Stack spacing={1.25}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
        <TextField
          size="small"
          type="date"
          label="From"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>
      <TextField
        size="small"
        label={percent ? `Sales in the period (${currency})` : `Units in the period (${terms.unitBasis ?? 'units'})`}
        value={quantity}
        onChange={(e) => setQuantity(e.target.value.replace(/[^0-9.]/g, '').slice(0, 16))}
        inputMode="decimal"
      />
      <Typography variant="body2">
        Owed under the terms ({percent ? `${terms.royaltyAmount}% of sales` : `${terms.royaltyAmount} per unit`}):{' '}
        <b>
          {owed} {currency}
        </b>
      </Typography>
      <TextField
        size="small"
        label="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 500))}
        multiline
      />
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
            })
          }
        >
          File it
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
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
  busy: boolean;
  onSend: Send;
}> = ({ line, side, percent, payout, keys, busy, onSend }) => {
  const s = line.statement;
  const status = statusOf(line);
  const receipts = useReceipts(line, payout?.account);
  const [note, setNote] = useState('');
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
        {percent ? `Sales ${s.quantity} ${s.currency}` : `${s.quantity} units`} · owed{' '}
        <b>
          {s.amountOwed} {s.currency}
        </b>{' '}
        · filed {dateOf(s.at)}
        {s.note ? ` · “${s.note}”` : ''}
      </Typography>
      {line.reply && (
        <Typography variant="body2" color="text.secondary">
          {line.reply.decision === 'accepted' ? 'Accepted' : 'Disputed'} {dateOf(line.reply.at)}
          {line.reply.note ? `: “${line.reply.note}”` : ''}
        </Typography>
      )}
      {line.paid && (
        <Typography variant="body2" color="text.secondary">
          Paid {line.paid.amount} {line.paid.currency} on {line.paid.paidOn} by {line.paid.method}
          {line.paid.reference ? `, reference ${line.paid.reference}` : ''}
        </Typography>
      )}
      {receipts.map((c) => (
        <Alert
          key={`${c.receipt.partner}:${c.receipt.reference}`}
          severity={c.mismatch.length ? 'warning' : 'success'}
          variant="outlined"
        >
          Paid through {c.partnerName ?? 'a payment partner'}
          {c.nameChecked ? ' (name checked by VeilCore)' : ' (name not checked by VeilCore)'}: {c.receipt.amount}{' '}
          {c.receipt.currency} to {c.receipt.payTo} on {new Date(c.receipt.paidAt).toLocaleDateString()}, reference{' '}
          {c.receipt.reference}. Signed by the partner and checked here.
          {c.mismatch.length > 0 && ` Doesn’t match: ${c.mismatch.join('; ')}.`}
        </Alert>
      ))}
      {line.received && (
        <Typography variant="body2" color="text.secondary">
          Confirmed received {line.received.amount} {line.received.currency}, {dateOf(line.received.at)}
        </Typography>
      )}

      {/* The licensor's turn: review, then confirm the money arrived. */}
      {side === 'issuer' && !line.reply && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField
            size="small"
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
          />
          <Button
            variant="contained"
            disabled={busy}
            onClick={() =>
              onSend({
                type: 'reply',
                statementId: s.statementId,
                decision: 'accepted',
                ...(note.trim() ? { note: note.trim() } : {}),
              })
            }
          >
            Accept
          </Button>
          <Button
            color="error"
            disabled={busy || !note.trim()}
            onClick={() =>
              onSend({ type: 'reply', statementId: s.statementId, decision: 'disputed', note: note.trim() })
            }
          >
            Dispute (say why)
          </Button>
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
              amount: line.paid!.amount,
              currency: line.paid!.currency,
            })
          }
          sx={{ alignSelf: 'flex-start' }}
        >
          Confirm I received {line.paid.amount} {line.paid.currency}
        </Button>
      )}

      {/* The licensee's turn: pay, then say how. */}
      {side === 'licensee' && line.reply?.decision === 'accepted' && !line.paid && (
        <Stack spacing={1}>
          {payout && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
              <Typography variant="body2">
                Pay {s.amountOwed} {s.currency} by {payout.method} to {payout.account}, then record it here.
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => downloadPaymentRequest(paymentRequest(s, payout, keys, REGISTRY_BASE))}
              >
                Payment request for a partner
              </Button>
            </Stack>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              size="small"
              type="date"
              label="Paid on"
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              label="Payment reference"
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
                  amount: s.amountOwed,
                  currency: s.currency,
                  method: payout?.method ?? 'other',
                  reference: ref.trim(),
                  paidOn,
                })
              }
            >
              I paid it
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
