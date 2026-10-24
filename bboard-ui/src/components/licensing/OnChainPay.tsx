// Paying a royalty on Midnight (veilcore/onchain-pay.ts): the licensor's payout address, the
// licensee's "Pay with my wallet", and the licensor's page checking the payment on Midnight.
// Test networks only (config/copy.ts ONCHAIN_PAYMENTS).
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import {
  ONCHAIN_TOKENS,
  addressProblem,
  checkPayment,
  countPayment,
  findWallets,
  keepSent,
  sentFor,
  onChainMethod,
  payOnChain,
  type OnChainToken,
  type PaymentCheck,
  type WalletEntry,
} from '../../veilcore/onchain-pay';
import { READ_INDEXERS } from '../../veilcore/chain/config';
import { NETWORK } from '../../config/network';
import { useT } from '../../i18n/app';

export { methodWords } from '../../veilcore/onchain-pay';

const short = (s: string) => (s.length > 24 ? `${s.slice(0, 16)}…${s.slice(-6)}` : s);

/** The licensor's payout on Midnight: their unshielded address, checked, and why it's public. */
export const MidnightPayoutForm: React.FC<{
  busy: boolean;
  onSend: (b: { type: 'payout'; method: string; account: string; currency: string }) => void;
  onCancel: () => void;
}> = ({ busy, onSend, onCancel }) => {
  const tr = useT();
  const token = ONCHAIN_TOKENS[0];
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string>();
  const wallets = findWallets();
  const problem = address.trim() ? addressProblem(address, NETWORK, tr) : undefined;
  const fromWallet = async (w: WalletEntry) => {
    setError(undefined);
    try {
      const api = await w.connect(NETWORK);
      setAddress((await api.getUnshieldedAddress()).unshieldedAddress);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <Stack spacing={1.25} data-midnight-payout="">
      <Alert severity="info" variant="outlined">
        {tr.t('app.lic.pay.payoutInfo', { code: token.code })}
      </Alert>
      <TextField
        size="small"
        label={tr.t('app.lic.pay.address')}
        value={address}
        onChange={(e) => setAddress(e.target.value.trim().slice(0, 200))}
        error={!!problem}
        helperText={problem}
      />
      {wallets.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          {wallets.map((w) => (
            <Button key={w.id} size="small" variant="outlined" onClick={() => void fromWallet(w)}>
              {tr.t('app.lic.pay.useMine', { name: w.name })}
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
          disabled={busy || !address || !!problem}
          onClick={() =>
            onSend({ type: 'payout', method: onChainMethod(token.code), account: address.trim(), currency: token.code })
          }
        >
          {tr.t('app.lic.ledger.send')}
        </Button>
        <Button onClick={onCancel}>{tr.t('app.lic.ledger.cancel')}</Button>
      </Stack>
    </Stack>
  );
};

/** The licensee's "Pay with my wallet" for an accepted statement in the payout's token. */
export const PayOnMidnight: React.FC<{
  token: OnChainToken;
  amount: string;
  payTo: string;
  busy: boolean;
  /** The statement's signature: what a sent payment is kept under until it is recorded. */
  statementSig: string;
  onPaid: (txId: string) => void;
}> = ({ token, amount, payTo, busy, statementSig, onPaid }) => {
  const tr = useT();
  const wallets = findWallets();
  const [sent, setSent] = useState(() => sentFor(statementSig));
  const [pick, setPick] = useState(wallets[0]?.id ?? '');
  const [state, setState] = useState<'idle' | 'paying'>('idle');
  const [error, setError] = useState<string>();
  // Already paid from this browser, not yet recorded for them: record it, never pay twice.
  if (sent)
    return (
      <Alert
        severity="warning"
        variant="outlined"
        data-pay-on-midnight="sent"
        action={
          <Button color="inherit" variant="outlined" disabled={busy} onClick={() => onPaid(sent)}>
            {tr.t('app.lic.pay.recordIt')}
          </Button>
        }
      >
        {tr.t('app.lic.pay.alreadyPaid', { tx: short(sent) })}
      </Alert>
    );
  if (wallets.length === 0)
    return (
      <Alert severity="info" variant="outlined" data-pay-on-midnight="no-wallet">
        {tr.t('app.lic.pay.noWallet', { network: NETWORK })}
      </Alert>
    );
  const wallet = wallets.find((w) => w.id === pick) ?? wallets[0];
  const pay = async () => {
    setState('paying');
    setError(undefined);
    try {
      const txId = await payOnChain(wallet, { token, amount, recipient: payTo }, { tr });
      keepSent(statementSig, txId);
      setSent(txId);
      onPaid(txId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setState('idle');
    }
  };
  return (
    <Stack spacing={1} data-pay-on-midnight="">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
        {wallets.length > 1 && (
          <TextField
            select
            size="small"
            label={tr.t('app.lic.pay.wallet')}
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
        <Button variant="contained" disabled={busy || state === 'paying'} onClick={() => void pay()}>
          {state === 'paying'
            ? tr.t('app.lic.pay.waiting')
            : tr.t('app.lic.pay.payWith', { amount, code: token.code, name: wallet.name })}
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {tr.t('app.lic.pay.walletShows', { to: short(payTo) })}
      </Typography>
      {error && (
        <Alert severity="error" variant="outlined">
          {error}
        </Alert>
      )}
    </Stack>
  );
};

/** The licensor's check of a payment on Midnight, read again every 30 seconds until it holds. */
export const OnChainPaymentCheck: React.FC<{
  token: OnChainToken;
  txId: string;
  payTo: string;
  /** What the accepted statement says is owed: never the amount the payer wrote in "I paid it". */
  amount: string;
  /** The statement this payment is for (its signature): one transaction counts for one. */
  statementSig: string;
  /** Another statement of this deal this transaction was already given for, if any. */
  reusedFor?: string;
}> = ({ token, txId, payTo, amount, statementSig, reusedFor }) => {
  const tr = useT();
  const [r, setR] = useState<PaymentCheck>();
  const [elsewhere, setElsewhere] = useState<string>();
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () =>
      void checkPayment({ txId, payTo, token, amount }, { indexers: READ_INDEXERS, tr }).then((x) => {
        if (!live) return;
        // Counted once across every deal on this device (onchain-pay.ts countPayment).
        if (x.ok && !reusedFor) setElsewhere(countPayment(txId, statementSig));
        setR(x);
        if (!x.ok) timer = setTimeout(run, 30_000);
      });
    run();
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [txId, payTo, token, amount, statementSig, reusedFor, tr]);
  if (reusedFor || elsewhere)
    return (
      <Alert severity="warning" variant="outlined" data-onchain-check="reused">
        {tr.t('app.lic.pay.reused')}
      </Alert>
    );
  if (!r)
    return (
      <Typography variant="body2" color="text.secondary">
        {tr.t('app.lic.pay.checking')}
      </Typography>
    );
  return r.ok ? (
    <Alert severity="success" variant="outlined" data-onchain-check="ok">
      {r.blockHeight
        ? tr.t('app.lic.pay.checkedBlock', { amount, code: token.code, tx: short(r.txHash), block: r.blockHeight })
        : tr.t('app.lic.pay.checked', { amount, code: token.code, tx: short(r.txHash) })}
    </Alert>
  ) : (
    <Alert severity={r.unreachable ? 'info' : 'warning'} variant="outlined" data-onchain-check="not-yet">
      {r.reason}
    </Alert>
  );
};
