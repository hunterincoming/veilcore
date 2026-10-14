// What a plant's page may say about a lab, worked out only from signatures checked here.
//
// Real lab work is three events: the sample leaves, the lab confirms receipt, and days
// later a lab report comes back. Each line below rests on one thing.
//
// Round 2: "Confirmed by a lab: yes" used to come from record.attestation, which the
// registry writes whenever anyone uses the delivery code — the breeder themself, or a lab
// that pressed "Don't sign". Using a code is not a lab saying anything. Now:
//   - "Confirmed by a lab" needs a chain-of-custody signature about this plant that
//     verified in this browser and was not withdrawn by its signer;
//   - a used code with no signature says just that: someone took delivery, unsigned;
//   - a lab's own "You confirmed receipt" needs ITS key's signature, for THIS sample;
//   - "Signed by <lab>" on a lab report needs the report's key to be the key that signed
//     receipt of this delivery, so a key that never had the sample can't borrow a name.
//
// SPDX-License-Identifier: Apache-2.0

import type { StrainRecord } from './records';
import { countsAsSigned, strengthLabel, type ResolvedAttestation } from './attesters';

const custodyOn = (atts: readonly ResolvedAttestation[]) =>
  atts.filter((a) => a.type === 'chain-of-custody' && countsAsSigned(a));

/** A signer's name as the page should say it: checked names plainly, others as self-named. */
export const signerName = (a: ResolvedAttestation): { name: string; checked: boolean } => {
  const name = a.registeredAs?.displayName ?? a.attester.displayName;
  const checked = a.vettedAttester === true && strengthLabel(a).ok;
  if (checked) return { name: name ?? 'a lab', checked };
  return { name: name ? `a lab key self-named “${name}”` : 'a lab key nobody has named', checked };
};

export type BreederReceipt =
  | { readonly kind: 'signed'; readonly by: ResolvedAttestation }
  | { readonly kind: 'code-used' }
  | { readonly kind: 'none' };

/**
 * The breeder's own plant: did a lab sign that it received it? Only a verified,
 * unwithdrawn chain-of-custody signature about this record counts. A used code without
 * one is reported as exactly that.
 */
export const breederReceipt = (record: StrainRecord, atts: readonly ResolvedAttestation[]): BreederReceipt => {
  const signed = custodyOn(atts).filter((a) => a.subjectCommitment === record.recordFingerprint);
  // A key VeilCore has checked comes first; then the earliest.
  const by =
    signed.find((a) => a.vettedAttester === true) ??
    [...signed].sort((a, b) => a.issuedAt.localeCompare(b.issuedAt))[0];
  if (by) return { kind: 'signed', by };
  if (record.attestation) return { kind: 'code-used' };
  return { kind: 'none' };
};

export type LabReceipt =
  | { readonly kind: 'signed'; readonly at: string }
  | { readonly kind: 'rejected'; readonly reason: 'damaged' | 'wrong-sample'; readonly at: number }
  | { readonly kind: 'not-signed' };

/**
 * The lab's received record: did THIS lab's key sign receipt of THIS sample? Read from
 * the signatures about the breeder's record (`atts`), matched on the lab's key and on the
 * received record's fingerprint, which is what the lab's receipt points at.
 */
export const labReceipt = (
  record: StrainRecord,
  atts: readonly ResolvedAttestation[],
  myPublicKey: string | undefined,
): LabReceipt => {
  const mine = myPublicKey
    ? custodyOn(atts).find(
        (a) =>
          a.attester.publicKey === myPublicKey &&
          a.subjectCommitment === record.receivedFromCommitment &&
          !!record.recordFingerprint &&
          a.documentHash === record.recordFingerprint,
      )
    : undefined;
  if (mine) return { kind: 'signed', at: mine.issuedAt };
  if (record.receiptRejected) return { kind: 'rejected', ...record.receiptRejected };
  return { kind: 'not-signed' };
};

export type ReportSigner =
  /** The lab report's key also signed receipt of this delivery's sample. */
  | { readonly kind: 'this-delivery'; readonly report: ResolvedAttestation }
  /**
   * The key signed receipt of this plant, but which delivery could not be told (the
   * registry didn't say which record the lab's claim made).
   */
  | { readonly kind: 'this-plant'; readonly report: ResolvedAttestation }
  /** Signed, but by a key that didn't confirm receiving this sample. */
  | { readonly kind: 'other-key'; readonly report: ResolvedAttestation }
  | { readonly kind: 'unsigned' };

/**
 * Who signed an opened lab report, and whether that key is the one that received the
 * sample. `receivedFingerprint` is the public fingerprint of the record the lab's claim
 * made for this delivery, when known; the lab's receipt signature points at it.
 */
export const reportSigner = (
  atts: readonly ResolvedAttestation[],
  input: { sha: string; attestationId?: string; subject: string; receivedFingerprint?: string | null },
): ReportSigner => {
  const report = atts.find(
    (a) =>
      countsAsSigned(a) &&
      a.type === 'laboratory-report' &&
      a.subjectCommitment === input.subject &&
      a.documentHash === input.sha &&
      (!input.attestationId || a.attestationId === input.attestationId),
  );
  if (!report) return { kind: 'unsigned' };
  const receipts = custodyOn(atts).filter(
    (a) => a.subjectCommitment === input.subject && a.attester.publicKey === report.attester.publicKey,
  );
  if (input.receivedFingerprint) {
    return receipts.some((a) => a.documentHash === input.receivedFingerprint)
      ? { kind: 'this-delivery', report }
      : { kind: 'other-key', report };
  }
  return receipts.length > 0 ? { kind: 'this-plant', report } : { kind: 'other-key', report };
};
