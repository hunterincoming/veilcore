// Sending a cultivar to someone.
//
// This is the moment provenance is actually established. Everything before a transfer
// is the holder's own claim; a transfer is the first point a second party is involved,
// and their confirmation of receipt is what makes the record evidence rather than a
// note someone wrote about themselves.
//
// SPDX-License-Identifier: Apache-2.0

import { canonicalise, sha256Hex } from 'veilcore-records';
import { holderKey, holderKeyIfAny } from './holder';
import { readJson, isObject, isString, isNumber, optional, arrayField } from './json';
import { attestRecord, type AttesterProfile } from './attester-keys';

const BASE = import.meta.env.VITE_API_BASE ?? '';

/**
 * The public pending list no longer carries the source record, quantity or note
 * (attack round 11): they are optional here so either server version parses. The sent
 * list, which needs the holder key, still has the source.
 */
export type PendingTransfer = {
  readonly id: string;
  readonly source_record?: string;
  readonly to_handle: string;
  readonly created_at: number;
  readonly quantity?: string;
  readonly note?: string;
};

export type SentTransfer = PendingTransfer & {
  readonly claimed_at?: number;
  /** What the breeder wrote about the sample when making the lab code (sender only). */
  readonly sample_custody?: SampleDetails;
  /** What the lab wrote on arrival (sender only). Its receipt says whether it signed them. */
  readonly arrival_custody?: ArrivalDetails;
  /**
   * custodyDigest over this delivery's two sides as the registry listed them, worked out in
   * this browser (sentByMe), not the registry's word: a receipt covers them only when its
   * id carries this digest (custody.ts custodyView).
   */
  readonly custodyDigest?: string;
  /** The record the claim created, when the registry says (sender only). */
  readonly received_record?: string;
  /**
   * The chain-of-custody signature the lab tied to this delivery (sender only): the
   * registry checked it is the lab's receipt for this delivery's sample. The only lab
   * signature a breeder's page calls a receipt (custody.ts breederReceipt).
   */
  readonly receipt_attestation_id?: string | null;
};

const isPendingTransfer = (v: unknown): v is PendingTransfer =>
  isObject(v) &&
  isString(v.id) &&
  optional(v.source_record, isString) &&
  isString(v.to_handle) &&
  isNumber(v.created_at) &&
  optional(v.quantity, isString) &&
  optional(v.note, isString);

const isSentTransfer = (v: unknown): v is SentTransfer =>
  isPendingTransfer(v) &&
  optional((v as Record<string, unknown>).claimed_at, isNumber) &&
  optional((v as Record<string, unknown>).received_record, isString) &&
  optional((v as Record<string, unknown>).receipt_attestation_id, isString);

// --- the sample's chain of custody ---------------------------------------------------------
//
// Disputes over a lab result turn on the sample: which tube, sealed how, taken from which
// plant, and whether what arrived is what left. The breeder writes the label and seal when
// making the lab code; the lab confirms or corrects each on arrival. Both optional, plain
// text, and VeilCore checks none of it: it records what each side wrote.
//
// The lab's receipt covers them. A receipt's signed fields are fixed, and its subject and
// document must stay this delivery's two fingerprints (the registry's receiptProblem), so
// the values are carried in the one signed field the lab chooses, its id:
// `att_<16 hex>_sc1_<custodyDigest>`. Receipts without the suffix verify as before.

/** What the breeder writes when making the lab code. */
export type SampleDetails = {
  readonly sampleId?: string;
  readonly sealNumber?: string;
  readonly takenFrom?: string;
  /** YYYY-MM-DD */
  readonly takenOn?: string;
  readonly witness?: string;
};

/** What the lab writes when it arrives. */
export type ArrivalDetails = {
  readonly sampleId?: string;
  readonly sealNumber?: string;
  readonly sealIntact?: 'yes' | 'no' | 'no-seal';
  /** YYYY-MM-DD */
  readonly arrivedOn?: string;
  readonly condition?: string;
  /** The lab's own accession number. */
  readonly labRef?: string;
};

/** Each field's limit, as the registry checks it (transfer.mjs CUSTODY_FIELDS). */
export const CUSTODY_LIMITS = {
  sample: { sampleId: 120, sealNumber: 120, takenFrom: 300, takenOn: 10, witness: 200 },
  arrival: { sampleId: 120, sealNumber: 120, arrivedOn: 10, condition: 1000, labRef: 200 },
} as const;

const SAMPLE_KEYS = ['sampleId', 'sealNumber', 'takenFrom', 'takenOn', 'witness'] as const;
const ARRIVAL_KEYS = ['sampleId', 'sealNumber', 'sealIntact', 'arrivedOn', 'condition', 'labRef'] as const;
const SEAL_STATES: readonly string[] = ['yes', 'no', 'no-seal'];

/** Only the known string fields, trimmed, empty ones dropped: the form the registry stores. */
const fieldsOf = (v: unknown, keys: readonly string[]): Record<string, string> => {
  if (!isObject(v)) return {};
  const out: Record<string, string> = {};
  for (const k of keys) {
    const x = v[k];
    if (isString(x) && x.trim()) out[k] = x.trim().normalize('NFC');
  }
  return out;
};
export const sampleDetailsOf = (v: unknown): SampleDetails => fieldsOf(v, SAMPLE_KEYS);
export const arrivalDetailsOf = (v: unknown): ArrivalDetails => {
  const f = fieldsOf(v, ARRIVAL_KEYS);
  const { sealIntact, ...rest } = f;
  return sealIntact !== undefined && SEAL_STATES.includes(sealIntact)
    ? { ...rest, sealIntact: sealIntact as NonNullable<ArrivalDetails['sealIntact']> }
    : rest;
};
export const hasDetails = (d: SampleDetails | ArrivalDetails | undefined): boolean =>
  !!d && Object.values(d).some((x) => typeof x === 'string' && x !== '');

/**
 * What the lab's receipt id carries: SHA-256 of the canonical JSON of the delivery and both
 * sides. The registry's transfer.mjs custodyDigest is the same function; they must agree.
 */
export const custodyDigest = (transferId: string, sample: SampleDetails, arrival: ArrivalDetails): Promise<string> =>
  sha256Hex(
    canonicalise({
      format: 'veilcore/sample-custody/v1',
      transferId,
      sample: sampleDetailsOf(sample),
      arrival: arrivalDetailsOf(arrival),
    }),
  );

/** The custody digest a receipt's id carries, or null for a receipt without one (every older one). */
export const receiptCustodyDigest = (attestationId: string): string | null =>
  /_sc1_([0-9a-f]{64})$/.exec(attestationId)?.[1] ?? null;

const auth = () => ({ 'Content-Type': 'application/json', 'x-holder-key': holderKey() });

/**
 * A response that is either a result or a stated error.
 *
 * A body matching neither is treated as an error rather than passed on: the caller
 * has no way to tell the difference between a field that is missing and one that
 * never existed, so saying so here is the only place it can be said usefully.
 */
const unexpected = { error: 'unexpected response from the registry' } as const;

/**
 * The registry's error, in the words the screens use. It says "transfer" and "claim
 * code"; a person was only ever given a "lab code" (round 3: one name for it everywhere).
 * Anything not recognised is passed on as the registry wrote it.
 */
export const userFacingError = (error: string): string => {
  const e = error.trim();
  const known: [RegExp, string][] = [
    [/^no such (transfer|delivery)$/i, 'No delivery has that lab code. Check you copied the whole code.'],
    [/already been claimed/i, 'This lab code has already been used.'],
    [/claim code does not match/i, 'That lab code doesn’t match. Ask the breeder for the code they were given.'],
    [/made before claim codes existed/i, 'This lab code is too old to use. Ask the breeder to make a new one.'],
    [/source record no longer exists/i, 'The breeder’s record for this lab code is gone. Ask them to make a new code.'],
    [
      /fingerprint has changed since this offer/i,
      'The breeder changed this plant’s record after making the lab code. Ask them for a new code.',
    ],
    [/has not been received yet/i, 'Nobody has used this lab code yet.'],
    [/^only whoever received this delivery/i, 'Only the lab that used this lab code can do that.'],
    [
      /unclaimed offers/i,
      'You have too many lab codes nobody has used yet. Wait for some to be used, or for older ones to run out.',
    ],
  ];
  for (const [re, words] of known) if (re.test(e)) return words;
  return e;
};

/**
 * What the sender hands the recipient: the transfer id, its secret claim code and, for a
 * lab, the plant's lock for sending results back (lab-results.ts), in one string, so
 * there is one thing to copy. The registry requires the code to claim (only transfers
 * made before it existed claim without one), and the app used to show and send only the
 * id, so no transfer made in the app could be claimed in the app. The lock travels here,
 * not through the registry, so the registry can't hand the lab a lock of its own.
 */
export const shareCodeFor = (transferId: string, claimCode?: string, resultLock?: string): string =>
  [transferId, claimCode, claimCode ? resultLock : undefined].filter(Boolean).join('.');

/** Split a pasted share code back into the id, the claim code and the results lock. */
export const parseShareCode = (code: string): { transferId: string; claimCode?: string; resultLock?: string } => {
  const [id, claim, lock] = code.trim().split('.', 3);
  return {
    transferId: id.toUpperCase(),
    ...(claim ? { claimCode: claim.toLowerCase() } : {}),
    ...(lock && /^age1[02-9ac-hj-np-z]{58}$/.test(lock.toLowerCase()) ? { resultLock: lock.toLowerCase() } : {}),
  };
};

/**
 * A lab code that has its id and claim part but not the lock for lab reports (round 5):
 * cut short when copied, or made before locks. The sample can still be received; a lab
 * report can't be sent back until the lab has the full code.
 */
export const codeMissingLock = (code: string): boolean => {
  const parts = code.trim().split('.');
  if (parts.length < 2 || !parts[0] || !parts[1]) return false;
  return !parseShareCode(code).resultLock;
};

/** What the lab is told at Receive when the code has no lock part. */
export const MISSING_LOCK_WORDS =
  'This code is missing its last part; you can receive the sample but can’t send a report back until you have the full code.';

/** Offer a record to a recipient. Nothing moves until they claim it. */
export const offerTransfer = async (
  sourceRecord: string,
  toHandle: string,
  opts: { quantity?: string; note?: string; sample?: SampleDetails } = {},
): Promise<{ transferId: string; claimCode?: string } | { error: string }> => {
  const { sample, ...rest } = opts;
  const details = sampleDetailsOf(sample);
  try {
    const res = await fetch(`${BASE}/transfers`, {
      method: 'POST',
      headers: auth(),
      body: JSON.stringify({ sourceRecord, toHandle, ...rest, ...(hasDetails(details) ? { sample: details } : {}) }),
    });
    const body = await readJson(res);
    if (!isObject(body)) return unexpected;
    if (isString(body.transferId)) {
      return { transferId: body.transferId, ...(isString(body.claimCode) ? { claimCode: body.claimCode } : {}) };
    }
    if (isString(body.error)) return { error: userFacingError(body.error) };
    return unexpected;
  } catch {
    return { error: 'could not reach the registry' };
  }
};

/**
 * Claim a transfer offered to you.
 *
 * Claiming is also the attestation: a second party, holding their own key, confirming
 * receipt of a specific record on a specific date.
 */
export type ClaimResult = {
  recordId: string;
  descendedFrom: string;
  /** The source record's commitment as the registry gave it with the claim, when it did. */
  parentCommitment?: string;
  quantity?: string;
  /** The sender's note, given to the recipient only (it is not on the public list). */
  note?: string;
  /** What the breeder wrote about the sample, for the lab to confirm or correct. */
  sample?: SampleDetails;
};

export const claimTransfer = async (
  transferId: string,
  claimCode?: string,
  /** A receipt already signed for this delivery. The app signs after claiming, so it uses attachReceipt. */
  receiptAttestationId?: string,
): Promise<ClaimResult | { error: string }> => {
  try {
    const res = await fetch(`${BASE}/transfers/${encodeURIComponent(transferId)}/claim`, {
      method: 'POST',
      headers: auth(),
      body: JSON.stringify({
        ...(claimCode ? { claimCode } : {}),
        ...(receiptAttestationId ? { receiptAttestationId } : {}),
      }),
    });
    const body = await readJson(res);
    if (!isObject(body)) return unexpected;
    if (isString(body.recordId) && isString(body.descendedFrom)) {
      return {
        recordId: body.recordId,
        descendedFrom: body.descendedFrom,
        ...(isString(body.parentCommitment) ? { parentCommitment: body.parentCommitment } : {}),
        ...(isString(body.quantity) ? { quantity: body.quantity } : {}),
        ...(isString(body.note) && body.note ? { note: body.note } : {}),
        ...(hasDetails(sampleDetailsOf(body.sample)) ? { sample: sampleDetailsOf(body.sample) } : {}),
      };
    }
    if (isString(body.error)) return { error: userFacingError(body.error) };
    return unexpected;
  } catch {
    return { error: 'could not reach the registry' };
  }
};

/**
 * Tie the lab's signed receipt to the delivery it received (round 3). The breeder's page
 * calls a signature a lab's receipt only when it is tied to one of the breeder's own
 * deliveries this way: anyone can sign a chain-of-custody statement about a public
 * fingerprint, but only whoever used this delivery's lab code can tie one to it. The
 * registry checks the signature is a chain-of-custody one, not withdrawn, about this
 * delivery's source record and pointing at the claimant's sealed received record, and
 * authenticates the claimant the same way as the claim (x-holder-key). A later
 * withdrawal doesn't clear what it stored, so the breeder's page checks that itself
 * (custody.ts breederReceipt counts only unwithdrawn, verified signatures).
 */
export const attachReceipt = async (
  transferId: string,
  attestationId: string,
): Promise<{ ok: true } | { error: string }> => {
  try {
    const res = await fetch(`${BASE}/transfers/${encodeURIComponent(transferId)}/receipt`, {
      method: 'POST',
      headers: auth(),
      body: JSON.stringify({ attestationId }),
    });
    if (res.ok) return { ok: true };
    const body = await readJson(res).catch(() => undefined);
    return {
      error:
        isObject(body) && isString(body.error)
          ? userFacingError(body.error)
          : res.status === 404
            ? 'this registry can’t tie a receipt to a delivery yet'
            : `the registry answered ${res.status}`,
    };
  } catch {
    return { error: 'could not reach the registry' };
  }
};

/** Both sides of a delivery's sample details, as the registry stores them. */
export type DeliveryCustody = {
  sample: SampleDetails;
  arrival: ArrivalDetails;
  receiptAttestationId?: string;
};

const custodyBody = (body: unknown): DeliveryCustody | { error: string } => {
  if (!isObject(body)) return unexpected;
  if (isString(body.error)) return { error: userFacingError(body.error) };
  if (!isString(body.transferId)) return unexpected;
  return {
    sample: sampleDetailsOf(body.sample),
    arrival: arrivalDetailsOf(body.arrival),
    ...(isString(body.receiptAttestationId) ? { receiptAttestationId: body.receiptAttestationId } : {}),
  };
};

/** A delivery's sample details, for its sender or the lab that received it. */
export const custodyOf = async (transferId: string): Promise<DeliveryCustody | { error: string }> => {
  if (!holderKeyIfAny()) return { error: 'this browser has no key for that delivery' };
  try {
    const res = await fetch(`${BASE}/transfers/${encodeURIComponent(transferId)}/custody`, { headers: auth() });
    if (res.status === 404 && !(res.headers.get('content-type') ?? '').includes('json')) {
      return { error: 'this registry can’t keep sample details yet' };
    }
    return custodyBody(await readJson(res));
  } catch {
    return { error: 'could not reach the registry' };
  }
};

/** The lab writes how the sample arrived (it signs its receipt over what comes back). */
export const setArrival = async (
  transferId: string,
  arrival: ArrivalDetails,
): Promise<DeliveryCustody | { error: string }> => {
  try {
    const res = await fetch(`${BASE}/transfers/${encodeURIComponent(transferId)}/custody`, {
      method: 'POST',
      headers: auth(),
      body: JSON.stringify({ arrival: arrivalDetailsOf(arrival) }),
    });
    if (res.status === 404 && !(res.headers.get('content-type') ?? '').includes('json')) {
      return { error: 'this registry can’t keep sample details yet' };
    }
    return custodyBody(await readJson(res));
  } catch {
    return { error: 'could not reach the registry' };
  }
};

/**
 * Sign the lab's receipt (a chain-of-custody attestation over the breeder's source record
 * and the lab's received record, signed by attester-keys.ts attestRecord like any other)
 * and post it. With `digest`, its id carries the sample details it covers.
 */
export const signReceiptWith = async (
  p: AttesterProfile,
  subject: { sourceCommitment: string; receivedRecordFingerprint: string },
  digest?: string,
): Promise<{ attestationId: string } | { error: string }> => {
  try {
    const out = await attestRecord(
      p,
      subject.sourceCommitment,
      subject.receivedRecordFingerprint,
      'chain-of-custody',
      digest ? `_sc1_${digest}` : '',
    );
    if (out.error !== undefined) return { error: out.error };
    if (out.attestationId !== undefined) return { attestationId: out.attestationId };
    return unexpected;
  } catch {
    return { error: 'could not reach the registry' };
  }
};

// --- lab codes this browser made -------------------------------------------------------
//
// The registry keeps only a digest of the claim code, so a code nobody wrote down can't
// be shown again from the registry. The whole code is kept here when it is made (and in
// the backup), so "Show code again" works until the lab uses it.

const SENT_CODES = 'veilcore.sent-codes.v1';

const readCodes = (): Record<string, string> => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(SENT_CODES) ?? '{}');
    if (!isObject(v)) return {};
    return Object.fromEntries(
      Object.entries(v).filter(([id, c]) => isString(c) && parseShareCode(c).transferId === id),
    ) as Record<string, string>;
  } catch {
    return {};
  }
};

export const rememberSentCode = (code: string): void => {
  const { transferId } = parseShareCode(code);
  try {
    localStorage.setItem(SENT_CODES, JSON.stringify({ ...readCodes(), [transferId]: code }));
  } catch {
    /* private window: the code can't be shown again later, only now */
  }
};

/** The whole code made for a delivery, if this browser (or its backup) has it. */
export const sentCodeFor = (transferId: string): string | undefined => readCodes()[transferId.toUpperCase()];

export const allSentCodes = (): Record<string, string> => readCodes();

/** Add codes from a backup; one already here is never replaced. Returns how many were added. */
export const mergeSentCodes = (incoming: unknown): number => {
  if (!isObject(incoming)) return 0;
  const here = readCodes();
  let added = 0;
  for (const [id, c] of Object.entries(incoming)) {
    if (here[id] || !isString(c) || parseShareCode(c).transferId !== id) continue;
    here[id] = c;
    added++;
  }
  if (added) {
    try {
      localStorage.setItem(SENT_CODES, JSON.stringify(here));
    } catch {
      return 0;
    }
  }
  return added;
};

/**
 * The sender's quantity as written, with "1 cuttings" read as "1 cutting". Free text, so
 * only the plain "1 <word>s" case is changed.
 */
export const quantityPhrase = (q?: string): string | undefined => {
  const t = q?.trim();
  if (!t) return undefined;
  const one = /^(1|one)\s+([a-z]{3,})$/i.exec(t);
  return one && /[^su]s$/i.test(one[2]) ? `${one[1]} ${one[2].slice(0, -1)}` : t;
};

/** Transfers waiting for a handle. */
export const pendingFor = async (handle: string): Promise<PendingTransfer[]> => {
  try {
    const res = await fetch(`${BASE}/transfers/pending/${encodeURIComponent(handle)}`);
    if (!res.ok) return [];
    return arrayField(await readJson(res), 'transfers', isPendingTransfer);
  } catch {
    return [];
  }
};

/** Transfers this holder has sent. */
export const sentByMe = async (): Promise<SentTransfer[]> => {
  // Nothing was ever sent from a browser with no key; do not make one to ask.
  if (!holderKeyIfAny()) return [];
  try {
    const res = await fetch(`${BASE}/transfers/sent`, { headers: auth() });
    if (!res.ok) return [];
    const rows = arrayField(await readJson(res), 'transfers', isSentTransfer);
    return await Promise.all(
      rows.map(async (t): Promise<SentTransfer> => {
        const sample = sampleDetailsOf(t.sample_custody);
        const arrival = arrivalDetailsOf(t.arrival_custody);
        // Only the registry's fields come from the registry: the digest is worked out here.
        return {
          ...t,
          sample_custody: hasDetails(sample) ? sample : undefined,
          arrival_custody: hasDetails(arrival) ? arrival : undefined,
          custodyDigest: await custodyDigest(t.id, sample, arrival),
        };
      }),
    );
  } catch {
    return [];
  }
};

/**
 * The fingerprint the public verify endpoint reports for a record, or null. Used to
 * cross-check the source commitment a lab is about to sign: still the registry's word,
 * but two of its answers have to agree before a lab key signs anything.
 */
export const publicFingerprintOf = async (recordId: string): Promise<string | null> => {
  try {
    const res = await fetch(`${BASE}/verify/${encodeURIComponent(recordId)}?show=`);
    if (!res.ok) return null;
    const body = await readJson(res);
    return isObject(body) && isString(body.recordFingerprint) ? body.recordFingerprint : null;
  } catch {
    return null;
  }
};

const HEX64 = /^[0-9a-f]{64}$/;

/** What the lab is asked to sign, shown in full before it does. */
export type CustodySubject = {
  receivedRecordId: string;
  receivedRecordFingerprint: string;
  sourceRecordId: string;
  sourceCommitment: string;
  cultivar: string;
  quantity?: string;
};

/**
 * Work out what a chain-of-custody signature would be over, or why nothing should be
 * signed. Every source of the source commitment has to agree: the record the claim
 * created, the claim's own answer, and the public verify endpoint.
 */
export const custodySubject = (input: {
  receivedRecordId: string;
  sealed?: {
    recordFingerprint?: string;
    receivedFromCommitment?: string;
    receivedFrom?: string;
    strainName?: string;
    quantity?: string;
  };
  claim: { descendedFrom: string; parentCommitment?: string };
  publicFingerprint: string | null;
}): CustodySubject | { refuse: string } => {
  const { sealed, claim, publicFingerprint } = input;
  const c = sealed?.receivedFromCommitment;
  if (!sealed || !c || !HEX64.test(c))
    return { refuse: 'The registry did not say which record this came from, so there is nothing to sign.' };
  if (!sealed.recordFingerprint)
    return { refuse: 'Your received record could not be sealed, so there is nothing to sign it against.' };
  if (sealed.receivedFrom !== undefined && sealed.receivedFrom !== claim.descendedFrom) {
    return { refuse: 'The registry named two different source records for this transfer. Nothing was signed.' };
  }
  if (claim.parentCommitment !== undefined && claim.parentCommitment !== c) {
    return { refuse: 'The registry gave two different fingerprints for the source record. Nothing was signed.' };
  }
  if (publicFingerprint !== c) {
    return {
      refuse:
        publicFingerprint === null
          ? 'The source record’s fingerprint could not be confirmed from the public registry, so nothing was signed.'
          : 'The source record’s public fingerprint does not match the one given with the transfer. Nothing was signed.',
    };
  }
  return {
    receivedRecordId: input.receivedRecordId,
    receivedRecordFingerprint: sealed.recordFingerprint,
    sourceRecordId: claim.descendedFrom,
    sourceCommitment: c,
    cultivar: sealed.strainName ?? '',
    ...(sealed.quantity ? { quantity: sealed.quantity } : {}),
  };
};
