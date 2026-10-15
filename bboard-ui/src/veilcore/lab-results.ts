// Lab reports that come back locked to the breeder and signed by the lab.
//
// Before: a lab emailed a PDF. Anyone it passed through could read it, nothing showed
// which lab it came from, and nothing tied it to the sample.
//
// Now:
//   1. Each delivery has its own lock, made from the plant's record secret (which never
//      leaves the breeder's devices, and is in their backup file) and the delivery's id.
//      Sending to a lab puts the lock's public half in the lab code. One lock per
//      delivery (round 2): two labs sent the same plant hold different locks, so a report
//      can be tied to the delivery it was locked for. Codes made before this carry the
//      per-plant lock, and the breeder's browser still opens those.
//   2. The lab's browser signs the report's fingerprint with the lab's key (an
//      attestation, public) and locks the report with the breeder's lock. The registry
//      stores only the locked file; it refuses anything else.
//   3. The breeder's browser opens it with the plant's secret and accepts it as the lab's
//      only if its fingerprint matches one that lab signed.
//
// The lock is the open `age` format (age-encryption.org, by Filippo Valsorda), X25519.
// Anyone can open a result with the free `age` tool and the key from the backup, so
// nothing is tied to VeilCore. The lock came to the lab in the code the breeder sent,
// not from the registry, so the registry never had a chance to hand the lab its own.
// SPDX-License-Identifier: Apache-2.0

import { Decrypter, Encrypter, identityToRecipient } from 'age-encryption';
import { bech32 } from '@scure/base';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { holderKey } from './holder';
import { userFacingError } from './transfers';
import { readJson, isObject, isString, isNumber, optional } from './json';

const BASE = import.meta.env.VITE_API_BASE ?? '';
const INFO = 'veilcore:v1:lab-results:x25519';
/** The HKDF label: per delivery when there is a transfer id, per plant for older codes. */
const infoFor = (transferId?: string): Uint8Array =>
  new TextEncoder().encode(transferId ? `${INFO}:${transferId.toUpperCase()}` : INFO);
/** An age X25519 recipient: "age1" and 58 bech32 characters. */
export const RECIPIENT = /^age1[02-9ac-hj-np-z]{58}$/;

const bytesOf = (hex: string): Uint8Array => Uint8Array.from(hex.match(/../g) ?? [], (b) => parseInt(b, 16));
const hexOf = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/**
 * The unlock key (age identity) for one delivery of a plant, made from its record secret
 * and the delivery's id. Without a transfer id: the per-plant key older codes used.
 * Never sent anywhere.
 */
export const resultIdentityFor = (recordSecretHex: string, transferId?: string): string => {
  if (!/^[0-9a-f]{64}$/i.test(recordSecretHex)) throw new Error('not a record secret');
  const scalar = hkdf(sha256, bytesOf(recordSecretHex), undefined, infoFor(transferId), 32);
  return bech32.encodeFromBytes('AGE-SECRET-KEY-', scalar).toUpperCase();
};

/** The lock (age recipient) for one delivery, safe to give the lab. */
export const resultRecipientFor = (recordSecretHex: string, transferId?: string): Promise<string> =>
  identityToRecipient(resultIdentityFor(recordSecretHex, transferId));

/** The report's fingerprint: SHA-256 of its bytes, hex. What the lab signs. */
export const reportFingerprint = (bytes: Uint8Array): string => hexOf(sha256(bytes));

/** Lock a report so only the plant's holder can open it. */
export const lockReport = async (bytes: Uint8Array, recipient: string): Promise<Uint8Array> => {
  if (!RECIPIENT.test(recipient)) throw new Error('The lab code has no lock for lab reports in it.');
  const e = new Encrypter();
  e.addRecipient(recipient);
  return e.encrypt(bytes);
};

/**
 * Open a locked report with the plant's record secret: the delivery's own key first, then
 * the per-plant key codes made before per-delivery locks used. Throws if it was locked
 * for neither.
 */
export const openReport = async (
  locked: Uint8Array,
  recordSecretHex: string,
  transferId?: string,
): Promise<Uint8Array> => {
  const d = new Decrypter();
  if (transferId) d.addIdentity(resultIdentityFor(recordSecretHex, transferId));
  d.addIdentity(resultIdentityFor(recordSecretHex));
  try {
    return await d.decrypt(locked);
  } catch {
    throw new Error('This lab report was not locked for this plant, or the file is damaged.');
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
  /** The breeder's lock, from the lab code. Missing for codes made before locks. */
  readonly recipient?: string;
  readonly receivedAt: number;
  /** The signed receipt this browser tied to the delivery (transfers.ts attachReceipt). */
  readonly receiptLinked?: string;
};

const isDelivery = (v: unknown): v is LabDelivery =>
  isObject(v) &&
  isString(v.transferId) &&
  isString(v.receivedRecordId) &&
  optional(v.sourceRecordId, isString) &&
  optional(v.sourceCommitment, isString) &&
  optional(v.recipient, isString) &&
  isNumber(v.receivedAt) &&
  optional(v.receiptLinked, isString);

const readDeliveries = (): Record<string, LabDelivery> => {
  try {
    const raw = localStorage.getItem(DELIVERIES);
    const v: unknown = raw ? JSON.parse(raw) : {};
    if (!isObject(v)) return {};
    return Object.fromEntries(Object.entries(v).filter(([id, d]) => isDelivery(d) && d.transferId === id)) as Record<
      string,
      LabDelivery
    >;
  } catch {
    return {};
  }
};

/** Every delivery this browser received, by transfer id (for the backup). */
export const allDeliveries = (): Record<string, LabDelivery> => readDeliveries();

/**
 * Add deliveries from a backup. One already here is kept as it is, even if the file's
 * differs: a lock this browser already has is never replaced. Returns how many were added.
 */
export const mergeDeliveries = (incoming: unknown): number => {
  if (!isObject(incoming)) return 0;
  const here = readDeliveries();
  let added = 0;
  for (const [id, d] of Object.entries(incoming)) {
    if (!isDelivery(d) || d.transferId !== id || here[id]) continue;
    here[id] = d;
    added++;
  }
  if (added) {
    try {
      localStorage.setItem(DELIVERIES, JSON.stringify(here));
    } catch {
      return 0;
    }
  }
  return added;
};

/** Things that are only in this browser and should be in a backup that says it holds them. */
export const deliveriesMissingFrom = (inFile: unknown): string[] => {
  const file = isObject(inFile) ? inFile : {};
  return Object.values(readDeliveries())
    .filter((d) => {
      const f = file[d.transferId];
      return !isDelivery(f) || f.recipient !== d.recipient || f.receivedRecordId !== d.receivedRecordId;
    })
    .map((d) => d.transferId);
};

export const rememberDelivery = (d: LabDelivery): void => {
  try {
    localStorage.setItem(DELIVERIES, JSON.stringify({ ...readDeliveries(), [d.transferId]: d }));
  } catch {
    /* private window: the lab can paste the code again when sending results */
  }
};

/**
 * Note that the lab's signed receipt is tied to its delivery. A delivery this browser has
 * no note of (received in another browser) is noted from the record.
 */
export const markReceiptLinked = (base: LabDelivery, attestationId: string): void => {
  const here = readDeliveries()[base.transferId] ?? base;
  rememberDelivery({ ...here, receiptLinked: attestationId });
};

/** The delivery a received record came from, if this browser received it. */
export const deliveryForRecord = (receivedRecordId: string): LabDelivery | undefined =>
  Object.values(readDeliveries()).find((d) => d.receivedRecordId === receivedRecordId);

// --- the registry ----------------------------------------------------------------------

export type ResultSummary = {
  readonly id: string;
  readonly size: number;
  /** SHA-256 of the locked file (not of the report: locking is randomised). */
  readonly sha256: string;
  readonly attestationId?: string;
  readonly createdAt: number;
  /** Set when the lab withdrew it: the file is gone, the row stays so the breeder sees it. */
  readonly withdrawnAt?: number;
  /** The result this one corrects. */
  readonly replaces?: string;
};

const isSummary = (v: unknown): v is ResultSummary =>
  isObject(v) &&
  isString(v.id) &&
  isNumber(v.size) &&
  isString(v.sha256) &&
  optional(v.attestationId, isString) &&
  isNumber(v.createdAt) &&
  optional(v.withdrawnAt, isNumber) &&
  optional(v.replaces, isString);

/** Most results a delivery takes, not counting withdrawn ones (the registry's limit, lineage/lab-results.mjs). */
export const RESULT_CAP = 5;
/** Most rows a delivery keeps, withdrawn ones included, so withdraw-and-resend has an end. */
export const RESULT_ROWS_CAP = 20;

export type ResultState = 'live' | 'withdrawn' | 'replaced';

/**
 * Where one result stands: replaced by a newer one, withdrawn by the lab, or live.
 *
 * Replaced stays replaced (round 3). It used to count only while the correction stood, so
 * withdrawing a correction brought the old report back as live, though the lab had
 * withdrawn its signature on it as superseded. Withdrawing a correction now leaves the
 * delivery with no live report from that line, which is what the lab did.
 */
export const resultState = (r: ResultSummary, all: readonly ResultSummary[]): ResultState =>
  all.some((o) => o.id !== r.id && o.replaces === r.id)
    ? 'replaced'
    : r.withdrawnAt !== undefined
      ? 'withdrawn'
      : 'live';

/** The reports that still stand on a delivery: what "N sent" counts. */
export const liveResults = (all: readonly ResultSummary[]): ResultSummary[] =>
  all.filter((r) => resultState(r, all) === 'live');

/**
 * What the lab's own list says about one report it sent. A report it signed and then
 * withdrew or replaced says so, never "not signed by the key in this browser" (round 3).
 */
export const sentRowWords = (
  state: ResultState,
  r: ResultSummary,
  mine: { signed: ReadonlyMap<string, string>; retracted: ReadonlySet<string> } | null,
): string => {
  if (state === 'replaced') return 'Replaced by your corrected file.';
  if (state === 'withdrawn')
    return `Withdrawn on ${new Date(r.withdrawnAt ?? r.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}.`;
  if (!mine) return '';
  const fp = r.attestationId ? mine.signed.get(r.attestationId) : undefined;
  if (fp) return `Signed by your key · fingerprint ${fp.slice(0, 8)}…${fp.slice(-6)}`;
  if (r.attestationId && mine.retracted.has(r.attestationId))
    return 'Your signature on it is withdrawn, but the file is still with the registry. Withdraw it to finish.';
  return 'Not signed by the key in this browser.';
};

/**
 * Why a report can't be sent on this delivery, checked BEFORE anything is signed, or
 * null. `signedHere` maps this delivery's attestation ids to the report fingerprint each
 * signed (from the lab's own verified, unretracted signatures).
 */
export const sendRefusal = (
  sha: string,
  results: readonly ResultSummary[],
  signedHere: ReadonlyMap<string, string>,
  replaces?: string,
): string | null => {
  const live = liveResults(results);
  if (replaces && !live.some((r) => r.id === replaces)) {
    return 'The lab report you are correcting has already been withdrawn or replaced.';
  }
  if (live.some((r) => r.attestationId && signedHere.get(r.attestationId) === sha)) {
    return 'You already sent this exact file on this delivery. Nothing was signed.';
  }
  if (results.filter((r) => !r.withdrawnAt).length >= RESULT_CAP) {
    return `This delivery already has ${RESULT_CAP} lab reports, the most it can take. Withdraw one first. Nothing was signed.`;
  }
  if (results.length >= RESULT_ROWS_CAP) {
    return 'This delivery has had as many lab reports as it can take, withdrawn ones included. Ask the breeder for a new lab code. Nothing was signed.';
  }
  return null;
};

const errorOf = async (res: Response): Promise<string> => {
  const body = await readJson(res).catch(() => undefined);
  return isObject(body) && isString(body.error) ? userFacingError(body.error) : `the registry answered ${res.status}`;
};
const unreachable = 'could not reach the VeilCore registry; check your connection and try again';

/** The lab sends a locked result on the delivery it received; `replaces` names one it corrects. */
export const sendLockedResult = async (
  transferId: string,
  locked: Uint8Array,
  attestationId?: string,
  replaces?: string,
): Promise<{ id: string } | { error: string }> => {
  const params = new URLSearchParams();
  if (attestationId) params.set('attestationId', attestationId);
  if (replaces) params.set('replaces', replaces);
  const q = params.toString() ? `?${params.toString()}` : '';
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

/** A registry's null is the same as absent. */
const normalise = (r: ResultSummary): ResultSummary => {
  const out: Record<string, unknown> = { ...r };
  for (const k of Object.keys(out)) if (out[k] === null) delete out[k];
  return out as ResultSummary;
};

export type ResultList = {
  readonly results: ResultSummary[];
  /**
   * The record the lab's claim created, when the registry says (the sender's view). The
   * breeder looks up its public fingerprint to find the lab's receipt for THIS delivery.
   */
  readonly receivedRecord?: string;
  /** The lab's receipt tied to this delivery (the sender's view), when there is one. */
  readonly receiptAttestationId?: string;
};

/** The results on a delivery (sender or receiver), withdrawn ones included. */
export const listResults = async (transferId: string): Promise<ResultList | { error: string }> => {
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
  return {
    results: body.results.filter(isSummary).map(normalise),
    ...(isString(body.receivedRecord) ? { receivedRecord: body.receivedRecord } : {}),
    ...(isString(body.receiptAttestationId) ? { receiptAttestationId: body.receiptAttestationId } : {}),
  };
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

/** Remove a result's file: the lab withdrawing it (after retracting its signature), or the sender. */
export const deleteResult = async (transferId: string, resultId: string): Promise<{ ok: true } | { error: string }> => {
  let res: Response;
  try {
    res = await fetch(`${BASE}/transfers/${encodeURIComponent(transferId)}/results/${encodeURIComponent(resultId)}`, {
      method: 'DELETE',
      headers: { 'x-holder-key': holderKey() },
    });
  } catch {
    return { error: unreachable };
  }
  if (!res.ok) return { error: await errorOf(res) };
  return { ok: true };
};

/** Something about a plant's lab work changed here (a receipt signed, a lab report sent or withdrawn). */
export const LAB_CHANGED_EVENT = 'veilcore:lab-changed';
export const labChanged = (): void => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(LAB_CHANGED_EVENT));
};

// --- which reports the breeder has opened on this device --------------------------------

const OPENED = 'veilcore.opened-results.v1';

const readOpened = (): Record<string, number> => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(OPENED) ?? '{}');
    return isObject(v) ? (v as Record<string, number>) : {};
  } catch {
    return {};
  }
};

export const wasOpened = (resultId: string): boolean => resultId in readOpened();

export const markOpened = (resultId: string): void => {
  try {
    localStorage.setItem(OPENED, JSON.stringify({ ...readOpened(), [resultId]: Date.now() }));
  } catch {
    /* private window: it shows as not opened again next time, which is harmless */
  }
};

// --- naming a lab report the same way on both sides (round 5) ----------------------------

/** A short, readable id for a lab report, the same on the breeder's and the lab's lists: "LR-3F2A". */
export const shortResultId = (resultId: string): string => {
  const hex = resultId.replace(/^LR-/i, '').replace(/[^0-9a-f]/gi, '');
  return `LR-${(hex || resultId).slice(0, 4).toUpperCase()}`;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** A time on a lab report screen: local, with the zone's short name (time.ts). */
export { localStamp } from './time';

/** A downloaded lab report's name: local date, time and its short id, so two never share one. */
export const reportFileName = (bytes: Uint8Array, at: number, resultId: string): string => {
  const head = new TextDecoder().decode(bytes.slice(0, 8));
  const ext = head.startsWith('%PDF')
    ? 'pdf'
    : bytes[0] === 0x89 && head.slice(1, 4) === 'PNG'
      ? 'png'
      : bytes[0] === 0xff && bytes[1] === 0xd8
        ? 'jpg'
        : head.startsWith('PK')
          ? 'zip'
          : 'bin';
  const d = new Date(at);
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}-${pad(d.getMinutes())}`;
  return `Lab report ${stamp} ${shortResultId(resultId)}.${ext}`;
};

/** Said before a lab withdraws a correction (round 5): nothing from it stands afterwards. */
export const WITHDRAW_CORRECTION_WARNING =
  'The original stays replaced. The breeder will have no live report from you until you send one.';
