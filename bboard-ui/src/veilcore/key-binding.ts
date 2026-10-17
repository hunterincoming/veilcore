// A record that names its own key (docs/identity-in-record.md, SPEC 3.6.1).
//
// The record's key (its on-chain identity, commit(record secret)) is made before the record
// is sealed. The record carries keyBinding = H(keybind, identity, keySalt), and its
// fingerprint is H(keyrecord, keyBinding, contentHash), where contentHash is the SHA-256 of
// the sealed fields (keyBinding included). A checker given the fingerprint, the key, the
// key's salt and the content hash recomputes the fingerprint; if it matches, the key is the
// one the record named when it was sealed, and can't have been swapped since.
//
// The salt keeps the key off the record: the registry stores every record, and with the
// key on it could match a holder's account to their on-chain activity. The salt comes from
// the record secret, so the backup file already brings it back. It is never on the record.
//
// H is SHA-256 over 32-byte pieces, the first the tag in UTF-8 padded with zeros to 32 (the
// contract's own commit(), SPEC 3.7 and 4.5). Plain SHA-256: any language can check it.
// SPDX-License-Identifier: Apache-2.0

import { sha256 } from '@noble/hashes/sha2.js';

export const KEY_BOUND_ALGORITHM = 'sha256/key-bound/v1';

const HEX64 = /^[0-9a-f]{64}$/;
export const isHex64 = (v: unknown): v is string => typeof v === 'string' && HEX64.test(v);

const toHex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

const bytes = (hex: string, what: string): Uint8Array => {
  if (!HEX64.test(hex)) throw new Error(`${what} must be 64 lowercase hex characters.`);
  return Uint8Array.from(hex.match(/../g) ?? [], (b) => parseInt(b, 16));
};

/** H(tag, a, b, ...): SHA-256 over the zero-padded tag and each 32-byte piece. */
const tagged = (tag: string, ...parts: Uint8Array[]): string => {
  const t = new TextEncoder().encode(tag);
  if (t.length > 32) throw new Error('tag too long');
  const all = new Uint8Array(32 * (parts.length + 1));
  all.set(t);
  parts.forEach((p, i) => all.set(p, 32 * (i + 1)));
  return toHex(sha256(all));
};

/** The record's on-chain identity, commit(recordSecret), as plain SHA-256 (the contract's own). */
export const identityFromSecret = (recordSecret: string): string =>
  tagged('veilcore:v1:commit', bytes(recordSecret, 'The record secret'));

/** The key's salt: from the record secret, so the backup brings it back. Never on the record. */
export const keySaltOf = (recordSecret: string): string =>
  tagged('veilcore:v1:keysalt', bytes(recordSecret, 'The record secret'));

/** The sealed field: says nothing about the key without its salt. */
export const keyBindingOf = (identity: string, keySalt: string): string =>
  tagged('veilcore:v1:keybind', bytes(identity, 'The key'), bytes(keySalt, "The key's salt"));

/** A bound record's fingerprint, from its keyBinding and the hash of its sealed fields. */
export const keyBoundFingerprint = (keyBinding: string, contentHash: string): string =>
  tagged('veilcore:v1:keyrecord', bytes(keyBinding, 'The key binding'), bytes(contentHash, 'The content hash'));

/** Everything a record needs to name its key, from its secret. */
export const bindingForSecret = (recordSecret: string) => {
  const identity = identityFromSecret(recordSecret);
  const keySalt = keySaltOf(recordSecret);
  return { identity, keySalt, keyBinding: keyBindingOf(identity, keySalt) };
};

/** What a link carries so a checker can match its key to the record: fp, ks, cd. */
export type KeyedRecord = {
  /** The record's fingerprint (the link's fp). */
  readonly fingerprint: string;
  /** The key's salt (ks). */
  readonly keySalt: string;
  /** The SHA-256 of the record's sealed fields (cd). */
  readonly contentHash: string;
};

/**
 * Does this key belong to this record? Recomputed, never read from anyone. Exact: every
 * input is 64 lowercase hex characters (callers lower-case what a person pasted first).
 */
export const keyMatchesRecord = (identity: string, rec: KeyedRecord): boolean => {
  if (![identity, rec.fingerprint, rec.keySalt, rec.contentHash].every(isHex64)) return false;
  return keyBoundFingerprint(keyBindingOf(identity, rec.keySalt), rec.contentHash) === rec.fingerprint;
};

export const KEY_NOT_THIS_RECORDS = 'The key in this link isn’t the one this record names';

/**
 * What a check page can say about the key a link names, before asking anyone anything.
 *   bound      the record named this key when it was sealed: check control of it;
 *   older      the record predates keys in records: today's weaker wording;
 *   refused    the link's key can't be matched to this record: no request is made.
 */
export type KeyCheck =
  | { readonly kind: 'bound'; readonly record: KeyedRecord }
  | { readonly kind: 'older' }
  | { readonly kind: 'refused'; readonly reason: string };

export const checkLinkKey = (input: {
  /** The link's chain= (the key). */
  identity: string;
  /** The link's fingerprint, only when it matches what the registry reports (verify-link.ts bound). */
  fingerprint?: string;
  /** The link's ks and cd. */
  keySalt?: string | null;
  contentHash?: string | null;
  /** The registry's report that the record carries a keyBinding. */
  keyBound?: boolean;
}): KeyCheck => {
  const ks = input.keySalt?.trim().toLowerCase() ?? '';
  const cd = input.contentHash?.trim().toLowerCase() ?? '';
  if (!ks && !cd) {
    return input.keyBound
      ? {
          kind: 'refused',
          reason:
            'This record names its own key, but this link leaves out what’s needed to check it. Ask the holder for a new link',
        }
      : { kind: 'older' };
  }
  if (!input.fingerprint)
    return {
      kind: 'refused',
      reason: 'This link’s proof code doesn’t match the record, so its key can’t be checked against it',
    };
  const record = { fingerprint: input.fingerprint, keySalt: ks, contentHash: cd };
  return keyMatchesRecord(input.identity.trim().toLowerCase(), record)
    ? { kind: 'bound', record }
    : { kind: 'refused', reason: KEY_NOT_THIS_RECORDS };
};
