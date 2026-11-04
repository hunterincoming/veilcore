// A laboratory's claims key, and how a checker learns whose it is (docs/lab-signing.md).
//
// The claims contract's proveAttested (frozen, deployed) checks a Schnorr signature over Jubjub.
// A laboratory already has a signing identity on VeilCore: its attester key (Ed25519,
// attester-keys.ts), registered at the registry, with the lab's own accreditation claim and, when
// VeilCore's operator has done one, a dated name check against a public licence or accreditation
// listing (docs/lab-name-checks.md). So the claims key is not a second identity:
//
//   1. It is DERIVED from the attester key's seed: HKDF-SHA256(seed, info
//      "veilcore:claims-key:v1:<n>", 64 bytes) reduced mod the Jubjub order. The lab's existing
//      backup covers it; there is no second key file. <n> lets a lab move to a new claims key
//      without a new attester key (and without losing its name check).
//   2. It is BOUND per record by an ordinary attestation from the attester key (type "other"):
//        subject       = the numbers record's commitment (what proveAttested publishes),
//        documentHash  = SHA-256("veilcore:claims-key:v1\0" || claims key x || y || the proof
//                        code of the record the numbers are about),
//        id            = att_<random>_ck1_<owner proof>, where the owner proof is the claims
//                        key's own Schnorr signature over SHA-256("veilcore:claims-key-owner:v1\0"
//                        || the attester's Ed25519 public key).
//      The attestation shows the attester vouches for this key on this record about that plant;
//      the owner proof shows whoever holds the claims key chose that attester (so no other
//      registered lab can post a binding to a key it doesn't hold and take the name). The
//      attestation is retractable by the lab, like any other.
//
// A checker (chain/claim-check.ts) reads the proveAttested call on chain, then the attestations
// about that record, keeps only bindings whose signature, owner proof and hash all check here,
// and prints the attester with signerLabel(), the wording every page uses. Two different
// attesters bound to one key on one record: no name at all.
// SPDX-License-Identifier: Apache-2.0

import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import {
  JUBJUB_ORDER,
  attesterKeyOf,
  signRecord,
  verifyRecordSignature,
  type AttestationSignature,
  type JubjubPoint,
} from '../../../contract/src/attest';

import { CLAIMS_KEY_SUFFIX, isClaimsKeyBinding } from './lab-key-text';

export { CLAIMS_KEY_SUFFIX, isClaimsKeyBinding };
const enc = new TextEncoder();
const KEY_TAG = enc.encode('veilcore:claims-key:v1\0');
const OWNER_TAG = enc.encode('veilcore:claims-key-owner:v1\0');

const toHex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const fromHex = (h: string): Uint8Array => Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16));
const be32 = (n: bigint): Uint8Array => fromHex(n.toString(16).padStart(64, '0'));
const beNum = (b: Uint8Array): bigint => BigInt('0x' + (toHex(b) || '0'));
const cat = (...parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};
const b64u = (b: Uint8Array): string =>
  btoa(String.fromCharCode(...b))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const unb64u = (s: string): Uint8Array | undefined => {
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return undefined;
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return undefined;
  }
};

/**
 * The 32-byte Ed25519 seed inside a PKCS#8 private key (RFC 8410): the OCTET STRING 04 20
 * wrapped in the OCTET STRING 04 22. Throws when there is none.
 */
export const ed25519SeedOf = (pkcs8Hex: string): Uint8Array => {
  if (!/^([0-9a-f]{2})+$/.test(pkcs8Hex)) throw new Error('not a PKCS#8 key');
  const b = fromHex(pkcs8Hex);
  for (let i = 0; i + 36 <= b.length; i++) {
    if (b[i] === 0x04 && b[i + 1] === 0x22 && b[i + 2] === 0x04 && b[i + 3] === 0x20) return b.slice(i + 4, i + 36);
  }
  throw new Error('not an Ed25519 PKCS#8 key');
};

export type ClaimsKey = { readonly secret: bigint; readonly key: JubjubPoint; readonly keyText: string };

/** A key as text: x then y, 64 hex characters each (lab-attest.ts keyHex). */
export const claimsKeyText = (k: JubjubPoint): string => toHex(be32(k.x)) + toHex(be32(k.y));

/** The claims key that goes with an attester key. `n` is the rotation number, from 0. */
export const claimsKeyFor = (attesterPrivateKeyPkcs8: string, n = 0): ClaimsKey => {
  if (!Number.isInteger(n) || n < 0 || n > 1000) throw new Error('rotation number out of range');
  const okm = hkdf(
    sha256,
    ed25519SeedOf(attesterPrivateKeyPkcs8),
    undefined,
    enc.encode(`veilcore:claims-key:v1:${n}`),
    64,
  );
  const secret = (beNum(okm) % (JUBJUB_ORDER - 1n)) + 1n;
  const key = attesterKeyOf(secret);
  return { secret, key, keyText: claimsKeyText(key) };
};

/** What the binding attestation's documentHash is: this key, about this plant's record. */
export const bindingHash = (keyText: string, aboutProofCode: string): string => {
  if (!/^[0-9a-f]{128}$/.test(keyText) || !/^[0-9a-f]{64}$/.test(aboutProofCode))
    throw new Error('a claims key and a proof code');
  return toHex(sha256(cat(KEY_TAG, fromHex(keyText), fromHex(aboutProofCode))));
};

const ownerMessage = (attesterPublicKeyHex: string): Uint8Array => {
  if (!/^[0-9a-f]{64}$/.test(attesterPublicKeyHex)) throw new Error('an Ed25519 public key');
  return sha256(cat(OWNER_TAG, fromHex(attesterPublicKeyHex)));
};

/** The claims key's signature naming its attester, as the id suffix carries it (128 characters). */
export const ownerProof = (k: ClaimsKey, attesterPublicKeyHex: string): string => {
  const s = signRecord(k.secret, ownerMessage(attesterPublicKeyHex));
  return b64u(cat(be32(s.announcement.x), be32(s.announcement.y), be32(s.response)));
};

/** The id suffix of a binding attestation. */
export const bindingIdSuffix = (k: ClaimsKey, attesterPublicKeyHex: string): string =>
  CLAIMS_KEY_SUFFIX + ownerProof(k, attesterPublicKeyHex);

/** Whether an attestation id carries an owner proof by `key` naming `attesterPublicKeyHex`. */
export const ownerProofChecks = (attestationId: string, key: JubjubPoint, attesterPublicKeyHex: string): boolean => {
  const at = attestationId.indexOf(CLAIMS_KEY_SUFFIX);
  if (at < 0) return false;
  const raw = unb64u(attestationId.slice(at + CLAIMS_KEY_SUFFIX.length));
  if (!raw || raw.length !== 96) return false;
  const signature: AttestationSignature = {
    announcement: { x: beNum(raw.slice(0, 32)), y: beNum(raw.slice(32, 64)) },
    response: beNum(raw.slice(64)),
  };
  try {
    return verifyRecordSignature(key, ownerMessage(attesterPublicKeyHex), signature);
  } catch {
    return false;
  }
};

/** The attestation fields a binding check needs (attesters.ts ResolvedAttestation has them). */
export type BindingCandidate = {
  readonly attestationId: string;
  readonly type: string;
  readonly subjectCommitment: string;
  readonly documentHash: string;
  readonly attester: { readonly publicKey: string };
  readonly signatureValid: boolean;
  readonly retraction: unknown;
};

/**
 * The binding that says whose this key is on this record, about that plant, or why there is none.
 * Every check is made here: the attestation's own signature (attesters.ts verified it), the owner
 * proof, the hash, the subject, not retracted. Two different attesters: none (a conflict is not
 * a name).
 */
export const findBinding = <A extends BindingCandidate>(
  attestations: readonly A[],
  record: string,
  key: JubjubPoint,
  aboutProofCode: string,
):
  | { readonly kind: 'bound'; readonly attestation: A }
  | { readonly kind: 'retracted'; readonly attestation: A }
  | { readonly kind: 'conflict' }
  | { readonly kind: 'none' } => {
  const keyText = claimsKeyText(key);
  let want: string;
  try {
    want = bindingHash(keyText, aboutProofCode);
  } catch {
    return { kind: 'none' };
  }
  const good = attestations.filter(
    (a) =>
      a.type === 'other' &&
      isClaimsKeyBinding(a.attestationId) &&
      a.subjectCommitment === record &&
      a.documentHash === want &&
      a.signatureValid &&
      ownerProofChecks(a.attestationId, key, a.attester.publicKey),
  );
  const attesters = new Set(good.map((a) => a.attester.publicKey));
  if (attesters.size > 1) return { kind: 'conflict' };
  if (good.length === 0) return { kind: 'none' };
  const live = good.find((a) => a.retraction === null || a.retraction === undefined);
  return live ? { kind: 'bound', attestation: live } : { kind: 'retracted', attestation: good[0] };
};
