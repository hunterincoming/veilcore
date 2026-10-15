// What the check page says about a batch root's anchor once it has looked it up on Midnight
// itself (veilcore/chain/anchor-check.ts). Plain words, one sentence each, worded by who
// stands behind them: "Checked on Midnight" only for what this browser read from an indexer.
// SPDX-License-Identifier: Apache-2.0

import type { AnchorCheck } from '../../veilcore/chain/anchor-check';
import type { FactStatus } from '../../veilcore/saved-report';
import { isTestNetwork, networkLabel } from '../../config/network';
import { utcStamp } from '../../veilcore/time';

export type AnchorState = AnchorCheck | 'checking';

const TEST_NOTE = ' A test network can be reset and its dates carry no evidential weight.';

/** The line under the registry's report of the anchor: its mark and its words, or none. */
export const anchorLine = (
  check: AnchorState,
  /** network: where the registry says the root was anchored. */
  ctx: { network: string; bound: boolean },
): { status: FactStatus; text: string } | undefined => {
  const test = isTestNetwork(ctx.network) ? TEST_NOTE : '';
  if (check === 'checking')
    return { status: 'reported', text: `Looking that transaction up on ${networkLabel(ctx.network)}…` };
  switch (check.status) {
    case 'checked': {
      const block = check.blockHeight !== undefined ? ` in block ${check.blockHeight}` : '';
      const when = check.blockTime !== undefined ? ` at ${utcStamp(check.blockTime)}` : '';
      const two = check.indexers > 1 ? ' Two separate Midnight indexers gave the same answer.' : '';
      return {
        // Ticked only against the link's own fingerprint, like every other line.
        status: ctx.bound ? 'checked' : 'reported',
        text:
          `Checked on Midnight: this batch root was written by transaction ${check.txHash}${block}${when}.` +
          `${two}${test}`,
      };
    }
    case 'failed':
      return {
        status: 'failed',
        text: `Not confirmed on Midnight: ${check.reason}. Don’t rely on the date the registry reports.`,
      };
    case 'unreachable':
      return {
        status: 'reported',
        text: /^only one of the two/.test(check.reason)
          ? 'Only one of the two Midnight indexers answered, and both must; the date shown is VeilCore’s registry’s report.'
          : 'Couldn’t reach a Midnight indexer; the date shown is VeilCore’s registry’s report.',
      };
    case 'not-checked':
      // No line of its own: the registry's report above already says this page has not
      // looked the transaction up.
      return undefined;
  }
};

/** Whether this browser confirmed the anchor itself. */
export const anchorConfirmed = (check: AnchorState | undefined): boolean =>
  check !== undefined && check !== 'checking' && check.status === 'checked';

/**
 * The heading, once the anchor is looked up. Only a confirmed anchor against the link's own
 * fingerprint changes "the date is the registry's report"; a failed one says so.
 */
export const anchorHeading = (base: string, check: AnchorState | undefined, bound: boolean): string => {
  if (!bound || check === undefined || check === 'checking') return base;
  if (check.status === 'checked') return 'In a dated batch: the date is checked on Midnight';
  if (check.status === 'failed') return 'In a batch: its date stamp could not be confirmed on Midnight';
  return base;
};

/**
 * The footer, with the anchor added to what this browser checked. The footer's own words
 * come from verify-link.ts checkedSummary; this adds one item to its list.
 */
export const anchorSummary = (summary: string, check: AnchorState | undefined): string => {
  if (!anchorConfirmed(check)) return summary;
  const item = 'the batch root’s date stamp, looked up on Midnight';
  const m = /^Checked in this browser: (.*?)\. Everything else is/.exec(summary);
  if (!m) return `${summary} Checked on Midnight: ${item.replace(', looked up on Midnight', '')}.`;
  return summary.replace(m[1], `${m[1]}${m[1].includes(' and ') ? ',' : ''} and ${item}`);
};
