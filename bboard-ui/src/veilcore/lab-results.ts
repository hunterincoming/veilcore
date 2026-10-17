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
// nothing is tied to VeilCore (a report sent since round 3 ends with a few padding bytes,
// below). The lock comes to the lab in the code the breeder sent, or sealed inside the
// breeder's offer, which only the code's key opens; never from the registry (round 3, P1:
// it used to be taken from the record the registry served, and a server could hand the lab
// its own lock and read the report). reportLockFor says which lock a lab may use.
// SPDX-License-Identifier: Apache-2.0

// The age encryption library (and the curve code under it) is loaded when a report is
// locked or opened, not with every page that shows a lab result line (the check page).
const age = () => import('age-encryption');
import { enT, type Translator } from '../i18n/translate';
import { bech32 } from '@scure/base';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { holderKey } from './holder';
import { paddedSize } from './vault';
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
export const resultRecipientFor = (recordSecretHex: string, transferId?: string): Promise<string> => {
  const identity = resultIdentityFor(recordSecretHex, transferId);
  return age().then((m) => m.identityToRecipient(identity));
};

/** The report's fingerprint: SHA-256 of its bytes, hex. What the lab signs. */
export const reportFingerprint = (bytes: Uint8Array): string => hexOf(sha256(bytes));

// --- padding (round 3, P7) ------------------------------------------------------------
//
// The registry stores the locked file, so it learned each report's exact size. Before
// locking, the report is padded to the same size buckets as a sealed record (vault.ts
// paddedSize: the next 1 KiB up to 16 KiB, then the next 8 KiB): the report's bytes, zeros,
// then a 16-byte trailer, the report's length (8 bytes, big-endian) and PAD_MAGIC. Opening
// takes the padding off again, so the file and its fingerprint (what the lab signs) are the
// report's own. A report sent before padding has no trailer and opens as it was.

const PAD_MAGIC = new TextEncoder().encode('VCPAD\x001\n');
const TRAILER = 16;

// --- the report's kind (persona review, 17 Oct) ------------------------------------------
//
// Every result used to be called a "DNA report", a virus panel included. The lab now says
// which kind it sends: a DNA report, a pathogen or virus test, or another lab report. Only a
// DNA report ties a record to the plant or animal. The kind goes inside the locked file, in
// a second form of the padding trailer (PAD_MAGIC_2): one byte for the kind before the
// length, so the registry learns nothing new. It is the lab's word, not part of what the lab
// signs (the report's SHA-256). A report sent before this has no kind.

export type ReportKind = 'dna' | 'pathogen' | 'other';
export const REPORT_KINDS: readonly ReportKind[] = ['dna', 'pathogen', 'other'];
const KIND_BYTE: Record<ReportKind, number> = { dna: 1, pathogen: 2, other: 3 };
const PAD_MAGIC_2 = new TextEncoder().encode('VCPAD\x002\n');
const TRAILER_2 = 17;

/** The report, padded to its bucket, with the trailer that says how long it is (and its kind). */
export const padReport = (bytes: Uint8Array, kind?: ReportKind): Uint8Array => {
  const trailer = kind ? TRAILER_2 : TRAILER;
  const size = paddedSize(bytes.length + trailer);
  const out = new Uint8Array(size);
  out.set(bytes);
  const view = new DataView(out.buffer);
  view.setBigUint64(size - TRAILER, BigInt(bytes.length));
  if (kind) {
    out[size - TRAILER_2] = KIND_BYTE[kind];
    out.set(PAD_MAGIC_2, size - PAD_MAGIC_2.length);
  } else out.set(PAD_MAGIC, size - PAD_MAGIC.length);
  return out;
};

const endsWith = (bytes: Uint8Array, magic: Uint8Array): boolean =>
  bytes.length >= magic.length && bytes.subarray(bytes.length - magic.length).every((b, i) => b === magic[i]);

/** The report without its padding, and the kind the lab gave it; a file without a trailer is returned as it is. */
export const unpadReportWithKind = (bytes: Uint8Array): { bytes: Uint8Array; kind?: ReportKind } => {
  const two = endsWith(bytes, PAD_MAGIC_2);
  if (!two && !endsWith(bytes, PAD_MAGIC)) return { bytes };
  const trailer = two ? TRAILER_2 : TRAILER;
  if (bytes.length < trailer) return { bytes };
  const n = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getBigUint64(bytes.length - TRAILER);
  if (n > BigInt(bytes.length - trailer)) return { bytes };
  const len = Number(n);
  // Only zeros between the report and the trailer: anything else is a file of its own.
  if (!bytes.subarray(len, bytes.length - trailer).every((b) => b === 0)) return { bytes };
  if (!two) return { bytes: bytes.slice(0, len) };
  const kind = REPORT_KINDS.find((k) => KIND_BYTE[k] === bytes[bytes.length - TRAILER_2]);
  // A kind byte this app doesn't know: the trailer isn't one of ours, so the file is its own.
  if (!kind) return { bytes };
  return { bytes: bytes.slice(0, len), kind };
};

/** The report without its padding; a file without the trailer is returned as it is. */
export const unpadReport = (bytes: Uint8Array): Uint8Array => unpadReportWithKind(bytes).bytes;

/**
 * Lock a report so only the plant's holder can open it. Padded first, so its size says
 * little; with `kind`, the lab's word for what kind of report it is goes inside too.
 */
export const lockReport = async (bytes: Uint8Array, recipient: string, kind?: ReportKind): Promise<Uint8Array> => {
  if (!RECIPIENT.test(recipient)) throw new Error('The lab code has no lock for lab reports in it.');
  const { Encrypter } = await age();
  const e = new Encrypter();
  e.addRecipient(recipient);
  return e.encrypt(padReport(bytes, kind));
};

/**
 * Open a locked report with the plant's record secret: the delivery's own key first, then
 * the per-plant key codes made before per-delivery locks used. Throws if it was locked
 * for neither.
 */
export const openReportWithKind = async (
  locked: Uint8Array,
  recordSecretHex: string,
  transferId?: string,
): Promise<{ bytes: Uint8Array; kind?: ReportKind }> => {
  const { Decrypter } = await age();
  const d = new Decrypter();
  if (transferId) d.addIdentity(resultIdentityFor(recordSecretHex, transferId));
  d.addIdentity(resultIdentityFor(recordSecretHex));
  try {
    return unpadReportWithKind(await d.decrypt(locked));
  } catch {
    throw new Error('This lab report was not locked for this plant, or the file is damaged.');
  }
};

/** openReportWithKind, the report's bytes only. */
export const openReport = async (
  locked: Uint8Array,
  recordSecretHex: string,
  transferId?: string,
): Promise<Uint8Array> => (await openReportWithKind(locked, recordSecretHex, transferId)).bytes;

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
  /**
   * The lab pasted the code again to settle a record whose own lock differed (round 3, P1):
   * from then on the code's lock is used.
   */
  readonly lockConfirmed?: true;
};

const isDelivery = (v: unknown): v is LabDelivery =>
  isObject(v) &&
  isString(v.transferId) &&
  isString(v.receivedRecordId) &&
  optional(v.sourceRecordId, isString) &&
  optional(v.sourceCommitment, isString) &&
  optional(v.recipient, isString) &&
  isNumber(v.receivedAt) &&
  optional(v.receiptLinked, isString) &&
  (v.lockConfirmed === undefined || v.lockConfirmed === true);

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

/**
 * The lock a lab may send this record's lab reports with (round 3, P1), or why not:
 *   - the lock this browser kept from the lab code (rememberDelivery), first;
 *   - else the record's own, but only one this browser put there from the code or from the
 *     sealed offer (`resultLockFrom`) on a record it sealed itself. A lock on a record saved
 *     before locking, or put there before this rule, may be the server's;
 *   - a record's lock that differs from the code's, or that can't be vouched for, is a
 *     'conflict': nothing is sent until the lab pastes the code again (lockConfirmed).
 */
export const reportLockFor = (
  record: {
    readonly id: string;
    readonly resultLock?: string;
    readonly resultLockFrom?: 'code' | 'offer';
  },
  sealedHere: boolean,
): { lock: string } | { conflict: true } | { none: true } => {
  const delivery = deliveryForRecord(record.id);
  const fromCode = delivery?.recipient;
  const own = record.resultLock;
  if (fromCode && RECIPIENT.test(fromCode)) {
    return own && own !== fromCode && !delivery.lockConfirmed ? { conflict: true } : { lock: fromCode };
  }
  if (own && RECIPIENT.test(own)) {
    return sealedHere && record.resultLockFrom ? { lock: own } : { conflict: true };
  }
  return { none: true };
};

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
  tr: Translator = enT,
): string => {
  if (state === 'replaced') return tr.t('app.lab.out.rowReplaced');
  if (state === 'withdrawn')
    return tr.t('app.lab.out.rowWithdrawn', { date: tr.date(r.withdrawnAt ?? r.createdAt, { dateStyle: 'medium' }) });
  if (!mine) return '';
  const fp = r.attestationId ? mine.signed.get(r.attestationId) : undefined;
  if (fp) return tr.t('app.lab.out.rowSigned', { fp: `${fp.slice(0, 8)}…${fp.slice(-6)}` });
  if (r.attestationId && mine.retracted.has(r.attestationId)) return tr.t('app.lab.out.rowRetracted');
  return tr.t('app.lab.out.rowNotSigned');
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
  tr: Translator = enT,
): string | null => {
  const live = liveResults(results);
  if (replaces && !live.some((r) => r.id === replaces)) {
    return tr.t('app.lab.out.alreadyGone');
  }
  if (live.some((r) => r.attestationId && signedHere.get(r.attestationId) === sha)) {
    return tr.t('app.lab.out.sameFile');
  }
  if (results.filter((r) => !r.withdrawnAt).length >= RESULT_CAP) {
    return tr.t('app.lab.out.cap', { cap: String(RESULT_CAP) });
  }
  if (results.length >= RESULT_ROWS_CAP) {
    return tr.t('app.lab.out.rowsCap');
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

/** What kind of file a lab report is, worked out from its bytes once opened (round 6). */
export type ReportFileType = {
  /** The download's extension, without the dot. */
  readonly ext: 'pdf' | 'png' | 'jpg' | 'xlsx' | 'docx' | 'pptx' | 'zip' | 'csv' | 'tsv' | 'txt' | 'bin';
  /** Shown on the lab reports list: "PDF", "CSV"… */
  readonly label: string;
  /** For the download. */
  readonly mime: string;
};

const TYPES: Record<ReportFileType['ext'], Omit<ReportFileType, 'ext'>> = {
  pdf: { label: 'PDF', mime: 'application/pdf' },
  png: { label: 'PNG image', mime: 'image/png' },
  jpg: { label: 'JPEG image', mime: 'image/jpeg' },
  xlsx: { label: 'Excel (XLSX)', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  docx: { label: 'Word (DOCX)', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  pptx: {
    label: 'PowerPoint (PPTX)',
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
  zip: { label: 'ZIP', mime: 'application/zip' },
  csv: { label: 'CSV', mime: 'text/csv' },
  tsv: { label: 'TSV (tab-separated)', mime: 'text/tab-separated-values' },
  txt: { label: 'Text', mime: 'text/plain' },
  bin: { label: 'Unknown type', mime: 'application/octet-stream' },
};
const typeOf = (ext: ReportFileType['ext']): ReportFileType => ({ ext, ...TYPES[ext] });

const u16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u32 = (b: Uint8Array, i: number) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16)) + b[i + 3] * 0x1000000;
const latin1 = (b: Uint8Array, from: number, len: number): string => {
  const end = Math.min(b.length, from + len);
  let out = '';
  for (let i = from; i < end; i += 8192) out += String.fromCharCode(...b.subarray(i, Math.min(end, i + 8192)));
  return out;
};

/**
 * The names inside a ZIP file: from its central directory, or, if that can't be read (a
 * cut-off file), from the local headers. At most 4,000; only names are read, nothing is
 * unpacked.
 */
export const zipEntryNames = (b: Uint8Array): string[] => {
  const names: string[] = [];
  // The end-of-central-directory record: within the last 64 KiB + 22 bytes.
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65_557); i--) {
    if (b[i] !== 0x50 || b[i + 1] !== 0x4b || b[i + 2] !== 0x05 || b[i + 3] !== 0x06) continue;
    let p = u32(b, i + 16);
    const count = u16(b, i + 10);
    for (let n = 0; n < count && n < 4000 && p + 46 <= b.length; n++) {
      if (u32(b, p) !== 0x02014b50) break;
      const nameLen = u16(b, p + 28);
      names.push(latin1(b, p + 46, nameLen));
      p += 46 + nameLen + u16(b, p + 30) + u16(b, p + 32);
    }
    if (names.length) return names;
    break;
  }
  for (let p = 0; p + 30 <= b.length && names.length < 4000; p++) {
    if (b[p] === 0x50 && b[p + 1] === 0x4b && b[p + 2] === 0x03 && b[p + 3] === 0x04) {
      const nameLen = u16(b, p + 26);
      names.push(latin1(b, p + 30, nameLen));
      p += 29 + nameLen;
    }
  }
  return names;
};

/** Plain text, if these bytes read as text: UTF-8 (or Latin-1) with no control characters to speak of. */
const asText = (bytes: Uint8Array): string | undefined => {
  let b = bytes.subarray(0, 64 * 1024);
  if (b.length === 0 || b.includes(0)) return undefined;
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) b = b.subarray(3);
  let text: string | undefined;
  // A sample cut inside a character: try again a byte or three shorter.
  for (let cut = 0; cut <= 3 && text === undefined; cut++) {
    if (cut > 0 && bytes.length <= 64 * 1024) break;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(b.subarray(0, b.length - cut));
    } catch {
      /* not UTF-8 (yet) */
    }
  }
  text ??= latin1(b, 0, b.length);
  let odd = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    if ((c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d && c !== 0x0c) || (c >= 0x7f && c < 0xa0)) odd++;
  }
  return text.trim().length > 0 && odd / text.length <= 0.02 ? text : undefined;
};

/** How many times `sep` splits a line, outside double quotes. */
const fields = (line: string, sep: string): number => {
  let n = 0;
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === sep && !quoted) n++;
  }
  return n;
};

/** Lines split the same way by `sep`: a table. Needs two lines or more. */
const isTable = (lines: readonly string[], sep: string): boolean => {
  if (lines.length < 2) return false;
  const counts = lines.map((l) => fields(l, sep));
  const withSep = counts.filter((c) => c > 0).length;
  if (withSep / lines.length < 0.8) return false;
  const tally = new Map<number, number>();
  for (const c of counts) tally.set(c, (tally.get(c) ?? 0) + 1);
  return Math.max(...tally.values()) / lines.length >= 0.8;
};

/**
 * What kind of file a lab report is, from its bytes (round 6). Lab reports came back named
 * ".bin" or ".zip" when they were a CSV or a spreadsheet, so they didn't open with a
 * double-click. PDF; PNG and JPEG; ZIP-based files by what's inside (a spreadsheet, a Word
 * document or a slide deck carry [Content_Types].xml and their own folder, anything else
 * is a ZIP); text that splits into columns by commas or semicolons (CSV) or tabs (TSV), or
 * other text; anything else is "Unknown type", saved as .bin.
 */
export const reportFileType = (bytes: Uint8Array): ReportFileType => {
  const head = latin1(bytes, 0, 1024);
  if (head.includes('%PDF-')) return typeOf('pdf');
  if (head.startsWith('\x89PNG\r\n\x1a\n')) return typeOf('png');
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return typeOf('jpg');
  if (head.startsWith('PK\x03\x04') || head.startsWith('PK\x05\x06')) {
    const names = zipEntryNames(bytes);
    if (names.includes('[Content_Types].xml')) {
      if (names.some((n) => n.startsWith('xl/'))) return typeOf('xlsx');
      if (names.some((n) => n.startsWith('word/'))) return typeOf('docx');
      if (names.some((n) => n.startsWith('ppt/'))) return typeOf('pptx');
    }
    return typeOf('zip');
  }
  const text = asText(bytes);
  if (text === undefined) return typeOf('bin');
  const all = text.split(/\r\n|\n|\r/);
  // A sample cut short may end mid-line: leave that line out.
  const lines = (bytes.length > 64 * 1024 ? all.slice(0, -1) : all).filter((l) => l.trim() !== '').slice(0, 200);
  if (isTable(lines, '\t')) return typeOf('tsv');
  if (isTable(lines, ',') || isTable(lines, ';')) return typeOf('csv');
  return typeOf('txt');
};

/** A downloaded lab report's name: local date, time and its short id, so two never share one. */
export const reportFileName = (bytes: Uint8Array, at: number, resultId: string): string => {
  const d = new Date(at);
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}-${pad(d.getMinutes())}`;
  return `Lab report ${stamp} ${shortResultId(resultId)}.${reportFileType(bytes).ext}`;
};

/** Said before a lab withdraws a correction (round 5): nothing from it stands afterwards. */
/** (app.lab.out.correctionWarning in the visitor's language.) */
export const WITHDRAW_CORRECTION_WARNING =
  'The original stays replaced. The breeder will have no live report from you until you send one.';
