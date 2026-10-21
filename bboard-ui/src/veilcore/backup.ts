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
//     registry serves. A version 3 file without them restores as before.
//
// A password on the file is offered, and suggested, not forced (persona review, 17 Oct): the
// file opens every locked detail, so an email account that gets broken into would leak it. A
// file with a password is version 4: { format, version: 4, warning, savedAt, locked } where
// `locked` holds the version 3 JSON sealed with AES-256-GCM under a key made from the password
// with PBKDF2-SHA256 (at least 600,000 iterations, a random 16-byte salt). Opening it asks for
// the password; a wrong one changes nothing. A file without a password stays version 3 and
// works as before. The password is never stored or sent anywhere.
// SPDX-License-Identifier: Apache-2.0

import { holderKeyIfAny, setHolderKey } from './holder';
import { allKeys, keysEntry, keysFor, markBackedUp, restoreKeysEntry, type RecordKeys } from './record-keys';
import { adoptAttester, loadAttester } from './attester-keys';
import { allDeliveries, deliveriesMissingFrom, mergeDeliveries } from './lab-results';
import { allSentCodes, mergeSentCodes } from './transfers';
import { isVaultKey, markVaultBackedUp, setVaultKey, vaultHasSealed, vaultKeyIfAny, vaultKid } from './vault';
import { raiseRevMarks, registryKids, revMarks } from './api-store';
import { heldLicensesForBackup, heldMissingFrom, markHeldBackedUp, mergeHeldLicenses } from './held-licenses';
import { enT } from '../i18n/translate';
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
};

const WARNING =
  'SECRET. This file is the only way to prove you hold your records, and to get them back on a new device. ' +
  'Anyone with it can act as you. VeilCore has no copy and cannot make another. Keep a copy off this device.';

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
  const contents = backupContents(now);
  return JSON.stringify(password ? await lockBackup(contents, password, iterations) : contents, null, 2);
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
  };
};

/** The file's name: readable, dated, and the same shape whatever is in it. */
export const backupFileName = (now = Date.now()): string => {
  // The person's own date, not UTC: a backup saved at 9pm in New Jersey is that day's.
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `VeilCore backup ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
};

/** True when there is anything worth backing up. */
export const hasAnythingToBackUp = (): boolean =>
  holderKeyIfAny() !== null ||
  vaultKeyIfAny() !== null ||
  allKeys().length > 0 ||
  loadAttester() !== null ||
  Object.keys(allDeliveries()).length > 0 ||
  heldLicensesForBackup().length > 0;

/**
 * Save the file. Deliberately does not mark anything as backed up: only checkBackup
 * does, once the saved copy has been opened and read back.
 */
export const downloadBackupAll = (now = Date.now(), text?: string): string => {
  const name = backupFileName(now);
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
export const checkBackup = async (file: File, password?: string): Promise<CheckResult> => {
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
  const held: RecordKeys[] = allKeys();
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
  if (heldMissingFrom(v.heldLicenses).length > 0) {
    return { ok: false, reason: "That backup doesn't hold your latest licenses. Save a new one and check that." };
  }
  markBackedUp(held.map((k) => k.recordId));
  markHeldBackedUp(v.heldLicenses);
  if (vault) markVaultBackedUp();
  return { ok: true, records: held.length, recordIds: held.map((k) => k.recordId) };
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
};

/**
 * Restore from any VeilCore backup: the one-file backup, an older single record's keys
 * file, or an older holder-key text file. Never replaces a different key already here.
 */
export const restoreAny = async (file: File, password?: string): Promise<RestoreResult> => {
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
  const entries = (Array.isArray(v.records) ? v.records : []).filter(
    (e): e is Record<string, unknown> => typeof e === 'object' && e !== null,
  );
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
  if (fileVault) await checkVaultFits(fileVault, fileKey);

  const holder = fileKey ? adoptHolderKey(fileKey) : 'none';
  const vault = fileVault ? adoptVaultKey(fileVault) : 'none';
  const recordIds = entries.map((e) => restoreKeysEntry(e).recordId);
  const labAdopted = lab ? adoptAttester(lab) : false;
  // Merged, never replacing an entry already here (a lock this browser has stays).
  const deliveries = mergeDeliveries(v.labDeliveries);
  const sentCodes = mergeSentCodes(v.sentCodes);
  // Only ever raises a mark here (P4): a file older than what this browser has seen can't
  // make it take an older copy.
  raiseRevMarks(v.revs);
  mergeHeldLicenses(v.heldLicenses);
  return {
    records: entries.length,
    recordIds,
    holderKey: holder,
    vaultKey: vault,
    labSignature: labAdopted,
    deliveries,
    sentCodes,
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

const adoptVaultKey = (key: string): 'restored' | 'already' => {
  if (vaultKeyIfAny() === key) {
    markVaultBackedUp();
    return 'already';
  }
  setVaultKey(key);
  return 'restored';
};
