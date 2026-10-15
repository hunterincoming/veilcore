// The lab report saved to a plant, and whether the lab still stands behind it (round 5).
//
// A breeder saves a lab report to a plant once. Labs replace and withdraw reports later.
// The plant used to keep showing "Lab report ✓" for a report the lab had replaced or
// withdrawn, and the breeder couldn't save the corrected one. Now every screen that shows
// the saved report reads its standing from here:
//   - lab        the saved file is a lab report the lab signed, and the signature stands;
//   - replaced   the lab sent a corrected file in its place (or withdrew its signature as
//                superseded);
//   - withdrawn  the lab withdrew it; the breeder kept it saved;
//   - self       no lab signature matches the saved file: the breeder's own statement.
//
// The match is on the file's plain SHA-256, which is what a lab signs. The plant's
// stored "pairing fingerprint" is a different value by design: the contract's `commit`
// over that SHA-256, so the pairing can be dated on the network (commitment.ts). Pairings
// saved before the SHA-256 was kept are matched by recomputing the pairing fingerprint of
// each lab report signature's SHA-256.
// SPDX-License-Identifier: Apache-2.0

import type { StrainRecord } from './records';
import { countsAsSigned, signerLabel, type ResolvedAttestation } from './attesters';
import { liveResults, resultState, type ResultState, type ResultSummary } from './lab-results';
import { pairingFingerprintOfSha } from './commitment';

/** One lab report that came back on a delivery (LabResults.tsx ArrivedResult, structurally). */
export type ArrivedLike = {
  readonly transfer: { readonly id: string; readonly to_handle: string };
  readonly result: ResultSummary;
  readonly state: ResultState;
};

export type SavedReport =
  | { readonly kind: 'none' }
  | { readonly kind: 'self'; readonly sha?: string }
  | {
      readonly kind: 'lab';
      readonly sha: string;
      readonly signed: ResolvedAttestation;
      /** Who it came from, as the breeder addressed the delivery (or the signer's label). */
      readonly lab: string;
      readonly resultId?: string;
    }
  | {
      readonly kind: 'replaced' | 'withdrawn';
      readonly sha?: string;
      readonly lab: string;
      /** When the lab withdrew it or its signature, if known. */
      readonly at?: number;
      /** The newest lab report that still stands, to save instead: the same delivery's first. */
      readonly newer?: ArrivedLike;
    };

const labReports = (record: StrainRecord, atts: readonly ResolvedAttestation[]) =>
  atts.filter(
    (a) => a.type === 'laboratory-report' && a.signatureValid && a.subjectCommitment === record.recordFingerprint,
  );

/** The saved file's SHA-256: stored since round 5, else recovered from a lab signature it matches. */
export const savedFileSha = (record: StrainRecord, atts: readonly ResolvedAttestation[]): string | undefined => {
  if (!record.dnaFingerprint) return undefined;
  if (record.dnaFileSha256) return record.dnaFileSha256.toLowerCase();
  return labReports(record, atts).find((a) => pairingFingerprintOfSha(a.documentHash) === record.dnaFingerprint)
    ?.documentHash;
};

const newestLive = (arrived: readonly ArrivedLike[], exceptId?: string, transferId?: string) => {
  const live = [...arrived]
    .filter((a) => a.state === 'live' && a.result.id !== exceptId)
    .sort((a, b) => b.result.createdAt - a.result.createdAt);
  return live.find((a) => a.transfer.id === transferId) ?? live[0];
};

/** Where the lab report saved to this plant stands. */
export const savedReportStatus = (
  record: StrainRecord,
  arrived: readonly ArrivedLike[],
  atts: readonly ResolvedAttestation[],
): SavedReport => {
  if (!record.dnaFingerprint) return { kind: 'none' };
  const sha = savedFileSha(record, atts);
  const matching = sha ? labReports(record, atts).filter((a) => a.documentHash === sha) : [];
  const ids = new Set(matching.map((a) => a.attestationId));
  const byAtt = arrived.filter((a) => a.result.attestationId && ids.has(a.result.attestationId));
  const from =
    (record.dnaResultId ? arrived.find((a) => a.result.id === record.dnaResultId) : undefined) ??
    byAtt.find((a) => a.state === 'live') ??
    byAtt[0];
  const att =
    (from?.result.attestationId ? matching.find((a) => a.attestationId === from.result.attestationId) : undefined) ??
    matching.find(countsAsSigned) ??
    matching[0];
  const lab = from?.transfer.to_handle ?? (att ? signerLabel(att, '').who : 'the lab');

  const state: ResultState | undefined = from
    ? from.state
    : att
      ? countsAsSigned(att)
        ? 'live'
        : att.retraction?.reason === 'superseded'
          ? 'replaced'
          : 'withdrawn'
      : undefined;

  if (state === 'replaced' || state === 'withdrawn') {
    const at =
      from?.result.withdrawnAt ?? (att?.retraction ? Date.parse(att.retraction.retractedAt) || undefined : undefined);
    const newer = newestLive(arrived, from?.result.id, from?.transfer.id);
    return {
      kind: state,
      ...(sha ? { sha } : {}),
      lab,
      ...(at ? { at } : {}),
      ...(newer ? { newer } : {}),
    };
  }
  if (state === 'live' && att && countsAsSigned(att) && sha) {
    return { kind: 'lab', sha, signed: att, lab, ...(from ? { resultId: from.result.id } : {}) };
  }
  return { kind: 'self', ...(sha ? { sha } : {}) };
};

/** The plant page's "Lab report" row. */
export const savedReportRow = (s: SavedReport): { done: boolean; value: string } | null => {
  switch (s.kind) {
    case 'none':
      return null;
    case 'lab':
      return { done: true, value: 'saved · matches the lab’s signed report' };
    case 'self':
      return { done: true, value: 'saved · no lab signature matches it' };
    case 'replaced':
      return {
        done: false,
        value: s.newer
          ? 'replaced by the lab — save the corrected one'
          : `replaced by the lab · no current report from ${s.lab}`,
      };
    case 'withdrawn':
      return { done: false, value: 'withdrawn by the lab' };
  }
};

/** A date for the certificate and Show someone: UTC, and labelled so. */
const day = (t?: number) => (t ? `${new Date(t).toISOString().slice(0, 10)} (UTC)` : '');

/**
 * One plain sentence about the saved report, for the certificate and Show someone. Said
 * plainly when the breeder kept a report the lab replaced or withdrew.
 */
export const savedReportSentence = (s: SavedReport): string => {
  switch (s.kind) {
    case 'none':
      return 'No lab report is saved to this plant.';
    case 'lab': {
      const l = signerLabel(s.signed, 'signed by');
      return `The saved lab report matches a lab report ${l.lead}, by its SHA-256 (signature checked in this browser).${l.rest}`;
    }
    case 'self':
      return 'A lab report file is saved to this plant. No lab signature matches it, so it is the holder’s own statement.';
    case 'replaced':
      return `The lab report saved to this plant was replaced by the lab${s.at ? ` on ${day(s.at)}` : ''} with a corrected one${s.newer ? ', which is not saved yet' : ''}. The holder kept the old one saved.`;
    case 'withdrawn':
      return `The lab report saved to this plant was withdrawn by the lab${s.at ? ` on ${day(s.at)}` : ''}. The holder kept it saved.`;
  }
};

/**
 * A delivery whose original report was replaced and whose correction was then withdrawn:
 * nothing from that lab stands (round 5). The breeder is told so in those words.
 */
export const correctionWithdrawn = (all: readonly ResultSummary[]): boolean =>
  all.length > 0 &&
  liveResults(all).length === 0 &&
  all.some((r) => r.replaces !== undefined && resultState(r, all) === 'withdrawn') &&
  all.some((r) => resultState(r, all) === 'replaced');

// --- what the public check page says about it (VerifyPage.tsx, round 5) ------------------

export type FactStatus = 'checked' | 'reported' | 'failed';

const shortHex = (h: string) => `${h.slice(0, 8)}…${h.slice(-6)}`;
const HEX64 = /^[0-9a-f]{64}$/;

/**
 * The "lab report" line on the public check page, once the holder has shared whether one
 * is saved. It never says "Not confirmed by a lab" beside a lab report signature it
 * counted: it says whether the saved file is that signed report, matched on the file's
 * SHA-256 (what a lab signs).
 *
 * Which file is saved comes from, in order: the registry's pairing fingerprint, when it
 * sends one (the page recomputes it from a signature's SHA-256 or the link's); else the
 * file SHA-256 the holder's link names (`rs`), as of when the link was made.
 */
export const publicReportLine = (input: {
  paired: boolean | undefined;
  /** The file SHA-256 named in the link (`rs`), if any. */
  linkSha?: string | null;
  /** The registry's pairing fingerprint for the saved file, if it sends one. */
  pairingFingerprint?: string | null;
  atts: readonly ResolvedAttestation[];
  /** The link's fingerprint matches the registry's: checks may be ticked. */
  bound: boolean;
}): { status: FactStatus; text: string } => {
  if (!input.paired) return { status: 'reported', text: 'The holder has not saved a lab report to this record.' };
  const reports = input.atts.filter((a) => a.type === 'laboratory-report' && a.signatureValid);
  const linkSha = input.linkSha && HEX64.test(input.linkSha.toLowerCase()) ? input.linkSha.toLowerCase() : undefined;
  const pfp = input.pairingFingerprint && HEX64.test(input.pairingFingerprint) ? input.pairingFingerprint : undefined;

  let sha: string | undefined;
  let source: 'registry' | 'link' | undefined;
  let stale = false;
  if (pfp) {
    if (linkSha && pairingFingerprintOfSha(linkSha) === pfp) sha = linkSha;
    else sha = reports.find((a) => pairingFingerprintOfSha(a.documentHash) === pfp)?.documentHash;
    source = 'registry';
    stale = !!linkSha && sha !== linkSha;
  } else if (linkSha) {
    sha = linkSha;
    source = 'link';
  }
  const asOf = source === 'link' ? ' (as of when this link was made)' : '';
  const staleNote = stale ? ' The holder has saved a different file since this link was made.' : '';

  if (sha) {
    const matching = reports.filter((a) => a.documentHash === sha);
    const live = matching.find(countsAsSigned);
    if (live) {
      const l = signerLabel(live, 'signed by');
      return {
        status: input.bound ? 'checked' : 'reported',
        text: `The holder saved a lab report to this record${asOf}. Its file (SHA-256 ${shortHex(sha)}) matches the lab report ${l.lead}: signature checked in this browser.${l.rest}${staleNote}`,
      };
    }
    const gone = matching.find((a) => a.retraction);
    if (gone?.retraction) {
      const on = gone.retraction.retractedAt.slice(0, 10);
      return {
        status: 'failed',
        text:
          gone.retraction.reason === 'superseded'
            ? `The lab report the holder saved${asOf} (SHA-256 ${shortHex(sha)}) was replaced by its lab on ${on} (UTC): the lab withdrew its signature on it as replaced by a corrected one. The holder kept the old one saved.${staleNote}`
            : `The lab report the holder saved${asOf} (SHA-256 ${shortHex(sha)}) was withdrawn by its lab on ${on} (UTC). The holder kept it saved.${staleNote}`,
      };
    }
    return {
      status: 'reported',
      text: `The holder saved a lab report file to this record${asOf} (SHA-256 ${shortHex(sha)}). No lab signature on this record matches it, so it is the holder’s own statement.${staleNote}`,
    };
  }
  if (pfp) {
    return {
      status: 'reported',
      text: 'The holder saved a lab report file to this record. No lab signature on this record matches it, so it is the holder’s own statement.',
    };
  }
  return {
    status: 'reported',
    text: reports.some(countsAsSigned)
      ? 'The holder saved a lab report to this record. This link doesn’t name the file, so this page can’t tell whether it is the signed lab report listed above.'
      : 'The holder saved a lab report to this record. No lab has signed a lab report about this record, so it is the holder’s own statement.',
  };
};
