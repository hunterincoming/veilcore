// The plant page's status words that tests pin (round 5), kept apart from the components
// so they load without the UI library.
// SPDX-License-Identifier: Apache-2.0

import type { LabReceipt } from '../../veilcore/custody';
import type { RecordKeys } from '../../veilcore/record-keys';

const day = (ms?: number | string) => (ms === undefined ? '' : new Date(ms).toLocaleDateString());

const REJECTED: Record<'damaged' | 'wrong-sample', string> = {
  damaged: 'arrived damaged',
  'wrong-sample': 'wrong sample',
};

/** The lab's own receipt line for a received sample: its own key's signature, nothing else. */
export const labReceiptRow = (receipt: LabReceipt | null | undefined) => {
  if (receipt === null || receipt === undefined) return { done: false, label: 'Receipt', value: 'checking…' };
  if (receipt.kind === 'signed')
    return {
      done: receipt.linked,
      label: 'Receipt signed',
      value: receipt.linked ? day(receipt.at) : `${day(receipt.at)}, not linked to the delivery yet`,
    };
  if (receipt.kind === 'rejected') return { done: true, label: 'You turned it away', value: REJECTED[receipt.reason] };
  return { done: false, label: 'Receipt not signed yet', value: '' };
};

/** The key's date stamp, as a second line under the record's date (round 5). */
export const keyStampLine = (keys?: RecordKeys): string =>
  `Key date stamped: ${keys?.anchor ? day(keys.anchor.anchoredAt) || 'done' : 'not yet'}. Your plant’s key is dated too, so you can prove you hold it later.`;
