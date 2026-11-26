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

/**
 * Who could change the contract when it dated the batch, beside its name (docs/contract-v2.md
 * 3.3): "one key, not yet handed to the committee", "held by the 2-of-3 committee", or nobody.
 * Worded from the published key state the page matched the state to (anchor-check.ts), never
 * from the contract's own fields. Empty when there is none to show (version 1, today's mainnet).
 */
export const keyStateWords = (
  ks: { readonly retired: boolean; readonly committee: number; readonly threshold: number } | undefined,
  tr: Translator = enT,
): string => {
  if (ks === undefined) return '';
  if (ks.retired) return tr.t('app.verify.anchor.keys.retired');
  if (ks.committee === 1 && ks.threshold === 1) return tr.t('app.verify.anchor.keys.oneKey');
  return tr.t('app.verify.anchor.keys.committee', {
    threshold: String(ks.threshold),
    committee: String(ks.committee),
  });
};

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
      // Which contract gave the date, once there is more than one it could be (docs/contract-v2.md
      // 3.1, rule 10.3): the same root on two contracts is two dates.
      const contract =
        check.nameContract && check.contract
          ? tr.t('app.verify.anchor.contract', { version: check.contract.version.slice(1) }) +
            keyStateWords(check.keyState, tr)
          : '';
      return {
        // Ticked only against the link's own fingerprint, like every other line.
        status: ctx.bound ? 'checked' : 'reported',
        text: tr.t('app.verify.anchor.checked', {
          tx: check.txHash,
          block: String(check.blockHeight),
          at: utcStamp(check.blockTime),
          contract,
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

/**
 * Whether a checked date on mainnet comes from a contract VeilCore is still testing. Fails
 * closed: only version 1 is public, so version 2, any later version, and a check that names no
 * contract all count as still testing until this line is changed on purpose (a contract's
 * public switch, docs/contract-v2.md 7). Never gold, never green, never "make a record" beside it.
 */
export const stillTesting = (check: AnchorState | undefined, network: string): boolean =>
  check !== undefined &&
  check !== 'checking' &&
  check.status === 'checked' &&
  check.contract?.version !== 'v1' &&
  network === 'mainnet';

/**
 * Condition 5 of docs/contract-v2.md 7: until its public switch, a date from VeilCore contract
 * version 2 (or any contract other than version 1, see stillTesting) on mainnet always carries
 * this line, in the evidence bundle's and verify.html's own words (evidence/words.ts
 * midnightSteps). Undefined for any other date: version 1, a test network (its own note already
 * says the date carries no weight), or nothing checked yet. Every surface that shows a checked
 * date renders it through V2Caution (V2Caution.tsx) or recordDateRow's `caution`.
 */
export const v2CautionWords = (
  check: AnchorState | undefined,
  network: string,
  tr: Translator = enT,
): string | undefined => (stillTesting(check, network) ? tr.t('app.verify.anchor.v2Caution') : undefined);

/**
 * The stamp for a checked date: gold `dated` only for a real date on a contract that is not
 * still in testing; `testing` for a version 2 date on mainnet (condition 5, never gold);
 * `practice` on a test network. Undefined when the date isn't checked here.
 */
export const stampStateFor = (
  check: AnchorState | undefined,
  network: string,
): 'dated' | 'practice' | 'testing' | undefined => {
  if (check === undefined || check === 'checking' || check.status !== 'checked') return undefined;
  if (isTestNetwork(network)) return 'practice';
  return v2CautionWords(check, network) !== undefined ? 'testing' : 'dated';
};

/** The stamp's top word, for each state stampStateFor gives. */
export const STAMP_WORD = {
  dated: 'app.plant.stamp.dated',
  practice: 'app.plant.stamp.practice',
  testing: 'app.plant.stamp.testing',
} as const;

/** Whether this browser confirmed the anchor itself. */
export const anchorConfirmed = (check: AnchorState | undefined): boolean =>
  check !== undefined && check !== 'checking' && check.status === 'checked';

/** This page's own check found the anchor wrong. Not reaching an indexer is not a failed check. */
export const anchorCheckFailed = (check: AnchorState | undefined): boolean =>
  check !== undefined && check !== 'checking' && check.status === 'failed';

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
  const caution = v2CautionWords(check, a.network, tr);
  if (check !== undefined && check !== 'checking' && check.status === 'checked')
    return {
      at: check.blockTime,
      title: isTestNetwork(a.network)
        ? tr.t('app.verify.anchor.eventTestTitle')
        : tr.t('app.verify.anchor.headingChecked'),
      detail:
        tr.t('app.verify.anchor.eventChecked', {
          batch: a.batchId,
          tx: check.txHash,
          block: String(check.blockHeight),
          where,
          test,
        }) + (caution ? ` ${caution}` : ''),
      strong: !isTestNetwork(a.network) && caution === undefined,
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
