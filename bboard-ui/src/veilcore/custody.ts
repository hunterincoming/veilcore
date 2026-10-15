// What a plant's page may say about a lab, worked out only from signatures checked here.
//
// Real lab work is three events: the sample leaves, the lab confirms receipt, and days
// later a lab report comes back. Each line below rests on one thing.
//
// Round 2: "Confirmed by a lab: yes" used to come from record.attestation, which the
// registry writes whenever anyone uses the lab code — the breeder themself, or a lab
// that pressed "Don't sign". Using a code is not a lab saying anything.
//
// Round 3: any signed chain-of-custody statement over the plant's public fingerprint used
// to count. The fingerprint is public, so anyone could register a key as "Acme Labs",
// sign one, and the breeder's own page said "Confirmed by a lab — signed by Acme". Now:
//   - a receipt is only a signature the lab tied to one of the breeder's own deliveries
//     of this plant (POST /transfers/:id/receipt, which only whoever used that delivery's
//     lab code can do; GET /transfers/sent lists it as receipt_attestation_id), that
//     verified here and was not withdrawn by its signer;
//   - it reads "Receipt signed by <name>" only for a key whose name VeilCore's operator
//     matched to a public listing, with what was matched, where and when (round 4,
//     attesters.ts signerLabel); any other key reads "a key named <name> (name not checked)";
//   - other signatures over the fingerprint are only counted, never called a receipt;
//   - a used code with no receipt says just that: someone took delivery, unsigned;
//   - a lab's own "You confirmed receipt" needs ITS key's signature, for THIS sample;
//   - "Signed by <lab>" on a lab report needs the report's key to be the key of the
//     receipt tied to that delivery.
//
// SPDX-License-Identifier: Apache-2.0

import type { StrainRecord } from './records';
import type { SentTransfer } from './transfers';
import { countsAsSigned, nameChecked, signerLabel, type ResolvedAttestation } from './attesters';
import { utcDate } from './time';

const custodyOn = (atts: readonly ResolvedAttestation[]) =>
  atts.filter((a) => a.type === 'chain-of-custody' && countsAsSigned(a));

/** A signer's name as the page should say it: a checked name plainly, any other as "not checked". */
export const signerName = (a: ResolvedAttestation): { name: string; checked: boolean } => {
  const s = signerLabel(a);
  return { name: s.who, checked: s.checked };
};

/**
 * Who signed, in the words that follow "signed by": the name alone only for a key whose
 * name check is current (attesters.ts signerLabel); otherwise "a key named X (name not
 * checked)". Where the name is printed plainly, the page also prints signerLabel's `rest`.
 */
export const signedByWords = (a: ResolvedAttestation): string => signerLabel(a).who;

/** The whole receipt label (attesters.ts signerLabel): "Receipt signed by …". */
export const receiptSignedLine = (a: ResolvedAttestation): string => signerLabel(a).text;

export type BreederReceipt =
  | {
      readonly kind: 'signed';
      readonly by: ResolvedAttestation;
      /** The delivery it is tied to. */
      readonly transferId: string;
      /** Other signatures over the fingerprint, not tied to any of the breeder's deliveries. */
      readonly others: number;
    }
  | { readonly kind: 'code-used'; readonly others: number }
  | { readonly kind: 'none'; readonly others: number };

/** The receipt attestation ids tied to the breeder's deliveries of this record, by delivery. */
const receiptIdsFor = (record: StrainRecord, sent: readonly SentTransfer[]): Map<string, string> =>
  new Map(
    sent
      .filter((t) => t.source_record === record.id && typeof t.receipt_attestation_id === 'string')
      .map((t) => [t.receipt_attestation_id as string, t.id]),
  );

/**
 * The breeder's own plant: did a lab sign a receipt for one of its deliveries? Only a
 * verified, unwithdrawn chain-of-custody signature about this record whose id the
 * registry lists on one of the breeder's own sent deliveries of it counts. A used code
 * without one is reported as exactly that; anything else is only counted.
 */
export const breederReceipt = (
  record: StrainRecord,
  atts: readonly ResolvedAttestation[],
  sent: readonly SentTransfer[],
): BreederReceipt => {
  const tied = receiptIdsFor(record, sent);
  const about = custodyOn(atts).filter((a) => a.subjectCommitment === record.recordFingerprint);
  const signed = about.filter((a) => tied.has(a.attestationId));
  const others = about.length - signed.length;
  // A key with a current name check comes first; then the earliest.
  const by = signed.find((a) => nameChecked(a)) ?? [...signed].sort((a, b) => a.issuedAt.localeCompare(b.issuedAt))[0];
  if (by) return { kind: 'signed', by, transferId: tied.get(by.attestationId) ?? '', others };
  const used = sent.some((t) => t.source_record === record.id && t.claimed_at);
  if (record.attestation || used) return { kind: 'code-used', others };
  return { kind: 'none', others };
};

/**
 * The certificate's receipt line (round 3): a lab's receipt only when the lab linked it to
 * one of the breeder's deliveries and its signature checked here (custody.ts), named only
 * for a key with a current name check, and then saying what was checked (round 4). A used
 * lab code without one says just that.
 */
export const receiptLineFor = (record: StrainRecord, receipt: BreederReceipt | null | undefined): string => {
  if (record.receivedFrom) {
    return record.attestation
      ? `You received this under a lab code on ${utcDate(record.attestation.attestedAt)}`
      : 'none recorded';
  }
  if (!receipt) return 'checking…';
  if (receipt.kind === 'signed') {
    const s = signerLabel(receipt.by);
    return `${s.lead}, ${utcDate(receipt.by.issuedAt)} (signature checked in this browser)${s.checked ? `.${s.rest}` : ''}`;
  }
  if (receipt.kind === 'code-used')
    return record.attestation
      ? `Lab code used on ${utcDate(record.attestation.attestedAt)}; no receipt signed, so it doesn’t show who`
      : 'Lab code used; no receipt signed, so it doesn’t show who';
  return 'none yet';
};

export type LabReceipt =
  | {
      readonly kind: 'signed';
      readonly at: string;
      readonly attestationId: string;
      /** This browser tied it to the delivery (attachReceipt); until then the breeder doesn't see it. */
      readonly linked: boolean;
    }
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
  /** The receipt this browser tied to the delivery, if it did. */
  linkedId?: string,
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
  if (mine)
    return {
      kind: 'signed',
      at: mine.issuedAt,
      attestationId: mine.attestationId,
      linked: linkedId === mine.attestationId,
    };
  if (record.receiptRejected) return { kind: 'rejected', ...record.receiptRejected };
  return { kind: 'not-signed' };
};

export type ReportSigner =
  /** The lab report's key is the key of the receipt tied to this delivery. */
  | { readonly kind: 'this-delivery'; readonly report: ResolvedAttestation; readonly receipt: ResolvedAttestation }
  /** Signed, but no receipt is tied to this delivery, so nothing shows the key had the sample. */
  | { readonly kind: 'no-receipt'; readonly report: ResolvedAttestation }
  /** Signed, by a key other than the one whose receipt is tied to this delivery. */
  | { readonly kind: 'other-key'; readonly report: ResolvedAttestation }
  | { readonly kind: 'unsigned' };

/**
 * Who signed an opened lab report, and whether that key is the one whose receipt is tied
 * to this delivery. `receiptAttestationId` is the registry's receipt_attestation_id for
 * the delivery the report came on (round 3): a key that signed some other statement about
 * the plant doesn't count.
 */
export const reportSigner = (
  atts: readonly ResolvedAttestation[],
  input: { sha: string; attestationId?: string; subject: string; receiptAttestationId?: string },
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
  const receipt = input.receiptAttestationId
    ? custodyOn(atts).find(
        (a) => a.attestationId === input.receiptAttestationId && a.subjectCommitment === input.subject,
      )
    : undefined;
  if (!receipt) return { kind: 'no-receipt', report };
  return receipt.attester.publicKey === report.attester.publicKey
    ? { kind: 'this-delivery', report, receipt }
    : { kind: 'other-key', report };
};
