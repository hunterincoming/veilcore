// VeilCore fingerprinting core — the real, in-browser cryptography behind the wizard.
//
// Everything is hashed locally: text or a file is SHA-256'd, then run through the
// compiled `commit` circuit (wasm) to produce a fingerprint that is byte-identical to
// what the on-chain contract would record. Raw inputs never leave the device.
// SPDX-License-Identifier: Apache-2.0

import { isHex64, keyBoundFingerprint } from './key-binding';
import { checkedAnimalFields, isAnimal, type AnimalDetails } from './animal-profile';
import { checkedStrainFields, isStrain, type StrainDetails } from './strain-profile';
import { checkedDocumentFields, isDocument, type DocumentDetails } from './document-profile';

// The compiled `commit` circuit runs on Midnight's on-chain runtime, about 1.4 MB of
// WebAssembly. It is loaded the first time it is needed, not with every page that imports
// this file: most of what is here (shortFingerprint, fingerprintRecord, ...) is plain
// SHA-256, and the landing page and a check page that computes no fingerprint should not
// download it (App.tsx). fingerprintText and fingerprintFile load it themselves; the one
// synchronous use, pairingFingerprintOfSha, needs loadFingerprintCircuit() to have finished
// first. The record app's pages that compute one as they draw wait for it (App.tsx
// `circuit: 'wait'`), and the check page waits for it when the record it shows has a saved
// lab report to match (pages/VerifyPage.tsx).
type Circuits = typeof import('../../../contract/src/managed/veilcore/contract/index.js').pureCircuits;
let circuits: Circuits | undefined;
let loading: Promise<void> | undefined;

/** Load the `commit` circuit (once). A failed load is tried again on the next call. */
export const loadFingerprintCircuit = (): Promise<void> => {
  loading ??= import('../../../contract/src/managed/veilcore/contract/index.js').then(
    (m) => {
      circuits = m.pureCircuits;
    },
    (e: unknown) => {
      loading = undefined;
      throw e;
    },
  );
  return loading;
};

// Outside a browser (unit tests, scripts) there is nothing to save by waiting: load it now,
// so the synchronous pairing check works there as it always has.
if (typeof window === 'undefined') await loadFingerprintCircuit();

/** Hex-encode bytes (no 0x prefix). */
export const toHex = (bytes: Uint8Array): string => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const sha256 = async (bytes: Uint8Array): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource));

/** Turn a 32-byte secret into its on-chain fingerprint (runs the `commit` circuit). */
const fingerprintOf = (secret: Uint8Array): string => {
  if (!circuits) throw new Error('The code that makes proof codes has not loaded yet (loadFingerprintCircuit).');
  return toHex(circuits.commit(secret));
};

/** Fingerprint arbitrary text. */
export const fingerprintText = async (text: string): Promise<string> => {
  const digest = await sha256(new TextEncoder().encode(text));
  await loadFingerprintCircuit();
  return fingerprintOf(digest);
};

/**
 * The largest file fingerprinted in the browser. The whole file is read into memory on
 * the page's thread, so a multi-gigabyte drop froze or crashed the tab (attack round D).
 * Lab reports and photos are far smaller than this.
 */
export const MAX_FINGERPRINT_BYTES = 200 * 1024 * 1024;

/**
 * The pairing fingerprint for a file whose plain SHA-256 is known (hex): the same value
 * fingerprintFile gives for the file itself. A lab signs the SHA-256; the plant stores
 * this, so a saved report is matched to a lab's signature through it (round 5).
 */
export const pairingFingerprintOfSha = (sha256Hex: string): string | undefined =>
  isHex64(sha256Hex) ? fingerprintOf(Uint8Array.from(sha256Hex.match(/../g) ?? [], (b) => parseInt(b, 16))) : undefined;

/** Fingerprint a file's bytes locally (used for the DNA lab report). */
export const fingerprintFile = async (file: File): Promise<string> => {
  if (file.size > MAX_FINGERPRINT_BYTES) {
    throw new Error(
      `${file.name || 'That file'} is larger than 200 MB, so it was not read. Nothing was sent or saved.`,
    );
  }
  const digest = await sha256(new Uint8Array(await file.arrayBuffer()));
  await loadFingerprintCircuit();
  return fingerprintOf(digest);
};

/**
 * Canonicalisation and the commitment algorithm come from @veilcore/records.
 *
 * Deliberately not reimplemented here. Two implementations that must agree are two
 * implementations that will eventually disagree — and a commitment computed differently
 * by the app and by an outside verifier is the one failure the format cannot survive.
 */
export { canonicalise, newNonce, COMMITMENT_ALGORITHM } from 'veilcore-records';

/**
 * The record commitment.
 *
 * Plain SHA-256 over the canonical serialisation, no chain dependency: any
 * implementation in any language can reproduce this without the Compact toolchain.
 * Binding it to a chain happens at anchoring time, not here.
 *
 * The nonce matters — cultivar name, breeder and date are guessable, so without one an
 * observer could compute candidate commitments and confirm a guess against the chain.
 */
export type CommittedRecordInput = {
  strainName: string;
  bredBy: string;
  dateCreated: string;
  notes: string;
  loggedAt: number;
  /** An animal record's sire and dam carry a role and an individual ID (animal-profile.ts). */
  parents?: { recordId?: string; name: string; role?: string; individualId?: string }[];
  breedingMethod?: string;
  photoFingerprints?: string[];
  refId?: string;
  profile?: string;
  taxon?: string;
  nonce: string;
  /**
   * H(keybind, the record's key, its salt): the record names its own key (key-binding.ts).
   * Absent on records sealed before 14 October 2026, whose fingerprint is unchanged.
   */
  keyBinding?: string;
  /** An animal record's own details (animal-profile.ts). Never on a plant record. */
  animal?: Partial<AnimalDetails>;
  /** A strain or line record's own details (strain-profile.ts). Never on a plant record. */
  strain?: Partial<StrainDetails>;
  /** A document record's own details (document-profile.ts). Never on a plant record. */
  document?: Partial<DocumentDetails>;
};

const checkedBinding = (v: unknown): string => {
  if (!isHex64(v)) throw new Error('keyBinding must be 64 lowercase hex characters.');
  return v;
};

/**
 * Exactly the fields the record commitment covers, in the form that is hashed. Exported
 * so an export can carry them and anyone can recompute the registered fingerprint.
 *
 * An animal record (profile veilcore/profile/animal-individual/v1) seals the profile's own
 * fields, checked first (animal-profile.ts): a malformed one is refused, never sealed. Every
 * other record, old ones included, seals exactly the fields below, as before.
 */
export const committedRecordFields = (r: CommittedRecordInput): Record<string, unknown> =>
  isAnimal(r)
    ? checkedAnimalFields(r)
    : isStrain(r)
      ? checkedStrainFields(r)
      : isDocument(r)
        ? checkedDocumentFields(r)
        : plantRecordFields(r);

const plantRecordFields = (r: CommittedRecordInput): Record<string, unknown> => ({
  breedingMethod: r.breedingMethod ?? '',
  bredBy: r.bredBy,
  dateCreated: r.dateCreated,
  loggedAt: r.loggedAt,
  nonce: r.nonce,
  notes: r.notes,
  parents: r.parents ?? [],
  photoFingerprints: r.photoFingerprints ?? [],
  refId: r.refId ?? '',
  strainName: r.strainName,
  // Committed only when present, so records sealed before these fields existed
  // recompute to the fingerprint they were sealed with.
  ...(r.profile ? { profile: r.profile } : {}),
  ...(r.taxon ? { taxon: r.taxon } : {}),
  // Sealed when present, and only then: an older record's fields and fingerprint stay
  // exactly as they were. A malformed one is refused rather than sealed.
  ...(r.keyBinding !== undefined ? { keyBinding: checkedBinding(r.keyBinding) } : {}),
});

/** SHA-256 of the canonical sealed fields: the whole fingerprint of an older record. */
export const contentHashOf = async (r: CommittedRecordInput): Promise<string> => {
  const { canonicalise: canon } = await import('veilcore-records');
  return toHex(await sha256(new TextEncoder().encode(canon(committedRecordFields(r)))));
};

/**
 * The record's fingerprint. A record that names its key (keyBinding) folds the key in at
 * the top, H(keyrecord, keyBinding, contentHash), so a checker can match the key to the
 * fingerprint from hashes alone (key-binding.ts). Any other record: the content hash.
 */
export const fingerprintRecord = async (r: CommittedRecordInput): Promise<string> => {
  const content = await contentHashOf(r);
  return r.keyBinding !== undefined ? keyBoundFingerprint(checkedBinding(r.keyBinding), content) : content;
};

/** Short display form of a fingerprint. */
/**
 * A received record has no commitment until its holder seals it — they did not produce
 * the sender's evidence and cannot claim it. So this has to handle an unsealed record
 * rather than assuming every record has been committed.
 */
export const shortFingerprint = (hex?: string): string =>
  !hex ? 'not sealed yet' : hex.length > 24 ? `${hex.slice(0, 14)}…${hex.slice(-8)}` : hex;
