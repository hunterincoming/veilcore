// The account copy: everything a person holds, kept safe with VeilCore, opened by Face ID.
//
// "Easy mode" step 2 (docs/passkey-backup.md). One account key (AK, 32 random bytes made here)
// seals one copy of this browser's keys (backup.ts accountContents: the backup file's keys,
// never the records themselves and never a document kept on this device only). Each way in to
// it is a slot at the registry holding AK sealed for that way in; today a passkey (its PRF
// output, through HKDF), and a printed recovery sheet (step 3: a code made on this device,
// recovery-code.ts). A password (step 6) and another person of a shared space are kinds the slot
// format already takes, so neither needs a migration (docs/passkey-backup.md, "Later ways in").
//
// What the registry holds: the copy, sealed (AES-256-GCM, padded to a power-of-two size, the
// copy's id in the AAD), and per slot AK sealed with that way in's key (the copy's id, the slot's
// id and its kind in the AAD: review N4). It can't open either. The copy's id and write token
// come from AK; a slot's id and read token from the passkey. Registry lineage/account-copy.mjs.
//
// When it counts as backed up (the founder's decision, settling security review B1 and the UX
// review): only a passkey that SYNCS (the authenticator said BS=1) and that has been opened
// again through the registry's own copy of its slot, by a fresh Face ID, giving the same AK
// (review B2: the key-check value inside the sealed copy matches). Both facts are read from the
// slot list sealed inside the copy (S4), never from what the registry says. Then the copy's
// check marks what it holds as backed up, with the copy as the source (S1), and never a document
// kept on this device only (B3). A passkey that stays on this device (BS=0: Windows Hello, a
// security key) saves the copy but counts only once a recovery sheet has been checked too: its
// whole code typed back and opened through the registry's own copy of its slot, giving the same
// AK (step 3, the same B2 rule). Each way in's sealed AK is fingerprinted inside the copy when it
// is opened, and every check compares the registry's (a changed one counts as gone); the passkey
// on this device is asked again after 90 days (re-verify).
//
// Saving is automatic: after 30 to 60 quiet seconds (a random part, review S10), when the page
// is hidden, and on a check when the app opens (is there a newer copy? are my ways in still
// there?). The reviewed machinery of the passkey copy is kept as it was: each save names the copy
// it replaces, the registry refuses a save over a newer one, the newer one is merged in and saved
// again; a merge takes only a copy whose sealed counter is higher than any seen here; a copy the
// registry keeps feeding back unchanged stops it after four tries; the restore screen shows the
// copy's date before anything changes.
//
// AK itself is never kept: only keys derived from it that the page can use and not read
// (account-key-store.ts, S5). Adding a way in needs AK, so a fresh unlock through an existing
// one. Records deleted on purpose travel inside the copy (S13), and so does each device's last
// save (S17), so a device that never sees the others' saves can say so.
// SPDX-License-Identifier: Apache-2.0

import { useSyncExternalStore } from 'react';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { base64urlnopad } from '@scure/base';
import {
  accountContents,
  checkBackup,
  clearCopyMarks,
  restoreAny,
  type BackupContents,
  type CheckResult,
  type RestoreOptions,
} from './backup';
import {
  PASSKEY_WORDS,
  PasskeyProblem,
  askPasskey,
  boxFingerprint,
  deleteLegacyCopy,
  fetchLegacyCopy,
  forgetLegacy,
  legacyRemembered,
  newPasskey,
  newPasskeyTag,
  passkeyKeys,
  passkeysAvailable,
  registryCall,
  registryFail,
  type PasskeyAnswer,
} from './passkey-backup';
import { forgetAccountKeys, heldAccountKeys, keepAccountKeys, type HeldAccount } from './account-key-store';
import { allKeys, forgottenAt, forgottenIds, noteRestored, restoredIds } from './record-keys';
import { revMarks } from './api-store';
import { stableStringify } from './vault';
import { deviceOnlyRecords } from './outbox';
import { isObject, isString } from './json';
import { PASSKEY_BACKUP } from '../config/copy';
import { SHEET_WORDS, newRecoveryCode, parseRecoveryCode, recoverySlotKeys } from './recovery-code';

const utf8 = (s: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(s);
const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const bytes = (b: Uint8Array): Uint8Array<ArrayBuffer> => new Uint8Array(b);
const b64 = (b: Uint8Array): string => base64urlnopad.encode(b);
const unb64 = (s: string): Uint8Array<ArrayBuffer> => bytes(base64urlnopad.decode(s));

export const ACCOUNT_COPY_VERSION = 'veilcore/account-copy/v2';
const LABEL = {
  seal: 'veilcore/account/seal/v1',
  mac: 'veilcore/account/mac/v1',
  copyId: 'veilcore/account/copy-id/v1',
  writeToken: 'veilcore/account/write-token/v1',
  kcv: 'veilcore/account/kcv/v1',
  passkeySlot: 'veilcore/account-slot/passkey/v1',
} as const;
const STORE = 'veilcore.account-copy.v1';
const DEVICE = 'veilcore.account.device.v1';
const SHOWN = 'veilcore.account.keep-safe-shown.v1';
const REMINDED = 'veilcore.account.sheet-reminder.v1';

/** Whether this build offers the account copy at all (it ships with the passkey copy's switch). */
export const accountCopyOn = (): boolean => PASSKEY_BACKUP && passkeysAvailable();

// ---- keys --------------------------------------------------------------------------------

/** The keys made from AK: the copy's sealing and signing keys (kept), and its id. */
export const deriveAccount = async (ak: Uint8Array): Promise<HeldAccount> => {
  if (ak.length !== 32) throw new PasskeyProblem(PASSKEY_WORDS.damaged);
  const sub = (label: string, n: number) => bytes(hkdf(sha256, ak, new Uint8Array(0), utf8(label), n));
  const sealKey = await crypto.subtle.importKey('raw', sub(LABEL.seal, 32), 'AES-GCM', false, ['encrypt', 'decrypt']);
  const macKey = await crypto.subtle.importKey('raw', sub(LABEL.mac, 32), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  return { copyId: hex(sub(LABEL.copyId, 16)), sealKey, macKey };
};

const mac = async (held: HeldAccount, label: string): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.sign('HMAC', held.macKey, utf8(label)));

/** What saving, reading and checking the copy need (only AK makes it). */
const writeToken = async (held: HeldAccount): Promise<string> => b64(await mac(held, LABEL.writeToken));

/** The key-check value kept inside the sealed copy: the same AK always gives the same one (review B2). */
export const keyCheck = async (held: HeldAccount): Promise<string> => hex((await mac(held, LABEL.kcv)).slice(0, 16));

export type SlotKind = 'passkey' | 'recovery' | 'password' | 'member';

export type SlotKeys = {
  /** The slot's id at the registry: 32 hex. */
  readonly slotId: string;
  /** Reads that slot, and only it. */
  readonly token: string;
  /** Seals AK for this way in. */
  readonly kek: Uint8Array<ArrayBuffer>;
};

/** A passkey's slot keys, from its PRF output and its credential id (separate HKDF labels from the older copy's). */
export const passkeySlotKeys = (prf: Uint8Array, credentialId: Uint8Array): SlotKeys => {
  if (prf.length < 32) throw new PasskeyProblem(PASSKEY_WORDS.unsupported);
  const salt = sha256(new Uint8Array([...utf8(LABEL.passkeySlot), ...credentialId]));
  const okm = hkdf(sha256, prf, salt, utf8(LABEL.passkeySlot), 80);
  return { kek: bytes(okm.slice(0, 32)), slotId: hex(okm.slice(32, 48)), token: b64(okm.slice(48, 80)) };
};

/** AAD of a slot's sealed AK: which copy, which slot, which kind (review N4: no wrap opens in another slot). */
export const slotAad = (copyId: string, slotId: string, kind: SlotKind): Uint8Array<ArrayBuffer> =>
  utf8(`veilcore/account-slot/v1\0${copyId}\0${slotId}\0${kind}`);

export const wrapAccountKey = async (
  ak: Uint8Array,
  slot: SlotKeys,
  copyId: string,
  kind: SlotKind,
): Promise<{ iv: string; ct: string }> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await crypto.subtle.importKey('raw', slot.kek, 'AES-GCM', false, ['encrypt']);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: slotAad(copyId, slot.slotId, kind) },
    k,
    bytes(ak),
  );
  return { iv: b64(iv), ct: b64(new Uint8Array(ct)) };
};

export const unwrapAccountKey = async (
  box: { iv: string; ct: string },
  slot: SlotKeys,
  copyId: string,
  kind: SlotKind,
): Promise<Uint8Array> => {
  try {
    const k = await crypto.subtle.importKey('raw', slot.kek, 'AES-GCM', false, ['decrypt']);
    const ak = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: unb64(box.iv), additionalData: slotAad(copyId, slot.slotId, kind) },
        k,
        unb64(box.ct),
      ),
    );
    if (ak.length !== 32) throw new Error('not a key');
    return ak;
  } catch {
    throw new PasskeyProblem(PASSKEY_WORDS.damaged);
  }
};

// ---- the sealed copy ---------------------------------------------------------------------

export type SlotEntry = {
  readonly slotId: string;
  readonly kind: SlotKind;
  readonly createdAt: string;
  /** The passkey said it syncs (BS=1) the last time it was used. */
  readonly synced?: boolean;
  /** When it was last opened again through the registry's copy of it, giving the same AK (B2). */
  readonly verifiedAt?: string;
  /** The short tag in the passkey's name in the person's password list ("… · 7F3K"), review New-4. */
  readonly tag?: string;
  /**
   * The fingerprint of this way in's sealed AK as the registry held it when it was last opened
   * (SHA-256 of "iv.ct"). Every check compares it with the registry's (`wrap` in its slot list):
   * one changed or damaged there counts as gone at once, not first at a restore.
   */
  readonly wrap?: string;
};

export type DeviceEntry = {
  /** The copy's counter when this device last saved it. */
  readonly seq: number;
  readonly at: string;
  /** What kind of device, for "your iPhone": iphone, ipad, android, mac, windows, linux, other. */
  readonly kind: DeviceKind;
  /** How many documents it keeps on itself only (they never sync). */
  readonly deviceOnly: number;
};

export type DeviceKind = 'iphone' | 'ipad' | 'android' | 'mac' | 'windows' | 'linux' | 'other';

/**
 * Sealed inside the copy, so the registry can't change it (review S4): the ways in, the key-check
 * value, each device's last save (S17) and the records deleted on purpose (S13).
 */
export type Manifest = {
  readonly kcv: string;
  readonly slots: readonly SlotEntry[];
  readonly devices: Readonly<Record<string, DeviceEntry>>;
  /** Record id → when it was deleted on purpose. */
  readonly forgotten: Readonly<Record<string, string>>;
  /**
   * Record id → when it was brought back from a file after being deleted. The later of the two
   * wins (attack pass on step 2, finding 1): a deletion never hides a record restored since.
   */
  readonly restored?: Readonly<Record<string, string>>;
  /**
   * Ways in removed on purpose (an older recovery sheet, once a new one is checked): slot id →
   * when. A merge never brings one back from a device that hasn't heard yet.
   */
  readonly retired?: Readonly<Record<string, string>>;
};

type Body = {
  readonly v: typeof ACCOUNT_COPY_VERSION;
  readonly savedAt: string;
  /** Rises with every save, inside the sealed part: the registry can't pass an older copy off as newer. */
  readonly seq: number;
  readonly backup: BackupContents;
  readonly manifest: Manifest;
};

const KIB = 1024;
/**
 * The size a copy's plaintext is padded to (review S10): the next power of two, at least 16 KiB,
 * so its size says roughly how many records a person has and no more.
 */
export const copyBucket = (n: number): number => {
  let b = 16 * KIB;
  while (b < n) b *= 2;
  return b;
};

const copyAad = (copyId: string) => utf8(`${ACCOUNT_COPY_VERSION}\0${copyId}`);

export const sealAccountCopy = async (held: HeldAccount, body: Body): Promise<{ iv: string; ct: string }> => {
  const json = JSON.stringify(body);
  const n = utf8(json).length;
  const plain = json + ' '.repeat(copyBucket(n) - n);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: copyAad(held.copyId) },
    held.sealKey,
    utf8(plain),
  );
  return { iv: b64(iv), ct: b64(new Uint8Array(ct)) };
};

const isSlot = (v: unknown): v is SlotEntry =>
  isObject(v) &&
  isString(v.slotId) &&
  /^[0-9a-f]{32}$/.test(v.slotId) &&
  (v.kind === 'passkey' || v.kind === 'recovery' || v.kind === 'password' || v.kind === 'member') &&
  isString(v.createdAt);

const DEVICE_KINDS = new Set<DeviceKind>(['iphone', 'ipad', 'android', 'mac', 'windows', 'linux', 'other']);
const isDevice = (v: unknown): v is DeviceEntry =>
  isObject(v) &&
  typeof v.seq === 'number' &&
  isString(v.at) &&
  DEVICE_KINDS.has(v.kind as DeviceKind) &&
  typeof v.deviceOnly === 'number';

const asManifest = (v: unknown): Manifest | undefined => {
  if (!isObject(v) || !isString(v.kcv) || !Array.isArray(v.slots)) return undefined;
  const devices = isObject(v.devices)
    ? Object.fromEntries(Object.entries(v.devices).filter((e): e is [string, DeviceEntry] => isDevice(e[1])))
    : {};
  const forgotten = isObject(v.forgotten)
    ? Object.fromEntries(Object.entries(v.forgotten).filter((e): e is [string, string] => isString(e[1])))
    : {};
  const restored = isObject(v.restored)
    ? Object.fromEntries(Object.entries(v.restored).filter((e): e is [string, string] => isString(e[1])))
    : {};
  const retired = isObject(v.retired)
    ? Object.fromEntries(Object.entries(v.retired).filter((e): e is [string, string] => isString(e[1])))
    : {};
  return {
    kcv: v.kcv,
    slots: v.slots.filter(isSlot).filter((s) => !retired[s.slotId]),
    devices,
    forgotten,
    restored,
    retired,
  };
};

export type OpenedCopy = {
  readonly savedAt: string;
  readonly seq: number;
  /** The backup inside, as the text restoreAny and checkBackup read. */
  readonly text: string;
  readonly manifest: Manifest;
  readonly fingerprint: string;
};

export const openAccountCopy = async (held: HeldAccount, box: { iv: string; ct: string }): Promise<OpenedCopy> => {
  let parsed: unknown;
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: unb64(box.iv), additionalData: copyAad(held.copyId) },
      held.sealKey,
      unb64(box.ct),
    );
    parsed = JSON.parse(new TextDecoder().decode(plain));
  } catch {
    throw new PasskeyProblem(PASSKEY_WORDS.damaged);
  }
  const manifest = isObject(parsed) ? asManifest(parsed.manifest) : undefined;
  if (
    !isObject(parsed) ||
    parsed.v !== ACCOUNT_COPY_VERSION ||
    !isString(parsed.savedAt) ||
    !isObject(parsed.backup) ||
    !manifest ||
    typeof parsed.seq !== 'number' ||
    !Number.isSafeInteger(parsed.seq) ||
    parsed.seq < 1
  )
    throw new PasskeyProblem(PASSKEY_WORDS.damaged);
  return {
    savedAt: parsed.savedAt,
    seq: parsed.seq,
    text: JSON.stringify(parsed.backup),
    manifest,
    fingerprint: boxFingerprint(box),
  };
};

/**
 * Whether the copy counts as a backup (the founder's rule, above): a passkey that syncs and was
 * opened again through the registry's copy of it; or a passkey that stays on its device, opened
 * again the same way, together with a recovery sheet whose whole code was typed back and opened
 * the same way. From the sealed list only (pass only the ways in still at the registry).
 */
export const countsAsBackup = (m: Manifest | undefined): boolean => {
  if (!m) return false;
  const passkeys = m.slots.filter((s) => s.kind === 'passkey' && !!s.verifiedAt);
  return (
    passkeys.some((s) => s.synced === true) ||
    (passkeys.length > 0 && m.slots.some((s) => s.kind === 'recovery' && !!s.verifiedAt))
  );
};

/** A way in as the registry lists it: its id and, from a registry with account-slot-check-v1, its wrap's fingerprint. */
export type Listed = { readonly slotId: string; readonly wrap?: string };

const listedOf = (v: unknown): Listed[] =>
  Array.isArray(v)
    ? v
        .filter(isObject)
        .filter((s) => isString(s.slotId))
        .map((s) => ({ slotId: s.slotId as string, ...(isString(s.wrap) ? { wrap: s.wrap } : {}) }))
    : [];

/**
 * The sealed list's ways in that are still at the registry as they were when last opened (S4): a
 * way in it no longer lists is gone, and so is one whose sealed AK it now holds differently.
 */
export const presentSlots = (m: Manifest, listed: readonly Listed[]): SlotEntry[] => {
  // A registry with account-slot-check-v1 lists a wrap for every slot: one left out of a slot that
  // has one recorded counts as changed. (This catches a registry that broke or lost a slot; one
  // that lies can send back the fingerprint it was given. The restore is the final check.)
  const wraps = listed.some((x) => !!x.wrap);
  return m.slots.filter((s) => {
    const l = listed.find((x) => x.slotId === s.slotId);
    return !!l && (!s.wrap || (!wraps && !l.wrap) || l.wrap === s.wrap);
  });
};

/** A passkey on this device not opened again for this long is asked once more (the 90-day re-verify). */
export const REVERIFY_MS = 90 * 86_400_000;
/** Days after setting up when the recovery sheet is asked for again, while there is none. */
export const SHEET_REMINDER_DAYS = [7, 30] as const;

// ---- this device -------------------------------------------------------------------------

export const deviceKindOf = (ua: string): DeviceKind => {
  if (/iPhone|iPod/.test(ua)) return 'iphone';
  if (/iPad/.test(ua)) return 'ipad';
  if (/Android/.test(ua)) return 'android';
  if (/Macintosh|Mac OS X/.test(ua)) return 'mac';
  if (/Windows/.test(ua)) return 'windows';
  if (/Linux|CrOS/.test(ua)) return 'linux';
  return 'other';
};

/** This browser's own id in the copy's device list: random, never sent anywhere but inside the sealed copy. */
export const thisDeviceId = (): string => {
  try {
    const have = localStorage.getItem(DEVICE);
    if (have && /^[0-9a-f]{16}$/.test(have)) return have;
    const id = hex(crypto.getRandomValues(new Uint8Array(8)));
    localStorage.setItem(DEVICE, id);
    return id;
  } catch {
    return 'unknown-device00'.slice(0, 16);
  }
};

const thisDeviceKind = (): DeviceKind => deviceKindOf(typeof navigator !== 'undefined' ? navigator.userAgent : '');

/** A device that hasn't saved for this long, while this one has, is said (S17). */
export const STALE_DEVICE_MS = 14 * 86_400_000;
/** This device saves at least this often even with nothing new, so the others don't think it gone. */
const HEARTBEAT_MS = 3 * 86_400_000;

const withThisDevice = (m: Manifest, seq: number, at: string): Manifest => ({
  ...m,
  devices: {
    ...m.devices,
    [thisDeviceId()]: { seq, at, kind: thisDeviceKind(), deviceOnly: Object.keys(deviceOnlyRecords()).length },
  },
  // The latest date wins for a deletion as for a restore (review New-7): delete, restore, delete again sticks.
  forgotten: latest(
    m.forgotten,
    Object.fromEntries(forgottenIds().map((id) => [id, forgottenAt()[id] ?? m.forgotten[id] ?? at])),
  ),
  restored: latest(m.restored ?? {}, restoredIds()),
});

/** Two id → date lists, the later date of each id kept. */
const latest = (a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>): Record<string, string> => {
  const out: Record<string, string> = { ...a };
  for (const [id, at] of Object.entries(b)) if (!out[id] || out[id] < at) out[id] = at;
  return out;
};

/** The records the copy says were deleted, and not restored since. */
export const deletedIds = (m: Manifest): string[] =>
  Object.entries(m.forgotten)
    .filter(([id, at]) => !((m.restored ?? {})[id] && (m.restored ?? {})[id] > at))
    .map(([id]) => id);

/** Two devices' lists, merged: every slot (the newer facts of each), each device's latest, every deletion. */
export const mergeManifests = (mine: Manifest, theirs: Manifest): Manifest => {
  const retired = latest(mine.retired ?? {}, theirs.retired ?? {});
  const slots = new Map<string, SlotEntry>();
  for (const s of [...mine.slots, ...theirs.slots]) {
    if (retired[s.slotId]) continue;
    const had = slots.get(s.slotId);
    if (!had) slots.set(s.slotId, s);
    else
      slots.set(s.slotId, {
        ...had,
        ...((s.verifiedAt ?? '') > (had.verifiedAt ?? '')
          ? { verifiedAt: s.verifiedAt, synced: s.synced, ...(s.wrap ? { wrap: s.wrap } : {}) }
          : {}),
      });
  }
  const devices: Record<string, DeviceEntry> = { ...mine.devices };
  for (const [id, d] of Object.entries(theirs.devices)) if (!devices[id] || devices[id].seq < d.seq) devices[id] = d;
  const forgotten = latest(mine.forgotten, theirs.forgotten);
  // The same AK makes the same key-check value: mine stays.
  return {
    kcv: mine.kcv,
    slots: [...slots.values()],
    devices,
    forgotten,
    restored: latest(mine.restored ?? {}, theirs.restored ?? {}),
    retired,
  };
};

// ---- what this browser remembers (no secrets: ids, the last copy seen, the sealed list) -----

export type Problem =
  /** The registry has no copy (deleted, or dropped): marks it made are gone. */
  | 'missing'
  /** A way in the copy counts on is gone at the registry. */
  | 'slot-missing'
  /** The registry is showing an older copy than this device has seen. */
  | 'older'
  /** Saving failed; tried again by itself. */
  | 'failing';

type Remembered = {
  readonly copyId: string;
  /**
   * This device's way in: the passkey it set up or opened the copy with; or, on a device brought
   * back with the recovery sheet that hasn't added Face ID yet, that sheet's slot and '' here.
   */
  readonly slotId: string;
  readonly credentialId: string;
  /** The relying party id that passkey is for, when it isn't the page's host. */
  readonly rpId?: string;
  /** What this browser's keys looked like at the last save (backup.ts contents without dates). */
  readonly sameAs: string;
  readonly savedAt: string;
  /** The copy's fingerprint as this browser last saved or read it. */
  readonly prev: string;
  readonly seq: number;
  readonly manifest: Manifest;
  /** The last check passed with the copy counted as a backup. */
  readonly counted?: boolean;
  readonly problem?: Problem;
  /** The words of the last failure, for the account line. */
  readonly why?: string;
  /** Ways in at the registry this device didn't add or know (S4): shown in Settings. */
  readonly unknownSlots?: readonly string[];
  /** Devices the person said are gone: not warned about again. */
  readonly gone?: readonly string[];
  /** The registry had an older copy, and this device saved its newer one over it (review New-2). Said once. */
  readonly notice?: 'healed';
};

const remembered = (): Remembered | undefined => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(STORE) ?? 'null');
    if (!isObject(v) || !isString(v.copyId) || !isString(v.slotId) || !isString(v.credentialId)) return undefined;
    const manifest = asManifest(v.manifest);
    if (!manifest) return undefined;
    return {
      ...(v as unknown as Remembered),
      manifest,
      sameAs: isString(v.sameAs) ? v.sameAs : '',
      prev: isString(v.prev) ? v.prev : 'none',
      seq: typeof v.seq === 'number' && Number.isSafeInteger(v.seq) ? v.seq : 0,
      savedAt: isString(v.savedAt) ? v.savedAt : '',
    };
  } catch {
    return undefined;
  }
};

const listeners = new Set<() => void>();
let version = 0;
const notify = () => {
  version++;
  listeners.forEach((l) => l());
};

const remember = (given: Remembered | undefined): void => {
  // Never lower the counter seen (finding 4): another tab may have saved a newer copy since this
  // one read what it remembers. Its newer counter, fingerprint and list stay.
  const cur = given ? remembered() : undefined;
  const r = given && cur && cur.copyId === given.copyId && cur.seq > given.seq ? { ...cur, sameAs: '' } : given;
  try {
    if (r) localStorage.setItem(STORE, JSON.stringify(r));
    else localStorage.removeItem(STORE);
  } catch {
    /* private mode: the copy still works for this visit */
  }
  notify();
};

const patch = (f: (r: Remembered) => Remembered): void => {
  const r = remembered();
  if (r) remember(f(r));
};

/** What a copy has to match to be current: the contents without their date or the version marks (they only rise). */
export const sameAsOf = (c: BackupContents): string => {
  const rest: Record<string, unknown> = { ...c };
  delete rest.savedAt;
  delete rest.revs;
  // In a fixed order, so two devices holding the same things agree (review New-1).
  const by = (k: string) => (a: unknown, b: unknown) =>
    String((a as Record<string, unknown>)[k]).localeCompare(String((b as Record<string, unknown>)[k]));
  if (Array.isArray(rest.records)) rest.records = [...(rest.records as unknown[])].sort(by('recordId'));
  if (Array.isArray(rest.heldLicenses)) rest.heldLicenses = [...(rest.heldLicenses as unknown[])].sort(by('inviteId'));
  return hex(sha256(utf8(stableStringify(rest))));
};

/** Whether this browser holds anything the copy lacks: if not, a merge needs no save of its own (New-1). */
const sameAsAfterMerge = (copyText: string): string => {
  const mine = sameAsOf(accountContents());
  try {
    return sameAsOf(JSON.parse(copyText) as BackupContents) === mine ? mine : '';
  } catch {
    return '';
  }
};

/** Most a copy's counter, or a record's version, may jump in one merge (review New-3). */
const MAX_JUMP = 10_000;
/** A copy whose counter or versions jump implausibly far is refused, never merged. */
const plausible = (theirs: OpenedCopy, seen: number): void => {
  if (theirs.seq > seen + MAX_JUMP) throw new PasskeyProblem(PASSKEY_WORDS.damaged);
  let revs: unknown;
  try {
    revs = (JSON.parse(theirs.text) as { revs?: unknown }).revs;
  } catch {
    revs = undefined;
  }
  if (!isObject(revs)) return;
  const here = revMarks();
  for (const [k, v] of Object.entries(revs))
    if (typeof v === 'number' && v > (here[k] ?? 0) + MAX_JUMP) throw new PasskeyProblem(PASSKEY_WORDS.damaged);
};

// ---- the registry ------------------------------------------------------------------------

/** The copy changed since this browser last saw it (another device saved). */
class Stale extends Error {}

const fileOf = (text: string) => new File([text], 'account-copy.json', { type: 'application/json' });

const upload = async (
  held: HeldAccount,
  body: Body,
  prev: string,
  firstSlot?: { slotId: string; kind: SlotKind; tokenHash: string; iv: string; ct: string },
): Promise<string> => {
  const box = await sealAccountCopy(held, body);
  const out = await registryCall('PUT', `/account-copy/${held.copyId}`, {
    token: await writeToken(held),
    prev,
    ...box,
    ...(firstSlot ? { slot: firstSlot } : {}),
  });
  if (out.status === 409) throw new Stale();
  if (out.status !== 200) registryFail(out);
  return boxFingerprint(box);
};

const fetchCopy = async (held: HeldAccount): Promise<OpenedCopy & { listed: Listed[] }> => {
  const out = await registryCall('POST', `/account-copy/${held.copyId}/read`, { token: await writeToken(held) });
  if (out.status !== 200 || !isObject(out.json) || !isString(out.json.iv) || !isString(out.json.ct))
    return registryFail(out);
  return { ...(await openAccountCopy(held, { iv: out.json.iv, ct: out.json.ct })), listed: listedOf(out.json.slots) };
};

/** A way in at the registry, read with its own token: which copy, and AK sealed for it. Undefined when there is none. */
const readSlot = async (
  slot: SlotKeys,
  kind: 'passkey' | 'recovery',
): Promise<{ copyId: string; kind: SlotKind; iv: string; ct: string } | undefined> => {
  const out = await registryCall('POST', `/account-slot/${slot.slotId}/read`, { token: slot.token });
  if (out.status === 404 && isObject(out.json) && isString(out.json.error)) return undefined;
  const j = out.json;
  if (
    out.status !== 200 ||
    !isObject(j) ||
    !isString(j.copyId) ||
    !isString(j.iv) ||
    !isString(j.ct) ||
    j.kind !== kind
  )
    return registryFail(out);
  return { copyId: j.copyId, kind, iv: j.iv, ct: j.ct };
};

const tokenHashOf = (token: string) => hex(sha256(utf8(token)));

/** The deleted records a copy carries, for a restore or merge that must not bring them back. */
const skipOf = (m: Manifest): ReadonlySet<string> => new Set(deletedIds(m));

// ---- saving (the reviewed machinery, as it was for the passkey copy) ------------------------

/**
 * Save the copy over the one this browser last saw, read it back, and check it holds everything.
 * If another device saved since, its copy is merged into this browser first, then saved again,
 * so neither device's records are lost. The merge takes only a copy whose sealed counter is
 * higher than any this browser has seen (the registry can't feed it an older one), marks nothing
 * backed up, skips records removed here on purpose and those removed on another device, and never
 * swaps the vault key. Four tries at most: a registry that never shows back what was saved can't
 * keep it going. The check marks what the copy holds only when the copy counts (above).
 */
const saveAndCheck = async (
  held: HeldAccount,
  r: Remembered,
  firstSlot?: Parameters<typeof upload>[3],
): Promise<CheckResult> => {
  let prev = r.prev;
  let seen = r.seq;
  let manifest = r.manifest;
  let healed = false;
  for (let tries = 0; tries < 4; tries++) {
    const contents = accountContents();
    const seq = seen + 1;
    manifest = withThisDevice(manifest, seq, contents.savedAt);
    try {
      prev = await upload(
        held,
        { v: ACCOUNT_COPY_VERSION, savedAt: contents.savedAt, seq, backup: contents, manifest },
        prev,
        tries === 0 ? firstSlot : undefined,
      );
    } catch (e) {
      if (!(e instanceof Stale)) throw e;
      const theirs = await fetchCopy(held);
      plausible(theirs, seen);
      // Merged the add-only way either way: it can only bring in what this device lacks.
      await restoreAny(fileOf(theirs.text), undefined, {
        mark: false,
        skipForgotten: true,
        keepVault: true,
        skipIds: skipOf(theirs.manifest),
      });
      manifest = mergeManifests(manifest, theirs.manifest);
      prev = theirs.fingerprint;
      // Older than this device has seen (a registry restored from a backup, or one rolling back):
      // this device's newer copy is saved over it with the next counter (review New-2), and the
      // person is told once. A brand-new device's restore, and the read-back below, still refuse.
      if (theirs.seq <= seen) healed = true;
      else seen = theirs.seq;
      continue;
    }
    seen = seq;
    const back = await fetchCopy(held);
    if (back.fingerprint !== prev) {
      // The registry shows back a copy older than the one just saved: refused, said as such.
      if (back.seq < seq) throw new PasskeyProblem(PASSKEY_WORDS.older);
      continue; // another device saved in between: merge and save again
    }
    if (back.manifest.kcv !== (await keyCheck(held))) throw new PasskeyProblem(PASSKEY_WORDS.damaged);
    // S4: the ways in it counts on must still be at the registry, as they were when opened.
    const present = presentSlots(back.manifest, back.listed);
    const counts = countsAsBackup({ ...back.manifest, slots: present });
    // A record the copy says was deleted is not counted as in it (finding 1): a new device restored
    // from it would leave it out.
    const checked = await checkBackup(fileOf(back.text), undefined, {
      mark: counts ? 'copy' : false,
      exclude: skipOf(back.manifest),
    });
    if (!counts) clearCopyMarks();
    if (checked.ok) {
      const base = remembered();
      remember({
        ...(base && base.copyId === r.copyId ? base : r),
        sameAs: sameAsOf(contents),
        savedAt: contents.savedAt,
        prev,
        seq,
        manifest: back.manifest,
        counted: counts,
        problem: present.length < back.manifest.slots.length ? 'slot-missing' : undefined,
        why: undefined,
        unknownSlots: back.listed
          .map((l) => l.slotId)
          .filter((id) => !back.manifest.slots.some((s) => s.slotId === id)),
        ...(healed ? { notice: 'healed' as const } : {}),
      });
    }
    return checked;
  }
  // Four rounds and another device kept saving in between (or the registry never showed back what
  // was saved): tried again later, said plainly (review New-12).
  throw new PasskeyProblem(PASSKEY_WORDS.busy);
};

let chain: Promise<unknown> = Promise.resolve();
let busy = 0;
type Locks = { request: <T>(name: string, f: () => Promise<T>) => Promise<T> };
const locks = (): Locks | undefined => {
  const l = (typeof navigator !== 'undefined' ? (navigator as { locks?: Locks }).locks : undefined) ?? undefined;
  return typeof l?.request === 'function' ? l : undefined;
};
/** One save or check at a time in this page, in the order asked, and across tabs where the browser can (finding 4). */
const exclusive = <T>(f: () => Promise<T>): Promise<T> => {
  busy++;
  const l = locks();
  const g = l ? () => l.request('veilcore-account-copy', f) : f;
  const run = chain.then(g, g).finally(() => {
    busy--;
    notify();
  });
  chain = run.catch(() => undefined);
  return run;
};

// ---- setting up, opening, moving the older copy over -----------------------------------------

/**
 * Open the copy again through the registry's own copy of this way in, with a fresh Face ID
 * (review B2), and keep its keys here. The same AK must come out: the key-check value inside the
 * sealed copy matches, and the slot is in its sealed list. Marks the slot verified, with whether
 * the passkey syncs as it says now.
 */
type Opened = {
  held: HeldAccount;
  copy: OpenedCopy & { listed: Listed[] };
  slot: SlotKeys;
  ak: Uint8Array;
  /** The fingerprint of the sealed AK the registry gave for this way in. */
  wrap: string;
};

/** Through a way in's own slot at the registry to the copy: the same AK must make the copy's key-check value. */
const openSlot = async (
  slot: SlotKeys,
  kind: 'passkey' | 'recovery',
  expectCopy?: string,
): Promise<Opened | undefined> => {
  const found = await readSlot(slot, kind);
  if (!found) return undefined;
  if (expectCopy && found.copyId !== expectCopy)
    throw new PasskeyProblem(kind === 'recovery' ? SHEET_WORDS.wrong : PASSKEY_WORDS.damaged);
  const ak = await unwrapAccountKey(found, slot, found.copyId, found.kind);
  const held = await deriveAccount(ak);
  if (held.copyId !== found.copyId) throw new PasskeyProblem(PASSKEY_WORDS.damaged);
  const copy = await fetchCopy(held);
  if (copy.manifest.kcv !== (await keyCheck(held)) || !copy.manifest.slots.some((s) => s.slotId === slot.slotId))
    throw new PasskeyProblem(PASSKEY_WORDS.damaged);
  return { held, copy, slot, ak, wrap: boxFingerprint(found) };
};

const openThroughSlot = async (
  answer: PasskeyAnswer,
  expect?: { copyId: string; slotId: string },
): Promise<Opened | undefined> => {
  const slot = passkeySlotKeys(answer.prf, answer.rawId);
  if (expect && slot.slotId !== expect.slotId) throw new PasskeyProblem(PASSKEY_WORDS.damaged);
  return openSlot(slot, 'passkey', expect?.copyId);
};

/**
 * Open the copy with a recovery sheet's code (typed whole), through the registry's own copy of
 * its slot (the B2 rule for the sheet): the code's slot must be there and its AK must make the
 * copy's key-check value. A code that opens nothing is "wrong", never a hint of whose it is.
 */
const openWithCode = async (code: string, expectCopy?: string): Promise<Opened> => {
  const opened = await openSlot(recoverySlotKeys(code), 'recovery', expectCopy);
  if (!opened) throw new PasskeyProblem(SHEET_WORDS.wrong);
  return opened;
};

const verified = (
  m: Manifest,
  slotId: string,
  synced: boolean,
  wrap?: string,
  at = new Date().toISOString(),
): Manifest => ({
  ...m,
  slots: m.slots.map((s) => (s.slotId === slotId ? { ...s, synced, verifiedAt: at, ...(wrap ? { wrap } : {}) } : s)),
});

/** A recovery sheet's slot, opened just now with its whole code: verified, with its wrap's fingerprint. */
const sheetVerified = (m: Manifest, slotId: string, wrap: string, at = new Date().toISOString()): Manifest => ({
  ...m,
  slots: m.slots.map((s) => (s.slotId === slotId ? { ...s, verifiedAt: at, wrap } : s)),
});

/** A new copy under a new AK, with this passkey as its first way in. Returns what to remember. */
const makeCopy = async (answer: PasskeyAnswer, tag?: string): Promise<Remembered> => {
  const ak = crypto.getRandomValues(new Uint8Array(32));
  const held = await deriveAccount(ak);
  const slot = passkeySlotKeys(answer.prf, answer.rawId);
  const wrap = await wrapAccountKey(ak, slot, held.copyId, 'passkey');
  ak.fill(0);
  const manifest: Manifest = {
    kcv: await keyCheck(held),
    slots: [
      {
        slotId: slot.slotId,
        kind: 'passkey',
        createdAt: new Date().toISOString(),
        synced: answer.synced,
        ...(tag ? { tag } : {}),
      },
    ],
    devices: {},
    forgotten: {},
  };
  const r: Remembered = {
    copyId: held.copyId,
    slotId: slot.slotId,
    credentialId: b64(answer.rawId),
    ...(answer.rpId ? { rpId: answer.rpId } : {}),
    sameAs: '',
    savedAt: '',
    prev: 'none',
    seq: 0,
    manifest,
  };
  // Saved, read back and checked, but not counted yet: the slot isn't verified (below).
  await saveAndCheck(held, r, { slotId: slot.slotId, kind: 'passkey', tokenHash: tokenHashOf(slot.token), ...wrap });
  await keepAccountKeys(held);
  keepLastPasskey({ credentialId: r.credentialId, ...(r.rpId ? { rpId: r.rpId } : {}), ...(tag ? { tag } : {}) });
  return remembered() ?? r;
};

/** The fresh Face ID through the registry's copy of the slot (B2), then a save that records it. */
const verifyAndCount = async (r: Remembered): Promise<CheckResult> => {
  // A device brought back with the recovery sheet has no passkey of its own yet: the sheet adds one.
  if (!r.credentialId) throw new PasskeyProblem(SHEET_WORDS.needsSheet);
  const answer = await askPasskey(unb64(r.credentialId), r.rpId ?? 'host');
  const opened = await openThroughSlot(answer, { copyId: r.copyId, slotId: r.slotId });
  if (!opened) throw new PasskeyProblem(PASSKEY_WORDS.noCopy);
  opened.ak.fill(0);
  await keepAccountKeys(opened.held);
  const now = remembered() ?? r;
  remember({ ...now, manifest: verified(now.manifest, r.slotId, answer.synced, opened.wrap), sameAs: '' });
  return saveAndCheck(opened.held, remembered() ?? now);
};

export type SetUpResult = CheckResult & {
  /** The passkey syncs: the copy counts as the backup (the gate opens). */
  readonly counted?: boolean;
};

/**
 * "Use Face ID": make the passkey, the account key and the copy, open it again through the
 * registry (a second Face ID), and count it when the passkey syncs. Moves an older passkey copy
 * over first if this browser has one.
 */
export const setUpAccount = (opts: { withoutSheet?: boolean } = {}): Promise<SetUpResult> =>
  exclusive(async () => {
    const before = remembered();
    if (legacyRemembered() && !before) return moveOlderCopy();
    // Brought back with the recovery sheet, no passkey of its own yet: one is added to the same
    // records (the sheet's code is asked for when its account key isn't still in hand).
    if (before && !before.credentialId) return addFaceId();
    let answer: PasskeyAnswer | undefined;
    const last = before
      ? {
          credentialId: before.credentialId,
          rpId: before.rpId,
          tag: before.manifest.slots.find((x) => x.slotId === before.slotId)?.tag,
        }
      : lastPasskey();
    if (last) {
      // Set up again (Home's "Save again", or after "Stop saving"): the same passkey, never a
      // second one in the person's password list (review New-4). Another device on it may have
      // set it up again already: then this one joins that copy. A passkey that's gone is
      // forgotten here, so the next try makes a new one.
      try {
        answer = await askPasskey(unb64(last.credentialId), last.rpId ?? 'host');
      } catch (e) {
        if (!before) forgetLastPasskey();
        throw e;
      }
      const opened = await openThroughSlot(answer);
      if (opened) {
        opened.ak.fill(0);
        await joinCopy(answer, opened);
        const held = (await heldAccountKeys())!;
        const checked = await saveAndCheck(held, remembered()!);
        return { ...checked, counted: remembered()?.counted === true };
      }
      // Its way in is gone; the copy may not be. Deleted only when the copy the registry holds now
      // lists no other way in (reviews: finding 2, New-8), so never a copy another way in opens:
      // the decision is the sealed list the registry returns now, never this device's older one.
      // When that list has a recovery sheet still there, the sheet adds Face ID back to this same
      // copy (addFaceIdHere) rather than a new copy splitting the person's records in two.
      // A failure to read it is never taken as "gone" (security pass on step 3, S-3): that would
      // start a second copy beside the one the sheet opens. "Start again without the sheet"
      // (opts.withoutSheet) is the person's own choice, and deletes the old copy first.
      const held = await heldAccountKeys();
      if (before && held && held.copyId === before.copyId) {
        let now: Awaited<ReturnType<typeof fetchCopy>> | undefined;
        try {
          now = await fetchCopy(held);
        } catch (e) {
          if (!(e instanceof PasskeyProblem && e.message === PASSKEY_WORDS.noCopy)) throw e;
        }
        const sheetThere = !!now && presentSlots(now.manifest, now.listed).some((x) => x.kind === 'recovery');
        if (sheetThere && !opts.withoutSheet) throw new PasskeyProblem(SHEET_WORDS.needsSheet);
        if (now && (opts.withoutSheet || !now.manifest.slots.some((x) => x.slotId !== before.slotId))) {
          const out = await registryCall('POST', `/account-copy/${before.copyId}/delete`, {
            token: await writeToken(held),
          });
          if (out.status !== 200 && out.status !== 404) registryFail(out);
        }
      } else if (
        before &&
        !opts.withoutSheet &&
        before.manifest.slots.some((x) => x.kind === 'recovery' && x.verifiedAt)
      )
        // Without this copy's keys here its list can't be read now: the last one seen had a sheet.
        throw new PasskeyProblem(SHEET_WORDS.needsSheet);
    }
    const tag = last?.tag ?? newPasskeyTag();
    if (!last) answer = await newPasskey(tag);
    const r = await makeCopy(answer!, tag);
    const checked = await verifyAndCount(r);
    return { ...checked, counted: remembered()?.counted === true };
  });

/**
 * This browser has the copy but not its keys (they were cleared, or this browser never kept
 * them): one Face ID opens it again and saving carries on.
 */
export const unlockHere = (): Promise<SetUpResult> =>
  exclusive(async () => {
    if (legacyRemembered() && !remembered()) return moveOlderCopy();
    const r = remembered();
    if (!r) throw new PasskeyProblem(PASSKEY_WORDS.noCopy);
    const checked = await verifyAndCount(r);
    return { ...checked, counted: remembered()?.counted === true };
  });

/**
 * A passkey copy made before the account copy (passkey-backup.ts): its passkey is asked once.
 * If another device already moved it, this one joins that account copy. Otherwise the older
 * copy is merged in when it is newer than what this browser saw, an account copy is made with
 * the same passkey as its first way in, opened again (B2), and the older copy is deleted at the
 * registry (review N3) and forgotten here.
 */
/**
 * This browser takes up a copy another device made (opened through the registry's copy of this
 * passkey's slot just now, so verified): merged in, its keys kept here, remembered.
 */
const joinCopy = async (
  answer: PasskeyAnswer,
  opened: { held: HeldAccount; copy: OpenedCopy; slot: SlotKeys; wrap: string },
): Promise<void> => {
  await restoreAny(fileOf(opened.copy.text), undefined, {
    mark: false,
    skipForgotten: true,
    keepVault: true,
    skipIds: skipOf(opened.copy.manifest),
  });
  await keepAccountKeys(opened.held);
  remember({
    copyId: opened.held.copyId,
    slotId: opened.slot.slotId,
    credentialId: b64(answer.rawId),
    ...(answer.rpId ? { rpId: answer.rpId } : {}),
    sameAs: '',
    savedAt: opened.copy.savedAt,
    prev: opened.copy.fingerprint,
    seq: opened.copy.seq,
    manifest: verified(opened.copy.manifest, opened.slot.slotId, answer.synced, opened.wrap),
  });
};

const moveOlderCopy = async (pending?: { answer: PasskeyAnswer; seen: number }): Promise<SetUpResult> => {
  const old = legacyRemembered();
  // A passkey made before the pin was made for the page's own host (passkey-backup.ts rpIdFor).
  const answer =
    pending?.answer ?? (old ? await askPasskey(unb64(old.credentialId), 'host') : await askPasskey(undefined, 'host'));
  const joined = await openThroughSlot(answer);
  if (joined) {
    joined.ak.fill(0);
    await joinCopy(answer, joined);
  } else {
    const lk = passkeyKeys(answer.prf, answer.rawId);
    try {
      const theirs = await fetchLegacyCopy(lk);
      if (theirs.seq > (pending?.seen ?? old?.seq ?? 0))
        await restoreAny(fileOf(theirs.text), undefined, { mark: false, skipForgotten: true, keepVault: true });
    } catch (e) {
      if (!(e instanceof PasskeyProblem && e.message === PASSKEY_WORDS.noCopy)) throw e;
    }
    const r = await makeCopy(answer);
    await verifyAndCount(r);
    await deleteLegacyCopy(lk);
  }
  forgetLegacy();
  const now = remembered();
  const held = await heldAccountKeys();
  if (!now || !held) throw new PasskeyProblem(PASSKEY_WORDS.damaged);
  const checked = await saveAndCheck(held, now);
  return { ...checked, counted: remembered()?.counted === true };
};

// ---- a new device: get the copy back -----------------------------------------------------

let pending:
  | { kind: 'account'; answer: PasskeyAnswer; held: HeldAccount; slot: SlotKeys; copy: OpenedCopy; wrap: string }
  | { kind: 'recovery'; held: HeldAccount; slot: SlotKeys; copy: OpenedCopy; wrap: string; ak: Uint8Array }
  | { kind: 'older'; answer: PasskeyAnswer; seq: number }
  | undefined;

const dropPending = (): void => {
  if (pending?.kind === 'recovery') pending.ak.fill(0);
  pending = undefined;
};

export type Found = {
  readonly file: File;
  readonly savedAt: string;
  /** What restoreAny must not bring back (records deleted on another device). */
  readonly restore: RestoreOptions;
  /** Documents kept on the person's other devices only, by device: they never come here. */
  readonly elsewhere: readonly { readonly kind: DeviceKind; readonly count: number }[];
  /** Records the copy holds that were deleted on another device: left out unless asked (review New-5). */
  readonly deleted: readonly string[];
  /** The restore that brings those too ("Bring them anyway"). */
  readonly restoreAll: RestoreOptions;
};

/**
 * On a new device: ask for any of this site's passkeys and find its copy (or one made before the
 * account copy). Nothing changes here until the person accepts it (adoptFound): the page shows
 * the copy's date first.
 */
/** What the restore screen shows of a found copy before anything changes. */
const foundOf = (copy: OpenedCopy): Found => {
  const here = thisDeviceId();
  const skip = skipOf(copy.manifest);
  let inCopy: string[] = [];
  try {
    inCopy = ((JSON.parse(copy.text) as { records?: { recordId?: unknown }[] }).records ?? [])
      .map((e) => e.recordId)
      .filter(isString);
  } catch {
    inCopy = [];
  }
  return {
    file: fileOf(copy.text),
    savedAt: copy.savedAt,
    restore: { mark: false, skipIds: skip },
    restoreAll: { mark: false },
    deleted: inCopy.filter((id) => skip.has(id)),
    elsewhere: Object.entries(copy.manifest.devices)
      .filter(([id, d]) => id !== here && d.deviceOnly > 0)
      .map(([, d]) => ({ kind: d.kind, count: d.deviceOnly })),
  };
};

export const findAccountCopy = async (opts: { hostName?: boolean } = {}): Promise<Found> => {
  dropPending();
  const answer = await askPasskey(undefined, opts.hostName ? 'host' : undefined);
  const opened = await openThroughSlot(answer);
  if (opened) {
    opened.ak.fill(0);
    pending = {
      kind: 'account',
      answer,
      held: opened.held,
      slot: opened.slot,
      copy: opened.copy,
      wrap: opened.wrap,
    };
    return foundOf(opened.copy);
  }
  const old = await fetchLegacyCopy(passkeyKeys(answer.prf, answer.rawId));
  pending = { kind: 'older', answer, seq: old.seq };
  return {
    file: fileOf(old.text),
    savedAt: old.savedAt,
    restore: { mark: false },
    restoreAll: { mark: false },
    elsewhere: [],
    deleted: [],
  };
};

/**
 * After a restore from the found copy was accepted: this browser keeps it up to date from now
 * on. The Face ID that found it opened it through the registry's copy of its way in, so that way
 * in is verified (B2). Then the first save adds this device and runs the check.
 */
export const adoptFound = (): Promise<SetUpResult | undefined> =>
  exclusive(async () => {
    // Kept until it works, so "Try again" can retry it (review New-9).
    const p = pending;
    if (!p) return undefined;
    if (p.kind === 'older') {
      const out = await moveOlderCopy({ answer: p.answer, seen: p.seq });
      pending = undefined;
      return out;
    }
    if (p.kind === 'recovery') {
      // Brought back with the recovery sheet: this device saves with the keys the sheet opened,
      // and its way in is the sheet's (just opened with its whole code, so verified) until it adds
      // Face ID of its own (addFaceIdHere, offered on the next screen with the AK still in hand).
      await keepAccountKeys(p.held);
      remember({
        copyId: p.held.copyId,
        slotId: p.slot.slotId,
        credentialId: '',
        sameAs: '',
        savedAt: p.copy.savedAt,
        prev: p.copy.fingerprint,
        seq: p.copy.seq,
        manifest: sheetVerified(p.copy.manifest, p.slot.slotId, p.wrap),
      });
      const checked = await saveAndCheck(p.held, remembered()!);
      keepRecovered(p.held.copyId, p.ak);
      pending = undefined;
      return { ...checked, counted: remembered()?.counted === true };
    }
    await keepAccountKeys(p.held);
    remember({
      copyId: p.held.copyId,
      slotId: p.slot.slotId,
      credentialId: b64(p.answer.rawId),
      ...(p.answer.rpId ? { rpId: p.answer.rpId } : {}),
      sameAs: '',
      savedAt: p.copy.savedAt,
      prev: p.copy.fingerprint,
      seq: p.copy.seq,
      manifest: verified(p.copy.manifest, p.slot.slotId, p.answer.synced, p.wrap),
    });
    keepLastPasskey({
      credentialId: b64(p.answer.rawId),
      ...(p.answer.rpId ? { rpId: p.answer.rpId } : {}),
    });
    const checked = await saveAndCheck(p.held, remembered()!);
    pending = undefined;
    return { ...checked, counted: remembered()?.counted === true };
  });

/**
 * "Use my recovery sheet" on a new device: the whole code, typed, opens the copy through the
 * registry's own copy of its slot. As with Face ID, nothing changes here until the person accepts
 * it (adoptFound): the page shows the copy's date first. A typo is caught here, before the
 * registry is asked; a code that opens nothing is said so.
 */
export const findWithSheet = async (typed: string): Promise<Found> => {
  dropPending();
  const parsed = parseRecoveryCode(typed);
  if (!parsed.ok) throw new PasskeyProblem(parsed.why);
  const opened = await openWithCode(parsed.code);
  pending = {
    kind: 'recovery',
    held: opened.held,
    slot: opened.slot,
    copy: opened.copy,
    wrap: opened.wrap,
    ak: opened.ak,
  };
  return foundOf(opened.copy);
};

// The account key a recovery sheet just opened on this device, held for the "Use Face ID on this
// device" offer that follows at once (a passkey can only be added with the account key itself),
// then wiped: after two minutes, once used, or when the page is left (security pass on step 3).
// Never written anywhere.
const RECOVERED_MS = 2 * 60_000;
let recovered: { copyId: string; ak: Uint8Array; timer: ReturnType<typeof setTimeout> } | undefined;
const forgetRecovered = (): void => {
  if (!recovered) return;
  clearTimeout(recovered.timer);
  recovered.ak.fill(0);
  recovered = undefined;
};
const keepRecovered = (copyId: string, ak: Uint8Array): void => {
  forgetRecovered();
  recovered = { copyId, ak: new Uint8Array(ak), timer: setTimeout(forgetRecovered, RECOVERED_MS) };
  ak.fill(0);
};
/** Forget a found copy and any account key held for it (the restore page, when it is left). */
export const forgetFound = (): void => {
  dropPending();
  forgetRecovered();
};
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function')
  window.addEventListener('pagehide', forgetFound);

/** Whether "Use Face ID on this device" can go ahead without the code typed again. */
export const recoveredHere = (): boolean => !!recovered && recovered.copyId === remembered()?.copyId;

/**
 * "Use Face ID on this device": a new passkey here, added to the same copy as another way in,
 * then opened again through the registry's copy of it (B2, a second Face ID). Needs the account
 * key: the one a recovery sheet just opened here, or the sheet's code typed again.
 */
export const addFaceIdHere = (typed?: string): Promise<SetUpResult> => exclusive(() => addFaceId(typed));

const addFaceId = async (typed?: string): Promise<SetUpResult> => {
  const r = remembered();
  const keys = r && (await heldAccountKeys());
  if (!r) throw new PasskeyProblem(PASSKEY_WORDS.noCopy);
  let ak: Uint8Array;
  let held: HeldAccount;
  if (recovered && recovered.copyId === r.copyId) {
    ak = new Uint8Array(recovered.ak);
    held = await deriveAccount(ak);
  } else {
    const parsed = parseRecoveryCode(typed ?? '');
    if (!typed) throw new PasskeyProblem(SHEET_WORDS.needsSheet);
    if (!parsed.ok) throw new PasskeyProblem(parsed.why);
    const opened = await openWithCode(parsed.code, r.copyId);
    ak = opened.ak;
    held = opened.held;
    patch((x) => ({ ...x, manifest: sheetVerified(x.manifest, opened.slot.slotId, opened.wrap) }));
  }
  try {
    if (keys && keys.copyId !== held.copyId) throw new PasskeyProblem(PASSKEY_WORDS.damaged);
    // A passkey this browser used for these records before is asked again, never a second one
    // in the person's password list (New-4); one that's gone is forgotten, so a retry makes one.
    const last = lastPasskey();
    const tag = last?.tag ?? newPasskeyTag();
    let answer: PasskeyAnswer;
    if (last) {
      try {
        answer = await askPasskey(unb64(last.credentialId), last.rpId ?? 'host');
      } catch (e) {
        forgetLastPasskey();
        throw e;
      }
    } else answer = await newPasskey(tag);
    const slot = passkeySlotKeys(answer.prf, answer.rawId);
    // Added at the registry (again, when its way in went missing there): a 409 is fine only when
    // that way in already opens these records.
    const box = await wrapAccountKey(ak, slot, held.copyId, 'passkey');
    const out = await registryCall('PUT', `/account-copy/${held.copyId}/slots/${slot.slotId}`, {
      token: await writeToken(held),
      kind: 'passkey',
      tokenHash: tokenHashOf(slot.token),
      ...box,
    });
    let wrapSeen = out.status === 200 ? boxFingerprint(box) : undefined;
    if (out.status === 409) {
      const there = await readSlot(slot, 'passkey');
      if (!there || there.copyId !== held.copyId) {
        // That passkey opens other records (an earlier copy): forgotten here, so trying again makes
        // a new passkey for these ones (security pass on step 3).
        if (last) forgetLastPasskey();
        return registryFail(out);
      }
      wrapSeen = boxFingerprint(there);
    } else if (out.status !== 200) registryFail(out);
    const now = remembered() ?? r;
    const entry: SlotEntry = {
      slotId: slot.slotId,
      kind: 'passkey',
      createdAt: new Date().toISOString(),
      synced: answer.synced,
      tag,
      ...(wrapSeen ? { wrap: wrapSeen } : {}),
    };
    remember({
      ...now,
      slotId: slot.slotId,
      credentialId: b64(answer.rawId),
      ...(answer.rpId ? { rpId: answer.rpId } : {}),
      manifest: {
        ...now.manifest,
        slots: [...now.manifest.slots.filter((x) => x.slotId !== slot.slotId), entry],
      },
      sameAs: '',
    });
    keepLastPasskey({ credentialId: b64(answer.rawId), ...(answer.rpId ? { rpId: answer.rpId } : {}), tag });
    await keepAccountKeys(held);
    await saveAndCheck(held, remembered()!);
    forgetRecovered();
  } finally {
    ak.fill(0);
  }
  const checked = await verifyAndCount(remembered()!);
  return { ...checked, counted: remembered()?.counted === true };
};

/** A recovery sheet just made: its code (shown and printed once, kept nowhere) and what the sheet also says. */
export type MadeSheet = {
  readonly code: string;
  readonly slotId: string;
  readonly createdAt: string;
  /** The tag in the name of the passkey that opens the same records, for the sheet. */
  readonly tag?: string;
};

/**
 * "Print or save my recovery sheet": one Face ID through this device's passkey (which also counts
 * as its re-verify) gives the account key; a new code is made here, the key sealed for it, and the
 * slot added at the registry and to the sealed list, not verified yet. An older sheet keeps
 * working until this one is checked (confirmRecoverySheet).
 */
export const makeRecoverySheet = (): Promise<MadeSheet> =>
  exclusive(async () => {
    const r = remembered();
    if (!r) throw new PasskeyProblem(PASSKEY_WORDS.noCopy);
    if (!r.credentialId) throw new PasskeyProblem(SHEET_WORDS.needsSheet);
    const answer = await askPasskey(unb64(r.credentialId), r.rpId ?? 'host');
    const opened = await openThroughSlot(answer, { copyId: r.copyId, slotId: r.slotId });
    if (!opened) throw new PasskeyProblem(PASSKEY_WORDS.noCopy);
    const { held, ak } = opened;
    try {
      await keepAccountKeys(held);
      // Sheets made and never checked are dropped as this one is made: only one waits at a time.
      // Decided from this list merged with the copy just read (security pass on step 3, S-1): a
      // sheet another device has checked since is never taken for an unchecked one.
      const base = mergeManifests((remembered() ?? r).manifest, opened.copy.manifest);
      const unchecked = base.slots.filter((x) => x.kind === 'recovery' && !x.verifiedAt);
      const code = newRecoveryCode();
      const slot = recoverySlotKeys(code);
      const wrap = await wrapAccountKey(ak, slot, held.copyId, 'recovery');
      const out = await registryCall('PUT', `/account-copy/${held.copyId}/slots/${slot.slotId}`, {
        token: await writeToken(held),
        kind: 'recovery',
        tokenHash: tokenHashOf(slot.token),
        ...wrap,
      });
      if (out.status !== 200) registryFail(out);
      const createdAt = new Date().toISOString();
      const now = remembered() ?? r;
      const v = verified(mergeManifests(now.manifest, opened.copy.manifest), r.slotId, answer.synced, opened.wrap);
      try {
        await removeSlots(held, unchecked);
        remember({
          ...now,
          manifest: retire(
            {
              ...v,
              slots: [...v.slots, { slotId: slot.slotId, kind: 'recovery', createdAt, wrap: boxFingerprint(wrap) }],
            },
            unchecked.map((x) => x.slotId),
            createdAt,
          ),
          sameAs: '',
        });
        const saved = await saveAndCheck(held, remembered()!);
        if (!saved.ok) throw new PasskeyProblem(saved.reason);
      } catch (e) {
        // Not in the saved list, a way in whose code nobody has would show as "something you
        // didn't add": taken away again, and the sheet is made again from the start.
        await removeSlots(held, [{ slotId: slot.slotId, kind: 'recovery', createdAt }]).catch(() => undefined);
        patch((x) => ({ ...x, manifest: retire(x.manifest, [slot.slotId], createdAt) }));
        throw e;
      }
      const tag = (remembered() ?? now).manifest.slots.find((x) => x.slotId === r.slotId)?.tag;
      return { code, slotId: slot.slotId, createdAt, ...(tag ? { tag } : {}) };
    } finally {
      ak.fill(0);
    }
  });

/** Ways in removed at the registry (a 404 is fine: already gone). */
const removeSlots = async (held: HeldAccount, slots: readonly SlotEntry[]): Promise<void> => {
  for (const x of slots) {
    const out = await registryCall('POST', `/account-copy/${held.copyId}/slots/${x.slotId}/delete`, {
      token: await writeToken(held),
    });
    if (out.status !== 200 && out.status !== 404) registryFail(out);
  }
};

const retire = (m: Manifest, ids: readonly string[], at: string): Manifest =>
  ids.length === 0
    ? m
    : {
        ...m,
        slots: m.slots.filter((x) => !ids.includes(x.slotId)),
        retired: { ...(m.retired ?? {}), ...Object.fromEntries(ids.map((id) => [id, at])) },
      };

/**
 * "Check it": the whole code typed back from the printed sheet, opened through the registry's own
 * copy of its slot and compared with the copy's key-check value (security review B2, for the
 * sheet). Then it counts, and every other sheet stops working (removed at the registry, retired
 * in the sealed list). `slotId` is the sheet just made, when checking that one: another sheet's
 * code is then said to be the wrong sheet. Without it (Settings, "Check my recovery sheet") any
 * sheet of these records is checked.
 */
export const confirmRecoverySheet = (typed: string, slotId?: string): Promise<CheckResult> =>
  exclusive(async () => {
    const parsed = parseRecoveryCode(typed);
    if (!parsed.ok) throw new PasskeyProblem(parsed.why);
    const r = remembered();
    if (!r) throw new PasskeyProblem(PASSKEY_WORDS.noCopy);
    const keys = recoverySlotKeys(parsed.code);
    if (slotId && keys.slotId !== slotId) {
      // A sheet of these records, but not the one just made (an older one): said so.
      throw new PasskeyProblem(
        r.manifest.slots.some((x) => x.slotId === keys.slotId) ? SHEET_WORDS.notThisSheet : SHEET_WORDS.wrong,
      );
    }
    const opened = await openWithCode(parsed.code, r.copyId);
    opened.ak.fill(0);
    // An older copy than this device has seen (a registry rolled back): refused, nothing changes
    // (security pass on step 3, S-2).
    if (opened.copy.seq < r.seq) throw new PasskeyProblem(PASSKEY_WORDS.older);
    await keepAccountKeys(opened.held);
    const at = new Date().toISOString();
    // This list merged with the copy just read; the sheet must be one of its ways in now.
    const base = mergeManifests((remembered() ?? r).manifest, opened.copy.manifest);
    if (!base.slots.some((x) => x.slotId === keys.slotId)) throw new PasskeyProblem(SHEET_WORDS.wrong);
    const others = base.slots.filter((x) => x.kind === 'recovery' && x.slotId !== keys.slotId);
    await removeSlots(opened.held, others);
    const now = remembered() ?? r;
    remember({
      ...now,
      manifest: retire(
        sheetVerified(base, keys.slotId, opened.wrap, at),
        others.map((x) => x.slotId),
        at,
      ),
      sameAs: '',
    });
    const checked = await saveAndCheck(opened.held, remembered()!);
    if (!checked.ok) throw new PasskeyProblem(checked.reason);
    // "Works" only when the saved copy lists it, checked, and it is at the registry as opened.
    const after = remembered();
    if (!after?.manifest.slots.find((x) => x.slotId === keys.slotId)?.verifiedAt || after.problem === 'slot-missing')
      throw new PasskeyProblem(PASSKEY_WORDS.damaged);
    return checked;
  });

/** "Bring them anyway" (review New-5): records deleted on another device, brought here on purpose. */
export const markBroughtBack = (ids: readonly string[]): void => ids.forEach((id) => noteRestored(id));

// ---- keeping it up to date by itself -------------------------------------------------------

/** Save now if anything changed (or a heartbeat is due). Quietly does nothing without a copy or its keys here. */
export const syncNow = (opts: { force?: boolean } = {}): Promise<CheckResult | undefined> =>
  exclusive(async () => {
    const r = remembered();
    const held = r && (await heldAccountKeys());
    if (!r || !held || held.copyId !== r.copyId) return undefined;
    const mine = r.manifest.devices[thisDeviceId()];
    const heartbeat = !mine || Date.now() - Date.parse(mine.at) > HEARTBEAT_MS;
    if (!opts.force && !heartbeat && r.sameAs === sameAsOf(accountContents()) && !r.problem) return undefined;
    try {
      const out = await saveAndCheck(held, r);
      if (!out.ok) patch((x) => ({ ...x, problem: 'failing', why: out.reason }));
      return out;
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      const gone = e instanceof PasskeyProblem && e.message === PASSKEY_WORDS.noCopy;
      if (gone) clearCopyMarks();
      patch((x) => ({
        ...x,
        problem: gone
          ? 'missing'
          : e instanceof PasskeyProblem && e.message === PASSKEY_WORDS.older
            ? 'older'
            : 'failing',
        why,
        ...(gone ? { counted: false } : {}),
      }));
      return { ok: false, reason: why };
    }
  });

/**
 * When the app opens (and now and then): is there a newer copy, and are this copy's ways in still
 * at the registry? A copy that's gone (404), or a way in it counts on that's gone, takes its
 * marks with it (S1, S4). A newer copy is merged in. Needs the write token (N7).
 */
export const checkAccount = (): Promise<void> =>
  exclusive(async () => {
    const r = remembered();
    const held = r && (await heldAccountKeys());
    if (!r || !held || held.copyId !== r.copyId) return;
    let out;
    try {
      out = await registryCall('POST', `/account-copy/${r.copyId}/head`, { token: await writeToken(held) });
    } catch {
      return; // offline: nothing learned
    }
    if (out.status === 404) {
      clearCopyMarks();
      patch((x) => ({ ...x, problem: 'missing', counted: false }));
      return;
    }
    if (out.status !== 200 || !isObject(out.json) || !isString(out.json.fingerprint)) return;
    const listed = listedOf(out.json.slots);
    // Gone, or held differently than when last opened (its wrap's fingerprint changed): either way
    // that way in no longer counts (S4, and the re-verify of step 3).
    const present = presentSlots(r.manifest, listed);
    const unknownSlots = listed.map((l) => l.slotId).filter((id) => !r.manifest.slots.some((s) => s.slotId === id));
    const slotGone = present.length < r.manifest.slots.length;
    if (r.counted && !countsAsBackup({ ...r.manifest, slots: present })) clearCopyMarks();
    patch((x) => ({
      ...x,
      unknownSlots,
      ...(slotGone
        ? { problem: 'slot-missing' as const, counted: countsAsBackup({ ...x.manifest, slots: present }) }
        : {}),
      ...(!slotGone && (x.problem === 'slot-missing' || x.problem === 'missing') ? { problem: undefined } : {}),
    }));
    if (out.json.fingerprint === r.prev) return;
    // Another device saved: take its copy in, if it is newer than anything seen here.
    try {
      const theirs = await fetchCopy(held);
      if (theirs.seq <= r.seq) {
        // Older than this device has seen: the next save merges it and saves the newer copy over
        // it (review New-2). Nothing to say until that is done.
        patch((x) => ({ ...x, sameAs: '' }));
        return;
      }
      plausible(theirs, r.seq);
      await restoreAny(fileOf(theirs.text), undefined, {
        mark: false,
        skipForgotten: true,
        keepVault: true,
        skipIds: skipOf(theirs.manifest),
      });
      patch((x) => ({
        ...x,
        prev: theirs.fingerprint,
        seq: theirs.seq,
        savedAt: theirs.savedAt,
        manifest: mergeManifests(x.manifest, theirs.manifest),
        // A save only when this browser holds something the copy lacks: two open devices don't
        // keep saving each other's copy (review New-1).
        sameAs: sameAsAfterMerge(theirs.text),
        ...(x.problem === 'older' ? { problem: undefined } : {}),
      }));
    } catch {
      /* tried again on the next check */
    }
  });

// The end-to-end build (package.json e2e:build) saves within seconds, so a test needn't wait a
// minute; every other build has the constant below.
const FAST = import.meta.env.VITE_E2E_FIXTURES === '1';
const QUIET_MS = FAST ? 1_500 : 30_000;
const JITTER_MS = FAST ? 500 : 30_000;
const TICK_MS = FAST ? 500 : 10_000;
const CHECK_EVERY_MS = 10 * 60_000;
const RETRY_AFTER_MS = 5 * 60_000;

let started = false;
/**
 * Keep the copy up to date while the app is open (App.tsx): a save 30 to 60 seconds after the
 * last change (the random part also keeps saves from lining up with the record writes that cause
 * them, review S10), at once when the page is hidden (S9), and a check for a newer copy on open
 * and every ten minutes.
 */
export const startAccountSync = (): void => {
  if (started || typeof window === 'undefined' || !accountCopyOn()) return;
  started = true;
  let seenHash = '';
  let dueAt = 0;
  let nextCheck = 0;
  const dirty = (): boolean => {
    const r = remembered();
    if (!r) return false;
    return r.sameAs !== sameAsOf(accountContents());
  };
  const tick = () => {
    const r = remembered();
    if (!r || busy) return;
    const now = Date.now();
    if (now >= nextCheck) {
      nextCheck = now + CHECK_EVERY_MS;
      void checkAccount().then(() => syncNow());
      return;
    }
    if (r.problem === 'failing' && now < dueAt) return;
    const h = sameAsOf(accountContents());
    if (h === r.sameAs) {
      seenHash = h;
      return;
    }
    if (h !== seenHash) {
      seenHash = h;
      dueAt = now + QUIET_MS + Math.floor(Math.random() * JITTER_MS);
      return;
    }
    if (now >= dueAt) {
      void syncNow().then((out) => {
        if (out && !out.ok) dueAt = Date.now() + RETRY_AFTER_MS;
      });
    }
  };
  window.setInterval(tick, TICK_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && dirty() && !busy) void syncNow();
    if (document.visibilityState === 'visible') nextCheck = 0;
  });
  tick();
};

// ---- deleting, forgetting, devices ----------------------------------------------------------

/**
 * Stop saving with VeilCore: delete the copy and every way in at the registry (with Face ID when
 * this browser no longer holds its keys). Every mark the copy made goes (S1). The passkey itself
 * stays in the phone's settings.
 */
export const deleteAccountCopy = (): Promise<void> =>
  exclusive(async () => {
    const r = remembered();
    if (!r) return;
    let held = await heldAccountKeys();
    if (!held || held.copyId !== r.copyId) {
      if (!r.credentialId) throw new PasskeyProblem(SHEET_WORDS.needsSheet);
      const answer = await askPasskey(unb64(r.credentialId), r.rpId ?? 'host');
      const opened = await openThroughSlot(answer, { copyId: r.copyId, slotId: r.slotId });
      if (!opened) {
        clearCopyMarks();
        await forgetAccountKeys();
        remember(undefined);
        return;
      }
      opened.ak.fill(0);
      held = opened.held;
    }
    const out = await registryCall('POST', `/account-copy/${r.copyId}/delete`, { token: await writeToken(held) });
    if (out.status !== 200 && out.status !== 404) registryFail(out);
    // The passkey is remembered, so setting up again uses it rather than making a second one (New-4).
    if (r.credentialId)
      keepLastPasskey({
        credentialId: r.credentialId,
        ...(r.rpId ? { rpId: r.rpId } : {}),
        ...(r.manifest.slots.find((x) => x.slotId === r.slotId)?.tag
          ? { tag: r.manifest.slots.find((x) => x.slotId === r.slotId)!.tag }
          : {}),
      });
    clearCopyMarks();
    await forgetAccountKeys();
    remember(undefined);
  });

// The passkey this browser last used for the copy: no secret, its id and tag (review New-4).
const LAST = 'veilcore.account.last-passkey.v1';
type LastPasskey = { readonly credentialId: string; readonly rpId?: string; readonly tag?: string };
const lastPasskey = (): LastPasskey | undefined => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(LAST) ?? 'null');
    return isObject(v) && isString(v.credentialId)
      ? {
          credentialId: v.credentialId,
          ...(isString(v.rpId) ? { rpId: v.rpId } : {}),
          ...(isString(v.tag) ? { tag: v.tag } : {}),
        }
      : undefined;
  } catch {
    return undefined;
  }
};
const keepLastPasskey = (l: LastPasskey): void => {
  try {
    localStorage.setItem(LAST, JSON.stringify(l));
  } catch {
    /* a new passkey next time */
  }
};
const forgetLastPasskey = (): void => {
  try {
    localStorage.removeItem(LAST);
  } catch {
    /* nothing kept */
  }
};

/** "Start over" on this device (records.ts): the copy stays at the registry; this browser forgets it. */
export const forgetAccountOnThisDevice = (): Promise<void> =>
  exclusive(async () => {
    clearCopyMarks();
    await forgetAccountKeys();
    forgetLastPasskey();
    remember(undefined);
  });

/** "OK" on the one-time notice. */
export const dismissNotice = (): void =>
  patch((r) => {
    const { notice: _n, ...rest } = r;
    void _n;
    return rest;
  });

/**
 * "Keep it here" (review New-6): records deleted on another device that this one still holds are
 * kept on purpose. They are listed as restored, so the copy holds them and counts them again.
 */
export const keepDeletedHere = (ids: readonly string[]): Promise<CheckResult | undefined> => {
  ids.forEach((id) => noteRestored(id));
  patch((r) => ({ ...r, sameAs: '' }));
  return syncNow({ force: true });
};

/** "That device is gone": it isn't warned about again, and drops off the list on the next save. */
export const forgetDevice = (deviceId: string): void =>
  patch((r) => {
    const devices = { ...r.manifest.devices };
    delete devices[deviceId];
    return { ...r, manifest: { ...r.manifest, devices }, gone: [...(r.gone ?? []), deviceId], sameAs: '' };
  });

// ---- what the screens show ------------------------------------------------------------------

export type AccountState =
  | { readonly kind: 'off' }
  | { readonly kind: 'none' }
  /** A passkey copy from before: one Face ID moves it over. */
  | { readonly kind: 'older' }
  | {
      readonly kind: 'saved';
      readonly savedAt: string;
      /** Counts as the backup: a synced, verified passkey (the founder's rule). */
      readonly counted: boolean;
      /** This browser doesn't hold the copy's keys: saving waits for one Face ID. */
      readonly locked: boolean;
      readonly problem?: Problem;
      readonly why?: string;
      readonly slots: readonly SlotEntry[];
      readonly unknownSlots: readonly string[];
      readonly notice?: 'healed';
      /** Records this device holds that the copy says were deleted on another device (New-6). */
      readonly deletedHere: readonly string[];
      /** The person's other devices that haven't saved for two weeks while this one has (S17). */
      readonly staleDevices: readonly { readonly id: string; readonly kind: DeviceKind; readonly at: string }[];
      readonly devices: readonly {
        readonly id: string;
        readonly kind: DeviceKind;
        readonly at: string;
        readonly here: boolean;
      }[];
      /** This device opens the copy with a passkey of its own (not only the recovery sheet it came back with). */
      readonly faceIdHere: boolean;
      /** The tag in the name of this device's passkey (for the recovery sheet). */
      readonly tag?: string;
      /** The newest recovery sheet in the sealed list, and whether its whole code was typed back. */
      readonly sheet?: { readonly createdAt: string; readonly checked: boolean; readonly checkedAt?: string };
      /** This device's passkey hasn't been opened again for 90 days: asked once more (re-verify). */
      readonly reverify: boolean;
      /** Day 7 or day 30 after setting up, with no checked recovery sheet: one quiet line asks. */
      readonly sheetReminder?: 7 | 30;
    };

let held: boolean | undefined;
let heldFor = '';
const refreshHeld = () => {
  void heldAccountKeys().then((h) => {
    const r = remembered();
    const now = !!h && !!r && h.copyId === r.copyId;
    if (now !== held || heldFor !== (r?.copyId ?? '')) {
      held = now;
      heldFor = r?.copyId ?? '';
      notify();
    }
  });
};

export const accountState = (): AccountState => {
  if (!PASSKEY_BACKUP) return { kind: 'off' };
  const r = remembered();
  if (!r) return !passkeysAvailable() ? { kind: 'off' } : legacyRemembered() ? { kind: 'older' } : { kind: 'none' };
  if (heldFor !== r.copyId) refreshHeld();
  const here = thisDeviceId();
  const mine = r.manifest.devices[here];
  const devices = Object.entries(r.manifest.devices).map(([id, d]) => ({
    id,
    kind: d.kind,
    at: d.at,
    here: id === here,
  }));
  const mineAt = mine ? Date.parse(mine.at) : 0;
  const ownSlot = r.manifest.slots.find((x) => x.slotId === r.slotId);
  const sheets = r.manifest.slots
    .filter((x) => x.kind === 'recovery')
    .sort((a, b) => (b.verifiedAt ?? '').localeCompare(a.verifiedAt ?? '') || b.createdAt.localeCompare(a.createdAt));
  const sheet = sheets[0];
  const now = Date.now();
  const faceIdHere = !!r.credentialId && ownSlot?.kind === 'passkey';
  return {
    kind: 'saved',
    savedAt: r.savedAt,
    counted: r.counted === true,
    locked: held === false,
    ...(r.problem ? { problem: r.problem } : {}),
    ...(r.why ? { why: r.why } : {}),
    slots: r.manifest.slots,
    unknownSlots: r.unknownSlots ?? [],
    ...(r.notice ? { notice: r.notice } : {}),
    deletedHere: (() => {
      const gone = new Set(deletedIds(r.manifest));
      return allKeys()
        .map((k) => k.recordId)
        .filter((id) => gone.has(id));
    })(),
    staleDevices: devices.filter(
      (d) => !d.here && !(r.gone ?? []).includes(d.id) && mineAt - Date.parse(d.at) > STALE_DEVICE_MS,
    ),
    devices,
    faceIdHere,
    ...(ownSlot?.tag ? { tag: ownSlot.tag } : {}),
    ...(sheet
      ? {
          sheet: {
            createdAt: sheet.createdAt,
            checked: !!sheet.verifiedAt,
            ...(sheet.verifiedAt ? { checkedAt: sheet.verifiedAt } : {}),
          },
        }
      : {}),
    reverify: faceIdHere && now - Date.parse(ownSlot?.verifiedAt ?? '') > REVERIFY_MS,
    ...(() => {
      const day = sheetReminderDay(r.manifest, now);
      return day ? { sheetReminder: day } : {};
    })(),
  };
};

/** Day 7 or 30 after the first way in was set up, while no sheet is checked and that day's line wasn't dismissed. */
const sheetReminderDay = (m: Manifest, now: number): 7 | 30 | undefined => {
  if (m.slots.some((x) => x.kind === 'recovery' && x.verifiedAt)) return undefined;
  const since = Math.min(...m.slots.filter((x) => x.kind === 'passkey').map((x) => Date.parse(x.createdAt)));
  if (!Number.isFinite(since)) return undefined;
  const days = (now - since) / 86_400_000;
  const dismissed = remindersDismissed();
  if (days >= 30) return dismissed.includes(30) ? undefined : 30;
  if (days >= 7) return dismissed.includes(7) ? undefined : 7;
  return undefined;
};

const remindersDismissed = (): number[] => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(REMINDED) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : [];
  } catch {
    return [];
  }
};

/** "Later" on the reminder: that day's line isn't shown again (day 30's still comes). */
export const dismissSheetReminder = (day: 7 | 30): void => {
  try {
    const had = remindersDismissed();
    // Dismissing day 30 covers day 7 too: never shown after it.
    localStorage.setItem(REMINDED, JSON.stringify([...new Set([...had, day, ...(day === 30 ? [7] : [])])]));
  } catch {
    /* asked again next visit */
  }
  notify();
};

let snapshot: { v: number; s: AccountState } | undefined;
const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === STORE || e.key === null) notify();
  });
}
/** React: the account copy's state, redrawn when it changes. */
export const useAccountState = (): AccountState =>
  useSyncExternalStore(
    subscribe,
    () => {
      if (!snapshot || snapshot.v !== version) snapshot = { v: version, s: accountState() };
      return snapshot.s;
    },
    (): AccountState => ({ kind: 'off' }),
  );

/** The first-run sheet opens by itself once per browser (KeepSafe.tsx); after that, from the account line. */
export const keepSafeShownBefore = (): boolean => {
  try {
    return localStorage.getItem(SHOWN) !== null;
  } catch {
    return true;
  }
};
export const noteKeepSafeShown = (): void => {
  try {
    localStorage.setItem(SHOWN, new Date().toISOString());
  } catch {
    /* shown again next visit */
  }
};

/** Tests only: forget the page-life state. */
export const _resetAccountForTests = (): void => {
  dropPending();
  forgetRecovered();
  chain = Promise.resolve();
  busy = 0;
  held = undefined;
  heldFor = '';
  started = false;
};
