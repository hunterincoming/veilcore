// What a holder's link adds so a checker can ask them to prove it: the plant's key (chain),
// the key's date stamp (anchorTx), and for a record that names its key (key-binding.ts)
// the key's salt (ks) and the hash of its sealed details (cd), so the check page can match
// the key to the record's fingerprint. Used by every place the site makes such a link.
// SPDX-License-Identifier: Apache-2.0

import { contentHashOf } from './commitment';
import { identityFromSecret, keySaltOf } from './key-binding';
import { keysFitRecord, type RecordKeys } from './record-keys';
import type { StrainRecord } from './records';

/**
 * The link's extra parameters, or null when there's nothing honest to put in it: no date
 * stamp yet, or a record that names a key these keys aren't (the check page would refuse).
 */
export const proveLinkParams = async (
  record: StrainRecord,
  keys: RecordKeys | undefined,
): Promise<Record<string, string> | null> => {
  const anchor = keys?.anchor;
  if (!keys || !anchor) return null;
  const base = { chain: anchor.identity, anchorTx: anchor.txId };
  if (record.keyBinding === undefined) return base; // an older record: as before
  if (!record.nonce || !keysFitRecord(keys, record) || identityFromSecret(keys.recordSecret) !== anchor.identity)
    return null;
  return { ...base, ks: keySaltOf(keys.recordSecret), cd: await contentHashOf({ ...record, nonce: record.nonce }) };
};
