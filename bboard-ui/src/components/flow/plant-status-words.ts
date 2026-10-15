// The plant page's status words that tests pin (round 5), kept apart from the components
// so they load without the UI library.
// SPDX-License-Identifier: Apache-2.0

import type { LabReceipt } from '../../veilcore/custody';
import type { RecordKeys } from '../../veilcore/record-keys';
import type { ProofState } from '../../veilcore/proofs';
import type { AnchorState } from '../verify/anchor-words';
import { isTestNetwork } from '../../config/network';
import { utcDate } from '../../veilcore/time';

/** "2026-10-11 UTC": the day, labelled. */
const utcDay = (t: number | string): string => utcDate(t).replace(' (UTC)', ' UTC');

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

/**
 * The lab's "Lab report sent" line. A lab whose lab reports were all withdrawn (or replaced
 * by a correction it then withdrew) is told that, and that it can send a new one: it used
 * to read "not yet", as if it had never sent anything (round 6).
 */
export const labSentRow = (live?: number, ever?: number) =>
  live === undefined
    ? { done: false, label: 'Lab report sent', value: 'checking…' }
    : live > 0
      ? { done: true, label: 'Lab report sent', value: `${live} sent` }
      : (ever ?? 0) > 0
        ? { done: false, label: 'Lab report', value: 'withdrawn (you can send a new one)' }
        : { done: false, label: 'Lab report sent', value: 'not yet' };

/** Home's card words for what a lab sent back on a delivery (round 6: "withdrawn", not nothing). */
export const labSentPhrase = (facts?: { sent: number; sentEver: number }): string | undefined =>
  !facts
    ? undefined
    : facts.sent > 0
      ? `${facts.sent} lab report${facts.sent === 1 ? '' : 's'} sent`
      : facts.sentEver > 0
        ? 'lab report withdrawn'
        : undefined;

/** A status line's mark: ✓ checked, ○ reported or waiting (neutral), ⊗ failed. */
export type RowMark = 'done' | 'reported' | 'wait' | 'failed';

/**
 * The plant page's "Record dated" line. One source of truth with the check page and the
 * History: the date is ticked only when this browser found the batch root in the named
 * transaction on Midnight (useAnchorCheck.ts); until then it is the registry's report,
 * with a neutral mark; a look-up that contradicts the registry is a failure.
 */
export const recordDateRow = (
  proof: ProofState | 'checking',
  anchor: AnchorState | undefined,
): { mark: RowMark; value: string; sub?: string } => {
  if (proof === 'checking') return { mark: 'wait', value: 'checking…' };
  if (proof.status === 'none') return { mark: 'wait', value: 'waiting for a batch' };
  if (proof.status === 'pending') return { mark: 'wait', value: 'in a batch, waiting for its date stamp' };
  const a = proof.proof.anchor;
  const test = a && isTestNetwork(a.network) ? ' On a test network: practice data, not a real date.' : '';
  const withTest = (sub?: string) => (sub ? `${sub}${test}` : test.trim() || undefined);
  if (anchor !== undefined && anchor !== 'checking' && anchor.status === 'checked')
    return { mark: 'done', value: `${utcDay(anchor.blockTime)} — checked on Midnight`, sub: withTest() };
  if (anchor !== undefined && anchor !== 'checking' && anchor.status === 'failed')
    return {
      mark: 'failed',
      value: 'date stamp not confirmed on Midnight',
      sub: `${anchor.reason[0].toUpperCase()}${anchor.reason.slice(1)}. Don’t rely on the date the registry reports.`,
    };
  const reported = a?.anchoredAt && !Number.isNaN(Date.parse(a.anchoredAt)) ? utcDay(a.anchoredAt) : undefined;
  const why =
    anchor === 'checking'
      ? 'Looking it up on Midnight…'
      : anchor?.status === 'unreachable'
        ? 'Couldn’t reach Midnight to check it.'
        : 'Not checked on Midnight from this page.';
  return {
    mark: 'reported',
    value: `${reported ?? 'date not given'} (VeilCore’s registry’s report)`,
    sub: withTest(why),
  };
};
