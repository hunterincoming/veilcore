// A record's two on-chain secrets, made and kept in this browser only.
//
//   record secret    proves you hold the record (its on-chain identity is commit(secret))
//   recovery secret  moves the record to a new secret if the first is lost or stolen
//
// They are stored under their own localStorage key, which nothing else reads or sends.
// Since round 4 (F5) a copy also goes inside the record's SEALED part (`secrets`, never a
// clear field): sealed with the vault key, which never leaves the browser, so a restore of
// the vault key brings them back with the record (sealedSecretsOf, adoptSealedSecrets).
// Before, a plant logged after the last checked backup lost them when storage was wiped,
// and with them every lab report locked to it. A test checks that no secret ever appears
// readable in a registry request (record-keys.test.ts).
//
// The record's on-chain identity and its anchor are kept here too, not on the record.
// They are public on chain, but the registry knows which holder key holds which record;
// with the identity on the record it could join a holder to their on-chain activity.
// The holder shares the identity only with the people they send a verify link to.
//
// Lose them (clear the browser, private window, new device without the backup) and
// nobody, VeilCore included, can prove the record again. So the app makes the backup
// file first and asks for it before anchoring, and warns before anything clears them.
// SPDX-License-Identifier: Apache-2.0

import { useSyncExternalStore } from 'react';
import { bindingForSecret } from './key-binding';

const KEY = 'veilcore.record-keys.v1';

const HEX64 = /^[0-9a-f]{64}$/;

/** Where the record's identity was anchored. Public on chain; kept local (see above). */
export type ChainAnchor = {
  /** commit(record secret), hex. */
  readonly identity: string;
  readonly network: string;
  readonly contractAddress: string;
  readonly txId: string;
  readonly txHash: string;
  readonly blockHeight: number;
  /** Block time (ms): the chain's clock, not this device's. */
  readonly anchoredAt?: number;
};

/**
 * A bound DNA pairing (chain/pairing.ts): what went on chain is the binding, never the
 * report's fingerprint. The salt is saved BEFORE the call is sent ('sending'), and the
 * transaction once it lands ('paired'). The fingerprint and the salt are private: with
 * them anyone holding the report can recognise the pairing. Both go in the backup file:
 * without the salt the pairing can never be shown, and nothing else brings it back.
 */
export type DnaOnChain = {
  /** SHA-256 of the report file, hex. Private. */
  readonly fingerprint: string;
  /** 32 random bytes, hex. Private. */
  readonly salt: string;
  /** What was published: H("veilcore:v1:dnapair", fingerprint, identity, salt). */
  readonly binding: string;
  /** The record's on-chain identity the binding is made for. */
  readonly identity: string;
  readonly status: 'sending' | 'paired';
  readonly txId?: string;
  readonly txHash?: string;
  readonly blockHeight?: number;
  readonly at?: number;
};

const isDnaOnChain = (v: unknown): v is DnaOnChain => {
  if (typeof v !== 'object' || v === null) return false;
  const d = v as Record<string, unknown>;
  return (
    [d.fingerprint, d.salt, d.binding, d.identity].every((x) => typeof x === 'string' && HEX64.test(x)) &&
    (d.status === 'sending' || d.status === 'paired')
  );
};

export type RecordKeys = {
  readonly recordId: string;
  /** 32 bytes, hex. Secret. */
  readonly recordSecret: string;
  /** 32 bytes, hex. Secret. */
  readonly recoverySecret: string;
  readonly createdAt: number;
  /** When the backup file was last downloaded (or the keys were restored from one). */
  readonly backedUpAt?: number;
  readonly anchor?: ChainAnchor;
  readonly dnaOnChain?: DnaOnChain;
};

const isKeys = (v: unknown): v is RecordKeys => {
  if (typeof v !== 'object' || v === null) return false;
  const k = v as Record<string, unknown>;
  return (
    typeof k.recordId === 'string' &&
    typeof k.recordSecret === 'string' &&
    HEX64.test(k.recordSecret) &&
    typeof k.recoverySecret === 'string' &&
    HEX64.test(k.recoverySecret) &&
    typeof k.createdAt === 'number'
  );
};

const randomHex = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');

export const hexBytes = (hex: string): Uint8Array => Uint8Array.from(hex.match(/../g) ?? [], (b) => parseInt(b, 16));

/** In memory when the browser will not store anything (private window, blocked storage). */
let sessionOnly: Record<string, RecordKeys> = {};
const listeners = new Set<() => void>();

const readAll = (): Record<string, RecordKeys> => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...sessionOnly };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, RecordKeys> = {};
    for (const [id, v] of Object.entries(parsed)) if (isKeys(v)) out[id] = v;
    // What could not be written (storage full or blocked) is newer than what was: it wins.
    return { ...out, ...sessionOnly };
  } catch {
    return { ...sessionOnly };
  }
};

/** What is stored right now, nothing from memory: what another tab wrote a moment ago included. */
const readStored = (): Record<string, RecordKeys> => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, RecordKeys> = {};
    for (const [id, v] of Object.entries(parsed)) if (isKeys(v)) out[id] = v;
    return out;
  } catch {
    return {};
  }
};

/**
 * What a write may store, given what is stored at that moment. Keys are never lost or
 * replaced by a write that didn't mean to: two tabs each read the whole set, added their own
 * record's keys and wrote the whole set back, and the later write dropped the earlier tab's
 * new key (recheck 6: two records sealed for one lab report, one left with no key). So:
 *   - an entry stored now that the write doesn't name is kept (unless it is the one being forgotten);
 *   - an entry stored now is kept, unchanged, if the write would give that record other secrets;
 *   - an entry filed under another record's id is never written.
 * Same secrets: the write's version wins (an anchor, a pairing, a backup mark).
 */
export const mergeForWrite = (
  stored: Readonly<Record<string, RecordKeys>>,
  next: Readonly<Record<string, RecordKeys>>,
  forget?: string,
): Record<string, RecordKeys> => {
  const out: Record<string, RecordKeys> = {};
  for (const [id, k] of Object.entries(next)) if (k.recordId === id && id !== forget) out[id] = k;
  for (const [id, k] of Object.entries(stored)) {
    if (id === forget) continue;
    const mine = out[id];
    if (!mine || mine.recordSecret !== k.recordSecret || mine.recoverySecret !== k.recoverySecret) out[id] = k;
  }
  return out;
};

const writeAll = (all: Record<string, RecordKeys>, forget?: string): boolean => {
  try {
    localStorage.setItem(KEY, JSON.stringify(mergeForWrite(readStored(), all, forget)));
    return true;
  } catch {
    return false;
  }
};

let snapshot: Record<string, RecordKeys> = readAll();

const changed = (): void => {
  snapshot = readAll();
  listeners.forEach((l) => l());
};

/**
 * Whether this browser keeps what it is given. False in some private windows and when
 * site data is blocked; keys made then last only until the tab closes.
 */
export const storageKeeps = (): boolean => {
  try {
    const probe = `${KEY}.probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
};

export const keysFor = (recordId: string): RecordKeys | undefined => readAll()[recordId];

/** The record's keys, made now if it has none. Never replaces existing keys. */
export const ensureKeys = (recordId: string, now = Date.now()): RecordKeys => {
  const all = readAll();
  const existing = all[recordId];
  if (existing) return existing;
  const keys: RecordKeys = { recordId, recordSecret: randomHex(), recoverySecret: randomHex(), createdAt: now };
  const next = { ...all, [recordId]: keys };
  if (!writeAll(next)) sessionOnly = { ...sessionOnly, [recordId]: keys };
  changed();
  // What is stored is what counts: never hand back keys the store didn't keep.
  return readAll()[recordId] ?? keys;
};

/**
 * Whether these keys are the ones a record named when it was sealed (key-binding.ts). A
 * record sealed before keys were named in records (no keyBinding) fits any keys.
 */
export const keysFitRecord = (keys: Pick<RecordKeys, 'recordSecret'>, record: { keyBinding?: string }): boolean =>
  record.keyBinding === undefined || bindingForSecret(keys.recordSecret).keyBinding === record.keyBinding;

export const KEYS_NOT_THIS_RECORDS =
  'This plant’s key isn’t in this browser. Get it back from your backup file: a new key wouldn’t match the sealed record.';

/**
 * The record's keys for an on-chain step. A record that names its key gets only that key:
 * new keys would be a key the record never named, and every proof made with them would be
 * refused. Older records get theirs made now if they have none, as before.
 */
export const ensureKeysFor = (record: { id: string; keyBinding?: string }): RecordKeys => {
  if (record.keyBinding === undefined) return ensureKeys(record.id);
  const k = keysFor(record.id);
  if (!k || !keysFitRecord(k, record)) throw new Error(KEYS_NOT_THIS_RECORDS);
  return k;
};

const update = (recordId: string, f: (k: RecordKeys) => RecordKeys): void => {
  const all = readAll();
  const k = all[recordId];
  if (!k) return;
  const next = { ...all, [recordId]: f(k) };
  if (!writeAll(next)) sessionOnly = { ...sessionOnly, [recordId]: f(k) };
  changed();
};

/** The backup file's contents. Secret: it is for the holder only. */
export const backupFile = (
  keys: RecordKeys,
  extra: { cultivar?: string; network?: string; contract?: string; identity?: string },
) =>
  JSON.stringify(
    {
      format: 'veilcore-record-keys',
      version: 1,
      warning:
        'SECRET. Anyone with this file can act as the holder of this record on chain. It also holds the salt that lets your DNA pairing be shown. VeilCore has no copy and cannot recover it. Keep it offline.',
      recordId: keys.recordId,
      cultivar: extra.cultivar,
      network: extra.network,
      contract: extra.contract,
      identity: keys.anchor?.identity ?? extra.identity,
      anchor: keys.anchor,
      dnaOnChain: keys.dnaOnChain,
      recordSecret: keys.recordSecret,
      recoverySecret: keys.recoverySecret,
      createdAt: new Date(keys.createdAt).toISOString(),
    },
    null,
    2,
  );

/** Download the backup file, and remember that it was made. */
export const downloadBackup = (keys: RecordKeys, extra: Parameters<typeof backupFile>[1]): void => {
  const blob = new Blob([backupFile(keys, extra)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${keys.recordId}.record-keys.SECRET.json`;
  a.click();
  URL.revokeObjectURL(url);
  update(keys.recordId, (k) => ({ ...k, backedUpAt: Date.now() }));
};

/** Restore keys from a backup file (another device, or after clearing the browser). */
export const restoreBackup = async (file: File): Promise<RecordKeys> => {
  const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
  if (parsed.format !== 'veilcore-record-keys') throw new Error('That is not a VeilCore record-keys file.');
  return restoreKeysEntry(parsed);
};

/**
 * Restore one record's keys from a parsed backup entry: the single-record file above, or
 * one entry of the one-file backup (backup.ts). Shared so both read keys the same way.
 */
export const restoreKeysEntry = (
  parsed: Record<string, unknown>,
  /** `mark: false`: from a passkey copy, which is not a backup file: keep this browser's mark as it was. */
  opts: { mark?: boolean } = {},
): RecordKeys => {
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  const keys = {
    recordId: str(parsed.recordId),
    recordSecret: str(parsed.recordSecret).toLowerCase(),
    recoverySecret: str(parsed.recoverySecret).toLowerCase(),
    createdAt: Date.parse(str(parsed.createdAt)) || Date.now(),
    backedUpAt: Date.now(),
    ...(typeof parsed.anchor === 'object' && parsed.anchor !== null ? { anchor: parsed.anchor as ChainAnchor } : {}),
    ...(isDnaOnChain(parsed.dnaOnChain) ? { dnaOnChain: parsed.dnaOnChain } : {}),
  };
  if (!isKeys(keys)) throw new Error('That file is damaged: the keys in it are not readable.');
  const existing = keysFor(keys.recordId);
  if (existing && existing.recordSecret !== keys.recordSecret) {
    throw new Error('This browser already holds different keys for that record. Nothing was changed.');
  }
  // Restoring an older backup must not drop what this browser saved since (a pairing's
  // salt, an anchor): keep this browser's, unless the backup has the same pairing landed.
  const dna =
    existing?.dnaOnChain &&
    !(
      keys.dnaOnChain?.binding === existing.dnaOnChain.binding &&
      keys.dnaOnChain.status === 'paired' &&
      existing.dnaOnChain.status === 'sending'
    )
      ? existing.dnaOnChain
      : keys.dnaOnChain;
  const anchor = keys.anchor ?? existing?.anchor;
  const sameAsFile =
    JSON.stringify(dna ?? null) === JSON.stringify(keys.dnaOnChain ?? null) &&
    JSON.stringify(anchor ?? null) === JSON.stringify(keys.anchor ?? null);
  const { backedUpAt: _b, ...fromFile } = keys;
  void _b;
  // Marked backed up only when the file holds everything kept: otherwise the browser holds
  // something (a newer salt, say) that no backup file has yet.
  const merged: RecordKeys = {
    ...fromFile,
    ...(anchor ? { anchor } : {}),
    ...(dna ? { dnaOnChain: dna } : {}),
    ...(opts.mark === false
      ? existing?.backedUpAt !== undefined
        ? { backedUpAt: existing.backedUpAt }
        : {}
      : sameAsFile
        ? { backedUpAt: Date.now() }
        : {}),
  };
  const all = readAll();
  if (!writeAll({ ...all, [keys.recordId]: merged })) sessionOnly = { ...sessionOnly, [keys.recordId]: merged };
  if (wasForgotten(keys.recordId)) writeForgotten(readForgotten().filter((id) => id !== keys.recordId));
  changed();
  return merged;
};

/**
 * A record's secrets as they go inside its sealed part (round 4, F5): the two secrets and when
 * they were made. Never a clear field: api-store.ts seals every field but the public ones.
 */
export type SealedSecrets = {
  readonly recordSecret: string;
  readonly recoverySecret: string;
  readonly createdAt: number;
};

export const isSealedSecrets = (v: unknown): v is SealedSecrets => {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.recordSecret === 'string' &&
    HEX64.test(s.recordSecret) &&
    typeof s.recoverySecret === 'string' &&
    HEX64.test(s.recoverySecret) &&
    typeof s.createdAt === 'number'
  );
};

/** What a record's sealed part carries for these keys. */
export const sealedSecretsOf = (k: RecordKeys): SealedSecrets => ({
  recordSecret: k.recordSecret,
  recoverySecret: k.recoverySecret,
  createdAt: k.createdAt,
});

/**
 * Keys found in a record's sealed part (round 4, F5), kept here when this browser has none
 * for it: a restored vault key opens the record, and with it the record's secrets. Never
 * replaces keys this browser holds. Only keys the record names (its key binding), when it
 * names one. True when they were taken.
 */
export const adoptSealedSecrets = (record: { id: string; keyBinding?: string }, s: unknown): boolean => {
  if (!isSealedSecrets(s) || keysFor(record.id) || wasForgotten(record.id)) return false;
  if (!keysFitRecord(s, record)) return false;
  const keys: RecordKeys = {
    recordId: record.id,
    recordSecret: s.recordSecret,
    recoverySecret: s.recoverySecret,
    createdAt: s.createdAt,
    // Held in the sealed record, which the vault key in the checked backup opens.
    backedUpAt: Date.now(),
  };
  const all = readAll();
  if (!writeAll({ ...all, [record.id]: keys })) sessionOnly = { ...sessionOnly, [record.id]: keys };
  changed();
  return true;
};

/** Every record's keys this browser holds. */
export const allKeys = (): RecordKeys[] => Object.values(readAll());

/** One backup entry for a record's keys: what the one-file backup stores per record. */
export const keysEntry = (keys: RecordKeys) => ({
  recordId: keys.recordId,
  identity: keys.anchor?.identity,
  anchor: keys.anchor,
  dnaOnChain: keys.dnaOnChain,
  recordSecret: keys.recordSecret,
  recoverySecret: keys.recoverySecret,
  createdAt: new Date(keys.createdAt).toISOString(),
});

/** Mark these records as held in a backup that was checked to open (backup.ts). */
export const markBackedUp = (recordIds: readonly string[], at = Date.now()): void => {
  const all = readAll();
  const next = { ...all };
  for (const id of recordIds) if (next[id]) next[id] = { ...next[id], backedUpAt: at };
  if (!writeAll(next)) for (const id of recordIds) if (next[id]) sessionOnly = { ...sessionOnly, [id]: next[id] };
  changed();
};

/** Record where the identity was anchored (after the anchor lands). */
export const setAnchor = (recordId: string, anchor: ChainAnchor): void => update(recordId, (k) => ({ ...k, anchor }));

/** Save a bound pairing: before sending ('sending', with its salt), and once it lands. */
export const setDnaOnChain = (recordId: string, dnaOnChain: DnaOnChain): void =>
  update(recordId, (k) => {
    // A backup made before this change does not hold it (a new salt, or the transaction
    // of a pairing that has now landed): ask for a fresh one.
    const changed = k.dnaOnChain?.salt !== dnaOnChain.salt || k.dnaOnChain?.status !== dnaOnChain.status;
    const { backedUpAt, ...rest } = k;
    return changed ? { ...rest, dnaOnChain } : { ...rest, backedUpAt, dnaOnChain };
  });

/** Forget a pairing that was never sent (the call failed before anything left the browser). */
export const clearDnaOnChain = (recordId: string): void =>
  update(recordId, (k) => {
    const { dnaOnChain: _dropped, ...rest } = k;
    void _dropped;
    return rest;
  });

/** Keys that exist only in this browser, with no backup made. */
export const keysWithoutBackup = (): RecordKeys[] => Object.values(readAll()).filter((k) => k.backedUpAt === undefined);

/**
 * Records whose keys the holder removed from this browser (round 4, F5): their sealed copy is
 * not taken back here, or "Remove from this browser" would be undone by the next load. A
 * restore from a backup file (restoreKeysEntry) takes that record off the list.
 */
const FORGOTTEN = 'veilcore.record-keys.forgotten.v1';
const readForgotten = (): string[] => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(FORGOTTEN) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};
const writeForgotten = (ids: readonly string[]): void => {
  try {
    if (ids.length) localStorage.setItem(FORGOTTEN, JSON.stringify(ids));
    else localStorage.removeItem(FORGOTTEN);
  } catch {
    /* a browser that keeps nothing keeps no keys to take back either */
  }
};
export const wasForgotten = (recordId: string): boolean => readForgotten().includes(recordId);

/** Delete a record's keys from this browser. The UI asks first, and says what is lost. */
export const forgetKeys = (recordId: string): void => {
  if (!wasForgotten(recordId)) writeForgotten([...readForgotten(), recordId]);
  const all = readAll();
  delete all[recordId];
  const { [recordId]: _dropped, ...rest } = sessionOnly;
  void _dropped;
  sessionOnly = rest;
  writeAll(all, recordId);
  changed();
};

const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

// Another tab saved or forgot keys: show what is stored now.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) changed();
  });
}

/** React: the keys this browser holds, by record id. */
export const useRecordKeys = (): Record<string, RecordKeys> => useSyncExternalStore(subscribe, () => snapshot);

/** Tests only. */
export const __resetRecordKeysForTests = (): void => {
  sessionOnly = {};
  snapshot = {};
};
