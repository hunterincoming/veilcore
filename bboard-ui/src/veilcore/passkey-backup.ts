// A copy of the backup that opens with a passkey: the way back after a lost phone.
//
// The backup file (backup.ts) holds every key a person has: records, licenses, deal keys.
// People lose the file, and growers lose phones. A passkey is already off the phone: Apple and
// Google sync it to every device signed into the same account. So the browser can keep an
// encrypted copy of the backup at the registry, under a key the passkey makes, and a new phone
// signed into that account makes the same key and opens the copy.
//
// How the key is made (WebAuthn Level 3, the "prf" extension; the approach Bitwarden and
// 1Password use for passkey unlock):
//   - the passkey computes HMAC over a fixed input inside the authenticator, after Face ID or
//     the device PIN. The output never leaves this page, and differs per passkey and per site;
//   - HKDF-SHA256 turns it into three values (never the raw output, as the WebAuthn editors
//     advise): the AES-256-GCM key that seals the copy, the copy's id at the registry, and the
//     token that lets this browser write or read it. The registry sees the id and the token's
//     hash (registry lineage/passkey-vault.mjs). It can't open, link or change the copy.
//
// What this is not: the only way back. A deleted passkey takes its key with it, so the backup
// file stays the other way in, and the page says so. A copy is read back from the registry,
// opened and checked to hold everything (checkBackup) before the page calls it up to date, but
// it never counts as the backup file: only a checked file clears "back up first".
//
// Two devices on one synced passkey: each save names the copy it replaces, the registry refuses
// a save over a newer one, and the page merges the newer copy in and saves again.
//
// The registry could serve an older copy it kept. The copy says when it was made, inside the
// sealed part, and the restore page shows that date and asks before anything changes.
// SPDX-License-Identifier: Apache-2.0

import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { base64urlnopad } from '@scure/base';
import { backupContents, checkBackup, restoreAny, type BackupContents, type CheckResult } from './backup';
import { isObject, isString, readJson } from './json';
import { enT } from '../i18n/translate';

const BASE = import.meta.env.VITE_API_BASE ?? '';
const utf8 = (s: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(s);
const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const copy = (b: Uint8Array): Uint8Array<ArrayBuffer> => new Uint8Array(b);

export const PASSKEY_COPY_VERSION = 'veilcore/passkey-copy/v1';
const DOMAIN = 'veilcore/passkey-backup/v1';
/** What the passkey's PRF is asked for: the same for everyone; the passkey's own secret makes it personal. */
export const PRF_INPUT: Uint8Array<ArrayBuffer> = copy(sha256(utf8(`${DOMAIN}/prf-input`)));
const STORE = 'veilcore:passkey-copy';

/** What can go wrong, in English (flow/backup-words.ts says each in the visitor's language). */
export const PASSKEY_WORDS = {
  unsupported: enT.t('app.backup.passkey.err.unsupported'),
  cancelled: enT.t('app.backup.passkey.err.cancelled'),
  noCopy: enT.t('app.backup.passkey.err.noCopy'),
  unreachable: enT.t('app.backup.passkey.err.unreachable'),
  damaged: enT.t('app.backup.passkey.err.damaged'),
  older: enT.t('app.backup.passkey.err.older'),
} as const;

export class PasskeyProblem extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasskeyProblem';
  }
}

export type PasskeyKeys = {
  /** The copy's id at the registry: 32 hex characters. */
  readonly id: string;
  /** Lets this browser write and read the copy: 32 bytes, base64url. */
  readonly token: string;
  /** Seals the copy. */
  readonly key: Uint8Array<ArrayBuffer>;
};

/** The copy's keys from the passkey's PRF output and its credential id. */
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

/** What is sealed: the backup, and when this copy was made. */
type Sealed = {
  readonly v: typeof PASSKEY_COPY_VERSION;
  readonly savedAt: string;
  /** Rises with every save, inside the sealed part: the registry can't pass an older copy off as newer. */
  readonly seq: number;
  readonly backup: BackupContents;
};

const aad = (id: string) => utf8(`${DOMAIN}:${id}`);

export const sealCopy = async (
  contents: BackupContents,
  keys: PasskeyKeys,
  seq = 1,
): Promise<{ iv: string; ct: string }> => {
  const body: Sealed = { v: PASSKEY_COPY_VERSION, savedAt: contents.savedAt, seq, backup: contents };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await crypto.subtle.importKey('raw', keys.key, 'AES-GCM', false, ['encrypt']);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad(keys.id) },
    k,
    utf8(JSON.stringify(body)),
  );
  return { iv: base64urlnopad.encode(iv), ct: base64urlnopad.encode(new Uint8Array(ct)) };
};

/** The backup inside a copy, and when it was made. Throws `damaged` for anything else. */
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

const call = async (method: string, path: string, body: unknown): Promise<{ status: number; json: unknown }> => {
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

const fail = (out: { status: number; json: unknown }): never => {
  if (out.status === 404) throw new PasskeyProblem(PASSKEY_WORDS.noCopy);
  throw new PasskeyProblem(
    isObject(out.json) && isString(out.json.error) ? out.json.error : `The registry answered ${out.status}.`,
  );
};

/** What the registry compares a save against: SHA-256 of "iv.ct" (registry passkey-vault.mjs). */
export const boxFingerprint = (box: { iv: string; ct: string }): string => hex(sha256(utf8(`${box.iv}.${box.ct}`)));

/** The copy changed since this browser last saw it (another device saved). */
class Stale extends Error {}

/** Save, but only over the copy this browser last saw (`prev`): never over another device's newer save. */
const upload = async (keys: PasskeyKeys, contents: BackupContents, prev: string, seq: number): Promise<string> => {
  const box = await sealCopy(contents, keys, seq);
  const out = await call('PUT', `/vault/${keys.id}`, { token: keys.token, prev, ...box });
  if (out.status === 409) throw new Stale();
  if (out.status !== 200) fail(out);
  return boxFingerprint(box);
};

const fetchCopy = async (
  keys: PasskeyKeys,
): Promise<{ savedAt: string; seq: number; text: string; fingerprint: string }> => {
  const out = await call('POST', `/vault/${keys.id}/read`, { token: keys.token });
  if (out.status !== 200 || !isObject(out.json) || !isString(out.json.iv) || !isString(out.json.ct)) return fail(out);
  const box = { iv: out.json.iv, ct: out.json.ct };
  return { ...(await openCopy(box, keys)), fingerprint: boxFingerprint(box) };
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

const challenge = () => crypto.getRandomValues(new Uint8Array(32));

/** Ask an existing passkey for its PRF output: any of this site's (restore), or one by id. */
const askPasskey = (credentialId?: Uint8Array): Promise<{ prf: Uint8Array; rawId: Uint8Array }> =>
  wrapped(async () => {
    const cred = (await navigator.credentials.get({
      publicKey: {
        challenge: challenge(),
        userVerification: 'required',
        ...(credentialId ? { allowCredentials: [{ type: 'public-key', id: copy(credentialId) }] } : {}),
        extensions: { prf: { eval: { first: PRF_INPUT } } },
      },
    })) as PublicKeyCredential | null;
    const prf = cred && prfOf(cred);
    if (!cred || !prf) throw new PasskeyProblem(PASSKEY_WORDS.unsupported);
    return { prf, rawId: new Uint8Array(cred.rawId) };
  });

/** Make a new passkey for the backup, and its PRF output (asking again if creation didn't give it). */
const newPasskey = (): Promise<{ prf: Uint8Array; rawId: Uint8Array }> =>
  wrapped(async () => {
    const day = new Date().toISOString().slice(0, 10);
    const cred = (await navigator.credentials.create({
      publicKey: {
        rp: { name: 'VeilCore' },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: `VeilCore backup ${day}`,
          displayName: `VeilCore backup ${day}`,
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
    if (first) return { prf: first, rawId };
    // Some authenticators say PRF works at creation but only answer when asked afterwards.
    if (ext?.enabled !== true) throw new PasskeyProblem(PASSKEY_WORDS.unsupported);
    return askPasskey(rawId);
  });

// --- what this browser remembers (no secrets: the id, the passkey's id, what was last saved) ---

type Remembered = {
  readonly id: string;
  readonly credentialId: string;
  readonly sameAs: string;
  readonly savedAt: string;
  /** The fingerprint of the copy as this browser last saved or read it: 'none' before the first. */
  readonly prev: string;
  /** That copy's sealed counter. */
  readonly seq: number;
};

const remembered = (): Remembered | undefined => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(STORE) ?? 'null');
    return isObject(v) && isString(v.id) && isString(v.credentialId) && isString(v.sameAs) && isString(v.savedAt)
      ? ({
          ...v,
          prev: isString(v.prev) ? v.prev : 'none',
          seq: typeof v.seq === 'number' && Number.isSafeInteger(v.seq) ? v.seq : 0,
        } as Remembered)
      : undefined;
  } catch {
    return undefined;
  }
};

const remember = (r: Remembered | undefined): void => {
  try {
    if (r) localStorage.setItem(STORE, JSON.stringify(r));
    else localStorage.removeItem(STORE);
  } catch {
    /* private mode: the copy still works, the page just can't say it's up to date */
  }
};

/** What a copy has to match to be current: the backup without its date or the version marks (they only rise). */
const sameAsOf = (c: BackupContents): string => {
  const rest: Record<string, unknown> = { ...c };
  delete rest.savedAt;
  delete rest.revs;
  return hex(sha256(utf8(JSON.stringify(rest))));
};

/**
 * The keys of the passkey this browser's copy is under, kept for this page's life only so
 * updating doesn't ask for Face ID every time. Only ever the remembered passkey's (attack pass
 * 21 Oct, finding 5): a passkey picked on the restore screen is held apart until its restore
 * is accepted.
 */
let session: { keys: PasskeyKeys; credentialId: string } | undefined;
let pending: { keys: PasskeyKeys; credentialId: string; fingerprint: string; seq: number } | undefined;

const sessionFor = (r: Remembered | undefined) =>
  session && r && session.credentialId === r.credentialId ? session : undefined;

export type PasskeyCopyState = 'none' | 'current' | 'behind';

export const passkeyCopyState = (contents: BackupContents = backupContents()): PasskeyCopyState => {
  const r = remembered();
  if (!r) return 'none';
  return r.sameAs === sameAsOf(contents) ? 'current' : 'behind';
};

export const passkeyCopySavedAt = (): string | undefined => remembered()?.savedAt;

/**
 * Save the copy over the one this browser last saw, read it back, and check it holds everything.
 * If another device on the same synced passkey saved since (attack pass 21 Oct, finding 2), its
 * copy is merged into this browser first, then saved again, so neither device's records are lost.
 * The merge (re-check, findings A and B) takes only a copy whose sealed counter is higher than any
 * this browser has seen, so an untrusted registry can't feed it an older one; marks nothing
 * backed up; skips records removed here on purpose; and never swaps the vault key.
 *
 * The check changes nothing (finding 3): a passkey copy doesn't count as the backup file. The
 * file stays the one thing that clears "back up first".
 */
const saveAndCheck = async (
  keys: PasskeyKeys,
  credentialId: string,
  prevIn: string,
  seqIn: number,
): Promise<CheckResult> => {
  let prev = prevIn;
  let seen = seqIn;
  for (let tries = 0; tries < 4; tries++) {
    const contents = backupContents();
    const seq = seen + 1;
    try {
      prev = await upload(keys, contents, prev, seq);
    } catch (e) {
      if (!(e instanceof Stale)) throw e;
      const theirs = await fetchCopy(keys);
      if (theirs.seq <= seen) throw new PasskeyProblem(PASSKEY_WORDS.older);
      await restoreAny(new File([theirs.text], 'passkey-copy.json', { type: 'application/json' }), undefined, {
        mark: false,
        skipForgotten: true,
        keepVault: true,
      });
      prev = theirs.fingerprint;
      seen = theirs.seq;
      continue;
    }
    seen = seq;
    const back = await fetchCopy(keys);
    if (back.fingerprint !== prev) continue; // another device saved in between: merge and save again
    const checked = await checkBackup(
      new File([back.text], 'passkey-copy.json', { type: 'application/json' }),
      undefined,
      {
        mark: false,
      },
    );
    if (checked.ok) {
      session = { keys, credentialId };
      remember({ id: keys.id, credentialId, sameAs: sameAsOf(contents), savedAt: contents.savedAt, prev, seq });
    }
    return checked;
  }
  // Re-check, finding C: a registry that never shows back what was saved can't keep this going.
  throw new PasskeyProblem(PASSKEY_WORDS.damaged);
};

/** Make a new passkey and keep a copy of the backup under it. */
export const makePasskeyCopy = async (): Promise<CheckResult> => {
  const { prf, rawId } = await newPasskey();
  return saveAndCheck(passkeyKeys(prf, rawId), base64urlnopad.encode(rawId), 'none', 0);
};

/** Bring the copy up to date (asks for the passkey once per page visit). */
export const updatePasskeyCopy = async (): Promise<CheckResult> => {
  const r = remembered();
  if (!r) return makePasskeyCopy();
  const s = sessionFor(r);
  if (s) return saveAndCheck(s.keys, s.credentialId, r.prev, r.seq);
  const { prf, rawId } = await askPasskey(base64urlnopad.decode(r.credentialId));
  return saveAndCheck(passkeyKeys(prf, rawId), base64urlnopad.encode(rawId), r.prev, r.seq);
};

/**
 * On a new device: ask for any of this site's passkeys and fetch its copy. Returns the backup as
 * a file for restoreAny (which checks it all before changing anything), and when it was made,
 * for the page to show before anything changes.
 */
export const fetchPasskeyCopy = async (): Promise<{ file: File; savedAt: string }> => {
  const { prf, rawId } = await askPasskey();
  const keys = passkeyKeys(prf, rawId);
  const got = await fetchCopy(keys);
  pending = { keys, credentialId: base64urlnopad.encode(rawId), fingerprint: got.fingerprint, seq: got.seq };
  return { file: new File([got.text], 'passkey-copy.json', { type: 'application/json' }), savedAt: got.savedAt };
};

/** After a restore from the copy was accepted: this browser keeps that copy up to date from now on. */
export const adoptRestoredCopy = (savedAt: string): void => {
  if (!pending) return;
  session = { keys: pending.keys, credentialId: pending.credentialId };
  // Not yet "current": what this browser now holds may differ from the copy (it merged).
  remember({
    id: pending.keys.id,
    credentialId: pending.credentialId,
    sameAs: '',
    savedAt,
    prev: pending.fingerprint,
    seq: pending.seq,
  });
  pending = undefined;
};

/** Delete this browser's copy at the registry and forget it here. The passkey itself stays in the phone's settings. */
export const deletePasskeyCopy = async (): Promise<void> => {
  const r = remembered();
  if (!r) return;
  let keys = sessionFor(r)?.keys;
  if (!keys) {
    const { prf, rawId } = await askPasskey(base64urlnopad.decode(r.credentialId));
    keys = passkeyKeys(prf, rawId);
  }
  const out = await call('POST', `/vault/${keys.id}/delete`, { token: keys.token });
  if (out.status !== 200 && out.status !== 404) fail(out);
  session = undefined;
  remember(undefined);
};

/** For tests: forget the page-life session. */
export const _forgetSession = (): void => {
  session = undefined;
  pending = undefined;
};
