// Who runs this site. veilcore.org's build names nobody here: VeilCore runs it, and its pages say
// so in their own words (config/copy.ts OPERATOR, the privacy policy, the contact addresses).
//
// A copy someone else runs from this code (docs/SELF-HOSTING.md) names itself with four build
// settings, all four or none (scripts/canonical-origin.mjs checks them; a mainnet build with
// someone else's registry refuses to build without them):
//   VITE_OPERATOR_NAME         who runs it
//   VITE_OPERATOR_EMAIL        where people write; vite.config.ts puts it in place of VeilCore's
//                              contact addresses in the site's code (Founders page aside)
//   VITE_OPERATOR_PRIVACY_URL  its own privacy policy
//   VITE_OPERATOR_TERMS_URL    its own terms of use
// Then /privacy and /terms say who runs the copy and link its own pages, instead of showing
// VeilCore's policy and terms (components/site/OperatorNotice.tsx).
// SPDX-License-Identifier: Apache-2.0

/** True in a copy that names its own operator (vite.config.ts sets VITE_SELF_HOSTED). Pages test import.meta.env.VITE_SELF_HOSTED themselves where the bundle must leave code out. */
export const SELF_HOSTED: boolean = import.meta.env.VITE_SELF_HOSTED === 'on';

export const OPERATOR_INFO = {
  name: (import.meta.env.VITE_OPERATOR_NAME ?? '').trim(),
  email: (import.meta.env.VITE_OPERATOR_EMAIL ?? '').trim(),
  privacyUrl: (import.meta.env.VITE_OPERATOR_PRIVACY_URL ?? '').trim(),
  termsUrl: (import.meta.env.VITE_OPERATOR_TERMS_URL ?? '').trim(),
} as const;
