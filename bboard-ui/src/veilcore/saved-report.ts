// The lab report saved to a plant, and whether the lab still stands behind it (round 5).
//
// A breeder saves a lab report to a plant once. Labs replace and withdraw reports later.
// The plant used to keep showing "Lab report ✓" for a report the lab had replaced or
// withdrawn, and the breeder couldn't save the corrected one. Now every screen that shows
// the saved report reads its standing from here:
//   - lab        the saved file is a lab report the lab signed, and the signature stands;
//   - replaced   the lab sent a corrected file in its place (or withdrew its signature as
//                superseded);
//   - withdrawn  the lab withdrew it, and it is still the file saved;
//   - self       no lab signature matches the saved file: the breeder's own statement.
//
// The match is on the file's SHA-256. A lab report signed before round 6 names it plainly; one
// signed since names it bound with the record's proof code and s from the delivery's offer key
// (lab-doc.ts, CONTRACT.md #34), which the breeder's record keeps (offerKeys), so the match is
// made with each delivery's s. The plant's stored "pairing fingerprint" is a different value
// by design: the contract's `commit` over that SHA-256, so the pairing can be dated on the
// network (commitment.ts). Pairings saved before the SHA-256 was kept are matched by
// recomputing the pairing fingerprint of each plain lab report signature's SHA-256.
// SPDX-License-Identifier: Apache-2.0

import type { StrainRecord } from './records';
import { countsAsSigned, signerLabel, type ResolvedAttestation } from './attesters';
import { liveResults, resultState, type ResultState, type ResultSummary } from './lab-results';
import { pairingFingerprintOfSha } from './commitment';
import { enT, type Translator } from '../i18n/translate';
import type { DnaTie } from './dna-tie';
import { recipientName } from './transfers';
import { matchesBinding } from './dna-link';
import { isBoundLabDocument, labSaltsOf, signsReport } from './lab-doc';

/** One lab report that came back on a delivery (LabResults.tsx ArrivedResult, structurally). */
export type ArrivedLike = {
  readonly transfer: { readonly id: string; readonly to_handle: string; readonly label?: string };
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
  return labReports(record, atts)
    .filter((a) => !isBoundLabDocument(a))
    .find((a) => pairingFingerprintOfSha(a.documentHash) === record.dnaFingerprint)?.documentHash;
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
  const salts = labSaltsOf(record);
  const matching = sha ? labReports(record, atts).filter((a) => signsReport(a, sha, salts)) : [];
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
  const lab = from ? recipientName(from.transfer) : att ? signerLabel(att, '').who : 'the lab';

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
export const savedReportRow = (s: SavedReport, tr: Translator = enT): { done: boolean; value: string } | null => {
  switch (s.kind) {
    case 'none':
      return null;
    case 'lab':
      return { done: true, value: tr.t('app.lab.saved.lab') };
    case 'self':
      return { done: true, value: tr.t('app.lab.saved.self') };
    case 'replaced':
      return {
        done: false,
        value: s.newer
          ? tr.t('app.lab.saved.replacedNewer')
          : tr.t('app.lab.saved.replacedNone', { lab: s.lab === 'the lab' ? tr.t('app.lab.theLab') : s.lab }),
      };
    case 'withdrawn':
      return { done: false, value: tr.t('app.lab.saved.withdrawn') };
  }
};

/** A date for the certificate and Show someone: UTC, and labelled so. */
const day = (t?: number) => (t ? `${new Date(t).toISOString().slice(0, 10)} (UTC)` : '');

/**
 * What happened to a saved report the lab no longer stands behind, in the same words on the
 * certificate, the Show someone preview and the public check page (round 6). Facts only:
 * what the lab did and when, and what is saved now. It never says the holder "kept" it:
 * the holder may not have had the chance to do anything yet. (app.lab.replacedTail and
 * app.lab.withdrawnTail in the visitor's language.)
 */

/** " on 2026-10-14 (UTC)" after "by the lab", when the date is known. */
const onDay = (tr: Translator, t?: number) => (t ? tr.t('app.lab.onDay', { date: day(t) }) : '');

/**
 * One plain sentence about the saved report, for the certificate and Show someone. Said
 * plainly when the lab replaced or withdrew the report that is saved.
 */
export const savedReportSentence = (s: SavedReport, tr: Translator = enT): string => {
  switch (s.kind) {
    case 'none':
      return tr.t('app.lab.sentence.none');
    case 'lab': {
      const l = signerLabel(s.signed, 'signed by', undefined, tr);
      return tr.t('app.lab.sentence.lab', { lead: l.lead, rest: l.rest });
    }
    case 'self':
      return tr.t('app.lab.sentence.self');
    case 'replaced':
      return tr.t('app.lab.sentence.replaced', { on: onDay(tr, s.at), tail: tr.t('app.lab.replacedTail') });
    case 'withdrawn':
      return tr.t('app.lab.sentence.withdrawn', { on: onDay(tr, s.at), tail: tr.t('app.lab.withdrawnTail') });
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
 * Which file is saved comes from the registry, as it is now (round 6), and since round 5 of
 * sealing (CONTRACT.md #29) only in the bound form: dnaPairBinding = H(dnapair, the file's
 * SHA-256, the record's proof code, its pairing salt), never the SHA-256. The salt is in the
 * holder's link, after the # (`ds`), beside the proof code (`fp`). With them the page tries each lab
 * report signature's SHA-256 against the binding, and a file the visitor chooses (the holder
 * sent it with the link); without them nobody can tell which file it is, and the line says
 * how to check. A link made before round 5 may name the file's SHA-256 (`rs`): only a hint,
 * used when the registry is too old to send a binding, and then said "as of when this link
 * was made".
 */
/**
 * Whether the registry shares the lab status but has left out which report is saved because
 * the holder's values are stale (it lists `dna` under staleGrant and sends no
 * dnaPairedByHolder). The check page then says the pairing isn't known yet: it must never
 * read as "no report saved".
 */
export const pairingPending = (r: { staleGrant?: unknown; dnaPairedByHolder?: unknown } | null | undefined): boolean =>
  !!r && Array.isArray(r.staleGrant) && r.staleGrant.includes('dna') && r.dnaPairedByHolder === undefined;

/** The report line while the pairing is pending: reported, never ticked, no tie claimed. */
export const pendingReportLine = (tr: Translator = enT): { status: FactStatus; text: string } => ({
  status: 'reported',
  text: tr.t('app.verify.report.pending'),
});

export const publicReportLine = (
  input: {
    paired: boolean | undefined;
    /** The file SHA-256 named in a link made before round 5 (`rs`), if any. */
    linkSha?: string | null;
    /** The registry's bound value for the file saved now (dnaPairBinding), if it sends one. */
    binding?: string | null;
    /** The pairing salt from the holder's link (`ds`) and the link's own proof code, if it carries them. */
    linkDna?: { salt: string; identity: string } | null;
    /** The SHA-256 of a file the visitor chose to check, if any. */
    chosenSha?: string | null;
    /** The lab report salt from the holder's link (`ls`, round 6, lab-doc.ts), if it carries one. */
    labSalt?: string | null;
    atts: readonly ResolvedAttestation[];
    /** The link's fingerprint matches the registry's: checks may be ticked. */
    bound: boolean;
  },
  tr: Translator = enT,
): {
  status: FactStatus;
  text: string;
  /** Whether a DNA report ties the record to the plant, as this line finds it (veilcore/dna-tie.ts). */
  tie: DnaTie;
  /** What the file the visitor chose is: the saved report, another file, or none chosen. */
  chosen?: 'matches' | 'differs';
} => {
  if (!input.paired) return { status: 'reported', text: tr.t('app.verify.report.notSaved'), tie: { state: 'none' } };
  const reports = input.atts.filter((a) => a.type === 'laboratory-report' && a.signatureValid);
  const hex = (v?: string | null) => (v && HEX64.test(v.toLowerCase()) ? v.toLowerCase() : undefined);
  const linkSha = hex(input.linkSha);
  const binding = hex(input.binding);
  const chosenSha = hex(input.chosenSha);
  const dna = input.linkDna ?? null;
  const pairingOf = (sha: string) => {
    try {
      return pairingFingerprintOfSha(sha);
    } catch {
      return undefined; // the circuit isn't loaded: an older pairing can't be matched here
    }
  };
  const matches = (sha: string | undefined): boolean =>
    !!sha && !!binding && !!dna && matchesBinding(binding, sha, dna.identity, dna.salt, pairingOf) !== false;

  let sha: string | undefined;
  let fromLink = false;
  let chosen: 'matches' | 'differs' | undefined;
  // A bound lab report signature (round 6) names no file: only a chosen file is tried against it.
  const plainShas = reports.filter((a) => !isBoundLabDocument(a)).map((a) => a.documentHash.toLowerCase());
  const salts = input.labSalt && HEX64.test(input.labSalt) ? [input.labSalt.toLowerCase()] : [];
  if (binding) {
    if (chosenSha) chosen = matches(chosenSha) ? 'matches' : 'differs';
    sha = [chosen === 'matches' ? chosenSha : undefined, ...plainShas].find((c) => c !== undefined && matches(c));
  } else if (linkSha) {
    sha = linkSha;
    fromLink = true;
  }
  const asOf = fromLink ? tr.t('app.verify.report.asOf') : '';
  const staleNote = '';
  // The visitor's own file, said first when they chose one.
  const fileWords =
    chosen === 'matches'
      ? `${tr.t('app.verify.report.fileMatches')} `
      : chosen === 'differs'
        ? `${tr.t('app.verify.report.fileDiffers')} `
        : '';

  if (sha) {
    const found = sha;
    const matching = reports.filter((a) => signsReport(a, found, salts));
    const live = matching.find(countsAsSigned);
    if (live) {
      const l = signerLabel(live, 'signed by', undefined, tr);
      return {
        status: chosen === 'differs' ? 'failed' : input.bound ? 'checked' : 'reported',
        text:
          fileWords +
          tr.t('app.verify.report.matches', { asOf, sha: shortHex(sha), lead: l.lead, rest: l.rest, staleNote }),
        tie: { state: 'lab', lead: l.lead },
        ...(chosen ? { chosen } : {}),
      };
    }
    const gone = matching.find((a) => a.retraction);
    if (gone?.retraction) {
      const on = `${gone.retraction.retractedAt.slice(0, 10)} (UTC)`;
      const which = tr.t('app.verify.report.which', { asOf, sha: shortHex(sha) });
      return {
        status: 'failed',
        tie: { state: gone.retraction.reason === 'superseded' ? 'replaced' : 'withdrawn' },
        text:
          fileWords +
          (gone.retraction.reason === 'superseded'
            ? tr.t('app.verify.report.replaced', { which, on, tail: tr.t('app.lab.replacedTail'), staleNote })
            : tr.t('app.verify.report.withdrawn', { which, on, tail: tr.t('app.lab.withdrawnTail'), staleNote })),
        ...(chosen ? { chosen } : {}),
      };
    }
    // A lab signed a report this page can't hold the file to (round 6): never "the holder's
    // own statement". A bound signature without the link's `ls`, or one the registry withheld.
    const unmatchable = input.atts.some(
      (a) =>
        a.type === 'laboratory-report' &&
        ((a.signatureValid && isBoundLabDocument(a) && salts.length === 0) || a.documentWithheld === true),
    );
    if (unmatchable) {
      const why = input.atts.some((a) => a.type === 'laboratory-report' && a.signatureValid && isBoundLabDocument(a))
        ? tr.t('app.verify.report.whyNoLabSalt')
        : tr.t('app.verify.report.whyWithheld');
      return {
        status: chosen === 'differs' ? 'failed' : 'reported',
        text: fileWords + tr.t('app.verify.report.labUnknown', { asOf, sha: shortHex(sha), why, staleNote }),
        tie: { state: 'saved' },
        ...(chosen ? { chosen } : {}),
      };
    }
    return {
      status: chosen === 'matches' && input.bound ? 'checked' : chosen === 'differs' ? 'failed' : 'reported',
      text: fileWords + tr.t('app.verify.report.ownSha', { asOf, sha: shortHex(sha), staleNote }),
      tie: { state: 'self' },
      ...(chosen ? { chosen } : {}),
    };
  }
  if (binding) {
    // Saved, bound; which file it is only someone with the link's salt and the file can tell.
    return {
      status: chosen === 'differs' ? 'failed' : 'reported',
      tie: { state: 'saved' },
      text: fileWords + (dna ? tr.t('app.verify.report.chooseFile') : tr.t('app.verify.report.noSaltInLink')),
      ...(chosen ? { chosen } : {}),
    };
  }
  // A registry too old to say which file is saved, and a link that doesn't name it.
  return {
    status: 'reported',
    // Saved, but which file this page can't tell: tied, by a report the holder saved.
    tie: { state: 'saved' },
    text: reports.some(countsAsSigned)
      ? tr.t('app.verify.report.unnamedSigned')
      : reports.length > 0
        ? tr.t('app.verify.report.unnamedWithdrawn')
        : tr.t('app.verify.report.unnamedNone'),
  };
};

/** What a signature is, counted (one/many), for the withdrawn line. */
const kindWords = (a: ResolvedAttestation, n: number, tr: Translator): string =>
  tr.tp(
    a.type === 'chain-of-custody'
      ? 'app.verify.kind.receipts'
      : a.type === 'laboratory-report'
        ? 'app.verify.kind.reports'
        : 'app.verify.kind.statements',
    n,
  );

/**
 * The check page's line about withdrawn signatures, saying what each was (round 6), so it
 * can be read beside the lab report line: "2 signatures were withdrawn… : 2 lab reports".
 * Null when none was withdrawn.
 */
export const withdrawnSignaturesLine = (atts: readonly ResolvedAttestation[], tr: Translator = enT): string | null => {
  const gone = atts.filter((a) => a.signatureValid && a.retraction);
  if (gone.length === 0) return null;
  const groups = new Map<string, ResolvedAttestation[]>();
  for (const a of gone) {
    const k = a.type === 'chain-of-custody' || a.type === 'laboratory-report' ? a.type : 'other';
    groups.set(k, [...(groups.get(k) ?? []), a]);
  }
  const what = [...groups.values()].map((g) => kindWords(g[0], g.length, tr)).join(tr.t('app.verify.kind.and'));
  return tr.tp('app.verify.withdrawnSignatures', gone.length, { what });
};
