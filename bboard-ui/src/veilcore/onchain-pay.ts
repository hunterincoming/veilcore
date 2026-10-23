// Royalties paid on Midnight, straight from the licensee's wallet to the licensor's address
// (docs/agreements-live.md, "Paying on Midnight"). Test networks only (config/copy.ts
// ONCHAIN_PAYMENTS): a money rail goes to mainnet only after Mako's yes and a lawyer's.
//
// What VeilCore does and doesn't do here, by design:
//   - it never holds, routes or converts the money. The licensee's own wallet (Lace, 1AM: any
//     wallet with Midnight's standard connector, @midnight-ntwrk/dapp-connector-api v4) builds,
//     proves, pays the fee for and submits a plain transfer to the address the licensor gave
//     in their signed payout message. No contract call: the contracts are unchanged;
//   - it doesn't convert currencies. On-chain payment is offered only when the statement is
//     in the token itself (NIGHT, or a token pinned below later): an amount owed in dollars
//     paid in a volatile token would need a rate, and a rate is a judgement VeilCore won't make;
//   - the licensor's page checks the payment on Midnight itself (checkPayment): the
//     transaction succeeded and created outputs to the payout address, in that token, adding
//     up to at least the amount. One transaction pays one statement: the page refuses to count
//     it twice.
//
// NIGHT is always unshielded, so its transfers are public: anyone can see that one address
// paid another, how much, and when (not who the addresses belong to, nor what for). The
// payout form says so before anyone picks it. A shielded stablecoin would hide that; none is
// confirmed live on Midnight mainnet as of 23 October 2026, so none is listed.
// SPDX-License-Identifier: Apache-2.0

import { bech32m } from '@scure/base';
import { NETWORK } from '../config/network';

export type OnChainToken = {
  /** What a payout and a statement call it: the statement's currency. */
  readonly code: string;
  readonly kind: 'unshielded';
  /** The ledger's raw token type, hex (the connector's TokenType). */
  readonly type: string;
  /** Base units per whole token, as a power of ten. */
  readonly decimals: number;
};

/**
 * The tokens a royalty can be paid in on Midnight, fixed in this source like the payment
 * partners (payment-partners.ts): a token is added by a reviewed commit, never by a message.
 * NIGHT: the native token, raw type all zeros (ledger nativeToken()); 1 NIGHT = 10^6 STAR
 * (docs.midnight.network/tokens/overview).
 */
export const ONCHAIN_TOKENS: readonly OnChainToken[] = [
  { code: 'NIGHT', kind: 'unshielded', type: '00'.repeat(32), decimals: 6 },
];

/** The payout method for paying on Midnight in `code`: what the licensor's signed payout says. */
export const onChainMethod = (code: string): string => `midnight:${code}`;

/** The token a payout method names, if it is a Midnight one this page knows. */
export const tokenOfMethod = (method: string | undefined): OnChainToken | undefined => {
  const m = /^midnight:([A-Z0-9]{1,12})$/.exec(method ?? '');
  return m ? ONCHAIN_TOKENS.find((t) => t.code === m[1]) : undefined;
};

/** A payout method in words: "on Midnight, in NIGHT", or the method as the licensor wrote it. */
export const methodWords = (method: string): string => {
  const t = tokenOfMethod(method);
  return t ? `on Midnight, in ${t.code}` : method;
};

/**
 * A decimal amount in base units, exactly: "500" NIGHT is 500000000 STAR. Refuses anything
 * that isn't a plain positive decimal, or has more decimals than the token: rounding money
 * silently is how a statement and a payment come to disagree.
 */
export const toBaseUnits = (amount: string, decimals: number): bigint => {
  const m = /^(\d{1,30})(?:\.(\d+))?$/.exec(amount.trim());
  if (!m) throw new Error(`“${amount}” isn’t an amount.`);
  const frac = m[2] ?? '';
  if (frac.length > decimals) throw new Error(`“${amount}” has more than ${decimals} decimal places.`);
  const units =
    BigInt(m[1]) * 10n ** BigInt(decimals) + BigInt((frac + '0'.repeat(decimals)).slice(0, decimals) || '0');
  if (units <= 0n) throw new Error('The amount must be more than zero.');
  return units;
};

/** Base units back to a decimal, for showing: 500000000 STAR is "500". */
export const fromBaseUnits = (units: bigint, decimals: number): string => {
  const s = units.toString().padStart(decimals + 1, '0');
  const whole = s.slice(0, s.length - decimals);
  const frac = s.slice(s.length - decimals).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
};

/** The unshielded address prefix on a network: mn_addr on mainnet, mn_addr_<network> elsewhere. */
export const addressPrefix = (network: string = NETWORK): string =>
  network === 'mainnet' ? 'mn_addr' : `mn_addr_${network}`;

/**
 * Why an unshielded address can't be paid to on this network, or undefined when it can: a
 * Bech32m string with a good checksum and this network's prefix (Midnight's address format,
 * @midnight-ntwrk/wallet-sdk-address-format). A typo fails the checksum, so it is caught here
 * and not after the money has gone.
 */
export const addressProblem = (address: string, network: string = NETWORK): string | undefined => {
  const a = address.trim();
  let prefix: string;
  try {
    prefix = bech32m.decode(a as `${string}1${string}`, 200).prefix;
  } catch {
    return 'That isn’t a Midnight address (check it was copied whole).';
  }
  if (prefix !== addressPrefix(network))
    return prefix.startsWith('mn_addr')
      ? `That address is for another Midnight network, not ${network}.`
      : 'That isn’t an unshielded Midnight address (it should start with mn_addr).';
  return undefined;
};

// ---- the licensee's wallet ----------------------------------------------------------------

/** What this page uses of a wallet (dapp-connector-api v4 InitialAPI / ConnectedAPI). */
export type WalletEntry = {
  readonly id: string;
  readonly name: string;
  readonly apiVersion: string;
  readonly connect: (networkId: string) => Promise<ConnectedWallet>;
};
export type ConnectedWallet = {
  makeTransfer(
    outputs: { kind: 'shielded' | 'unshielded'; type: string; value: bigint; recipient: string }[],
    options?: { payFees?: boolean },
  ): Promise<{ tx: string }>;
  submitTransaction(tx: string): Promise<void>;
  getUnshieldedAddress(): Promise<{ unshieldedAddress: string }>;
};

/** The Midnight wallets this browser has: window.midnight.<id>, connector version 4 only. */
export const findWallets = (root: unknown = (globalThis as { midnight?: unknown }).midnight): WalletEntry[] => {
  if (typeof root !== 'object' || root === null) return [];
  const out: WalletEntry[] = [];
  for (const [id, w] of Object.entries(root as Record<string, unknown>)) {
    if (typeof w !== 'object' || w === null) continue;
    const v = w as Record<string, unknown>;
    if (typeof v.connect !== 'function' || typeof v.apiVersion !== 'string' || !v.apiVersion.startsWith('4.')) continue;
    out.push({
      id,
      name: typeof v.name === 'string' && v.name.trim() ? v.name.trim().slice(0, 40) : id,
      apiVersion: v.apiVersion,
      connect: (n) => (v.connect as (n: string) => Promise<ConnectedWallet>)(n),
    });
  }
  return out;
};

/** The transaction's identifier, read from the transaction the wallet built (ledger-v8). */
export const identifierOf = async (txHex: string): Promise<string> => {
  const { Transaction } = await import('@midnight-ntwrk/ledger-v8');
  const bytes = Uint8Array.from(txHex.match(/../g) ?? [], (h) => parseInt(h, 16));
  const tx = Transaction.deserialize('signature', 'proof', 'binding', bytes);
  const id = tx.identifiers()[0];
  if (!id) throw new Error('The wallet’s transaction has no identifier.');
  return String(id).toLowerCase();
};

/**
 * Pay `amount` of `token` to `recipient` from the licensee's wallet: the wallet builds, proves,
 * pays the fee for and submits it. Returns the transaction's identifier, to put in the signed
 * "I paid it" message and for the licensor's page to check.
 */
export const payOnChain = async (
  wallet: WalletEntry,
  p: { token: OnChainToken; amount: string; recipient: string },
  deps: { network?: string; identifierOf?: (tx: string) => Promise<string> } = {},
): Promise<string> => {
  const network = deps.network ?? NETWORK;
  const bad = addressProblem(p.recipient, network);
  if (bad) throw new Error(bad);
  const value = toBaseUnits(p.amount, p.token.decimals);
  const api = await wallet.connect(network);
  const { tx } = await api.makeTransfer(
    [{ kind: p.token.kind, type: p.token.type, value, recipient: p.recipient.trim() }],
    { payFees: true },
  );
  const id = await (deps.identifierOf ?? identifierOf)(tx);
  // Checked before anything is sent: a reference the "I paid it" message can't carry would
  // leave a payment nobody can point at (deal.ts allows 120 characters).
  if (!/^[0-9a-f]{2,120}$/.test(id))
    throw new Error('The wallet’s transaction has an id this page can’t record. Nothing was sent.');
  await api.submitTransaction(tx);
  return id;
};

// ---- a payment sent but not yet recorded ---------------------------------------------------
//
// Between the wallet sending the money and the signed "I paid it" reaching the registry, the
// page can close or the registry can fail. The transaction is kept in this browser the moment
// the wallet has sent it, so the page then offers to record that payment, never to pay again.

const SENT_KEY = 'veilcore:onchain-sent';

const sentAll = (): Record<string, string> => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(SENT_KEY) ?? '{}');
    return typeof v === 'object' && v !== null ? (v as Record<string, string>) : {};
  } catch {
    return {};
  }
};

/** The transaction already sent for this statement (by its signature), if any. */
export const sentFor = (statementSig: string): string | undefined => {
  const v = sentAll()[statementSig];
  return typeof v === 'string' && /^[0-9a-f]{2,120}$/.test(v) ? v : undefined;
};

/** Keep the transaction sent for this statement. */
export const keepSent = (statementSig: string, txId: string): void => {
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify({ ...sentAll(), [statementSig]: txId }));
  } catch {
    /* the page still records it now; only a reload before that would lose the reminder */
  }
};

// ---- one payment, one statement, across every deal -------------------------------------
//
// reusedPayments catches one transaction given for two statements of the same deal. A
// licensee holding two licenses from the same licensor could give it to both deals, which no
// single deal's messages show. So the licensor's browser keeps which statement each checked
// transaction was counted for, across all its deals.

const COUNTED_KEY = 'veilcore:onchain-counted';

const countedAll = (): Record<string, string> => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(COUNTED_KEY) ?? '{}');
    return typeof v === 'object' && v !== null ? (v as Record<string, string>) : {};
  } catch {
    return {};
  }
};

/**
 * Count a checked transaction for this statement. Returns the statement it was already counted
 * for, when that is another one (then it is not counted again), else undefined.
 */
export const countPayment = (txId: string, statementSig: string): string | undefined => {
  const id = norm(txId);
  const all = countedAll();
  const prior = all[id];
  if (prior && prior !== statementSig) return prior;
  if (!prior) {
    try {
      localStorage.setItem(COUNTED_KEY, JSON.stringify({ ...all, [id]: statementSig }));
    } catch {
      /* not kept: the next check on this device counts it again, for the same statement */
    }
  }
  return undefined;
};

// ---- the licensor's check -----------------------------------------------------------------

export const PAYMENT_QUERY = `query VEILCORE_PAYMENT_CHECK($byId: TransactionOffset!, $byHash: TransactionOffset!) {
  byId: transactions(offset: $byId) { ...p }
  byHash: transactions(offset: $byHash) { ...p }
}
fragment p on Transaction {
  hash
  block { height timestamp }
  ... on RegularTransaction {
    identifiers
    transactionResult { status }
    unshieldedCreatedOutputs { owner tokenType value outputIndex }
  }
}`;

export type PaymentCheck =
  | {
      readonly ok: true;
      readonly txHash: string;
      readonly blockHeight?: number;
      /** What reached the payout address in that token, base units. */
      readonly paid: bigint;
    }
  | { readonly ok: false; readonly reason: string; readonly unreachable?: boolean };

const norm = (h: unknown): string => (typeof h === 'string' ? h.trim().toLowerCase().replace(/^0x/, '') : '');

/**
 * The indexer's token type as the ledger's raw type. The indexer serialises it; whether that
 * carries a leading tag byte isn't documented, so both forms are read (only unshielded outputs
 * are asked for, so a tag can only say "unshielded"). To confirm on the first test run.
 */
const sameTokenType = (indexerHex: unknown, raw: string): boolean => {
  const h = norm(indexerHex);
  return h === raw || (h.length === raw.length + 2 && h.endsWith(raw));
};

/**
 * Whether transaction `txId` paid at least `amount` of `token` to `payTo`, read from
 * Midnight's indexer (never from the registry or the payer). Succeeded, found once, outputs to
 * that address in that token adding up to the amount.
 */
export const checkPayment = async (
  p: { txId: string; payTo: string; token: OnChainToken; amount: string },
  deps: { indexers: readonly string[]; fetch?: typeof fetch; timeoutMs?: number },
): Promise<PaymentCheck> => {
  const txId = norm(p.txId);
  if (!/^[0-9a-f]{2,}$/.test(txId)) return { ok: false, reason: 'The payment reference isn’t a transaction id.' };
  let want: bigint;
  try {
    want = toBaseUnits(p.amount, p.token.decimals);
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
  if (deps.indexers.length === 0)
    return { ok: false, unreachable: true, reason: 'No Midnight indexer is set up on this site to check it.' };
  for (const indexer of deps.indexers) {
    let body: { data?: { byId?: unknown; byHash?: unknown } | null; errors?: unknown };
    try {
      const res = await (deps.fetch ?? fetch)(indexer, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          query: PAYMENT_QUERY,
          variables: { byId: { identifier: txId }, byHash: { hash: txId } },
        }),
        signal: AbortSignal.timeout(deps.timeoutMs ?? 15_000),
      });
      if (!res.ok) continue;
      body = (await res.json()) as typeof body;
    } catch {
      continue;
    }
    if (!body.data || (Array.isArray(body.errors) && body.errors.length)) continue;
    const list = [body.data.byId, body.data.byHash].flatMap((v) => (Array.isArray(v) ? (v as unknown[]) : []));
    const txs = new Map<string, Record<string, unknown>>();
    for (const t of list) {
      if (typeof t !== 'object' || t === null) continue;
      const r = t as Record<string, unknown>;
      const ids = Array.isArray(r.identifiers) ? r.identifiers.map(norm) : [];
      if (norm(r.hash) === txId || ids.includes(txId)) txs.set(norm(r.hash), r);
    }
    if (txs.size === 0) return { ok: false, reason: 'Midnight has no such transaction (yet: it can take a minute).' };
    if (txs.size > 1) return { ok: false, reason: 'More than one transaction answers to that reference.' };
    const [[txHash, tx]] = [...txs];
    if ((tx.transactionResult as { status?: unknown } | undefined)?.status !== 'SUCCESS')
      return { ok: false, reason: 'That transaction didn’t succeed on Midnight.' };
    const outs = Array.isArray(tx.unshieldedCreatedOutputs)
      ? (tx.unshieldedCreatedOutputs as Record<string, unknown>[])
      : [];
    let paid = 0n;
    for (const o of outs) {
      if (typeof o !== 'object' || o === null) continue;
      if (typeof o.owner !== 'string' || o.owner.trim() !== p.payTo.trim()) continue;
      if (!sameTokenType(o.tokenType, p.token.type)) continue;
      if (typeof o.value !== 'string' || !/^\d{1,40}$/.test(o.value)) continue;
      paid += BigInt(o.value);
    }
    if (paid === 0n) return { ok: false, reason: `That transaction paid no ${p.token.code} to your payout address.` };
    if (paid < want)
      return {
        ok: false,
        reason: `That transaction paid ${fromBaseUnits(paid, p.token.decimals)} ${p.token.code}, less than ${p.amount}.`,
      };
    const height = (tx.block as { height?: unknown } | undefined)?.height;
    return { ok: true, txHash, paid, ...(typeof height === 'number' ? { blockHeight: height } : {}) };
  }
  return { ok: false, unreachable: true, reason: 'Midnight’s indexer didn’t answer. The page tries again.' };
};

/**
 * Statements whose on-chain payment names a transaction another statement already counts: the
 * later ones (by when they were signed) don't count it again.
 */
export const reusedPayments = (
  paid: readonly { statementSig: string; method: string; reference?: string; at: number }[],
): Map<string, string> => {
  const firstFor = new Map<string, string>();
  const reused = new Map<string, string>();
  for (const p of [...paid].sort((a, b) => a.at - b.at)) {
    if (!tokenOfMethod(p.method) || !p.reference) continue;
    const ref = norm(p.reference);
    const first = firstFor.get(ref);
    if (first) reused.set(p.statementSig, first);
    else firstFor.set(ref, p.statementSig);
  }
  return reused;
};
