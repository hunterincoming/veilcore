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
//     nobody's existing backup stops working.
//
// The file is not encrypted: a password is one more thing to forget, and that trade-off is
// decided before mainnet (docs/simple-flow.md). It says SECRET at the top, and why.
// SPDX-License-Identifier: Apache-2.0

import { holderKeyIfAny, setHolderKey } from './holder';
import { allKeys, keysEntry, keysFor, markBackedUp, restoreKeysEntry, type RecordKeys } from './record-keys';
import { adoptAttester, loadAttester } from './attester-keys';
import { allDeliveries, deliveriesMissingFrom, mergeDeliveries } from './lab-results';
import { allSentCodes, mergeSentCodes } from './transfers';
import { isVaultKey, markVaultBackedUp, sealedRowsSeen, setVaultKey, vaultHasSealed, vaultKeyIfAny } from './vault';
import { enT } from '../i18n/translate';

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
};

const WARNING =
  'SECRET. This file is the only way to prove you hold your records, and to get them back on a new device. ' +
  'Anyone with it can act as you. VeilCore has no copy and cannot make another. Keep a copy off this device.';

/** What goes in the file now. */
export const backupContents = (now = Date.now()): BackupContents => {
  const holderKey = holderKeyIfAny() ?? undefined;
  const vaultKey = vaultKeyIfAny() ?? undefined;
  const lab = loadAttester();
  const deliveries = allDeliveries();
  const codes = allSentCodes();
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
  Object.keys(allDeliveries()).length > 0;

/**
 * Save the file. Deliberately does not mark anything as backed up: only checkBackup
 * does, once the saved copy has been opened and read back.
 */
export const downloadBackupAll = (now = Date.now()): string => {
  const name = backupFileName(now);
  const blob = new Blob([JSON.stringify(backupContents(now), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  return name;
};

const parse = (text: string): Record<string, unknown> => {
  try {
    const v: unknown = JSON.parse(text);
    if (typeof v === 'object' && v !== null) return v as Record<string, unknown>;
  } catch {
    /* fall through */
  }
  throw new Error("That file isn't a VeilCore backup. Pick the file you saved from VeilCore.");
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export type CheckResult =
  | { readonly ok: true; readonly records: number; readonly recordIds?: readonly string[] }
  | { readonly ok: false; readonly reason: string };

/**
 * Open a saved copy and check it holds everything this browser holds now: the same holder
 * key, and every record's keys with the same anchor and pairing. Changes nothing unless it
 * passes; then every record is marked backed up.
 */
export const checkBackup = async (file: File): Promise<CheckResult> => {
  let v: Record<string, unknown>;
  try {
    v = parse(await file.text());
  } catch (e) {
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
  markBackedUp(held.map((k) => k.recordId));
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
export const restoreAny = async (file: File): Promise<RestoreResult> => {
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
    if (fileVault) checkVaultFits(fileVault);
    const holder = adoptHolderKey(keyLine.trim());
    return {
      records: 0,
      holderKey: holder,
      vaultKey: fileVault ? adoptVaultKey(fileVault) : 'none',
      labSignature: false,
    };
  }
  const v = parse(text);
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
  if (fileVault) checkVaultFits(fileVault);

  const holder = fileKey ? adoptHolderKey(fileKey) : 'none';
  const vault = fileVault ? adoptVaultKey(fileVault) : 'none';
  const recordIds = entries.map((e) => restoreKeysEntry(e).recordId);
  const labAdopted = lab ? adoptAttester(lab) : false;
  // Merged, never replacing an entry already here (a lock this browser has stays).
  const deliveries = mergeDeliveries(v.labDeliveries);
  const sentCodes = mergeSentCodes(v.sentCodes);
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

/**
 * A file's vault key may replace this browser's only while nothing here is sealed with it
 * (CONTRACT.md #9): with sealed rows, the key here is the only one that opens them, and a
 * restore that swapped it would lock them. Throws, before anything changes.
 */
const checkVaultFits = (fileVault: string): void => {
  const here = vaultKeyIfAny();
  if (!here || here === fileVault) return;
  if (sealedRowsSeen() || vaultHasSealed()) throw new Error(DIFFERENT_VAULT);
};

const adoptVaultKey = (key: string): 'restored' | 'already' => {
  if (vaultKeyIfAny() === key) {
    markVaultBackedUp();
    return 'already';
  }
  setVaultKey(key);
  return 'restored';
};
