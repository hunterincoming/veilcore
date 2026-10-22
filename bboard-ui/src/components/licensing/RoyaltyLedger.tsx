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
import type { AgreedTerms } from '../../veilcore/credentials';
import { evidenceOf, isEvidence, isTheReport, sizeText, type Evidence } from '../../veilcore/evidence';

type Terms = { royaltyType?: string; royaltyAmount?: string; unitBasis?: string };

type Statement = Extract<DealEntry, { type: 'statement' }>;
type Line = {
  statement: Statement;
  reply?: Extract<DealEntry, { type: 'reply' }>;
  paid?: Extract<DealEntry, { type: 'paid' }>;
  received?: Extract<DealEntry, { type: 'received' }>;
};

const today = () => new Date().toISOString().slice(0, 10);
const dateOf = (t: number) => new Date(t).toLocaleDateString();

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
  /** What this page holds as agreed (its own stored license), for the W3C credentials. */
  agreed?: AgreedTerms;
}> = ({ party, side, terms, entries, refresh, agreed }) => {
  const { payout, previousPayout, lines } = useMemo(() => ledgerOf(entries ?? []), [entries]);
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
            {previousPayout && previousPayout.account !== payout.account && (
              <Typography component="span" variant="body2" color="warning.main">
                {' '}
                (changed {dateOf(payout.at)} from {previousPayout.account}
                {side === 'licensee' ? ': check with them before you pay' : ''})
              </Typography>
            )}
            {side === 'issuer' && (
              <Typography component="span" variant="body2" color="text.secondary">
                {' '}
                · if a payment partner asks, your key for this deal starts {mine.slice(0, 8)}
              </Typography>
            )}
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

        <Button
          size="small"
          color="inherit"
          onClick={() => downloadDealRecord(party, mine, entries)}
          sx={{ alignSelf: 'flex-start' }}
        >
          Download the signed record of this deal
        </Button>
        {lines.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No statements yet.
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
              />
            ))}
          </Stack>
        )}
        <DealCredentials
          party={party}
          entries={entries}
          confirmed={lines.flatMap((l) => (l.received ? [{ statement: l.statement, received: l.received }] : []))}
          busy={busy}
          onSend={(b) => void send(b)}
          agreed={agreed}
        />
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
      {rateReadable ? (
        <Typography variant="body2">
          Owed under the terms ({percent ? `${terms.royaltyAmount}% of sales` : `${terms.royaltyAmount} per unit`}):{' '}
          <b>
            {owed} {currency}
          </b>
        </Typography>
      ) : (
        <TextField
          size="small"
          label={`Amount owed (${currency}); the rate in the terms is “${terms.royaltyAmount ?? ''}”`}
          value={typed}
          onChange={(e) => setTyped(e.target.value.replace(/[^0-9.]/g, '').slice(0, 18))}
          inputMode="decimal"
        />
      )}
      <TextField
        size="small"
        label="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 500))}
        multiline
      />
      <Box>
        {evidence ? (
          <Typography variant="body2">
            Sales report: <b>{evidence.name}</b> ({sizeText(evidence.size)}), proof code{' '}
            <code>{evidence.sha256.slice(0, 12)}…</code>{' '}
            <Button size="small" color="inherit" onClick={() => setEvidence(undefined)}>
              Remove
            </Button>
          </Typography>
        ) : (
          <Button component="label" size="small" variant="outlined">
            Attach the sales report (optional)
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
          Your Metrc sales export, POS report or spreadsheet for this period. The file stays on your device: only its
          proof code goes in the statement, signed by you. Send them the file yourself, and their page checks it is the
          same one.
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
  terms: Terms;
  busy: boolean;
  onSend: Send;
}> = ({ line, side, percent, payout, keys, terms, busy, onSend }) => {
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
      <ReportCheck statement={s} side={side} />
      {side === 'issuer' && !sameAmount(s.amountOwed, owedUnder(terms, s.quantity) ?? '') && (
        <Alert severity="warning" variant="outlined">
          Under the terms this comes to {owedUnder(terms, s.quantity) ?? 'an amount this page can’t work out'}, not{' '}
          {s.amountOwed}. Check it before you accept.
        </Alert>
      )}
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
          severity={c.mismatch.length || !c.nameChecked ? 'warning' : 'success'}
          variant="outlined"
        >
          Paid through {c.partnerName ?? 'a payment partner'}
          {c.nameChecked ? ' (a partner VeilCore checked)' : ' (not a partner VeilCore has checked)'}:{' '}
          {c.receipt.amount} {c.receipt.currency} to {c.receipt.payTo} on{' '}
          {new Date(c.receipt.paidAt).toLocaleDateString()}, reference {c.receipt.reference}. Signed by the partner and
          checked here.
          {!c.nameChecked &&
            ' Anyone can sign as a partner under any name: confirm the money arrived before you rely on it.'}
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
                statementSig: s.signature,
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
              onSend({
                type: 'reply',
                statementId: s.statementId,
                statementSig: s.signature,
                decision: 'disputed',
                note: note.trim(),
              })
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
              statementSig: s.signature,
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

/** The sales report behind a statement: shown, and for the licensor, checked against the file they were sent. */
const ReportCheck: React.FC<{ statement: Extract<DealEntry, { type: 'statement' }>; side: DealSide }> = ({
  statement,
  side,
}) => {
  const [result, setResult] = useState<'same' | 'different'>();
  const e = statement.evidence;
  if (!isEvidence(e)) {
    return side === 'issuer' ? (
      <Typography variant="body2" color="text.secondary">
        No sales report attached.
      </Typography>
    ) : null;
  }
  return (
    <Box data-sales-report="">
      <Typography variant="body2">
        Backed by their sales report <b>{e.name}</b> ({sizeText(e.size)}), proof code{' '}
        <code>{e.sha256.slice(0, 12)}…</code>
        {side === 'licensee' ? '. Send them the file if you haven’t.' : ''}
      </Typography>
      {side === 'issuer' && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Button component="label" size="small" variant="outlined">
            Check the file they sent
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
                It’s the exact file they signed for.
              </Typography>
            )}
            {result === 'different' && (
              <Typography variant="body2" color="error">
                That’s not the file they signed for. Ask them for the one this statement names.
              </Typography>
            )}
          </Box>
        </Stack>
      )}
    </Box>
  );
};
