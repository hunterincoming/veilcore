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

/**
 * The date the registry gives for the anchor, worded as its report: "2026-10-11 14:03 UTC,
 * as VeilCore's registry reports it", or a plain "the registry gives no date" when it gives
 * none. Never shown as a checked date.
 */
export const registryDateWords = (reportedAt?: string): string =>
  reportedAt && !Number.isNaN(Date.parse(reportedAt))
    ? `${utcStamp(reportedAt)}, as VeilCore’s registry reports it`
    : 'not given (VeilCore’s registry gives no date for that transaction)';

/** The line under the registry's report of the anchor: its mark and its words, or none. */
export const anchorLine = (
  check: AnchorState,
  /** network: where the registry says the root was anchored. reportedAt: the registry's time for it. */
  ctx: { network: string; bound: boolean; reportedAt?: string },
): { status: FactStatus; text: string } | undefined => {
  const test = isTestNetwork(ctx.network) ? TEST_NOTE : '';
  if (check === 'checking')
    return { status: 'reported', text: `Looking that transaction up on ${networkLabel(ctx.network)}…` };
  switch (check.status) {
    case 'checked': {
      const two = check.indexers > 1 ? ' Two separate Midnight indexers gave the same answer.' : '';
      return {
        // Ticked only against the link's own fingerprint, like every other line.
        status: ctx.bound ? 'checked' : 'reported',
        text:
          `Checked on Midnight: this batch root was written by transaction ${check.txHash} in block ${check.blockHeight} at ${utcStamp(check.blockTime)}.` +
          `${two}${test}`,
      };
    }
    case 'failed':
      return {
        status: 'failed',
        text: `Not confirmed on Midnight: ${check.reason}. Don’t rely on the date the registry reports.`,
      };
    case 'unreachable': {
      const date = `The date is ${registryDateWords(ctx.reportedAt)}; not checked here.`;
      return {
        status: 'reported',
        text: /^only one of the two/.test(check.reason)
          ? `Only one of the two Midnight indexers answered, and both must. ${date}`
          : `Couldn’t reach a Midnight indexer. ${date}`,
      };
    }
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
 * fingerprint changes "the date is the registry's report"; a failed one says so. A date
 * checked on a test network says so in the heading: it is practice data, not a date.
 */
export const anchorHeading = (
  base: string,
  check: AnchorState | undefined,
  bound: boolean,
  network = 'mainnet',
): string => {
  if (!bound || check === undefined || check === 'checking') return base;
  if (check.status === 'checked')
    return isTestNetwork(network)
      ? 'Date stamp checked on a test network: practice data, not a real date'
      : 'Date stamp checked on Midnight';
  if (check.status === 'failed') return 'Date stamp not confirmed on Midnight';
  return base;
};

/**
 * One History entry for the batch's date stamp, in the same words as the check page and
 * the plant page: checked, not confirmed, or the registry's report.
 */
export const anchorHistoryEvent = (
  check: AnchorState | undefined,
  a: { network: string; txHash?: string; anchoredAt?: string; batchId: string },
): { at: number | undefined; title: string; detail: string; strong: boolean } => {
  const where = networkLabel(a.network);
  const reportedAt = a.anchoredAt && !Number.isNaN(Date.parse(a.anchoredAt)) ? Date.parse(a.anchoredAt) : undefined;
  const test = isTestNetwork(a.network) ? TEST_NOTE : '';
  if (check !== undefined && check !== 'checking' && check.status === 'checked')
    return {
      at: check.blockTime,
      title: isTestNetwork(a.network) ? 'Date stamp checked on a test network' : 'Date stamp checked on Midnight',
      detail: `Batch ${a.batchId}: this page found the batch root in transaction ${check.txHash}, block ${check.blockHeight}, on ${where}.${test}`,
      strong: !isTestNetwork(a.network),
    };
  if (check !== undefined && check !== 'checking' && check.status === 'failed')
    return {
      at: reportedAt,
      title: 'Date stamp not confirmed on Midnight',
      detail: `Batch ${a.batchId}: ${check.reason}. Don’t rely on the date the registry reports.`,
      strong: false,
    };
  const why =
    check === 'checking'
      ? 'This page is looking it up on Midnight.'
      : check?.status === 'unreachable'
        ? 'This page couldn’t reach Midnight to check it.'
        : 'This page has not looked it up on Midnight.';
  return {
    at: reportedAt,
    title: 'Date stamp reported by the registry',
    detail: `Batch ${a.batchId}: the registry reports the batch root was recorded on ${where}${a.txHash ? ` in transaction ${a.txHash}` : ''}. The date is ${registryDateWords(a.anchoredAt)}. ${why} Don’t rely on the date until it is checked.${test}`,
    strong: false,
  };
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
