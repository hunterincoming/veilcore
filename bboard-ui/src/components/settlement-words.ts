// The words of the holder's "Date on Midnight" section (SettlementStatus.tsx), kept apart
// from the component so they can be tested without the browser. The line under them, for
// an anchor this browser looked up on Midnight, is the check page's own (anchor-words.ts).
// SPDX-License-Identifier: Apache-2.0

import { isTestNetwork } from '../config/network';
import { enT, type Translator } from '../i18n/translate';
import { networkWords } from '../i18n/network-words';
import { anchorConfirmed, type AnchorState } from './verify/anchor-words';

/** The chip over the section: never "Anchored" unless this browser found it on Midnight. */
export const settlementChip = (
  reported: boolean,
  network: string,
  anchor: AnchorState | undefined,
  tr: Translator = enT,
): string => {
  if (!reported) return tr.t('app.plant.date.chipNotAnchored');
  if (anchorConfirmed(anchor)) return tr.t('app.plant.date.chipChecked', { network: networkWords(network, tr) });
  if (anchor !== undefined && anchor !== 'checking' && anchor.status === 'failed')
    return tr.t('app.plant.date.chipFailed');
  return tr.t('app.plant.date.chipReported', { network: networkWords(network, tr) });
};

/**
 * The paragraph under the chip, for an anchor the registry reports. `looked`: whether this
 * page looks the transaction up (it has an indexer for that network); the line under it
 * then says what it found.
 */
export const reportedText = (
  batchId: string,
  network: string,
  looked: boolean,
  confirmed: boolean,
  tr: Translator = enT,
): string => {
  const test = isTestNetwork(network) ? tr.t('app.plant.date.testNote') : '';
  const head = tr.t('app.plant.date.head', { batch: batchId });
  // The confirmed line (anchor-words.ts) carries the test-network note itself.
  if (confirmed) return head;
  const net = networkWords(network, tr);
  if (looked) return tr.t('app.plant.date.looked', { head, network: net, test });
  return tr.t('app.plant.date.notLooked', { head, network: net, test });
};
