// One backup file for everything this browser holds.
//
// Before this, a breeder had a holder-key text file plus one keys file per record, and a
// backup made before a lab report was dated no longer held its salt. Usable-security
// field data says that fails: people click "saved" without saving (Höltervennhoff et al.,
// USENIX Security 2024), and many files multiply the chance one is lost. So:
//
//   - one file holds the holder key, the vault key that opens the records (vault.ts; from
//     version 3), every record's keys, a lab's signing key, the locks
//     a lab received with each delivery (so a lab on a new device can still send lab
//     reports back), and the lab codes a breeder made (so "Show code again" survives);
//   - downloading it does NOT count as backed up; opening the saved copy and checking it
//     (checkBackup) does. That proves the file exists, opens, and holds everything now;
//   - restoreAny reads this file and the older files (record keys, holder key text), so
//     nobody's existing backup stops working;
//   - since round 3 (P4) a version 3 file also holds the highest version of each record this
//     browser has seen (`revs`), so a browser restored from it still refuses an older copy the
//     registry serves. A version 3 file without them restores as before;
//   - a version 3 file also holds the delivery codes this browser is still receiving
//     (`receiving`). Optional fields are how version 3 grows: a file without one restores as
//     before, and the version changes only when an older app would misread the file.
//
// A password on the file (persona review, 17 Oct): the file opens every locked detail, so an
// email account that gets broken into would leak it. The backup screen turns it on by default
// (full review, 22 Nov) and lets a person switch it off, except when the file holds a lab's
// signing key: then it is required (summit, 25 Nov), because whoever had that file could sign
// results as the lab, for any record, with no way to tell them apart. backupFileText and
// downloadBackupAll refuse to write such a file without one. A file with a password is version 4: { format, version: 4, warning, savedAt, locked } where
// `locked` holds the version 3 JSON sealed with AES-256-GCM under a key made from the password
// with PBKDF2-SHA256 (at least 600,000 iterations, a random 16-byte salt). Opening it asks for
// the password; a wrong one changes nothing. A file without a password stays version 3 and
// works as before, and an older one without a password restores as before even when it holds a
// lab key: only writing a new one is refused. The password is never stored or sent anywhere.
// SPDX-License-Identifier: Apache-2.0

import { holderKeyIfAny, setHolderKey } from './holder';
import {
  allKeys,
  clearCopyBackedUp,
  keysEntry,
  keysFor,
  markBackedUp,
  restoreKeysEntry,
  wasForgotten,
  type RecordKeys,
} from './record-keys';
import { adoptAttester, clearLabKeyCopyMark, loadAttester, markLabKeyBackedUp } from './attester-keys';
import { allDeliveries, deliveriesMissingFrom, mergeDeliveries } from './lab-results';
import { allSentCodes, markReceivingBackedUp, mergeReceiving, mergeSentCodes, receivingForBackup } from './transfers';
import {
  clearVaultCopyMark,
  isVaultKey,
  markVaultBackedUp,
  setVaultKey,
  vaultHasSealed,
  vaultKeyIfAny,
  vaultKid,
} from './vault';
import { raiseRevMarks, registryKids, revMarks } from './api-store';
import {
  clearHeldCopyMarks,
  heldLicensesForBackup,
  heldMissingFrom,
  markHeldBackedUp,
  mergeHeldLicenses,
} from './held-licenses';
import { clearLenderCopyMark, lenderForBackup, lenderHeldBy, markLenderBackedUp, mergeLender } from './lender';
import {
  clearIssuerDealsCopyMarks,
  issuerDealsForBackup,
  issuerDealsMissingFrom,
  markIssuerDealsBackedUp,
  mergeIssuerDeals,
} from './licenses';
import { enT } from '../i18n/translate';
import {
  DEVICE_ONLY_BACKUP_FAILED,
  deviceOnlyMissingFrom,
  importRecordRows,
  markDeviceOnlyBackedUp,
  recordsForBackup,
  restoreUnreadable,
  unreadableForBackup,
  unreadableMissingFrom,
  type ImportResult,
} from './records';
import { deviceOnlyRecords } from './outbox';
import { noteArrived } from './arrived';
import { proofFor } from './proofs';
import { dealRecordsForBackup } from './deal-backup';
import { committedRecordFields, type CommittedRecordInput } from './commitment';
import { base64urlnopad } from '@scure/base';

export const BACKUP_FORMAT = 'veilcore-backup';
/** 3: adds vaultKey (sealed records, CONTRACT.md #9). */
export const BACKUP_VERSION = 3;
const HEX64 = /^[0-9a-f]{64}$/i;

export type BackupContents = {
  readonly format: typeof BACKUP_FORMAT;
  readonly version: number;
  readonly warning: string;
  readonly savedAt: string;
  readonly holderKey?: string;
  /** The vault key (base64url) that opens this holder's records. Never sent anywhere. */
  readonly vaultKey?: string;
  readonly records: ReturnType<typeof keysEntry>[];
  readonly labSignature?: unknown;
  /** A lab's deliveries and the breeder's lock each came with, by transfer id. */
  readonly labDeliveries?: Record<string, unknown>;
  /** The lab codes this browser made, by transfer id. */
  readonly sentCodes?: Record<string, string>;
  /**
   * The highest version (`rev`) of each record and agreement this browser has seen, by
   * "records:<id>" or "licenses:<id>" (round 3, P4). Optional: older version 3 files have none.
   */
  readonly revs?: Record<string, number>;
  /**
   * Licenses this browser holds as a licensee, with the secret behind each (held-licenses.ts):
   * without it a license can't be activated or shown live. Optional: older files have none.
   */
  readonly heldLicenses?: ReturnType<typeof heldLicensesForBackup>;
  /** The issuer's secret key for each real license's private channel, by license id (licenses.ts). */
  readonly issuerDeals?: ReturnType<typeof issuerDealsForBackup>;
  /**
   * A lender's identity on chain and each claim it made (lender.ts): the secrets that release a
   * claim, and the words and salt each claim was made from. Optional: most files have none.
   */
  readonly lender?: ReturnType<typeof lenderForBackup>;
  /**
   * The records themselves, as this browser holds them open (records.ts recordsForBackup).
   * Keys alone prove a key and nothing it stands for: with these, the file is enough to show
   * a record and recompute its proof code if VeilCore's registry is gone. Optional: older
   * files, and passkey copies (which live on the registry anyway), have none.
   */
  readonly recordData?: readonly unknown[];
  /**
   * Entries of the device-only store that couldn't be read as records when the file was made
   * (damaged storage), by record id, exactly as stored: kept so nothing is lost with the file.
   */
  readonly deviceOnlyUnreadable?: Readonly<Record<string, unknown>>;
  /**
   * Each record's inclusion proof once its batch is sealed, by proof code: the path from the
   * record to the batch root anchored on Midnight. Public data, kept so the date can be shown
   * without the registry. Best effort: what the registry answered when the file was made.
   */
  readonly proofs?: Readonly<Record<string, unknown>>;
  /**
   * Each record's sealed fields by record id: exactly what its proof code is computed over
   * (SPEC 3.6.1, the profile's form), the same as an evidence bundle's sealed-fields.json.
   * Any implementation of the format can check a backup with these and nothing of this app:
   * `veilcore backup <file>` in veilcore-records does. A record too old to recompute (no
   * nonce) has none.
   */
  readonly sealedFields?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /**
   * The signed record of each license deal here (deal-backup.ts): terms, royalty statements,
   * replies, payments and confirmations, as their senders signed them. Kept for the holder,
   * not restored: the deal itself stays on the registry. Best effort, as `proofs`.
   */
  readonly dealRecords?: readonly unknown[];
  /**
   * Delivery codes this browser is still receiving, by transfer id (transfers.ts): until the
   * received record is sealed and accepted, the code is the only copy of the offer key and the
   * breeder's lock. In the file only, never in the account copy (accountContents), which keeps
   * what it held before. Optional, like `revs`: an older version 3 file has none and restores
   * as before, and an older app reading a newer file passes over it.
   */
  readonly receiving?: Readonly<Record<string, string>>;
};

const WARNING =
  'SECRET. This file brings your records back on a new device, even without VeilCore. ' +
  'Anyone with it can act as you. VeilCore has no copy of this file and cannot make another. Keep a copy off this device.';

/** 4: a version 3 backup sealed with a password (`locked`). */
export const LOCKED_BACKUP_VERSION = 4;
/** PBKDF2-SHA256 iterations for a new file (OWASP's 2023 figure); a file says its own. */
export const BACKUP_PBKDF2_ITERATIONS = 600_000;
/** Fewer than this is refused when opening: a file that says less wasn't made by VeilCore. */
const MIN_ITERATIONS = 600_000;
/** More than this is refused too, so a made-up file can't make the browser work for hours. */
const MAX_ITERATIONS = 10_000_000;
const LOCKED_AAD = new TextEncoder().encode('veilcore:backup:v4');

export type LockedBox = {
  readonly kdf: 'PBKDF2-SHA256';
  readonly iterations: number;
  /** 16 random bytes, base64url. */
  readonly salt: string;
  readonly alg: 'A256GCM';
  /** 12 random bytes, base64url. */
  readonly iv: string;
  /** The version 3 JSON, sealed, with the GCM tag appended; base64url. */
  readonly ct: string;
};

export type LockedBackupFile = {
  readonly format: typeof BACKUP_FORMAT;
  readonly version: typeof LOCKED_BACKUP_VERSION;
  readonly warning: string;
  readonly savedAt: string;
  readonly locked: LockedBox;
};

const LOCKED_WARNING =
  'SECRET. This backup is locked with a password. Without the password nobody can open it, VeilCore included. ' +
  'Keep a copy off this device, and keep the password somewhere safe.';

/** backup.ts's words for a locked file (backup-words.ts translates them). */
export const NEEDS_PASSWORD = enT.t('app.backup.pw.needed');
/** Thrown when a file holding a lab's signing key would be written without a password. */
export const LAB_KEY_NEEDS_PASSWORD = enT.t('app.backup.pw.required');

/** Whether a file made now holds a lab's signing key, so it can't be saved without a password. */
export const backupNeedsPassword = (): boolean => loadAttester() !== null;
export const WRONG_PASSWORD = enT.t('app.backup.pw.wrong');

/** Thrown by restoreAny for a locked file opened without its password. Nothing was changed. */
export class BackupNeedsPassword extends Error {
  constructor() {
    super(NEEDS_PASSWORD);
    this.name = 'BackupNeedsPassword';
  }
}

const passwordKey = async (password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> => {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password.normalize('NFC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

/** Whether a parsed file is a password-locked backup (version 4). */
export const isLockedBackup = (v: unknown): v is LockedBackupFile =>
  typeof v === 'object' &&
  v !== null &&
  (v as { format?: unknown }).format === BACKUP_FORMAT &&
  typeof (v as { locked?: unknown }).locked === 'object' &&
  (v as { locked?: unknown }).locked !== null;

/** Seal backup contents with a password. `iterations` is for tests only. */
export const lockBackup = async (
  contents: BackupContents,
  password: string,
  iterations: number = BACKUP_PBKDF2_ITERATIONS,
): Promise<LockedBackupFile> => {
  if (!password) throw new Error('a locked backup needs a password');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await passwordKey(password, salt, iterations);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: LOCKED_AAD },
      key,
      new TextEncoder().encode(JSON.stringify(contents)),
    ),
  );
  return {
    format: BACKUP_FORMAT,
    version: LOCKED_BACKUP_VERSION,
    warning: LOCKED_WARNING,
    savedAt: contents.savedAt,
    locked: {
      kdf: 'PBKDF2-SHA256',
      iterations,
      salt: base64urlnopad.encode(salt),
      alg: 'A256GCM',
      iv: base64urlnopad.encode(iv),
      ct: base64urlnopad.encode(ct),
    },
  };
};

const bytesOf = (v: unknown, length?: number): Uint8Array<ArrayBuffer> | undefined => {
  if (typeof v !== 'string') return undefined;
  try {
    const b = new Uint8Array(base64urlnopad.decode(v));
    return length === undefined || b.length === length ? b : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Open a locked backup with its password: the version 3 contents inside, parsed. Throws
 * WRONG_PASSWORD for a wrong password or a changed file (AES-GCM can't tell them apart),
 * and NOT_BACKUP for a box that isn't one this app makes. Changes nothing.
 */
export const unlockBackup = async (file: LockedBackupFile, password: string): Promise<Record<string, unknown>> => {
  const box = file.locked as unknown as Record<string, unknown>;
  const salt = bytesOf(box.salt, 16);
  const iv = bytesOf(box.iv, 12);
  const ct = bytesOf(box.ct);
  const iterations = box.iterations;
  if (
    box.kdf !== 'PBKDF2-SHA256' ||
    box.alg !== 'A256GCM' ||
    !salt ||
    !iv ||
    !ct ||
    typeof iterations !== 'number' ||
    !Number.isInteger(iterations) ||
    iterations < MIN_ITERATIONS ||
    iterations > MAX_ITERATIONS
  ) {
    throw new Error(NOT_BACKUP);
  }
  if (!password) throw new BackupNeedsPassword();
  let plain: ArrayBuffer;
  try {
    const key = await passwordKey(password, salt, iterations);
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: LOCKED_AAD }, key, ct);
  } catch {
    throw new Error(WRONG_PASSWORD);
  }
  const inner = parse(new TextDecoder().decode(plain));
  if (inner.format !== BACKUP_FORMAT || isLockedBackup(inner)) throw new Error(NOT_BACKUP);
  return inner;
};

/**
 * The file's text: the version 3 JSON, or, with a password, the version 4 file that seals it.
 * `iterations` is for tests only.
 */
export const backupFileText = async (
  password?: string,
  now = Date.now(),
  iterations: number = BACKUP_PBKDF2_ITERATIONS,
): Promise<string> => {
  const contents = await withRecordsAndProofs(backupContents(now));
  if (!password && contents.labSignature !== undefined) throw new Error(LAB_KEY_NEEDS_PASSWORD);
  return JSON.stringify(password ? await lockBackup(contents, password, iterations) : contents, null, 2);
};

/** How many proofs are asked for at once when a file is made. */
const PROOF_FETCHES = 6;

/**
 * The records and their inclusion proofs, added to a file's contents. A proof the registry
 * can't give now (not batched yet, offline) is simply left out: the next backup has it.
 */
export const withRecordsAndProofs = async (contents: BackupContents): Promise<BackupContents> => {
  const dealRecords = await dealRecordsForBackup().catch(() => []);
  const codes = receivingForBackup();
  const extras = {
    ...(dealRecords.length ? { dealRecords } : {}),
    ...(Object.keys(codes).length ? { receiving: codes } : {}),
  };
  // A holder with documents kept on this device only has no other copy of them than this file:
  // a file that can't hold every one of them is not made, and the reason is said, never a file
  // quietly without them (docs/device-only-records.md).
  const localOnly = Object.keys(deviceOnlyRecords()).length > 0;
  const recordData = await recordsForBackup().catch((e: unknown) => {
    if (localOnly) throw e instanceof Error ? e : new Error(DEVICE_ONLY_BACKUP_FAILED());
    return [];
  });
  if (localOnly && deviceOnlyMissingFrom(recordData).length > 0) throw new Error(DEVICE_ONLY_BACKUP_FAILED());
  // An entry of theirs this browser can't read as a record (damaged storage) never stops the
  // backup: it goes in exactly as it is stored, so nothing is lost with the file, and the
  // backup step says one couldn't be read.
  const damaged = unreadableForBackup();
  const unreadable = Object.keys(damaged).length ? { deviceOnlyUnreadable: damaged } : {};
  if (recordData.length === 0) return { ...contents, ...unreadable, ...extras };
  const prints = [...new Set(recordData.map((r) => r.recordFingerprint).filter((f) => HEX64.test(f ?? '')))];
  const proofs: Record<string, unknown> = {};
  for (let i = 0; i < prints.length; i += PROOF_FETCHES) {
    const batch = prints.slice(i, i + PROOF_FETCHES);
    const got = await Promise.all(batch.map((fp) => proofFor(fp)));
    got.forEach((p, j) => {
      if (p.status !== 'none') proofs[batch[j]] = p.proof;
    });
  }
  const sealedFields: Record<string, Record<string, unknown>> = {};
  for (const r of recordData) {
    if (!r.nonce) continue;
    try {
      sealedFields[r.id] = committedRecordFields(r as CommittedRecordInput);
    } catch {
      /* a record not in its profile's form: restored as it is, not given fields to check */
    }
  }
  return {
    ...contents,
    recordData,
    ...(Object.keys(proofs).length ? { proofs } : {}),
    ...(Object.keys(sealedFields).length ? { sealedFields } : {}),
    ...unreadable,
    ...extras,
  };
};

/** What goes in the file now. */
export const backupContents = (now = Date.now()): BackupContents => {
  const holderKey = holderKeyIfAny() ?? undefined;
  const vaultKey = vaultKeyIfAny() ?? undefined;
  const lab = loadAttester();
  const deliveries = allDeliveries();
  const codes = allSentCodes();
  const revs = revMarks();
  const held = heldLicensesForBackup();
  const deals = issuerDealsForBackup();
  const lenderEntry = lenderForBackup();
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    warning: WARNING,
    savedAt: new Date(now).toISOString(),
    ...(holderKey ? { holderKey: holderKey.toLowerCase() } : {}),
    ...(vaultKey ? { vaultKey } : {}),
    records: allKeys().map(keysEntry),
    ...(lab ? { labSignature: lab } : {}),
    ...(Object.keys(deliveries).length ? { labDeliveries: deliveries } : {}),
    ...(Object.keys(codes).length ? { sentCodes: codes } : {}),
    ...(Object.keys(revs).length ? { revs } : {}),
    ...(held.length ? { heldLicenses: held } : {}),
    ...(Object.keys(deals).length ? { issuerDeals: deals } : {}),
    ...(lenderEntry ? { lender: lenderEntry } : {}),
  };
};

/**
 * The file's name: readable, dated, and the same shape whatever is in it. `label` is "VeilCore
 * backup" in the person's language (app.backup.shareTitle). Restoring reads the file's contents,
 * never its name, so any name restores the same.
 */
export const backupFileName = (now = Date.now(), label = 'VeilCore backup'): string => {
  // The person's own date, not UTC: a backup saved at 9pm in New Jersey is that day's.
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  // Nothing a file system refuses in a name, on any of them.
  const name =
    label
      .replace(/[\\/:*?"<>|\p{Cc}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'VeilCore backup';
  return `${name} ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
};

/**
 * What goes in the account copy (account-copy.ts): the file's keys, never the records themselves
 * (`recordData` is never in it, as with the passkey copy before it). A document kept on this
 * device only never syncs: what it says is never in the copy. Its ID and keys are, locked, as the
 * privacy page and the document's page say (docs/device-only-records.md), and the copy's check
 * never counts them as backed up (security review B3): the file stays its only other copy.
 */
export const accountContents = (now = Date.now()): BackupContents => backupContents(now);

/** True when there is anything worth backing up. */
export const hasAnythingToBackUp = (): boolean =>
  holderKeyIfAny() !== null ||
  vaultKeyIfAny() !== null ||
  allKeys().length > 0 ||
  loadAttester() !== null ||
  Object.keys(allDeliveries()).length > 0 ||
  heldLicensesForBackup().length > 0 ||
  Object.keys(receivingForBackup()).length > 0 ||
  Object.keys(issuerDealsForBackup()).length > 0 ||
  lenderForBackup() !== undefined;

/**
 * Save the file. Deliberately does not mark anything as backed up: only checkBackup
 * does, once the saved copy has been opened and read back.
 */
export const downloadBackupAll = (now = Date.now(), text?: string, label?: string): string => {
  const name = backupFileName(now, label);
  // Without the text (made by backupFileText), the file would be written as it is: never with a lab key.
  if (text === undefined && backupNeedsPassword()) throw new Error(LAB_KEY_NEEDS_PASSWORD);
  const blob = new Blob([text ?? JSON.stringify(backupContents(now), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  return name;
};

const NOT_BACKUP = "That file isn't a VeilCore backup. Pick the file you saved from VeilCore.";
/** A file that doesn't hold the holder's documents kept on this device only (backup-words.ts says it in each language). */
export const DEVICE_ONLY_NOT_IN_FILE = enT.t('app.doc.local.backupMissing');

const parse = (text: string): Record<string, unknown> => {
  try {
    const v: unknown = JSON.parse(text);
    if (typeof v === 'object' && v !== null) return v as Record<string, unknown>;
  } catch {
    /* fall through */
  }
  throw new Error(NOT_BACKUP);
};

/** A parsed backup, opened with the password when it is locked. Throws before anything changes. */
const opened = async (v: Record<string, unknown>, password: string | undefined): Promise<Record<string, unknown>> =>
  isLockedBackup(v) ? unlockBackup(v, password ?? '') : v;

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export type CheckResult =
  | { readonly ok: true; readonly records: number; readonly recordIds?: readonly string[] }
  /** `needsPassword`: the file is locked and no password was given (the page asks for it). */
  | { readonly ok: false; readonly reason: string; readonly needsPassword?: true };

/**
 * Open a saved copy and check it holds everything this browser holds now: the same holder
 * key, and every record's keys with the same anchor and pairing. Changes nothing unless it
 * passes; then every record is marked backed up.
 */
export const checkBackup = async (
  file: File,
  password?: string,
  /**
   * `mark: false` checks without marking anything backed up. `mark: 'copy'` is the account copy
   * (account-copy.ts) once its way back has been checked: it marks what it holds with the
   * copy as the source (security review S1), and never a document kept on this device only
   * (B3): those aren't in it, and still need the file.
   */
  opts: { mark?: boolean | 'copy'; exclude?: ReadonlySet<string> } = {},
): Promise<CheckResult> => {
  const copyMode = opts.mark === 'copy';
  let v: Record<string, unknown>;
  try {
    v = await opened(parse(await file.text()), password);
  } catch (e) {
    if (e instanceof BackupNeedsPassword) return { ok: false, reason: e.message, needsPassword: true };
    return { ok: false, reason: (e as Error).message };
  }
  if (v.format !== BACKUP_FORMAT) {
    return { ok: false, reason: "That's an older or different file. Pick the backup you just saved." };
  }
  const current = holderKeyIfAny();
  if (current && str(v.holderKey).toLowerCase() !== current.toLowerCase()) {
    return { ok: false, reason: 'That backup belongs to a different set of records. Pick the one you just saved.' };
  }
  // Without the vault key, a backup can't open the records on another device.
  const vault = vaultKeyIfAny();
  if (vault && v.vaultKey !== vault) {
    return { ok: false, reason: NO_VAULT_KEY };
  }
  const inFile = new Map<string, Record<string, unknown>>();
  for (const e of Array.isArray(v.records) ? v.records : []) {
    if (typeof e === 'object' && e !== null && typeof (e as { recordId?: unknown }).recordId === 'string') {
      inFile.set((e as { recordId: string }).recordId, e as Record<string, unknown>);
    }
  }
  const localOnly = copyMode ? deviceOnlyRecords() : {};
  const held: RecordKeys[] = allKeys().filter((k) => !(k.recordId in localOnly) && !opts.exclude?.has(k.recordId));
  const missing = held.filter((k) => {
    const e = inFile.get(k.recordId);
    return (
      !e ||
      str(e.recordSecret).toLowerCase() !== k.recordSecret ||
      !same(e.anchor, k.anchor) ||
      !same(e.dnaOnChain, k.dnaOnChain)
    );
  });
  if (missing.length > 0) {
    return {
      ok: false,
      reason:
        missing.length === held.length
          ? "That backup doesn't hold your records as they are now. Save a new one and check that."
          : `That backup is missing the latest for ${missing.length} of your records. Save a new one and check that.`,
    };
  }
  const lab = loadAttester();
  if (lab && !same((v.labSignature as { keypair?: unknown } | undefined)?.keypair, lab.keypair)) {
    return { ok: false, reason: "That backup doesn't hold your lab's signature. Save a new one and check that." };
  }
  // A lab's deliveries: without the breeder's lock, a lab on a new device can't send a
  // lab report back. A lab code a breeder made isn't checked: losing one only means
  // making a new code.
  if (deliveriesMissingFrom(v.labDeliveries).length > 0) {
    return { ok: false, reason: "That backup doesn't hold your latest deliveries. Save a new one and check that." };
  }
  // A license held here: without its secret on another device it can't be activated or shown.
  if (heldMissingFrom(v.heldLicenses).length > 0 || issuerDealsMissingFrom(v.issuerDeals).length > 0) {
    return { ok: false, reason: "That backup doesn't hold your latest licenses. Save a new one and check that." };
  }
  // A lender's identity: without its secret nobody can ever release a claim it made.
  if (!lenderHeldBy(v.lender)) {
    return {
      ok: false,
      reason: "That backup doesn't hold your lender key and latest claims. Save a new one and check that.",
    };
  }
  // Documents kept on this device only: this file is their only other copy, so it must hold
  // each of them as it is now (docs/device-only-records.md). Not asked of the account copy,
  // which holds keys and never records, and never holds theirs.
  if (
    opts.mark === true || opts.mark === undefined
      ? deviceOnlyMissingFrom(v.recordData).length > 0 || unreadableMissingFrom(v.deviceOnlyUnreadable).length > 0
      : false
  ) {
    return { ok: false, reason: DEVICE_ONLY_NOT_IN_FILE };
  }
  if (copyMode) {
    const at = Date.now();
    // What the copy says was deleted isn't in it for a new device: a mark it gave before goes.
    if (opts.exclude?.size) clearCopyBackedUp(opts.exclude);
    markBackedUp(
      held.map((k) => k.recordId),
      at,
      'copy',
    );
    markHeldBackedUp(v.heldLicenses, at, 'copy');
    markIssuerDealsBackedUp(v.issuerDeals, 'copy');
    markLenderBackedUp(v.lender, at, 'copy');
    if (vault) markVaultBackedUp(at, 'copy');
    if (lab) markLabKeyBackedUp(lab.keypair.publicKey, 'copy');
  } else if (opts.mark !== false) {
    markDeviceOnlyBackedUp(v.recordData);
    markReceivingBackedUp(v.receiving);
    markBackedUp(held.map((k) => k.recordId));
    markHeldBackedUp(v.heldLicenses);
    markIssuerDealsBackedUp(v.issuerDeals);
    markLenderBackedUp(v.lender);
    if (vault) markVaultBackedUp();
    // Checked above: the file holds this lab key.
    if (lab) markLabKeyBackedUp(lab.keypair.publicKey);
  }
  return { ok: true, records: held.length, recordIds: held.map((k) => k.recordId) };
};

/**
 * The account copy, or the way back that let it count, is gone (security review S1): every
 * "backed up" mark it made goes, so what only it held waits for a backup again. What a checked
 * file marked stays.
 */
export const clearCopyMarks = (): void => {
  clearCopyBackedUp();
  clearVaultCopyMark();
  clearHeldCopyMarks();
  clearIssuerDealsCopyMarks();
  clearLenderCopyMark();
  clearLabKeyCopyMark();
};

export type RestoreResult = {
  readonly records: number;
  /** The records whose keys came back (to word them: plants, or records dating a lab report). */
  readonly recordIds?: readonly string[];
  readonly holderKey: 'restored' | 'already' | 'none';
  /**
   * The vault key: 'none' when the file has none (a version 2 file, or an older holder-key
   * file), so records sealed since stay locked until a newer backup is opened.
   */
  readonly vaultKey?: 'restored' | 'already' | 'none';
  readonly labSignature: boolean;
  /** Deliveries (a lab's) and lab codes (a breeder's) added from the file. */
  readonly deliveries?: number;
  readonly sentCodes?: number;
  /** Delivery codes still being received, added from the file. */
  readonly receiving?: number;
  /** The records the file carried (recordData): what was put back, or why none were. */
  readonly fromFile?: ImportResult | { readonly error: string };
};

/**
 * What a backup file says about itself, read without changing anything: when it was made and
 * how many records it holds. Shown before a file is restored into an empty browser, so a file
 * someone else made (sent to trick you, or an old one) is seen for what it is first (full
 * review, 22 Nov). A locked file needs its password first (BackupNeedsPassword). Null for the
 * older files that say neither (a single record's keys, a holder-key text file).
 */
export const peekBackup = async (
  file: File,
  password?: string,
): Promise<{ readonly savedAt?: string; readonly records: number } | null> => {
  const text = await file.text();
  if (text.startsWith('VeilCore holder key')) return null;
  const v = await opened(parse(text), password);
  if (v.format !== BACKUP_FORMAT) {
    if (v.format === 'veilcore-record-keys') return null;
    throw new Error("That file isn't a VeilCore backup. Pick the file you saved from VeilCore.");
  }
  const records = Array.isArray(v.records) ? v.records.length : 0;
  return { savedAt: typeof v.savedAt === 'string' ? v.savedAt : undefined, records };
};

/**
 * Restore from any VeilCore backup: the one-file backup, an older single record's keys
 * file, or an older holder-key text file. Never replaces a different key already here.
 */
/**
 * How a restore treats what it brings back. A passkey copy (passkey-backup.ts) is not a backup
 * file: restoring from one marks nothing backed up. A copy merged in automatically, when another
 * device saved first, also leaves alone what this browser removed on purpose and never swaps
 * this browser's vault key (attack pass of 21 Oct, re-check, findings A and B).
 */
export type RestoreOptions = {
  readonly mark?: boolean;
  readonly skipForgotten?: boolean;
  readonly keepVault?: boolean;
  /**
   * Records deleted on another device (the account copy's list, security review S13): never
   * brought back by this restore.
   */
  readonly skipIds?: ReadonlySet<string>;
};

export const restoreAny = async (file: File, password?: string, opts: RestoreOptions = {}): Promise<RestoreResult> => {
  const text = await file.text();
  // The older holder-key file is plain text with the key on its own line.
  const keyLine = text.split(/\r?\n/).find((l) => HEX64.test(l.trim()));
  if (text.startsWith('VeilCore holder key') && keyLine) {
    // From sealed records on, the file also has a `vault key:` line (holder.ts).
    const vaultLine = /^\s*vault key:\s*(\S+)\s*$/im.exec(text)?.[1];
    const fileVault = vaultLine && isVaultKey(vaultLine) ? vaultLine : undefined;
    const current = holderKeyIfAny();
    if (current && current.toLowerCase() !== keyLine.trim().toLowerCase()) {
      throw new Error('This browser is already using a different set of records. Nothing was changed.');
    }
    if (fileVault) await checkVaultFits(fileVault, keyLine.trim());
    const holder = adoptHolderKey(keyLine.trim());
    return {
      records: 0,
      holderKey: holder,
      vaultKey: fileVault ? adoptVaultKey(fileVault) : 'none',
      labSignature: false,
    };
  }
  // A locked file is opened first: a missing or wrong password throws before anything changes.
  const v = await opened(parse(text), password);
  if (v.format === 'veilcore-record-keys') {
    const k = restoreKeysEntry(v);
    return { records: 1, recordIds: [k.recordId], holderKey: 'none', labSignature: false };
  }
  if (v.format !== BACKUP_FORMAT)
    throw new Error("That file isn't a VeilCore backup. Pick the file you saved from VeilCore.");

  // Check everything before changing anything, so a refused file changes nothing.
  const entries = (Array.isArray(v.records) ? (v.records as unknown[]) : [])
    .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
    .filter((e) => !(opts.skipForgotten && typeof e.recordId === 'string' && wasForgotten(e.recordId)))
    .filter((e) => !(opts.skipIds && typeof e.recordId === 'string' && opts.skipIds.has(e.recordId)));
  for (const e of entries) {
    const existing = typeof e.recordId === 'string' ? keysFor(e.recordId) : undefined;
    if (existing && existing.recordSecret !== str(e.recordSecret).toLowerCase()) {
      throw new Error('This browser already holds different keys for one of those plants. Nothing was changed.');
    }
  }
  const current = holderKeyIfAny();
  const fileKey = typeof v.holderKey === 'string' ? v.holderKey : undefined;
  if (fileKey && current && current.toLowerCase() !== fileKey.toLowerCase()) {
    throw new Error('This browser is already using a different set of records. Nothing was changed.');
  }
  const lab = v.labSignature;
  const currentLab = loadAttester();
  if (lab && currentLab && !same((lab as { keypair?: unknown }).keypair, currentLab.keypair)) {
    throw new Error('This browser already has a different lab signature. Nothing was changed.');
  }
  // A version 2 file has no vault key: it restores the rest, and records sealed since stay
  // locked until a newer backup is opened.
  const fileVault = isVaultKey(v.vaultKey) ? v.vaultKey : undefined;
  if (fileVault && opts.keepVault && vaultKeyIfAny() && vaultKeyIfAny() !== fileVault) throw new Error(DIFFERENT_VAULT);
  if (fileVault) await checkVaultFits(fileVault, fileKey);

  const holder = fileKey ? adoptHolderKey(fileKey) : 'none';
  const vault = fileVault ? adoptVaultKey(fileVault, opts.mark !== false) : 'none';
  const before = new Set(allKeys().map((k) => k.recordId));
  const recordIds = entries.map((e) => restoreKeysEntry(e, { mark: opts.mark }).recordId);
  // New to this device: made elsewhere, so never listed as in progress here (arrived.ts).
  noteArrived(recordIds.filter((id) => !before.has(id)));
  const labAdopted = lab ? adoptAttester(lab) : false;
  // A lab key that came from the file is in that file: backed up, unless this is a copy that
  // marks nothing (a passkey copy, RestoreOptions).
  if (labAdopted && opts.mark !== false) {
    const adopted = loadAttester();
    if (adopted) markLabKeyBackedUp(adopted.keypair.publicKey);
  }
  // Merged, never replacing an entry already here (a lock this browser has stays).
  const deliveries = mergeDeliveries(v.labDeliveries);
  const sentCodes = mergeSentCodes(v.sentCodes);
  // Only ever raises a mark here (P4): a file older than what this browser has seen can't
  // make it take an older copy.
  raiseRevMarks(v.revs);
  mergeHeldLicenses(v.heldLicenses, { mark: opts.mark });
  mergeIssuerDeals(v.issuerDeals);
  mergeLender(v.lender, { mark: opts.mark });
  // Codes still being received: merged, never replacing one here, so the delivery can be
  // finished on this device.
  const receiving = mergeReceiving(v.receiving, { mark: opts.mark });
  // The records the file carries, once their keys are back: put back any this browser and
  // its registry don't have (the same rules as an import: each must recompute, none
  // overwrites one already here). A problem here doesn't undo the keys restored above.
  let fromFile: ImportResult | { error: string } | undefined;
  if (Array.isArray(v.recordData) && v.recordData.length > 0) {
    try {
      fromFile = await importRecordRows(v.recordData as unknown[]);
    } catch (e) {
      fromFile = { error: e instanceof Error ? e.message : String(e) };
    }
    // The file just read holds them: documents kept on this device only that it carries are in
    // a backup the holder has (never for a passkey copy, which carries no records).
    if (opts.mark !== false && fromFile && !('error' in fromFile)) markDeviceOnlyBackedUp(v.recordData);
  }
  // Entries the file carries raw (they couldn't be read where it was made): back as they were,
  // after the records, so what this browser and the registry hold is known (records.ts).
  restoreUnreadable(v.deviceOnlyUnreadable);
  return {
    ...(fromFile ? { fromFile } : {}),
    records: entries.length,
    recordIds,
    holderKey: holder,
    vaultKey: vault,
    labSignature: labAdopted,
    deliveries,
    sentCodes,
    ...(receiving ? { receiving } : {}),
  };
};

const adoptHolderKey = (key: string): 'restored' | 'already' => {
  const current = holderKeyIfAny();
  if (current && current.toLowerCase() === key.toLowerCase()) return 'already';
  if (current) throw new Error('This browser is already using a different set of records. Nothing was changed.');
  setHolderKey(key);
  return 'restored';
};

/** backup.ts's words for a backup without the vault key (backup-words.ts translates them). */
export const NO_VAULT_KEY = enT.t('app.sealed.backup.noVaultKey');
export const DIFFERENT_VAULT = enT.t('app.sealed.backup.differentVault');
export const CANT_CHECK_VAULT = enT.t('app.sealed.backup.cantCheck');

/**
 * A file's vault key may replace this browser's whenever no row on the registry carries this
 * browser's key (CONTRACT.md #9, #23): then nothing is sealed with it that a swap would lock.
 * A key no accepted save used carries nothing; otherwise the registry is asked, and a
 * registry that can't answer is not taken as "none". It used to refuse whenever any sealed
 * row had been seen, rows locked under another key included, so a browser holding the
 * wrong key could never take the right one (review L3). Throws, before anything changes.
 */
const checkVaultFits = async (fileVault: string, fileHolder: string | undefined): Promise<void> => {
  const here = vaultKeyIfAny();
  if (!here || here === fileVault) return;
  if (!vaultHasSealed()) return;
  const holder = holderKeyIfAny() ?? fileHolder;
  if (!holder) return;
  const kid = await vaultKid();
  const kids = await registryKids(holder);
  if (kids === 'unknown') throw new Error(CANT_CHECK_VAULT);
  if (kid && kids.has(kid)) throw new Error(DIFFERENT_VAULT);
};

const adoptVaultKey = (key: string, mark = true): 'restored' | 'already' => {
  if (vaultKeyIfAny() === key) {
    if (mark) markVaultBackedUp();
    return 'already';
  }
  // From a copy that marks nothing (the account copy), the key isn't marked either: the copy's
  // own check marks it, once that passes (it used to be marked as from a file).
  setVaultKey(key, Date.now(), mark);
  return 'restored';
};
