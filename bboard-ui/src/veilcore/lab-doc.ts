// What a lab signs about a report it sends back (round 6, CONTRACT.md #34; the fifth review's
// finding 3).
//
// A lab report signature used to sign the report file's plain SHA-256, and the registry served
// it to anyone with the record's proof code: whoever held a copy of the report (lab staff,
// anyone it was forwarded to, a leak) could tell which record it was saved to, and the
// breeder's salted DNA code (dna-link.ts, #29) added nothing for a report that came back from
// a lab. Now the lab signs
//
//   document = SHA-256("veilcore:labdoc:v1" 0x00 || the report's SHA-256 (32 bytes)
//                      || the record's proof code (32 bytes) || s (32 bytes))
//   s        = HKDF-SHA256(the delivery's offer key, no salt, info "veilcore:labdoc-salt:v1", 32 bytes)
//
// The offer key is in the delivery code: only the sender and the lab hold it, so only they can
// make s. The signature's id ends in LAB_DOC_ID_SUFFIX, inside what is signed, so the registry
// (and anyone) can tell it is bound. The breeder's check link carries s after the # (`ls`) only
// when the holder chooses to share the lab report ("Whether a DNA report is saved"); with the
// file and the link, the check page recomputes `document` and compares.
//
// Signatures made before this sign the plain SHA-256 and can't be changed. The registry serves
// them whole only to the delivery's sender and lab, by holder key (attesters.ts
// attestationsFor asHolder), and to anyone else withheld: "a lab signed a report for this
// record", with its date. A lab whose delivery has no offer key (a code made before offer keys)
// still signs the plain SHA-256: the registry withholds that from the public too.
// SPDX-License-Identifier: Apache-2.0

import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';

/** The end of a bound lab report signature's id (the registry's lineage/attesters.mjs LAB_DOC_ID_SUFFIX). */
export const LAB_DOC_ID_SUFFIX = '_ld1';
/** The check link's fragment value for the lab report salt. */
export const LAB_SALT_PARAM = 'ls';

const HEX64 = /^[0-9a-f]{64}$/;
const SALT_INFO = new TextEncoder().encode('veilcore:labdoc-salt:v1');
const TAG = new TextEncoder().encode('veilcore:labdoc:v1\0');

const toHex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const fromHex = (h: string): Uint8Array => Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16));
const fromB64u = (s: string): Uint8Array | undefined => {
  if (!/^[A-Za-z0-9_-]{43}$/.test(s)) return undefined;
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '=');
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

/** s for a delivery, from its offer key (43 base64url characters): 64 hex, or undefined. */
export const labDocSaltOf = (offerKey: string | undefined): string | undefined => {
  const key = offerKey ? fromB64u(offerKey) : undefined;
  return key && key.length === 32 ? toHex(hkdf(sha256, key, undefined, SALT_INFO, 32)) : undefined;
};

/** The bound `document` a lab signs: hex. Each input is 64 lowercase hex characters. */
export const labDocument = (reportSha: string, proofCode: string, salt: string): string => {
  const [a, b, c] = [reportSha, proofCode, salt].map((h) => h.toLowerCase());
  if (![a, b, c].every((h) => HEX64.test(h))) throw new Error('a lab document is made from three 64-hex values');
  return toHex(sha256(new Uint8Array([...TAG, ...fromHex(a), ...fromHex(b), ...fromHex(c)])));
};

/** Whether an attestation is a bound lab report signature (its id ends in _ld1). */
export const isBoundLabDocument = (a: { readonly attestationId: string }): boolean =>
  a.attestationId.endsWith(LAB_DOC_ID_SUFFIX);

type Signed = {
  readonly attestationId: string;
  readonly subjectCommitment: string;
  readonly documentHash?: string;
};

/**
 * Whether a lab report signature names this file (its SHA-256): a bound one, with one of the
 * `salts` (the deliveries' s values the caller holds); one made before round 6, by its plain
 * SHA-256 (only the delivery's sender and lab are sent that). False for a withheld one.
 */
export const signsReport = (a: Signed, fileSha: string, salts: readonly string[]): boolean => {
  const doc = a.documentHash?.toLowerCase();
  const sha = fileSha.toLowerCase();
  if (!doc || !HEX64.test(sha)) return false;
  if (!isBoundLabDocument(a)) return doc === sha;
  if (!HEX64.test(a.subjectCommitment)) return false;
  return salts.some((s) => HEX64.test(s) && labDocument(sha, a.subjectCommitment, s) === doc);
};

/** The s values a record's own deliveries give (records.ts offerKeys): the sender's and the lab's. */
export const labSaltsOf = (r: { readonly offerKeys?: Readonly<Record<string, string>> }): string[] =>
  Object.values(r.offerKeys ?? {})
    .map(labDocSaltOf)
    .filter((s): s is string => !!s);

/**
 * The check link's fragment value for the lab report (`ls`): the s under which a lab signed the
 * report saved to the record, when the holder shares the lab report; {} when there is none.
 */
export const labLinkParams = (
  r: { readonly dnaFileSha256?: string; readonly offerKeys?: Readonly<Record<string, string>> },
  atts: readonly Signed[],
): Record<string, string> => {
  const sha = r.dnaFileSha256?.toLowerCase();
  if (!sha) return {};
  for (const s of labSaltsOf(r))
    if (atts.some((a) => isBoundLabDocument(a) && signsReport(a, sha, [s]))) return { [LAB_SALT_PARAM]: s };
  return {};
};

/** The link's lab report salt, when it is 64 hex. */
export const labSaltFromLink = (hash: string): string | null => {
  const v = new URLSearchParams(hash.replace(/^#/, '')).get(LAB_SALT_PARAM)?.trim().toLowerCase();
  return v && HEX64.test(v) ? v : null;
};
