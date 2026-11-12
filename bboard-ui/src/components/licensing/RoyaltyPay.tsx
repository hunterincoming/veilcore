// Royalty payments made visible, and paid in a stablecoin on Cardano (docs/royalty-pay.md):
//   - PaymentAlerts: the in-app reminders on both sides (due soon, overdue), and on the
//     licensor's side the line saying what their record's public check page says;
//   - usePublicNotices: the licensor's page keeps that public notice in step with the deal;
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
  ledgerOf,
  noticeDayOf,
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
import { dealNotices, noticeRef, syncNotices, type NoticeOutcome } from '../../veilcore/license-notices';
import type { DealBody } from '../../veilcore/deal';
import { STABLECOIN_PAY } from '../../config/copy';
import { NETWORK } from '../../config/network';
import type { DealEntry } from '../../veilcore/deal-client';

const short = (s: string) => (s.length > 24 ? `${s.slice(0, 14)}…${s.slice(-6)}` : s);

// ---- reminders, overdue, notice of breach, the licensee's answer ------------------------------

type PublicState = {
  outcome: NoticeOutcome | 'idle';
  shown: ReadonlySet<string>;
  /** Left off the public page: the registry can't show the licensee's dispute beside it. */
  withheld: ReadonlySet<string>;
};

/**
 * Due soon and overdue, at the top of the royalties on both sides. On an overdue payment, both
 * sides see where it stands: no notice of breach yet; a notice, and the last day to pay (the cure
 * period, royalty-ledger.ts CURE_DAYS); or the cure period over. The licensee answers here: "I
 * paid" (the report's own pay form), or a short dispute note, signed, which the licensor sees and
 * the public page shows next to the overdue line.
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
}> = ({ side, alerts, licensee, licensor, tr, busy, send, publicState }) => {
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
}> = ({ a, side, licensee, licensor, tr, busy, send, publicState }) => {
  const [disputing, setDisputing] = useState(false);
  const [note, setNote] = useState('');
  const n = a.report.number;
  const late = a.kind === 'overdue';
  const date = dateWords(late ? a.since! : a.due, tr);
  const ref = late ? noticeRef('overdue', a.report.statement.signature) : '';
  const s = a.report.statement;
  const answerDay = a.answer ? dateWords(noticeDayOf(a.answer), tr) : '';
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
        <Typography variant="body2" data-answer="" sx={{ mt: 0.5 }}>
          {side === 'licensee'
            ? tr.t('app.rpay.l.answered', { date: answerDay, note: a.answer.note ?? '' })
            : tr.t('app.rpay.i.answered', { licensee, date: answerDay, note: a.answer.note ?? '' })}
        </Typography>
      )}
      {side === 'issuer' && late && publicState && publicState.outcome !== 'idle' && (
        <Typography
          variant="body2"
          sx={{ mt: 0.5 }}
          data-public-notice={
            publicState.shown.has(ref) ? 'shown' : publicState.withheld.has(ref) ? 'withheld' : publicState.outcome
          }
        >
          {publicState.shown.has(ref)
            ? a.answer
              ? tr.t('app.rpay.i.publicDisputed', { date, answered: answerDay })
              : tr.t('app.rpay.i.public', { date })
            : publicState.withheld.has(ref)
              ? tr.t('app.rpay.i.publicWithheld', { licensee })
              : publicState.outcome === 'unsupported'
                ? tr.t('app.rpay.i.publicUnsupported')
                : tr.t('app.rpay.i.publicFailed')}
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
                <Button
                  size="small"
                  variant="contained"
                  disabled={busy || !note.trim()}
                  data-dispute-send=""
                  onClick={() =>
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
                >
                  {tr.t('app.rpay.l.disputeSend')}
                </Button>
                <Button size="small" color="inherit" onClick={() => setDisputing(false)}>
                  {tr.t('app.lic.ledger.cancel')}
                </Button>
              </Stack>
            </Stack>
          )}
        </Box>
      )}
    </Alert>
  );
};

/**
 * The licensor's page keeps their record's public notices for this deal in step with its
 * messages (license-notices.ts dealNotices): an overdue notice per report overdue now, with the
 * licensee's dispute beside it, none for the rest. Once when the page opens and whenever what is
 * overdue changes.
 */
export const usePublicNotices = (
  recordId: string | undefined,
  alerts: readonly PaymentAlert[],
  ledger: Ledger,
): PublicState => {
  const { want, mine } = useMemo(() => dealNotices(ledger, alerts, false), [ledger, alerts]);
  const key =
    [...want].map(([r, n]) => `${r}:${n.kind === 'overdue' ? n.since : n.on}:${n.disputed ?? ''}`).join(',') +
    `|${[...mine].sort().join(',')}`;
  const [state, setState] = useState<PublicState>({ outcome: 'idle', shown: new Set(), withheld: new Set() });
  useEffect(() => {
    if (!recordId || (want.size === 0 && mine.size === 0)) return;
    let live = true;
    void syncNotices(recordId, want, mine).then((r) => {
      if (live)
        setState({ outcome: r.outcome, shown: new Set(r.shown.map((n) => n.ref)), withheld: new Set(r.withheld) });
    });
    return () => {
      live = false;
    };
    // `key` stands for want and mine: the same notices are not sent again on every render.
  }, [recordId, key]);
  return state;
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
