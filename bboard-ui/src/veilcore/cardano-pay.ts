// Royalties paid in a US dollar stablecoin on Cardano, straight from the licensee's own wallet
// to the licensor's own signed address (docs/royalty-pay.md). Built, and off on mainnet
// (config/copy.ts STABLECOIN_PAY_ON_MAINNET): a money rail goes to mainnet only after Mako's
// yes, a lawyer's review and a first payment that has worked.
//
// What VeilCore does and doesn't do here, by design:
//   - it never holds, routes, pauses or converts the money. The licensee's wallet (any CIP-30
//     wallet: Lace, Eternl...) signs and sends one plain transfer to the address the licensor
//     gave in their signed payout. VeilCore has no wallet in the middle, no contract, no key and
//     no fee in the transfer;
//   - it doesn't convert currencies. It is offered only for a statement in USD, when the
//     licensor's signed payout says USD is payable in that token at 1:1 (`rate: '1'`). The
//     licensor signed that, so the par risk is theirs, by their own choice;
//   - the payment carries a reference on Cardano itself (CIP-20, metadata label 674):
//     "vc1:" and 32 hex characters, worked out from the statement's signature and the payout
//     address. It doesn't name the statement, the deal or anyone; only someone holding the deal's
//     messages can work it out again. One transaction carries one reference, so it can pay one
//     statement only;
//   - either page, and the published checker, checks the payment on Cardano: confirmed, the
//     right reference, and at least what the statement leaves to pay (amountOwed less the tax it
//     declared) in that token to that address. Then the statement counts as paid and settled
//     without the licensor's "received" (SPEC 11.10, "Settled on chain").
//
// Cardano payments are public: anyone can see that one address paid another, how much, when,
// and the reference (not who the addresses belong to). The payout form says so first.
// SPDX-License-Identifier: Apache-2.0

import { sha256 } from '@noble/hashes/sha2.js';
import { bech32 } from '@scure/base';
import { NETWORK } from '../config/network';
import { enT, type Translator } from '../i18n/translate';
import { toBaseUnits, fromBaseUnits } from './onchain-pay';

export type CardanoNetwork = 'mainnet' | 'preprod';

/** The Cardano network a build pays on: mainnet with Midnight's main network, preprod otherwise. */
export const cardanoNetworkOf = (midnight: string = NETWORK): CardanoNetwork =>
  midnight === 'mainnet' ? 'mainnet' : 'preprod';

export type CardanoToken = {
  /** What a payout calls it: `cardano:<code>`. */
  readonly code: string;
  /** The currency it pays at 1:1. Only USD for now. */
  readonly pays: 'USD';
  readonly network: CardanoNetwork;
  /** The minting policy, 56 hex characters. */
  readonly policyId: string;
  /** The asset name, hex. */
  readonly assetName: string;
  /** Base units per whole token, as a power of ten. */
  readonly decimals: number;
};

/** policyId + assetName: how Cardano and its indexers name a token ("unit"). */
export const unitOf = (t: Pick<CardanoToken, 'policyId' | 'assetName'>): string => t.policyId + t.assetName;

/**
 * The tokens a royalty can be paid in on Cardano, fixed in this source: a token is added by a
 * reviewed commit, never by a message. Checked 8 November 2026:
 *   - USDCx (Circle, through xReserve): policy and name from cexplorer.io's asset page and
 *     Masumi's token docs (docs.masumi.network/core-concepts/tokens), which agree; its CIP-14
 *     fingerprint asset1e7eewpjw8ua3f2gpfx7y34ww9vjl63hayn80kl matches cexplorer's.
 *   - USDM (Moneta): the unit CoinGecko lists for its Cardano contract (a CIP-68 fungible token,
 *     label 333, name "USDM"); fingerprint asset12ffdj8kk2w485sr7a5ekmjjdyecz8ps2cm5zed.
 * Decimals: 6 for both, as USDC and USDM use. Cardano itself has no decimals (they are display
 * metadata), so this is the one figure to confirm against each issuer's token registry entry
 * before mainnet (docs/royalty-pay.md, "Before mainnet").
 */
export const CARDANO_TOKENS: readonly CardanoToken[] = [
  {
    code: 'USDCx',
    pays: 'USD',
    network: 'mainnet',
    policyId: '1f3aec8bfe7ea4fe14c5f121e2a92e301afe414147860d557cac7e34',
    assetName: '5553444378',
    decimals: 6,
  },
  {
    code: 'USDM',
    pays: 'USD',
    network: 'mainnet',
    policyId: 'c48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad',
    assetName: '0014df105553444d',
    decimals: 6,
  },
];

/**
 * A test token on preprod, from the build (`VITE_CARDANO_TEST_ASSET`, `CODE:policy:name:decimals`):
 * preprod has no real USDCx, so the test site names one it can mint. Never read on mainnet.
 */
export const testTokenFrom = (raw: string | undefined, midnight: string = NETWORK): CardanoToken | undefined => {
  if (midnight === 'mainnet' || !raw) return undefined;
  const m = /^([A-Za-z][A-Za-z0-9]{0,11}):([0-9a-f]{56}):([0-9a-f]{0,64}):([0-9]|1[0-8])$/.exec(raw.trim());
  if (!m) return undefined;
  return { code: m[1], pays: 'USD', network: 'preprod', policyId: m[2], assetName: m[3], decimals: Number(m[4]) };
};

/** The tokens this build can be paid in: its network's, and a test token on a test build. */
export const tokensFor = (
  midnight: string = NETWORK,
  testToken: string | undefined = import.meta.env.VITE_CARDANO_TEST_ASSET,
): CardanoToken[] => {
  const net = cardanoNetworkOf(midnight);
  const test = testTokenFrom(testToken, midnight);
  return [...CARDANO_TOKENS.filter((t) => t.network === net), ...(test ? [test] : [])];
};

/** The payout method for paying on Cardano in `code`: what the licensor's signed payout says. */
export const cardanoMethod = (code: string): string => `cardano:${code}`;

/** The token a payout or payment method names, if it is a Cardano one this build knows. */
export const cardanoTokenOf = (
  method: string | undefined,
  tokens: readonly CardanoToken[] = tokensFor(),
): CardanoToken | undefined => {
  const m = /^cardano:([A-Za-z0-9]{1,12})$/.exec(method ?? '');
  return m ? tokens.find((t) => t.code === m[1]) : undefined;
};

/** The amount in the token's base units: "123.45" USDCx is 123450000. */
export const cardanoUnits = (amount: string, t: CardanoToken, tr: Translator = enT): bigint =>
  toBaseUnits(amount, t.decimals, tr);

export const cardanoAmountText = (units: bigint, t: CardanoToken): string => fromBaseUnits(units, t.decimals);

// ---- addresses -----------------------------------------------------------------------------

/** The bytes of a Cardano address in Bech32, or undefined. */
export const addressBytes = (address: string): { prefix: string; bytes: Uint8Array } | undefined => {
  try {
    const d = bech32.decode(address.trim() as `${string}1${string}`, 200);
    return { prefix: d.prefix, bytes: Uint8Array.from(bech32.fromWords(d.words)) };
  } catch {
    return undefined;
  }
};

/**
 * Why a Cardano address can't be paid to on this network, or undefined when it can: a Shelley
 * payment address (CIP-19 types 0 to 7: base, pointer or enterprise) in Bech32 with a good
 * checksum, the network's prefix (addr on mainnet, addr_test elsewhere) and the network id in
 * its header. A typo fails the checksum, so it is caught before any money goes.
 */
export const cardanoAddressProblem = (
  address: string,
  midnight: string = NETWORK,
  tr: Translator = enT,
): string | undefined => {
  const net = cardanoNetworkOf(midnight);
  const a = addressBytes(address);
  if (!a || a.bytes.length < 29) return tr.t('app.rpay.addr.not');
  const type = a.bytes[0] >> 4;
  const id = a.bytes[0] & 0x0f;
  if (type > 7 || (a.prefix !== 'addr' && a.prefix !== 'addr_test')) return tr.t('app.rpay.addr.notPayment');
  const wantPrefix = net === 'mainnet' ? 'addr' : 'addr_test';
  const wantId = net === 'mainnet' ? 1 : 0;
  if (a.prefix !== wantPrefix || id !== wantId) return tr.t('app.rpay.addr.otherNetwork', { network: net });
  return undefined;
};

// ---- the reference the payment carries -----------------------------------------------------

const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/** The text the reference is the hash of (SPEC 11.10, "Settled on chain"). */
export const PAY_REF_DOMAIN = 'veilcore/pay-ref/v1\n';

/**
 * The payment reference for a statement paid to an address: "vc1:" and the first 16 bytes of
 * SHA-256("veilcore/pay-ref/v1\n" + statement signature + "\n" + address), hex. 36 characters:
 * one CIP-20 line. The same recipe as Request Network's payment reference, over VeilCore's own
 * fields. It doesn't name the statement, the deal or the parties.
 */
export const payRef = (statementSig: string, payTo: string): string =>
  'vc1:' + hex(sha256(new TextEncoder().encode(`${PAY_REF_DOMAIN}${statementSig}\n${payTo.trim()}`))).slice(0, 32);

/** The CIP-20 metadata a payment carries: label 674, one line. */
export const payMetadata = (ref: string): { 674: { msg: string[] } } => ({ 674: { msg: [ref] } });

// ---- when it is offered ----------------------------------------------------------------------

/** What a payout needs to be paid on Cardano: the shape the licensor's signed payout has. */
export type CardanoPayout = {
  readonly method: string;
  readonly account: string;
  readonly currency: string;
  readonly rate?: string;
};

/**
 * The token a statement can be paid in on Cardano under this payout, or undefined (and why).
 * Offered only when the statement is in the currency the token pays (USD), the payout is in it
 * too, names a token this build knows, says 1:1 (`rate: '1'`) and names a payment address on
 * this build's Cardano network.
 */
export const cardanoOffer = (
  statementCurrency: string,
  payout: CardanoPayout | undefined,
  tokens: readonly CardanoToken[] = tokensFor(),
  midnight: string = NETWORK,
):
  | { readonly token: CardanoToken }
  | { readonly token?: undefined; readonly why: 'not-cardano' | 'currency' | 'rate' | 'address' } => {
  const token = payout ? cardanoTokenOf(payout.method, tokens) : undefined;
  if (!payout || !token) return { why: 'not-cardano' };
  if (statementCurrency !== token.pays || payout.currency !== token.pays) return { why: 'currency' };
  if (payout.rate !== '1') return { why: 'rate' };
  if (cardanoAddressProblem(payout.account, midnight)) return { why: 'address' };
  return { token };
};

// ---- the check -------------------------------------------------------------------------------

/** A transaction as the Cardano relay answers for it (sponsor/src/cardano-relay.ts). */
export type CardanoTx = {
  readonly hash: string;
  /** False when its scripts failed (collateral taken): it paid nothing. */
  readonly valid: boolean;
  /** Blocks on top of the one it is in, that one included; 0 when not in a block yet. */
  readonly confirmations: number;
  readonly blockTime?: number;
  readonly outputs: readonly {
    readonly address: string;
    readonly amounts: readonly { unit: string; quantity: string }[];
  }[];
  /** The lines of its CIP-20 message (label 674 `msg`), as written. */
  readonly msg: readonly string[];
};

/** Blocks deep before a payment counts: about four minutes on Cardano. */
export const MIN_CONFIRMATIONS = 10;

export type CardanoVerdict =
  | { readonly ok: true; readonly paid: bigint }
  | {
      readonly ok: false;
      readonly why: 'unconfirmed' | 'failed' | 'no-ref' | 'many-refs' | 'wrong-ref' | 'none' | 'short';
      readonly paid?: bigint;
    };

/**
 * Whether a transaction pays a statement (SPEC 11.10, "Settled on chain"): valid, at least
 * MIN_CONFIRMATIONS deep, exactly one "vc1:" line in its message and it is this statement's
 * reference, and its outputs to the payout address in the token add up to at least `want`
 * base units. More than owed counts as paid; the extra is between the two of them.
 */
export const cardanoVerdict = (
  tx: CardanoTx,
  p: { payTo: string; unit: string; want: bigint; ref: string; minConfirmations?: number },
): CardanoVerdict => {
  if (!tx.valid) return { ok: false, why: 'failed' };
  if (tx.confirmations < (p.minConfirmations ?? MIN_CONFIRMATIONS)) return { ok: false, why: 'unconfirmed' };
  const refs = tx.msg.filter((l) => l.startsWith('vc1:'));
  if (refs.length === 0) return { ok: false, why: 'no-ref' };
  if (refs.length > 1) return { ok: false, why: 'many-refs' };
  if (refs[0] !== p.ref) return { ok: false, why: 'wrong-ref' };
  let paid = 0n;
  for (const o of tx.outputs) {
    if (o.address !== p.payTo.trim()) continue;
    for (const a of o.amounts) if (a.unit === p.unit && /^\d{1,40}$/.test(a.quantity)) paid += BigInt(a.quantity);
  }
  if (paid === 0n) return { ok: false, why: 'none' };
  if (paid < p.want) return { ok: false, why: 'short', paid };
  return { ok: true, paid };
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The relay's answer, checked field by field; undefined when it isn't one. */
export const parseCardanoTx = (v: unknown): CardanoTx | undefined => {
  if (!isObj(v) || typeof v.hash !== 'string' || !/^[0-9a-f]{64}$/.test(v.hash)) return undefined;
  if (typeof v.valid !== 'boolean' || !Number.isSafeInteger(v.confirmations) || (v.confirmations as number) < 0)
    return undefined;
  if (!Array.isArray(v.outputs) || !Array.isArray(v.msg) || v.outputs.length > 500 || v.msg.length > 64)
    return undefined;
  const outputs: CardanoTx['outputs'][number][] = [];
  for (const o of v.outputs) {
    if (!isObj(o) || typeof o.address !== 'string' || !Array.isArray(o.amounts)) return undefined;
    const amounts: { unit: string; quantity: string }[] = [];
    for (const a of o.amounts) {
      if (!isObj(a) || typeof a.unit !== 'string' || typeof a.quantity !== 'string') return undefined;
      amounts.push({ unit: a.unit, quantity: a.quantity });
    }
    outputs.push({ address: o.address, amounts });
  }
  if (!v.msg.every((l) => typeof l === 'string')) return undefined;
  return {
    hash: v.hash,
    valid: v.valid,
    confirmations: v.confirmations as number,
    ...(Number.isSafeInteger(v.blockTime) ? { blockTime: v.blockTime as number } : {}),
    outputs,
    msg: v.msg,
  };
};

/** Where this build reads Cardano: the relay (VITE_CARDANO_RELAY_URL), never Blockfrost directly. */
export const CARDANO_RELAY: string | undefined = (() => {
  const u = import.meta.env.VITE_CARDANO_RELAY_URL?.trim();
  return u && /^https?:\/\/[^\s?#]+$/.test(u) ? u.replace(/\/+$/, '') : undefined;
})();

export type CardanoCheck =
  | { readonly ok: true; readonly tx: string; readonly paid: bigint; readonly confirmations: number }
  | {
      readonly ok: false;
      readonly why: Extract<CardanoVerdict, { ok: false }>['why'] | 'not-found' | 'unreachable' | 'no-relay' | 'not-tx';
      readonly paid?: bigint;
    };

/**
 * Whether transaction `tx` pays the statement, read from Cardano through the relay (never from
 * the registry or the payer). The amount is what the statement leaves to pay, the address the
 * licensor's own signed payout, the reference worked out here: none of it from the payer.
 */
export const checkCardanoPayment = async (
  p: { tx: string; payTo: string; token: CardanoToken; amount: string; statementSig: string },
  deps: { relay?: string; fetch?: typeof fetch; timeoutMs?: number } = {},
): Promise<CardanoCheck> => {
  const tx = p.tx.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(tx)) return { ok: false, why: 'not-tx' };
  const relay = 'relay' in deps ? deps.relay : CARDANO_RELAY;
  if (!relay) return { ok: false, why: 'no-relay' };
  let want: bigint;
  try {
    want = cardanoUnits(p.amount, p.token);
  } catch {
    return { ok: false, why: 'none' };
  }
  let body: unknown;
  try {
    const res = await (deps.fetch ?? fetch)(`${relay}/tx/${tx}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(deps.timeoutMs ?? 15_000),
    });
    if (res.status === 404) return { ok: false, why: 'not-found' };
    if (!res.ok) return { ok: false, why: 'unreachable' };
    body = await res.json();
  } catch {
    return { ok: false, why: 'unreachable' };
  }
  const t = parseCardanoTx(body);
  if (!t || t.hash !== tx) return { ok: false, why: 'unreachable' };
  const v = cardanoVerdict(t, { payTo: p.payTo, unit: unitOf(p.token), want, ref: payRef(p.statementSig, p.payTo) });
  return v.ok ? { ok: true, tx, paid: v.paid, confirmations: t.confirmations } : v;
};
