// Paying a royalty statement through a payment partner (docs/PAYMENT-PARTNERS.md).
//
// VeilCore never moves money. The payer's page hands the partner a payment request: the
// statement as the licensee signed it and the payout details as the licensor signed them,
// with both public keys, so the partner can check the money goes where the licensor said
// and nowhere else. After paying, the partner files a receipt signed with its registered key
// (registry lineage/payment-receipts.mjs). Both pages read the receipts and check every
// signature themselves: the registry is not believed.
// SPDX-License-Identifier: Apache-2.0

import { ed25519 } from '@noble/curves/ed25519.js';
import { canonicalise } from 'veilcore-records';
import { isObject, isString, readJson } from './json';
import type { DealEntry } from './deal-client';

const BASE = import.meta.env.VITE_API_BASE ?? '';
/** Where receipts are filed: this site's registry. */
export const REGISTRY_BASE = BASE;
const HEX64 = /^[0-9a-f]{64}$/;
const bytes = (h: string): Uint8Array => Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));

export const PAYMENT_REQUEST_VERSION = 'veilcore/payment-request/v1';
export const RECEIPT_VERSION = 'veilcore/payment-receipt/v1';

type Signed<T> = {
  readonly message: T;
  readonly signature: string;
  readonly signer: string;
  readonly fingerprint: string;
};

/** What a payer hands a payment partner. Everything in it is signed by whoever wrote it. */
export type PaymentRequest = {
  readonly v: typeof PAYMENT_REQUEST_VERSION;
  /** Where receipts are filed, and how the deal messages are checked: docs/PAYMENT-PARTNERS.md. */
  readonly registry: string;
  readonly pay: { readonly amount: string; readonly currency: string; readonly to: string; readonly method: string };
  readonly statement: Signed<Omit<DealEntry, 'seq' | 'fingerprint' | 'receivedAt' | 'signature' | 'mine'>>;
  readonly payout: Signed<Omit<DealEntry, 'seq' | 'fingerprint' | 'receivedAt' | 'signature' | 'mine'>>;
};

/** The message as its sender signed it: without what the registry and this page added. */
const strip = (e: DealEntry) =>
  Object.fromEntries(
    Object.entries(e).filter(([k]) => !['seq', 'fingerprint', 'receivedAt', 'signature', 'mine'].includes(k)),
  ) as Omit<DealEntry, 'seq' | 'fingerprint' | 'receivedAt' | 'signature' | 'mine'>;

/** The request for one accepted statement. The licensee's key signed it; the licensor's signed where to pay. */
export const paymentRequest = (
  statement: DealEntry,
  payout: DealEntry,
  keys: { licensee: string; issuer: string },
  registry: string,
): PaymentRequest => {
  if (statement.type !== 'statement' || payout.type !== 'payout')
    throw new Error('Not a statement and its payout details.');
  return {
    v: PAYMENT_REQUEST_VERSION,
    registry,
    pay: { amount: statement.amountOwed, currency: statement.currency, to: payout.account, method: payout.method },
    statement: {
      message: strip(statement),
      signature: statement.signature,
      signer: keys.licensee,
      fingerprint: statement.fingerprint,
    },
    payout: {
      message: strip(payout),
      signature: payout.signature,
      signer: keys.issuer,
      fingerprint: payout.fingerprint,
    },
  };
};

export const downloadPaymentRequest = (r: PaymentRequest): void => {
  const m = r.statement.message as { statementId?: string };
  const id = (m.statementId ?? 'statement').slice(0, 8);
  const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `veilcore-payment-request-${id}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export type Receipt = {
  readonly v: typeof RECEIPT_VERSION;
  readonly statementFingerprint: string;
  readonly statementId: string;
  readonly amount: string;
  readonly currency: string;
  readonly payTo: string;
  readonly reference: string;
  readonly paidAt: string;
  readonly partner: string;
};

/** A receipt this page checked itself, with what the registry says of the partner. */
export type CheckedReceipt = {
  readonly receipt: Receipt;
  readonly partnerName?: string;
  readonly nameChecked: boolean;
  /** Where the receipt differs from the statement or the payout details: shown, never hidden. */
  readonly mismatch: readonly string[];
};

export const receiptVerifies = (r: Receipt, signature: string): boolean => {
  try {
    if (!HEX64.test(r.partner) || !/^[0-9a-f]{128}$/.test(signature)) return false;
    return ed25519.verify(
      bytes(signature),
      new TextEncoder().encode(`${RECEIPT_VERSION}\n${canonicalise(r)}`),
      bytes(r.partner),
    );
  } catch {
    return false;
  }
};

/** The receipts filed for a statement: only those whose signature checks out here. */
export const receiptsFor = async (statement: DealEntry, payTo: string | undefined): Promise<CheckedReceipt[]> => {
  if (statement.type !== 'statement' || !HEX64.test(statement.fingerprint)) return [];
  const res = await fetch(`${BASE}/payment-receipts/${statement.fingerprint}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const body = await readJson(res).catch(() => undefined);
  const list = isObject(body) && Array.isArray(body.receipts) ? body.receipts : [];
  const out: CheckedReceipt[] = [];
  for (const x of list) {
    if (!isObject(x) || !isObject(x.receipt) || !isString(x.signature)) continue;
    const r = x.receipt as unknown as Receipt;
    if (r.v !== RECEIPT_VERSION || r.statementFingerprint !== statement.fingerprint) continue;
    if (!receiptVerifies(r, x.signature)) continue;
    const mismatch: string[] = [];
    if (r.statementId !== statement.statementId) mismatch.push('it names another statement');
    if (r.currency !== statement.currency) mismatch.push(`paid in ${r.currency}, owed in ${statement.currency}`);
    else if (Number(r.amount) !== Number(statement.amountOwed))
      mismatch.push(`paid ${r.amount}, owed ${statement.amountOwed}`);
    if (payTo !== undefined && r.payTo !== payTo) mismatch.push(`paid to ${r.payTo}, not the account they gave`);
    const p = isObject(x.partner) ? x.partner : undefined;
    out.push({
      receipt: r,
      ...(p && isString(p.displayName) ? { partnerName: p.displayName } : {}),
      nameChecked: p?.nameChecked === true,
      mismatch,
    });
  }
  return out;
};
