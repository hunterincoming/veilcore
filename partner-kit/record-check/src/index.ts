// @veilcore/partner-kit: check a VeilCore record from its check link, in Node or a browser.
// The Node entry (node.ts) adds the date stamp look-up on Midnight.
// SPDX-License-Identifier: Apache-2.0

export {
  acceptable,
  checkRecord,
  summaryOf,
  DEFAULT_REGISTRY,
  FORMAT,
  RegistryError,
  LinkError,
  type AnchorChecker,
  type AnchorLookup,
  type CheckOptions,
  type Dated,
  type DatedStatus,
  type KeyBound,
  type RecordCheck,
} from './check.js';
export { CUT, parseCheckLink, type CheckLink } from './link.js';
export { type CustodyEntry, type LabReceipt, type NameCheck, type NameCheckStatus } from './signatures.js';
export { fingerprintOfFields, keyMatchesFingerprint, pairingFingerprintOfSha } from './hash.js';
