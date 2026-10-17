// Sending a cultivar to someone.
//
// This is the moment provenance is actually established. Everything before a transfer
// is the holder's own claim; a transfer is the first point a second party is involved,
// and their confirmation of receipt is what makes the record evidence rather than a
// note someone wrote about themselves.
//
// SPDX-License-Identifier: Apache-2.0

import { enT, type Translator } from '../i18n/translate';
import type { AppKey } from '../i18n/app/en';
import { canonicalise, sha256Hex } from 'veilcore-records';
import { holderKey, holderKeyIfAny } from './holder';
import { readJson, isObject, isString, isNumber, optional, arrayField } from './json';
import { attestRecord, type AttesterProfile } from './attester-keys';
import {
  handleTag,
  isCustodyBox,
  isHandleTag,
  isVaultKey,
  newCustodySalt,
  newOfferKey,
  openCustody,
  openOffer,
  sealCustody,
  sealOffer,
  type OfferBox,
  type SealedBox,
} from './vault';
import { isAnimal } from './animal-profile';
import { noteSentTo, offerKeyInRecords, sentToName, type StrainRecord } from './records';
import { registerCustodySummaries, type CustodySummaryEntry } from './disclosure';
import { inOutbox } from './outbox';
import { rowStateOf } from './api-store';

const BASE = import.meta.env.VITE_API_BASE ?? '';

/**
 * A delivery as the registry lists it. `to_handle` is a tag for the recipient (CONTRACT.md
 * #15), not a name, for every delivery made since tags; older ones may still carry the name
 * as it was typed, until the registry's purge replaces it.
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
  /**
   * The name the holder gave the recipient, from the source record's sealed copy (records.ts
   * sentTo), or a name stored before tags. Absent when this browser has neither: say "the lab".
   */
  readonly label?: string;
  readonly claimed_at?: number;
  /** What the breeder wrote about the sample when making the lab code (sender only), opened here. */
  readonly sample_custody?: SampleDetails;
  /** What the lab wrote on arrival (sender only), opened here. Its receipt says whether it signed them. */
  readonly arrival_custody?: ArrivalDetails;
  /**
   * The digest over this delivery's two sides, worked out in this browser (sentByMe), not
   * the registry's word: a receipt covers them only when its id carries this digest in the
   * same form (custody.ts custodyView). Form 2 (custodyDigestV2) for sample details sealed
   * with the offer key, form 1 (custodyDigest) for a delivery made before they were sealed.
   */
  readonly custodyDigest?: string;
  readonly custodyFormat?: 1 | 2;
  /** The salt the sealed sample carries (form 2), for the evidence bundle. */
  readonly custodySalt?: string;
  /**
   * The sample details are sealed and this browser doesn't have the delivery's offer key (it
   * is in the sender's records, sealed, and in the backup file): they can't be shown here.
   */
  readonly custodyLocked?: boolean;
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

/** Who a delivery went to, in words: the name kept sealed, or one stored before tags, or "the lab". */
export const recipientName = (
  t: { readonly label?: string; readonly to_handle?: string },
  tr: Translator = enT,
): string => t.label ?? (t.to_handle && !isHandleTag(t.to_handle) ? t.to_handle : tr.t('app.lab.send.theLab'));

/**
 * Who the sender addressed, for the receipt confirmation on the sender's own record
 * (AttestationPanel.tsx). The name kept sealed with the record for that delivery
 * (records.ts sentTo, CONTRACT.md #15) comes first: the registry no longer writes
 * `addressedTo`. A record whose attestation was written before still has the name an older
 * claim wrote there (or in `attesterHandle`, older still), shown until the purge removes
 * it. A tag is never a name: none is shown rather than 64 hex characters.
 */
export const attestationAddressee = (r: Pick<StrainRecord, 'attestation' | 'sentTo'>): string | undefined => {
  const a = r.attestation;
  if (!a) return undefined;
  const sealedName = a.transferId ? r.sentTo?.[a.transferId] : undefined;
  if (sealedName && !isHandleTag(sealedName)) return sealedName;
  const oldName = [a.addressedTo, a.attesterHandle].find((v) => typeof v === 'string' && v.trim() !== '');
  return oldName && !isHandleTag(oldName.trim().toLowerCase()) ? oldName : undefined;
};

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
//
// Since round 3 of sealed records (CONTRACT.md #27) both sides are sealed with the
// delivery's offer key (vault.ts sealCustody): the registry stores them locked and can't
// read them. The sender's side carries a random salt, and the receipt carries
// custodyDigestV2 as `_sc2_<digest>`. Only the sender's and the lab's apps can open the
// boxes and compare. Deliveries made before keep plain fields and `_sc1_`.

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

/** Control and format characters (Cc, Cf: tabs, line breaks, direction marks, zero-width) and U+2028/2029. */
const HIDDEN = /[\p{Cc}\p{Cf}\u2028\u2029]/u;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_FIELDS: readonly string[] = ['takenOn', 'arrivedOn'];

/** A real calendar day: 2026-02-31 is refused, not read as 3 March (the registry's isCalendarDate). */
export const isCalendarDate = (t: string): boolean => {
  if (!DATE.test(t)) return false;
  const [y, m, d] = t.split('-').map(Number);
  const at = new Date(Date.UTC(y, m - 1, d));
  return at.getUTCFullYear() === y && at.getUTCMonth() === m - 1 && at.getUTCDate() === d;
};

const FIELD_WORDS: Record<string, AppKey> = {
  sampleId: 'app.lab.field.sampleId',
  sealNumber: 'app.lab.field.sealNumber',
  takenFrom: 'app.lab.field.takenFrom',
  takenOn: 'app.lab.field.takenOn',
  witness: 'app.lab.field.witness',
  arrivedOn: 'app.lab.field.arrivedOn',
  condition: 'app.lab.field.condition',
  labRef: 'app.lab.field.labRef',
  sealIntact: 'app.lab.field.sealIntact',
};

/**
 * One field's value as the registry stores it, or the words for why it can't be (round 2 of
 * the 15 Oct review). The registry's transfer.mjs custodyValue is the same function, and the
 * receipt's digest is over these values, so the two must agree to the character (the tests
 * on both sides share one vector):
 *   - every field: trimmed, then NFC;
 *   - `condition`: CR LF and CR become LF, spaces at line ends go, three or more line breaks
 *     become two, before the trim;
 *   - refused if it has a tab, line break or hidden character (a direction mark, a zero-width
 *     space; plain line breaks are allowed in `condition`), is too long, or is not a real date.
 */
export const custodyValue = (key: string, raw: string, tr: Translator = enT): { value: string } | { error: string } => {
  let t = raw;
  if (key === 'condition') {
    t = t
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((l) => l.trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');
  }
  t = t.trim().normalize('NFC');
  const label = FIELD_WORDS[key] ? tr.t(FIELD_WORDS[key]) : key;
  if (!t) return { value: '' };
  if (HIDDEN.test(key === 'condition' ? t.replace(/\n/g, '') : t)) {
    return {
      error:
        key === 'condition'
          ? tr.t('app.lab.field.noHiddenCondition', { label })
          : tr.t('app.lab.field.noHidden', { label }),
    };
  }
  if (DATE_FIELDS.includes(key) && !isCalendarDate(t)) return { error: tr.t('app.lab.field.realDate', { label }) };
  const limit =
    (CUSTODY_LIMITS.sample as Record<string, number>)[key] ?? (CUSTODY_LIMITS.arrival as Record<string, number>)[key];
  if (limit !== undefined && t.length > limit)
    return { error: tr.t('app.lab.field.tooLong', { label, limit: String(limit) }) };
  return { value: t };
};

/**
 * Only the known string fields, normalised as the registry stores them (custodyValue), empty
 * ones dropped. A value the registry would refuse is dropped too: one stored before it
 * refused them then reads as missing, never as text with hidden characters in it.
 */
const fieldsOf = (v: unknown, keys: readonly string[]): Record<string, string> => {
  if (!isObject(v)) return {};
  const out: Record<string, string> = {};
  for (const k of keys) {
    const x = v[k];
    if (!isString(x)) continue;
    const r = custodyValue(k, x);
    if ('value' in r && r.value) out[k] = r.value;
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

/** What a form's values can't be sent as, one plain sentence each; [] when they can. */
export const custodyProblems = (
  side: 'sample' | 'arrival',
  v: Readonly<Record<string, string | undefined>>,
  tr: Translator = enT,
): string[] => {
  const keys = side === 'sample' ? SAMPLE_KEYS : ARRIVAL_KEYS;
  const out: string[] = [];
  for (const k of keys) {
    const x = v[k];
    if (!isString(x) || k === 'sealIntact') continue;
    const r = custodyValue(k, x, tr);
    if ('error' in r) out.push(r.error);
  }
  return out;
};

/** Two sides' values are the same as stored: compared field by field after normalising. */
export const sameDetails = (a: SampleDetails | ArrivalDetails, b: SampleDetails | ArrivalDetails): boolean =>
  canonicalise(a) === canonicalise(b);
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

/**
 * The sealed form's digest (CONTRACT.md #27): SHA-256 of the canonical JSON of
 * { format: "veilcore/sample-custody/v2", transferId, salt, sample, arrival }, each side
 * normalised as the registry's custodyFields stores it. The salt (32 random bytes the sender
 * sealed with the sample) means nobody can find the digest by trying likely values. The
 * registry's transfer.mjs custodyDigestV2 is the same function; both test the same vectors.
 */
export const custodyDigestV2 = (
  transferId: string,
  salt: string,
  sample: SampleDetails,
  arrival: ArrivalDetails,
): Promise<string> =>
  sha256Hex(
    canonicalise({
      format: 'veilcore/sample-custody/v2',
      transferId,
      salt,
      sample: sampleDetailsOf(sample),
      arrival: arrivalDetailsOf(arrival),
    }),
  );

/** Which digest a receipt's id carries, and in which form, or null for a receipt without one. */
export const receiptCustodyOf = (attestationId: string): { format: 1 | 2; digest: string } | null => {
  const m = /_sc([12])_([0-9a-f]{64})$/.exec(attestationId);
  return m ? { format: m[1] === '2' ? 2 : 1, digest: m[2] } : null;
};

/** The custody digest a receipt's id carries (either form), or null for a receipt without one (every older one). */
export const receiptCustodyDigest = (attestationId: string): string | null =>
  receiptCustodyOf(attestationId)?.digest ?? null;

/** Whether a receipt id carries exactly a delivery's digest, in the delivery's form. */
export const receiptCovers = (
  attestationId: string,
  t: Pick<SentTransfer, 'custodyDigest' | 'custodyFormat'>,
): 'covered' | 'changed' | 'not-covered' => {
  const carried = receiptCustodyOf(attestationId);
  if (carried === null) return 'not-covered';
  return carried.format === (t.custodyFormat ?? 1) && carried.digest === t.custodyDigest ? 'covered' : 'changed';
};

/** A salt as the sealed sample carries it: 32 bytes, base64url without padding. */
const SALT = /^[A-Za-z0-9_-]{43}$/;

/**
 * A delivery's offer key, from where this browser keeps it: sealed in its records (the
 * sender's source record, a lab's received record, CONTRACT.md #27), else the lab code kept
 * here (made here, or being received).
 */
export const offerKeyForDelivery = (transferId: string): string | undefined =>
  offerKeyInRecords(transferId) ??
  [sentCodeFor(transferId), receivingCodeFor(transferId)]
    .map((c) => (c ? parseShareCode(c).offerKey : undefined))
    .find((k): k is string => !!k);

/**
 * Both sides of a delivery's sample details as the registry sent them (sealed boxes, or a
 * delivery made before sealing: plain fields), opened with the offer key when sealed. `salt`
 * only for a sealed sample that opened. `locked` when sealed and the key is missing or wrong.
 */
export const openDeliveryCustody = async (
  transferId: string,
  rawSample: unknown,
  rawArrival: unknown,
  offerKey: string | undefined = offerKeyForDelivery(transferId),
): Promise<{
  sample: SampleDetails;
  arrival: ArrivalDetails;
  sealed: boolean;
  salt?: string;
  locked?: boolean;
}> => {
  const sealed = isCustodyBox(rawSample) || isCustodyBox(rawArrival);
  if (!sealed) return { sample: sampleDetailsOf(rawSample), arrival: arrivalDetailsOf(rawArrival), sealed: false };
  if (!offerKey) return { sample: {}, arrival: {}, sealed: true, locked: true };
  const s = isCustodyBox(rawSample) ? await openCustody(offerKey, transferId, 'sample', rawSample) : {};
  const a = isCustodyBox(rawArrival) ? await openCustody(offerKey, transferId, 'arrival', rawArrival) : {};
  if (s === null || a === null) return { sample: {}, arrival: {}, sealed: true, locked: true };
  const salt = isString(s.salt) && SALT.test(s.salt) ? s.salt : undefined;
  return {
    sample: sampleDetailsOf(s),
    arrival: arrivalDetailsOf(a),
    sealed: true,
    ...(salt ? { salt } : {}),
  };
};

/** Seal one side for the registry: the sample with a salt, the arrival as its fields. */
const sealSide = (
  offerKey: string,
  transferId: string,
  side: 'sample' | 'arrival',
  fields: SampleDetails | ArrivalDetails,
  salt?: string,
): Promise<SealedBox> =>
  sealCustody(
    offerKey,
    transferId,
    side,
    side === 'sample' ? { ...fields, salt: salt ?? newCustodySalt() } : { ...fields },
  );

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
export const userFacingError = (error: string, tr: Translator = enT): string => {
  const e = error.trim();
  const known: [RegExp, AppKey][] = [
    [/^no such (transfer|delivery)$/i, 'app.lab.err.noSuch'],
    [/already been claimed/i, 'app.lab.err.used'],
    [/claim code does not match/i, 'app.lab.err.noMatch'],
    [/made before claim codes existed/i, 'app.lab.err.tooOld'],
    [/source record no longer exists/i, 'app.lab.err.gone'],
    [/fingerprint has changed since this offer/i, 'app.lab.err.changed'],
    [/has not been received yet/i, 'app.lab.err.notReceived'],
    [/^only whoever received this delivery/i, 'app.lab.err.onlyLab'],
    [/unclaimed offers/i, 'app.lab.err.tooMany'],
    [/ask the sender for a new code/i, 'app.sealed.err.newCode'],
    [/^toHandle is a tag, not a name$/i, 'app.sealed.err.handleTag'],
  ];
  for (const [re, key] of known) if (re.test(e)) return tr.t(key);
  return e;
};

const LAB_ERROR_KEYS: readonly AppKey[] = [
  'app.lab.err.noSuch',
  'app.lab.err.used',
  'app.lab.err.noMatch',
  'app.lab.err.tooOld',
  'app.lab.err.gone',
  'app.lab.err.changed',
  'app.lab.err.notReceived',
  'app.lab.err.onlyLab',
  'app.lab.err.tooMany',
  'app.sealed.err.newCode',
  'app.sealed.err.handleTag',
  'app.sealed.sendNotSaved',
];

/**
 * A lab-code error as shown: the registry's words, or userFacingError's English for them,
 * in the visitor's language. In English exactly userFacingError(message).
 */
export const labErrorWords = (message: string, tr: Translator = enT): string => {
  const english = userFacingError(message);
  const key = LAB_ERROR_KEYS.find((k) => enT.t(k) === english);
  return key ? tr.t(key) : english;
};

/**
 * What the sender hands the recipient: the transfer id, its secret claim code, for a lab
 * the plant's lock for sending results back (lab-results.ts), and the offer key that opens
 * the sender's sealed offer (CONTRACT.md #8), in one string, so there is one thing to copy.
 * The registry requires the code to claim (only transfers made before it existed claim
 * without one), and the app used to show and send only the id, so no transfer made in the
 * app could be claimed in the app. The lock and the offer key travel here, not through the
 * registry, so the registry can't hand the lab a lock of its own or read the offer.
 *
 *   TR-XXXXXXXX . <claim code> [. age1… lock] . o1<43 base64url>
 *
 * Parts after the id are found by their prefix, not their place.
 */
export const shareCodeFor = (transferId: string, claimCode?: string, resultLock?: string, offerKey?: string): string =>
  [
    transferId,
    claimCode,
    claimCode ? resultLock : undefined,
    claimCode && offerKey && isVaultKey(offerKey) ? `${OFFER_PREFIX}${offerKey}` : undefined,
  ]
    .filter(Boolean)
    .join('.');

const OFFER_PREFIX = 'o1';
const LOCK = /^age1[02-9ac-hj-np-z]{58}$/;
const OFFER_PART = /^o1[A-Za-z0-9_-]{43}$/;

/** Split a pasted share code back into the id, the claim code, the results lock and the offer key. */
export const parseShareCode = (
  code: string,
): { transferId: string; claimCode?: string; resultLock?: string; offerKey?: string } => {
  const [id, ...rest] = code.trim().split('.');
  let claimCode: string | undefined;
  let resultLock: string | undefined;
  let offerKey: string | undefined;
  for (const part of rest) {
    if (!part) continue;
    // The offer key is base64url: its case matters, so it is matched as written.
    if (OFFER_PART.test(part)) offerKey ??= part.slice(OFFER_PREFIX.length);
    else if (/^age1/i.test(part)) {
      if (LOCK.test(part.toLowerCase())) resultLock ??= part.toLowerCase();
    } else claimCode ??= part.toLowerCase();
  }
  return {
    transferId: id.toUpperCase(),
    ...(claimCode ? { claimCode } : {}),
    ...(resultLock ? { resultLock } : {}),
    ...(offerKey ? { offerKey } : {}),
  };
};

/** Whether a code has its id and claim part: anything less isn't a lab code yet. */
const hasIdAndClaim = (code: string): boolean => {
  const parts = code.trim().split('.');
  return parts.length >= 2 && !!parts[0] && !!parts[1];
};

/**
 * A lab code that has its id and claim part but not the lock for lab reports (round 5):
 * cut short when copied, or made before locks. The sample can still be received; a lab
 * report can't be sent back until the lab has the full code.
 */
export const codeMissingLock = (code: string): boolean => hasIdAndClaim(code) && !parseShareCode(code).resultLock;

/**
 * A code with its id and claim part but no offer key: cut short when copied, or made
 * before offers were sealed. It can still be received; without the key the sender's
 * details don't come with it (a code made before keeps working: the registry gives those
 * details with the claim, CONTRACT.md #8 offerPlain).
 */
export const codeMissingOfferKey = (code: string): boolean => hasIdAndClaim(code) && !parseShareCode(code).offerKey;

/**
 * Said when the lab's arrival details can't be locked (round 4, F8): the code has no offer
 * key, or the sender's locked sample details never reached VeilCore. Nothing is sent in plain
 * text; the lab asks for a new code. (app.lab.recv.askNewCode in the visitor's language.)
 */
export const ASK_FOR_NEW_CODE =
  'your arrival details can’t be locked for this delivery: the code is missing its last part, or the sender’s sample details never reached VeilCore. Nothing was sent. Ask the sender for a new code';

/** What the lab is told at Receive when the code has no lock part. */
/** (app.lab.recv.missingLock in the visitor's language.) */
export const MISSING_LOCK_WORDS =
  'This code is missing its last part; you can receive the sample but can’t send a report back until you have the full code.';

/**
 * The offer's plaintext (CONTRACT.md #8): what names the material, as the claim used to
 * copy it across. An animal's individual ID, scheme, breed and sex go with it, so the lab's
 * record says which animal a sample is from; a plant's own reference doesn't.
 */
export const offerPlaintext = (
  r: StrainRecord,
  opts: { quantity?: string; note?: string; resultLock?: string } = {},
): Record<string, unknown> => {
  const animal = isAnimal(r);
  return {
    strainName: r.strainName,
    bredBy: r.bredBy,
    dateCreated: r.dateCreated,
    ...(r.profile !== undefined ? { profile: r.profile } : {}),
    ...(r.taxon !== undefined ? { taxon: r.taxon } : {}),
    ...(animal ? { refId: r.refId ?? '' } : {}),
    ...(animal
      ? {
          animal: { breed: r.animal?.breed ?? '', idScheme: r.animal?.idScheme ?? '', sex: r.animal?.sex ?? 'unknown' },
        }
      : {}),
    ...(opts.quantity ? { quantity: opts.quantity } : {}),
    ...(opts.note ? { note: opts.note } : {}),
    // The breeder's lock for lab reports (round 3, P1): sealed with the offer, so only the
    // code's key vouches for it and a lab whose code lost its lock part still gets the
    // breeder's, never one the registry made up.
    ...(opts.resultLock ? { resultLock: opts.resultLock } : {}),
  };
};

/**
 * The most a sealed offer may be, as JSON (the registry's sealed.js OFFER_MAX_BYTES; the
 * cross-repo contract test checks they agree). It fits the largest offer this app can make:
 * a record of up to 256 KiB padded (vault.ts SEALED_MAX_BYTES), plus the caps below.
 */
export const OFFER_MAX_BYTES = 384 * 1024;
/** The quantity and the note for the lab: the app caps them while typing (SendToLab.tsx). */
export const OFFER_QUANTITY_MAX = 200;
export const OFFER_NOTE_MAX = 2000;

/**
 * Offer a record to a recipient. Nothing moves until they claim it.
 *
 * What the recipient learns about the material goes sealed (sealedOffer), with a key made
 * here for this offer only; the key goes in the delivery code (shareCodeFor), never to the
 * registry. The quantity and note travel inside it too. The sample details go sealed with
 * the same key (CONTRACT.md #27), once the registry has named the delivery: the box is bound
 * to its id. Always sent, empty or not, so the sealed sample carries the salt a lab's
 * receipt is signed with. The key itself is kept sealed with the source record
 * (records.ts noteSentTo), so a restore from the backup file brings it back.
 *
 * Who it is for goes as a tag (CONTRACT.md #15, vault.ts handleTag), never the name typed:
 * the name is kept sealed with the source record (records.ts noteSentTo), and shown from
 * there.
 */
export const offerTransfer = async (
  record: StrainRecord,
  toHandle: string,
  opts: {
    quantity?: string;
    note?: string;
    sample?: SampleDetails;
    /**
     * The breeder's lock for lab reports to seal into the offer (P1). The delivery's own lock
     * needs the delivery's id, which comes back from this call, so it goes in the code; the
     * plant's lock goes here, and the breeder's browser opens reports locked with either
     * (lab-results.ts openReport).
     */
    resultLock?: string;
  } = {},
): Promise<{ transferId: string; claimCode?: string; offerKey: string; sampleError?: string } | { error: string }> => {
  const { sample, quantity, note, resultLock } = opts;
  // SendToLab.tsx caps both while typing; anything longer never leaves this browser.
  if ((quantity?.length ?? 0) > OFFER_QUANTITY_MAX || (note?.length ?? 0) > OFFER_NOTE_MAX) {
    return { error: 'the quantity or the note is too long' };
  }
  // A value the registry would refuse is said here, not dropped (sampleDetailsOf drops it).
  const problems = sample ? custodyProblems('sample', sample) : [];
  if (problems.length) return { error: problems.join(' ') };
  const details = sampleDetailsOf(sample);
  // A record kept only in this browser (round 3, L1) isn't on VeilCore to send from.
  if (inOutbox(record.id) && rowStateOf('veilcore.records.v1', record.id) === undefined) {
    return { error: enT.t('app.sealed.sendNotSaved') };
  }
  const offerKey = newOfferKey();
  const name = toHandle.normalize('NFC').trim();
  if (!name) return { error: 'say who it is for' };
  let tag: string;
  try {
    tag = await handleTag(name);
  } catch {
    return { error: enT.t('app.sealed.refuse.noKey') };
  }
  try {
    const sealedOffer: OfferBox = await sealOffer(
      offerKey,
      record.id,
      record.recordFingerprint ?? '',
      offerPlaintext(record, { quantity, note, resultLock }),
    );
    if (JSON.stringify(sealedOffer).length > OFFER_MAX_BYTES) return { error: 'this record is too large to send' };
    const res = await fetch(`${BASE}/transfers`, {
      method: 'POST',
      headers: auth(),
      body: JSON.stringify({
        sourceRecord: record.id,
        toHandle: tag,
        sealedOffer,
      }),
    });
    const body = await readJson(res);
    if (!isObject(body)) return unexpected;
    if (isString(body.transferId)) {
      noteSentTo(record.id, body.transferId, name, offerKey);
      const saved = await setSample(body.transferId, offerKey, details);
      return {
        transferId: body.transferId,
        ...(isString(body.claimCode) ? { claimCode: body.claimCode } : {}),
        offerKey,
        ...('error' in saved ? { sampleError: saved.error } : {}),
      };
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
  /** What the breeder wrote about the sample, for the lab to confirm or correct (a delivery made before sealing). */
  sample?: SampleDetails;
  /** The breeder's sample details sealed with the offer key (CONTRACT.md #27): openDeliveryCustody opens it. */
  sampleSealed?: SealedBox;
  /** The sender's sealed offer, exactly as sent (openClaimOffer opens it with the code's key). */
  offerSealed?: unknown;
  /** A code made before offers were sealed: the offer's fields, from the registry. */
  offerPlain?: Record<string, unknown>;
};

/**
 * A claim that didn't go through. `definite` is set only when the registry itself answered
 * with a refusal (4xx): then the claim surely wasn't made by this request. Without it (no
 * answer, a server error, an answer that couldn't be read) the claim may have gone through,
 * and the kept code must stay (round 3, L8).
 */
export type ClaimError = { error: string; definite?: true };

export const claimTransfer = async (
  transferId: string,
  claimCode?: string,
  /** A receipt already signed for this delivery. The app signs after claiming, so it uses attachReceipt. */
  receiptAttestationId?: string,
): Promise<ClaimResult | ClaimError> => {
  try {
    const res = await fetch(`${BASE}/transfers/${encodeURIComponent(transferId)}/claim`, {
      method: 'POST',
      headers: auth(),
      body: JSON.stringify({
        ...(claimCode ? { claimCode } : {}),
        ...(receiptAttestationId ? { receiptAttestationId } : {}),
      }),
    });
    const body = await readJson(res).catch(() => undefined);
    if (!isObject(body)) return unexpected;
    if (isString(body.recordId) && isString(body.descendedFrom)) {
      const claim: ClaimResult = {
        recordId: body.recordId,
        descendedFrom: body.descendedFrom,
        ...(isString(body.parentCommitment) ? { parentCommitment: body.parentCommitment } : {}),
        ...(isString(body.quantity) ? { quantity: body.quantity } : {}),
        ...(isString(body.note) && body.note ? { note: body.note } : {}),
        ...(isCustodyBox(body.sample)
          ? { sampleSealed: body.sample }
          : hasDetails(sampleDetailsOf(body.sample))
            ? { sample: sampleDetailsOf(body.sample) }
            : {}),
        ...(isObject(body.offerSealed) ? { offerSealed: body.offerSealed } : {}),
        ...(isObject(body.offerPlain) ? { offerPlain: body.offerPlain } : {}),
      };
      // Kept beside the kept code (L9): a code made before offers were sealed can't fetch its
      // offer again once the sender's record is locked, so this answer is its only copy.
      if (receivingCodeFor(transferId)) keepClaim(transferId, claim);
      return claim;
    }
    if (isString(body.error)) {
      const definite = res.status >= 400 && res.status < 500;
      // "Already claimed" may be this browser's own claim, whose answer was lost: not a
      // refusal of the code until a fresh read shows no stub for it (receive.ts claimWithCode).
      if (definite && !/already been claimed/i.test(body.error)) markRefused(transferId);
      return { error: userFacingError(body.error), ...(definite ? { definite: true as const } : {}) };
    }
    return unexpected;
  } catch {
    return { error: 'could not reach the registry' };
  }
};

/**
 * The offer a claim answered with: opened with the code's key (sealedOffer), or as the
 * registry gave it for a code made before offers were sealed (offerPlain). 'unopened' when
 * there is a sealed offer and the code has no key for it, or the key doesn't open it.
 *
 * 'missing' when the code carries an offer key but the registry sent no sealed offer
 * (CONTRACT.md #17): a code with a key was made with a sealed offer, so a plain one in its
 * place is the registry's own words about the material, never the sender's, and is refused.
 */
export const openClaimOffer = async (
  claim: Partial<ClaimResult> & Pick<ClaimResult, 'descendedFrom'>,
  offerKey: string | undefined,
  sourceFingerprint: string | undefined,
): Promise<{ fields: Record<string, unknown> } | 'unopened' | 'missing' | 'none'> => {
  if (claim.offerSealed !== undefined) {
    if (!offerKey) return 'unopened';
    const fields = await openOffer(
      offerKey,
      claim.descendedFrom,
      claim.parentCommitment ?? sourceFingerprint ?? '',
      claim.offerSealed,
    );
    return fields ? { fields } : 'unopened';
  }
  if (offerKey) return 'missing';
  if (claim.offerPlain) return { fields: claim.offerPlain };
  return 'none';
};

/**
 * The claimant's own copy of a delivery's offer (GET /transfers/:id/offer, CONTRACT.md #22),
 * for finishing a received record after the claim: the claim's answer was its only copy, so
 * closing the tab before sealing used to leave a stub for good. Answered only to the holder
 * who claimed it; 404 to anyone else.
 */
export const ownOffer = async (
  transferId: string,
): Promise<{ offerSealed?: unknown; offerPlain?: Record<string, unknown> } | { error: string }> => {
  if (!holderKeyIfAny()) return { error: 'this browser has no key for that delivery' };
  try {
    const res = await fetch(`${BASE}/transfers/${encodeURIComponent(transferId)}/offer`, { headers: auth() });
    const body = await readJson(res).catch(() => undefined);
    if (!res.ok || !isObject(body)) {
      return {
        error:
          isObject(body) && isString(body.error)
            ? userFacingError(body.error)
            : res.status === 404
              ? 'only whoever received this delivery can finish it'
              : `the registry answered ${String(res.status)}`,
      };
    }
    if (isString(body.transferId) && body.transferId.toUpperCase() !== transferId.toUpperCase()) return unexpected;
    return {
      ...(isObject(body.offerSealed) ? { offerSealed: body.offerSealed } : {}),
      ...(isObject(body.offerPlain) ? { offerPlain: body.offerPlain } : {}),
    };
  } catch {
    return { error: 'could not reach the registry' };
  }
};

// --- delivery codes being received ------------------------------------------------------
//
// Kept from before the claim until the received record is sealed and the registry has
// accepted it (CONTRACT.md #22): the code is the only place the offer key and the
// breeder's lock are, and a claim can't be made twice.

const RECEIVING = 'veilcore.receiving.v1';

const readReceiving = (): Record<string, string> => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(RECEIVING) ?? '{}');
    if (!isObject(v)) return {};
    return Object.fromEntries(
      Object.entries(v).filter(([id, c]) => isString(c) && parseShareCode(c).transferId === id),
    ) as Record<string, string>;
  } catch {
    return {};
  }
};

/** Keep a code being received, by its transfer id. */
export const keepReceivingCode = (code: string): void => {
  const { transferId } = parseShareCode(code);
  try {
    localStorage.setItem(RECEIVING, JSON.stringify({ ...readReceiving(), [transferId]: code.trim() }));
  } catch {
    /* a private window: the code is only in the dialog */
  }
};

/** The code kept for a delivery being received, if any. */
export const receivingCodeFor = (transferId: string): string | undefined => readReceiving()[transferId.toUpperCase()];

/**
 * The received record is sealed and accepted, or the registry definitely refused the code:
 * the code isn't needed any more. Anything else keeps it (round 3, L8): a claim whose answer
 * was lost may have gone through, and the code is the only copy of the offer key. `force` is
 * for those two cases, said by the caller that knows (receive.ts).
 */
export const forgetReceivingCode = (transferId: string, opts: { force?: true } = {}): void => {
  if (!opts.force && !refusedCodes().has(transferId.toUpperCase())) return;
  forgetClaim(transferId);
  unmarkRefused(transferId);
  const all = readReceiving();
  if (!(transferId.toUpperCase() in all)) return;
  delete all[transferId.toUpperCase()];
  try {
    localStorage.setItem(RECEIVING, JSON.stringify(all));
  } catch {
    /* nothing kept */
  }
};

// Codes the registry definitely refused (L8): only these may be let go without a caller's word.
const REFUSED = 'veilcore.receiving-refused.v1';
const refusedCodes = (): Set<string> => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(REFUSED) ?? '[]');
    return new Set(Array.isArray(v) ? v.filter(isString) : []);
  } catch {
    return new Set();
  }
};
const markRefused = (transferId: string): void => {
  if (!receivingCodeFor(transferId)) return;
  try {
    localStorage.setItem(REFUSED, JSON.stringify([...refusedCodes(), transferId.toUpperCase()]));
  } catch {
    /* nothing kept */
  }
};
const unmarkRefused = (transferId: string): void => {
  const all = refusedCodes();
  if (!all.delete(transferId.toUpperCase())) return;
  try {
    localStorage.setItem(REFUSED, JSON.stringify([...all]));
  } catch {
    /* nothing kept */
  }
};

// The claim's answer, kept beside its code until the received record is sealed (L9).
const CLAIMS = 'veilcore.receiving-claims.v1';

const readClaims = (): Record<string, ClaimResult> => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(CLAIMS) ?? '{}');
    if (!isObject(v)) return {};
    return Object.fromEntries(
      Object.entries(v).filter(([, c]) => isObject(c) && isString(c.recordId) && isString(c.descendedFrom)),
    ) as Record<string, ClaimResult>;
  } catch {
    return {};
  }
};

const keepClaim = (transferId: string, claim: ClaimResult): void => {
  try {
    localStorage.setItem(CLAIMS, JSON.stringify({ ...readClaims(), [transferId.toUpperCase()]: claim }));
  } catch {
    /* a private window: the code alone is kept, as before */
  }
};

/** The claim's answer kept for a delivery being received, if any. */
export const keptClaimFor = (transferId: string): ClaimResult | undefined => readClaims()[transferId.toUpperCase()];

const forgetClaim = (transferId: string): void => {
  const all = readClaims();
  if (!(transferId.toUpperCase() in all)) return;
  delete all[transferId.toUpperCase()];
  try {
    localStorage.setItem(CLAIMS, JSON.stringify(all));
  } catch {
    /* nothing kept */
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

/**
 * Both sides of a delivery's sample details, as the registry stores them, opened here when
 * sealed (CONTRACT.md #27). `sealed`: they are locked with the delivery's offer key; `salt`:
 * the sealed sample's, for the receipt's digest; `locked`: sealed, and this browser has no
 * key that opens them.
 */
export type DeliveryCustody = {
  sample: SampleDetails;
  arrival: ArrivalDetails;
  receiptAttestationId?: string;
  sealed?: boolean;
  salt?: string;
  locked?: boolean;
};

const custodyBody = async (
  transferId: string,
  body: unknown,
  offerKey?: string,
): Promise<DeliveryCustody | { error: string }> => {
  if (!isObject(body)) return unexpected;
  if (isString(body.error)) return { error: userFacingError(body.error) };
  if (!isString(body.transferId)) return unexpected;
  const opened = await openDeliveryCustody(
    transferId,
    body.sample,
    body.arrival,
    offerKey ?? offerKeyForDelivery(transferId),
  );
  return {
    sample: opened.sample,
    arrival: opened.arrival,
    ...(isString(body.receiptAttestationId) ? { receiptAttestationId: body.receiptAttestationId } : {}),
    ...(opened.sealed ? { sealed: true } : {}),
    ...(opened.salt ? { salt: opened.salt } : {}),
    ...(opened.locked ? { locked: true } : {}),
  };
};

/**
 * The sender writes the sample details, sealed with the offer key (CONTRACT.md #27). Done by
 * offerTransfer just after the code is made: the box is bound to the delivery's id.
 */
export const setSample = async (
  transferId: string,
  offerKey: string,
  sample: SampleDetails,
): Promise<DeliveryCustody | { error: string }> => {
  const problems = custodyProblems('sample', sample);
  if (problems.length) return { error: problems.join(' ') };
  try {
    const box = await sealSide(offerKey, transferId, 'sample', sampleDetailsOf(sample));
    const res = await fetch(`${BASE}/transfers/${encodeURIComponent(transferId)}/custody`, {
      method: 'POST',
      headers: auth(),
      body: JSON.stringify({ sample: box }),
    });
    return await custodyBody(transferId, await readJson(res), offerKey);
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : 'could not reach the registry' };
  }
};

/** A delivery's sample details, for its sender or the lab that received it. */
export const custodyOf = async (transferId: string): Promise<DeliveryCustody | { error: string }> => {
  if (!holderKeyIfAny()) return { error: 'this browser has no key for that delivery' };
  try {
    const res = await fetch(`${BASE}/transfers/${encodeURIComponent(transferId)}/custody`, { headers: auth() });
    if (res.status === 404 && !(res.headers.get('content-type') ?? '').includes('json')) {
      return { error: 'this registry can’t keep sample details yet' };
    }
    return await custodyBody(transferId, await readJson(res));
  } catch {
    return { error: 'could not reach the registry' };
  }
};

/**
 * The lab writes how the sample arrived. Returns both sides as the registry now stores them;
 * the lab signs over what it typed (ClaimTransfer.tsx signReceipt), not over this echo. The
 * arrival details are sealed with the delivery's offer key (CONTRACT.md #27), always: without
 * one (a code cut short, or a delivery made before offers were sealed) nothing is sent and the
 * lab is told to ask for a new code (round 4, F8). They used to go as plain fields, which the
 * registry refused, but only after it had received them.
 */
export const setArrival = async (
  transferId: string,
  arrival: ArrivalDetails,
  offerKey: string | undefined = offerKeyForDelivery(transferId),
): Promise<DeliveryCustody | { error: string }> => {
  const problems = custodyProblems('arrival', arrival);
  if (problems.length) return { error: problems.join(' ') };
  if (!offerKey) return { error: ASK_FOR_NEW_CODE };
  try {
    const fields = arrivalDetailsOf(arrival);
    const res = await fetch(`${BASE}/transfers/${encodeURIComponent(transferId)}/custody`, {
      method: 'POST',
      headers: auth(),
      body: JSON.stringify({ arrival: await sealSide(offerKey, transferId, 'arrival', fields) }),
    });
    if (res.status === 404 && !(res.headers.get('content-type') ?? '').includes('json')) {
      return { error: 'this registry can’t keep sample details yet' };
    }
    return await custodyBody(transferId, await readJson(res), offerKey);
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : 'could not reach the registry' };
  }
};

/**
 * Sign the lab's receipt (a chain-of-custody attestation over the breeder's source record
 * and the lab's received record, signed by attester-keys.ts attestRecord like any other)
 * and post it. With `digest`, its id carries the sample details it covers: `_sc2_` for
 * sealed ones (custodyDigestV2, `format` 2), `_sc1_` for a delivery made before.
 */
export const signReceiptWith = async (
  p: AttesterProfile,
  subject: { sourceCommitment: string; receivedRecordFingerprint: string },
  digest?: string,
  format: 1 | 2 = 1,
): Promise<{ attestationId: string } | { error: string }> => {
  try {
    const out = await attestRecord(
      p,
      subject.sourceCommitment,
      subject.receivedRecordFingerprint,
      'chain-of-custody',
      digest ? `_sc${format}_${digest}` : '',
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

/** Transfers this holder has sent. */
export const sentByMe = async (): Promise<SentTransfer[]> => (await sentOrNull()) ?? [];

/** sentByMe, or null when the registry couldn't be asked or answered with an error. */
const sentOrNull = async (): Promise<SentTransfer[] | null> => {
  // Nothing was ever sent from a browser with no key; do not make one to ask.
  if (!holderKeyIfAny()) return [];
  try {
    const res = await fetch(`${BASE}/transfers/sent`, { headers: auth() });
    if (!res.ok) return null;
    const rows = arrayField(await readJson(res), 'transfers', isSentTransfer);
    return await Promise.all(
      rows.map(async (row): Promise<SentTransfer> => {
        // A `label` in the registry's answer is not the holder's, and the digest, its form,
        // salt and lock state are worked out here: anything by those names from it is dropped.
        const {
          label: _fromRegistry,
          custodyDigest: _d,
          custodyFormat: _f,
          custodySalt: _s,
          custodyLocked: _l,
          ...t
        } = row;
        void [_fromRegistry, _d, _f, _s, _l];
        // Sealed sample details (CONTRACT.md #27) are opened with the offer key kept sealed
        // with the source record; a delivery made before has plain fields.
        const opened = await openDeliveryCustody(t.id, t.sample_custody, t.arrival_custody);
        const { sample, arrival } = opened;
        // Only the registry's fields come from the registry: the digest and the name are
        // worked out here, the name from the source record's sealed copy.
        const label = sentToName(t.source_record, t.id);
        const v2 = opened.sealed && opened.salt ? opened.salt : undefined;
        return {
          ...t,
          ...(label ? { label } : {}),
          sample_custody: hasDetails(sample) ? sample : undefined,
          arrival_custody: hasDetails(arrival) ? arrival : undefined,
          ...(opened.locked ? { custodyLocked: true } : {}),
          ...(v2
            ? {
                custodyFormat: 2 as const,
                custodySalt: v2,
                custodyDigest: await custodyDigestV2(t.id, v2, sample, arrival),
              }
            : opened.sealed
              ? {}
              : { custodyFormat: 1 as const, custodyDigest: await custodyDigest(t.id, sample, arrival) }),
        };
      }),
    );
  } catch {
    return null;
  }
};

/**
 * The fields where what arrived differs from what was sent, by name, never by value: the
 * custody.ts custodyDifferences lines, one name each (Sample ID: sampleId; Seal number:
 * sealNumber; no seal, or not intact: sealIntact). What a holder may publish (CONTRACT.md #27).
 */
export const custodyDifferingFields = (sample: SampleDetails, arrival: ArrivalDetails): string[] => {
  const same = (a: string, b: string) =>
    a.replace(/\s+/g, ' ').trim().toLowerCase() === b.replace(/\s+/g, ' ').trim().toLowerCase();
  const out = new Set<string>();
  const pair = (k: string, sent?: string, got?: string) => {
    if (sent && (!got || !same(sent, got))) out.add(k);
  };
  pair('sampleId', sample.sampleId, arrival.sampleId);
  if (arrival.sealIntact === 'no-seal') {
    if (sample.sealNumber) out.add('sealIntact');
  } else pair('sealNumber', sample.sealNumber, arrival.sealNumber);
  if (arrival.sealIntact === 'no') out.add('sealIntact');
  return [...out];
};

/**
 * What the holder's app worked out about each lab receipt over this record's sealed sample
 * details, for its attestation-status grant (disclosure.ts grantValuesNow): the registry
 * can't open them, so only the holder can say whether they match. Only deliveries whose
 * boxes opened here; read at most every few seconds.
 */
let sentCache: { at: number; key: string; list: Promise<SentTransfer[] | null> } | null = null;
export const custodySummariesFor = async (r: Pick<StrainRecord, 'id'>): Promise<CustodySummaryEntry[] | null> => {
  const key = holderKeyIfAny() ?? '';
  if (!sentCache || sentCache.key !== key || Date.now() - sentCache.at > 5_000) {
    sentCache = { at: Date.now(), key, list: sentOrNull() };
  }
  const sent = await sentCache.list;
  if (!sent) return null;
  return sent
    .filter(
      (t): t is SentTransfer & { receipt_attestation_id: string } =>
        t.source_record === r.id &&
        typeof t.receipt_attestation_id === 'string' &&
        t.custodyFormat === 2 &&
        !t.custodyLocked,
    )
    .map((t) => {
      const covered = receiptCovers(t.receipt_attestation_id, t);
      return {
        receiptAttestationId: t.receipt_attestation_id,
        covered,
        differingFields:
          covered === 'covered' ? custodyDifferingFields(t.sample_custody ?? {}, t.arrival_custody ?? {}) : [],
      };
    })
    .sort((a, b) => a.receiptAttestationId.localeCompare(b.receiptAttestationId));
};
registerCustodySummaries(custodySummariesFor);

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
