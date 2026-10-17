// The vault key: what makes a record unreadable to VeilCore's registry (sealed records,
// CONTRACT.md #1-#5).
//
// 32 random bytes made in this browser and kept beside the holder key, in localStorage and
// in the one-file backup. It is never sent anywhere: not in a header, a body, a URL or a
// log. Every record and licence is sealed with it (AES-256-GCM) before a save, and opened
// with it after a load. The registry keeps the public name, fingerprints and the other
// public fields of CONTRACT.md #4 in the clear, and the rest only as ciphertext.
//
// Each sealed row names the key it was sealed with by `kid`, a one-way id of the key, and
// is bound to its own row by the AAD: a ciphertext moved to another row id, the other
// collection, or another key's rows does not open.
//
// A browser without the key shows such rows as locked (records.ts lockedRecords). A key
// is made only when no row this holder has is sealed yet (mayMintVault, api-store.ts
// makeVaultIfSafe): a second key would leave the first key's rows locked for good, and the
// registry refuses a holder's rows sealed under two keys. A key that this browser can't
// keep (a private window, blocked storage) is never made: it would die with the tab, and
// everything sealed with it would be locked for good (CONTRACT.md #23).
//
// Before sealing, the plaintext is padded with spaces (JSON allows them after the value)
// to a size bucket, so a ciphertext's length says little about how much was typed
// (CONTRACT.md #20): the next 1 KiB up to 16 KiB, then the next 8 KiB.
// SPDX-License-Identifier: Apache-2.0

import { useSyncExternalStore } from 'react';
import { base64urlnopad } from '@scure/base';

export const VAULT_STORAGE_KEY = 'veilcore.vault.v1';

/** A sealed record or licence row's `sealed` (CONTRACT.md #4). */
export type SealedBox = {
  readonly v: 1;
  readonly alg: 'A256GCM';
  readonly kid: string;
  readonly iv: string;
  readonly ct: string;
};

/** A transfer's sealed offer (CONTRACT.md #8): no kid, the key travels in the delivery code. */
export type OfferBox = { readonly v: 1; readonly alg: 'A256GCM'; readonly iv: string; readonly ct: string };

export type RowKind = 'records' | 'licenses';

type Stored = {
  /** 32 bytes, base64url without padding. */
  readonly key: string;
  readonly createdAt?: number;
  /** When something was first sealed with it: from then on it is the only key for those rows. */
  readonly sealedAt?: number;
  /** When a backup file holding it was opened and checked (backup.ts checkBackup). */
  readonly backedUpAt?: number;
};

const B64URL = /^[A-Za-z0-9_-]+$/;
const KID = /^[0-9a-f]{16}$/;

/** 32 bytes as base64url without padding, or undefined. */
const keyBytes = (b64: string): Uint8Array | undefined => {
  if (b64.length !== 43 || !B64URL.test(b64)) return undefined;
  try {
    const bytes = base64urlnopad.decode(b64);
    return bytes.length === 32 ? bytes : undefined;
  } catch {
    return undefined;
  }
};

/** A vault key as the backup and the key file write it. */
export const isVaultKey = (v: unknown): v is string => typeof v === 'string' && keyBytes(v) !== undefined;

// ---- storage -------------------------------------------------------------------------

/**
 * Session-only vault: only for a key adopted from a backup file in a browser that can't
 * store it (the file still has it). A key is never MADE into it (mintVault).
 */
let sessionVault: Stored | null = null;
const listeners = new Set<() => void>();
let snapshot: { key: string | null; needsBackup: boolean } = { key: null, needsBackup: false };

const read = (): Stored | null => {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(VAULT_STORAGE_KEY);
  } catch {
    return sessionVault;
  }
  if (!raw) return sessionVault;
  if (isVaultKey(raw)) return { key: raw };
  try {
    const v = JSON.parse(raw) as Partial<Stored> | null;
    if (v && isVaultKey(v.key)) {
      const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : undefined);
      return {
        key: v.key,
        ...(num(v.createdAt) !== undefined ? { createdAt: num(v.createdAt) } : {}),
        ...(num(v.sealedAt) !== undefined ? { sealedAt: num(v.sealedAt) } : {}),
        ...(num(v.backedUpAt) !== undefined ? { backedUpAt: num(v.backedUpAt) } : {}),
      };
    }
  } catch {
    /* not ours */
  }
  return sessionVault;
};

const refresh = () => {
  const s = read();
  const next = { key: s?.key ?? null, needsBackup: !!s && s.backedUpAt === undefined };
  if (next.key !== snapshot.key || next.needsBackup !== snapshot.needsBackup) snapshot = next;
  listeners.forEach((l) => l());
};

const write = (s: Stored | null): void => {
  try {
    if (s) localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(VAULT_STORAGE_KEY);
    sessionVault = null;
  } catch {
    sessionVault = s; // private browsing: this session only
  }
  refresh();
};

/** The vault key this browser has (base64url), or null. Never creates one. */
export const vaultKeyIfAny = (): string | null => read()?.key ?? null;

/** Whether any of these stored rows is already sealed. */
export const isSealedRow = (row: unknown): boolean =>
  typeof row === 'object' &&
  row !== null &&
  typeof (row as { sealed?: unknown }).sealed === 'object' &&
  (row as { sealed?: unknown }).sealed !== null;

/**
 * Whether a new vault key may be made: only when none of the holder's stored rows is sealed
 * yet. With a sealed row and no key here, the rows are locked and a new key would not open
 * them; the holder has to restore the backup that holds the key.
 */
export const mayMintVault = (storedRows: readonly unknown[]): boolean => !storedRows.some(isSealedRow);

/**
 * Whether this browser can keep a vault key: a value written to localStorage reads back.
 * Not in a private window that throws on writes, nor where site data is blocked.
 */
export const canStoreVault = (): boolean => {
  const probe = `${VAULT_STORAGE_KEY}.probe`;
  try {
    const v = base64urlnopad.encode(crypto.getRandomValues(new Uint8Array(8)));
    localStorage.setItem(probe, v);
    const ok = localStorage.getItem(probe) === v;
    localStorage.removeItem(probe);
    return ok;
  } catch {
    return false;
  }
};

/** When each vault key this browser made was made, by kid (for the locked-record words). */
const MADE_KEY = 'veilcore.vault.made.v1';
const readMade = (): Record<string, number> => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(MADE_KEY) ?? '{}');
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return {};
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).filter(
        (e): e is [string, number] => KID.test(e[0]) && typeof e[1] === 'number' && Number.isFinite(e[1]),
      ),
    );
  } catch {
    return {};
  }
};
/** The date the vault key with this kid was made, when this browser made it. */
export const vaultMadeAt = (kid: string): number | undefined => readMade()[kid];

/**
 * Make this browser's vault key. Returns the one already here, if there is one, and null
 * when this browser can't keep one: a key that can't be stored is never made. The caller
 * decides whether one may be made at all (api-store.ts makeVaultIfSafe).
 */
export const mintVault = (now = Date.now()): string | null => {
  const have = vaultKeyIfAny();
  if (have) return have;
  if (!canStoreVault()) return null;
  const key = base64urlnopad.encode(crypto.getRandomValues(new Uint8Array(32)));
  const stored: Stored = { key, createdAt: now };
  try {
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(stored));
    if (read()?.key !== key) throw new Error('not kept');
  } catch {
    try {
      localStorage.removeItem(VAULT_STORAGE_KEY);
    } catch {
      /* nothing kept */
    }
    refresh();
    return null;
  }
  sessionVault = null;
  void vaultKidOf(key).then((kid) => {
    try {
      localStorage.setItem(MADE_KEY, JSON.stringify({ ...readMade(), [kid]: now }));
    } catch {
      /* only the locked-record words use it */
    }
  });
  refresh();
  return key;
};

/** Adopt a vault key from a backup file (backup.ts). It counts as backed up: it came from one. */
export const setVaultKey = (key: string, now = Date.now()): void => {
  if (!isVaultKey(key)) throw new Error('A vault key is 32 bytes, written as 43 base64url characters.');
  keys.clear();
  cache.clear();
  write({ key, createdAt: now, sealedAt: now, backedUpAt: now });
};

/**
 * The registry accepted a save sealed with this browser's key: from now on it is the only
 * key for those rows (CONTRACT.md #23). Not before: a key whose rows the registry refused
 * is not in use, and may be replaced by a restore or cleared by Start over.
 */
export const markVaultSealed = (at = Date.now()): void => {
  const s = read();
  if (s && s.sealedAt === undefined) write({ ...s, sealedAt: at });
};

/**
 * Start over: forget a vault key no accepted save used. One that sealed something the
 * registry accepted stays: it is the only key that opens those rows.
 */
export const clearUnusedVault = (): boolean => {
  const s = read();
  if (!s || s.sealedAt !== undefined) return false;
  write(null);
  keys.clear();
  cache.clear();
  return true;
};

/** Whether the last load of this holder's rows found any sealed one (api-store.ts sets it). */
let seen = false;
export const noteSealedRowsSeen = (v: boolean): void => {
  seen = v;
};
export const sealedRowsSeen = (): boolean => seen;

/** Whether this browser's vault key has sealed anything (so replacing it would lock rows). */
export const vaultHasSealed = (): boolean => read()?.sealedAt !== undefined;

/** A backup holding this key was opened and checked. */
export const markVaultBackedUp = (at = Date.now()): void => {
  const s = read();
  if (s) write({ ...s, backedUpAt: at });
};

/** True when this browser's vault key is in no checked backup yet. */
export const vaultNeedsBackup = (): boolean => {
  const s = read();
  return !!s && s.backedUpAt === undefined;
};

/** Tests only: forget the key and everything cached from it. */
export const __forgetVaultForTests = (): void => {
  write(null);
  keys.clear();
  cache.clear();
};

const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
/** Called whenever the vault key or its backup state changes (records.ts converts then). */
export const onVaultChange = subscribe;
/** Re-render when the vault key or its backup state changes. */
export const useVaultNeedsBackup = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => snapshot.needsBackup,
    () => false,
  );
refresh();

// ---- the cipher ----------------------------------------------------------------------

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);
const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const sha256 = async (b: Uint8Array): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', b as unknown as BufferSource));

/** kid = first 16 hex of SHA-256(utf8("veilcore:vault-id:v1:") || key bytes) (CONTRACT.md #2). */
export const vaultKidOf = async (key: string): Promise<string> => {
  const bytes = keyBytes(key);
  if (!bytes) throw new Error('not a vault key');
  const prefix = utf8('veilcore:vault-id:v1:');
  const joined = new Uint8Array(prefix.length + bytes.length);
  joined.set(prefix);
  joined.set(bytes, prefix.length);
  return hex(await sha256(joined)).slice(0, 16);
};

/** This browser's kid, or null with no vault key. */
export const vaultKid = async (): Promise<string | null> => {
  const k = vaultKeyIfAny();
  return k ? vaultKidOf(k) : null;
};

/** Imported once per key, non-extractable: the page's code can use it, not read it back. */
const keys = new Map<string, Promise<CryptoKey>>();
const cryptoKey = (b64: string): Promise<CryptoKey> => {
  let k = keys.get(b64);
  if (!k) {
    const bytes = keyBytes(b64);
    if (!bytes) return Promise.reject(new Error('not a 32-byte key'));
    k = crypto.subtle.importKey('raw', bytes as unknown as BufferSource, { name: 'AES-GCM' }, false, [
      'encrypt',
      'decrypt',
    ]);
    keys.set(b64, k);
  }
  return k;
};

const encrypt = async (key: CryptoKey, plaintext: string, aad: Uint8Array): Promise<{ iv: string; ct: string }> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource, additionalData: aad as unknown as BufferSource },
      key,
      utf8(plaintext) as unknown as BufferSource,
    ),
  );
  return { iv: base64urlnopad.encode(iv), ct: base64urlnopad.encode(ct) };
};

/** The plaintext, or null for anything that doesn't open (wrong key, moved row, changed bytes). */
const decrypt = async (key: CryptoKey, iv: string, ct: string, aad: Uint8Array): Promise<string | null> => {
  try {
    const ivBytes = base64urlnopad.decode(iv);
    if (ivBytes.length !== 12) return null;
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes as unknown as BufferSource, additionalData: aad as unknown as BufferSource },
      key,
      base64urlnopad.decode(ct) as unknown as BufferSource,
    );
    return new TextDecoder('utf-8', { fatal: true }).decode(pt);
  } catch {
    return null;
  }
};

/**
 * JSON with object keys in sorted order and undefined members left out, so the same record
 * always gives the same plaintext (the cache below depends on it).
 */
export const stableStringify = (v: unknown): string => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map((x) => (x === undefined ? 'null' : stableStringify(x))).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined && typeof o[k] !== 'function')
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
    .join(',')}}`;
};

/** AAD = utf8("veilcore:sealed:v1\0" + kind + "\0" + id + "\0" + kid) (CONTRACT.md #4, #5). */
export const rowAad = (kind: RowKind, id: string, kid: string): Uint8Array =>
  utf8(`veilcore:sealed:v1\0${kind}\0${id}\0${kid}`);

/**
 * The last sealed form of each row, by its plaintext's hash. A row whose contents did not
 * change is sent again as the same ciphertext, so the registry sees nothing about which
 * rows changed beyond what it can see anyway (and stores nothing new).
 */
const cache = new Map<string, { hash: string; box: SealedBox }>();
const cacheKey = (kind: RowKind, id: string, kid: string) => `${kind}\0${id}\0${kid}`;

const isBox = (v: unknown): v is SealedBox => {
  if (typeof v !== 'object' || v === null) return false;
  const b = v as Record<string, unknown>;
  return (
    b.v === 1 &&
    b.alg === 'A256GCM' &&
    typeof b.kid === 'string' &&
    KID.test(b.kid) &&
    typeof b.iv === 'string' &&
    b.iv.length === 16 &&
    B64URL.test(b.iv) &&
    typeof b.ct === 'string' &&
    B64URL.test(b.ct)
  );
};

// ---- padding (CONTRACT.md #20, #21) -------------------------------------------------

/** The most a record's or licence's padded plaintext may be (CONTRACT.md #21). */
export const SEALED_MAX_BYTES = 256 * 1024;
const KIB = 1024;

/** The bucket a plaintext of this many bytes is padded to: next 1 KiB up to 16 KiB, then next 8 KiB. */
export const paddedSize = (bytes: number): number => {
  const n = Math.max(1, bytes);
  if (n <= 16 * KIB) return Math.ceil(n / KIB) * KIB;
  return Math.ceil(n / (8 * KIB)) * 8 * KIB;
};

/** The padded plaintext's size for a value, in bytes: what the size limit is checked on. */
export const sealedSizeOf = (value: Record<string, unknown>): number => paddedSize(utf8(stableStringify(value)).length);

/** The value's JSON, padded with spaces to its bucket. JSON.parse reads it back unchanged. */
export const padded = (json: string): string => {
  const bytes = utf8(json).length;
  return json + ' '.repeat(paddedSize(bytes) - bytes);
};

/** Thrown by sealRow for a row whose padded plaintext is over SEALED_MAX_BYTES. */
export class TooLargeToSeal extends Error {}

/**
 * Seal a row's private fields with this browser's vault key, padded to its bucket. Throws
 * with no key, or when the padded plaintext is over SEALED_MAX_BYTES.
 */
export const sealRow = async (kind: RowKind, id: string, value: Record<string, unknown>): Promise<SealedBox> => {
  const s = read();
  if (!s) throw new Error('This browser has no vault key.');
  const kid = await vaultKidOf(s.key);
  const plaintext = padded(stableStringify(value));
  if (utf8(plaintext).length > SEALED_MAX_BYTES) throw new TooLargeToSeal(`${id} is too large to save`);
  const hash = hex(await sha256(utf8(plaintext)));
  const ck = cacheKey(kind, id, kid);
  const hit = cache.get(ck);
  if (hit && hit.hash === hash) return hit.box;
  const { iv, ct } = await encrypt(await cryptoKey(s.key), plaintext, rowAad(kind, id, kid));
  const box: SealedBox = { v: 1, alg: 'A256GCM', kid, iv, ct };
  cache.set(ck, { hash, box });
  return box;
};

export type Opened =
  | { readonly ok: true; readonly value: Record<string, unknown> }
  | { readonly ok: false; readonly kid?: string };

/**
 * Open a row's `sealed`. Not ok (locked) when this browser has no key, a different key, or
 * the ciphertext does not open for this row id and collection.
 */
export const openRow = async (kind: RowKind, id: string, sealed: unknown): Promise<Opened> => {
  if (!isBox(sealed)) return { ok: false };
  const s = read();
  if (!s) return { ok: false, kid: sealed.kid };
  const kid = await vaultKidOf(s.key);
  if (kid !== sealed.kid) return { ok: false, kid: sealed.kid };
  const plaintext = await decrypt(await cryptoKey(s.key), sealed.iv, sealed.ct, rowAad(kind, id, kid));
  if (plaintext === null) return { ok: false, kid: sealed.kid };
  let value: unknown;
  try {
    value = JSON.parse(plaintext);
  } catch {
    return { ok: false, kid: sealed.kid };
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return { ok: false, kid: sealed.kid };
  // Remember it as this row's sealed form, so saving it unchanged sends these same bytes.
  cache.set(cacheKey(kind, id, kid), {
    hash: hex(await sha256(utf8(plaintext))),
    box: { v: 1, alg: 'A256GCM', kid: sealed.kid, iv: sealed.iv, ct: sealed.ct },
  });
  return { ok: true, value: value as Record<string, unknown> };
};

// ---- keys derived from the vault key (round 3, P7) -----------------------------------

/**
 * What each key derived from the vault key is for: HKDF-SHA256 over the vault key's bytes,
 * no salt, with this label as `info`. Records stay sealed with the vault key itself (so
 * nothing already sealed has to change); only the recipient tag uses a derived key now, so
 * the same bytes are never used for two jobs. `records` is the label a later move of record
 * sealing would use.
 */
export const VAULT_KEY_INFO = {
  records: 'veilcore:vault:records:v1',
  handleTag: 'veilcore:vault:handle-tag:v1',
  beneficiary: 'veilcore:vault:beneficiary:v1',
} as const;

/** 32 bytes derived from a vault key for one purpose (HKDF-SHA256, info = the label). */
export const vaultSubkey = async (key: string, info: string): Promise<Uint8Array> => {
  const bytes = keyBytes(key);
  if (!bytes) throw new Error('not a vault key');
  const ikm = await crypto.subtle.importKey('raw', bytes as unknown as BufferSource, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new Uint8Array(0) as unknown as BufferSource,
        info: utf8(info) as unknown as BufferSource,
      },
      ikm,
      256,
    ),
  );
};

// ---- the recipient handle (CONTRACT.md #15) ------------------------------------------

/**
 * What a delivery's recipient is called on the wire: a tag, never the name. Lowercase hex
 * HMAC-SHA256 over utf8("veilcore:handle:v1\0" + handle.normalize("NFC").trim().toLowerCase()),
 * keyed with a key derived from the vault key (VAULT_KEY_INFO.handleTag; round 3, P7: it
 * used to be the vault key's raw bytes, the same bytes that seal records). The same name
 * always gives the same tag for this holder (the registry's per-recipient limits still
 * work), and nobody without the vault key can tell whose it is. Throws with no vault key.
 *
 * Changing the key changed every tag made from now on. That is safe: a tag is compared only
 * by the registry, among one sender's own deliveries (its open-offer limit per recipient);
 * this browser never compares a tag with another (transfers.ts recipientName only tells a
 * tag from a name typed before tags, and shows the name kept in the sealed record). At
 * most the per-recipient count starts again once.
 */
export const handleTag = async (handle: string): Promise<string> => {
  const s = read();
  if (!s || !keyBytes(s.key)) throw new Error('This browser has no vault key.');
  const k = await crypto.subtle.importKey(
    'raw',
    (await vaultSubkey(s.key, VAULT_KEY_INFO.handleTag)) as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const msg = utf8(`veilcore:handle:v1\0${handle.normalize('NFC').trim().toLowerCase()}`);
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC', k, msg as unknown as BufferSource)));
};

/**
 * The beneficiary id a royalty obligation on a record is registered under (round 3, P5):
 * lowercase hex HMAC-SHA256, keyed with HKDF-SHA256(vault key, info
 * "veilcore:vault:beneficiary:v1"), over utf8("veilcore:beneficiary:v1\0") + the record's
 * fingerprint in lowercase hex. One per record: the registry never has the vault key, so it
 * can't make one, and nobody but this holder can tell that two belong to the same holder.
 * (The registry still stores which holder key registered each obligation, to let only it
 * release it.)
 */
export const beneficiaryId = async (recordFingerprint: string): Promise<string> => {
  const s = read();
  if (!s || !keyBytes(s.key)) throw new Error('This browser has no vault key.');
  const k = await crypto.subtle.importKey(
    'raw',
    (await vaultSubkey(s.key, VAULT_KEY_INFO.beneficiary)) as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const msg = utf8(`veilcore:beneficiary:v1\0${recordFingerprint.toLowerCase()}`);
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC', k, msg as unknown as BufferSource)));
};

/** Whether a stored handle is a tag (CONTRACT.md #15) rather than a name typed before tags. */
export const isHandleTag = (v: unknown): boolean => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);

// ---- transfer offers -----------------------------------------------------------------

/** A new offer key (CONTRACT.md #8): 32 random bytes, base64url, 43 characters. */
export const newOfferKey = (): string => base64urlnopad.encode(crypto.getRandomValues(new Uint8Array(32)));

/** AAD = utf8("veilcore:offer:v1\0" + sourceRecordId + "\0" + sourceFingerprint). */
export const offerAad = (sourceRecordId: string, sourceFingerprint: string): Uint8Array =>
  utf8(`veilcore:offer:v1\0${sourceRecordId}\0${sourceFingerprint}`);

export const sealOffer = async (
  offerKey: string,
  sourceRecordId: string,
  sourceFingerprint: string,
  value: Record<string, unknown>,
): Promise<OfferBox> => {
  const { iv, ct } = await encrypt(
    await cryptoKey(offerKey),
    padded(stableStringify(value)),
    offerAad(sourceRecordId, sourceFingerprint),
  );
  return { v: 1, alg: 'A256GCM', iv, ct };
};

/** The offer's fields, or null when it does not open with this key for this source. */
export const openOffer = async (
  offerKey: string,
  sourceRecordId: string,
  sourceFingerprint: string,
  box: unknown,
): Promise<Record<string, unknown> | null> => {
  if (typeof box !== 'object' || box === null) return null;
  const b = box as Record<string, unknown>;
  if (b.v !== 1 || b.alg !== 'A256GCM' || typeof b.iv !== 'string' || typeof b.ct !== 'string') return null;
  if (!isVaultKey(offerKey)) return null;
  const pt = await decrypt(await cryptoKey(offerKey), b.iv, b.ct, offerAad(sourceRecordId, sourceFingerprint));
  if (pt === null) return null;
  try {
    const v: unknown = JSON.parse(pt);
    return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

// ---- a delivery's sample details (CONTRACT.md #27) -----------------------------------
//
// The sender's `sample` and the lab's `arrival` are each sealed with the delivery's offer
// key, which both of them hold (the sender made it; the lab has it from the lab code) and
// the registry never gets. Same cipher and wire box as a record; the AAD names the delivery
// and the side, so a box can't be moved to another delivery or the other side.

export type CustodySide = 'sample' | 'arrival';

/** kid = first 16 hex of SHA-256(utf8("veilcore:offer-id:v1:") || offer key bytes). */
export const offerKidOf = async (offerKey: string): Promise<string> => {
  const bytes = keyBytes(offerKey);
  if (!bytes) throw new Error('not an offer key');
  const prefix = utf8('veilcore:offer-id:v1:');
  const joined = new Uint8Array(prefix.length + bytes.length);
  joined.set(prefix);
  joined.set(bytes, prefix.length);
  return hex(await sha256(joined)).slice(0, 16);
};

/** AAD = utf8("veilcore:sealed:v1\0custody\0" + transferId + "\0" + side). */
export const custodyAad = (transferId: string, side: CustodySide): Uint8Array =>
  utf8(`veilcore:sealed:v1\0custody\0${transferId}\0${side}`);

/** The most a side's box ct may be, in base64url characters (the registry's CUSTODY_CT_MAX). */
export const CUSTODY_CT_MAX = 8000;

/** Seal one side of a delivery's sample details with its offer key, padded like a record. */
export const sealCustody = async (
  offerKey: string,
  transferId: string,
  side: CustodySide,
  value: Record<string, unknown>,
): Promise<SealedBox> => {
  const kid = await offerKidOf(offerKey);
  const { iv, ct } = await encrypt(
    await cryptoKey(offerKey),
    padded(stableStringify(value)),
    custodyAad(transferId, side),
  );
  if (ct.length > CUSTODY_CT_MAX) throw new TooLargeToSeal('the sample details are too long to save');
  return { v: 1, alg: 'A256GCM', kid, iv, ct };
};

/** One side opened with the offer key, or null (another key, another delivery or side, changed bytes). */
export const openCustody = async (
  offerKey: string,
  transferId: string,
  side: CustodySide,
  box: unknown,
): Promise<Record<string, unknown> | null> => {
  if (!isBox(box) || !isVaultKey(offerKey)) return null;
  if (box.kid !== (await offerKidOf(offerKey))) return null;
  const pt = await decrypt(await cryptoKey(offerKey), box.iv, box.ct, custodyAad(transferId, side));
  if (pt === null) return null;
  try {
    const v: unknown = JSON.parse(pt);
    return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

/** A sealed side as the registry sends it back: { v, alg, kid, iv, ct }. */
export const isCustodyBox = (v: unknown): v is SealedBox => isBox(v);

/** A new salt for the sealed sample (CONTRACT.md #27): 32 random bytes, base64url. */
export const newCustodySalt = (): string => base64urlnopad.encode(crypto.getRandomValues(new Uint8Array(32)));
