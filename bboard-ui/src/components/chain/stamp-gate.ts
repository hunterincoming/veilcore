// Whether a record's key may be date stamped yet (AnchorOnChainPanel.tsx): only once a backup
// holds the key. For a document kept on this device only that means a checked file holding the
// document itself (security review B3): the account copy never holds it, so a "backed up" mark on
// its key, from wherever, is not enough on its own.
// SPDX-License-Identifier: Apache-2.0

export const keyStampAllowed = (
  keys: { readonly backedUpAt?: number; readonly backedUpVia?: 'copy' } | undefined,
  doc: { readonly deviceOnly: boolean; readonly inCheckedFile: boolean },
): boolean => !!keys?.backedUpAt && (!doc.deviceOnly || doc.inCheckedFile);
