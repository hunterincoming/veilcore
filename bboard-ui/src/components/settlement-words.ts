// The words of the holder's "Date on Midnight" section (SettlementStatus.tsx), kept apart
// from the component so they can be tested without the browser. The line under them, for
// an anchor this browser looked up on Midnight, is the check page's own (anchor-words.ts).
// SPDX-License-Identifier: Apache-2.0

import { isTestNetwork, networkLabel } from '../config/network';
import { anchorConfirmed, type AnchorState } from './verify/anchor-words';

/** The chip over the section: never "Anchored" unless this browser found it on Midnight. */
export const settlementChip = (reported: boolean, network: string, anchor: AnchorState | undefined): string => {
  if (!reported) return 'In a batch, not yet anchored';
  if (anchorConfirmed(anchor)) return `In a batch · date checked on ${networkLabel(network)}`;
  if (anchor !== undefined && anchor !== 'checking' && anchor.status === 'failed')
    return 'In a batch · date stamp not confirmed';
  return `In a batch · anchor reported on ${networkLabel(network)}`;
};

/**
 * The paragraph under the chip, for an anchor the registry reports. `looked`: whether this
 * page looks the transaction up (it has an indexer for that network); the line under it
 * then says what it found.
 */
export const reportedText = (batchId: string, network: string, looked: boolean, confirmed: boolean): string => {
  const test = isTestNetwork(network) ? ' A test network can be reset and its dates carry no evidential weight.' : '';
  const head = `Checked in this browser: your record's fingerprint is in batch ${batchId}, and the path from it folds to the batch root.`;
  // The confirmed line (anchor-words.ts) carries the test-network note itself.
  if (confirmed) return head;
  if (looked) return `${head} The registry reports that root was recorded on ${networkLabel(network)}.${test}`;
  return `${head} The registry reports that root was recorded on ${networkLabel(network)}; this page has not looked the transaction up, so it is not shown as anchored. Look it up on the network before relying on the date.${test}`;
};
