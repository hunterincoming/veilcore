// The hashes a partner's check recomputes itself: SHA-256 only, through WebCrypto, so the
// same code runs in Node and in a visitor's browser.
//
//   H(tag, a, b, ...)   SHA-256 over the tag in UTF-8 padded with zeros to 32 bytes, then
//                       each 32-byte piece (SPEC 3.6.1, 3.7). The contract's commit().
//   pairing fingerprint H("veilcore:v1:commit", SHA-256 of a lab report file): what a
//                       record stores for a saved lab report.
//   record fingerprint  SHA-256 of the canonical sealed fields (SPEC 4.4), or, when the
//                       fields carry keyBinding, H("veilcore:v1:keyrecord", keyBinding, that).
//   key match           H(keyrecord, H(keybind, key, keySalt), contentHash) == fingerprint.
//
// The published SDK (veilcore-records 0.15.0) has canonicalise and sha256Hex but not the
// key-binding helpers yet (SPEC 3.6.1 is newer than that release), so H is written here,
// in the same few lines the site and the SDK's next release use.
// SPDX-License-Identifier: Apache-2.0

import { canonicalise, sha256Hex } from 'veilcore-records';

const HEX64 = /^[0-9a-f]{64}$/;
export const isHex64 = (v: unknown): v is string => typeof v === 'string' && HEX64.test(v);

const toHex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const fromHex = (h: string): Uint8Array => Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));

/** H(tag, ...pieces): every piece 64 lowercase hex characters (32 bytes). */
export const tagged = async (tag: string, ...pieces: string[]): Promise<string> => {
  const t = new TextEncoder().encode(tag);
  if (t.length > 32) throw new Error('tag too long');
  if (!pieces.every(isHex64)) throw new Error('every piece must be 64 lowercase hex characters');
  const all = new Uint8Array(32 * (pieces.length + 1));
  all.set(t);
  pieces.forEach((p, i) => all.set(fromHex(p), 32 * (i + 1)));
  return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', all)));
};

/** What a record stores for a saved lab report, from the report file's SHA-256. */
export const pairingFingerprintOfSha = (fileSha256: string): Promise<string> =>
  tagged('veilcore:v1:commit', fileSha256);

/**
 * The fingerprint of sealed fields as the depositor disclosed them (the evidence bundle's
 * record/sealed-fields.json, or the `fields` of an export's registered-fingerprint
 * extension). Hashed exactly as given: a field added, dropped or changed gives another
 * fingerprint. Throws on something that is not a JSON object.
 */
export const fingerprintOfFields = async (
  fields: unknown,
): Promise<{ fingerprint: string; contentHash: string; keyBinding?: string }> => {
  if (typeof fields !== 'object' || fields === null || Array.isArray(fields))
    throw new Error('the sealed fields are a JSON object');
  const kb = (fields as Record<string, unknown>).keyBinding;
  if (kb !== undefined && !isHex64(kb)) throw new Error('keyBinding must be 64 lowercase hex characters');
  const contentHash = await sha256Hex(canonicalise(fields));
  if (kb === undefined) return { fingerprint: contentHash, contentHash };
  return { fingerprint: await tagged('veilcore:v1:keyrecord', kb, contentHash), contentHash, keyBinding: kb };
};

/**
 * Is `key` (a record's on-chain identity) the key the record named when it was sealed?
 * Exact and never throws: anything malformed does not match. An older record, sealed
 * without keyBinding, matches no key.
 */
export const keyMatchesFingerprint = async (
  key: string,
  keySalt: string,
  contentHash: string,
  fingerprint: string,
): Promise<boolean> => {
  if (![key, keySalt, contentHash, fingerprint].every(isHex64)) return false;
  const binding = await tagged('veilcore:v1:keybind', key, keySalt);
  return (await tagged('veilcore:v1:keyrecord', binding, contentHash)) === fingerprint;
};
