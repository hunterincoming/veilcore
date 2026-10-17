// A record's DNA report, as a check link shows it (round 5, CONTRACT.md #29).
//
// What the registry publishes about the saved report, when the holder shares "whether a DNA
// report is saved", is never the file's SHA-256 (nor its pairing fingerprint, the contract's
// commit over it): anyone holding the same file could compute those and learn that the
// holder has it. It is the bound form the chain uses (chain/pairing.ts dnaPairBinding):
//
//   H("veilcore:v1:dnapair", the report's SHA-256, the record's identity, the record's pairing salt)
//
// The salt is the record's own, made once and kept inside its sealed copy, and travels only
// in the holder's check link, after the # (`ds`), which no server ever receives. So someone
// the holder sends the link AND the file to can check that the file is the one saved with the
// record; anyone else learns nothing, not even whether they hold the same file.
//
// The identity the binding names is the record's proof code (its fingerprint), which the link
// already carries (`fp`): the record's on-chain identity is kept off the record and its link
// unless the holder adds it (record-keys.ts), and a proof code ties the binding to this exact
// record. A record changed since a link was made has a new proof code; the old link then
// doesn't match the record anyway, and says so.
//
// A pairing saved before the file's SHA-256 was kept (15 Oct 2026) has only the pairing
// fingerprint: the binding is then made over that value in place of the SHA-256, and a
// checker's file is tried both ways (matchesBinding).
// SPDX-License-Identifier: Apache-2.0

import { dnaPairBinding, newPairingSalt } from './chain/pairing';

const HEX64 = /^[0-9a-f]{64}$/;
const hex = (v: unknown): string | undefined =>
  typeof v === 'string' && HEX64.test(v.toLowerCase()) ? v.toLowerCase() : undefined;

/** The link's fragment value for the DNA check: the record's pairing salt. */
export const DNA_SALT_PARAM = 'ds';

type DnaFields = {
  readonly id: string;
  readonly recordFingerprint?: string;
  readonly keyBinding?: string;
  readonly dnaFingerprint?: string;
  readonly dnaFileSha256?: string;
  readonly dnaPairSalt?: string;
};

/** The value the binding is made over: the file's SHA-256, or for an older pairing its pairing fingerprint. */
const reportValueOf = (r: DnaFields): string | undefined =>
  r.dnaFingerprint ? (hex(r.dnaFileSha256) ?? hex(r.dnaFingerprint)) : undefined;

/** Whether the record carries its own pairing salt. */
export const hasPairSalt = (r: DnaFields): boolean => !!hex(r.dnaPairSalt);

/** The binding the record publishes for its saved report, or undefined (no report, no proof code, or no salt yet). */
export const dnaBindingOf = (r: DnaFields): string | undefined => {
  const value = reportValueOf(r);
  const salt = hex(r.dnaPairSalt);
  const identity = hex(r.recordFingerprint);
  return value && salt && identity ? dnaPairBinding(value, identity, salt) : undefined;
};

/** The check link's fragment value for the record's DNA check ({} when it has none to give). */
export const dnaLinkParams = (r: DnaFields): Record<string, string> =>
  dnaBindingOf(r) ? { [DNA_SALT_PARAM]: hex(r.dnaPairSalt) ?? '' } : {};

/**
 * The record with its own pairing salt, made now if it has a saved report and none yet; the
 * same record otherwise. The salt is kept for good: a new report is bound with the same one,
 * so a link the holder sent earlier checks the report saved now.
 */
export const withPairSalt = <T extends DnaFields>(r: T): T => {
  if (!r.dnaFingerprint || hasPairSalt(r)) return r;
  return { ...r, dnaPairSalt: newPairingSalt() };
};

/**
 * Whether a file's SHA-256 is the report bound in `binding`, with the salt and identity from
 * the holder's link: 'file' when bound by its SHA-256, 'pairing' when bound by its pairing
 * fingerprint (an older pairing; `pairingOf` computes it), false when it isn't.
 */
export const matchesBinding = (
  binding: string,
  fileSha: string,
  identity: string,
  salt: string,
  pairingOf?: (sha: string) => string | undefined,
): 'file' | 'pairing' | false => {
  const b = hex(binding);
  const sha = hex(fileSha);
  const id = hex(identity);
  const s = hex(salt);
  if (!b || !sha || !id || !s) return false;
  if (dnaPairBinding(sha, id, s) === b) return 'file';
  const pfp = hex(pairingOf?.(sha));
  return pfp && dnaPairBinding(pfp, id, s) === b ? 'pairing' : false;
};

/**
 * A link's DNA check values, when both are well formed: the salt after the #, and the proof
 * code the link names (only when it is the one the registry reports for the record).
 */
export const dnaLinkValues = (
  salt: string | null,
  identity: string | null | undefined,
): { salt: string; identity: string } | null => {
  const s = hex(salt);
  const id = hex(identity);
  return s && id ? { salt: s, identity: id } : null;
};
