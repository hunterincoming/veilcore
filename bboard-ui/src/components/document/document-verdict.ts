// The document check page's one plain line at the top (easy-mode review, 19 Nov), and whether
// its date is from a contract VeilCore is still testing. Pure, so the page and its tests read
// one answer (DocumentCheck.tsx).
// SPDX-License-Identifier: Apache-2.0

import type { ReadLink } from '../../veilcore/document-link';
import type { ProofState } from '../../veilcore/proofs';
import { NETWORK, isTestNetwork } from '../../config/network';
import { stillTesting, type AnchorState } from '../verify/anchor-words';
import { recordVerdict, type Verdict } from '../verify/verdict';

export type DocumentDate = { proof: ProofState | 'checking'; anchor: AnchorState | undefined };

/** Where the registry says the date was stamped, when it says. */
const reportedAnchorOf = (date: DocumentDate) =>
  date.proof !== 'checking' && date.proof.status === 'anchor-reported' ? date.proof.proof.anchor : undefined;

/**
 * A date from a contract VeilCore is still testing (version 2 on mainnet, docs/contract-v2.md 7
 * condition 5): never the green verdict, and no "make a record" beside it.
 */
export const documentDateTesting = (date: DocumentDate): boolean =>
  stillTesting(date.anchor, reportedAnchorOf(date)?.network ?? NETWORK);

/**
 * The record's own check words (verify/verdict.ts), with the document's file answer when one was
 * chosen (`picked`: null when none). The proof code is recomputed from the link, so it is always
 * checked against the link's own fields.
 */
export const documentVerdict = (read: ReadLink | undefined, date: DocumentDate, picked: boolean | null): Verdict => {
  const reportedAnchor = reportedAnchorOf(date);
  const base =
    !read || (read.ok && date.proof === 'checking')
      ? ({ tone: 'wait', key: 'app.verify.verdict.checking' } as Verdict)
      : !read.ok
        ? ({ tone: 'fail', key: 'app.doc.verdict.bad' } as Verdict)
        : recordVerdict({
            sealed: true,
            bound: true,
            proof: date.proof,
            anchor: date.anchor,
            signaturesChecking: false,
            failed: picked === false,
            testNetwork: isTestNetwork(reportedAnchor?.network ?? NETWORK),
            stillTesting: documentDateTesting(date),
            reportedAt: reportedAnchor?.anchoredAt,
            document: true,
          });
  // "All checks passed" isn't said for a document: its file is a check of its own, the reader's to make.
  return base.key === 'app.verify.verdict.dated'
    ? {
        ...base,
        key: picked
          ? 'app.doc.verdict.datedSameFile'
          : read?.ok && read.fields.files.length
            ? 'app.doc.verdict.datedChooseFile'
            : 'app.doc.verdict.dated',
      }
    : base.key === 'app.verify.verdict.datedButFailed'
      ? { ...base, key: 'app.doc.verdict.datedOtherFile' }
      : base;
};
