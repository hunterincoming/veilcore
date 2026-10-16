// What the check page says about a batch root's anchor once it has looked it up on Midnight
// itself (veilcore/chain/anchor-check.ts). Plain words, one sentence each, worded by who
// stands behind them: "Checked on Midnight" only for what this browser read from an indexer.
// SPDX-License-Identifier: Apache-2.0

import type { AnchorCheck } from '../../veilcore/chain/anchor-check';
import type { FactStatus } from '../../veilcore/saved-report';
import { isTestNetwork } from '../../config/network';
import { utcStamp } from '../../veilcore/time';
import { enT, type Translator } from '../../i18n/translate';
import { networkWords } from '../../i18n/network-words';

export type AnchorState = AnchorCheck | 'checking';

/**
 * The date the registry gives for the anchor, worded as its report: "2026-10-11 14:03 UTC,
 * as VeilCore's registry reports it", or a plain "the registry gives no date" when it gives
 * none. Never shown as a checked date.
 */
export const registryDateWords = (reportedAt?: string, tr: Translator = enT): string =>
  reportedAt && !Number.isNaN(Date.parse(reportedAt))
    ? tr.t('app.verify.anchor.registryDate', { date: utcStamp(reportedAt) })
    : tr.t('app.verify.anchor.noDate');

/** The line under the registry's report of the anchor: its mark and its words, or none. */
export const anchorLine = (
  check: AnchorState,
  /** network: where the registry says the root was anchored. reportedAt: the registry's time for it. */
  ctx: { network: string; bound: boolean; reportedAt?: string },
  tr: Translator = enT,
): { status: FactStatus; text: string } | undefined => {
  const test = isTestNetwork(ctx.network) ? tr.t('app.plant.date.testNote') : '';
  if (check === 'checking')
    return {
      status: 'reported',
      text: tr.t('app.verify.anchor.lookingUp', { network: networkWords(ctx.network, tr) }),
    };
  switch (check.status) {
    case 'checked': {
      const two = check.indexers > 1 ? tr.t('app.verify.anchor.twoIndexers') : '';
      return {
        // Ticked only against the link's own fingerprint, like every other line.
        status: ctx.bound ? 'checked' : 'reported',
        text: tr.t('app.verify.anchor.checked', {
          tx: check.txHash,
          block: String(check.blockHeight),
          at: utcStamp(check.blockTime),
          two,
          test,
        }),
      };
    }
    case 'failed':
      return { status: 'failed', text: tr.t('app.verify.anchor.failed', { reason: check.reason }) };
    case 'unreachable': {
      const date = tr.t('app.verify.anchor.dateNotChecked', { date: registryDateWords(ctx.reportedAt, tr) });
      return {
        status: 'reported',
        text: /^only one of the two/.test(check.reason)
          ? tr.t('app.verify.anchor.oneIndexer', { date })
          : tr.t('app.verify.anchor.noIndexer', { date }),
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
  tr: Translator = enT,
): string => {
  if (!bound || check === undefined || check === 'checking') return base;
  if (check.status === 'checked')
    return isTestNetwork(network) ? tr.t('app.verify.anchor.headingTest') : tr.t('app.verify.anchor.headingChecked');
  if (check.status === 'failed') return tr.t('app.verify.anchor.headingFailed');
  return base;
};

/**
 * One History entry for the batch's date stamp, in the same words as the check page and
 * the plant page: checked, not confirmed, or the registry's report.
 */
export const anchorHistoryEvent = (
  check: AnchorState | undefined,
  a: { network: string; txHash?: string; anchoredAt?: string; batchId: string },
  tr: Translator = enT,
): { at: number | undefined; title: string; detail: string; strong: boolean } => {
  const where = networkWords(a.network, tr);
  const reportedAt = a.anchoredAt && !Number.isNaN(Date.parse(a.anchoredAt)) ? Date.parse(a.anchoredAt) : undefined;
  const test = isTestNetwork(a.network) ? tr.t('app.plant.date.testNote') : '';
  if (check !== undefined && check !== 'checking' && check.status === 'checked')
    return {
      at: check.blockTime,
      title: isTestNetwork(a.network)
        ? tr.t('app.verify.anchor.eventTestTitle')
        : tr.t('app.verify.anchor.headingChecked'),
      detail: tr.t('app.verify.anchor.eventChecked', {
        batch: a.batchId,
        tx: check.txHash,
        block: String(check.blockHeight),
        where,
        test,
      }),
      strong: !isTestNetwork(a.network),
    };
  if (check !== undefined && check !== 'checking' && check.status === 'failed')
    return {
      at: reportedAt,
      title: tr.t('app.verify.anchor.headingFailed'),
      detail: tr.t('app.verify.anchor.eventFailed', { batch: a.batchId, reason: check.reason }),
      strong: false,
    };
  const why =
    check === 'checking'
      ? tr.t('app.verify.anchor.whyChecking')
      : check?.status === 'unreachable'
        ? tr.t('app.verify.anchor.whyUnreachable')
        : tr.t('app.verify.anchor.whyNotLooked');
  return {
    at: reportedAt,
    title: tr.t('app.verify.anchor.eventReportedTitle'),
    detail: tr.t('app.verify.anchor.eventReported', {
      batch: a.batchId,
      where,
      tx: a.txHash ? tr.t('app.verify.anchor.inTx', { tx: a.txHash }) : '',
      date: registryDateWords(a.anchoredAt, tr),
      why,
      test,
    }),
    strong: false,
  };
};

/**
 * The footer, with the anchor added to what this browser checked. The footer's own words
 * come from verify-link.ts checkedSummary; this adds one item to its list.
 */
export const anchorSummary = (summary: string, check: AnchorState | undefined, tr: Translator = enT): string => {
  if (!anchorConfirmed(check)) return summary;
  // Another language: the footer's own sentence is its own; the anchor is one more sentence.
  if (tr.lang !== 'en') return tr.t('app.verify.anchor.summaryAdd', { summary });
  const item = 'the batch root’s date stamp, looked up on Midnight';
  const m = /^Checked in this browser: (.*?)\. Everything else is/.exec(summary);
  if (!m) return `${summary} Checked on Midnight: ${item.replace(', looked up on Midnight', '')}.`;
  return summary.replace(m[1], `${m[1]}${m[1].includes(' and ') ? ',' : ''} and ${item}`);
};
