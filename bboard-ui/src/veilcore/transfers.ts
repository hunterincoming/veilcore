// Sending a cultivar to someone.
//
// This is the moment provenance is actually established. Everything before a transfer
// is the holder's own claim; a transfer is the first point a second party is involved,
// and their confirmation of receipt is what makes the record evidence rather than a
// note someone wrote about themselves.
//
// SPDX-License-Identifier: Apache-2.0

import { holderKey, holderKeyIfAny } from './holder';
import { readJson, isObject, isString, isNumber, optional, arrayField } from './json';

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

/** Offer a record to a recipient. Nothing moves until they claim it. */
export const offerTransfer = async (
  sourceRecord: string,
  toHandle: string,
  opts: { quantity?: string; note?: string } = {},
): Promise<{ transferId: string; claimCode?: string } | { error: string }> => {
  try {
    const res = await fetch(`${BASE}/transfers`, {
      method: 'POST',
      headers: auth(),
      body: JSON.stringify({ sourceRecord, toHandle, ...opts }),
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
    return arrayField(await readJson(res), 'transfers', isSentTransfer);
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
