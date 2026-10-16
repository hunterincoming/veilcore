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
import {
  hasDetails,
  receiptCustodyDigest,
  type ArrivalDetails,
  type SampleDetails,
  type SentTransfer,
} from './transfers';
import { countsAsSigned, nameChecked, signerLabel, type ResolvedAttestation } from './attesters';
import { utcDate } from './time';
import { enT, type Translator } from '../i18n/translate';

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

// --- the sample's chain of custody (transfers.ts) ------------------------------------------

/** Compare as a person reads them: spacing and letter case aside. */
const same = (a: string, b: string) =>
  a.replace(/\s+/g, ' ').trim().toLowerCase() === b.replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Where what arrived differs from what was sent, one plain line each, saying what each side
 * wrote and nothing about why: "Seal number differs: sent 4471, received 4417". A field the
 * breeder filled and the lab left empty is said too, so clearing it can't hide a change.
 */
export const custodyDifferences = (sample: SampleDetails, arrival: ArrivalDetails): string[] => {
  const out: string[] = [];
  const pair = (label: string, sent?: string, got?: string) => {
    if (sent && got && !same(sent, got)) out.push(`${label} differs: sent ${sent}, received ${got}`);
    else if (sent && !got) out.push(`${label} not confirmed on arrival (sent ${sent})`);
  };
  pair('Sample ID', sample.sampleId, arrival.sampleId);
  if (arrival.sealIntact === 'no-seal') {
    if (sample.sealNumber) out.push(`No seal on arrival (sent with seal ${sample.sealNumber})`);
  } else {
    pair('Seal number', sample.sealNumber, arrival.sealNumber);
  }
  if (arrival.sealIntact === 'no') out.push('Seal not intact on arrival');
  return out;
};

/**
 * What a delivery's sample details amount to, next to the lab's receipt for it:
 *  - `covered`: the receipt's id carries the digest of exactly these values (worked out in
 *    this browser: transfers.ts sentByMe), so the lab's signature covers them;
 *  - `changed`: it carries a digest, of other values: the lab changed them after signing;
 *  - `not-covered`: a receipt from before these existed; the lab's side isn't shown.
 */
export type CustodyView = {
  readonly sample: SampleDetails;
  readonly arrival: ArrivalDetails;
  readonly signed: 'covered' | 'changed' | 'not-covered';
  readonly differences: readonly string[];
};

export const custodyView = (t: SentTransfer | undefined, receiptId: string | undefined): CustodyView | undefined => {
  if (!t) return undefined;
  const sample = t.sample_custody ?? {};
  const arrival = t.arrival_custody ?? {};
  if (!hasDetails(sample) && !hasDetails(arrival)) return undefined;
  const digest = receiptId ? receiptCustodyDigest(receiptId) : null;
  const signed = digest === null ? 'not-covered' : digest === t.custodyDigest ? 'covered' : 'changed';
  return { sample, arrival, signed, differences: signed === 'covered' ? custodyDifferences(sample, arrival) : [] };
};

const SEAL_WORDS = {
  yes: 'app.lab.custody.sealIntact',
  no: 'app.lab.custody.sealNotIntact',
  'no-seal': 'app.lab.custody.noSeal',
} as const;

/** The breeder's side in one line: "Sample BLU-07 · seal 4471 · taken from Mother M3 on 2026-10-14 · witness J. Doe". */
export const sampleLine = (s: SampleDetails, tr: Translator = enT): string =>
  [
    s.sampleId ? tr.t('app.lab.custody.sample', { v: s.sampleId }) : undefined,
    s.sealNumber ? tr.t('app.lab.custody.seal', { v: s.sealNumber }) : undefined,
    s.takenFrom || s.takenOn
      ? s.takenFrom && s.takenOn
        ? tr.t('app.lab.custody.takenFromOn', { from: s.takenFrom, on: s.takenOn })
        : s.takenFrom
          ? tr.t('app.lab.custody.takenFrom', { from: s.takenFrom })
          : tr.t('app.lab.custody.takenOn', { on: s.takenOn ?? '' })
      : undefined,
    s.witness ? tr.t('app.lab.custody.witness', { v: s.witness }) : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

/** The lab's side in one line: "Sample BLU-07 · seal 4417, seal intact · arrived 2026-10-15 · condition … · lab no. ACC-9". */
export const arrivalLine = (a: ArrivalDetails, tr: Translator = enT): string =>
  [
    a.sampleId ? tr.t('app.lab.custody.sample', { v: a.sampleId }) : undefined,
    a.sealNumber || a.sealIntact
      ? [
          a.sealNumber ? tr.t('app.lab.custody.seal', { v: a.sealNumber }) : undefined,
          a.sealIntact ? tr.t(SEAL_WORDS[a.sealIntact]) : undefined,
        ]
          .filter(Boolean)
          .join(tr.t('app.lab.custody.comma'))
      : undefined,
    a.arrivedOn ? tr.t('app.lab.custody.arrived', { v: a.arrivedOn }) : undefined,
    // A lab's condition may have line breaks (the only field that may): one line here.
    a.condition ? tr.t('app.lab.custody.condition', { v: a.condition.replace(/\s*\n\s*/g, ' ') }) : undefined,
    a.labRef ? tr.t('app.lab.custody.labNo', { v: a.labRef }) : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * One difference line (custodyDifferences', or the registry's, which words them the same
 * way) in the visitor's language; one in another shape is shown as it came.
 */
export const differenceWords = (d: string, tr: Translator = enT): string => {
  const differs = /^(Sample ID|Seal number) differs: sent (.*), received (.*)$/s.exec(d);
  if (differs)
    return tr.t(differs[1] === 'Sample ID' ? 'app.lab.custody.idDiffers' : 'app.lab.custody.sealDiffers', {
      sent: differs[2],
      got: differs[3],
    });
  const notConfirmed = /^(Sample ID|Seal number) not confirmed on arrival \(sent (.*)\)$/s.exec(d);
  if (notConfirmed)
    return tr.t(
      notConfirmed[1] === 'Sample ID' ? 'app.lab.custody.idNotConfirmed' : 'app.lab.custody.sealNotConfirmed',
      { sent: notConfirmed[2] },
    );
  const noSeal = /^No seal on arrival \(sent with seal (.*)\)$/s.exec(d);
  if (noSeal) return tr.t('app.lab.custody.noSealOnArrival', { sent: noSeal[1] });
  if (d === 'Seal not intact on arrival') return tr.t('app.lab.custody.sealNotIntactOnArrival');
  return d;
};

/**
 * The receipt's sample lines for the breeder's plant page, certificate and check page:
 * differences first, plainly; otherwise that what arrived matches what was sent.
 */
export const custodyLines = (v: CustodyView | undefined, tr: Translator = enT): string[] => {
  if (!v) return [];
  const sent = hasDetails(v.sample) ? [tr.t('app.lab.custody.sent', { v: sampleLine(v.sample, tr) })] : [];
  if (v.signed === 'not-covered') return [...sent, tr.t('app.lab.custody.notCovered')];
  if (v.signed === 'changed') return [...sent, tr.t('app.lab.custody.changed')];
  const got = hasDetails(v.arrival) ? [tr.t('app.lab.custody.received', { v: arrivalLine(v.arrival, tr) })] : [];
  if (v.differences.length)
    return [...v.differences.map((d) => tr.t('app.lab.custody.line', { v: differenceWords(d, tr) })), ...sent, ...got];
  const id = v.sample.sampleId && v.arrival.sampleId;
  const seal = v.sample.sealNumber && v.arrival.sealNumber;
  return [
    ...(id || seal
      ? [
          tr.t(
            id && seal ? 'app.lab.custody.bothMatch' : id ? 'app.lab.custody.idMatches' : 'app.lab.custody.sealMatches',
          ),
        ]
      : []),
    ...sent,
    ...got,
  ];
};

/**
 * One linked receipt's sample details as the public /verify reports them, under the holder's
 * lab-status grant (round 2 of the 15 Oct review): whether the receipt covers them and where
 * what arrived differs from what was sent, never the details themselves. The registry's word:
 * a stranger can't recompute the digest without the details.
 */
export type PublicCustody = {
  readonly receiptAttestationId: string;
  readonly covered: 'covered' | 'changed' | 'not-covered';
  readonly differences: readonly string[];
};

const COVERED_STATES: readonly string[] = ['covered', 'changed', 'not-covered'];
const HIDDEN = /[\p{Cc}\p{Cf}\u2028\u2029]+/gu;

/** /verify's `custody`, by receipt id; anything not in shape is left out. */
export const publicCustodyOf = (v: unknown): Map<string, PublicCustody> => {
  const out = new Map<string, PublicCustody>();
  if (!Array.isArray(v)) return out;
  for (const x of v.slice(0, 100)) {
    if (typeof x !== 'object' || x === null) continue;
    const c = x as Record<string, unknown>;
    if (typeof c.receiptAttestationId !== 'string' || typeof c.covered !== 'string') continue;
    if (!COVERED_STATES.includes(c.covered) || !Array.isArray(c.differences)) continue;
    out.set(c.receiptAttestationId, {
      receiptAttestationId: c.receiptAttestationId,
      covered: c.covered as PublicCustody['covered'],
      differences: c.differences
        .filter((d): d is string => typeof d === 'string')
        .slice(0, 10)
        .map((d) => d.replace(HIDDEN, ' ').slice(0, 300)),
    });
  }
  return out;
};

/** The lines under a receipt on the public check page: differences plainly, or the coverage. */
export const publicCustodyLines = (c: PublicCustody | undefined, tr: Translator = enT): string[] => {
  if (!c) return [];
  if (c.covered === 'changed') return [tr.t('app.lab.custody.changed')];
  if (c.covered === 'not-covered') return [tr.t('app.lab.custody.notCovered')];
  if (c.differences.length)
    return c.differences.map((d) => tr.t('app.lab.custody.line', { v: differenceWords(d, tr) }));
  return [tr.t('app.lab.custody.noDifference')];
};

/** custodyLines without the "Sent:" and "Received:" detail: the plant page's one line under the receipt. */
export const custodyHeadline = (v: CustodyView | undefined, tr: Translator = enT): string | undefined => {
  if (!v) return undefined;
  const detail = new Set([
    ...(hasDetails(v.sample) ? [tr.t('app.lab.custody.sent', { v: sampleLine(v.sample, tr) })] : []),
    ...(hasDetails(v.arrival) ? [tr.t('app.lab.custody.received', { v: arrivalLine(v.arrival, tr) })] : []),
  ]);
  return (
    custodyLines(v, tr)
      .filter((l) => !detail.has(l))
      .join(tr.t('app.lab.custody.joinSentences')) || undefined
  );
};

/**
 * The sample details for a downloaded summary (the certificate's "Download summary"): what
 * the certificate shows under the receipt, as data. What arrived is given only when the
 * receipt covers it, as on the certificate; `lines` are the certificate's own words.
 */
export const custodySummary = (
  v: CustodyView | undefined,
):
  | {
      sent?: SampleDetails;
      onArrival?: ArrivalDetails;
      coveredByReceipt: boolean;
      differences: string[];
      lines: string[];
    }
  | undefined => {
  if (!v) return undefined;
  return {
    ...(hasDetails(v.sample) ? { sent: v.sample } : {}),
    ...(v.signed === 'covered' && hasDetails(v.arrival) ? { onArrival: v.arrival } : {}),
    coveredByReceipt: v.signed === 'covered',
    differences: [...v.differences],
    lines: custodyLines(v),
  };
};

export type BreederReceipt =
  | {
      readonly kind: 'signed';
      readonly by: ResolvedAttestation;
      /** The delivery it is tied to. */
      readonly transferId: string;
      /** The sample details on that delivery, and whether the receipt covers them. */
      readonly custody?: CustodyView;
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
  if (by) {
    const transferId = tied.get(by.attestationId) ?? '';
    const custody = custodyView(
      sent.find((t) => t.id === transferId),
      by.attestationId,
    );
    return { kind: 'signed', by, transferId, others, ...(custody ? { custody } : {}) };
  }
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
