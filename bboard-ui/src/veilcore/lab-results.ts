// Lab results that come back locked to the breeder and signed by the lab.
//
// Before: a lab emailed a PDF. Anyone it passed through could read it, nothing showed
// which lab it came from, and nothing tied it to the sample.
//
// Now:
//   1. Each plant has a lock made from its own record secret (which never leaves the
//      breeder's devices, and is in their backup file). Sending to a lab puts the lock's
//      public half in the delivery code.
//   2. The lab's browser signs the report's fingerprint with the lab's key (an
//      attestation, public) and locks the report with the breeder's lock. The registry
//      stores only the locked file; it refuses anything else.
//   3. The breeder's browser opens it with the plant's secret and accepts it as the lab's
//      only if its fingerprint matches one that lab signed.
//
// The lock is the open `age` format (age-encryption.org, by Filippo Valsorda), X25519.
// Anyone can open a result with the free `age` tool and the plant's key from the backup,
// so nothing is tied to VeilCore. The lock came to the lab in the code the breeder sent,
// not from the registry, so the registry never had a chance to hand the lab its own.
// SPDX-License-Identifier: Apache-2.0

import { Decrypter, Encrypter, identityToRecipient } from 'age-encryption';
import { bech32 } from '@scure/base';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { holderKey } from './holder';
import { readJson, isObject, isString, isNumber, optional } from './json';

const BASE = import.meta.env.VITE_API_BASE ?? '';
const INFO = new TextEncoder().encode('veilcore:v1:lab-results:x25519');
/** An age X25519 recipient: "age1" and 58 bech32 characters. */
export const RECIPIENT = /^age1[02-9ac-hj-np-z]{58}$/;

const bytesOf = (hex: string): Uint8Array => Uint8Array.from(hex.match(/../g) ?? [], (b) => parseInt(b, 16));
const hexOf = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/** The plant's own unlock key (age identity), made from its record secret. Never sent anywhere. */
export const resultIdentityFor = (recordSecretHex: string): string => {
  if (!/^[0-9a-f]{64}$/i.test(recordSecretHex)) throw new Error('not a record secret');
  const scalar = hkdf(sha256, bytesOf(recordSecretHex), undefined, INFO, 32);
  return bech32.encodeFromBytes('AGE-SECRET-KEY-', scalar).toUpperCase();
};

/** The plant's lock (age recipient), safe to give the lab. */
export const resultRecipientFor = (recordSecretHex: string): Promise<string> =>
  identityToRecipient(resultIdentityFor(recordSecretHex));

/** The report's fingerprint: SHA-256 of its bytes, hex. What the lab signs. */
export const reportFingerprint = (bytes: Uint8Array): string => hexOf(sha256(bytes));

/** Lock a report so only the plant's holder can open it. */
export const lockReport = async (bytes: Uint8Array, recipient: string): Promise<Uint8Array> => {
  if (!RECIPIENT.test(recipient)) throw new Error('The delivery code has no lock for results in it.');
  const e = new Encrypter();
  e.addRecipient(recipient);
  return e.encrypt(bytes);
};

/** Open a locked result with the plant's record secret. Throws if it wasn't locked for this plant. */
export const openReport = async (locked: Uint8Array, recordSecretHex: string): Promise<Uint8Array> => {
  const d = new Decrypter();
  d.addIdentity(resultIdentityFor(recordSecretHex));
  try {
    return await d.decrypt(locked);
  } catch {
    throw new Error('This result was not locked for this plant, or the file is damaged.');
  }
};

// --- the lab's side: deliveries it received, and the lock each came with ----------------

const DELIVERIES = 'veilcore.lab-deliveries.v1';

export type LabDelivery = {
  readonly transferId: string;
  readonly receivedRecordId: string;
  readonly sourceRecordId?: string;
  /** The breeder's record fingerprint the results are about (what the lab signs over). */
  readonly sourceCommitment?: string;
  /** The breeder's lock, from the delivery code. Missing for codes made before locks. */
  readonly recipient?: string;
  readonly receivedAt: number;
};

const readDeliveries = (): Record<string, LabDelivery> => {
  try {
    const raw = localStorage.getItem(DELIVERIES);
    const v: unknown = raw ? JSON.parse(raw) : {};
    return isObject(v) ? (v as Record<string, LabDelivery>) : {};
  } catch {
    return {};
  }
};

export const rememberDelivery = (d: LabDelivery): void => {
  try {
    localStorage.setItem(DELIVERIES, JSON.stringify({ ...readDeliveries(), [d.transferId]: d }));
  } catch {
    /* private window: the lab can paste the code again when sending results */
  }
};

/** The delivery a received record came from, if this browser received it. */
export const deliveryForRecord = (receivedRecordId: string): LabDelivery | undefined =>
  Object.values(readDeliveries()).find((d) => d.receivedRecordId === receivedRecordId);

// --- the registry ----------------------------------------------------------------------

export type ResultSummary = {
  readonly id: string;
  readonly size: number;
  readonly sha256: string;
  readonly attestationId?: string;
  readonly createdAt: number;
};

const isSummary = (v: unknown): v is ResultSummary =>
  isObject(v) &&
  isString(v.id) &&
  isNumber(v.size) &&
  isString(v.sha256) &&
  optional(v.attestationId, isString) &&
  isNumber(v.createdAt);

const errorOf = async (res: Response): Promise<string> => {
  const body = await readJson(res).catch(() => undefined);
  return isObject(body) && isString(body.error) ? body.error : `the registry answered ${res.status}`;
};
const unreachable = 'could not reach the VeilCore registry; check your connection and try again';

/** The lab sends a locked result on the delivery it received. */
export const sendLockedResult = async (
  transferId: string,
  locked: Uint8Array,
  attestationId?: string,
): Promise<{ id: string } | { error: string }> => {
  const q = attestationId ? `?attestationId=${encodeURIComponent(attestationId)}` : '';
  let res: Response;
  try {
    res = await fetch(`${BASE}/transfers/${encodeURIComponent(transferId)}/results${q}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', 'x-holder-key': holderKey() },
      body: locked as unknown as BodyInit,
    });
  } catch {
    return { error: unreachable };
  }
  if (!res.ok) return { error: await errorOf(res) };
  const body = await readJson(res).catch(() => undefined);
  return isObject(body) && isString(body.id) ? { id: body.id } : { error: 'unexpected response from the registry' };
};

/** The results on a delivery (sender or receiver). */
export const listResults = async (transferId: string): Promise<ResultSummary[] | { error: string }> => {
  let res: Response;
  try {
    res = await fetch(`${BASE}/transfers/${encodeURIComponent(transferId)}/results`, {
      headers: { 'x-holder-key': holderKey() },
      cache: 'no-store',
    });
  } catch {
    return { error: unreachable };
  }
  if (!res.ok) return { error: await errorOf(res) };
  const body = await readJson(res).catch(() => undefined);
  if (!isObject(body) || !Array.isArray(body.results)) return { error: 'unexpected response from the registry' };
  return body.results.filter(isSummary);
};

/** One locked file (sender only). */
export const fetchLockedResult = async (
  transferId: string,
  resultId: string,
): Promise<Uint8Array | { error: string }> => {
  let res: Response;
  try {
    res = await fetch(`${BASE}/transfers/${encodeURIComponent(transferId)}/results/${encodeURIComponent(resultId)}`, {
      headers: { 'x-holder-key': holderKey() },
      cache: 'no-store',
    });
  } catch {
    return { error: unreachable };
  }
  if (!res.ok) return { error: await errorOf(res) };
  return new Uint8Array(await res.arrayBuffer());
};
