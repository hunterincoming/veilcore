// A claim on a yes/no slot (a lab result's call: detected, match, consistent, found, recovered,
// the sample's stage) in the words of the result, not of the slot. "Detected (1 yes, 0 no) is at
// most 0" is true, and nobody reads it as "not detected"; the claim page says "Not detected".
//
// Each word is said only when the claim forces it for a slot that holds 0 or 1 (the schemas in
// public/schemas/ say so): exactly v gives v's word, at most 0 gives the 0 word, at least 1 the
// 1 word. Any other bound says nothing about a 0/1 slot ("at most 1" holds either way), so it
// keeps the plain wording, and so does any slot not listed here.
// SPDX-License-Identifier: Apache-2.0

import type { AppKey } from '../i18n/app/en';

/** A yes/no slot's words, by its schema path: [the 0 word, the 1 word]. */
export const CALL_WORDS: Readonly<Record<string, readonly [AppKey | undefined, AppKey]>> = {
  'pathogen.detected': ['app.lr.call.notDetected', 'app.lr.call.detected'],
  'match.matches': ['app.lr.call.noMatch', 'app.lr.call.match'],
  'lineage.consistent': ['app.lr.call.excluded', 'app.lr.call.consistent'],
  'mark.found': ['app.lr.call.notFound', 'app.lr.call.found'],
  'viability.recovered': ['app.lr.call.noneRecovered', 'app.lr.call.recovered'],
  'viability.stage': ['app.lr.stage.before', 'app.lr.stage.after'],
  // A withdrawal is always 1 (lab-retraction-v1.json): 0 has no word.
  'retraction.withdrawn': [undefined, 'app.lr.call.withdrawn'],
};

export type ClaimShape = {
  readonly kind: 'range' | 'value';
  readonly op?: 'at-most' | 'at-least';
  readonly bound?: string;
  readonly value?: string;
};

/** The 0 or 1 a claim forces on a yes/no slot, or undefined when it doesn't force one. */
export const forcedCall = (c: ClaimShape): 0 | 1 | undefined => {
  const n = c.kind === 'value' ? c.value : c.bound;
  if (n === undefined || !/^\d+$/.test(n)) return undefined;
  const v = BigInt(n);
  if (c.kind === 'value') return v === 0n ? 0 : v === 1n ? 1 : undefined;
  if (c.op === 'at-most') return v === 0n ? 0 : undefined;
  if (c.op === 'at-least') return v === 1n ? 1 : undefined;
  return undefined;
};

/** The word key for a claim on the slot at `path`, or undefined to keep the plain wording. */
export const callWordKey = (path: string, c: ClaimShape): AppKey | undefined => {
  const words = CALL_WORDS[path];
  if (!words) return undefined;
  const v = forcedCall(c);
  return v === undefined ? undefined : words[v];
};

/**
 * The claim page's closing line (ClaimCheck.tsx). A lab whose signature checks signed the
 * numbers: the line says so, and says the lab withdrew the result when it did, never that the
 * holder typed them. A claim with no lab signature that checks, or none tied to a named lab
 * (unidentified, conflicting), keeps the plain line.
 */
export const claimFooterKey = (
  v:
    | { readonly ok: boolean; readonly lab?: { readonly ok: boolean; readonly signer?: { readonly kind: string } } }
    | undefined,
): AppKey => {
  if (!v?.ok || !v.lab?.ok) return 'app.claim.check.what';
  if (v.lab.signer?.kind === 'bound') return 'app.claim.check.whatLab';
  if (v.lab.signer?.kind === 'retracted') return 'app.claim.check.whatLabWithdrawn';
  return 'app.claim.check.what';
};
