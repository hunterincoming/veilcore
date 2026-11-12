// The licensee's own Cardano wallet pays a royalty in a stablecoin (veilcore/cardano-pay.ts).
//
// A CIP-30 wallet (window.cardano.<id>: Lace, Eternl...) signs and submits, but doesn't build:
// the page builds the unsigned transfer from the wallet's own coins and the wallet shows it,
// asks, signs and sends it. The builder is EMURGO's cardano-serialization-lib (one package, no
// dependencies of its own, MIT), loaded only on this screen. The transfer has one output to
// the licensor's signed address carrying the token and the minimum ada Cardano requires with
// it, change back to the wallet, and the CIP-20 reference. VeilCore is not an output and holds
// no key.
//
// Before anything is built, both sides' addresses are screened against the bundled sanctions
// list (veilcore/sanctions.ts); a match or an address that can't be read stops the payment.
// SPDX-License-Identifier: Apache-2.0

import { enT, type Translator } from '../i18n/translate';
import { screenAddresses } from './sanctions';
import { cardanoAddressProblem, cardanoNetworkOf, type CardanoToken } from './cardano-pay';
import { NETWORK } from '../config/network';

type CSL = typeof import('@emurgo/cardano-serialization-lib-browser');

/** What this page uses of a CIP-30 wallet's API. Addresses and coins come as hex CBOR. */
export type Cip30Api = {
  getNetworkId(): Promise<number>;
  getUtxos(): Promise<string[] | null | undefined>;
  getChangeAddress(): Promise<string>;
  getUsedAddresses(): Promise<string[]>;
  signTx(tx: string, partialSign?: boolean): Promise<string>;
  submitTx(tx: string): Promise<string>;
};

export type Cip30Entry = { readonly id: string; readonly name: string; readonly enable: () => Promise<Cip30Api> };

/** The CIP-30 wallets this browser has (window.cardano.<id> with an enable function). */
export const findCardanoWallets = (root: unknown = (globalThis as { cardano?: unknown }).cardano): Cip30Entry[] => {
  if (typeof root !== 'object' || root === null) return [];
  const out: Cip30Entry[] = [];
  const seen = new Set<unknown>();
  for (const [id, w] of Object.entries(root as Record<string, unknown>)) {
    if (typeof w !== 'object' || w === null || seen.has(w)) continue;
    const v = w as Record<string, unknown>;
    if (typeof v.enable !== 'function') continue;
    seen.add(w);
    out.push({
      id,
      name: typeof v.name === 'string' && v.name.trim() ? v.name.trim().slice(0, 40) : id,
      enable: () => (v.enable as () => Promise<Cip30Api>).call(w),
    });
  }
  return out;
};

/**
 * Cardano's protocol parameters for fees and the minimum ada with a token, as on mainnet and
 * preprod since the Conway era (cardano-node protocol parameters: txFeePerByte 44,
 * txFeeFixed 155381, utxoCostPerByte 4310, maxTxSize 16384, maxValueSize 5000,
 * minFeeRefScriptCostPerByte 15). If they change, a transfer built with these is refused by
 * the network before anything moves; the page says so and nothing is paid.
 */
export const PROTOCOL = {
  feePerByte: '44',
  feeFixed: '155381',
  coinsPerUtxoByte: '4310',
  maxTxSize: 16384,
  maxValueSize: 5000,
  keyDeposit: '2000000',
  poolDeposit: '500000000',
  refScriptPerByte: 15,
} as const;

const fromHex = (h: string): Uint8Array => Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16));

/**
 * The unsigned transfer: `units` of the token to `recipient` with the minimum ada, change to
 * `change`, and the reference as CIP-20 metadata. Coins are picked from the wallet's own,
 * largest first. Pure given the library, so the tests build it with the same code.
 */
export const buildPayment = (
  C: CSL,
  p: {
    utxos: readonly string[];
    change: string;
    recipient: string;
    token: Pick<CardanoToken, 'policyId' | 'assetName'>;
    units: bigint;
    ref: string;
  },
): { readonly tx: string; readonly hash: string } => {
  const big = (s: string | bigint) => C.BigNum.from_str(String(s));
  const cfg = C.TransactionBuilderConfigBuilder.new()
    .fee_algo(C.LinearFee.new(big(PROTOCOL.feePerByte), big(PROTOCOL.feeFixed)))
    .coins_per_utxo_byte(big(PROTOCOL.coinsPerUtxoByte))
    .pool_deposit(big(PROTOCOL.poolDeposit))
    .key_deposit(big(PROTOCOL.keyDeposit))
    .max_tx_size(PROTOCOL.maxTxSize)
    .max_value_size(PROTOCOL.maxValueSize)
    .ref_script_coins_per_byte(C.UnitInterval.new(big(String(PROTOCOL.refScriptPerByte)), big('1')))
    .build();
  const tb = C.TransactionBuilder.new(cfg);
  const assets = C.Assets.new();
  assets.insert(C.AssetName.new(fromHex(p.token.assetName)), big(p.units));
  const ma = C.MultiAsset.new();
  ma.insert(C.ScriptHash.from_hex(p.token.policyId), assets);
  tb.add_output(
    C.TransactionOutputBuilder.new()
      .with_address(C.Address.from_bech32(p.recipient.trim()))
      .next()
      .with_asset_and_min_required_coin_by_utxo_cost(ma, C.DataCost.new_coins_per_byte(big(PROTOCOL.coinsPerUtxoByte)))
      .build(),
  );
  tb.add_json_metadatum(big('674'), JSON.stringify({ msg: [p.ref] }));
  const coins = C.TransactionUnspentOutputs.new();
  for (const u of p.utxos) coins.add(C.TransactionUnspentOutput.from_hex(u));
  tb.add_inputs_from(coins, C.CoinSelectionStrategyCIP2.LargestFirstMultiAsset);
  tb.add_change_if_needed(C.Address.from_hex(p.change));
  const tx = tb.build_tx();
  const hex = tx.to_hex();
  return { tx: hex, hash: C.FixedTransaction.from_hex(hex).transaction_hash().to_hex() };
};

/** The signed transaction: the wallet's witnesses put on the exact body that was built. */
export const withWitnesses = (C: CSL, unsigned: string, witnesses: string): { tx: string; hash: string } => {
  const fixed = C.FixedTransaction.from_hex(unsigned);
  fixed.set_witness_set(fromHex(witnesses));
  return { tx: fixed.to_hex(), hash: fixed.transaction_hash().to_hex() };
};

/** A CIP-30 address (hex) in Bech32, for the screen and for showing. */
export const bech32Of = (C: CSL, addressHex: string): string => C.Address.from_hex(addressHex).to_bech32();

export class SanctionsStop extends Error {}

/**
 * Pay `units` of `token` to `recipient` from the licensee's wallet, with the reference. The
 * hash is handed to `onSigned` before the transfer is sent, so a page closed mid-way offers to
 * record the payment, never to pay again (onchain-pay.ts keepSent). Returns the hash.
 */
export const payOnCardano = async (
  wallet: Cip30Entry,
  p: { token: CardanoToken; units: bigint; recipient: string; ref: string },
  deps: {
    onSigned: (hash: string) => void;
    csl?: CSL;
    network?: string;
    tr?: Translator;
    screen?: typeof screenAddresses;
  },
): Promise<string> => {
  const tr = deps.tr ?? enT;
  const network = deps.network ?? NETWORK;
  const bad = cardanoAddressProblem(p.recipient, network, tr);
  if (bad) throw new Error(bad);
  const api = await wallet.enable();
  const wantId = cardanoNetworkOf(network) === 'mainnet' ? 1 : 0;
  if ((await api.getNetworkId()) !== wantId)
    throw new Error(tr.t('app.rpay.w.otherNetwork', { network: cardanoNetworkOf(network) }));
  const C = deps.csl ?? (await import('@emurgo/cardano-serialization-lib-browser'));
  const change = await api.getChangeAddress();
  const used = (await api.getUsedAddresses()) ?? [];
  // Both sides, before anything is built: the payee's address and every one the payer uses.
  const screened = (deps.screen ?? screenAddresses)([p.recipient, change, ...used]);
  if (!screened.clear) throw new SanctionsStop(tr.t('app.rpay.w.sanctioned'));
  const utxos = (await api.getUtxos()) ?? [];
  if (utxos.length === 0) throw new Error(tr.t('app.rpay.w.noCoins'));
  let built: { tx: string; hash: string };
  try {
    built = buildPayment(C, { utxos, change, recipient: p.recipient, token: p.token, units: p.units, ref: p.ref });
  } catch (e) {
    throw new Error(tr.t('app.rpay.w.cantBuild', { why: e instanceof Error ? e.message : String(e) }));
  }
  const witnesses = await api.signTx(built.tx, false);
  const signed = withWitnesses(C, built.tx, witnesses);
  deps.onSigned(signed.hash);
  await api.submitTx(signed.tx);
  return signed.hash;
};
