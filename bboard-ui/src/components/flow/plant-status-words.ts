// The plant page's status words that tests pin (round 5), kept apart from the components
// so they load without the UI library.
// SPDX-License-Identifier: Apache-2.0

import type { LabReceipt } from '../../veilcore/custody';
import type { RecordKeys } from '../../veilcore/record-keys';
import type { StrainRecord } from '../../veilcore/records';
import type { ProofState } from '../../veilcore/proofs';
import type { AnchorState } from '../verify/anchor-words';
import { isTestNetwork } from '../../config/network';
import { utcDate } from '../../veilcore/time';
import { enT, type Translator } from '../../i18n/translate';

/** "2026-10-11 UTC": the day, labelled. */
const utcDay = (t: number | string): string => utcDate(t).replace(' (UTC)', ' UTC');

const day = (tr: Translator, ms?: number | string) => (ms === undefined ? '' : tr.date(ms));

const REJECTED = {
  damaged: 'app.plant.rejected.damaged',
  'wrong-sample': 'app.plant.rejected.wrongSample',
} as const;

/**
 * The lab's own receipt line for a received sample: its own key's signature, nothing else.
 * `id` is the row's English label, the same in every language (data-status-row, for tests
 * and support); `label` is in the visitor's language.
 */
export const labReceiptRow = (receipt: LabReceipt | null | undefined, tr: Translator = enT) => {
  if (receipt === null || receipt === undefined)
    return { done: false, id: 'Receipt', label: tr.t('app.plant.receipt'), value: tr.t('app.plant.checking') };
  if (receipt.kind === 'signed')
    return {
      done: receipt.linked,
      id: 'Receipt signed',
      label: tr.t('app.plant.receiptSigned'),
      value: receipt.linked ? day(tr, receipt.at) : tr.t('app.plant.notLinkedYet', { date: day(tr, receipt.at) }),
    };
  if (receipt.kind === 'rejected')
    return {
      done: true,
      id: 'You turned it away',
      label: tr.t('app.plant.turnedAway'),
      value: tr.t(REJECTED[receipt.reason]),
    };
  return { done: false, id: 'Receipt not signed yet', label: tr.t('app.plant.receiptNotSigned'), value: '' };
};

/**
 * Home's one line for a plant, worst news first. Only a missing backup is "Not finished":
 * the record is sealed and its date comes from its batch, so a key not yet date stamped
 * is a quiet note, not a step left undone. A collection import queues its key stamps at
 * about 3 a day, and 120 plants all marked "Not finished" for 40 days said something false
 * (round 2). Nothing here says a lab confirmed anything: that needs a signature checked on
 * the plant's page, and a used code (record.attestation) is not one.
 */
export const homeStatusLine = (
  r: Pick<StrainRecord, 'receivedFrom' | 'loggedAt' | 'dnaFingerprint'>,
  keys: RecordKeys | undefined,
  opts: { realChain: boolean; queued?: boolean },
  tr: Translator = enT,
): { text: string; unfinished: boolean } => {
  if (opts.realChain && keys && !keys.backedUpAt) return { text: tr.t('app.home.notFinished'), unfinished: true };
  const bits = [
    r.receivedFrom
      ? tr.t('app.home.receivedFrom', { name: r.receivedFrom })
      : tr.t('app.home.sealedOn', { date: day(tr, r.loggedAt) }),
  ];
  // Whether a DNA report ties it to the plant is a line of its own under this one (AppHome.tsx TieLine).
  if (opts.realChain && !r.receivedFrom && keys && !keys.anchor)
    bits.push(opts.queued ? tr.t('app.home.keyStampQueued') : tr.t('app.home.keyNotStamped'));
  return { text: bits.join(' · '), unfinished: false };
};

/** The key's date stamp, as a second line under the record's date (round 5). */
export const keyStampLine = (keys?: RecordKeys, tr: Translator = enT): string =>
  tr.t('app.plant.keyStampLine', {
    when: keys?.anchor ? day(tr, keys.anchor.anchoredAt) || tr.t('app.plant.done') : tr.t('app.plant.notYet'),
  });

/**
 * The lab's "Lab report sent" line. A lab whose lab reports were all withdrawn (or replaced
 * by a correction it then withdrew) is told that, and that it can send a new one: it used
 * to read "not yet", as if it had never sent anything (round 6).
 */
export const labSentRow = (live?: number, ever?: number, tr: Translator = enT) =>
  live === undefined
    ? { done: false, id: 'Lab report sent', label: tr.t('app.plant.labReportSent'), value: tr.t('app.plant.checking') }
    : live > 0
      ? {
          done: true,
          id: 'Lab report sent',
          label: tr.t('app.plant.labReportSent'),
          value: tr.t('app.plant.nSent', { n: live }),
        }
      : (ever ?? 0) > 0
        ? {
            done: false,
            id: 'Lab report',
            label: tr.t('app.plant.labReport'),
            value: tr.t('app.plant.withdrawnSendNew'),
          }
        : {
            done: false,
            id: 'Lab report sent',
            label: tr.t('app.plant.labReportSent'),
            value: tr.t('app.plant.notYet'),
          };

/** Home's card words for what a lab sent back on a delivery (round 6: "withdrawn", not nothing). */
export const labSentPhrase = (facts?: { sent: number; sentEver: number }, tr: Translator = enT): string | undefined =>
  !facts
    ? undefined
    : facts.sent > 0
      ? tr.tp('app.home.reportsSent', facts.sent)
      : facts.sentEver > 0
        ? tr.t('app.home.reportWithdrawn')
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
  tr: Translator = enT,
): { mark: RowMark; value: string; sub?: string } => {
  if (proof === 'checking') return { mark: 'wait', value: tr.t('app.plant.checking') };
  if (proof.status === 'none') return { mark: 'wait', value: tr.t('app.plant.waitingBatch') };
  if (proof.status === 'pending') return { mark: 'wait', value: tr.t('app.plant.inBatchWaiting') };
  const a = proof.proof.anchor;
  const test = a && isTestNetwork(a.network) ? tr.t('app.plant.onTestNetwork') : '';
  const withTest = (sub?: string) => (sub ? `${sub}${test}` : test.trim() || undefined);
  if (anchor !== undefined && anchor !== 'checking' && anchor.status === 'checked')
    return {
      mark: 'done',
      value: tr.t('app.plant.checkedOnMidnight', { date: utcDay(anchor.blockTime) }),
      sub: withTest(),
    };
  if (anchor !== undefined && anchor !== 'checking' && anchor.status === 'failed')
    return {
      mark: 'failed',
      value: tr.t('app.plant.notConfirmed'),
      sub: tr.t('app.plant.dontRely', { reason: `${anchor.reason[0].toUpperCase()}${anchor.reason.slice(1)}` }),
    };
  const reported = a?.anchoredAt && !Number.isNaN(Date.parse(a.anchoredAt)) ? utcDay(a.anchoredAt) : undefined;
  const why =
    anchor === 'checking'
      ? tr.t('app.plant.lookingUp')
      : anchor?.status === 'unreachable'
        ? tr.t('app.plant.couldntReach')
        : tr.t('app.plant.notChecked');
  return {
    mark: 'reported',
    value: tr.t('app.plant.registryReport', { date: reported ?? tr.t('app.plant.dateNotGiven') }),
    sub: withTest(why),
  };
};
