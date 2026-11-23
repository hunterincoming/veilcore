// The end of a proof code, for matching a printed label to its check page by eye
// (docs/scan-and-labels.md): each label prints the last 6 characters large
// (components/labels/label-layouts.ts), and the check page shows the same 6 in bold wherever
// the proof code appears (components/verify/ProofCodeText.tsx).
// SPDX-License-Identifier: Apache-2.0

export const PROOF_END = 6;

/** The same monospace letters as the label's (label-layouts.ts LABEL_FONTS.mono). */
export const PROOF_END_FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/** "…3fa9c1": the last 6 characters after an ellipsis, as a label prints them. Empty without a code. */
export const proofEnd = (fp?: string): string => (fp && fp.length > PROOF_END ? `…${fp.slice(-PROOF_END)}` : '');

/** A proof code as shown, split so its last 6 characters can be drawn apart from the rest. */
export const splitProofEnd = (shown: string): { head: string; end: string } =>
  shown.length > PROOF_END && /^[0-9a-f]{6}$/.test(shown.slice(-PROOF_END))
    ? { head: shown.slice(0, -PROOF_END), end: shown.slice(-PROOF_END) }
    : { head: shown, end: '' };
