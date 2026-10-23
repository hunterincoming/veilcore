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
  tokenOfMethod,
  type OnChainToken,
  type PaymentCheck,
  type WalletEntry,
} from '../../veilcore/onchain-pay';
import { READ_INDEXERS } from '../../veilcore/chain/config';
import { NETWORK } from '../../config/network';

export { methodWords } from '../../veilcore/onchain-pay';

const short = (s: string) => (s.length > 24 ? `${s.slice(0, 16)}…${s.slice(-6)}` : s);

/** The licensor's payout on Midnight: their unshielded address, checked, and why it's public. */
export const MidnightPayoutForm: React.FC<{
  busy: boolean;
  onSend: (b: { type: 'payout'; method: string; account: string; currency: string }) => void;
  onCancel: () => void;
}> = ({ busy, onSend, onCancel }) => {
  const token = ONCHAIN_TOKENS[0];
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string>();
  const wallets = findWallets();
  const problem = address.trim() ? addressProblem(address) : undefined;
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
        They pay you {token.code} from their own wallet, straight to this address; VeilCore never touches it.{' '}
        {token.code} payments are public on Midnight (amounts and addresses, not names), and statements are then in{' '}
        {token.code}: VeilCore doesn’t convert currencies.
      </Alert>
      <TextField
        size="small"
        label="Your Midnight address (mn_addr…)"
        value={address}
        onChange={(e) => setAddress(e.target.value.trim().slice(0, 200))}
        error={!!problem}
        helperText={problem}
      />
      {wallets.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          {wallets.map((w) => (
            <Button key={w.id} size="small" variant="outlined" onClick={() => void fromWallet(w)}>
              Use my {w.name} address
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
          Send
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
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
            Record it
          </Button>
        }
      >
        You already paid this on Midnight (transaction {short(sent)}), but it isn’t recorded for them yet. Record it;
        don’t pay again.
      </Alert>
    );
  if (wallets.length === 0)
    return (
      <Alert severity="info" variant="outlined" data-pay-on-midnight="no-wallet">
        To pay on Midnight, open this page in a browser with a Midnight wallet (Lace or 1AM) on {NETWORK}, or pay
        another way and record it below.
      </Alert>
    );
  const wallet = wallets.find((w) => w.id === pick) ?? wallets[0];
  const pay = async () => {
    setState('paying');
    setError(undefined);
    try {
      const txId = await payOnChain(wallet, { token, amount, recipient: payTo });
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
          <TextField select size="small" label="Wallet" value={wallet.id} onChange={(e) => setPick(e.target.value)}>
            {wallets.map((w) => (
              <MenuItem key={w.id} value={w.id}>
                {w.name}
              </MenuItem>
            ))}
          </TextField>
        )}
        <Button variant="contained" disabled={busy || state === 'paying'} onClick={() => void pay()}>
          {state === 'paying' ? 'Waiting for your wallet…' : `Pay ${amount} ${token.code} with ${wallet.name}`}
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Your wallet shows the payment and the fee before you approve it, to {short(payTo)}. Once it is sent, this page
        records it for them, with the transaction.
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
  const [r, setR] = useState<PaymentCheck>();
  const [elsewhere, setElsewhere] = useState<string>();
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () =>
      void checkPayment({ txId, payTo, token, amount }, { indexers: READ_INDEXERS }).then((x) => {
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
  }, [txId, payTo, token, amount, statementSig, reusedFor]);
  if (reusedFor || elsewhere)
    return (
      <Alert severity="warning" variant="outlined" data-onchain-check="reused">
        This transaction was already given for another statement. It counts for one only: ask them for the payment of
        this one.
      </Alert>
    );
  if (!r)
    return (
      <Typography variant="body2" color="text.secondary">
        Checking the payment on Midnight…
      </Typography>
    );
  return r.ok ? (
    <Alert severity="success" variant="outlined" data-onchain-check="ok">
      Checked on Midnight: {amount} {token.code} reached your address in transaction {short(r.txHash)}
      {r.blockHeight ? `, block ${r.blockHeight}` : ''}. Read from Midnight’s indexer, not from them or VeilCore.
    </Alert>
  ) : (
    <Alert severity={r.unreachable ? 'info' : 'warning'} variant="outlined" data-onchain-check="not-yet">
      {r.reason}
    </Alert>
  );
};
