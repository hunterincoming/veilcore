// Passkeys, and the passkey copy made before the account copy.
//
// Since easy mode step 2 (November 2026) the copy of a person's keys is the account copy
// (account-copy.ts): one copy, sealed with an account key, opened by several ways in. A passkey
// is the first of them. This file keeps what a passkey does and what the older copy needs:
//
//   - asking a passkey for its PRF output (WebAuthn Level 3, the "prf" extension; the approach
//     Bitwarden and 1Password use for passkey unlock). The passkey computes HMAC over a fixed
//     input inside the authenticator, after Face ID or the device PIN. The output never leaves
//     this page, and differs per passkey and per site. HKDF turns it into keys (never the raw
//     output, as the WebAuthn editors advise);
//   - whether the passkey syncs (the authenticator data's backup-state flag, BS): a synced one is
//     on the person's other devices through Apple or Google, a device-bound one (Windows Hello, a
//     security key) only on this one;
//   - which site a passkey belongs to (`rpIdFor`, security review N2): pinned to veilcore.org so
//     a move of the app to a subdomain doesn't strand every passkey. Passkeys made before were
//     made for the page's own host, which on veilcore.org is the same name; one made on
//     www.veilcore.org was made for that host, so it is asked for there by its own name;
//   - the passkey copy made before the account copy (one copy per passkey, at the registry's
//     /vault): read once, moved into an account copy and deleted (account-copy.ts migrate).
//     No new copy is made here.
// SPDX-License-Identifier: Apache-2.0

import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { base64urlnopad } from '@scure/base';
import type { BackupContents } from './backup';
import { isObject, isString, readJson } from './json';
import { enT } from '../i18n/translate';

const BASE = import.meta.env.VITE_API_BASE ?? '';
const utf8 = (s: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(s);
const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const copy = (b: Uint8Array): Uint8Array<ArrayBuffer> => new Uint8Array(b);

export const PASSKEY_COPY_VERSION = 'veilcore/passkey-copy/v1';
const DOMAIN = 'veilcore/passkey-backup/v1';
/**
 * What the passkey's PRF is asked for: the same for everyone; the passkey's own secret makes it
 * personal. Unchanged for the account copy: the same passkey gives the same output, so a copy
 * made before opens, and the account copy's keys come from it under other HKDF labels.
 */
export const PRF_INPUT: Uint8Array<ArrayBuffer> = copy(sha256(utf8(`${DOMAIN}/prf-input`)));
/** What this browser remembered of a passkey copy made before the account copy. */
export const LEGACY_STORE = 'veilcore:passkey-copy';

/** What can go wrong, in English (flow/backup-words.ts says each in the visitor's language). */
export const PASSKEY_WORDS = {
  unsupported: enT.t('app.backup.passkey.err.unsupported'),
  cancelled: enT.t('app.backup.passkey.err.cancelled'),
  noCopy: enT.t('app.backup.passkey.err.noCopy'),
  unreachable: enT.t('app.backup.passkey.err.unreachable'),
  damaged: enT.t('app.backup.passkey.err.damaged'),
  older: enT.t('app.backup.passkey.err.older'),
  busy: enT.t('app.backup.passkey.err.busy'),
} as const;

export class PasskeyProblem extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasskeyProblem';
  }
}

// --- which site a passkey is for (N2) ---

/**
 * The relying party id a new passkey is made for: veilcore.org on veilcore.org and its
 * subdomains, test.veilcore.org on the test site (its own passkeys stay its own), and the
 * browser's default (the page's host) anywhere else (a local build, a preview).
 */
export const rpIdFor = (host: string): string | undefined => {
  const h = host.toLowerCase();
  if (h === 'test.veilcore.org' || h.endsWith('.test.veilcore.org')) return 'test.veilcore.org';
  if (h === 'veilcore.org' || h.endsWith('.veilcore.org')) return 'veilcore.org';
  return undefined;
};

const hereHost = (): string => (typeof location !== 'undefined' ? location.hostname : '');
/** The id this page makes new passkeys for. */
export const pinnedRpId = (): string | undefined => rpIdFor(hereHost());
/**
 * Whether a passkey made here before the pin was made for another name than the pinned one
 * (www.veilcore.org): the restore screen then also offers to ask for it by this host's name.
 */
export const oldPasskeysHaveOtherName = (): boolean => {
  const pinned = pinnedRpId();
  return !!pinned && pinned !== hereHost().toLowerCase();
};

// --- the older copy's keys and box (read and moved over only) ---

export type PasskeyKeys = {
  /** The copy's id at the registry: 32 hex characters. */
  readonly id: string;
  /** Lets this browser write and read the copy: 32 bytes, base64url. */
  readonly token: string;
  /** Seals the copy. */
  readonly key: Uint8Array<ArrayBuffer>;
};

/** The older copy's keys from the passkey's PRF output and its credential id. */
export const passkeyKeys = (prfOutput: Uint8Array, credentialId: Uint8Array): PasskeyKeys => {
  if (prfOutput.length < 32) throw new PasskeyProblem(PASSKEY_WORDS.unsupported);
  const salt = sha256(new Uint8Array([...utf8(DOMAIN), ...credentialId]));
  const okm = hkdf(sha256, prfOutput, salt, utf8(DOMAIN), 80);
  return {
    key: copy(okm.slice(0, 32)),
    id: hex(okm.slice(32, 48)),
    token: base64urlnopad.encode(okm.slice(48, 80)),
  };
};

const aad = (id: string) => utf8(`${DOMAIN}:${id}`);

/** Seal a copy the old way: only the tests make one now, to check the move over. */
export const sealCopy = async (
  contents: BackupContents,
  keys: PasskeyKeys,
  seq = 1,
): Promise<{ iv: string; ct: string }> => {
  const body = { v: PASSKEY_COPY_VERSION, savedAt: contents.savedAt, seq, backup: contents };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await crypto.subtle.importKey('raw', keys.key, 'AES-GCM', false, ['encrypt']);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad(keys.id) },
    k,
    utf8(JSON.stringify(body)),
  );
  return { iv: base64urlnopad.encode(iv), ct: base64urlnopad.encode(new Uint8Array(ct)) };
};

/** The backup inside an older copy, and when it was made. Throws `damaged` for anything else. */
export const openCopy = async (
  box: { iv: string; ct: string },
  keys: PasskeyKeys,
): Promise<{ savedAt: string; seq: number; text: string }> => {
  let parsed: unknown;
  try {
    const k = await crypto.subtle.importKey('raw', keys.key, 'AES-GCM', false, ['decrypt']);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: copy(base64urlnopad.decode(box.iv)), additionalData: aad(keys.id) },
      k,
      copy(base64urlnopad.decode(box.ct)),
    );
    parsed = JSON.parse(new TextDecoder().decode(plain));
  } catch {
    throw new PasskeyProblem(PASSKEY_WORDS.damaged);
  }
  if (!isObject(parsed) || parsed.v !== PASSKEY_COPY_VERSION || !isString(parsed.savedAt) || !isObject(parsed.backup))
    throw new PasskeyProblem(PASSKEY_WORDS.damaged);
  const seq = typeof parsed.seq === 'number' && Number.isSafeInteger(parsed.seq) && parsed.seq > 0 ? parsed.seq : 0;
  return { savedAt: parsed.savedAt, seq, text: JSON.stringify(parsed.backup) };
};

// --- the registry ---

/** A JSON call to the registry. Throws `unreachable` when it can't be reached at all. */
export const registryCall = async (
  method: string,
  path: string,
  body: unknown,
): Promise<{ status: number; json: unknown }> => {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new PasskeyProblem(PASSKEY_WORDS.unreachable);
  }
  return { status: res.status, json: await readJson(res).catch(() => undefined) };
};

/** The registry's refusal as a problem: 404 is "no copy", anything else its own words. */
export const registryFail = (out: { status: number; json: unknown }): never => {
  // A registry from before the account copy has no such route: its 404 isn't the registry's own
  // JSON answer. Said as "can't reach", never as "no copy" (deploys check first:
  // scripts/registry-features.mjs account-copy-v1).
  if (out.status === 404 && !(isObject(out.json) && isString(out.json.error)))
    throw new PasskeyProblem(PASSKEY_WORDS.unreachable);
  if (out.status === 404) throw new PasskeyProblem(PASSKEY_WORDS.noCopy);
  throw new PasskeyProblem(
    isObject(out.json) && isString(out.json.error) ? out.json.error : `The registry answered ${out.status}.`,
  );
};

/** What the registry compares a save against: SHA-256 of "iv.ct" (registry account-copy.mjs). */
export const boxFingerprint = (box: { iv: string; ct: string }): string => hex(sha256(utf8(`${box.iv}.${box.ct}`)));

/** An older copy at the registry, opened: or `noCopy` when there is none. */
export const fetchLegacyCopy = async (
  keys: PasskeyKeys,
): Promise<{ savedAt: string; seq: number; text: string; fingerprint: string }> => {
  const out = await registryCall('POST', `/vault/${keys.id}/read`, { token: keys.token });
  if (out.status !== 200 || !isObject(out.json) || !isString(out.json.iv) || !isString(out.json.ct))
    return registryFail(out);
  const box = { iv: out.json.iv, ct: out.json.ct };
  return { ...(await openCopy(box, keys)), fingerprint: boxFingerprint(box) };
};

/** Delete an older copy at the registry (after it moved into the account copy: review N3). */
export const deleteLegacyCopy = async (keys: PasskeyKeys): Promise<void> => {
  const out = await registryCall('POST', `/vault/${keys.id}/delete`, { token: keys.token });
  if (out.status !== 200 && out.status !== 404) registryFail(out);
};

// --- the passkey (WebAuthn) ---

const asBytes = (v: unknown): Uint8Array | undefined =>
  v instanceof ArrayBuffer
    ? new Uint8Array(v)
    : ArrayBuffer.isView(v)
      ? new Uint8Array(v.buffer, v.byteOffset, v.byteLength)
      : undefined;

type PrfResults = { prf?: { enabled?: boolean; results?: { first?: unknown } } };

const prfOf = (cred: PublicKeyCredential): Uint8Array | undefined =>
  asBytes((cred.getClientExtensionResults() as PrfResults).prf?.results?.first);

/**
 * Whether the passkey syncs to the person's other devices: the authenticator data's flags byte
 * (after the 32-byte rpIdHash), bit 4 (BS, backup state). Unknown is "doesn't": a passkey is
 * only ever counted as off this device when it said so.
 */
export const syncedFromAuthData = (authData: Uint8Array | undefined): boolean =>
  !!authData && authData.length > 32 && (authData[32] & 0x10) !== 0;

const authDataOf = (cred: PublicKeyCredential): Uint8Array | undefined => {
  const r = cred.response as unknown as {
    authenticatorData?: unknown;
    getAuthenticatorData?: () => unknown;
  };
  if (r?.authenticatorData !== undefined) return asBytes(r.authenticatorData);
  if (typeof r?.getAuthenticatorData === 'function') {
    try {
      return asBytes(r.getAuthenticatorData());
    } catch {
      return undefined;
    }
  }
  return undefined;
};

const wrapped = async <T>(f: () => Promise<T>): Promise<T> => {
  try {
    return await f();
  } catch (e) {
    if (e instanceof PasskeyProblem) throw e;
    if (e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'AbortError'))
      throw new PasskeyProblem(PASSKEY_WORDS.cancelled);
    throw new PasskeyProblem(PASSKEY_WORDS.unsupported);
  }
};

/** Whether this browser can try at all (the passkey itself may still lack PRF: checked on use). */
export const passkeysAvailable = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.PublicKeyCredential === 'function' &&
  typeof navigator.credentials?.create === 'function';

/**
 * Whether this device has its own way to unlock a passkey (Face ID, Touch ID, a fingerprint,
 * Windows Hello). False on a computer without one: its passkeys come from a phone ("Use a
 * phone"), so the first-run sheet isn't pushed there.
 */
export const deviceUnlockAvailable = async (): Promise<boolean> => {
  try {
    const PKC = window.PublicKeyCredential as unknown as {
      isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
    };
    return passkeysAvailable() && (await PKC.isUserVerifyingPlatformAuthenticatorAvailable?.()) === true;
  } catch {
    return false;
  }
};

const challenge = () => crypto.getRandomValues(new Uint8Array(32));

export type PasskeyAnswer = {
  readonly prf: Uint8Array;
  readonly rawId: Uint8Array;
  /** BS from this answer's authenticator data. */
  readonly synced: boolean;
  /** The relying party id it was asked under (undefined: the page's host). */
  readonly rpId?: string;
};

/**
 * Ask an existing passkey for its PRF output: any of this site's (restore), or one by id.
 * `rpId` 'host' asks under the page's own host name (a passkey made before the pin, N2).
 */
export const askPasskey = (
  credentialId?: Uint8Array,
  /** A relying party id, or 'host' for the page's own host name. */
  rpId: string | undefined = pinnedRpId(),
): Promise<PasskeyAnswer> =>
  wrapped(async () => {
    const rp = rpId === 'host' ? undefined : rpId;
    const cred = (await navigator.credentials.get({
      publicKey: {
        challenge: challenge(),
        ...(rp ? { rpId: rp } : {}),
        userVerification: 'required',
        ...(credentialId ? { allowCredentials: [{ type: 'public-key', id: copy(credentialId) }] } : {}),
        extensions: { prf: { eval: { first: PRF_INPUT } } },
      },
    })) as PublicKeyCredential | null;
    const prf = cred && prfOf(cred);
    if (!cred || !prf) throw new PasskeyProblem(PASSKEY_WORDS.unsupported);
    return { prf, rawId: new Uint8Array(cred.rawId), synced: syncedFromAuthData(authDataOf(cred)), rpId: rp };
  });

/**
 * The passkey's name in the phone's password list (review N6): what it does, so nobody tidying
 * up deletes it as an old backup.
 */
export const PASSKEY_NAME = 'VeilCore: unlocks your records';

/** Make a new passkey for the account copy, and its PRF output (asking again if creation didn't give it). */
/** A short tag that tells one VeilCore passkey from another in a password list: random, never personal (review New-4). */
export const newPasskeyTag = (): string => {
  const A = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  return Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => A[b % 32]).join('');
};

export const newPasskey = (tag?: string): Promise<PasskeyAnswer> =>
  wrapped(async () => {
    const name = tag ? `${PASSKEY_NAME} · ${tag}` : PASSKEY_NAME;
    const rpId = pinnedRpId();
    const cred = (await navigator.credentials.create({
      publicKey: {
        rp: { name: 'VeilCore', ...(rpId ? { id: rpId } : {}) },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name,
          displayName: name,
        },
        challenge: challenge(),
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -8 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
        extensions: { prf: { eval: { first: PRF_INPUT } } },
      },
    })) as PublicKeyCredential | null;
    if (!cred) throw new PasskeyProblem(PASSKEY_WORDS.cancelled);
    const rawId = new Uint8Array(cred.rawId);
    const ext = (cred.getClientExtensionResults() as PrfResults).prf;
    const first = prfOf(cred);
    if (first) return { prf: first, rawId, synced: syncedFromAuthData(authDataOf(cred)), rpId };
    // Some authenticators say PRF works at creation but only answer when asked afterwards.
    if (ext?.enabled !== true) throw new PasskeyProblem(PASSKEY_WORDS.unsupported);
    return askPasskey(rawId, rpId);
  });

// --- what this browser remembered of an older copy (read, then forgotten after the move) ---

export type LegacyRemembered = {
  readonly id: string;
  readonly credentialId: string;
  readonly savedAt: string;
  /** The fingerprint of the copy as this browser last saved or read it. */
  readonly prev: string;
  /** That copy's sealed counter. */
  readonly seq: number;
};

export const legacyRemembered = (): LegacyRemembered | undefined => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(LEGACY_STORE) ?? 'null');
    return isObject(v) && isString(v.id) && isString(v.credentialId) && isString(v.savedAt)
      ? {
          id: v.id,
          credentialId: v.credentialId,
          savedAt: v.savedAt,
          prev: isString(v.prev) ? v.prev : 'none',
          seq: typeof v.seq === 'number' && Number.isSafeInteger(v.seq) ? v.seq : 0,
        }
      : undefined;
  } catch {
    return undefined;
  }
};

export const forgetLegacy = (): void => {
  try {
    localStorage.removeItem(LEGACY_STORE);
  } catch {
    /* nothing kept */
  }
};
