// A claim on a yes/no slot (a lab result's call: detected, match, consistent, found, recovered,
// the sample's stage) in the words of the result, not of the slot. "Detected (1 yes, 0 no) is at
// most 0" is true, and nobody reads it as "not detected"; the claim page says "Not detected".
//
// Each word is said only when the claim forces it: exactly 0 or 1 gives that value's word, and at
// most 0 gives the 0 word (0 is the floor). The slots are plain whole numbers on chain, so "at
// least 1" does not force a 1, and any other bound keeps the plain wording, as does any slot not
// listed here.
//
// And only when a laboratory stands behind the numbers (labStands): the call is the lab's word.
// While the claim is being checked, when the check fails, with no lab signature, with a key no
// lab is tied to, or with a result the lab withdrew, the page keeps the plain slot and number:
// anyone can seal a record under these forms with numbers they typed themselves.
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
  return undefined;
};

/** The word key for a claim on the slot at `path`, or undefined to keep the plain wording. */
export const callWordKey = (path: string, c: ClaimShape): AppKey | undefined => {
  const words = CALL_WORDS[path];
  if (!words) return undefined;
  const v = forcedCall(c);
  return v === undefined ? undefined : words[v];
};

type Verdict =
  | {
      readonly ok: boolean;
      readonly lab?: { readonly ok: boolean; readonly signer?: { readonly kind: string } };
    }
  | undefined;

/** A laboratory whose signature checks, tied to its key for this record, and not withdrawn. */
export const labStands = (v: Verdict): boolean => !!v?.ok && !!v.lab?.ok && v.lab.signer?.kind === 'bound';

/**
 * The same rule on a record's own page ("Prove a fact"): its kept lab signature checks
 * against the record (`signatureOk`, lab-attest.ts labSignatureChecks), and the lab's binding names
 * one lab for the key and isn't withdrawn (`signer`, LabSignaturePanel useLabSigner). Undefined
 * either way while it is being checked: not yet.
 */
export const labStandsOnRecord = (
  signatureOk: boolean | undefined,
  signer: { readonly kind: string } | undefined,
): boolean => labStands({ ok: true, lab: signatureOk === true && signer ? { ok: true, signer } : { ok: false } });

/**
 * Whether a claim on a record's page may be said in the lab's words: only a claim on this very
 * record (by its commitment), and only where the lab stands behind this record. A claim on any
 * other record is said in the holder's words: that record's own signature isn't checked here.
 */
export const labWordsFor = (
  claim: { readonly record: string },
  here: { readonly commitment: string | undefined; readonly stands: boolean },
): boolean => here.stands && here.commitment !== undefined && claim.record === here.commitment;

/**
 * The claim page's closing line (ClaimCheck.tsx). A lab whose signature checks signed the
 * numbers: the line says so, and says the lab withdrew the result when it did. A key that signs
 * but that no lab (or more than one) is tied to says to read the numbers as the holder's own, as
 * the lab panel does. Only a claim with no lab signature that checks says the holder typed them.
 */
export const claimFooterKey = (v: Verdict): AppKey => {
  if (!v?.ok || !v.lab?.ok) return 'app.claim.check.what';
  if (v.lab.signer?.kind === 'bound') return 'app.claim.check.whatLab';
  if (v.lab.signer?.kind === 'retracted') return 'app.claim.check.whatLabWithdrawn';
  return 'app.claim.check.whatLabUnnamed';
};
